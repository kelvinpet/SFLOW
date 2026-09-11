import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Volume2,
  Captions,
  Palette,
  Download,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Compass,
} from 'lucide-react';

export interface TourStep {
  id: string;
  targetId?: string;
  title: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  position?: 'bottom' | 'top' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to ScribeFlow Studio',
    badge: 'Getting Started',
    description:
      'Create viral, retention-grabbing video captions in seconds. Enjoy word-by-word karaoke animations, AI speech recognition, and TikTok safe margins.',
    icon: Compass,
    position: 'center',
  },
  {
    id: 'transcribe',
    targetId: 'navbar-transcribe-btn',
    title: 'AI Speech-to-Text Transcription',
    badge: 'Groq • Whisper • Deepgram',
    description:
      'Instantly transcribe audio with word-level timestamps. Supports fast cloud inference with Groq, OpenAI Whisper, and Deepgram Nova-2.',
    icon: Sparkles,
    position: 'bottom',
  },
  {
    id: 'timeline',
    targetId: 'video-timeline-track',
    title: 'Interactive Waveform & Audio Snapping',
    badge: 'Precision Timeline',
    description:
      'Scrub through your video, hover over caption blocks for rich previews, and click "Snap to Audio Gaps" to automatically align cuts to speech pauses.',
    icon: Volume2,
    position: 'top',
  },
  {
    id: 'captions-editor',
    targetId: 'tab-captions-btn',
    title: 'Smart Caption Editor & Tools',
    badge: 'Word Karaoke & Split',
    description:
      'Split long sentences into 1-line reels cues, customize individual word timings, run spellcheck, or generate translated dual subtitles.',
    icon: Captions,
    position: 'bottom',
  },
  {
    id: 'styles-presets',
    targetId: 'tab-styles-btn',
    title: 'Styles & Quick Start Templates',
    badge: 'Viral Looks',
    description:
      'Pick from curated presets like Viral Reels, Cinema Docu, or Podcast Pill. Fine-tune bounce effects, glowing colors, and safe zone boundaries.',
    icon: Palette,
    position: 'bottom',
  },
  {
    id: 'export',
    targetId: 'navbar-quick-export-btn',
    title: 'Export Subtitles & MP4 Video',
    badge: 'One-Click Export',
    description:
      'Download standard SRT / VTT subtitle files for Premiere & Final Cut, or burn subtitles directly into high-definition MP4 videos.',
    icon: Download,
    position: 'bottom',
  },
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStepIndex];
  const totalSteps = TOUR_STEPS.length;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === totalSteps - 1;

  // Update target element bounding rect whenever step changes or window resizes
  useEffect(() => {
    if (!isOpen) return;

    const updateRect = () => {
      if (step.targetId) {
        const el = document.getElementById(step.targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          setTargetRect(el.getBoundingClientRect());
          return;
        }
      }
      setTargetRect(null);
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isOpen, currentStepIndex, step.targetId]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleFinish();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    try {
      localStorage.setItem('subly_onboarding_completed', 'true');
    } catch {}
    onComplete?.();
    onClose();
  };

  if (!isOpen) return null;

  const IconComponent = step.icon;

  return (
    <div
      id="onboarding-tour-overlay"
      className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Spotlight cutout highlight around target element if present */}
      {targetRect && (
        <div
          className="fixed transition-all duration-300 pointer-events-none rounded-2xl ring-4 ring-indigo-500 ring-offset-4 ring-offset-slate-950/80 shadow-[0_0_50px_rgba(99,102,241,0.5)] z-40"
          style={{
            top: `${Math.max(8, targetRect.top - 6)}px`,
            left: `${Math.max(8, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      )}

      {/* Tour Card Box */}
      <div
        id="onboarding-tour-card"
        className="relative z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800 dark:text-zinc-100"
      >
        {/* Top row: badge, step counter, close button */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {step.badge}
            </span>
            <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-zinc-500">
              {currentStepIndex + 1} of {totalSteps}
            </span>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-white transition-colors"
            title="Skip Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Icon & Title */}
        <div className="flex items-start gap-3.5 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {step.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1 leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>

        {/* Step Progress Dots */}
        <div className="flex items-center justify-center gap-1.5 my-4">
          {TOUR_STEPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStepIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStepIndex
                  ? 'w-6 bg-indigo-600 dark:bg-indigo-400'
                  : 'w-1.5 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700'
              }`}
              title={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={handleFinish}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="py-1.5 px-3 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="py-1.5 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/25 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>{isLast ? 'Get Started' : 'Next'}</span>
              {isLast ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
