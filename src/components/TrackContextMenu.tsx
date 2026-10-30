import React, { useEffect, useRef } from 'react';
import {
  Play,
  CornerDownRight,
  ListPlus,
  Disc,
  User,
  UserCheck,
  Image as ImageIcon,
  Tag,
  Heart,
} from 'lucide-react';
import { Track } from '../types/index.ts';
import { resolveCoverArt, handleCoverImgError } from '../utils/jellywispArtwork.ts';

interface TrackContextMenuProps {
  track: Track | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onPlayNow: (track: Track) => void;
  onPlayNext: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onNavigateToAlbum?: (albumTitle: string, albumId?: string) => void;
  onGoToAlbum?: (albumTitle: string, albumId?: string) => void;
  onNavigateToArtist?: (artistName: string) => void;
  onGoToArtist?: (artistName: string) => void;
  onNavigateToAlbumArtist?: (albumArtistName: string) => void;
  onGoToAlbumArtist?: (albumArtistName: string) => void;
  onSearchAlbumArt?: (track: Track, mode: 'album' | 'artist') => void;
  onSearchAlbumArtwork?: (track: Track) => void;
  onSearchArtistArtwork?: (track: Track) => void;
  onEditMetadata?: (track: Track) => void;
  onOpenMetadataEditor?: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
}

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({
  track,
  position,
  onClose,
  onPlayNow,
  onPlayNext,
  onAddToQueue,
  onNavigateToAlbum,
  onGoToAlbum,
  onNavigateToArtist,
  onGoToArtist,
  onNavigateToAlbumArtist,
  onGoToAlbumArtist,
  onSearchAlbumArt,
  onSearchAlbumArtwork,
  onSearchArtistArtwork,
  onEditMetadata,
  onOpenMetadataEditor,
  onToggleFavorite,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const handleNavAlbum = onNavigateToAlbum || onGoToAlbum;
  const handleNavArtist = onNavigateToArtist || onGoToArtist;
  const handleNavAlbumArtist = onNavigateToAlbumArtist || onGoToAlbumArtist;
  const handleEditMeta = onEditMetadata || onOpenMetadataEditor;

  useEffect(() => {
    if (!track || !position) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleScrollOrKey = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return;
      onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrKey, true);
    window.addEventListener('keydown', handleScrollOrKey);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrKey, true);
      window.removeEventListener('keydown', handleScrollOrKey);
    };
  }, [track, position, onClose]);

  if (!track || !position) return null;

  // Viewport bounds clamping: ensure menu is always 100% visible
  const menuWidth = 270;
  const menuHeight = 440;
  const safeX = Math.max(10, Math.min(position.x, window.innerWidth - menuWidth - 12));
  const safeY = Math.max(10, Math.min(position.y, window.innerHeight - menuHeight - 12));

  return (
    <div
      ref={menuRef}
      style={{ left: `${safeX}px`, top: `${safeY}px`, width: `${menuWidth}px` }}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-50 rounded-2xl bg-[#0b101e]/98 border border-white/15 shadow-2xl backdrop-blur-xl overflow-hidden select-none py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 max-h-[calc(100vh-24px)] overflow-y-auto"
    >
      {/* Mini Track Header */}
      <div className="px-3 py-2.5 border-b border-white/10 flex items-center gap-2.5 bg-white/[0.03]">
        <img
          src={resolveCoverArt(track.coverUrl)}
          onError={handleCoverImgError}
          alt=""
          className="w-9 h-9 rounded-lg object-cover border border-white/10 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="font-bold jw-text-track truncate text-xs">{track.title}</p>
          <p className="text-[11px] jw-text-artist truncate">{track.artist}</p>
        </div>
      </div>

      {/* Queue & Playback Actions */}
      <div className="py-1 border-b border-white/10">
        <button
          onClick={() => {
            onPlayNow(track);
            onClose();
          }}
          className="w-full px-3.5 py-2 flex items-center gap-2.5 text-slate-200 hover:text-slate-950 hover:bg-[var(--fin-accent)] font-semibold transition"
        >
          <Play className="w-3.5 h-3.5 fill-current shrink-0" />
          <span>Play Track Now</span>
        </button>

        <button
          onClick={() => {
            onPlayNext(track);
            onClose();
          }}
          className="w-full px-3.5 py-2 flex items-center gap-2.5 text-slate-200 hover:text-white hover:bg-white/10 transition"
        >
          <CornerDownRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Play Next</span>
        </button>

        <button
          onClick={() => {
            onAddToQueue(track);
            onClose();
          }}
          className="w-full px-3.5 py-2 flex items-center gap-2.5 text-slate-200 hover:text-white hover:bg-white/10 transition"
        >
          <ListPlus className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Add to Queue</span>
        </button>
      </div>

      {/* Navigation Actions */}
      <div className="py-1 border-b border-white/10">
        {handleNavAlbum && (
          <button
            onClick={() => {
              handleNavAlbum(track.album, track.albumId);
              onClose();
            }}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 text-slate-200 hover:text-white hover:bg-white/10 transition"
          >
            <Disc className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Go to Album: {track.album}</span>
          </button>
        )}

        {handleNavArtist && (
          <button
            onClick={() => {
              handleNavArtist(track.artist);
              onClose();
            }}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 text-slate-200 hover:text-white hover:bg-white/10 transition"
          >
            <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Go to Artist: {track.artist}</span>
          </button>
        )}

        {track.albumArtist && handleNavAlbumArtist && (
          <button
            onClick={() => {
              handleNavAlbumArtist(track.albumArtist || track.artist);
              onClose();
            }}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 text-slate-200 hover:text-white hover:bg-white/10 transition"
          >
            <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">
              Go to Album Artist: {track.albumArtist || track.artist}
            </span>
          </button>
        )}
      </div>

      {/* Artwork & Metadata Actions */}
      <div className="py-1">
        {(onSearchAlbumArtwork || onSearchAlbumArt) && (
          <button
            onClick={() => {
              if (onSearchAlbumArtwork) onSearchAlbumArtwork(track);
              else if (onSearchAlbumArt) onSearchAlbumArt(track, 'album');
              onClose();
            }}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 text-slate-200 hover:text-white hover:bg-white/10 transition"
          >
            <ImageIcon className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span>Search for Album Artwork...</span>
          </button>
        )}

        {(onSearchArtistArtwork || onSearchAlbumArt) && (
          <button
            onClick={() => {
              if (onSearchArtistArtwork) onSearchArtistArtwork(track);
              else if (onSearchAlbumArt) onSearchAlbumArt(track, 'artist');
              onClose();
            }}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 text-slate-200 hover:text-white hover:bg-white/10 transition"
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Search for Artist Artwork...</span>
          </button>
        )}

        {handleEditMeta && (
          <button
            onClick={() => {
              handleEditMeta(track);
              onClose();
            }}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 text-slate-200 hover:text-white hover:bg-white/10 transition"
          >
            <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Edit Metadata &amp; Synced Lyrics</span>
          </button>
        )}

        <button
          onClick={() => {
            onToggleFavorite(track.id);
            onClose();
          }}
          className="w-full px-3.5 py-2 flex items-center gap-2.5 text-slate-200 hover:text-white hover:bg-white/10 transition"
        >
          <Heart
            className={`w-3.5 h-3.5 shrink-0 ${
              track.isFavorite ? 'text-rose-500 fill-current' : 'text-rose-400'
            }`}
          />
          <span>{track.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
        </button>
      </div>
    </div>
  );
};
