import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Key,
  Wand2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Languages,
  Zap,
  Mic,
} from 'lucide-react';
import { Caption, TranscriptionProgress, SttProvider } from '../types';
import { extractAudioWaveformAndWav } from '../utils/audioExtractor';
import { transcribeAudio, generateDemoCaptions } from '../utils/whisperApi';

interface AiTranscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  groqKey?: string;
  deepgramKey?: string;
  onOpenApiKeyModal: () => void;
  videoSource: File | string | null;
  videoDuration: number;
  onCaptionsGenerated: (captions: Caption[], waveformPeaks?: number[]) => void;
  onShowToast: (toast: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message?: string }) => void;
}

const LANGUAGES = [
  { code: 'auto', name: '🌐 Auto-Detect Language' },
  { code: 'en', name: '🇺🇸 English' },
  { code: 'es', name: '🇪🇸 Spanish' },
  { code: 'fr', name: '🇫🇷 French' },
  { code: 'de', name: '🇩🇪 German' },
  { code: 'it', name: '🇮🇹 Italian' },
  { code: 'pt', name: '🇧🇷 Portuguese' },
  { code: 'ja', name: '🇯🇵 Japanese' },
  { code: 'ko', name: '🇰🇷 Korean' },
  { code: 'zh', name: '🇨🇳 Chinese' },
  { code: 'hi', name: '🇮🇳 Hindi' },
  { code: 'ar', name: '🇸🇦 Arabic' },
];

export const AiTranscriptionModal: React.FC<AiTranscriptionModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  groqKey = '',
  deepgramKey = '',
  onOpenApiKeyModal,
  videoSource,
  videoDuration,
  onCaptionsGenerated,
  onShowToast,
}) => {
  const [provider, setProvider] = useState<SttProvider>(() => {
    if (groqKey) return 'groq';
    if (deepgramKey) return 'deepgram';
    if (apiKey) return 'openai';
    return 'groq';
  });

  const [groqModel, setGroqModel] = useState('whisper-large-v3');
  const [deepgramModel, setDeepgramModel] = useState('nova-2');
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [customPrompt, setCustomPrompt] = useState('');
  const [progress, setProgress] = useState<TranscriptionProgress>({
    status: 'idle',
    progressPercent: 0,
    message: '',
  });

  if (!isOpen) return null;

  const isTranscribing = progress.status !== 'idle' && progress.status !== 'complete' && progress.status !== 'error';

  const currentProviderKey =
    provider === 'groq' ? groqKey : provider === 'deepgram' ? deepgramKey : apiKey;

  const handleStartTranscription = async () => {
    if (!videoSource) {
      onShowToast({
        type: 'warning',
        title: 'No Video Loaded',
        message: 'Please upload or select a video first.',
      });
      return;
    }

    if (!currentProviderKey && provider !== 'demo') {
      onShowToast({
        type: 'warning',
        title: `${provider.toUpperCase()} Key Required`,
        message: `Please add your ${provider === 'groq' ? 'Groq' : provider === 'deepgram' ? 'Deepgram' : 'OpenAI'} API key or switch to Demo mode.`,
      });
      onOpenApiKeyModal();
      return;
    }

    try {
      setProgress({
        status: 'extracting-audio',
        progressPercent: 20,
        message: 'Extracting clean audio stream from video...',
      });

      const { wavBlob, waveformPeaks } = await extractAudioWaveformAndWav(
        videoSource,
        (pct, step) => {
          setProgress({
            status: 'extracting-audio',
            progressPercent: Math.round(pct * 0.4),
            message: step,
          });
        }
      );

      setProgress({
        status: 'transcribing',
        progressPercent: 50,
        message: `Connecting to ${provider.toUpperCase()} Speech-to-Text API...`,
      });

      const result = await transcribeAudio(
        wavBlob,
        {
          provider,
          apiKey: currentProviderKey,
          groqKey,
          deepgramKey,
          openaiKey: apiKey,
          model: provider === 'groq' ? groqModel : deepgramModel,
          language: selectedLanguage,
          prompt: customPrompt,
        },
        (step) => {
          setProgress((prev) => ({
            ...prev,
            progressPercent: Math.min(92, prev.progressPercent + 15),
            message: step,
          }));
        }
      );

      setProgress({
        status: 'complete',
        progressPercent: 100,
        message: `Transcription successful via ${result.providerUsed}! Generated ${result.captions.length} synchronized subtitles.`,
      });

      onCaptionsGenerated(result.captions, waveformPeaks);
      onShowToast({
        type: 'success',
        title: 'Transcription Complete!',
        message: `Generated ${result.captions.length} captions with word timestamps using ${result.providerUsed}.`,
      });

      setTimeout(() => {
        onClose();
        setProgress({ status: 'idle', progressPercent: 0, message: '' });
      }, 1000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown transcription error';
      setProgress({
        status: 'error',
        progressPercent: 0,
        message: 'Transcription failed',
        error: errorMessage,
      });
      onShowToast({
        type: 'error',
        title: 'Transcription Error',
        message: errorMessage,
      });
    }
  };

  const handleRunDemoTranscription = () => {
    setProgress({
      status: 'transcribing',
      progressPercent: 40,
      message: 'Generating smart demo captions with word timestamps...',
    });

    setTimeout(() => {
      const demoCaps = generateDemoCaptions(videoDuration || 15);
      onCaptionsGenerated(demoCaps);
      setProgress({
        status: 'complete',
        progressPercent: 100,
        message: 'Demo captions loaded!',
      });
      onShowToast({
        type: 'success',
        title: 'Demo Captions Applied',
        message: 'Sample subtitles with word timestamps loaded.',
      });

      setTimeout(() => {
        onClose();
        setProgress({ status: 'idle', progressPercent: 0, message: '' });
      }, 600);
    }, 500);
  };

  return (
    <div
      id="ai-transcribe-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        id="ai-transcribe-modal-card"
        className="w-full max-w-xl bg-white dark:bg-zinc-950/90 backdrop-blur-2xl border border-[#E5E7EC] dark:border-white/[0.12] rounded-[16px] p-6 shadow-2xl relative text-[#171923] dark:text-zinc-100 max-h-[90vh] overflow-y-auto"
      >
        <button
          id="close-transcribe-modal"
          onClick={onClose}
          disabled={isTranscribing}
          className="absolute top-5 right-5 text-[#525866] dark:text-zinc-400 hover:text-[#171923] dark:hover:text-white p-1.5 rounded-lg bg-[#F3F4F7] dark:bg-white/[0.04] hover:bg-[#EAECEF] dark:hover:bg-white/[0.1] border border-[#E0E3E8] dark:border-white/[0.08] transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#684BEB] to-[#8B5CF6] border border-indigo-400/40 flex items-center justify-center text-white shadow-md shadow-[#684BEB]/20 backdrop-blur-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#171923] dark:text-white flex items-center gap-2">
              AI Speech-to-Text Transcription
            </h3>
            <p className="text-xs text-[#525866] dark:text-zinc-400">
              Generate precise word-level synced captions using Groq, Deepgram, or OpenAI
            </p>
          </div>
        </div>

        {/* STT Provider Selector with explicit dropdown and quick cards */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="stt-provider-dropdown" className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Speech-to-Text Provider
            </label>
            <span className="text-[10px] text-zinc-500 font-mono">
              {provider === 'groq' ? '⚡ Ultra-Fast (~1s)' : provider === 'deepgram' ? '🎙️ Nova-2 Model' : '🤖 Whisper-1 Model'}
            </span>
          </div>

          {/* Explicit Provider Dropdown */}
          <select
            id="stt-provider-dropdown"
            value={provider}
            onChange={(e) => setProvider(e.target.value as SttProvider)}
            disabled={isTranscribing}
            className="w-full bg-black/35 border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-indigo-400/80 transition-colors backdrop-blur-sm"
          >
            <option value="groq" className="bg-zinc-900 text-amber-400">
              ⚡ Groq Cloud (Whisper-large-v3 - Ultra Fast & High Accuracy)
            </option>
            <option value="deepgram" className="bg-zinc-900 text-cyan-400">
              🎙️ Deepgram (Nova-2 Speech Engine - Word Timestamps)
            </option>
            <option value="openai" className="bg-zinc-900 text-indigo-400">
              🤖 OpenAI (Whisper-1 Cloud API)
            </option>
          </select>

          {/* Quick Selection Cards */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              id="stt-provider-groq-btn"
              onClick={() => setProvider('groq')}
              className={`p-2.5 rounded-2xl border flex flex-col items-start gap-1 text-left transition-all backdrop-blur-sm ${
                provider === 'groq'
                  ? 'bg-amber-500/15 border-amber-500/80 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/40'
                  : 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-amber-400" /> Groq
                </span>
                {groqKey && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
              </div>
              <span className="text-[10px] text-zinc-400 leading-tight">Whisper v3 (~1s)</span>
            </button>

            <button
              type="button"
              id="stt-provider-deepgram-btn"
              onClick={() => setProvider('deepgram')}
              className={`p-2.5 rounded-2xl border flex flex-col items-start gap-1 text-left transition-all backdrop-blur-sm ${
                provider === 'deepgram'
                  ? 'bg-cyan-500/15 border-cyan-500/80 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                  : 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5" /> Deepgram
                </span>
                {deepgramKey && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
              </div>
              <span className="text-[10px] text-zinc-400 leading-tight">Nova-2 STT</span>
            </button>

            <button
              type="button"
              id="stt-provider-openai-btn"
              onClick={() => setProvider('openai')}
              className={`p-2.5 rounded-2xl border flex flex-col items-start gap-1 text-left transition-all backdrop-blur-sm ${
                provider === 'openai'
                  ? 'bg-indigo-500/15 border-indigo-500/80 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                  : 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5" /> OpenAI
                </span>
                {apiKey && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
              </div>
              <span className="text-[10px] text-zinc-400 leading-tight">Whisper-1</span>
            </button>
          </div>
        </div>

        {/* API Key Status Bar for Selected Provider */}
        <div className="mb-5 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Key className="w-4 h-4 text-indigo-400" />
            <span className="text-zinc-400">
              {provider === 'groq' ? 'Groq Key:' : provider === 'deepgram' ? 'Deepgram Token:' : 'OpenAI Key:'}
            </span>
            {currentProviderKey ? (
              <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ••••{currentProviderKey.slice(-4)}
              </span>
            ) : (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Key not entered
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenApiKeyModal}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
          >
            {currentProviderKey ? 'Change Keys' : 'Enter API Key'}
          </button>
        </div>

        {/* Configuration Options */}
        <div className="space-y-4 mb-6">
          {provider === 'groq' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Groq Model</span>
                <span className="text-[10px] text-amber-400 font-mono">10x Realtime Speed</span>
              </label>
              <select
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
                disabled={isTranscribing}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="whisper-large-v3">whisper-large-v3 (Highest Accuracy)</option>
                <option value="whisper-large-v3-turbo">whisper-large-v3-turbo (Ultra Fast)</option>
              </select>
            </div>
          )}

          {provider === 'deepgram' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Deepgram Model</span>
                <span className="text-[10px] text-cyan-400 font-mono">Nova-2 STT</span>
              </label>
              <select
                value={deepgramModel}
                onChange={(e) => setDeepgramModel(e.target.value)}
                disabled={isTranscribing}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="nova-2">nova-2 (General Speech & Podcasts)</option>
                <option value="nova-2-conversationalai">nova-2-conversationalai</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-zinc-400" />
              Spoken Audio Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              disabled={isTranscribing}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-zinc-900 text-white">
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-zinc-400" />
              Prompt Guidance & Custom Terminology (Optional)
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={isTranscribing}
              placeholder="e.g., Brand names, technical acronyms, or creator names"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Progress State Display */}
        {isTranscribing && (
          <div className="mb-6 p-4 rounded-2xl bg-zinc-950 border border-indigo-500/30 text-xs space-y-3">
            <div className="flex items-center justify-between text-indigo-300 font-semibold">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                {progress.message}
              </span>
              <span className="font-mono">{progress.progressPercent}%</span>
            </div>

            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {progress.status === 'error' && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold">Transcription error:</p>
              <p className="text-zinc-300 mt-0.5 font-mono text-[11px]">{progress.error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/[0.08]">
          <button
            type="button"
            id="run-demo-transcription-btn"
            onClick={handleRunDemoTranscription}
            disabled={isTranscribing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#343842] dark:text-zinc-300 hover:text-[#171923] dark:hover:text-white bg-white dark:bg-white/[0.05] hover:bg-[#F5F6FA] dark:hover:bg-white/[0.1] border border-[#DDE1E8] dark:border-white/[0.08] rounded-lg transition-all disabled:opacity-50"
          >
            <Zap className="w-4 h-4 text-[#684BEB]" />
            <span>Generate Sample Captions (No Key)</span>
          </button>

          <button
            type="button"
            id="start-whisper-transcription-btn"
            onClick={handleStartTranscription}
            disabled={isTranscribing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#684BEB] to-[#8B5CF6] hover:from-[#5638D6] hover:to-[#7C3AED] rounded-lg shadow-md shadow-[#684BEB]/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isTranscribing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Transcribing Audio...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Transcribe with {provider === 'groq' ? 'Groq' : provider === 'deepgram' ? 'Deepgram' : 'OpenAI'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

