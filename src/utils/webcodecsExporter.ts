import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { Caption, SubtitleStyle, AspectRatioType, VideoResolutionPreset } from '../types';
import { drawSubtitleOnCanvas } from './videoRecorder';
import { calculateExportDimensions, calculateExportBitrate } from './resolutionPresets';

/**
 * Options for hardware-accelerated WebCodecs video export
 */
export interface WebCodecsExportOptions {
  /** Target width in pixels (defaults to resolution calculation) */
  width?: number;
  /** Target height in pixels (defaults to resolution calculation) */
  height?: number;
  /** Pixel resolution preset (360p, 480p, 720p, 1080p, 1440p, 4k, 8k, or original) */
  resolution?: VideoResolutionPreset;
  /** Target frames per second (defaults to 30) */
  fps?: number;
  /** Target video bitrate in bits per second */
  bitrate?: number;
  /** H.264 AVC codec profile */
  codec?: string;
  /** Aspect ratio preset to adjust canvas dimensions if width/height not specified ('original' matches native source video) */
  aspectRatio?: AspectRatioType;
  /** Framing mode when video aspect ratio differs from target: 'fill' (full screen / crop, no black bars) or 'fit' (letterbox) */
  fitMode?: 'fill' | 'fit';
  /** Keyframe interval in seconds (defaults to 2 seconds) */
  keyFrameIntervalSeconds?: number;
  /** Callback for real-time progress updates (0-100%) and descriptive status messages */
  onProgress?: (progressPercent: number, statusMessage: string) => void;
  /** Abort signal to cancel encoding gracefully if requested by user */
  signal?: AbortSignal;
}

/**
 * Result returned after successful WebCodecs rendering and muxing
 */
export interface WebCodecsExportResult {
  /** Ready-to-download MP4 Blob */
  blob: Blob;
  /** Generated download URL */
  url: string;
  /** Final output file size in bytes */
  size: number;
  /** Total frames encoded */
  totalFrames: number;
  /** Total rendering time in milliseconds */
  elapsedTimeMs: number;
  /** Output MIME type */
  mimeType: string;
}

/**
 * Checks if the current browser environment natively supports WebCodecs (VideoEncoder, VideoFrame)
 */
export function isWebCodecsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as any).VideoEncoder === 'function' &&
    typeof (window as any).VideoFrame === 'function'
  );
}

/**
 * Checks if a specific video encoder configuration is supported by the client hardware
 */
export async function isVideoConfigSupported(config: VideoEncoderConfig): Promise<boolean> {
  if (!isWebCodecsSupported()) return false;
  try {
    const support = await (window as any).VideoEncoder.isConfigSupported(config);
    return Boolean(support?.supported);
  } catch {
    return false;
  }
}

/**
 * Seeks an HTML5 Video Element to a precise timestamp with Promise resolution
 */
function seekVideoElement(video: HTMLVideoElement, timeSeconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (Math.abs(video.currentTime - timeSeconds) < 0.001) {
      resolve();
      return;
    }

    let timeoutId: number;

    const handleSeeked = () => {
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      clearTimeout(timeoutId);
      resolve();
    };

    const handleError = (e: Event) => {
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      clearTimeout(timeoutId);
      reject(new Error(`Failed to seek video to ${timeSeconds.toFixed(3)}s: ${(e as any)?.message || 'Unknown error'}`));
    };

    video.addEventListener('seeked', handleSeeked, { once: true });
    video.addEventListener('error', handleError, { once: true });

    // Timeout safety fallback (500ms max per seek)
    timeoutId = window.setTimeout(() => {
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      resolve(); // Proceed to avoid hanging indefinitely
    }, 500);

    video.currentTime = Math.max(0, Math.min(timeSeconds, video.duration || timeSeconds));
  });
}

/**
 * Extracts and decodes audio samples from the video element's source URL
 * for high-fidelity AAC muxing into the final MP4 container
 */
async function extractAudioBuffer(videoUrl: string): Promise<AudioBuffer | null> {
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    const audioCtx = new AudioCtx();
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    await audioCtx.close();
    return decodedBuffer;
  } catch (err) {
    console.warn('[WebCodecs Exporter] Audio extraction skipped or not available:', err);
    return null;
  }
}

/**
 * Encodes audio buffer into AAC chunks using WebCodecs AudioEncoder if supported
 */
async function encodeAudioTracks(
  audioBuffer: AudioBuffer,
  muxer: Muxer<ArrayBufferTarget>,
  onProgress?: (progressPercent: number, statusMessage: string) => void
): Promise<boolean> {
  if (typeof (window as any).AudioEncoder !== 'function') {
    return false;
  }

  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const audioBitrate = 192_000; // 192 kbps AAC audio

  const audioConfig: AudioEncoderConfig = {
    codec: 'mp4a.40.2', // AAC-LC
    sampleRate,
    numberOfChannels,
    bitrate: audioBitrate,
  };

  try {
    const isSupported = await (window as any).AudioEncoder.isConfigSupported(audioConfig);
    if (!isSupported?.supported) {
      return false;
    }
  } catch {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    let audioEncoderError: Error | null = null;

    const audioEncoder = new (window as any).AudioEncoder({
      output: (chunk: any, meta: any) => {
        try {
          muxer.addAudioChunk(chunk, meta);
        } catch (e) {
          console.warn('[WebCodecs AudioEncoder] Muxer addAudioChunk warning:', e);
        }
      },
      error: (e: any) => {
        console.warn('[WebCodecs AudioEncoder] Error occurred:', e);
        audioEncoderError = e;
      },
    });

    try {
      audioEncoder.configure(audioConfig);

      const channelData: Float32Array[] = [];
      for (let c = 0; c < numberOfChannels; c++) {
        channelData.push(audioBuffer.getChannelData(c));
      }

      // Chunk audio in 1024-sample frames
      const frameSize = 1024;
      const totalSamples = audioBuffer.length;
      let offset = 0;

      while (offset < totalSamples && !audioEncoderError) {
        const currentLength = Math.min(frameSize, totalSamples - offset);
        const planarData = new Float32Array(currentLength * numberOfChannels);

        for (let c = 0; c < numberOfChannels; c++) {
          planarData.set(channelData[c].subarray(offset, offset + currentLength), c * currentLength);
        }

        const timestampMicroseconds = Math.round((offset / sampleRate) * 1_000_000);
        const audioData = new (window as any).AudioData({
          format: 'f32-planar',
          sampleRate,
          numberOfFrames: currentLength,
          numberOfChannels,
          timestamp: timestampMicroseconds,
          data: planarData,
        });

        audioEncoder.encode(audioData);
        audioData.close();
        offset += currentLength;
      }

      audioEncoder.flush().then(() => {
        audioEncoder.close();
        resolve(audioEncoderError === null);
      }).catch(() => {
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Production-Ready WebCodecs Video Exporter
 * 
 * Hardware-accelerated, faster-than-real-time frame rendering and H.264 MP4 encoding.
 * 
 * Key Features:
 * - Direct WebCodecs VideoEncoder pipeline (H.264 AVC 'avc1.4d002a', 8 Mbps 1080x1920)
 * - Zero real-time playback lock; renders frame-by-frame as fast as GPU/CPU allows
 * - Precision subtitle and word-level karaoke synchronization
 * - Strict VideoFrame memory management (immediate .close() calls to prevent GPU leak)
 * - Built-in MP4 Muxer with AAC audio multiplexing
 * - Graceful cancellation via AbortSignal
 */
export async function exportVideoWithWebCodecs(
  videoElement: HTMLVideoElement,
  captions: Caption[],
  style: SubtitleStyle,
  options: WebCodecsExportOptions = {}
): Promise<WebCodecsExportResult> {
  const startTime = performance.now();

  // 1. Verify WebCodecs support
  if (!isWebCodecsSupported()) {
    throw new Error(
      'WebCodecs API (VideoEncoder / VideoFrame) is not supported in this browser. Please use Chrome 94+, Edge 94+, or enable MediaRecorder fallback.'
    );
  }

  // 2. Resolve export configuration parameters
  const fps = options.fps || 30;
  const keyFrameIntervalSeconds = options.keyFrameIntervalSeconds || 2;
  const keyFrameEveryNFrames = Math.round(fps * keyFrameIntervalSeconds);

  // Compute canvas resolution (default: 'original' matches native source video, zero black bars)
  let targetWidth = options.width;
  let targetHeight = options.height;

  const nativeW = videoElement.videoWidth || 1920;
  const nativeH = videoElement.videoHeight || 1080;
  const aspect = options.aspectRatio || 'original';
  const resolutionPreset = options.resolution || 'original';

  if (!targetWidth || !targetHeight) {
    const dims = calculateExportDimensions(resolutionPreset, aspect, nativeW, nativeH);
    targetWidth = dims.width;
    targetHeight = dims.height;
  }

  // Ensure dimensions are even numbers (required by H.264 / AVC encoders)
  targetWidth = Math.round(targetWidth / 2) * 2;
  targetHeight = Math.round(targetHeight / 2) * 2;

  // Compute adaptive bitrate if not explicitly provided
  const bitrate =
    options.bitrate ||
    calculateExportBitrate(resolutionPreset, 'ultra', nativeW, nativeH);

  const totalDuration = videoElement.duration || 10;
  const totalFrames = Math.max(1, Math.ceil(totalDuration * fps));

  options.onProgress?.(1, `Initializing hardware VideoEncoder (${targetWidth}x${targetHeight} @ ${fps}fps)...`);

  // 3. Configure MP4 Muxer with ArrayBuffer target
  const muxerTarget = new ArrayBufferTarget();
  let muxerHasAudio = false;

  // Attempt audio extraction from video source URL for muxing
  let audioBuffer: AudioBuffer | null = null;
  if (videoElement.src && !videoElement.src.startsWith('blob:')) {
    audioBuffer = await extractAudioBuffer(videoElement.src);
  } else if (videoElement.currentSrc) {
    audioBuffer = await extractAudioBuffer(videoElement.currentSrc);
  }

  if (audioBuffer && typeof (window as any).AudioEncoder === 'function') {
    muxerHasAudio = true;
  }

  const muxer = new Muxer({
    target: muxerTarget,
    video: {
      codec: 'avc',
      width: targetWidth,
      height: targetHeight,
    },
    audio: muxerHasAudio && audioBuffer
      ? {
          codec: 'aac',
          numberOfChannels: audioBuffer.numberOfChannels,
          sampleRate: audioBuffer.sampleRate,
        }
      : undefined,
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  // 4. Initialize and configure WebCodecs VideoEncoder
  let encoderError: Error | null = null;

  const encoder = new (window as any).VideoEncoder({
    output: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) => {
      try {
        muxer.addVideoChunk(chunk, metadata);
      } catch (err) {
        console.error('[WebCodecs Exporter] Muxer error on video chunk:', err);
        encoderError = err as Error;
      }
    },
    error: (e: DOMException) => {
      console.error('[WebCodecs Exporter] VideoEncoder runtime error:', e);
      encoderError = new Error(`VideoEncoder failure: ${e.message || e.name}`);
    },
  });

  // Pick optimal AVC H.264 profile & level matching resolution dimensions
  const maxDim = Math.max(targetWidth, targetHeight);
  let candidateCodecs: string[];
  if (options.codec) {
    candidateCodecs = [options.codec, 'avc1.4d002a', 'avc1.42001f'];
  } else if (maxDim >= 6000) {
    // 8K Ultra HD (Level 6.0/6.2)
    candidateCodecs = ['avc1.64003e', 'avc1.64003c', 'avc1.640034', 'avc1.4d002a', 'avc1.42001f'];
  } else if (maxDim >= 3000) {
    // 4K Ultra HD (Level 5.1/5.2)
    candidateCodecs = ['avc1.640034', 'avc1.640033', 'avc1.4d0033', 'avc1.4d002a', 'avc1.42001f'];
  } else if (maxDim >= 2000) {
    // 1440p 2K (Level 5.0)
    candidateCodecs = ['avc1.640032', 'avc1.64002a', 'avc1.4d002a', 'avc1.42001f'];
  } else if (maxDim >= 1000) {
    // 1080p Full HD (Level 4.2)
    candidateCodecs = ['avc1.4d002a', 'avc1.64002a', 'avc1.42002a', 'avc1.42001f'];
  } else {
    // 720p, 480p, 360p (Level 3.1)
    candidateCodecs = ['avc1.4d001f', 'avc1.42001f', 'avc1.4d002a'];
  }

  // Find first supported codec profile
  let selectedCodec = candidateCodecs[0];
  for (const candidate of candidateCodecs) {
    const testConfig: VideoEncoderConfig = {
      codec: candidate,
      width: targetWidth,
      height: targetHeight,
      bitrate,
      framerate: fps,
      hardwareAcceleration: 'prefer-hardware',
      avc: { format: 'avc' },
    };
    if (await isVideoConfigSupported(testConfig)) {
      selectedCodec = candidate;
      break;
    }
  }

  // Verify and apply encoder configuration with hardware acceleration preference
  const encoderConfig: VideoEncoderConfig = {
    codec: selectedCodec,
    width: targetWidth,
    height: targetHeight,
    bitrate,
    framerate: fps,
    hardwareAcceleration: 'prefer-hardware',
    avc: { format: 'avc' },
  };

  try {
    encoder.configure(encoderConfig);
  } catch (err) {
    // Fallback attempt with universal baseline codec if initial configuration rejected
    try {
      encoderConfig.codec = 'avc1.42001f';
      encoder.configure(encoderConfig);
    } catch {
      throw new Error(`Failed to configure VideoEncoder with codec ${encoderConfig.codec}: ${(err as Error).message}`);
    }
  }

  // 5. Initialize Rendering Canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', {
    alpha: false,
    desynchronized: true,
    willReadFrequently: false,
  })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Sort captions for binary / fast linear search
  const sortedCaptions = [...captions].sort((a, b) => a.start - b.start);

  // Store original video state
  const originalCurrentTime = videoElement.currentTime;
  const originalPaused = videoElement.paused;
  videoElement.pause();

  options.onProgress?.(3, `Rendering ${totalFrames} frames with burned-in subtitles...`);

  // 6. Frame-by-frame chronological seek & encode loop
  try {
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      // Check for user cancellation
      if (options.signal?.aborted) {
        throw new DOMException('Export was aborted by user.', 'AbortError');
      }

      if (encoderError) {
        throw encoderError;
      }

      const currentTimestampSeconds = frameIndex / fps;
      const timestampMicroseconds = Math.round(currentTimestampSeconds * 1_000_000);
      const isKeyFrame = frameIndex % keyFrameEveryNFrames === 0;

      // Seek video to exact frame timestamp
      await seekVideoElement(videoElement, currentTimestampSeconds);

      // A. Draw source video frame (letterboxed / aspect-fill fitted)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      const srcW = videoElement.videoWidth || targetWidth;
      const srcH = videoElement.videoHeight || targetHeight;
      const srcAspect = srcW / srcH;
      const targetAspect = targetWidth / targetHeight;

      let drawW = targetWidth;
      let drawH = targetHeight;
      let drawX = 0;
      let drawY = 0;

      const fitMode = options.fitMode || 'fill';

      if (Math.abs(srcAspect - targetAspect) < 0.02) {
        // Source and target aspect match (or 'original' mode) -> 100% full screen edge-to-edge!
        drawW = targetWidth;
        drawH = targetHeight;
        drawX = 0;
        drawY = 0;
      } else if (fitMode === 'fill') {
        // Crop-to-fill: fill entire canvas completely with zero black bars
        if (srcAspect > targetAspect) {
          drawH = targetHeight;
          drawW = targetHeight * srcAspect;
          drawX = (targetWidth - drawW) / 2;
        } else {
          drawW = targetWidth;
          drawH = targetWidth / srcAspect;
          drawY = (targetHeight - drawH) / 2;
        }
      } else {
        // Fit (letterbox with black bars)
        if (srcAspect > targetAspect) {
          drawW = targetWidth;
          drawH = targetWidth / srcAspect;
          drawY = (targetHeight - drawH) / 2;
        } else {
          drawH = targetHeight;
          drawW = targetHeight * srcAspect;
          drawX = (targetWidth - drawW) / 2;
        }
      }

      ctx.drawImage(videoElement, drawX, drawY, drawW, drawH);

      // B. Lookup active subtitle at current timestamp with audio sync calibration
      const syncOffsetSec = (style.audioSyncOffsetMs || 0) / 1000;
      const calibratedTimestamp = Math.max(0, currentTimestampSeconds + syncOffsetSec);

      const activeCaption = sortedCaptions.find(
        (c) => calibratedTimestamp >= c.start && calibratedTimestamp <= c.end
      );

      // C. Render styled subtitles and karaoke highlights onto canvas
      if (activeCaption) {
        drawSubtitleOnCanvas(
          ctx,
          activeCaption,
          currentTimestampSeconds,
          style,
          targetWidth,
          targetHeight
        );
      }

      // D. Create native browser VideoFrame from canvas
      const videoFrame = new (window as any).VideoFrame(canvas, {
        timestamp: timestampMicroseconds,
        duration: Math.round((1 / fps) * 1_000_000),
      });

      // E. Feed frame into hardware VideoEncoder
      encoder.encode(videoFrame, { keyFrame: isKeyFrame });

      // F. Crucial memory cleanup: close VideoFrame immediately
      videoFrame.close();

      // Report progress periodically (throttle progress event dispatch)
      if (frameIndex % 5 === 0 || frameIndex === totalFrames - 1) {
        const progress = Math.min(95, Math.round(((frameIndex + 1) / totalFrames) * 92) + 3);
        options.onProgress?.(
          progress,
          `Encoding frame ${frameIndex + 1}/${totalFrames} (${progress}%)`
        );

        // Yield briefly to event loop to allow UI updates and encoder flush backpressure
        if (encoder.encodeQueueSize > 10) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    }

    // 7. Flush VideoEncoder
    options.onProgress?.(95, 'Flushing video encoder pipeline...');
    await encoder.flush();
    encoder.close();

    // 8. Encode audio track if audio buffer was loaded
    if (muxerHasAudio && audioBuffer) {
      options.onProgress?.(97, 'Encoding audio tracks...');
      await encodeAudioTracks(audioBuffer, muxer, options.onProgress);
    }

    // 9. Finalize MP4 Muxer container
    options.onProgress?.(99, 'Finalizing MP4 container and packaging download...');
    muxer.finalize();

    const outputBuffer = muxerTarget.buffer;
    const blob = new Blob([outputBuffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const elapsedTimeMs = performance.now() - startTime;

    options.onProgress?.(100, `Export complete in ${(elapsedTimeMs / 1000).toFixed(1)}s!`);

    return {
      blob,
      url,
      size: blob.size,
      totalFrames,
      elapsedTimeMs,
      mimeType: 'video/mp4',
    };
  } finally {
    // Restore original video state
    videoElement.currentTime = originalCurrentTime;
    if (!originalPaused) {
      videoElement.play().catch(() => {});
    }
  }
}
