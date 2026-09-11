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
} from 'lucide-react';
import { Caption, SubtitleStyle, PendingSessionRecovery } from '../types';
import { SAMPLE_VIDEOS, SampleVideoItem } from '../data/sampleVideo';
import { PROJECT_TEMPLATES, ProjectTemplate } from '../data/projectTemplates';
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

  // Refresh saved projects on mount or focus
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

  return (
    <div
      id="welcome-page-root"
      className="min-h-screen bg-slate-50 dark:bg-[#0B0D12] text-slate-900 dark:text-zinc-100 transition-colors duration-200"
    >
      {/* Hidden File Input for Video Selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Welcome Header Navigation */}
      <header
        id="welcome-header"
        className="sticky top-0 z-30 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/[0.08] px-4 sm:px-8 py-3.5"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Studio Name */}
          <div className="flex items-center gap-3">
            <img
              src="/favicon.svg"
              alt="SCRIBEFLOW Logo"
              className="w-9 h-9 rounded-xl border border-indigo-500/30 shadow-sm object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  SCRIBE<span className="text-indigo-600 dark:text-indigo-400">FLOW</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-full">
                  AI Caption Studio
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Navigation & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* If there is already an active project loaded, offer immediate jump back */}
            {hasActiveProject && (
              <button
                type="button"
                id="welcome-return-to-editor-btn"
                onClick={onReturnToEditor}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                title="Return to the active editor workspace"
              >
                <span>Resume Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Tour Button */}
            <button
              type="button"
              id="welcome-tour-btn"
              onClick={onOpenTourModal}
              className="p-2 sm:px-2.5 sm:py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
              title="Interactive Studio Tour"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden md:inline">Tour</span>
            </button>

            {/* API Key Modal Button */}
            <button
              type="button"
              id="welcome-api-key-btn"
              onClick={onOpenApiKeyModal}
              className="p-2 sm:px-2.5 sm:py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
              title="Configure OpenAI / Groq / Deepgram API Keys"
            >
              <Key className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* Keyboard Shortcuts Button */}
            <button
              type="button"
              id="welcome-shortcuts-btn"
              onClick={onOpenShortcutsModal}
              className="p-2 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title="Keyboard Shortcuts"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              id="welcome-theme-toggle-btn"
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
          </div>
        </div>
      </header>

      {/* Main Welcome Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Active Session / Draft Recovery Callout */}
        {hasActiveProject && (
          <div
            id="welcome-active-session-card"
            className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-zinc-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center shrink-0">
                <Play className="w-4 h-4 ml-0.5 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-400">
                    Active Workspace
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {captionsCount} captions
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white mt-0.5">
                  {activeProjectName || 'Current Project'}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onReturnToEditor}
              className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors self-end sm:self-auto"
            >
              <span>Continue Editing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* If an autosaved previous session was detected (and no active project currently loaded) */}
        {!hasActiveProject && pendingSessionRecovery && (
          <div
            id="welcome-recovery-session-card"
            className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-zinc-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-400">
                    Previous Project Detected
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {pendingSessionRecovery.captionsCount} captions
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white mt-0.5">
                  {pendingSessionRecovery.videoName}
                </h3>
                <p className="text-xs text-zinc-400">
                  Last saved at {pendingSessionRecovery.formattedTime}. Resume where you left off?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={onResumePreviousSession}
                className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resume Draft</span>
              </button>
              {onDiscardPreviousSession && (
                <button
                  type="button"
                  onClick={onDiscardPreviousSession}
                  className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg text-xs font-medium transition-colors"
                >
                  Discard
                </button>
              )}
            </div>
          </div>
        )}

        {/* Hero Section & Primary Drop Zone */}
        <section id="welcome-hero-intro" className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Video Subtitle & Caption Studio
          </h2>
          <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
            Generate synchronized word-timed captions, style high-retention social reels, or export standard subtitle formats.
          </p>
        </section>

        {/* Unified Primary Dropzone Card */}
        <section id="welcome-dropzone-section">
          <div
            id="welcome-card-upload-video"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-400 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/70'
            }`}
          >
            <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 mb-4">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Drop your video here, or click to browse
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Supports MP4, WebM, MOV, and MKV
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 pt-5 border-t border-slate-100 dark:border-zinc-800/80" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                id="welcome-card-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-opacity"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Browse Video</span>
              </button>

              <button
                type="button"
                id="welcome-card-ai-transcribe"
                onClick={onOpenTranscribe}
                className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI Auto-Transcribe</span>
              </button>

              <button
                type="button"
                id="welcome-card-sample-demo"
                onClick={() => onSelectSampleVideo(SAMPLE_VIDEOS[0])}
                className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Demo Video</span>
              </button>

              <button
                type="button"
                id="welcome-card-new-project"
                onClick={onStartNewProject}
                className="px-3.5 py-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5 inline mr-1" />
                <span>Blank Canvas</span>
              </button>
            </div>
          </div>
        </section>

        {/* Quick Start Project Templates Gallery */}
        <section id="welcome-templates-section" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-300">
                Preset Caption Styles
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Pre-configured typography and animations for social feeds.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PROJECT_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => onOpenTemplate(tmpl)}
                className="group cursor-pointer p-4 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all flex flex-col justify-between space-y-3 text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                      {tmpl.badge}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-400 flex items-center gap-1">
                      {tmpl.aspect === '9:16' ? <Smartphone className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                      {tmpl.aspect}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-400 transition-colors">
                    {tmpl.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                    {tmpl.tagline}
                  </p>
                </div>

                {/* Refined Style Specimen Preview */}
                <div className="py-2.5 px-3 rounded-lg bg-zinc-950 text-white text-center text-xs font-bold tracking-wide border border-zinc-800/80">
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

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-zinc-400 group-hover:text-white transition-colors">
                  <span>Use Template</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Saved Projects Library (if any exist) */}
        {savedProjects.length > 0 && (
          <section id="welcome-saved-projects-section" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-300">
                  Recent Projects ({savedProjects.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Continue editing saved drafts stored locally.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => onLoadSavedProject(proj)}
                  className="group cursor-pointer p-4 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all text-left flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium border border-zinc-200 dark:border-zinc-700">
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
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-400 transition-colors">
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
                    <span className="font-medium text-slate-700 dark:text-zinc-300 group-hover:text-white flex items-center gap-1 transition-colors">
                      Open
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Clean Keyboard Shortcuts Helper Footer */}
        <section
          id="welcome-shortcuts-footer"
          className="py-3 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500"
        >
          <span className="font-medium text-zinc-400">Pro Studio Hotkeys</span>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
            <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">Space</kbd> Play/Pause</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">J</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">L</kbd> Seek</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">A</kbd> Add Cue</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">Ctrl+Z</kbd> Undo</span>
          </div>
        </section>
      </main>
    </div>
  );
};
