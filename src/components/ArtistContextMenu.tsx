import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Shuffle,
  ListPlus,
  Disc,
  User,
  Image as ImageIcon,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Artist, Track } from '../types/index.ts';
import { resolveCoverArt, handleCoverImgError } from '../utils/jellywispArtwork.ts';

interface ArtistContextMenuProps {
  artist: Artist | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onPlayArtist: (artist: Artist) => void;
  onShuffleArtist?: (artist: Artist) => void;
  onAddToQueue?: (artist: Artist) => void;
  onOpenDiscography?: (artist: Artist) => void;
  onSearchArtistArt?: (query: string, artist: Artist) => void;
}

export const ArtistContextMenu: React.FC<ArtistContextMenuProps> = ({
  artist,
  position,
  onClose,
  onPlayArtist,
  onShuffleArtist,
  onAddToQueue,
  onOpenDiscography,
  onSearchArtistArt,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [menuDims, setMenuDims] = useState({ width: 270, height: 320 });

  useEffect(() => {
    if (!artist || !position) return;

    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setMenuDims({ width: rect.width, height: rect.height });
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [artist, position, onClose]);

  if (!artist || !position) return null;

  // Viewport bounds clamping: ensure menu is always 100% visible on screen
  const safeX = Math.max(10, Math.min(position.x, window.innerWidth - menuDims.width - 14));
  const safeY = Math.max(10, Math.min(position.y, window.innerHeight - menuDims.height - 14));

  const handleCopyName = () => {
    navigator.clipboard.writeText(artist.name);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 600);
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${safeX}px`, top: `${safeY}px`, width: '270px' }}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-50 rounded-2xl bg-[#0b101e]/98 border border-white/15 shadow-2xl backdrop-blur-xl overflow-hidden select-none py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 max-h-[calc(100vh-24px)] overflow-y-auto"
    >
      {/* Mini Artist Header */}
      <div className="px-3 py-2.5 border-b border-white/10 flex items-center gap-2.5 bg-white/[0.03]">
        <img
          src={resolveCoverArt(artist.coverUrl)}
          onError={handleCoverImgError}
          alt=""
          className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0 bg-black/40"
        />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white truncate text-xs">{artist.name}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
            {artist.albums?.length || 0} albums • {artist.trackCount || 0} tracks
          </p>
        </div>
      </div>

      <div className="p-1 space-y-0.5">
        {/* Find & Search Artist Artwork */}
        <button
          onClick={() => {
            onSearchArtistArt?.(artist.name, artist);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-cyan-300 hover:text-white hover:bg-cyan-500/20 font-semibold transition group"
        >
          <ImageIcon className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
          <span>Find &amp; Change Artist Artwork</span>
        </button>

        {/* Play All Artist Tracks */}
        <button
          onClick={() => {
            onPlayArtist(artist);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-slate-200 hover:text-white hover:bg-white/10 transition"
        >
          <Play className="w-4 h-4 text-cyan-400 fill-current" />
          <span>Play All by {artist.name}</span>
        </button>

        {/* Shuffle Artist */}
        {onShuffleArtist && (
          <button
            onClick={() => {
              onShuffleArtist(artist);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-slate-200 hover:text-white hover:bg-white/10 transition"
          >
            <Shuffle className="w-4 h-4 text-slate-400" />
            <span>Shuffle Artist</span>
          </button>
        )}

        {/* Add to Queue */}
        {onAddToQueue && (
          <button
            onClick={() => {
              onAddToQueue(artist);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-slate-200 hover:text-white hover:bg-white/10 transition"
          >
            <ListPlus className="w-4 h-4 text-slate-400" />
            <span>Add Artist Tracks to Queue</span>
          </button>
        )}

        {/* Open Full Discography */}
        {onOpenDiscography && (
          <button
            onClick={() => {
              onOpenDiscography(artist);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-slate-200 hover:text-white hover:bg-white/10 transition"
          >
            <Disc className="w-4 h-4 text-indigo-400" />
            <span>Open Discography &amp; Releases</span>
          </button>
        )}

        <div className="h-[1px] bg-white/10 my-1" />

        {/* Copy Artist Name */}
        <button
          onClick={handleCopyName}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-slate-300 hover:text-white hover:bg-white/10 transition"
        >
          <div className="flex items-center gap-2.5">
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-slate-400" />
            )}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Artist Name'}</span>
          </div>
        </button>
      </div>
    </div>
  );
};
