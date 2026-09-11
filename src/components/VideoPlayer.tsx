import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume1,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  SkipBack,
  SkipForward,
  Shield,
  Smartphone,
  Tv,
  Square,
  Sparkles,
  SlidersHorizontal,
  Film,
} from 'lucide-react';
import { Caption, SubtitleStyle, AspectRatioType } from '../types';
import { formatTime } from '../utils/time';
import { AudioVisualizer } from './AudioVisualizer';
import { getActiveSubtitleSegment, getAspectAwareSubtitleMetrics } from '../utils/subtitleLayout';
import { getKeyframeAnimationTransform } from '../utils/keyframeAnimations';

interface VideoPlayerProps {
  videoUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  captions: Caption[];
  style: SubtitleStyle;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  aspectRatio: AspectRatioType;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onAspectRatioChange: (aspect: AspectRatioType) => void;
  onUpdateStyle?: (updater: Partial<SubtitleStyle>) => void;
  onVideoMetadataLoaded?: (meta: { width: number; height: number; duration: number; aspectRatio: AspectRatioType }) => void;
}

const computeShadowCSS = (style: SubtitleStyle, scale: number = 1): string => {
  if (style.enableTextShadow === false) return 'none';
  const ox = Math.round((style.shadowOffsetX || 0) * scale);
  const oy = Math.round((style.shadowOffsetY || 0) * scale);
  const blur = Math.round((style.shadowBlur || 0) * scale);
  if (blur === 0 && ox === 0 && oy === 0) return 'none';

  let color = style.shadowColor || 'rgba(0,0,0,0.85)';
  if (style.shadowIntensity !== undefined) {
    const alpha = (style.shadowIntensity / 100).toFixed(2);
    if (color.startsWith('#')) {
      let hex = color.slice(1);
      if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      color = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (match) {
        color = `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
      }
    }
  }

  if (style.shadowIntensity && style.shadowIntensity > 65) {
    const spreadBlur = Math.round(blur * 1.4);
    return `${ox}px ${oy}px ${blur}px ${color}, 0px 0px ${spreadBlur}px ${color}`;
  }
  return `${ox}px ${oy}px ${blur}px ${color}`;
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  videoRef,
  captions,
  style,
  currentTime,
  duration,
  isPlaying,
  aspectRatio,
  onTimeUpdate,
  onDurationChange,
  onPlayPause,
  onSeek,
  onAspectRatioChange,
  onUpdateStyle,
  onVideoMetadataLoaded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const prevVolumeRef = useRef<number>(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [nativeAspectRatio, setNativeAspectRatio] = useState<number | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  // High-precision 60fps animation frame time tracking during playback.
  // Standard HTMLMediaElement onTimeUpdate only fires 3-4 times/second (250ms delay),
  // which causes perceptible audio/subtitle lag. requestAnimationFrame provides silky 60fps sync.
  useEffect(() => {
    let animId: number;
    const precisionTick = () => {
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        onTimeUpdate(videoRef.current.currentTime);
      }
      if (isPlaying) {
        animId = requestAnimationFrame(precisionTick);
      }
    };

    if (isPlaying) {
      animId = requestAnimationFrame(precisionTick);
    }
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, onTimeUpdate, videoRef]);

  // Update container dimensions on resize for crisp responsive subtitle scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    if (clamped === 0) {
      setIsMuted(true);
      if (videoRef.current) {
        videoRef.current.volume = 0;
        videoRef.current.muted = true;
      }
    } else {
      setIsMuted(false);
      prevVolumeRef.current = clamped;
      if (videoRef.current) {
        videoRef.current.volume = clamped;
        videoRef.current.muted = false;
      }
    }
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted || volume === 0) {
      // Unmute: restore previous non-zero volume (or default 1)
      const restoredVol = prevVolumeRef.current > 0 ? prevVolumeRef.current : 1;
      setVolume(restoredVol);
      setIsMuted(false);
      videoRef.current.muted = false;
      videoRef.current.volume = restoredVol;
    } else {
      // Mute: record current volume to restore later
      prevVolumeRef.current = volume;
      setIsMuted(true);
      videoRef.current.muted = true;
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(false);
    }
  };

  // Audio sync calibration:
  // When audio is faster than subtitles (speech starts before subtitle appears),
  // a positive syncOffset (e.g. +200ms / +0.20s) triggers subtitles earlier to sync with the audio.
  const syncOffsetSec = (style.audioSyncOffsetMs || 0) / 1000;
  const calibratedTime = Math.max(0, currentTime + syncOffsetSec);

  // Find active caption based on calibrated audio/subtitle time
  const activeCaption = captions.find(
    (c) => calibratedTime >= c.start && calibratedTime <= c.end
  );

  // Aspect ratio styling
  const aspectClass =
    aspectRatio === '9:16'
      ? 'aspect-[9/16] max-h-[70vh] w-auto'
      : aspectRatio === '16:9'
      ? 'aspect-video w-full'
      : aspectRatio === '1:1'
      ? 'aspect-square max-h-[70vh] w-auto'
      : aspectRatio === '4:5'
      ? 'aspect-[4/5] max-h-[70vh] w-auto'
      : nativeAspectRatio
      ? 'max-h-[70vh] w-auto max-w-full'
      : 'aspect-video w-full';

  // Calculate active subtitle segment with calibrated time
  const segment = activeCaption
    ? getActiveSubtitleSegment(activeCaption, calibratedTime, style, aspectRatio)
    : null;

  const visibleWords = segment?.visibleWords || [];
  const hasWords = visibleWords.length > 0 && style.wordHighlightEffect !== 'none';
  const displayText = segment?.visibleText || activeCaption?.text || '';
  const displaySecondaryText = segment?.visibleSecondaryText || activeCaption?.secondaryText || '';

  // Calculate aspect-ratio aware metrics for crisp, compact, non-overflowing typography across all aspect ratios
  const metrics = getAspectAwareSubtitleMetrics(
    style,
    aspectRatio,
    containerDimensions.width,
    containerDimensions.height,
    displayText.length,
    segment?.isChunked ?? false
  );

  const responsiveFontSize = metrics.primaryFontSize;
  const responsiveSecondaryFontSize = metrics.secondaryFontSize;
  const yPosStyle = `${metrics.yPosPercent}%`;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Aspect Ratio & Guide Switcher Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-2 px-1 text-xs">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-950/50 backdrop-blur-xl p-1 rounded-2xl border border-slate-200 dark:border-white/[0.08] overflow-x-auto no-scrollbar max-w-full shadow-xs transition-colors">
          <button
            type="button"
            onClick={() => onAspectRatioChange('original')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl transition-all whitespace-nowrap ${
              aspectRatio === 'original'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-semibold shadow-xs border border-slate-200/80 dark:border-zinc-700'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-white/[0.04]'
            }`}
            title="Original Video Aspect Ratio (Full Screen, No Black Bars)"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Original</span>
          </button>

          <button
            type="button"
            onClick={() => onAspectRatioChange('9:16')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl transition-all whitespace-nowrap ${
              aspectRatio === '9:16'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-semibold shadow-xs border border-slate-200/80 dark:border-zinc-700'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-white/[0.04]'
            }`}
            title="9:16 Vertical (TikTok, Instagram Reels, Shorts)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>9:16 Reel</span>
          </button>

          <button
            type="button"
            onClick={() => onAspectRatioChange('16:9')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl transition-all whitespace-nowrap ${
              aspectRatio === '16:9'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-semibold shadow-xs border border-slate-200/80 dark:border-zinc-700'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-white/[0.04]'
            }`}
            title="16:9 Landscape (YouTube, Desktop Video)"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>16:9 Wide</span>
          </button>

          <button
            type="button"
            onClick={() => onAspectRatioChange('1:1')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl transition-all whitespace-nowrap ${
              aspectRatio === '1:1'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-semibold shadow-xs border border-slate-200/80 dark:border-zinc-700'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-white/[0.04]'
            }`}
            title="1:1 Square (Instagram Feed, LinkedIn)"
          >
            <Square className="w-3.5 h-3.5" />
            <span>1:1 Feed</span>
          </button>

          <button
            type="button"
            onClick={() => onAspectRatioChange('4:5')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl transition-all whitespace-nowrap ${
              aspectRatio === '4:5'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-semibold shadow-xs border border-slate-200/80 dark:border-zinc-700'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-white/[0.04]'
            }`}
            title="4:5 Portrait (Instagram Carousel, Facebook)"
          >
            <Smartphone className="w-3.5 h-3.5 rotate-90" />
            <span>4:5 Portrait</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Dynamic Caption Font Scaling Indicator Badge */}
          {style.aspectRatioFontScaling !== false && metrics.aspectMultiplier && (
            <div
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-300 transition-all cursor-default"
              title={`Dynamic caption scaling active: ${metrics.aspectMultiplier.toFixed(2)}× font scale relative to ${metrics.resolvedAspect} aspect ratio.`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Scale: {metrics.aspectMultiplier.toFixed(2)}× ({metrics.resolvedAspect})</span>
            </div>
          )}

          {/* Safe Zone Toggle */}
          <button
            type="button"
            onClick={() => setShowSafeZone(!showSafeZone)}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap ${
              showSafeZone
                ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-300 shadow-xs'
                : 'bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
            title="Toggle TikTok / Reels UI Safe Zone overlay"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>UI Safe Zone</span>
          </button>
        </div>
      </div>


      {/* Main Video Viewport Bento Cell */}
      <div
        ref={containerRef}
        id="video-viewport-container"
        style={aspectRatio === 'original' && nativeAspectRatio ? { aspectRatio: `${nativeAspectRatio}` } : undefined}
        className={`relative bg-[#181A20] rounded-[14px] overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center mx-auto ${aspectClass}`}
      >
        {/* Subtle Bento Background Dot Pattern */}
        <div className="absolute inset-0 bg-bento-dots opacity-20 pointer-events-none" />

        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            crossOrigin="anonymous"
            onVolumeChange={(e) => {
              const v = e.currentTarget;
              setVolume(v.volume);
              setIsMuted(v.muted || v.volume === 0);
              if (v.volume > 0 && !v.muted) {
                prevVolumeRef.current = v.volume;
              }
            }}
            onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              onDurationChange(v.duration);
              const w = v.videoWidth || 1920;
              const h = v.videoHeight || 1080;
              const ratio = w / h;
              setNativeAspectRatio(ratio);
              let detected: AspectRatioType = '16:9';
              if (ratio <= 0.75) detected = '9:16';
              else if (ratio >= 0.85 && ratio <= 1.15) detected = '1:1';
              else if (ratio > 0.75 && ratio < 0.85) detected = '4:5';
              else detected = '16:9';
              onVideoMetadataLoaded?.({ width: w, height: h, duration: v.duration, aspectRatio: detected });
            }}
            onClick={onPlayPause}
            className="w-full h-full object-contain cursor-pointer relative z-10"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 relative z-10">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
              <Play className="w-8 h-8 text-white ml-1 fill-white" />
            </div>
            <p className="text-sm font-medium text-zinc-300">No video selected</p>
            <p className="text-xs text-zinc-500 mt-1">Upload an MP4 / WebM video or load a preset sample</p>
          </div>
        )}

        {/* Subtitle Overlay */}
        {activeCaption && (() => {
          const keyframeAnim = getKeyframeAnimationTransform(
            calibratedTime,
            activeCaption.start,
            activeCaption.end,
            style,
            metrics.scale
          );

          // Per-caption custom formatting overrides
          const customFontOverride = activeCaption.customFontSize || activeCaption.styleOverride?.fontSize;
          const effectiveFontSize = customFontOverride
            ? Math.max(12, Math.round(customFontOverride * (metrics.scale || 1)))
            : responsiveFontSize;

          const effectiveTextColor =
            activeCaption.customColor || activeCaption.styleOverride?.textColor || style.textColor;

          const isBoldForced = activeCaption.isBold ?? activeCaption.styleOverride?.isBold;
          const effectiveFontWeight =
            isBoldForced === true ? 900 : isBoldForced === false ? 400 : style.fontWeight;

          const isItalicForced = activeCaption.isItalic ?? activeCaption.styleOverride?.isItalic;
          const effectiveFontStyle = isItalicForced ? 'italic' : 'normal';

          const effectiveTextTransform =
            activeCaption.customTextTransform || activeCaption.styleOverride?.textTransform || style.textTransform;

          const effectiveBgColor =
            activeCaption.customBgColor || activeCaption.styleOverride?.backgroundColor || style.backgroundColor;

          return (
            <div
              id="active-subtitle-overlay"
              className="absolute pointer-events-none flex justify-center transition-all duration-75 z-20"
              style={{
                top: yPosStyle,
                left: `${50 + (style.xOffsetPercent || 0)}%`,
                opacity: keyframeAnim.opacity,
                transform: `translate(-50%, -50%) translate3d(${keyframeAnim.translateX}px, ${keyframeAnim.translateY}px, 0) scale(${keyframeAnim.scale})`,
                filter: keyframeAnim.blur > 0 ? `blur(${keyframeAnim.blur}px)` : 'none',
                width: 'max-content',
                maxWidth: `${metrics.maxWidthPercent}%`,
                maxHeight: '38%',
              }}
            >
              <div
                className="inline-flex flex-col items-center justify-center transition-all w-full text-center gap-1 break-words select-none"
                style={{
                  fontFamily: style.fontFamily,
                  fontStyle: effectiveFontStyle,
                  backgroundColor: style.showBackgroundBox
                    ? effectiveBgColor + Math.round(style.backgroundOpacity * 255).toString(16).padStart(2, '0')
                    : 'transparent',
                  borderRadius: `${Math.round(style.backgroundBorderRadius * (metrics.scale || 1))}px`,
                  padding: style.showBackgroundBox
                    ? `${metrics.paddingY}px ${metrics.paddingX}px`
                    : '0px',
                  boxShadow: style.showBackgroundBox ? '0 4px 20px rgba(0,0,0,0.45)' : 'none',
                }}
              >
                {/* If Dual Caption is enabled and layout is secondary-top */}
                {style.dualCaptionEnabled && displaySecondaryText && style.dualCaptionLayout === 'secondary-top' && (
                  <div
                    id="active-secondary-subtitle-top"
                    className={`font-medium tracking-normal leading-snug transition-all px-1 ${
                      style.maxLines === 1
                        ? 'whitespace-nowrap max-w-full'
                        : 'break-words text-center'
                    }`}
                    style={{
                      fontSize: `${responsiveSecondaryFontSize}px`,
                      color: style.secondaryTextColor || '#93C5FD',
                      opacity: 0.95,
                      textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.9)',
                    }}
                  >
                    {displaySecondaryText}
                  </div>
                )}

                {/* Primary Line */}
                <div
                  id="active-primary-subtitle"
                  className="w-full flex items-center justify-center text-center px-1"
                  style={{
                    fontSize: `${effectiveFontSize}px`,
                    fontWeight: effectiveFontWeight,
                    textTransform: effectiveTextTransform,
                    lineHeight: 1.22,
                  }}
                >
                  {hasWords ? (
                    <span
                      className={`inline-flex items-center justify-center gap-x-2 gap-y-0.5 ${
                        style.maxLines === 1
                          ? 'flex-nowrap whitespace-nowrap'
                          : 'flex-wrap'
                      }`}
                    >
                      {visibleWords.map((w, wIdx) => {
                        const isWordActive =
                          (calibratedTime >= w.start && calibratedTime <= w.end) ||
                          (segment?.isChunked && wIdx === segment.activeWordIndex);
                        const isKaraoke = style.wordHighlightEffect === 'karaoke';
                        const isPassed = calibratedTime > w.end;
                        const isUpcoming = calibratedTime < w.start;

                        const isBounce = isWordActive && style.wordHighlightEffect === 'bounce';
                        const isGlow = (isWordActive && style.wordHighlightEffect === 'glow') || (isWordActive && isKaraoke);
                        const isBoxHighlight = (isWordActive && style.wordHighlightEffect === 'box-highlight') || (isWordActive && isKaraoke && style.activeWordBgColor);
                        const isUnderline = isWordActive && style.wordHighlightEffect === 'underline';

                        let wordColor = effectiveTextColor;
                        let wordOpacity = 1;

                        if (isWordActive) {
                          wordColor = style.activeWordColor;
                          wordOpacity = 1;
                        } else if (isKaraoke) {
                          if (isPassed) {
                            wordColor = style.activeWordColor || effectiveTextColor;
                            wordOpacity = 1;
                          } else if (isUpcoming) {
                            wordColor = effectiveTextColor;
                            wordOpacity = style.inactiveWordOpacity ?? 0.5;
                          }
                        }

                        const baseShadow = computeShadowCSS(style, metrics.scale || 1);

                        const computedShadow = isGlow
                          ? `0 0 20px ${style.activeWordColor}, 0 0 30px ${style.activeWordColor}, ${baseShadow}`
                          : baseShadow;

                        // Calculate safe stroke width so the outline never chokes or blackens glyphs
                        const maxSafeStroke = Math.max(1, Math.round(effectiveFontSize * 0.08));
                        const effectiveStrokeWidth =
                          style.strokeWidth > 0
                            ? Math.min(
                                Math.max(1, Math.round(style.strokeWidth * (metrics.scale || 1))),
                                maxSafeStroke
                              )
                            : 0;

                        return (
                          <span
                            key={w.id || `${w.word}-${wIdx}`}
                            className={`inline-block transition-all duration-75 whitespace-nowrap flex-shrink-0 ${
                              isBounce ? 'scale-110' : ''
                            }`}
                            style={{
                              transform: isBounce ? `scale(${style.activeWordScale || 1.15})` : 'none',
                              color: wordColor,
                              opacity: wordOpacity,
                              backgroundColor: isBoxHighlight ? style.activeWordBgColor || '#000' : 'transparent',
                              padding: isBoxHighlight ? '1px 6px' : '0px',
                              borderRadius: isBoxHighlight ? '6px' : '0px',
                              paintOrder: 'stroke fill',
                              WebkitTextStroke:
                                effectiveStrokeWidth > 0
                                  ? `${effectiveStrokeWidth}px ${style.strokeColor}`
                                  : 'none',
                              textShadow: computedShadow,
                              borderBottom: isUnderline ? `2px solid ${style.activeWordColor}` : 'none',
                            }}
                          >
                            {w.word}
                          </span>
                        );
                      })}
                    </span>
                  ) : (
                    <span
                      className={style.maxLines === 1 ? 'whitespace-nowrap' : 'break-words text-center'}
                      style={{
                        color: effectiveTextColor,
                        paintOrder: 'stroke fill',
                        WebkitTextStroke:
                          style.strokeWidth > 0
                            ? `${Math.min(
                                Math.max(1, Math.round(style.strokeWidth * (metrics.scale || 1))),
                                Math.max(1, Math.round(effectiveFontSize * 0.08))
                              )}px ${style.strokeColor}`
                            : 'none',
                        textShadow: computeShadowCSS(style, metrics.scale || 1),
                      }}
                    >
                      {displayText}
                    </span>
                  )}
                </div>

                {/* If Dual Caption is enabled and layout is primary-top (default) */}
                {style.dualCaptionEnabled && displaySecondaryText && style.dualCaptionLayout !== 'secondary-top' && (
                  <div
                    id="active-secondary-subtitle-bottom"
                    className={`font-medium tracking-normal leading-snug transition-all px-1 ${
                      style.maxLines === 1
                        ? 'whitespace-nowrap max-w-full'
                        : 'break-words text-center'
                    }`}
                    style={{
                      fontSize: `${responsiveSecondaryFontSize}px`,
                      color: style.secondaryTextColor || '#93C5FD',
                      opacity: 0.95,
                      textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.9)',
                    }}
                  >
                    {displaySecondaryText}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* TikTok / Reels UI Safe Zone Overlay Guides */}
        {showSafeZone && (
          <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-rose-500/50 z-30 flex flex-col justify-between p-4">
            {/* Top Bar (Header/Search) */}
            <div className="bg-rose-500/20 text-rose-300 text-[10px] font-mono p-1 rounded text-center border border-rose-500/40">
              ⚠️ Top UI Safe Zone (Tabs / Search)
            </div>

            {/* Right Action Stack Guide (Like, Comment, Share, Audio) */}
            <div className="self-end flex flex-col items-center gap-3 bg-rose-500/20 p-2 rounded-xl border border-rose-500/40 text-[9px] text-rose-300 font-mono">
              <span>❤️ Like</span>
              <span>💬 Comm</span>
              <span>↗️ Share</span>
              <span>🎵 Music</span>
            </div>

            {/* Bottom Caption & Sound Bar Guide */}
            <div className="bg-rose-500/20 text-rose-300 text-[10px] font-mono p-2 rounded text-center border border-rose-500/40">
              ⚠️ Bottom UI Safe Zone (Account Name, Caption & Audio Disc)
            </div>
          </div>
        )}
      </div>

      {/* Primary Video Player Bottom Controls Bar */}
      <div className="w-full bg-slate-50 dark:bg-zinc-950/60 backdrop-blur-2xl rounded-2xl p-3 border border-slate-200 dark:border-white/[0.08] shadow-sm dark:shadow-xl mt-2 space-y-2.5 text-slate-800 dark:text-zinc-100 transition-colors duration-200">
        {/* Scrubber Range */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 min-w-[58px]">
            {formatTime(currentTime)}
          </span>
          <div className="relative w-full flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.05}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full accent-indigo-600 dark:accent-indigo-500 h-1.5 bg-slate-200 dark:bg-white/[0.1] rounded-lg cursor-pointer hover:bg-slate-300 dark:hover:bg-white/[0.18] transition-colors"
            />
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-zinc-400 min-w-[58px] text-right">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Play / Step / Seek controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPlayPause}
              id="video-play-pause-btn"
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold active:scale-95 shadow-md shadow-indigo-600/25 transition-all"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            {/* Step Back 0.1s */}
            <button
              type="button"
              onClick={() => onSeek(Math.max(0, currentTime - 0.1))}
              className="p-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/70 dark:bg-white/[0.04] hover:bg-slate-300/70 dark:hover:bg-white/[0.09] border border-slate-300/60 dark:border-white/[0.06] rounded-xl transition-all"
              title="Step back 1 frame (-0.1s)"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Step Forward 0.1s */}
            <button
              type="button"
              onClick={() => onSeek(Math.min(duration, currentTime + 0.1))}
              className="p-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/70 dark:bg-white/[0.04] hover:bg-slate-300/70 dark:hover:bg-white/[0.09] border border-slate-300/60 dark:border-white/[0.06] rounded-xl transition-all"
              title="Step forward 1 frame (+0.1s)"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Reset to 0 */}
            <button
              type="button"
              onClick={() => onSeek(0)}
              className="p-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/70 dark:bg-white/[0.04] hover:bg-slate-300/70 dark:hover:bg-white/[0.09] border border-slate-300/60 dark:border-white/[0.06] rounded-xl transition-all"
              title="Restart from beginning"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Real-time Audio Amplitude Visualizer */}
          <div className="flex items-center">
            <AudioVisualizer
              videoRef={videoRef}
              isPlaying={isPlaying}
              isMuted={isMuted}
              volume={volume}
              currentTime={currentTime}
              duration={duration}
              hasActiveCaption={Boolean(activeCaption)}
            />
          </div>

          {/* Right Tools: Speed, Volume, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Speed Selector */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-200/70 dark:bg-white/[0.05] rounded-xl border border-slate-300/60 dark:border-white/[0.09] backdrop-blur-md">
              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">SPEED</span>
              <select
                value={playbackRate}
                onChange={(e) => handleRateChange(Number(e.target.value))}
                className="bg-transparent text-[10px] font-bold text-slate-800 dark:text-white uppercase focus:outline-none cursor-pointer"
              >
                <option value={0.5} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-white">0.5x</option>
                <option value={0.75} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-white">0.75x</option>
                <option value={1} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-white">1.0x</option>
                <option value={1.25} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-white">1.25x</option>
                <option value={1.5} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-white">1.5x</option>
                <option value={2} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-white">2.0x</option>
              </select>
            </div>

            {/* Volume & Mute Controls */}
            <div
              id="video-player-volume-control-group"
              className="flex items-center gap-1.5 px-2 py-1 bg-slate-200/70 dark:bg-white/[0.05] rounded-xl border border-slate-300/60 dark:border-white/[0.09] backdrop-blur-md"
            >
              <button
                type="button"
                id="video-player-mute-btn"
                onClick={handleToggleMute}
                className="p-1 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors focus:outline-none"
                title={isMuted || volume === 0 ? 'Unmute (m)' : `Mute (m) - ${Math.round(volume * 100)}%`}
                aria-label={isMuted || volume === 0 ? 'Unmute video audio' : 'Mute video audio'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
              </button>
              <input
                type="range"
                id="video-player-volume-slider"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-16 sm:w-20 accent-indigo-600 dark:accent-indigo-500 h-1.5 bg-slate-300 dark:bg-white/[0.15] rounded-lg cursor-pointer transition-all"
                title={`Volume: ${isMuted || volume === 0 ? '0% (Muted)' : `${Math.round(volume * 100)}%`}`}
                aria-label="Volume slider"
                aria-valuenow={isMuted ? 0 : Math.round(volume * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              />
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-zinc-400 min-w-[28px] text-right select-none">
                {isMuted || volume === 0 ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/70 dark:bg-white/[0.04] hover:bg-slate-300/70 dark:hover:bg-white/[0.09] border border-slate-300/60 dark:border-white/[0.06] rounded-xl transition-all"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Studio-Grade Audio-Subtitle Sync Calibration Bar */}
        {onUpdateStyle && (
          <div
            id="video-player-sync-calibration-bar"
            className="pt-3 border-t border-slate-200 dark:border-white/[0.08] space-y-2.5 text-[11px]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 text-xs">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Audio Sync Latency</span>
                </span>
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                    (style.audioSyncOffsetMs || 0) === 0
                      ? 'bg-slate-200/70 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700/60'
                      : (style.audioSyncOffsetMs || 0) < 0
                      ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                      : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                  }`}
                >
                  {(style.audioSyncOffsetMs || 0) === 0
                    ? '0ms (Exact)'
                    : (style.audioSyncOffsetMs || 0) < 0
                    ? `${style.audioSyncOffsetMs}ms (Subtitle Delayed)`
                    : `+${style.audioSyncOffsetMs}ms (Subtitle Advanced)`}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onUpdateStyle({ audioSyncOffsetMs: (style.audioSyncOffsetMs || 0) - 50 })}
                  className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/70 dark:bg-white/[0.04] hover:bg-slate-300/70 dark:hover:bg-white/[0.08] border border-slate-300/60 dark:border-white/[0.06] transition-all"
                  title="Nudge back 50ms"
                >
                  -50ms
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStyle({ audioSyncOffsetMs: (style.audioSyncOffsetMs || 0) + 50 })}
                  className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/70 dark:bg-white/[0.04] hover:bg-slate-300/70 dark:hover:bg-white/[0.08] border border-slate-300/60 dark:border-white/[0.06] transition-all"
                  title="Nudge forward 50ms"
                >
                  +50ms
                </button>
                {(style.audioSyncOffsetMs || 0) !== 0 && (
                  <button
                    type="button"
                    onClick={() => onUpdateStyle({ audioSyncOffsetMs: 0 })}
                    className="px-2 py-0.5 rounded text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 transition-all"
                    title="Reset to 0ms"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Range Slider & Quick Presets Bar */}
            <div className="space-y-1.5">
              <input
                type="range"
                min={-1500}
                max={1500}
                step={25}
                value={style.audioSyncOffsetMs || 0}
                onChange={(e) => onUpdateStyle({ audioSyncOffsetMs: Number(e.target.value) })}
                className="w-full accent-indigo-600 dark:accent-indigo-500 h-1.5 bg-slate-200 dark:bg-zinc-800/80 rounded-lg cursor-pointer transition-all"
              />

              <div className="flex items-center justify-between gap-1 pt-0.5 flex-wrap">
                {[
                  { label: '-500ms (Heavy Delay)', val: -500 },
                  { label: '-200ms (Fast Captions Fix)', val: -200 },
                  { label: '-100ms', val: -100 },
                  { label: '0ms (Exact)', val: 0 },
                  { label: '+200ms (Advance)', val: 200 },
                ].map((preset) => {
                  const isSelected = (style.audioSyncOffsetMs || 0) === preset.val;
                  return (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => onUpdateStyle({ audioSyncOffsetMs: preset.val })}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                          : 'bg-slate-200/60 dark:bg-zinc-900/60 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-300/60 dark:hover:bg-zinc-800/80 border-slate-300/60 dark:border-white/[0.06]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

