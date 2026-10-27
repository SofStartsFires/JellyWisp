import React from 'react';
import { X, Trash2, Play, Music, ListMusic } from 'lucide-react';
import { Track } from '../types/index.ts';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Track[];
  currentTrack: Track | null;
  onPlayTrack: (track: Track) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  queue,
  currentTrack,
  onPlayTrack,
  onRemoveFromQueue,
  onClearQueue,
}) => {
  if (!isOpen) return null;

  return (
    <aside className="fixed right-0 top-11 bottom-20 w-80 sm:w-96 bg-[var(--fin-sidebar)]/95 border-l border-white/10 backdrop-blur-xl z-30 shadow-2xl flex flex-col select-none transition-transform animate-slideLeft">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-[var(--fin-accent)]" />
          <h3 className="text-sm font-bold text-white tracking-tight">
            Up Next Queue ({queue.length})
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

      {/* Queue Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {queue.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <Music className="w-8 h-8 mx-auto text-slate-600" />
            <p>Queue is empty.</p>
            <p className="text-[10px] text-slate-400">Play songs or smart playlists to queue up music.</p>
          </div>
        ) : (
          queue.map((track, idx) => {
            const isPlaying = currentTrack?.id === track.id;
            return (
              <div
                key={`${track.id}-${idx}`}
                className={`p-3 flex items-center justify-between hover:bg-white/5 transition group ${
                  isPlaying ? 'bg-[var(--fin-accent)]/10' : ''
                }`}
              >
                <div
                  onClick={() => onPlayTrack(track)}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/10"
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold truncate ${
                        isPlaying ? 'text-[var(--fin-accent)]' : 'text-slate-200'
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {track.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500">
                    {Math.floor(track.duration / 60)}:
                    {(track.duration % 60).toString().padStart(2, '0')}
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
          })
        )}
      </div>
    </aside>
  );
};
