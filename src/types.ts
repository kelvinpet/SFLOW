export interface WordTimestamp {
  id: string;
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface CaptionStyleOverride {
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  isBold?: boolean;
  isItalic?: boolean;
  fontWeight?: 'normal' | 'bold' | 400 | 500 | 600 | 700 | 800 | 900;
  fontStyle?: 'normal' | 'italic';
  textTransform?: TextTransform;
}

export interface Caption {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  secondaryText?: string; // Dual language / secondary translation line
  words?: WordTimestamp[];

  // Per-caption style overrides & batch formatting
  isBold?: boolean;
  isItalic?: boolean;
  customFontSize?: number;
  customColor?: string;
  customBgColor?: string;
  customTextTransform?: TextTransform;
  styleOverride?: CaptionStyleOverride;
}

export type SubtitleFontFamily =
  | 'Inter'
  | 'Roboto'
  | 'Montserrat'
  | 'Lobster'
  | 'Poppins'
  | 'Anton'
  | 'Bebas Neue'
  | 'Outfit'
  | 'Plus Jakarta Sans'
  | 'Syne'
  | 'Archivo Black'
  | 'Bangers'
  | 'Permanent Marker'
  | 'Impact'
  | 'Playfair Display'
  | 'Arial'
  | 'Georgia'
  | 'Courier New';

export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

export type WordHighlightEffect =
  | 'karaoke'
  | 'bounce'
  | 'color-only'
  | 'box-highlight'
  | 'underline'
  | 'glow'
  | 'none';

export type SubtitlePositionPreset = 'top' | 'middle' | 'bottom' | 'tiktok-safe' | 'custom';

export type DisplayMode = 'full-sentence' | 'chunked-3-words' | 'single-word';

export type SttProvider = 'groq' | 'deepgram' | 'openai' | 'demo';

export type EntranceAnimation =
  | 'none'
  | 'fade-in'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'pop-scale'
  | 'zoom-in'
  | 'bounce-in';

export type ExitAnimation =
  | 'none'
  | 'fade-out'
  | 'slide-up'
  | 'slide-down'
  | 'pop-out'
  | 'zoom-out'
  | 'drop-blur';

export type AnimationEasing = 'ease-out' | 'spring' | 'bounce' | 'ease-in-out' | 'linear';

export interface SubtitleStyle {
  id?: string;
  name?: string;
  category?: string;
  fontFamily: SubtitleFontFamily;
  fontSize: number; // in px at 1080p scale (responsive)
  fontWeight: 400 | 500 | 600 | 700 | 800 | 900;
  textTransform: TextTransform;
  textColor: string;
  activeWordColor: string;
  activeWordBgColor: string;
  activeWordScale: number; // e.g. 1.15
  wordHighlightEffect: WordHighlightEffect;
  inactiveWordColor?: string;
  inactiveWordOpacity?: number; // e.g. 0.5 for karaoke effect
  
  // Auto-Scale and Single-Line Constraints
  autoScaleFontSize?: boolean; // Dynamically adapts font size across 9:16 and 1:1 to avoid overflow
  aspectRatioFontScaling?: boolean; // Dynamically scales caption font size relative to video aspect ratio (e.g. 9:16 vs 16:9)
  aspectRatioScaleMultipliers?: {
    'original'?: number;
    '9:16'?: number; // e.g. 0.92 for compact vertical mobile reels
    '16:9'?: number; // e.g. 1.25 for balanced widescreen desktop/TV legibility
    '1:1'?: number;  // e.g. 1.05 for square social feeds
    '4:5'?: number;  // e.g. 1.0 for portrait feeds
  };
  maxLines?: number; // Maximum lines of caption text (1 for single-line strict mode)
  audioSyncOffsetMs?: number; // Real-time audio/subtitle sync latency calibration in milliseconds (e.g. +200ms)

  // Keyframe & Motion Animations
  entranceAnimation?: EntranceAnimation;
  exitAnimation?: ExitAnimation;
  animationDurationMs?: number; // Duration of entrance & exit transitions in ms (e.g. 250ms)
  animationEasing?: AnimationEasing;
  keyframeIntensity?: number; // Scale/offset intensity multiplier (0.5 to 2.0, default 1.0)

  // Dual Subtitles Configuration
  dualCaptionEnabled?: boolean;
  secondaryLanguage?: string;
  secondaryTextColor?: string;
  secondaryFontSize?: number;
  secondaryFontWeight?: 400 | 500 | 600 | 700 | 800 | 900;
  secondaryOpacity?: number;
  dualCaptionLayout?: 'primary-top' | 'secondary-top';

  // Background highlight box
  showBackgroundBox: boolean;
  backgroundColor: string;
  backgroundOpacity: number; // 0 to 1
  backgroundPaddingX: number;
  backgroundPaddingY: number;
  backgroundBorderRadius: number;

  // Stroke / Outline
  strokeWidth: number; // in px
  strokeColor: string;

  // Shadow / Glow
  enableTextShadow?: boolean;
  shadowIntensity?: number; // 0 - 100
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;

  // Position
  positionPreset: SubtitlePositionPreset;
  yOffsetPercent: number; // 0 (top) to 100 (bottom)
  xOffsetPercent: number; // -50 to 50
  textAlign: 'left' | 'center' | 'right';
  maxWidthPercent: number; // e.g. 85%

  // Display mode
  displayMode: DisplayMode;
  maxWordsPerSegment: number;
}

export type AspectRatioType = 'original' | '9:16' | '16:9' | '1:1' | '4:5';

export type VideoResolutionPreset =
  | '360p'
  | '480p'
  | '720p'
  | '1080p'
  | '1440p'
  | '4k'
  | '8k'
  | 'original';

export interface AspectRatioConfig {
  id: AspectRatioType;
  label: string;
  description: string;
  widthRatio: number;
  heightRatio: number;
  aspectClass: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

export interface TranscriptionProgress {
  status: 'idle' | 'extracting-audio' | 'uploading' | 'transcribing' | 'formatting' | 'complete' | 'error';
  progressPercent: number;
  message: string;
  error?: string;
}

export interface ExportProgress {
  isExporting: boolean;
  progressPercent: number;
  statusText: string;
}

export interface CustomKeybindings {
  playPause: string;        // e.g. 'Space'
  seekBackShort: string;    // e.g. 'ArrowLeft' (-0.1s)
  seekForwardShort: string; // e.g. 'ArrowRight' (+0.1s)
  seekBackJump: string;     // e.g. 'j' (-2s)
  seekForwardJump: string;  // e.g. 'l' (+2s)
  addCaption: string;       // e.g. 'a'
  toggleMute: string;       // e.g. 'm'
}

export interface AutoSaveData {
  timestamp: number;
  formattedTime: string;
  captionsCount: number;
  captions: Caption[];
  style: SubtitleStyle;
  videoName?: string;
  videoType?: 'sample' | 'file';
  sampleVideoId?: string;
}

export interface PendingSessionRecovery {
  videoName: string;
  captionsCount: number;
  formattedTime: string;
  captions: Caption[];
  style?: SubtitleStyle;
  videoType?: 'sample' | 'file';
  sampleVideoId?: string;
  timestamp: number;
}

export interface BulkSnappingState {
  isSnapping: boolean;
  currentCueIndex: number;
  totalCues: number;
  activeCaptionId: string | null;
  activeTimeRange: { start: number; end: number } | null;
  activeTextPreview: string;
}

export type AccentPaletteId =
  | 'cyber-cyan'
  | 'emerald-mint'
  | 'electric-violet'
  | 'warm-amber'
  | 'classic-indigo';

export interface AccentPaletteOption {
  id: AccentPaletteId;
  name: string;
  subtitle: string;
  primaryColor: string;
  hoverColor: string;
  darkBg: string;
}
