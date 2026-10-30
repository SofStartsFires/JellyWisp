import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  X,
  FileText,
  Music,
  Maximize2,
  Minimize2,
  Sliders,
  Disc,
  User,
  Activity,
  BarChart2,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  AlignLeft,
  AlignCenter,
} from 'lucide-react';
import { Track } from '../types/index.ts';
import { jellyfin } from '../services/jellyfinService.ts';
import { audioEngine } from '../services/audioEngine.ts';
import { resolveCoverArt, handleCoverImgError } from '../utils/jellywispArtwork.ts';

interface LyricsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  currentTime: number;
  isPlaying?: boolean;
  onSeek: (seconds: number) => void;
  onOpenMetadataEditor?: (track: Track) => void;
  onNavigateToArtist?: (artistName: string) => void;
  onNavigateToAlbum?: (albumTitle: string, albumId?: string) => void;
  widthPx?: number;
  onResizeWidth?: (width: number) => void;
}

interface ParsedLyric {
  time: number;
  text: string;
}

type LyricsBgMode = 'clean' | 'blurred-art' | 'waveform' | 'visualizer' | 'polar-ring';
type LyricsFontSize = 'sm' | 'md' | 'lg' | 'xl';

interface LyricsViewPrefs {
  showAlbumArt: boolean;
  showTrackTitle: boolean;
  showArtistName: boolean;
  showAlbumTitle: boolean;
  bgMode: LyricsBgMode;
  fontSize: LyricsFontSize;
  align: 'center' | 'left';
}

const STORAGE_KEY_LYRICS_PREFS = 'jellywisp_lyrics_prefs_v1';

const DEFAULT_PREFS: LyricsViewPrefs = {
  showAlbumArt: true,
  showTrackTitle: true,
  showArtistName: true,
  showAlbumTitle: true,
  bgMode: 'waveform',
  fontSize: 'md',
  align: 'center',
};

export const LyricsDrawer: React.FC<LyricsDrawerProps> = ({
  isOpen,
  onClose,
  currentTrack,
  currentTime,
  isPlaying = false,
  onSeek,
  onOpenMetadataEditor,
  onNavigateToArtist,
  onNavigateToAlbum,
  widthPx = 380,
  onResizeWidth,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showCustomizePanel, setShowCustomizePanel] = useState(false);
  const [fetchedLyrics, setFetchedLyrics] = useState<string | null>(null);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
  const [prefs, setPrefs] = useState<LyricsViewPrefs>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LYRICS_PREFS);
      if (saved) return { ...DEFAULT_PREFS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_PREFS;
  });

  const updatePrefs = (partial: Partial<LyricsViewPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY_LYRICS_PREFS, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Fetch synced lyrics from Jellyfin or LRCLIB when track changes and cache them persistently
  useEffect(() => {
    let cancelled = false;
    if (!isOpen || !currentTrack) {
      return;
    }
    if (currentTrack.lyrics && currentTrack.lyrics.trim().length > 0) {
      setFetchedLyrics(currentTrack.lyrics);
      setIsFetchingLyrics(false);
      return;
    }

    // Check localStorage cache
    const cacheKey = `jellywisp_lyric_cache_${currentTrack.id}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setFetchedLyrics(cached);
        setIsFetchingLyrics(false);
        return;
      }
    } catch {}

    const fetchExternalLyrics = async () => {
      setIsFetchingLyrics(true);
      setFetchedLyrics(null);

      // 1. Try Jellyfin native Lyrics endpoint
      try {
        const jfLyrics = await jellyfin.fetchTrackLyrics(currentTrack.id);
        if (!cancelled && jfLyrics && jfLyrics.trim().length > 0) {
          setFetchedLyrics(jfLyrics);
          try {
            localStorage.setItem(cacheKey, jfLyrics);
          } catch {}
          setIsFetchingLyrics(false);
          return;
        }
      } catch {
        // continue
      }

      // 2. Try LRCLIB public synced lyrics API
      try {
        const params = new URLSearchParams({
          artist_name: currentTrack.artist || '',
          track_name: currentTrack.title || '',
        });
        if (currentTrack.album) params.set('album_name', currentTrack.album);
        const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const lrc = data.syncedLyrics || data.plainLyrics;
          if (!cancelled && lrc && typeof lrc === 'string' && lrc.trim().length > 0) {
            setFetchedLyrics(lrc);
            try {
              localStorage.setItem(cacheKey, lrc);
            } catch {}
            setIsFetchingLyrics(false);
            return;
          }
        }
      } catch {
        // continue
      }

      if (!cancelled) {
        setIsFetchingLyrics(false);
      }
    };

    fetchExternalLyrics();
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentTrack?.id, currentTrack?.title, currentTrack?.artist]);

  // Parse LRC formatted lyrics or split plain text
  const rawLyricsText = currentTrack?.lyrics || fetchedLyrics || '';

  const parsedLyrics = useMemo<ParsedLyric[]>(() => {
    if (!rawLyricsText) return [];
    const lines = rawLyricsText.split('\n');
    const parsed: ParsedLyric[] = [];
    const lrcRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/;

    for (const line of lines) {
      const match = line.match(lrcRegex);
      if (match) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const msStr = match[3] || '0';
        const ms = parseInt(msStr.padEnd(3, '0').slice(0, 3), 10);
        const timeSec = mins * 60 + secs + ms / 1000;
        parsed.push({ time: timeSec, text: match[4].trim() });
      } else if (line.trim()) {
        parsed.push({ time: -1, text: line.trim() });
      }
    }
    return parsed;
  }, [rawLyricsText]);

  // Find active line index
  const activeIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (parsedLyrics[i].time !== -1 && parsedLyrics[i].time <= currentTime + 0.15) {
        idx = i;
      }
    }
    return idx;
  }, [parsedLyrics, currentTime]);

  // Smooth auto-scroll active lyric line into view inside container
  useEffect(() => {
    if (!isOpen || activeIndex < 0 || !activeLineRef.current) return;
    try {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    } catch {
      // ignore scroll errors
    }
  }, [activeIndex, isOpen]);

  // Background Waveform / Visualizer Canvas Animation Loop
  useEffect(() => {
    if (!isOpen) return;
    if (
      prefs.bgMode !== 'waveform' &&
      prefs.bgMode !== 'visualizer' &&
      prefs.bgMode !== 'polar-ring'
    ) {
      return;
    }

    let animId: number;
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqData = new Uint8Array(96);
    const timeData = new Uint8Array(192);

    const render = () => {
      if (canvas.parentElement) {
        if (canvas.width !== canvas.parentElement.clientWidth) {
          canvas.width = canvas.parentElement.clientWidth || 380;
        }
        if (canvas.height !== canvas.parentElement.clientHeight) {
          canvas.height = canvas.parentElement.clientHeight || 600;
        }
      }

      audioEngine.getFrequencyData(freqData);
      audioEngine.getTimeDomainData(timeData);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const accent =
        getComputedStyle(document.documentElement).getPropertyValue('--fin-accent').trim() ||
        '#06b6d4';

      if (prefs.bgMode === 'waveform') {
        // Multi-layered flowing audio waveform in the background
        for (let layer = 0; layer < 2; layer++) {
          ctx.beginPath();
          ctx.lineWidth = layer === 0 ? 2.5 : 1.5;
          ctx.strokeStyle = layer === 0 ? accent : 'rgba(99, 102, 241, 0.5)';
          ctx.globalAlpha = layer === 0 ? 0.35 : 0.22;

          const slice = w / timeData.length;
          let x = 0;
          for (let i = 0; i < timeData.length; i++) {
            const v = (timeData[i] - 128) / 128.0;
            const y = h * (layer === 0 ? 0.55 : 0.45) + v * (h * 0.24);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += slice;
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (prefs.bgMode === 'visualizer') {
        // Bottom-anchored FFT spectrum visualizer bars
        const barCount = isTheaterMode ? 64 : 36;
        const barW = w / barCount;
        ctx.globalAlpha = 0.28;
        for (let i = 0; i < barCount; i++) {
          const val = freqData[i] || 6;
          const barH = Math.max(4, (val / 255) * (h * 0.48));
          const x = i * barW;
          const y = h - barH;
          ctx.fillStyle = accent;
          ctx.fillRect(x + 1, y, Math.max(2, barW - 3), barH);
        }
        ctx.globalAlpha = 1;
      } else if (prefs.bgMode === 'polar-ring') {
        // Centered polar reactive ring
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) * 0.26;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalAlpha = 0.28;
        const count = 72;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const val = freqData[i % freqData.length] || 4;
          const len = (val / 255) * (radius * 0.7);
          ctx.strokeStyle = accent;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          ctx.lineTo(Math.cos(angle) * (radius + len), Math.sin(angle) * (radius + len));
          ctx.stroke();
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, prefs.bgMode, isTheaterMode, isPlaying]);

  if (!isOpen) return null;

  const handleMouseDownResize = (e: React.MouseEvent) => {
    if (isTheaterMode) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = widthPx;
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const nextWidth = Math.max(280, Math.min(760, Math.round(startWidth + deltaX)));
      onResizeWidth?.(nextWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const fontSizeClass =
    prefs.fontSize === 'sm'
      ? { active: 'text-base', idle: 'text-xs' }
      : prefs.fontSize === 'lg'
      ? { active: 'text-2xl', idle: 'text-base' }
      : prefs.fontSize === 'xl'
      ? { active: 'text-3xl', idle: 'text-lg' }
      : { active: 'text-lg', idle: 'text-sm' };

  const showHeaderCard =
    currentTrack &&
    (prefs.showAlbumArt || prefs.showTrackTitle || prefs.showArtistName || prefs.showAlbumTitle);

  return (
    <aside
      style={isTheaterMode ? undefined : { width: `${widthPx}px` }}
      className={
        isTheaterMode
          ? 'fixed inset-0 z-50 finamp-drawer bg-[var(--fin-bg)]/95 backdrop-blur-2xl flex flex-col select-none overflow-hidden'
          : 'fixed right-0 top-11 bottom-20 finamp-drawer border-l border-white/10 backdrop-blur-xl z-30 shadow-2xl flex flex-col select-none overflow-hidden'
      }
    >
      {/* Left Edge Mouse Drag Resize Handle (when docked as side drawer) */}
      {!isTheaterMode && (
        <div
          onMouseDown={handleMouseDownResize}
          title="Drag edge to resize lyrics drawer"
          className={`absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-50 transition-colors ${
            isResizing ? 'bg-[var(--fin-accent)]' : 'hover:bg-[var(--fin-accent)]/60'
          }`}
        />
      )}

      {/* Optional Blurred Album Art Background */}
      {prefs.bgMode === 'blurred-art' && currentTrack && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <img
            src={resolveCoverArt(currentTrack.coverUrl)}
            onError={handleCoverImgError}
            alt=""
            className="w-full h-full object-cover blur-[70px] scale-125 opacity-35 saturate-150"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Optional Live Waveform / Visualizer Background Canvas */}
      {(prefs.bgMode === 'waveform' ||
        prefs.bgMode === 'visualizer' ||
        prefs.bgMode === 'polar-ring') && (
        <canvas
          ref={bgCanvasRef}
          className="pointer-events-none absolute inset-0 w-full h-full z-0"
        />
      )}

      {/* Top Header Bar */}
      <div className="relative z-10 px-4 py-3 border-b border-white/10 flex items-center justify-between bg-black/35 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--fin-accent)]" />
          <h3 className="text-sm font-extrabold text-white tracking-tight">
            {isTheaterMode ? 'Synced Lyrics Stage' : 'Synced Lyrics'}
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Customize Lyrics View Toggle */}
          <button
            onClick={() => setShowCustomizePanel((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
              showCustomizePanel
                ? 'bg-[var(--fin-accent)] text-slate-950 border-[var(--fin-accent)] font-bold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
            title="Customize Lyrics Display (Album Art, Titles, Background Waveform/Visualizer)"
          >
            <Sliders className="w-3 h-3" />
            <span>Customize</span>
          </button>

          {/* Toggle Side Drawer vs Dedicated Theater Screen (by choice!) */}
          <button
            onClick={() => setIsTheaterMode((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
              isTheaterMode
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
            title={
              isTheaterMode
                ? 'Return to Side Drawer'
                : 'Expand to Dedicated Fullscreen Lyrics View'
            }
          >
            {isTheaterMode ? (
              <>
                <Minimize2 className="w-3 h-3" />
                <span>Side Drawer</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3" />
                <span>Theater</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
            title="Close Lyrics"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Customization Drawer inside Lyrics */}
      {showCustomizePanel && (
        <div className="relative z-20 p-4 border-b border-white/15 bg-[#0b101e]/95 space-y-3 text-xs shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
              Customize Lyrics Elements &amp; Background
            </span>
            <button
              onClick={() => setShowCustomizePanel(false)}
              className="text-[10px] text-slate-400 hover:text-white"
            >
              Done
            </button>
          </div>

          {/* Toggle Metadata Elements */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {(
              [
                { key: 'showAlbumArt', label: 'Album Art' },
                { key: 'showTrackTitle', label: 'Track Title' },
                { key: 'showArtistName', label: 'Artist Name' },
                { key: 'showAlbumTitle', label: 'Album Title' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                onClick={() => updatePrefs({ [item.key]: !prefs[item.key] })}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition flex items-center justify-between ${
                  prefs[item.key]
                    ? 'bg-[var(--fin-accent)]/20 border-[var(--fin-accent)] text-white'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[9px] font-mono">{prefs[item.key] ? 'ON' : 'OFF'}</span>
              </button>
            ))}
          </div>

          {/* Background Visual Mode */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">
              Background Visuals
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {(
                [
                  { id: 'waveform', label: 'Waveforms', icon: Activity },
                  { id: 'visualizer', label: 'Spectrum FFT', icon: BarChart2 },
                  { id: 'polar-ring', label: 'Polar Ring', icon: Sparkles },
                  { id: 'blurred-art', label: 'Album Glow', icon: ImageIcon },
                  { id: 'clean', label: 'Clean Glass', icon: Disc },
                ] as const
              ).map((bg) => {
                const Icon = bg.icon;
                return (
                  <button
                    key={bg.id}
                    onClick={() => updatePrefs({ bgMode: bg.id })}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 transition ${
                      prefs.bgMode === bg.id
                        ? 'bg-[var(--fin-accent)] text-slate-950 border-[var(--fin-accent)] font-bold'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    <span className="truncate">{bg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Size & Alignment */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
              {(['sm', 'md', 'lg', 'xl'] as LyricsFontSize[]).map((sz) => (
                <button
                  key={sz}
                  onClick={() => updatePrefs({ fontSize: sz })}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition ${
                    prefs.fontSize === sz
                      ? 'bg-[var(--fin-accent)] text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
              <button
                onClick={() => updatePrefs({ align: 'center' })}
                className={`p-1 rounded transition ${
                  prefs.align === 'center'
                    ? 'bg-[var(--fin-accent)] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Center align lyrics"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => updatePrefs({ align: 'left' })}
                className={`p-1 rounded transition ${
                  prefs.align === 'left'
                    ? 'bg-[var(--fin-accent)] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Left align lyrics"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optional Track & Album Header Card */}
      {showHeaderCard && currentTrack && (
        <div
          className={`relative z-10 px-4 py-3 border-b border-white/10 bg-black/25 flex items-center gap-3.5 shrink-0 ${
            isTheaterMode ? 'max-w-3xl mx-auto w-full mt-4 rounded-2xl border' : ''
          }`}
        >
          {prefs.showAlbumArt && (
            <img
              src={resolveCoverArt(currentTrack.coverUrl)}
              onError={handleCoverImgError}
              alt={currentTrack.title}
              onClick={() => onNavigateToAlbum?.(currentTrack.album, currentTrack.albumId)}
              className={`${
                isTheaterMode ? 'w-16 h-16' : 'w-12 h-12'
              } rounded-xl object-cover shadow-lg border border-white/15 shrink-0 cursor-pointer hover:scale-105 transition`}
              title="Click to go to Album"
            />
          )}
          <div className="min-w-0 flex-1">
            {prefs.showTrackTitle && (
              <h4
                className={`${
                  isTheaterMode ? 'text-lg' : 'text-sm'
                } font-extrabold jw-text-track truncate`}
              >
                {currentTrack.title}
              </h4>
            )}
            <div className="flex flex-wrap items-center gap-1.5 text-xs mt-0.5">
              {prefs.showArtistName && (
                <button
                  onClick={() => onNavigateToArtist?.(currentTrack.artist)}
                  className="jw-text-artist hover:underline font-semibold flex items-center gap-1 truncate"
                  title="Go to Artist"
                >
                  <User className="w-3 h-3 shrink-0" />
                  <span className="truncate">{currentTrack.artist}</span>
                </button>
              )}
              {prefs.showArtistName && prefs.showAlbumTitle && (
                <span className="text-slate-600">•</span>
              )}
              {prefs.showAlbumTitle && (
                <button
                  onClick={() => onNavigateToAlbum?.(currentTrack.album, currentTrack.albumId)}
                  className="jw-text-album hover:underline flex items-center gap-1 truncate"
                  title="Go to Album"
                >
                  <Disc className="w-3 h-3 shrink-0" />
                  <span className="truncate">{currentTrack.album}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lyrics Scrollable Body */}
      <div
        ref={containerRef}
        className={`relative z-10 flex-1 overflow-y-auto p-6 space-y-3.5 ${
          prefs.align === 'center' ? 'text-center' : 'text-left'
        } ${isTheaterMode ? 'max-w-4xl mx-auto w-full py-10' : ''}`}
      >
        {!currentTrack ? (
          <div className="py-20 text-slate-400 text-xs space-y-2 text-center">
            <Music className="w-8 h-8 mx-auto text-slate-600" />
            <p>Select a song to view synchronized lyrics.</p>
          </div>
        ) : isFetchingLyrics ? (
          <div className="py-20 text-cyan-300 text-xs space-y-2 text-center font-mono">
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-[var(--fin-accent)]" />
            <p>Searching Jellyfin &amp; LRCLIB for "{currentTrack.title}" synced lyrics...</p>
          </div>
        ) : parsedLyrics.length === 0 ? (
          <div className="py-16 text-slate-400 text-xs space-y-3 text-center max-w-sm mx-auto">
            <Music className="w-9 h-9 mx-auto text-slate-500" />
            <p className="text-sm font-bold text-white">
              No synced lyrics found for "{currentTrack.title}"
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              You can paste or edit LRC time-synced lyrics for this track, or enjoy the live background waveforms and visualizers.
            </p>
            {onOpenMetadataEditor && (
              <button
                onClick={() => onOpenMetadataEditor(currentTrack)}
                className="px-4 py-2 rounded-xl bg-[var(--fin-accent)] text-slate-950 font-bold text-xs shadow-md hover:opacity-90 transition"
              >
                Add / Edit LRC Lyrics
              </button>
            )}
          </div>
        ) : (
          parsedLyrics.map((item, idx) => {
            const isActive = idx === activeIndex;
            const isPassed = activeIndex !== -1 && idx < activeIndex;
            return (
              <p
                key={idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => {
                  if (item.time >= 0) onSeek(item.time);
                }}
                className={`transition-all duration-300 py-2 cursor-pointer rounded-xl px-4 ${
                  isActive
                    ? `${fontSizeClass.active} font-extrabold text-[var(--fin-accent)] scale-[1.03] finamp-accent-glow bg-[var(--fin-accent)]/12 border border-[var(--fin-accent)]/30`
                    : isPassed
                    ? `${fontSizeClass.idle} font-medium text-slate-500 hover:text-slate-200`
                    : `${fontSizeClass.idle} font-semibold text-slate-300 hover:text-white hover:bg-white/5`
                }`}
              >
                {item.text || '♪ ♪ ♪'}
              </p>
            );
          })
        )}
      </div>
    </aside>
  );
};
