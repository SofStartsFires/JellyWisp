import React, { useState, useRef } from 'react';
import { X, Trash2, Music, ListMusic } from 'lucide-react';
import { Track } from '../types/index.ts';
import { resolveCoverArt, handleCoverImgError } from '../utils/jellywispArtwork.ts';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Track[];
  currentTrack: Track | null;
  onPlayTrack: (track: Track) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
  widthPx?: number;
  onResizeWidth?: (width: number) => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  queue,
  currentTrack,
  onPlayTrack,
  onRemoveFromQueue,
  onClearQueue,
  widthPx = 360,
  onResizeWidth,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = widthPx;
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const nextWidth = Math.max(260, Math.min(680, Math.round(startWidth + deltaX)));
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

  const rowHeight = 62;
  const viewportHeight = containerRef.current?.clientHeight || 600;
  const totalHeight = queue.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 6);
  const endIndex = Math.min(
    queue.length,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + 6
  );
  const visibleQueue = queue.slice(startIndex, endIndex);

  return (
    <aside
      style={{ width: `${widthPx}px` }}
      className="fixed right-0 top-11 bottom-20 bg-[var(--fin-sidebar)]/95 border-l border-white/10 backdrop-blur-xl z-30 shadow-2xl flex flex-col select-none transition-transform animate-slideLeft"
    >
      {/* Left Edge Mouse Drag Resize Handle */}
      <div
        onMouseDown={handleMouseDownResize}
        title="Drag edge to resize queue drawer"
        className={`absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-50 transition-colors ${
          isResizing ? 'bg-[var(--fin-accent)]' : 'hover:bg-[var(--fin-accent)]/60'
        }`}
      />

      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20 shrink-0">
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-[var(--fin-accent)]" />
          <h3 className="text-sm font-bold text-white tracking-tight">
            Up Next Queue ({queue.length.toLocaleString()})
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition"
              title="Clear Queue"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Virtualized Queue Body */}
      <div
        ref={containerRef}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className="flex-1 overflow-y-auto relative"
      >
        {queue.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <Music className="w-8 h-8 mx-auto text-slate-600" />
            <p>Queue is empty.</p>
            <p className="text-[10px] text-slate-400">
              Play songs or smart playlists to queue up music.
            </p>
          </div>
        ) : (
          <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${startIndex * rowHeight}px)`,
              }}
            >
              {visibleQueue.map((track, localIdx) => {
                const idx = startIndex + localIdx;
                const isPlaying = currentTrack?.id === track.id;
                return (
                  <div
                    key={`${track.id}-${idx}`}
                    style={{ height: `${rowHeight}px` }}
                    className={`px-3 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition group ${
                      isPlaying ? 'bg-[var(--fin-accent)]/10' : ''
                    }`}
                  >
                    <div
                      onClick={() => onPlayTrack(track)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <img
                        src={resolveCoverArt(track.coverUrl)}
                        onError={handleCoverImgError}
                        alt=""
                        loading="lazy"
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/10 bg-black/40"
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isPlaying ? 'text-[var(--fin-accent)]' : 'text-slate-200'
                          }`}
                        >
                          {track.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                        {Math.floor(track.duration / 60)}:
                        {Math.floor(track.duration % 60).toString().padStart(2, '0')}
                      </span>
                      <button
                        onClick={() => onRemoveFromQueue(idx)}
                        className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"
                        title="Remove from queue"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
