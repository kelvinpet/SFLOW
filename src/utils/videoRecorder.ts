import { Caption, SubtitleStyle, AspectRatioType, VideoResolutionPreset } from '../types';
import { getActiveSubtitleSegment, getAspectAwareSubtitleMetrics } from './subtitleLayout';
import { getKeyframeAnimationTransform } from './keyframeAnimations';
import { calculateExportDimensions, calculateExportBitrate } from './resolutionPresets';

export interface VideoRenderOptions {
  format?: 'mp4' | 'webm';
  quality?: 'ultra' | 'studio' | 'high' | 'standard'; // ultra: 40-50 Mbps, studio: 26-28 Mbps, high: 15-18 Mbps, standard: 8-10 Mbps
  fps?: number; // 30 or 60
  resolution?: VideoResolutionPreset; // 360p, 480p, 720p, 1080p, 1440p, 4k, 8k, original
  sourceFileSize?: number; // Original uploaded video file size to match or exceed
  aspectRatio?: AspectRatioType; // Target aspect ratio ('original' preserves native resolution without black bars)
  fitMode?: 'fill' | 'fit'; // 'fill' crops to fill entire canvas (no black bars), 'fit' letterboxes
}

/**
 * Captures a single styled frame from the video with subtitle overlay rendered onto a canvas
 */
export async function captureStyledFrame(
  videoElement: HTMLVideoElement,
  currentCaptions: Caption[],
  currentTime: number,
  style: SubtitleStyle,
  resolution: VideoResolutionPreset = 'original',
  aspectRatio: AspectRatioType = 'original'
): Promise<string> {
  const nativeW = videoElement.videoWidth || 1080;
  const nativeH = videoElement.videoHeight || 1920;
  const dims = calculateExportDimensions(resolution, aspectRatio, nativeW, nativeH);

  const canvas = document.createElement('canvas');
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Draw video frame with aspect-aware cropping or fitting
  const targetAspectVal = canvas.width / canvas.height;
  const sourceAspectVal = nativeW / nativeH;

  let drawX = 0;
  let drawY = 0;
  let drawW = canvas.width;
  let drawH = canvas.height;

  // Default to fill/crop (no black bars)
  if (sourceAspectVal > targetAspectVal) {
    drawH = canvas.height;
    drawW = canvas.height * sourceAspectVal;
    drawX = (canvas.width - drawW) / 2;
    drawY = 0;
  } else {
    drawW = canvas.width;
    drawH = canvas.width / sourceAspectVal;
    drawX = 0;
    drawY = (canvas.height - drawH) / 2;
  }

  ctx.drawImage(videoElement, drawX, drawY, drawW, drawH);

  // Find active caption with audio sync calibration offset
  const syncOffsetSec = (style.audioSyncOffsetMs || 0) / 1000;
  const calibratedTime = Math.max(0, currentTime + syncOffsetSec);

  const activeCaption = currentCaptions.find(
    (c) => calibratedTime >= c.start && calibratedTime <= c.end
  );

  if (activeCaption) {
    drawSubtitleOnCanvas(ctx, activeCaption, currentTime, style, canvas.width, canvas.height);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Helper to wrap words into multiple lines that fit within maxCanvasWidth
 */
interface RenderWordInfo {
  id: string;
  word: string;
  displayWord: string;
  start: number;
  end: number;
  width: number;
  isActive: boolean;
}

interface LineInfo {
  words: RenderWordInfo[];
  totalWidth: number;
}

function getCanvasShadowColor(color?: string, intensity?: number): string {
  const baseColor = color || 'rgba(0,0,0,0.85)';
  if (intensity === undefined) return baseColor;
  const alpha = (intensity / 100).toFixed(2);
  if (baseColor.startsWith('#')) {
    let hex = baseColor.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const match = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (match) return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
  return `rgba(0, 0, 0, ${alpha})`;
}

/**
 * Splits words into lines respecting max width
 */
function wrapWordsIntoLines(
  ctx: CanvasRenderingContext2D,
  words: RenderWordInfo[],
  maxLineWidth: number,
  spaceWidth: number
): LineInfo[] {
  const lines: LineInfo[] = [];
  let currentLineWords: RenderWordInfo[] = [];
  let currentLineWidth = 0;

  for (const w of words) {
    const wordWidthWithSpace = w.width + (currentLineWords.length > 0 ? spaceWidth : 0);

    if (currentLineWords.length > 0 && currentLineWidth + wordWidthWithSpace > maxLineWidth) {
      lines.push({
        words: currentLineWords,
        totalWidth: currentLineWidth,
      });
      currentLineWords = [w];
      currentLineWidth = w.width;
    } else {
      currentLineWords.push(w);
      currentLineWidth += wordWidthWithSpace;
    }
  }

  if (currentLineWords.length > 0) {
    lines.push({
      words: currentLineWords,
      totalWidth: currentLineWidth,
    });
  }

  return lines;
}

/**
 * Splits plain text into multiple lines respecting max width
 */
function wrapTextIntoLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxLineWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;

    if (currentLine && testWidth > maxLineWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [text];
}

/**
 * Renders subtitle styling onto an HTML5 2D Canvas context with complete multi-line word-wrap protection
 */
export function drawSubtitleOnCanvas(
  ctx: CanvasRenderingContext2D,
  caption: Caption,
  currentTime: number,
  style: SubtitleStyle,
  canvasWidth: number,
  canvasHeight: number
) {
  // Apply audio sync offset calibration:
  const syncOffsetSec = (style.audioSyncOffsetMs || 0) / 1000;
  const calibratedTime = Math.max(0, currentTime + syncOffsetSec);

  // Detect canvas aspect ratio
  const ratioVal = canvasHeight / canvasWidth;
  const detectedAspectRatio: AspectRatioType =
    ratioVal > 1.4 ? '9:16' : Math.abs(ratioVal - 1.0) < 0.15 ? '1:1' : ratioVal > 1.15 ? '4:5' : '16:9';

  // Get active subtitle segment (dynamic chunking or full sentence) with calibrated timing
  const segment = getActiveSubtitleSegment(caption, calibratedTime, style, detectedAspectRatio);
  const visibleWords = segment.visibleWords;
  const displayText = segment.visibleText;
  const displaySecondaryText = segment.visibleSecondaryText;

  // Calculate aspect-aware metrics and sizing for 100% preview-to-export parity
  const referencePreviewWidth =
    detectedAspectRatio === '16:9' ? 680 : detectedAspectRatio === '9:16' ? 360 : detectedAspectRatio === '1:1' ? 460 : 430;
  const referencePreviewHeight = Math.round(referencePreviewWidth * ratioVal);

  const metrics = getAspectAwareSubtitleMetrics(
    style,
    detectedAspectRatio,
    referencePreviewWidth,
    referencePreviewHeight,
    displayText.length,
    segment.isChunked
  );

  const canvasScale = canvasWidth / referencePreviewWidth;
  const scale = canvasScale;

  // Calculate Keyframe entrance & exit animations
  const keyframeAnim = getKeyframeAnimationTransform(
    calibratedTime,
    caption.start,
    caption.end,
    style,
    canvasScale
  );

  if (keyframeAnim.opacity <= 0.001) {
    return;
  }

  // Per-caption custom formatting overrides (e.g. from Batch Edit or cue styling)
  const customFontOverride = caption.customFontSize || caption.styleOverride?.fontSize;
  let fontSize = customFontOverride
    ? Math.max(16, Math.round(customFontOverride * canvasScale * (metrics.aspectMultiplier || 1)))
    : Math.max(16, Math.round(metrics.primaryFontSize * canvasScale));

  const isBoldForced = caption.isBold ?? caption.styleOverride?.isBold;
  const fontWeight = isBoldForced === true ? 900 : isBoldForced === false ? 400 : (style.fontWeight || 800);

  const isItalicForced = caption.isItalic ?? caption.styleOverride?.isItalic;
  const fontStylePrefix = isItalicForced ? 'italic ' : '';

  const effectiveTextColor = caption.customColor || caption.styleOverride?.textColor || style.textColor;
  const effectiveBgColor = caption.customBgColor || caption.styleOverride?.backgroundColor || style.backgroundColor;
  const effectiveTextTransform = caption.customTextTransform || caption.styleOverride?.textTransform || style.textTransform;
  const fontFamily = style.fontFamily || 'Montserrat';

  // Maximum allowed width for subtitle text block (strict 85-92% margin boundary)
  const maxAllowedWidth = canvasWidth * Math.min(0.92, (metrics.maxWidthPercent || 90) / 100);

  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, ctx.globalAlpha * keyframeAnim.opacity));

  // Calculate 2D position (X and Y offsets)
  const yPos = (canvasHeight * metrics.yPosPercent) / 100;
  const xPos = (canvasWidth / 2) + (canvasWidth * (style.xOffsetPercent || 0)) / 100;

  // Apply keyframe translation and scaling centered around subtitle block
  ctx.translate(xPos + keyframeAnim.translateX, yPos + keyframeAnim.translateY);
  if (keyframeAnim.scale !== 1) {
    ctx.scale(keyframeAnim.scale, keyframeAnim.scale);
  }
  ctx.translate(-xPos, -yPos);

  ctx.font = `${fontStylePrefix}${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textToRender =
    effectiveTextTransform === 'uppercase'
      ? displayText.toUpperCase()
      : effectiveTextTransform === 'lowercase'
      ? displayText.toLowerCase()
      : effectiveTextTransform === 'capitalize'
      ? displayText.replace(/\b\w/g, (c) => c.toUpperCase())
      : displayText;

  const hasWordTimestamps = visibleWords.length > 0;
  let spaceMetrics = ctx.measureText(' ');
  let spaceWidth = spaceMetrics.width;

  // Secondary text parameters for Dual Caption mode
  const hasSecondary = Boolean(style.dualCaptionEnabled && displaySecondaryText);
  let secFontSize = Math.max(12, Math.round(metrics.secondaryFontSize * (canvasWidth / 640)));

  let secondaryLines: string[] = [];
  const isSingleLineForced = style.maxLines === 1 || segment.isSingleLineOnly;

  // Auto-fit check for single-line / word-wrapped subtitle to guarantee ZERO boundary overflow
  if (hasWordTimestamps && style.wordHighlightEffect !== 'none') {
    // Measure total width of words
    let initialTotalWidth = 0;
    for (const w of visibleWords) {
      const displayW =
        style.textTransform === 'uppercase'
          ? w.word.toUpperCase()
          : style.textTransform === 'lowercase'
          ? w.word.toLowerCase()
          : w.word;
      initialTotalWidth += ctx.measureText(displayW).width;
    }
    initialTotalWidth += Math.max(0, visibleWords.length - 1) * spaceWidth;

    // If text exceeds safe horizontal boundary, auto-scale font down to fit perfectly within frame
    if (isSingleLineForced && initialTotalWidth > maxAllowedWidth) {
      const shrinkRatio = maxAllowedWidth / (initialTotalWidth * 1.05);
      fontSize = Math.max(14, Math.floor(fontSize * shrinkRatio));
      ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
      spaceMetrics = ctx.measureText(' ');
      spaceWidth = spaceMetrics.width;
    }
  } else {
    const measuredFullWidth = ctx.measureText(textToRender).width;
    if (isSingleLineForced && measuredFullWidth > maxAllowedWidth) {
      const shrinkRatio = maxAllowedWidth / (measuredFullWidth * 1.05);
      fontSize = Math.max(14, Math.floor(fontSize * shrinkRatio));
      ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
    }
  }

  const lineHeight = fontSize * 1.22;
  const secLineHeight = secFontSize * 1.25;

  if (hasSecondary && displaySecondaryText) {
    ctx.save();
    ctx.font = `600 ${secFontSize}px "${fontFamily}", sans-serif`;
    const secMeasured = ctx.measureText(displaySecondaryText).width;
    if (isSingleLineForced && secMeasured > maxAllowedWidth) {
      secFontSize = Math.max(11, Math.floor(secFontSize * (maxAllowedWidth / (secMeasured * 1.05))));
      ctx.font = `600 ${secFontSize}px "${fontFamily}", sans-serif`;
    }
    secondaryLines = isSingleLineForced ? [displaySecondaryText] : wrapTextIntoLines(ctx, displaySecondaryText, maxAllowedWidth);
    ctx.restore();
  }

  // Calculate vertical shift when secondary subtitle is positioned above or below
  const isSecTop = style.dualCaptionLayout === 'secondary-top';

  // RENDER PRIMARY LINE (Word-by-word with wrap OR sentence with wrap)
  if (hasWordTimestamps && style.wordHighlightEffect !== 'none') {
    // Measure words
    const wordsWithMetrics: RenderWordInfo[] = visibleWords.map((w, wIdx) => {
      const displayWord =
        style.textTransform === 'uppercase'
          ? w.word.toUpperCase()
          : style.textTransform === 'lowercase'
          ? w.word.toLowerCase()
          : w.word;
      const metricsCtx = ctx.measureText(displayWord);
      const isActive =
        (currentTime >= w.start && currentTime <= w.end) ||
        (segment.isChunked && wIdx === segment.activeWordIndex);
      return {
        ...w,
        displayWord,
        width: metricsCtx.width,
        isActive,
      };
    });

    const lines = isSingleLineForced
      ? [
          {
            words: wordsWithMetrics,
            totalWidth: wordsWithMetrics.reduce((acc, curr) => acc + curr.width, 0) + Math.max(0, wordsWithMetrics.length - 1) * spaceWidth,
          },
        ]
      : wrapWordsIntoLines(ctx, wordsWithMetrics, maxAllowedWidth, spaceWidth);
    const totalBlockHeight = lines.length * lineHeight;
    const blockStartY = yPos - totalBlockHeight / 2 + lineHeight / 2;

    // Optional overall background box
    if (style.showBackgroundBox) {
      const maxLineWidth = Math.max(...lines.map((l) => l.totalWidth));
      const bgPadX = (metrics.paddingX || 14) * (canvasWidth / 360);
      const bgPadY = (metrics.paddingY || 8) * (canvasWidth / 360);
      const bgRadius = (style.backgroundBorderRadius || 8) * scale;

      ctx.fillStyle = hexToRgba(effectiveBgColor, style.backgroundOpacity);
      roundRect(
        ctx,
        xPos - maxLineWidth / 2 - bgPadX,
        blockStartY - lineHeight / 2 - bgPadY,
        maxLineWidth + bgPadX * 2,
        totalBlockHeight + bgPadY * 2,
        bgRadius
      );
      ctx.fill();
    }

    // Render each wrapped line of words
    lines.forEach((line, lineIndex) => {
      const lineY = blockStartY + lineIndex * lineHeight;
      const startX = xPos - line.totalWidth / 2;
      let curX = startX;

      for (const w of line.words) {
        ctx.save();
        const wordCenterX = curX + w.width / 2;
        const isKaraoke = style.wordHighlightEffect === 'karaoke';
        const isPassed = currentTime > w.end;
        const isUpcoming = currentTime < w.start;

        if (w.isActive && style.activeWordScale > 1 && style.wordHighlightEffect === 'bounce') {
          ctx.translate(wordCenterX, lineY);
          ctx.scale(style.activeWordScale, style.activeWordScale);
          ctx.translate(-wordCenterX, -lineY);
        }

        // Active word background highlight box (or karaoke highlight badge)
        if ((w.isActive && style.wordHighlightEffect === 'box-highlight') || (w.isActive && isKaraoke && style.activeWordBgColor)) {
          ctx.fillStyle = style.activeWordBgColor || '#000000';
          const pX = 6 * scale;
          const pY = 3 * scale;
          roundRect(
            ctx,
            curX - pX,
            lineY - fontSize / 2 - pY,
            w.width + pX * 2,
            fontSize + pY * 2,
            6 * scale
          );
          ctx.fill();
        }

        // Stroke / Outline
        if (style.strokeWidth > 0) {
          ctx.lineWidth = style.strokeWidth * scale;
          ctx.strokeStyle = style.strokeColor || '#000000';
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          ctx.strokeText(w.displayWord, wordCenterX, lineY);
        }

        // Shadow / Glow
        const enableShadow = style.enableTextShadow !== false && (style.shadowBlur > 0 || (style.shadowOffsetX || 0) !== 0 || (style.shadowOffsetY || 0) !== 0);
        if (enableShadow || (w.isActive && (style.wordHighlightEffect === 'glow' || isKaraoke))) {
          ctx.shadowColor =
            w.isActive && (style.wordHighlightEffect === 'glow' || isKaraoke)
              ? style.activeWordColor
              : getCanvasShadowColor(style.shadowColor, style.shadowIntensity);
          ctx.shadowBlur = (w.isActive && style.wordHighlightEffect === 'glow' ? 18 : style.shadowBlur || 8) * scale;
          ctx.shadowOffsetX = (style.shadowOffsetX || 0) * scale;
          ctx.shadowOffsetY = (style.shadowOffsetY || 0) * scale;
        }

        // Text Fill (with Karaoke progression)
        if (w.isActive) {
          ctx.fillStyle = style.activeWordColor;
          ctx.globalAlpha = 1;
        } else if (isKaraoke) {
          if (isPassed) {
            ctx.fillStyle = style.activeWordColor || effectiveTextColor;
            ctx.globalAlpha = 1;
          } else if (isUpcoming) {
            ctx.fillStyle = effectiveTextColor;
            ctx.globalAlpha = style.inactiveWordOpacity ?? 0.5;
          } else {
            ctx.fillStyle = effectiveTextColor;
            ctx.globalAlpha = 1;
          }
        } else {
          ctx.fillStyle = effectiveTextColor;
          ctx.globalAlpha = 1;
        }

        ctx.fillText(w.displayWord, wordCenterX, lineY);

        // Active word underline
        if (w.isActive && style.wordHighlightEffect === 'underline') {
          ctx.fillStyle = style.activeWordColor;
          ctx.fillRect(curX, lineY + fontSize / 2 + 2, w.width, 3 * scale);
        }

        ctx.restore();
        curX += w.width + spaceWidth;
      }
    });

    // Render Secondary Dual Caption lines
    if (hasSecondary && secondaryLines.length > 0) {
      ctx.save();
      ctx.font = `600 ${secFontSize}px "${fontFamily}", sans-serif`;
      ctx.fillStyle = style.secondaryTextColor || '#93C5FD';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 6 * scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2 * scale;

      const secTotalHeight = secondaryLines.length * secLineHeight;
      const secStartY = isSecTop
        ? blockStartY - lineHeight / 2 - secTotalHeight + secLineHeight / 2 - (4 * scale)
        : blockStartY + totalBlockHeight - lineHeight / 2 + (8 * scale) + secLineHeight / 2;

      secondaryLines.forEach((line, sIdx) => {
        ctx.fillText(line, xPos, secStartY + sIdx * secLineHeight);
      });
      ctx.restore();
    }
  } else {
    // Sentence / Multi-word wrapped rendering
    const lines = isSingleLineForced ? [textToRender] : wrapTextIntoLines(ctx, textToRender, maxAllowedWidth);
    const totalBlockHeight = lines.length * lineHeight;
    const blockStartY = yPos - totalBlockHeight / 2 + lineHeight / 2;

    if (style.showBackgroundBox) {
      const maxLineWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const bgPadX = (metrics.paddingX || 14) * (canvasWidth / 360);
      const bgPadY = (metrics.paddingY || 8) * (canvasWidth / 360);
      const bgRadius = (style.backgroundBorderRadius || 8) * scale;

      ctx.fillStyle = hexToRgba(effectiveBgColor, style.backgroundOpacity);
      roundRect(
        ctx,
        xPos - maxLineWidth / 2 - bgPadX,
        blockStartY - lineHeight / 2 - bgPadY,
        maxLineWidth + bgPadX * 2,
        totalBlockHeight + bgPadY * 2,
        bgRadius
      );
      ctx.fill();
    }

    lines.forEach((line, idx) => {
      const lineY = blockStartY + idx * lineHeight;

      if (style.strokeWidth > 0) {
        ctx.lineWidth = style.strokeWidth * scale;
        ctx.strokeStyle = style.strokeColor || '#000000';
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(line, xPos, lineY);
      }

      if (style.shadowBlur > 0 || (style.shadowIntensity !== undefined && style.shadowIntensity > 0)) {
        ctx.shadowColor = getCanvasShadowColor(style.shadowColor, style.shadowIntensity);
        ctx.shadowBlur = style.shadowBlur * scale;
        ctx.shadowOffsetX = style.shadowOffsetX * scale;
        ctx.shadowOffsetY = style.shadowOffsetY * scale;
      }

      ctx.fillStyle = effectiveTextColor;
      ctx.fillText(line, xPos, lineY);
    });

    // Secondary line for sentence mode
    if (hasSecondary && secondaryLines.length > 0) {
      ctx.save();
      ctx.font = `600 ${secFontSize}px "${fontFamily}", sans-serif`;
      ctx.fillStyle = style.secondaryTextColor || '#93C5FD';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 6 * scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2 * scale;

      const secTotalHeight = secondaryLines.length * secLineHeight;
      const secStartY = isSecTop
        ? blockStartY - lineHeight / 2 - secTotalHeight + secLineHeight / 2 - (4 * scale)
        : blockStartY + totalBlockHeight - lineHeight / 2 + (8 * scale) + secLineHeight / 2;

      secondaryLines.forEach((line, sIdx) => {
        ctx.fillText(line, xPos, secStartY + sIdx * secLineHeight);
      });
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * Helper to draw rounded rectangle on Canvas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (width < 2 * radius) radius = width / 2;
  if (height < 2 * radius) radius = height / 2;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/**
 * Converts Hex + alpha to rgba string
 */
function hexToRgba(hex: string, alpha = 1): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Helper to detect supported mime type for MP4 or WebM
 */
export function getSupportedMimeType(preferredFormat: 'mp4' | 'webm' = 'mp4'): {
  mimeType: string;
  extension: 'mp4' | 'webm';
} {
  const mp4Types = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1.4d401f',
    'video/mp4;codecs=h264,aac',
    'video/mp4',
  ];

  const webmTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  if (preferredFormat === 'mp4') {
    for (const t of mp4Types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        return { mimeType: t, extension: 'mp4' };
      }
    }
    // Fallback to WebM if browser (e.g. Firefox) does not support MP4 recording directly
    for (const t of webmTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        return { mimeType: t, extension: 'webm' };
      }
    }
  } else {
    for (const t of webmTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        return { mimeType: t, extension: 'webm' };
      }
    }
    for (const t of mp4Types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        return { mimeType: t, extension: 'mp4' };
      }
    }
  }

  return { mimeType: 'video/webm', extension: 'webm' };
}

/**
 * Renders full video with burned-in subtitles to downloadable MP4 / WebM video file
 * Captures clean, full-fidelity audio track and renders silky smooth 30/60fps video frames
 */
export async function renderVideoWithSubtitles(
  videoElement: HTMLVideoElement,
  captions: Caption[],
  style: SubtitleStyle,
  options?: VideoRenderOptions,
  onProgress?: (progressPercent: number, statusText: string) => void
): Promise<{ blob: Blob; format: 'mp4' | 'webm'; fileSize: number }> {
  const preferredFormat = options?.format || 'mp4';
  const quality = options?.quality || 'ultra';
  const fps = options?.fps || 30;

  const totalDuration = videoElement.duration || 10;

  const nativeW = videoElement.videoWidth || 1080;
  const nativeH = videoElement.videoHeight || 1920;
  const targetAspect = options?.aspectRatio || 'original';
  const targetResolution = options?.resolution || 'original';

  const dims = calculateExportDimensions(targetResolution, targetAspect, nativeW, nativeH);
  const exportWidth = dims.width;
  const exportHeight = dims.height;

  const canvas = document.createElement('canvas');
  canvas.width = exportWidth;
  canvas.height = exportHeight;
  // Use alpha: false and desynchronized for highest hardware-accelerated draw performance
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Adaptive bitrate according to selected resolution and quality
  const targetBitrate = calculateExportBitrate(targetResolution, quality, exportWidth, exportHeight);

  const { mimeType, extension } = getSupportedMimeType(preferredFormat);
  const canvasStream = canvas.captureStream(fps);

  // Preserve user player audio state
  const prevMuted = videoElement.muted;
  const prevVolume = videoElement.volume;
  const prevPlaybackRate = videoElement.playbackRate;

  // Ensure video element is unmuted with full volume and normal speed for recording
  videoElement.muted = false;
  videoElement.volume = 1.0;
  videoElement.playbackRate = 1.0;

  // Create combined MediaStream with both video and audio
  const combinedStream = new MediaStream();
  canvasStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));

  // Multiplex original video audio stream
  let audioTrackAdded = false;

  // Method A: Direct captureStream on HTMLVideoElement
  try {
    const rawStream = (videoElement as any).captureStream
      ? (videoElement as any).captureStream()
      : (videoElement as any).mozCaptureStream
      ? (videoElement as any).mozCaptureStream()
      : null;

    if (rawStream) {
      const audioTracks = rawStream.getAudioTracks();
      if (audioTracks && audioTracks.length > 0) {
        audioTracks.forEach((track: MediaStreamTrack) => {
          combinedStream.addTrack(track);
          audioTrackAdded = true;
        });
      }
    }
  } catch (e) {
    console.warn('captureStream audio extract fallback:', e);
  }

  // Method B: Web Audio API multiplexer (shared or fresh node)
  if (!audioTrackAdded) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const existingCtx: AudioContext | undefined = (videoElement as any).__audioContext;
        const existingSource: MediaElementAudioSourceNode | undefined = (videoElement as any).__audioSourceNode;

        const audioCtx = existingCtx || new AudioCtx();
        (videoElement as any).__audioContext = audioCtx;

        if (audioCtx.state === 'suspended') {
          await audioCtx.resume().catch(() => {});
        }

        let sourceNode = existingSource;
        if (!sourceNode) {
          sourceNode = audioCtx.createMediaElementSource(videoElement);
          (videoElement as any).__audioSourceNode = sourceNode;
        }

        const destNode = audioCtx.createMediaStreamDestination();
        sourceNode.connect(destNode);
        try {
          sourceNode.connect(audioCtx.destination);
        } catch (_) {}

        destNode.stream.getAudioTracks().forEach((track) => {
          combinedStream.addTrack(track);
          audioTrackAdded = true;
        });
      }
    } catch (e) {
      console.warn('WebAudio export routing fallback:', e);
    }
  }

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: targetBitrate,
    audioBitsPerSecond: 256_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  videoElement.currentTime = 0;
  await new Promise((r) => setTimeout(r, 150));

  recorder.start(500);
  await videoElement.play();

  return new Promise((resolve, reject) => {
    let isFinished = false;
    let frameCallbackId: number | null = null;
    let rafId: number | null = null;

    const cleanupAndRestore = () => {
      isFinished = true;
      if (frameCallbackId !== null && 'cancelVideoFrameCallback' in videoElement) {
        (videoElement as any).cancelVideoFrameCallback(frameCallbackId);
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      videoElement.muted = prevMuted;
      videoElement.volume = prevVolume;
      videoElement.playbackRate = prevPlaybackRate;
    };

    const renderCurrentFrame = () => {
      if (isFinished) return;

      const curTime = videoElement.currentTime;

      if (videoElement.paused || videoElement.ended || curTime >= totalDuration - 0.05) {
        if (videoElement.ended || curTime >= totalDuration - 0.1) {
          cleanupAndRestore();
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
          return;
        }
      }

      const srcW = nativeW;
      const srcH = nativeH;
      const srcAspect = srcW / srcH;
      const canvasAspect = canvas.width / canvas.height;
      const fitMode = options?.fitMode || 'fill';

      let drawW = canvas.width;
      let drawH = canvas.height;
      let drawX = 0;
      let drawY = 0;

      if (Math.abs(srcAspect - canvasAspect) < 0.02) {
        // Native full screen match: draw edge-to-edge
        drawW = canvas.width;
        drawH = canvas.height;
        drawX = 0;
        drawY = 0;
      } else if (fitMode === 'fill') {
        // Crop-to-fill: fill entire canvas with zero black bars
        if (srcAspect > canvasAspect) {
          drawH = canvas.height;
          drawW = canvas.height * srcAspect;
          drawX = (canvas.width - drawW) / 2;
        } else {
          drawW = canvas.width;
          drawH = canvas.width / srcAspect;
          drawY = (canvas.height - drawH) / 2;
        }
      } else {
        // Fit (letterbox)
        if (srcAspect > canvasAspect) {
          drawW = canvas.width;
          drawH = canvas.width / srcAspect;
          drawY = (canvas.height - drawH) / 2;
        } else {
          drawH = canvas.height;
          drawW = canvas.height * srcAspect;
          drawX = (canvas.width - drawW) / 2;
        }
      }

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(videoElement, drawX, drawY, drawW, drawH);

      const syncOffsetSec = (style.audioSyncOffsetMs || 0) / 1000;
      const calibratedTime = Math.max(0, curTime + syncOffsetSec);

      const activeCaption = captions.find(
        (c) => calibratedTime >= c.start && calibratedTime <= c.end
      );

      if (activeCaption) {
        drawSubtitleOnCanvas(ctx, activeCaption, curTime, style, canvas.width, canvas.height);
      }

      const progress = Math.min(99, Math.floor((curTime / totalDuration) * 100));
      onProgress?.(
        progress,
        `Rendering smooth ${extension.toUpperCase()} (${(targetBitrate / 1_000_000).toFixed(0)} Mbps) • ${progress}%`
      );
    };

    // Frame-perfect hardware-synchronized rendering loop
    if ('requestVideoFrameCallback' in videoElement) {
      const onFrame = () => {
        if (isFinished) return;
        renderCurrentFrame();
        frameCallbackId = (videoElement as any).requestVideoFrameCallback(onFrame);
      };
      frameCallbackId = (videoElement as any).requestVideoFrameCallback(onFrame);
    } else {
      const rafLoop = () => {
        if (isFinished) return;
        renderCurrentFrame();
        rafId = requestAnimationFrame(rafLoop);
      };
      rafId = requestAnimationFrame(rafLoop);
    }

    recorder.onstop = () => {
      cleanupAndRestore();
      onProgress?.(100, `Finalizing ${extension.toUpperCase()} video with audio...`);
      const outputBlob = new Blob(chunks, { type: mimeType });
      resolve({
        blob: outputBlob,
        format: extension,
        fileSize: outputBlob.size,
      });
    };

    recorder.onerror = (err) => {
      cleanupAndRestore();
      reject(err);
    };
  });
}
