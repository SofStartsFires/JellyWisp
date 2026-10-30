import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  ListPlus,
  CornerDownRight,
  Disc,
  User,
  Image as ImageIcon,
  Check,
  Tag,
} from 'lucide-react';
import { Album, AlbumReleaseType } from '../types/index.ts';
import { resolveCoverArt, handleCoverImgError } from '../utils/jellywispArtwork.ts';
import { RELEASE_TYPE_META, getAlbumReleaseType } from './AlbumGridView.tsx';

interface AlbumContextMenuProps {
  album: Album | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onPlayAlbum: (album: Album) => void;
  onAddToQueue?: (album: Album) => void;
  onNavigateToArtist?: (artistName: string) => void;
  onGoToArtist?: (artistName: string) => void;
  onReclassifyAlbum: (
    albumId: string,
    releaseType: AlbumReleaseType,
    albumTitle?: string,
    artistName?: string
  ) => void;
  onSearchAlbumArt?: (query: string, album: Album) => void;
  onSearchArtwork?: (album: Album) => void;
}

export const AlbumContextMenu: React.FC<AlbumContextMenuProps> = ({
  album,
  position,
  onClose,
  onPlayAlbum,
  onAddToQueue,
  onNavigateToArtist,
  onGoToArtist,
  onReclassifyAlbum,
  onSearchAlbumArt,
  onSearchArtwork,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const handleNavArtist = onNavigateToArtist || onGoToArtist;
  const [menuDims, setMenuDims] = useState({ width: 280, height: 440 });

  useEffect(() => {
    if (!album || !position) return;

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
  }, [album, position, onClose]);

  if (!album || !position) return null;

  // Viewport bounds clamping: ensure menu is always 100% visible
  const safeX = Math.max(10, Math.min(position.x, window.innerWidth - menuDims.width - 12));
  const safeY = Math.max(10, Math.min(position.y, window.innerHeight - menuDims.height - 12));

  const currentType = getAlbumReleaseType(album);

  return (
    <div
      ref={menuRef}
      style={{ left: `${safeX}px`, top: `${safeY}px`, width: '280px' }}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-50 rounded-2xl bg-[#0b101e]/98 border border-white/15 shadow-2xl backdrop-blur-xl overflow-hidden select-none py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 max-h-[calc(100vh-24px)] overflow-y-auto"
    >
      {/* Mini Album Header */}
      <div className="px-3 py-2.5 border-b border-white/10 flex items-center gap-2.5 bg-white/[0.03]">
        <img
          src={resolveCoverArt(album.coverUrl)}
          onError={handleCoverImgError}
          alt=""
          className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0 bg-black/40"
        />
        <div className="min-w-0 flex-1">
          <p className="font-bold jw-text-album truncate text-xs">{album.title}</p>
          <p className="text-[11px] jw-text-artist truncate">{album.artist}</p>
          <p className="text-[10px] font-mono text-slate-400">
            {album.year || '2024'} • {album.trackCount || album.tracks?.length || 0} tracks
          </p>
        </div>
      </div>

      {/* Playback Actions */}
      <div className="py-1 border-b border-white/10">
        <button
          onClick={() => {
            onPlayAlbum(album);
            onClose();
          }}
          className="w-full px-3.5 py-2 flex items-center gap-2.5 text-slate-200 hover:text-slate-950 hover:bg-[var(--fin-accent)] font-semibold transition"
        >
          <Play className="w-3.5 h-3.5 fill-current shrink-0" />
          <span>Play Full Album</span>
        </button>

        {onAddToQueue && (
          <button
            onClick={() => {
              onAddToQueue(album);
              onClose();
            }}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <ListPlus className="w-3.5 h-3.5 shrink-0" />
            <span>Add Album to Queue</span>
          </button>
        )}
      </div>

      {/* Categorize / Reclassify Album Release Type */}
      <div className="py-1.5 border-b border-white/10">
        <div className="px-3.5 py-1 text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
          <Tag className="w-3 h-3" />
          <span>Set Album Category:</span>
        </div>
        <div className="space-y-0.5 mt-0.5">
          {RELEASE_TYPE_META.map((meta) => {
            const isSelected = currentType === meta.id;
            return (
              <button
                key={meta.id}
                onClick={() => {
                  onReclassifyAlbum(album.id, meta.id, album.title, album.artist);
                  onClose();
                }}
                className={`w-full px-3.5 py-1.5 flex items-center justify-between text-xs transition ${
                  isSelected
                    ? 'bg-cyan-500/15 text-cyan-300 font-bold'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{meta.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation & Art Actions */}
      <div className="py-1">
        {handleNavArtist && (
          <button
            onClick={() => {
              handleNavArtist(album.artist);
              onClose();
            }}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span>View Artist Discography</span>
          </button>
        )}

        {(onSearchArtwork || onSearchAlbumArt) && (
          <button
            onClick={() => {
              if (onSearchArtwork) onSearchArtwork(album);
              else if (onSearchAlbumArt) onSearchAlbumArt(`${album.artist} ${album.title}`, album);
              onClose();
            }}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Change Album Art</span>
          </button>
        )}
      </div>
    </div>
  );
};
