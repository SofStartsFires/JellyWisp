import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  BarChart2,
  Radio,
  Activity,
  Orbit,
  Eye,
  Sliders,
  Sparkles,
} from 'lucide-react';
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

type VisualizerMode = 'bars' | 'wave' | 'ring' | 'galaxy' | 'ambient';

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
  const [intensity, setIntensity] = useState<number>(1.0);
  const [eyeComfort, setEyeComfort] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(true);

  const peaksRef = useRef<number[]>(new Array(128).fill(0));
  const starsRef = useRef<{ x: number; y: number; z: number; size: number }[]>([]);
  const prevTimeDataRef = useRef<number[]>(new Array(256).fill(128));

  // Initialize starfield coordinates once
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

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const freqData = new Uint8Array(128);
    const rawTimeData = new Uint8Array(256);

    const render = () => {
      audioEngine.getFrequencyData(freqData);
      audioEngine.getTimeDomainData(rawTimeData);

      const width = canvas.width;
      const height = canvas.height;

      // Dark translucent backdrop clearing with eye-comfort damping
      ctx.fillStyle = eyeComfort ? 'rgba(7, 9, 14, 0.35)' : 'rgba(7, 9, 14, 0.22)';
      ctx.fillRect(0, 0, width, height);

      // Bass energy calculation scaled by intensity
      let bassEnergy = 0;
      for (let i = 0; i < 16; i++) {
        bassEnergy += freqData[i];
      }
      bassEnergy = (bassEnergy / 16 / 255) * intensity;

      if (mode === 'bars') {
        // High-Resolution Frequency Spectrum Bars with Peak Falloff
        const barCount = eyeComfort ? 64 : 96;
        const barWidth = width / barCount;
        const gradient = ctx.createLinearGradient(0, height, 0, height * 0.25);
        if (eyeComfort) {
          gradient.addColorStop(0, 'rgba(6, 182, 212, 0.2)');
          gradient.addColorStop(0.6, 'rgba(6, 182, 212, 0.75)');
          gradient.addColorStop(1, 'rgba(129, 140, 248, 0.85)');
        } else {
          gradient.addColorStop(0, 'rgba(6, 182, 212, 0.2)');
          gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.85)');
          gradient.addColorStop(1, 'rgba(236, 72, 153, 0.95)');
        }

        for (let i = 0; i < barCount; i++) {
          const rawVal = freqData[i] || 2;
          const scaledVal = Math.min(255, rawVal * intensity);
          const maxBarHeight = height * (eyeComfort ? 0.55 : 0.68);
          const h = (scaledVal / 255) * maxBarHeight;
          const x = i * barWidth;
          const y = height - h - 70;

          // Peak falloff
          if (h > (peaksRef.current[i] || 0)) {
            peaksRef.current[i] = h;
          } else {
            peaksRef.current[i] = Math.max(0, (peaksRef.current[i] || 0) - (eyeComfort ? 1.5 : 2.5));
          }

          // Main bar
          ctx.fillStyle = gradient;
          ctx.fillRect(x + 1.5, y, barWidth - 3, h);

          // Peak indicator
          ctx.fillStyle = eyeComfort ? 'rgba(255, 255, 255, 0.65)' : '#ffffff';
          ctx.fillRect(x + 1.5, height - peaksRef.current[i] - 73, barWidth - 3, 2);
        }
      } else if (mode === 'wave') {
        // Anti-glare Eye-Comfort Oscilloscope
        const smoothed = new Float32Array(rawTimeData.length);
        const filterFactor = eyeComfort ? 0.35 : 0.75;

        for (let i = 0; i < rawTimeData.length; i++) {
          const raw = rawTimeData[i];
          const prev = prevTimeDataRef.current[i] || 128;
          smoothed[i] = prev + (raw - prev) * filterFactor;
          prevTimeDataRef.current[i] = smoothed[i];
        }

        ctx.lineWidth = eyeComfort ? 2.5 : 3.5;
        ctx.strokeStyle = eyeComfort ? 'rgba(56, 189, 248, 0.85)' : 'rgba(6, 182, 212, 0.95)';
        if (!eyeComfort) {
          ctx.shadowBlur = 14;
          ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
        } else {
          ctx.shadowBlur = 6;
          ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
        }
        ctx.beginPath();

        const sliceWidth = width / smoothed.length;
        let x = 0;
        const centerY = height / 2;

        for (let i = 0; i < smoothed.length; i++) {
          const delta = (smoothed[i] - 128) * intensity;
          const clampedDelta = eyeComfort
            ? Math.max(-height * 0.3, Math.min(height * 0.3, delta * (height / 256)))
            : delta * (height / 256);
          const y = centerY + clampedDelta;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (mode === 'ring') {
        // Polar Circular Equalizer Ring
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(width, height) * 0.22 + bassEnergy * 25;

        ctx.save();
        ctx.translate(centerX, centerY);

        const count = eyeComfort ? 90 : 120;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const val = (freqData[i % freqData.length] || 1) * intensity;
          const barLen = Math.min(180, (val / 255) * 160);

          const x1 = Math.cos(angle) * baseRadius;
          const y1 = Math.sin(angle) * baseRadius;
          const x2 = Math.cos(angle) * (baseRadius + barLen);
          const y2 = Math.sin(angle) * (baseRadius + barLen);

          ctx.strokeStyle = eyeComfort
            ? `hsl(${(i / count) * 260 + 160}, 75%, 65%)`
            : `hsl(${(i / count) * 360}, 90%, 65%)`;
          ctx.lineWidth = eyeComfort ? 2.0 : 2.5;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Center Pulsing Orb
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(10, baseRadius - 10), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${0.08 + bassEnergy * 0.25})`;
        ctx.fill();
        ctx.restore();
      } else if (mode === 'galaxy') {
        // Starfield Reactive Warp
        const centerX = width / 2;
        const centerY = height / 2;
        const speed = (3 + bassEnergy * 20) * (eyeComfort ? 0.7 : 1.0);

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
            const sz = star.size * k * (1 + bassEnergy * 0.6);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(
              1,
              (1 - star.z / 1000) * (eyeComfort ? 0.75 : 1)
            )})`;
            ctx.beginPath();
            ctx.arc(px, py, sz, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (mode === 'ambient') {
        // Calm Ambient Ribbon Wave
        const t = performance.now() / 1000;
        const count = 3;
        for (let waveIdx = 0; waveIdx < count; waveIdx++) {
          ctx.beginPath();
          const alpha = 0.25 - waveIdx * 0.06;
          ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
          ctx.moveTo(0, height);

          const step = 20;
          for (let x = 0; x <= width; x += step) {
            const normX = x / width;
            const freqVal = freqData[Math.floor(normX * 32)] || 10;
            const y =
              height * 0.55 +
              Math.sin(normX * 8 + t * (1.2 + waveIdx * 0.4)) * (35 + bassEnergy * 40) +
              Math.cos(normX * 14 - t * 0.8) * 18 -
              (freqVal / 255) * 60 * intensity;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(width, height);
          ctx.closePath();
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isOpen, mode, intensity, eyeComfort]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#07090e] flex flex-col justify-between overflow-hidden select-none animate-fadeIn">
      {/* Background Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Top Header Overlay */}
      <div className="relative z-10 p-6 flex items-center justify-between backdrop-blur-sm bg-gradient-to-b from-black/70 to-transparent">
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
                {currentTrack?.title || 'Jellywisp Visualizer'}
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

        {/* Style Switchers, Intensity, Eye Comfort & Close */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Mode Switchers */}
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
              <span>Galaxy</span>
            </button>

            <button
              onClick={() => setMode('ambient')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                mode === 'ambient'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ambient</span>
            </button>
          </div>

          {/* Eye-Comfort Damping Toggle */}
          <button
            onClick={() => setEyeComfort((v) => !v)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition backdrop-blur-md ${
              eyeComfort
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-white/10 text-slate-300 border-white/10 hover:text-white'
            }`}
            title="Eye-Comfort mode dampens harsh spikes, reduces glare, and smooths oscilloscope curves"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Eye Comfort: {eyeComfort ? 'ON' : 'OFF'}</span>
          </button>

          {/* Intensity Slider Toggle */}
          <button
            onClick={() => setShowControls((v) => !v)}
            className={`p-2 rounded-xl border text-xs font-medium transition backdrop-blur-md ${
              showControls
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-white/10 text-slate-300 border-white/10 hover:text-white'
            }`}
            title="Adjust visualizer intensity"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Close */}
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

      {/* Floating Intensity Drawer if toggled */}
      {showControls && (
        <div className="absolute top-24 right-6 z-20 bg-black/80 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-fadeIn text-xs text-white">
          <span className="text-slate-400 font-mono">Intensity:</span>
          <input
            type="range"
            min="0.2"
            max="2.5"
            step="0.1"
            value={intensity}
            onChange={(e) => setIntensity(parseFloat(e.target.value))}
            className="w-32 h-1.5 bg-white/20 rounded accent-cyan-400 cursor-pointer"
          />
          <span className="font-mono font-bold text-cyan-300 w-10 text-right">
            {intensity.toFixed(1)}x
          </span>
        </div>
      )}

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
            aria-label={isPlaying ? 'Pause' : 'Play'}
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
