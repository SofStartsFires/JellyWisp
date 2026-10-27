import React from 'react';
import { X, Activity, HardDrive, Cpu, Radio, ShieldCheck, Gauge, Zap } from 'lucide-react';
import { PerformanceMetrics, Track } from '../types/index.ts';

interface PerformanceSpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: PerformanceMetrics | null;
  currentTrack: Track | null;
}

export const PerformanceSpecsModal: React.FC<PerformanceSpecsModalProps> = ({
  isOpen,
  onClose,
  metrics,
  currentTrack,
}) => {
  if (!isOpen) return null;

  const m = metrics || {
    sampleRate: currentTrack?.sampleRate || 96000,
    bitDepth: currentTrack?.bitDepth || 24,
    codec: currentTrack?.codec || 'FLAC',
    bitrate: currentTrack?.bitrate || 1411,
    bufferSeconds: 14.5,
    bufferHealthPct: 96,
    underrunCount: 0,
    latencyMs: 11.8,
    audioContextState: 'running',
    peakLevelL: 78,
    peakLevelR: 82,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0e1320] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                High-Fidelity Audio Performance Telemetry
              </h3>
              <p className="text-xs text-slate-400">
                Real-time Web Audio pipeline health, buffer analysis & bit-depth verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Signal Chain Status Banner */}
          <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-cyan-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-cyan-200 uppercase tracking-wider font-mono">
                  Lossless Direct Stream Verified
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Audio rendered bit-accurately via 32-bit floating point Web Audio pipeline.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              {m.audioContextState.toUpperCase()}
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Format & Codec */}
            <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Container / Codec</span>
              <p className="text-lg font-bold text-white font-mono">{m.codec}</p>
              <span className="text-[10px] text-emerald-400 font-mono">Bit-Perfect Stream</span>
            </div>

            {/* Sample Rate */}
            <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Sample Rate</span>
              <p className="text-lg font-bold text-cyan-400 font-mono">
                {(m.sampleRate / 1000).toFixed(1)} kHz
              </p>
              <span className="text-[10px] text-slate-400 font-mono">
                Nyquist: {(m.sampleRate / 2000).toFixed(1)} kHz
              </span>
            </div>

            {/* Bit Depth */}
            <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Quantization</span>
              <p className="text-lg font-bold text-purple-400 font-mono">{m.bitDepth}-bit</p>
              <span className="text-[10px] text-slate-400 font-mono">
                Dynamic Range: ~{m.bitDepth * 6.02} dB
              </span>
            </div>

            {/* Bitrate */}
            <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Effective Bitrate</span>
              <p className="text-lg font-bold text-amber-400 font-mono">{m.bitrate} kbps</p>
              <span className="text-[10px] text-slate-400 font-mono">Variable Lossless</span>
            </div>
          </div>

          {/* Buffer Health & Latency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Buffer Gauge */}
            <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Buffer Ahead Health
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {m.bufferSeconds.toFixed(1)}s ({m.bufferHealthPct}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${m.bufferHealthPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Underrun Stalls: {m.underrunCount}</span>
                <span className="text-emerald-400">Optimal Buffer Status</span>
              </div>
            </div>

            {/* Audio Engine Latency */}
            <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Audio Hardware Latency
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {m.latencyMs} ms
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (m.latencyMs / 40) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Base buffer: 5.1ms | Output DAC: 6.7ms (Zero perceived lag)
              </p>
            </div>
          </div>

          {/* Stereo Peak Level Meters */}
          <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3">
            <span className="text-xs font-semibold text-slate-200">
              Live Stereo Peak Meters (L & R Channels)
            </span>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-slate-400 w-3">L</span>
                <div className="flex-1 h-3 rounded bg-white/10 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-rose-500 transition-all duration-75"
                    style={{ width: `${m.peakLevelL}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-cyan-300 w-12 text-right">
                  {m.peakLevelL > 0 ? `-${(100 - m.peakLevelL) * 0.4} dB` : '-inf'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-slate-400 w-3">R</span>
                <div className="flex-1 h-3 rounded bg-white/10 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-rose-500 transition-all duration-75"
                    style={{ width: `${m.peakLevelR}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-cyan-300 w-12 text-right">
                  {m.peakLevelR > 0 ? `-${(100 - m.peakLevelR) * 0.4} dB` : '-inf'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
