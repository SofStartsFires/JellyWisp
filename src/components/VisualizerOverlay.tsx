import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, BarChart2, Radio, Activity, Orbit } from 'lucide-react';
import { Track } from '../types/index.ts';
import { audioEngine } from '../services/audioEngine.ts';

interface VisualizerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
}

type VisualizerMode = 'bars' | 'wave' | 'ring' | 'galaxy';

export const VisualizerOverlay: React.FC<VisualizerOverlayProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  onTogglePlay,
  onPrev,
  onNext,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<VisualizerMode>('bars');
  const peaksRef = useRef<number[]>(new Array(128).fill(0));
  const starsRef = useRef<{ x: number; y: number; z: number; size: number }[]>([]);

  // Initialize stars once
  useEffect(() => {
    const stars = [];
    for (let i = 0; i < 400; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 2000,
        z: Math.random() * 1000 + 1,
        size: Math.random() * 2 + 1,
      });
    }
    starsRef.current = stars;
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle canvas resolution resizing
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const freqData = new Uint8Array(128);
    const timeData = new Uint8Array(256);

    const render = () => {
      audioEngine.getFrequencyData(freqData);
      audioEngine.getTimeDomainData(timeData);

      const width = canvas.width;
      const height = canvas.height;

      // Dark translucent backdrop clearing for motion trail effect
      ctx.fillStyle = 'rgba(7, 9, 14, 0.25)';
      ctx.fillRect(0, 0, width, height);

      // Bass energy calculation for reaction
      let bassEnergy = 0;
      for (let i = 0; i < 16; i++) {
        bassEnergy += freqData[i];
      }
      bassEnergy = bassEnergy / 16 / 255; // 0 to 1

      if (mode === 'bars') {
        // High-Resolution Frequency Spectrum Bars with Peak Falloff
        const barCount = 96;
        const barWidth = width / barCount;
        const gradient = ctx.createLinearGradient(0, height, 0, height * 0.2);
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.2)');
        gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.85)');
        gradient.addColorStop(1, 'rgba(236, 72, 153, 0.95)');

        for (let i = 0; i < barCount; i++) {
          const val = freqData[i] || 2;
          const h = (val / 255) * (height * 0.65);
          const x = i * barWidth;
          const y = height - h - 60;

          // Decay peak cap
          if (h > (peaksRef.current[i] || 0)) {
            peaksRef.current[i] = h;
          } else {
            peaksRef.current[i] = Math.max(0, (peaksRef.current[i] || 0) - 2.5);
          }

          // Main bar
          ctx.fillStyle = gradient;
          ctx.fillRect(x + 1, y, barWidth - 3, h);

          // Peak cap line
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + 1, height - peaksRef.current[i] - 63, barWidth - 3, 2);
        }
      } else if (mode === 'wave') {
        // Stereo Oscilloscope Wave
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.9)';
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
        ctx.beginPath();

        const sliceWidth = width / timeData.length;
        let x = 0;
        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      } else if (mode === 'ring') {
        // Polar Circular Equalizer Ring
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(width, height) * 0.22 + bassEnergy * 30;

        ctx.save();
        ctx.translate(centerX, centerY);

        const count = 120;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const val = freqData[i % freqData.length] || 1;
          const barLen = (val / 255) * 160;

          const x1 = Math.cos(angle) * baseRadius;
          const y1 = Math.sin(angle) * baseRadius;
          const x2 = Math.cos(angle) * (baseRadius + barLen);
          const y2 = Math.sin(angle) * (baseRadius + barLen);

          ctx.strokeStyle = `hsl(${(i / count) * 360}, 90%, 65%)`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Center Pulsing Orb
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius - 10, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${0.1 + bassEnergy * 0.3})`;
        ctx.fill();
        ctx.restore();
      } else if (mode === 'galaxy') {
        // Starfield reactive warp
        const centerX = width / 2;
        const centerY = height / 2;
        const speed = 4 + bassEnergy * 25;

        for (const star of starsRef.current) {
          star.z -= speed;
          if (star.z <= 0) {
            star.z = 1000;
            star.x = (Math.random() - 0.5) * 2000;
            star.y = (Math.random() - 0.5) * 2000;
          }

          const k = 400 / star.z;
          const px = star.x * k + centerX;
          const py = star.y * k + centerY;

          if (px >= 0 && px < width && py >= 0 && py < height) {
            const sz = star.size * k * (1 + bassEnergy * 0.8);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, 1 - star.z / 1000)})`;
            ctx.beginPath();
            ctx.arc(px, py, sz, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isOpen, mode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#07090e] flex flex-col justify-between overflow-hidden select-none animate-fadeIn">
      {/* Background Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Top Header Overlay */}
      <div className="relative z-10 p-6 flex items-center justify-between backdrop-blur-sm bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-4">
          {currentTrack && (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-14 h-14 rounded-xl object-cover shadow-2xl border border-white/20 animate-pulse"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {currentTrack?.title || 'FinAmp Visualizer'}
              </h2>
              {currentTrack && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                  {currentTrack.codec} {Math.round(currentTrack.sampleRate / 1000)}kHz
                </span>
              )}
            </div>
            <p className="text-sm text-slate-300 mt-0.5">
              {currentTrack?.artist} — {currentTrack?.album}
            </p>
          </div>
        </div>

        {/* Mode Switchers & Close */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
            <button
              onClick={() => setMode('bars')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                mode === 'bars'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Spectrum</span>
            </button>

            <button
              onClick={() => setMode('wave')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                mode === 'wave'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Oscilloscope</span>
            </button>

            <button
              onClick={() => setMode('ring')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                mode === 'ring'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Polar Ring</span>
            </button>

            <button
              onClick={() => setMode('galaxy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                mode === 'galaxy'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Orbit className="w-3.5 h-3.5" />
              <span>Galaxy Starfield</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-md"
            title="Exit Visualizer (Esc)"
            aria-label="Close visualizer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Floating Bottom Center Transport Controls */}
      <div className="relative z-10 pb-10 flex flex-col items-center">
        <div className="flex items-center gap-6 px-6 py-3 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 shadow-2xl">
          <button
            onClick={onPrev}
            aria-label="Previous track"
            className="p-2 text-slate-300 hover:text-white transition"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="w-12 h-12 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center transition shadow-lg shadow-cyan-500/40"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            aria-label="Next track"
            className="p-2 text-slate-300 hover:text-white transition"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
