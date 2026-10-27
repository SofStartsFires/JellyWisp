import React, { useRef, useState } from 'react';
import {
  Server,
  Activity,
  Sliders,
  Sparkles,
  Maximize2,
  Minus,
  X,
  Search,
  SlidersHorizontal,
  Settings,
  Waves,
  Move,
  GripVertical,
  ZoomIn,
  PanelTop,
  PanelBottom,
} from 'lucide-react';
import {
  JellyfinServerConfig,
  Track,
  LayoutConfig,
  DraggableSectionId,
} from '../types/index.ts';

interface SearchBarSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  layoutConfig?: LayoutConfig;
  onUpdateLayout?: (partial: Partial<LayoutConfig>) => void;
  onDragStartSection?: (section: DraggableSectionId) => void;
  onDragEndSection?: () => void;
  isHeroDeck?: boolean;
}

export const SearchBarSection: React.FC<SearchBarSectionProps> = ({
  searchQuery,
  onSearchChange,
  layoutConfig,
  onUpdateLayout,
  onDragStartSection,
  onDragEndSection,
  isHeroDeck = false,
}) => {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [showSizePopover, setShowSizePopover] = useState(false);

  const maxWidthPx = layoutConfig?.searchBarMaxWidthPx ?? 860;
  const heightPx = layoutConfig?.searchBarHeightPx ?? 46;
  const fontSizePx = layoutConfig?.searchBarFontSizePx ?? 15;
  const pos = layoutConfig?.searchBarPosition || 'titlebar';

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', 'search');
        e.dataTransfer.effectAllowed = 'move';
        onDragStartSection?.('search');
      }}
      onDragEnd={() => onDragEndSection?.()}
      style={{
        maxWidth: isHeroDeck ? `${Math.max(maxWidthPx, 1100)}px` : `${maxWidthPx}px`,
      }}
      data-testid="search-bar-section"
      data-position={pos}
      className={`relative flex-1 w-full transition-all duration-200 ${
        isHeroDeck ? 'mx-auto py-2 px-4' : 'mx-4'
      }`}
    >
      <div className="relative flex items-center w-full group">
        {/* Drag Handle for Search Section */}
        <div
          className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-500 hover:text-cyan-400 cursor-grab active:cursor-grabbing z-10"
          title="Drag Search Bar to Top Hero Deck, Bottom Command Bar, or Titlebar"
        >
          <GripVertical className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition" />
          <Search
            style={{
              width: `${Math.max(15, Math.round(fontSizePx * 1.1))}px`,
              height: `${Math.max(15, Math.round(fontSizePx * 1.1))}px`,
            }}
            className="text-cyan-400 pointer-events-none"
          />
        </div>

        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            height: `${heightPx}px`,
            fontSize: `${fontSizePx}px`,
          }}
          placeholder="Search all music, tracks, albums, artists, genres, FLAC bitrates... (Press / to focus)"
          className="w-full bg-[#111628] hover:bg-[#151b30] focus:bg-[#182039] text-slate-100 placeholder:text-slate-400 rounded-2xl pl-12 pr-36 border border-white/15 focus:border-[var(--fin-accent)] focus:ring-2 focus:ring-[var(--fin-accent)]/25 focus:outline-none transition-all shadow-inner font-sans"
        />

        {searchQuery && (
          <button
            onClick={() => {
              onSearchChange('');
              searchInputRef.current?.focus();
            }}
            className="absolute right-28 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Right Controls inside Search Bar: Quick Resize Popover + Shortcut Kbd */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {onUpdateLayout && (
            <button
              type="button"
              onClick={() => setShowSizePopover((v) => !v)}
              data-testid="search-size-popover-btn"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition ${
                showSizePopover
                  ? 'bg-[var(--fin-accent)] text-slate-950 border-[var(--fin-accent)]'
                  : 'bg-white/5 hover:bg-white/15 text-cyan-300 border-white/10'
              }`}
              title="Resize Search Bar Width, Height, Font Size, or Pop Out to Giant Hero Deck"
            >
              <ZoomIn className="w-3 h-3" />
              <span className="hidden sm:inline">{heightPx}px</span>
            </button>
          )}

          <kbd className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-black/40 border border-white/10 shadow-sm hidden md:inline">
            /
          </kbd>
        </div>
      </div>

      {/* Live Search Bar Sizing & Modularity Popover */}
      {showSizePopover && onUpdateLayout && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#0c1120] border border-cyan-500/40 shadow-2xl p-4 z-50 space-y-3.5 text-left">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-extrabold text-white uppercase font-mono">
              Search Bar Sizing & Dock
            </span>
            <button
              onClick={() => setShowSizePopover(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Done
            </button>
          </div>

          {/* Search Dock Position */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-300 font-semibold block">
              Search Bar Dock Location
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'titlebar', label: 'In Titlebar' },
                  { id: 'hero-top', label: 'Giant Top Hero' },
                  { id: 'bottom-deck', label: 'Bottom Deck' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onUpdateLayout({ searchBarPosition: opt.id })}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition ${
                    pos === opt.id
                      ? 'bg-[var(--fin-accent)] text-slate-950 border-[var(--fin-accent)]'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Width Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Max Search Width</span>
              <span className="font-mono text-cyan-400 font-bold">{maxWidthPx}px</span>
            </div>
            <input
              type="range"
              min="360"
              max="1600"
              step="20"
              value={maxWidthPx}
              onChange={(e) =>
                onUpdateLayout({ searchBarMaxWidthPx: parseInt(e.target.value) })
              }
              className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
            />
          </div>

          {/* Search Height Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Search Bar Height</span>
              <span className="font-mono text-cyan-400 font-bold">{heightPx}px</span>
            </div>
            <input
              type="range"
              min="34"
              max="72"
              step="2"
              value={heightPx}
              onChange={(e) => {
                const newH = parseInt(e.target.value);
                onUpdateLayout({
                  searchBarHeightPx: newH,
                  titlebarHeightPx: Math.max(layoutConfig?.titlebarHeightPx ?? 64, newH + 16),
                });
              }}
              className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
            />
          </div>

          {/* Search Font Size Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Search Text Size</span>
              <span className="font-mono text-cyan-400 font-bold">{fontSizePx}px</span>
            </div>
            <input
              type="range"
              min="12"
              max="24"
              step="1"
              value={fontSizePx}
              onChange={(e) =>
                onUpdateLayout({ searchBarFontSizePx: parseInt(e.target.value) })
              }
              className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
            />
          </div>

          {/* Quick Super-Size Preset Button */}
          <button
            onClick={() =>
              onUpdateLayout({
                searchBarPosition: 'hero-top',
                searchBarMaxWidthPx: 1400,
                searchBarHeightPx: 58,
                searchBarFontSizePx: 18,
              })
            }
            className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500/25 to-indigo-500/25 hover:from-cyan-500/40 hover:to-indigo-500/40 border border-cyan-400/40 text-xs font-bold text-cyan-200 transition"
          >
            Make Search Bar Ultra-Large Hero Deck
          </button>
        </div>
      )}
    </div>
  );
};

interface TitlebarProps {
  serverConfig: JellyfinServerConfig;
  currentTrack: Track | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenServerModal: () => void;
  onOpenDspModal: () => void;
  onOpenSpecsModal: () => void;
  onOpenSettingsModal: () => void;
  onToggleVisualizer: () => void;
  layoutConfig?: LayoutConfig;
  onUpdateLayout?: (partial: Partial<LayoutConfig>) => void;
  isLayoutEditMode?: boolean;
  onToggleLayoutEditMode?: () => void;
  onDragStartSection?: (section: DraggableSectionId) => void;
  onDragEndSection?: () => void;
}

export const Titlebar: React.FC<TitlebarProps> = ({
  serverConfig,
  currentTrack,
  searchQuery,
  onSearchChange,
  onOpenServerModal,
  onOpenDspModal,
  onOpenSpecsModal,
  onOpenSettingsModal,
  onToggleVisualizer,
  layoutConfig,
  onUpdateLayout,
  isLayoutEditMode = false,
  onToggleLayoutEditMode,
  onDragStartSection,
  onDragEndSection,
}) => {
  const titlebarHeight = layoutConfig?.titlebarHeightPx ?? 64;
  const showSearchInTitlebar = (layoutConfig?.searchBarPosition || 'titlebar') === 'titlebar';

  return (
    <header
      style={{ height: `${titlebarHeight}px` }}
      className={`bg-[#080b13]/95 border-b border-white/10 flex items-center justify-between px-4 shrink-0 select-none backdrop-blur-md z-30 transition-all ${
        layoutConfig?.swapTitlebarSides ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Left: Window Controls, App Branding & Server Status */}
      <div className="flex items-center gap-3 shrink-0">
        {layoutConfig?.showWindowControls !== false && (
          <div className="flex items-center gap-1.5 mr-2">
            <button
              aria-label="Close window"
              className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-500 flex items-center justify-center group transition"
            >
              <X className="w-2 h-2 text-rose-950 opacity-0 group-hover:opacity-100 transition" />
            </button>
            <button
              aria-label="Minimize window"
              className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 flex items-center justify-center group transition"
            >
              <Minus className="w-2 h-2 text-amber-950 opacity-0 group-hover:opacity-100 transition" />
            </button>
            <button
              aria-label="Maximize window"
              className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 flex items-center justify-center group transition"
            >
              <Maximize2 className="w-1.5 h-1.5 text-emerald-950 opacity-0 group-hover:opacity-100 transition" />
            </button>
          </div>
        )}

        {/* JellyWisp App Logo & Branding */}
        {layoutConfig?.showBrandLogo !== false && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/30">
              <Waves className="w-3.5 h-3.5 text-slate-950" />
            </div>
            <span className="text-sm font-extrabold tracking-wider text-slate-100">
              JELLY<span className="text-[var(--fin-accent)] font-black">WISP</span>
            </span>
            <span className="text-[9px] text-cyan-300 font-mono hidden sm:inline px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 font-bold">
              STUDIO
            </span>
          </div>
        )}

        {/* Jellyfin Server Connection Pill */}
        {layoutConfig?.showServerPill !== false && (
          <button
            onClick={onOpenServerModal}
            className="ml-1 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition border border-white/10 group"
            title="Click to configure Jellyfin Server"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                serverConfig.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <Server className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition" />
            <span className="font-semibold truncate max-w-[130px] hidden lg:inline text-[11px]">
              {serverConfig.isDemoMode ? 'SoundSphere (Demo)' : serverConfig.serverName}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{serverConfig.pingMs}ms</span>
          </button>
        )}
      </div>

      {/* Center: Prominent Power Search Bar (when docked in titlebar) */}
      {showSearchInTitlebar ? (
        <SearchBarSection
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          layoutConfig={layoutConfig}
          onUpdateLayout={onUpdateLayout}
          onDragStartSection={onDragStartSection}
          onDragEndSection={onDragEndSection}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={() => onUpdateLayout?.({ searchBarPosition: 'titlebar' })}
            className="text-[11px] font-mono text-slate-400 hover:text-cyan-300 px-3 py-1 rounded-lg bg-white/5 border border-white/5 transition"
          >
            Search Docked to {layoutConfig?.searchBarPosition === 'hero-top' ? 'Hero Deck' : 'Bottom Deck'} (Click to return to Titlebar)
          </button>
        </div>
      )}

      {/* Right: Drag & Drop Layout Mode + Audio Quality Specs + Dedicated Settings Button */}
      <div className="flex items-center gap-2 shrink-0">
        {currentTrack && layoutConfig?.showAudioSpecsBadge !== false && (
          <button
            onClick={onOpenSpecsModal}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-[11px] font-mono font-medium text-cyan-300 hover:bg-cyan-900/60 transition shadow-sm"
            title="Click to view real-time audio metrics and buffer health"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>
              {currentTrack.codec} {Math.round(currentTrack.sampleRate / 1000)}k/{currentTrack.bitDepth}b
            </span>
          </button>
        )}

        {onToggleLayoutEditMode && (
          <button
            onClick={onToggleLayoutEditMode}
            data-testid="toggle-layout-mode-btn"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border ${
              isLayoutEditMode
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/20'
                : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
            }`}
            title="Toggle Interactive Drag & Drop Dock Editor"
          >
            <Move className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {isLayoutEditMode ? 'Done Moving' : 'Edit Layout'}
            </span>
          </button>
        )}

        {layoutConfig?.showQuickUtilityButtons !== false && (
          <>
            <button
              onClick={onOpenSpecsModal}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-lg transition"
              title="Audio Engine Telemetry & Buffer Metrics"
              aria-label="Audio metrics"
            >
              <Activity className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={onOpenDspModal}
              className="p-2 text-slate-400 hover:text-[var(--fin-accent)] hover:bg-white/5 rounded-lg transition"
              title="10-Band Parametric Equalizer & DSP"
              aria-label="Equalizer"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleVisualizer}
              className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition hidden sm:block"
              title="Immersive 60fps Audio Visualizer"
              aria-label="Audio visualizer"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </>
        )}

        <button
          onClick={onOpenSettingsModal}
          data-testid="open-settings-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 text-white border border-[var(--fin-accent)]/40 hover:border-[var(--fin-accent)] transition text-xs font-bold shadow-sm shadow-cyan-500/10 ml-1"
          aria-label="All settings"
          title="Open Unified Settings & Customization Center"
        >
          <Settings className="w-4 h-4 text-[var(--fin-accent)]" />
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
};
