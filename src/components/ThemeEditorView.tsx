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

  const handleCopyJson = () => {
    navigator.clipboard.writeText(themeEngine.exportThemeJson());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportJson = () => {
    if (themeEngine.importThemeJson(importStr)) {
      setShowImportModal(false);
      setImportStr('');
    } else {
      alert('Invalid Theme JSON');
    }
  };

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
              Theme Customization & Live CSS Injector
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Fine-tune color schemes, module transparency, backdrop blur, or write custom live CSS that instantly modifies the desktop interface.
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
          Curated Audiophile & Desktop Themes
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
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: preset.bgColor }}
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: preset.surfaceColor }}
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

      {/* Granular Module Transparency & Backdrop Blur Sliders */}
      <div className="space-y-4 bg-black/20 p-6 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">
            Individual Module Transparency & Glass Blur
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          {/* Sidebar Opacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Sidebar Opacity</span>
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
              <span>Player Bar Opacity</span>
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

        {/* Custom Accent Color Picker */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-300">Primary Accent Color</span>
            <input
              type="color"
              value={currentTheme.accentColor}
              onChange={(e) => onUpdateTheme({ accentColor: e.target.value })}
              className="w-8 h-8 rounded-lg border border-white/20 cursor-pointer bg-transparent"
            />
            <span className="text-xs font-mono text-slate-400 uppercase">
              {currentTheme.accentColor}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-300">Deep Canvas Background</span>
            <input
              type="color"
              value={currentTheme.bgColor}
              onChange={(e) => onUpdateTheme({ bgColor: e.target.value })}
              className="w-8 h-8 rounded-lg border border-white/20 cursor-pointer bg-transparent"
            />
            <span className="text-xs font-mono text-slate-400 uppercase">
              {currentTheme.bgColor}
            </span>
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
