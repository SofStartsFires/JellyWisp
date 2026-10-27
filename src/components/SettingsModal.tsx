import React, { useState } from 'react';
import {
  X,
  Settings,
  Layout,
  Type,
  Eye,
  Palette,
  SlidersHorizontal,
  Keyboard,
  Server,
  RotateCcw,
  Sparkles,
  Check,
  Disc,
  Columns,
  Move,
  Download,
  Upload,
} from 'lucide-react';
import {
  LayoutConfig,
  FontFamilyChoice,
  PlayerPosition,
  NavPosition,
  ArtworkShape,
  ScrubberStyle,
  TimeDisplayMode,
  AmbientEffect,
  MiniVisStyle,
  ThemeConfig,
  DspSettings,
  HotkeyBinding,
  JellyfinServerConfig,
} from '../types/index.ts';
import { PRESET_THEMES } from '../services/themeEngine.ts';
import { WORKSPACE_PRESETS } from '../services/layoutEngine.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  layoutConfig: LayoutConfig;
  onUpdateLayout: (partial: Partial<LayoutConfig>) => void;
  onResetLayout: () => void;
  currentTheme: ThemeConfig;
  onUpdateTheme: (partial: Partial<ThemeConfig>) => void;
  onSelectPresetTheme: (presetId: string) => void;
  dspSettings: DspSettings;
  onUpdateDsp: (partial: Partial<DspSettings>) => void;
  hotkeyBindings: HotkeyBinding[];
  onUpdateHotkey: (id: string, combo: string) => void;
  onResetHotkeys: () => void;
  serverConfig: JellyfinServerConfig;
  onOpenServerModal: () => void;
  onToggleLayoutEditMode?: () => void;
}

type SettingsTab =
  | 'presets'
  | 'layout'
  | 'player'
  | 'library'
  | 'typography'
  | 'themes'
  | 'dsp'
  | 'hotkeys'
  | 'server';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  layoutConfig,
  onUpdateLayout,
  onResetLayout,
  currentTheme,
  onUpdateTheme,
  onSelectPresetTheme,
  dspSettings,
  onUpdateDsp,
  hotkeyBindings,
  onUpdateHotkey,
  onResetHotkeys,
  serverConfig,
  onOpenServerModal,
  onToggleLayoutEditMode,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('presets');
  const [recordingHotkeyId, setRecordingHotkeyId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const fontOptions: { id: FontFamilyChoice; label: string; preview: string; description: string }[] = [
    {
      id: 'sans',
      label: 'Plus Jakarta Sans',
      preview: 'Modern Geometric Sans',
      description: 'Clean, balanced, contemporary desktop feel.',
    },
    {
      id: 'mono',
      label: 'JetBrains Mono',
      preview: '96kHz 24-bit PCM [Lossless]',
      description: 'Precision audiophile code and monospace aesthetic.',
    },
    {
      id: 'space',
      label: 'Space Grotesk',
      preview: 'Futuristic Neo-Grotesque',
      description: 'Cyberpunk, tech-forward, high-personality headlines.',
    },
    {
      id: 'inter',
      label: 'Inter UI',
      preview: 'Neutral Precision Typography',
      description: 'Ultra-legible, pixel-perfect UI workhorse.',
    },
    {
      id: 'serif',
      label: 'Playfair Display',
      preview: 'Vintage Classical Serif',
      description: 'Acoustic warmth, analog vinyl nostalgia.',
    },
    {
      id: 'system',
      label: 'Native System OS',
      preview: 'System Native Default',
      description: 'San Francisco / Segoe UI / Roboto default.',
    },
  ];

  const handleStartHotkeyRecording = (id: string) => {
    setRecordingHotkeyId(id);
    const handleKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let combo = e.code;
      if (e.ctrlKey || e.metaKey) combo = `Ctrl+${combo}`;
      if (e.shiftKey) combo = `Shift+${combo}`;
      if (e.altKey) combo = `Alt+${combo}`;

      onUpdateHotkey(id, combo);
      setRecordingHotkeyId(null);
      window.removeEventListener('keydown', handleKey, true);
    };
    window.addEventListener('keydown', handleKey, true);
  };

  const handleExportProfile = () => {
    const payload = {
      version: '2.6.0',
      layoutConfig,
      currentTheme,
      dspSettings,
      hotkeyBindings,
    };
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
    setExportStatus('Copied full JellyWisp JSON profile to clipboard!');
    setTimeout(() => setExportStatus(null), 3000);
  };

  const toggleColumn = (key: keyof LayoutConfig['visibleColumns']) => {
    onUpdateLayout({
      visibleColumns: {
        ...layoutConfig.visibleColumns,
        [key]: !layoutConfig.visibleColumns[key],
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[88vh] bg-[#0b0f1b] border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden select-none">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--fin-accent)]/20 text-[var(--fin-accent)] border border-[var(--fin-accent)]/40 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                JellyWisp Studio Customization & Settings Center
              </h2>
              <p className="text-xs text-slate-400">
                Drag-and-drop section docks, top-tab navigation, sidebar player decks, multi-font typography, table columns, and bit-perfect DSP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleLayoutEditMode && (
              <button
                onClick={() => {
                  onClose();
                  onToggleLayoutEditMode();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold transition"
              >
                <Move className="w-3.5 h-3.5" />
                <span>Launch Drag & Drop Editor</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Left Tabs + Right Pane */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Tabs */}
          <nav className="w-60 border-r border-white/10 bg-black/25 p-3 space-y-1 overflow-y-auto shrink-0 flex flex-col justify-between">
            <div className="space-y-1">
              {[
                { id: 'presets' as SettingsTab, label: 'Workspace & Drag Docks', icon: Move },
                { id: 'layout' as SettingsTab, label: 'Section Docking & Sizes', icon: Layout },
                { id: 'player' as SettingsTab, label: 'Player Deck & Vinyl', icon: Disc },
                { id: 'library' as SettingsTab, label: 'Columns & Album Grid', icon: Columns },
                { id: 'typography' as SettingsTab, label: 'Multi-Font Typography', icon: Type },
                { id: 'themes' as SettingsTab, label: 'Colors, Shaders & Bleed', icon: Palette },
                { id: 'dsp' as SettingsTab, label: 'Audio Engine & DSP', icon: SlidersHorizontal },
                { id: 'hotkeys' as SettingsTab, label: 'Custom Keybindings', icon: Keyboard },
                { id: 'server' as SettingsTab, label: 'Server & JSON Profile', icon: Server },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-[var(--fin-accent)] text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-white/10 space-y-1.5">
              <button
                onClick={handleExportProfile}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-mono text-cyan-300 hover:bg-cyan-500/10 rounded-lg border border-cyan-500/20 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Config JSON</span>
              </button>
              <button
                onClick={onResetLayout}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-mono text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default Layout</span>
              </button>
            </div>
          </nav>

          {/* Right Pane */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {exportStatus && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
                {exportStatus}
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 1: WORKSPACE PRESETS & DRAG-AND-DROP MATRIX                */}
            {/* ============================================================== */}
            {activeTab === 'presets' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    One-Click Modular Workspace Architectures
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Instantly rearrange the entire player—push the sidebar into top horizontal tabs, convert the player into a left/right studio sidebar deck, or float glass tiles.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {WORKSPACE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => onUpdateLayout(preset.config)}
                      className="p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[var(--fin-accent)]/60 text-left transition group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-white group-hover:text-[var(--fin-accent)] transition">
                            {preset.name}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/30">
                            Apply Layout
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                          {preset.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/5 text-[10px] font-mono text-slate-400">
                        <span>Nav: {preset.config.sidebarPosition?.toUpperCase()}</span>
                        <span>•</span>
                        <span>Player: {preset.config.playerBarPosition?.toUpperCase()}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Interactive Visual Section Matrix */}
                <div className="p-5 rounded-2xl bg-black/30 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase font-mono">
                        Interactive Section Dock Matrix
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        You can also drag the grip handle on the Navigation or Player sections directly in the UI!
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Navigation Section Dock Selector */}
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">1. Navigation Section</span>
                        <span className="text-[10px] font-mono text-cyan-400 uppercase">
                          {layoutConfig.sidebarPosition}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { id: 'left', label: 'Left Sidebar' },
                            { id: 'top', label: 'Top Tabs Bar' },
                            { id: 'right', label: 'Right Sidebar' },
                            { id: 'bottom', label: 'Bottom Tabs' },
                            { id: 'compact', label: 'Icon Rail' },
                          ] as { id: NavPosition; label: string }[]
                        ).map((pos) => (
                          <button
                            key={pos.id}
                            onClick={() => onUpdateLayout({ sidebarPosition: pos.id })}
                            className={`py-2 px-2 rounded-lg text-[11px] font-semibold border transition ${
                              layoutConfig.sidebarPosition === pos.id
                                ? 'bg-[var(--fin-accent)] text-slate-950 border-[var(--fin-accent)] font-bold'
                                : 'bg-black/30 text-slate-300 border-white/10 hover:text-white'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. Player Section Dock Selector */}
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">2. Player Deck Section</span>
                        <span className="text-[10px] font-mono text-cyan-400 uppercase">
                          {layoutConfig.playerBarPosition}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { id: 'bottom', label: 'Bottom Bar' },
                            { id: 'top', label: 'Top Deck' },
                            { id: 'left', label: 'Left Sidebar' },
                            { id: 'right', label: 'Right Sidebar' },
                            { id: 'floating', label: 'Floating Glass' },
                          ] as { id: PlayerPosition; label: string }[]
                        ).map((pos) => (
                          <button
                            key={pos.id}
                            onClick={() => onUpdateLayout({ playerBarPosition: pos.id })}
                            className={`py-2 px-2 rounded-lg text-[11px] font-semibold border transition ${
                              layoutConfig.playerBarPosition === pos.id
                                ? 'bg-[var(--fin-accent)] text-slate-950 border-[var(--fin-accent)] font-bold'
                                : 'bg-black/30 text-slate-300 border-white/10 hover:text-white'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3. Search Command Bar Dock Selector */}
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">3. Search Bar Section</span>
                        <span className="text-[10px] font-mono text-cyan-400 uppercase">
                          {layoutConfig.searchBarPosition || 'titlebar'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { id: 'titlebar', label: 'In Titlebar' },
                            { id: 'hero-top', label: 'Giant Top Hero' },
                            { id: 'bottom-deck', label: 'Bottom Deck' },
                          ] as const
                        ).map((pos) => (
                          <button
                            key={pos.id}
                            onClick={() => onUpdateLayout({ searchBarPosition: pos.id })}
                            className={`py-2 px-2 rounded-lg text-[11px] font-semibold border transition ${
                              (layoutConfig.searchBarPosition || 'titlebar') === pos.id
                                ? 'bg-[var(--fin-accent)] text-slate-950 border-[var(--fin-accent)] font-bold'
                                : 'bg-black/30 text-slate-300 border-white/10 hover:text-white'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 4. Queue & Lyrics Inspector Dock Selector */}
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">4. Queue & Inspector Dock</span>
                        <span className="text-[10px] font-mono text-cyan-400 uppercase">
                          {layoutConfig.queueDockPosition || 'drawer'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { id: 'drawer', label: 'Flyout Drawer' },
                            { id: 'right', label: 'Pinned Right' },
                            { id: 'left', label: 'Pinned Left' },
                          ] as const
                        ).map((pos) => (
                          <button
                            key={pos.id}
                            onClick={() => onUpdateLayout({ queueDockPosition: pos.id })}
                            className={`py-2 px-2 rounded-lg text-[11px] font-semibold border transition ${
                              (layoutConfig.queueDockPosition || 'drawer') === pos.id
                                ? 'bg-[var(--fin-accent)] text-slate-950 border-[var(--fin-accent)] font-bold'
                                : 'bg-black/30 text-slate-300 border-white/10 hover:text-white'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: UNIVERSAL SIZING & SECTION MODULARITY                   */}
            {/* ============================================================== */}
            {activeTab === 'layout' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Universal Element Sizing & Search Bar Scaling
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Fine-tune exact pixel dimensions for your search bar, titlebar, navigation tabs, sidebars, player artwork, buttons, and rows.
                  </p>
                </div>

                {/* Dedicated Search Bar Super-Sizing Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/35 to-indigo-950/35 border border-cyan-500/30 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-white uppercase font-mono">
                        Search Bar Sizing & Dock Location
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Make the search bar as wide and tall as you want, or pop it out into a dedicated full-width Hero Search Bar.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        onUpdateLayout({
                          searchBarPosition: 'hero-top',
                          searchBarMaxWidthPx: 1400,
                          searchBarHeightPx: 58,
                          searchBarFontSizePx: 18,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl bg-[var(--fin-accent)] text-slate-950 font-extrabold text-xs shadow-md hover:opacity-90 transition"
                    >
                       Super-Size Search Bar (Hero Mode)
                    </button>
                  </div>

                  {/* Search Dock Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'titlebar', label: 'Integrated in Titlebar' },
                        { id: 'hero-top', label: 'Dedicated Giant Top Hero Bar' },
                        { id: 'bottom-deck', label: 'Bottom Command Bar' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => onUpdateLayout({ searchBarPosition: opt.id })}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                          (layoutConfig.searchBarPosition || 'titlebar') === opt.id
                            ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/20 text-white font-bold'
                            : 'border-white/10 bg-black/30 text-slate-300 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Bar Sliders */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-200 font-semibold">Search Bar Max Width</span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {layoutConfig.searchBarMaxWidthPx ?? 860}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="360"
                        max="1600"
                        step="20"
                        value={layoutConfig.searchBarMaxWidthPx ?? 860}
                        onChange={(e) =>
                          onUpdateLayout({ searchBarMaxWidthPx: parseInt(e.target.value) })
                        }
                        className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-200 font-semibold">Search Bar Height</span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {layoutConfig.searchBarHeightPx ?? 46}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="34"
                        max="72"
                        step="2"
                        value={layoutConfig.searchBarHeightPx ?? 46}
                        onChange={(e) => {
                          const h = parseInt(e.target.value);
                          onUpdateLayout({
                            searchBarHeightPx: h,
                            titlebarHeightPx: Math.max(layoutConfig.titlebarHeightPx ?? 64, h + 16),
                          });
                        }}
                        className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-200 font-semibold">Search Text Font Size</span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {layoutConfig.searchBarFontSizePx ?? 15}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="24"
                        step="1"
                        value={layoutConfig.searchBarFontSizePx ?? 15}
                        onChange={(e) =>
                          onUpdateLayout({ searchBarFontSizePx: parseInt(e.target.value) })
                        }
                        className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-200 font-semibold">Top Titlebar Height</span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {layoutConfig.titlebarHeightPx ?? 64}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="48"
                        max="96"
                        step="2"
                        value={layoutConfig.titlebarHeightPx ?? 64}
                        onChange={(e) =>
                          onUpdateLayout({ titlebarHeightPx: parseInt(e.target.value) })
                        }
                        className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Universal Sliders for All Sections & Elements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {[
                    {
                      key: 'sidebarWidth',
                      label: 'Navigation Sidebar Width',
                      val: layoutConfig.sidebarWidth,
                      min: 160,
                      max: 420,
                      step: 5,
                      unit: 'px',
                    },
                    {
                      key: 'topTabsHeightPx',
                      label: 'Horizontal Top/Bottom Tabs Height',
                      val: layoutConfig.topTabsHeightPx ?? 50,
                      min: 38,
                      max: 76,
                      step: 2,
                      unit: 'px',
                    },
                    {
                      key: 'navItemScale',
                      label: 'Navigation Button & Icon Scale',
                      val: layoutConfig.navItemScale ?? 100,
                      min: 85,
                      max: 135,
                      step: 5,
                      unit: '%',
                    },
                    {
                      key: 'playerSidebarWidth',
                      label: 'Vertical Sidebar Player Width',
                      val: layoutConfig.playerSidebarWidth,
                      min: 220,
                      max: 440,
                      step: 10,
                      unit: 'px',
                    },
                    {
                      key: 'playerBarHeight',
                      label: 'Horizontal Player Bar Height',
                      val: layoutConfig.playerBarHeight,
                      min: 56,
                      max: 132,
                      step: 4,
                      unit: 'px',
                    },
                    {
                      key: 'playerArtworkSizePx',
                      label: 'Player Bar Cover Art Size',
                      val: layoutConfig.playerArtworkSizePx ?? 54,
                      min: 38,
                      max: 92,
                      step: 2,
                      unit: 'px',
                    },
                    {
                      key: 'playerSidebarArtworkSizePx',
                      label: 'Sidebar Player Cover Art Size',
                      val: layoutConfig.playerSidebarArtworkSizePx ?? 184,
                      min: 120,
                      max: 280,
                      step: 8,
                      unit: 'px',
                    },
                    {
                      key: 'transportButtonSizePx',
                      label: 'Play / Transport Button Size',
                      val: layoutConfig.transportButtonSizePx ?? 40,
                      min: 32,
                      max: 60,
                      step: 2,
                      unit: 'px',
                    },
                    {
                      key: 'trackRowHeightPx',
                      label: 'Tracklist Row Height',
                      val: layoutConfig.trackRowHeightPx ?? 52,
                      min: 36,
                      max: 84,
                      step: 2,
                      unit: 'px',
                    },
                    {
                      key: 'trackThumbnailSizePx',
                      label: 'Tracklist Cover Thumbnail Size',
                      val: layoutConfig.trackThumbnailSizePx ?? 40,
                      min: 28,
                      max: 68,
                      step: 2,
                      unit: 'px',
                    },
                    {
                      key: 'albumCardPaddingPx',
                      label: 'Album Card Frame Padding',
                      val: layoutConfig.albumCardPaddingPx ?? 12,
                      min: 6,
                      max: 24,
                      step: 2,
                      unit: 'px',
                    },
                    {
                      key: 'panelGap',
                      label: 'Modular Panel Tiling Gap',
                      val: layoutConfig.panelGap,
                      min: 0,
                      max: 24,
                      step: 2,
                      unit: 'px',
                    },
                  ].map((slider) => (
                    <div
                      key={slider.key}
                      className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5"
                    >
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-semibold">{slider.label}</span>
                        <span className="font-mono text-cyan-400 font-bold">
                          {slider.val}
                          {slider.unit}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={slider.min}
                        max={slider.max}
                        step={slider.step}
                        value={slider.val}
                        onChange={(e) =>
                          onUpdateLayout({ [slider.key]: parseInt(e.target.value) })
                        }
                        className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
                      />
                    </div>
                  ))}
                </div>

                {/* Corner Radius & Border Contrast */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Interface Corner Geometry
                  </span>
                  <div className="grid grid-cols-4 gap-2.5">
                    {(
                      [
                        { id: 'none', label: 'Sharp (0px)' },
                        { id: 'subtle', label: 'Subtle (8px)' },
                        { id: 'rounded', label: 'Modern (14px)' },
                        { id: 'pill', label: 'Squircle (22px)' },
                      ] as const
                    ).map((cr) => (
                      <button
                        key={cr.id}
                        onClick={() => onUpdateLayout({ cornerRadius: cr.id })}
                        className={`py-2 px-3 rounded-xl border text-xs font-medium transition text-center ${
                          layoutConfig.cornerRadius === cr.id
                            ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15 text-white font-bold'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cr.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modular Chrome & Window Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {[
                    {
                      key: 'showWindowControls',
                      label: 'Show Traffic-Light Window Controls',
                      desc: 'Display close, minimize, and maximize buttons in titlebar.',
                    },
                    {
                      key: 'showBrandLogo',
                      label: 'Show JellyWisp Brand Emblem',
                      desc: 'Toggle logo badge in titlebar to free up extra horizontal space.',
                    },
                    {
                      key: 'showServerPill',
                      label: 'Show Jellyfin Server Latency Pill',
                      desc: 'Display live ping indicator and server status in header.',
                    },
                    {
                      key: 'showQuickUtilityButtons',
                      label: 'Show Titlebar Utility Icons (EQ/Vis/Metrics)',
                      desc: 'Hide utility icons if you want an ultra-clean search header.',
                    },
                    {
                      key: 'swapTitlebarSides',
                      label: 'Mirror / Swap Titlebar Left & Right Sides',
                      desc: 'Flip window branding and settings buttons to opposite sides.',
                    },
                    {
                      key: 'showSidebarQuickCard',
                      label: 'Show Sidebar Now-Playing Card',
                      desc: 'Display mini track inspector inside vertical navigation.',
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{item.label}</p>
                        <p className="text-[10px] text-slate-400">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={
                          item.key === 'swapTitlebarSides'
                            ? Boolean((layoutConfig as any)[item.key])
                            : (layoutConfig as any)[item.key] !== false
                        }
                        onChange={(e) => onUpdateLayout({ [item.key]: e.target.checked })}
                        className="w-4 h-4 rounded text-cyan-400"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: PLAYER DECK MICRO-TUNING & VINYL                        */}
            {/* ============================================================== */}
            {activeTab === 'player' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Player Deck Micro-Tuning, Artwork & Scrubber
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customize album artwork geometry (including spinning vinyl record), scrubber style, time display, and mini spectrum visualizer.
                  </p>
                </div>

                {/* Artwork Shape */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Player Album Artwork Style
                  </span>
                  <div className="grid grid-cols-4 gap-2.5">
                    {(
                      [
                        { id: 'rounded', label: 'Rounded Sleeve' },
                        { id: 'square', label: 'Sharp Studio' },
                        { id: 'circle', label: 'Circular Disc' },
                        { id: 'vinyl', label: 'Spinning Vinyl LP' },
                      ] as { id: ArtworkShape; label: string }[]
                    ).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => onUpdateLayout({ artworkShape: s.id })}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition ${
                          layoutConfig.artworkShape === s.id
                            ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15 text-white font-bold'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scrubber Style */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Timeline Scrubber Style
                  </span>
                  <div className="grid grid-cols-4 gap-2.5">
                    {(
                      [
                        { id: 'classic', label: 'Classic Line' },
                        { id: 'thick', label: 'Thick Studio Bar' },
                        { id: 'glow', label: 'Neon Glow Bar' },
                        { id: 'minimal', label: 'Hairline Minimal' },
                      ] as { id: ScrubberStyle; label: string }[]
                    ).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => onUpdateLayout({ scrubberStyle: s.id })}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition ${
                          layoutConfig.scrubberStyle === s.id
                            ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15 text-white font-bold'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Display Format */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Timecode Readout Mode
                  </span>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(
                      [
                        { id: 'elapsed-total', label: 'Elapsed / Total (01:24 / 04:12)' },
                        { id: 'elapsed-remaining', label: 'Elapsed / Remaining (-02:48)' },
                        { id: 'percent', label: 'Elapsed / Completion %' },
                      ] as { id: TimeDisplayMode; label: string }[]
                    ).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => onUpdateLayout({ timeDisplayMode: s.id })}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition ${
                          layoutConfig.timeDisplayMode === s.id
                            ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15 text-white font-bold'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mini Spectrum Visualizer Mode */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Embedded Player Spectrum Visualizer Style
                  </span>
                  <div className="grid grid-cols-4 gap-2.5">
                    {(
                      [
                        { id: 'bars', label: 'FFT Frequency Bars' },
                        { id: 'wave', label: 'Oscilloscope Wave' },
                        { id: 'dots', label: 'Floating Peaks' },
                        { id: 'off', label: 'Disabled / Off' },
                      ] as { id: MiniVisStyle; label: string }[]
                    ).map((s) => (
                      <button
                        key={s.id}
                        onClick={() =>
                          onUpdateLayout({
                            miniVisStyle: s.id,
                            showMiniSpectrum: s.id !== 'off',
                          })
                        }
                        className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition ${
                          layoutConfig.miniVisStyle === s.id
                            ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15 text-white font-bold'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 4: LIBRARY COLUMNS & ALBUM GRID                            */}
            {/* ============================================================== */}
            {activeTab === 'library' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Tracklist Columns, Row Density & Album Grid
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Choose which metadata columns appear in the tracklist and how albums scale.
                  </p>
                </div>

                {/* Visible Tracklist Columns */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-white">
                    Visible Tracklist Table Columns
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(
                      [
                        { key: 'index', label: '# Track Index' },
                        { key: 'artwork', label: 'Cover Thumbnail' },
                        { key: 'album', label: 'Album Title' },
                        { key: 'genre', label: 'Genre Tag' },
                        { key: 'year', label: 'Release Year' },
                        { key: 'codec', label: 'Codec & PCM' },
                        { key: 'bitrate', label: 'Bitrate (kbps)' },
                        { key: 'replayGain', label: 'ReplayGain dB' },
                        { key: 'playCount', label: 'Play Count' },
                        { key: 'favorite', label: 'Heart / Favorite' },
                      ] as const
                    ).map((col) => {
                      const active = layoutConfig.visibleColumns?.[col.key] ?? true;
                      return (
                        <button
                          key={col.key}
                          onClick={() => toggleColumn(col.key)}
                          className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition ${
                            active
                              ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15 text-white font-bold'
                              : 'border-white/10 bg-black/30 text-slate-400'
                          }`}
                        >
                          <span>{col.label}</span>
                          {active && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row Density & Zebra Striping */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300">
                      Track Row Vertical Density
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['compact', 'standard', 'spacious'] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => onUpdateLayout({ trackListDensity: d })}
                          className={`py-2.5 px-3 rounded-xl border text-xs capitalize transition ${
                            layoutConfig.trackListDensity === d
                              ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15 text-white font-bold'
                              : 'border-white/10 bg-white/5 text-slate-400'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Album Wall Grid Columns</span>
                      <span className="font-mono text-cyan-400 font-bold">
                        {layoutConfig.albumGridColumns} Columns
                      </span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="8"
                      step="1"
                      value={layoutConfig.albumGridColumns}
                      onChange={(e) =>
                        onUpdateLayout({ albumGridColumns: parseInt(e.target.value) })
                      }
                      className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)] mt-2"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 5: MULTI-FONT TYPOGRAPHY                                   */}
            {/* ============================================================== */}
            {activeTab === 'typography' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Multi-Font Typography System & Scaling
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Independently customize your Primary UI Font, Display Heading Font, and Technical Telemetry Font.
                  </p>
                </div>

                {/* Primary UI Font */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-cyan-300 uppercase font-mono">
                    1. Primary Interface Font Family
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                    {fontOptions.map((f) => {
                      const isSelected = layoutConfig.fontFamily === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => onUpdateLayout({ fontFamily: f.id })}
                          className={`p-3 rounded-xl border text-left transition ${
                            isSelected
                              ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{f.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">{f.preview}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Heading Font & Telemetry Font */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-cyan-300 uppercase font-mono">
                      2. Section Headings Font
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {fontOptions.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => onUpdateLayout({ headingFontFamily: f.id })}
                          className={`py-2 px-3 rounded-xl border text-xs text-left transition ${
                            layoutConfig.headingFontFamily === f.id
                              ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15 text-white font-bold'
                              : 'border-white/10 bg-white/5 text-slate-400'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-cyan-300 uppercase font-mono">
                      3. Audio Telemetry & Timecode Font
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {fontOptions.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => onUpdateLayout({ monoFontFamily: f.id })}
                          className={`py-2 px-3 rounded-xl border text-xs text-left transition ${
                            layoutConfig.monoFontFamily === f.id
                              ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15 text-white font-bold'
                              : 'border-white/10 bg-white/5 text-slate-400'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Font Scaling & Letter Spacing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/25 p-4 rounded-xl border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Global UI Font Scale</span>
                      <span className="font-mono text-cyan-400 font-bold">
                        {layoutConfig.fontSizeScale}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="85"
                      max="125"
                      step="5"
                      value={layoutConfig.fontSizeScale}
                      onChange={(e) =>
                        onUpdateLayout({ fontSizeScale: parseInt(e.target.value) })
                      }
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
                    />
                  </div>

                  <div className="bg-black/25 p-4 rounded-xl border border-white/10 space-y-2">
                    <span className="text-xs text-slate-300 block">Letter Tracking</span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['tight', 'normal', 'wide'] as const).map((ls) => (
                        <button
                          key={ls}
                          onClick={() => onUpdateLayout({ letterSpacing: ls })}
                          className={`py-1.5 rounded-lg border text-xs capitalize ${
                            layoutConfig.letterSpacing === ls
                              ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/20 text-white font-bold'
                              : 'border-white/10 bg-white/5 text-slate-400'
                          }`}
                        >
                          {ls}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 6: THEMES, SHADERS & AMBIENT BLEED                         */}
            {/* ============================================================== */}
            {activeTab === 'themes' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Themes, Ambient Album Art Bleed & Glass Opacity
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Control curated color palettes, dynamic album cover color bleed, and module transparency.
                  </p>
                </div>

                {/* Dynamic Ambient Artwork Bleed Mode */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      Ambient Album Art Backdrop Shader
                    </span>
                    <span className="text-xs font-mono text-cyan-400">
                      Intensity: {layoutConfig.ambientIntensity}%
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        { id: 'album-bleed', label: 'Album Cover Bleed' },
                        { id: 'aurora', label: 'Cyber Aurora Glow' },
                        { id: 'vignette', label: 'Studio Vignette' },
                        { id: 'none', label: 'Solid Matte' },
                      ] as { id: AmbientEffect; label: string }[]
                    ).map((ef) => (
                      <button
                        key={ef.id}
                        onClick={() => onUpdateLayout({ ambientEffect: ef.id })}
                        className={`py-2 px-3 rounded-xl border text-xs font-medium transition ${
                          layoutConfig.ambientEffect === ef.id
                            ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15 text-white font-bold'
                            : 'border-white/10 bg-black/30 text-slate-400'
                        }`}
                      >
                        {ef.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={layoutConfig.ambientIntensity}
                    onChange={(e) =>
                      onUpdateLayout({ ambientIntensity: parseInt(e.target.value) })
                    }
                    className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PRESET_THEMES.map((theme) => {
                    const isSelected = currentTheme.id === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => onSelectPresetTheme(theme.id)}
                        className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between h-20 ${
                          isSelected
                            ? 'border-[var(--fin-accent)] bg-white/10 shadow-lg'
                            : 'border-white/5 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20"
                            style={{ backgroundColor: theme.accentColor }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20"
                            style={{ backgroundColor: theme.bgColor }}
                          />
                        </div>
                        <p className="text-xs font-bold text-white">{theme.name}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Transparency sliders */}
                <div className="grid grid-cols-2 gap-4 bg-black/25 p-4 rounded-xl border border-white/10">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Navigation Opacity</span>
                      <span className="font-mono text-cyan-400">
                        {Math.round(currentTheme.sidebarOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={currentTheme.sidebarOpacity}
                      onChange={(e) =>
                        onUpdateTheme({ sidebarOpacity: parseFloat(e.target.value) })
                      }
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Player Deck Opacity</span>
                      <span className="font-mono text-cyan-400">
                        {Math.round(currentTheme.playerOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={currentTheme.playerOpacity}
                      onChange={(e) =>
                        onUpdateTheme({ playerOpacity: parseFloat(e.target.value) })
                      }
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 7: AUDIO ENGINE & DSP                                      */}
            {/* ============================================================== */}
            {activeTab === 'dsp' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    High-Fidelity Audio DSP Engine
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Web Audio bit-accurate processing, ReplayGain normalization, stereo widening, and crossfading.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">10-Band Parametric Equalizer</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Status: {dspSettings.enabled ? 'Active' : 'Bypassed'} • Sub-bass +{dspSettings.bassBoostDb}dB
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-white/10 px-3 py-1.5 rounded-lg">
                    <input
                      type="checkbox"
                      checked={dspSettings.enabled}
                      onChange={(e) => onUpdateDsp({ enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-cyan-400"
                    />
                    <span className="text-xs font-semibold text-white">Enable DSP</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 bg-black/20 p-3.5 rounded-xl border border-white/5">
                    <span className="text-xs font-semibold text-slate-300">ReplayGain Mode</span>
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      {(['track', 'album', 'off'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => onUpdateDsp({ replayGainMode: m })}
                          className={`py-1 text-xs font-medium rounded capitalize ${
                            dspSettings.replayGainMode === m
                              ? 'bg-[var(--fin-accent)] text-slate-950 font-bold'
                              : 'bg-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 bg-black/20 p-3.5 rounded-xl border border-white/5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Seamless Crossfade</span>
                      <span className="font-mono text-cyan-400">{dspSettings.crossfadeSeconds}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="12"
                      step="0.5"
                      value={dspSettings.crossfadeSeconds}
                      onChange={(e) =>
                        onUpdateDsp({ crossfadeSeconds: parseFloat(e.target.value) })
                      }
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)] mt-2"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 8: KEYBINDINGS                                             */}
            {/* ============================================================== */}
            {activeTab === 'hotkeys' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      Keyboard Shortcut Manager
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click any key label to record a new custom key sequence.
                    </p>
                  </div>
                  <button
                    onClick={onResetHotkeys}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
                  {hotkeyBindings.map((hk) => {
                    const isRecording = recordingHotkeyId === hk.id;
                    return (
                      <div
                        key={hk.id}
                        className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between"
                      >
                        <span className="text-xs text-slate-200">{hk.label}</span>
                        <button
                          onClick={() => handleStartHotkeyRecording(hk.id)}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition ${
                            isRecording
                              ? 'bg-amber-500 text-slate-950 animate-pulse'
                              : 'bg-white/10 text-cyan-300 hover:border-cyan-500 border border-white/10'
                          }`}
                        >
                          {isRecording ? 'Press Key...' : hk.keyCombo}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 9: SERVER & JSON PROFILE                                   */}
            {/* ============================================================== */}
            {activeTab === 'server' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Jellyfin Server Connection & Profile Portability
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Manage active connection to your Jellyfin server or export your entire layout and theme configuration.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Active Server</span>
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {serverConfig.isConnected ? 'Connected' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-cyan-300">
                    {serverConfig.isDemoMode ? 'SoundSphere (Demo Server)' : serverConfig.serverName}
                  </p>
                  <p className="text-xs font-mono text-slate-400">{serverConfig.url}</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenServerModal();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow"
                  >
                    Configure Jellyfin Server Credentials
                  </button>

                  <button
                    onClick={handleExportProfile}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition"
                  >
                    Copy Full JSON Profile to Clipboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
