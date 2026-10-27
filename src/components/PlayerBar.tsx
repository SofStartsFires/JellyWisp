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
  Info,
  Layers,
  GripVertical,
  PanelTop,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Disc,
} from 'lucide-react';
import {
  Track,
  LayoutConfig,
  PlayerPosition,
  DraggableSectionId,
} from '../types/index.ts';
import { getCornerRadiusClass, formatTimeDisplay } from '../utils/layoutMath.ts';
import { audioEngine } from '../services/audioEngine.ts';

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
  layoutConfig?: LayoutConfig;
  onChangePosition?: (pos: PlayerPosition) => void;
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
  onOpenMetadataEditor,
  layoutConfig,
  onChangePosition,
  onDragStartSection,
  onDragEndSection,
  isLayoutEditMode = false,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const effectiveTime = isSeeking ? seekVal : currentTime;
  const progressPct = duration > 0 ? (effectiveTime / duration) * 100 : 0;

  const visStyle = layoutConfig?.miniVisStyle || 'bars';
  const showVis = layoutConfig?.showMiniSpectrum !== false && visStyle !== 'off';

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
  }, [isPlaying, showVis, visStyle]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', 'player');
    e.dataTransfer.effectAllowed = 'move';
    onDragStartSection?.('player');
  };

  const handleDragEnd = () => {
    onDragEndSection?.();
  };

  const pos = layoutConfig?.playerBarPosition || 'bottom';
  const isSidebarPlayer = pos === 'left' || pos === 'right';
  const isFloating = pos === 'floating';
  const cornerClass = isFloating
    ? getCornerRadiusClass(layoutConfig?.cornerRadius || 'rounded')
    : '';

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
    const widthPx = layoutConfig?.playerSidebarWidth || 290;
    return (
      <aside
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ width: `${widthPx}px` }}
        data-testid="player-dock"
        data-position={pos}
        className={`bg-[var(--fin-player)] ${
          pos === 'left' ? 'border-r' : 'border-l'
        } border-white/10 p-4 flex flex-col justify-between select-none z-30 finamp-player-bar shrink-0 backdrop-blur-[var(--fin-blur)] transition-all duration-200 ${
          isLayoutEditMode ? 'ring-2 ring-cyan-400/70' : ''
        }`}
      >
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
                  pos === 'left' ? 'bg-[var(--fin-accent)] text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Dock Player as Left Sidebar"
              >
                <PanelLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => onChangePosition('right')}
                className={`p-1 rounded transition ${
                  pos === 'right' ? 'bg-[var(--fin-accent)] text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Dock Player as Right Sidebar"
              >
                <PanelRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Center Studio Artwork & Track Details */}
        <div className="flex-1 flex flex-col items-center justify-center py-4 text-center overflow-y-auto">
          {currentTrack ? (
            <>
              <div
                className="relative group cursor-pointer mb-4"
                onClick={() => onOpenMetadataEditor(currentTrack)}
                title="Click to inspect/edit track metadata"
              >
                <img
                  src={currentTrack.coverUrl}
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
                  <Info className="w-6 h-6 text-white" />
                </div>
              </div>

              <h3 className="text-sm font-bold text-white truncate max-w-full px-2">
                {currentTrack.title}
              </h3>
              <p className="text-xs text-slate-300 truncate max-w-full mt-0.5">
                {currentTrack.artist}
              </p>
              <p className="text-[11px] text-slate-500 truncate max-w-full mt-0.5">
                {currentTrack.album} ({currentTrack.year})
              </p>

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
                    {currentTrack.replayGain}dB
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
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
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
            <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>

          {/* Bottom Deck Utilities (DSP, Lyrics, Queue, Visualizer) */}
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
              onClick={onToggleVisualizer}
              className="flex flex-col items-center justify-center py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 transition text-[10px] font-medium gap-1"
              title="Fullscreen Visualizer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Vis</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // ============================================================================
  // HORIZONTAL PLAYER BAR (pos === 'bottom' | 'top' | 'floating' | 'compact')
  // ============================================================================
  return (
    <footer
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{ height: `${layoutConfig?.playerBarHeight || 84}px` }}
      data-testid="player-dock"
      data-position={pos}
      className={`bg-[var(--fin-player)] px-4 flex items-center justify-between select-none z-30 finamp-player-bar shrink-0 relative backdrop-blur-[var(--fin-blur)] transition-all duration-200 ${
        isFloating
          ? `m-3 border border-white/15 shadow-2xl ${cornerClass}`
          : pos === 'top'
          ? 'border-b border-white/10'
          : 'border-t border-white/10'
      } ${isLayoutEditMode ? 'ring-2 ring-cyan-400/70' : ''}`}
    >
      {/* Top micro progress line along the very top of player bar */}
      <div
        className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--fin-accent)] to-transparent transition-all duration-300"
        style={{ width: `${progressPct}%` }}
      />

      {/* Left: Drag Handle + Track Information & Album Art */}
      <div className="flex items-center gap-3 min-w-[240px] max-w-[340px]">
        <div
          className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-cyan-400 p-1 rounded hover:bg-white/5 transition shrink-0"
          title="Drag Player Bar to Top, Bottom, Left Sidebar, or Right Sidebar!"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {currentTrack ? (
          <>
            <div
              className="relative group cursor-pointer shrink-0"
              onClick={() => onOpenMetadataEditor(currentTrack)}
              title="Click to view/edit metadata & lyrics"
            >
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                style={{
                  width: `${layoutConfig?.playerArtworkSizePx ?? 54}px`,
                  height: `${layoutConfig?.playerArtworkSizePx ?? 54}px`,
                  ...(artShape === 'vinyl' ? { animationDuration: '10s' } : {}),
                }}
                className={getArtworkClasses('')}
              />
              <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Info className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-slate-100 truncate">
                  {currentTrack.title}
                </p>
                {layoutConfig?.showAudioSpecsBadge !== false && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 shrink-0 font-medium">
                    {currentTrack.codec}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {currentTrack.artist}
              </p>

              <div className="flex items-center gap-2 mt-1">
                {layoutConfig?.showAudioSpecsBadge !== false && (
                  <span className="text-[9px] font-mono text-slate-500">
                    {Math.round(currentTrack.sampleRate / 1000)}kHz / {currentTrack.bitDepth}b
                  </span>
                )}
                {layoutConfig?.showReplayGainBadge !== false && currentTrack.replayGain && (
                  <span className="text-[9px] font-mono text-emerald-400/80">
                    RG: {currentTrack.replayGain > 0 ? '+' : ''}
                    {currentTrack.replayGain}dB
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-xs text-slate-500 font-medium">
            No track selected. Click any song to play.
          </div>
        )}
      </div>

      {/* Center: Playback Controls & Scrubber */}
      <div className="flex flex-col items-center max-w-xl w-full px-4">
        <div className="flex items-center gap-4 mb-1">
          <button
            onClick={onToggleShuffle}
            aria-label="Toggle shuffle"
            className={`p-1.5 rounded-full transition ${
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
            className="p-1.5 text-slate-300 hover:text-white rounded-full transition"
            title="Previous (Key: P)"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{
              width: `${layoutConfig?.transportButtonSizePx ?? 40}px`,
              height: `${layoutConfig?.transportButtonSizePx ?? 40}px`,
            }}
            className="rounded-full bg-[var(--fin-accent)] hover:opacity-90 active:scale-95 text-slate-950 flex items-center justify-center transition shadow-md shadow-cyan-500/20"
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
            className="p-1.5 text-slate-300 hover:text-white rounded-full transition"
            title="Next (Key: N)"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={onToggleRepeat}
            aria-label="Cycle repeat mode"
            className={`p-1.5 rounded-full transition ${
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
        <div className="w-full flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-400 w-10 text-right">
            {formattedTimes.left}
          </span>

          <div className="relative flex-1 group flex items-center">
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
              className={`w-full ${scrubberHeightClass} bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)] transition-all`}
            />
          </div>

          <span className="text-[10px] font-mono text-slate-500 w-10 text-left">
            {formattedTimes.right}
          </span>
        </div>
      </div>

      {/* Right: Audio Engine, Quick Dock Switcher & UI Flyouts */}
      <div className="flex items-center gap-2.5 min-w-[260px] justify-end">
        {/* Live Mini Spectrum Visualizer Canvas */}
        {showVis && (
          <canvas
            ref={canvasRef}
            width={64}
            height={20}
            className="rounded bg-black/30 border border-white/5 hidden xl:block cursor-pointer"
            onClick={onToggleVisualizer}
            title="Click to expand fullscreen audio visualizer"
          />
        )}

        {/* Volume Control */}
        <div className="flex items-center gap-1.5 group">
          <button
            onClick={onToggleMute}
            aria-label="Mute or unmute volume"
            className="p-1 text-slate-400 hover:text-slate-200 transition"
            title="Mute / Unmute (Key: M)"
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
            className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)] group-hover:w-20 transition-all"
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
        </div>

        {/* Quick Player Dock Switcher (Top, Bottom, Left Sidebar, Right Sidebar) */}
        {onChangePosition && (
          <div className="hidden md:flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => onChangePosition('top')}
              className={`p-1 rounded transition ${
                pos === 'top'
                  ? 'bg-[var(--fin-accent)] text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Dock Player to Top"
            >
              <PanelTop className="w-3 h-3" />
            </button>
            <button
              onClick={() => onChangePosition('bottom')}
              className={`p-1 rounded transition ${
                pos === 'bottom'
                  ? 'bg-[var(--fin-accent)] text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Dock Player to Bottom"
            >
              <PanelBottom className="w-3 h-3" />
            </button>
            <button
              onClick={() => onChangePosition('left')}
              className="p-1 rounded text-slate-400 hover:text-white transition"
              title="Convert Player to Left Sidebar Deck"
            >
              <PanelLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => onChangePosition('right')}
              className="p-1 rounded text-slate-400 hover:text-white transition"
              title="Convert Player to Right Sidebar Deck"
            >
              <PanelRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* 10-Band EQ Quick Toggle */}
        <button
          onClick={onToggleDsp}
          className="p-1.5 text-slate-400 hover:text-[var(--fin-accent)] hover:bg-white/5 rounded-md transition"
          title="Equalizer & DSP (Key: E)"
          aria-label="DSP Equalizer"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {/* Synced Lyrics Toggle */}
        <button
          onClick={onToggleLyrics}
          className={`p-1.5 rounded-md transition ${
            lyricsOpen
              ? 'text-[var(--fin-accent)] bg-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Synced Lyrics (Key: L)"
          aria-label="Lyrics panel"
        >
          <FileText className="w-4 h-4" />
        </button>

        {/* Play Queue Toggle */}
        <button
          onClick={onToggleQueue}
          className={`p-1.5 rounded-md transition ${
            queueOpen
              ? 'text-[var(--fin-accent)] bg-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Up Next Queue"
          aria-label="Play queue"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Mini Player Toggle */}
        <button
          onClick={onToggleMiniPlayer}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-md transition hidden sm:block"
          title="Toggle Mini-Player (Key: D)"
          aria-label="Mini player"
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Immersive Visualizer Fullscreen */}
        <button
          onClick={onToggleVisualizer}
          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-md transition"
          title="Immersive Visualizer (Key: F)"
          aria-label="Fullscreen visualizer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
};
