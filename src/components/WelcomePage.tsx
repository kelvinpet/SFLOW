import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Upload,
  Play,
  Pause,
  Film,
  FolderOpen,
  Clock,
  ArrowRight,
  RotateCcw,
  X,
  Key,
  Keyboard,
  Sun,
  Moon,
  Palette,
  Check,
  Trash2,
  Shield,
  Compass,
  FileVideo,
  Video,
  Layers,
  Wand2,
  HelpCircle,
  Smartphone,
  Tv,
  Zap,
  CheckCircle2,
  Globe,
  FileText,
  Download,
  Sliders,
  Volume2,
  Share2,
  Star,
  Cpu,
  Lock,
  ChevronDown,
  ChevronUp,
  Github,
  PlayCircle,
  Eye,
  Maximize2,
  Activity,
  Type,
  Scissors,
} from 'lucide-react';
import { Caption, SubtitleStyle, PendingSessionRecovery, AccentPaletteId } from '../types';
import { SAMPLE_VIDEOS, SampleVideoItem } from '../data/sampleVideo';
import { PROJECT_TEMPLATES, ProjectTemplate } from '../data/projectTemplates';
import { SUBTITLE_PRESETS } from '../data/presets';
import {
  SavedProject,
  getSavedProjects,
  deleteProject,
} from '../utils/projectManager';
import { ThemePaletteSwitcher } from './ThemePaletteSwitcher';

interface WelcomePageProps {
  onStartNewProject: () => void;
  onUploadVideo: (file: File) => void;
  onSelectSampleVideo: (sample: SampleVideoItem) => void;
  onOpenTranscribe: () => void;
  onOpenTemplate: (template: ProjectTemplate) => void;
  onLoadSavedProject: (project: SavedProject) => void;
  onResumePreviousSession?: () => void;
  onDiscardPreviousSession?: () => void;
  pendingSessionRecovery: PendingSessionRecovery | null;
  hasActiveProject: boolean;
  activeProjectName?: string;
  captionsCount: number;
  onReturnToEditor: () => void;
  themeMode: 'dark' | 'light';
  onToggleThemeMode: () => void;
  accentPalette?: AccentPaletteId;
  onSelectPalette?: (palette: AccentPaletteId) => void;
  onOpenApiKeyModal: () => void;
  onOpenShortcutsModal: () => void;
  onOpenTourModal: () => void;
  hasApiKey: boolean;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({
  onStartNewProject,
  onUploadVideo,
  onSelectSampleVideo,
  onOpenTranscribe,
  onOpenTemplate,
  onLoadSavedProject,
  onResumePreviousSession,
  onDiscardPreviousSession,
  pendingSessionRecovery,
  hasActiveProject,
  activeProjectName,
  captionsCount,
  onReturnToEditor,
  themeMode,
  onToggleThemeMode,
  accentPalette = 'cyber-cyan',
  onSelectPalette,
  onOpenApiKeyModal,
  onOpenShortcutsModal,
  onOpenTourModal,
  hasApiKey,
}) => {
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(() => getSavedProjects());
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interactive Hero Preview Preset Switcher
  const [activeHeroPresetIndex, setActiveHeroPresetIndex] = useState(0);
  const [isPlayingSimulation, setIsPlayingSimulation] = useState(true);
  const [selectedAspect, setSelectedAspect] = useState<'9:16' | '16:9' | '1:1'>('9:16');

  const heroPresets = [
    {
      id: 'viral',
      name: '⚡ Viral Hook',
      category: 'TikTok & Shorts',
      textColor: '#FFFFFF',
      highlightColor: '#FDE047',
      font: 'Montserrat',
      weight: 900,
      badge: 'Trending #1',
      strokeColor: '#000000',
      sampleText: 'CREATE VIRAL CAPTIONS THAT HOOK VIEWERS',
    },
    {
      id: 'beast',
      name: '🟡 Beast Energy',
      category: 'High Retention',
      textColor: '#FEF08A',
      highlightColor: '#22C55E',
      font: 'Impact, Archivo Black',
      weight: 900,
      badge: 'CTR Monster',
      strokeColor: '#000000',
      sampleText: 'INSANE $1,000,000 MYSTERY BOX CHALLENGE',
    },
    {
      id: 'cinematic',
      name: '🎬 Cinematic Doc',
      category: 'Storytelling',
      textColor: '#F8FAFC',
      highlightColor: '#38BDF8',
      font: 'Cinzel, Georgia',
      weight: 700,
      badge: 'Film & Doc',
      strokeColor: 'rgba(0,0,0,0.8)',
      sampleText: 'INTO THE DEEPEST CORRIDORS OF THE UNIVERSE',
    },
    {
      id: 'karaoke',
      name: '🎤 Neon Karaoke',
      category: 'Music & Reels',
      textColor: '#FFFFFF',
      highlightColor: '#EC4899',
      font: 'Poppins',
      weight: 800,
      badge: 'Bouncy Pop',
      strokeColor: '#831843',
      sampleText: 'FEEL THE RHYTHM PULSING THROUGH THE NIGHT',
    },
    {
      id: 'minimal',
      name: '✨ Clean Vlog',
      category: 'Aesthetic & Clean',
      textColor: '#FFFFFF',
      highlightColor: '#A78BFA',
      font: 'Inter, sans-serif',
      weight: 600,
      badge: 'Minimalist',
      strokeColor: 'rgba(0,0,0,0.5)',
      sampleText: 'A quiet morning routine exploring Tokyo city',
    },
  ];

  // Animated Word Cycle in Hero Preview
  const previewWords = [
    { text: 'CREATE', highlight: false, start: '00:01.00', end: '00:01.50' },
    { text: 'VIRAL', highlight: true, start: '00:01.50', end: '00:02.10' },
    { text: 'CAPTIONS', highlight: false, start: '00:02.10', end: '00:02.80' },
    { text: 'THAT', highlight: false, start: '00:02.80', end: '00:03.10' },
    { text: 'HOOK', highlight: true, start: '00:03.10', end: '00:03.80' },
    { text: 'VIEWERS', highlight: false, start: '00:03.80', end: '00:04.50' },
  ];
  const [activeWordIndex, setActiveWordIndex] = useState(1);

  useEffect(() => {
    if (!isPlayingSimulation) return;
    const interval = setInterval(() => {
      setActiveWordIndex((prev) => (prev + 1) % previewWords.length);
    }, 850);
    return () => clearInterval(interval);
  }, [isPlayingSimulation, previewWords.length]);

  // Simulated audio waveform levels for timeline deck
  const waveformHeights = [
    25, 45, 75, 95, 60, 40, 85, 100, 70, 50, 30, 65, 80, 95, 55, 35, 70, 90, 85, 45, 60, 75, 95, 80,
    40, 65, 90, 100, 85, 60, 45, 80, 95, 70, 50, 30, 60, 85, 95, 70, 45, 65, 90, 80, 55, 40, 75, 95,
  ];

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Refresh saved projects on mount
  useEffect(() => {
    setSavedProjects(getSavedProjects());
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadVideo(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      onUploadVideo(file);
    }
  };

  const handleDeleteProject = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete saved project "${name}"?`)) {
      const updated = deleteProject(id);
      setSavedProjects(updated);
    }
  };

  const currentHeroPreset = heroPresets[activeHeroPresetIndex];

  const handleLaunchHeroPreset = () => {
    const template = PROJECT_TEMPLATES[activeHeroPresetIndex] || PROJECT_TEMPLATES[0];
    onOpenTemplate(template);
  };

  const scrollToSection = (id: string) => {
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      id="landing-page-root"
      className="min-h-screen w-full bg-slate-50 dark:bg-[#080B11] text-slate-900 dark:text-zinc-100 transition-colors duration-200 selection:bg-indigo-500 selection:text-white relative overflow-x-hidden"
    >
      {/* Ambient Atmospheric Background Glows for Widescreen */}
      <div className="absolute top-0 left-1/4 w-[700px] h-[500px] bg-indigo-600/10 dark:bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-40 right-10 w-[600px] h-[400px] bg-indigo-400/10 dark:bg-indigo-400/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Hidden File Input for Video Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Sticky Full-Width Navigation Header */}
      <header
        id="landing-header"
        className="sticky top-0 z-50 w-full bg-white/80 dark:bg-[#080B11]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.07] px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 py-3.5 transition-all"
      >
        <div className="w-full max-w-[1920px] mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Studio Name */}
          <div className="flex items-center gap-3">
            <img
              src="/favicon.svg"
              alt="ScribeFlow Logo"
              className="w-9 h-9 rounded-xl border border-indigo-500/30 shadow-xs object-cover"
            />
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                SCRIBE<span className="text-indigo-600 dark:text-indigo-400">FLOW</span>
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-full">
                v2.4 Desktop Pro
              </span>
            </div>
          </div>

          {/* Center Navigation Links (Expanded for Desktop) */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold text-slate-600 dark:text-zinc-400">
            <button
              type="button"
              onClick={() => scrollToSection('studio-preview')}
              className="hover:text-indigo-600 dark:hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              <span>Live Studio</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-indigo-600 dark:hover:text-white transition-colors"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('templates')}
              className="hover:text-indigo-600 dark:hover:text-white transition-colors"
            >
              Creator Styles
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-indigo-600 dark:hover:text-white transition-colors"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="hover:text-indigo-600 dark:hover:text-white transition-colors"
            >
              FAQ
            </button>
          </nav>

          {/* Right Header Navigation & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Tour Button */}
            <button
              type="button"
              id="landing-tour-btn"
              onClick={onOpenTourModal}
              className="hidden md:flex px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium items-center gap-1.5 transition-colors shadow-xs"
              title="Interactive Studio Tour"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-500" />
              <span>Tour</span>
            </button>

            {/* API Key Modal Button */}
            <button
              type="button"
              id="landing-api-key-btn"
              onClick={onOpenApiKeyModal}
              className="hidden sm:flex px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium items-center gap-1.5 transition-colors shadow-xs"
              title="Configure AI API Keys (Groq, Deepgram, Whisper)"
            >
              <Key className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span>API Keys</span>
            </button>

            {/* Theme Mode & Color Palette Switcher */}
            {onSelectPalette ? (
              <ThemePaletteSwitcher
                themeMode={themeMode}
                onToggleThemeMode={onToggleThemeMode}
                accentPalette={accentPalette}
                onSelectPalette={onSelectPalette}
              />
            ) : (
              <button
                type="button"
                id="landing-theme-toggle-btn"
                onClick={onToggleThemeMode}
                className="p-2 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {themeMode === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700" />
                )}
              </button>
            )}

            {/* Main Primary CTA Button */}
            {hasActiveProject ? (
              <button
                type="button"
                id="landing-resume-studio-btn"
                onClick={onReturnToEditor}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <span>Resume Project</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                id="landing-open-studio-header-btn"
                onClick={() => onSelectSampleVideo(SAMPLE_VIDEOS[0])}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <span>Launch Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Full-Width Content Container */}
      <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 py-8 lg:py-12 space-y-16 lg:space-y-24">
        {/* Active Project / Session Draft Recovery Callout (Wide Desktop View) */}
        {hasActiveProject && (
          <div
            id="landing-active-session-card"
            className="w-full p-4 sm:p-6 rounded-2xl bg-indigo-50/90 dark:bg-gradient-to-r dark:from-indigo-950/60 dark:to-zinc-900/80 border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-slate-800 dark:text-zinc-200 shadow-sm animate-in fade-in duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Play className="w-6 h-6 ml-0.5 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                    Active Session in Progress
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-zinc-700 font-semibold">
                    {captionsCount} captions
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {activeProjectName || 'Current Project'}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onReturnToEditor}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <span>Continue in Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {!hasActiveProject && pendingSessionRecovery && (
          <div
            id="landing-recovery-session-card"
            className="w-full p-4 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-zinc-200 shadow-md animate-in fade-in duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-500 dark:text-amber-400">
                    Previous Autosaved Draft Detected
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 font-medium">
                    {pendingSessionRecovery.captionsCount} captions
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">
                  {pendingSessionRecovery.videoName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Last saved at {pendingSessionRecovery.formattedTime}. Resume your edits where you left off?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onResumePreviousSession}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Resume Draft</span>
              </button>
              {onDiscardPreviousSession && (
                <button
                  type="button"
                  onClick={onDiscardPreviousSession}
                  className="px-4 py-2.5 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl text-xs font-medium transition-colors"
                >
                  Discard
                </button>
              )}
            </div>
          </div>
        )}

        {/* EXPANSIVE WIDESCREEN HERO SECTION */}
        <section
          id="hero-section"
          className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center"
        >
          {/* Left Column: Headline, Actions & Key Value Stats (Cols 1-5 or 1-6) */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-6 text-left">
            {/* Top Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold shadow-xs">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <span>Next-Gen In-Browser AI Video Subtitle Studio</span>
            </div>

            {/* Display Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-black tracking-tight text-slate-950 dark:text-white leading-[1.08]">
              Create Viral Captions{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
                That Hook Viewers
              </span>{' '}
              Instantly.
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-300 leading-relaxed max-w-xl">
              Automated AI speech transcription in 90+ languages, animated kinetic word highlights, trending creator styles (Hormozi, MrBeast, Cinematic), dual bilingual subtitles, and 4K video burn-in directly in your browser. Zero subscriptions, 100% private.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                id="hero-launch-free-btn"
                onClick={() => onSelectSampleVideo(SAMPLE_VIDEOS[0])}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Launch Studio Free</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <button
                type="button"
                id="hero-upload-video-btn"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-3.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs active:scale-95 transition-all"
              >
                <Upload className="w-4 h-4 text-indigo-500" />
                <span>Upload Video</span>
              </button>

              <button
                type="button"
                id="hero-ai-transcribe-btn"
                onClick={onOpenTranscribe}
                className="px-4 py-3.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI Transcribe</span>
              </button>
            </div>

            {/* Desktop 2x2 Feature Pillar Matrix (Eliminating Empty Space) */}
            <div className="pt-4 border-t border-slate-200 dark:border-zinc-800/80 grid grid-cols-2 gap-3.5">
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Zero Watermarks</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">100% Free Forever</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">100% In-Browser</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">Total Client Privacy</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Whisper AI Fast</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">90+ Languages</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">4K & Subtitle Files</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">MP4, SRT, VTT, ASS</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: High-Fidelity Interactive Desktop Studio Canvas (Cols 6-12 or 7-12) */}
          <div id="studio-preview" className="lg:col-span-7 xl:col-span-7 w-full">
            <div className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl shadow-indigo-500/10 overflow-hidden flex flex-col">
              {/* Studio Window Chrome Header */}
              <div className="px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <span className="ml-2 font-mono text-[11px] text-zinc-300 font-medium hidden sm:inline">
                    ScribeFlow Studio • Viral_Short_Demo.mp4
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Aspect Ratio Selector */}
                  <div className="flex items-center gap-1 bg-zinc-800 p-0.5 rounded-lg text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setSelectedAspect('9:16')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        selectedAspect === '9:16'
                          ? 'bg-indigo-600 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      9:16
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAspect('16:9')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        selectedAspect === '16:9'
                          ? 'bg-indigo-600 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      16:9
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAspect('1:1')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        selectedAspect === '1:1'
                          ? 'bg-indigo-600 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      1:1
                    </button>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold font-mono">
                    60 FPS 4K
                  </span>
                </div>
              </div>

              {/* Studio Main Workspace: Side-by-Side Video & Style Controls */}
              <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 bg-zinc-950 items-center">
                {/* Simulated Video Canvas Frame (Left on wide screens: 7 cols) */}
                <div className="md:col-span-7 flex flex-col items-center justify-center">
                  <div
                    className={`relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950/70 to-zinc-950 border border-zinc-800 shadow-xl flex flex-col justify-between p-4 text-white transition-all ${
                      selectedAspect === '9:16'
                        ? 'aspect-[9/14] max-w-[290px] sm:max-w-[320px]'
                        : selectedAspect === '16:9'
                        ? 'aspect-[16/10] max-w-full'
                        : 'aspect-square max-w-[320px]'
                    }`}
                  >
                    {/* Atmospheric Glow */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(99,102,241,0.3),transparent_70%)] pointer-events-none" />

                    {/* Top Canvas Bar */}
                    <div className="relative z-10 flex items-center justify-between text-[11px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-zinc-300">
                        {selectedAspect} Safe Zone
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                        {currentHeroPreset.badge}
                      </span>
                    </div>

                    {/* Center Animated Kinetic Caption */}
                    <div className="relative z-10 text-center my-auto px-2">
                      <div className="p-3.5 rounded-xl bg-black/40 backdrop-blur-xs border border-white/5 inline-block max-w-full">
                        <div
                          className="text-lg sm:text-2xl font-black tracking-tight uppercase flex flex-wrap items-center justify-center gap-2 drop-shadow-md"
                          style={{
                            fontFamily: currentHeroPreset.font,
                          }}
                        >
                          {previewWords.map((word, idx) => {
                            const isCurrentActive = idx === activeWordIndex;
                            return (
                              <span
                                key={idx}
                                className={`transition-all duration-150 transform ${
                                  isCurrentActive
                                    ? 'scale-115 font-black drop-shadow-[0_0_12px_rgba(253,224,71,0.7)]'
                                    : 'opacity-85'
                                }`}
                                style={{
                                  color: isCurrentActive
                                    ? currentHeroPreset.highlightColor
                                    : currentHeroPreset.textColor,
                                }}
                              >
                                {word.text}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Canvas Status */}
                    <div className="relative z-10 flex items-center justify-between text-[11px] text-zinc-400">
                      <button
                        type="button"
                        onClick={() => setIsPlayingSimulation(!isPlayingSimulation)}
                        className="flex items-center gap-1.5 text-white hover:text-indigo-400 transition-colors"
                      >
                        {isPlayingSimulation ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            <span className="text-[10px] font-bold">PAUSE</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span className="text-[10px] font-bold">PLAY</span>
                          </>
                        )}
                      </button>
                      <span className="font-mono text-[10px] text-zinc-400">
                        {previewWords[activeWordIndex].start}s
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Interactive Inspector & Style Switcher (Right on wide screens: 5 cols) */}
                <div className="md:col-span-5 space-y-3.5 text-left">
                  <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-indigo-400" />
                        Preset Style
                      </span>
                      <span className="text-[11px] text-indigo-400 font-bold">
                        {currentHeroPreset.name}
                      </span>
                    </div>

                    {/* Presets Button Switcher */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {heroPresets.map((preset, idx) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setActiveHeroPresetIndex(idx)}
                          className={`p-2 rounded-lg text-left text-xs font-bold transition-all flex flex-col justify-between ${
                            activeHeroPresetIndex === idx
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800'
                          }`}
                        >
                          <span className="truncate">{preset.name}</span>
                          <span className="text-[9px] opacity-75 font-normal">{preset.category}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Style Specifications Deck */}
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span>Typography:</span>
                      <span className="font-mono text-zinc-200 font-semibold">{currentHeroPreset.font}</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span>Kinetic Effect:</span>
                      <span className="text-amber-400 font-semibold">Word Bounce + Glow</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span>Active Color:</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20"
                          style={{ backgroundColor: currentHeroPreset.highlightColor }}
                        />
                        <span className="font-mono text-zinc-200">{currentHeroPreset.highlightColor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  <button
                    type="button"
                    onClick={handleLaunchHeroPreset}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <span>Edit with this Style in Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom Interactive Multi-Track Timeline Preview (Spans entire width) */}
              <div className="px-4 py-3 bg-zinc-900/90 border-t border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300 font-bold flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-indigo-400" />
                      Timeline Track
                    </span>
                    <span>• 00:0{activeWordIndex + 1}.240 / 00:15.000</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-indigo-400 font-semibold">Snapping: Active</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">Audio Waveform Synced</span>
                  </div>
                </div>

                {/* Simulated Audio Waveform Bar Chart */}
                <div className="h-6 w-full flex items-end gap-1 px-1 bg-zinc-950/80 rounded-md border border-zinc-800/80 overflow-hidden">
                  {waveformHeights.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-xs transition-all duration-200"
                      style={{
                        height: `${h}%`,
                        backgroundColor:
                          i >= activeWordIndex * 8 && i <= (activeWordIndex + 1) * 8
                            ? currentHeroPreset.highlightColor
                            : '#3F3F46',
                      }}
                    />
                  ))}
                </div>

                {/* Subtitle Cue Pills on Timeline */}
                <div className="grid grid-cols-6 gap-1 pt-0.5">
                  {previewWords.map((word, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveWordIndex(i)}
                      className={`cursor-pointer px-1 py-1 rounded text-center text-[9px] font-mono font-bold truncate transition-all ${
                        activeWordIndex === i
                          ? 'bg-indigo-600 text-white ring-1 ring-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {word.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WIDESCREEN 3-COLUMN QUICK-START DECK */}
        <section id="upload-section" className="space-y-4">
          <div className="text-left space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Instant Workflow Quick-Start
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
              Pick your preferred starting point. Everything runs securely on your machine with zero server upload.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Drag & Drop Video */}
            <div
              id="landing-card-upload-video"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer p-6 sm:p-8 rounded-2xl border-2 border-dashed flex flex-col justify-between space-y-4 transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                  : 'border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-indigo-400 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900/80 shadow-xs'
              }`}
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Drop Your Own Video
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Supports MP4, WebM, MOV, and MKV. Processed natively via WebCodecs with zero file size limits.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <span>Browse Files</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 2: AI Speech Auto-Transcription */}
            <div
              onClick={onOpenTranscribe}
              className="cursor-pointer p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-indigo-400 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900/80 transition-all flex flex-col justify-between space-y-4 shadow-xs"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3 shadow-xs">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  AI Auto-Transcribe Audio
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Extract audio and automatically generate timestamped word captions using Whisper, Groq, or Deepgram.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
                <span>Start AI Transcription</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 3: Instant Demo Reel */}
            <div
              onClick={() => onSelectSampleVideo(SAMPLE_VIDEOS[0])}
              className="cursor-pointer p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-indigo-400 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900/80 transition-all flex flex-col justify-between space-y-4 shadow-xs"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 shadow-xs">
                  <Play className="w-6 h-6 fill-current" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Try Built-In Demo Reel
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  No video on hand? Test the full studio instantly with our sample tech reel and pre-timed captions.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span>Launch Demo Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </section>

        {/* WIDESCREEN 6-COLUMN FEATURES GRID */}
        <section id="features" className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                Comprehensive Suite
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
                Everything Creators Need for Viral Video Retention
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Zero watermarks • In-Browser Acceleration • 90+ Languages
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-5">
            {/* Feature 1 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 space-y-3 hover:border-indigo-400 dark:hover:border-zinc-700 transition-all shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Whisper AI Speech
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Word-level timestamps in 90+ languages powered by Groq, Deepgram, and OpenAI.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 space-y-3 hover:border-indigo-400 dark:hover:border-zinc-700 transition-all shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Kinetic Bounces
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Dynamic active word scaling, spring bounces, and glowing pills for watch time.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 space-y-3 hover:border-indigo-400 dark:hover:border-zinc-700 transition-all shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Dual Bilingual
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Display source captions and translated secondary subtitles simultaneously.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 space-y-3 hover:border-indigo-400 dark:hover:border-zinc-700 transition-all shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Waveform Timeline
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Zoomable audio waveform with speech snapping, split/merge, and nudge offsets.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 space-y-3 hover:border-indigo-400 dark:hover:border-zinc-700 transition-all shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                In-Browser 4K Render
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Export hardcoded MP4 directly in your browser using hardware WebCodecs.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 space-y-3 hover:border-indigo-400 dark:hover:border-zinc-700 transition-all shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Universal Formats
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Export SRT, VTT, ASS, TXT, and JSON for Premiere, DaVinci, or YouTube.
              </p>
            </div>
          </div>
        </section>

        {/* WIDESCREEN CREATOR STYLES & TEMPLATES */}
        <section id="templates" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                Trending Presets
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
                Viral Social Media Caption Styles
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
                Proven typography and color palettes tailored for TikTok, Reels, Shorts, Podcasts, and Cinema.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectSampleVideo(SAMPLE_VIDEOS[0])}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Explore All Styles in Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
            {PROJECT_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => onOpenTemplate(tmpl)}
                className="group cursor-pointer p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4 text-left shadow-xs hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                      {tmpl.badge}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 flex items-center gap-1 font-semibold">
                      {tmpl.aspect === '9:16' ? <Smartphone className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                      {tmpl.aspect}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {tmpl.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mt-1">
                    {tmpl.tagline}
                  </p>
                </div>

                {/* Styled Specimen Card */}
                <div className="py-4 px-3 rounded-xl bg-zinc-950 text-white text-center text-sm font-black tracking-wide border border-zinc-800/80 shadow-inner">
                  <span
                    style={{
                      fontFamily: tmpl.style.fontFamily,
                      color: tmpl.style.textColor,
                      textTransform: tmpl.style.textTransform,
                    }}
                  >
                    {tmpl.name.split(' ')[0]}{' '}
                    <span style={{ color: tmpl.style.activeWordColor }}>
                      {tmpl.name.split(' ')[1] || 'STYLE'}
                    </span>
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-white transition-colors">
                  <span>Open Style in Studio</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3-STEP WORKFLOW */}
        <section id="how-it-works" className="space-y-8">
          <div className="text-left space-y-1">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Simple Workflow
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              From Raw Video to Viral Captions in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 space-y-3 relative shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Upload or Drop Video
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Import any MP4, WebM, or MOV video, or pick from our built-in creator test clips. Your files stay strictly in your browser.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 space-y-3 relative shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Transcribe & Pick Style
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Run AI Whisper auto-transcription for instant word timestamps. Select a trending preset (Hormozi, MrBeast, Karaoke) or customize typography.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 space-y-3 relative shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Burn-In or Export SRT
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Preview your export, burn subtitles directly into 1080p/4K MP4 with zero watermark, or download clean SRT, VTT, or ASS files.
              </p>
            </div>
          </div>
        </section>

        {/* SAVED RECENT PROJECTS (if any exist) */}
        {savedProjects.length > 0 && (
          <section id="saved-projects" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-300">
                  Your Saved Projects ({savedProjects.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Continue editing saved drafts stored locally in your browser.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {savedProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => onLoadSavedProject(proj)}
                  className="group cursor-pointer p-4 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-zinc-700 transition-all text-left flex flex-col justify-between space-y-3 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium border border-slate-200 dark:border-zinc-700">
                        {proj.captionsCount} cues
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteProject(proj.id, proj.name, e)}
                        className="p-1 text-slate-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 rounded transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {proj.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                      {proj.videoName || 'Project Video'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-400 dark:text-zinc-400">
                    <span className="text-[11px]">
                      {new Date(proj.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      Open Project
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* WIDESCREEN 2-COLUMN FAQ */}
        <section id="faq" className="space-y-6">
          <div className="text-left space-y-1">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Answers & Technical Details
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              {
                q: 'Is ScribeFlow completely free to use?',
                a: 'Yes! ScribeFlow is 100% free and open-source. There are no paywalls, subscriptions, or watermarks added to exported videos.',
              },
              {
                q: 'Is my video uploaded to any cloud server?',
                a: 'No. Video decoding, playback, subtitle rendering, and MP4 burn-in all execute 100% locally inside your browser using WebCodecs. If you choose to use AI Auto-Transcription, only the extracted audio snippet is sent to your selected transcription provider (Groq, Deepgram, or OpenAI) using your own API key.',
              },
              {
                q: 'Can I export subtitle files without burning them into the video?',
                a: 'Absolutely! You can export clean SRT, VTT, ASS, TXT, or JSON subtitle files anytime to use in Adobe Premiere Pro, DaVinci Resolve, Final Cut Pro, or directly in YouTube Studio.',
              },
              {
                q: 'What video aspect ratios and formats are supported?',
                a: 'ScribeFlow natively handles 9:16 vertical (Shorts/TikTok/Reels), 16:9 widescreen (YouTube), 1:1 square (Instagram), and 4:5 portrait. You can export up to 4K 60fps depending on your hardware.',
              },
            ].map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 font-bold text-sm sm:text-base text-slate-900 dark:text-white"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-indigo-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed border-t border-slate-100 dark:border-zinc-800/60 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* WIDESCREEN BOTTOM CTA BANNER */}
        <section
          id="bottom-cta"
          className="w-full rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-8 sm:p-14 text-center text-white space-y-6 shadow-xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />
          <div className="relative z-10 max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Ready to Upgrade Your Video Content?
            </h2>
            <p className="text-sm sm:text-base text-indigo-100 leading-relaxed">
              Launch the studio now and craft engaging, high-retention subtitles in seconds. Completely free with zero watermark.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={() => onSelectSampleVideo(SAMPLE_VIDEOS[0])}
              className="px-7 py-4 bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-indigo-600" />
              <span>Launch Studio Free</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-4 bg-indigo-500/40 hover:bg-indigo-500/60 text-white border border-white/20 rounded-xl text-sm font-bold flex items-center gap-2 backdrop-blur-md active:scale-95 transition-all"
            >
              <Upload className="w-4 h-4 text-white" />
              <span>Upload Video File</span>
            </button>
          </div>
        </section>

        {/* FULL-WIDTH FOOTER */}
        <footer
          id="landing-footer"
          className="pt-10 pb-6 border-t border-slate-200 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-zinc-500"
        >
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="ScribeFlow" className="w-5 h-5 rounded" />
            <span className="font-bold text-slate-700 dark:text-zinc-300">ScribeFlow</span>
            <span>•</span>
            <span>Client-Side AI Video Caption Studio</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/kelvinpet/SFLOW"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub Repository</span>
            </a>
            <span>•</span>
            <button
              type="button"
              onClick={onOpenShortcutsModal}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Keyboard Shortcuts
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};
