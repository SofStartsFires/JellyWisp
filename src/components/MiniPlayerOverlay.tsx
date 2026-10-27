import React, { useEffect, useRef } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Maximize2 } from 'lucide-react';
import { Track } from '../types/index.ts';
import { audioEngine } from '../services/audioEngine.ts';

interface MiniPlayerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const MiniPlayerOverlay: React.FC<MiniPlayerOverlayProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onPrev,
  onNext,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const buffer = new Uint8Array(16);

    const render = () => {
      audioEngine.getFrequencyData(buffer);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / 16;
      for (let i = 0; i < 16; i++) {
        const val = isPlaying ? buffer[i] : 4;
        const h = Math.max(2, (val / 255) * canvas.height);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.85)';
        ctx.fillRect(i * barWidth, canvas.height - h, barWidth - 1, h);
      }
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, isPlaying]);

  if (!isOpen || !currentTrack) return null;

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-24 right-6 z-40 w-72 bg-[#0e1320]/95 border border-white/15 rounded-2xl shadow-2xl p-3.5 backdrop-blur-xl select-none animate-fadeIn flex flex-col gap-3">
      {/* Top Header */}
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-[10px] font-mono tracking-wider text-cyan-400 font-bold uppercase">
          Mini-Player
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="p-1 hover:text-white transition"
            title="Expand to Full Player"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:text-white transition"
            title="Close Mini-Player"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Track Details */}
      <div className="flex items-center gap-3">
        <img
          src={currentTrack.coverUrl}
          alt={currentTrack.title}
          className="w-14 h-14 rounded-xl object-cover shadow border border-white/10 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">{currentTrack.artist}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] font-mono text-cyan-400">
              {currentTrack.codec} {Math.round(currentTrack.sampleRate / 1000)}k
            </span>
            <canvas ref={canvasRef} width={40} height={12} className="rounded" />
          </div>
        </div>
      </div>

      {/* Micro progress line */}
      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-cyan-400 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Compact Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onPrev}
          aria-label="Previous track"
          className="p-1.5 text-slate-300 hover:text-white transition"
        >
          <SkipBack className="w-4 h-4 fill-current" />
        </button>

        <button
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="w-8 h-8 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow transition"
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        <button
          onClick={onNext}
          aria-label="Next track"
          className="p-1.5 text-slate-300 hover:text-white transition"
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </button>
      </div>
    </div>
  );
};
