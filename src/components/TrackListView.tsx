import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Heart,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ListPlus,
  Tag,
  Columns,
  Loader2,
} from 'lucide-react';
import { Track, TrackListDensity, LayoutConfig, LibrarySyncProgress } from '../types/index.ts';
import { formatDuration } from '../utils/audioMath.ts';
import { DEFAULT_LAYOUT_CONFIG } from '../services/layoutEngine.ts';
import { resolveCoverArt, handleCoverImgError } from '../utils/jellywispArtwork.ts';

interface TrackListViewProps {
  tracks: Track[];
  titleOverride?: string;
  subtitleOverride?: string;
  totalTrackCount?: number;
  syncProgress?: LibrarySyncProgress | null;
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, contextTracks?: Track[], indexInContext?: number) => void;
  onAddToQueue: (track: Track) => void;
  onOpenMetadataEditor: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  onNavigateToArtist?: (artistName: string) => void;
  onNavigateToAlbumArtist?: (albumArtistName: string) => void;
  onNavigateToAlbum?: (albumTitle: string, albumId?: string) => void;
  onNavigateToGenre?: (genre: string) => void;
  onNavigateToDecade?: (decade: string) => void;
  onContextMenuTrack?: (e: React.MouseEvent, track: Track) => void;
  onContextMenuArtist?: (e: React.MouseEvent, artistName: string) => void;
  density?: TrackListDensity;
  showTrackBitrate?: boolean;
  layoutConfig?: LayoutConfig;
  onUpdateLayout?: (partial: Partial<LayoutConfig>) => void;
}

export type SortField =
  | 'default'
  | 'title'
  | 'artist'
  | 'albumArtist'
  | 'album'
  | 'genre'
  | 'decade'
  | 'year'
  | 'bpm'
  | 'duration'
  | 'bitrate'
  | 'playCount';

export const TrackListView: React.FC<TrackListViewProps> = ({
  tracks,
  titleOverride,
  subtitleOverride,
  totalTrackCount,
  syncProgress,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onAddToQueue,
  onOpenMetadataEditor,
  onToggleFavorite,
  onNavigateToArtist,
  onNavigateToAlbumArtist,
  onNavigateToAlbum,
  onNavigateToGenre,
  onNavigateToDecade,
  onContextMenuTrack,
  onContextMenuArtist,
  density = 'standard',
  layoutConfig,
  onUpdateLayout,
}) => {
  const [sortField, setSortField] = useState<SortField>('default');
  const [sortAsc, setSortAsc] = useState(true);
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Virtualization state
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(700);

  const cols = {
    ...DEFAULT_LAYOUT_CONFIG.visibleColumns,
    ...(layoutConfig?.visibleColumns || {}),
  };

  // Exact pixel row height for 60fps virtualized scrolling
  const defaultDensityHeight =
    density === 'compact' ? 40 : density === 'spacious' ? 64 : 52;
  const rowHeight = layoutConfig?.trackRowHeightPx || defaultDensityHeight;
  const thumbSize = Math.min(rowHeight - 8, layoutConfig?.trackThumbnailSizePx ?? 38);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      setViewportHeight(el.clientHeight || 700);
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60 hover:opacity-100" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-[var(--fin-accent)] font-bold" title="Sorted Ascending" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[var(--fin-accent)] font-bold" title="Sorted Descending" />
    );
  };

  // Memoized sorting so 80,000+ tracks are NEVER re-sorted on playback timeupdate ticks
  const sortedTracks = useMemo(() => {
    if (sortField === 'default') {
      return sortAsc ? tracks : [...tracks].reverse();
    }
    const copy = [...tracks];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortField === 'artist') cmp = a.artist.localeCompare(b.artist);
      else if (sortField === 'albumArtist') {
        cmp = (a.albumArtist || a.artist).localeCompare(b.albumArtist || b.artist);
      } else if (sortField === 'album') cmp = a.album.localeCompare(b.album);
      else if (sortField === 'genre') cmp = a.genre.localeCompare(b.genre);
      else if (sortField === 'decade') {
        const decA = Math.floor((a.year || 2000) / 10) * 10;
        const decB = Math.floor((b.year || 2000) / 10) * 10;
        cmp = decA - decB || (a.year || 0) - (b.year || 0);
      } else if (sortField === 'year') cmp = (a.year || 0) - (b.year || 0);
      else if (sortField === 'bpm') cmp = (a.bpm || 0) - (b.bpm || 0);
      else if (sortField === 'duration') cmp = a.duration - b.duration;
      else if (sortField === 'bitrate') cmp = a.bitrate - b.bitrate;
      else if (sortField === 'playCount') cmp = a.playCount - b.playCount;
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [tracks, sortField, sortAsc]);

  const toggleColumn = (key: keyof typeof cols) => {
    if (!onUpdateLayout) return;
    onUpdateLayout({
      visibleColumns: {
        ...cols,
        [key]: !cols[key],
      },
    });
  };

  // Virtual window calculation
  const totalRows = sortedTracks.length;
  const totalHeight = totalRows * rowHeight;
  const overscan = 10;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    totalRows,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan
  );
  const visibleTracks = sortedTracks.slice(startIndex, endIndex);
  const offsetY = startIndex * rowHeight;

  const displayTotal =
    totalTrackCount && totalTrackCount > tracks.length ? totalTrackCount : tracks.length;
  const isIndexing = Boolean(syncProgress && !syncProgress.isComplete);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 select-none">
      {/* Table Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/5 relative">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {titleOverride || 'All Library Tracks'}
            </h2>
            {isIndexing && syncProgress && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[11px] font-mono text-cyan-300">
                <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                <span>
                  Indexing {syncProgress.loadedTracks.toLocaleString()} /{' '}
                  {syncProgress.totalTracks.toLocaleString()}
                </span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
            {subtitleOverride ||
              `${tracks.length.toLocaleString()}${
                displayTotal > tracks.length ? ` of ${displayTotal.toLocaleString()}` : ''
              } tracks`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sort By Dropdown (includes Album Artist, Decade, Genre, BPM, Year, etc.) */}
          <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-400">Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => {
                setSortField(e.target.value as SortField);
              }}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="default" className="bg-[#0d1220]">Default Order</option>
              <option value="albumArtist" className="bg-[#0d1220]">Album Artist</option>
              <option value="artist" className="bg-[#0d1220]">Track Artist</option>
              <option value="title" className="bg-[#0d1220]">Track Title</option>
              <option value="album" className="bg-[#0d1220]">Album</option>
              <option value="genre" className="bg-[#0d1220]">Genre</option>
              <option value="decade" className="bg-[#0d1220]">Decade (60s, 70s, 80s...)</option>
              <option value="year" className="bg-[#0d1220]">Release Year</option>
              <option value="bpm" className="bg-[#0d1220]">Tempo (BPM)</option>
              <option value="duration" className="bg-[#0d1220]">Duration</option>
              <option value="bitrate" className="bg-[#0d1220]">Bitrate</option>
              <option value="playCount" className="bg-[#0d1220]">Play Count</option>
            </select>
            <button
              onClick={() => setSortAsc((v) => !v)}
              className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono text-cyan-300"
              title="Toggle Ascending / Descending"
            >
              {sortAsc ? 'ASC ↑' : 'DESC ↓'}
            </button>
          </div>

          {/* Quick Table Columns & Density Popover */}
          {onUpdateLayout && (
            <div className="relative">
              <button
                onClick={() => setShowColumnMenu((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition"
                title="Show or Hide Tracklist Columns"
              >
                <Columns className="w-3.5 h-3.5 text-cyan-400" />
                <span>Columns & Fields</span>
              </button>

              {showColumnMenu && (
                <div className="absolute right-0 mt-2 w-68 rounded-2xl bg-[#0e1322] border border-white/15 shadow-2xl p-3.5 z-40 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                      Show / Hide Table Columns
                    </span>
                    <button
                      onClick={() => setShowColumnMenu(false)}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Done
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {(
                      [
                        { key: 'index', label: '# Index' },
                        { key: 'artwork', label: 'Artwork' },
                        { key: 'albumArtist', label: 'Album Artist' },
                        { key: 'album', label: 'Album' },
                        { key: 'genre', label: 'Genre' },
                        { key: 'decade', label: 'Decade' },
                        { key: 'year', label: 'Year' },
                        { key: 'bpm', label: 'BPM Tempo' },
                        { key: 'codec', label: 'Codec/PCM' },
                        { key: 'bitrate', label: 'Bitrate' },
                        { key: 'replayGain', label: 'ReplayGain' },
                        { key: 'playCount', label: 'Plays' },
                        { key: 'favorite', label: 'Favorite' },
                      ] as const
                    ).map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer text-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={cols[item.key]}
                          onChange={() => toggleColumn(item.key)}
                          className="rounded text-cyan-400"
                        />
                        <span className="text-[11px]">{item.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Zebra Striping</span>
                    <input
                      type="checkbox"
                      checked={layoutConfig?.zebraStriping !== false}
                      onChange={(e) => onUpdateLayout({ zebraStriping: e.target.checked })}
                      className="rounded text-cyan-400"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Flexible Table Headers */}
      <div className="flex items-center gap-3 px-4 py-2.5 text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider border-b border-white/5 mt-2 shrink-0">
        {cols.index && <div className="w-10 text-center shrink-0">#</div>}

        <div
          className="flex-1 min-w-[180px] cursor-pointer hover:text-white flex items-center gap-1"
          onClick={() => handleSort('title')}
        >
          <span>Title & Artist</span>
          {renderSortIcon('title')}
        </div>

        {cols.albumArtist && (
          <div
            className="w-36 hidden md:flex cursor-pointer hover:text-white items-center gap-1 shrink-0"
            onClick={() => handleSort('albumArtist')}
          >
            <span>Album Artist</span>
            {renderSortIcon('albumArtist')}
          </div>
        )}

        {cols.album && (
          <div
            className="w-40 hidden md:flex cursor-pointer hover:text-white items-center gap-1 shrink-0"
            onClick={() => handleSort('album')}
          >
            <span>Album</span>
            {renderSortIcon('album')}
          </div>
        )}

        {cols.genre && (
          <div
            className="w-28 hidden lg:flex cursor-pointer hover:text-white items-center gap-1 shrink-0"
            onClick={() => handleSort('genre')}
          >
            <span>Genre</span>
            {renderSortIcon('genre')}
          </div>
        )}

        {cols.decade && (
          <div
            className="w-20 hidden xl:flex cursor-pointer hover:text-white items-center gap-1 shrink-0"
            onClick={() => handleSort('decade')}
          >
            <span>Decade</span>
            {renderSortIcon('decade')}
          </div>
        )}

        {cols.year && (
          <div
            className="w-16 hidden xl:flex cursor-pointer hover:text-white items-center gap-1 shrink-0"
            onClick={() => handleSort('year')}
          >
            <span>Year</span>
            {renderSortIcon('year')}
          </div>
        )}

        {cols.bpm && (
          <div
            className="w-16 hidden xl:flex cursor-pointer hover:text-white items-center gap-1 shrink-0"
            onClick={() => handleSort('bpm')}
          >
            <span>BPM</span>
            {renderSortIcon('bpm')}
          </div>
        )}

        {(cols.codec || cols.bitrate || cols.replayGain) && (
          <div
            className="w-40 hidden lg:flex cursor-pointer hover:text-white items-center gap-1 shrink-0"
            onClick={() => handleSort('bitrate')}
          >
            <span>Audio Specs</span>
            {renderSortIcon('bitrate')}
          </div>
        )}

        {cols.playCount && (
          <div
            className="w-14 hidden xl:flex cursor-pointer hover:text-white items-center justify-end gap-1 shrink-0"
            onClick={() => handleSort('playCount')}
          >
            <span>Plays</span>
            {renderSortIcon('playCount')}
          </div>
        )}

        <div
          className="w-14 cursor-pointer hover:text-white flex items-center justify-end gap-1 shrink-0"
          onClick={() => handleSort('duration')}
        >
          <span>Duration</span>
          {renderSortIcon('duration')}
        </div>

        <div className="w-20 text-right shrink-0">Actions</div>
      </div>

      {/* 60fps Virtualized Tracks Viewport */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative"
      >
        {totalRows === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            No tracks found matching criteria.
          </div>
        ) : (
          <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${offsetY}px)`,
              }}
            >
              {visibleTracks.map((track, localIdx) => {
                const idx = startIndex + localIdx;
                const isCurrent = currentTrack?.id === track.id;
                const isZebra = layoutConfig?.zebraStriping !== false && idx % 2 === 1;
                const decadeLabel = track.year
                  ? `${Math.floor(track.year / 10) * 10}s`
                  : '—';

                return (
                  <div
                    key={`${track.id}-${idx}`}
                    style={{ height: `${rowHeight}px` }}
                    onClick={() => onPlayTrack(track, sortedTracks, idx)}
                    onContextMenu={(e) => {
                      if (onContextMenuTrack) {
                        e.preventDefault();
                        onContextMenuTrack(e, track);
                      }
                    }}
                    className={`flex items-center gap-3 px-4 border-b border-white/[0.04] hover:bg-white/10 transition group cursor-pointer ${
                      isCurrent
                        ? 'bg-[var(--fin-accent)]/15'
                        : isZebra
                        ? 'bg-white/[0.02]'
                        : ''
                    }`}
                  >
                    {/* Index / Play Icon */}
                    {cols.index && (
                      <div className="w-10 text-center flex items-center justify-center shrink-0">
                        <span
                          className={`text-[11px] font-mono group-hover:hidden ${
                            isCurrent ? 'text-[var(--fin-accent)] font-bold' : 'text-slate-500'
                          }`}
                        >
                          {isCurrent && isPlaying ? '▶' : idx + 1}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayTrack(track, sortedTracks, idx);
                          }}
                          className="hidden group-hover:flex p-1 text-[var(--fin-accent)] hover:scale-110 transition"
                          title="Play track"
                        >
                          {isCurrent && isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Title, Artist & Artwork */}
                    <div className="flex-1 min-w-[180px] flex items-center gap-3 overflow-hidden">
                      {cols.artwork && (
                        <img
                          src={resolveCoverArt(track.coverUrl)}
                          onError={handleCoverImgError}
                          alt=""
                          loading="lazy"
                          onClick={(e) => {
                            if (onNavigateToAlbum) {
                              e.stopPropagation();
                              onNavigateToAlbum(track.album, track.albumId);
                            }
                          }}
                          style={{ width: `${thumbSize}px`, height: `${thumbSize}px` }}
                          className="rounded-lg object-cover shrink-0 border border-white/10 shadow bg-black/40 hover:scale-105 transition"
                          title={`Go to Album: ${track.album}`}
                        />
                      )}
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isCurrent ? 'text-[var(--fin-accent)] font-bold' : 'jw-text-track'
                          }`}
                        >
                          {track.title}
                        </p>
                        <p
                          onClick={(e) => {
                            if (onNavigateToArtist) {
                              e.stopPropagation();
                              onNavigateToArtist(track.artist);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onContextMenuArtist?.(e, track.artist);
                          }}
                          className="text-[11px] jw-text-artist hover:underline truncate w-fit"
                          title={`Click for ${track.artist} • Right-click for Artist Options`}
                        >
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    {/* Album Artist (Clickable) */}
                    {cols.albumArtist && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetName = track.albumArtist || track.artist;
                          if (onNavigateToAlbumArtist) {
                            onNavigateToAlbumArtist(targetName);
                          } else if (onNavigateToArtist) {
                            onNavigateToArtist(targetName);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onContextMenuArtist?.(e, track.albumArtist || track.artist);
                        }}
                        className="w-36 text-xs jw-text-artist hover:underline truncate hidden md:block shrink-0"
                        title={`Click for Album Artist: ${track.albumArtist || track.artist} • Right-click for Artist Options`}
                      >
                        {track.albumArtist || track.artist}
                      </div>
                    )}

                    {/* Album (Clickable!) */}
                    {cols.album && (
                      <div
                        onClick={(e) => {
                          if (onNavigateToAlbum) {
                            e.stopPropagation();
                            onNavigateToAlbum(track.album, track.albumId);
                          }
                        }}
                        className="w-40 text-xs jw-text-album hover:underline truncate hidden md:block shrink-0"
                        title={`Go to Album: ${track.album}`}
                      >
                        {track.album}
                      </div>
                    )}

                    {/* Genre (Clickable!) */}
                    {cols.genre && (
                      <div className="w-28 text-[11px] text-slate-300 truncate hidden lg:block shrink-0">
                        <span
                          onClick={(e) => {
                            if (onNavigateToGenre) {
                              e.stopPropagation();
                              onNavigateToGenre(track.genre);
                            }
                          }}
                          className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/15 border border-white/5 hover:border-cyan-400/40 transition"
                          title={`Browse Genre: ${track.genre}`}
                        >
                          {track.genre}
                        </span>
                      </div>
                    )}

                    {/* Decade (Clickable!) */}
                    {cols.decade && (
                      <div
                        onClick={(e) => {
                          if (onNavigateToDecade && decadeLabel !== '—') {
                            e.stopPropagation();
                            onNavigateToDecade(decadeLabel);
                          }
                        }}
                        className="w-20 text-xs font-mono text-cyan-300/80 hover:underline hidden xl:block shrink-0"
                        title={`Browse Decade: ${decadeLabel}`}
                      >
                        {decadeLabel}
                      </div>
                    )}

                    {/* Year (Clickable -> Decade) */}
                    {cols.year && (
                      <div
                        onClick={(e) => {
                          if (onNavigateToDecade && decadeLabel !== '—') {
                            e.stopPropagation();
                            onNavigateToDecade(decadeLabel);
                          }
                        }}
                        className="w-16 text-xs font-mono text-slate-400 hover:text-cyan-300 hidden xl:block shrink-0"
                        title={`Browse ${decadeLabel}`}
                      >
                        {track.year}
                      </div>
                    )}

                    {/* BPM */}
                    {cols.bpm && (
                      <div className="w-16 text-xs font-mono text-slate-400 hidden xl:block shrink-0">
                        {Math.round(track.bpm)}
                      </div>
                    )}

                    {/* Hi-Res Specs */}
                    {(cols.codec || cols.bitrate || cols.replayGain) && (
                      <div className="w-40 hidden lg:flex items-center gap-1.5 shrink-0 flex-wrap">
                        {cols.codec && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 font-medium">
                            {track.codec} {Math.round(track.sampleRate / 1000)}k/{track.bitDepth}b
                          </span>
                        )}
                        {cols.bitrate && (
                          <span className="text-[9px] font-mono text-slate-400">
                            {Math.round(track.bitrate)}kbps
                          </span>
                        )}
                        {cols.replayGain && track.replayGain && (
                          <span className="text-[9px] font-mono text-emerald-400">
                            {track.replayGain > 0 ? '+' : ''}
                            {Math.round(track.replayGain)}dB
                          </span>
                        )}
                      </div>
                    )}

                    {/* Play Count */}
                    {cols.playCount && (
                      <div className="w-14 text-right text-xs font-mono text-slate-400 hidden xl:block shrink-0">
                        {track.playCount}
                      </div>
                    )}

                    {/* Duration */}
                    <div className="w-14 text-right text-xs font-mono text-slate-400 shrink-0 tabular-nums">
                      {formatDuration(track.duration)}
                    </div>

                    {/* Actions */}
                    <div className="w-20 flex items-center justify-end gap-1 shrink-0">
                      {cols.favorite && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(track.id);
                          }}
                          className={`p-1 transition ${
                            track.isFavorite
                              ? 'text-rose-500'
                              : 'text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100'
                          }`}
                          title="Favorite"
                        >
                          <Heart className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToQueue(track);
                        }}
                        className="p-1 text-slate-500 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition"
                        title="Add to Up Next Queue"
                      >
                        <ListPlus className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMetadataEditor(track);
                        }}
                        className="p-1 text-slate-500 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition"
                        title="Edit Metadata & Artwork"
                      >
                        <Tag className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
