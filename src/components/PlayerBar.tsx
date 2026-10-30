import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  FileText,
  ListMusic,
  Maximize2,
  Layers,
  GripVertical,
  PanelTop,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Disc,
  Expand,
  LayoutTemplate,
} from 'lucide-react';
import {
  Track,
  LayoutConfig,
  PlayerPosition,
  PlayerArrangement,
  DraggableSectionId,
} from '../types/index.ts';
import { getCornerRadiusClass, formatTimeDisplay } from '../utils/layoutMath.ts';
import { audioEngine } from '../services/audioEngine.ts';
import { resolveCoverArt, handleCoverImgError } from '../utils/jellywispArtwork.ts';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  volume: number;
  isMuted: boolean;
  lyricsOpen: boolean;
  queueOpen: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleLyrics: () => void;
  onToggleQueue: () => void;
  onToggleDsp: () => void;
  onToggleVisualizer: () => void;
  onToggleMiniPlayer: () => void;
  onOpenMetadataEditor: (track: Track) => void;
  onOpenDedicatedPlayer?: () => void;
  layoutConfig?: LayoutConfig;
  onChangePosition?: (pos: PlayerPosition) => void;
  onUpdateLayout?: (partial: Partial<LayoutConfig>) => void;
  onDragStartSection?: (section: DraggableSectionId) => void;
  onDragEndSection?: () => void;
  isLayoutEditMode?: boolean;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  isShuffle,
  repeatMode,
  volume,
  isMuted,
  lyricsOpen,
  queueOpen,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onToggleShuffle,
  onToggleRepeat,
  onVolumeChange,
  onToggleMute,
  onToggleLyrics,
  onToggleQueue,
  onToggleDsp,
  onToggleVisualizer,
  onToggleMiniPlayer,
  onOpenDedicatedPlayer,
  layoutConfig,
  onChangePosition,
  onUpdateLayout,
  onDragStartSection,
  onDragEndSection,
  isLayoutEditMode = false,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);
  const [isResizing, setIsResizing] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const effectiveTime = isSeeking ? seekVal : currentTime;
  const progressPct = duration > 0 ? (effectiveTime / duration) * 100 : 0;

  const visStyle = layoutConfig?.miniVisStyle || 'bars';
  const showVis = layoutConfig?.showMiniSpectrum !== false && visStyle !== 'off';
  const arrangement: PlayerArrangement = layoutConfig?.playerArrangement || 'standard';

  // Mini FFT spectrum canvas animation loop
  useEffect(() => {
    if (!showVis) return;
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buffer = new Uint8Array(32);

    const render = () => {
      audioEngine.getFrequencyData(buffer);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = 28;
      const barWidth = canvas.width / barCount;

      if (visStyle === 'wave') {
        ctx.beginPath();
        ctx.strokeStyle = isPlaying ? 'rgba(6, 182, 212, 0.9)' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < barCount; i++) {
          const val = isPlaying ? buffer[i] : 20;
          const y = canvas.height - (val / 255) * (canvas.height - 4) - 2;
          const x = i * barWidth;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (visStyle === 'dots') {
        for (let i = 0; i < barCount; i++) {
          const val = isPlaying ? buffer[i] : 12;
          const y = canvas.height - Math.max(3, (val / 255) * (canvas.height - 4));
          const x = i * barWidth + barWidth / 2;
          ctx.fillStyle = isPlaying ? 'rgba(6, 182, 212, 0.85)' : 'rgba(255, 255, 255, 0.2)';
          ctx.beginPath();
          ctx.arc(x, y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        for (let i = 0; i < barCount; i++) {
          const val = isPlaying ? buffer[i] : 4;
          const barHeight = Math.max(2, (val / 255) * canvas.height);
          const x = i * barWidth;
          const y = canvas.height - barHeight;
          ctx.fillStyle = isPlaying
            ? 'rgba(6, 182, 212, 0.78)'
            : 'rgba(255, 255, 255, 0.15)';
          ctx.fillRect(x, y, Math.max(1.5, barWidth - 1.5), barHeight);
        }
      }
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, showVis, visStyle, arrangement]);

  const handleDragStart = (e: React.DragEvent) => {
    if (isResizing) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', 'player');
    e.dataTransfer.effectAllowed = 'move';
    onDragStartSection?.('player');
  };

  const handleDragEnd = () => {
    onDragEndSection?.();
  };

  const pos = layoutConfig?.playerBarPosition || 'bottom';
  const isLocked = layoutConfig?.layoutLocked ?? true;
  const isSidebarPlayer = pos === 'left' || pos === 'right';
  const isFloating = pos === 'floating';
  const cornerClass = isFloating
    ? getCornerRadiusClass(layoutConfig?.cornerRadius || 'rounded')
    : '';

  const barHeight = layoutConfig?.playerBarHeight || 86;
  const sidebarPlayerWidth = layoutConfig?.playerSidebarWidth || 295;

  // Real-time Windows-style Edge Drag Resizing for Horizontal Player Dock (Bottom or Top)
  const startHorizontalResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onUpdateLayout || isLocked) return;

    setIsResizing(true);
    const startY = e.clientY;
    const startH = barHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      // If docked at bottom, pulling UP (negative deltaY) increases height
      const deltaY =
        pos === 'top' ? moveEvent.clientY - startY : startY - moveEvent.clientY;
      const nextH = Math.max(56, Math.min(220, startH + deltaY));
      onUpdateLayout({
        playerBarHeight: nextH,
        playerArtworkSizePx: Math.max(40, Math.min(140, nextH - 24)),
      });
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'row-resize';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Real-time Windows-style Edge Drag Resizing for Vertical Sidebar Player Deck (Left or Right)
  const startVerticalResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onUpdateLayout || isLocked) return;

    setIsResizing(true);
    const startX = e.clientX;
    const startW = sidebarPlayerWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX =
        pos === 'right' ? startX - moveEvent.clientX : moveEvent.clientX - startX;
      const nextW = Math.max(200, Math.min(540, startW + deltaX));
      onUpdateLayout({
        playerSidebarWidth: nextW,
        playerSidebarArtworkSizePx: Math.max(120, Math.min(320, nextW - 90)),
      });
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const artShape = layoutConfig?.artworkShape || 'rounded';
  const getArtworkClasses = (sizeClass: string) => {
    if (artShape === 'vinyl') {
      return `${sizeClass} rounded-full object-cover shadow-xl border-2 border-white/20 ${
        isPlaying ? 'animate-spin' : ''
      }`;
    }
    if (artShape === 'circle') {
      return `${sizeClass} rounded-full object-cover shadow-lg border border-white/10`;
    }
    if (artShape === 'square') {
      return `${sizeClass} rounded-none object-cover shadow-lg border border-white/10`;
    }
    return `${sizeClass} rounded-xl object-cover shadow-lg border border-white/10`;
  };

  const scrubberStyle = layoutConfig?.scrubberStyle || 'glow';
  const scrubberHeightClass =
    scrubberStyle === 'thick'
      ? 'h-2.5'
      : scrubberStyle === 'minimal'
      ? 'h-0.5'
      : 'h-1.5 group-hover:h-2';

  const timeMode = layoutConfig?.timeDisplayMode || 'elapsed-total';
  const formattedTimes = formatTimeDisplay(effectiveTime, duration, timeMode);

  // ============================================================================
  // VERTICAL SIDEBAR PLAYER DECK (pos === 'left' | 'right')
  // ============================================================================
  if (isSidebarPlayer) {
    return (
      <aside
        draggable={!isLocked && isLayoutEditMode && !isResizing}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ width: `${sidebarPlayerWidth}px` }}
        data-testid="player-dock"
        data-position={pos}
        className={`bg-[var(--fin-player)] ${
          pos === 'left' ? 'border-r' : 'border-l'
        } border-white/10 p-4 flex flex-col justify-between select-none z-30 jellywisp-player-bar shrink-0 backdrop-blur-[var(--fin-blur)] relative ${
          isLayoutEditMode ? 'ring-2 ring-cyan-400/70' : ''
        }`}
      >
        {/* Real-Time Mouse Edge Resize Handle */}
        <div
          onMouseDown={startVerticalResize}
          title="Drag edge to resize player deck width"
          className={`absolute top-0 bottom-0 w-2 z-40 cursor-col-resize hover:bg-cyan-400/60 transition-colors ${
            pos === 'right' ? 'left-0 -ml-1' : 'right-0 -mr-1'
          } ${isResizing ? 'bg-cyan-400' : ''}`}
        >
          {isResizing && (
            <span className="absolute top-1/2 -translate-y-1/2 left-3 px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-mono font-bold text-[10px] shadow-lg whitespace-nowrap">
              {Math.round(sidebarPlayerWidth)}px
            </span>
          )}
        </div>

        {/* Top Drag Handle & Quick Position Switcher */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div
            className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-cyan-300 cursor-grab active:cursor-grabbing"
            title="Drag Player Section to Top, Bottom, Left, or Right Dock"
          >
            <GripVertical className="w-3.5 h-3.5 text-cyan-400" />
            <span>Player Deck ({pos})</span>
          </div>

          {onChangePosition && (
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
              <button
                onClick={() => onChangePosition('top')}
                className="p-1 rounded text-slate-400 hover:text-white transition"
                title="Move Player to Top Bar"
              >
                <PanelTop className="w-3 h-3" />
              </button>
              <button
                onClick={() => onChangePosition('bottom')}
                className="p-1 rounded text-slate-400 hover:text-white transition"
                title="Move Player to Bottom Bar"
              >
                <PanelBottom className="w-3 h-3" />
              </button>
              <button
                onClick={() => onChangePosition('left')}
                className={`p-1 rounded transition ${
                  pos === 'left'
                    ? 'bg-[var(--fin-accent)] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Dock Player as Left Sidebar"
              >
                <PanelLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => onChangePosition('right')}
                className={`p-1 rounded transition ${
                  pos === 'right'
                    ? 'bg-[var(--fin-accent)] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Dock Player as Right Sidebar"
              >
                <PanelRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Center Artwork & Track Details (Click opens Dedicated Track Player) */}
        <div className="flex-1 flex flex-col items-center justify-center py-4 text-center overflow-y-auto">
          {currentTrack ? (
            <>
              <div
                className="relative group cursor-pointer mb-4"
                onClick={() => onOpenDedicatedPlayer?.()}
                title="Click to open Dedicated Track Player"
              >
                <img
                  src={resolveCoverArt(currentTrack.coverUrl)}
                  onError={handleCoverImgError}
                  alt={currentTrack.title}
                  style={{
                    width: `${layoutConfig?.playerSidebarArtworkSizePx ?? 184}px`,
                    height: `${layoutConfig?.playerSidebarArtworkSizePx ?? 184}px`,
                    ...(artShape === 'vinyl' ? { animationDuration: '12s' } : {}),
                  }}
                  className={getArtworkClasses('')}
                />
                {artShape === 'vinyl' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-[#0b0e17] border-2 border-white/20 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Expand className="w-6 h-6 text-white" />
                </div>
              </div>

              <div
                onClick={() => onOpenDedicatedPlayer?.()}
                className="cursor-pointer group max-w-full px-2"
                title="Click to open Dedicated Track Player"
              >
                <h3 className="text-sm font-bold jw-text-track group-hover:text-[var(--fin-accent)] truncate transition">
                  {currentTrack.title}
                </h3>
                <p className="text-xs jw-text-artist group-hover:text-white truncate mt-0.5 transition">
                  {currentTrack.artist}
                </p>
                <p className="text-[11px] jw-text-album truncate mt-0.5">
                  {currentTrack.album} ({currentTrack.year})
                </p>
              </div>

              {/* High-Res Specs Pill */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                {layoutConfig?.showAudioSpecsBadge !== false && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                    {currentTrack.codec} • {Math.round(currentTrack.sampleRate / 1000)}kHz /{' '}
                    {currentTrack.bitDepth}b
                  </span>
                )}
                {layoutConfig?.showReplayGainBadge !== false && currentTrack.replayGain && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">
                    RG {currentTrack.replayGain > 0 ? '+' : ''}
                    {Math.round(currentTrack.replayGain)}dB
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500 py-12 flex flex-col items-center gap-2">
              <Disc className="w-10 h-10 text-slate-600 animate-pulse" />
              <span>Select any track to start playback</span>
            </div>
          )}

          {/* Live Spectrum Canvas inside Sidebar Player */}
          {showVis && (
            <div className="w-full mt-4 px-2">
              <canvas
                ref={canvasRef}
                width={220}
                height={36}
                className="w-full h-9 rounded-lg bg-black/40 border border-white/10 cursor-pointer"
                onClick={onToggleVisualizer}
                title="Click to expand fullscreen 60fps audio visualizer"
              />
            </div>
          )}
        </div>

        {/* Bottom Stacked Transport, Scrubber & Utility Controls */}
        <div className="space-y-3 pt-3 border-t border-white/10">
          {/* Scrubber */}
          <div className="space-y-1">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.5"
              value={effectiveTime}
              onMouseDown={() => setIsSeeking(true)}
              onChange={(e) => setSeekVal(parseFloat(e.target.value))}
              onMouseUp={(e) => {
                setIsSeeking(false);
                onSeek(parseFloat((e.target as HTMLInputElement).value));
              }}
              className={`w-full ${scrubberHeightClass} bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)] transition-all`}
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 tabular-nums">
              <span>{formattedTimes.left}</span>
              <span>{formattedTimes.right}</span>
            </div>
          </div>

          {/* Primary Transport Buttons */}
          <div className="flex items-center justify-between px-2">
            <button
              onClick={onToggleShuffle}
              aria-label="Toggle shuffle"
              className={`p-1.5 rounded-full transition ${
                isShuffle
                  ? 'text-[var(--fin-accent)] bg-white/10'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Shuffle (S)"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={onPrev}
              aria-label="Previous track"
              className="p-2 text-slate-200 hover:text-white rounded-full transition"
              title="Previous (P)"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              style={{
                width: `${Math.max(36, (layoutConfig?.transportButtonSizePx ?? 40) + 4)}px`,
                height: `${Math.max(36, (layoutConfig?.transportButtonSizePx ?? 40) + 4)}px`,
              }}
              className="rounded-full bg-[var(--fin-accent)] hover:opacity-90 active:scale-95 text-slate-950 flex items-center justify-center transition shadow-lg shadow-cyan-500/25"
              title="Play / Pause (Space)"
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
              className="p-2 text-slate-200 hover:text-white rounded-full transition"
              title="Next (N)"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={onToggleRepeat}
              aria-label="Cycle repeat mode"
              className={`p-1.5 rounded-full transition ${
                repeatMode !== 'off'
                  ? 'text-[var(--fin-accent)] bg-white/10'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={`Repeat: ${repeatMode} (R)`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Volume Slider Row */}
          <div className="flex items-center gap-2 bg-black/25 px-3 py-2 rounded-xl border border-white/5">
            <button
              onClick={onToggleMute}
              aria-label="Mute or unmute volume"
              className="text-slate-400 hover:text-white transition"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
            />
            <span className="text-[10px] font-mono text-slate-400 w-8 text-right tabular-nums">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>

          {/* Bottom Deck Utilities */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              onClick={onToggleDsp}
              className="flex flex-col items-center justify-center py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 transition text-[10px] font-medium gap-1"
              title="10-Band Parametric Equalizer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>DSP</span>
            </button>
            <button
              onClick={onToggleLyrics}
              className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition text-[10px] font-medium gap-1 ${
                lyricsOpen
                  ? 'bg-[var(--fin-accent)]/20 text-[var(--fin-accent)] border border-[var(--fin-accent)]/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
              title="Synced Lyrics"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Lyrics</span>
            </button>
            <button
              onClick={onToggleQueue}
              className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition text-[10px] font-medium gap-1 ${
                queueOpen
                  ? 'bg-[var(--fin-accent)]/20 text-[var(--fin-accent)] border border-[var(--fin-accent)]/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
              title="Play Queue"
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Queue</span>
            </button>
            <button
              onClick={() => onOpenDedicatedPlayer?.()}
              className="flex flex-col items-center justify-center py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 transition text-[10px] font-medium gap-1"
              title="Open Dedicated Track Player"
            >
              <Expand className="w-3.5 h-3.5" />
              <span>Player</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // ============================================================================
  // HORIZONTAL PLAYER BAR (pos === 'bottom' | 'top' | 'floating' | 'compact')
  // ============================================================================
  const dynamicArtworkSize = Math.min(
    barHeight - 16,
    layoutConfig?.playerArtworkSizePx ?? Math.max(48, barHeight - 28)
  );

  return (
    <footer
      draggable={!isLocked && isLayoutEditMode && !isResizing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{ height: `${barHeight}px` }}
      data-testid="player-dock"
      data-position={pos}
      className={`w-full max-w-full overflow-hidden bg-[var(--fin-player)] px-2 sm:px-4 flex items-center justify-between select-none z-30 jellywisp-player-bar shrink-0 relative backdrop-blur-[var(--fin-blur)] ${
        isFloating
          ? `m-2 sm:m-3 border border-white/15 shadow-2xl ${cornerClass}`
          : pos === 'top'
          ? 'border-b border-white/10'
          : 'border-t border-white/10'
      } ${isLayoutEditMode ? 'ring-2 ring-cyan-400/70' : ''}`}
    >
      {/* Real-time Windows-style Edge Drag Resize Handle (Pull dock up/down, only when unlocked) */}
      {!isLocked && (
        <div
          onMouseDown={startHorizontalResize}
          title="Drag edge up or down to resize player dock height"
          className={`absolute left-0 right-0 h-2.5 z-40 cursor-row-resize hover:bg-cyan-400/60 transition-colors ${
            pos === 'top' ? 'bottom-0 -mb-1' : 'top-0 -mt-1'
          } ${isResizing ? 'bg-cyan-400' : ''}`}
        >
          {isResizing && (
            <span className="absolute left-1/2 -translate-x-1/2 -top-6 px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-mono font-bold text-[10px] shadow-lg whitespace-nowrap">
              Height: {Math.round(barHeight)}px
            </span>
          )}
        </div>
      )}

      {/* Full-width top interactive scrubber when arrangement === 'waveform-deck' or 'minimal' */}
      {(arrangement === 'waveform-deck' || arrangement === 'minimal') ? (
        <div className="absolute top-0 left-0 right-0 h-2 bg-white/10 group cursor-pointer z-30">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-[var(--fin-accent)] to-indigo-500 pointer-events-none"
            style={{ width: `${progressPct}%` }}
          />
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.5"
            value={effectiveTime}
            draggable={false}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsSeeking(true);
            }}
            onChange={(e) => {
              e.stopPropagation();
              const val = parseFloat(e.target.value);
              setSeekVal(val);
              onSeek(val);
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              setIsSeeking(false);
              onSeek(parseFloat((e.target as HTMLInputElement).value));
            }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      ) : (
        <div
          className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--fin-accent)] to-transparent transition-all duration-300 pointer-events-none"
          style={{ width: `${progressPct}%` }}
        />
      )}

      {/* Left: Drag Handle + Clickable Track Information & Album Art (Opens Dedicated Track Player) */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[190px] sm:max-w-[240px] md:max-w-[320px] lg:max-w-[380px] shrink flex-1">
        {!isLocked && (
          <div
            className="hidden sm:block cursor-grab active:cursor-grabbing text-slate-500 hover:text-cyan-400 p-1 rounded hover:bg-white/5 transition shrink-0"
            title="Drag Player Bar to Top, Bottom, Left Sidebar, or Right Sidebar!"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        )}

        {currentTrack ? (
          <div
            onClick={() => onOpenDedicatedPlayer?.()}
            className="flex items-center gap-2 sm:gap-3 min-w-0 cursor-pointer group flex-1 overflow-hidden"
            title="Click Cover Art, Title, or Artist to open Dedicated Track Player"
          >
            <div className="relative shrink-0">
              <img
                src={resolveCoverArt(currentTrack.coverUrl)}
                onError={handleCoverImgError}
                alt={currentTrack.title}
                style={{
                  width: `${Math.max(34, Math.min(dynamicArtworkSize, 64))}px`,
                  height: `${Math.max(34, Math.min(dynamicArtworkSize, 64))}px`,
                  ...(artShape === 'vinyl' ? { animationDuration: '10s' } : {}),
                }}
                className={getArtworkClasses('')}
              />
              <div className="absolute inset-0 bg-black/45 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Expand className="w-3.5 h-3.5 text-cyan-300" />
              </div>
            </div>

            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-xs sm:text-sm font-bold jw-text-track group-hover:text-[var(--fin-accent)] truncate transition">
                  {currentTrack.title}
                </p>
                {layoutConfig?.showAudioSpecsBadge !== false && (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 shrink-0 font-medium hidden sm:inline-block">
                    {currentTrack.codec}
                  </span>
                )}
              </div>

              <p className="text-[10px] sm:text-[11px] jw-text-artist group-hover:text-white truncate mt-0.5 transition">
                {currentTrack.artist}
              </p>

              {barHeight >= 76 && (
                <div className="hidden md:flex items-center gap-2 mt-1 truncate">
                  {layoutConfig?.showAudioSpecsBadge !== false && (
                    <span className="text-[9px] font-mono text-slate-500 tabular-nums shrink-0">
                      {Math.round(currentTrack.sampleRate / 1000)}kHz / {currentTrack.bitDepth}b
                    </span>
                  )}
                  {layoutConfig?.showReplayGainBadge !== false && currentTrack.replayGain && (
                    <span className="text-[9px] font-mono text-emerald-400/80 tabular-nums shrink-0">
                      RG: {currentTrack.replayGain > 0 ? '+' : ''}
                      {Math.round(currentTrack.replayGain)}dB
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-medium truncate">
            No track selected. Click any song to play.
          </div>
        )}
      </div>

      {/* Center: Playback Controls & Scrubber (adapts fluidly to screen width) */}
      <div
        className={`flex ${
          arrangement === 'split'
            ? 'flex-row items-center gap-3 sm:gap-6 max-w-2xl'
            : arrangement === 'centered'
            ? 'flex-col-reverse items-center max-w-xl'
            : 'flex-col items-center max-w-xl'
        } min-w-0 flex-1 px-1 sm:px-4 mx-1 sm:mx-2 shrink`}
      >
        <div className="flex items-center gap-1.5 sm:gap-4 mb-0.5 sm:mb-1 shrink-0">
          <button
            onClick={onToggleShuffle}
            aria-label="Toggle shuffle"
            className={`p-1 sm:p-1.5 rounded-full transition ${
              isShuffle
                ? 'text-[var(--fin-accent)] bg-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Shuffle (Key: S)"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onPrev}
            aria-label="Previous track"
            className="p-1 sm:p-1.5 text-slate-300 hover:text-white rounded-full transition"
            title="Previous (Key: P)"
          >
            <SkipBack className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-current" />
          </button>

          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{
              width: `${Math.max(34, (layoutConfig?.transportButtonSizePx ?? 40))}px`,
              height: `${Math.max(34, (layoutConfig?.transportButtonSizePx ?? 40))}px`,
            }}
            className="rounded-full bg-[var(--fin-accent)] hover:opacity-90 active:scale-95 text-slate-950 flex items-center justify-center transition shadow-md shadow-cyan-500/20 shrink-0"
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            aria-label="Next track"
            className="p-1 sm:p-1.5 text-slate-300 hover:text-white rounded-full transition"
            title="Next (Key: N)"
          >
            <SkipForward className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-current" />
          </button>

          <button
            onClick={onToggleRepeat}
            aria-label="Cycle repeat mode"
            className={`p-1 sm:p-1.5 rounded-full transition ${
              repeatMode !== 'off'
                ? 'text-[var(--fin-accent)] bg-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={`Repeat: ${repeatMode} (Key: R)`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-3.5 h-3.5" />
            ) : (
              <Repeat className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Scrubber & Time */}
        {arrangement !== 'minimal' && (
          <div className="w-full flex items-center gap-1.5 sm:gap-3 min-w-0">
            <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 w-8 sm:w-10 text-right tabular-nums shrink-0">
              {formattedTimes.left}
            </span>

            <div className="relative flex-1 min-w-[50px] group flex items-center">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.5"
                value={effectiveTime}
                draggable={false}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsSeeking(true);
                }}
                onChange={(e) => {
                  e.stopPropagation();
                  const val = parseFloat(e.target.value);
                  setSeekVal(val);
                  onSeek(val);
                }}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  setIsSeeking(false);
                  onSeek(parseFloat((e.target as HTMLInputElement).value));
                }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full ${scrubberHeightClass} bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)] transition-all`}
              />
            </div>

            <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 w-8 sm:w-10 text-left tabular-nums shrink-0">
              {formattedTimes.right}
            </span>
          </div>
        )}
      </div>

      {/* Right: Audio Engine, Player UI Style Switcher & Flyouts (dynamically adapts) */}
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink-0 justify-end relative">
        {/* Live Mini Spectrum Visualizer Canvas (visible on wide screens) */}
        {showVis && (
          <canvas
            ref={canvasRef}
            width={arrangement === 'waveform-deck' ? 100 : 54}
            height={22}
            className="rounded bg-black/30 border border-white/5 hidden 2xl:block cursor-pointer"
            onClick={onToggleVisualizer}
            title="Click to expand fullscreen audio visualizer"
          />
        )}

        {/* Volume Control */}
        <div className="flex items-center gap-1 group">
          <button
            onClick={onToggleMute}
            aria-label="Mute or unmute volume"
            className="p-1 text-slate-400 hover:text-slate-200 transition"
            title="Mute / Unmute (Key: M)"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            draggable={false}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onVolumeChange(parseFloat(e.target.value));
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-12 sm:w-16 md:w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)] group-hover:w-20 sm:group-hover:w-24 transition-all"
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
        </div>

        {/* Quick Player UI Style & Dock Switcher Popover */}
        {onUpdateLayout && (
          <div className="relative">
            <button
              onClick={() => setShowLayoutMenu((v) => !v)}
              className={`p-1 sm:p-1.5 rounded-md transition ${
                showLayoutMenu
                  ? 'bg-[var(--fin-accent)] text-slate-950'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-white/5'
              }`}
              title="Player UI Styles & Dock Position"
            >
              <LayoutTemplate className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>

            {showLayoutMenu && (
              <div className="absolute right-0 bottom-12 w-64 rounded-2xl bg-[#0c1120] border border-cyan-500/40 shadow-2xl p-3.5 z-50 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    Player UI Style & Dock
                  </span>
                  <button
                    onClick={() => setShowLayoutMenu(false)}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    Done
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    Player Arrangement
                  </span>
                  {(
                    [
                      { id: 'standard', label: 'Standard 3-Column' },
                      { id: 'centered', label: 'Scrubber Above Transport' },
                      { id: 'split', label: 'Inline Split Console' },
                      { id: 'waveform-deck', label: 'Top-Edge Scrubber + Wide FFT' },
                      { id: 'minimal', label: 'Minimalist Compact Bar' },
                    ] as { id: PlayerArrangement; label: string }[]
                  ).map((arr) => (
                    <button
                      key={arr.id}
                      onClick={() => onUpdateLayout({ playerArrangement: arr.id })}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition ${
                        arrangement === arr.id
                          ? 'bg-[var(--fin-accent)] text-slate-950 font-bold'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      {arr.label}
                    </button>
                  ))}
                </div>

                {onChangePosition && (
                  <div className="space-y-1 pt-2 border-t border-white/10">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Dock Position
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {(
                        [
                          { id: 'bottom', label: 'Bottom' },
                          { id: 'top', label: 'Top' },
                          { id: 'left', label: 'Left' },
                          { id: 'right', label: 'Right' },
                        ] as { id: PlayerPosition; label: string }[]
                      ).map((d) => (
                        <button
                          key={d.id}
                          onClick={() => {
                            onChangePosition(d.id);
                            setShowLayoutMenu(false);
                          }}
                          className={`py-1 rounded text-[10px] font-mono font-bold border ${
                            pos === d.id
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Open Dedicated Track Player Button */}
        {currentTrack && onOpenDedicatedPlayer && (
          <button
            onClick={onOpenDedicatedPlayer}
            className="p-1 sm:p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-white/5 rounded-md transition"
            title="Open Dedicated Track Player"
            aria-label="Open Dedicated Track Player"
          >
            <Expand className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </button>
        )}

        {/* 10-Band EQ Quick Toggle */}
        <button
          onClick={onToggleDsp}
          className="p-1 sm:p-1.5 text-slate-400 hover:text-[var(--fin-accent)] hover:bg-white/5 rounded-md transition hidden sm:inline-flex"
          title="Equalizer & DSP (Key: E)"
          aria-label="DSP Equalizer"
        >
          <SlidersHorizontal className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>

        {/* Synced Lyrics Toggle */}
        <button
          onClick={onToggleLyrics}
          className={`p-1 sm:p-1.5 rounded-md transition ${
            lyricsOpen
              ? 'text-[var(--fin-accent)] bg-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Synced Lyrics (Key: L)"
          aria-label="Lyrics panel"
        >
          <FileText className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>

        {/* Play Queue Toggle */}
        <button
          onClick={onToggleQueue}
          className={`p-1 sm:p-1.5 rounded-md transition ${
            queueOpen
              ? 'text-[var(--fin-accent)] bg-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Up Next Queue"
          aria-label="Play queue"
        >
          <ListMusic className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>

        {/* Mini Player Toggle */}
        <button
          onClick={onToggleMiniPlayer}
          className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-md transition hidden md:inline-flex"
          title="Toggle Mini-Player (Key: D)"
          aria-label="Mini player"
        >
          <Layers className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>

        {/* Immersive Visualizer Fullscreen */}
        <button
          onClick={onToggleVisualizer}
          className="p-1 sm:p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-md transition"
          title="Immersive Visualizer (Key: F)"
          aria-label="Fullscreen visualizer"
        >
          <Maximize2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>
      </div>
    </footer>
  );
};
