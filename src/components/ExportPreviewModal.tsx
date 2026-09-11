import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Film,
  Sparkles,
  CheckCircle2,
  X,
  Sliders,
  Clock,
  Layers,
  Repeat,
  Download,
  Eye,
  Type,
  Maximize2,
  Volume1,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  Square,
  Check,
} from 'lucide-react';
import { Caption, SubtitleStyle, AspectRatioType, VideoResolutionPreset } from '../types';
import { drawSubtitleOnCanvas } from '../utils/videoRecorder';
import { calculateExportDimensions } from '../utils/resolutionPresets';
import { formatTime } from '../utils/time';

export interface ExportPreviewSettings {
  resolution: VideoResolutionPreset;
  aspectRatio: AspectRatioType;
  fitMode: 'fill' | 'fit';
  format: 'mp4' | 'webm';
}

interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoElement: HTMLVideoElement | null;
  captions: Caption[];
  style: SubtitleStyle;
  currentTime: number;
  duration: number;
  videoFormat?: 'mp4' | 'webm';
  videoQuality?: string;
  videoFps?: number;
  videoResolution?: VideoResolutionPreset;
  videoAspectRatio?: AspectRatioType;
  videoFitMode?: 'fill' | 'fit';
  onStartFullRender?: (settings?: ExportPreviewSettings) => void;
}

const RESOLUTION_OPTIONS: { id: VideoResolutionPreset; label: string; short: string }[] = [
  { id: '720p', label: '720p HD', short: '720p' },
  { id: '1080p', label: '1080p FHD', short: '1080p' },
  { id: '1440p', label: '1440p 2K', short: '1440p' },
  { id: '4k', label: '4K UHD', short: '4K' },
];

const ASPECT_OPTIONS: { id: AspectRatioType; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'original', label: 'Original', icon: <Monitor className="w-3.5 h-3.5" />, desc: 'Native Source' },
  { id: '9:16', label: '9:16 Vertical', icon: <Smartphone className="w-3.5 h-3.5" />, desc: 'TikTok / Shorts / Reels' },
  { id: '16:9', label: '16:9 Landscape', icon: <Monitor className="w-3.5 h-3.5" />, desc: 'YouTube / Desktop' },
  { id: '1:1', label: '1:1 Square', icon: <Square className="w-3.5 h-3.5" />, desc: 'Instagram Feed' },
  { id: '4:5', label: '4:5 Portrait', icon: <Smartphone className="w-3.5 h-3.5" />, desc: 'Social Carousel' },
];

export const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({
  isOpen,
  onClose,
  videoElement,
  captions,
  style,
  currentTime,
  duration = 15,
  videoFormat = 'mp4',
  videoQuality = 'high',
  videoFps = 30,
  videoResolution = '1080p',
  videoAspectRatio = 'original',
  videoFitMode = 'fill',
  onStartFullRender,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Interactive Export Settings within Preview
  const [selectedResolution, setSelectedResolution] = useState<VideoResolutionPreset>(videoResolution);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatioType>(videoAspectRatio);
  const [selectedFitMode, setSelectedFitMode] = useState<'fill' | 'fit'>(videoFitMode);
  const [sliceDuration, setSliceDuration] = useState<number>(5.0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [audioVolume, setAudioVolume] = useState<number>(0.8);
  const prevAudioVolumeRef = useRef<number>(0.8);

  // Synchronize initial incoming settings when modal opens
  useEffect(() => {
    if (isOpen) {
      if (videoResolution) setSelectedResolution(videoResolution);
      if (videoAspectRatio) setSelectedAspectRatio(videoAspectRatio);
      if (videoFitMode) setSelectedFitMode(videoFitMode);
    }
  }, [isOpen, videoResolution, videoAspectRatio, videoFitMode]);

  // Slice time window
  const initialSliceStart = Math.min(
    Math.max(0, currentTime),
    Math.max(0, duration - sliceDuration)
  );
  const [sliceStart, setSliceStart] = useState<number>(initialSliceStart);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [currentSliceTime, setCurrentSliceTime] = useState<number>(initialSliceStart);

  // Dedicated sample video element for previewing without affecting main workspace
  const sampleVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      const calculatedStart = Math.min(
        Math.max(0, currentTime),
        Math.max(0, duration - sliceDuration)
      );
      setSliceStart(calculatedStart);
      setCurrentSliceTime(calculatedStart);
      setIsPlaying(true);
    }
  }, [isOpen, currentTime, duration, sliceDuration]);

  // Initialize and synchronize sample video player
  useEffect(() => {
    if (!isOpen) return;

    let sampleVideo: HTMLVideoElement;
    if (!sampleVideoRef.current) {
      sampleVideo = document.createElement('video');
      sampleVideo.crossOrigin = 'anonymous';
      sampleVideo.playsInline = true;
      sampleVideo.volume = audioVolume;
      sampleVideo.muted = isAudioMuted;
      if (videoElement && (videoElement.src || videoElement.currentSrc)) {
        sampleVideo.src = videoElement.src || videoElement.currentSrc;
      }
      sampleVideoRef.current = sampleVideo;
    } else {
      sampleVideo = sampleVideoRef.current;
      sampleVideo.volume = audioVolume;
      sampleVideo.muted = isAudioMuted;
      if (videoElement && (videoElement.src || videoElement.currentSrc) && sampleVideo.src !== (videoElement.src || videoElement.currentSrc)) {
        sampleVideo.src = videoElement.src || videoElement.currentSrc;
      }
    }

    sampleVideo.currentTime = sliceStart;
    sampleVideo.play().catch(() => {});

    return () => {
      if (sampleVideoRef.current) {
        sampleVideoRef.current.pause();
      }
    };
  }, [isOpen, videoElement, sliceStart, isAudioMuted]);

  // Main rendering animation loop
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const vid = sampleVideoRef.current || videoElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nativeW = (vid && vid.videoWidth) ? vid.videoWidth : 1080;
    const nativeH = (vid && vid.videoHeight) ? vid.videoHeight : 1920;
    const dims = calculateExportDimensions(selectedResolution, selectedAspectRatio, nativeW, nativeH);
    const width = dims.width;
    const height = dims.height;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Draw base video frame with fit/fill mode
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    if (vid && vid.readyState >= 2) {
      try {
        const targetAspectVal = width / height;
        const sourceAspectVal = nativeW / nativeH;

        let drawX = 0;
        let drawY = 0;
        let drawW = width;
        let drawH = height;

        if (selectedFitMode === 'fit') {
          if (sourceAspectVal > targetAspectVal) {
            drawW = width;
            drawH = width / sourceAspectVal;
            drawX = 0;
            drawY = (height - drawH) / 2;
          } else {
            drawH = height;
            drawW = height * sourceAspectVal;
            drawX = (width - drawW) / 2;
            drawY = 0;
          }
        } else {
          // Fill mode (crop to fill canvas, no black bars)
          if (sourceAspectVal > targetAspectVal) {
            drawH = height;
            drawW = height * sourceAspectVal;
            drawX = (width - drawW) / 2;
            drawY = 0;
          } else {
            drawW = width;
            drawH = width / sourceAspectVal;
            drawX = 0;
            drawY = (height - drawH) / 2;
          }
        }

        ctx.drawImage(vid, drawX, drawY, drawW, drawH);
      } catch {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      // Fallback stylized dark backdrop if video element isn't ready
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#18181b');
      grad.addColorStop(1, '#09090b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Current playback time in sample slice
    const currentVideoTime = vid ? vid.currentTime : sliceStart;
    setCurrentSliceTime(currentVideoTime);

    // Check slice boundary
    const sliceEnd = sliceStart + sliceDuration;
    if (currentVideoTime >= sliceEnd) {
      if (isLooping && vid) {
        vid.currentTime = sliceStart;
        vid.play().catch(() => {});
      } else if (vid) {
        vid.pause();
        setIsPlaying(false);
      }
    }

    // Find active caption at this exact instant
    const activeCaption = captions.find(
      (c) => currentVideoTime >= c.start && currentVideoTime <= c.end
    );

    // Render subtitle with aspect-aware scaling
    if (activeCaption) {
      const styleWithAspect = { ...style, aspectRatio: selectedAspectRatio };
      drawSubtitleOnCanvas(ctx, activeCaption, currentVideoTime, styleWithAspect, width, height);
    }

    if (isPlaying) {
      animFrameIdRef.current = requestAnimationFrame(renderFrame);
    }
  }, [
    captions,
    style,
    sliceStart,
    sliceDuration,
    isLooping,
    isPlaying,
    videoElement,
    selectedResolution,
    selectedAspectRatio,
    selectedFitMode,
  ]);

  useEffect(() => {
    if (!isOpen) {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      return;
    }

    if (isPlaying) {
      animFrameIdRef.current = requestAnimationFrame(renderFrame);
    } else {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderFrame();
    }

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isOpen, isPlaying, renderFrame]);

  if (!isOpen) return null;

  const sliceElapsed = Math.max(0, Math.min(sliceDuration, currentSliceTime - sliceStart));
  const sliceProgressPct = (sliceElapsed / sliceDuration) * 100;

  const handleTogglePlay = () => {
    const vid = sampleVideoRef.current;
    if (!vid) return;

    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
    } else {
      if (vid.currentTime >= sliceStart + sliceDuration) {
        vid.currentTime = sliceStart;
      }
      vid.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleRestartSlice = () => {
    const vid = sampleVideoRef.current;
    if (!vid) return;
    vid.currentTime = sliceStart;
    vid.play().catch(() => {});
    setIsPlaying(true);
  };

  const handleToggleAudio = () => {
    const vid = sampleVideoRef.current;
    if (isAudioMuted || audioVolume === 0) {
      const restored = prevAudioVolumeRef.current > 0 ? prevAudioVolumeRef.current : 0.8;
      setIsAudioMuted(false);
      setAudioVolume(restored);
      if (vid) {
        vid.muted = false;
        vid.volume = restored;
      }
    } else {
      prevAudioVolumeRef.current = audioVolume;
      setIsAudioMuted(true);
      if (vid) {
        vid.muted = true;
      }
    }
  };

  const handleAudioVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setAudioVolume(clamped);
    const vid = sampleVideoRef.current;
    if (clamped === 0) {
      setIsAudioMuted(true);
      if (vid) {
        vid.muted = true;
        vid.volume = 0;
      }
    } else {
      setIsAudioMuted(false);
      prevAudioVolumeRef.current = clamped;
      if (vid) {
        vid.muted = false;
        vid.volume = clamped;
      }
    }
  };

  const handleSelectSliceStart = (newStart: number) => {
    const clamped = Math.max(0, Math.min(newStart, Math.max(0, duration - sliceDuration)));
    setSliceStart(clamped);
    const vid = sampleVideoRef.current;
    if (vid) {
      vid.currentTime = clamped;
      if (isPlaying) {
        vid.play().catch(() => {});
      }
    }
  };

  // Dimensions computation for display
  const nativeW = videoElement?.videoWidth || 1080;
  const nativeH = videoElement?.videoHeight || 1920;
  const currentDims = calculateExportDimensions(selectedResolution, selectedAspectRatio, nativeW, nativeH);

  // Aspect ratio class calculation for stage sizing
  const getContainerAspectClass = (ar: AspectRatioType) => {
    switch (ar) {
      case '16:9':
        return 'aspect-[16/9] w-full max-h-[240px] sm:max-h-[380px]';
      case '9:16':
        return 'aspect-[9/16] h-[260px] sm:h-[360px] md:h-[430px] w-auto max-w-full';
      case '1:1':
        return 'aspect-square h-[220px] sm:h-[300px] md:h-[380px] w-auto max-w-full';
      case '4:5':
        return 'aspect-[4/5] h-[240px] sm:h-[330px] md:h-[410px] w-auto max-w-full';
      default:
        if (nativeW >= nativeH) {
          return 'aspect-[16/9] w-full max-h-[240px] sm:max-h-[380px]';
        }
        return 'aspect-[9/16] h-[260px] sm:h-[360px] md:h-[430px] w-auto max-w-full';
    }
  };

  return (
    <div
      id="export-preview-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="export-preview-modal-card"
        className="w-full max-w-5xl bg-zinc-950/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col text-zinc-100 max-h-[96vh] sm:max-h-[94vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-3 sm:px-6 sm:py-4 border-b border-white/[0.08] bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 backdrop-blur-md shrink-0">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white">Live Export Preview</h3>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  {sliceDuration}s Sample
                </span>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold hidden xs:inline">
                  {currentDims.width}×{currentDims.height}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 hidden xs:block">
                Pixel-accurate verification with burned-in subtitles, active animations, and dynamic framing
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-export-preview-btn"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] transition-colors"
            title="Close Preview"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content Body: Left Video Canvas Preview, Right Interactive Settings Inspector */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Video Preview Canvas Column (Cols 1-7) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-between bg-black/40 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-zinc-800/90 shadow-inner">
            <div className="relative w-full flex items-center justify-center min-h-[220px] sm:min-h-[300px] max-h-[440px]">
              <div
                className={`relative flex items-center justify-center bg-black rounded-xl overflow-hidden shadow-2xl border border-zinc-800 transition-all duration-300 ${getContainerAspectClass(
                  selectedAspectRatio
                )}`}
              >
                <canvas
                  ref={canvasRef}
                  id="export-preview-canvas"
                  className="max-h-full max-w-full object-contain"
                />

                {/* Top Status Overlay Badge */}
                <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1.5 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{sliceDuration}.0s Preview</span>
                </div>

                {/* Top Right Aspect Tag */}
                <div className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono font-semibold text-indigo-300 pointer-events-none">
                  {selectedAspectRatio} • {selectedFitMode === 'fill' ? 'Fill' : 'Letterbox'}
                </div>
              </div>
            </div>

            {/* Playback Controls & Progress Bar */}
            <div className="w-full mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
                <span>
                  {formatTime(sliceStart + sliceElapsed)} / {formatTime(sliceStart + sliceDuration)}
                </span>
                <span className="text-indigo-400 font-bold">
                  {sliceElapsed.toFixed(1)}s / {sliceDuration}.0s slice
                </span>
              </div>

              {/* Slice Progress Bar */}
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-75"
                  style={{ width: `${sliceProgressPct}%` }}
                />
              </div>

              {/* Player Buttons */}
              <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="export-preview-play-btn"
                    onClick={handleTogglePlay}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-all active:scale-95"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    id="export-preview-restart-btn"
                    onClick={handleRestartSlice}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl transition-all active:scale-95"
                    title="Replay Sample"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    id="export-preview-loop-toggle-btn"
                    onClick={() => setIsLooping(!isLooping)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all ${
                      isLooping
                        ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Loop</span>
                  </button>

                  {/* Volume Slider & Mute Toggle */}
                  <div
                    id="export-preview-volume-control-group"
                    className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-xl"
                  >
                    <button
                      type="button"
                      id="export-preview-mute-toggle-btn"
                      onClick={handleToggleAudio}
                      className={`p-1.5 rounded-lg transition-colors focus:outline-none ${
                        isAudioMuted || audioVolume === 0
                          ? 'text-rose-400 hover:text-rose-300'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title={
                        isAudioMuted || audioVolume === 0
                          ? 'Unmute preview audio'
                          : `Mute preview audio (${Math.round(audioVolume * 100)}%)`
                      }
                      aria-label={isAudioMuted || audioVolume === 0 ? 'Unmute preview audio' : 'Mute preview audio'}
                    >
                      {isAudioMuted || audioVolume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-500" />
                      ) : audioVolume < 0.5 ? (
                        <Volume1 className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-indigo-400" />
                      )}
                    </button>
                    <input
                      type="range"
                      id="export-preview-volume-slider"
                      min={0}
                      max={1}
                      step={0.01}
                      value={isAudioMuted ? 0 : audioVolume}
                      onChange={(e) => handleAudioVolumeChange(Number(e.target.value))}
                      className="w-16 sm:w-20 accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer transition-all"
                      title={`Preview Volume: ${isAudioMuted || audioVolume === 0 ? '0% (Muted)' : `${Math.round(audioVolume * 100)}%`}`}
                      aria-label="Preview volume level"
                      aria-valuenow={isAudioMuted ? 0 : Math.round(audioVolume * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                    <span className="text-[10px] font-mono font-bold text-zinc-400 min-w-[28px] text-right select-none">
                      {isAudioMuted || audioVolume === 0 ? '0%' : `${Math.round(audioVolume * 100)}%`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Slice Duration Selector */}
                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                    {[3, 5, 10].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setSliceDuration(dur)}
                        className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md transition-all ${
                          sliceDuration === dur
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {dur}s
                      </button>
                    ))}
                  </div>

                  <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
                    Range: {formatTime(sliceStart)} - {formatTime(sliceStart + sliceDuration)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Inspection & Interactive Controls (Cols 8-12) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {/* Slice Timeline Position Card */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Slice Position in Video</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  Starts at: {formatTime(sliceStart)}
                </span>
              </div>

              {/* Quick Jump Buttons */}
              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => handleSelectSliceStart(0)}
                  className={`py-1 px-2 rounded-lg border transition-all text-center ${
                    sliceStart === 0
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                  }`}
                >
                  Start (00:00)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSelectSliceStart(
                      Math.max(0, Math.min(currentTime, duration - sliceDuration))
                    )
                  }
                  className="py-1 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-center transition-colors"
                >
                  Playhead ({formatTime(currentTime)})
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSliceStart(Math.max(0, (duration - sliceDuration) / 2))}
                  className="py-1 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-center transition-colors"
                >
                  Middle
                </button>
              </div>

              {/* Scrub Slider */}
              <div className="pt-1">
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, duration - sliceDuration)}
                  step="0.5"
                  value={sliceStart}
                  onChange={(e) => handleSelectSliceStart(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-0.5">
                  <span>00:00</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>

            {/* Interactive Target Dimensions & Aspect Ratio Controls */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Target Dimensions & Framing</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
                  {currentDims.width}×{currentDims.height}
                </span>
              </div>

              {/* Aspect Ratio Selector Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {ASPECT_OPTIONS.map((opt) => {
                  const isSelected = selectedAspectRatio === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedAspectRatio(opt.id)}
                      className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-xs'
                          : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-semibold text-xs">
                          {opt.icon}
                          <span>{opt.label}</span>
                        </span>
                        {isSelected && <Check className="w-3 h-3 text-indigo-400 shrink-0" />}
                      </div>
                      <span className="text-[9.5px] text-zinc-500 truncate">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Framing Mode: Fill vs Fit */}
              <div className="pt-2 border-t border-zinc-800/70 flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-400 font-medium">Framing Mode:</span>
                <div className="grid grid-cols-2 gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setSelectedFitMode('fill')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      selectedFitMode === 'fill'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Full Screen (Fill)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFitMode('fit')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      selectedFitMode === 'fit'
                        ? 'bg-zinc-800 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Fit (Letterbox)
                  </button>
                </div>
              </div>

              {/* Resolution Selector */}
              <div className="pt-2 border-t border-zinc-800/70 flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-400 font-medium">Export Quality:</span>
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-mono font-bold">
                  {RESOLUTION_OPTIONS.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => setSelectedResolution(res.id)}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        selectedResolution === res.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {res.short}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Applied Typography & Animation Summary */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Subtitle Style Specifications</span>
              </span>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between">
                  <span className="text-zinc-400">Font:</span>
                  <span className="font-semibold text-white truncate max-w-[110px]">
                    {style.fontFamily}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between">
                  <span className="text-zinc-400">Color:</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20"
                      style={{ backgroundColor: style.textColor }}
                    />
                    <span className="font-semibold text-white">{style.textColor}</span>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between">
                  <span className="text-zinc-400">Animation:</span>
                  <span className="font-semibold text-amber-300 capitalize">
                    {style.entranceAnimation || 'None'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between">
                  <span className="text-zinc-400">Output:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {videoFormat.toUpperCase()} ({videoFps} fps)
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Primary Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                id="export-preview-confirm-render-btn"
                onClick={() => {
                  onClose();
                  if (onStartFullRender) {
                    onStartFullRender({
                      resolution: selectedResolution,
                      aspectRatio: selectedAspectRatio,
                      fitMode: selectedFitMode,
                      format: videoFormat,
                    });
                  }
                }}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 border border-emerald-400/40 backdrop-blur-md transition-all active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Looks Good! Start Full Video Export</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-white/[0.04] hover:bg-white/[0.09] text-zinc-300 hover:text-white border border-white/[0.08] backdrop-blur-md rounded-xl text-xs font-semibold transition-colors"
              >
                Back to Workspace
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
