import React, { useState, useEffect } from 'react';
import {
  Keyboard,
  X,
  SlidersHorizontal,
  RotateCcw,
  Check,
  Edit3,
  Sparkles,
  Info,
} from 'lucide-react';
import { CustomKeybindings } from '../types';

export const DEFAULT_KEYBINDINGS: CustomKeybindings = {
  playPause: 'Space',
  seekBackShort: 'ArrowLeft',
  seekForwardShort: 'ArrowRight',
  seekBackJump: 'j',
  seekForwardJump: 'l',
  addCaption: 'a',
  toggleMute: 'm',
};

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  keybindings: CustomKeybindings;
  onUpdateKeybindings: (newKeybindings: CustomKeybindings) => void;
}

interface ActionConfig {
  keyId: keyof CustomKeybindings;
  label: string;
  description: string;
  category: 'playback' | 'seeking' | 'editing';
}

const ACTION_CONFIGS: ActionConfig[] = [
  {
    keyId: 'playPause',
    label: 'Play / Pause',
    description: 'Toggle video playback state',
    category: 'playback',
  },
  {
    keyId: 'seekBackShort',
    label: 'Step Back (0.1s)',
    description: 'Nudge playhead 1 frame backwards',
    category: 'seeking',
  },
  {
    keyId: 'seekForwardShort',
    label: 'Step Forward (0.1s)',
    description: 'Nudge playhead 1 frame forwards',
    category: 'seeking',
  },
  {
    keyId: 'seekBackJump',
    label: 'Seek Back (2s)',
    description: 'Jump playhead backwards by 2 seconds',
    category: 'seeking',
  },
  {
    keyId: 'seekForwardJump',
    label: 'Seek Forward (2s)',
    description: 'Jump playhead forwards by 2 seconds',
    category: 'seeking',
  },
  {
    keyId: 'addCaption',
    label: 'Add Caption at Playhead',
    description: 'Insert new subtitle block at current time',
    category: 'editing',
  },
  {
    keyId: 'toggleMute',
    label: 'Toggle Audio Mute',
    description: 'Mute or unmute the video player audio',
    category: 'playback',
  },
];

const FIXED_SHORTCUTS = [
  { key: 'Ctrl + Z / ⌘Z', description: 'Undo caption change' },
  { key: 'Ctrl + Y / ⌘⇧Z', description: 'Redo caption change' },
  { key: '[ / ]', description: 'Jump to Previous / Next subtitle block' },
  { key: 'F', description: 'Toggle full screen preview' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  keybindings,
  onUpdateKeybindings,
}) => {
  const [activeTab, setActiveTab] = useState<'view' | 'customize'>('customize');
  const [recordingKeyFor, setRecordingKeyFor] = useState<keyof CustomKeybindings | null>(null);
  const [savedBadge, setSavedBadge] = useState(false);

  // Listen for key presses when recording a shortcut
  useEffect(() => {
    if (!recordingKeyFor || !isOpen) return;

    const handleRecordKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Cancel on Escape
      if (e.key === 'Escape') {
        setRecordingKeyFor(null);
        return;
      }

      let keyStr = e.key;
      if (e.code === 'Space' || e.key === ' ') {
        keyStr = 'Space';
      } else if (e.key === 'ArrowLeft') {
        keyStr = 'ArrowLeft';
      } else if (e.key === 'ArrowRight') {
        keyStr = 'ArrowRight';
      } else if (e.key === 'ArrowUp') {
        keyStr = 'ArrowUp';
      } else if (e.key === 'ArrowDown') {
        keyStr = 'ArrowDown';
      } else if (keyStr.length === 1) {
        keyStr = keyStr.toLowerCase();
      }

      const updated = {
        ...keybindings,
        [recordingKeyFor]: keyStr,
      };

      onUpdateKeybindings(updated);
      setRecordingKeyFor(null);
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 2000);
    };

    window.addEventListener('keydown', handleRecordKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleRecordKeyDown, { capture: true });
  }, [recordingKeyFor, isOpen, keybindings, onUpdateKeybindings]);

  if (!isOpen) return null;

  const handleResetToDefaults = () => {
    onUpdateKeybindings(DEFAULT_KEYBINDINGS);
    setRecordingKeyFor(null);
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  };

  const formatKeyDisplay = (val: string) => {
    if (val === 'Space') return 'Space';
    if (val === 'ArrowLeft') return '← Left Arrow';
    if (val === 'ArrowRight') return '→ Right Arrow';
    if (val === 'ArrowUp') return '↑ Up Arrow';
    if (val === 'ArrowDown') return '↓ Down Arrow';
    return val.toUpperCase();
  };

  return (
    <div
      id="shortcuts-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        id="shortcuts-modal-card"
        className="w-full max-w-lg bg-zinc-950/80 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-6 shadow-2xl relative text-zinc-100 max-h-[90vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          id="close-shortcuts-modal"
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md shadow-indigo-500/10 backdrop-blur-md">
            <Keyboard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">Keyboard Shortcuts & Controls</h3>
              {savedBadge && (
                <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 rounded-full animate-in fade-in flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">Configure your custom hotkeys for play, pause, and seek functions</p>
          </div>
        </div>

        {/* Tab Switcher: Overview vs Customize */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 backdrop-blur-md rounded-xl border border-white/[0.08] mb-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('customize');
              setRecordingKeyFor(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'customize'
                ? 'bg-indigo-600/90 text-white shadow-sm border border-indigo-400/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Customize Hotkeys</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('view');
              setRecordingKeyFor(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'view'
                ? 'bg-indigo-600/90 text-white shadow-sm border border-indigo-400/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>All Studio Shortcuts</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === 'customize' ? (
            <div className="space-y-3.5">
              {/* Instructions banner */}
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-xs text-indigo-200 flex items-start gap-2.5 backdrop-blur-sm">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-white">How to remap hotkeys:</p>
                  <p className="text-[11px] text-zinc-300">
                    Click any action's key badge below, then press your desired key on your keyboard. Press <kbd className="px-1 bg-black/40 border border-white/[0.12] rounded text-[10px] text-zinc-200">Esc</kbd> to cancel.
                  </p>
                </div>
              </div>

              {/* Action Keybinding Rows */}
              <div className="space-y-2">
                {ACTION_CONFIGS.map((act) => {
                  const currentVal = keybindings[act.keyId] || DEFAULT_KEYBINDINGS[act.keyId];
                  const isRecording = recordingKeyFor === act.keyId;

                  return (
                    <div
                      key={act.keyId}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all backdrop-blur-sm ${
                        isRecording
                          ? 'bg-indigo-600/20 border-indigo-400/70 shadow-md shadow-indigo-600/20 ring-1 ring-indigo-400'
                          : 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{act.label}</span>
                          <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.2 rounded bg-black/30 border border-white/[0.08] text-zinc-400">
                            {act.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{act.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isRecording ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold animate-pulse shadow-sm">
                            <span>Press any key...</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            id={`remap-key-${act.keyId}`}
                            onClick={() => setRecordingKeyFor(act.keyId)}
                            className="group flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] hover:border-indigo-400/80 rounded-lg text-xs font-mono font-bold text-indigo-300 transition-all active:scale-95 shadow-sm backdrop-blur-sm"
                            title="Click to remap this shortcut"
                          >
                            <Edit3 className="w-3 h-3 text-zinc-500 group-hover:text-indigo-300" />
                            <span>{formatKeyDisplay(currentVal)}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Tab: All Shortcuts Reference */
            <div className="space-y-3">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Configurable Playback & Seeking Hotkeys
                </span>
                {ACTION_CONFIGS.map((act) => (
                  <div
                    key={act.keyId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs backdrop-blur-sm"
                  >
                    <span className="text-zinc-300 font-medium">{act.label}</span>
                    <kbd className="px-2.5 py-1 bg-black/40 border border-white/[0.1] rounded-md font-mono text-indigo-300 font-semibold text-[11px] shadow-sm">
                      {formatKeyDisplay(keybindings[act.keyId] || DEFAULT_KEYBINDINGS[act.keyId])}
                    </kbd>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Global System & Timeline Shortcuts
                </span>
                {FIXED_SHORTCUTS.map((sc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs backdrop-blur-sm"
                  >
                    <span className="text-zinc-300 font-medium">{sc.description}</span>
                    <kbd className="px-2.5 py-1 bg-black/40 border border-white/[0.1] rounded-md font-mono text-indigo-300 font-semibold text-[11px] shadow-sm">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="mt-5 pt-3 border-t border-white/[0.08] flex items-center justify-between gap-3">
          <button
            type="button"
            id="reset-shortcuts-default-btn"
            onClick={handleResetToDefaults}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] rounded-xl transition-all inline-flex items-center gap-1.5 backdrop-blur-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600/90 hover:bg-indigo-500 border border-indigo-400/30 rounded-xl transition-all shadow-md shadow-indigo-600/30 active:scale-95 backdrop-blur-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
