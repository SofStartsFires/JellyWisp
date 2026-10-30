import React, { useState, useEffect } from 'react';
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
  Check,
  Disc,
  Columns,
  Move,
  Download,
  Monitor,
  Play,
  SkipBack,
  SkipForward,
  Lock,
  Speaker,
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
  PlayerArrangement,
  DedicatedPlayerStyle,
  VisibleSidebarItems,
  NavView,
  AudioDriverMode,
} from '../types/index.ts';
import { PRESET_THEMES } from '../services/themeEngine.ts';
import { WORKSPACE_PRESETS } from '../services/layoutEngine.ts';
import { JELLYWISP_COVER_PLACEHOLDER } from '../utils/jellywispArtwork.ts';
import { audioEngine } from '../services/audioEngine.ts';

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
  | 'home'
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
  const [showLivePreviewBox, setShowLivePreviewBox] = useState(true);
  const [isGlassPeekMode, setIsGlassPeekMode] = useState(false);
  const [audioDevices, setAudioDevices] = useState<{ deviceId: string; label: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      audioEngine.getAudioOutputDevices().then(setAudioDevices);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const fontOptions: { id: FontFamilyChoice; label: string; preview: string; description: string }[] = [
    {
      id: 'outfit',
      label: 'Outfit Sans',
      preview: 'Contemporary Clean & Geometric',
      description: 'Ultra-modern, highly balanced, pristine audiophile readability.',
    },
    {
      id: 'syne',
      label: 'Syne Display',
      preview: 'Avant-Garde Expressive Serif/Display',
      description: 'High-fashion, artistic personality, bold visual presence.',
    },
    {
      id: 'cinzel',
      label: 'Cinzel Classical',
      preview: 'Regal Roman Classical Serif',
      description: 'Timeless vinyl prestige, analog warmth, classical typography.',
    },
    {
      id: 'firacode',
      label: 'Fira Code',
      preview: '192kHz 24-bit PCM [FLAC Lossless]',
      description: 'Programmer ligatures, precision engineering, lossless technical aesthetic.',
    },
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
    {
      id: 'custom',
      label: 'Custom Web Font',
      preview: 'User-Specified Font Family',
      description: 'Load your favorite Google Font or local OS font face.',
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
      version: '2.7.0',
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

  const toggleSidebarItem = (key: keyof VisibleSidebarItems) => {
    const current = layoutConfig.visibleSidebarItems || ({} as VisibleSidebarItems);
    onUpdateLayout({
      visibleSidebarItems: {
        ...current,
        [key]: current[key] === false ? true : false,
      },
    });
  };

  const sidebarToggleDefinitions: { key: keyof VisibleSidebarItems; label: string; category: string }[] = [
    { key: 'tracks', label: 'All Songs', category: 'Library' },
    { key: 'albums', label: 'Albums', category: 'Library' },
    { key: 'artists', label: 'Artists', category: 'Library' },
    { key: 'album-artists', label: 'Album Artists', category: 'Library' },
    { key: 'genres', label: 'Genres', category: 'Library' },
    { key: 'decades', label: 'Decades & Eras', category: 'Library' },
    { key: 'favorites', label: 'Favorites', category: 'Library' },
    { key: 'smart-playlists', label: 'Smart Mood Mixes', category: 'Library' },
    { key: 'dsp', label: 'DSP & 10-Band EQ', category: 'Tools' },
    { key: 'art-search', label: 'Cover Art Finder', category: 'Tools' },
    { key: 'specs', label: 'Audio Telemetry', category: 'Tools' },
    { key: 'themes', label: 'Theme & Shaders', category: 'Customization' },
    { key: 'hotkeys', label: 'Keybindings', category: 'Customization' },
    { key: 'jellyfin-config', label: 'Jellyfin Server', category: 'Customization' },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all ${
        isGlassPeekMode ? 'bg-black/25 backdrop-blur-[2px]' : 'bg-black/80 backdrop-blur-md'
      }`}
    >
      <div
        className={`w-full max-w-6xl h-[90vh] border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden select-none transition-all ${
          isGlassPeekMode ? 'bg-[#0b0f1b]/75 backdrop-blur-xl' : 'bg-[#0b0f1b]'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--fin-accent)]/20 text-[var(--fin-accent)] border border-[var(--fin-accent)]/40 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                JellyWisp Customization & Settings Center
              </h2>
              <p className="text-xs text-slate-400">
                Real-time live preview, sidebar item visibility, player UI styles, edge-resizable docks, typography, and DSP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLivePreviewBox((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                showLivePreviewBox
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
              title="Toggle embedded live interactive preview"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showLivePreviewBox ? 'Live Preview: ON' : 'Live Preview: OFF'}</span>
            </button>

            <button
              onClick={() => setIsGlassPeekMode((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                isGlassPeekMode
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
              title="Make modal translucent to see the main app behind it"
            >
              <span>{isGlassPeekMode ? 'Translucent Peek: ON' : 'Translucent Peek'}</span>
            </button>

            {onToggleLayoutEditMode && (
              <button
                onClick={() => {
                  onClose();
                  onToggleLayoutEditMode();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold transition"
              >
                <Move className="w-3.5 h-3.5" />
                <span>Drag & Drop Docks</span>
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
                { id: 'presets' as SettingsTab, label: 'Workspace & Sidebar Items', icon: Move },
                { id: 'home' as SettingsTab, label: 'Home Dashboard & Stats', icon: Eye },
                { id: 'player' as SettingsTab, label: 'Player UI & Now Playing', icon: Disc },
                { id: 'layout' as SettingsTab, label: 'Section Docking & Sizes', icon: Layout },
                { id: 'library' as SettingsTab, label: 'Columns & Album Grid', icon: Columns },
                { id: 'typography' as SettingsTab, label: 'Multi-Font Typography', icon: Type },
                { id: 'themes' as SettingsTab, label: 'Colors, Shaders & Bleed', icon: Palette },
                { id: 'dsp' as SettingsTab, label: 'Audio Engine & DSP', icon: SlidersHorizontal },
                { id: 'hotkeys' as SettingsTab, label: 'Custom Keybindings', icon: Keyboard },
                { id: 'server' as SettingsTab, label: 'Server & Desktop Build', icon: Server },
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
            {/* LIVE INTERACTIVE CUSTOMIZATION PREVIEW MONITOR                 */}
            {/* ============================================================== */}
            {showLivePreviewBox && (
              <div className="p-4 rounded-2xl bg-black/50 border border-white/15 shadow-inner space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                      Live Interactive Customization Preview
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                    <span>Nav: {layoutConfig.sidebarPosition.toUpperCase()} ({layoutConfig.sidebarWidth}px)</span>
                    <span>•</span>
                    <span>Player: {layoutConfig.playerBarPosition.toUpperCase()} ({layoutConfig.playerArrangement})</span>
                    <span>•</span>
                    <span>Dedicated UI: {(layoutConfig.dedicatedPlayerStyle || 'vinyl-turntable').toUpperCase()}</span>
                  </div>
                </div>

                {/* Miniature Live Simulated Workspace */}
                <div
                  className="w-full h-44 rounded-xl border border-white/15 overflow-hidden flex flex-col relative transition-all duration-200"
                  style={{
                    backgroundColor: currentTheme.bgColor,
                    fontFamily:
                      layoutConfig.fontFamily === 'mono'
                        ? 'monospace'
                        : layoutConfig.fontFamily === 'serif'
                        ? 'serif'
                        : 'sans-serif',
                  }}
                >
                  {/* Simulated Titlebar */}
                  <div
                    className="px-3 flex items-center justify-between border-b border-white/10 shrink-0"
                    style={{
                      height: `${Math.max(22, Math.round((layoutConfig.titlebarHeightPx || 64) * 0.38))}px`,
                      backgroundColor: currentTheme.sidebarColor,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      {layoutConfig.showWindowControls !== false && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                          <span className="w-2 h-2 rounded-full bg-amber-400/80" />
                          <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                        </div>
                      )}
                      {layoutConfig.showBrandLogo !== false && (
                        <span
                          className="text-[10px] font-extrabold tracking-tight ml-1"
                          style={{ color: currentTheme.textPrimary }}
                        >
                          JellyWisp
                        </span>
                      )}
                    </div>
                    <div
                      className="px-2 py-0.5 rounded bg-white/10 border border-white/10 text-[9px] text-slate-300 truncate"
                      style={{
                        width: `${Math.min(260, Math.round((layoutConfig.searchBarMaxWidthPx || 860) * 0.22))}px`,
                      }}
                    >
                      Search library...
                    </div>
                    <div className="text-[9px] font-mono" style={{ color: currentTheme.accentColor }}>
                      24-bit / 96kHz
                    </div>
                  </div>

                  {/* Top Navigation if sidebarPosition === 'top' */}
                  {layoutConfig.sidebarPosition === 'top' && (
                    <div
                      className="px-3 py-1 border-b border-white/10 flex items-center gap-1.5 overflow-hidden shrink-0"
                      style={{ backgroundColor: currentTheme.sidebarColor }}
                    >
                      {sidebarToggleDefinitions
                        .filter((it) => layoutConfig.visibleSidebarItems?.[it.key] !== false)
                        .slice(0, 7)
                        .map((it, idx) => (
                          <span
                            key={it.key}
                            className="px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0"
                            style={{
                              backgroundColor: idx === 0 ? currentTheme.accentColor : 'rgba(255,255,255,0.06)',
                              color: idx === 0 ? '#020617' : currentTheme.textSecondary,
                            }}
                          >
                            {it.label}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Top Player if playerBarPosition === 'top' */}
                  {layoutConfig.playerBarPosition === 'top' && (
                    <div
                      className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between shrink-0"
                      style={{ backgroundColor: currentTheme.playerColor }}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={JELLYWISP_COVER_PLACEHOLDER}
                          alt=""
                          className={`w-5 h-5 object-cover border border-white/20 ${
                            layoutConfig.artworkShape === 'circle' || layoutConfig.artworkShape === 'vinyl'
                              ? 'rounded-full'
                              : 'rounded'
                          }`}
                        />
                        <span className="text-[9px] font-bold text-white">Starlight Resonance</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <SkipBack className="w-2.5 h-2.5 text-slate-400" />
                        <span
                          className="w-4 h-4 rounded-full flex items-center justify-center text-slate-950"
                          style={{ backgroundColor: currentTheme.accentColor }}
                        >
                          <Play className="w-2 h-2 fill-current" />
                        </span>
                        <SkipForward className="w-2.5 h-2.5 text-slate-400" />
                      </div>
                    </div>
                  )}

                  {/* Middle Workspace Row */}
                  <div className="flex-1 flex overflow-hidden min-h-0">
                    {/* Left Sidebar */}
                    {(layoutConfig.sidebarPosition === 'left' ||
                      layoutConfig.sidebarPosition === 'compact') && (
                      <div
                        className="border-r border-white/10 p-1.5 space-y-1 overflow-hidden shrink-0"
                        style={{
                          width:
                            layoutConfig.sidebarPosition === 'compact'
                              ? '34px'
                              : `${Math.max(85, Math.min(165, Math.round(layoutConfig.sidebarWidth * 0.45)))}px`,
                          backgroundColor: currentTheme.sidebarColor,
                        }}
                      >
                        {sidebarToggleDefinitions
                          .filter((it) => layoutConfig.visibleSidebarItems?.[it.key] !== false)
                          .slice(0, 6)
                          .map((it, idx) => (
                            <div
                              key={it.key}
                              className="px-1.5 py-0.5 rounded text-[8px] font-semibold truncate"
                              style={{
                                backgroundColor:
                                  idx === 0 ? `${currentTheme.accentColor}28` : 'transparent',
                                color: idx === 0 ? currentTheme.accentColor : currentTheme.textSecondary,
                              }}
                            >
                              {layoutConfig.sidebarPosition === 'compact' ? '•' : it.label}
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Left Player Deck */}
                    {layoutConfig.playerBarPosition === 'left' && (
                      <div
                        className="w-24 border-r border-white/10 p-2 flex flex-col items-center justify-center gap-1 shrink-0"
                        style={{ backgroundColor: currentTheme.playerColor }}
                      >
                        <img
                          src={JELLYWISP_COVER_PLACEHOLDER}
                          alt=""
                          className={`w-10 h-10 object-cover border border-white/20 ${
                            layoutConfig.artworkShape === 'circle' || layoutConfig.artworkShape === 'vinyl'
                              ? 'rounded-full'
                              : 'rounded-lg'
                          }`}
                        />
                        <span className="text-[8px] font-bold text-white truncate">Left Deck</span>
                      </div>
                    )}

                    {/* Center Content Area */}
                    <div className="flex-1 p-2 space-y-1 overflow-hidden">
                      <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 border-b border-white/10 pb-0.5">
                        <span># TITLE</span>
                        {layoutConfig.visibleColumns?.albumArtist && <span>ALBUM ARTIST</span>}
                        {layoutConfig.visibleColumns?.album && <span>ALBUM</span>}
                        {layoutConfig.visibleColumns?.decade && <span>DECADE</span>}
                        {layoutConfig.visibleColumns?.genre && <span>GENRE</span>}
                        <span>TIME</span>
                      </div>
                      {[
                        { t: 'Midnight Synthesis', aa: 'Lumina', alb: 'Odyssey', dec: '2020s', g: 'Synthwave' },
                        { t: 'Boomer Guitar Solo', aa: 'The Amplifiers', alb: '1974 Live', dec: '1970s', g: 'Classic Rock' },
                        { t: 'Helena Breakdown', aa: 'Black Parade', alb: 'Three Cheers', dec: '2000s', g: 'Emo' },
                      ].map((row, idx) => (
                        <div
                          key={row.t}
                          className="px-1.5 py-1 rounded flex items-center justify-between text-[9px]"
                          style={{
                            backgroundColor:
                              idx === 0 ? `${currentTheme.accentColor}1f` : 'rgba(255,255,255,0.02)',
                            color: idx === 0 ? currentTheme.accentColor : currentTheme.textPrimary,
                          }}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <img
                              src={JELLYWISP_COVER_PLACEHOLDER}
                              alt=""
                              className="w-4 h-4 rounded object-cover shrink-0"
                            />
                            <span className="font-semibold truncate">{row.t}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[8px] text-slate-400 font-mono shrink-0">
                            {layoutConfig.visibleColumns?.albumArtist && <span>{row.aa}</span>}
                            {layoutConfig.visibleColumns?.decade && <span>{row.dec}</span>}
                            {layoutConfig.visibleColumns?.genre && <span>{row.g}</span>}
                            <span>03:42</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Right Player Deck */}
                    {layoutConfig.playerBarPosition === 'right' && (
                      <div
                        className="w-24 border-l border-white/10 p-2 flex flex-col items-center justify-center gap-1 shrink-0"
                        style={{ backgroundColor: currentTheme.playerColor }}
                      >
                        <img
                          src={JELLYWISP_COVER_PLACEHOLDER}
                          alt=""
                          className={`w-10 h-10 object-cover border border-white/20 ${
                            layoutConfig.artworkShape === 'circle' || layoutConfig.artworkShape === 'vinyl'
                              ? 'rounded-full'
                              : 'rounded-lg'
                          }`}
                        />
                        <span className="text-[8px] font-bold text-white truncate">Right Deck</span>
                      </div>
                    )}

                    {/* Right Sidebar */}
                    {layoutConfig.sidebarPosition === 'right' && (
                      <div
                        className="border-l border-white/10 p-1.5 space-y-1 overflow-hidden shrink-0"
                        style={{
                          width: `${Math.max(85, Math.min(165, Math.round(layoutConfig.sidebarWidth * 0.45)))}px`,
                          backgroundColor: currentTheme.sidebarColor,
                        }}
                      >
                        {sidebarToggleDefinitions
                          .filter((it) => layoutConfig.visibleSidebarItems?.[it.key] !== false)
                          .slice(0, 5)
                          .map((it, idx) => (
                            <div
                              key={it.key}
                              className="px-1.5 py-0.5 rounded text-[8px] font-semibold truncate"
                              style={{
                                color: idx === 0 ? currentTheme.accentColor : currentTheme.textSecondary,
                              }}
                            >
                              {it.label}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Player Bar */}
                  {(layoutConfig.playerBarPosition === 'bottom' ||
                    layoutConfig.playerBarPosition === 'floating') && (
                    <div
                      className={`px-3 py-1.5 border-t border-white/10 flex items-center justify-between shrink-0 ${
                        layoutConfig.playerBarPosition === 'floating' ? 'mx-3 mb-1.5 rounded-xl border' : ''
                      }`}
                      style={{ backgroundColor: currentTheme.playerColor }}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={JELLYWISP_COVER_PLACEHOLDER}
                          alt=""
                          className={`w-6 h-6 object-cover border border-white/20 ${
                            layoutConfig.artworkShape === 'circle' || layoutConfig.artworkShape === 'vinyl'
                              ? 'rounded-full'
                              : layoutConfig.artworkShape === 'square'
                              ? 'rounded-none'
                              : 'rounded-md'
                          }`}
                        />
                        <div>
                          <p className="text-[9px] font-bold text-white leading-tight">
                            Midnight Synthesis
                          </p>
                          <p className="text-[8px] text-slate-400 leading-tight">
                            Click to open Dedicated Player ({layoutConfig.dedicatedPlayerStyle || 'vinyl-turntable'})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <SkipBack className="w-3 h-3 text-slate-400" />
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-slate-950"
                          style={{ backgroundColor: currentTheme.accentColor }}
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                        </span>
                        <SkipForward className="w-3 h-3 text-slate-400" />
                        <div className="w-28 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="w-1/2 h-full rounded-full"
                            style={{ backgroundColor: currentTheme.accentColor }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 1: WORKSPACE PRESETS & SIDEBAR CUSTOMIZER                  */}
            {/* ============================================================== */}
            {/* ============================================================== */}
            {/* TAB: HOME DASHBOARD & STATISTICS CUSTOMIZER                    */}
            {/* ============================================================== */}
            {activeTab === 'home' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Home Dashboard & Statistics Customization
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customize what sections to display on your home dashboard, what statistics are highlighted in the telemetry bar, and counts for heavy rotation, recent albums, and featured artists.
                  </p>
                </div>

                {/* Section Toggles */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-cyan-300 uppercase font-mono">
                    Dashboard Sections Display
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'showHeroPlayer', label: 'Hero Spotlight / Quick Resume Player', desc: 'Large banner with cover art and resume play controls' },
                      { key: 'showTelemetryStats', label: 'Library Telemetry Stats Bar', desc: 'Total tracks, albums, lossless count, and ping' },
                      { key: 'showHeavyRotation', label: 'Heavy Rotation (Most Played)', desc: 'Most played tracks ranked by play count' },
                      { key: 'showRecentAlbums', label: 'Recent & Lossless Albums', desc: 'Newly added or recent albums grid' },
                      { key: 'showFeaturedArtists', label: 'Featured Artists', desc: 'Top artists in your library' },
                      { key: 'showSmartMixes', label: 'Smart Mood Mixes Cards', desc: 'Quick launcher for AI smart playlists' },
                    ].map((sec) => {
                      const hc = layoutConfig.homeConfig || { showHeroPlayer: true, showTelemetryStats: true, showHeavyRotation: true, showRecentAlbums: true, showFeaturedArtists: true, showSmartMixes: true };
                      const isShown = (hc as any)[sec.key] !== false;
                      return (
                        <div
                          key={sec.key}
                          onClick={() => {
                            const updated = {
                              ...(layoutConfig.homeConfig || {
                                showHeroPlayer: true,
                                showTelemetryStats: true,
                                telemetryItems: { tracks: true, albums: true, lossless: true, ping: true, artists: true },
                                showHeavyRotation: true,
                                heavyRotationCount: 10,
                                showRecentAlbums: true,
                                recentAlbumsCount: 8,
                                showFeaturedArtists: true,
                                featuredArtistsCount: 8,
                                showSmartMixes: true,
                                sectionOrder: ['hero', 'telemetry', 'heavy-rotation', 'recent-albums', 'featured-artists', 'smart-mixes'],
                              }),
                              [sec.key]: !isShown,
                            };
                            onUpdateLayout({ homeConfig: updated });
                          }}
                          className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                            isShown
                              ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15 text-white font-bold'
                              : 'border-white/10 bg-black/30 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <div>
                            <p className="text-xs">{sec.label}</p>
                            <p className="text-[10px] text-slate-400 font-normal">{sec.desc}</p>
                          </div>
                          {isShown && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Telemetry Stats Toggles */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-cyan-300 uppercase font-mono">
                    Statistics Displayed in Telemetry Bar
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      { key: 'tracks', label: 'Total Tracks' },
                      { key: 'albums', label: 'Total Albums' },
                      { key: 'lossless', label: 'Hi-Res Lossless' },
                      { key: 'ping', label: 'Server Ping' },
                      { key: 'artists', label: 'Artists Count' },
                    ].map((stat) => {
                      const hc = layoutConfig.homeConfig || { telemetryItems: { tracks: true, albums: true, lossless: true, ping: true, artists: true } };
                      const isStatShown = hc.telemetryItems?.[stat.key as keyof typeof hc.telemetryItems] !== false;
                      return (
                        <button
                          key={stat.key}
                          onClick={() => {
                            const currentHc = layoutConfig.homeConfig || {
                              showHeroPlayer: true,
                              showTelemetryStats: true,
                              telemetryItems: { tracks: true, albums: true, lossless: true, ping: true, artists: true },
                              showHeavyRotation: true,
                              heavyRotationCount: 10,
                              showRecentAlbums: true,
                              recentAlbumsCount: 8,
                              showFeaturedArtists: true,
                              featuredArtistsCount: 8,
                              showSmartMixes: true,
                              sectionOrder: ['hero', 'telemetry', 'heavy-rotation', 'recent-albums', 'featured-artists', 'smart-mixes'],
                            };
                            onUpdateLayout({
                              homeConfig: {
                                ...currentHc,
                                telemetryItems: {
                                  ...currentHc.telemetryItems,
                                  [stat.key]: !isStatShown,
                                },
                              },
                            });
                          }}
                          className={`p-3 rounded-xl border text-xs font-semibold transition flex items-center justify-between ${
                            isStatShown
                              ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300 font-bold'
                              : 'border-white/10 bg-black/30 text-slate-500'
                          }`}
                        >
                          <span>{stat.label}</span>
                          {isStatShown && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Item Counts Settings */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-cyan-300 uppercase font-mono">
                    Section Item Counts
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">Heavy Rotation Tracks Count</label>
                      <select
                        value={layoutConfig.homeConfig?.heavyRotationCount || 10}
                        onChange={(e) => {
                          const currentHc = layoutConfig.homeConfig || {
                            showHeroPlayer: true,
                            showTelemetryStats: true,
                            telemetryItems: { tracks: true, albums: true, lossless: true, ping: true, artists: true },
                            showHeavyRotation: true,
                            heavyRotationCount: 10,
                            showRecentAlbums: true,
                            recentAlbumsCount: 8,
                            showFeaturedArtists: true,
                            featuredArtistsCount: 8,
                            showSmartMixes: true,
                            sectionOrder: ['hero', 'telemetry', 'heavy-rotation', 'recent-albums', 'featured-artists', 'smart-mixes'],
                          };
                          onUpdateLayout({ homeConfig: { ...currentHc, heavyRotationCount: parseInt(e.target.value, 10) } });
                        }}
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="6">6 Tracks</option>
                        <option value="10">10 Tracks</option>
                        <option value="16">16 Tracks</option>
                        <option value="20">20 Tracks</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">Recent Albums Count</label>
                      <select
                        value={layoutConfig.homeConfig?.recentAlbumsCount || 8}
                        onChange={(e) => {
                          const currentHc = layoutConfig.homeConfig || {
                            showHeroPlayer: true,
                            showTelemetryStats: true,
                            telemetryItems: { tracks: true, albums: true, lossless: true, ping: true, artists: true },
                            showHeavyRotation: true,
                            heavyRotationCount: 10,
                            showRecentAlbums: true,
                            recentAlbumsCount: 8,
                            showFeaturedArtists: true,
                            featuredArtistsCount: 8,
                            showSmartMixes: true,
                            sectionOrder: ['hero', 'telemetry', 'heavy-rotation', 'recent-albums', 'featured-artists', 'smart-mixes'],
                          };
                          onUpdateLayout({ homeConfig: { ...currentHc, recentAlbumsCount: parseInt(e.target.value, 10) } });
                        }}
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="4">4 Albums</option>
                        <option value="8">8 Albums</option>
                        <option value="12">12 Albums</option>
                        <option value="16">16 Albums</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">Featured Artists Count</label>
                      <select
                        value={layoutConfig.homeConfig?.featuredArtistsCount || 8}
                        onChange={(e) => {
                          const currentHc = layoutConfig.homeConfig || {
                            showHeroPlayer: true,
                            showTelemetryStats: true,
                            telemetryItems: { tracks: true, albums: true, lossless: true, ping: true, artists: true },
                            showHeavyRotation: true,
                            heavyRotationCount: 10,
                            showRecentAlbums: true,
                            recentAlbumsCount: 8,
                            showFeaturedArtists: true,
                            featuredArtistsCount: 8,
                            showSmartMixes: true,
                            sectionOrder: ['hero', 'telemetry', 'heavy-rotation', 'recent-albums', 'featured-artists', 'smart-mixes'],
                          };
                          onUpdateLayout({ homeConfig: { ...currentHc, featuredArtistsCount: parseInt(e.target.value, 10) } });
                        }}
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="4">4 Artists</option>
                        <option value="8">8 Artists</option>
                        <option value="12">12 Artists</option>
                        <option value="16">16 Artists</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'presets' && (
              <div className="space-y-6">
                {/* Show / Hide Sidebar Navigation Items */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/35 to-indigo-950/35 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                        Customize Sidebar Navigation Items (Show / Hide Anything)
                      </h3>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Put power in your hands: toggle Album Artists, Decades, Genres, Favorites, Smart Moods, or any tool on the sidebar.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        onUpdateLayout({
                          visibleSidebarItems: {
                            tracks: true,
                            albums: true,
                            artists: true,
                            'album-artists': true,
                            genres: true,
                            decades: true,
                            favorites: true,
                            'smart-playlists': true,
                            dsp: true,
                            'art-search': true,
                            specs: true,
                            themes: true,
                            hotkeys: true,
                            'jellyfin-config': true,
                          },
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-mono text-cyan-300 shrink-0"
                    >
                      Show All
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {sidebarToggleDefinitions.map((item) => {
                      const isShown = layoutConfig.visibleSidebarItems?.[item.key] !== false;
                      return (
                        <button
                          key={item.key}
                          onClick={() => toggleSidebarItem(item.key)}
                          className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                            isShown
                              ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15 text-white font-bold'
                              : 'border-white/10 bg-black/30 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs truncate">{item.label}</p>
                            <p className="text-[9px] font-mono text-slate-400 uppercase">
                              {item.category}
                            </p>
                          </div>
                          {isShown && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    One-Click Modular Workspace Architectures
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Instantly rearrange the entire player—push the sidebar into top horizontal tabs, convert the player into a left/right sidebar deck, or float glass tiles. You can also drag any edge in the UI to resize panels in real time!
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
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">
                      Interactive Section Dock Matrix
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tip: Hover over the border of the Sidebar, Bottom Player Dock, or Queue Drawer to drag-resize them with your mouse like a native desktop window.
                    </p>
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
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: PLAYER UI ARRANGEMENTS & DEDICATED TRACK PLAYER         */}
            {/* ============================================================== */}
            {activeTab === 'player' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Player Bar UI Layouts & Dedicated Track Player Styles
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Choose how the docked player bar is arranged and how the fullscreen Dedicated Track Player looks when you click the cover art, title, or artist.
                  </p>
                </div>

                {/* Docked Player Bar UI Arrangement */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-cyan-300 uppercase font-mono">
                    1. Docked Player Bar UI Arrangement
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                    {(
                      [
                        {
                          id: 'standard',
                          label: 'Standard 3-Zone',
                          desc: 'Track info left, transport + scrubber center, utilities right.',
                        },
                        {
                          id: 'centered',
                          label: 'Centered Deck',
                          desc: 'Compact centered transport with top edge timeline bar.',
                        },
                        {
                          id: 'split',
                          label: 'Split Monitor',
                          desc: 'Transport buttons on left, wide precision scrubber in center.',
                        },
                        {
                          id: 'waveform-deck',
                          label: 'DJ Waveform Deck',
                          desc: 'Interactive multi-bar waveform scrubber across the center.',
                        },
                        {
                          id: 'minimal',
                          label: 'Ultra Minimal Strip',
                          desc: 'Sleek single-line strip with hairline progress indicator.',
                        },
                      ] as { id: PlayerArrangement; label: string; desc: string }[]
                    ).map((arr) => (
                      <button
                        key={arr.id}
                        onClick={() => onUpdateLayout({ playerArrangement: arr.id })}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                          layoutConfig.playerArrangement === arr.id
                            ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15 text-white'
                            : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-extrabold text-white">{arr.label}</span>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">{arr.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dedicated Fullscreen Track Player Style */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-cyan-300 uppercase font-mono">
                    2. Dedicated Track Player UI Style (Opens when clicking Cover / Title / Artist)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {(
                      [
                        {
                          id: 'vinyl-turntable',
                          label: 'Spinning Vinyl Turntable',
                          desc: 'Animated analog LP record with pivoted tonearm & warm sleeve.',
                        },
                        {
                          id: 'sleek-canvas',
                          label: 'Sleek Floating Canvas',
                          desc: 'High-impact hero artwork with ambient glow & audio badges.',
                        },
                        {
                          id: 'vu-meters',
                          label: 'Dual Analog VU Meters',
                          desc: 'Live L/R dB level meters with whole-number peak readouts.',
                        },
                        {
                          id: 'minimal-zen',
                          label: 'Minimal Zen Theater',
                          desc: 'Distraction-free centered artwork & clean typography.',
                        },
                      ] as { id: DedicatedPlayerStyle; label: string; desc: string }[]
                    ).map((st) => (
                      <button
                        key={st.id}
                        onClick={() => onUpdateLayout({ dedicatedPlayerStyle: st.id })}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                          (layoutConfig.dedicatedPlayerStyle || 'vinyl-turntable') === st.id
                            ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15 text-white'
                            : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-extrabold text-white">{st.label}</span>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">{st.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Artwork Shape */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Player Album Artwork Shape
                  </span>
                  <div className="grid grid-cols-4 gap-2.5">
                    {(
                      [
                        { id: 'rounded', label: 'Rounded Sleeve' },
                        { id: 'square', label: 'Sharp Square' },
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
                        { id: 'thick', label: 'Thick Bar' },
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

                {/* Time Display Format & Mini Spectrum */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300">
                      Timecode Readout Mode
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'elapsed-total', label: 'Elapsed / Total' },
                          { id: 'elapsed-remaining', label: 'Remaining' },
                          { id: 'percent', label: 'Percent %' },
                        ] as { id: TimeDisplayMode; label: string }[]
                      ).map((s) => (
                        <button
                          key={s.id}
                          onClick={() => onUpdateLayout({ timeDisplayMode: s.id })}
                          className={`py-2 px-2 rounded-xl border text-xs font-medium transition ${
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

                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300">
                      Embedded Mini Spectrum Style
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {(
                        [
                          { id: 'bars', label: 'FFT Bars' },
                          { id: 'wave', label: 'Wave' },
                          { id: 'dots', label: 'Peaks' },
                          { id: 'off', label: 'Off' },
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
                          className={`py-2 px-2 rounded-xl border text-xs font-medium transition ${
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
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: UNIVERSAL SIZING & SECTION MODULARITY                   */}
            {/* ============================================================== */}
            {activeTab === 'layout' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Universal Element Sizing & Real-Time Edge Dragging
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Adjust exact pixel dimensions below, or simply grab the border edge of the Sidebar, Bottom Dock, or Titlebar with your mouse and drag it like a desktop window!
                  </p>
                </div>

                {/* Universal Sliders for All Sections & Elements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {[
                    {
                      key: 'sidebarWidth',
                      label: 'Navigation Sidebar Width',
                      val: layoutConfig.sidebarWidth,
                      min: 160,
                      max: 520,
                      step: 5,
                      unit: 'px',
                    },
                    {
                      key: 'playerBarHeight',
                      label: 'Bottom / Top Player Dock Height',
                      val: layoutConfig.playerBarHeight,
                      min: 56,
                      max: 240,
                      step: 4,
                      unit: 'px',
                    },
                    {
                      key: 'playerSidebarWidth',
                      label: 'Vertical Sidebar Player Width',
                      val: layoutConfig.playerSidebarWidth,
                      min: 220,
                      max: 520,
                      step: 10,
                      unit: 'px',
                    },
                    {
                      key: 'topTabsHeightPx',
                      label: 'Horizontal Top/Bottom Tabs Height',
                      val: layoutConfig.topTabsHeightPx ?? 50,
                      min: 38,
                      max: 96,
                      step: 2,
                      unit: 'px',
                    },
                    {
                      key: 'titlebarHeightPx',
                      label: 'Top Window Titlebar Height',
                      val: layoutConfig.titlebarHeightPx ?? 64,
                      min: 48,
                      max: 110,
                      step: 2,
                      unit: 'px',
                    },
                    {
                      key: 'searchBarMaxWidthPx',
                      label: 'Search Bar Max Width',
                      val: layoutConfig.searchBarMaxWidthPx ?? 860,
                      min: 360,
                      max: 1600,
                      step: 20,
                      unit: 'px',
                    },
                    {
                      key: 'playerArtworkSizePx',
                      label: 'Player Bar Cover Art Size',
                      val: layoutConfig.playerArtworkSizePx ?? 54,
                      min: 38,
                      max: 140,
                      step: 2,
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
                          onUpdateLayout({ [slider.key]: parseInt(e.target.value, 10) })
                        }
                        className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 4: LIBRARY COLUMNS, ALBUM & ARTIST LAYOUT STYLES           */}
            {/* ============================================================== */}
            {activeTab === 'library' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Tracklist Columns, Album View Layouts & Artist View Styles
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Show or hide any metadata column, choose your startup default view, switch Album/Artist styles, and customize grid density.
                  </p>
                </div>

                {/* Default Startup Library View Selector */}
                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 uppercase font-mono">
                      Default Startup Library View
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Loaded automatically on app launch
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {(
                      [
                        { id: 'home' as NavView, label: 'Home Dashboard' },
                        { id: 'tracks' as NavView, label: 'All Tracks' },
                        { id: 'albums' as NavView, label: 'Albums Grid' },
                        { id: 'artists' as NavView, label: 'Artists' },
                        { id: 'album-artists' as NavView, label: 'Album Artists' },
                        { id: 'genres' as NavView, label: 'Genres' },
                        { id: 'decades' as NavView, label: 'Decades & Eras' },
                        { id: 'smart-playlists' as NavView, label: 'Smart Mood Mixes' },
                        { id: 'favorites' as NavView, label: 'Favorites' },
                      ] as const
                    ).map((v) => {
                      const isSelected = (layoutConfig.defaultStartupView || 'home') === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => onUpdateLayout({ defaultStartupView: v.id })}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold text-left transition flex items-center justify-between ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-500/20 text-white font-bold'
                              : 'border-white/10 bg-black/40 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{v.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Album & Artist View Layout Style Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                    <span className="text-xs font-bold text-cyan-300 uppercase font-mono">
                      Album View Layout Style
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: 'grid', label: 'Classic Cover Wall' },
                          { id: 'shelves', label: 'Categorized Shelves' },
                          { id: 'showcase', label: 'Vinyl Sleeve Showcase' },
                          { id: 'list', label: 'Detailed Studio Rows' },
                        ] as const
                      ).map((st) => (
                        <button
                          key={st.id}
                          onClick={() => onUpdateLayout({ albumViewStyle: st.id })}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold text-left transition ${
                            (layoutConfig.albumViewStyle || 'grid') === st.id
                              ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15 text-white font-bold'
                              : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                    <span className="text-xs font-bold text-cyan-300 uppercase font-mono">
                      Artist & Album Artist Layout Style
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: 'cards', label: 'Portrait Cards' },
                          { id: 'circles', label: 'Circular Medallions' },
                          { id: 'magazine', label: 'Editorial Banners' },
                          { id: 'compact', label: 'Compact Rows' },
                        ] as const
                      ).map((st) => (
                        <button
                          key={st.id}
                          onClick={() => onUpdateLayout({ artistViewStyle: st.id })}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold text-left transition ${
                            (layoutConfig.artistViewStyle || 'cards') === st.id
                              ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)]/15 text-white font-bold'
                              : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Visible Tracklist Columns */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-white">
                    Visible Tracklist Table Columns (Show / Hide)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        { key: 'index', label: '# Track Index' },
                        { key: 'artwork', label: 'Cover Thumbnail' },
                        { key: 'albumArtist', label: 'Album Artist' },
                        { key: 'album', label: 'Album Title' },
                        { key: 'genre', label: 'Genre Tag' },
                        { key: 'decade', label: 'Decade (1970s, etc.)' },
                        { key: 'year', label: 'Release Year' },
                        { key: 'bpm', label: 'BPM Tempo' },
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

                {/* Row Density & Album Wall Columns */}
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
                      min="2"
                      max="10"
                      step="1"
                      value={layoutConfig.albumGridColumns}
                      onChange={(e) =>
                        onUpdateLayout({ albumGridColumns: parseInt(e.target.value, 10) })
                      }
                      className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)] mt-2"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 5: MULTI-FONT TYPOGRAPHY & TEXT COLORS                     */}
            {/* ============================================================== */}
            {activeTab === 'typography' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Multi-Font Typography System & Dedicated Metadata Text Colors
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Independently customize your Primary UI Font, scaling, and dedicated colors for Track Titles, Artist Names, and Album Titles.
                  </p>
                </div>

                {/* Dedicated Text Color Category */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/35 to-purple-950/35 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-cyan-300 uppercase font-mono">
                        Dedicated Text Color Category (Track • Artist • Album)
                      </span>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Customize the exact text color of Track Titles, Artist Names, and Album Names across the entire app.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        onUpdateTheme({
                          trackTitleColor: '#f8fafc',
                          artistNameColor: '#cbd5e1',
                          albumNameColor: '#94a3b8',
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-mono text-slate-200"
                    >
                      Reset Text Colors
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      {
                        key: 'trackTitleColor' as const,
                        label: 'Track Title Color',
                        sample: 'Midnight Synthesis',
                        val: currentTheme.trackTitleColor || currentTheme.textPrimary || '#f8fafc',
                      },
                      {
                        key: 'artistNameColor' as const,
                        label: 'Artist Name Color',
                        sample: 'Lumina',
                        val: currentTheme.artistNameColor || currentTheme.textSecondary || '#cbd5e1',
                      },
                      {
                        key: 'albumNameColor' as const,
                        label: 'Album Name Color',
                        sample: 'Odyssey LP',
                        val: currentTheme.albumNameColor || currentTheme.textSecondary || '#94a3b8',
                      },
                    ].map((tc) => (
                      <div
                        key={tc.key}
                        className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{tc.label}</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={tc.val}
                              onChange={(e) => onUpdateTheme({ [tc.key]: e.target.value })}
                              className="w-6 h-6 rounded border border-white/20 cursor-pointer bg-transparent"
                            />
                            <span className="text-[10px] font-mono text-cyan-300 uppercase">
                              {tc.val}
                            </span>
                          </div>
                        </div>
                        <div
                          className="px-2.5 py-1.5 rounded bg-white/5 text-xs font-semibold truncate"
                          style={{ color: tc.val }}
                        >
                          {tc.sample}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {[
                            '#ffffff',
                            '#f8fafc',
                            '#cbd5e1',
                            '#94a3b8',
                            '#06b6d4',
                            '#38bdf8',
                            '#a855f7',
                            '#ec4899',
                            '#f59e0b',
                            '#10b981',
                          ].map((sw) => (
                            <button
                              key={sw}
                              onClick={() => onUpdateTheme({ [tc.key]: sw })}
                              className="w-4 h-4 rounded-full border border-white/20 hover:scale-110 transition"
                              style={{ backgroundColor: sw }}
                              title={sw}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
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

                {/* Custom Font Family & Google Font URL Injection */}
                {layoutConfig.fontFamily === 'custom' && (
                  <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-300 uppercase font-mono">
                        Custom Web Font Configuration
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Auto-injected into DOM &lt;head&gt;
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Custom Font Family Name
                        </label>
                        <input
                          type="text"
                          value={layoutConfig.customFontFamily || ''}
                          placeholder="e.g. Montserrat, Satoshi, General Sans"
                          onChange={(e) => onUpdateLayout({ customFontFamily: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Google Fonts / Webfont CSS Link URL (optional)
                        </label>
                        <input
                          type="url"
                          value={layoutConfig.customFontUrl || ''}
                          placeholder="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap"
                          onChange={(e) => onUpdateLayout({ customFontUrl: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  </div>
                )}

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
                        onUpdateLayout({ fontSizeScale: parseInt(e.target.value, 10) })
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
            {/* TAB 6: THEMES, OUTER DOCK COLORS, TEXT COLORS & SHADERS        */}
            {/* ============================================================== */}
            {activeTab === 'themes' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Full-Window Color Themes, Outer Docks & Metadata Text Colors
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Themes apply across the entire interface including outside docks (Titlebar, Sidebar, Player Bar), inner surfaces, and Track/Artist/Album text colors.
                  </p>
                </div>

                {/* Preset Themes Grid */}
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
                            title="Accent"
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20"
                            style={{ backgroundColor: theme.sidebarColor }}
                            title="Sidebar & Outer Dock"
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20"
                            style={{ backgroundColor: theme.playerColor }}
                            title="Player Bar"
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20"
                            style={{ backgroundColor: theme.bgColor }}
                            title="Canvas"
                          />
                        </div>
                        <p className="text-xs font-bold text-white">{theme.name}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Outer UI Dock Colors */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-cyan-300 uppercase font-mono">
                    Outer UI Docks & Surface Colors (Titlebar, Sidebar, Player Bar, Accent)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      {
                        key: 'accentColor' as const,
                        label: 'Accent Color',
                        val: currentTheme.accentColor,
                      },
                      {
                        key: 'titlebarColor' as const,
                        label: 'Titlebar Dock',
                        val: currentTheme.titlebarColor || currentTheme.sidebarColor,
                      },
                      {
                        key: 'sidebarColor' as const,
                        label: 'Sidebar / Tabs',
                        val: currentTheme.sidebarColor,
                      },
                      {
                        key: 'playerColor' as const,
                        label: 'Player Bar Dock',
                        val: currentTheme.playerColor,
                      },
                      {
                        key: 'bgColor' as const,
                        label: 'Main Canvas',
                        val: currentTheme.bgColor,
                      },
                    ].map((c) => (
                      <div
                        key={c.key}
                        className="p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white truncate">{c.label}</p>
                          <p className="text-[9px] font-mono text-slate-400 uppercase">{c.val}</p>
                        </div>
                        <input
                          type="color"
                          value={c.val}
                          onChange={(e) => onUpdateTheme({ [c.key]: e.target.value })}
                          className="w-7 h-7 rounded border border-white/20 cursor-pointer bg-transparent shrink-0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dedicated Track / Artist / Album Text Color Pickers */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-cyan-300 uppercase font-mono">
                    Dedicated Text Colors (Track Title • Artist Name • Album Name)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        key: 'trackTitleColor' as const,
                        label: 'Track Title Text',
                        val: currentTheme.trackTitleColor || currentTheme.textPrimary || '#f8fafc',
                      },
                      {
                        key: 'artistNameColor' as const,
                        label: 'Artist Name Text',
                        val: currentTheme.artistNameColor || currentTheme.textSecondary || '#cbd5e1',
                      },
                      {
                        key: 'albumNameColor' as const,
                        label: 'Album Name Text',
                        val: currentTheme.albumNameColor || currentTheme.textSecondary || '#94a3b8',
                      },
                    ].map((tc) => (
                      <div
                        key={tc.key}
                        className="p-3 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold" style={{ color: tc.val }}>
                            {tc.label}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 uppercase">{tc.val}</p>
                        </div>
                        <input
                          type="color"
                          value={tc.val}
                          onChange={(e) => onUpdateTheme({ [tc.key]: e.target.value })}
                          className="w-7 h-7 rounded border border-white/20 cursor-pointer bg-transparent"
                        />
                      </div>
                    ))}
                  </div>
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
                        { id: 'vignette', label: 'Deep Vignette' },
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
                      onUpdateLayout({ ambientIntensity: parseInt(e.target.value, 10) })
                    }
                    className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
                  />
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
                      Status: {dspSettings.enabled ? 'Active' : 'Bypassed'} • Sub-bass +{Math.round(dspSettings.bassBoostDb)}dB
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

                {/* Audio Output Engine & Driver Architecture */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 to-slate-900/60 border border-cyan-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Speaker className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-cyan-300 uppercase font-mono">
                        Audio Output Engine & Hardware Driver
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      Bit-Perfect Engine
                    </span>
                  </div>

                  {/* Driver Mode Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Driver Mode Architecture
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        [
                          { id: 'wasapi' as AudioDriverMode, label: 'WASAPI Exclusive', desc: 'Bit-perfect direct kernel streaming' },
                          { id: 'directsound' as AudioDriverMode, label: 'DirectSound', desc: 'Windows shared audio subsystem' },
                          { id: 'asio' as AudioDriverMode, label: 'ASIO Low-Latency', desc: 'Pro audio hardware streaming' },
                          { id: 'default' as AudioDriverMode, label: 'System Default', desc: 'OS default multimedia pipeline' },
                        ] as const
                      ).map((drv) => {
                        const isSelected = (layoutConfig.audioDriverMode || 'default') === drv.id;
                        return (
                          <button
                            key={drv.id}
                            onClick={() => onUpdateLayout({ audioDriverMode: drv.id })}
                            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                              isSelected
                                ? 'border-cyan-400 bg-cyan-500/20 text-white font-bold'
                                : 'border-white/10 bg-black/40 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className="text-xs font-bold">{drv.label}</span>
                            <span className="text-[10px] text-slate-400 mt-1 leading-tight">{drv.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Playback Output Device Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Target Playback Audio Device
                    </label>
                    <select
                      value={layoutConfig.audioOutputDeviceId || 'default'}
                      onChange={(e) => {
                        const devId = e.target.value;
                        onUpdateLayout({ audioOutputDeviceId: devId });
                        audioEngine.setOutputDevice(devId);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="default">Default System Audio Output (Speakers / Headphones)</option>
                      {audioDevices
                        .filter((d) => d.deviceId !== 'default')
                        .map((d) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `Audio Output Device (${d.deviceId.slice(0, 8)})`}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Buffer Size & Sample Rate */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Audio Buffer Size</span>
                        <span className="font-mono text-cyan-400 font-bold">
                          {layoutConfig.audioBufferSize || 1024} samples
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 pt-1">
                        {[256, 512, 1024, 2048, 4096].map((sz) => (
                          <button
                            key={sz}
                            onClick={() => onUpdateLayout({ audioBufferSize: sz })}
                            className={`py-1 text-[11px] font-mono rounded ${
                              (layoutConfig.audioBufferSize || 1024) === sz
                                ? 'bg-cyan-500 text-slate-950 font-bold'
                                : 'bg-white/5 text-slate-400 hover:text-white'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Engine Sample Rate</span>
                        <span className="font-mono text-cyan-400 font-bold">
                          {layoutConfig.audioSampleRate || 'auto'}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 pt-1">
                        {['auto', '44100', '48000', '96000', '192000'].map((sr) => (
                          <button
                            key={sr}
                            onClick={() => onUpdateLayout({ audioSampleRate: sr })}
                            className={`py-1 text-[11px] font-mono rounded ${
                              (layoutConfig.audioSampleRate || 'auto') === sr
                                ? 'bg-cyan-500 text-slate-950 font-bold'
                                : 'bg-white/5 text-slate-400 hover:text-white'
                            }`}
                          >
                            {sr === 'auto' ? 'Auto' : `${parseInt(sr, 10) / 1000}k`}
                          </button>
                        ))}
                      </div>
                    </div>
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
            {/* TAB 9: SERVER & DESKTOP PACKAGING (MAC / WIN / LINUX)          */}
            {/* ============================================================== */}
            {activeTab === 'server' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Jellyfin Server Connection & Native Desktop App Compilation
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Manage your Jellyfin server credentials or compile JellyWisp into a standalone desktop binary for Windows, macOS, and Linux.
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

                <div className="flex items-center gap-3 flex-wrap">
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

                {/* Windows Desktop UI & System Tray Settings */}
                <div className="p-4 rounded-2xl bg-cyan-950/25 border border-cyan-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 uppercase font-mono">
                      Desktop Window & System Tray Behavior
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Windows 11 &amp; Desktop Integration
                    </span>
                  </div>

                  {/* Window Controls / Titlebar Style */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Window Titlebar Controls Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          id: 'windows' as const,
                          label: 'Windows 11 Fluent Controls',
                          desc: 'Minimize, Maximize, and Close buttons on top right',
                        },
                        {
                          id: 'mac' as const,
                          label: 'macOS Traffic Lights',
                          desc: 'Close, Minimize, Maximize buttons on top left',
                        },
                      ].map((tb) => {
                        const isSelected = (layoutConfig.titlebarStyle || 'windows') === tb.id;
                        return (
                          <button
                            key={tb.id}
                            onClick={() => onUpdateLayout({ titlebarStyle: tb.id })}
                            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                              isSelected
                                ? 'border-cyan-400 bg-cyan-500/20 text-white font-bold'
                                : 'border-white/10 bg-black/40 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className="text-xs font-bold">{tb.label}</span>
                            <span className="text-[10px] text-slate-400 mt-1">{tb.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tray & Minimization Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-start gap-3 cursor-pointer hover:border-cyan-500/40 transition">
                      <input
                        type="checkbox"
                        checked={Boolean(layoutConfig.minimizeToTray)}
                        onChange={(e) => onUpdateLayout({ minimizeToTray: e.target.checked })}
                        className="w-4 h-4 rounded text-cyan-400 accent-cyan-400 mt-0.5"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">Minimize to Tray</span>
                        <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                          Hide to system tray icon when minimizing main window
                        </span>
                      </div>
                    </label>

                    <label className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-start gap-3 cursor-pointer hover:border-cyan-500/40 transition">
                      <input
                        type="checkbox"
                        checked={Boolean(layoutConfig.closeToTray)}
                        onChange={(e) => onUpdateLayout({ closeToTray: e.target.checked })}
                        className="w-4 h-4 rounded text-cyan-400 accent-cyan-400 mt-0.5"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">Close to Tray</span>
                        <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                          Keep audio playing in tray when clicking window close
                        </span>
                      </div>
                    </label>

                    <label className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-start gap-3 cursor-pointer hover:border-cyan-500/40 transition">
                      <input
                        type="checkbox"
                        checked={Boolean(layoutConfig.maintainMiniPlayerOnMinimize)}
                        onChange={(e) => onUpdateLayout({ maintainMiniPlayerOnMinimize: e.target.checked })}
                        className="w-4 h-4 rounded text-cyan-400 accent-cyan-400 mt-0.5"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">Maintain Miniplayer</span>
                        <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                          Keep miniplayer floating on screen when main window minimizes
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Accidental Layout Edit Lock */}
                  <div className="pt-1 flex items-center justify-between p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="text-xs font-bold text-white block">Lock Drag &amp; Dock Panels</span>
                        <span className="text-[10px] text-slate-400 block">
                          Prevents accidental dragging or rearranging of player docks and navigation rails
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onUpdateLayout({ layoutLocked: !layoutConfig.layoutLocked })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        layoutConfig.layoutLocked
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      {layoutConfig.layoutLocked ? 'Panels Locked' : 'Panels Unlocked'}
                    </button>
                  </div>
                </div>

                {/* Native Desktop Program Build Instructions */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-indigo-950/40 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-extrabold text-white uppercase font-mono">
                      Compile as Standalone Desktop Program (Windows / macOS / Linux)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    This project folder is pre-configured with Electron (`electron/main.cjs`, `electron/preload.cjs`, and `electron-builder.json`). After downloading or cloning this project folder, run:
                  </p>
                  <div className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-cyan-300 space-y-1 select-text">
                    <p className="text-slate-400"># 1. Install dependencies &amp; Electron builder</p>
                    <p>npm install</p>
                    <p>npm install -D electron electron-builder</p>
                    <p className="text-slate-400 pt-1"># 2. Run live desktop window or package native installers</p>
                    <p>npm run desktop:dev &nbsp;&nbsp;&nbsp;# Launch native desktop window</p>
                    <p>npm run desktop:win &nbsp;&nbsp;&nbsp;# Build Windows .exe (NSIS + Portable)</p>
                    <p>npm run desktop:mac &nbsp;&nbsp;&nbsp;# Build macOS .dmg + .zip</p>
                    <p>npm run desktop:linux &nbsp;# Build Linux .AppImage + .deb</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
