import { Caption, SubtitleStyle, AspectRatioType, WordTimestamp, DisplayMode } from '../types';

export interface ActiveSubtitleSegment {
  visibleWords: WordTimestamp[];
  visibleText: string;
  visibleSecondaryText?: string;
  isChunked: boolean;
  activeWordIndex: number;
  isSingleLineOnly: boolean;
}

/**
 * Calculates the active cluster of words / segment to display based on currentTime, displayMode, aspect ratio,
 * and maximum lines constraints (e.g. maxLines = 1).
 * In 9:16 (Vertical Reels) and 1:1 (Square Feeds), chunked pacing (2-4 words at a time) provides the signature
 * viral TikTok/Reels dynamic subtitle animation without filling the screen with 8+ wrapped lines.
 */
export function getActiveSubtitleSegment(
  caption: Caption,
  currentTime: number,
  style: SubtitleStyle,
  aspectRatio: AspectRatioType
): ActiveSubtitleSegment {
  const isStrictSingleLine = style.maxLines === 1 || style.maxLines === undefined || style.maxLines !== 2 && style.maxLines !== 0;

  // Synthesize word timings if words array is empty or missing (e.g. from plain text / SRT import)
  let words = caption.words;
  if (!words || words.length === 0) {
    const textTokens = caption.text.trim().split(/\s+/).filter(Boolean);
    if (textTokens.length > 0) {
      const totalDuration = Math.max(0.1, caption.end - caption.start);
      const wordDuration = totalDuration / textTokens.length;
      words = textTokens.map((w, idx) => ({
        id: `syn-${caption.id}-${idx}`,
        word: w,
        start: caption.start + idx * wordDuration,
        end: caption.start + (idx + 1) * wordDuration,
      }));
    } else {
      words = [];
    }
  }

  const hasWordTimestamps = words.length > 0;

  // Fallback only if caption is completely empty
  if (!hasWordTimestamps) {
    return {
      visibleWords: [],
      visibleText: caption.text,
      visibleSecondaryText: caption.secondaryText,
      isChunked: false,
      activeWordIndex: -1,
      isSingleLineOnly: isStrictSingleLine,
    };
  }

  // Determine active display mode
  // If maxLines === 1 (strict 1-line mode), ALWAYS enforce chunking so sentences never stack into multi-line paragraphs!
  let effectiveDisplayMode: DisplayMode = style.displayMode;
  if (!effectiveDisplayMode || isStrictSingleLine) {
    effectiveDisplayMode =
      style.displayMode === 'single-word'
        ? 'single-word'
        : 'chunked-3-words';
  }

  // Find active word index based on currentTime
  let activeWordIdx = words.findIndex(
    (w) => currentTime >= w.start && currentTime <= w.end
  );

  // If between words during speech pauses, find nearest previous or next word
  if (activeWordIdx === -1) {
    if (currentTime < words[0].start) {
      activeWordIdx = 0;
    } else if (currentTime > words[words.length - 1].end) {
      activeWordIdx = words.length - 1;
    } else {
      // Find the last word that started before currentTime
      for (let i = words.length - 1; i >= 0; i--) {
        if (currentTime >= words[i].start) {
          activeWordIdx = i;
          break;
        }
      }
    }
  }

  // 1. Single Word Mode (Flash Energy - 1 word on 1 line)
  if (effectiveDisplayMode === 'single-word') {
    const activeWord = words[Math.max(0, activeWordIdx)];
    let secWord = '';
    if (caption.secondaryText) {
      const secTokens = caption.secondaryText.trim().split(/\s+/).filter(Boolean);
      if (secTokens.length > 0) {
        const secIdx = Math.min(secTokens.length - 1, Math.floor((activeWordIdx / words.length) * secTokens.length));
        secWord = secTokens[secIdx];
      }
    }
    return {
      visibleWords: [activeWord],
      visibleText: activeWord.word,
      visibleSecondaryText: secWord || undefined,
      isChunked: true,
      activeWordIndex: 0,
      isSingleLineOnly: true,
    };
  }

  // 2. Chunked Mode (2-3 Words - Viral TikTok / Reels Standard & Guaranteed 1-Line Max)
  if (effectiveDisplayMode === 'chunked-3-words' || isStrictSingleLine) {
    // Determine maximum words and characters per chunk based on aspect ratio
    const maxWords = Math.max(1, style.maxWordsPerSegment || (aspectRatio === '9:16' ? 3 : 4));
    // Maximum safe characters per chunk to prevent horizontal overflowing
    const maxCharsPerChunk = aspectRatio === '9:16' ? 18 : aspectRatio === '1:1' ? 22 : 28;

    // Dynamically build balanced, non-overflowing word chunks
    const chunks: { startIndex: number; endIndex: number }[] = [];
    let currentStart = 0;
    let currentCharCount = 0;
    let currentWordCount = 0;

    for (let i = 0; i < words.length; i++) {
      const wordLength = words[i].word.length;
      const wouldExceedWordLimit = currentWordCount >= maxWords;
      const wouldExceedCharLimit =
        currentWordCount > 0 && currentCharCount + 1 + wordLength > maxCharsPerChunk;

      if (currentWordCount > 0 && (wouldExceedWordLimit || wouldExceedCharLimit)) {
        chunks.push({ startIndex: currentStart, endIndex: i });
        currentStart = i;
        currentCharCount = wordLength;
        currentWordCount = 1;
      } else {
        currentCharCount += (currentWordCount > 0 ? 1 : 0) + wordLength;
        currentWordCount++;
      }
    }
    if (currentWordCount > 0) {
      chunks.push({ startIndex: currentStart, endIndex: words.length });
    }

    // Find chunk matching activeWordIdx
    let targetChunkIndex = chunks.findIndex(
      (c) => activeWordIdx >= c.startIndex && activeWordIdx < c.endIndex
    );
    if (targetChunkIndex === -1) {
      targetChunkIndex = Math.max(0, Math.min(chunks.length - 1, 0));
    }
    const targetChunk = chunks[targetChunkIndex] || { startIndex: 0, endIndex: words.length };

    const chunkWords = words.slice(targetChunk.startIndex, targetChunk.endIndex);
    const chunkText = chunkWords.map((w) => w.word).join(' ');

    // For secondary translation text, synchronously slice matching chunk
    let secondaryChunk = caption.secondaryText;
    if (caption.secondaryText) {
      const secTokens = caption.secondaryText.trim().split(/\s+/).filter(Boolean);
      if (secTokens.length > 0) {
        const totalChunks = Math.max(1, chunks.length);
        const secWordsPerChunk = Math.max(1, Math.round(secTokens.length / totalChunks));
        const secStart = targetChunkIndex * secWordsPerChunk;
        const secEnd = Math.min(secTokens.length, secStart + secWordsPerChunk);
        secondaryChunk = secTokens.slice(secStart, secEnd).join(' ');
      }
    }

    return {
      visibleWords: chunkWords,
      visibleText: chunkText,
      visibleSecondaryText: secondaryChunk,
      isChunked: true,
      activeWordIndex: activeWordIdx - targetChunk.startIndex,
      isSingleLineOnly: true,
    };
  }

  // 3. Full Sentence Mode (only when maxLines is explicitly set to 2 or 0/multi-line)
  return {
    visibleWords: words,
    visibleText: caption.text,
    visibleSecondaryText: caption.secondaryText,
    isChunked: false,
    activeWordIndex: activeWordIdx,
    isSingleLineOnly: false,
  };
}

/**
 * Calculates aspect-ratio-aware font sizing, padding, and layout metrics
 * preventing overflowing, 8-line tall text boxes, or bottom clipping in 9:16 and 1:1.
 * When autoScaleFontSize is true (default), dynamically adapts to aspect ratio.
 */
export function getAspectAwareSubtitleMetrics(
  style: SubtitleStyle,
  aspectRatio: AspectRatioType,
  containerWidth: number,
  containerHeight: number,
  textLength: number,
  isChunked: boolean
) {
  const isAutoScale = style.autoScaleFontSize !== false;
  const isAspectFontScaling = style.aspectRatioFontScaling !== false;

  // Resolve effective aspect ratio (if 'original', calculate from dimensions)
  let resolvedAspect: '9:16' | '16:9' | '1:1' | '4:5' = '16:9';
  if (aspectRatio === 'original') {
    if (containerWidth > 0 && containerHeight > 0) {
      const r = containerWidth / containerHeight;
      if (r <= 0.75) resolvedAspect = '9:16';
      else if (r >= 0.85 && r <= 1.15) resolvedAspect = '1:1';
      else if (r > 0.75 && r < 0.85) resolvedAspect = '4:5';
      else resolvedAspect = '16:9';
    } else {
      resolvedAspect = '16:9';
    }
  } else {
    resolvedAspect = aspectRatio;
  }

  // 1. Dynamic aspect-ratio relative font scaling factor
  // Widescreen (16:9) has wide horizontal real estate so captions require proportional scaling
  // to remain balanced and legible from desktop/TV distance without looking microscopic.
  // Vertical (9:16) reels have narrow horizontal width where compact scaling prevents crowded multi-line breaks.
  let aspectMultiplier = 1.0;
  if (isAspectFontScaling) {
    if (style.aspectRatioScaleMultipliers?.[aspectRatio]) {
      aspectMultiplier = style.aspectRatioScaleMultipliers[aspectRatio]!;
    } else if (style.aspectRatioScaleMultipliers?.[resolvedAspect]) {
      aspectMultiplier = style.aspectRatioScaleMultipliers[resolvedAspect]!;
    } else {
      // Balanced default multipliers tailored for visual harmony
      if (resolvedAspect === '16:9') {
        aspectMultiplier = 1.25; // +25% boost for balanced widescreen presentation
      } else if (resolvedAspect === '9:16') {
        aspectMultiplier = 0.92; // Compact fit for narrow phone screen reels
      } else if (resolvedAspect === '1:1') {
        aspectMultiplier = 1.05; // Balanced square post scale
      } else if (resolvedAspect === '4:5') {
        aspectMultiplier = 1.0;
      }
    }
  }

  // 2. Baseline scaling relative to container dimensions
  let scale = 1;
  if (isAutoScale && containerWidth > 0 && containerHeight > 0) {
    if (resolvedAspect === '9:16') {
      // In 9:16 (vertical reel), container width is typically 280px-360px in preview.
      scale = Math.min(1.05, Math.max(0.5, containerWidth / 380));
    } else if (resolvedAspect === '1:1') {
      scale = Math.min(1.15, Math.max(0.55, containerWidth / 460));
    } else if (resolvedAspect === '4:5') {
      scale = Math.min(1.15, Math.max(0.55, containerWidth / 430));
    } else {
      // 16:9 Landscape widescreen: container width is ~600px-700px in preview
      scale = Math.min(1.35, Math.max(0.65, containerWidth / 680));
    }
  }

  let baseFontSize = style.fontSize * scale * aspectMultiplier;

  // If in full-sentence mode (not chunked) with auto-scale, dynamically auto-scale font size if text has many characters
  // so that subtitles stay within compact lines without overflowing!
  if (isAutoScale && !isChunked) {
    if (resolvedAspect === '9:16') {
      if (textLength > 65) {
        baseFontSize *= 0.55; // Significantly reduce font for very long sentences (e.g. 15+ words)
      } else if (textLength > 40) {
        baseFontSize *= 0.70;
      } else if (textLength > 22) {
        baseFontSize *= 0.85;
      }
    } else if (resolvedAspect === '1:1') {
      if (textLength > 65) {
        baseFontSize *= 0.65;
      } else if (textLength > 40) {
        baseFontSize *= 0.78;
      }
    } else if (resolvedAspect === '4:5') {
      if (textLength > 60) {
        baseFontSize *= 0.7;
      }
    }
  } else if (isChunked && isAutoScale) {
    // In chunked 2-4 word mode, font can be bold, crisp, and high-impact
    if (resolvedAspect === '9:16') {
      baseFontSize = Math.min(baseFontSize, 32);
    }
  }

  // Horizontal Boundary Fit Guarantee:
  // Dynamically scale down font if text would exceed container width, preventing any cutting on left/right sides
  if (isAutoScale && containerWidth > 0 && textLength > 0) {
    const maxWidthPct = style.maxWidthPercent || (aspectRatio === '9:16' ? 90 : 88);
    const safeAvailablePx = containerWidth * (maxWidthPct / 100);
    // Character width multiplier (bold uppercase fonts take ~0.60x of font size)
    const charWidthMultiplier = style.textTransform === 'uppercase' ? 0.62 : 0.54;
    const estimatedWidthPx = textLength * baseFontSize * charWidthMultiplier;

    if (estimatedWidthPx > safeAvailablePx * 0.94) {
      const fitRatio = (safeAvailablePx * 0.90) / estimatedWidthPx;
      baseFontSize = Math.max(12, Math.floor(baseFontSize * fitRatio));
    }
  }

  // If user strictly requested 1 line limit and text is slightly long, ensure tight single line fit
  if (style.maxLines === 1 && textLength > 24) {
    baseFontSize = Math.min(baseFontSize, 24);
  }

  const primaryFontSize = Math.max(12, Math.round(baseFontSize));
  const secondaryBase = (style.secondaryFontSize || Math.round(style.fontSize * 0.72)) * scale;
  const secondaryFontSize = Math.max(
    10,
    Math.round(isChunked ? secondaryBase : secondaryBase * (textLength > 45 ? 0.85 : 1))
  );

  // Proportional padding (smaller in 9:16 to leave max horizontal text space)
  const paddingX = Math.round(
    aspectRatio === '9:16'
      ? Math.min((style.backgroundPaddingX || 16) * scale, 12)
      : (style.backgroundPaddingX || 16) * scale
  );
  const paddingY = Math.round(
    aspectRatio === '9:16'
      ? Math.min((style.backgroundPaddingY || 8) * scale, 6)
      : (style.backgroundPaddingY || 8) * scale
  );

  // Maximum allowed width % (generous in 9:16 so words don't wrap unnecessarily)
  let maxWidthPercent = style.maxWidthPercent || (aspectRatio === '9:16' ? 90 : 88);
  if (aspectRatio === '9:16') {
    maxWidthPercent = Math.max(88, maxWidthPercent);
  }

  // Safe vertical positioning presets for 9:16 & 1:1
  let yPosPercent = style.yOffsetPercent ?? 72;
  if (style.positionPreset === 'top') {
    yPosPercent = aspectRatio === '9:16' ? 16 : 14;
  } else if (style.positionPreset === 'middle') {
    yPosPercent = 50;
  } else if (style.positionPreset === 'tiktok-safe') {
    // In 9:16, 68% sits safely above TikTok/Reels bottom author & sound UI
    yPosPercent = aspectRatio === '9:16' ? 68 : aspectRatio === '1:1' ? 76 : 72;
  } else if (style.positionPreset === 'bottom') {
    yPosPercent = aspectRatio === '9:16' ? 78 : 82;
  }

  return {
    primaryFontSize,
    secondaryFontSize,
    paddingX,
    paddingY,
    maxWidthPercent,
    yPosPercent,
    scale,
    aspectMultiplier,
    resolvedAspect,
  };
}
