import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  Disc,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Image,
  Maximize2,
  ListMusic,
  FileText,
  Activity,
  Music,
  User,
} from 'lucide-react';
import {
  Track,
  DedicatedPlayerStyle,
  PerformanceMetrics,
  LayoutConfig,
} from '../types/index.ts';
import { formatDuration } from '../utils/audioMath.ts';
import { resolveCoverArt, handleCoverImgError } from '../utils/jellywispArtwork.ts';
import { audioEngine } from '../services/audioEngine.ts';

interface NowPlayingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  volume: number;
  isMuted: boolean;
  metrics: PerformanceMetrics | null;
  layoutConfig: LayoutConfig;
  onUpdateLayout: (partial: Partial<LayoutConfig>) => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onPlayTrack: (track: Track, contextTracks?: Track[], index?: number) => void;
  onToggleFavorite: (trackId: string) => void;
  onOpenMetadataEditor: (track: Track) => void;
  onOpenCoverArtSearch: () => void;
  onOpenDspModal: () => void;
  onOpenVisualizer: () => void;
  onNavigateToArtist?: (artistName: string) => void;
  onNavigateToAlbum?: (albumTitle: string, albumId?: string) => void;
  onContextMenuArtist?: (e: React.MouseEvent, artistName: string) => void;
}

export const NowPlayingModal: React.FC<NowPlayingModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  queue,
  isPlaying,
  currentTime,
  duration,
  isShuffle,
  repeatMode,
  volume,
  isMuted,
  metrics,
  layoutConfig,
  onUpdateLayout,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onToggleShuffle,
  onToggleRepeat,
  onVolumeChange,
  onToggleMute,
  onPlayTrack,
  onToggleFavorite,
  onOpenMetadataEditor,
  onOpenCoverArtSearch,
  onOpenDspModal,
  onOpenVisualizer,
  onNavigateToArtist,
  onNavigateToAlbum,
  onContextMenuArtist,
}) => {
  const [rightTab, setRightTab] = useState<'queue' | 'lyrics' | 'specs'>('queue');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const playerStyle: DedicatedPlayerStyle =
    layoutConfig.dedicatedPlayerStyle || 'vinyl-turntable';

  useEffect(() => {
    if (!isOpen) return;
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buffer = new Uint8Array(64);

    const draw = () => {
      audioEngine.getFrequencyData(buffer);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = 48;
      const barW = canvas.width / barCount;

      for (let i = 0; i < barCount; i++) {
        const val = isPlaying ? buffer[i] : 8;
        const h = Math.max(3, (val / 255) * (canvas.height - 6));
        const x = i * barW;
        const y = canvas.height - h;

        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, 'rgba(6, 182, 212, 0.85)');
        grad.addColorStop(0.6, 'rgba(99, 102, 241, 0.85)');
        grad.addColorStop(1, 'rgba(236, 72, 153, 0.9)');

        ctx.fillStyle = isPlaying ? grad : 'rgba(255,255,255,0.12)';
        ctx.fillRect(x + 1, y, Math.max(2, barW - 2), h);
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, isPlaying, playerStyle]);

  if (!isOpen || !currentTrack) return null;

  const coverSrc = resolveCoverArt(currentTrack.coverUrl);
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const decade = currentTrack.year ? `${Math.floor(currentTrack.year / 10) * 10}s` : 'Classic';

  const peakL = Math.round(metrics?.peakLevelL ?? (isPlaying ? 76 : 0));
  const peakR = Math.round(metrics?.peakLevelR ?? (isPlaying ? 80 : 0));
  const dbL = peakL > 0 ? `-${Math.round((100 - peakL) * 0.4)} dB` : '-inf';
  const dbR = peakR > 0 ? `-${Math.round((100 - peakR) * 0.4)} dB` : '-inf';

  return (
    <div className="fixed inset-0 z-50 bg-[#050811]/95 backdrop-blur-2xl flex flex-col select-none overflow-hidden animate-in fade-in duration-200">
      {/* Ambient Blurred Cover Art Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <img
          src={coverSrc}
          onError={handleCoverImgError}
          alt=""
          className="w-full h-full object-cover blur-[120px] scale-125 opacity-30 saturate-150"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-[#060913]/75 to-[#05070f]/95" />
      </div>

      {/* Top Navigation & UI Mode Switcher Bar */}
      <div className="relative z-10 px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-black/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--fin-accent)]/20 border border-[var(--fin-accent)]/40 flex items-center justify-center text-[var(--fin-accent)]">
            <Disc className={`w-4 h-4 ${isPlaying ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-tight">
              Dedicated Track Player
            </h2>
            <p className="text-[11px] text-slate-400">
              {currentTrack.codec} • {Math.round(currentTrack.sampleRate / 1000)} kHz /{' '}
              {currentTrack.bitDepth}-bit • {Math.round(currentTrack.bitrate)} kbps
            </p>
          </div>
        </div>

        {/* Dedicated Player UI Mode Selector */}
        <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10">
          {(
            [
              { id: 'vinyl-turntable', label: 'Vinyl Turntable' },
              { id: 'sleek-canvas', label: 'Sleek Artwork' },
              { id: 'vu-meters', label: 'VU & Spectrum Deck' },
              { id: 'minimal-zen', label: 'Minimal Zen' },
            ] as { id: DedicatedPlayerStyle; label: string }[]
          ).map((mode) => (
            <button
              key={mode.id}
              onClick={() => onUpdateLayout({ dedicatedPlayerStyle: mode.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                playerStyle === mode.id
                  ? 'bg-[var(--fin-accent)] text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenMetadataEditor(currentTrack)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition"
            title="Edit Track Metadata Tags"
          >
            <Tag className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Edit Tags</span>
          </button>
          <button
            onClick={onOpenCoverArtSearch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition"
            title="Find High-Res Cover Art"
          >
            <Image className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Cover Art</span>
          </button>
          <button
            onClick={onOpenVisualizer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition"
            title="Launch Fullscreen Visualizer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Visualizer</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 transition"
            title="Close Dedicated Player (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Player Stage */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6 lg:p-10 flex flex-col justify-between">
        <div
          className={`max-w-6xl w-full mx-auto flex-1 grid gap-8 items-center ${
            playerStyle === 'minimal-zen'
              ? 'grid-cols-1 max-w-2xl text-center'
              : 'grid-cols-1 lg:grid-cols-12'
          }`}
        >
          {/* Left / Center Stage: Artwork / Turntable / VU Deck */}
          <div
            className={`${
              playerStyle === 'minimal-zen' ? 'col-span-1' : 'lg:col-span-6'
            } flex flex-col items-center justify-center`}
          >
            {playerStyle === 'vinyl-turntable' && (
              <div className="relative w-72 h-72 sm:w-88 sm:h-88 flex items-center justify-center">
                {/* Turntable Plinth Base */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-slate-900/90 via-[#0a0f1d] to-black border border-white/15 shadow-2xl" />

                {/* Vinyl Platter */}
                <div
                  style={{ animationDuration: '8s' }}
                  className={`relative w-60 h-60 sm:w-72 sm:h-72 rounded-full bg-[#07090e] border-4 border-slate-800 shadow-2xl flex items-center justify-center ${
                    isPlaying ? 'animate-spin' : ''
                  }`}
                >
                  {/* Vinyl Grooves */}
                  <div className="absolute inset-3 rounded-full border border-white/5 pointer-events-none" />
                  <div className="absolute inset-7 rounded-full border border-white/5 pointer-events-none" />
                  <div className="absolute inset-11 rounded-full border border-white/10 pointer-events-none" />
                  {/* Center Album Label */}
                  <img
                    src={coverSrc}
                    onError={handleCoverImgError}
                    alt={currentTrack.title}
                    className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-black/80 shadow-inner"
                  />
                  {/* Spindle Hole */}
                  <div className="absolute w-4 h-4 rounded-full bg-[#090d16] border-2 border-slate-400" />
                </div>

                {/* Animated Tonearm */}
                <div
                  className={`absolute top-6 right-7 w-6 h-44 origin-top transition-transform duration-700 pointer-events-none ${
                    isPlaying ? 'rotate-[22deg]' : 'rotate-0'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-slate-700 border-2 border-cyan-400/50 shadow-md mx-auto" />
                  <div className="w-1.5 h-36 bg-gradient-to-b from-slate-300 to-slate-500 mx-auto rounded-full shadow" />
                  <div className="w-4 h-6 bg-cyan-400 rounded-sm mx-auto -mt-1 shadow-lg" />
                </div>
              </div>
            )}

            {playerStyle === 'sleek-canvas' && (
              <div className="relative group">
                <img
                  src={coverSrc}
                  onError={handleCoverImgError}
                  alt={currentTrack.title}
                  className="w-72 h-72 sm:w-96 sm:h-96 rounded-3xl object-cover shadow-2xl border border-white/15"
                />
                <span className="absolute top-4 left-4 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-cyan-500/40 text-[11px] font-mono font-bold text-cyan-300">
                  {currentTrack.codec} {Math.round(currentTrack.sampleRate / 1000)}kHz /{' '}
                  {currentTrack.bitDepth}b
                </span>
              </div>
            )}

            {playerStyle === 'vu-meters' && (
              <div className="w-full max-w-lg bg-black/50 border border-white/15 rounded-3xl p-6 space-y-5 shadow-2xl">
                <div className="flex items-center gap-4">
                  <img
                    src={coverSrc}
                    onError={handleCoverImgError}
                    alt={currentTrack.title}
                    className="w-24 h-24 rounded-2xl object-cover border border-white/10 shadow-lg shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                      Master Signal Telemetry
                    </span>
                    <h3 className="text-lg font-extrabold text-white truncate mt-0.5">
                      {currentTrack.title}
                    </h3>
                    <p className="text-xs text-slate-300 truncate">{currentTrack.artist}</p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-emerald-400">
                      <span>{currentTrack.codec}</span>
                      <span>•</span>
                      <span>{Math.round(currentTrack.sampleRate / 1000)} kHz</span>
                      <span>•</span>
                      <span>{Math.round(currentTrack.bitrate)} kbps</span>
                    </div>
                  </div>
                </div>

                {/* Whole-Number Stereo VU Meters */}
                <div className="space-y-3 bg-black/40 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>STEREO PEAK METERS</span>
                    <span className="text-cyan-300 tabular-nums">
                      L: {dbL} | R: {dbR}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400 w-4">L</span>
                      <div className="flex-1 h-3.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-rose-500 transition-all duration-150"
                          style={{ width: `${peakL}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-cyan-300 w-14 text-right tabular-nums">
                        {dbL}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400 w-4">R</span>
                      <div className="flex-1 h-3.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-rose-500 transition-all duration-150"
                          style={{ width: `${peakR}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-cyan-300 w-14 text-right tabular-nums">
                        {dbR}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Spectrum Canvas */}
                <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
                  <canvas ref={canvasRef} width={440} height={84} className="w-full h-20" />
                </div>
              </div>
            )}

            {playerStyle === 'minimal-zen' && (
              <div className="flex flex-col items-center space-y-6">
                <img
                  src={coverSrc}
                  onError={handleCoverImgError}
                  alt={currentTrack.title}
                  className="w-72 h-72 sm:w-88 sm:h-88 rounded-3xl object-cover shadow-2xl border border-white/15"
                />
              </div>
            )}

            {/* Track Title, Clickable Artist & Album Metadata */}
            <div className="mt-6 text-center max-w-lg space-y-1.5">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {currentTrack.title}
                </h1>
                <button
                  onClick={() => onToggleFavorite(currentTrack.id)}
                  className={`p-1.5 rounded-full transition ${
                    currentTrack.isFavorite
                      ? 'text-rose-500 bg-rose-500/10'
                      : 'text-slate-500 hover:text-white'
                  }`}
                  title="Toggle Favorite"
                >
                  <Heart className="w-5 h-5 fill-current" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-300">
                <button
                  onClick={() => {
                    if (onNavigateToArtist) {
                      onClose();
                      onNavigateToArtist(currentTrack.artist);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onContextMenuArtist?.(e, currentTrack.artist);
                  }}
                  className="font-semibold text-cyan-300 hover:underline flex items-center gap-1"
                  title="Click for Artist Discography • Right-click for Artist Options & Artwork Search"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{currentTrack.artist}</span>
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => {
                    if (onNavigateToAlbum) {
                      onClose();
                      onNavigateToAlbum(currentTrack.album, currentTrack.albumId);
                    }
                  }}
                  className="text-slate-300 hover:text-white hover:underline flex items-center gap-1"
                  title="View Album"
                >
                  <Disc className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentTrack.album}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                  {currentTrack.genre}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                  {currentTrack.year} ({decade})
                </span>
                {currentTrack.albumArtist && currentTrack.albumArtist !== currentTrack.artist && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    Album Artist: {currentTrack.albumArtist}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                  {Math.round(currentTrack.bpm)} BPM
                </span>
              </div>
            </div>
          </div>

          {/* Right Stage: Up Next Queue / Lyrics / Technical Specs (hidden in minimal-zen) */}
          {playerStyle !== 'minimal-zen' && (
            <div className="lg:col-span-6 h-[420px] bg-black/40 border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
              {/* Tabs */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setRightTab('queue')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      rightTab === 'queue'
                        ? 'bg-[var(--fin-accent)] text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <ListMusic className="w-3.5 h-3.5" />
                    <span>Up Next ({queue.length})</span>
                  </button>
                  <button
                    onClick={() => setRightTab('lyrics')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      rightTab === 'lyrics'
                        ? 'bg-[var(--fin-accent)] text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Lyrics</span>
                  </button>
                  <button
                    onClick={() => setRightTab('specs')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      rightTab === 'specs'
                        ? 'bg-[var(--fin-accent)] text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Signal Details</span>
                  </button>
                </div>

                <button
                  onClick={onOpenDspModal}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-cyan-300 border border-white/10 transition"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>10-Band EQ</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {rightTab === 'queue' && (
                  <div className="space-y-1">
                    {queue.slice(0, 60).map((t, i) => {
                      const active = t.id === currentTrack.id;
                      return (
                        <div
                          key={`${t.id}-${i}`}
                          onClick={() => onPlayTrack(t, queue, i)}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                            active
                              ? 'bg-[var(--fin-accent)]/20 border border-[var(--fin-accent)]/40'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={resolveCoverArt(t.coverUrl)}
                              onError={handleCoverImgError}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-white/10"
                            />
                            <div className="min-w-0">
                              <p
                                className={`text-xs font-semibold truncate ${
                                  active ? 'text-[var(--fin-accent)] font-bold' : 'text-white'
                                }`}
                              >
                                {t.title}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {t.artist} • {t.album}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 shrink-0 ml-2">
                            {formatDuration(t.duration)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {rightTab === 'lyrics' && (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6">
                    {currentTrack.lyrics ? (
                      <div className="space-y-3 text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                        {currentTrack.lyrics}
                      </div>
                    ) : (
                      <div className="space-y-2 text-slate-400">
                        <Music className="w-8 h-8 text-cyan-400/60 mx-auto" />
                        <p className="text-xs font-semibold text-white">
                          No embedded lyrics found for "{currentTrack.title}"
                        </p>
                        <p className="text-[11px] text-slate-400">
                          You can add or paste synced LRC lyrics in the Track Metadata Editor.
                        </p>
                        <button
                          onClick={() => onOpenMetadataEditor(currentTrack)}
                          className="mt-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-cyan-300 transition"
                        >
                          Add Lyrics in Editor
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {rightTab === 'specs' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        Audio Codec
                      </span>
                      <p className="text-base font-bold text-white font-mono mt-0.5">
                        {currentTrack.codec}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        Sample Rate & Depth
                      </span>
                      <p className="text-base font-bold text-cyan-400 font-mono mt-0.5 tabular-nums">
                        {Math.round(currentTrack.sampleRate / 1000)} kHz / {currentTrack.bitDepth}-bit
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        Stream Bitrate
                      </span>
                      <p className="text-base font-bold text-amber-400 font-mono mt-0.5 tabular-nums">
                        {Math.round(currentTrack.bitrate)} kbps
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        Album Artist
                      </span>
                      <p className="text-sm font-bold text-white truncate mt-0.5">
                        {currentTrack.albumArtist || currentTrack.artist}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        Acoustic Energy & BPM
                      </span>
                      <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5 tabular-nums">
                        {Math.round((currentTrack.moodTags?.energy ?? 0.5) * 100)}% •{' '}
                        {Math.round(currentTrack.bpm)} BPM
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        Peak Level (L / R)
                      </span>
                      <p className="text-sm font-bold text-cyan-300 font-mono mt-0.5 tabular-nums">
                        {dbL} / {dbR}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Full-Width Transport & Scrubber Console */}
        <div className="max-w-4xl w-full mx-auto mt-8 bg-black/50 border border-white/10 rounded-3xl p-5 backdrop-blur-xl shadow-2xl space-y-4">
          {/* Interactive Timeline Scrubber */}
          <div className="space-y-1.5">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.5"
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
            />
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 tabular-nums">
              <span>{formatDuration(currentTime)}</span>
              <span className="text-[11px] text-cyan-400 font-bold">{Math.round(progressPct)}%</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Transport Controls + Volume */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleShuffle}
                className={`p-2 rounded-xl transition ${
                  isShuffle
                    ? 'bg-[var(--fin-accent)]/20 text-[var(--fin-accent)] border border-[var(--fin-accent)]/40'
                    : 'text-slate-400 hover:text-white bg-white/5'
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                onClick={onToggleRepeat}
                className={`p-2 rounded-xl transition ${
                  repeatMode !== 'off'
                    ? 'bg-[var(--fin-accent)]/20 text-[var(--fin-accent)] border border-[var(--fin-accent)]/40'
                    : 'text-slate-400 hover:text-white bg-white/5'
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-5">
              <button
                onClick={onPrev}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-white transition"
                title="Previous Track"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>
              <button
                onClick={onTogglePlay}
                className="w-14 h-14 rounded-full bg-[var(--fin-accent)] hover:opacity-90 active:scale-95 text-slate-950 flex items-center justify-center shadow-xl shadow-cyan-500/30 transition"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                )}
              </button>
              <button
                onClick={onNext}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-white transition"
                title="Next Track"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            </div>

            <div className="flex items-center gap-2.5 min-w-[160px]">
              <button
                onClick={onToggleMute}
                className="text-slate-400 hover:text-white transition"
                title="Mute / Unmute"
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
                className="w-28 h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
              />
              <span className="text-xs font-mono text-slate-300 w-9 text-right tabular-nums">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
