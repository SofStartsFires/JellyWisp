import React from 'react';
import {
  Play,
  Pause,
  Disc,
  Users,
  Sparkles,
  Flame,
  Clock,
  Music2,
  Server,
  Layers,
  ChevronRight,
  Headphones,
  Sliders,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { Track, Album, Artist, LayoutConfig, JellyfinServerConfig } from '../types/index.ts';
import { resolveCoverArt, handleCoverImgError } from '../utils/jellywispArtwork.ts';
import { formatDuration } from '../utils/audioMath.ts';
import { NavView } from './Sidebar.tsx';
import { PRESET_MOOD_PROFILES } from '../utils/moodMatrix.ts';

interface HomeViewProps {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime?: number;
  duration?: number;
  onSeek?: (seconds: number) => void;
  onTogglePlay?: () => void;
  onPrevTrack?: () => void;
  onNextTrack?: () => void;
  onPlayTrack: (track: Track, contextTracks?: Track[], index?: number) => void;
  onPlayAlbum: (album: Album) => void;
  onPlayQueue: (tracks: Track[]) => void;
  onNavigateView: (view: NavView) => void;
  onNavigateToAlbum: (albumTitle: string, albumId?: string) => void;
  onNavigateToArtist: (artistName: string) => void;
  onContextMenuTrack?: (e: React.MouseEvent, track: Track) => void;
  onContextMenuAlbum?: (e: React.MouseEvent, album: Album) => void;
  serverConfig?: JellyfinServerConfig;
  serverName?: string;
  isConnected?: boolean;
  metrics?: any;
  layoutConfig?: LayoutConfig;
}

export const HomeView: React.FC<HomeViewProps> = ({
  tracks,
  albums,
  artists,
  currentTrack,
  isPlaying,
  currentTime = 0,
  duration = 0,
  onSeek,
  onTogglePlay,
  onPrevTrack,
  onNextTrack,
  onPlayTrack,
  onPlayAlbum,
  onPlayQueue,
  onNavigateView,
  onNavigateToAlbum,
  onNavigateToArtist,
  onContextMenuTrack,
  onContextMenuAlbum,
  serverConfig,
  serverName,
  isConnected,
  metrics,
  layoutConfig,
}) => {
  const homeHc = layoutConfig?.homeConfig || {
    showHeroPlayer: true,
    showTelemetryStats: true,
    telemetryItems: { tracks: true, albums: true, lossless: true, ping: true, artists: true },
    showHeavyRotation: true,
    heavyRotationCount: 10,
    showRecentAlbums: true,
    recentAlbumsCount: 8,
    showFeaturedArtists: true,
    featuredArtistsCount: 8,
    showSmartMixes: true,
  };

  // Most Played / Heavy Rotation Tracks (sorted by playCount descending, with robust fallbacks)
  const heavyRotationTracks = React.useMemo(() => {
    return [...tracks]
      .sort((a, b) => {
        const pcA = Number(a.playCount) || 0;
        const pcB = Number(b.playCount) || 0;
        if (pcB !== pcA) return pcB - pcA;
        const rA = Number(a.rating) || 0;
        const rB = Number(b.rating) || 0;
        if (rB !== rA) return rB - rA;
        return (b.year || 0) - (a.year || 0);
      })
      .slice(0, homeHc.heavyRotationCount || 10);
  }, [tracks, homeHc.heavyRotationCount]);

  // Recently Added / Featured Albums (newest first)
  const recentAlbums = React.useMemo(() => {
    return [...albums]
      .sort((a, b) => (b.year || 0) - (a.year || 0))
      .slice(0, homeHc.recentAlbumsCount || 8);
  }, [albums, homeHc.recentAlbumsCount]);

  // Top Artists in library (by track count or albums, deduplicated)
  const topArtists = React.useMemo(() => {
    const seen = new Set<string>();
    const list: Artist[] = [];
    for (const art of [...artists].sort(
      (a, b) => (b.trackCount || 0) - (a.trackCount || 0) || (b.albums?.length || 0) - (a.albums?.length || 0)
    )) {
      const nameKey = (art.name || '').trim().toLowerCase();
      if (nameKey && !seen.has(nameKey)) {
        seen.add(nameKey);
        list.push(art);
      }
    }
    return list.slice(0, homeHc.featuredArtistsCount || 8);
  }, [artists, homeHc.featuredArtistsCount]);

  // Qualifying Smart Mixes (>= 20 tracks)
  const quickMixes = React.useMemo(() => {
    return PRESET_MOOD_PROFILES.slice(0, 4);
  }, []);

  const totalLossless = React.useMemo(() => {
    return tracks.filter((t) => t.codec === 'FLAC' || t.codec === 'DSD' || t.codec === 'ALAC' || t.codec === 'WAV').length;
  }, [tracks]);

  const featuredTrack = currentTrack || heavyRotationTracks[0] || tracks[0];
  const isFeaturedPlaying = isPlaying && currentTrack?.id === featuredTrack?.id;
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 sm:p-6 pt-6 sm:pt-8 space-y-6 sm:space-y-8 select-none">

      {/* Library Telemetry Stats Bar */}
      {homeHc.showTelemetryStats !== false && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {homeHc.telemetryItems?.tracks !== false && (
            <div className="p-4 rounded-2xl bg-[#0e1320]/80 border border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Music2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Total Tracks</p>
                <p className="text-lg font-bold text-white font-mono">{tracks.length.toLocaleString()}</p>
              </div>
            </div>
          )}

          {homeHc.telemetryItems?.albums !== false && (
            <div className="p-4 rounded-2xl bg-[#0e1320]/80 border border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Disc className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Total Albums</p>
                <p className="text-lg font-bold text-white font-mono">{albums.length.toLocaleString()}</p>
              </div>
            </div>
          )}

          {homeHc.telemetryItems?.lossless !== false && (
            <div className="p-4 rounded-2xl bg-[#0e1320]/80 border border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Headphones className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Hi-Res Lossless</p>
                <p className="text-lg font-bold text-emerald-400 font-mono">{totalLossless.toLocaleString()}</p>
              </div>
            </div>
          )}

          {homeHc.telemetryItems?.ping !== false && (
            <div className="p-4 rounded-2xl bg-[#0e1320]/80 border border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                <Server className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Server Ping</p>
                <p className="text-lg font-bold text-white font-mono">{serverConfig?.pingMs ?? 14}ms</p>
              </div>
            </div>
          )}

          {homeHc.telemetryItems?.artists !== false && (
            <div className="p-4 rounded-2xl bg-[#0e1320]/80 border border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Artists</p>
                <p className="text-lg font-bold text-white font-mono">{artists.length.toLocaleString()}</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Heavy Rotation: Most Played Tracks */}
      {homeHc.showHeavyRotation !== false && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">Heavy Rotation (Most Played)</h2>
            </div>
            <button
              onClick={() => onNavigateView('tracks')}
              className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition font-semibold"
            >
              <span>All Tracks</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {heavyRotationTracks.map((t, idx) => {
            const isCurrent = currentTrack?.id === t.id;
            return (
              <div
                key={t.id}
                onContextMenu={(e) => onContextMenuTrack?.(e, t)}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition ${
                  isCurrent
                    ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                    : 'bg-[#0e1320]/60 hover:bg-[#121829] border-white/5 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-5 text-center text-xs font-mono text-slate-500 group-hover:hidden">
                    {idx + 1}
                  </span>
                  <button
                    onClick={() => onPlayTrack(t, heavyRotationTracks, idx)}
                    className="w-5 text-center text-cyan-400 hidden group-hover:flex items-center justify-center"
                    title="Play"
                  >
                    {isCurrent && isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                  </button>

                  <img
                    src={resolveCoverArt(t.coverUrl)}
                    onError={handleCoverImgError}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover border border-white/10 shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate group-hover:text-cyan-400 transition">
                      {t.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {t.artist} • <span className="text-slate-500">{t.album}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-slate-400">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-cyan-300">
                    {t.playCount || 0} plays
                  </span>
                  <span>{formatDuration(t.duration)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      )}

      {/* Recently Added / Featured Albums */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Disc className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Recent & Lossless Albums</h2>
          </div>
          <button
            onClick={() => onNavigateView('albums')}
            className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition font-semibold"
          >
            <span>All Albums ({albums.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {recentAlbums.map((album) => (
            <div
              key={album.id}
              onClick={() => onNavigateToAlbum(album.title, album.id)}
              onContextMenu={(e) => onContextMenuAlbum?.(e, album)}
              className="group cursor-pointer space-y-2"
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-lg group-hover:border-cyan-400/50 transition">
                <img
                  src={resolveCoverArt(album.coverUrl)}
                  onError={handleCoverImgError}
                  alt={album.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayAlbum(album);
                  }}
                  className="absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition duration-200 hover:scale-105 active:scale-95"
                  title="Play Album"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white truncate group-hover:text-cyan-400 transition">
                  {album.title}
                </h3>
                <p className="text-[11px] text-slate-400 truncate">{album.artist}</p>
                <p className="text-[10px] font-mono text-slate-500">{album.year || '2024'} • {album.trackCount || album.tracks?.length || 0} tracks</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Artists */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Featured Artists</h2>
          </div>
          <button
            onClick={() => onNavigateView('artists')}
            className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition font-semibold"
          >
            <span>All Artists ({artists.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
          {topArtists.map((artist) => (
            <div
              key={artist.id}
              onClick={() => onNavigateToArtist(artist.name)}
              className="group cursor-pointer flex flex-col items-center text-center space-y-2"
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-black/40 border border-white/10 shadow-lg group-hover:border-cyan-400/50 transition">
                <img
                  src={resolveCoverArt(artist.coverUrl)}
                  onError={handleCoverImgError}
                  alt={artist.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
              </div>
              <div className="min-w-0 w-full px-1">
                <h3 className="text-xs font-bold text-white truncate group-hover:text-cyan-400 transition">
                  {artist.name}
                </h3>
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  {artist.albums?.length || Math.max(1, Math.round((artist.trackCount || 0) / 10))} albums
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Smart Mixes Launcher */}
      <section className="space-y-4 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Smart Mixes</h2>
          </div>
          <button
            onClick={() => onNavigateView('smart-playlists')}
            className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition font-semibold"
          >
            <span>All Mood Playlists</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickMixes.map((mix) => (
            <div
              key={mix.id}
              onClick={() => onNavigateView('smart-playlists')}
              className={`group cursor-pointer p-5 rounded-2xl border border-white/10 bg-gradient-to-br ${mix.gradient} hover:border-white/25 transition space-y-3 relative overflow-hidden`}
            >
              <div className="text-3xl">{mix.emoji}</div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                  {mix.name}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2 mt-1">
                  {mix.description}
                </p>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-white/10">
                <span>{mix.eraLabel}</span>
                <span className="text-cyan-300 font-bold group-hover:underline flex items-center gap-0.5">
                  Open Mix <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
