import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  ExternalLink,
  Volume2,
  VolumeX,
  Pin,
  Minimize2,
} from 'lucide-react';
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
  onSeek?: (sec: number) => void;
  onVolumeChange?: (vol: number) => void;
  onToggleMute?: () => void;
  isMuted?: boolean;
  volume?: number;
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
  onSeek,
  onVolumeChange,
  onToggleMute,
  isMuted = false,
  volume = 0.85,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    // Default to bottom right
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    return { x: Math.max(20, w - 380), y: Math.max(20, h - 230) };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });
  const [isPinned, setIsPinned] = useState(true);
  const [pipActive, setPipActive] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);

  // Real-time audio waveform canvas
  useEffect(() => {
    if (!isOpen || pipActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const buffer = new Uint8Array(24);

    const render = () => {
      audioEngine.getFrequencyData(buffer);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / 24;
      for (let i = 0; i < 24; i++) {
        const val = isPlaying ? buffer[i] : 6;
        const h = Math.max(2, (val / 255) * canvas.height);
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0.95)');
        ctx.fillStyle = grad;
        ctx.fillRect(i * barWidth, canvas.height - h, barWidth - 1, h);
      }
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, isPlaying, pipActive]);

  // Request Document Picture-in-Picture window (true detached OS floating window)
  const handleRequestPip = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // Check Document Picture-in-Picture API
    if ('documentPictureInPicture' in window) {
      try {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 360,
          height: 190,
        });

        pipWindowRef.current = pipWindow;
        setPipActive(true);

        // Copy styles to PIP window
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
        styles.forEach((s) => {
          pipWindow.document.head.appendChild(s.cloneNode(true));
        });

        pipWindow.document.body.style.margin = '0';
        pipWindow.document.body.style.background = '#090d16';
        pipWindow.document.body.style.fontFamily = 'var(--jw-font-sans, system-ui, sans-serif)';
        pipWindow.document.body.style.color = '#f8fafc';
        pipWindow.document.body.style.overflow = 'hidden';

        const updatePipDom = () => {
          if (!pipWindow || pipWindow.closed) {
            setPipActive(false);
            return;
          }

          const trackTitle = currentTrack?.title || 'No Track Selected';
          const trackArtist = currentTrack?.artist || 'Jellywisp';
          const coverUrl = currentTrack?.coverUrl || '';
          const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
          const playIcon = isPlaying ? '⏸' : '▶';

          pipWindow.document.body.innerHTML = `
            <div style="display:flex; flex-direction:column; justify-content:space-between; height:100%; padding:14px; box-sizing:border-box; background:#090d16; user-select:none;">
              <div style="display:flex; align-items:center; gap:12px;">
                <img src="${coverUrl}" style="width:52px; height:52px; border-radius:10px; object-fit:cover; border:1px solid rgba(255,255,255,0.12);" />
                <div style="min-width:0; flex:1;">
                  <div style="font-size:13px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${trackTitle}</div>
                  <div style="font-size:11px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">${trackArtist}</div>
                </div>
              </div>
              <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden; margin:10px 0;">
                <div style="width:${pct}%; height:100%; background:#06b6d4; border-radius:2px;"></div>
              </div>
              <div style="display:flex; align-items:center; justify-content:center; gap:18px;">
                <button id="pip-prev" style="background:none; border:none; color:#cbd5e1; font-size:16px; cursor:pointer; padding:6px;">⏮</button>
                <button id="pip-play" style="background:#06b6d4; border:none; color:#030712; font-size:16px; font-weight:bold; width:34px; height:34px; border-radius:17px; cursor:pointer; display:flex; align-items:center; justify-content:center;">${playIcon}</button>
                <button id="pip-next" style="background:none; border:none; color:#cbd5e1; font-size:16px; cursor:pointer; padding:6px;">⏭</button>
              </div>
            </div>
          `;

          pipWindow.document.getElementById('pip-prev')?.addEventListener('click', () => onPrev());
          pipWindow.document.getElementById('pip-play')?.addEventListener('click', () => onTogglePlay());
          pipWindow.document.getElementById('pip-next')?.addEventListener('click', () => onNext());
        };

        updatePipDom();

        pipWindow.addEventListener('pagehide', () => {
          setPipActive(false);
          pipWindowRef.current = null;
        });
      } catch (err) {
        console.warn('Document PiP could not be opened, using active detached overlay:', err);
      }
    }
  }, [currentTrack, duration, currentTime, isPlaying, onPrev, onTogglePlay, onNext]);

  // Sync state to PiP window if active
  useEffect(() => {
    if (pipActive && pipWindowRef.current && !pipWindowRef.current.closed) {
      const pip = pipWindowRef.current;
      const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
      const playIcon = isPlaying ? '⏸' : '▶';

      const playBtn = pip.document.getElementById('pip-play');
      if (playBtn) playBtn.textContent = playIcon;

      const progress = pip.document.querySelector('div[style*="background:#06b6d4"]') as HTMLElement;
      if (progress) progress.style.width = `${pct}%`;
    }
  }, [currentTime, duration, isPlaying, pipActive]);

  // Floating draggable mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input')) return;
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      const newX = Math.max(10, Math.min(window.innerWidth - 360, dragStartRef.current.startX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 200, dragStartRef.current.startY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen || !currentTrack) return null;
  if (pipActive) return null;

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
      className={`fixed z-50 w-84 bg-[#090d16]/95 border border-cyan-500/30 rounded-2xl shadow-2xl p-4 backdrop-blur-2xl select-none flex flex-col gap-3 transition-shadow ${
        isDragging ? 'cursor-grabbing shadow-cyan-500/20' : 'cursor-grab'
      }`}
    >
      {/* Detached Top Bar */}
      <div className="flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-mono tracking-wider text-cyan-300 font-bold uppercase">
            Detached Miniplayer
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPinned((v) => !v)}
            className={`p-1 rounded hover:text-white transition ${
              isPinned ? 'text-cyan-400' : 'text-slate-500'
            }`}
            title={isPinned ? 'Window Pinned' : 'Pin to foreground'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          {'documentPictureInPicture' in window && (
            <button
              onClick={handleRequestPip}
              className="p-1 rounded text-slate-400 hover:text-cyan-300 transition"
              title="Pop out to native OS Picture-in-Picture window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-rose-400 transition"
            title="Close Mini-Player"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Track Details & Visualizer */}
      <div className="flex items-center gap-3">
        <img
          src={currentTrack.coverUrl}
          alt={currentTrack.title}
          className="w-14 h-14 rounded-xl object-cover shadow border border-white/10 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate" title={currentTrack.title}>
            {currentTrack.title}
          </p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5" title={currentTrack.artist}>
            {currentTrack.artist}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] font-mono text-cyan-400 px-1 py-0.2 bg-cyan-950/60 rounded border border-cyan-500/20">
              {currentTrack.codec} {Math.round(currentTrack.sampleRate / 1000)}k
            </span>
            <canvas ref={canvasRef} width={64} height={12} className="rounded" />
          </div>
        </div>
      </div>

      {/* Interactive Active Seekbar */}
      <div className="space-y-1">
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            if (onSeek) onSeek(clickPos * duration);
            else audioEngine.seek(clickPos * duration);
          }}
          className="w-full h-1.5 bg-white/10 hover:bg-white/20 rounded-full overflow-hidden cursor-pointer relative group"
        >
          <div
            className="h-full bg-cyan-400 rounded-full transition-all group-hover:bg-cyan-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-slate-400">
          <span>
            {Math.floor(currentTime / 60)}:
            {Math.floor(currentTime % 60).toString().padStart(2, '0')}
          </span>
          <span>
            {Math.floor(duration / 60)}:
            {Math.floor(duration % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Active Playback Transport Controls */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-1">
          {onToggleMute && (
            <button
              onClick={onToggleMute}
              className="p-1 text-slate-400 hover:text-white transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {onVolumeChange && (
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-14 h-1 bg-white/20 rounded accent-cyan-400 cursor-pointer"
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onPrev}
            aria-label="Previous track"
            className="p-1.5 text-slate-300 hover:text-white transition hover:scale-105 active:scale-95"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-8 h-8 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/30 transition hover:scale-105 active:scale-95"
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
            className="p-1.5 text-slate-300 hover:text-white transition hover:scale-105 active:scale-95"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white transition"
          title="Restore full window"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
