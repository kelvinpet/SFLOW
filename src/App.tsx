import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Captions as CaptionsIcon,
  Palette,
  Sparkles,
  Download,
  Plus,
  Upload,
  Layers,
  Wand2,
  Film,
  Settings,
  HelpCircle,
  Trash2,
  Languages,
  Play,
  LayoutGrid,
  Activity,
  RotateCcw,
  X,
  Copy,
  Check,
  ChevronDown,
  Clock,
  Search,
  Eye,
} from 'lucide-react';
import {
  Caption,
  SubtitleStyle,
  AspectRatioType,
  ToastMessage,
  CustomKeybindings,
  AutoSaveData,
  PendingSessionRecovery,
} from './types';
import { DEFAULT_STYLE, SUBTITLE_PRESETS } from './data/presets';
import { SAMPLE_VIDEOS, SampleVideoItem } from './data/sampleVideo';
import { generateWordTimestampsForText } from './utils/srtParser';
import {
  extractAudioWaveformAndWav,
  generateSyntheticWaveformForCaptions,
} from './utils/audioExtractor';
import {
  saveVideoFileToDB,
  getVideoFileFromDB,
  clearVideoFileFromDB,
} from './utils/indexedDBVideoStorage';
import {
  snapCaptionToAudio,
  snapAllCaptionsToAudio,
  SnapToAudioOptions,
} from './utils/audioSnapping';
import {
  bulkTranslateCaptions,
  bulkGenerateDualCaptions,
  SUPPORTED_TRANSLATION_LANGUAGES,
} from './utils/translationService';
import { autoFixAllCaptions, SpellcheckOptions } from './utils/spellcheck';
import { autoHighlightKeywordsAndEmojis } from './utils/keywordHighlighter';

import { Navbar } from './components/Navbar';
import { VideoPlayer } from './components/VideoPlayer';
import { TimelineTrack } from './components/TimelineTrack';
import { CaptionEditor } from './components/CaptionEditor';
import { StyleCustomizer } from './components/StyleCustomizer';
import { AiTranscriptionModal } from './components/AiTranscriptionModal';
import { ImportExportModal } from './components/ImportExportModal';
import { ExportPreviewModal } from './components/ExportPreviewModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ShortcutsModal, DEFAULT_KEYBINDINGS } from './components/ShortcutsModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ProjectsModal } from './components/ProjectsModal';
import { SavedProject } from './utils/projectManager';
import { ClearCaptionsModal } from './components/ClearCaptionsModal';
import { ToastContainer } from './components/ToastContainer';
import { QuickStartTemplatesModal } from './components/QuickStartTemplatesModal';
import { OnboardingTour } from './components/OnboardingTour';
import { ProjectTemplate } from './data/projectTemplates';
import { WelcomePage } from './components/WelcomePage';

export default function App() {
  // Video & Playback State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoSource, setVideoSource] = useState<File | string | null>(SAMPLE_VIDEOS[0].url);
  const [videoUrl, setVideoUrl] = useState<string | null>(SAMPLE_VIDEOS[0].url);
  const [sourceVideoFileSize, setSourceVideoFileSize] = useState<number | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(15);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('9:16');
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);

  // Subtitles & Styling State (Starts with a clean slate unless the user resumes a project)
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [style, setStyle] = useState<SubtitleStyle>(DEFAULT_STYLE);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<Caption[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Pending Previous Session Recovery (Prompt user instead of forcing old captions onto the screen)
  const [pendingSessionRecovery, setPendingSessionRecovery] = useState<PendingSessionRecovery | null>(null);

  // Translation State
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<{ percent: number; status: string }>({
    percent: 0,
    status: '',
  });
  const [isGeneratingDual, setIsGeneratingDual] = useState(false);

  // Audio Snapping Progress state
  const [bulkSnapProgress, setBulkSnapProgress] = useState<{
    currentCaptionId: string;
    index: number;
    total: number;
  } | null>(null);

  // App UI State
  const [activeTab, setActiveTab] = useState<'captions' | 'styles'>('captions');
  const [mobileTab, setMobileTab] = useState<'all' | 'preview' | 'captions' | 'styles' | 'timeline'>('all');
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('openai_whisper_api_key') || '';
  });
  const [groqKey, setGroqKey] = useState<string>(() => {
    return localStorage.getItem('groq_api_key') || '';
  });
  const [deepgramKey, setDeepgramKey] = useState<string>(() => {
    return localStorage.getItem('deepgram_api_key') || '';
  });

  // Auto-Save State (persists every 30s)
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Keyboard Shortcuts Customization State
  const [keybindings, setKeybindings] = useState<CustomKeybindings>(() => {
    try {
      const saved = localStorage.getItem('subly_custom_shortcuts');
      if (saved) return { ...DEFAULT_KEYBINDINGS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_KEYBINDINGS;
  });

  // Modals
  const [isTranscribeOpen, setIsTranscribeOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isExportPreviewOpen, setIsExportPreviewOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isOnboardingTourOpen, setIsOnboardingTourOpen] = useState(false);

  // Active App Screen ('welcome' | 'editor') - Defaults to clean Welcome Page
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'editor'>('welcome');

  // Automatic first-time onboarding tour check (runs when user enters editor)
  useEffect(() => {
    if (currentScreen !== 'editor') return;
    try {
      const isCompleted = localStorage.getItem('subly_onboarding_completed');
      if (!isCompleted) {
        const timer = setTimeout(() => {
          setIsOnboardingTourOpen(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [currentScreen]);

  // Project Metadata & Library state
  const [currentVideoName, setCurrentVideoName] = useState<string>('New Project');
  const [currentVideoType, setCurrentVideoType] = useState<'sample' | 'file'>('sample');
  const [currentSampleVideoId, setCurrentSampleVideoId] = useState<string | undefined>(SAMPLE_VIDEOS[0].id);

  // Theme Mode State (Dark / Light)
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('subly_theme_mode');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(themeMode);
    try {
      localStorage.setItem('subly_theme_mode', themeMode);
    } catch {}
  }, [themeMode]);

  const handleToggleThemeMode = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Drag & drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Batch Actions & Copy All state for #right-captions-panel-header
  const [isBatchActionsOpen, setIsBatchActionsOpen] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [customShiftInput, setCustomShiftInput] = useState('0.5');
  const batchActionsRef = useRef<HTMLDivElement>(null);

  // Instant Search state for #right-captions-panel-header
  const [captionSearchQuery, setCaptionSearchQuery] = useState('');

  // Filtered count for instant search badge
  const matchingCaptionsCount = useMemo(() => {
    if (!captionSearchQuery.trim()) return captions.length;
    const q = captionSearchQuery.toLowerCase();
    return captions.filter((c) =>
      c.text.toLowerCase().includes(q) || (c.secondaryText && c.secondaryText.toLowerCase().includes(q))
    ).length;
  }, [captions, captionSearchQuery]);

  // Close batch actions dropdown on outside click
  useEffect(() => {
    if (!isBatchActionsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (batchActionsRef.current && !batchActionsRef.current.contains(e.target as Node)) {
        setIsBatchActionsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isBatchActionsOpen]);

  const addToast = useCallback(
    (toast: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message?: string; duration?: number }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastMessage = { id, ...toast };
      setToasts((prev) => [...prev, newToast]);

      const timeout = toast.duration || 4000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, timeout);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  /**
   * Helper to push a new state to Undo history
   */
  const pushToHistory = useCallback(
    (newCaptions: Caption[]) => {
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        if (next.length >= 50) {
          next.shift();
        }
        return [...next, newCaptions];
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
      setCaptions(newCaptions);
    },
    [historyIndex]
  );

  // Update Keybindings Handler
  const handleUpdateKeybindings = (newKeybindings: CustomKeybindings) => {
    setKeybindings(newKeybindings);
    try {
      localStorage.setItem('subly_custom_shortcuts', JSON.stringify(newKeybindings));
    } catch (e) {
      console.warn(e);
    }
  };

  // Perform Auto-Save to localStorage (only runs when active project captions exist)
  const performAutoSave = useCallback(() => {
    if (captions.length === 0) {
      return;
    }
    try {
      setIsAutoSaving(true);
      const now = new Date();
      const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const data: AutoSaveData = {
        timestamp: Date.now(),
        formattedTime,
        captionsCount: captions.length,
        captions,
        style,
        videoName: currentVideoName,
        videoType: currentVideoType,
        sampleVideoId: currentSampleVideoId,
      };
      localStorage.setItem('subly_autosave_state', JSON.stringify(data));
      setLastAutoSavedTime(formattedTime);
      setTimeout(() => setIsAutoSaving(false), 500);
    } catch (e) {
      console.warn('Auto-save error:', e);
      setIsAutoSaving(false);
    }
  }, [captions, style, currentVideoName, currentVideoType, currentSampleVideoId]);

  // Periodic Auto-Save Every 30 Seconds
  useEffect(() => {
    const interval = setInterval(() => {
      performAutoSave();
    }, 30000);

    return () => clearInterval(interval);
  }, [performAutoSave]);

  // Check for previous autosaved session on startup without forcing it onto the workspace
  useEffect(() => {
    try {
      const savedStateStr = localStorage.getItem('subly_autosave_state');
      if (savedStateStr) {
        const savedData: AutoSaveData = JSON.parse(savedStateStr);
        if (savedData && Array.isArray(savedData.captions) && savedData.captions.length > 0) {
          setPendingSessionRecovery({
            videoName: savedData.videoName || 'Previous Project',
            captionsCount: savedData.captions.length,
            formattedTime: savedData.formattedTime || 'Earlier',
            captions: savedData.captions,
            style: savedData.style,
            videoType: savedData.videoType,
            sampleVideoId: savedData.sampleVideoId,
            timestamp: savedData.timestamp,
          });
        }
      }
    } catch (e) {
      console.warn('Could not read autosave state:', e);
    }
  }, []);

  // Explicitly resume previous session on user choice
  const handleResumePreviousSession = () => {
    if (!pendingSessionRecovery) return;
    const { captions: prevCaps, style: prevStyle, videoName, videoType, sampleVideoId } = pendingSessionRecovery;

    setCaptions(prevCaps);
    setHistory([prevCaps]);
    setHistoryIndex(0);

    if (prevStyle) {
      const sanitizedStyle = {
        ...prevStyle,
        audioSyncOffsetMs: prevStyle.audioSyncOffsetMs === 200 ? 0 : (prevStyle.audioSyncOffsetMs ?? 0),
      };
      setStyle(sanitizedStyle);
    }

    if (videoName) setCurrentVideoName(videoName);
    if (videoType) setCurrentVideoType(videoType);
    if (sampleVideoId) setCurrentSampleVideoId(sampleVideoId);

    if (videoType === 'sample' && sampleVideoId) {
      const foundSample = SAMPLE_VIDEOS.find((s) => s.id === sampleVideoId);
      if (foundSample) {
        if (videoUrl && videoUrl.startsWith('blob:')) {
          URL.revokeObjectURL(videoUrl);
        }
        setVideoSource(foundSample.url);
        setVideoUrl(foundSample.url);
        setSourceVideoFileSize(undefined);
        setAspectRatio(foundSample.aspect);
      }
    } else if (videoType === 'file') {
      getVideoFileFromDB()
        .then((savedFile) => {
          if (savedFile) {
            if (videoUrl && videoUrl.startsWith('blob:')) {
              URL.revokeObjectURL(videoUrl);
            }
            const objectUrl = URL.createObjectURL(savedFile);
            setVideoSource(savedFile);
            setVideoUrl(objectUrl);
            setSourceVideoFileSize(savedFile.size);
            setCurrentVideoName(savedFile.name);
            extractAudioWaveformAndWav(savedFile)
              .then(({ waveformPeaks: peaks, duration: audioDur }) => {
                setWaveformPeaks(peaks);
                if (audioDur && audioDur > 0) setDuration(audioDur);
              })
              .catch((err) => console.warn('Could not extract waveform:', err));
          }
        })
        .catch((err) => console.warn('Could not restore video file from DB:', err));
    }

    addToast({
      type: 'success',
      title: 'Previous Session Resumed',
      message: `Restored "${videoName}" with ${prevCaps.length} captions.`,
    });

    setPendingSessionRecovery(null);
  };

  // Discard previous autosaved session and start with a completely clean workspace
  const handleDiscardPreviousSession = () => {
    try {
      localStorage.removeItem('subly_autosave_state');
      clearVideoFileFromDB();
      setLastAutoSavedTime(null);
    } catch {}
    setPendingSessionRecovery(null);
    addToast({
      type: 'info',
      title: 'Started Fresh Project',
      message: 'Workspace is clean and ready for your new video project.',
    });
  };

  // Initialize or ensure realistic waveform peaks for current captions / video
  useEffect(() => {
    if (waveformPeaks.length === 0 && captions.length > 0) {
      const syn = generateSyntheticWaveformForCaptions(captions, duration);
      setWaveformPeaks(syn);
    }
  }, [captions, duration, waveformPeaks.length]);

  /**
   * Undo Handler
   */
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIdx = historyIndex - 1;
      setHistoryIndex(targetIdx);
      setCaptions(history[targetIdx]);
      addToast({
        type: 'info',
        title: 'Undo',
        message: 'Reverted caption change.',
        duration: 1800,
      });
    }
  }, [historyIndex, history, addToast]);

  /**
   * Redo Handler
   */
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIdx = historyIndex + 1;
      setHistoryIndex(targetIdx);
      setCaptions(history[targetIdx]);
      addToast({
        type: 'info',
        title: 'Redo',
        message: 'Restored caption change.',
        duration: 1800,
      });
    }
  }, [historyIndex, history, addToast]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('openai_whisper_api_key', key);
    addToast({
      type: key ? 'success' : 'info',
      title: key ? 'OpenAI Key Saved' : 'OpenAI Key Cleared',
      message: key ? 'OpenAI key securely stored in browser storage.' : 'OpenAI key removed.',
    });
  };

  const handleSaveGroqKey = (key: string) => {
    setGroqKey(key);
    localStorage.setItem('groq_api_key', key);
    addToast({
      type: key ? 'success' : 'info',
      title: key ? 'Groq Key Saved' : 'Groq Key Cleared',
      message: key ? 'Groq Whisper API key stored in browser storage.' : 'Groq key removed.',
    });
  };

  const handleSaveDeepgramKey = (key: string) => {
    setDeepgramKey(key);
    localStorage.setItem('deepgram_api_key', key);
    addToast({
      type: key ? 'success' : 'info',
      title: key ? 'Deepgram Key Saved' : 'Deepgram Key Cleared',
      message: key ? 'Deepgram Nova API key stored in browser storage.' : 'Deepgram key removed.',
    });
  };

  const handleSaveAllKeys = ({ openaiKey: nextOpenai, groqKey: nextGroq, deepgramKey: nextDeepgram }: { openaiKey: string; groqKey: string; deepgramKey: string }) => {
    setApiKey(nextOpenai);
    setGroqKey(nextGroq);
    setDeepgramKey(nextDeepgram);

    localStorage.setItem('openai_whisper_api_key', nextOpenai);
    localStorage.setItem('groq_api_key', nextGroq);
    localStorage.setItem('deepgram_api_key', nextDeepgram);

    const savedList: string[] = [];
    if (nextGroq) savedList.push('Groq');
    if (nextDeepgram) savedList.push('Deepgram');
    if (nextOpenai) savedList.push('OpenAI');

    if (savedList.length > 0) {
      addToast({
        type: 'success',
        title: 'API Keys Saved',
        message: `${savedList.join(', ')} configured and ready for transcription.`,
      });
    } else {
      addToast({
        type: 'info',
        title: 'API Keys Cleared',
        message: 'All API keys have been removed.',
      });
    }
  };

  // Video File Upload Handler
  const handleUploadVideo = async (file: File) => {
    try {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }

      const objectUrl = URL.createObjectURL(file);
      setVideoSource(file);
      setVideoUrl(objectUrl);
      setSourceVideoFileSize(file.size);
      setCurrentTime(0);
      setIsPlaying(false);

      // Save video file to IndexedDB for seamless reload persistence
      saveVideoFileToDB(file);

      addToast({
        type: 'info',
        title: 'Video Loaded',
        message: `Loaded "${file.name}". Generating audio waveform...`,
      });

      // Extract waveform in background
      extractAudioWaveformAndWav(file)
        .then(({ waveformPeaks: peaks, duration: audioDur }) => {
          setWaveformPeaks(peaks);
          if (audioDur && audioDur > 0) setDuration(audioDur);
        })
        .catch((err) => console.warn('Could not extract waveform:', err));
    } catch (err: unknown) {
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: err instanceof Error ? err.message : 'Could not read video file',
      });
    }
  };

  // Preset Sample Video Selector
  const handleSelectSample = (sample: SampleVideoItem) => {
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoSource(sample.url);
    setVideoUrl(sample.url);
    setSourceVideoFileSize(undefined);
    setCaptions(sample.captions);
    setHistory([sample.captions]);
    setHistoryIndex(0);
    setAspectRatio(sample.aspect);
    setCurrentTime(0);
    setIsPlaying(false);

    addToast({
      type: 'success',
      title: 'Sample Video Loaded',
      message: `Loaded "${sample.name}" with sample captions.`,
    });
  };

  // Video Playback Controls
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused || videoRef.current.ended) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.warn(e));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (seconds: number) => {
    const clamped = Math.max(0, Math.min(seconds, duration));
    setCurrentTime(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  };

  // Caption Management Handlers (All push to Undo/Redo stack)
  const handleAddCaption = (startTime?: number) => {
    const start = startTime !== undefined ? Number(startTime.toFixed(2)) : Number(currentTime.toFixed(2));
    const end = Number(Math.min(duration, start + 2.5).toFixed(2));
    const defaultText = 'New caption text';
    const words = generateWordTimestampsForText(defaultText, start, end);

    const newCap: Caption = {
      id: `cap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      start,
      end,
      text: defaultText,
      words,
    };

    const updated = [...captions, newCap].sort((a, b) => a.start - b.start);
    pushToHistory(updated);
    addToast({
      type: 'info',
      title: 'Caption Added',
      message: `Created subtitle block at ${start.toFixed(1)}s`,
    });
  };

  const handleUpdateCaption = (id: string, updatedFields: Partial<Caption>) => {
    const updated = captions.map((c) => (c.id === id ? { ...c, ...updatedFields } : c));
    pushToHistory(updated);
  };

  const handleDeleteCaption = (id: string) => {
    const updated = captions.filter((c) => c.id !== id);
    pushToHistory(updated);
    addToast({
      type: 'info',
      title: 'Caption Deleted',
    });
  };

  const handleDuplicateCaption = (id: string) => {
    const target = captions.find((c) => c.id === id);
    if (!target) return;

    const newStart = Number((target.end + 0.1).toFixed(2));
    const durationCap = target.end - target.start;
    const newEnd = Number((newStart + durationCap).toFixed(2));
    const words = generateWordTimestampsForText(target.text, newStart, newEnd);

    const duplicated: Caption = {
      id: `cap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      start: newStart,
      end: newEnd,
      text: target.text,
      words,
    };

    const updated = [...captions, duplicated].sort((a, b) => a.start - b.start);
    pushToHistory(updated);
    addToast({
      type: 'success',
      title: 'Caption Duplicated',
    });
  };

  const handleSplitCaption = (id: string) => {
    const target = captions.find((c) => c.id === id);
    if (!target) return;

    const words = target.text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1) {
      addToast({
        type: 'warning',
        title: 'Cannot Split',
        message: 'Caption contains only one word.',
      });
      return;
    }

    const midIdx = Math.ceil(words.length / 2);
    const firstText = words.slice(0, midIdx).join(' ');
    const secondText = words.slice(midIdx).join(' ');

    const totalDur = target.end - target.start;
    const midTime = Number((target.start + totalDur / 2).toFixed(2));

    const cap1: Caption = {
      ...target,
      text: firstText,
      end: midTime,
      words: generateWordTimestampsForText(firstText, target.start, midTime),
    };

    const cap2: Caption = {
      id: `cap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      start: midTime,
      end: target.end,
      text: secondText,
      words: generateWordTimestampsForText(secondText, midTime, target.end),
    };

    const updated = captions
      .flatMap((c) => (c.id === id ? [cap1, cap2] : [c]))
      .sort((a, b) => a.start - b.start);

    pushToHistory(updated);
    addToast({
      type: 'info',
      title: 'Caption Split',
      message: 'Divided into two synchronized segments.',
    });
  };

  const handleSplitAllIntoSingleLineCues = (maxWordsPerCue: number = 3) => {
    if (captions.length === 0) return;

    let splitOccurred = false;
    const newCaptions: Caption[] = [];

    captions.forEach((cap) => {
      // Get or synthesize word timestamps
      const rawWords =
        cap.words && cap.words.length > 0
          ? cap.words
          : cap.text
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .map((w, idx, arr) => {
                const dur = Math.max(0.1, cap.end - cap.start);
                const wDur = dur / arr.length;
                return {
                  id: `syn-${cap.id}-${idx}`,
                  word: w,
                  start: cap.start + idx * wDur,
                  end: cap.start + (idx + 1) * wDur,
                };
              });

      if (rawWords.length <= maxWordsPerCue) {
        newCaptions.push({
          ...cap,
          words: rawWords,
        });
        return;
      }

      splitOccurred = true;
      const secTokens = cap.secondaryText
        ? cap.secondaryText.trim().split(/\s+/).filter(Boolean)
        : [];
      const totalChunks = Math.ceil(rawWords.length / maxWordsPerCue);
      const secChunkSize =
        secTokens.length > 0 ? Math.max(1, Math.round(secTokens.length / totalChunks)) : 0;

      for (let i = 0; i < rawWords.length; i += maxWordsPerCue) {
        const chunkWords = rawWords.slice(i, i + maxWordsPerCue);
        const chunkText = chunkWords.map((w) => w.word).join(' ');
        const chunkStart = chunkWords[0].start;
        const chunkEnd = chunkWords[chunkWords.length - 1].end;

        const chunkIndex = Math.floor(i / maxWordsPerCue);
        let chunkSecText: string | undefined = undefined;
        if (secTokens.length > 0) {
          const sStart = chunkIndex * secChunkSize;
          const sEnd = Math.min(secTokens.length, sStart + secChunkSize);
          chunkSecText = secTokens.slice(sStart, sEnd).join(' ');
        }

        newCaptions.push({
          id: `cap-cue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          start: Number(chunkStart.toFixed(2)),
          end: Number(chunkEnd.toFixed(2)),
          text: chunkText,
          secondaryText: chunkSecText,
          words: chunkWords,
        });
      }
    });

    newCaptions.sort((a, b) => a.start - b.start);
    pushToHistory(newCaptions);
    addToast({
      type: 'success',
      title: 'Split into 1-Line Cues',
      message: splitOccurred
        ? `Formatted into ${newCaptions.length} single-line cues (${maxWordsPerCue} words max per line).`
        : 'All captions already fit on 1 line.',
    });
  };

  const handleMergeCaption = (index: number) => {
    if (index >= captions.length - 1) return;

    const current = captions[index];
    const next = captions[index + 1];
    const combinedText = `${current.text} ${next.text}`;
    const start = current.start;
    const end = next.end;

    const merged: Caption = {
      id: current.id,
      start,
      end,
      text: combinedText,
      words: generateWordTimestampsForText(combinedText, start, end),
    };

    const copy = [...captions];
    copy.splice(index, 2, merged);
    pushToHistory(copy);

    addToast({
      type: 'info',
      title: 'Captions Merged',
      message: 'Combined consecutive subtitle blocks.',
    });
  };

  const handleShiftAllTimestamps = (seconds: number) => {
    const updated = captions.map((c) => {
      const newStart = Math.max(0, Number((c.start + seconds).toFixed(2)));
      const newEnd = Math.max(newStart + 0.2, Number((c.end + seconds).toFixed(2)));
      const words = c.words && c.words.length > 0
        ? c.words.map((w) => ({
            ...w,
            start: Math.max(0, Number((w.start + seconds).toFixed(2))),
            end: Math.max(0, Number((w.end + seconds).toFixed(2))),
          }))
        : generateWordTimestampsForText(c.text, newStart, newEnd);
      return {
        ...c,
        start: newStart,
        end: newEnd,
        words,
      };
    });

    pushToHistory(updated);
    addToast({
      type: 'info',
      title: 'Timestamps Shifted',
      message: `Shifted all subtitles by ${seconds > 0 ? `+${seconds}` : seconds}s`,
    });
  };

  /**
   * Copy all full-text captions from the current project to clipboard
   */
  const handleCopyAllCaptions = async () => {
    if (captions.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Captions to Copy',
        message: 'Please add or transcribe subtitles first.',
      });
      return;
    }

    const fullText = captions
      .map((c) => c.text.trim())
      .filter(Boolean)
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
      addToast({
        type: 'success',
        title: 'All Captions Copied',
        message: `Copied ${captions.length} captions (${fullText.length} characters) to clipboard.`,
      });
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = fullText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
      addToast({
        type: 'success',
        title: 'All Captions Copied',
        message: `Copied ${captions.length} captions to clipboard.`,
      });
    }
  };

  /**
   * Snap individual caption to nearest audio silence gaps
   */
  const handleSnapCaptionToAudio = (captionId: string) => {
    const targetCaption = captions.find((c) => c.id === captionId);
    if (!targetCaption) return;

    let peaks = waveformPeaks;
    if (peaks.length === 0) {
      peaks = generateSyntheticWaveformForCaptions(captions, duration);
      setWaveformPeaks(peaks);
    }

    const snapped = snapCaptionToAudio(targetCaption, peaks, duration);
    const shiftStartMs = Math.round(Math.abs(snapped.start - targetCaption.start) * 1000);
    const shiftEndMs = Math.round(Math.abs(snapped.end - targetCaption.end) * 1000);

    const updated = captions.map((c) => (c.id === captionId ? snapped : c));
    pushToHistory(updated);

    addToast({
      type: 'success',
      title: 'Caption Snapped to Audio',
      message: `Aligned to silence pauses (Start: ±${shiftStartMs}ms, End: ±${shiftEndMs}ms).`,
      duration: 2500,
    });
  };

  /**
   * Bulk snap all captions to nearest silence gaps with step-by-step visual progress animation
   */
  const handleSnapAllCaptionsToAudio = async (options?: SnapToAudioOptions) => {
    if (captions.length === 0) return;

    let peaks = waveformPeaks;
    if (peaks.length === 0) {
      peaks = generateSyntheticWaveformForCaptions(captions, duration);
      setWaveformPeaks(peaks);
    }

    let workingCaptions = [...captions];
    let adjustedCount = 0;
    let totalShiftMs = 0;

    for (let i = 0; i < captions.length; i++) {
      const cap = workingCaptions[i];
      setBulkSnapProgress({
        currentCaptionId: cap.id,
        index: i,
        total: captions.length,
      });

      // Brief visual stepping interval so the user sees each block illuminated on the timeline
      await new Promise((resolve) => setTimeout(resolve, 60));

      const snapped = snapCaptionToAudio(cap, peaks, duration, options);
      const shiftMs = Math.round(
        (Math.abs(snapped.start - cap.start) + Math.abs(snapped.end - cap.end)) * 500
      );
      if (shiftMs > 15) {
        adjustedCount++;
        totalShiftMs += shiftMs;
      }
      workingCaptions[i] = snapped;
      setCaptions([...workingCaptions]);
    }

    setBulkSnapProgress(null);
    pushToHistory(workingCaptions);

    const avgShift = adjustedCount > 0 ? Math.round(totalShiftMs / adjustedCount) : 0;
    addToast({
      type: 'success',
      title: 'Audio Snapping Complete',
      message:
        adjustedCount > 0
          ? `Snapped ${adjustedCount} of ${captions.length} captions to silence gaps (avg shift: ${avgShift}ms).`
          : 'All captions are already optimally aligned to audio silence gaps.',
      duration: 3500,
    });
  };

  /**
   * Batch update styling / properties for multiple selected captions
   */
  const handleBatchUpdateCaptions = (ids: string[], updates: Partial<Caption>) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const updated = captions.map((c) => {
      if (!idSet.has(c.id)) return c;
      return {
        ...c,
        ...updates,
        styleOverride: {
          ...(c.styleOverride || {}),
          ...(updates.styleOverride || {}),
        },
      };
    });
    pushToHistory(updated);
    addToast({
      type: 'success',
      title: 'Batch Formatting Applied',
      message: `Updated style for ${ids.length} selected subtitle cues.`,
      duration: 2500,
    });
  };

  /**
   * Batch delete multiple selected captions
   */
  const handleBatchDeleteCaptions = (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const updated = captions.filter((c) => !idSet.has(c.id));
    pushToHistory(updated);
    addToast({
      type: 'info',
      title: 'Captions Removed',
      message: `Deleted ${ids.length} selected caption blocks.`,
      duration: 2500,
    });
  };

  /**
   * Batch snap selected captions to audio gaps
   */
  const handleBatchSnapToAudio = async (ids: string[]) => {
    if (ids.length === 0) return;
    let peaks = waveformPeaks;
    if (peaks.length === 0) {
      peaks = generateSyntheticWaveformForCaptions(captions, duration);
      setWaveformPeaks(peaks);
    }
    const idSet = new Set(ids);
    const selectedList = captions.filter((c) => idSet.has(c.id));
    let working = [...captions];
    let adjusted = 0;

    for (let i = 0; i < selectedList.length; i++) {
      const cap = selectedList[i];
      setBulkSnapProgress({
        currentCaptionId: cap.id,
        index: i,
        total: selectedList.length,
      });
      await new Promise((r) => setTimeout(r, 60));
      const snapped = snapCaptionToAudio(cap, peaks, duration);
      if (Math.abs(snapped.start - cap.start) > 0.01 || Math.abs(snapped.end - cap.end) > 0.01) {
        adjusted++;
      }
      working = working.map((c) => (c.id === cap.id ? snapped : c));
      setCaptions([...working]);
    }
    setBulkSnapProgress(null);
    pushToHistory(working);
    addToast({
      type: 'success',
      title: 'Batch Snapped to Audio',
      message: `Aligned ${adjusted} of ${ids.length} selected captions to silence gaps.`,
      duration: 2500,
    });
  };

  // Search and Replace Handler
  const handleBulkReplace = (
    findText: string,
    replaceText: string,
    options: { matchCase: boolean; wholeWord: boolean }
  ) => {
    if (!findText) return { replacedCount: 0, affectedCaptions: 0 };

    const flags = options.matchCase ? 'g' : 'gi';
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped;
    const regex = new RegExp(pattern, flags);

    let totalReplaced = 0;
    let affected = 0;

    const updatedCaptions = captions.map((c) => {
      const matches = c.text.match(regex);
      if (matches && matches.length > 0) {
        totalReplaced += matches.length;
        affected += 1;
        const newText = c.text.replace(regex, replaceText);
        const words = generateWordTimestampsForText(newText, c.start, c.end);
        return {
          ...c,
          text: newText,
          words,
        };
      }
      return c;
    });

    if (totalReplaced > 0) {
      pushToHistory(updatedCaptions);
      addToast({
        type: 'success',
        title: 'Search & Replace Completed',
        message: `Replaced ${totalReplaced} occurrence${totalReplaced > 1 ? 's' : ''} across ${affected} subtitle block${affected > 1 ? 's' : ''}.`,
      });
    } else {
      addToast({
        type: 'info',
        title: 'No Matches',
        message: `"${findText}" was not found in any captions.`,
      });
    }

    return { replacedCount: totalReplaced, affectedCaptions: affected };
  };

  // Auto-Fix Spell-Check Handler
  const handleAutoFixCaptions = (options?: SpellcheckOptions) => {
    const result = autoFixAllCaptions(captions, options);
    if (result.totalFixesCount > 0) {
      pushToHistory(result.updatedCaptions);
      addToast({
        type: 'success',
        title: 'Spell-Check Auto-Correction Applied',
        message: `Corrected ${result.totalFixesCount} transcription errors/punctuation across ${result.affectedCaptionsCount} subtitle blocks.`,
      });
    } else {
      addToast({
        type: 'info',
        title: 'All Captions Clean',
        message: 'No spelling errors, punctuation faults, or stutter duplicates detected!',
      });
    }
    return { totalFixesCount: result.totalFixesCount };
  };

  // AI Keyword Bolding & Context Emoji Auto-Highlighting Handler
  const handleAIHighlightKeywords = () => {
    if (captions.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Captions Available',
        message: 'Please add or transcribe subtitles first.',
      });
      return;
    }
    const result = autoHighlightKeywordsAndEmojis(captions);
    if (result.stats.highlightedCount > 0 || result.stats.emojisAddedCount > 0) {
      pushToHistory(result.captions);
      addToast({
        type: 'success',
        title: 'AI Keyword & Emoji Polish Applied',
        message: `Emphasized ${result.stats.highlightedCount} power words & attached ${result.stats.emojisAddedCount} context emojis!`,
        duration: 3500,
      });
    } else {
      addToast({
        type: 'info',
        title: 'Already Polished',
        message: 'All emphasis words and emojis are already up to date!',
      });
    }
  };

  // Bulk Translation Handler
  const handleBulkTranslate = async (targetLangCode: string) => {
    if (captions.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Captions to Translate',
        message: 'Please add or transcribe subtitles first.',
      });
      return;
    }

    setIsTranslating(true);
    setTranslationProgress({ percent: 10, status: 'Preparing translation...' });

    try {
      const translatedCaps = await bulkTranslateCaptions(
        captions,
        targetLangCode,
        apiKey,
        (progress, status) => {
          setTranslationProgress({ percent: progress, status });
        }
      );

      pushToHistory(translatedCaps);

      const targetLangName =
        SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === targetLangCode)?.name || targetLangCode;

      addToast({
        type: 'success',
        title: 'Captions Translated',
        message: `Translated all ${translatedCaps.length} subtitles to ${targetLangName}!`,
        duration: 5000,
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Translation Failed',
        message: error?.message || 'Could not translate captions. Check internet connection or API key.',
      });
    } finally {
      setIsTranslating(false);
      setTranslationProgress({ percent: 0, status: '' });
    }
  };

  // Generate Dual Captions (English primary + secondary translated track)
  const handleGenerateDualCaptions = async (targetLangCode: string) => {
    if (captions.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Captions Available',
        message: 'Please add or transcribe subtitles before generating dual captions.',
      });
      return;
    }

    setIsGeneratingDual(true);
    setTranslationProgress({ percent: 10, status: 'Generating secondary language track...' });

    try {
      const dualCaps = await bulkGenerateDualCaptions(
        captions,
        targetLangCode,
        apiKey,
        (progress, status) => {
          setTranslationProgress({ percent: progress, status });
        }
      );

      pushToHistory(dualCaps);
      setStyle((prev) => ({
        ...prev,
        dualCaptionEnabled: true,
        secondaryLanguage: targetLangCode,
      }));

      const langObj = SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === targetLangCode);

      addToast({
        type: 'success',
        title: 'Dual Subtitles Ready',
        message: `Generated bilingual subtitles (English + ${langObj?.name || targetLangCode})!`,
        duration: 5000,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Dual Subtitles Failed',
        message: err?.message || 'Could not generate secondary captions.',
      });
    } finally {
      setIsGeneratingDual(false);
      setTranslationProgress({ percent: 0, status: '' });
    }
  };

  // Swap Primary and Secondary Language Captions
  const handleSwapDualCaptions = () => {
    const swapped = captions.map((c) => {
      const primary = c.text;
      const secondary = c.secondaryText || '';
      return {
        ...c,
        text: secondary || primary,
        secondaryText: primary,
        words: generateWordTimestampsForText(secondary || primary, c.start, c.end),
      };
    });

    pushToHistory(swapped);
    addToast({
      type: 'info',
      title: 'Languages Swapped',
      message: 'Primary and secondary language tracks have been swapped.',
    });
  };

  // Clear Secondary Captions
  const handleClearSecondaryCaptions = () => {
    const cleaned = captions.map((c) => ({
      ...c,
      secondaryText: undefined,
    }));
    pushToHistory(cleaned);
    setStyle((prev) => ({ ...prev, dualCaptionEnabled: false }));
    addToast({
      type: 'info',
      title: 'Secondary Subtitles Removed',
      message: 'Secondary subtitle tracks cleared.',
    });
  };

  const handleClearAllCaptions = () => {
    if (captions.length === 0) return;
    const emptyCaps: Caption[] = [];
    setCaptions(emptyCaps);
    pushToHistory(emptyCaps);
    try {
      localStorage.removeItem('subly_autosave_state');
      setLastAutoSavedTime(null);
    } catch {}
    addToast({
      type: 'info',
      title: 'Captions Cleared',
      message: 'All captions removed from timeline. Press Ctrl+Z to undo.',
    });
  };

  const handleResetAllProject = () => {
    const emptyCaps: Caption[] = [];
    setCaptions(emptyCaps);
    pushToHistory(emptyCaps);
    setStyle(DEFAULT_STYLE);
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoSource(SAMPLE_VIDEOS[0].url);
    setVideoUrl(SAMPLE_VIDEOS[0].url);
    setCurrentVideoName('New Project');
    setCurrentVideoType('sample');
    setCurrentSampleVideoId(SAMPLE_VIDEOS[0].id);
    setWaveformPeaks([]);
    clearVideoFileFromDB();
    setPendingSessionRecovery(null);
    try {
      localStorage.removeItem('subly_autosave_state');
      setLastAutoSavedTime(null);
    } catch {}
    addToast({
      type: 'info',
      title: 'New Project Started',
      message: 'Workspace cleared and ready for new captions.',
    });
  };

  const handleResetProject = () => {
    if (captions.length === 0) {
      handleResetAllProject();
      return;
    }
    setIsClearModalOpen(true);
  };

  // Load a Saved Project from Library
  const handleLoadProject = (proj: SavedProject) => {
    setCaptions(proj.captions);
    setHistory([proj.captions]);
    setHistoryIndex(0);
    setStyle(proj.style);
    setCurrentVideoName(proj.videoName || 'Project Video');
    setCurrentVideoType(proj.videoType);
    setCurrentSampleVideoId(proj.sampleVideoId);

    if (proj.videoType === 'sample' && proj.sampleVideoId) {
      const foundSample = SAMPLE_VIDEOS.find((s) => s.id === proj.sampleVideoId);
      if (foundSample) {
        if (videoUrl && videoUrl.startsWith('blob:')) {
          URL.revokeObjectURL(videoUrl);
        }
        setVideoSource(foundSample.url);
        setVideoUrl(foundSample.url);
        setSourceVideoFileSize(undefined);
        setAspectRatio(foundSample.aspect);
      }
    }
  };

  const handleStartNewProject = () => {
    handleResetAllProject();
  };

  const handleApplyTemplateStyle = (newStyle: SubtitleStyle, templateName: string) => {
    setStyle(newStyle);
    addToast({
      type: 'success',
      title: 'Preset Style Applied',
      message: `Applied "${templateName}" styling to active captions.`,
    });
  };

  const handleLoadFullTemplateProject = (template: ProjectTemplate) => {
    if (template.sampleVideoUrl) {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
      setVideoSource(template.sampleVideoUrl);
      setVideoUrl(template.sampleVideoUrl);
      setCurrentVideoName(template.sampleVideoName || template.name);
      setCurrentVideoType('sample');
      setSourceVideoFileSize(undefined);
    }
    setAspectRatio(template.aspect);
    setStyle(template.style);
    pushToHistory(template.demoCaptions);
    const syntheticPeaks = generateSyntheticWaveformForCaptions(template.demoCaptions, 15);
    setWaveformPeaks(syntheticPeaks);
    setCurrentTime(0);
    addToast({
      type: 'success',
      title: 'Template Project Loaded',
      message: `Loaded full "${template.name}" project template with video & cues.`,
    });
  };

  // Global Keyboard Shortcuts (including Undo / Redo & Custom Keybindings)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Undo / Redo key combinations even inside inputs if Ctrl/Cmd is pressed
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
          return;
        } else {
          e.preventDefault();
          handleUndo();
          return;
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
        return;
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setIsExportPreviewOpen((prev) => !prev);
        return;
      }

      // Ignore normal playback shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const matchesKey = (binding: string) => {
        if (!binding) return false;
        if (binding.toLowerCase() === 'space' && (e.code === 'Space' || e.key === ' ')) return true;
        if (binding.toLowerCase() === 'arrowleft' && e.code === 'ArrowLeft') return true;
        if (binding.toLowerCase() === 'arrowright' && e.code === 'ArrowRight') return true;
        if (binding.toLowerCase() === 'arrowup' && e.code === 'ArrowUp') return true;
        if (binding.toLowerCase() === 'arrowdown' && e.code === 'ArrowDown') return true;
        return e.key.toLowerCase() === binding.toLowerCase();
      };

      if (matchesKey(keybindings.playPause) || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handlePlayPause();
      } else if (matchesKey(keybindings.seekBackShort)) {
        e.preventDefault();
        handleSeek(currentTime - 0.1);
      } else if (matchesKey(keybindings.seekForwardShort)) {
        e.preventDefault();
        handleSeek(currentTime + 0.1);
      } else if (matchesKey(keybindings.seekBackJump)) {
        e.preventDefault();
        handleSeek(currentTime - 2);
      } else if (matchesKey(keybindings.seekForwardJump)) {
        e.preventDefault();
        handleSeek(currentTime + 2);
      } else if (matchesKey(keybindings.addCaption)) {
        e.preventDefault();
        handleAddCaption(currentTime);
      } else if (matchesKey(keybindings.toggleMute)) {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.muted = !videoRef.current.muted;
        }
      } else if (e.key === '[' && captions.length > 0) {
        e.preventDefault();
        const prevCap = [...captions].reverse().find((c) => c.start < currentTime - 0.1);
        if (prevCap) handleSeek(prevCap.start);
      } else if (e.key === ']' && captions.length > 0) {
        e.preventDefault();
        const nextCap = captions.find((c) => c.start > currentTime + 0.1);
        if (nextCap) handleSeek(nextCap.start);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, captions, keybindings, handleUndo, handleRedo]);

  // Drag and Drop Video Files onto window
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm'))) {
      handleUploadVideo(file);
    }
  };

  // If on Welcome Page Screen, render WelcomePage
  if (currentScreen === 'welcome') {
    return (
      <div className={themeMode === 'dark' ? 'dark' : ''}>
        <WelcomePage
          onStartNewProject={() => {
            handleResetAllProject();
            setCurrentScreen('editor');
          }}
          onUploadVideo={(file) => {
            handleUploadVideo(file);
            setCurrentScreen('editor');
          }}
          onSelectSampleVideo={(sample) => {
            handleSelectSample(sample);
            setCurrentScreen('editor');
          }}
          onOpenTranscribe={() => {
            setCurrentScreen('editor');
            setIsTranscribeOpen(true);
          }}
          onOpenTemplate={(tmpl) => {
            handleLoadFullTemplateProject(tmpl);
            setCurrentScreen('editor');
          }}
          onLoadSavedProject={(proj) => {
            handleLoadProject(proj);
            setCurrentScreen('editor');
          }}
          onResumePreviousSession={() => {
            handleResumePreviousSession();
            setCurrentScreen('editor');
          }}
          onDiscardPreviousSession={handleDiscardPreviousSession}
          pendingSessionRecovery={pendingSessionRecovery}
          hasActiveProject={captions.length > 0}
          activeProjectName={currentVideoName}
          captionsCount={captions.length}
          onReturnToEditor={() => setCurrentScreen('editor')}
          themeMode={themeMode}
          onToggleThemeMode={handleToggleThemeMode}
          onOpenApiKeyModal={() => setIsApiKeyOpen(true)}
          onOpenShortcutsModal={() => setIsShortcutsOpen(true)}
          onOpenTourModal={() => {
            setCurrentScreen('editor');
            setIsOnboardingTourOpen(true);
          }}
          hasApiKey={Boolean(apiKey || groqKey || deepgramKey)}
        />

        {/* Global Modals accessible directly from Welcome Page */}
        {isApiKeyOpen && (
          <ApiKeyModal
            isOpen={isApiKeyOpen}
            onClose={() => setIsApiKeyOpen(false)}
            onSaveApiKey={(key) => {
              setApiKey(key);
              try {
                localStorage.setItem('openai_whisper_api_key', key);
              } catch {}
            }}
            initialKey={apiKey}
            groqKey={groqKey}
            onSaveGroqKey={(key) => {
              setGroqKey(key);
              try {
                localStorage.setItem('groq_api_key', key);
              } catch {}
            }}
            deepgramKey={deepgramKey}
            onSaveDeepgramKey={(key) => {
              setDeepgramKey(key);
              try {
                localStorage.setItem('deepgram_api_key', key);
              } catch {}
            }}
          />
        )}

        {isShortcutsOpen && (
          <ShortcutsModal
            isOpen={isShortcutsOpen}
            onClose={() => setIsShortcutsOpen(false)}
            keybindings={keybindings}
            onUpdateKeybindings={handleUpdateKeybindings}
          />
        )}

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div
      id="subtitle-studio-app"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col font-sans relative selection:bg-indigo-600 selection:text-white transition-colors duration-200"
    >
      {/* Ambient Glassmorphic Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-indigo-600/[0.08] rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-purple-600/[0.06] rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-blue-600/[0.06] rounded-full blur-3xl" />
      </div>

      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-indigo-600/20 backdrop-blur-sm border-4 border-dashed border-indigo-500 flex flex-col items-center justify-center pointer-events-none animate-in fade-in">
          <Upload className="w-16 h-16 text-indigo-400 mb-3 animate-bounce" />
          <h2 className="text-2xl font-black text-white">Drop your Video File here!</h2>
          <p className="text-sm text-zinc-300 mt-1">Supports MP4, WebM, QuickTime formats</p>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        onGoHome={() => setCurrentScreen('welcome')}
        onUploadVideo={handleUploadVideo}
        onSelectSampleVideo={handleSelectSample}
        onOpenTranscribeModal={() => setIsTranscribeOpen(true)}
        onOpenImportExportModal={() => setIsImportExportOpen(true)}
        onOpenExportPreview={() => setIsExportPreviewOpen(true)}
        onOpenApiKeyModal={() => setIsApiKeyOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsOpen(true)}
        onOpenProjectsModal={() => setIsProjectsOpen(true)}
        onOpenTemplatesModal={() => setIsTemplatesModalOpen(true)}
        onOpenTourModal={() => setIsOnboardingTourOpen(true)}
        projectTitle={currentVideoName}
        onUpdateProjectTitle={setCurrentVideoName}
        themeMode={themeMode}
        onToggleThemeMode={handleToggleThemeMode}
        onResetProject={handleResetProject}
        onNewProject={handleResetProject}
        hasApiKey={Boolean(apiKey || groqKey || deepgramKey)}
        captionsCount={captions.length}
        lastAutoSavedTime={lastAutoSavedTime}
        isAutoSaving={isAutoSaving}
        onTriggerAutoSave={performAutoSave}
      />

      {/* Previous Session Recovery Prompt Banner */}
      {pendingSessionRecovery && (
        <div className="px-3 sm:px-4 pt-3 max-w-7xl w-full mx-auto relative z-30">
          <div
            id="session-recovery-banner"
            className="bg-indigo-50/95 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-3 sm:p-3.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-800 dark:text-zinc-100 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/15 dark:bg-indigo-500/20 border border-indigo-300 dark:border-indigo-500/40 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Previous Project Found:</span>
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 truncate max-w-[240px]">
                    {pendingSessionRecovery.videoName}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-500/30">
                    {pendingSessionRecovery.captionsCount} captions
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                    • Saved {pendingSessionRecovery.formattedTime}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                  Would you like to resume your previous work, or start a new project with a clean canvas?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              <button
                type="button"
                id="resume-session-btn"
                onClick={handleResumePreviousSession}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                title="Restore captions from previous session"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Resume Work
              </button>
              <button
                type="button"
                id="discard-session-btn"
                onClick={handleDiscardPreviousSession}
                className="px-3 py-1.5 bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 active:scale-95 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-medium transition-all"
                title="Discard previous draft and work on a clean blank canvas"
              >
                Start Fresh
              </button>
              <button
                type="button"
                id="dismiss-session-btn"
                onClick={() => setPendingSessionRecovery(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Top View Switcher Pill (Visible only on < lg screens) */}
      <div className="lg:hidden px-4 pt-3 pb-1 max-w-7xl w-full mx-auto relative z-10">
        <div className="bg-zinc-950/40 backdrop-blur-xl p-1 rounded-2xl border border-white/[0.08] flex items-center gap-1 overflow-x-auto no-scrollbar shadow-lg">
          <button
            type="button"
            onClick={() => setMobileTab('all')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>All Views</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'preview'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Video</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileTab('captions');
              setActiveTab('captions');
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'captions' || (mobileTab === 'all' && false)
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CaptionsIcon className="w-3.5 h-3.5" />
            <span>Captions ({captions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileTab('styles');
              setActiveTab('styles');
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'styles'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Styles</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('timeline')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'timeline'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </button>
        </div>
      </div>

      {/* Main Studio Dual-Pane Layout */}
      <main className="flex-1 w-full px-3 sm:px-5 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start pb-24 lg:pb-6 relative z-10">
        {/* LEFT COLUMN: Video Player & Visual Timeline Track (Cols 1-7) */}
        <section
          className={`lg:col-span-7 flex flex-col gap-4 ${
            mobileTab === 'captions' || mobileTab === 'styles' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Video Player */}
          <div
            className={`w-full bg-white dark:bg-zinc-950/40 backdrop-blur-2xl p-2.5 sm:p-3.5 rounded-3xl border border-slate-200/90 dark:border-white/[0.08] shadow-lg shadow-slate-200/60 dark:shadow-2xl transition-colors duration-200 ${
              mobileTab === 'timeline' ? 'hidden lg:block' : 'block'
            }`}
          >
            <VideoPlayer
              videoUrl={videoUrl}
              videoRef={videoRef}
              captions={captions}
              style={style}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              aspectRatio={aspectRatio}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onAspectRatioChange={setAspectRatio}
              onUpdateStyle={(updater) => setStyle((prev) => ({ ...prev, ...updater }))}
            />
          </div>

          {/* Timeline Track */}
          <div
            className={
              mobileTab === 'preview' && mobileTab !== 'all' ? 'hidden lg:block' : 'block'
            }
          >
            <TimelineTrack
              duration={duration}
              currentTime={currentTime}
              captions={captions}
              waveformPeaks={waveformPeaks}
              onSeek={handleSeek}
              onSnapAllToAudio={handleSnapAllCaptionsToAudio}
              bulkSnapProgress={bulkSnapProgress}
            />
          </div>
        </section>

        {/* RIGHT COLUMN: Tabbed Subtitle & Styling Studio (Cols 8-12) */}
        <section
          className={`lg:col-span-5 bg-white dark:bg-zinc-950/40 backdrop-blur-2xl rounded-[14px] border border-[#E5E7EC] dark:border-white/[0.08] shadow-sm dark:shadow-2xl overflow-hidden flex flex-col min-h-[500px] h-[calc(100vh-220px)] lg:h-[750px] lg:sticky lg:top-16 transition-colors duration-200 ${
            mobileTab === 'preview' || mobileTab === 'timeline' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Tab Navigation Header with Quick Export, Instant Search & Sync Status */}
          <div
            id="right-captions-panel-header"
            className="flex flex-col border-b border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-zinc-950/60 transition-colors"
          >
            {/* Top Row: Navigation Tabs, Sync Status, Copy All, Batch Actions, Export & Reset */}
            <div className="flex items-center gap-1.5 p-1.5 flex-wrap sm:flex-nowrap">
              <div className="flex-1 min-w-[200px] flex items-center bg-slate-200/70 dark:bg-zinc-900 p-0.5 rounded-lg border border-slate-300/60 dark:border-zinc-800">
                <button
                  type="button"
                  id="tab-captions-btn"
                  onClick={() => {
                    setActiveTab('captions');
                    if (mobileTab === 'styles') setMobileTab('captions');
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'captions'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <CaptionsIcon className="w-3.5 h-3.5" />
                  <span>Captions ({captions.length})</span>
                </button>

                <button
                  type="button"
                  id="tab-styles-btn"
                  onClick={() => {
                    setActiveTab('styles');
                    if (mobileTab === 'captions') setMobileTab('styles');
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'styles'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Styles & Presets</span>
                </button>
              </div>

              {/* Subtle 'Changes Saved' / 'Sync Status' Indicator */}
              <div
                id="header-sync-status"
                onClick={captions.length > 0 ? performAutoSave : undefined}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs border transition-all shrink-0 select-none ${
                  isAutoSaving
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 font-medium'
                    : captions.length > 0
                    ? 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:border-emerald-400/60 dark:hover:border-emerald-500/50 cursor-pointer shadow-2xs'
                    : 'bg-white dark:bg-zinc-900 text-slate-400 dark:text-zinc-500 border-slate-200 dark:border-zinc-800'
                }`}
                title={
                  isAutoSaving
                    ? 'Saving project changes...'
                    : lastAutoSavedTime
                    ? `Changes saved at ${lastAutoSavedTime}. Click to force save now.`
                    : 'All changes saved locally. Click to force save.'
                }
              >
                {isAutoSaving ? (
                  <>
                    <RotateCcw className="w-3 h-3 animate-spin text-indigo-500 shrink-0" />
                    <span className="text-[10.5px] font-semibold hidden sm:inline">Saving...</span>
                  </>
                ) : (
                  <>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                        captions.length > 0
                          ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                          : 'bg-slate-300 dark:bg-zinc-600'
                      }`}
                    />
                    <span className="text-[10.5px] font-medium hidden md:inline">
                      {lastAutoSavedTime ? `Saved ${lastAutoSavedTime}` : 'Changes Saved'}
                    </span>
                    <span className="text-[10.5px] font-medium md:hidden">Saved</span>
                  </>
                )}
              </div>

            {/* Copy All Captions Button */}
            <button
              type="button"
              id="tab-copy-all-btn"
              onClick={handleCopyAllCaptions}
              className="py-1.5 px-2 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 transition-all shadow-xs active:scale-95 shrink-0"
              title="Copy all full-text captions to clipboard"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                  <span className="hidden sm:inline text-[11px]">Copy All</span>
                </>
              )}
            </button>

            {/* Batch Actions Dropdown Menu */}
            <div className="relative shrink-0" ref={batchActionsRef}>
              <button
                type="button"
                id="tab-batch-actions-btn"
                onClick={() => setIsBatchActionsOpen(!isBatchActionsOpen)}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all shadow-xs active:scale-95 ${
                  isBatchActionsOpen
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-400/30'
                    : 'bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-800'
                }`}
                title="Batch Actions (Shift Timestamps, Bulk Keyword Highlighting)"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden md:inline text-[11px] font-semibold">Batch Actions</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isBatchActionsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isBatchActionsOpen && (
                <div
                  id="dropdown-batch-actions-menu"
                  className="absolute right-0 top-full mt-1.5 w-72 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl p-3 z-50 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      Batch Caption Actions
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                      {captions.length} cues
                    </span>
                  </div>

                  {/* 1. Shift All Timestamps */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        Shift All Timestamps
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500">Offset entire timeline</span>
                    </div>

                    {/* Quick Shift Chips */}
                    <div className="grid grid-cols-4 gap-1">
                      {[-1.0, -0.5, +0.5, +1.0].map((delta) => (
                        <button
                          key={delta}
                          type="button"
                          id={`btn-batch-shift-${delta > 0 ? `plus-${delta}` : `minus-${Math.abs(delta)}`}`}
                          onClick={() => {
                            handleShiftAllTimestamps(delta);
                            setIsBatchActionsOpen(false);
                          }}
                          className="py-1 px-1 text-[10px] font-mono font-bold rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-zinc-700 transition-colors text-center"
                        >
                          {delta > 0 ? `+${delta}s` : `${delta}s`}
                        </button>
                      ))}
                    </div>

                    {/* Custom Shift Input */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="0.1"
                          id="input-batch-shift-seconds"
                          value={customShiftInput}
                          onChange={(e) => setCustomShiftInput(e.target.value)}
                          placeholder="±0.5"
                          className="w-full pl-2 pr-5 py-1 text-xs font-mono bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">s</span>
                      </div>
                      <button
                        type="button"
                        id="btn-apply-batch-custom-shift"
                        onClick={() => {
                          const val = parseFloat(customShiftInput);
                          if (!isNaN(val) && val !== 0) {
                            handleShiftAllTimestamps(val);
                            setIsBatchActionsOpen(false);
                          }
                        }}
                        className="py-1 px-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-all active:scale-95"
                      >
                        Shift
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-zinc-800" />

                  {/* 2. Bulk Keyword Highlighting */}
                  <div>
                    <button
                      type="button"
                      id="btn-batch-keyword-highlight"
                      onClick={() => {
                        handleAIHighlightKeywords();
                        setIsBatchActionsOpen(false);
                      }}
                      className="w-full p-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/60 text-left transition-all group flex items-start gap-2.5 active:scale-98"
                    >
                      <div className="p-1.5 rounded-md bg-indigo-500 text-white shrink-0 mt-0.5 shadow-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            Bulk Keyword Highlighting
                          </span>
                          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/50 px-1 rounded">
                            Auto
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
                          Auto-bold viral power keywords & attach animated context emojis across all captions.
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* 3. Audio Silence Snap & Spellcheck Shortcuts */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100 dark:border-zinc-800">
                    <button
                      type="button"
                      id="btn-batch-snap-silence"
                      onClick={() => {
                        handleSnapAllCaptionsToAudio();
                        setIsBatchActionsOpen(false);
                      }}
                      className="p-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-[10px] font-medium text-slate-700 dark:text-zinc-300 text-left flex items-center gap-1.5"
                      title="Snap all captions to detected audio silence pauses"
                    >
                      <Activity className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span className="truncate">Snap to Silence</span>
                    </button>
                    <button
                      type="button"
                      id="btn-batch-spellcheck"
                      onClick={() => {
                        handleAutoFixCaptions();
                        setIsBatchActionsOpen(false);
                      }}
                      className="p-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-[10px] font-medium text-slate-700 dark:text-zinc-300 text-left flex items-center gap-1.5"
                      title="Auto-fix punctuation, capitalization, and spelling"
                    >
                      <Wand2 className="w-3 h-3 text-violet-500 shrink-0" />
                      <span className="truncate">Auto Spell-Fix</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Export Preview Button next to tabs */}
            <button
              type="button"
              id="tab-export-preview-btn"
              onClick={() => setIsExportPreviewOpen(true)}
              className="py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-white dark:bg-zinc-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all shadow-xs active:scale-95 shrink-0"
              title="Preview video burn-in with subtitles"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span className="hidden sm:inline">Preview</span>
            </button>

            {/* Quick Export Button next to tabs */}
            <button
              type="button"
              id="tab-export-btn"
              onClick={() => setIsImportExportOpen(true)}
              className="py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 transition-all shadow-xs active:scale-95 shrink-0"
              title="Export subtitles (SRT, VTT, TXT, JSON, MP4)"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Danger Clear Button next to tabs */}
            <button
              type="button"
              id="tab-clear-btn"
              onClick={handleResetProject}
              className="p-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-zinc-800 transition-all shrink-0"
              title="Clear / Reset Project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Instant Search Bar inside #right-captions-panel-header */}
          <div
            id="header-instant-search-container"
            className="px-2 pb-2 pt-1 border-t border-slate-200/70 dark:border-zinc-800/70 bg-white/40 dark:bg-zinc-900/30 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search
                id="instant-search-icon"
                className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                type="text"
                id="caption-instant-search-input"
                value={captionSearchQuery}
                onChange={(e) => {
                  setCaptionSearchQuery(e.target.value);
                  if (activeTab !== 'captions') {
                    setActiveTab('captions');
                    if (mobileTab === 'styles') setMobileTab('captions');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setCaptionSearchQuery('');
                  }
                }}
                placeholder="Instant search captions by keyword..."
                className="w-full bg-white dark:bg-zinc-950/90 border border-slate-200 dark:border-zinc-800 rounded-lg pl-8 pr-16 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400/20 transition-all shadow-2xs font-normal"
              />
              {captionSearchQuery && (
                <button
                  type="button"
                  id="clear-instant-search-btn"
                  onClick={() => setCaptionSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded border border-slate-200 dark:border-zinc-700 flex items-center gap-1 transition-all active:scale-95"
                  title="Clear instant search"
                >
                  <X className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {captionSearchQuery && (
              <span
                id="instant-search-matches-badge"
                className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-1 rounded-md border border-indigo-200 dark:border-indigo-800/60 shrink-0 select-none animate-in fade-in duration-150"
              >
                {matchingCaptionsCount}/{captions.length} found
              </span>
            )}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'captions' ? (
            <CaptionEditor
              captions={captions}
              currentTime={currentTime}
              duration={duration}
              waveformPeaks={waveformPeaks}
              searchQuery={captionSearchQuery}
              onSearchQueryChange={setCaptionSearchQuery}
              onSeek={handleSeek}
                onUpdateCaption={handleUpdateCaption}
                onAddCaption={handleAddCaption}
                onDeleteCaption={handleDeleteCaption}
                onDuplicateCaption={handleDuplicateCaption}
                onSplitCaption={handleSplitCaption}
                onMergeCaption={handleMergeCaption}
                onShiftAllTimestamps={handleShiftAllTimestamps}
                onSnapCaptionToAudio={handleSnapCaptionToAudio}
                onSnapAllToAudio={handleSnapAllCaptionsToAudio}
                onBatchUpdateCaptions={handleBatchUpdateCaptions}
                onBatchDeleteCaptions={handleBatchDeleteCaptions}
                onBatchSnapToAudio={handleBatchSnapToAudio}
                bulkSnapProgress={bulkSnapProgress}
                onBulkReplace={handleBulkReplace}
                onAutoFixCaptions={handleAutoFixCaptions}
                onHighlightKeywords={handleAIHighlightKeywords}
                onBulkTranslate={handleBulkTranslate}
                onGenerateDualCaptions={handleGenerateDualCaptions}
                onSwapDualCaptions={handleSwapDualCaptions}
                onClearSecondaryCaptions={handleClearSecondaryCaptions}
                onClearAllCaptions={handleClearAllCaptions}
                onSplitAllIntoSingleLineCues={handleSplitAllIntoSingleLineCues}
                dualCaptionEnabled={style.dualCaptionEnabled}
                isGeneratingDual={isGeneratingDual}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={canUndo}
                canRedo={canRedo}
                onOpenTranscribeModal={() => setIsTranscribeOpen(true)}
                onOpenTemplatesModal={() => setIsTemplatesModalOpen(true)}
                onSelectPresetStyle={() => setActiveTab('styles')}
                isTranslating={isTranslating}
                translationProgress={translationProgress}
              />
            ) : (
              <div className="p-4">
                <StyleCustomizer
                  style={style}
                  onChange={setStyle}
                  captionsCount={captions.length}
                  onOpenTemplatesModal={() => setIsTemplatesModalOpen(true)}
                  onOpenTranscribeModal={() => setIsTranscribeOpen(true)}
                />
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Floating Bottom Navigation Dock for Mobile Devices (< lg screens) */}
      <div
        id="mobile-bottom-dock"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-zinc-800/80 px-2 py-2 flex items-center justify-around shadow-lg safe-area-bottom"
      >
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            mobileTab === 'preview'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
              : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Play className="w-5 h-5" />
          <span className="text-[10px]">Preview</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileTab('captions');
            setActiveTab('captions');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all relative ${
            mobileTab === 'captions' || (mobileTab === 'all' && activeTab === 'captions')
              ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
              : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <CaptionsIcon className="w-5 h-5" />
          <span className="text-[10px]">Captions</span>
          {captions.length > 0 && (
            <span className="absolute top-0 right-1.5 w-4 h-4 bg-indigo-600 dark:bg-indigo-600 text-white rounded-full text-[9px] font-mono flex items-center justify-center">
              {captions.length > 99 ? '99+' : captions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileTab('styles');
            setActiveTab('styles');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            mobileTab === 'styles' || (mobileTab === 'all' && activeTab === 'styles')
              ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
              : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Palette className="w-5 h-5" />
          <span className="text-[10px]">Styles</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('timeline')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
            mobileTab === 'timeline'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
              : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px]">Timeline</span>
        </button>

        <button
          type="button"
          onClick={() => setIsImportExportOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-slate-700 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white transition-all font-semibold"
        >
          <Download className="w-5 h-5" />
          <span className="text-[10px]">Export</span>
        </button>
      </div>

      {/* Modals */}
      <ClearCaptionsModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        captionsCount={captions.length}
        onConfirmClearCaptions={handleClearAllCaptions}
        onConfirmResetAll={handleResetAllProject}
      />

      <AiTranscriptionModal
        isOpen={isTranscribeOpen}
        onClose={() => setIsTranscribeOpen(false)}
        apiKey={apiKey}
        groqKey={groqKey}
        deepgramKey={deepgramKey}
        onOpenApiKeyModal={() => setIsApiKeyOpen(true)}
        videoSource={videoSource}
        videoDuration={duration}
        onCaptionsGenerated={(newCaps, newPeaks) => {
          pushToHistory(newCaps);
          if (newPeaks) setWaveformPeaks(newPeaks);
        }}
        onShowToast={addToast}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        captions={captions}
        style={style}
        videoElement={videoRef.current}
        currentTime={currentTime}
        videoName={currentVideoName}
        sourceVideoFileSize={sourceVideoFileSize}
        aspectRatio={aspectRatio}
        onCaptionsImported={(imported) => {
          pushToHistory(imported);
        }}
        onStyleImported={setStyle}
        onShowToast={addToast}
      />

      {/* Standalone Export Preview Modal */}
      <ExportPreviewModal
        isOpen={isExportPreviewOpen}
        onClose={() => setIsExportPreviewOpen(false)}
        videoElement={videoRef.current}
        captions={captions}
        style={style}
        currentTime={currentTime}
        duration={duration}
        videoFormat="mp4"
        videoQuality="high"
        videoFps={30}
        videoResolution="1080p"
        videoAspectRatio={aspectRatio}
        videoFitMode="fill"
        onStartFullRender={(newSettings) => {
          setIsExportPreviewOpen(false);
          if (newSettings?.aspectRatio) {
            setAspectRatio(newSettings.aspectRatio);
          }
          setIsImportExportOpen(true);
        }}
      />

      <ApiKeyModal
        isOpen={isApiKeyOpen}
        onClose={() => setIsApiKeyOpen(false)}
        currentKey={apiKey}
        groqKey={groqKey}
        deepgramKey={deepgramKey}
        onSaveKey={handleSaveApiKey}
        onSaveGroqKey={handleSaveGroqKey}
        onSaveDeepgramKey={handleSaveDeepgramKey}
        onSaveAllKeys={handleSaveAllKeys}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        keybindings={keybindings}
        onUpdateKeybindings={handleUpdateKeybindings}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        keybindings={keybindings}
      />

      <ProjectsModal
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
        currentCaptions={captions}
        currentStyle={style}
        currentVideoName={currentVideoName}
        currentVideoType={currentVideoType}
        currentSampleVideoId={currentSampleVideoId}
        onLoadProject={handleLoadProject}
        onStartNewProject={handleStartNewProject}
        onShowToast={addToast}
      />

      {/* Quick Start Project Templates Modal */}
      <QuickStartTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onApplyStyle={handleApplyTemplateStyle}
        onLoadFullProject={handleLoadFullTemplateProject}
        currentStyleId={style.id}
      />

      {/* Interactive Step-by-Step Onboarding Tour */}
      <OnboardingTour
        isOpen={isOnboardingTourOpen}
        onClose={() => setIsOnboardingTourOpen(false)}
        onComplete={() => {
          addToast({
            type: 'info',
            title: 'Tour Completed!',
            message: 'You are now ready to create viral video subtitles.',
          });
        }}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
