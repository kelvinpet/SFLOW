import React from 'react';
import { Command, X, Play, RotateCcw, Plus, Trash2, ArrowLeftRight, Wand2, Sliders, Type } from 'lucide-react';
import { CustomKeybindings } from '../types';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  keybindings: CustomKeybindings;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  keybindings,
}) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      category: 'Playback & Navigation',
      items: [
        { key: keybindings.playPause || 'Space', label: 'Play / Pause Video', icon: Play },
        { key: 'Tab', label: 'Jump to Next Caption Block', icon: Type },
        { key: 'Shift + Tab', label: 'Jump to Previous Caption Block', icon: Type },
        { key: 'Shift + Space', label: 'Loop Active Caption Segment', icon: RotateCcw },
      ],
    },
    {
      category: 'History & Editing',
      items: [
        { key: keybindings.undo || 'Ctrl + Z', label: 'Undo Last Action', icon: Command },
        { key: keybindings.redo || 'Ctrl + Y', label: 'Redo Action', icon: Command },
        { key: keybindings.addCaption || 'Ctrl + A', label: 'Add New Caption Cue', icon: Plus },
        { key: 'Delete / Backspace', label: 'Delete Selected Cue', icon: Trash2 },
      ],
    },
    {
      category: 'Timing Calibration & Formatting',
      items: [
        { key: keybindings.nudgeLeft || '[', label: 'Nudge Subtitle Start -100ms', icon: Sliders },
        { key: keybindings.nudgeRight || ']', label: 'Nudge Subtitle End +100ms', icon: Sliders },
        { key: 'Ctrl + B', label: 'Batch Toggle Bold on Selected', icon: Type },
        { key: 'Ctrl + I', label: 'Batch Toggle Italic on Selected', icon: Type },
        { key: 'Ctrl + Shift + U', label: 'Batch Convert to UPPERCASE', icon: ArrowLeftRight },
        { key: '?', label: 'Open Keyboard Shortcuts Guide', icon: Wand2 },
      ],
    },
  ];

  return (
    <div
      id="keyboard-shortcuts-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        id="keyboard-shortcuts-modal-card"
        className="w-full max-w-xl bg-zinc-950/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl relative text-zinc-100 max-h-[85vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md shadow-indigo-500/10">
            <Command className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Keyboard Shortcuts & Pro Hotkeys</h3>
            <p className="text-xs text-zinc-400">Accelerate your video subtitle workflow with studio hotkeys</p>
          </div>
        </div>

        <div className="space-y-5">
          {shortcutGroups.map((group) => (
            <div key={group.category} className="space-y-2.5">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-mono">
                {group.category}
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <span className="text-xs text-zinc-300 font-medium">{item.label}</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-700 text-[11px] font-mono font-bold text-indigo-300 shadow-inner">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
          <p className="text-[11px] text-zinc-400">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">?</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">Ctrl + /</kbd> anytime to toggle this hotkey guide.
          </p>
        </div>
      </div>
    </div>
  );
};
