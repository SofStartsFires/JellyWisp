import React, { useState } from 'react';
import { Keyboard, RotateCcw, Check, Sparkles } from 'lucide-react';
import { HotkeyBinding } from '../types/index.ts';

interface HotkeysViewProps {
  bindings: HotkeyBinding[];
  onUpdateBinding: (id: string, keyCombo: string) => void;
  onResetDefaults: () => void;
}

export const HotkeysView: React.FC<HotkeysViewProps> = ({
  bindings,
  onUpdateBinding,
  onResetDefaults,
}) => {
  const [recordingId, setRecordingId] = useState<string | null>(null);

  const startRecording = (id: string) => {
    setRecordingId(id);
    const handleKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let combo = e.code;
      if (e.ctrlKey || e.metaKey) combo = `Ctrl+${combo}`;
      if (e.shiftKey) combo = `Shift+${combo}`;
      if (e.altKey) combo = `Alt+${combo}`;

      onUpdateBinding(id, combo);
      setRecordingId(null);
      window.removeEventListener('keydown', handleKey, true);
    };

    window.addEventListener('keydown', handleKey, true);
  };

  const categories = [
    { id: 'playback', label: 'Playback & Audio Controls' },
    { id: 'view', label: 'Docks & View Toggles' },
    { id: 'dsp', label: 'Equalizer & Metadata' },
    { id: 'navigation', label: 'Search & Navigation' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 select-none space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Keyboard className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Power-User Hotkey & Shortcut Manager
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Customize keyboard shortcuts for every playback command and UI action. Click any shortcut to record a new key sequence.
          </p>
        </div>

        <button
          onClick={onResetDefaults}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Defaults</span>
        </button>
      </div>

      {/* Recording Alert Banner */}
      {recordingId && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Listening for keypress... Press any key or modifier combo now!</span>
          </div>
          <button
            onClick={() => setRecordingId(null)}
            className="text-xs text-amber-400 hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Categories of Hotkeys */}
      <div className="space-y-6">
        {categories.map((cat) => {
          const catBindings = bindings.filter((b) => b.category === cat.id);
          if (catBindings.length === 0) return null;
          return (
            <div key={cat.id} className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                {cat.label}
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {catBindings.map((binding) => {
                  const isRecording = recordingId === binding.id;
                  return (
                    <div
                      key={binding.id}
                      className="p-3.5 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between hover:bg-white/5 transition"
                    >
                      <span className="text-xs font-medium text-slate-200">
                        {binding.label}
                      </span>
                      <button
                        onClick={() => startRecording(binding.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition border ${
                          isRecording
                            ? 'bg-amber-500 text-slate-950 border-amber-400 animate-bounce'
                            : 'bg-white/10 text-cyan-300 border-white/10 hover:border-cyan-500/50'
                        }`}
                        title="Click to rebind"
                      >
                        {isRecording ? 'Press Key...' : binding.keyCombo}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
