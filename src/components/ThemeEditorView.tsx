import React, { useState } from 'react';
import {
  Palette,
  Sliders,
  Code2,
  Copy,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Layers,
  Check,
} from 'lucide-react';
import { ThemeConfig } from '../types/index.ts';
import { PRESET_THEMES, themeEngine } from '../services/themeEngine.ts';

interface ThemeEditorViewProps {
  currentTheme: ThemeConfig;
  onUpdateTheme: (theme: Partial<ThemeConfig>) => void;
  onSelectPreset: (presetId: string) => void;
}

const CSS_SNIPPETS = [
  {
    name: 'Neon Glow Edges',
    css: `/* Glowing Cyberpunk Edges */
.finamp-player-bar, .finamp-card {
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.35);
  border: 1px solid rgba(6, 182, 212, 0.5) !important;
}`,
  },
  {
    name: 'Audiophile Brass & Walnut Accents',
    css: `/* Audiophile Brass Accent Highlights */
.finamp-player-bar {
  background: linear-gradient(180deg, #181310 0%, #100d0b 100%);
  border-top: 2px solid #f59e0b !important;
}`,
  },
  {
    name: 'Frosted Glass Minimalist',
    css: `/* Nordic Frosted Glass Blur */
.finamp-sidebar, .finamp-player-bar {
  backdrop-filter: blur(30px) saturate(180%) !important;
  background-color: rgba(15, 23, 42, 0.65) !important;
}`,
  },
  {
    name: 'Retro CRT Scanlines',
    css: `/* Subtle Analog Scanline Effect */
body::after {
  content: " ";
  display: block;
  position: fixed;
  top: 0; left: 0; bottom: 0; right: 0;
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
  background-size: 100% 4px;
  z-index: 999;
  pointer-events: none;
  opacity: 0.35;
}`,
  },
];

export const ThemeEditorView: React.FC<ThemeEditorViewProps> = ({
  currentTheme,
  onUpdateTheme,
  onSelectPreset,
}) => {
  const [copied, setCopied] = useState(false);
  const [importStr, setImportStr] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(themeEngine.exportThemeJson());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportJson = () => {
    if (themeEngine.importThemeJson(importStr)) {
      setShowImportModal(false);
      setImportStr('');
      setImportError(null);
    } else {
      setImportError('Invalid Theme JSON format.');
    }
  };

  const quickColorSwatches = [
    '#ffffff',
    '#f8fafc',
    '#e2e8f0',
    '#94a3b8',
    '#06b6d4',
    '#38bdf8',
    '#a855f7',
    '#ec4899',
    '#f43f5e',
    '#f59e0b',
    '#10b981',
    '#84cc16',
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 select-none space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Palette className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Theme Customization, Outer Docks & Typography Colors
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Customize outer UI docks (Titlebar, Sidebar, Player Bar), dedicated text colors for Track Title, Artist Name, and Album Name, glass blur, or live CSS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied JSON!' : 'Export Theme'}</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>Import Theme</span>
          </button>
        </div>
      </div>

      {/* Preset Themes Selector */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
          Curated Audiophile & Full-Window Themes (Includes Outer Docks & Sidebars)
        </span>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {PRESET_THEMES.map((preset) => {
            const isSelected = currentTheme.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset.id)}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between h-28 relative overflow-hidden ${
                  isSelected
                    ? 'border-[var(--fin-accent)] shadow-lg shadow-[var(--fin-accent)]/20 bg-white/10'
                    : 'border-white/5 bg-white/5 hover:bg-white/10'
                }`}
              >
                {/* Mini color preview swatches */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: preset.accentColor }}
                    title="Accent"
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: preset.sidebarColor }}
                    title="Sidebar / Dock"
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: preset.playerColor }}
                    title="Player Bar"
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: preset.bgColor }}
                    title="Main Canvas"
                  />
                </div>

                <div>
                  <p className="text-xs font-bold text-white tracking-tight">{preset.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    Blur {preset.blurPx}px
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dedicated Text Color Category: Track Title, Artist Name, Album Name */}
      <div className="space-y-4 bg-gradient-to-r from-cyan-950/30 via-slate-900/50 to-purple-950/30 p-6 rounded-2xl border border-cyan-500/25">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Dedicated Metadata Text Colors (Track Title • Artist Name • Album Name)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Independently colorize Track Titles, Artist Names, and Album Titles across all tracklists, album grids, and player docks.
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-slate-300 border border-white/10 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Text Colors</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {[
            {
              key: 'trackTitleColor' as const,
              label: 'Track Title Text Color',
              sample: '01. Starlight Resonance (24-Bit Master)',
              value: currentTheme.trackTitleColor || currentTheme.textPrimary || '#f8fafc',
            },
            {
              key: 'artistNameColor' as const,
              label: 'Artist Name Text Color',
              sample: 'Lumina & The Analog Synthesizers',
              value: currentTheme.artistNameColor || currentTheme.textSecondary || '#cbd5e1',
            },
            {
              key: 'albumNameColor' as const,
              label: 'Album Name Text Color',
              sample: 'Odyssey in C Minor (Deluxe LP)',
              value: currentTheme.albumNameColor || currentTheme.textSecondary || '#94a3b8',
            },
          ].map((item) => (
            <div
              key={item.key}
              className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{item.label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={item.value}
                    onChange={(e) => onUpdateTheme({ [item.key]: e.target.value })}
                    className="w-7 h-7 rounded-lg border border-white/20 cursor-pointer bg-transparent"
                  />
                  <span className="text-[11px] font-mono text-cyan-300 uppercase">
                    {item.value}
                  </span>
                </div>
              </div>

              {/* Live Sample Preview */}
              <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/5 truncate text-xs font-semibold" style={{ color: item.value }}>
                {item.sample}
              </div>

              {/* Quick Swatches */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {quickColorSwatches.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => onUpdateTheme({ [item.key]: hex })}
                    className={`w-4 h-4 rounded-full border transition ${
                      item.value.toLowerCase() === hex.toLowerCase()
                        ? 'border-white scale-125 shadow'
                        : 'border-white/20 hover:scale-110'
                    }`}
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Outer UI Docks & Module Transparency */}
      <div className="space-y-5 bg-black/20 p-6 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">
            Outer UI Docks (Titlebar, Sidebar, Player Bar) & Glass Opacity
          </h3>
        </div>

        {/* Outer UI Color Pickers */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              key: 'accentColor' as const,
              label: 'Primary Accent',
              value: currentTheme.accentColor,
            },
            {
              key: 'titlebarColor' as const,
              label: 'Top Titlebar Dock',
              value: currentTheme.titlebarColor || currentTheme.sidebarColor,
            },
            {
              key: 'sidebarColor' as const,
              label: 'Sidebar / Nav Dock',
              value: currentTheme.sidebarColor,
            },
            {
              key: 'playerColor' as const,
              label: 'Player Bar Dock',
              value: currentTheme.playerColor,
            },
            {
              key: 'bgColor' as const,
              label: 'Main Canvas BG',
              value: currentTheme.bgColor,
            },
          ].map((col) => (
            <div
              key={col.key}
              className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-200 truncate">{col.label}</p>
                <p className="text-[10px] font-mono text-slate-400 uppercase">{col.value}</p>
              </div>
              <input
                type="color"
                value={col.value}
                onChange={(e) => onUpdateTheme({ [col.key]: e.target.value })}
                className="w-8 h-8 rounded-lg border border-white/20 cursor-pointer bg-transparent shrink-0"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          {/* Sidebar Opacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Sidebar & Titlebar Opacity</span>
              <span className="font-mono text-cyan-400 font-bold">
                {Math.round(currentTheme.sidebarOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={currentTheme.sidebarOpacity}
              onChange={(e) => onUpdateTheme({ sidebarOpacity: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
            />
          </div>

          {/* Player Bar Opacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Player Bar Dock Opacity</span>
              <span className="font-mono text-cyan-400 font-bold">
                {Math.round(currentTheme.playerOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={currentTheme.playerOpacity}
              onChange={(e) => onUpdateTheme({ playerOpacity: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
            />
          </div>

          {/* Cards Opacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Card Backgrounds</span>
              <span className="font-mono text-cyan-400 font-bold">
                {Math.round(currentTheme.cardOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={currentTheme.cardOpacity}
              onChange={(e) => onUpdateTheme({ cardOpacity: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
            />
          </div>

          {/* Backdrop Blur */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Glass Backdrop Blur</span>
              <span className="font-mono text-cyan-400 font-bold">{currentTheme.blurPx} px</span>
            </div>
            <input
              type="range"
              min="0"
              max="32"
              step="2"
              value={currentTheme.blurPx}
              onChange={(e) => onUpdateTheme({ blurPx: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
            />
          </div>
        </div>
      </div>

      {/* Live CSS Code Editor */}
      <div className="space-y-3 bg-black/30 p-6 rounded-2xl border border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              Live Custom CSS Injector (Direct DOM Execution)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">Insert Preset Snippet:</span>
            {CSS_SNIPPETS.map((snippet) => (
              <button
                key={snippet.name}
                onClick={() =>
                  onUpdateTheme({
                    customCss: currentTheme.customCss + '\n\n' + snippet.css,
                  })
                }
                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] font-mono text-cyan-300 border border-white/5 transition"
              >
                + {snippet.name}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Write custom CSS selectors targeting <code className="text-cyan-300">.finamp-player-bar</code>,{' '}
          <code className="text-cyan-300">.finamp-sidebar</code>, or{' '}
          <code className="text-cyan-300">.finamp-card</code>. Edits apply immediately to the page.
        </p>

        <textarea
          value={currentTheme.customCss}
          onChange={(e) => onUpdateTheme({ customCss: e.target.value })}
          rows={8}
          className="w-full bg-[#0a0d17] text-slate-200 font-mono text-xs p-4 rounded-xl border border-white/10 focus:border-[var(--fin-accent)] focus:outline-none transition leading-relaxed"
          placeholder="/* Write your custom CSS here. Changes apply instantaneously */"
        />
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0e1320] border border-white/10 rounded-2xl p-6 space-y-4">
            <h4 className="text-base font-bold text-white">Import Theme Configuration</h4>
            <textarea
              value={importStr}
              onChange={(e) => setImportStr(e.target.value)}
              placeholder="Paste exported Theme JSON here..."
              rows={6}
              className="w-full bg-black/40 text-xs font-mono p-3 rounded-lg border border-white/10 text-slate-200 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleImportJson}
                className="px-4 py-2 rounded-lg bg-[var(--fin-accent)] text-slate-950 font-bold text-xs"
              >
                Apply Theme
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
