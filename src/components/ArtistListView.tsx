import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Shuffle,
  ArrowLeft,
  Disc,
  ArrowUpDown,
  Loader2,
  Users,
  UserCheck,
  LayoutGrid,
  CircleDot,
  List,
  BookOpen,
  Image as ImageIcon,
} from 'lucide-react';
import {
  Artist,
  Album,
  Track,
  LayoutConfig,
  ArtistViewLayoutStyle,
  AlbumReleaseType,
} from '../types/index.ts';
import { formatDuration } from '../utils/audioMath.ts';
import { jellyfin } from '../services/jellyfinService.ts';
import {
  resolveCoverArt,
  handleCoverImgError,
  JELLYWISP_COVER_PLACEHOLDER,
} from '../utils/jellywispArtwork.ts';
import {
  RELEASE_TYPE_META,
  getAlbumReleaseType,
  getReleaseTypeBadge,
} from './AlbumGridView.tsx';

interface ArtistListViewProps {
  artists: Artist[];
  allArtists?: Artist[];
  albums: Album[];
  tracks: Track[];
  totalArtistCount?: number;
  mode?: 'artists' | 'album-artists';
  currentTrack: Track | null;
  initialSelectedArtistName?: string | null;
  onClearInitialArtist?: () => void;
  onPlayTrack: (track: Track, contextTracks?: Track[], index?: number) => void;
  onPlayAlbum: (album: Album) => void;
  onPlayQueue?: (tracks: Track[]) => void;
  onNavigateToAlbum?: (albumTitle: string, albumId?: string) => void;
  onReclassifyAlbum?: (albumId: string, releaseType: AlbumReleaseType) => void;
  onSearchArtistArt?: (query: string, artist: Artist) => void;
  onContextMenuTrack?: (e: React.MouseEvent, track: Track) => void;
  onContextMenuArtist?: (e: React.MouseEvent, artist: Artist) => void;
  layoutConfig?: LayoutConfig;
  onUpdateLayout?: (partial: Partial<LayoutConfig>) => void;
}

type ArtistSortField = 'name-asc' | 'name-desc' | 'albums' | 'tracks' | 'plays';
type DiscographySort = 'year-desc' | 'year-asc' | 'title-asc' | 'release-type';

export const ArtistListView: React.FC<ArtistListViewProps> = ({
  artists,
  allArtists = [],
  albums,
  tracks,
  totalArtistCount,
  mode = 'artists',
  currentTrack,
  initialSelectedArtistName,
  onClearInitialArtist,
  onPlayTrack,
  onPlayAlbum,
  onPlayQueue,
  onNavigateToAlbum,
  onReclassifyAlbum,
  onSearchArtistArt,
  onContextMenuTrack,
  onContextMenuArtist,
  layoutConfig,
  onUpdateLayout,
}) => {
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [artistAlbums, setArtistAlbums] = useState<Album[]>([]);
  const [loadingDiscography, setLoadingDiscography] = useState(false);
  const [expandedAlbumId, setExpandedAlbumId] = useState<string | null>(null);
  const [expandedAlbumTracks, setExpandedAlbumTracks] = useState<Record<string, Track[]>>({});
  const [loadingAlbumId, setLoadingAlbumId] = useState<string | null>(null);

  const [artistSort, setArtistSort] = useState<ArtistSortField>('name-asc');
  const [discogSort, setDiscogSort] = useState<DiscographySort>('year-desc');
  const [selectedReleaseType, setSelectedReleaseType] = useState<'all' | AlbumReleaseType>('all');
  const [draggedAlbumId, setDraggedAlbumId] = useState<string | null>(null);
  const [dropTargetType, setDropTargetType] = useState<AlbumReleaseType | null>(null);

  const viewStyle: ArtistViewLayoutStyle = layoutConfig?.artistViewStyle || 'cards';

  // Virtualized Grid state
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(700);
  const [cols, setCols] = useState(3);
  const rowHeight = viewStyle === 'circles' ? 210 : viewStyle === 'compact' ? 68 : 140;

  const customCols = layoutConfig?.artistGridColumns;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      setViewportHeight(el.clientHeight || 700);
      const w = el.clientWidth || 900;
      if (customCols && customCols >= 1 && customCols <= 6) {
        setCols(w < 640 ? Math.min(2, customCols) : customCols);
      } else if (viewStyle === 'circles') {
        setCols(w < 640 ? 2 : w < 1024 ? 4 : 6);
      } else if (viewStyle === 'compact') {
        setCols(w < 768 ? 1 : 2);
      } else {
        setCols(w < 640 ? 1 : w < 1024 ? 2 : 3);
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [selectedArtist, viewStyle, customCols]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Helper to resolve best available artist portrait (fixes missing Album Artist artwork)
  const resolveArtistPortrait = useCallback(
    (artist: Artist): string => {
      if (artist.coverUrl && artist.coverUrl !== JELLYWISP_COVER_PLACEHOLDER) {
        return artist.coverUrl;
      }
      const lower = artist.name.toLowerCase();
      // Check full artists list for matching artist coverUrl
      const matchedInArtists =
        allArtists.find((a) => a.name.toLowerCase() === lower && a.coverUrl && a.coverUrl !== JELLYWISP_COVER_PLACEHOLDER) ||
        artists.find((a) => a.name.toLowerCase() === lower && a.coverUrl && a.coverUrl !== JELLYWISP_COVER_PLACEHOLDER);
      if (matchedInArtists?.coverUrl) return matchedInArtists.coverUrl;

      // Check Jellyfin artist image by name if connected
      const jfByName = jellyfin.getArtistImageUrlByName(artist.name);
      if (jfByName) return jfByName;

      // Fallback to first matching album cover
      const matchingAlb = albums.find(
        (alb) =>
          alb.artist.toLowerCase() === lower &&
          alb.coverUrl &&
          alb.coverUrl !== JELLYWISP_COVER_PLACEHOLDER
      );
      if (matchingAlb?.coverUrl) return matchingAlb.coverUrl;

      const matchingTrack = tracks.find(
        (t) =>
          (t.albumArtist?.toLowerCase() === lower || t.artist.toLowerCase() === lower) &&
          t.coverUrl &&
          t.coverUrl !== JELLYWISP_COVER_PLACEHOLDER
      );
      if (matchingTrack?.coverUrl) return matchingTrack.coverUrl;

      return JELLYWISP_COVER_PLACEHOLDER;
    },
    [allArtists, artists, albums, tracks]
  );

  // Helper to ensure every album in an Artist or Album Artist discography has its real artwork
  const resolveAlbumArtwork = useCallback(
    (album: Album): string => {
      if (album.coverUrl && album.coverUrl !== JELLYWISP_COVER_PLACEHOLDER) {
        return album.coverUrl;
      }
      // Look up in local albums by ID or Title
      const byId = albums.find(
        (a) => a.id === album.id && a.coverUrl && a.coverUrl !== JELLYWISP_COVER_PLACEHOLDER
      );
      if (byId?.coverUrl) return byId.coverUrl;

      const lowerTitle = album.title.toLowerCase();
      const byTitle = albums.find(
        (a) =>
          a.title.toLowerCase() === lowerTitle &&
          a.coverUrl &&
          a.coverUrl !== JELLYWISP_COVER_PLACEHOLDER
      );
      if (byTitle?.coverUrl) return byTitle.coverUrl;

      // Look up in local tracks by albumId or album title
      const trackMatch = tracks.find(
        (t) =>
          (t.albumId === album.id || t.album.toLowerCase() === lowerTitle) &&
          t.coverUrl &&
          t.coverUrl !== JELLYWISP_COVER_PLACEHOLDER
      );
      if (trackMatch?.coverUrl) return trackMatch.coverUrl;

      // If album has a real Jellyfin ID, construct direct Jellyfin Primary image URL
      if (album.id && !album.id.startsWith('alb-') && !album.id.startsWith('aa-')) {
        const jfUrl = jellyfin.getItemImageUrl(album.id);
        if (jfUrl) return jfUrl;
      }

      return JELLYWISP_COVER_PLACEHOLDER;
    },
    [albums, tracks]
  );

  // Derive Album Counts per artist for sorting & display
  const albumCountByArtist = useMemo(() => {
    const map = new Map<string, number>();
    for (const alb of albums) {
      const key = (alb.artist || '').toLowerCase();
      if (key) map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [albums]);

  // Derive Play Counts per artist for sorting by most played
  const playCountByArtist = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tracks) {
      const art = (t.artist || '').toLowerCase();
      if (art) map.set(art, (map.get(art) || 0) + (Number(t.playCount) || 0));
      const albArt = (t.albumArtist || '').toLowerCase();
      if (albArt && albArt !== art) map.set(albArt, (map.get(albArt) || 0) + (Number(t.playCount) || 0));
    }
    return map;
  }, [tracks]);

  const sortedArtists = useMemo(() => {
    const copy = [...artists];
    copy.sort((a, b) => {
      if (artistSort === 'name-asc') return a.name.localeCompare(b.name);
      if (artistSort === 'name-desc') return b.name.localeCompare(a.name);
      if (artistSort === 'albums') {
        const ca = albumCountByArtist.get(a.name.toLowerCase()) || a.albums?.length || 0;
        const cb = albumCountByArtist.get(b.name.toLowerCase()) || b.albums?.length || 0;
        return cb - ca || a.name.localeCompare(b.name);
      }
      if (artistSort === 'plays') {
        const pa = playCountByArtist.get(a.name.toLowerCase()) || 0;
        const pb = playCountByArtist.get(b.name.toLowerCase()) || 0;
        return pb - pa || a.name.localeCompare(b.name);
      }
      return (b.trackCount || 0) - (a.trackCount || 0) || a.name.localeCompare(b.name);
    });
    return copy;
  }, [artists, artistSort, albumCountByArtist, playCountByArtist]);

  const openArtistDiscography = useCallback(
    async (artist: Artist) => {
      const portrait = resolveArtistPortrait(artist);
      setSelectedArtist({ ...artist, coverUrl: portrait });
      setExpandedAlbumId(null);
      setSelectedReleaseType('all');
      setLoadingDiscography(true);

      const lowerName = artist.name.toLowerCase();

      // 1. Gather local albums matching this artist or albumArtist
      const localAlbums = albums.filter(
        (alb) =>
          alb.artist.toLowerCase() === lowerName ||
          alb.artist.toLowerCase().includes(lowerName)
      );

      // 2. Also synthesize albums from local tracks if needed
      const artistTracks = tracks.filter(
        (t) =>
          t.artist.toLowerCase() === lowerName ||
          (t.albumArtist && t.albumArtist.toLowerCase() === lowerName)
      );

      const mergedMap = new Map<string, Album>();
      for (const alb of localAlbums) {
        const key = alb.id || alb.title.toLowerCase();
        mergedMap.set(key, {
          ...alb,
          coverUrl: resolveAlbumArtwork(alb),
        });
      }

      for (const t of artistTracks) {
        const titleKey = t.album.toLowerCase();
        // Check if we already have this album by ID or title
        let existingKey: string | null = null;
        for (const [k, v] of mergedMap.entries()) {
          if (k === t.albumId || v.title.toLowerCase() === titleKey) {
            existingKey = k;
            break;
          }
        }

        if (!existingKey) {
          const newKey = t.albumId || titleKey;
          mergedMap.set(newKey, {
            id: t.albumId || `alb-${t.id}`,
            title: t.album,
            artist: t.albumArtist || t.artist,
            year: t.year,
            genre: t.genre,
            coverUrl: t.coverUrl || portrait,
            tracks: [t],
            trackCount: 1,
            totalDuration: t.duration,
            isHiRes: true,
            hiresBadge: t.codec,
          });
        } else {
          const existing = mergedMap.get(existingKey)!;
          if (
            (!existing.coverUrl || existing.coverUrl === JELLYWISP_COVER_PLACEHOLDER) &&
            t.coverUrl
          ) {
            existing.coverUrl = t.coverUrl;
          }
          if (!existing.tracks.some((et) => et.id === t.id)) {
            existing.tracks = [...existing.tracks, t];
            existing.trackCount = Math.max(existing.trackCount, existing.tracks.length);
            existing.totalDuration =
              existing.totalDuration ||
              existing.tracks.reduce((acc, tr) => acc + tr.duration, 0);
          }
        }
      }

      // 3. Query Jellyfin server for complete artist album discography if connected
      const serverAlbums = await jellyfin.fetchArtistAlbums(artist.id, artist.name);
      for (const sAlb of serverAlbums) {
        const titleKey = sAlb.title.toLowerCase();
        let existingKey: string | null = null;
        for (const [k, v] of mergedMap.entries()) {
          if (k === sAlb.id || v.title.toLowerCase() === titleKey) {
            existingKey = k;
            break;
          }
        }
        const resolvedCover = resolveAlbumArtwork(sAlb);
        if (!existingKey) {
          mergedMap.set(sAlb.id || titleKey, {
            ...sAlb,
            coverUrl: resolvedCover,
          });
        } else {
          const existing = mergedMap.get(existingKey)!;
          if (
            (!existing.coverUrl || existing.coverUrl === JELLYWISP_COVER_PLACEHOLDER) &&
            resolvedCover !== JELLYWISP_COVER_PLACEHOLDER
          ) {
            existing.coverUrl = resolvedCover;
          }
        }
      }

      const finalAlbums = Array.from(mergedMap.values()).map((alb) => ({
        ...alb,
        coverUrl: resolveAlbumArtwork(alb),
      }));

      setArtistAlbums(finalAlbums);
      setLoadingDiscography(false);

      if (finalAlbums.length > 0) {
        handleToggleExpandAlbum(finalAlbums[0]);
      }
    },
    [albums, tracks, resolveArtistPortrait, resolveAlbumArtwork]
  );

  // Handle external navigation to an artist
  useEffect(() => {
    if (!initialSelectedArtistName) return;
    const lower = initialSelectedArtistName.toLowerCase();
    const match =
      artists.find((a) => a.name.toLowerCase() === lower) ||
      allArtists.find((a) => a.name.toLowerCase() === lower) ||
      artists.find((a) => a.name.toLowerCase().includes(lower));
    if (match) {
      openArtistDiscography(match);
    } else {
      openArtistDiscography({
        id: `aa-${lower}`,
        name: initialSelectedArtistName,
        coverUrl: jellyfin.getArtistImageUrlByName(initialSelectedArtistName),
        bio: `Discography for ${initialSelectedArtistName}`,
        genres: ['Rock'],
        albums: [],
        trackCount: 0,
      });
    }
    onClearInitialArtist?.();
  }, [
    initialSelectedArtistName,
    artists,
    allArtists,
    openArtistDiscography,
    onClearInitialArtist,
  ]);

  const resolveTracksForAlbum = async (album: Album): Promise<Track[]> => {
    if (expandedAlbumTracks[album.id]?.length) {
      return expandedAlbumTracks[album.id];
    }
    if (album.tracks && album.tracks.length > 0 && album.tracks.length >= (album.trackCount || 1)) {
      setExpandedAlbumTracks((prev) => ({ ...prev, [album.id]: album.tracks }));
      return album.tracks;
    }

    const localMatches = tracks.filter(
      (t) =>
        (t.albumId && t.albumId === album.id) ||
        (t.album.toLowerCase() === album.title.toLowerCase() &&
          (!album.artist ||
            t.albumArtist?.toLowerCase() === album.artist.toLowerCase() ||
            t.artist.toLowerCase() === album.artist.toLowerCase()))
    );

    const fetched = await jellyfin.fetchAlbumTracks(album.id);
    const resolved = fetched.length > 0 ? fetched : localMatches;
    setExpandedAlbumTracks((prev) => ({ ...prev, [album.id]: resolved }));
    return resolved;
  };

  const handleToggleExpandAlbum = async (album: Album) => {
    if (expandedAlbumId === album.id) {
      setExpandedAlbumId(null);
      return;
    }
    setExpandedAlbumId(album.id);
    if (!expandedAlbumTracks[album.id]) {
      setLoadingAlbumId(album.id);
      await resolveTracksForAlbum(album);
      setLoadingAlbumId(null);
    }
  };

  const handlePlayWholeAlbum = async (e: React.MouseEvent, album: Album) => {
    e.stopPropagation();
    const albTracks = await resolveTracksForAlbum(album);
    if (albTracks.length > 0) {
      onPlayAlbum({ ...album, tracks: albTracks });
    }
  };

  const handleDropAlbumOnCategory = (targetType: AlbumReleaseType, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const albumId = e.dataTransfer.getData('application/x-jellywisp-album') || draggedAlbumId;
    if (albumId) {
      onReclassifyAlbum?.(albumId, targetType);
      setArtistAlbums((prev) =>
        prev.map((a) => (a.id === albumId ? { ...a, releaseType: targetType } : a))
      );
    }
    setDraggedAlbumId(null);
    setDropTargetType(null);
  };

  const sortedDiscography = useMemo(() => {
    let list = artistAlbums.map((a) => {
      const globalMatch = albums.find((ga) => ga.id === a.id);
      return {
        ...a,
        coverUrl: resolveAlbumArtwork(globalMatch || a),
        releaseType: globalMatch?.releaseType || a.releaseType,
      };
    });

    if (selectedReleaseType !== 'all') {
      list = list.filter((a) => getAlbumReleaseType(a) === selectedReleaseType);
    }

    const copy = [...list];
    copy.sort((a, b) => {
      if (discogSort === 'year-desc')
        return (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title);
      if (discogSort === 'year-asc')
        return (a.year || 0) - (b.year || 0) || a.title.localeCompare(b.title);
      if (discogSort === 'release-type')
        return (
          getAlbumReleaseType(a).localeCompare(getAlbumReleaseType(b)) ||
          (b.year || 0) - (a.year || 0)
        );
      return a.title.localeCompare(b.title);
    });
    return copy;
  }, [artistAlbums, albums, discogSort, selectedReleaseType, resolveAlbumArtwork]);

  const artistAllTracks = useMemo(() => {
    if (!selectedArtist) return [];
    const lower = selectedArtist.name.toLowerCase();
    return tracks.filter(
      (t) =>
        t.artist.toLowerCase() === lower ||
        (t.albumArtist && t.albumArtist.toLowerCase() === lower)
    );
  }, [selectedArtist, tracks]);

  // ==========================================================================
  // ARTIST DISCOGRAPHY BY ALBUM VIEW
  // ==========================================================================
  if (selectedArtist) {
    const portraitUrl = resolveArtistPortrait(selectedArtist);

    return (
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 select-none space-y-6">
        <button
          onClick={() => setSelectedArtist(null)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-semibold transition w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>
            Back to All {mode === 'album-artists' ? 'Album Artists' : 'Artists'}
          </span>
        </button>

        {/* Artist Hero Banner */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-white/10">
          <div className="flex items-center gap-5">
            <div className="relative group shrink-0">
              <img
                src={resolveCoverArt(portraitUrl)}
                onError={handleCoverImgError}
                alt={selectedArtist.name}
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover shadow-2xl border-2 border-[var(--fin-accent)]/40 bg-black/50"
              />
              {onSearchArtistArt && (
                <button
                  onClick={() => onSearchArtistArt(selectedArtist.name, selectedArtist)}
                  className="absolute bottom-1 right-1 px-2 py-1 rounded-full bg-black/85 hover:bg-[var(--fin-accent)] text-white hover:text-slate-950 text-[10px] font-bold flex items-center gap-1 border border-white/15 opacity-0 group-hover:opacity-100 transition shadow-lg"
                  title="Search for Artist Portrait Artwork"
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Art</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30">
                  {mode === 'album-artists' ? 'Album Artist Discography' : 'Artist Discography'}
                </span>
                {selectedArtist.genres.slice(0, 4).map((g) => (
                  <span
                    key={g}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10"
                  >
                    {g}
                  </span>
                ))}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold jw-text-artist tracking-tight">
                {selectedArtist.name}
              </h1>
              <p className="text-xs text-slate-400 max-w-2xl line-clamp-2">
                {selectedArtist.bio}
              </p>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-300 pt-1">
                <span>{artistAlbums.length} Releases</span>
                <span>•</span>
                <span>
                  {Math.max(selectedArtist.trackCount || 0, artistAllTracks.length)} Tracks
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {artistAllTracks.length > 0 && onPlayQueue && (
              <>
                <button
                  onClick={() => onPlayQueue(artistAllTracks.slice(0, 250))}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--fin-accent)] text-slate-950 font-bold text-xs hover:opacity-90 transition shadow-lg shadow-cyan-500/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Artist</span>
                </button>
                <button
                  onClick={() => {
                    const shuffled = [...artistAllTracks].sort(() => Math.random() - 0.5);
                    onPlayQueue(shuffled.slice(0, 250));
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

        {/* Discography Release Type Tabs (Studio, Live, EPs, Singles, Bootlegs) + Drag Drop */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedReleaseType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                selectedReleaseType === 'all'
                  ? 'bg-[var(--fin-accent)] text-slate-950 border-[var(--fin-accent)]'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
              }`}
            >
              All ({artistAlbums.length})
            </button>
            {RELEASE_TYPE_META.map((rt) => {
              const count = artistAlbums.filter((a) => getAlbumReleaseType(a) === rt.id).length;
              const isDrop = dropTargetType === rt.id;
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
                  title={`Click to filter ${rt.label}, or drag any album below onto this tab to classify it as ${rt.shortLabel}`}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition border ${
                    isDrop
                      ? 'border-amber-400 bg-amber-500/25 text-white scale-105'
                      : selectedReleaseType === rt.id
                      ? 'bg-[var(--fin-accent)] text-slate-950 border-[var(--fin-accent)] font-bold'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                  }`}
                >
                  {rt.shortLabel} ({count})
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
            <span className="text-[10px] font-mono text-slate-400 px-2">Sort Albums:</span>
            {(
              [
                { id: 'year-desc', label: 'Newest' },
                { id: 'year-asc', label: 'Oldest' },
                { id: 'release-type', label: 'Release Type' },
                { id: 'title-asc', label: 'Title A–Z' },
              ] as { id: DiscographySort; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDiscogSort(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  discogSort === opt.id
                    ? 'bg-[var(--fin-accent)] text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Albums Discography List */}
        {loadingDiscography ? (
          <div className="py-12 flex items-center justify-center gap-2 text-xs font-mono text-cyan-300">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Loading {selectedArtist.name} discography...</span>
          </div>
        ) : sortedDiscography.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
            <p className="text-xs text-slate-300 font-semibold">
              No releases in this category for {selectedArtist.name}.
            </p>
            {artistAllTracks.length > 0 && (
              <div className="pt-4 text-left divide-y divide-white/5">
                {artistAllTracks.map((t, i) => (
                  <div
                    key={t.id}
                    onClick={() => onPlayTrack(t, artistAllTracks, i)}
                    onContextMenu={(e) => {
                      if (onContextMenuTrack) {
                        e.preventDefault();
                        onContextMenuTrack(e, t);
                      }
                    }}
                    className="py-2.5 px-3 flex items-center justify-between hover:bg-white/5 rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={resolveCoverArt(t.coverUrl)}
                        onError={handleCoverImgError}
                        alt=""
                        className="w-9 h-9 rounded-lg object-cover"
                      />
                      <div>
                        <p className="text-xs font-bold jw-text-track">{t.title}</p>
                        <p className="text-[11px] jw-text-album">
                          {t.album} ({t.year})
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {formatDuration(t.duration)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDiscography.map((album) => {
              const isExpanded = expandedAlbumId === album.id;
              const albTracks = expandedAlbumTracks[album.id] || album.tracks || [];
              const isLoadingThis = loadingAlbumId === album.id;
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
                  className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden transition"
                >
                  {/* Album Row Banner */}
                  <div
                    onClick={() => handleToggleExpandAlbum(album)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.06] transition"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={resolveCoverArt(album.coverUrl)}
                        onError={handleCoverImgError}
                        alt={album.title}
                        className="w-20 h-20 rounded-xl object-cover shadow-lg border border-white/10 shrink-0 bg-black/40"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${relBadge.badgeClass}`}
                          >
                            {relBadge.shortLabel}
                          </span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                            {album.year}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {album.genre}
                          </span>
                        </div>
                        <h3
                          onClick={(e) => {
                            if (onNavigateToAlbum) {
                              e.stopPropagation();
                              onNavigateToAlbum(album.title, album.id);
                            }
                          }}
                          className="text-base font-extrabold jw-text-album mt-1 hover:underline transition w-fit"
                          title="Click to open dedicated Album page"
                        >
                          {album.title}
                        </h3>
                        <p className="text-xs jw-text-artist mt-0.5">
                          {album.artist} • {albTracks.length || album.trackCount || 'All'} tracks
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => handlePlayWholeAlbum(e, album)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--fin-accent)] text-slate-950 font-bold text-xs hover:opacity-90 transition shadow"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play Album</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleExpandAlbum(album);
                        }}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 border border-white/10 transition"
                      >
                        {isExpanded ? 'Hide Tracks' : 'View Tracks'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Album Tracks Table */}
                  {isExpanded && (
                    <div className="border-t border-white/10 bg-black/30 p-3">
                      {isLoadingThis ? (
                        <div className="py-6 flex items-center justify-center gap-2 text-xs font-mono text-cyan-300">
                          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                          <span>Loading album tracks...</span>
                        </div>
                      ) : albTracks.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-500">
                          No tracks found for this album.
                        </div>
                      ) : (
                        <div className="divide-y divide-white/5">
                          {albTracks.map((t, idx) => {
                            const isPlayingTrack = currentTrack?.id === t.id;
                            return (
                              <div
                                key={`${t.id}-${idx}`}
                                onClick={() => onPlayTrack(t, albTracks, idx)}
                                onContextMenu={(e) => {
                                  if (onContextMenuTrack) {
                                    e.preventDefault();
                                    onContextMenuTrack(e, t);
                                  }
                                }}
                                className={`py-2.5 px-3 flex items-center justify-between hover:bg-white/5 rounded-xl cursor-pointer group transition ${
                                  isPlayingTrack ? 'bg-[var(--fin-accent)]/15' : ''
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-xs font-mono text-slate-500 w-6 text-center group-hover:hidden">
                                    {t.trackNumber || idx + 1}
                                  </span>
                                  <Play className="w-3.5 h-3.5 text-[var(--fin-accent)] fill-current hidden group-hover:block shrink-0" />
                                  <div className="min-w-0">
                                    <p
                                      className={`text-xs font-semibold truncate ${
                                        isPlayingTrack
                                          ? 'text-[var(--fin-accent)] font-bold'
                                          : 'jw-text-track'
                                      }`}
                                    >
                                      {t.title}
                                    </p>
                                    {t.artist !== album.artist && (
                                      <p className="text-[10px] jw-text-artist truncate">
                                        {t.artist}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-[10px] font-mono text-cyan-300/80 px-2 py-0.5 rounded bg-white/5 hidden sm:inline">
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // VIRTUALIZED ARTISTS / ALBUM ARTISTS DIRECTORY GRID (4 LAYOUT STYLES)
  // ==========================================================================
  const totalRows = Math.ceil(sortedArtists.length / cols);
  const totalHeight = totalRows * rowHeight;
  const overscanRows = 4;
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscanRows);
  const endRow = Math.min(
    totalRows,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscanRows
  );

  const visibleRows: Artist[][] = [];
  if (viewStyle !== 'magazine') {
    for (let r = startRow; r < endRow; r++) {
      visibleRows.push(sortedArtists.slice(r * cols, (r + 1) * cols));
    }
  }

  const displayTotal =
    totalArtistCount && totalArtistCount > sortedArtists.length
      ? totalArtistCount
      : sortedArtists.length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/5 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            {mode === 'album-artists' ? (
              <UserCheck className="w-5 h-5 text-[var(--fin-accent)]" />
            ) : (
              <Users className="w-5 h-5 text-[var(--fin-accent)]" />
            )}
            <h2 className="text-xl font-bold text-white tracking-tight">
              {mode === 'album-artists' ? 'Album Artists' : 'Artists & Performers'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {sortedArtists.length.toLocaleString()}
            {displayTotal > sortedArtists.length ? ` of ${displayTotal.toLocaleString()}` : ''}{' '}
            {mode === 'album-artists' ? 'primary album artists' : 'artists'} • Click any artist to browse their album discography
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Artist Layout Style Switcher (4 distinct layout styles) */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {(
              [
                { id: 'cards', label: 'Cards', icon: LayoutGrid },
                { id: 'circles', label: 'Portraits', icon: CircleDot },
                { id: 'magazine', label: 'Discog Preview', icon: BookOpen },
                { id: 'compact', label: 'Compact List', icon: List },
              ] as { id: ArtistViewLayoutStyle; label: string; icon: any }[]
            ).map((st) => {
              const Icon = st.icon;
              return (
                <button
                  key={st.id}
                  onClick={() => onUpdateLayout?.({ artistViewStyle: st.id })}
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

          {/* Grid Columns Density Selector */}
          {onUpdateLayout && viewStyle !== 'magazine' && (
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <span className="text-[10px] font-mono text-slate-500 px-1.5 uppercase font-bold">Cols</span>
              {[1, 2, 3, 4, 6].map((c) => (
                <button
                  key={c}
                  onClick={() => onUpdateLayout({ artistGridColumns: c })}
                  className={`w-6 h-6 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center ${
                    (layoutConfig?.artistGridColumns ?? 3) === c
                      ? 'bg-[var(--fin-accent)] text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={`${c} Columns`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Artist Sort Bar */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400 ml-2 mr-1" />
            {(
              [
                { id: 'name-asc', label: 'Name A–Z' },
                { id: 'name-desc', label: 'Name Z–A' },
                { id: 'albums', label: 'Most Albums' },
                { id: 'tracks', label: 'Most Tracks' },
                { id: 'plays', label: 'Most Played' },
              ] as { id: ArtistSortField; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setArtistSort(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  artistSort === opt.id
                    ? 'bg-[var(--fin-accent)] text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Directory Viewport */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative pt-4"
      >
        {/* MAGAZINE LAYOUT WITH MINI ALBUM COVERS */}
        {viewStyle === 'magazine' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-8">
            {sortedArtists.slice(0, 120).map((artist) => {
              const portrait = resolveArtistPortrait(artist);
              const lower = artist.name.toLowerCase();
              const artistAlbs = albums
                .filter((a) => a.artist.toLowerCase() === lower)
                .slice(0, 4);
              const albCount =
                albumCountByArtist.get(lower) || artist.albums?.length || artistAlbs.length;

              return (
                <div
                  key={artist.id}
                  onClick={() => openArtistDiscography(artist)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onContextMenuArtist?.(e, artist);
                  }}
                  className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[var(--fin-accent)]/40 cursor-pointer transition flex items-center justify-between gap-4 group"
                  title="Right-click for options (Search artwork, play, etc.)"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={resolveCoverArt(portrait)}
                      onError={handleCoverImgError}
                      alt={artist.name}
                      loading="lazy"
                      className="w-20 h-20 rounded-2xl object-cover shadow-xl border border-white/15 shrink-0 bg-black/40 group-hover:scale-105 transition"
                    />
                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold jw-text-artist truncate group-hover:text-[var(--fin-accent)] transition">
                        {artist.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {albCount} {albCount === 1 ? 'album' : 'albums'}
                        {artist.trackCount ? ` • ${artist.trackCount} tracks` : ''}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {artist.genres.slice(0, 3).map((g) => (
                          <span
                            key={g}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Mini Album Art Stack */}
                  {artistAlbs.length > 0 && (
                    <div className="hidden sm:flex items-center -space-x-3 shrink-0 pr-1">
                      {artistAlbs.map((alb) => (
                        <img
                          key={alb.id}
                          src={resolveCoverArt(resolveAlbumArtwork(alb))}
                          onError={handleCoverImgError}
                          alt={alb.title}
                          title={alb.title}
                          className="w-11 h-11 rounded-lg object-cover border-2 border-[#0b0f1b] shadow-md"
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* VIRTUALIZED GRID FOR 'cards' | 'circles' | 'compact' */
          <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${startRow * rowHeight}px)`,
              }}
              className="space-y-4"
            >
              {visibleRows.map((rowArtists, rowIdx) => (
                <div
                  key={`artist-row-${startRow + rowIdx}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    height: `${rowHeight - 16}px`,
                  }}
                  className="gap-4"
                >
                  {rowArtists.map((artist) => {
                    const portrait = resolveArtistPortrait(artist);
                    const albCount =
                      albumCountByArtist.get(artist.name.toLowerCase()) ||
                      artist.albums?.length ||
                      0;

                    const isHighDensity = cols >= 4;

                    if (viewStyle === 'circles') {
                      return (
                        <div
                          key={artist.id}
                          onClick={() => openArtistDiscography(artist)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            onContextMenuArtist?.(e, artist);
                          }}
                          className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/10 border border-white/5 hover:border-[var(--fin-accent)]/40 cursor-pointer transition flex flex-col items-center justify-center text-center group overflow-hidden"
                          title={`Right-click for options (Search artwork, play, etc.)`}
                        >
                          <img
                            src={resolveCoverArt(portrait)}
                            onError={handleCoverImgError}
                            alt={artist.name}
                            loading="lazy"
                            className="w-20 sm:w-24 h-20 sm:h-24 rounded-full object-cover shadow-xl border-2 border-white/15 group-hover:border-[var(--fin-accent)] group-hover:scale-105 transition bg-black/40"
                          />
                          <h3 className="text-xs font-extrabold jw-text-artist truncate w-full mt-2.5 group-hover:text-[var(--fin-accent)] transition">
                            {artist.name}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {albCount > 0 ? `${albCount} albums` : 'Discography'}
                          </p>
                        </div>
                      );
                    }

                    if (viewStyle === 'compact') {
                      return (
                        <div
                          key={artist.id}
                          onClick={() => openArtistDiscography(artist)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            onContextMenuArtist?.(e, artist);
                          }}
                          className={`px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/5 hover:border-[var(--fin-accent)]/30 cursor-pointer transition flex items-center justify-between gap-2 group overflow-hidden min-w-0`}
                          title={`Right-click for options (Search artwork, play, etc.)`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                            <img
                              src={resolveCoverArt(portrait)}
                              onError={handleCoverImgError}
                              alt={artist.name}
                              loading="lazy"
                              className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0 bg-black/40"
                            />
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <span className="text-xs font-bold jw-text-artist truncate group-hover:text-[var(--fin-accent)] block w-full leading-snug">
                                {artist.name}
                              </span>
                              {!isHighDensity && (
                                <span className="text-[10px] text-slate-500 truncate block">
                                  {artist.genres?.slice(0, 2).join(' · ') || 'Artist'}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono text-slate-400">
                            {albCount > 0 && (
                              <span
                                className={`px-1.5 py-0.5 rounded bg-white/5 text-slate-300 whitespace-nowrap font-medium ${
                                  isHighDensity ? 'text-[9px] text-cyan-300/80 bg-cyan-950/40 border border-cyan-500/20' : ''
                                }`}
                                title={`${albCount} albums`}
                              >
                                {isHighDensity ? `${albCount} alb` : `${albCount} ${albCount === 1 ? 'album' : 'albums'}`}
                              </span>
                            )}
                            {!isHighDensity && artist.trackCount > 0 && (
                              <span className="text-slate-500 hidden xl:inline whitespace-nowrap">
                                • {artist.trackCount} trk
                              </span>
                            )}
                            {!isHighDensity && (
                              <Disc className="w-3.5 h-3.5 text-cyan-400 opacity-60 group-hover:opacity-100 shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Default 'cards' layout
                    return (
                      <div
                        key={artist.id}
                        onClick={() => openArtistDiscography(artist)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          onContextMenuArtist?.(e, artist);
                        }}
                        className="p-3.5 sm:p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/30 cursor-pointer transition flex items-center gap-3 sm:gap-4 group overflow-hidden min-w-0"
                        title={`Right-click for options (Search artwork, play, etc.)`}
                      >
                        <img
                          src={resolveCoverArt(portrait)}
                          onError={handleCoverImgError}
                          alt={artist.name}
                          loading="lazy"
                          className={`${
                            isHighDensity ? 'w-11 h-11' : 'w-14 h-14'
                          } rounded-full object-cover shadow-lg border border-white/10 group-hover:scale-105 transition shrink-0 bg-black/40`}
                        />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <h3 className="text-xs sm:text-sm font-bold jw-text-artist group-hover:text-[var(--fin-accent)] transition truncate block w-full">
                            {artist.name}
                          </h3>
                          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">
                            {albCount > 0 ? `${albCount} alb${albCount > 1 ? 's' : ''}` : 'Discography'}
                            {!isHighDensity && artist.trackCount
                              ? ` • ${artist.trackCount} trks`
                              : ''}
                          </p>
                          {!isHighDensity && artist.genres.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {artist.genres.slice(0, 2).map((g) => (
                                <span
                                  key={g}
                                  className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-white/5 text-slate-300 border border-white/10 truncate max-w-[90px]"
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
