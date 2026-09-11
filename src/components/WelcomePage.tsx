import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Upload,
  Play,
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
} from 'lucide-react';
import { Caption, SubtitleStyle, PendingSessionRecovery } from '../types';
import { SAMPLE_VIDEOS, SampleVideoItem } from '../data/sampleVideo';
import { PROJECT_TEMPLATES, ProjectTemplate } from '../data/projectTemplates';
import { SUBTITLE_PRESETS } from '../data/presets';
import {
  SavedProject,
  getSavedProjects,
  deleteProject,
} from '../utils/projectManager';

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
  const heroPresets = [
    {
      id: 'viral',
      name: '⚡ Viral Hook',
      textColor: '#FFFFFF',
      highlightColor: '#FDE047',
      font: 'Montserrat',
      weight: 900,
      badge: 'TikTok Trending',
      styleIndex: 0,
    },
    {
      id: 'beast',
      name: '🟡 Beast Energy',
      textColor: '#FEF08A',
      highlightColor: '#22C55E',
      font: 'Impact, Archivo Black',
      weight: 900,
      badge: 'High CTR',
      styleIndex: 1,
    },
    {
      id: 'cinematic',
      name: '🎬 Cinematic',
      textColor: '#F8FAFC',
      highlightColor: '#38BDF8',
      font: 'Cinzel, Georgia',
      weight: 700,
      badge: 'Film & Doc',
      styleIndex: 4,
    },
    {
      id: 'karaoke',
      name: '🎤 Neon Karaoke',
      textColor: '#FFFFFF',
      highlightColor: '#EC4899',
      font: 'Poppins',
      weight: 800,
      badge: 'Bouncy Pop',
      styleIndex: 2,
    },
    {
      id: 'minimal',
      name: '✨ Clean Vlog',
      textColor: '#FFFFFF',
      highlightColor: '#A78BFA',
      font: 'Inter, sans-serif',
      weight: 600,
      badge: 'Minimalist',
      styleIndex: 3,
    },
  ];

  // Animated Word Cycle in Hero Preview
  const previewWords = [
    { text: 'CREATE', highlight: false },
    { text: 'VIRAL', highlight: true },
    { text: 'CAPTIONS', highlight: false },
    { text: 'THAT', highlight: false },
    { text: 'HOOK', highlight: true },
    { text: 'VIEWERS', highlight: false },
  ];
  const [activeWordIndex, setActiveWordIndex] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWordIndex((prev) => (prev + 1) % previewWords.length);
    }, 900);
    return () => clearInterval(interval);
  }, [previewWords.length]);

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
      className="min-h-screen bg-slate-50 dark:bg-[#0B0D12] text-slate-900 dark:text-zinc-100 transition-colors duration-200 selection:bg-indigo-500 selection:text-white"
    >
      {/* Hidden File Input for Video Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Sticky Navigation Header */}
      <header
        id="landing-header"
        className="sticky top-0 z-40 w-full bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl border-b border-slate-200 dark:border-white/[0.08] px-4 sm:px-8 py-3.5 transition-all"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Studio Name */}
          <div className="flex items-center gap-3">
            <img
              src="/favicon.svg"
              alt="ScribeFlow Logo"
              className="w-9 h-9 rounded-xl border border-indigo-500/30 shadow-xs object-cover"
            />
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                SCRIBE<span className="text-indigo-600 dark:text-indigo-400">FLOW</span>
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-full">
                v2.4 Pro
              </span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-zinc-400">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-indigo-600 dark:hover:text-white transition-colors"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('live-demo')}
              className="hover:text-indigo-600 dark:hover:text-white transition-colors"
            >
              Interactive Preview
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
              className="hidden md:flex p-2 sm:px-2.5 sm:py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium items-center gap-1.5 transition-colors shadow-xs"
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
              className="hidden sm:flex p-2 sm:px-2.5 sm:py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium items-center gap-1.5 transition-colors shadow-xs"
              title="Configure AI API Keys (Groq, Deepgram, Whisper)"
            >
              <Key className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span>API Keys</span>
            </button>

            {/* Theme Toggle Button */}
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

            {/* Main Primary CTA Button */}
            {hasActiveProject ? (
              <button
                type="button"
                id="landing-resume-studio-btn"
                onClick={onReturnToEditor}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <span>Resume Project</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                id="landing-open-studio-header-btn"
                onClick={() => onSelectSampleVideo(SAMPLE_VIDEOS[0])}
                className="px-3.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <span>Launch Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Landing Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-20 sm:space-y-28">
        {/* Active Project / Session Draft Recovery Callout (if active project or saved recovery exists) */}
        {hasActiveProject && (
          <div
            id="landing-active-session-card"
            className="p-4 sm:p-5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-slate-800 dark:text-zinc-200 shadow-sm animate-in fade-in duration-300"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Play className="w-5 h-5 ml-0.5 fill-white" />
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
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {activeProjectName || 'Current Project'}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onReturnToEditor}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs self-end sm:self-auto active:scale-95"
            >
              <span>Continue in Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {!hasActiveProject && pendingSessionRecovery && (
          <div
            id="landing-recovery-session-card"
            className="p-4 sm:p-5 rounded-2xl bg-slate-900 dark:bg-zinc-900 border border-slate-800 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-zinc-200 shadow-md animate-in fade-in duration-300"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400">
                    Previous Autosaved Draft Detected
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {pendingSessionRecovery.captionsCount} captions
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white mt-0.5">
                  {pendingSessionRecovery.videoName}
                </h3>
                <p className="text-xs text-zinc-400">
                  Last saved at {pendingSessionRecovery.formattedTime}. Resume your edits?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={onResumePreviousSession}
                className="px-4 py-2 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resume Draft</span>
              </button>
              {onDiscardPreviousSession && (
                <button
                  type="button"
                  onClick={onDiscardPreviousSession}
                  className="px-3 py-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl text-xs font-medium transition-colors"
                >
                  Discard
                </button>
              )}
            </div>
          </div>
        )}

        {/* HERO SECTION: Value Proposition & Interactive Mockup */}
        <section id="hero-section" className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Headline & Action Buttons (Cols 1-7) */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Top Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 text-xs font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <span>Free Next-Gen Subtitle & Caption Studio</span>
            </div>

            {/* Display Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.1]">
              Create Viral Captions{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
                That Hook Viewers
              </span>{' '}
              Instantly.
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-300 max-w-2xl leading-relaxed">
              Automated AI speech transcription in 90+ languages, animated kinetic word highlights, trending creator styles (Hormozi, MrBeast, Cinematic), dual bilingual subtitles, and 4K video burn-in directly in your browser.
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
                <span>Upload Your Video</span>
              </button>

              <button
                type="button"
                id="hero-ai-transcribe-btn"
                onClick={onOpenTranscribe}
                className="px-4 py-3.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI Auto-Transcribe</span>
              </button>
            </div>

            {/* Trust Badges / Key Value Pillars */}
            <div className="pt-4 border-t border-slate-200 dark:border-zinc-800/80 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                No Watermarks, Ever
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-indigo-500 shrink-0" />
                100% Private (Runs In-Browser)
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                Zero Sign-Up Required
              </span>
              <span className="flex items-center gap-1.5">
                <Download className="w-4 h-4 text-sky-500 shrink-0" />
                Export 4K/1080p & SRT
              </span>
            </div>
          </div>

          {/* Right Column: Interactive Phone Mockup with Kinetic Animated Captions (Cols 8-12) */}
          <div id="live-demo" className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-[320px] sm:max-w-[340px] rounded-3xl bg-zinc-950 p-3 shadow-2xl border-4 border-zinc-800 shadow-indigo-500/10">
              {/* Dynamic Island / Top Phone Notch */}
              <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4 bg-zinc-900 rounded-full z-20 flex items-center justify-center gap-1">
                <div className="w-2 h-2 rounded-full bg-zinc-800" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-950" />
              </div>

              {/* Video Player Mockup Container (9:16 Vertical) */}
              <div className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950/80 to-zinc-950 flex flex-col justify-between p-4 text-white">
                {/* Simulated Ambient Lighting & Video Grain */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(99,102,241,0.25),transparent_70%)] pointer-events-none" />

                {/* Top Overlay Controls */}
                <div className="relative z-10 flex items-center justify-between pt-5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/60 backdrop-blur-md border border-white/10 text-zinc-300">
                    9:16 Shorts
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    {currentHeroPreset.badge}
                  </span>
                </div>

                {/* Center Animated Creator Subtitle Simulation */}
                <div className="relative z-10 text-center my-auto px-2">
                  <div className="p-3 rounded-xl bg-black/40 backdrop-blur-xs border border-white/5 inline-block max-w-full">
                    <div
                      className="text-xl sm:text-2xl font-black tracking-tight uppercase flex flex-wrap items-center justify-center gap-2 drop-shadow-md"
                      style={{
                        fontFamily: currentHeroPreset.font,
                      }}
                    >
                      {previewWords.map((word, idx) => {
                        const isCurrentActive = idx === activeWordIndex;
                        return (
                          <span
                            key={idx}
                            className={`transition-all duration-200 transform ${
                              isCurrentActive
                                ? 'scale-115 font-black drop-shadow-[0_0_12px_rgba(253,224,71,0.6)]'
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

                {/* Bottom Video Metadata */}
                <div className="relative z-10 flex items-center justify-between text-[11px] text-zinc-400 pb-1">
                  <div className="flex items-center gap-1.5 font-medium text-white">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span>Live Kinetic Subtitle Preview</span>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-400">1080×1920</span>
                </div>
              </div>

              {/* Style Presets Selector Under Phone Mockup */}
              <div className="mt-3 p-2 bg-zinc-900/90 rounded-xl border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 px-1">
                  <span>Switch Preset:</span>
                  <span className="text-indigo-400 font-medium">{currentHeroPreset.name}</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {heroPresets.map((preset, idx) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setActiveHeroPresetIndex(idx)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold text-center transition-all ${
                        activeHeroPresetIndex === idx
                          ? 'bg-indigo-600 text-white shadow-xs scale-102'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                      title={preset.name}
                    >
                      {preset.id.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action: Open in Studio with Selected Preset */}
              <button
                type="button"
                onClick={handleLaunchHeroPreset}
                className="mt-2 w-full py-2 bg-white hover:bg-zinc-100 text-zinc-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Edit with this Style in Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* DRAG & DROP QUICK START SECTION */}
        <section id="upload-section" className="space-y-4">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Start with Your Own Video
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
              Drop any video file to start editing immediately. Your media stays 100% private in your browser.
            </p>
          </div>

          <div
            id="landing-card-upload-video"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                : 'border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-indigo-400 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900/70 shadow-xs'
            }`}
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-zinc-800 border border-indigo-200 dark:border-zinc-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-xs">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Drop your video here, or click to browse files
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
              Supports MP4, WebM, MOV, and MKV. Zero file size limitations, rendered natively via WebCodecs.
            </p>

            <div
              className="mt-6 flex flex-wrap items-center justify-center gap-2.5 pt-5 border-t border-slate-100 dark:border-zinc-800/80"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Select Video</span>
              </button>

              <button
                type="button"
                onClick={onOpenTranscribe}
                className="px-3.5 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>AI Auto-Transcribe</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectSampleVideo(SAMPLE_VIDEOS[0])}
                className="px-3.5 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Try Demo Video</span>
              </button>

              <button
                type="button"
                onClick={onStartNewProject}
                className="px-3.5 py-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5 inline mr-1" />
                <span>Blank Workspace</span>
              </button>
            </div>
          </div>
        </section>

        {/* FEATURES GRID: Professional Studio Tools */}
        <section id="features" className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Full-Featured Studio
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Everything Creators Need for Viral Video Retention
            </h2>
            <p className="text-sm text-slate-600 dark:text-zinc-400">
              Built from the ground up for modern creators, short-form editors, podcasters, and global storytellers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Whisper AI */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 space-y-3 hover:border-indigo-400 dark:hover:border-zinc-700 transition-all shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Whisper AI Auto-Transcription
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Timestamped word-level speech recognition in 90+ languages. Fast cloud transcription powered by Groq, Deepgram, and OpenAI Whisper.
              </p>
            </div>

            {/* Feature 2: Kinetic Animations */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 space-y-3 hover:border-indigo-400 dark:hover:border-zinc-700 transition-all shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Kinetic Word-by-Word Bounces
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Engage viewers with active word scaling, spring bounces, vibrant highlight pills, glow effects, and auto-chunking (1-3 words per cue).
              </p>
            </div>

            {/* Feature 3: Dual Bilingual Subtitles */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 space-y-3 hover:border-indigo-400 dark:hover:border-zinc-700 transition-all shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Bilingual Dual Subtitles
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Display source audio captions and translated secondary subtitles simultaneously—perfect for international audiences and educational videos.
              </p>
            </div>

            {/* Feature 4: Timeline & Audio Waveform */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 space-y-3 hover:border-indigo-400 dark:hover:border-zinc-700 transition-all shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Multi-Track Audio Waveform
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Zoomable interactive audio timeline with speech peak snapping, split/merge cues, nudge offsets, and drag-and-drop cue adjustments.
              </p>
            </div>

            {/* Feature 5: In-Browser 4K Video Burn-In */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 space-y-3 hover:border-indigo-400 dark:hover:border-zinc-700 transition-all shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                In-Browser 4K Video Burn-In
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Export high-definition MP4 & WebM with hardcoded subtitles directly on your device using WebCodecs and canvas hardware acceleration.
              </p>
            </div>

            {/* Feature 6: Multi-Format Export */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 space-y-3 hover:border-indigo-400 dark:hover:border-zinc-700 transition-all shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Universal Subtitle Formats
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Export industry standard formats: SRT, VTT, ASS, TXT, and JSON for Premiere Pro, DaVinci Resolve, Final Cut Pro, or direct YouTube upload.
              </p>
            </div>
          </div>
        </section>

        {/* CREATOR STYLES & TEMPLATES GALLERY */}
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
                Tested layouts optimized for TikTok, Reels, Shorts, Podcasts, and Cinema.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectSampleVideo(SAMPLE_VIDEOS[0])}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Explore All in Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* HOW IT WORKS: 3 Simple Steps */}
        <section id="how-it-works" className="space-y-10 py-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Simple Workflow
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              From Video to Viral Captions in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 space-y-3 relative shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Upload or Drop Video
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Import any MP4, WebM, or MOV video, or pick from our built-in creator test clips. Your files never leave your device.
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
                  Your Recent Projects ({savedProjects.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Continue editing saved drafts stored locally in your browser.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

        {/* FREQUENTLY ASKED QUESTIONS (FAQ) */}
        <section id="faq" className="space-y-8 max-w-3xl mx-auto">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Answers
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'Is ScribeFlow completely free to use?',
                a: 'Yes! ScribeFlow is 100% free and open-source. There are no paywalls, subscriptions, or watermarks added to exported videos.',
              },
              {
                q: 'Is my video uploaded to any server or third party?',
                a: 'No. Video decoding, playback, subtitle rendering, and MP4 burn-in all execute 100% locally inside your browser using WebCodecs. If you choose to use AI Auto-Transcription, only the extracted audio snippet is sent to the transcription provider (Groq, Deepgram, or OpenAI) using your own API key.',
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

        {/* BOTTOM CALL TO ACTION BANNER */}
        <section
          id="bottom-cta"
          className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-8 sm:p-12 text-center text-white space-y-6 shadow-xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Ready to Upgrade Your Video Content?
            </h2>
            <p className="text-sm sm:text-base text-indigo-100 leading-relaxed">
              Launch the studio now and craft engaging, high-retention subtitles in seconds.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onSelectSampleVideo(SAMPLE_VIDEOS[0])}
              className="px-6 py-3.5 bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-indigo-600" />
              <span>Launch Studio Free</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-3.5 bg-indigo-500/40 hover:bg-indigo-500/60 text-white border border-white/20 rounded-xl text-sm font-bold flex items-center gap-2 backdrop-blur-md active:scale-95 transition-all"
            >
              <Upload className="w-4 h-4 text-white" />
              <span>Upload Video File</span>
            </button>
          </div>
        </section>

        {/* FOOTER */}
        <footer
          id="landing-footer"
          className="pt-10 border-t border-slate-200 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-zinc-500"
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
