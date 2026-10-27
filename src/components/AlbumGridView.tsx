import React, { useState } from 'react';
import { Play, ArrowLeft, Grid } from 'lucide-react';
import { Album, Track, LayoutConfig } from '../types/index.ts';
import { formatDuration } from '../utils/audioMath.ts';

interface AlbumGridViewProps {
  albums: Album[];
  currentTrack: Track | null;
  onPlayTrack: (track: Track) => void;
  onPlayAlbum: (album: Album) => void;
  onOpenMetadataEditor: (track: Track) => void;
  layoutConfig?: LayoutConfig;
  onUpdateLayout?: (partial: Partial<LayoutConfig>) => void;
}

export const AlbumGridView: React.FC<AlbumGridViewProps> = ({
  albums,
  currentTrack,
  onPlayTrack,
  onPlayAlbum,
  layoutConfig,
  onUpdateLayout,
}) => {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const gridCols = layoutConfig?.albumGridColumns || 5;

  if (selectedAlbum) {
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
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end pb-6 border-b border-white/5">
          <img
            src={selectedAlbum.coverUrl}
            alt={selectedAlbum.title}
            className="w-48 h-48 rounded-2xl object-cover shadow-2xl border border-white/10 shrink-0"
          />
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30">
              {selectedAlbum.hiresBadge || 'Master Recording'}
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {selectedAlbum.title}
            </h1>
            <p className="text-sm text-slate-300 font-medium">
              {selectedAlbum.artist} • {selectedAlbum.year} • {selectedAlbum.genre}
            </p>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-2">
              <span>{selectedAlbum.trackCount} tracks</span>
              <span>•</span>
              <span>{formatDuration(selectedAlbum.totalDuration)}</span>
              <button
                onClick={() => onPlayAlbum(selectedAlbum)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--fin-accent)] text-slate-950 font-bold text-xs hover:opacity-90 shadow-md shadow-cyan-500/20 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Album</span>
              </button>
            </div>
          </div>
        </div>

        {/* Album Tracks List */}
        <div className="divide-y divide-white/5">
          {selectedAlbum.tracks.map((t, i) => {
            const isPlaying = currentTrack?.id === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onPlayTrack(t)}
                className={`py-3 px-4 flex items-center justify-between hover:bg-white/5 rounded-xl cursor-pointer group transition ${
                  isPlaying ? 'bg-[var(--fin-accent)]/10' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-500 w-5 text-center group-hover:hidden">
                    {t.trackNumber || i + 1}
                  </span>
                  <Play className="w-4 h-4 text-cyan-400 fill-current hidden group-hover:block" />
                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        isPlaying ? 'text-[var(--fin-accent)]' : 'text-white'
                      }`}
                    >
                      {t.title}
                    </p>
                    <p className="text-[11px] text-slate-400">{t.artist}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-white/5">
                    {t.codec} {Math.round(t.sampleRate / 1000)}k/{t.bitDepth}b
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {formatDuration(t.duration)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 select-none space-y-6">
      {/* Header + Live Grid Column Slider */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Music Albums</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {albums.length} releases • Lossless Master recordings in Jellyfin
          </p>
        </div>

        {onUpdateLayout && (
          <div className="flex items-center gap-2.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
            <Grid className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-300">Grid Size:</span>
            <input
              type="range"
              min="3"
              max="8"
              step="1"
              value={gridCols}
              onChange={(e) => onUpdateLayout({ albumGridColumns: parseInt(e.target.value) })}
              className="w-20 h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
            />
            <span className="text-xs font-mono text-cyan-300 w-8">{gridCols} col</span>
          </div>
        )}
      </div>

      {/* Dynamic Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
        }}
        className="gap-5"
      >
        {albums.map((album) => (
          <div
            key={album.id}
            onClick={() => setSelectedAlbum(album)}
            style={{ padding: `${layoutConfig?.albumCardPaddingPx ?? 12}px` }}
            className="group cursor-pointer rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition duration-300 flex flex-col"
          >
            {/* Artwork Container */}
            <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg border border-white/10">
              <img
                src={album.coverUrl}
                alt={album.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {album.hiresBadge && layoutConfig?.showAudioSpecsBadge !== false && (
                <span className="absolute top-2 left-2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/80 text-cyan-300 border border-cyan-500/40 backdrop-blur-sm">
                  {album.hiresBadge.split(' ')[0]}
                </span>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayAlbum(album);
                }}
                className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-[var(--fin-accent)] text-slate-950 flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all duration-300 hover:scale-105"
                title="Play album"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </button>
            </div>

            {/* Meta */}
            <div className="mt-3">
              <h3 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition">
                {album.title}
              </h3>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{album.artist}</p>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-2">
                {layoutConfig?.showAlbumYearBadge !== false && <span>{album.year}</span>}
                {layoutConfig?.showAlbumGenreSubtext !== false ? (
                  <span className="truncate max-w-[90px]">{album.genre}</span>
                ) : (
                  <span>{album.trackCount} tracks</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
