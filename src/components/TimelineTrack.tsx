import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Magnet, Volume2, Sparkles, Globe, Zap, MessageSquare, Clock, Captions as CaptionsIcon } from 'lucide-react';
import { Caption } from '../types';
import { formatTime, formatTimeShort } from '../utils/time';
import { calculateAdaptiveSilenceThreshold } from '../utils/audioSnapping';

interface TimelineTrackProps {
  duration: number;
  currentTime: number;
  captions: Caption[];
  waveformPeaks?: number[];
  onSeek: (seconds: number) => void;
  onSnapAllToAudio?: () => void;
  snappingCaptionId?: string | null;
  bulkSnapProgress?: { currentCaptionId: string; index: number; total: number } | null;
}

export const TimelineTrack: React.FC<TimelineTrackProps> = ({
  duration,
  currentTime,
  captions,
  waveformPeaks,
  onSeek,
  onSnapAllToAudio,
  snappingCaptionId,
  bulkSnapProgress,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoveredCaption, setHoveredCaption] = useState<Caption | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; pct: number } | null>(null);

  const safeDuration = duration > 0 ? duration : 10;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / safeDuration) * 100));

  const silenceThreshold = useMemo(() => {
    return waveformPeaks ? calculateAdaptiveSilenceThreshold(waveformPeaks) : 0.05;
  }, [waveformPeaks]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleSeek(e);
  };

  const handleSeek = (e: React.PointerEvent<HTMLDivElement> | MouseEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const targetSeconds = (clickX / rect.width) * safeDuration;
    onSeek(targetSeconds);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = clickX / rect.width;
    const currentSeconds = pct * safeDuration;
    setHoverTime(currentSeconds);
    setHoverPos({ x: clickX, pct: pct * 100 });

    if (isDragging) {
      handleSeek(e);
    }
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDragging) setIsDragging(false);
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [isDragging]);

  // Generate interval markers
  const step = safeDuration > 60 ? 10 : safeDuration > 30 ? 5 : 2;
  const markersCount = Math.max(2, Math.floor(safeDuration / step));
  const markers = Array.from({ length: markersCount + 1 }, (_, i) => {
    const time = i * step;
    const pct = (time / safeDuration) * 100;
    return { time, pct };
  }).filter((m) => m.time <= safeDuration);

  // Helper to determine caption category
  const getCaptionType = (caption: Caption) => {
    if (caption.secondaryText && caption.secondaryText.trim().length > 0) {
      return {
        type: 'dual',
        label: 'Dual Subtitle',
        icon: Globe,
        colorClass:
          'bg-teal-500/15 border-teal-500/40 text-teal-900 dark:text-teal-200 hover:bg-teal-500/25',
        badgeClass: 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30',
      };
    }
    const wordCount = caption.text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount <= 3) {
      return {
        type: 'punchy',
        label: 'Viral Punch',
        icon: Zap,
        colorClass:
          'bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200 hover:bg-amber-500/25',
        badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
      };
    }
    return {
      type: 'standard',
      label: 'Dialogue',
      icon: MessageSquare,
      colorClass:
        'bg-slate-100 dark:bg-zinc-800/90 border-slate-300/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 hover:bg-slate-200/80 dark:hover:bg-zinc-700/80',
      badgeClass: 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-600',
    };
  };

  return (
    <div
      id="timeline-track-container"
      className="w-full bg-white dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 select-none shadow-sm dark:shadow-xl text-slate-800 dark:text-zinc-200 transition-colors duration-200 relative"
    >
      {/* Header with Title, Snapping Action & Legend Badges */}
      <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-500 dark:text-zinc-400 mb-2 px-1 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-900 dark:text-zinc-100 tracking-wider uppercase font-sans flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Audio Waveform & Timeline</span>
          </span>
          <span className="text-slate-300 dark:text-zinc-700">•</span>
          <span className="font-semibold">{formatTimeShort(currentTime)}</span>
          <span className="text-slate-400">/</span>
          <span>{formatTimeShort(safeDuration)}</span>
        </div>

        {/* Legend pills for clean visual density */}
        <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-sans">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-semibold">
            <Zap className="w-2.5 h-2.5" />
            <span>Viral Reel (&lt;4w)</span>
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-semibold">
            <Globe className="w-2.5 h-2.5" />
            <span>Dual Track</span>
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-semibold">
            <span>● Active</span>
          </span>
        </div>

        {/* Snap to Audio Action Button or Progress Banner */}
        <div className="flex items-center gap-2">
          {bulkSnapProgress ? (
            <div
              id="timeline-snapping-progress-banner"
              className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 backdrop-blur-md border border-emerald-300 dark:border-emerald-500/50 rounded-xl shadow-xs animate-pulse"
            >
              <Magnet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-spin" />
              <span>
                Snapping to Silence: {bulkSnapProgress.index + 1}/{bulkSnapProgress.total} (
                {Math.round(((bulkSnapProgress.index + 1) / bulkSnapProgress.total) * 100)}%)
              </span>
            </div>
          ) : (
            onSnapAllToAudio && (
              <button
                type="button"
                id="timeline-snap-to-audio-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSnapAllToAudio();
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-300 hover:text-white bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-600 dark:hover:bg-indigo-600 border border-indigo-200 dark:border-indigo-500/30 rounded-lg shadow-xs transition-all active:scale-95"
                title="Automatically snap all caption boundaries to the nearest silence gaps in audio"
              >
                <Magnet className="w-3 h-3 text-indigo-600 dark:text-indigo-400 group-hover:text-white" />
                <span>Snap to Audio Gaps</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Interactive Track with Separated Audio Wave & Subtitles Lanes */}
      <div
        ref={trackRef}
        id="video-timeline-track"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => {
          setHoverTime(null);
          setHoveredCaption(null);
          setHoverPos(null);
        }}
        className="relative rounded-xl overflow-hidden cursor-pointer border border-slate-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all shadow-inner flex flex-col select-none"
      >
        {/* TOP LANE: Audio Waveform & Time Ticks */}
        <div className="relative h-12 bg-slate-50/90 dark:bg-zinc-950/95 overflow-hidden border-b border-slate-200/80 dark:border-zinc-800/80">
          {/* Subtle Audio Track Identifier Tag */}
          <div className="absolute left-1.5 top-1 z-10 flex items-center gap-1 text-[8.5px] font-mono font-bold text-slate-400 dark:text-zinc-500 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xs px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-zinc-800/60 pointer-events-none select-none">
            <Volume2 className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400" />
            <span>Audio Wave</span>
          </div>

          {/* Time Grid Division Lines & Labels */}
          {markers.map((m, idx) => (
            <div
              key={`tick-${idx}`}
              className="absolute top-0 bottom-0 border-l border-slate-300/40 dark:border-white/[0.06] pointer-events-none"
              style={{ left: `${m.pct}%` }}
            >
              <span className="text-[9px] font-mono text-slate-400 dark:text-zinc-500 pl-1 block pt-0.5 select-none">
                {formatTimeShort(m.time)}
              </span>
            </div>
          ))}

          {/* Audio Waveform Peak Bars */}
          <div className="absolute inset-x-0 bottom-1 top-4 flex items-end justify-between px-1 pointer-events-none opacity-85 dark:opacity-90">
            {(waveformPeaks && waveformPeaks.length > 0
              ? waveformPeaks
              : Array.from({ length: 140 }, () => Math.random() * 0.7 + 0.1)
            ).map((peak, idx) => {
              const isSilence = peak <= silenceThreshold;
              return (
                <div
                  key={idx}
                  className={`w-0.5 rounded-t-full transition-colors ${
                    isSilence
                      ? 'bg-slate-300/60 dark:bg-zinc-800'
                      : 'bg-indigo-500/85 dark:bg-indigo-400/85'
                  }`}
                  style={{ height: `${Math.max(8, peak * 95)}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* BOTTOM LANE: Subtitle Blocks Lane (Positioned cleanly below audio wave) */}
        <div className="relative h-10 bg-slate-100/70 dark:bg-zinc-900/50 overflow-hidden">
          {/* Subtle Subtitle Track Identifier Tag */}
          <div className="absolute left-1.5 top-1 z-10 flex items-center gap-1 text-[8.5px] font-mono font-bold text-slate-400 dark:text-zinc-500 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xs px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-zinc-800/60 pointer-events-none select-none opacity-60">
            <CaptionsIcon className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400" />
            <span>Subtitles</span>
          </div>

          {/* Time Division Grid continuation */}
          {markers.map((m, idx) => (
            <div
              key={`sub-grid-${idx}`}
              className="absolute top-0 bottom-0 border-l border-slate-300/30 dark:border-white/[0.03] pointer-events-none"
              style={{ left: `${m.pct}%` }}
            />
          ))}

          {/* Empty State Prompt */}
          {captions.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400 dark:text-zinc-500 italic pointer-events-none">
              <span>No subtitles in project yet</span>
            </div>
          )}

          {/* Caption Blocks Layer */}
          <div className="absolute inset-0 px-0.5">
            {captions.map((caption) => {
              const leftPct = Math.min(100, Math.max(0, (caption.start / safeDuration) * 100));
              const widthPct = Math.min(
                100 - leftPct,
                Math.max(1, ((caption.end - caption.start) / safeDuration) * 100)
              );
              const isActive = currentTime >= caption.start && currentTime <= caption.end;
              const isSnapping =
                snappingCaptionId === caption.id || bulkSnapProgress?.currentCaptionId === caption.id;
              const typeInfo = getCaptionType(caption);
              const Icon = typeInfo.icon;

              return (
                <div
                  key={caption.id}
                  id={`timeline-caption-${caption.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(caption.start);
                  }}
                  onMouseEnter={() => setHoveredCaption(caption)}
                  onMouseLeave={() => setHoveredCaption(null)}
                  className={`absolute top-1 bottom-1 rounded-md border text-[10px] px-1.5 flex items-center justify-between overflow-hidden transition-all backdrop-blur-xs cursor-pointer ${
                    isSnapping
                      ? 'bg-emerald-500 text-white font-black z-30 shadow-lg shadow-emerald-500/50 ring-2 ring-emerald-300 scale-105 animate-pulse'
                      : isActive
                      ? 'bg-indigo-600 border-indigo-400 text-white font-bold z-20 shadow-md shadow-indigo-600/40 ring-2 ring-indigo-300/80 scale-[1.02]'
                      : `${typeInfo.colorClass} shadow-2xs`
                  }`}
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                  }}
                >
                  <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                    <Icon className="w-2.5 h-2.5 shrink-0 opacity-80" />
                    <span className="truncate font-medium">{caption.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hover Needle Line across both lanes */}
        {hoverTime !== null && (
          <div
            className="absolute top-0 bottom-0 w-px bg-indigo-500/80 pointer-events-none z-30"
            style={{ left: `${(hoverTime / safeDuration) * 100}%` }}
          />
        )}

        {/* Active Playhead Needle across both lanes with Scrub Pip Handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-indigo-600 dark:bg-indigo-400 pointer-events-none z-40 shadow-[0_0_10px_rgba(99,102,241,0.9)]"
          style={{ left: `${progressPercent}%` }}
        >
          <div className="w-3.5 h-3.5 bg-indigo-600 dark:bg-indigo-400 rounded-full -ml-[6px] -mt-1 shadow-md border-2 border-white dark:border-zinc-950" />
        </div>
      </div>

      {/* Floating Hover-Preview Tooltip Card */}
      {hoveredCaption && hoverPos && (
        <div
          id="timeline-caption-hover-tooltip"
          className="absolute z-50 pointer-events-none -top-24 transform -translate-x-1/2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl shadow-xl p-2.5 max-w-xs sm:max-w-sm w-max min-w-[220px] animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-zinc-100"
          style={{
            left: `${Math.max(120, Math.min(window.innerWidth - 150, hoverPos.x + 16))}px`,
          }}
        >
          {/* Header row: time badge & category */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-zinc-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-500" />
              <span>
                {formatTime(hoveredCaption.start)} → {formatTime(hoveredCaption.end)}
              </span>
              <span className="text-slate-400">
                ({(hoveredCaption.end - hoveredCaption.start).toFixed(1)}s)
              </span>
            </span>

            {(() => {
              const info = getCaptionType(hoveredCaption);
              const Icon = info.icon;
              return (
                <span
                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${info.badgeClass}`}
                >
                  <Icon className="w-2.5 h-2.5" />
                  <span>{info.label}</span>
                </span>
              );
            })()}
          </div>

          {/* Full Caption Text */}
          <p className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">
            "{hoveredCaption.text}"
          </p>

          {/* Dual Translation Preview if present */}
          {hoveredCaption.secondaryText && (
            <p className="text-[11px] text-teal-600 dark:text-teal-400 italic mt-1 border-t border-slate-100 dark:border-zinc-800 pt-1 flex items-center gap-1">
              <Globe className="w-2.5 h-2.5 shrink-0" />
              <span>{hoveredCaption.secondaryText}</span>
            </p>
          )}

          <div className="text-[9px] text-indigo-500 font-medium mt-1 text-right">
            Click to seek to this cue
          </div>
        </div>
      )}

      {/* Hover timestamp needle chip if hovering empty space without caption */}
      {!hoveredCaption && hoverTime !== null && hoverPos && (
        <div
          className="absolute -top-7 pointer-events-none transform -translate-x-1/2 px-2 py-0.5 rounded-md bg-indigo-600 text-white font-mono text-[10px] font-bold shadow-md z-40"
          style={{ left: `${hoverPos.pct}%` }}
        >
          {formatTime(hoverTime)}
        </div>
      )}
    </div>
  );
};
