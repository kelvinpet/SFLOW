import React, { useState, useEffect } from 'react';
import { Key, Lock, Eye, EyeOff, Check, Trash2, X, ExternalLink, ShieldCheck, Zap, Bot, Mic } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveKey?: (key: string) => void;
  currentKey: string;
  groqKey?: string;
  onSaveGroqKey?: (key: string) => void;
  deepgramKey?: string;
  onSaveDeepgramKey?: (key: string) => void;
  onSaveAllKeys?: (keys: { openaiKey: string; groqKey: string; deepgramKey: string }) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSaveKey,
  currentKey,
  groqKey = '',
  onSaveGroqKey,
  deepgramKey = '',
  onSaveDeepgramKey,
  onSaveAllKeys,
}) => {
  const [activeTab, setActiveTab] = useState<'groq' | 'deepgram' | 'openai'>('groq');
  
  const [openaiInput, setOpenaiInput] = useState(currentKey);
  const [groqInput, setGroqInput] = useState(groqKey);
  const [deepgramInput, setDeepgramInput] = useState(deepgramKey);
  
  const [showOpenai, setShowOpenai] = useState(false);
  const [showGroq, setShowGroq] = useState(false);
  const [showDeepgram, setShowDeepgram] = useState(false);

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setOpenaiInput(currentKey);
    setGroqInput(groqKey);
    setDeepgramInput(deepgramKey);
  }, [currentKey, groqKey, deepgramKey, isOpen]);

  if (!isOpen) return null;

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onSaveAllKeys) {
      onSaveAllKeys({
        openaiKey: openaiInput.trim(),
        groqKey: groqInput.trim(),
        deepgramKey: deepgramInput.trim(),
      });
    } else {
      if (onSaveKey) onSaveKey(openaiInput.trim());
      if (onSaveGroqKey) onSaveGroqKey(groqInput.trim());
      if (onSaveDeepgramKey) onSaveDeepgramKey(deepgramInput.trim());
    }

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  const handleSaveCurrentTab = () => {
    if (activeTab === 'groq') {
      if (onSaveGroqKey) onSaveGroqKey(groqInput.trim());
      else if (onSaveAllKeys) onSaveAllKeys({ openaiKey: openaiInput.trim(), groqKey: groqInput.trim(), deepgramKey: deepgramInput.trim() });
    } else if (activeTab === 'deepgram') {
      if (onSaveDeepgramKey) onSaveDeepgramKey(deepgramInput.trim());
      else if (onSaveAllKeys) onSaveAllKeys({ openaiKey: openaiInput.trim(), groqKey: groqInput.trim(), deepgramKey: deepgramInput.trim() });
    } else {
      if (onSaveKey) onSaveKey(openaiInput.trim());
      else if (onSaveAllKeys) onSaveAllKeys({ openaiKey: openaiInput.trim(), groqKey: groqInput.trim(), deepgramKey: deepgramInput.trim() });
    }
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div
      id="api-key-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        id="api-key-modal-card"
        className="w-full max-w-xl bg-zinc-950/80 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-6 shadow-2xl relative text-zinc-100 flex flex-col max-h-[90vh] overflow-y-auto"
      >
        <button
          id="close-api-key-modal"
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md shadow-indigo-500/10 backdrop-blur-md">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI STT Speech Providers & API Keys</h3>
            <p className="text-xs text-zinc-400">Configure Groq Whisper, Deepgram Nova, or OpenAI keys</p>
          </div>
        </div>

        {/* Provider Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 backdrop-blur-md rounded-2xl border border-white/[0.08] mb-5">
          <button
            type="button"
            id="tab-groq-key-btn"
            onClick={() => setActiveTab('groq')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'groq'
                ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Groq Whisper</span>
            {groqInput && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>

          <button
            type="button"
            id="tab-deepgram-key-btn"
            onClick={() => setActiveTab('deepgram')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'deepgram'
                ? 'bg-cyan-500 text-zinc-950 font-black shadow-md shadow-cyan-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Deepgram Nova</span>
            {deepgramInput && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>

          <button
            type="button"
            id="tab-openai-key-btn"
            onClick={() => setActiveTab('openai')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'openai'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>OpenAI</span>
            {openaiInput && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>
        </div>

        <form onSubmit={handleSaveAll} className="space-y-4">
          {/* GROQ TAB */}
          {activeTab === 'groq' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Groq Cloud API Key (gsk_...)
                </label>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30">
                  ⚡ Recommended: Ultra-Fast (10x faster)
                </span>
              </div>
              <div className="relative">
                <input
                  id="groq-api-key-input"
                  type={showGroq ? 'text' : 'password'}
                  value={groqInput}
                  onChange={(e) => setGroqInput(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2.5 pl-3.5 pr-20 text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowGroq(!showGroq)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                    title={showGroq ? 'Hide key' : 'Show key'}
                  >
                    {showGroq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {groqInput && (
                    <button
                      type="button"
                      onClick={() => setGroqInput('')}
                      className="p-1.5 text-rose-400 hover:text-rose-300 transition-colors"
                      title="Clear key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Groq Save / Status Row */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px]">
                  {groqInput.trim() ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Groq key entered ({groqInput.trim().length} chars)
                    </span>
                  ) : (
                    <span className="text-zinc-500">No Groq key entered</span>
                  )}
                </div>
                <button
                  type="button"
                  id="save-groq-key-btn"
                  onClick={handleSaveCurrentTab}
                  className="px-3 py-1.5 text-xs font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-all active:scale-95 shadow-sm shadow-amber-400/20"
                >
                  Save Groq Key
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-2">
                <p className="text-zinc-400 leading-relaxed">
                  Groq delivers near-instant transcription using <strong className="text-amber-300 font-mono">whisper-large-v3</strong> and <strong className="text-amber-300 font-mono">whisper-large-v3-turbo</strong> with precise word-level timestamps.
                </p>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition-colors"
                >
                  <span>Get your free Groq API key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* DEEPGRAM TAB */}
          {activeTab === 'deepgram' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Deepgram API Key (Token ...)
                </label>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30">
                  🎙️ Nova-2 State of the Art STT
                </span>
              </div>
              <div className="relative">
                <input
                  id="deepgram-api-key-input"
                  type={showDeepgram ? 'text' : 'password'}
                  value={deepgramInput}
                  onChange={(e) => setDeepgramInput(e.target.value)}
                  placeholder="deepgram-token-..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2.5 pl-3.5 pr-20 text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowDeepgram(!showDeepgram)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                    title={showDeepgram ? 'Hide key' : 'Show key'}
                  >
                    {showDeepgram ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {deepgramInput && (
                    <button
                      type="button"
                      onClick={() => setDeepgramInput('')}
                      className="p-1.5 text-rose-400 hover:text-rose-300 transition-colors"
                      title="Clear key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Deepgram Save / Status Row */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px]">
                  {deepgramInput.trim() ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Deepgram key entered ({deepgramInput.trim().length} chars)
                    </span>
                  ) : (
                    <span className="text-zinc-500">No Deepgram key entered</span>
                  )}
                </div>
                <button
                  type="button"
                  id="save-deepgram-key-btn"
                  onClick={handleSaveCurrentTab}
                  className="px-3 py-1.5 text-xs font-bold text-zinc-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-all active:scale-95 shadow-sm shadow-cyan-400/20"
                >
                  Save Deepgram Key
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-2">
                <p className="text-zinc-400 leading-relaxed">
                  Deepgram Nova-2 provides industry-leading accuracy for multiple accents, fast multi-language speech recognition, and automatic punctuation.
                </p>
                <a
                  href="https://console.deepgram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  <span>Get $200 free credits at Deepgram</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* OPENAI TAB */}
          {activeTab === 'openai' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  OpenAI API Key (sk-...)
                </label>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold border border-zinc-700">
                  Whisper-1 & GPT-4o Translation
                </span>
              </div>
              <div className="relative">
                <input
                  id="openai-api-key-input"
                  type={showOpenai ? 'text' : 'password'}
                  value={openaiInput}
                  onChange={(e) => setOpenaiInput(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2.5 pl-3.5 pr-20 text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowOpenai(!showOpenai)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                    title={showOpenai ? 'Hide key' : 'Show key'}
                  >
                    {showOpenai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {openaiInput && (
                    <button
                      type="button"
                      onClick={() => setOpenaiInput('')}
                      className="p-1.5 text-rose-400 hover:text-rose-300 transition-colors"
                      title="Clear key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* OpenAI Save / Status Row */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px]">
                  {openaiInput.trim() ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> OpenAI key entered ({openaiInput.trim().length} chars)
                    </span>
                  ) : (
                    <span className="text-zinc-500">No OpenAI key entered</span>
                  )}
                </div>
                <button
                  type="button"
                  id="save-openai-key-btn"
                  onClick={handleSaveCurrentTab}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all active:scale-95 shadow-sm shadow-indigo-600/30"
                >
                  Save OpenAI Key
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-2">
                <p className="text-zinc-400 leading-relaxed">
                  Used for standard Whisper transcription and high-accuracy GPT-4o multilingual subtitle translations.
                </p>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  <span>Get OpenAI API key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Privacy Security Callout */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>All API keys remain securely inside your local browser storage (<code className="text-zinc-300 font-mono">localStorage</code>) and are sent directly to the official API endpoints.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              id="cancel-api-key-btn"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-api-key-btn"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-xl shadow-md shadow-indigo-600/30 transition-all"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved Keys!</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Save All Keys</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

