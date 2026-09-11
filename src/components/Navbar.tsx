import React, { useRef } from 'react';
import {
  Captions,
  Sparkles,
  Upload,
  Download,
  Key,
  Keyboard,
  RotateCcw,
  Video,
  ChevronDown,
  Cloud,
  Check,
  Loader2,
  FolderOpen,
  Edit3,
  Save,
  Palette,
  Compass,
  Plus,
  Home,
  Eye,
} from 'lucide-react';
import { SAMPLE_VIDEOS, SampleVideoItem } from '../data/sampleVideo';
import { AccentPaletteId } from '../types';
import { ThemePaletteSwitcher } from './ThemePaletteSwitcher';

interface NavbarProps {
  onGoHome?: () => void;
  onUploadVideo: (file: File) => void;
  onSelectSampleVideo: (sample: SampleVideoItem) => void;
  onOpenTranscribeModal: () => void;
  onOpenImportExportModal: () => void;
  onOpenExportPreview?: () => void;
  onOpenApiKeyModal: () => void;
  onOpenShortcutsModal: () => void;
  onOpenProjectsModal?: () => void;
  onOpenTemplatesModal?: () => void;
  onOpenTourModal?: () => void;
  projectTitle?: string;
  onUpdateProjectTitle?: (title: string) => void;
  themeMode?: 'dark' | 'light';
  onToggleThemeMode?: () => void;
  accentPalette?: AccentPaletteId;
  onSelectPalette?: (palette: AccentPaletteId) => void;
  onResetProject: () => void;
  onNewProject?: () => void;
  hasApiKey: boolean;
  captionsCount: number;
  lastAutoSavedTime?: string | null;
  isAutoSaving?: boolean;
  onTriggerAutoSave?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onGoHome,
  onUploadVideo,
  onSelectSampleVideo,
  onOpenTranscribeModal,
  onOpenImportExportModal,
  onOpenExportPreview,
  onOpenApiKeyModal,
  onOpenShortcutsModal,
  onOpenProjectsModal,
  onOpenTemplatesModal,
  onOpenTourModal,
  projectTitle = '',
  onUpdateProjectTitle,
  themeMode = 'dark',
  onToggleThemeMode,
  accentPalette = 'cyber-cyan',
  onSelectPalette,
  onResetProject,
  onNewProject,
  hasApiKey,
  captionsCount,
  lastAutoSavedTime,
  isAutoSaving,
  onTriggerAutoSave,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadVideo(file);
    }
  };

  return (
    <header
      id="app-header"
      className="sticky top-0 z-40 w-full bg-white dark:bg-zinc-950/80 backdrop-blur-xl border-b border-[#E5E7EC] dark:border-white/[0.08] px-3 sm:px-4 py-2 shadow-xs transition-colors duration-200"
    >
      <div className="w-full px-1 sm:px-2 flex items-center justify-between gap-2.5">
        {/* Brand Logo, Name & Editable Project Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Logo & Welcome Page Link */}
          <button
            type="button"
            id="navbar-brand-home-btn"
            onClick={onGoHome}
            className="flex items-center gap-2 shrink-0 hover:opacity-85 active:scale-95 transition-all text-left"
            title="Return to Welcome Dashboard"
          >
            <img
              src="/favicon.svg"
              alt="SCRIBEFLOW Logo"
              className="w-8 h-8 rounded-xl border border-indigo-500/30 shadow-sm object-cover"
            />
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  SCRIBE<span className="text-indigo-600 dark:text-indigo-400">FLOW</span>
                </h1>
                <span className="px-2 py-0.5 text-[9px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 rounded-full">
                  Studio
                </span>
              </div>
            </div>
          </button>

          {/* Quick Home / Projects Dashboard Button */}
          {onGoHome && (
            <button
              type="button"
              id="navbar-dashboard-btn"
              onClick={onGoHome}
              className="p-1 sm:px-2 py-1 bg-white dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.09] text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs shrink-0"
              title="Return to Welcome Dashboard"
            >
              <Home className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden md:inline">Dashboard</span>
            </button>
          )}

          {/* Direct Toolbar Editable Project Title Input */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-lg px-2 sm:px-2.5 py-1 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 transition-all max-w-[100px] xs:max-w-[150px] sm:max-w-[220px] md:max-w-[300px]">
            <Edit3 className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0" />
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => onUpdateProjectTitle?.(e.target.value)}
              onBlur={() => onTriggerAutoSave?.()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onTriggerAutoSave?.();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="Project title..."
              className="bg-transparent text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none w-full truncate"
              title="Click to rename project title. Auto-saves as you type."
            />
            <button
              type="button"
              onClick={onTriggerAutoSave}
              className="text-[10px] font-semibold text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-slate-200/60 dark:hover:bg-zinc-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 shrink-0 transition-colors hidden sm:inline"
              title="Save current project workspace"
            >
              Save
            </button>
          </div>

          {/* Quick New Project Button */}
          <button
            type="button"
            id="navbar-new-project-btn"
            onClick={onNewProject || onResetProject}
            className="p-1 sm:px-2 py-1 bg-white dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.09] text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-all shadow-xs shrink-0"
            title="Start a new blank project"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>

        {/* Center & Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Auto-Save Status Badge */}
          {lastAutoSavedTime && (
            <button
              type="button"
              id="navbar-autosave-badge"
              onClick={onTriggerAutoSave}
              className="px-2.5 py-1 rounded-full items-center gap-1.5 text-[11px] font-mono font-medium bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-all hidden lg:flex"
              title={`Auto-saves every 30 seconds. Last saved at ${lastAutoSavedTime}. Click to save now.`}
            >
              {isAutoSaving ? (
                <Loader2 className="w-3 h-3 text-slate-500 dark:text-zinc-400 animate-spin" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
              <span>
                {isAutoSaving ? 'Saving...' : `Saved ${lastAutoSavedTime}`}
              </span>
            </button>
          )}

          {/* Upload Video Button (Secondary Button) */}
          <button
            type="button"
            id="upload-video-btn"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-200 bg-white dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.09] rounded-lg transition-all shadow-xs active:scale-95 shrink-0"
            title="Upload custom MP4 or WebM video"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span className="hidden md:inline">Upload</span>
          </button>

          {/* Sample Videos Dropdown */}
          <div className="relative group hidden sm:block">
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 bg-white dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.09] rounded-lg transition-all shadow-xs active:scale-95 shrink-0"
              title="Load demo video templates"
            >
              <Video className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span className="hidden md:inline">Samples</span>
              <ChevronDown className="w-3 h-3 text-slate-400 dark:text-zinc-400" />
            </button>

            <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/[0.12] rounded-xl shadow-xl p-1.5 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <span className="block px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Load Preset Video
              </span>
              {SAMPLE_VIDEOS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => onSelectSampleVideo(sample)}
                  className="w-full text-left px-2.5 py-2 text-xs text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors flex flex-col"
                >
                  <span className="font-semibold">{sample.name}</span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                    {sample.captions.length} captions included
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Auto-Transcribe Button */}
          <button
            type="button"
            id="navbar-transcribe-btn"
            onClick={onOpenTranscribeModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 shrink-0"
            title="Auto-generate subtitles using AI Whisper"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">AI Transcribe</span>
          </button>

          {/* Quick Start Templates Button */}
          {onOpenTemplatesModal && (
            <button
              type="button"
              id="navbar-templates-btn"
              onClick={onOpenTemplatesModal}
              className="hidden md:inline-flex bg-white dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.09] text-slate-700 dark:text-white p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium items-center gap-1.5 transition-all shadow-xs shrink-0"
              title="Open Quick Start Templates Library"
            >
              <Palette className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Templates</span>
            </button>
          )}

          {/* Interactive Tour Guide Button */}
          {onOpenTourModal && (
            <button
              type="button"
              id="navbar-tour-btn"
              onClick={onOpenTourModal}
              className="hidden lg:inline-flex bg-white dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.09] text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-white p-1.5 sm:px-2 sm:py-1.5 rounded-lg text-xs font-medium items-center gap-1 transition-all shadow-xs shrink-0"
              title="Start Interactive Feature Tour"
            >
              <Compass className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span className="hidden md:inline">Tour</span>
            </button>
          )}

          {/* Projects Library Button */}
          {onOpenProjectsModal && (
            <button
              type="button"
              id="navbar-projects-btn"
              onClick={onOpenProjectsModal}
              className="hidden md:inline-flex bg-white dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.09] text-slate-700 dark:text-white p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium items-center gap-1.5 transition-all shadow-xs shrink-0"
              title="Open Saved Projects Library"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span className="hidden sm:inline">Projects</span>
            </button>
          )}

          {/* Export Preview Button */}
          {onOpenExportPreview && (
            <button
              type="button"
              id="navbar-export-preview-btn"
              onClick={onOpenExportPreview}
              className="bg-white dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.09] text-slate-700 dark:text-zinc-200 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs active:scale-95 shrink-0"
              title="Preview 5-second video burn-in with subtitles"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          )}

          {/* Primary Quick Export Button */}
          <button
            type="button"
            id="navbar-quick-export-btn"
            onClick={onOpenImportExportModal}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
            title="Burn subtitles & export video"
          >
            <span className="hidden xs:inline sm:inline">Export</span>
            <Download className="w-3.5 h-3.5" />
            {captionsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-white/20 dark:bg-slate-900/20 text-[10px] font-mono rounded font-bold">
                {captionsCount}
              </span>
            )}
          </button>

          {/* Theme Mode & Color Palette Switcher */}
          {onToggleThemeMode && onSelectPalette && (
            <ThemePaletteSwitcher
              themeMode={themeMode}
              onToggleThemeMode={onToggleThemeMode}
              accentPalette={accentPalette}
              onSelectPalette={onSelectPalette}
            />
          )}


          {/* Settings / API Key Modal Button */}
          <button
            type="button"
            id="navbar-api-key-btn"
            onClick={onOpenApiKeyModal}
            className="bg-white dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.09] text-slate-700 dark:text-white p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs"
            title="Settings & Whisper API Key"
          >
            <Key className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Ghost Keyboard Shortcuts Button */}
          <button
            type="button"
            id="navbar-shortcuts-btn"
            onClick={onOpenShortcutsModal}
            className="p-1.5 text-[#525866] dark:text-zinc-400 hover:text-[#171923] dark:hover:text-zinc-200 hover:bg-[#F1F2F6] dark:hover:bg-white/[0.05] rounded-lg transition-colors hidden sm:inline-flex"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Danger Reset Project Button */}
          <button
            type="button"
            id="navbar-reset-btn"
            onClick={onResetProject}
            className="p-1.5 text-[#737A88] dark:text-zinc-400 hover:text-[#D9364A] hover:bg-[#FFF1F2] dark:hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Reset All & Start Fresh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
