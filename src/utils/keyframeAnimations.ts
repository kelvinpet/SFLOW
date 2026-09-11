import { SubtitleStyle, EntranceAnimation, ExitAnimation, AnimationEasing } from '../types';

export interface KeyframeTransformResult {
  opacity: number;
  translateX: number; // in pixels (scaled)
  translateY: number; // in pixels (scaled)
  scale: number;
  blur: number;       // in pixels
  cssTransform: string;
}

/**
 * Calculates smooth easing curve for keyframe animations
 */
function applyEasing(t: number, easing: AnimationEasing = 'ease-out'): number {
  const clamped = Math.max(0, Math.min(1, t));

  switch (easing) {
    case 'linear':
      return clamped;
    case 'ease-in-out':
      return clamped < 0.5
        ? 4 * clamped * clamped * clamped
        : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
    case 'spring': {
      // Spring elastic overshoot curve
      const c4 = (2 * Math.PI) / 3;
      return clamped === 0
        ? 0
        : clamped === 1
        ? 1
        : Math.pow(2, -10 * clamped) * Math.sin((clamped * 10 - 0.75) * c4) + 1;
    }
    case 'bounce': {
      // Subtle overshoot bounce
      if (clamped < 0.7) {
        return (clamped / 0.7) * 1.12;
      } else {
        const p = (clamped - 0.7) / 0.3;
        return 1.12 - p * 0.12;
      }
    }
    case 'ease-out':
    default:
      // Smooth cubic ease out
      return 1 - Math.pow(1 - clamped, 3);
  }
}

/**
 * Computes the keyframe entrance and exit transforms for a caption at the given playback time
 */
export function getKeyframeAnimationTransform(
  calibratedTime: number,
  captionStart: number,
  captionEnd: number,
  style: SubtitleStyle,
  scale: number = 1
): KeyframeTransformResult {
  const entrance = style.entranceAnimation || 'none';
  const exit = style.exitAnimation || 'none';
  const durationMs = style.animationDurationMs || 250;
  const easing = style.animationEasing || 'ease-out';
  const intensity = style.keyframeIntensity || 1.0;

  // Default neutral state
  let opacity = 1;
  let translateX = 0;
  let translateY = 0;
  let scaleFactor = 1;
  let blur = 0;

  if (entrance === 'none' && exit === 'none') {
    return {
      opacity: 1,
      translateX: 0,
      translateY: 0,
      scale: 1,
      blur: 0,
      cssTransform: 'none',
    };
  }

  const captionDuration = Math.max(0.1, captionEnd - captionStart);
  // Cap animation duration so entrance + exit never overlap for short cues
  const maxAnimSec = Math.min(durationMs / 1000, captionDuration * 0.45);
  const timeSinceStart = calibratedTime - captionStart;
  const timeUntilEnd = captionEnd - calibratedTime;

  // 1. Entrance Transition Check
  if (entrance !== 'none' && timeSinceStart >= 0 && timeSinceStart < maxAnimSec) {
    const rawProgress = timeSinceStart / maxAnimSec;
    const progress = applyEasing(rawProgress, easing);
    const inverse = 1 - progress;

    switch (entrance) {
      case 'fade-in':
        opacity = progress;
        break;
      case 'slide-up':
        opacity = progress;
        translateY = inverse * 36 * intensity * scale;
        break;
      case 'slide-down':
        opacity = progress;
        translateY = -inverse * 36 * intensity * scale;
        break;
      case 'slide-left':
        opacity = progress;
        translateX = inverse * 48 * intensity * scale;
        break;
      case 'slide-right':
        opacity = progress;
        translateX = -inverse * 48 * intensity * scale;
        break;
      case 'pop-scale':
        opacity = progress;
        scaleFactor = 0.35 + 0.65 * progress;
        break;
      case 'zoom-in':
        opacity = progress;
        scaleFactor = 0.2 + 0.8 * progress;
        break;
      case 'bounce-in':
        opacity = progress;
        if (rawProgress < 0.65) {
          scaleFactor = (rawProgress / 0.65) * (1 + 0.22 * intensity);
        } else {
          const subP = (rawProgress - 0.65) / 0.35;
          scaleFactor = (1 + 0.22 * intensity) - subP * (0.22 * intensity);
        }
        break;
    }
  }

  // 2. Exit Transition Check
  if (exit !== 'none' && timeUntilEnd >= 0 && timeUntilEnd < maxAnimSec) {
    const rawExitProgress = timeUntilEnd / maxAnimSec; // 1 down to 0
    const progress = applyEasing(rawExitProgress, 'ease-out'); // 1 down to 0
    const exitFraction = 1 - progress; // 0 up to 1

    switch (exit) {
      case 'fade-out':
        opacity = Math.min(opacity, progress);
        break;
      case 'slide-up':
        opacity = Math.min(opacity, progress);
        translateY = -exitFraction * 36 * intensity * scale;
        break;
      case 'slide-down':
        opacity = Math.min(opacity, progress);
        translateY = exitFraction * 36 * intensity * scale;
        break;
      case 'pop-out':
        opacity = Math.min(opacity, progress);
        scaleFactor = Math.max(0.1, 1 - exitFraction * 0.45 * intensity);
        break;
      case 'zoom-out':
        opacity = Math.min(opacity, progress);
        scaleFactor = 1 + exitFraction * 0.45 * intensity;
        break;
      case 'drop-blur':
        opacity = Math.min(opacity, progress);
        translateY = exitFraction * 32 * intensity * scale;
        blur = exitFraction * 8 * scale;
        break;
    }
  }

  const cssTransforms: string[] = [];
  if (translateX !== 0 || translateY !== 0) {
    cssTransforms.push(`translate3d(${translateX}px, ${translateY}px, 0)`);
  }
  if (scaleFactor !== 1) {
    cssTransforms.push(`scale(${scaleFactor.toFixed(3)})`);
  }

  return {
    opacity: Math.max(0, Math.min(1, opacity)),
    translateX,
    translateY,
    scale: scaleFactor,
    blur,
    cssTransform: cssTransforms.length > 0 ? cssTransforms.join(' ') : 'none',
  };
}
