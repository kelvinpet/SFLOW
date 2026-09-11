import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Type,
  Palette,
  Layers,
  MoveVertical,
  MoveHorizontal,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sliders,
  Check,
  Zap,
  Users,
  Search,
  Heart,
  Tag,
  Flame,
  Languages,
  Globe,
  RotateCcw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Smartphone,
  LayoutTemplate,
  Mic2,
  Sun,
  Shield,
  Maximize2,
  Minimize2,
  Volume2,
  Clock,
  Film,
  Play,
  RotateCw,
  Eye,
  X,
  Bookmark,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from 'lucide-react';
import {
  SubtitleStyle,
  SubtitleFontFamily,
  WordHighlightEffect,
  TextTransform,
  DisplayMode,
  EntranceAnimation,
  ExitAnimation,
  AnimationEasing,
  SubtitlePositionPreset,
} from '../types';
import { SUBTITLE_PRESETS, DEFAULT_STYLE } from '../data/presets';
import { COMMUNITY_PRESETS, CommunityPresetItem } from '../data/communityPresets';

interface StyleCustomizerProps {
  style: SubtitleStyle;
  onChange: (updatedStyle: SubtitleStyle) => void;
  captionsCount?: number;
  onOpenTemplatesModal?: () => void;
  onOpenTranscribeModal?: () => void;
}

const FONTS: { id: SubtitleFontFamily; label: string; previewText: string; category: string }[] = [
  { id: 'Inter', label: 'Inter (Clean & Modern)', previewText: 'Clean modern subtitle', category: 'Sans-Serif' },
  { id: 'Roboto', label: 'Roboto (Universal)', previewText: 'Smooth readable text', category: 'Sans-Serif' },
  { id: 'Montserrat', label: 'Montserrat (Creator Favorite)', previewText: 'Dynamic high impact', category: 'Sans-Serif' },
  { id: 'Lobster', label: 'Lobster (Cursive Retro)', previewText: 'Vintage handwritten style', category: 'Display' },
  { id: 'Poppins', label: 'Poppins (Geometric)', previewText: 'Bold geometric layout', category: 'Sans-Serif' },
  { id: 'Bebas Neue', label: 'Bebas Neue (Tall & Bold)', previewText: 'TALL VIRAL HEADLINES', category: 'Display' },
  { id: 'Anton', label: 'Anton (High Impact)', previewText: 'VIRAL HOOK CAPTIONS', category: 'Display' },
  { id: 'Outfit', label: 'Outfit (Sleek Tech)', previewText: 'Sleek tech subtitles', category: 'Sans-Serif' },
  { id: 'Plus Jakarta Sans', label: 'Plus Jakarta (Minimal)', previewText: 'Minimal studio font', category: 'Sans-Serif' },
  { id: 'Syne', label: 'Syne (Artistic & Avant)', previewText: 'Avant-garde punchy text', category: 'Display' },
  { id: 'Archivo Black', label: 'Archivo Black (Ultra Heavy)', previewText: 'HEAVY POPPING WORDS', category: 'Display' },
  { id: 'Bangers', label: 'Bangers (Comic Book)', previewText: 'COMIC ACTION WORDS!', category: 'Display' },
  { id: 'Permanent Marker', label: 'Permanent Marker (Graffiti)', previewText: 'Raw marker street vibe', category: 'Handwriting' },
  { id: 'Playfair Display', label: 'Playfair Display (Luxury Serif)', previewText: 'Elegant storytelling', category: 'Serif' },
  { id: 'Impact', label: 'Impact (Meme Classic)', previewText: 'CLASSIC MEME HOOK', category: 'Display' },
  { id: 'Arial', label: 'Arial (Clean & Neutral)', previewText: 'Standard accessible text', category: 'Sans-Serif' },
  { id: 'Georgia', label: 'Georgia (Editorial Serif)', previewText: 'Classic narrative elegance', category: 'Serif' },
  { id: 'Courier New', label: 'Courier New (Typewriter Monospace)', previewText: 'Vintage typewriter code', category: 'Display' },
];

const COLOR_SWATCHES = [
  '#FFFFFF',
  '#FEF08A', // Yellow
  '#22C55E', // Green
  '#38BDF8', // Cyan
  '#F43F5E', // Rose/Pink
  '#F59E0B', // Amber
  '#A855F7', // Purple
  '#000000',
];

const CATEGORIES = ['All', 'Viral Creators', 'Minimalist', 'Neon & Cyber', 'Bold & High-Energy', 'Podcasts', 'Retro & Comic'] as const;

export const CORE_PRESET_CATEGORIES = [
  'All',
  'Viral & Social',
  'Karaoke & Glow',
  'Cinema & Docu',
  'Minimal & Clean',
  'Bold & Flash',
  'Retro & Pop',
] as const;

export const StyleCustomizer: React.FC<StyleCustomizerProps> = ({
  style,
  onChange,
  captionsCount,
  onOpenTemplatesModal,
  onOpenTranscribeModal,
}) => {
  const [presetTab, setPresetTab] = useState<'standard' | 'community' | 'user'>('standard');
  const [coreCategory, setCoreCategory] = useState<string>('All');
  const [coreSearch, setCoreSearch] = useState<string>('');
  const [userSavedPresets, setUserSavedPresets] = useState<SubtitleStyle[]>(() => {
    try {
      const saved = localStorage.getItem('subly_user_saved_presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newPresetNameInput, setNewPresetNameInput] = useState('');
  const [communityCategory, setCommunityCategory] = useState<string>('All');
  const [communitySearch, setCommunitySearch] = useState<string>('');
  const [fontSearch, setFontSearch] = useState<string>('');
  const [fontCategory, setFontCategory] = useState<string>('All');
  const [previewAnimKey, setPreviewAnimKey] = useState<number>(0);
  const [resetToast, setResetToast] = useState<boolean>(false);

  // 2-Tier Progressive Disclosure: Accordion state for Advanced Fine-Tuning
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    typography: false,
    karaoke: false,
    shadowBox: false,
    position: false,
    audioSync: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const areAllOpen = Object.values(openSections).every(Boolean);

  const toggleAllSections = () => {
    const nextVal = !areAllOpen;
    setOpenSections({
      typography: nextVal,
      karaoke: nextVal,
      shadowBox: nextVal,
      position: nextVal,
      audioSync: nextVal,
    });
  };

  const handleSaveUserPreset = () => {
    if (!newPresetNameInput.trim()) return;
    const customPreset: SubtitleStyle = {
      ...style,
      id: `user-preset-${Date.now()}`,
      name: newPresetNameInput.trim(),
    };
    const updated = [customPreset, ...userSavedPresets];
    setUserSavedPresets(updated);
    try {
      localStorage.setItem('subly_user_saved_presets', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save preset to localStorage', e);
    }
    setNewPresetNameInput('');
    setIsSaveModalOpen(false);
    setPresetTab('user');
  };

  const handleDeleteUserPreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = userSavedPresets.filter((p) => p.id !== presetId);
    setUserSavedPresets(updated);
    try {
      localStorage.setItem('subly_user_saved_presets', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update localStorage', e);
    }
  };

  const adjustColorAlpha = (color: string, alpha: number): string => {
    if (!color) return `rgba(0, 0, 0, ${alpha.toFixed(2)})`;
    if (color.startsWith('#')) {
      let hex = color.slice(1);
      if (hex.length === 3) {
        hex = hex.split('').map((c) => c + c).join('');
      }
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
    }
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha.toFixed(2)})`;
    }
    return `rgba(0, 0, 0, ${alpha.toFixed(2)})`;
  };

  const handleResetToDefault = () => {
    onChange({ ...DEFAULT_STYLE });
    setResetToast(true);
    setTimeout(() => setResetToast(false), 2200);
  };

  const update = (patch: Partial<SubtitleStyle>) => {
    onChange({ ...style, ...patch });
  };

  const filteredCorePresets = useMemo(() => {
    return SUBTITLE_PRESETS.filter((p) => {
      const matchesCategory = coreCategory === 'All' || p.category === coreCategory;
      const matchesSearch =
        !coreSearch.trim() ||
        (p.name && p.name.toLowerCase().includes(coreSearch.toLowerCase())) ||
        p.fontFamily.toLowerCase().includes(coreSearch.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(coreSearch.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [coreCategory, coreSearch]);

  const filteredCommunityPresets = COMMUNITY_PRESETS.filter((item) => {
    const matchesCategory = communityCategory === 'All' || item.category === communityCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(communitySearch.toLowerCase()) ||
      item.author.toLowerCase().includes(communitySearch.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(communitySearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const filteredFonts = FONTS.filter((f) => {
    const matchesCat = fontCategory === 'All' || f.category === fontCategory;
    const matchesSearch =
      f.label.toLowerCase().includes(fontSearch.toLowerCase()) ||
      f.id.toLowerCase().includes(fontSearch.toLowerCase()) ||
      f.category.toLowerCase().includes(fontSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div id="style-customizer-container" className="space-y-6 text-slate-800 dark:text-zinc-100">
      {/* Empty State Banner when no captions in active project */}
      {captionsCount === 0 && (
        <div
          id="styles-empty-captions-banner"
          className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs animate-in fade-in"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200">
                  Pre-Configure Your Subtitle Style
                </h4>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  Ready for AI Sync
                </span>
              </div>
              <p className="text-xs text-indigo-900/70 dark:text-indigo-300/70 mt-1 leading-relaxed">
                Choose a preset style or load a Quick Start template below. Any style, color, or font you customize will instantly apply to your captions as soon as you transcribe or load your video.
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {onOpenTemplatesModal && (
                  <button
                    type="button"
                    onClick={onOpenTemplatesModal}
                    className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Choose a Preset Style</span>
                  </button>
                )}
                {onOpenTranscribeModal && (
                  <button
                    type="button"
                    onClick={onOpenTranscribeModal}
                    className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 rounded-xl border border-indigo-200 dark:border-zinc-700 shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Transcribe Your First Video</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Header with Reset to Default Button */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-slate-600 dark:text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Subtitle Style Studio
          </span>
        </div>

        <div className="flex items-center gap-2">
          {resetToast && (
            <span className="text-[11px] font-semibold text-slate-700 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
              <Check className="w-3.5 h-3.5" /> Reverted to Default
            </span>
          )}
          <button
            type="button"
            id="reset-style-to-default-btn"
            onClick={handleResetToDefault}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 hover:border-slate-300 dark:hover:border-zinc-600 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
            title="Revert all styling changes to the original default configuration"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-indigo-400" />
            <span>Reset to Default</span>
          </button>
        </div>
      </div>

      {/* Preset Style Templates Header & Tab Switcher */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 space-y-3">
        {/* Active Selected Preset Info Bar (Clean, no preview box) */}
        <div
          id="selected-preset-active-bar"
          className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">Current Preset:</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white tracking-wide">{style.name || 'Custom Styled'}</span>
          </div>
          <div className="text-[10px] text-slate-600 dark:text-zinc-400 font-mono">
            {style.fontFamily} • {style.fontSize}px
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 w-full">
            <button
              type="button"
              id="standard-presets-tab-btn"
              onClick={() => setPresetTab('standard')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                presetTab === 'standard'
                  ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Core Presets</span>
              <span className="px-1.5 py-0.2 text-[9px] bg-slate-200 dark:bg-indigo-500/20 text-slate-700 dark:text-indigo-300 font-mono rounded-full font-bold border border-slate-300 dark:border-indigo-400/30">
                {SUBTITLE_PRESETS.length}
              </span>
            </button>

            <button
              type="button"
              id="community-presets-tab-btn"
              onClick={() => setPresetTab('community')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                presetTab === 'community'
                  ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-slate-500 dark:text-indigo-300" />
              <span>Community</span>
              <span className="px-1.5 py-0.2 text-[9px] bg-slate-200 dark:bg-indigo-500/20 text-slate-700 dark:text-indigo-300 font-mono rounded-full font-bold border border-slate-300 dark:border-indigo-400/30">
                {COMMUNITY_PRESETS.length}
              </span>
            </button>

            <button
              type="button"
              id="user-presets-tab-btn"
              onClick={() => setPresetTab('user')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                presetTab === 'user'
                  ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-slate-500 dark:text-amber-300" />
              <span>My Presets</span>
              {userSavedPresets.length > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] bg-slate-200 dark:bg-amber-500/20 text-slate-700 dark:text-amber-300 font-mono rounded-full font-bold border border-slate-300 dark:border-amber-400/30">
                  {userSavedPresets.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Standard Core Presets (All 30 Presets with Category & Search Filters) */}
        {presetTab === 'standard' && (
          <div className="space-y-3 pt-1">
            {/* Search and Category Filter for 30 Presets */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={coreSearch}
                  onChange={(e) => setCoreSearch(e.target.value)}
                  placeholder="Search 30 presets by name, font, or style..."
                  className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {CORE_PRESET_CATEGORIES.map((cat) => {
                  const count =
                    cat === 'All'
                      ? SUBTITLE_PRESETS.length
                      : SUBTITLE_PRESETS.filter((p) => p.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCoreCategory(cat)}
                      className={`px-2.5 py-1 text-[10px] font-semibold rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
                        coreCategory === cat
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-200/70 hover:bg-slate-300/70 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className="opacity-70 text-[9px]">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-[440px] overflow-y-auto pr-1">
              {filteredCorePresets.map((preset) => {
                const isSelected = style.name === preset.name || style.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    id={`preset-btn-${preset.id}`}
                    onClick={() => onChange({ ...preset })}
                    className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-600/15 border-indigo-300 dark:border-indigo-500 text-indigo-900 dark:text-white shadow-xs ring-1 ring-indigo-400 dark:ring-indigo-500/50'
                        : 'bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold tracking-tight truncate">{preset.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 ml-1" />}
                    </div>

                    <div
                      className="px-2 py-1 rounded text-[11px] font-bold text-center truncate border"
                      style={{
                        fontFamily: preset.fontFamily,
                        backgroundColor: preset.showBackgroundBox ? preset.backgroundColor : 'rgba(0,0,0,0.4)',
                        color: preset.textColor,
                        borderColor: 'rgba(255,255,255,0.1)',
                        textTransform: preset.textTransform,
                      }}
                    >
                      <span style={{ color: preset.activeWordColor }}>Sample</span> Word
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-600 dark:text-zinc-400 mt-1.5 font-mono">
                      <span className="truncate">{preset.category || 'Preset'}</span>
                      <span className="shrink-0">{preset.fontFamily}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Community Presets Gallery */}
        {presetTab === 'community' && (
          <div className="space-y-3 pt-1">
            {/* Search & Category filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={communitySearch}
                  onChange={(e) => setCommunitySearch(e.target.value)}
                  placeholder="Search community styles or creators..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCommunityCategory(cat)}
                    className={`px-2.5 py-1 text-[10px] font-semibold rounded-full whitespace-nowrap transition-all ${
                      communityCategory === cat
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets List */}
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {filteredCommunityPresets.map((item) => {
                const isSelected = style.name === item.name || style.id === item.id;
                return (
                  <div
                    key={item.id}
                    id={`community-preset-${item.id}`}
                    onClick={() => onChange({ ...item.style })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-600/15 ring-1 ring-indigo-500/50'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white">{item.name}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          by {item.author} ({item.authorHandle})
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-zinc-400 shrink-0">
                        <Heart className="w-3 h-3 text-rose-400 fill-rose-400/20" />
                        <span>{item.likesCount}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 mb-2 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>

                    {/* Preview Box */}
                    <div
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-center truncate border shadow-inner mb-2"
                      style={{
                        fontFamily: item.style.fontFamily,
                        backgroundColor: item.style.showBackgroundBox ? item.style.backgroundColor : '#000000',
                        color: item.style.textColor,
                        borderColor: 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <span style={{ color: item.style.activeWordColor }}>
                        {item.style.textTransform === 'uppercase' ? 'ACTIVE' : 'Active'}
                      </span>{' '}
                      {item.style.textTransform === 'uppercase' ? 'SUBTITLE PREVIEW' : 'Subtitle Preview'}
                    </div>

                    {/* Tags & 1-Click Apply button */}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                      <div className="flex items-center gap-1 flex-wrap">
                        {item.tags.map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-900 text-zinc-400 border border-zinc-800"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange({ ...item.style });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                        }`}
                      >
                        {isSelected ? <Check className="w-3 h-3" /> : <Flame className="w-3 h-3 text-amber-400" />}
                        <span>{isSelected ? 'Applied' : 'Apply Preset'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: My Saved Presets */}
        {presetTab === 'user' && (
          <div className="space-y-3 pt-1">
            {/* Save Current Style Button */}
            <div className="p-3 bg-zinc-950 rounded-xl border border-amber-500/30 space-y-2">
              {!isSaveModalOpen ? (
                <button
                  type="button"
                  id="open-save-preset-modal-btn"
                  onClick={() => setIsSaveModalOpen(true)}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-400/20 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Current Styling as Personal Preset</span>
                </button>
              ) : (
                <div className="space-y-2 animate-in fade-in zoom-in-95">
                  <div className="text-xs font-bold text-amber-300 flex items-center justify-between">
                    <span>Name Your Personal Preset:</span>
                    <button
                      type="button"
                      onClick={() => setIsSaveModalOpen(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      id="preset-name-input"
                      value={newPresetNameInput}
                      onChange={(e) => setNewPresetNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveUserPreset()}
                      placeholder="e.g. My Brand TikTok Bold..."
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                      autoFocus
                    />
                    <button
                      type="button"
                      id="confirm-save-preset-btn"
                      onClick={handleSaveUserPreset}
                      disabled={!newPresetNameInput.trim()}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        newPresetNameInput.trim()
                          ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-sm'
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* List of user saved presets */}
            {userSavedPresets.length === 0 ? (
              <div className="py-8 text-center space-y-1.5 border border-dashed border-zinc-800 rounded-xl bg-zinc-950">
                <Bookmark className="w-6 h-6 text-zinc-600 mx-auto" />
                <p className="text-xs font-semibold text-zinc-400">No saved presets yet</p>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  Customize your font, karaoke effects, and stroke, then click save to keep your signature look!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
                {userSavedPresets.map((preset) => {
                  const isSelected = style.name === preset.name || style.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => onChange({ ...preset })}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-500/50'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold tracking-tight text-amber-200">{preset.name}</span>
                        <div className="flex items-center gap-1.5">
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteUserPreset(preset.id, e)}
                            className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                            title="Delete this custom preset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-center truncate border shadow-inner"
                        style={{
                          fontFamily: preset.fontFamily,
                          backgroundColor: preset.showBackgroundBox ? preset.backgroundColor : '#000000',
                          color: preset.textColor,
                          borderColor: 'rgba(255,255,255,0.1)',
                        }}
                      >
                        <span style={{ color: preset.activeWordColor }}>
                          {preset.textTransform === 'uppercase' ? 'MY BRAND' : 'My Brand'}
                        </span>{' '}
                        {preset.textTransform === 'uppercase' ? 'SUBTITLES' : 'Subtitles'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tier 1: Quick Studio Tweaks (Instant access to 90% of styling edits) */}
      <div id="quick-studio-tweaks-card" className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Quick Adjustments</h4>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
            Core settings
          </span>
        </div>

        {/* Font quick select */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">
            <span>Font Family</span>
            <button
              type="button"
              onClick={() => toggleSection('typography')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline text-[10px] font-medium"
            >
              Browse all 18 fonts
            </button>
          </div>
          <select
            value={style.fontFamily}
            onChange={(e) => update({ fontFamily: e.target.value as SubtitleFontFamily })}
            className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-xs"
          >
            {FONTS.map((f) => (
              <option key={f.id} value={f.id} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Font size slider & quick pills */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
            <span>Size</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{style.fontSize}px</span>
          </div>
          <input
            type="range"
            min={16}
            max={72}
            value={style.fontSize}
            onChange={(e) => update({ fontSize: Number(e.target.value) })}
            className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
          />
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {[
              { label: 'Compact', size: 20 },
              { label: 'Default', size: 24 },
              { label: 'Medium', size: 32 },
              { label: 'Large', size: 42 },
            ].map((s) => (
              <button
                key={s.size}
                type="button"
                onClick={() => update({ fontSize: s.size })}
                className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                  style.fontSize === s.size
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-800'
                }`}
              >
                {s.label} ({s.size}px)
              </button>
            ))}
          </div>
        </div>

        {/* Colors: Active Highlight Word & Base Subtitle Text */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Active Highlight Color */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
              Active Highlight
            </label>
            <div className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800">
              <input
                type="color"
                value={style.activeWordColor}
                onChange={(e) => update({ activeWordColor: e.target.value })}
                className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
              />
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-indigo-300 uppercase truncate">
                {style.activeWordColor}
              </span>
            </div>
            <div className="flex items-center gap-1 pt-0.5">
              {['#FEF08A', '#22C55E', '#38BDF8', '#F43F5E', '#F59E0B'].map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => update({ activeWordColor: hex })}
                  className="w-5 h-5 rounded-full border border-slate-300 dark:border-zinc-600 hover:scale-110 transition-transform shadow-xs"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          {/* Base Subtitle Text Color */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
              Base Text
            </label>
            <div className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800">
              <input
                type="color"
                value={style.textColor}
                onChange={(e) => update({ textColor: e.target.value })}
                className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
              />
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-white uppercase truncate">
                {style.textColor}
              </span>
            </div>
            <div className="flex items-center gap-1 pt-0.5">
              {['#FFFFFF', '#FEF08A', '#38BDF8', '#E2E8F0', '#000000'].map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => update({ textColor: hex })}
                  className="w-5 h-5 rounded-full border border-slate-300 dark:border-zinc-600 hover:scale-110 transition-transform shadow-xs"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Quick Position & Text Case */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">
              Position
            </label>
            <div className="flex bg-slate-100 dark:bg-zinc-950 rounded-xl p-1 border border-slate-200 dark:border-zinc-800">
              {[
                { label: 'Bottom', y: 85, preset: 'bottom' as SubtitlePositionPreset },
                { label: 'Middle', y: 50, preset: 'middle' as SubtitlePositionPreset },
                { label: 'Top', y: 18, preset: 'top' as SubtitlePositionPreset },
              ].map((pos) => (
                <button
                  key={pos.label}
                  type="button"
                  onClick={() => update({ yOffsetPercent: pos.y, positionPreset: pos.preset, textAlign: 'center' })}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    Math.abs((style.yOffsetPercent ?? 85) - pos.y) <= 8
                      ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">
              Text Case
            </label>
            <div className="flex bg-slate-100 dark:bg-zinc-950 rounded-xl p-1 border border-slate-200 dark:border-zinc-800">
              {(['uppercase', 'capitalize', 'none'] as TextTransform[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update({ textTransform: t })}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-lg capitalize transition-all ${
                    style.textTransform === t
                      ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t === 'uppercase' ? 'CAPS' : t === 'capitalize' ? 'Title' : 'Normal'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tier 2: Collapsible Advanced Fine-Tuning Drawers */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
              Advanced Fine-Tuning
            </span>
          </div>
          <button
            type="button"
            id="toggle-all-advanced-sections-btn"
            onClick={toggleAllSections}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {areAllOpen ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        {/* Drawer 1: Typography & Outlines */}
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 overflow-hidden transition-all shadow-xs">
          <button
            type="button"
            id="drawer-typography-trigger"
            onClick={() => toggleSection('typography')}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Type className="w-4 h-4 text-indigo-500" />
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Typography & Outlines</span>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal">All 18 fonts, stroke outline, auto-scale</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                {style.fontFamily} • {style.strokeWidth || 0}px stroke
              </span>
              {openSections.typography ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {openSections.typography && (
            <div className="p-4 border-t border-slate-100 dark:border-zinc-800 space-y-4">
              {/* Auto-Scale & Aspect Ratio Protection Feature */}
              <div id="autoscale-feature-block" className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white">Auto-Scale Font Size</span>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Dynamically adjusts font & padding across 9:16 and 1:1 so text never overflows
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="toggle-autoscale-switch"
                    onClick={() => update({ autoScaleFontSize: style.autoScaleFontSize === false ? true : false })}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                      style.autoScaleFontSize !== false ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-zinc-800'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                        style.autoScaleFontSize !== false ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {style.autoScaleFontSize !== false && (
                  <div className="flex items-center gap-2 text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-3 py-1.5 rounded-lg font-medium">
                    <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Active: Captions scale intelligently between Vertical Reels (9:16) and Square Feeds (1:1).</span>
                  </div>
                )}
              </div>

      {/* Font Selector Menu */}
      <div id="font-selector-block" className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
            <Type className="w-4 h-4 text-indigo-400" />
            <span>Font Selector Menu</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
            {filteredFonts.length} of {FONTS.length} fonts
          </span>
        </div>

        {/* Dynamic Font Search Bar & Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="font-search-input"
              value={fontSearch}
              onChange={(e) => setFontSearch(e.target.value)}
              placeholder="Search fonts by name or style (e.g. Montserrat, Comic, Bold)..."
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
            />
            {fontSearch && (
              <button
                type="button"
                id="clear-font-search-btn"
                onClick={() => setFontSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded-full hover:bg-zinc-800 transition-colors"
                title="Clear font search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {['All', 'Sans-Serif', 'Display', 'Handwriting', 'Serif'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFontCategory(cat)}
                className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap transition-all ${
                  fontCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Pre-defined Font Selection Grid with Live Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 bg-zinc-950 rounded-xl border border-zinc-800 pr-1.5">
          {filteredFonts.length === 0 ? (
            <div className="col-span-full py-8 text-center space-y-2">
              <p className="text-xs text-zinc-400">
                No fonts matching &ldquo;<span className="text-indigo-300 font-semibold">{fontSearch}</span>&rdquo;
              </p>
              <button
                type="button"
                onClick={() => {
                  setFontSearch('');
                  setFontCategory('All');
                }}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 underline"
              >
                Clear search & show all fonts
              </button>
            </div>
          ) : (
            filteredFonts.map((f) => {
              const isSelected = style.fontFamily === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  id={`font-option-${f.id.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => update({ fontFamily: f.id })}
                  className={`p-2.5 rounded-xl text-left border transition-all relative ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-600/10 ring-1 ring-indigo-500/50'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isSelected ? 'text-indigo-300' : 'text-zinc-200'}`}>
                      {f.label}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </div>
                  <div
                    className="text-[13px] text-white/90 truncate tracking-wide"
                    style={{ fontFamily: f.id }}
                  >
                    {f.previewText}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Font Size & Weight */}
        <div className="space-y-3 pt-2 border-t border-zinc-800/80">
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mb-1.5">
              <span>Primary Subtitle Font Size</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={12}
                  max={96}
                  value={style.fontSize}
                  onChange={(e) => update({ fontSize: Math.max(12, Math.min(96, Number(e.target.value) || 12)) })}
                  className="w-14 bg-zinc-950 border border-zinc-700 rounded-md px-1.5 py-0.5 text-xs text-indigo-400 font-mono font-bold text-right focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-zinc-500 font-mono">px</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={16}
                max={72}
                step={1}
                value={style.fontSize}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
                className="flex-1 accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>
            {/* Quick Size Presets */}
            <div className="flex items-center gap-1.5 mt-2">
              {[
                { label: 'Compact', size: 20 },
                { label: 'Default', size: 24 },
                { label: 'Medium', size: 32 },
                { label: 'Large', size: 42 },
              ].map((s) => (
                <button
                  key={s.size}
                  type="button"
                  onClick={() => update({ fontSize: s.size })}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    style.fontSize === s.size
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  {s.label} ({s.size}px)
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Text Weight
              </label>
              <select
                value={style.fontWeight}
                onChange={(e) => update({ fontWeight: Number(e.target.value) as 400 | 700 | 900 })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={400} className="bg-zinc-900 text-white">Regular (400)</option>
                <option value={600} className="bg-zinc-900 text-white">Semi-Bold (600)</option>
                <option value={700} className="bg-zinc-900 text-white">Bold (700)</option>
                <option value={800} className="bg-zinc-900 text-white">Extra Bold (800)</option>
                <option value={900} className="bg-zinc-900 text-white">Black (900)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Letter Casing
              </label>
              <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                {(['uppercase', 'none', 'capitalize'] as TextTransform[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update({ textTransform: t })}
                    className={`flex-1 py-1 text-[10px] font-bold rounded capitalize transition-all ${
                      style.textTransform === t
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t === 'none' ? 'Normal' : t === 'uppercase' ? 'CAPS' : 'Title'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stroke / Outline */}
      <div className="grid grid-cols-2 gap-3 items-center pt-2 border-t border-slate-100 dark:border-zinc-800">
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                <span>Stroke Thickness</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={style.strokeWidth}
                    onChange={(e) => update({ strokeWidth: Math.max(0, Math.min(20, Number(e.target.value) || 0)) })}
                    className="w-12 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded px-1 py-0.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-bold text-right focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">px</span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={16}
                step={1}
                value={style.strokeWidth}
                onChange={(e) => update({ strokeWidth: Number(e.target.value) })}
                className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                Stroke Color
              </label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-950 p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800">
                <input
                  type="color"
                  value={style.strokeColor}
                  onChange={(e) => update({ strokeColor: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 shrink-0"
                />
                <input
                  type="text"
                  value={style.strokeColor}
                  onChange={(e) => update({ strokeColor: e.target.value })}
                  className="w-full bg-transparent text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none uppercase font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

  {/* Drawer 2: Word Karaoke & Motion Animations */}
  <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 overflow-hidden transition-all shadow-xs">
    <button
      type="button"
      id="drawer-karaoke-trigger"
      onClick={() => toggleSection('karaoke')}
      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
    >
      <div className="flex items-center gap-2.5">
        <Mic2 className="w-4 h-4 text-indigo-500" />
        <div>
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Word Karaoke & Motion</span>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal">Active word pop bounce, fill, keyframe motion</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
          {style.wordHighlightEffect} • {style.entranceAnimation || 'none'}
        </span>
        {openSections.karaoke ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>
    </button>

    {openSections.karaoke && (
      <div className="p-4 border-t border-slate-100 dark:border-zinc-800 space-y-4">
        {/* Karaoke & Word-Level Highlight Effect Section */}
        <div id="karaoke-highlight-block" className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
            <Mic2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span>Karaoke & Word-Level Highlight</span>
          </div>

        {/* Word Highlight Animation Effect Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-2">
            Playback Highlight Effect
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'karaoke', label: '🎤 Karaoke Fill', desc: 'Syncs words as playback progresses' },
                { id: 'bounce', label: '🚀 Bounce Pop', desc: 'Active word pop-scale' },
                { id: 'box-highlight', label: '🔲 Word Box', desc: 'Colored background badge' },
                { id: 'glow', label: '✨ Neon Glow', desc: 'Vibrant active aura' },
                { id: 'color-only', label: '🎨 Color Swap', desc: 'Instant text color flip' },
                { id: 'underline', label: '⚡ Underline', desc: 'Dynamic bottom accent' },
                { id: 'none', label: 'Off', desc: 'Static subtitle view' },
              ] as { id: WordHighlightEffect; label: string; desc: string }[]
            ).map((fx) => (
              <button
                key={fx.id}
                type="button"
                onClick={() => update({ wordHighlightEffect: fx.id })}
                className={`p-2.5 text-left rounded-xl transition-all border ${
                  style.wordHighlightEffect === fx.id
                    ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold shadow-md shadow-indigo-600/20 ring-1 ring-indigo-500/50'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                }`}
              >
                <div className="text-xs font-bold">{fx.label}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{fx.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Text Color vs Active Word Color */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
              Base / Spoken Text Color
            </label>
            <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
              <input
                type="color"
                value={style.textColor}
                onChange={(e) => update({ textColor: e.target.value })}
                className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={style.textColor}
                onChange={(e) => update({ textColor: e.target.value })}
                className="w-full bg-transparent text-xs font-mono text-white focus:outline-none uppercase font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-indigo-300 mb-1.5 flex items-center gap-1">
              <Zap className="w-3 h-3 text-indigo-400" />
              Active Highlight Color
            </label>
            <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-indigo-500/30">
              <input
                type="color"
                value={style.activeWordColor}
                onChange={(e) => update({ activeWordColor: e.target.value })}
                className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={style.activeWordColor}
                onChange={(e) => update({ activeWordColor: e.target.value })}
                className="w-full bg-transparent text-xs font-mono text-indigo-300 focus:outline-none uppercase font-bold"
              />
            </div>
          </div>
        </div>

        {/* Active Word Background Box Color if Box-Highlight or Karaoke */}
        {(style.wordHighlightEffect === 'box-highlight' || style.wordHighlightEffect === 'karaoke') && (
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
              Active Word Background Badge Color
            </label>
            <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
              <input
                type="color"
                value={style.activeWordBgColor || '#000000'}
                onChange={(e) => update({ activeWordBgColor: e.target.value })}
                className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={style.activeWordBgColor || '#000000'}
                onChange={(e) => update({ activeWordBgColor: e.target.value })}
                className="w-full bg-transparent text-xs font-mono text-white focus:outline-none uppercase font-bold"
              />
            </div>
          </div>
        )}

        {/* Inactive Word Dimming for Karaoke Mode */}
        {style.wordHighlightEffect === 'karaoke' && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
              <span>Upcoming / Inactive Word Opacity</span>
              <span className="font-mono text-indigo-400 font-bold">
                {Math.round((style.inactiveWordOpacity ?? 0.5) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.2}
              max={1.0}
              step={0.05}
              value={style.inactiveWordOpacity ?? 0.5}
              onChange={(e) => update({ inactiveWordOpacity: Number(e.target.value) })}
              className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
              <span>20% (High Contrast)</span>
              <span>50% (Standard Karaoke)</span>
              <span>100% (No Dimming)</span>
            </div>
          </div>
        )}

        {/* Color Palette Quick Swatches */}
        <div>
          <span className="block text-[10px] text-zinc-500 mb-1.5 font-medium">Quick Active Palette:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLOR_SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => update({ activeWordColor: hex })}
                className="w-6 h-6 rounded-full border border-zinc-600 hover:scale-110 transition-transform shadow"
                style={{ backgroundColor: hex }}
                title={`Set active word color to ${hex}`}
              />
            ))}
          </div>
        </div>

        {/* Bounce Scale Slider */}
        {style.wordHighlightEffect === 'bounce' && (
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mb-1">
              <span>Pop Bounce Scale</span>
              <span className="font-mono text-indigo-400 font-bold">{style.activeWordScale || 1.15}x</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={1.4}
              step={0.05}
              value={style.activeWordScale || 1.15}
              onChange={(e) => update({ activeWordScale: Number(e.target.value) })}
              className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Keyframe Animation Editor Section */}
      <div id="keyframe-animation-block" className="p-4 rounded-xl bg-zinc-900/90 border border-indigo-500/40 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-indigo-400" />
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Keyframe Animation Editor</span>
              <p className="text-[11px] text-zinc-400">Entrance & exit motion animations for caption overlays</p>
            </div>
          </div>
          <button
            type="button"
            id="test-animation-trigger-btn"
            onClick={() => setPreviewAnimKey((k) => k + 1)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 rounded-lg transition-all"
            title="Replay test animation"
          >
            <RotateCw className="w-3 h-3 text-indigo-400" />
            <span>Test Motion</span>
          </button>
        </div>

        {/* Live Animation Preview Demo Card */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col items-center justify-center min-h-[72px] overflow-hidden relative">
          <div
            key={previewAnimKey}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all"
            style={{
              fontFamily: style.fontFamily,
              backgroundColor: style.showBackgroundBox ? style.backgroundColor : 'rgba(0,0,0,0.6)',
              color: style.textColor,
              animation: `${style.entranceAnimation && style.entranceAnimation !== 'none' ? style.entranceAnimation : 'none'} ${style.animationDurationMs || 250}ms ${style.animationEasing === 'spring' ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : style.animationEasing === 'bounce' ? 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' : style.animationEasing || 'ease-out'} forwards`,
            }}
          >
            <span style={{ color: style.activeWordColor }} className="mr-1">
              {style.entranceAnimation && style.entranceAnimation !== 'none' ? style.entranceAnimation.toUpperCase() : 'STATIC'}
            </span>
            <span>CAPTION TEXT</span>
          </div>
          <span className="text-[9px] text-zinc-500 mt-2 font-mono">
            {style.entranceAnimation || 'none'} ➔ {style.exitAnimation || 'none'} • {style.animationDurationMs || 250}ms • {style.animationEasing || 'ease-out'}
          </span>
        </div>

        {/* Entrance Animation Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-300 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ArrowDown className="w-3 h-3 text-emerald-400" />
              Entrance Animation (In)
            </span>
            <span className="text-[10px] text-zinc-500 font-mono capitalize">
              {style.entranceAnimation || 'none'}
            </span>
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                { id: 'none', label: 'None' },
                { id: 'slide-up', label: '⬆️ Slide Up' },
                { id: 'slide-down', label: '⬇️ Slide Down' },
                { id: 'slide-left', label: '⬅️ Slide Left' },
                { id: 'slide-right', label: '➡️ Slide Right' },
                { id: 'fade-in', label: '🌫️ Fade In' },
                { id: 'pop', label: '💥 Pop Zoom' },
                { id: 'bounce-in', label: '🏀 Bounce' },
              ] as { id: EntranceAnimation; label: string }[]
            ).map((anim) => (
              <button
                key={anim.id}
                type="button"
                id={`entrance-anim-${anim.id}`}
                onClick={() => {
                  update({ entranceAnimation: anim.id });
                  setPreviewAnimKey((k) => k + 1);
                }}
                className={`py-1.5 px-2 text-center rounded-lg text-xs transition-all border font-medium ${
                  (style.entranceAnimation || 'none') === anim.id
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold shadow-sm shadow-emerald-500/20 ring-1 ring-emerald-500/40'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {anim.label}
              </button>
            ))}
          </div>
        </div>

        {/* Exit Animation Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-300 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3 text-rose-400" />
              Exit Animation (Out)
            </span>
            <span className="text-[10px] text-zinc-500 font-mono capitalize">
              {style.exitAnimation || 'none'}
            </span>
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                { id: 'none', label: 'None' },
                { id: 'slide-up', label: '⬆️ Slide Up' },
                { id: 'slide-down', label: '⬇️ Slide Down' },
                { id: 'slide-left', label: '⬅️ Slide Left' },
                { id: 'slide-right', label: '➡️ Slide Right' },
                { id: 'fade-out', label: '🌫️ Fade Out' },
                { id: 'pop', label: '💥 Shrink' },
                { id: 'blur-out', label: '💨 Blur Out' },
              ] as { id: ExitAnimation; label: string }[]
            ).map((anim) => (
              <button
                key={anim.id}
                type="button"
                id={`exit-anim-${anim.id}`}
                onClick={() => {
                  update({ exitAnimation: anim.id });
                  setPreviewAnimKey((k) => k + 1);
                }}
                className={`py-1.5 px-2 text-center rounded-lg text-xs transition-all border font-medium ${
                  (style.exitAnimation || 'none') === anim.id
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300 font-bold shadow-sm shadow-rose-500/20 ring-1 ring-rose-500/40'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {anim.label}
              </button>
            ))}
          </div>
        </div>

        {/* Animation Duration Slider */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300">
            <span>Motion Duration</span>
            <span className="font-mono text-indigo-400 font-bold">
              {style.animationDurationMs || 250} ms
            </span>
          </div>
          <input
            type="range"
            min={100}
            max={750}
            step={25}
            value={style.animationDurationMs || 250}
            onChange={(e) => {
              update({ animationDurationMs: Number(e.target.value) });
              setPreviewAnimKey((k) => k + 1);
            }}
            className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
          <div className="flex items-center justify-between gap-1.5 pt-1">
            {[
              { ms: 150, label: '⚡ Snappy (150ms)' },
              { ms: 250, label: '✨ Balanced (250ms)' },
              { ms: 400, label: '🎬 Cinematic (400ms)' },
            ].map((p) => (
              <button
                key={p.ms}
                type="button"
                onClick={() => {
                  update({ animationDurationMs: p.ms });
                  setPreviewAnimKey((k) => k + 1);
                }}
                className={`flex-1 py-1 px-1.5 text-[10px] rounded-lg border font-medium transition-all ${
                  (style.animationDurationMs || 250) === p.ms
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold'
                    : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Easing Curve Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-300 mb-1.5">
            Motion Easing Curve
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {(
              [
                { id: 'ease-out', label: 'Smooth' },
                { id: 'spring', label: 'Spring' },
                { id: 'bounce', label: 'Bounce' },
                { id: 'ease-in-out', label: 'Natural' },
                { id: 'linear', label: 'Linear' },
              ] as { id: AnimationEasing; label: string }[]
            ).map((ease) => (
              <button
                key={ease.id}
                type="button"
                id={`easing-${ease.id}`}
                onClick={() => {
                  update({ animationEasing: ease.id });
                  setPreviewAnimKey((k) => k + 1);
                }}
                className={`py-1 text-center rounded-lg text-[11px] transition-all border font-medium ${
                  (style.animationEasing || 'ease-out') === ease.id
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold ring-1 ring-indigo-500/40'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                }`}
              >
                {ease.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )}
</div>

{/* Drawer 3: Shadow & Background Box */}
<div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 overflow-hidden transition-all shadow-xs">
  <button
    type="button"
    id="drawer-shadow-box-trigger"
    onClick={() => toggleSection('shadowBox')}
    className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
  >
    <div className="flex items-center gap-2.5">
      <Sun className="w-4 h-4 text-amber-500" />
      <div>
        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Shadow & Background Box</span>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal">Depth aura, contrast pill, backdrop opacity</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
        Shadow: {style.enableTextShadow !== false && style.shadowBlur > 0 ? 'On' : 'Off'} • Box: {style.showBackgroundBox ? 'On' : 'Off'}
      </span>
      {openSections.shadowBox ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
    </div>
  </button>

  {openSections.shadowBox && (
    <div className="p-4 border-t border-slate-100 dark:border-zinc-800 space-y-4">
      {/* Text Shadow & Depth Controls (Toggle + Intensity Slider) */}
      <div id="text-shadow-block" className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Text Shadow & Depth</span>
              <p className="text-[11px] text-zinc-400">Adds depth & readability on busy video backgrounds</p>
            </div>
          </div>

          <button
            type="button"
            id="toggle-text-shadow-switch"
            onClick={() => {
              const enabling = style.enableTextShadow === false || style.shadowBlur === 0;
              update({
                enableTextShadow: enabling,
                shadowBlur: enabling ? (style.shadowBlur > 0 ? style.shadowBlur : 8) : 0,
                shadowColor: style.shadowColor || 'rgba(0,0,0,0.85)',
                shadowOffsetX: enabling ? (style.shadowOffsetX || 2) : 0,
                shadowOffsetY: enabling ? (style.shadowOffsetY || 2) : 0,
              });
            }}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
              style.enableTextShadow !== false && style.shadowBlur > 0 ? 'bg-indigo-600' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                style.enableTextShadow !== false && style.shadowBlur > 0 ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {style.enableTextShadow !== false && (
          <div className="space-y-4 animate-in fade-in">
            {/* Primary Shadow Intensity Slider (Controls Opacity and Spread) */}
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-bold text-zinc-200">Shadow Intensity (Opacity & Spread)</span>
                </div>
                <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/30">
                  {style.shadowIntensity ?? (style.shadowBlur > 0 ? Math.min(100, Math.round((style.shadowBlur / 18) * 100)) : 80)}%
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Controls the opacity density and spread radius of the subtitle drop shadow
              </p>
              <input
                type="range"
                id="shadow-intensity-slider"
                min={0}
                max={100}
                step={1}
                value={style.shadowIntensity ?? (style.shadowBlur > 0 ? Math.min(100, Math.round((style.shadowBlur / 18) * 100)) : 80)}
                onChange={(e) => {
                  const intensity = Number(e.target.value);
                  const alpha = intensity / 100;
                  const updatedColor = adjustColorAlpha(style.shadowColor || '#000000', alpha);
                  const updatedBlur = Math.round((intensity / 100) * 22);
                  const updatedOffsetX = Math.round((intensity / 100) * 3);
                  const updatedOffsetY = Math.max(1, Math.round((intensity / 100) * 4));
                  update({
                    shadowIntensity: intensity,
                    shadowBlur: updatedBlur,
                    shadowColor: updatedColor,
                    shadowOffsetX: updatedOffsetX,
                    shadowOffsetY: updatedOffsetY,
                    enableTextShadow: intensity > 0,
                  });
                }}
                className="w-full accent-indigo-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
              />

              {/* Quick Intensity Preset Chips */}
              <div className="grid grid-cols-5 gap-1 pt-1">
                {[
                  { label: 'Off', val: 0 },
                  { label: 'Subtle', val: 30 },
                  { label: 'Medium', val: 60 },
                  { label: 'Strong', val: 85 },
                  { label: 'Max Spread', val: 100 },
                ].map((chip) => {
                  const activeInt = style.shadowIntensity ?? (style.shadowBlur > 0 ? Math.min(100, Math.round((style.shadowBlur / 18) * 100)) : 80);
                  const isChipActive = Math.abs(activeInt - chip.val) <= 10;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        const alpha = chip.val / 100;
                        const updatedColor = adjustColorAlpha(style.shadowColor || '#000000', alpha);
                        const updatedBlur = Math.round((chip.val / 100) * 22);
                        update({
                          shadowIntensity: chip.val,
                          shadowBlur: updatedBlur,
                          shadowColor: updatedColor,
                          enableTextShadow: chip.val > 0,
                        });
                      }}
                      className={`py-1 rounded text-[10px] font-bold border transition-all text-center ${
                        isChipActive
                          ? 'bg-indigo-600/25 border-indigo-500 text-indigo-300 font-bold'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Shadow Effect Swatch */}
            <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800/90 text-center space-y-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                Live Shadow Depth Preview
              </span>
              <div
                className="py-2.5 px-4 rounded-lg inline-block text-sm font-black tracking-wider transition-all select-none"
                style={{
                  fontFamily: style.fontFamily,
                  color: style.textColor || '#FFFFFF',
                  textShadow: `${style.shadowOffsetX || 2}px ${style.shadowOffsetY || 2}px ${style.shadowBlur || 8}px ${style.shadowColor || 'rgba(0,0,0,0.85)'}`,
                }}
              >
                PREVIEW SHADOW DEPTH & SPREAD
              </div>
            </div>

            {/* Fine-Tuning: Spread Blur & Offsets */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mb-1">
                  <span>Spread / Blur Radius</span>
                  <span className="font-mono text-indigo-400 font-bold">{style.shadowBlur || 0}px</span>
                </div>
                <input
                  type="range"
                  id="shadow-blur-slider"
                  min={0}
                  max={35}
                  step={1}
                  value={style.shadowBlur || 0}
                  onChange={(e) => update({ shadowBlur: Number(e.target.value), enableTextShadow: Number(e.target.value) > 0 })}
                  className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mb-1">
                  <span>Vertical Offset (Y)</span>
                  <span className="font-mono text-indigo-400 font-bold">{style.shadowOffsetY || 0}px</span>
                </div>
                <input
                  type="range"
                  min={-10}
                  max={15}
                  step={1}
                  value={style.shadowOffsetY || 0}
                  onChange={(e) => update({ shadowOffsetY: Number(e.target.value) })}
                  className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Shadow Presets */}
            <div>
              <span className="block text-[10px] text-zinc-500 mb-1.5 font-medium">Depth Presets:</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Subtle Depth', blur: 6, x: 1, y: 1, color: 'rgba(0,0,0,0.75)', intensity: 40 },
                  { label: 'Hard Shadow', blur: 0, x: 3, y: 3, color: '#000000', intensity: 80 },
                  { label: 'Cinematic Glow', blur: 18, x: 0, y: 0, color: 'rgba(0,0,0,0.95)', intensity: 95 },
                  { label: 'Deep Drop', blur: 14, x: 3, y: 4, color: 'rgba(0,0,0,0.9)', intensity: 85 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      update({
                        enableTextShadow: true,
                        shadowBlur: preset.blur,
                        shadowOffsetX: preset.x,
                        shadowOffsetY: preset.y,
                        shadowColor: preset.color,
                        shadowIntensity: preset.intensity,
                      })
                    }
                    className="py-1 px-1 rounded-lg text-[10px] font-bold bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all text-center"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shadow Color & Offset X */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Shadow Color
                </label>
                <div className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-lg border border-zinc-800">
                  <input
                    type="color"
                    value={style.shadowColor && style.shadowColor.startsWith('#') ? style.shadowColor : '#000000'}
                    onChange={(e) => update({ shadowColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={style.shadowColor || '#000000'}
                    onChange={(e) => update({ shadowColor: e.target.value })}
                    className="w-full bg-transparent text-[11px] font-mono text-white focus:outline-none uppercase font-bold"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mb-1">
                  <span>Horizontal Offset (X)</span>
                  <span className="font-mono text-indigo-400 font-bold">{style.shadowOffsetX || 0}px</span>
                </div>
                <input
                  type="range"
                  min={-10}
                  max={15}
                  step={1}
                  value={style.shadowOffsetX || 0}
                  onChange={(e) => update({ shadowOffsetX: Number(e.target.value) })}
                  className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Background Highlight Pill / Container */}
      <div id="background-box-block" className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-800 dark:text-white">Background Highlight Pill</span>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">High-contrast solid container behind subtitle</p>
          </div>
          <button
            type="button"
            id="toggle-background-box-switch"
            onClick={() => update({ showBackgroundBox: !style.showBackgroundBox })}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              style.showBackgroundBox ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-zinc-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                style.showBackgroundBox ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {style.showBackgroundBox && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                  <span>Opacity</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(style.backgroundOpacity * 100)}
                      onChange={(e) => update({ backgroundOpacity: Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100 })}
                      className="w-12 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded px-1 py-0.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-bold text-right focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={style.backgroundOpacity}
                  onChange={(e) => update({ backgroundOpacity: Number(e.target.value) })}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                  Box Background Color
                </label>
                <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800">
                  <input
                    type="color"
                    value={style.backgroundColor || '#000000'}
                    onChange={(e) => update({ backgroundColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 shrink-0"
                  />
                  <input
                    type="text"
                    value={style.backgroundColor || '#000000'}
                    onChange={(e) => update({ backgroundColor: e.target.value })}
                    className="w-full bg-transparent text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none uppercase font-bold"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                Box Corner Radius
              </label>
              <select
                value={style.backgroundBorderRadius}
                onChange={(e) => update({ backgroundBorderRadius: Number(e.target.value) })}
                className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={4} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Subtle (4px)</option>
                <option value={10} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Rounded (10px)</option>
                <option value={24} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Pill Shape (24px)</option>
                <option value={0} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Sharp (0px)</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )}
</div>

{/* Drawer 4: Layout, Pacing & Safe Margins */}
<div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 overflow-hidden transition-all shadow-xs">
  <button
    type="button"
    id="drawer-position-trigger"
    onClick={() => toggleSection('position')}
    className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
  >
    <div className="flex items-center gap-2.5">
      <Move className="w-4 h-4 text-indigo-500" />
      <div>
        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Layout, Pacing & Safe Margins</span>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal">Position coordinates, 1-line pacing, TikTok zones</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
        Y: {style.yOffsetPercent ?? 85}% • {style.maxLines ? `Max ${style.maxLines}L` : 'Auto'}
      </span>
      {openSections.position ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
    </div>
  </button>

  {openSections.position && (
    <div className="p-4 border-t border-slate-100 dark:border-zinc-800 space-y-4">
      {/* Subtitle Pacing, Max Lines (1-Line Mode), & Pacing Options */}
      <div id="subtitle-pacing-block" className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <span>Subtitle Pacing & Max Lines (1-Line Mode)</span>
          </div>
          <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-semibold">
            9:16 & 1:1 Optimized
          </span>
        </div>

        {/* Max Lines Per Subtitle Setting (Single Line Enforcement) */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-2">
            Max Lines Per Subtitle (Prevent Stacking)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: 1,
                title: '⚡ Max 1 Line (Strict)',
                desc: 'Never wraps to 2nd line. Ideal for TikTok/Reels',
              },
              {
                id: 2,
                title: '💬 Max 2 Lines',
                desc: 'Standard compact 2-line layout',
              },
              {
                id: 0,
                title: '📄 Auto / Full',
                desc: 'Multi-line sentence display',
              },
            ].map((opt) => {
              const isSelected = (style.maxLines === opt.id) || (opt.id === 0 && !style.maxLines);
              return (
                <button
                  key={opt.id}
                  type="button"
                  id={`max-lines-btn-${opt.id}`}
                  onClick={() => {
                    update({
                      maxLines: opt.id === 0 ? undefined : opt.id,
                      displayMode: opt.id === 1 ? 'chunked-3-words' : style.displayMode,
                      maxWordsPerSegment: opt.id === 1 ? Math.min(style.maxWordsPerSegment || 4, 3) : style.maxWordsPerSegment,
                    });
                  }}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/10 ring-1 ring-indigo-500/50'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className={`text-xs font-bold ${isSelected ? 'text-indigo-300' : 'text-zinc-300'}`}>
                    {opt.title}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Display Pacing Options */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-2">
            Pacing / Word Clustering
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: 'chunked-3-words',
                title: '⚡ Dynamic 3-4 Words',
                desc: 'Reels & TikTok viral style',
              },
              {
                id: 'full-sentence',
                title: '💬 Full Sentence',
                desc: 'Auto-fitted to compact lines',
              },
              {
                id: 'single-word',
                title: '🎯 1-Word Pop',
                desc: 'High energy flash retention',
              },
            ].map((mode) => {
              const isSelected = (style.displayMode || 'chunked-3-words') === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => update({ displayMode: mode.id as DisplayMode })}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className={`text-xs font-bold ${isSelected ? 'text-indigo-300' : 'text-zinc-300'}`}>
                    {mode.title}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">
                    {mode.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Words per segment slider (if chunked mode active) */}
        {(style.displayMode === 'chunked-3-words' || !style.displayMode) && (
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mb-1">
              <span>Words Per Cue (Chunk Size)</span>
              <span className="text-[11px] font-mono text-indigo-400 font-bold">
                {style.maxWordsPerSegment || 4} words
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={8}
              step={1}
              value={style.maxWordsPerSegment || 4}
              onChange={(e) => update({ maxWordsPerSegment: Number(e.target.value) })}
              className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-500 font-mono pt-1">
              <span>2 words (Rapid single line)</span>
              <span>4 words (Reels standard)</span>
              <span>8 words (Long)</span>
            </div>
          </div>
        )}
      </div>

      {/* Subtitle Positioning UI Block */}
      <div id="subtitle-positioning-block" className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
            <Move className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span>Subtitle Positioning</span>
          </div>

          <button
            type="button"
            onClick={() => update({ xOffsetPercent: 0, yOffsetPercent: 72, positionPreset: 'tiktok-safe' })}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-zinc-400 hover:text-white bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors"
            title="Reset position to center TikTok safe zone"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Position</span>
          </button>
        </div>

        {/* 4-Directional Movement Buttons: Up / Down / Left / Right */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-2">
            Adjust Coordinates (Top, Bottom, Left, Right)
          </label>
          <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
            {/* D-Pad 4-way Nudge Controls */}
            <div className="relative h-28 flex items-center justify-center">
              {/* TOP / UP */}
              <button
                type="button"
                id="nudge-subtitle-top"
                onClick={() => update({ yOffsetPercent: Math.max(5, (style.yOffsetPercent ?? 72) - 3), positionPreset: 'custom' })}
                className="absolute top-0 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-indigo-600 border border-zinc-700 hover:border-indigo-500 text-zinc-200 hover:text-white flex items-center gap-1 shadow transition-all active:scale-95 text-[10px] font-bold"
                title="Move Subtitle Up / Top (-3%)"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Top</span>
              </button>

              {/* BOTTOM / DOWN */}
              <button
                type="button"
                id="nudge-subtitle-bottom"
                onClick={() => update({ yOffsetPercent: Math.min(95, (style.yOffsetPercent ?? 72) + 3), positionPreset: 'custom' })}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-indigo-600 border border-zinc-700 hover:border-indigo-500 text-zinc-200 hover:text-white flex items-center gap-1 shadow transition-all active:scale-95 text-[10px] font-bold"
                title="Move Subtitle Down / Bottom (+3%)"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Bottom</span>
              </button>

              {/* LEFT */}
              <button
                type="button"
                id="nudge-subtitle-left"
                onClick={() => update({ xOffsetPercent: Math.max(-45, (style.xOffsetPercent ?? 0) - 3) })}
                className="absolute left-0 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-zinc-900 hover:bg-indigo-600 border border-zinc-700 hover:border-indigo-500 text-zinc-200 hover:text-white flex items-center gap-1 shadow transition-all active:scale-95 text-[10px] font-bold"
                title="Move Subtitle Left (-3%)"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Left</span>
              </button>

              {/* RIGHT */}
              <button
                type="button"
                id="nudge-subtitle-right"
                onClick={() => update({ xOffsetPercent: Math.min(45, (style.xOffsetPercent ?? 0) + 3) })}
                className="absolute right-0 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-zinc-900 hover:bg-indigo-600 border border-zinc-700 hover:border-indigo-500 text-zinc-200 hover:text-white flex items-center gap-1 shadow transition-all active:scale-95 text-[10px] font-bold"
                title="Move Subtitle Right (+3%)"
              >
                <span>Right</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Center point */}
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-mono text-zinc-400">
                <Move className="w-3 h-3 text-indigo-400" />
              </div>
            </div>

            {/* Coordinates readouts and quick reset buttons */}
            <div className="flex flex-col justify-center space-y-2 pl-2 border-l border-zinc-800">
              <div className="space-y-1">
                <div className="text-[11px] font-mono flex items-center justify-between text-zinc-400">
                  <span>X Coordinate:</span>
                  <strong className="text-indigo-300 font-bold">{style.xOffsetPercent > 0 ? `+${style.xOffsetPercent}` : style.xOffsetPercent}%</strong>
                </div>
                <div className="text-[11px] font-mono flex items-center justify-between text-zinc-400">
                  <span>Y Coordinate:</span>
                  <strong className="text-indigo-300 font-bold">{style.yOffsetPercent}%</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => update({ xOffsetPercent: 0 })}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300 font-semibold text-center"
                >
                  Center X
                </button>
                <button
                  type="button"
                  onClick={() => update({ yOffsetPercent: 50, positionPreset: 'middle' })}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300 font-semibold text-center"
                >
                  Center Y
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Position Presets */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
            Vertical Position Presets
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'top', label: 'Top (15%)', y: 15 },
              { id: 'middle', label: 'Center (50%)', y: 50 },
              { id: 'tiktok-safe', label: 'TikTok Safe (72%)', y: 72 },
              { id: 'bottom', label: 'Bottom (82%)', y: 82 },
            ].map((pos) => (
              <button
                key={pos.id}
                type="button"
                onClick={() => update({ positionPreset: pos.id as any, yOffsetPercent: pos.y })}
                className={`py-2 px-1 text-[11px] font-medium rounded-lg text-center transition-all ${
                  style.yOffsetPercent === pos.y
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Y-Offset Slider (Vertical Up/Down) */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mb-1">
            <span className="flex items-center gap-1.5">
              <MoveVertical className="w-3.5 h-3.5 text-indigo-400" />
              <span>Vertical Position (Up / Down)</span>
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={5}
                max={95}
                value={style.yOffsetPercent}
                onChange={(e) => update({ yOffsetPercent: Math.max(5, Math.min(95, Number(e.target.value) || 50)), positionPreset: 'custom' })}
                className="w-12 bg-zinc-950 border border-zinc-700 rounded px-1 py-0.5 text-[11px] text-indigo-400 font-mono font-bold text-right focus:outline-none"
              />
              <span className="text-[10px] text-zinc-500 font-mono">%</span>
            </div>
          </div>
          <input
            type="range"
            min={5}
            max={95}
            step={1}
            value={style.yOffsetPercent}
            onChange={(e) => update({ yOffsetPercent: Number(e.target.value), positionPreset: 'custom' })}
            className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Custom X-Offset Slider (Horizontal Left/Right) */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mb-1">
            <span className="flex items-center gap-1.5">
              <MoveHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Horizontal Position (Left / Right)</span>
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={-45}
                max={45}
                value={style.xOffsetPercent ?? 0}
                onChange={(e) => update({ xOffsetPercent: Math.max(-45, Math.min(45, Number(e.target.value) || 0)) })}
                className="w-12 bg-zinc-950 border border-zinc-700 rounded px-1 py-0.5 text-[11px] text-indigo-400 font-mono font-bold text-right focus:outline-none"
              />
              <span className="text-[10px] text-zinc-500 font-mono">%</span>
            </div>
          </div>
          <input
            type="range"
            min={-45}
            max={45}
            step={1}
            value={style.xOffsetPercent ?? 0}
            onChange={(e) => update({ xOffsetPercent: Number(e.target.value) })}
            className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-zinc-500 font-mono pt-1">
            <span>← Left (-45%)</span>
            <span>Center (0%)</span>
            <span>Right (+45%) →</span>
          </div>
        </div>

        {/* Subtitle Max Width & Wrapping Limit */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mb-1">
            <span>Subtitle Max Width (No Overflow)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={50}
                max={96}
                value={style.maxWidthPercent || 88}
                onChange={(e) => update({ maxWidthPercent: Math.max(50, Math.min(96, Number(e.target.value) || 88)) })}
                className="w-12 bg-zinc-950 border border-zinc-700 rounded px-1 py-0.5 text-[11px] text-indigo-400 font-mono font-bold text-right focus:outline-none"
              />
              <span className="text-[10px] text-zinc-500 font-mono">%</span>
            </div>
          </div>
          <input
            type="range"
            min={50}
            max={96}
            step={2}
            value={style.maxWidthPercent || 88}
            onChange={(e) => update({ maxWidthPercent: Number(e.target.value) })}
            className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Dual Subtitles (Bilingual Captions) Section */}
      <div className="p-4 rounded-xl bg-zinc-900/90 border border-indigo-500/30 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
            <Languages className="w-4 h-4 text-indigo-400" />
            <span>Dual Subtitles (Bilingual Display)</span>
          </div>

          <button
            type="button"
            id="toggle-dual-captions-switch"
            onClick={() => update({ dualCaptionEnabled: !style.dualCaptionEnabled })}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              style.dualCaptionEnabled ? 'bg-indigo-600' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                style.dualCaptionEnabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Display two synchronized language tracks simultaneously (e.g. English primary audio line + Spanish/Japanese translation below or above).
        </p>

        {style.dualCaptionEnabled && (
          <div className="space-y-3 pt-1 animate-in fade-in">
            {/* Secondary Text Color & Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
                  Secondary Text Color
                </label>
                <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                  <input
                    type="color"
                    value={style.secondaryTextColor || '#93C5FD'}
                    onChange={(e) => update({ secondaryTextColor: e.target.value })}
                    className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={style.secondaryTextColor || '#93C5FD'}
                    onChange={(e) => update({ secondaryTextColor: e.target.value })}
                    className="w-full bg-transparent text-xs font-mono text-white focus:outline-none uppercase font-bold"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mb-1.5">
                  <span>Secondary Font Size</span>
                  <span className="text-[11px] font-mono text-indigo-400 font-bold">
                    {style.secondaryFontSize || Math.round(style.fontSize * 0.72)}px
                  </span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={48}
                  step={1}
                  value={style.secondaryFontSize || Math.round(style.fontSize * 0.72)}
                  onChange={(e) => update({ secondaryFontSize: Number(e.target.value) })}
                  className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer mt-2"
                />
              </div>
            </div>

            {/* Layout Order: Primary top or Secondary top */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
                Track Stacking Order
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => update({ dualCaptionLayout: 'primary-top' })}
                  className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
                    style.dualCaptionLayout !== 'secondary-top'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-white">Original Top / Translation Below</div>
                  <div className="text-[10px] text-zinc-400 font-normal">Standard bilingual film format</div>
                </button>

                <button
                  type="button"
                  onClick={() => update({ dualCaptionLayout: 'secondary-top' })}
                  className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
                    style.dualCaptionLayout === 'secondary-top'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-white">Translation Top / Original Below</div>
                  <div className="text-[10px] text-zinc-400 font-normal">Language learning format</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )}
</div>

{/* Drawer 5: Audio Sync Calibration */}
<div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 overflow-hidden transition-all shadow-xs">
  <button
    type="button"
    id="drawer-audiosync-trigger"
    onClick={() => toggleSection('audioSync')}
    className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
  >
    <div className="flex items-center gap-2.5">
      <Clock className="w-4 h-4 text-indigo-500" />
      <div>
        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Audio Sync Calibration</span>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal">Real-time latency offset, fine millisecond nudges</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
        {(style.audioSyncOffsetMs || 0) > 0 ? `+${style.audioSyncOffsetMs}ms` : `${style.audioSyncOffsetMs || 0}ms`}
      </span>
      {openSections.audioSync ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
    </div>
  </button>

  {openSections.audioSync && (
    <div className="p-4 border-t border-slate-100 dark:border-zinc-800 space-y-4">
      {/* Audio Sync & Latency Calibration Section */}
      <div id="audio-sync-calibration-block" className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-indigo-500/40 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-indigo-300 uppercase tracking-wider">
            <Volume2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span>Audio & Caption Sync Calibration</span>
          </div>

          <button
            type="button"
            onClick={() => update({ audioSyncOffsetMs: 0 })}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 rounded-lg transition-colors"
            title="Reset sync offset to 0ms"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset (0ms)</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
          Fine-tune the exact microsecond delay between spoken audio and caption highlights.
          Adjust forward if subtitles appear late, or backward if subtitles trigger before speech.
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>Real-time Audio Offset</span>
            </span>
            <div className="flex items-center gap-1">
              <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                (style.audioSyncOffsetMs || 0) === 0
                  ? 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                  : (style.audioSyncOffsetMs || 0) > 0
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                  : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
              }`}>
                {(style.audioSyncOffsetMs || 0) > 0 ? `+${style.audioSyncOffsetMs}ms` : `${style.audioSyncOffsetMs || 0}ms`}
              </span>
            </div>
          </div>

          <input
            type="range"
            min={-1000}
            max={1000}
            step={25}
            value={style.audioSyncOffsetMs || 0}
            onChange={(e) => update({ audioSyncOffsetMs: Number(e.target.value) })}
            className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-500 dark:text-zinc-500 font-mono">
            <span>-1000ms (Subtitle Delay)</span>
            <span>0ms (Exact)</span>
            <span>+1000ms (Subtitle Earlier)</span>
          </div>

          {/* Quick Nudge Buttons */}
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {[-200, -100, 0, 100, 200].map((offsetVal) => (
              <button
                key={offsetVal}
                type="button"
                onClick={() => update({ audioSyncOffsetMs: offsetVal })}
                className={`py-1.5 rounded-lg text-[11px] font-mono font-bold border transition-all ${
                  (style.audioSyncOffsetMs || 0) === offsetVal
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800'
                }`}
              >
                {offsetVal > 0 ? `+${offsetVal}ms` : offsetVal === 0 ? '0' : `${offsetVal}ms`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )}
</div>
      </div>
    </div>
  );
};
