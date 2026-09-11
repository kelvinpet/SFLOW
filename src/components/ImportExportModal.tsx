import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  FileText,
  Copy,
  Check,
  Camera,
  Film,
  X,
  Code2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Sliders,
  Play,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { Caption, SubtitleStyle, AspectRatioType, VideoResolutionPreset } from '../types';
import { exportToSRT, exportToVTT, exportToASS, exportToTXT, parseSRT, parseVTT } from '../utils/srtParser';
import { captureStyledFrame, renderVideoWithSubtitles, getSupportedMimeType } from '../utils/videoRecorder';
import { exportVideoWithWebCodecs, isWebCodecsSupported } from '../utils/webcodecsExporter';
import {
  RESOLUTION_PRESET_CONFIGS,
  calculateExportDimensions,
  calculateExportBitrate,
  estimateExportFileSize,
} from '../utils/resolutionPresets';
import { ExportPreviewModal } from './ExportPreviewModal';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  captions: Caption[];
  style: SubtitleStyle;
  videoElement: HTMLVideoElement | null;
  currentTime: number;
  videoName?: string;
  sourceVideoFileSize?: number;
  aspectRatio?: AspectRatioType;
  onCaptionsImported: (captions: Caption[]) => void;
  onStyleImported?: (style: SubtitleStyle) => void;
  onShowToast: (toast: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message?: string }) => void;
}

interface ExportTaskState {
  isActive: boolean;
  fileName: string;
  format: 'SRT' | 'VTT' | 'ASS' | 'TXT' | 'JSON' | 'PNG' | 'MP4' | 'WEBM';
  progress: number;
  currentStep: string;
  totalCues: number;
  processedCues: number;
  estimatedSize: string;
  isCompleted: boolean;
}

/**
 * Visual Circular Progress Ring with Green Completion Checkmark State
 */
const CircularProgressRing: React.FC<{
  progress: number;
  isCompleted: boolean;
  size?: number;
  strokeWidth?: number;
}> = ({ progress, isCompleted, size = 64, strokeWidth = 5 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  if (isCompleted || progress >= 100) {
    return (
      <div
        className="rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/30 animate-in zoom-in-90 duration-300"
        style={{ width: size, height: size }}
      >
        <Check className="w-8 h-8 stroke-[3.5] text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-800"
        />
        {/* Progress Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progress-gradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-200 ease-out"
        />
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-xs font-mono font-bold text-white tracking-tight">{progress}%</span>
      </div>
    </div>
  );
};

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  captions,
  style,
  videoElement,
  currentTime,
  videoName,
  sourceVideoFileSize,
  aspectRatio,
  onCaptionsImported,
  onStyleImported,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  
  // Video export configuration
  const [videoFormat, setVideoFormat] = useState<'mp4' | 'webm'>('mp4');
  const [videoQuality, setVideoQuality] = useState<'ultra' | 'studio' | 'high' | 'standard'>('ultra');
  const [videoFps, setVideoFps] = useState<30 | 60>(30);
  const [videoResolution, setVideoResolution] = useState<VideoResolutionPreset>('1080p');
  const [videoAspectRatio, setVideoAspectRatio] = useState<AspectRatioType>(aspectRatio || 'original');
  const [videoFitMode, setVideoFitMode] = useState<'fill' | 'fit'>('fill');
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [isExportPreviewOpen, setIsExportPreviewOpen] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatus, setRenderStatus] = useState('');
  const [completedRender, setCompletedRender] = useState<{
    url: string;
    fileName: string;
    format: string;
    sizeFormatted: string;
  } | null>(null);

  // Sync aspectRatio prop if provided
  React.useEffect(() => {
    if (aspectRatio) {
      setVideoAspectRatio(aspectRatio);
    }
  }, [aspectRatio]);

  // Compute live export dimensions and bitrate estimates
  const nativeVideoW = videoElement?.videoWidth || 1920;
  const nativeVideoH = videoElement?.videoHeight || 1080;
  const currentExportDimensions = calculateExportDimensions(
    videoResolution,
    videoAspectRatio,
    nativeVideoW,
    nativeVideoH
  );
  const currentExportBitrate = calculateExportBitrate(
    videoResolution,
    videoQuality,
    nativeVideoW,
    nativeVideoH
  );
  const estimatedExportFileSize = estimateExportFileSize(
    videoElement?.duration || 15,
    currentExportBitrate
  );
  
  // Visual conversion task state for files
  const [exportTask, setExportTask] = useState<ExportTaskState | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const supportedFormats = getSupportedMimeType(videoFormat);

  // Visual Conversion & Download workflow with step-by-step progress
  const processAndDownloadFile = async (
    content: string,
    filename: string,
    mimeType: string,
    format: 'SRT' | 'VTT' | 'ASS' | 'TXT' | 'JSON'
  ) => {
    const totalCues = captions.length;
    const estimatedBytes = new Blob([content]).size;
    const formattedSize = estimatedBytes > 1024 ? `${(estimatedBytes / 1024).toFixed(1)} KB` : `${estimatedBytes} B`;

    setExportTask({
      isActive: true,
      fileName: filename,
      format,
      progress: 15,
      currentStep: `Analyzing ${totalCues} caption timeline cues...`,
      totalCues,
      processedCues: Math.floor(totalCues * 0.2),
      estimatedSize: formattedSize,
      isCompleted: false,
    });

    await new Promise((r) => setTimeout(r, 200));

    setExportTask((prev) =>
      prev
        ? {
            ...prev,
            progress: 55,
            currentStep: `Calculating precise millisecond timecodes & word offsets...`,
            processedCues: Math.floor(totalCues * 0.7),
          }
        : null
    );

    await new Promise((r) => setTimeout(r, 250));

    setExportTask((prev) =>
      prev
        ? {
            ...prev,
            progress: 88,
            currentStep: `Encoding ${format} payload and generating download stream...`,
            processedCues: totalCues,
          }
        : null
    );

    await new Promise((r) => setTimeout(r, 250));

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExportTask((prev) =>
      prev
        ? {
            ...prev,
            progress: 100,
            currentStep: `Conversion & download complete!`,
            isCompleted: true,
          }
        : null
    );

    onShowToast({
      type: 'success',
      title: `${format} Subtitles Exported`,
      message: `Successfully saved ${filename} (${formattedSize}, ${totalCues} cues).`,
    });

    setTimeout(() => {
      setExportTask(null);
    }, 1600);
  };

  const handleCopyClipboard = async (text: string, format: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
      onShowToast({
        type: 'success',
        title: 'Copied to Clipboard',
        message: `${format} text copied to clipboard.`,
      });
    } catch {
      onShowToast({
        type: 'error',
        title: 'Copy Failed',
        message: 'Could not write to clipboard.',
      });
    }
  };

  const handleCaptureSnapshot = async () => {
    if (!videoElement) {
      onShowToast({
        type: 'error',
        title: 'Video Not Ready',
        message: 'Please ensure video is loaded before capturing a frame.',
      });
      return;
    }

    try {
      setExportTask({
        isActive: true,
        fileName: `subtitle-frame-${Math.floor(currentTime)}s.png`,
        format: 'PNG',
        progress: 30,
        currentStep: 'Compositing video frame & rendering typography...',
        totalCues: captions.length,
        processedCues: 1,
        estimatedSize: 'HD Snapshot',
        isCompleted: false,
      });

      const dataUrl = await captureStyledFrame(
        videoElement,
        captions,
        currentTime,
        style,
        videoResolution,
        videoAspectRatio
      );

      setExportTask((prev) =>
        prev
          ? {
              ...prev,
              progress: 90,
              currentStep: 'Exporting PNG image to storage...',
            }
          : null
      );

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `subtitle-frame-${videoResolution}-${Math.floor(currentTime)}s.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setExportTask((prev) =>
        prev
          ? {
              ...prev,
              progress: 100,
              currentStep: 'Snapshot saved successfully!',
              isCompleted: true,
            }
          : null
      );

      onShowToast({
        type: 'success',
        title: 'Snapshot Saved',
        message: `Styled frame captured in ${videoResolution.toUpperCase()} resolution.`,
      });

      setTimeout(() => setExportTask(null), 1400);
    } catch (err: unknown) {
      setExportTask(null);
      onShowToast({
        type: 'error',
        title: 'Snapshot Failed',
        message: err instanceof Error ? err.message : 'Error capturing frame',
      });
    }
  };

  const handleBurnInRender = async () => {
    if (!videoElement) {
      onShowToast({
        type: 'error',
        title: 'Video Not Ready',
        message: 'No video element loaded.',
      });
      return;
    }

    try {
      setCompletedRender(null);
      setIsRenderingVideo(true);
      setRenderProgress(0);
      setRenderStatus('Initializing high-definition canvas renderer...');

      let finalBlob: Blob;
      let finalFormat = videoFormat;
      let fileSize = 0;

      const exportBitrate = currentExportBitrate;

      // Check if WebCodecs is available for faster-than-real-time MP4 rendering
      if (videoFormat === 'mp4' && isWebCodecsSupported()) {
        try {
          const webCodecsResult = await exportVideoWithWebCodecs(
            videoElement,
            captions,
            style,
            {
              fps: videoFps,
              resolution: videoResolution,
              aspectRatio: videoAspectRatio,
              fitMode: videoFitMode,
              bitrate: exportBitrate,
              onProgress: (pct, status) => {
                setRenderProgress(pct);
                setRenderStatus(status);
              },
            }
          );
          finalBlob = webCodecsResult.blob;
          fileSize = webCodecsResult.size;
          finalFormat = 'mp4';
        } catch (webcodecsErr) {
          console.warn('WebCodecs hardware encoder error, falling back to MediaRecorder:', webcodecsErr);
          setRenderStatus('Switching to real-time render fallback...');
          const result = await renderVideoWithSubtitles(
            videoElement,
            captions,
            style,
            {
              format: videoFormat,
              quality: videoQuality,
              fps: videoFps,
              resolution: videoResolution,
              sourceFileSize: sourceVideoFileSize,
              aspectRatio: videoAspectRatio,
              fitMode: videoFitMode,
            },
            (pct, status) => {
              setRenderProgress(pct);
              setRenderStatus(status);
            }
          );
          finalBlob = result.blob;
          fileSize = result.fileSize;
          finalFormat = result.format as 'mp4' | 'webm';
        }
      } else {
        // Fallback to MediaRecorder pipeline
        const result = await renderVideoWithSubtitles(
          videoElement,
          captions,
          style,
          {
            format: videoFormat,
            quality: videoQuality,
            fps: videoFps,
            resolution: videoResolution,
            sourceFileSize: sourceVideoFileSize,
            aspectRatio: videoAspectRatio,
            fitMode: videoFitMode,
          },
          (pct, status) => {
            setRenderProgress(pct);
            setRenderStatus(status);
          }
        );
        finalBlob = result.blob;
        fileSize = result.fileSize;
        finalFormat = result.format as 'mp4' | 'webm';
      }

      const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      const formattedSize = `${sizeMB} MB`;
      const baseVideoTitle = videoName ? videoName.replace(/\.[^/.]+$/, '') : 'captioned-video';
      const sanitizedTitle = baseVideoTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
      const resTag = videoResolution === 'original' ? '' : `_${videoResolution}`;
      const fileName = `${sanitizedTitle}${resTag}_captioned.${finalFormat}`;

      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setCompletedRender({
        url,
        fileName,
        format: finalFormat.toUpperCase(),
        sizeFormatted: formattedSize,
      });

      setIsRenderingVideo(false);
      onShowToast({
        type: 'success',
        title: 'Render & Download Complete',
        message: `Saved ${fileName} (${formattedSize}, ${finalFormat.toUpperCase()})!`,
      });
    } catch (err: unknown) {
      setIsRenderingVideo(false);
      onShowToast({
        type: 'error',
        title: 'Burn-In Render Failed',
        message: err instanceof Error ? err.message : 'Error rendering video',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) return;

        if (fileName.endsWith('.srt')) {
          const parsed = parseSRT(content);
          if (!parsed.length) throw new Error('No valid SRT cues found in file.');
          onCaptionsImported(parsed);
          onShowToast({
            type: 'success',
            title: 'SRT Subtitles Imported',
            message: `Loaded ${parsed.length} caption blocks successfully.`,
          });
          onClose();
        } else if (fileName.endsWith('.vtt')) {
          const parsed = parseVTT(content);
          if (!parsed.length) throw new Error('No valid WebVTT cues found in file.');
          onCaptionsImported(parsed);
          onShowToast({
            type: 'success',
            title: 'VTT Subtitles Imported',
            message: `Loaded ${parsed.length} caption blocks successfully.`,
          });
          onClose();
        } else if (fileName.endsWith('.json')) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            onCaptionsImported(parsed);
          } else if (parsed.captions && Array.isArray(parsed.captions)) {
            onCaptionsImported(parsed.captions);
            if (parsed.style && onStyleImported) {
              onStyleImported(parsed.style);
            }
          } else {
            throw new Error('Unrecognized JSON subtitle format.');
          }
          onShowToast({
            type: 'success',
            title: 'Project Imported',
            message: 'Captions and project styling loaded successfully.',
          });
          onClose();
        } else {
          if (content.includes('-->')) {
            const parsed = content.includes('WEBVTT') ? parseVTT(content) : parseSRT(content);
            if (parsed.length) {
              onCaptionsImported(parsed);
              onShowToast({
                type: 'success',
                title: 'Subtitles Imported',
                message: `Loaded ${parsed.length} captions.`,
              });
              onClose();
              return;
            }
          }
          throw new Error('Unsupported file extension. Please upload .srt, .vtt, or .json.');
        }
      } catch (err: unknown) {
        onShowToast({
          type: 'error',
          title: 'Import Failed',
          message: err instanceof Error ? err.message : 'Error parsing subtitle file',
        });
      }
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const srtContent = exportToSRT(captions);
  const vttContent = exportToVTT(captions);
  const assContent = exportToASS(captions, style.fontFamily);
  const txtContent = exportToTXT(captions);
  const jsonContent = JSON.stringify({ version: '1.0', captions, style }, null, 2);

  return (
    <div
      id="import-export-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        id="import-export-modal-card"
        className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl relative text-zinc-100 max-h-[88vh] overflow-y-auto"
      >
        <button
          id="close-import-export-modal"
          onClick={onClose}
          disabled={isRenderingVideo || Boolean(exportTask?.isActive && !exportTask?.isCompleted)}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Export & Share</h3>
            <p className="text-xs text-zinc-400">Render captioned video or download subtitle files</p>
          </div>
        </div>

        {/* Visual Circular Progress Indicator Overlay for File Conversions & Downloads */}
        {exportTask && (
          <div
            id="export-progress-banner"
            className="mb-5 p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CircularProgressRing
                  progress={exportTask.progress}
                  isCompleted={exportTask.isCompleted}
                  size={44}
                  strokeWidth={4}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{exportTask.fileName}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-bold border border-zinc-700">
                      {exportTask.format}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{exportTask.currentStep}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-zinc-200">{exportTask.progress}%</span>
                <span className="block text-[10px] text-zinc-500 font-mono">{exportTask.estimatedSize}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-800">
              <span>Phase: {exportTask.progress < 50 ? 'Parsing & Indexing' : exportTask.progress < 90 ? 'Formatting Cues' : 'Packaging Stream'}</span>
              <span>{exportTask.processedCues} / {exportTask.totalCues} cues</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'export'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Media & Files</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'import'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import (.SRT / .VTT)</span>
          </button>
        </div>

        {activeTab === 'export' ? (
          <div className="space-y-5">
            {/* Captioned Video Burn-in Section */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Film className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Render Captioned Video</h4>
                    <p className="text-[11px] text-zinc-400">Burn subtitles directly into your video at full resolution</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {videoFps} FPS • {videoFormat.toUpperCase()}
                </span>
              </div>

              {/* Format, Quality & FPS Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* Format Toggle */}
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-zinc-400 mb-1 tracking-wider">
                    Format
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                    <button
                      type="button"
                      id="select-format-mp4"
                      onClick={() => setVideoFormat('mp4')}
                      className={`py-1 px-2 rounded text-xs font-semibold transition-all ${
                        videoFormat === 'mp4'
                          ? 'bg-zinc-800 text-white shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      MP4
                    </button>
                    <button
                      type="button"
                      id="select-format-webm"
                      onClick={() => setVideoFormat('webm')}
                      className={`py-1 px-2 rounded text-xs font-semibold transition-all ${
                        videoFormat === 'webm'
                          ? 'bg-zinc-800 text-white shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      WebM
                    </button>
                  </div>
                </div>

                {/* Bitrate / Quality */}
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-zinc-400 mb-1 tracking-wider">
                    Quality
                  </label>
                  <select
                    value={videoQuality}
                    onChange={(e) => setVideoQuality(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-600 font-medium"
                  >
                    <option value="ultra">Master Match (45-50 Mbps)</option>
                    <option value="studio">High Bitrate (28 Mbps)</option>
                    <option value="high">Standard HD (16 Mbps)</option>
                    <option value="standard">Compressed (10 Mbps)</option>
                  </select>
                </div>

                {/* Frame Rate */}
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-zinc-400 mb-1 tracking-wider">
                    Frame Rate
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setVideoFps(30)}
                      className={`py-1 px-2 rounded text-xs font-semibold transition-all ${
                        videoFps === 30
                          ? 'bg-zinc-800 text-white shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      30 fps
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoFps(60)}
                      className={`py-1 px-2 rounded text-xs font-semibold transition-all ${
                        videoFps === 60
                          ? 'bg-zinc-800 text-white shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      60 fps
                    </button>
                  </div>
                </div>
              </div>

              {/* Aspect Ratio & Full-Screen Framing Controls */}
              <div className="pt-1 border-t border-zinc-800/80 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Aspect Ratio Selector */}
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-zinc-400 mb-1 tracking-wider">
                      Target Dimensions
                    </label>
                    <select
                      id="select-export-aspect-ratio"
                      value={videoAspectRatio}
                      onChange={(e) => setVideoAspectRatio(e.target.value as AspectRatioType)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-600 font-medium"
                    >
                      <option value="original">
                        Original Video ({videoElement ? `${videoElement.videoWidth}×${videoElement.videoHeight}` : 'Native'} - Full Screen)
                      </option>
                      <option value="9:16">9:16 Vertical (1080×1920 - Reel / Shorts / TikTok)</option>
                      <option value="16:9">16:9 Landscape (1920×1080 - YouTube / Desktop)</option>
                      <option value="1:1">1:1 Square (1080×1080 - Instagram Feed)</option>
                      <option value="4:5">4:5 Portrait (1080×1350 - Social Carousel)</option>
                    </select>
                  </div>

                  {/* Framing Fit Mode */}
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-zinc-400 mb-1 tracking-wider">
                      Framing Mode
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                      <button
                        type="button"
                        id="select-fitmode-fill"
                        onClick={() => setVideoFitMode('fill')}
                        className={`py-1 px-2 rounded text-xs font-semibold transition-all whitespace-nowrap ${
                          videoFitMode === 'fill'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Fills the entire canvas with zero black bars"
                      >
                        Full Screen (Fill)
                      </button>
                      <button
                        type="button"
                        id="select-fitmode-fit"
                        onClick={() => setVideoFitMode('fit')}
                        className={`py-1 px-2 rounded text-xs font-semibold transition-all whitespace-nowrap ${
                          videoFitMode === 'fit'
                            ? 'bg-zinc-800 text-white shadow-xs'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Fits entire frame inside canvas, adding letterbox bars if needed"
                      >
                        Fit (Letterbox)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Framing Explanatory Helper */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-[11px] text-zinc-400">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>
                    {videoFitMode === 'fill' || videoAspectRatio === 'original' ? (
                      <span className="text-zinc-300">
                        <strong className="text-indigo-300 font-semibold">Full Screen Active:</strong> Video will render edge-to-edge with <strong>zero black bars</strong>. Caption fonts automatically scale to the selected aspect ratio.
                      </span>
                    ) : (
                      <span>
                        <strong className="text-zinc-200 font-semibold">Fit Mode:</strong> Preserves exact source bounds inside the export canvas, padding unused borders with clean black bars.
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Pixel Resolution Selector (360p, 480p, 720p, 1080p, 1440p, 4K, 8K, Original) */}
              <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <label className="block text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                    Pixel Resolution (Export Quality)
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded-md bg-zinc-950 text-indigo-300 font-semibold border border-indigo-500/30">
                      {currentExportDimensions.width} × {currentExportDimensions.height} px
                    </span>
                    <span className="text-zinc-400 text-[10px]">
                      ({currentExportDimensions.megapixel} • {estimatedExportFileSize})
                    </span>
                  </div>
                </div>

                {/* Resolution Pill Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
                  {RESOLUTION_PRESET_CONFIGS.map((preset) => {
                    const isSelected = videoResolution === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        id={`select-resolution-${preset.id}`}
                        onClick={() => setVideoResolution(preset.id)}
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400 font-bold'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                        }`}
                        title={`${preset.label}: ${preset.description}`}
                      >
                        <span className="text-xs leading-tight">{preset.shortLabel}</span>
                        <span
                          className={`text-[9px] uppercase font-semibold tracking-wider leading-none mt-1 ${
                            isSelected ? 'text-indigo-100' : 'text-zinc-500'
                          }`}
                        >
                          {preset.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Resolution Explanatory & Performance Hint */}
                <div className="flex items-center justify-between px-1 text-[10px] text-zinc-500">
                  <span>
                    {videoResolution === '8k' && (
                      <span className="text-amber-400 font-medium">
                        ✨ 8K Master: 4320p ultra-clarity canvas with broadcast mastering bitrate.
                      </span>
                    )}
                    {videoResolution === '4k' && (
                      <span className="text-indigo-300 font-medium">
                        ✨ 4K UHD: 2160p cinema resolution ideal for high-resolution displays.
                      </span>
                    )}
                    {videoResolution === '1440p' && (
                      <span className="text-zinc-300 font-medium">
                        2K QHD: 1440p crisp resolution for PC and high-DPI tablets.
                      </span>
                    )}
                    {videoResolution === '1080p' && (
                      <span className="text-zinc-300 font-medium">
                        Full HD: Standard 1080p for YouTube, Instagram Reels, and TikTok.
                      </span>
                    )}
                    {videoResolution === '720p' && (
                      <span className="text-zinc-400">
                        HD 720p: Lightweight video with fast rendering and smaller file size.
                      </span>
                    )}
                    {(videoResolution === '360p' || videoResolution === '480p') && (
                      <span className="text-zinc-400">
                        SD {videoResolution}: Compact file size for quick previews, messaging, or low bandwidth.
                      </span>
                    )}
                    {videoResolution === 'original' && (
                      <span className="text-emerald-400 font-medium">
                        Native Source: Exact 1:1 pixel match to uploaded video file.
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-zinc-400 text-[10px]">
                    {(currentExportBitrate / 1_000_000).toFixed(1)} Mbps
                  </span>
                </div>
              </div>

              {/* Render in Progress */}
              {isRenderingVideo && (
                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <CircularProgressRing
                      progress={renderProgress}
                      isCompleted={renderProgress >= 100}
                      size={44}
                      strokeWidth={4}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs text-zinc-300 font-medium mb-1">
                        <span className="flex items-center gap-1.5 truncate">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                          <span className="truncate">{renderStatus}</span>
                        </span>
                        <span className="font-mono text-xs text-white font-bold shrink-0">{renderProgress}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full transition-all duration-200"
                          style={{ width: `${renderProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Render Completed Feedback */}
              {completedRender && !isRenderingVideo && (
                <div
                  id="render-completed-feedback"
                  className="p-4 bg-zinc-950 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-white truncate">Render Complete</h5>
                      <p className="text-[11px] text-zinc-400 font-mono truncate">
                        {completedRender.fileName} ({completedRender.sizeFormatted})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={completedRender.url}
                      download={completedRender.fileName}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs inline-flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setCompletedRender(null)}
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-all"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!isRenderingVideo && !completedRender && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    id="open-export-preview-btn"
                    onClick={() => setIsExportPreviewOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/40 hover:border-indigo-400 rounded-lg transition-all active:scale-95 shadow-2xs"
                    title="Open interactive video export preview with burned-in subtitles"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Export Preview</span>
                  </button>

                  <button
                    type="button"
                    id="render-download-video-btn"
                    onClick={handleBurnInRender}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Render & Download Video ({videoFormat.toUpperCase()})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Subtitle Formats List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Subtitle Files
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {captions.length} cues ready
                </span>
              </div>

              <div className="divide-y divide-zinc-800/60 rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                {/* SRT Row */}
                <div className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-900/60 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                      SRT
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-white block truncate">SubRip Subtitle</span>
                      <span className="text-[10px] text-zinc-400 block truncate">Universal timecoded subtitle format</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyClipboard(srtContent, 'SRT')}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                      title="Copy SRT to clipboard"
                    >
                      {copiedFormat === 'SRT' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      id="export-srt-btn"
                      onClick={() => processAndDownloadFile(srtContent, 'subtitles.srt', 'text/plain', 'SRT')}
                      className="px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-md inline-flex items-center gap-1 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      <span>.SRT</span>
                    </button>
                  </div>
                </div>

                {/* VTT Row */}
                <div className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-900/60 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                      VTT
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-white block truncate">WebVTT File</span>
                      <span className="text-[10px] text-zinc-400 block truncate">HTML5 video and web players</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyClipboard(vttContent, 'VTT')}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                      title="Copy VTT to clipboard"
                    >
                      {copiedFormat === 'VTT' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      id="export-vtt-btn"
                      onClick={() => processAndDownloadFile(vttContent, 'subtitles.vtt', 'text/vtt', 'VTT')}
                      className="px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-md inline-flex items-center gap-1 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      <span>.VTT</span>
                    </button>
                  </div>
                </div>

                {/* ASS Row */}
                <div className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-900/60 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                      ASS
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-white block truncate">SubStation Alpha</span>
                      <span className="text-[10px] text-zinc-400 block truncate">Premiere & DaVinci karaoke styling</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyClipboard(assContent, 'ASS')}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                      title="Copy ASS to clipboard"
                    >
                      {copiedFormat === 'ASS' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      id="export-ass-btn"
                      onClick={() => processAndDownloadFile(assContent, 'subtitles.ass', 'text/plain', 'ASS')}
                      className="px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-md inline-flex items-center gap-1 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      <span>.ASS</span>
                    </button>
                  </div>
                </div>

                {/* TXT Row */}
                <div className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-900/60 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                      TXT
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-white block truncate">Plain Transcript</span>
                      <span className="text-[10px] text-zinc-400 block truncate">Clean text without timestamps</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyClipboard(txtContent, 'TXT')}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                      title="Copy TXT to clipboard"
                    >
                      {copiedFormat === 'TXT' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      id="export-txt-btn"
                      onClick={() => processAndDownloadFile(txtContent, 'transcript.txt', 'text/plain', 'TXT')}
                      className="px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-md inline-flex items-center gap-1 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      <span>.TXT</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Utility Quick Exports: Snapshot & Backup JSON */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCaptureSnapshot}
                className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 text-xs font-medium text-zinc-300 hover:text-white inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-zinc-400" />
                <span>Capture Frame (PNG)</span>
              </button>

              <button
                type="button"
                onClick={() => processAndDownloadFile(jsonContent, 'project-captions.json', 'application/json', 'JSON')}
                className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 text-xs font-medium text-zinc-300 hover:text-white inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Code2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Backup Project (JSON)</span>
              </button>
            </div>
          </div>
        ) : (
          /* Import Tab */
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-indigo-500 bg-zinc-950/70 hover:bg-zinc-950 rounded-2xl p-8 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".srt,.vtt,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-indigo-400 group-hover:scale-110 flex items-center justify-center mx-auto mb-3 transition-transform shadow-lg shadow-indigo-500/10">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Click to Upload Subtitle File</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Supports standard <strong className="text-zinc-200">.SRT</strong>, <strong className="text-zinc-200">.VTT</strong>, and <strong className="text-zinc-200">.JSON</strong> project files
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 space-y-1.5">
              <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                <AlertCircle className="w-4 h-4 text-indigo-400" />
                <span>Import Guidelines</span>
              </div>
              <p>
                Importing subtitles will populate the editor timeline. Word-level timestamps will automatically be calculated if your file does not contain individual word cues.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 5-Second Export Preview Modal */}
      <ExportPreviewModal
        isOpen={isExportPreviewOpen}
        onClose={() => setIsExportPreviewOpen(false)}
        videoElement={videoElement}
        captions={captions}
        style={style}
        currentTime={currentTime}
        duration={videoElement?.duration || 15}
        videoFormat={videoFormat}
        videoQuality={videoQuality}
        videoFps={videoFps}
        videoResolution={videoResolution}
        videoAspectRatio={videoAspectRatio}
        videoFitMode={videoFitMode}
        onStartFullRender={(newSettings) => {
          if (newSettings) {
            if (newSettings.resolution) setVideoResolution(newSettings.resolution);
            if (newSettings.aspectRatio) setVideoAspectRatio(newSettings.aspectRatio);
            if (newSettings.fitMode) setVideoFitMode(newSettings.fitMode);
          }
          setIsExportPreviewOpen(false);
          handleBurnInRender();
        }}
      />
    </div>
  );
};
