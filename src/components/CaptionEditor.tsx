import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Split,
  Combine,
  Search,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Play,
  Wand2,
  ArrowRight,
  RotateCcw,
  RotateCw,
  Globe,
  Replace,
  CheckCheck,
  SpellCheck,
  AlertCircle,
  Check,
  SlidersHorizontal,
  Loader2,
  X,
  CaseSensitive,
  Languages,
  ArrowLeftRight,
  Magnet,
  Volume2,
  Zap,
  Type,
  Bold,
  Italic,
  CheckSquare,
  Square,
  Paintbrush,
  Palette,
  CheckCircle2,
  Wrench,
  MoreHorizontal,
  Captions,
  Flame,
} from 'lucide-react';
import { Caption, CaptionStyleOverride } from '../types';
import { formatTime, parseTimeToSeconds } from '../utils/time';
import { generateWordTimestampsForText } from '../utils/srtParser';
import {
  SUPPORTED_TRANSLATION_LANGUAGES,
  TargetLanguage,
  translateSingleLine,
} from '../utils/translationService';
import {
  cleanAndCorrectText,
  COMMON_TYPOS,
  SpellcheckOptions,
} from '../utils/spellcheck';
import {
  SnapToAudioOptions,
  calculateAdaptiveSilenceThreshold,
  detectAudioSilenceIntervals,
  realignWordTimestamps,
} from '../utils/audioSnapping';
import { ClearCaptionsModal } from './ClearCaptionsModal';

interface CaptionEditorProps {
  captions: Caption[];
  currentTime: number;
  duration?: number;
  waveformPeaks?: number[];
  onSeek: (seconds: number) => void;
  onUpdateCaption: (id: string, updated: Partial<Caption>) => void;
  onAddCaption: (start?: number) => void;
  onDeleteCaption: (id: string) => void;
  onDuplicateCaption: (id: string) => void;
  onSplitCaption: (id: string) => void;
  onMergeCaption: (index: number) => void;
  onShiftAllTimestamps: (seconds: number) => void;
  onSnapCaptionToAudio?: (id: string) => void;
  onSnapAllToAudio?: (options?: SnapToAudioOptions) => void;
  onBatchUpdateCaptions?: (ids: string[], updates: Partial<Caption>) => void;
  onBatchDeleteCaptions?: (ids: string[]) => void;
  onBatchSnapToAudio?: (ids: string[]) => void;
  bulkSnapProgress?: { currentCaptionId: string; index: number; total: number } | null;
  onBulkReplace: (
    findText: string,
    replaceText: string,
    options: { matchCase: boolean; wholeWord: boolean }
  ) => { replacedCount: number; affectedCaptions: number };
  onAutoFixCaptions: (options?: SpellcheckOptions) => { totalFixesCount: number };
  onHighlightKeywords?: () => void;
  onBulkTranslate: (targetLangCode: string) => Promise<void>;
  onGenerateDualCaptions?: (targetLangCode: string) => Promise<void>;
  onSwapDualCaptions?: () => void;
  onClearSecondaryCaptions?: () => void;
  onClearAllCaptions?: () => void;
  onSplitAllIntoSingleLineCues?: (maxWords?: number) => void;
  dualCaptionEnabled?: boolean;
  isGeneratingDual?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenTranscribeModal: () => void;
  onOpenTemplatesModal?: () => void;
  onSelectPresetStyle?: () => void;
  isTranslating?: boolean;
  translationProgress?: { percent: number; status: string };
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

export const CaptionEditor: React.FC<CaptionEditorProps> = ({
  captions,
  currentTime,
  duration = 15,
  waveformPeaks,
  onSeek,
  onUpdateCaption,
  onAddCaption,
  onDeleteCaption,
  onDuplicateCaption,
  onSplitCaption,
  onMergeCaption,
  onShiftAllTimestamps,
  onSnapCaptionToAudio,
  onSnapAllToAudio,
  onBatchUpdateCaptions,
  onBatchDeleteCaptions,
  onBatchSnapToAudio,
  bulkSnapProgress,
  onBulkReplace,
  onAutoFixCaptions,
  onHighlightKeywords,
  onBulkTranslate,
  onGenerateDualCaptions,
  onSwapDualCaptions,
  onClearSecondaryCaptions,
  onClearAllCaptions,
  onSplitAllIntoSingleLineCues,
  dualCaptionEnabled = false,
  isGeneratingDual = false,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenTranscribeModal,
  onOpenTemplatesModal,
  onSelectPresetStyle,
  isTranslating = false,
  translationProgress,
  searchQuery: externalSearchQuery,
  onSearchQueryChange,
}) => {
  // Clear all modal state
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Batch-Edit Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Tools Dropdown Menu State
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  // Close tools dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setIsToolsMenuOpen(false);
      }
    };
    if (isToolsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isToolsMenuOpen]);

  // Active per-card menu dropdown state
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleWindowClick = () => {
      setOpenCardMenuId(null);
    };
    if (openCardMenuId) {
      window.addEventListener('click', handleWindowClick);
    }
    return () => {
      window.removeEventListener('click', handleWindowClick);
    };
  }, [openCardMenuId]);

  // Search & Replace / Secondary Tools State
  const [activeTool, setActiveTool] = useState<'none' | 'search-replace' | 'translate' | 'spellcheck' | 'dual-captions' | 'snap-audio'>('none');
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = (val: string) => {
    if (onSearchQueryChange) {
      onSearchQueryChange(val);
    } else {
      setInternalSearchQuery(val);
    }
  };
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  // Snap to Audio options
  const [snapRadiusSec, setSnapRadiusSec] = useState('0.45');

  // Translation State
  const [selectedLang, setSelectedLang] = useState('es');
  const [selectedDualLang, setSelectedDualLang] = useState('es');
  const [translatingLineIds, setTranslatingLineIds] = useState<Record<string, boolean>>({});

  // Spell-check options
  const [spellOptions, setSpellOptions] = useState<SpellcheckOptions>({
    fixCapitalization: true,
    fixContractions: true,
    fixCommonTypos: true,
    removeStutters: true,
  });
  const [liveSpellCheckEnabled, setLiveSpellCheckEnabled] = useState(true);

  // Time Shift state
  const [shiftValue, setShiftValue] = useState('0.5');

  // Word Timestamps drawer expansion
  const [expandedWordIds, setExpandedWordIds] = useState<Record<string, boolean>>({});

  // Filtered captions for basic list search
  const filteredCaptions = useMemo(() => {
    if (!searchQuery.trim()) return captions;
    return captions.filter((c) => {
      const primaryMatch = matchCase
        ? c.text.includes(searchQuery)
        : c.text.toLowerCase().includes(searchQuery.toLowerCase());
      const secondaryMatch = c.secondaryText
        ? matchCase
          ? c.secondaryText.includes(searchQuery)
          : c.secondaryText.toLowerCase().includes(searchQuery.toLowerCase())
        : false;
      return primaryMatch || secondaryMatch;
    });
  }, [captions, searchQuery, matchCase]);

  // Search matches count calculation
  const searchMatchesInfo = useMemo(() => {
    if (!searchQuery.trim()) return { totalMatches: 0, matchingCaptions: 0 };

    let totalMatches = 0;
    let matchingCaptions = 0;

    const regexFlags = matchCase ? 'g' : 'gi';
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;

    try {
      const regex = new RegExp(pattern, regexFlags);
      captions.forEach((c) => {
        const matches = c.text.match(regex);
        const secMatches = c.secondaryText ? c.secondaryText.match(regex) : null;
        const count = (matches?.length || 0) + (secMatches?.length || 0);
        if (count > 0) {
          totalMatches += count;
          matchingCaptions += 1;
        }
      });
    } catch {
      // ignore invalid regex
    }

    return { totalMatches, matchingCaptions };
  }, [captions, searchQuery, matchCase, wholeWord]);

  // Batch Selection helpers
  const handleToggleSelectCaption = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredCaptions.length && filteredCaptions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCaptions.map((c) => c.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleApplyBatchOverride = (overrideUpdate: Partial<CaptionStyleOverride>) => {
    if (selectedIds.size === 0) return;
    const targetIds = Array.from(selectedIds);
    if (onBatchUpdateCaptions) {
      onBatchUpdateCaptions(targetIds, {
        styleOverride: overrideUpdate,
      });
    } else {
      targetIds.forEach((id) => {
        const cap = captions.find((c) => c.id === id);
        if (cap) {
          onUpdateCaption(id, {
            styleOverride: {
              ...(cap.styleOverride || {}),
              ...overrideUpdate,
            },
          });
        }
      });
    }
  };

  const handleBatchToggleBold = () => {
    const selectedCaps = captions.filter((c) => selectedIds.has(c.id));
    const allBold =
      selectedCaps.length > 0 &&
      selectedCaps.every(
        (c) => c.styleOverride?.fontWeight === 'bold' || c.styleOverride?.isBold || c.isBold
      );
    const newBold = !allBold;
    handleApplyBatchOverride({
      fontWeight: newBold ? 'bold' : 'normal',
      isBold: newBold,
    });
  };

  const handleBatchToggleItalic = () => {
    const selectedCaps = captions.filter((c) => selectedIds.has(c.id));
    const allItalic =
      selectedCaps.length > 0 &&
      selectedCaps.every(
        (c) => c.styleOverride?.fontStyle === 'italic' || c.styleOverride?.isItalic || c.isItalic
      );
    const newItalic = !allItalic;
    handleApplyBatchOverride({
      fontStyle: newItalic ? 'italic' : 'normal',
      isItalic: newItalic,
    });
  };

  const handleBatchChangeCase = (type: 'upper' | 'lower' | 'title') => {
    const targetIds = Array.from(selectedIds);
    targetIds.forEach((id) => {
      const cap = captions.find((c) => c.id === id);
      if (!cap) return;
      let newText = cap.text;
      if (type === 'upper') newText = cap.text.toUpperCase();
      else if (type === 'lower') newText = cap.text.toLowerCase();
      else if (type === 'title') {
        newText = cap.text.replace(
          /\w\S*/g,
          (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
        );
      }
      onUpdateCaption(id, { text: newText });
    });
  };

  const handleBatchResetOverrides = () => {
    const targetIds = Array.from(selectedIds);
    if (onBatchUpdateCaptions) {
      onBatchUpdateCaptions(targetIds, { styleOverride: undefined });
    } else {
      targetIds.forEach((id) => onUpdateCaption(id, { styleOverride: undefined }));
    }
  };

  const handleBatchDelete = () => {
    const targetIds = Array.from(selectedIds);
    if (onBatchDeleteCaptions) {
      onBatchDeleteCaptions(targetIds);
    } else {
      targetIds.forEach((id) => onDeleteCaption(id));
    }
    setSelectedIds(new Set());
  };

  const handleBatchSnap = () => {
    const targetIds = Array.from(selectedIds);
    if (onBatchSnapToAudio) {
      onBatchSnapToAudio(targetIds);
    } else if (onSnapCaptionToAudio) {
      targetIds.forEach((id) => onSnapCaptionToAudio(id));
    }
  };

  const toggleWordDrawer = (id: string) => {
    setExpandedWordIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTextChange = (caption: Caption, newText: string) => {
    const words = generateWordTimestampsForText(newText, caption.start, caption.end);
    onUpdateCaption(caption.id, { text: newText, words });
  };

  const handleSecondaryTextChange = (caption: Caption, newSecText: string) => {
    onUpdateCaption(caption.id, { secondaryText: newSecText });
  };

  // Translate a single line into secondary language
  const handleTranslateSingleLine = async (caption: Caption) => {
    if (!caption.text.trim()) return;
    setTranslatingLineIds((prev) => ({ ...prev, [caption.id]: true }));
    try {
      const translated = await translateSingleLine(caption.text, selectedDualLang);
      onUpdateCaption(caption.id, { secondaryText: translated });
    } catch (err) {
      console.warn('Single line translation error:', err);
    } finally {
      setTranslatingLineIds((prev) => ({ ...prev, [caption.id]: false }));
    }
  };

  const handleAdjustTime = (caption: Caption, field: 'start' | 'end', delta: number) => {
    const newVal = Math.max(0, Number((caption[field] + delta).toFixed(2)));
    if (field === 'start' && newVal >= caption.end) return;
    if (field === 'end' && newVal <= caption.start) return;

    const newStart = field === 'start' ? newVal : caption.start;
    const newEnd = field === 'end' ? newVal : caption.end;

    const words = caption.words && caption.words.length > 0
      ? realignWordTimestamps(caption.words, caption.start, caption.end, newStart, newEnd)
      : generateWordTimestampsForText(caption.text, newStart, newEnd);

    onUpdateCaption(caption.id, { [field]: newVal, words });
  };

  // Perform Replace All
  const handleExecuteReplaceAll = () => {
    if (!searchQuery) return;
    onBulkReplace(searchQuery, replaceQuery, { matchCase, wholeWord });
  };

  // Trigger 1-click Auto-Fix
  const handleExecuteAutoFix = () => {
    onAutoFixCaptions(spellOptions);
  };

  // Trigger Bulk Translation
  const handleExecuteTranslate = async () => {
    if (isTranslating) return;
    await onBulkTranslate(selectedLang);
  };

  // Trigger Bulk Dual Caption Generation
  const handleExecuteDualGenerate = async () => {
    if (isGeneratingDual || !onGenerateDualCaptions) return;
    await onGenerateDualCaptions(selectedDualLang);
  };

  return (
    <div id="caption-editor-container" className="flex flex-col h-full text-slate-900 dark:text-zinc-100">
      {/* Top Action Bar */}
      <div className="p-3 bg-white dark:bg-zinc-950/40 backdrop-blur-xl border-b border-slate-200 dark:border-white/[0.08] space-y-2.5">
        {/* Primary Controls Row */}
        <div className="flex items-center gap-2">
          {/* Add Caption Button */}
          <button
            type="button"
            id="add-caption-current-time-btn"
            onClick={() => onAddCaption(currentTime)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 active:scale-95 rounded-xl shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add at {formatTime(currentTime)}</span>
          </button>

          {/* AI Auto-Caption Trigger */}
          <button
            type="button"
            id="quick-ai-transcribe-btn"
            onClick={onOpenTranscribeModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl shadow-xs transition-all"
            title="Auto-Transcribe with Whisper / Groq / Deepgram AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">AI Transcribe</span>
          </button>

          {/* Tools Menu Dropdown */}
          <div className="relative" ref={toolsMenuRef}>
            <button
              type="button"
              id="caption-tools-dropdown-btn"
              onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-xl border transition-all ${
                isToolsMenuOpen || activeTool !== 'none' || dualCaptionEnabled
                  ? 'bg-slate-100 text-slate-900 border-slate-300 dark:bg-zinc-800 dark:text-white dark:border-zinc-700 shadow-xs'
                  : 'bg-white dark:bg-white/[0.05] text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/[0.1] border-slate-200 dark:border-white/[0.09]'
              }`}
              title="More subtitle tools & AI features"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span className="hidden sm:inline">Tools</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isToolsMenuOpen ? 'rotate-180' : ''}`} />
              {(activeTool !== 'none' || dualCaptionEnabled) && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              )}
            </button>

            {isToolsMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 space-y-1 text-xs">
                {/* Group 1: AI Polish */}
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  AI & Content Polish
                </div>

                {onHighlightKeywords && (
                  <button
                    type="button"
                    onClick={() => {
                      onHighlightKeywords();
                      setIsToolsMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-left rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium">AI Emojis & Bold Keywords</div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400">Add Reel-style power punch</div>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveTool(activeTool === 'spellcheck' ? 'none' : 'spellcheck');
                    setIsToolsMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 text-left rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                >
                  <SpellCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">Auto-Fix & Spellcheck</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400">Correct typos & remove stutters</div>
                  </div>
                </button>

                {onSplitAllIntoSingleLineCues && (
                  <button
                    type="button"
                    onClick={() => {
                      onSplitAllIntoSingleLineCues(3);
                      setIsToolsMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-left rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                  >
                    <Split className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium">1-Line Short Cues</div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400">Break into fast 3-word cues</div>
                    </div>
                  </button>
                )}

                {/* Group 2: Multilingual */}
                <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-zinc-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Languages
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTool(activeTool === 'dual-captions' ? 'none' : 'dual-captions');
                    setIsToolsMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 text-left rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                >
                  <Languages className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-1.5">
                      <span>Dual Subtitles Track</span>
                      {dualCaptionEnabled && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400">English + translated second line</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTool(activeTool === 'translate' ? 'none' : 'translate');
                    setIsToolsMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 text-left rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">Translate All Subtitles</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400">Bulk translate whole transcript</div>
                  </div>
                </button>

                {/* Group 3: Timing & Editing */}
                <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-zinc-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Search & Timing
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTool(activeTool === 'search-replace' ? 'none' : 'search-replace');
                    setIsToolsMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 text-left rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                >
                  <Replace className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium flex items-center justify-between">
                      <span>Search & Replace</span>
                      {searchMatchesInfo.totalMatches > 0 && (
                        <span className="px-1.5 py-0.2 text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 rounded-full font-mono">
                          {searchMatchesInfo.totalMatches}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400">Find and swap words across lines</div>
                  </div>
                </button>

                {onSnapAllToAudio && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool(activeTool === 'snap-audio' ? 'none' : 'snap-audio');
                      setIsToolsMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-left rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                  >
                    <Magnet className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium">Snap to Audio Silence</div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400">Align subtitle edges to audio gaps</div>
                    </div>
                  </button>
                )}

                {/* Shift Timestamps Row */}
                <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 flex items-center justify-between">
                  <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium">Shift Timestamps:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onShiftAllTimestamps(-0.5)}
                      className="px-2 py-0.5 bg-white hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded border border-slate-200 dark:border-zinc-700 font-mono text-[11px] font-bold"
                      title="Shift all 0.5s backward"
                    >
                      -0.5s
                    </button>
                    <button
                      type="button"
                      onClick={() => onShiftAllTimestamps(0.5)}
                      className="px-2 py-0.5 bg-white hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded border border-slate-200 dark:border-zinc-700 font-mono text-[11px] font-bold"
                      title="Shift all 0.5s forward"
                    >
                      +0.5s
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Undo / Redo Buttons */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200 dark:border-white/[0.08]">
            <button
              type="button"
              id="undo-captions-btn"
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1.5 rounded-lg transition-all ${
                canUndo
                  ? 'text-slate-700 dark:text-zinc-200 hover:text-slate-900 hover:bg-white dark:hover:bg-white/[0.08] active:scale-95'
                  : 'text-slate-400 dark:text-zinc-600 cursor-not-allowed'
              }`}
              title="Undo last caption edit (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              id="redo-captions-btn"
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded-lg transition-all ${
                canRedo
                  ? 'text-slate-700 dark:text-zinc-200 hover:text-slate-900 hover:bg-white dark:hover:bg-white/[0.08] active:scale-95'
                  : 'text-slate-400 dark:text-zinc-600 cursor-not-allowed'
              }`}
              title="Redo caption edit (Ctrl+Shift+Z or Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Clear All Captions Button */}
          <button
            type="button"
            id="editor-clear-all-captions-btn"
            onClick={() => setIsClearModalOpen(true)}
            disabled={captions.length === 0}
            className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-xl border transition-all ${
              captions.length === 0
                ? 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-white/[0.02] dark:border-white/[0.05] dark:text-zinc-600 cursor-not-allowed'
                : 'text-slate-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 bg-white hover:bg-rose-50 dark:bg-white/[0.04] dark:hover:bg-rose-950/20 border-slate-200 dark:border-white/[0.08] active:scale-95 shadow-xs'
            }`}
            title="Clear all captions from timeline"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear All</span>
          </button>
        </div>

        {/* Active Tool Dismissable Status Bar */}
        {activeTool !== 'none' && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-semibold">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span>
                Active Tool:{' '}
                {activeTool === 'search-replace' && 'Search & Replace'}
                {activeTool === 'translate' && 'Translate All Subtitles'}
                {activeTool === 'dual-captions' && 'Dual Language Subtitles'}
                {activeTool === 'spellcheck' && 'Auto-Fix & Spellcheck'}
                {activeTool === 'snap-audio' && 'Snap to Audio Silence'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTool('none')}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-950 dark:text-indigo-300 dark:hover:text-white px-2 py-0.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-1 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close Tool</span>
            </button>
          </div>
        )}

        {/* TOOL DRAWER: Dual Captions (English + Secondary Language) */}
        {activeTool === 'dual-captions' && (
          <div className="p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3 animate-in fade-in slide-in-from-top-1 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-zinc-100 pb-1.5 border-b border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
                <span>Dual Subtitles (English + Secondary Language)</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTool('none')}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              Show English primary audio subtitles along with a secondary translated line (Spanish, French, Japanese, etc.) at the same time.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-400 mb-1">
                  Secondary Target Language:
                </label>
                <select
                  value={selectedDualLang}
                  onChange={(e) => setSelectedDualLang(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 font-medium"
                >
                  {SUPPORTED_TRANSLATION_LANGUAGES.filter((l) => l.code !== 'en').map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                      {lang.flag} {lang.name} ({lang.nativeName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  id="generate-dual-captions-all-btn"
                  onClick={handleExecuteDualGenerate}
                  disabled={isGeneratingDual || captions.length === 0}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                    isGeneratingDual
                      ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white active:scale-95'
                  }`}
                >
                  {isGeneratingDual ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Dual Track...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto-Generate Dual ({captions.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Actions: Swap Languages & Clear Secondary */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-zinc-800">
              <button
                type="button"
                id="swap-dual-captions-btn"
                onClick={onSwapDualCaptions}
                disabled={captions.length === 0}
                className="flex-1 py-1 px-2.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all"
              >
                <ArrowLeftRight className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                <span>Swap English ↔ Secondary</span>
              </button>

              <button
                type="button"
                id="clear-secondary-captions-btn"
                onClick={onClearSecondaryCaptions}
                disabled={captions.length === 0}
                className="py-1 px-2.5 bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-500/30 text-slate-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove Dual</span>
              </button>
            </div>
          </div>
        )}

        {/* TOOL DRAWER 1: Search and Replace */}
        {activeTool === 'search-replace' && (
          <div className="p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2.5 animate-in fade-in slide-in-from-top-1 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-zinc-100 pb-1.5 border-b border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <Replace className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
                <span>Search & Replace across Subtitles</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTool('none')}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find word or phrase..."
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="relative">
                <Replace className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Replace with..."
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-zinc-400">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={matchCase}
                    onChange={(e) => setMatchCase(e.target.checked)}
                    className="rounded bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Match Case</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={wholeWord}
                    onChange={(e) => setWholeWord(e.target.checked)}
                    className="rounded bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Whole Words</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                {searchMatchesInfo.totalMatches > 0 && (
                  <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-mono">
                    {searchMatchesInfo.totalMatches} matches in {searchMatchesInfo.matchingCaptions} lines
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleExecuteReplaceAll}
                  disabled={!searchQuery || searchMatchesInfo.totalMatches === 0}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg shadow-xs transition-all ${
                    !searchQuery || searchMatchesInfo.totalMatches === 0
                      ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white active:scale-95'
                  }`}
                >
                  Replace All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOOL DRAWER 2: AI Multi-Language Translation */}
        {activeTool === 'translate' && (
          <div className="p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3 animate-in fade-in slide-in-from-top-1 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-zinc-100 pb-1.5 border-b border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
                <span>AI Subtitle Translation & Bilingual Tracks</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTool('none')}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              Translate your captions into any language. You can generate a <strong>Dual Bilingual track</strong> (keeps English and adds translation) or replace the primary text.
            </p>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-400 mb-1">
                  Target Translation Language:
                </label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 font-medium"
                >
                  {SUPPORTED_TRANSLATION_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                      {lang.flag} {lang.name} ({lang.nativeName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons for Dual Bilingual vs Replace */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  id="translate-dual-bilingual-btn"
                  onClick={async () => {
                    if (onGenerateDualCaptions) {
                      await onGenerateDualCaptions(selectedLang);
                    }
                  }}
                  disabled={isTranslating || isGeneratingDual || captions.length === 0}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                    isGeneratingDual
                      ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white active:scale-95'
                  }`}
                  title="Keeps original English audio subtitles and adds secondary translated line (Dual Subtitles)"
                >
                  {isGeneratingDual ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Dual Track...</span>
                    </>
                  ) : (
                    <>
                      <Languages className="w-3.5 h-3.5" />
                      <span>Dual Subtitles (Keep English)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="translate-replace-primary-btn"
                  onClick={handleExecuteTranslate}
                  disabled={isTranslating || isGeneratingDual || captions.length === 0}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                    isTranslating
                      ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-not-allowed'
                      : 'bg-white hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-900 dark:text-zinc-100 border border-slate-300 dark:border-zinc-700 active:scale-95'
                  }`}
                  title="Replaces all primary subtitle text with the translated language"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Translating Primary...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                      <span>Replace Primary Only</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Language Swapping Bar */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  id="translate-drawer-swap-btn"
                  onClick={onSwapDualCaptions}
                  disabled={captions.length === 0}
                  className="flex-1 py-1.5 px-2.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all"
                  title="Swap English text to bottom and translated text to top (or vice versa)"
                >
                  <ArrowLeftRight className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                  <span>Swap Primary ↔ Translated Text</span>
                </button>

                {onClearSecondaryCaptions && (
                  <button
                    type="button"
                    onClick={onClearSecondaryCaptions}
                    disabled={captions.length === 0}
                    className="py-1.5 px-2.5 bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-500/30 text-slate-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Dual</span>
                  </button>
                )}
              </div>
            </div>

            {/* Translation Progress Indicator */}
            {(isTranslating || isGeneratingDual) && translationProgress && (
              <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-700 dark:text-zinc-300 font-medium">{translationProgress.status}</span>
                  <span className="text-slate-900 dark:text-zinc-100 font-mono font-bold">{translationProgress.percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${translationProgress.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TOOL DRAWER 3: Spellcheck & Auto-Fix Typos */}
        {activeTool === 'spellcheck' && (
          <div className="p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3 animate-in fade-in slide-in-from-top-1 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-zinc-100 pb-1.5 border-b border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <SpellCheck className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
                <span>Spell-Check & Transcription Auto-Fixer</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTool('none')}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              Detects and automatically repairs common Whisper ASR misrecognitions, missing contraction apostrophes, sentence capitalization, and speech stutters.
            </p>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <label className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={spellOptions.fixCommonTypos}
                  onChange={(e) => setSpellOptions({ ...spellOptions, fixCommonTypos: e.target.checked })}
                  className="rounded bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Common typos (teh, recieve)</span>
              </label>

              <label className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={spellOptions.fixContractions}
                  onChange={(e) => setSpellOptions({ ...spellOptions, fixContractions: e.target.checked })}
                  className="rounded bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Contractions (dont → don't)</span>
              </label>

              <label className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={spellOptions.fixCapitalization}
                  onChange={(e) => setSpellOptions({ ...spellOptions, fixCapitalization: e.target.checked })}
                  className="rounded bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Sentence Capitalization & 'I'</span>
              </label>

              <label className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={spellOptions.removeStutters}
                  onChange={(e) => setSpellOptions({ ...spellOptions, removeStutters: e.target.checked })}
                  className="rounded bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Remove stutters (the the)</span>
              </label>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-zinc-800">
              <label className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={liveSpellCheckEnabled}
                  onChange={(e) => setLiveSpellCheckEnabled(e.target.checked)}
                  className="rounded bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-indigo-600 focus:ring-0 w-3 h-3"
                />
                <span>Live spell-check hints</span>
              </label>

              <button
                type="button"
                onClick={handleExecuteAutoFix}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs inline-flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Auto-Fix All Subtitles</span>
              </button>
            </div>
          </div>
        )}

        {/* TOOL DRAWER 4: Snap to Audio Silence Gaps */}
        {activeTool === 'snap-audio' && (
          <div className="p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3 animate-in fade-in slide-in-from-top-1 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-zinc-100 pb-1.5 border-b border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <Magnet className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
                <span>Snap to Audio (Silence Gap Detection)</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTool('none')}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              Analyzes waveform energy and automatically adjusts caption start/end boundaries to lock onto the nearest natural silence gaps in the audio track, improving sync accuracy.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                <span className="flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                  <span>Search Tolerance Window</span>
                </span>
                <span className="font-mono text-slate-700 dark:text-zinc-300 font-bold bg-white dark:bg-zinc-900 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-800">
                  ±{snapRadiusSec}s
                </span>
              </div>

              <input
                type="range"
                min="0.15"
                max="1.0"
                step="0.05"
                value={snapRadiusSec}
                onChange={(e) => setSnapRadiusSec(e.target.value)}
                className="w-full accent-indigo-600 dark:accent-indigo-500 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                <span>0.15s (Strict)</span>
                <span>0.45s (Recommended)</span>
                <span>1.0s (Wide)</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-zinc-800">
              <div className="text-[10px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Volume2 className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                <span>
                  {waveformPeaks && waveformPeaks.length > 0
                    ? `${detectAudioSilenceIntervals(waveformPeaks, duration).length} silence pauses detected`
                    : 'Audio track active'}
                </span>
              </div>

              <button
                type="button"
                id="execute-snap-all-captions-btn"
                onClick={() => {
                  onSnapAllToAudio?.({
                    searchRadiusSec: parseFloat(snapRadiusSec),
                  });
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs inline-flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
              >
                <Magnet className="w-3.5 h-3.5" />
                <span>Snap All Captions</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Persistent Search & Selection Bar Above Caption List */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-zinc-950/60 border-b border-slate-200 dark:border-white/[0.08] flex items-center gap-2 sticky top-0 z-10 backdrop-blur-xl">
        {/* Select All Checkbox Button */}
        <button
          type="button"
          id="batch-select-all-btn"
          onClick={handleToggleSelectAll}
          className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
            selectedIds.size > 0 && selectedIds.size === filteredCaptions.length
              ? 'bg-indigo-600 text-white dark:bg-indigo-600 border-indigo-600 dark:border-indigo-500 shadow-xs'
              : selectedIds.size > 0
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500/40'
              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.08]'
          }`}
          title={
            selectedIds.size === filteredCaptions.length && filteredCaptions.length > 0
              ? 'Deselect all captions'
              : 'Select all captions for batch editing'
          }
        >
          {selectedIds.size > 0 && selectedIds.size === filteredCaptions.length ? (
            <CheckSquare className="w-3.5 h-3.5" />
          ) : selectedIds.size > 0 ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline text-[11px]">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select'}
          </span>
        </button>

        <div className="relative flex-1">
          <Search
            id="caption-search-icon"
            className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            id="caption-list-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter captions by keyword in real-time..."
            className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.09] rounded-lg pl-8 pr-16 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-400 dark:focus:border-zinc-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              id="clear-caption-search-btn"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] rounded border border-slate-200 dark:border-white/[0.1] flex items-center gap-1 transition-all active:scale-95"
              title="Clear search filter"
            >
              <X className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        <button
          type="button"
          id="toggle-search-case-btn"
          onClick={() => setMatchCase(!matchCase)}
          className={`p-1.5 rounded-lg border text-xs font-mono transition-all ${
            matchCase
              ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-600 dark:border-indigo-500 font-semibold'
              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300'
          }`}
          title="Toggle Case Sensitivity (Aa)"
        >
          <CaseSensitive className="w-3.5 h-3.5" />
        </button>

        {searchQuery && (
          <span
            id="caption-search-match-count"
            className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 px-2 py-1 rounded-md border border-slate-200 dark:border-zinc-700 shrink-0"
          >
            {filteredCaptions.length}/{captions.length}
          </span>
        )}
      </div>

      {/* FLOATING BATCH EDIT TOOLBAR - Appears when 1 or more captions are checked */}
      {selectedIds.size > 0 && (
        <div
          id="batch-edit-toolbar"
          className="mx-3 mt-2 p-2.5 bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-2 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-600 dark:text-white rounded text-[11px] font-mono font-bold shadow-xs">
                {selectedIds.size} Selected
              </span>
              <span className="text-[11px] text-slate-700 dark:text-zinc-300 font-semibold">
                Batch Style & Actions
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="batch-deselect-all-btn"
                onClick={handleClearSelection}
                className="px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded border border-slate-200 dark:border-zinc-800 transition-all"
              >
                Clear Selection
              </button>
            </div>
          </div>

          {/* Quick Styling Controls Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Font Size Adjusters */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-0.5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 px-1.5 flex items-center gap-1">
                <Type className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                <span>Size:</span>
              </span>
              {[22, 28, 36, 44].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  id={`batch-font-size-${sz}-btn`}
                  onClick={() => handleApplyBatchOverride({ fontSize: sz })}
                  className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 rounded transition-colors"
                >
                  {sz}px
                </button>
              ))}
            </div>

            {/* Bold & Italic Toggles */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-0.5">
              <button
                type="button"
                id="batch-toggle-bold-btn"
                onClick={handleBatchToggleBold}
                className="p-1 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 rounded font-bold"
                title="Toggle Bold for selected captions"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id="batch-toggle-italic-btn"
                onClick={handleBatchToggleItalic}
                className="p-1 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 rounded italic"
                title="Toggle Italic for selected captions"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Text Colors */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-1 gap-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 px-0.5">Color:</span>
              {[
                { label: 'White', color: '#ffffff' },
                { label: 'Yellow', color: '#facc15' },
                { label: 'Cyan', color: '#06b6d4' },
                { label: 'Green', color: '#10b981' },
                { label: 'Coral', color: '#f43f5e' },
                { label: 'Purple', color: '#c084fc' },
              ].map((sw) => (
                <button
                  key={sw.color}
                  type="button"
                  id={`batch-color-${sw.label.toLowerCase()}-btn`}
                  onClick={() => handleApplyBatchOverride({ textColor: sw.color })}
                  className="w-4 h-4 rounded-full border border-slate-300 dark:border-white/20 hover:scale-115 transition-transform"
                  style={{ backgroundColor: sw.color }}
                  title={`Set text color to ${sw.label}`}
                />
              ))}

              {/* Custom Color Input */}
              <label className="relative cursor-pointer ml-1" title="Pick custom text color">
                <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white" />
                <input
                  type="color"
                  defaultValue="#ffffff"
                  onChange={(e) => handleApplyBatchOverride({ textColor: e.target.value })}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>

            {/* Text Case Changes */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-0.5">
              <button
                type="button"
                id="batch-case-upper-btn"
                onClick={() => handleBatchChangeCase('upper')}
                className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 rounded"
                title="Convert selected text to UPPERCASE"
              >
                UPPER
              </button>
              <button
                type="button"
                id="batch-case-title-btn"
                onClick={() => handleBatchChangeCase('title')}
                className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 rounded"
                title="Convert selected text to Title Case"
              >
                Title
              </button>
            </div>

            {/* Snap Selected to Audio */}
            <button
              type="button"
              id="batch-snap-audio-btn"
              onClick={handleBatchSnap}
              className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 rounded-lg flex items-center gap-1 transition-all shadow-xs active:scale-95"
              title="Snap selected captions to nearest audio silence gaps"
            >
              <Magnet className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
              <span>Snap ({selectedIds.size})</span>
            </button>

            {/* Reset Overrides */}
            <button
              type="button"
              id="batch-reset-style-btn"
              onClick={handleBatchResetOverrides}
              className="px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 bg-white hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-lg transition-colors"
              title="Reset style overrides back to global theme"
            >
              Reset Styles
            </button>

            {/* Bulk Delete */}
            <button
              type="button"
              id="batch-delete-btn"
              onClick={handleBatchDelete}
              className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-rose-50 dark:bg-zinc-900 dark:hover:bg-rose-950/20 text-slate-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 border border-slate-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-800 rounded-lg flex items-center gap-1 transition-all shadow-xs active:scale-95 ml-auto"
              title="Delete all selected captions"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Caption List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredCaptions.length === 0 ? (
          captions.length > 0 ? (
            /* No search results found placeholder message */
            <div
              id="caption-search-no-results"
              className="p-8 text-center bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800 animate-in fade-in"
            >
              <Search className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-zinc-200">No results found</h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
                No subtitle blocks match <span className="font-semibold text-zinc-200">"{searchQuery}"</span>. Try adjusting your search term or clearing the filter.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  type="button"
                  id="no-results-clear-search-btn"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg border border-zinc-700 transition-all active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Search Filter</span>
                </button>
              </div>
            </div>
          ) : (
            /* Empty project placeholder */
            <div
              id="caption-empty-project-placeholder"
              className="p-6 sm:p-8 text-center bg-slate-50/90 dark:bg-zinc-900/50 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm animate-in fade-in duration-200"
            >
              {/* Glowing Icon */}
              <div className="relative w-14 h-14 mx-auto mb-3.5">
                <div className="absolute inset-0 bg-indigo-500/20 dark:bg-indigo-500/30 rounded-2xl blur-md" />
                <div className="relative w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-md shadow-indigo-500/10">
                  <Captions className="w-7 h-7" />
                </div>
              </div>

              <h4 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                Transcribe Your First Video
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                Generate automatic word-level captions using AI Whisper, apply a high-retention Quick Start template, or start adding cues manually.
              </p>

              {/* Main Call to Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
                <button
                  type="button"
                  id="empty-state-transcribe-btn"
                  onClick={onOpenTranscribeModal}
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/25 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-white animate-pulse" />
                  <span>Transcribe Video with AI</span>
                </button>

                {onOpenTemplatesModal && (
                  <button
                    type="button"
                    id="empty-state-quick-start-btn"
                    onClick={onOpenTemplatesModal}
                    className="px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-xs active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Palette className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Choose a Preset Style</span>
                  </button>
                )}

                <button
                  type="button"
                  id="create-first-caption-btn"
                  onClick={() => onAddCaption(currentTime)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/80 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Manual Cue</span>
                </button>
              </div>

              {/* Three Quick Value Props */}
              <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-zinc-950/40 border border-slate-200/60 dark:border-zinc-800/60">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-zinc-200 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>AI Speech-to-Text</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Groq Whisper & Deepgram Nova-2 with word sync.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-zinc-950/40 border border-slate-200/60 dark:border-zinc-800/60">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-zinc-200 mb-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>Viral Word Karaoke</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Bouncing highlights tuned for TikTok and Reels retention.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-zinc-950/40 border border-slate-200/60 dark:border-zinc-800/60">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-zinc-200 mb-1">
                    <Magnet className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Audio Gap Snapping</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Auto-align cue borders with speech pauses.
                  </p>
                </div>
              </div>
            </div>
          )
        ) : (
          filteredCaptions.map((caption, index) => {
            const isActive = currentTime >= caption.start && currentTime <= caption.end;
            const isSelected = selectedIds.has(caption.id);
            const duration = Number((caption.end - caption.start).toFixed(2));
            const isWordsExpanded = !!expandedWordIds[caption.id];
            const words = caption.words || [];
            const isLineTranslating = !!translatingLineIds[caption.id];
            const isSnapping =
              bulkSnapProgress?.currentCaptionId === caption.id;

            // Detect quick spell check issues in this specific caption
            const detectedCorrection = liveSpellCheckEnabled
              ? cleanAndCorrectText(caption.text, spellOptions)
              : null;
            const hasTypoFixes =
              detectedCorrection &&
              detectedCorrection.fixes.length > 0 &&
              detectedCorrection.cleanedText !== caption.text;

            return (
              <div
                key={caption.id}
                id={`caption-card-${caption.id}`}
                className={`p-3.5 rounded-2xl border transition-all duration-200 backdrop-blur-md ${
                  isSnapping
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-400 ring-2 ring-emerald-200 dark:ring-emerald-400 shadow-sm animate-pulse'
                    : isSelected
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-400/60 shadow-xs ring-1 ring-indigo-200 dark:ring-indigo-500/60'
                    : isActive
                    ? 'bg-indigo-50/40 dark:bg-indigo-600/15 border-indigo-200 dark:border-indigo-400/50 shadow-xs ring-1 ring-indigo-200 dark:ring-indigo-500/40'
                    : 'bg-white dark:bg-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.06] border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.14] shadow-xs'
                }`}
              >
                {/* Header row: Checkbox, Timestamps & Controls */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Batch Selection Checkbox */}
                    <button
                      type="button"
                      id={`caption-select-checkbox-${caption.id}`}
                      onClick={(e) => handleToggleSelectCaption(caption.id, e)}
                      className={`p-1 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-600 dark:border-indigo-400'
                          : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                      title={isSelected ? 'Deselect this caption' : 'Select for batch edit'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Clickable Start Badge */}
                    <button
                      type="button"
                      onClick={() => onSeek(caption.start)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/90 dark:bg-indigo-600 dark:text-white dark:border-indigo-400/40 font-semibold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 dark:bg-white/[0.05] dark:text-zinc-300 dark:hover:bg-white/[0.1] dark:border-white/[0.08]'
                      }`}
                      title="Click to seek video to this caption"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{formatTime(caption.start)}</span>
                    </button>

                    <ArrowRight className="w-3 h-3 text-slate-400 dark:text-zinc-600" />

                    {/* End Time Badge */}
                    <button
                      type="button"
                      onClick={() => onSeek(caption.end)}
                      className="px-2 py-1 rounded-lg text-[11px] font-mono font-medium bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 border border-slate-200 dark:border-white/[0.07]"
                    >
                      {formatTime(caption.end)}
                    </button>

                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono font-semibold">
                      ({duration}s)
                    </span>

                    {isActive && (
                      <span className="text-[9px] bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-mono font-semibold px-2 py-0.5 rounded-full border border-indigo-200/80 dark:border-indigo-500/40">
                        ACTIVE
                      </span>
                    )}

                    {isSnapping && (
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-mono font-semibold px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/40 animate-pulse flex items-center gap-1">
                        <Magnet className="w-2.5 h-2.5" />
                        SNAPPING
                      </span>
                    )}

                    {caption.styleOverride && (
                      <span
                        className="text-[9px] bg-slate-100 text-slate-700 dark:bg-amber-500/20 dark:text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-amber-500/30 flex items-center gap-1"
                        title="This caption has custom per-cue style overrides"
                      >
                        <Palette className="w-2.5 h-2.5" />
                        CUSTOM
                      </span>
                    )}
                  </div>

                  {/* Micro actions: Split, More Options Dropdown, Delete */}
                  <div className="flex items-center gap-0.5 relative">
                    <button
                      type="button"
                      onClick={() => onSplitCaption(caption.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Split caption into two"
                    >
                      <Split className="w-3.5 h-3.5" />
                    </button>

                    {/* More actions dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenCardMenuId(openCardMenuId === caption.id ? null : caption.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          openCardMenuId === caption.id
                            ? 'bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-white'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800'
                        }`}
                        title="More options (Duplicate, Merge, Snap)"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>

                      {openCardMenuId === caption.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl z-30 p-1 space-y-0.5 text-xs animate-in fade-in zoom-in-95"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onDuplicateCaption(caption.id);
                              setOpenCardMenuId(null);
                            }}
                            className="w-full px-2.5 py-1.5 text-left rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors text-[11px]"
                          >
                            <Copy className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                            <span>Duplicate Cue</span>
                          </button>

                          {index < captions.length - 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                onMergeCaption(index);
                                setOpenCardMenuId(null);
                              }}
                              className="w-full px-2.5 py-1.5 text-left rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors text-[11px]"
                            >
                              <Combine className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                              <span>Merge with Next</span>
                            </button>
                          )}

                          {onSnapCaptionToAudio && (
                            <button
                              type="button"
                              onClick={() => {
                                onSnapCaptionToAudio(caption.id);
                                setOpenCardMenuId(null);
                              }}
                              className="w-full px-2.5 py-1.5 text-left rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors text-[11px]"
                            >
                              <Magnet className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                              <span>Snap to Audio Gap</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteCaption(caption.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-400 dark:hover:text-rose-400 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Delete caption"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtitle Text Area */}
                <div className="mb-2 space-y-1">
                  {(dualCaptionEnabled || caption.secondaryText !== undefined) && (
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                      <span>Primary Line (English)</span>
                    </div>
                  )}
                  <textarea
                    rows={2}
                    value={caption.text}
                    onChange={(e) => handleTextChange(caption, e.target.value)}
                    className="w-full bg-slate-50/50 dark:bg-black/30 border border-slate-200 dark:border-white/[0.09] rounded-xl p-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-black/45 leading-relaxed resize-none font-medium backdrop-blur-sm transition-all"
                    placeholder="Enter subtitle text..."
                  />

                  {/* Inline 1-Click Typo Fix Banner if detected */}
                  {hasTypoFixes && detectedCorrection && (
                    <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-100 dark:bg-amber-500/10 border border-slate-200 dark:border-amber-500/30 rounded-lg text-[11px] text-slate-700 dark:text-amber-300">
                      <div className="flex items-center gap-1.5 truncate">
                        <AlertCircle className="w-3.5 h-3.5 text-slate-500 dark:text-amber-400 shrink-0" />
                        <span className="truncate">
                          Suggested:{' '}
                          <span className="font-semibold text-slate-900 dark:text-white">
                            "{detectedCorrection.cleanedText}"
                          </span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTextChange(caption, detectedCorrection.cleanedText)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-zinc-950 font-semibold rounded text-[10px] shrink-0 inline-flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3 h-3" />
                        <span>Fix</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Secondary Subtitle Text Area (Dual Caption Mode) */}
                {(dualCaptionEnabled || caption.secondaryText !== undefined) && (
                  <div className="mb-2 p-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-cyan-500/20 space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-700 dark:text-cyan-400 font-semibold flex items-center gap-1">
                        <Languages className="w-3 h-3" />
                        Secondary Track (Translated)
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleTranslateSingleLine(caption)}
                          disabled={isLineTranslating}
                          className="px-1.5 py-0.5 bg-white hover:bg-slate-100 dark:bg-cyan-600/20 dark:hover:bg-cyan-600/40 text-slate-700 hover:text-slate-900 dark:text-cyan-300 dark:hover:text-white border border-slate-200 dark:border-transparent rounded text-[10px] font-semibold flex items-center gap-1 transition-all"
                          title="Translate this line with AI"
                        >
                          {isLineTranslating ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <Wand2 className="w-2.5 h-2.5" />
                          )}
                          <span>Auto-Translate</span>
                        </button>

                        {caption.secondaryText && (
                          <button
                            type="button"
                            onClick={() => handleSecondaryTextChange(caption, '')}
                            className="text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 p-0.5"
                            title="Clear secondary text"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      type="text"
                      value={caption.secondaryText || ''}
                      onChange={(e) => handleSecondaryTextChange(caption, e.target.value)}
                      placeholder="Secondary language line..."
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-cyan-200 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-slate-400 dark:focus:border-cyan-500 font-medium"
                    />
                  </div>
                )}

                {/* Time Fine Tuning Footer */}
                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    {/* Start adjust */}
                    <div className="flex items-center gap-0.5">
                      <span className="text-slate-400 dark:text-zinc-500 font-mono text-[10px]">In:</span>
                      <button
                        type="button"
                        onClick={() => handleAdjustTime(caption, 'start', -0.1)}
                        className="px-1 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded text-[10px]"
                      >
                        -0.1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustTime(caption, 'start', 0.1)}
                        className="px-1 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded text-[10px]"
                      >
                        +0.1
                      </button>
                    </div>

                    {/* End adjust */}
                    <div className="flex items-center gap-0.5">
                      <span className="text-slate-400 dark:text-zinc-500 font-mono text-[10px]">Out:</span>
                      <button
                        type="button"
                        onClick={() => handleAdjustTime(caption, 'end', -0.1)}
                        className="px-1 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded text-[10px]"
                      >
                        -0.1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustTime(caption, 'end', 0.1)}
                        className="px-1 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded text-[10px]"
                      >
                        +0.1
                      </button>
                    </div>
                  </div>

                  {/* Reel Safe Zone & Word Count Footer */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border transition-colors ${
                        caption.text.length > 28
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800'
                      }`}
                      title={
                        caption.text.length > 28
                          ? 'Exceeds 28 characters — text may split into 2+ lines on 9:16 mobile reels'
                          : 'Fits cleanly within single-line 9:16 reel safe zone'
                      }
                    >
                      {caption.text.length} chars {caption.text.length > 28 && '⚠️'}
                    </span>

                    {words.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleWordDrawer(caption.id)}
                        className="text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 text-[10px] font-medium flex items-center gap-1"
                      >
                        <SlidersHorizontal className="w-3 h-3 text-slate-500 dark:text-indigo-400" />
                        <span>{words.length} Words</span>
                        {isWordsExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Word Timestamps Micro-Inspector Drawer */}
                {isWordsExpanded && words.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-zinc-800/80 space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-500 font-mono">
                      <span>Word Timestamps (Karaoke Pop Sync)</span>
                      <span>{words.length} word tokens</span>
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1.5 bg-slate-50 dark:bg-zinc-950 rounded-lg border border-slate-200 dark:border-zinc-800">
                      {words.map((w, wIdx) => {
                        const isCurrentWordActive =
                          currentTime >= w.start && currentTime <= w.end;
                        return (
                          <div
                            key={w.id || wIdx}
                            className={`px-2 py-1 rounded-md text-[10px] font-mono flex items-center gap-1 border transition-all ${
                              isCurrentWordActive
                                ? 'bg-indigo-50 text-indigo-700 font-semibold border-indigo-300 dark:bg-indigo-600 dark:border-indigo-400 dark:text-white shadow-xs scale-105'
                                : 'bg-white text-slate-700 border-slate-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 hover:border-slate-300'
                            }`}
                          >
                            <span className="font-sans font-semibold">{w.word}</span>
                            <span className="text-[8px] text-slate-400 dark:text-zinc-400 opacity-80">
                              {w.start.toFixed(2)}s
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Clear Captions Modal Confirmation */}
      <ClearCaptionsModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        captionsCount={captions.length}
        onConfirmClearCaptions={() => {
          if (onClearAllCaptions) {
            onClearAllCaptions();
          }
        }}
      />
    </div>
  );
};
