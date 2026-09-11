import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Palette, Check } from 'lucide-react';
import { AccentPaletteId, AccentPaletteOption } from '../types';

export const ACCENT_PALETTES: AccentPaletteOption[] = [
  {
    id: 'cyber-cyan',
    name: 'Cyber Cyan',
    subtitle: 'Studio Slate (Default)',
    primaryColor: '#06B6D4',
    hoverColor: '#0891B2',
    darkBg: '#080B11',
  },
  {
    id: 'emerald-mint',
    name: 'Emerald Mint',
    subtitle: 'Midnight Onyx',
    primaryColor: '#10B981',
    hoverColor: '#059669',
    darkBg: '#050807',
  },
  {
    id: 'electric-violet',
    name: 'Electric Violet',
    subtitle: 'Velvet Obsidian',
    primaryColor: '#8B5CF6',
    hoverColor: '#7C3AED',
    darkBg: '#0C0814',
  },
  {
    id: 'warm-amber',
    name: 'Warm Amber',
    subtitle: 'Graphite Titanium',
    primaryColor: '#F59E0B',
    hoverColor: '#D97706',
    darkBg: '#12100B',
  },
  {
    id: 'classic-indigo',
    name: 'Classic Indigo',
    subtitle: 'Classic ScribeFlow',
    primaryColor: '#6366F1',
    hoverColor: '#4F46E5',
    darkBg: '#090A0F',
  },
];

interface ThemePaletteSwitcherProps {
  themeMode: 'dark' | 'light';
  onToggleThemeMode: () => void;
  accentPalette: AccentPaletteId;
  onSelectPalette: (palette: AccentPaletteId) => void;
  compact?: boolean;
}

export const ThemePaletteSwitcher: React.FC<ThemePaletteSwitcherProps> = ({
  themeMode,
  onToggleThemeMode,
  accentPalette,
  onSelectPalette,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentPalette =
    ACCENT_PALETTES.find((p) => p.id === accentPalette) || ACCENT_PALETTES[0];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div
      ref={dropdownRef}
      id="theme-palette-switcher-container"
      className="relative flex items-center gap-1.5"
    >
      {/* Light / Dark Mode Toggle */}
      <button
        type="button"
        id="theme-mode-toggle-btn"
        onClick={onToggleThemeMode}
        className="p-1.5 sm:px-2 py-1.5 bg-white dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.09] text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
        title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
        aria-label={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
      >
        {themeMode === 'dark' ? (
          <Sun className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-slate-600" />
        )}
        {!compact && (
          <span className="hidden lg:inline text-[11px] font-semibold">
            {themeMode === 'dark' ? 'Light' : 'Dark'}
          </span>
        )}
      </button>

      {/* Palette Dropdown Trigger */}
      <button
        type="button"
        id="theme-palette-dropdown-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-1.5 sm:px-2 py-1.5 bg-white dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.09] text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
        title={`Accent Color Theme: ${currentPalette.name}`}
        aria-label={`Accent Color Theme: ${currentPalette.name}`}
        aria-expanded={isOpen}
      >
        <div
          className="w-3.5 h-3.5 rounded-full shadow-inner flex items-center justify-center shrink-0 ring-1 ring-black/10 dark:ring-white/20"
          style={{ backgroundColor: currentPalette.primaryColor }}
        />
        {!compact && (
          <span className="hidden xl:inline text-[11px] font-semibold">
            {currentPalette.name}
          </span>
        )}
        <Palette className="w-3 h-3 text-slate-400 dark:text-zinc-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="theme-palette-dropdown-menu"
          className="absolute right-0 top-full mt-2 w-64 p-2 bg-white dark:bg-[#0f141f] border border-slate-200 dark:border-white/[0.12] rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
        >
          <div className="px-2 py-1.5 border-b border-slate-100 dark:border-white/[0.08] mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
              Color Palette
            </span>
            <span className="text-[10px] text-slate-400 dark:text-zinc-400 capitalize font-medium">
              {themeMode} mode active
            </span>
          </div>

          <div className="space-y-1">
            {ACCENT_PALETTES.map((palette) => {
              const isSelected = palette.id === accentPalette;
              return (
                <button
                  key={palette.id}
                  type="button"
                  id={`palette-option-${palette.id}`}
                  onClick={() => {
                    onSelectPalette(palette.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-white/[0.1] text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full shadow-sm shrink-0 ring-2 ring-white dark:ring-zinc-900"
                      style={{ backgroundColor: palette.primaryColor }}
                    />
                    <div className="flex flex-col">
                      <span className="leading-tight">{palette.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-400 leading-tight">
                        {palette.subtitle}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check
                      className="w-4 h-4 shrink-0"
                      style={{ color: palette.primaryColor }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
