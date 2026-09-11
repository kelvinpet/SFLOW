/**
 * Extracts audio from a video File or URL, resamples to 16kHz mono WAV for Whisper AI,
 * and extracts peak waveform points for visual timeline rendering.
 */

export async function extractAudioWaveformAndWav(
  source: File | string,
  onProgress?: (percent: number, step: string) => void
): Promise<{ wavBlob: Blob; waveformPeaks: number[]; duration: number }> {
  onProgress?.(10, 'Loading media data...');

  let arrayBuffer: ArrayBuffer;
  if (typeof source === 'string') {
    const response = await fetch(source);
    if (!response.ok) throw new Error('Failed to load video source for audio extraction');
    arrayBuffer = await response.arrayBuffer();
  } else {
    arrayBuffer = await source.arrayBuffer();
  }

  onProgress?.(30, 'Decoding audio track...');
  
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioCtx();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  } catch (err) {
    console.warn('Direct decode failed, attempting fallback or media element extraction...', err);
    throw new Error('Could not extract audio track from this video file. Ensure the video contains an active audio stream.');
  } finally {
    audioContext.close();
  }

  onProgress?.(60, 'Processing audio waveform...');

  // Generate 200 normalized peaks for visual timeline representation
  const rawData = audioBuffer.getChannelData(0);
  const totalSamples = rawData.length;
  const numPeaks = 200;
  const step = Math.floor(totalSamples / numPeaks);
  const waveformPeaks: number[] = [];

  for (let i = 0; i < numPeaks; i++) {
    let sum = 0;
    const startSample = i * step;
    const endSample = Math.min(startSample + step, totalSamples);
    for (let j = startSample; j < endSample; j++) {
      sum += Math.abs(rawData[j]);
    }
    const avg = sum / (endSample - startSample || 1);
    waveformPeaks.push(Math.min(1, avg * 3.5)); // slight gain boost for visuals
  }

  onProgress?.(80, 'Encoding 16kHz WAV for Whisper AI...');

  // Resample to 16000Hz mono for Whisper (fastest, smallest payload, ideal accuracy)
  const targetSampleRate = 16000;
  const offlineCtx = new OfflineAudioContext(
    1,
    Math.ceil(audioBuffer.duration * targetSampleRate),
    targetSampleRate
  );

  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.connect(offlineCtx.destination);
  sourceNode.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWavBlob(renderedBuffer);

  onProgress?.(100, 'Audio extracted successfully');

  return {
    wavBlob,
    waveformPeaks,
    duration: audioBuffer.duration,
  };
}

/**
 * Converts an AudioBuffer to a standard 16-bit PCM WAV Blob
 */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // Write RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // Write fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // Write data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write interleaved PCM samples
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channelData[ch][i];
      // Clamp between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit signed integer (-32768 to 32767)
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Generates synthetic realistic waveform peaks aligned with caption timestamps and silence gaps
 */
export function generateSyntheticWaveformForCaptions(
  captions: Array<{ start: number; end: number }>,
  duration: number,
  numPeaks: number = 200
): number[] {
  const peaks: number[] = [];
  const safeDuration = duration > 0 ? duration : 15;
  const timePerPeak = safeDuration / numPeaks;

  for (let i = 0; i < numPeaks; i++) {
    const time = i * timePerPeak;
    // Check if this time falls inside any caption window
    const activeCap = captions.find((c) => time >= c.start && time <= c.end);

    if (activeCap) {
      // Modulate amplitude across the word chunk to mimic human vocal cadence
      const capProgress = (time - activeCap.start) / Math.max(0.1, activeCap.end - activeCap.start);
      const envelope = Math.sin(capProgress * Math.PI);
      const naturalNoise = (Math.sin(i * 0.8) + Math.cos(i * 1.7)) * 0.15;
      const baseAmp = 0.45 + envelope * 0.35 + naturalNoise;
      peaks.push(Math.max(0.1, Math.min(0.95, baseAmp)));
    } else {
      // Silence gap between captions / sentences
      const noiseFloor = 0.015 + Math.random() * 0.025;
      peaks.push(noiseFloor);
    }
  }

  return peaks;
}
