import React, { useState } from 'react';
import {
  Play,
  Heart,
  Clock,
  ArrowUpDown,
  ListPlus,
  Tag,
  Columns,
} from 'lucide-react';
import { Track, TrackListDensity, LayoutConfig } from '../types/index.ts';
import { formatDuration } from '../utils/audioMath.ts';
import { getDensityRowClass } from '../utils/layoutMath.ts';

import { DEFAULT_LAYOUT_CONFIG } from '../services/layoutEngine.ts';

interface TrackListViewProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onOpenMetadataEditor: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  density?: TrackListDensity;
  showTrackBitrate?: boolean;
  layoutConfig?: LayoutConfig;
  onUpdateLayout?: (partial: Partial<LayoutConfig>) => void;
}

type SortField = 'title' | 'artist' | 'album' | 'genre' | 'year' | 'duration' | 'bitrate' | 'playCount';

export const TrackListView: React.FC<TrackListViewProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onAddToQueue,
  onOpenMetadataEditor,
  onToggleFavorite,
  density = 'standard',
  layoutConfig,
  onUpdateLayout,
}) => {
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortAsc, setSortAsc] = useState(true);
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const densityStyles = getDensityRowClass(density);
  const cols = layoutConfig?.visibleColumns || DEFAULT_LAYOUT_CONFIG.visibleColumns;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedTracks = [...tracks].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'title') cmp = a.title.localeCompare(b.title);
    else if (sortField === 'artist') cmp = a.artist.localeCompare(b.artist);
    else if (sortField === 'album') cmp = a.album.localeCompare(b.album);
    else if (sortField === 'genre') cmp = a.genre.localeCompare(b.genre);
    else if (sortField === 'year') cmp = a.year - b.year;
    else if (sortField === 'duration') cmp = a.duration - b.duration;
    else if (sortField === 'bitrate') cmp = a.bitrate - b.bitrate;
    else if (sortField === 'playCount') cmp = a.playCount - b.playCount;
    return sortAsc ? cmp : -cmp;
  });

  const toggleColumn = (key: keyof typeof cols) => {
    if (!onUpdateLayout) return;
    onUpdateLayout({
      visibleColumns: {
        ...cols,
        [key]: !cols[key],
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 select-none">
      {/* Table Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5 relative">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">All Library Tracks</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tracks.length} tracks • Lossless audio streaming with customizable tabular columns
          </p>
        </div>

        {/* Quick Table Columns & Density Popover */}
        {onUpdateLayout && (
          <div className="relative">
            <button
              onClick={() => setShowColumnMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition"
              title="Customize Visible Tracklist Columns"
            >
              <Columns className="w-3.5 h-3.5 text-cyan-400" />
              <span>Columns & Density</span>
            </button>

            {showColumnMenu && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#0e1322] border border-white/15 shadow-2xl p-3 z-40 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    Visible Table Columns
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
                      { key: 'album', label: 'Album' },
                      { key: 'genre', label: 'Genre' },
                      { key: 'year', label: 'Year' },
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

      {/* Flexible Table Headers */}
      <div className="flex items-center gap-3 px-4 py-2.5 text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider border-b border-white/5 mt-2">
        {cols.index && <div className="w-8 text-center shrink-0">#</div>}

        <div
          className="flex-1 min-w-[180px] cursor-pointer hover:text-white flex items-center gap-1"
          onClick={() => handleSort('title')}
        >
          <span>Title & Artist</span>
          <ArrowUpDown className="w-3 h-3 text-slate-500" />
        </div>

        {cols.album && (
          <div
            className="w-44 hidden md:flex cursor-pointer hover:text-white items-center gap-1 shrink-0"
            onClick={() => handleSort('album')}
          >
            <span>Album</span>
            <ArrowUpDown className="w-3 h-3 text-slate-500" />
          </div>
        )}

        {cols.genre && (
          <div
            className="w-28 hidden lg:flex cursor-pointer hover:text-white items-center gap-1 shrink-0"
            onClick={() => handleSort('genre')}
          >
            <span>Genre</span>
            <ArrowUpDown className="w-3 h-3 text-slate-500" />
          </div>
        )}

        {cols.year && (
          <div
            className="w-16 hidden xl:flex cursor-pointer hover:text-white items-center gap-1 shrink-0"
            onClick={() => handleSort('year')}
          >
            <span>Year</span>
            <ArrowUpDown className="w-3 h-3 text-slate-500" />
          </div>
        )}

        {(cols.codec || cols.bitrate || cols.replayGain) && (
          <div
            className="w-44 hidden lg:flex cursor-pointer hover:text-white items-center gap-1 shrink-0"
            onClick={() => handleSort('bitrate')}
          >
            <span>Audio Stream Specs</span>
            <ArrowUpDown className="w-3 h-3 text-slate-500" />
          </div>
        )}

        {cols.playCount && (
          <div
            className="w-16 hidden xl:flex cursor-pointer hover:text-white items-center justify-end gap-1 shrink-0"
            onClick={() => handleSort('playCount')}
          >
            <span>Plays</span>
          </div>
        )}

        <div
          className="w-14 cursor-pointer hover:text-white flex items-center justify-end gap-1 shrink-0"
          onClick={() => handleSort('duration')}
        >
          <Clock className="w-3 h-3" />
        </div>

        <div className="w-20 text-right shrink-0">Actions</div>
      </div>

      {/* Tracks Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {sortedTracks.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            No tracks found matching criteria.
          </div>
        ) : (
          sortedTracks.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            const isZebra = layoutConfig?.zebraStriping !== false && idx % 2 === 1;
            const rowHeight = layoutConfig?.trackRowHeightPx;
            const thumbSize = layoutConfig?.trackThumbnailSizePx ?? 40;
            return (
              <div
                key={track.id}
                style={rowHeight ? { minHeight: `${rowHeight}px` } : undefined}
                className={`flex items-center gap-3 px-4 ${densityStyles.py} hover:bg-white/10 transition group cursor-pointer ${
                  isCurrent
                    ? 'bg-[var(--fin-accent)]/15'
                    : isZebra
                    ? 'bg-white/[0.02]'
                    : ''
                }`}
                onDoubleClick={() => onPlayTrack(track)}
              >
                {/* Index / Play Icon */}
                {cols.index && (
                  <div className="w-8 text-center flex items-center justify-center shrink-0">
                    <span
                      className={`text-xs font-mono group-hover:hidden ${
                        isCurrent ? 'text-[var(--fin-accent)] font-bold' : 'text-slate-500'
                      }`}
                    >
                      {isCurrent && isPlaying ? '▶' : idx + 1}
                    </span>
                    <button
                      onClick={() => onPlayTrack(track)}
                      className="hidden group-hover:flex p-1 text-[var(--fin-accent)] hover:scale-110 transition"
                      title="Play track"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                )}

                {/* Title, Artist & Artwork */}
                <div className="flex-1 min-w-[180px] flex items-center gap-3">
                  {cols.artwork && (
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      style={{ width: `${thumbSize}px`, height: `${thumbSize}px` }}
                      className="rounded-lg object-cover shrink-0 border border-white/10 shadow"
                    />
                  )}
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold truncate ${
                        isCurrent ? 'text-[var(--fin-accent)] font-bold' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                  </div>
                </div>

                {/* Album */}
                {cols.album && (
                  <div className="w-44 text-xs text-slate-300 truncate hidden md:block shrink-0">
                    {track.album}
                  </div>
                )}

                {/* Genre */}
                {cols.genre && (
                  <div className="w-28 text-[11px] text-slate-400 truncate hidden lg:block shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5">
                      {track.genre}
                    </span>
                  </div>
                )}

                {/* Year */}
                {cols.year && (
                  <div className="w-16 text-xs font-mono text-slate-400 hidden xl:block shrink-0">
                    {track.year}
                  </div>
                )}

                {/* Hi-Res Specs */}
                {(cols.codec || cols.bitrate || cols.replayGain) && (
                  <div className="w-44 hidden lg:flex items-center gap-1.5 shrink-0 flex-wrap">
                    {cols.codec && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 font-medium">
                        {track.codec} {Math.round(track.sampleRate / 1000)}k/{track.bitDepth}b
                      </span>
                    )}
                    {cols.bitrate && (
                      <span className="text-[9px] font-mono text-slate-400">
                        {track.bitrate}kbps
                      </span>
                    )}
                    {cols.replayGain && track.replayGain && (
                      <span className="text-[9px] font-mono text-emerald-400">
                        {track.replayGain > 0 ? '+' : ''}
                        {track.replayGain}dB
                      </span>
                    )}
                  </div>
                )}

                {/* Play Count */}
                {cols.playCount && (
                  <div className="w-16 text-right text-xs font-mono text-slate-400 hidden xl:block shrink-0">
                    {track.playCount}
                  </div>
                )}

                {/* Duration */}
                <div className="w-14 text-right text-xs font-mono text-slate-400 shrink-0">
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
          })
        )}
      </div>
    </div>
  );
};
