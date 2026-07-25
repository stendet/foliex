import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  Search, 
  X, 
  Layers, 
  FileText, 
  Table, 
  CheckSquare, 
  Clock, 
  Quote, 
  Palette 
} from 'lucide-react';
import { AppSettings } from '../types';
import { soundEngine } from '../utils/audio';

interface HeaderProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  allTags: string[];
  activeTag: string;
  onSelectTag: (tag: string) => void;
  onReplaySplash?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  allTags,
  activeTag,
  onSelectTag,
  onReplaySplash,
}) => {
  const isUk = settings.language === 'uk';
  const [activePanel, setActivePanel] = useState<'none' | 'search'>('none');
  const headerContainerRef = useRef<HTMLDivElement>(null);

  const activeType = settings.activeType || 'all';
  const hasActiveFilters = Boolean(settings.searchQuery || activeType !== 'all' || (activeTag && activeTag !== 'all'));

  const TYPE_OPTIONS: { id: string; labelUk: string; labelEn: string; icon: React.ReactNode }[] = [
    { id: 'all', labelUk: 'Усі', labelEn: 'All', icon: <Layers className="w-4 h-4" /> },
    { id: 'note', labelUk: 'Нотатки', labelEn: 'Notes', icon: <FileText className="w-4 h-4" /> },
    { id: 'table', labelUk: 'Таблиці', labelEn: 'Tables', icon: <Table className="w-4 h-4" /> },
    { id: 'todo', labelUk: 'Завдання', labelEn: 'Todos', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'timer', labelUk: 'Таймери', labelEn: 'Timers', icon: <Clock className="w-4 h-4" /> },
    { id: 'quote', labelUk: 'Цитати', labelEn: 'Quotes', icon: <Quote className="w-4 h-4" /> },
    { id: 'sketch', labelUk: 'Малюнки', labelEn: 'Sketches', icon: <Palette className="w-4 h-4" /> },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (headerContainerRef.current && !headerContainerRef.current.contains(e.target as Node)) {
        if (!settings.searchQuery && activeType === 'all' && (activeTag === 'all' || !activeTag)) {
          setActivePanel('none');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [settings.searchQuery, activeType, activeTag]);

  return (
    <header className="sticky top-0 z-40 bg-transparent backdrop-blur-xl transition-all py-3 px-4 sm:px-8 select-none">
      <div ref={headerContainerRef} className="max-w-7xl w-full mx-auto flex items-center gap-2">
        {/* System Toolbar Group - Search Only */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActivePanel((prev) => (prev === 'search' ? 'none' : 'search'))}
            className={`toolbar-btn relative ${activePanel === 'search' || hasActiveFilters ? 'is-active' : ''}`}
            title={isUk ? 'Пошук та фільтри' : 'Search & filters'}
          >
            <Search className="w-4 h-4" />
            {hasActiveFilters && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
            )}
          </button>
        </div>

        {/* Vertical Divider */}
        {activePanel === 'search' && <div className="w-px h-5 bg-[rgba(237,232,220,0.08)] mx-1 shrink-0" />}

        {/* Slide-out Search Panel or Foliex Logo with Hover Settings Icon */}
        <div className="flex-1 min-w-0 flex items-center justify-between">
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            {activePanel === 'search' && (
              <div className="flex items-center gap-2 py-0.5 animate-in fade-in duration-200">
                {/* Search Box */}
                <div className="relative flex items-center shrink-0 w-44 sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-faint)] pointer-events-none" />
                  <input
                    type="text"
                    value={settings.searchQuery}
                    onChange={(e) => onUpdateSettings({ searchQuery: e.target.value })}
                    placeholder={isUk ? 'Пошук...' : 'Search...'}
                    className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--parchment-text)] placeholder-[var(--text-faint)] text-xs focus:outline-none focus:border-[var(--accent-primary)]"
                    autoFocus
                  />
                  {settings.searchQuery && (
                    <button
                      onClick={() => onUpdateSettings({ searchQuery: '' })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--parchment-text)]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div className="w-px h-5 bg-[rgba(237,232,220,0.08)] mx-1 shrink-0" />

                {/* Type Filter Clusters */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {TYPE_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onUpdateSettings({ activeType: t.id })}
                      className={`toolbar-btn ${activeType === t.id ? 'is-active' : ''}`}
                      title={isUk ? t.labelUk : t.labelEn}
                    >
                      {t.icon}
                    </button>
                  ))}
                </div>

                {/* Tags */}
                {allTags.length > 0 && (
                  <>
                    <div className="w-px h-5 bg-[rgba(237,232,220,0.08)] mx-1 shrink-0" />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onSelectTag('all')}
                        className={`tag ${activeTag === 'all' || !activeTag ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border-[var(--accent-primary)]' : ''}`}
                      >
                        #{isUk ? 'усі' : 'all'}
                      </button>
                      {allTags.map((tag) => {
                        const cleanTag = tag.replace(/['"]/g, '');
                        const isSelected = activeTag === tag;
                        return (
                          <button
                            key={tag}
                            onClick={() => onSelectTag(isSelected ? 'all' : tag)}
                            className={`tag ${isSelected ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border-[var(--accent-primary)]' : ''}`}
                          >
                            #{cleanTag}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Clear filters */}
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      onUpdateSettings({ searchQuery: '', activeType: 'all' });
                      onSelectTag('all');
                    }}
                    className="toolbar-btn text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                    title={isUk ? 'Скинути всі фільтри' : 'Clear all filters'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Integrated Foliex Logo with Hover Settings Gear Icon */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playFx('click');
              onReplaySplash?.();
            }}
            className={`group flex items-center gap-2 shrink-0 cursor-pointer transition-all duration-300 ease-in-out ${
              activePanel === 'none'
                ? 'opacity-85 hover:opacity-100 scale-100 max-w-[150px] ml-auto pl-2 pointer-events-auto'
                : 'opacity-0 scale-95 max-w-0 ml-0 pl-0 overflow-hidden pointer-events-none'
            }`}
            title={isUk ? 'Налаштування та заставка Foliex' : 'Settings & Foliex intro splash'}
          >
            {/* Minimalist Settings Icon that appears smoothly on hover */}
            <div className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-300 flex items-center justify-center p-1 rounded-lg bg-[var(--surface-border)] text-[var(--accent-primary)] shadow-sm">
              <Settings className="w-3.5 h-3.5 animate-spin-slow" />
            </div>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 220 58"
              role="img"
              className="h-6 sm:h-7 w-auto fill-[var(--parchment-text)] group-hover:scale-105 transition-transform drop-shadow-sm select-none"
            >
              <title>Foliex</title>
              <defs>
                <style>
                  {`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap');`}
                </style>
              </defs>
              <text
                x="0"
                y="52"
                fontFamily="'Space Grotesk', sans-serif"
                fontSize="58"
                fontWeight="700"
                letterSpacing="-2"
              >
                Foliex
              </text>
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
};
