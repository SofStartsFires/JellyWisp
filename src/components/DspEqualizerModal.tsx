import React, { useEffect, useRef } from 'react';
import { X, RotateCcw, Sparkles, SlidersHorizontal, Volume2 } from 'lucide-react';
import { DspSettings } from '../types/index.ts';
import { EQ_FREQUENCIES } from '../utils/audioMath.ts';

interface DspEqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dspSettings: DspSettings;
  onUpdateDsp: (settings: Partial<DspSettings>) => void;
}

const EQ_PRESETS: { name: string; bands: number[]; bass: number; width: number }[] = [
  { name: 'Flat / Pure Direct', bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], bass: 0, width: 1.0 },
  { name: 'Audiophile Studio Master', bands: [1.5, 1, 0, -0.5, 0.5, 1, 1.5, 2, 2.5, 3], bass: 1.5, width: 1.25 },
  { name: 'Bass Heavy Punch', bands: [7, 6, 4, 2, 0, -1, 0, 1, 2, 3], bass: 6, width: 1.1 },
  { name: 'Vocal & Midrange Glow', bands: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1], bass: 0, width: 1.05 },
  { name: 'Electronic / Synthwave', bands: [5, 4, 2, 0, -1, 1, 3, 4, 5, 6], bass: 4.5, width: 1.35 },
  { name: 'Acoustic Soundstage', bands: [2, 1.5, 0, 1, 2, 2.5, 3, 3.5, 4, 4.5], bass: 1.0, width: 1.4 },
];

export const DspEqualizerModal: React.FC<DspEqualizerModalProps> = ({
  isOpen,
  onClose,
  dspSettings,
  onUpdateDsp,
}) => {
  const curveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw smooth frequency response spline curve
  useEffect(() => {
    if (!isOpen) return;
    const canvas = curveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Grid center line (0dB)
    const midY = h / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    // +6dB and -6dB dashed grid lines
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY - (h / 4));
    ctx.lineTo(w, midY - (h / 4));
    ctx.moveTo(0, midY + (h / 4));
    ctx.lineTo(w, midY + (h / 4));
    ctx.stroke();
    ctx.setLineDash([]);

    // Plot EQ response points
    const points = dspSettings.eqBands.map((gainDb, i) => {
      const x = (i / (dspSettings.eqBands.length - 1)) * (w - 20) + 10;
      // Map -12dB .. +12dB to full height
      const clampedGain = Math.max(-12, Math.min(12, gainDb + (dspSettings.preampDb * 0.3)));
      const y = midY - (clampedGain / 12) * (h * 0.42);
      return { x, y };
    });

    // Spline curve through points
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

    // Gradient stroke
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#06b6d4');
    grad.addColorStop(0.5, '#38bdf8');
    grad.addColorStop(1, '#ec4899');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(6, 182, 212, 0.5)';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw node dots
    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });
  }, [isOpen, dspSettings]);

  if (!isOpen) return null;

  const handleBandChange = (index: number, val: number) => {
    const updated = [...dspSettings.eqBands];
    updated[index] = val;
    onUpdateDsp({ eqBands: updated });
  };

  const handlePresetSelect = (preset: typeof EQ_PRESETS[0]) => {
    onUpdateDsp({
      eqBands: [...preset.bands],
      bassBoostDb: preset.bass,
      stereoWidth: preset.width,
    });
  };

  const handleReset = () => {
    handlePresetSelect(EQ_PRESETS[0]);
    onUpdateDsp({ preampDb: 0, crossfadeSeconds: 2.0, pitchSpeed: 1.0 });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#0f1422] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--fin-accent)]/20 border border-[var(--fin-accent)]/30 flex items-center justify-center text-[var(--fin-accent)]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                10-Band Parametric Equalizer & High-Fidelity DSP
              </h3>
              <p className="text-xs text-slate-400">
                Bit-accurate Web Audio processing pipeline with ReplayGain & Stereo soundstage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* DSP Master Toggle */}
            <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
              <input
                type="checkbox"
                checked={dspSettings.enabled}
                onChange={(e) => onUpdateDsp({ enabled: e.target.checked })}
                className="w-4 h-4 rounded text-[var(--fin-accent)] focus:ring-0"
              />
              <span className="text-xs font-semibold text-slate-200">
                DSP {dspSettings.enabled ? 'Enabled' : 'Bypassed'}
              </span>
            </label>

            <button
              onClick={handleReset}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              title="Reset to Flat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Preset Selector Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-slate-400 shrink-0">Presets:</span>
            {EQ_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetSelect(preset)}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 shrink-0 transition"
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* Real-time Frequency Response Curve */}
          <div className="relative rounded-xl bg-black/40 border border-white/10 p-3 overflow-hidden">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1 px-2">
              <span>+12 dB</span>
              <span className="text-cyan-400 font-semibold">Calculated Acoustic Response Curve</span>
              <span>-12 dB</span>
            </div>
            <canvas ref={curveCanvasRef} width={760} height={120} className="w-full h-28" />
          </div>

          {/* 10 Vertical Equalizer Faders */}
          <div className="grid grid-cols-10 gap-2 bg-black/20 p-4 rounded-xl border border-white/5">
            {EQ_FREQUENCIES.map((freq, idx) => {
              const gain = dspSettings.eqBands[idx] || 0;
              const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
              return (
                <div key={freq} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                    {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
                  </span>
                  <div className="h-40 flex items-center justify-center">
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.5"
                      value={gain}
                      onChange={(e) => handleBandChange(idx, parseFloat(e.target.value))}
                      className="h-36 -rotate-90 w-36 appearance-none bg-white/10 rounded-lg cursor-pointer accent-[var(--fin-accent)]"
                    />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 font-medium">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Advanced DSP Controls: Preamp, Bass Boost, Stereo Width, Crossfade, ReplayGain */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Preamp */}
            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Master Preamp</span>
                <span className="font-mono text-cyan-400">
                  {dspSettings.preampDb > 0 ? `+${dspSettings.preampDb}` : dspSettings.preampDb} dB
                </span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={dspSettings.preampDb}
                onChange={(e) => onUpdateDsp({ preampDb: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
              />
              <p className="text-[10px] text-slate-500">
                Linear headroom attenuation to prevent inter-sample digital clipping.
              </p>
            </div>

            {/* Bass Boost */}
            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Sub-Bass Shelf (80Hz)</span>
                <span className="font-mono text-cyan-400">+{dspSettings.bassBoostDb} dB</span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={dspSettings.bassBoostDb}
                onChange={(e) => onUpdateDsp({ bassBoostDb: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
              />
              <p className="text-[10px] text-slate-500">
                Warm analog low-end boost without muddying vocal frequencies.
              </p>
            </div>

            {/* Stereo Soundstage Widener */}
            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Stereo Soundstage Width</span>
                <span className="font-mono text-cyan-400">{Math.round(dspSettings.stereoWidth * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={dspSettings.stereoWidth}
                onChange={(e) => onUpdateDsp({ stereoWidth: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
              />
              <p className="text-[10px] text-slate-500">
                Haas psychoacoustic stereo imaging for expansive headphone listening.
              </p>
            </div>

            {/* Crossfade */}
            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Seamless Crossfade</span>
                <span className="font-mono text-cyan-400">{dspSettings.crossfadeSeconds}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={dspSettings.crossfadeSeconds}
                onChange={(e) => onUpdateDsp({ crossfadeSeconds: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
              />
              <p className="text-[10px] text-slate-500">
                Smooth transition between consecutive tracks with zero gaps.
              </p>
            </div>

            {/* ReplayGain Mode */}
            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>ReplayGain Normalization</span>
                <span className="font-mono text-cyan-400 uppercase">{dspSettings.replayGainMode}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-lg">
                {(['track', 'album', 'off'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onUpdateDsp({ replayGainMode: mode })}
                    className={`py-1 text-xs font-medium rounded capitalize transition ${
                      dspSettings.replayGainMode === mode
                        ? 'bg-[var(--fin-accent)] text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500">
                Volume level equalization to target -14 LUFS loudness standard.
              </p>
            </div>

            {/* Playback Pitch & Speed */}
            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Playback Rate / Speed</span>
                <span className="font-mono text-cyan-400">{dspSettings.pitchSpeed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={dspSettings.pitchSpeed}
                onChange={(e) => onUpdateDsp({ pitchSpeed: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
              />
              <p className="text-[10px] text-slate-500">
                High-speed study or half-speed audio transcription mode.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
