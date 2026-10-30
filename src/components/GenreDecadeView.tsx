import React, { useState, useMemo } from 'react';
import {
  Play,
  Shuffle,
  ArrowLeft,
  Disc,
  Music,
  Calendar,
  Tag,
  ArrowUpDown,
} from 'lucide-react';
import { Track, Album } from '../types/index.ts';
import { formatDuration } from '../utils/audioMath.ts';
import { resolveCoverArt, handleCoverImgError } from '../utils/jellywispArtwork.ts';

interface GenreDecadeViewProps {
  mode: 'genres' | 'decades';
  tracks: Track[];
  albums: Album[];
  currentTrack: Track | null;
  onPlayTrack: (track: Track, contextTracks?: Track[], index?: number) => void;
  onPlayAlbum: (album: Album) => void;
  onPlayQueue: (tracks: Track[]) => void;
  onNavigateToArtist?: (artistName: string) => void;
  onContextMenuArtist?: (e: React.MouseEvent, artistName: string) => void;
}

interface BucketItem {
  id: string;
  label: string;
  subtitle: string;
  trackCount: number;
  albumCount: number;
  coverUrls: string[];
  tracks: Track[];
  albums: Album[];
}

export const GenreDecadeView: React.FC<GenreDecadeViewProps> = ({
  mode,
  tracks,
  albums,
  currentTrack,
  onPlayTrack,
  onPlayAlbum,
  onPlayQueue,
  onNavigateToArtist,
  onContextMenuArtist,
}) => {
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'count' | 'name' | 'chronological'>(
    mode === 'decades' ? 'chronological' : 'count'
  );
  const [detailTab, setDetailTab] = useState<'albums' | 'tracks'>('albums');
  const [genreMode, setGenreMode] = useState<'canonical' | 'raw'>('canonical');

  const buckets = useMemo<BucketItem[]>(() => {
    const map = new Map<
      string,
      {
        label: string;
        tracks: Track[];
        albums: Album[];
        coverSet: Set<string>;
      }
    >();

    const getKey = (year: number, genre: string): string => {
      if (mode === 'decades') {
        const y = year && year > 1900 && year < 2100 ? year : 2020;
        const dec = Math.floor(y / 10) * 10;
        return `${dec}s`;
      } else {
        const raw = (genre || 'Uncategorized').split('/')[0].split(',')[0].trim().toLowerCase();
        if (genreMode === 'canonical') {
          if (raw.includes('rock') || raw.includes('metal') || raw.includes('punk') || raw.includes('grunge') || raw.includes('hardcore')) return 'Rock, Metal & Punk';
          if (raw.includes('pop') || raw.includes('dance') || raw.includes('club') || raw.includes('disco')) return 'Pop & Dance';
          if (raw.includes('electronic') || raw.includes('synth') || raw.includes('ambient') || raw.includes('edm') || raw.includes('techno')) return 'Electronic & Synth';
          if (raw.includes('hip') || raw.includes('rap') || raw.includes('r&b') || raw.includes('soul') || raw.includes('funk')) return 'Hip-Hop, R&B & Soul';
          if (raw.includes('jazz') || raw.includes('blues')) return 'Jazz & Blues';
          if (raw.includes('classical') || raw.includes('orchestral') || raw.includes('soundtrack')) return 'Classical & Score';
          if (raw.includes('acoustic') || raw.includes('folk') || raw.includes('country') || raw.includes('singer')) return 'Acoustic & Folk';
          if (raw.includes('indie') || raw.includes('alternative')) return 'Indie & Alternative';
          return raw.charAt(0).toUpperCase() + raw.slice(1) || 'Uncategorized';
        }
        const g = (genre || 'Uncategorized').split('/')[0].split(',')[0].trim();
        return g || 'Uncategorized';
      }
    };

    for (const t of tracks) {
      const key = getKey(t.year, t.genre);
      let entry = map.get(key);
      if (!entry) {
        entry = { label: key, tracks: [], albums: [], coverSet: new Set() };
        map.set(key, entry);
      }
      entry.tracks.push(t);
      if (entry.coverSet.size < 4 && t.coverUrl) {
        entry.coverSet.add(resolveCoverArt(t.coverUrl));
      }
    }

    for (const a of albums) {
      const key = getKey(a.year, a.genre);
      let entry = map.get(key);
      if (!entry) {
        entry = { label: key, tracks: [], albums: [], coverSet: new Set() };
        map.set(key, entry);
      }
      entry.albums.push(a);
      if (entry.coverSet.size < 4 && a.coverUrl) {
        entry.coverSet.add(resolveCoverArt(a.coverUrl));
      }
    }

    const result: BucketItem[] = Array.from(map.entries()).map(([id, val]) => ({
      id,
      label: val.label,
      subtitle:
        mode === 'decades'
          ? `Releases from ${val.label.replace('s', '')}–${parseInt(val.label) + 9}`
          : `${val.albums.length} albums • ${val.tracks.length} tracks`,
      trackCount: val.tracks.length,
      albumCount: val.albums.length,
      coverUrls: Array.from(val.coverSet),
      tracks: val.tracks,
      albums: val.albums,
    }));

    result.sort((a, b) => {
      if (sortBy === 'count') {
        return b.trackCount - a.trackCount || b.albumCount - a.albumCount;
      }
      if (sortBy === 'chronological') {
        return parseInt(b.label) - parseInt(a.label);
      }
      return a.label.localeCompare(b.label);
    });

    return result;
  }, [mode, tracks, albums, sortBy]);

  const activeBucket = useMemo(
    () => buckets.find((b) => b.id === selectedBucketId) || null,
    [buckets, selectedBucketId]
  );

  if (activeBucket) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 select-none space-y-6">
        <button
          onClick={() => setSelectedBucketId(null)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-semibold transition w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All {mode === 'decades' ? 'Decades' : 'Genres'}</span>
        </button>

        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/15 bg-black/40 grid grid-cols-2 shrink-0 shadow-xl">
              {[0, 1, 2, 3].map((i) => (
                <img
                  key={i}
                  src={resolveCoverArt(activeBucket.coverUrls[i % activeBucket.coverUrls.length])}
                  onError={handleCoverImgError}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ))}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30">
                {mode === 'decades' ? 'Decade Archive' : 'Genre Collection'}
              </span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
                {activeBucket.label}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {activeBucket.albumCount.toLocaleString()} albums •{' '}
                {activeBucket.trackCount.toLocaleString()} tracks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeBucket.tracks.length > 0 && (
              <>
                <button
                  onClick={() => onPlayQueue(activeBucket.tracks.slice(0, 250))}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--fin-accent)] text-slate-950 font-bold text-xs hover:opacity-90 transition shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play All</span>
                </button>
                <button
                  onClick={() => {
                    const shuffled = [...activeBucket.tracks]
                      .sort(() => Math.random() - 0.5)
                      .slice(0, 250);
                    onPlayQueue(shuffled);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition"
                >
                  <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Shuffle</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sub-navigation: Albums vs Tracks */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDetailTab('albums')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              detailTab === 'albums'
                ? 'bg-[var(--fin-accent)] text-slate-950 font-bold'
                : 'bg-white/5 text-slate-300 hover:text-white'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>Albums ({activeBucket.albums.length})</span>
          </button>
          <button
            onClick={() => setDetailTab('tracks')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              detailTab === 'tracks'
                ? 'bg-[var(--fin-accent)] text-slate-950 font-bold'
                : 'bg-white/5 text-slate-300 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Tracks ({activeBucket.tracks.length})</span>
          </button>
        </div>

        {detailTab === 'albums' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {activeBucket.albums.map((alb) => (
              <div
                key={alb.id}
                onClick={() => onPlayAlbum(alb)}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 cursor-pointer group transition flex flex-col"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10 mb-2.5">
                  <img
                    src={resolveCoverArt(alb.coverUrl)}
                    onError={handleCoverImgError}
                    alt={alb.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-[var(--fin-accent)] text-slate-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
                <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300">
                  {alb.title}
                </h4>
                <p
                  onClick={(e) => {
                    if (onNavigateToArtist) {
                      e.stopPropagation();
                      onNavigateToArtist(alb.artist);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onContextMenuArtist?.(e, alb.artist);
                  }}
                  className="text-[11px] text-slate-400 hover:text-cyan-300 hover:underline truncate mt-0.5 w-fit"
                  title="Click for Artist Discography • Right-click for Artist Options"
                >
                  {alb.artist}
                </p>
                <span className="text-[10px] font-mono text-slate-500 mt-1">{alb.year}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {activeBucket.tracks.slice(0, 300).map((t, idx) => {
              const active = currentTrack?.id === t.id;
              return (
                <div
                  key={`${t.id}-${idx}`}
                  onClick={() => onPlayTrack(t, activeBucket.tracks, idx)}
                  className={`py-2.5 px-4 flex items-center justify-between hover:bg-white/5 rounded-xl cursor-pointer transition ${
                    active ? 'bg-[var(--fin-accent)]/15' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-slate-500 w-6 text-center">
                      {idx + 1}
                    </span>
                    <img
                      src={resolveCoverArt(t.coverUrl)}
                      onError={handleCoverImgError}
                      alt=""
                      className="w-9 h-9 rounded-lg object-cover border border-white/10 shrink-0"
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
                        <span
                          onClick={(e) => {
                            if (onNavigateToArtist) {
                              e.stopPropagation();
                              onNavigateToArtist(t.artist);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onContextMenuArtist?.(e, t.artist);
                          }}
                          className="hover:underline hover:text-cyan-300"
                          title="Click for Artist Discography • Right-click for Artist Options"
                        >
                          {t.artist}
                        </span>{' '}
                        • {t.album} ({t.year})
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-400 shrink-0">
                    {formatDuration(t.duration)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 select-none">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/5 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            {mode === 'decades' ? (
              <Calendar className="w-5 h-5 text-cyan-400" />
            ) : (
              <Tag className="w-5 h-5 text-cyan-400" />
            )}
            <h2 className="text-xl font-bold text-white tracking-tight">
              {mode === 'decades' ? 'Browse by Decade & Era' : 'Browse by Music Genre'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
            {buckets.length} {mode === 'decades' ? 'decades' : 'genres'}
          </p>
        </div>

        {/* Sort Controls & Genre Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'genres' && (
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <span className="text-[10px] font-mono text-slate-400 px-1.5 uppercase font-bold">Grouping:</span>
              <button
                onClick={() => setGenreMode('canonical')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  genreMode === 'canonical'
                    ? 'bg-[var(--fin-accent)] text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Consolidate mismatched/lazy metadata into clean canonical genre families"
              >
                Canonical Grouped
              </button>
              <button
                onClick={() => setGenreMode('raw')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  genreMode === 'raw'
                    ? 'bg-[var(--fin-accent)] text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Use exact raw file metadata tags"
              >
                Raw Tags
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400 ml-2 mr-1" />
            {mode === 'decades' && (
              <button
                onClick={() => setSortBy('chronological')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  sortBy === 'chronological'
                    ? 'bg-[var(--fin-accent)] text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Chronological
              </button>
            )}
            <button
              onClick={() => setSortBy('count')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                sortBy === 'count'
                  ? 'bg-[var(--fin-accent)] text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Most Tracks
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                sortBy === 'name'
                  ? 'bg-[var(--fin-accent)] text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              A–Z
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
        {buckets.map((bucket) => (
          <div
            key={bucket.id}
            onClick={() => setSelectedBucketId(bucket.id)}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/30 cursor-pointer transition group flex items-center gap-4"
          >
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 grid grid-cols-2 shrink-0 shadow-md">
              {[0, 1, 2, 3].map((i) => (
                <img
                  key={i}
                  src={resolveCoverArt(bucket.coverUrls[i % Math.max(1, bucket.coverUrls.length)])}
                  onError={handleCoverImgError}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-extrabold text-white group-hover:text-cyan-300 transition truncate">
                {bucket.label}
              </h3>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{bucket.subtitle}</p>
              <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-cyan-300">
                <span>{bucket.albumCount} albums</span>
                <span>•</span>
                <span>{bucket.trackCount} tracks</span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (bucket.tracks.length > 0) {
                  onPlayQueue(bucket.tracks.slice(0, 250));
                }
              }}
              className="p-2.5 rounded-full bg-[var(--fin-accent)]/15 group-hover:bg-[var(--fin-accent)] text-[var(--fin-accent)] group-hover:text-slate-950 transition shrink-0"
              title={`Play ${bucket.label}`}
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
