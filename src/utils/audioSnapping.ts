import { Caption, WordTimestamp } from '../types';

/**
 * Options for customizing the audio snapping behavior
 */
export interface SnapToAudioOptions {
  /**
   * Maximum search distance in seconds around each caption start/end point (default: 0.45s)
   */
  searchRadiusSec?: number;
  /**
   * Threshold (0.0 to 1.0) below which audio is considered silence.
   * If not provided, an adaptive threshold based on the 20th percentile noise floor is used.
   */
  silenceThreshold?: number;
  /**
   * Minimum duration for a caption in seconds (default: 0.4s)
   */
  minCaptionDuration?: number;
  /**
   * Minimum gap to preserve between adjacent captions in seconds (default: 0.05s)
   */
  minGapBetweenCaptionsSec?: number;
}

export interface SnapResult {
  captions: Caption[];
  adjustedCount: number;
  averageShiftMs: number;
}

export interface SilenceInterval {
  start: number;
  end: number;
  duration: number;
}

/**
 * Computes an adaptive silence threshold from the waveform peak distribution
 */
export function calculateAdaptiveSilenceThreshold(waveformPeaks: number[]): number {
  if (!waveformPeaks || waveformPeaks.length === 0) return 0.05;

  const sorted = [...waveformPeaks].sort((a, b) => a - b);
  const p20Index = Math.floor(sorted.length * 0.2);
  const p20 = sorted[p20Index] || 0.02;

  const minVal = sorted[0];
  const avgVal = sorted.reduce((acc, v) => acc + v, 0) / sorted.length;

  // Adaptive threshold bounded comfortably between 0.02 and 0.20
  const threshold = Math.max(0.02, Math.min(0.2, minVal + (avgVal - minVal) * 0.35, p20 * 1.5));
  return Number(threshold.toFixed(3));
}

/**
 * Finds the nearest silence gap or speech onset/offset for a specific timestamp
 */
export function findNearestSilencePoint(
  targetTime: number,
  waveformPeaks: number[],
  duration: number,
  type: 'start' | 'end',
  options: SnapToAudioOptions = {}
): number {
  if (!waveformPeaks || waveformPeaks.length === 0 || duration <= 0) {
    return targetTime;
  }

  const searchRadiusSec = options.searchRadiusSec ?? 0.45;
  const threshold = options.silenceThreshold ?? calculateAdaptiveSilenceThreshold(waveformPeaks);
  const totalPeaks = waveformPeaks.length;
  const timePerPeak = duration / totalPeaks;

  const centerIndex = Math.max(0, Math.min(totalPeaks - 1, Math.round((targetTime / duration) * (totalPeaks - 1))));
  const radiusInPeaks = Math.max(1, Math.ceil(searchRadiusSec / timePerPeak));

  const startIndex = Math.max(0, centerIndex - radiusInPeaks);
  const endIndex = Math.min(totalPeaks - 1, centerIndex + radiusInPeaks);

  let bestIndex = centerIndex;
  let bestScore = Infinity;

  for (let i = startIndex; i <= endIndex; i++) {
    const peakVal = waveformPeaks[i];
    const candidateTime = (i / (totalPeaks - 1)) * duration;
    const timeDist = Math.abs(candidateTime - targetTime);

    // 1. Base energy score (lower peak amplitude = better silence candidate)
    let score = peakVal * 1.5;

    // 2. Distance penalty (prefer closer points to prevent wild jumping)
    const distPenalty = (timeDist / searchRadiusSec) * 0.6;
    score += distPenalty;

    // 3. Directional edge detection:
    // For 'start' boundaries, prioritize silence right before a voice onset (rising edge)
    if (type === 'start') {
      const prevVal = i > 0 ? waveformPeaks[i - 1] : peakVal;
      const nextVal = i < totalPeaks - 1 ? waveformPeaks[i + 1] : peakVal;
      
      // Bonus if this point is quiet and the next point begins speech
      if (peakVal <= threshold && nextVal > peakVal) {
        score -= 0.4;
      } else if (peakVal <= threshold) {
        score -= 0.25;
      }

      // Small preference for silence preceding the word start
      if (candidateTime <= targetTime) {
        score -= 0.05;
      }
    } else {
      // For 'end' boundaries, prioritize silence right after a voice offset (falling edge)
      const prevVal = i > 0 ? waveformPeaks[i - 1] : peakVal;
      const nextVal = i < totalPeaks - 1 ? waveformPeaks[i + 1] : peakVal;

      // Bonus if voice was active before and now drops into silence
      if (peakVal <= threshold && prevVal > peakVal) {
        score -= 0.4;
      } else if (peakVal <= threshold) {
        score -= 0.25;
      }

      // Small preference for silence following the word end
      if (candidateTime >= targetTime) {
        score -= 0.05;
      }
    }

    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  const snappedTime = (bestIndex / (totalPeaks - 1)) * duration;
  return Number(Math.max(0, Math.min(duration, snappedTime)).toFixed(2));
}

/**
 * Re-aligns internal word timestamps proportionally to match the newly adjusted caption boundaries
 */
export function realignWordTimestamps(
  words: WordTimestamp[],
  oldStart: number,
  oldEnd: number,
  newStart: number,
  newEnd: number
): WordTimestamp[] {
  if (!words || words.length === 0) return [];

  const oldDuration = Math.max(0.01, oldEnd - oldStart);
  const newDuration = Math.max(0.01, newEnd - newStart);

  return words.map((w, index) => {
    // Relative positioning within the old caption window (0.0 to 1.0)
    const relStart = Math.max(0, Math.min(1, (w.start - oldStart) / oldDuration));
    const relEnd = Math.max(0, Math.min(1, (w.end - oldStart) / oldDuration));

    let wordNewStart = Number((newStart + relStart * newDuration).toFixed(2));
    let wordNewEnd = Number((newStart + relEnd * newDuration).toFixed(2));

    // Ensure word end is strictly greater than word start
    if (wordNewEnd <= wordNewStart) {
      wordNewEnd = Number((wordNewStart + 0.05).toFixed(2));
    }

    return {
      ...w,
      start: wordNewStart,
      end: wordNewEnd,
    };
  });
}

/**
 * Snaps a single caption's start and end boundaries to the nearest audio silence points
 */
export function snapCaptionToAudio(
  caption: Caption,
  waveformPeaks: number[],
  duration: number,
  options: SnapToAudioOptions = {}
): Caption {
  if (!waveformPeaks || waveformPeaks.length === 0 || duration <= 0) {
    return caption;
  }

  const minDuration = options.minCaptionDuration ?? 0.4;

  const snappedStart = findNearestSilencePoint(caption.start, waveformPeaks, duration, 'start', options);
  let snappedEnd = findNearestSilencePoint(caption.end, waveformPeaks, duration, 'end', options);

  // Guarantee minimum caption duration
  if (snappedEnd - snappedStart < minDuration) {
    snappedEnd = Number(Math.min(duration, snappedStart + minDuration).toFixed(2));
  }

  const newWords = caption.words && caption.words.length > 0
    ? realignWordTimestamps(caption.words, caption.start, caption.end, snappedStart, snappedEnd)
    : undefined;

  return {
    ...caption,
    start: snappedStart,
    end: snappedEnd,
    words: newWords,
  };
}

/**
 * Snaps all captions to the nearest silence gaps in the audio track,
 * maintaining sequential chronological ordering and resolving boundary collisions.
 */
export function snapAllCaptionsToAudio(
  captions: Caption[],
  waveformPeaks: number[],
  duration: number,
  options: SnapToAudioOptions = {}
): SnapResult {
  if (!captions || captions.length === 0) {
    return { captions: [], adjustedCount: 0, averageShiftMs: 0 };
  }

  if (!waveformPeaks || waveformPeaks.length === 0 || duration <= 0) {
    return { captions, adjustedCount: 0, averageShiftMs: 0 };
  }

  const minGap = options.minGapBetweenCaptionsSec ?? 0.04;
  const minDuration = options.minCaptionDuration ?? 0.35;

  // Sort captions chronologically
  const sorted = [...captions].sort((a, b) => a.start - b.start);
  let totalShiftMs = 0;
  let adjustedCount = 0;

  const snappedList: Caption[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const prev = snappedList[i - 1];

    let newStart = findNearestSilencePoint(current.start, waveformPeaks, duration, 'start', options);
    let newEnd = findNearestSilencePoint(current.end, waveformPeaks, duration, 'end', options);

    // If snapping caused overlap with previous caption, clamp to after prev end
    if (prev) {
      if (newStart < prev.end + minGap) {
        newStart = Number((prev.end + minGap).toFixed(2));
      }
    }

    // Ensure minimum duration
    if (newEnd - newStart < minDuration) {
      newEnd = Number(Math.min(duration, newStart + minDuration).toFixed(2));
    }

    const startDiff = Math.abs(newStart - current.start);
    const endDiff = Math.abs(newEnd - current.end);

    if (startDiff > 0.01 || endDiff > 0.01) {
      adjustedCount++;
      totalShiftMs += (startDiff + endDiff) * 500; // Average shift for this item
    }

    const updatedWords = current.words && current.words.length > 0
      ? realignWordTimestamps(current.words, current.start, current.end, newStart, newEnd)
      : undefined;

    snappedList.push({
      ...current,
      start: newStart,
      end: newEnd,
      words: updatedWords,
    });
  }

  const averageShiftMs = adjustedCount > 0 ? Math.round(totalShiftMs / adjustedCount) : 0;

  return {
    captions: snappedList,
    adjustedCount,
    averageShiftMs,
  };
}

/**
 * Detects all silence gaps/intervals across the entire audio track
 */
export function detectAudioSilenceIntervals(
  waveformPeaks: number[],
  duration: number,
  customThreshold?: number
): SilenceInterval[] {
  if (!waveformPeaks || waveformPeaks.length === 0 || duration <= 0) return [];

  const threshold = customThreshold ?? calculateAdaptiveSilenceThreshold(waveformPeaks);
  const totalPeaks = waveformPeaks.length;
  const timePerPeak = duration / totalPeaks;

  const intervals: SilenceInterval[] = [];
  let currentSilenceStart: number | null = null;

  for (let i = 0; i < totalPeaks; i++) {
    const isSilent = waveformPeaks[i] <= threshold;
    const time = (i / totalPeaks) * duration;

    if (isSilent && currentSilenceStart === null) {
      currentSilenceStart = time;
    } else if (!isSilent && currentSilenceStart !== null) {
      const gapDuration = time - currentSilenceStart;
      if (gapDuration >= 0.15) {
        intervals.push({
          start: Number(currentSilenceStart.toFixed(2)),
          end: Number(time.toFixed(2)),
          duration: Number(gapDuration.toFixed(2)),
        });
      }
      currentSilenceStart = null;
    }
  }

  if (currentSilenceStart !== null) {
    const gapDuration = duration - currentSilenceStart;
    if (gapDuration >= 0.15) {
      intervals.push({
        start: Number(currentSilenceStart.toFixed(2)),
        end: Number(duration.toFixed(2)),
        duration: Number(gapDuration.toFixed(2)),
      });
    }
  }

  return intervals;
}
