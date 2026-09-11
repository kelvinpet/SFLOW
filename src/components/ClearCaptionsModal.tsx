import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, RotateCcw, Sparkles } from 'lucide-react';

interface ClearCaptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  captionsCount: number;
  onConfirmClearCaptions: () => void;
  onConfirmResetAll?: () => void;
}

export const ClearCaptionsModal: React.FC<ClearCaptionsModalProps> = ({
  isOpen,
  onClose,
  captionsCount,
  onConfirmClearCaptions,
  onConfirmResetAll,
}) => {
  const [resetStylesToo, setResetStylesToo] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (resetStylesToo && onConfirmResetAll) {
      onConfirmResetAll();
    } else {
      onConfirmClearCaptions();
    }
    onClose();
  };

  return (
    <div
      id="clear-captions-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        id="clear-captions-modal-card"
        className="w-full max-w-md bg-zinc-950/80 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-6 shadow-2xl relative text-zinc-100 animate-in zoom-in-95 duration-150 space-y-4"
      >
        <button
          type="button"
          id="close-clear-modal-btn"
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-xl hover:bg-white/[0.08] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon & Heading */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10 shrink-0 backdrop-blur-md">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Clear All Captions?</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Remove all <strong className="text-rose-300 font-mono">{captionsCount}</strong> subtitle blocks from your timeline
            </p>
          </div>
        </div>

        {/* Explanation Note */}
        <div className="p-3.5 bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/[0.08] text-xs text-zinc-300 space-y-2">
          <p className="leading-relaxed">
            All current subtitles, timestamps, and word cue timings will be cleared.
          </p>
          <div className="flex items-center gap-1.5 text-indigo-300 font-medium text-[11px] pt-1 border-t border-white/[0.08]">
            <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
            <span>You can undo this anytime using <kbd className="px-1.5 py-0.5 bg-black/40 rounded-md border border-white/[0.1] font-mono text-[10px]">Ctrl+Z</kbd></span>
          </div>
        </div>

        {/* Option to also reset style presets */}
        {onConfirmResetAll && (
          <label className="flex items-center gap-2.5 p-2.5 bg-white/[0.03] backdrop-blur-md rounded-xl border border-white/[0.08] cursor-pointer select-none text-xs text-zinc-300 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={resetStylesToo}
              onChange={(e) => setResetStylesToo(e.target.checked)}
              className="rounded bg-black/40 border-white/[0.2] text-rose-500 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span>Also reset subtitle font & styling presets to default</span>
          </label>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            id="cancel-clear-captions-btn"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] backdrop-blur-md transition-all active:scale-95"
          >
            Cancel
          </button>

          <button
            type="button"
            id="confirm-clear-captions-btn"
            onClick={handleConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600/90 hover:bg-rose-500 border border-rose-400/40 backdrop-blur-md shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All ({captionsCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
