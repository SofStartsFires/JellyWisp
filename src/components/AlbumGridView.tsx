import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Shuffle,
  ArrowLeft,
  Grid,
  Loader2,
  ArrowUpDown,
  Filter,
  User,
  Disc,
  LayoutGrid,
  List,
  Layers,
  Columns,
  Image as ImageIcon,
  GripVertical,
} from 'lucide-react';
import {
  Album,
  Track,
  LayoutConfig,
  AlbumReleaseType,
  AlbumViewLayoutStyle,
} from '../types/index.ts';
import { formatDuration } from '../utils/audioMath.ts';
import {
  jellyfin,
  inferAlbumReleaseType,
  getAlbumReleaseTypeOverride,
} from '../services/jellyfinService.ts';
import { resolveCoverArt, handleCoverImgError } from '../utils/jellywispArtwork.ts';
import { compareSortableStrings, sortAlbumsDefault } from '../utils/libraryHelpers.ts';

interface AlbumGridViewProps {
  albums: Album[];
  totalAlbumCount?: number;
  allTracks?: Track[];
  currentTrack: Track | null;
  initialSelectedAlbum?: { title: string; id?: string } | null;
  onClearInitialAlbum?: () => void;
  onPlayTrack: (track: Track, contextTracks?: Track[], indexInContext?: number) => void;
  onPlayAlbum: (album: Album) => void;
  onOpenMetadataEditor: (track: Track) => void;
  onNavigateToArtist?: (artistName: string) => void;
  onNavigateToGenre?: (genre: string) => void;
  onNavigateToDecade?: (decade: string) => void;
  onReclassifyAlbum?: (
    albumId: string,
    releaseType: AlbumReleaseType,
    albumTitle?: string,
    artistName?: string
  ) => void;
  onSearchAlbumArt?: (query: string, album?: Album) => void;
  onContextMenuTrack?: (e: React.MouseEvent, track: Track) => void;
  onContextMenuAlbum?: (e: React.MouseEvent, album: Album) => void;
  onContextMenuArtist?: (e: React.MouseEvent, artistName: string) => void;
  layoutConfig?: LayoutConfig;
  onUpdateLayout?: (partial: Partial<LayoutConfig>) => void;
}

type AlbumSortOption =
  | 'default'
  | 'title-asc'
  | 'title-desc'
  | 'artist-asc'
  | 'artist-desc'
  | 'year-desc'
  | 'year-asc'
  | 'genre-asc'
  | 'release-type'
  | 'tracks-desc'
  | 'duration-desc';

export const RELEASE_TYPE_META: {
  id: AlbumReleaseType;
  label: string;
  shortLabel: string;
  badgeClass: string;
}[] = [
  {
    id: 'studio',
    label: 'Studio Albums',
    shortLabel: 'Studio',
    badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
  },
  {
    id: 'live',
    label: 'Live Releases',
    shortLabel: 'Live',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
  },
  {
    id: 'ep',
    label: 'EPs',
    shortLabel: 'EP',
    badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
  },
  {
    id: 'single',
    label: 'Singles',
    shortLabel: 'Single',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'bootleg',
    label: 'Bootlegs & Demos',
    shortLabel: 'Bootleg',
    badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
  },
  {
    id: 'compilation',
    label: 'Compilations',
    shortLabel: 'Compilation',
    badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
  },
];

export function getAlbumReleaseType(album: Album): AlbumReleaseType {
  const override = getAlbumReleaseTypeOverride(album.id, album.title, album.artist);
  if (override) return override;
  const trackCount = album.tracks?.length || album.trackCount || 0;
  return (
    album.releaseType ||
    inferAlbumReleaseType(album.id, album.title, trackCount, album.totalDuration || 0, album.artist)
  );
}

export function getReleaseTypeBadge(type: AlbumReleaseType) {
  return RELEASE_TYPE_META.find((m) => m.id === type) || RELEASE_TYPE_META[0];
}

export const AlbumGridView: React.FC<AlbumGridViewProps> = ({
  albums,
  totalAlbumCount,
  allTracks = [],
  currentTrack,
  initialSelectedAlbum,
  onClearInitialAlbum,
  onPlayTrack,
  onPlayAlbum,
  onNavigateToArtist,
  onNavigateToGenre,
  onNavigateToDecade,
  onReclassifyAlbum,
  onSearchAlbumArt,
  onContextMenuTrack,
  onContextMenuAlbum,
  onContextMenuArtist,
  layoutConfig,
  onUpdateLayout,
}) => {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumTracks, setAlbumTracks] = useState<Track[]>([]);
  const [loadingAlbumTracks, setLoadingAlbumTracks] = useState(false);

  const [sortBy, setSortBy] = useState<AlbumSortOption>('default');
  const [selectedReleaseType, setSelectedReleaseType] = useState<'all' | AlbumReleaseType>('all');
  const [selectedDecade, setSelectedDecade] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [draggedAlbumId, setDraggedAlbumId] = useState<string | null>(null);
  const [dropTargetType, setDropTargetType] = useState<AlbumReleaseType | null>(null);

  const viewStyle: AlbumViewLayoutStyle = layoutConfig?.albumViewStyle || 'grid';

  // Virtualized Grid state
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(700);

  const gridCols = layoutConfig?.albumGridColumns || 5;
  const rowHeight = Math.max(225, Math.round(1380 / gridCols));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => setViewportHeight(el.clientHeight || 700);
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [selectedAlbum, viewStyle]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const resolveTracksForAlbum = useCallback(
    async (album: Album): Promise<Track[]> => {
      if (album.tracks && album.tracks.length > 0 && album.tracks.length >= (album.trackCount || 1)) {
        return album.tracks;
      }
      const localMatches = allTracks.filter(
        (t) =>
          (t.albumId && t.albumId === album.id) ||
          (t.album.toLowerCase() === album.title.toLowerCase() &&
            (!album.artist ||
              t.albumArtist?.toLowerCase() === album.artist.toLowerCase() ||
              t.artist.toLowerCase() === album.artist.toLowerCase()))
      );
      if (localMatches.length > 0 && localMatches.length >= (album.trackCount || 1)) {
        return localMatches;
      }
      const fetched = await jellyfin.fetchAlbumTracks(album.id);
      return fetched.length > 0 ? fetched : localMatches;
    },
    [allTracks]
  );

  const handleSelectAlbum = useCallback(
    async (album: Album) => {
      setSelectedAlbum(album);
      if (album.tracks && album.tracks.length > 0 && album.tracks.length >= (album.trackCount || 1)) {
        setAlbumTracks(album.tracks);
        return;
      }
      setLoadingAlbumTracks(true);
      const tracks = await resolveTracksForAlbum(album);
      setAlbumTracks(tracks);
      setLoadingAlbumTracks(false);
    },
    [resolveTracksForAlbum]
  );

  useEffect(() => {
    if (!initialSelectedAlbum) return;
    const found =
      (initialSelectedAlbum.id && albums.find((a) => a.id === initialSelectedAlbum.id)) ||
      albums.find((a) => a.title.toLowerCase() === initialSelectedAlbum.title.toLowerCase());
    if (found) {
      handleSelectAlbum(found);
    }
    onClearInitialAlbum?.();
  }, [initialSelectedAlbum, albums, handleSelectAlbum, onClearInitialAlbum]);

  const handleQuickPlayAlbum = async (e: React.MouseEvent, album: Album) => {
    e.stopPropagation();
    const tracks = await resolveTracksForAlbum(album);
    if (tracks.length > 0) {
      onPlayAlbum({ ...album, tracks });
    }
  };

  const handleDropAlbumOnCategory = (targetType: AlbumReleaseType, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const albumId = e.dataTransfer.getData('application/x-jellywisp-album') || draggedAlbumId;
    if (albumId && onReclassifyAlbum) {
      const targetAlbum = albums.find((a) => a.id === albumId);
      onReclassifyAlbum(albumId, targetType, targetAlbum?.title, targetAlbum?.artist);
    }
    setDraggedAlbumId(null);
    setDropTargetType(null);
  };

  // Counts per Release Type
  const releaseTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: albums.length,
      studio: 0,
      live: 0,
      ep: 0,
      single: 0,
      bootleg: 0,
      compilation: 0,
    };
    for (const a of albums) {
      const rt = getAlbumReleaseType(a);
      counts[rt] = (counts[rt] || 0) + 1;
    }
    return counts;
  }, [albums]);

  // Available Decades and Genres for quick filtering
  const availableDecades = useMemo(() => {
    const set = new Set<string>();
    for (const a of albums) {
      if (a.year && a.year > 1900 && a.year < 2100) {
        set.add(`${Math.floor(a.year / 10) * 10}s`);
      }
    }
    return Array.from(set).sort((a, b) => parseInt(b) - parseInt(a));
  }, [albums]);

  const availableGenres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of albums) {
      const g = (a.genre || 'Rock').split('/')[0].split(',')[0].trim();
      if (g) counts.set(g, (counts.get(g) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([g]) => g);
  }, [albums]);

  const sortedAndFilteredAlbums = useMemo(() => {
    let list = albums;

    if (selectedReleaseType !== 'all') {
      list = list.filter((a) => getAlbumReleaseType(a) === selectedReleaseType);
    }

    if (selectedDecade !== 'all') {
      list = list.filter((a) => {
        const dec = a.year ? `${Math.floor(a.year / 10) * 10}s` : '';
        return dec === selectedDecade;
      });
    }

    if (selectedGenre !== 'all') {
      const gLower = selectedGenre.toLowerCase();
      list = list.filter((a) => (a.genre || '').toLowerCase().includes(gLower));
    }

    if (sortBy === 'default') return sortAlbumsDefault(list);

    const copy = [...list];
    copy.sort((a, b) => {
      if (sortBy === 'title-asc') return compareSortableStrings(a.title, b.title);
      if (sortBy === 'title-desc') return compareSortableStrings(b.title, a.title);
      if (sortBy === 'artist-asc')
        return compareSortableStrings(a.artist, b.artist) || (b.year || 0) - (a.year || 0);
      if (sortBy === 'artist-desc')
        return compareSortableStrings(b.artist, a.artist) || (b.year || 0) - (a.year || 0);
      if (sortBy === 'year-desc')
        return (b.year || 0) - (a.year || 0) || compareSortableStrings(a.title, b.title);
      if (sortBy === 'year-asc')
        return (a.year || 0) - (b.year || 0) || compareSortableStrings(a.title, b.title);
      if (sortBy === 'genre-asc')
        return (
          compareSortableStrings(a.genre || '', b.genre || '') ||
          compareSortableStrings(a.artist, b.artist)
        );
      if (sortBy === 'release-type')
        return (
          getAlbumReleaseType(a).localeCompare(getAlbumReleaseType(b)) ||
          (b.year || 0) - (a.year || 0)
        );
      if (sortBy === 'tracks-desc') return (b.trackCount || 0) - (a.trackCount || 0);
      if (sortBy === 'duration-desc') return (b.totalDuration || 0) - (a.totalDuration || 0);
      return 0;
    });
    return copy;
  }, [albums, sortBy, selectedReleaseType, selectedDecade, selectedGenre]);

  // ==========================================================================
  // ALBUM DETAIL VIEW
  // ==========================================================================
  if (selectedAlbum) {
    const liveAlbum = albums.find((a) => a.id === selectedAlbum.id) || selectedAlbum;
    const totalDur =
      liveAlbum.totalDuration || albumTracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    const decade = liveAlbum.year ? `${Math.floor(liveAlbum.year / 10) * 10}s` : '';
    const currentRelType = getAlbumReleaseType(liveAlbum);
    const relBadge = getReleaseTypeBadge(currentRelType);

    return (
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 select-none space-y-6">
        <button
          onClick={() => setSelectedAlbum(null)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-semibold transition w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Albums</span>
        </button>

        {/* Album Header Banner */}
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end pb-6 border-b border-white/10">
          <div className="relative group shrink-0">
            <img
              src={resolveCoverArt(liveAlbum.coverUrl)}
              onError={handleCoverImgError}
              alt={liveAlbum.title}
              className="w-44 h-44 rounded-2xl object-cover shadow-2xl border border-white/15 bg-black/40"
            />
            {onSearchAlbumArt && (
              <button
                onClick={() =>
                  onSearchAlbumArt(`${liveAlbum.artist} ${liveAlbum.title}`, liveAlbum)
                }
                className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 rounded-xl bg-black/80 hover:bg-[var(--fin-accent)] text-white hover:text-slate-950 text-[10px] font-bold flex items-center gap-1 border border-white/15 opacity-0 group-hover:opacity-100 transition shadow-lg"
                title="Search for High-Res Album Cover Art"
              >
                <ImageIcon className="w-3 h-3" />
                <span>Change Art</span>
              </button>
            )}
          </div>

          <div className="space-y-2.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded border ${relBadge.badgeClass}`}
              >
                {relBadge.label}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30">
                {liveAlbum.hiresBadge || 'Lossless Album'}
              </span>
              {decade && (
                <button
                  onClick={() => {
                    setSelectedAlbum(null);
                    onNavigateToDecade?.(decade);
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-cyan-300 border border-white/10 transition"
                  title={`Explore ${decade}`}
                >
                  {decade}
                </button>
              )}

              {/* Reclassify Release Type Selector */}
              {onReclassifyAlbum && (
                <div className="flex items-center gap-1 ml-2 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                  <span className="text-[10px] text-slate-400 font-mono">Category:</span>
                  <select
                    value={currentRelType}
                    onChange={(e) =>
                      onReclassifyAlbum(
                        liveAlbum.id,
                        e.target.value as AlbumReleaseType,
                        liveAlbum.title,
                        liveAlbum.artist
                      )
                    }
                    className="bg-transparent text-[11px] font-bold text-white focus:outline-none cursor-pointer"
                  >
                    {RELEASE_TYPE_META.map((rt) => (
                      <option key={rt.id} value={rt.id} className="bg-[#0d1220]">
                        {rt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <h1 className="text-3xl font-extrabold jw-text-album tracking-tight">
              {liveAlbum.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <button
                onClick={() => onNavigateToArtist?.(liveAlbum.artist)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenuArtist?.(e, liveAlbum.artist);
                }}
                className="jw-text-artist hover:underline font-bold flex items-center gap-1"
                title="Click for Artist Discography • Right-click for Artist Options"
              >
                <User className="w-3.5 h-3.5 text-[var(--fin-accent)]" />
                <span>{liveAlbum.artist}</span>
              </button>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300">{liveAlbum.year}</span>
              <span className="text-slate-600">•</span>
              <button
                onClick={() => {
                  setSelectedAlbum(null);
                  onNavigateToGenre?.(liveAlbum.genre);
                }}
                className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/15 text-xs text-slate-200 border border-white/10 transition"
                title={`Browse ${liveAlbum.genre}`}
              >
                {liveAlbum.genre}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400 pt-2">
              <span>{albumTracks.length || liveAlbum.trackCount} tracks</span>
              <span>•</span>
              <span>{formatDuration(totalDur)}</span>
              {albumTracks.length > 0 && (
                <>
                  <button
                    onClick={() => onPlayAlbum({ ...liveAlbum, tracks: albumTracks })}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--fin-accent)] text-slate-950 font-bold text-xs hover:opacity-90 shadow-md shadow-cyan-500/20 transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play Album</span>
                  </button>
                  <button
                    onClick={() => {
                      const shuffled = [...albumTracks].sort(() => Math.random() - 0.5);
                      onPlayAlbum({ ...liveAlbum, tracks: shuffled });
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Shuffle</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Album Tracks List */}
        {loadingAlbumTracks ? (
          <div className="py-12 flex items-center justify-center gap-2 text-xs text-cyan-300 font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Loading album tracks from Jellyfin...</span>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {albumTracks.map((t, i) => {
              const isPlaying = currentTrack?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => onPlayTrack(t, albumTracks, i)}
                  onContextMenu={(e) => {
                    if (onContextMenuTrack) {
                      e.preventDefault();
                      onContextMenuTrack(e, t);
                    }
                  }}
                  className={`py-3 px-4 flex items-center justify-between hover:bg-white/5 rounded-xl cursor-pointer group transition ${
                    isPlaying ? 'bg-[var(--fin-accent)]/12' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500 w-6 text-center group-hover:hidden">
                      {t.trackNumber || i + 1}
                    </span>
                    <Play className="w-4 h-4 text-[var(--fin-accent)] fill-current hidden group-hover:block" />
                    <div>
                      <p
                        className={`text-xs font-semibold ${
                          isPlaying ? 'text-[var(--fin-accent)] font-bold' : 'jw-text-track'
                        }`}
                      >
                        {t.title}
                      </p>
                      <p
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
                        className="text-[11px] jw-text-artist hover:underline w-fit"
                        title="Click for Artist Discography • Right-click for Artist Options"
                      >
                        {t.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-white/5">
                      {t.codec} {Math.round(t.sampleRate / 1000)}k/{t.bitDepth}b
                    </span>
                    <span className="text-xs font-mono text-slate-400 tabular-nums">
                      {formatDuration(t.duration)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Virtualized Grid Row calculations (for standard 'grid' view)
  const totalGridRows = Math.ceil(sortedAndFilteredAlbums.length / gridCols);
  const totalHeight = totalGridRows * rowHeight;
  const overscanRows = 3;
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscanRows);
  const endRow = Math.min(
    totalGridRows,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscanRows
  );

  const visibleRows: Album[][] = [];
  if (viewStyle === 'grid') {
    for (let r = startRow; r < endRow; r++) {
      visibleRows.push(sortedAndFilteredAlbums.slice(r * gridCols, (r + 1) * gridCols));
    }
  }

  const displayTotal =
    totalAlbumCount && totalAlbumCount > albums.length ? totalAlbumCount : albums.length;

  const renderAlbumCard = (album: Album, isCompactShelf = false) => {
    const relType = getAlbumReleaseType(album);
    const relBadge = getReleaseTypeBadge(relType);

    return (
      <div
        key={album.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/x-jellywisp-album', album.id);
          e.dataTransfer.effectAllowed = 'move';
          setDraggedAlbumId(album.id);
        }}
        onDragEnd={() => {
          setDraggedAlbumId(null);
          setDropTargetType(null);
        }}
        onClick={() => handleSelectAlbum(album)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenuAlbum?.(e, album);
        }}
        style={{ padding: `${layoutConfig?.albumCardPaddingPx ?? 12}px` }}
        className={`group cursor-pointer rounded-2xl bg-white/[0.04] hover:bg-white/10 border border-white/5 hover:border-white/20 transition duration-200 flex flex-col overflow-hidden ${
          draggedAlbumId === album.id ? 'opacity-50 ring-2 ring-[var(--fin-accent)]' : ''
        }`}
      >
        {/* Artwork Container */}
        <div
          className={`relative ${
            isCompactShelf ? 'aspect-square' : 'flex-1 min-h-0'
          } rounded-xl overflow-hidden shadow-lg border border-white/10 bg-black/40`}
        >
          <img
            src={resolveCoverArt(album.coverUrl)}
            onError={handleCoverImgError}
            alt={album.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Release Type Pill (Studio / Live / EP / Single / Bootleg) */}
          <span
            className={`absolute top-2 right-2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border backdrop-blur-sm ${relBadge.badgeClass}`}
            title="Drag this album card onto any category tab above to reclassify!"
          >
            {relBadge.shortLabel}
          </span>

          {album.hiresBadge && layoutConfig?.showAudioSpecsBadge !== false && (
            <span className="absolute top-2 left-2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/80 text-cyan-300 border border-cyan-500/40 backdrop-blur-sm">
              {album.hiresBadge.split(' ')[0]}
            </span>
          )}

          <button
            onClick={(e) => handleQuickPlayAlbum(e, album)}
            className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-[var(--fin-accent)] text-slate-950 flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all duration-200 hover:scale-105"
            title="Play album"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </button>
        </div>

        {/* Meta */}
        <div className="mt-2.5 shrink-0">
          <h3 className="text-xs font-bold jw-text-album truncate group-hover:text-[var(--fin-accent)] transition">
            {album.title}
          </h3>
          <p
            onClick={(e) => {
              if (onNavigateToArtist) {
                e.stopPropagation();
                onNavigateToArtist(album.artist);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onContextMenuArtist?.(e, album.artist);
            }}
            className="text-[11px] jw-text-artist hover:underline truncate mt-0.5"
            title={`Click to go to ${album.artist} • Right-click for Artist Options`}
          >
            {album.artist}
          </p>
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1.5">
            {layoutConfig?.showAlbumYearBadge !== false && <span>{album.year}</span>}
            {layoutConfig?.showAlbumGenreSubtext !== false ? (
              <span
                onClick={(e) => {
                  if (onNavigateToGenre) {
                    e.stopPropagation();
                    onNavigateToGenre(album.genre);
                  }
                }}
                className="truncate max-w-[95px] hover:text-cyan-300"
              >
                {album.genre}
              </span>
            ) : (
              <span>{album.trackCount} tracks</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 select-none">
      {/* Top Header + Layout Switcher + Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Music Albums</h2>
          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
            {sortedAndFilteredAlbums.length.toLocaleString()}
            {displayTotal > sortedAndFilteredAlbums.length
              ? ` of ${displayTotal.toLocaleString()}`
              : ''}{' '}
            releases
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Album Layout Style Switcher (4 distinct layout styles) */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {(
              [
                { id: 'grid', label: 'Grid', icon: LayoutGrid },
                { id: 'shelves', label: 'Release Shelves', icon: Layers },
                { id: 'showcase', label: 'Showcase', icon: Columns },
                { id: 'list', label: 'Detail List', icon: List },
              ] as { id: AlbumViewLayoutStyle; label: string; icon: any }[]
            ).map((st) => {
              const Icon = st.icon;
              return (
                <button
                  key={st.id}
                  onClick={() => onUpdateLayout?.({ albumViewStyle: st.id })}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    viewStyle === st.id
                      ? 'bg-[var(--fin-accent)] text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={`Switch to ${st.label} layout`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{st.label}</span>
                </button>
              );
            })}
          </div>

          {/* Album Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as AlbumSortOption)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="default" className="bg-[#0d1220]">Default Order</option>
              <option value="artist-asc" className="bg-[#0d1220]">Album Artist (A–Z)</option>
              <option value="artist-desc" className="bg-[#0d1220]">Album Artist (Z–A)</option>
              <option value="title-asc" className="bg-[#0d1220]">Album Title (A–Z)</option>
              <option value="title-desc" className="bg-[#0d1220]">Album Title (Z–A)</option>
              <option value="year-desc" className="bg-[#0d1220]">Release Year (Newest)</option>
              <option value="year-asc" className="bg-[#0d1220]">Release Year (Oldest)</option>
              <option value="release-type" className="bg-[#0d1220]">Release Type (Studio/Live/EP)</option>
              <option value="genre-asc" className="bg-[#0d1220]">Genre (A–Z)</option>
              <option value="tracks-desc" className="bg-[#0d1220]">Most Tracks</option>
              <option value="duration-desc" className="bg-[#0d1220]">Longest Duration</option>
            </select>
          </div>

          {/* Decade Filter */}
          {availableDecades.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={selectedDecade}
                onChange={(e) => setSelectedDecade(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#0d1220]">All Decades</option>
                {availableDecades.map((dec) => (
                  <option key={dec} value={dec} className="bg-[#0d1220]">
                    {dec}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Genre Filter */}
          {availableGenres.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer max-w-[140px]"
              >
                <option value="all" className="bg-[#0d1220]">All Genres</option>
                {availableGenres.map((g) => (
                  <option key={g} value={g} className="bg-[#0d1220]">
                    {g}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grid Column Slider */}
          {onUpdateLayout && viewStyle === 'grid' && (
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
              <Grid className="w-3.5 h-3.5 text-cyan-400" />
              <input
                type="range"
                min="3"
                max="8"
                step="1"
                value={gridCols}
                onChange={(e) => onUpdateLayout({ albumGridColumns: parseInt(e.target.value) })}
                className="w-16 h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
              />
              <span className="text-xs font-mono text-cyan-300 w-7">{gridCols}c</span>
            </div>
          )}
        </div>
      </div>

      {/* Release Type Category Tabs + Drag & Drop Target Shelves */}
      <div className="flex items-center gap-2 py-2.5 border-b border-white/5 overflow-x-auto shrink-0">
        <button
          onClick={() => setSelectedReleaseType('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
            selectedReleaseType === 'all'
              ? 'bg-[var(--fin-accent)] text-slate-950 border-[var(--fin-accent)] shadow'
              : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
          }`}
        >
          <Disc className="w-3.5 h-3.5" />
          <span>All Releases</span>
          <span className="text-[10px] font-mono opacity-80">
            ({releaseTypeCounts.all || 0})
          </span>
        </button>

        {RELEASE_TYPE_META.map((rt) => {
          const isSelected = selectedReleaseType === rt.id;
          const isDropTarget = dropTargetType === rt.id;
          const count = releaseTypeCounts[rt.id] || 0;
          return (
            <div
              key={rt.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDropTargetType(rt.id);
              }}
              onDragLeave={() => setDropTargetType(null)}
              onDrop={(e) => handleDropAlbumOnCategory(rt.id, e)}
              onClick={() => setSelectedReleaseType(rt.id)}
              title={`Click to filter ${rt.label}, or drag & drop any album card here to classify it as ${rt.shortLabel}!`}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                isDropTarget
                  ? 'border-amber-400 bg-amber-500/25 text-white scale-105 ring-2 ring-amber-400/50'
                  : isSelected
                  ? 'bg-[var(--fin-accent)] text-slate-950 border-[var(--fin-accent)] font-bold shadow'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:text-white hover:border-white/25'
              }`}
            >
              <span>{rt.label}</span>
              <span className="text-[10px] font-mono opacity-75">({count})</span>
              {draggedAlbumId && (
                <span className="text-[9px] font-mono px-1 rounded bg-amber-500/30 text-amber-200">
                  Drop Here
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Content Area by Layout Style */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative pt-4"
      >
        {/* STYLE 1: STANDARD VIRTUALIZED GRID */}
        {viewStyle === 'grid' && (
          <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${startRow * rowHeight}px)`,
              }}
              className="space-y-5"
            >
              {visibleRows.map((rowAlbums, rowIdx) => (
                <div
                  key={`album-row-${startRow + rowIdx}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                    height: `${rowHeight - 20}px`,
                  }}
                  className="gap-5"
                >
                  {rowAlbums.map((album) => renderAlbumCard(album))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STYLE 2: RELEASE TYPE SHELVES (STUDIO / LIVE / EP / SINGLE / BOOTLEG) WITH DRAG-AND-DROP */}
        {viewStyle === 'shelves' && (
          <div className="space-y-8 pb-8">
            {RELEASE_TYPE_META.map((rt) => {
              const shelfAlbums = sortedAndFilteredAlbums.filter(
                (a) => getAlbumReleaseType(a) === rt.id
              );
              const isDropTarget = dropTargetType === rt.id;

              return (
                <div
                  key={rt.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropTargetType(rt.id);
                  }}
                  onDragLeave={() => setDropTargetType(null)}
                  onDrop={(e) => handleDropAlbumOnCategory(rt.id, e)}
                  className={`p-4 rounded-2xl border transition ${
                    isDropTarget
                      ? 'border-amber-400 bg-amber-500/10'
                      : 'border-white/10 bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-mono uppercase font-extrabold px-2.5 py-0.5 rounded border ${rt.badgeClass}`}
                      >
                        {rt.label}
                      </span>
                      <span className="text-xs font-mono text-slate-400 tabular-nums">
                        {shelfAlbums.length}
                      </span>
                    </div>
                  </div>

                  {shelfAlbums.length === 0 ? (
                    <div
                      title={`Drag an album card here to classify it under ${rt.label}`}
                      className="py-5 border border-dashed border-white/10 rounded-xl text-center text-xs text-slate-500"
                    >
                      No {rt.label.toLowerCase()}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
                      {shelfAlbums.slice(0, 60).map((album) => renderAlbumCard(album, true))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* STYLE 3: SHOWCASE MAGAZINE CARDS */}
        {viewStyle === 'showcase' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-8">
            {sortedAndFilteredAlbums.slice(0, 120).map((album) => {
              const relType = getAlbumReleaseType(album);
              const relBadge = getReleaseTypeBadge(relType);
              return (
                <div
                  key={album.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-jellywisp-album', album.id);
                    setDraggedAlbumId(album.id);
                  }}
                  onDragEnd={() => setDraggedAlbumId(null)}
                  onClick={() => handleSelectAlbum(album)}
                  className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 transition flex gap-4 cursor-pointer group"
                >
                  <div className="relative w-28 h-28 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-xl bg-black/40">
                    <img
                      src={resolveCoverArt(album.coverUrl)}
                      onError={handleCoverImgError}
                      alt={album.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <button
                      onClick={(e) => handleQuickPlayAlbum(e, album)}
                      className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[var(--fin-accent)] text-slate-950 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${relBadge.badgeClass}`}
                        >
                          {relBadge.shortLabel}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{album.year}</span>
                      </div>
                      <h3 className="text-sm font-extrabold jw-text-album truncate mt-1 group-hover:text-[var(--fin-accent)] transition">
                        {album.title}
                      </h3>
                      <p
                        onClick={(e) => {
                          if (onNavigateToArtist) {
                            e.stopPropagation();
                            onNavigateToArtist(album.artist);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onContextMenuArtist?.(e, album.artist);
                        }}
                        className="text-xs jw-text-artist hover:underline truncate mt-0.5 w-fit"
                        title="Click for Artist Discography • Right-click for Artist Options"
                      >
                        {album.artist}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-white/5">
                      <span>{album.genre}</span>
                      <span>{album.trackCount} tracks</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STYLE 4: AUDIOPHILE DETAIL LIST */}
        {viewStyle === 'list' && (
          <div className="divide-y divide-white/5 pb-8">
            {sortedAndFilteredAlbums.slice(0, 250).map((album) => {
              const relType = getAlbumReleaseType(album);
              const relBadge = getReleaseTypeBadge(relType);
              return (
                <div
                  key={album.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-jellywisp-album', album.id);
                    setDraggedAlbumId(album.id);
                  }}
                  onDragEnd={() => setDraggedAlbumId(null)}
                  onClick={() => handleSelectAlbum(album)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onContextMenuAlbum?.(e, album);
                  }}
                  className="py-2.5 px-4 flex items-center justify-between gap-4 hover:bg-white/5 rounded-xl cursor-pointer group transition"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 cursor-grab shrink-0" />
                    <img
                      src={resolveCoverArt(album.coverUrl)}
                      onError={handleCoverImgError}
                      alt={album.title}
                      loading="lazy"
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold jw-text-album truncate group-hover:text-[var(--fin-accent)] transition">
                        {album.title}
                      </h3>
                      <p
                        onClick={(e) => {
                          if (onNavigateToArtist) {
                            e.stopPropagation();
                            onNavigateToArtist(album.artist);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onContextMenuArtist?.(e, album.artist);
                        }}
                        className="text-[11px] jw-text-artist hover:underline truncate w-fit"
                        title="Click for Artist Discography • Right-click for Artist Options"
                      >
                        {album.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Inline Release Type Dropdown so user can also change type directly */}
                    {onReclassifyAlbum ? (
                      <select
                        value={relType}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          onReclassifyAlbum(
                            album.id,
                            e.target.value as AlbumReleaseType,
                            album.title,
                            album.artist
                          );
                        }}
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border cursor-pointer focus:outline-none ${relBadge.badgeClass}`}
                      >
                        {RELEASE_TYPE_META.map((rt) => (
                          <option key={rt.id} value={rt.id} className="bg-[#0d1220] text-white">
                            {rt.shortLabel}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${relBadge.badgeClass}`}
                      >
                        {relBadge.shortLabel}
                      </span>
                    )}

                    <span className="text-xs font-mono text-slate-400 w-12 text-center">
                      {album.year}
                    </span>
                    <span className="text-xs text-slate-400 w-28 truncate hidden md:inline">
                      {album.genre}
                    </span>
                    <span className="text-xs font-mono text-slate-400 w-20 text-right">
                      {album.trackCount} tracks
                    </span>
                    <button
                      onClick={(e) => handleQuickPlayAlbum(e, album)}
                      className="p-2 rounded-full bg-[var(--fin-accent)] text-slate-950 hover:opacity-90 transition"
                      title="Play Album"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
