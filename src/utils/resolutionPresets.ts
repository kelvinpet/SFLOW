import { AspectRatioType, VideoResolutionPreset } from '../types';

export interface ResolutionPresetConfig {
  id: VideoResolutionPreset;
  label: string;
  shortLabel: string;
  badge: string;
  description: string;
  nominalHeight: number;
}

export const RESOLUTION_PRESET_CONFIGS: ResolutionPresetConfig[] = [
  {
    id: '360p',
    label: '360p SD',
    shortLabel: '360p',
    badge: 'Compact',
    description: 'Fastest export, minimal file size, ideal for quick drafts & messaging',
    nominalHeight: 360,
  },
  {
    id: '480p',
    label: '480p SD',
    shortLabel: '480p',
    badge: 'Standard',
    description: 'Standard Definition, balanced download speed & quality',
    nominalHeight: 480,
  },
  {
    id: '720p',
    label: '720p HD',
    shortLabel: '720p',
    badge: 'HD',
    description: 'Crisp High Definition, lightweight for web streaming',
    nominalHeight: 720,
  },
  {
    id: '1080p',
    label: '1080p Full HD',
    shortLabel: '1080p',
    badge: 'Recommended',
    description: 'Industry standard for YouTube, TikTok, Instagram Reels, & Shorts',
    nominalHeight: 1080,
  },
  {
    id: '1440p',
    label: '1440p 2K / QHD',
    shortLabel: '1440p',
    badge: '2K QHD',
    description: 'Quad HD with 78% more pixels than 1080p for sharp PC & tablet displays',
    nominalHeight: 1440,
  },
  {
    id: '4k',
    label: '4K Ultra HD (2160p)',
    shortLabel: '4K',
    badge: '4K UHD',
    description: 'Cinematic clarity, broadcast-grade fidelity for TV & high-res screens',
    nominalHeight: 2160,
  },
  {
    id: '8k',
    label: '8K Ultra HD (4320p)',
    shortLabel: '8K',
    badge: '8K Master',
    description: 'Ultimate master resolution with 33+ megapixels of razor-sharp detail',
    nominalHeight: 4320,
  },
  {
    id: 'original',
    label: 'Original (Native)',
    shortLabel: 'Native',
    badge: 'Source',
    description: 'Exact pixel dimensions of your uploaded source video file',
    nominalHeight: 0,
  },
];

/**
 * Calculates exact even pixel dimensions (width & height) for any chosen
 * resolution preset and aspect ratio combination.
 */
export function calculateExportDimensions(
  resolution: VideoResolutionPreset,
  aspectRatio: AspectRatioType,
  nativeWidth = 1920,
  nativeHeight = 1080
): { width: number; height: number; displayLabel: string; megapixel: string } {
  const safeNativeW = Math.max(16, nativeWidth || 1920);
  const safeNativeH = Math.max(16, nativeHeight || 1080);
  const nativeRatio = safeNativeW / safeNativeH;

  let width = 1920;
  let height = 1080;

  if (aspectRatio === '16:9') {
    switch (resolution) {
      case '360p':
        width = 640;
        height = 360;
        break;
      case '480p':
        width = 854;
        height = 480;
        break;
      case '720p':
        width = 1280;
        height = 720;
        break;
      case '1080p':
        width = 1920;
        height = 1080;
        break;
      case '1440p':
        width = 2560;
        height = 1440;
        break;
      case '4k':
        width = 3840;
        height = 2160;
        break;
      case '8k':
        width = 7680;
        height = 4320;
        break;
      case 'original':
      default:
        // Use native width/height if 16:9 or default 1080p
        width = safeNativeW;
        height = safeNativeH;
        break;
    }
  } else if (aspectRatio === '9:16') {
    switch (resolution) {
      case '360p':
        width = 360;
        height = 640;
        break;
      case '480p':
        width = 480;
        height = 854;
        break;
      case '720p':
        width = 720;
        height = 1280;
        break;
      case '1080p':
        width = 1080;
        height = 1920;
        break;
      case '1440p':
        width = 1440;
        height = 2560;
        break;
      case '4k':
        width = 2160;
        height = 3840;
        break;
      case '8k':
        width = 4320;
        height = 7680;
        break;
      case 'original':
      default:
        width = safeNativeW <= safeNativeH ? safeNativeW : Math.round((safeNativeH * 9) / 16);
        height = safeNativeW <= safeNativeH ? safeNativeH : safeNativeH;
        break;
    }
  } else if (aspectRatio === '1:1') {
    switch (resolution) {
      case '360p':
        width = 360;
        height = 360;
        break;
      case '480p':
        width = 480;
        height = 480;
        break;
      case '720p':
        width = 720;
        height = 720;
        break;
      case '1080p':
        width = 1080;
        height = 1080;
        break;
      case '1440p':
        width = 1440;
        height = 1440;
        break;
      case '4k':
        width = 2160;
        height = 2160;
        break;
      case '8k':
        width = 4320;
        height = 4320;
        break;
      case 'original':
      default: {
        const minDim = Math.min(safeNativeW, safeNativeH);
        width = minDim;
        height = minDim;
        break;
      }
    }
  } else if (aspectRatio === '4:5') {
    switch (resolution) {
      case '360p':
        width = 360;
        height = 450;
        break;
      case '480p':
        width = 480;
        height = 600;
        break;
      case '720p':
        width = 720;
        height = 900;
        break;
      case '1080p':
        width = 1080;
        height = 1350;
        break;
      case '1440p':
        width = 1440;
        height = 1800;
        break;
      case '4k':
        width = 2160;
        height = 2700;
        break;
      case '8k':
        width = 4320;
        height = 5400;
        break;
      case 'original':
      default:
        width = 1080;
        height = 1350;
        break;
    }
  } else {
    // aspectRatio === 'original' (Preserve native source aspect ratio)
    if (resolution === 'original') {
      width = safeNativeW;
      height = safeNativeH;
    } else {
      const baseHeights: Record<string, number> = {
        '360p': 360,
        '480p': 480,
        '720p': 720,
        '1080p': 1080,
        '1440p': 1440,
        '4k': 2160,
        '8k': 4320,
      };
      const base = baseHeights[resolution] || 1080;

      if (nativeRatio >= 1) {
        // Landscape or square: base is height
        height = base;
        width = Math.round(base * nativeRatio);
      } else {
        // Portrait: base is width
        width = base;
        height = Math.round(base / nativeRatio);
      }
    }
  }

  // Enforce even numbers strictly required by H.264 / WebCodecs / MP4 muxers
  width = Math.round(width / 2) * 2;
  height = Math.round(height / 2) * 2;

  const totalPixels = width * height;
  const mp = (totalPixels / 1_000_000).toFixed(1);

  return {
    width,
    height,
    displayLabel: `${width} × ${height} px`,
    megapixel: `${mp} MP`,
  };
}

/**
 * Calculates adaptive video bitrate in bits per second based on chosen pixel resolution and quality setting.
 */
export function calculateExportBitrate(
  resolution: VideoResolutionPreset,
  quality: 'ultra' | 'studio' | 'high' | 'standard' = 'ultra',
  nativeWidth = 1920,
  nativeHeight = 1080
): number {
  let effectiveRes = resolution;
  if (effectiveRes === 'original') {
    const maxDim = Math.max(nativeWidth, nativeHeight);
    if (maxDim >= 6000) effectiveRes = '8k';
    else if (maxDim >= 3000) effectiveRes = '4k';
    else if (maxDim >= 2000) effectiveRes = '1440p';
    else if (maxDim >= 1400) effectiveRes = '1080p';
    else if (maxDim >= 900) effectiveRes = '720p';
    else if (maxDim >= 600) effectiveRes = '480p';
    else effectiveRes = '360p';
  }

  const baseBitrates: Record<VideoResolutionPreset, number> = {
    '360p': 2_200_000,
    '480p': 3_500_000,
    '720p': 7_500_000,
    '1080p': 14_000_000,
    '1440p': 24_000_000,
    '4k': 48_000_000,
    '8k': 85_000_000,
    'original': 14_000_000,
  };

  const base = baseBitrates[effectiveRes] || 14_000_000;
  if (quality === 'ultra') return base;
  if (quality === 'studio') return Math.round(base * 0.75);
  if (quality === 'high') return Math.round(base * 0.55);
  return Math.round(base * 0.35); // standard
}

/**
 * Calculates human-readable file size estimation for a render
 */
export function estimateExportFileSize(
  durationSeconds: number,
  bitrateBps: number,
  hasAudio = true
): string {
  const safeDuration = Math.max(1, durationSeconds || 10);
  const totalBps = bitrateBps + (hasAudio ? 192_000 : 0);
  const totalBytes = (safeDuration * totalBps) / 8;
  const totalMB = totalBytes / (1024 * 1024);

  if (totalMB >= 1024) {
    return `~${(totalMB / 1024).toFixed(2)} GB`;
  }
  return `~${totalMB.toFixed(1)} MB`;
}
