import React, { useEffect, useRef } from 'react';
import { X, FileText, Music } from 'lucide-react';
import { Track } from '../types/index.ts';

interface LyricsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  currentTime: number;
  onSeek: (seconds: number) => void;
}

interface ParsedLyric {
  time: number;
  text: string;
}

export const LyricsDrawer: React.FC<LyricsDrawerProps> = ({
  isOpen,
  onClose,
  currentTrack,
  currentTime,
  onSeek,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);

  if (!isOpen) return null;

  // Parse LRC formatted lyrics or split plain text
  const parseLyrics = (raw?: string): ParsedLyric[] => {
    if (!raw) return [];
    const lines = raw.split('\n');
    const parsed: ParsedLyric[] = [];

    const lrcRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

    for (const line of lines) {
      const match = line.match(lrcRegex);
      if (match) {
        const mins = parseInt(match[1]);
        const secs = parseInt(match[2]);
        const ms = parseInt(match[3]);
        const timeSec = mins * 60 + secs + ms / 100;
        parsed.push({ time: timeSec, text: match[4].trim() });
      } else if (line.trim()) {
        parsed.push({ time: -1, text: line.trim() });
      }
    }

    return parsed;
  };

  const parsedLyrics = parseLyrics(currentTrack?.lyrics);

  // Find active line index
  let activeIndex = -1;
  for (let i = 0; i < parsedLyrics.length; i++) {
    if (parsedLyrics[i].time !== -1 && parsedLyrics[i].time <= currentTime) {
      activeIndex = i;
    }
  }

  // Smooth auto-scroll active lyric line into view
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  return (
    <aside className="fixed right-0 top-11 bottom-20 w-80 sm:w-96 bg-[var(--fin-sidebar)]/95 border-l border-white/10 backdrop-blur-xl z-30 shadow-2xl flex flex-col select-none transition-transform animate-slideLeft">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--fin-accent)]" />
          <h3 className="text-sm font-bold text-white tracking-tight">Synced Lyrics</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Lyrics Scrollable Body */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 text-center divide-y divide-transparent"
      >
        {parsedLyrics.length === 0 ? (
          <div className="py-20 text-slate-500 text-xs space-y-2">
            <Music className="w-8 h-8 mx-auto text-slate-600" />
            <p>No synced lyrics found for this track.</p>
            <p className="text-[10px] text-slate-500">
              Use "Edit Tags" in the sidebar to add synchronized LRC lyrics!
            </p>
          </div>
        ) : (
          parsedLyrics.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <p
                key={idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => {
                  if (item.time >= 0) onSeek(item.time);
                }}
                className={`transition-all duration-300 py-1.5 cursor-pointer rounded-lg px-3 ${
                  isActive
                    ? 'text-lg font-bold text-[var(--fin-accent)] scale-105 finamp-accent-glow bg-[var(--fin-accent)]/10'
                    : 'text-sm font-medium text-slate-400 hover:text-slate-200'
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
