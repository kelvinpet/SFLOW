import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Play,
  Palette,
  Check,
  Zap,
  Film,
  Mic,
  Smile,
  Globe,
  Layers,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { SubtitleStyle, Caption, AspectRatioType } from '../types';
import { PROJECT_TEMPLATES, ProjectTemplate } from '../data/projectTemplates';

interface QuickStartTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyStyle: (style: SubtitleStyle, templateName: string) => void;
  onLoadFullProject: (template: ProjectTemplate) => void;
  currentStyleId?: string;
}

export const QuickStartTemplatesModal: React.FC<QuickStartTemplatesModalProps> = ({
  isOpen,
  onClose,
  onApplyStyle,
  onLoadFullProject,
  currentStyleId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<ProjectTemplate>(PROJECT_TEMPLATES[0]);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Templates', icon: Layers },
    { id: 'reels', label: 'Reels & Shorts', icon: Flame },
    { id: 'documentary', label: 'Documentary & Film', icon: Film },
    { id: 'podcast', label: 'Podcast & Dialogue', icon: Mic },
    { id: 'vlog', label: 'Minimalist & Vlog', icon: Smile },
  ];

  const filteredTemplates =
    selectedCategory === 'all'
      ? PROJECT_TEMPLATES
      : PROJECT_TEMPLATES.filter((t) => t.category === selectedCategory);

  return (
    <div
      id="quick-start-templates-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="quick-start-templates-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800 dark:text-zinc-100"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                <span>Quick Start Template Library</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Instant Styles
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Load pre-tuned caption typography, karaoke animations, and safe margins in one click.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-950/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body: Templates Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => {
            const isCurrent = currentStyleId === template.style.id;
            return (
              <div
                key={template.id}
                className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950/40 p-4 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all hover:shadow-md group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                      {template.aspect}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      {template.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {template.description}
                  </p>

                  {/* Visual Style Preview Snippet */}
                  <div className="my-3 p-3 rounded-xl bg-slate-900 text-white flex items-center justify-center min-h-[58px] shadow-inner relative overflow-hidden border border-slate-800">
                    <div className="text-center font-bold tracking-wide">
                      <span
                        style={{
                          fontFamily: template.style.fontFamily,
                          color: template.style.textColor,
                          textTransform: template.style.textTransform as any,
                        }}
                        className="mr-1.5 text-xs"
                      >
                        CREATE
                      </span>
                      <span
                        style={{
                          fontFamily: template.style.fontFamily,
                          color: template.style.activeWordColor,
                          textTransform: template.style.textTransform as any,
                          backgroundColor: template.style.activeWordBgColor || 'transparent',
                        }}
                        className="px-1.5 py-0.5 rounded text-xs inline-block shadow-sm"
                      >
                        VIRAL
                      </span>
                      <span
                        style={{
                          fontFamily: template.style.fontFamily,
                          color: template.style.textColor,
                          textTransform: template.style.textTransform as any,
                        }}
                        className="ml-1.5 text-xs"
                      >
                        CAPTIONS
                      </span>
                    </div>

                    {/* Mini details badge */}
                    <div className="absolute bottom-1 right-2 text-[9px] text-zinc-500 font-mono">
                      {template.style.fontFamily} • {template.style.fontSize}px
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onApplyStyle(template.style, template.name);
                      onClose();
                    }}
                    className="flex-1 py-1.5 px-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Apply Style</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onLoadFullProject(template);
                      onClose();
                    }}
                    className="py-1.5 px-3 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    title="Load complete sample project with demo video and aligned captions"
                  >
                    <Play className="w-3 h-3 text-indigo-500" />
                    <span className="hidden sm:inline">Load Demo</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
          <span>
            Tip: You can customize any font, color, or karaoke animation after applying.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
