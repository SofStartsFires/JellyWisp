import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  Server,
  Activity,
  Sliders,
  Sparkles,
  Maximize2,
  Minus,
  X,
  Search,
  SlidersHorizontal,
  Settings,
  Waves,
  Move,
  GripVertical,
  ZoomIn,
  Lock,
  Unlock,
  Square,
  Users,
  UserCheck,
  Disc,
  Music,
  Play,
  CornerDownLeft,
} from 'lucide-react';
import {
  JellyfinServerConfig,
  Track,
  Album,
  Artist,
  LayoutConfig,
  DraggableSectionId,
} from '../types/index.ts';
import { searchGlobalLibrary, GlobalSearchTarget, computeArtistStatsMap } from '../utils/libraryHelpers.ts';
import { resolveCoverArt, handleCoverImgError } from '../utils/jellywispArtwork.ts';

interface SearchBarSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  artists?: Artist[];
  albumArtists?: Artist[];
  albums?: Album[];
  tracks?: Track[];
  onNavigateToArtist?: (artistName: string) => void;
  onNavigateToAlbumArtist?: (artistName: string) => void;
  onNavigateToAlbum?: (albumTitle: string, albumId?: string) => void;
  onPlayTrack?: (track: Track, contextTracks?: Track[], index?: number) => void;
  onContextMenuArtist?: (e: React.MouseEvent, artistOrName: Artist | string) => void;
  onContextMenuAlbum?: (e: React.MouseEvent, album: Album) => void;
  onContextMenuTrack?: (e: React.MouseEvent, track: Track) => void;
  layoutConfig?: LayoutConfig;
  onUpdateLayout?: (partial: Partial<LayoutConfig>) => void;
  onDragStartSection?: (section: DraggableSectionId) => void;
  onDragEndSection?: () => void;
  isHeroDeck?: boolean;
}

export const SearchBarSection: React.FC<SearchBarSectionProps> = ({
  searchQuery,
  onSearchChange,
  artists = [],
  albumArtists = [],
  albums = [],
  tracks = [],
  onNavigateToArtist,
  onNavigateToAlbumArtist,
  onNavigateToAlbum,
  onPlayTrack,
  onContextMenuArtist,
  onContextMenuAlbum,
  onContextMenuTrack,
  layoutConfig,
  onUpdateLayout,
  onDragStartSection,
  onDragEndSection,
  isHeroDeck = false,
}) => {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showSizePopover, setShowSizePopover] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const maxWidthPx = layoutConfig?.searchBarMaxWidthPx ?? 680;
  const heightPx = layoutConfig?.searchBarHeightPx ?? 44;
  const fontSizePx = layoutConfig?.searchBarFontSizePx ?? 14;
  const pos = layoutConfig?.searchBarPosition || 'titlebar';
  const isLocked = layoutConfig?.layoutLocked ?? true;

  const artistStatsMap = useMemo(
    () => computeArtistStatsMap(artists, albums, tracks),
    [artists, albums, tracks]
  );

  const globalResults = useMemo(
    () =>
      searchGlobalLibrary(
        searchQuery,
        { artists, albumArtists, albums, tracks },
        5
      ),
    [searchQuery, artists, albumArtists, albums, tracks]
  );

  // Deduplicate Album Artists that already appear in Artists for cleaner dropdown
  const distinctAlbumArtists = useMemo(() => {
    const artistNames = new Set(globalResults.artists.map((a) => a.name.trim().toLowerCase()));
    return globalResults.albumArtists.filter(
      (aa) => !artistNames.has(aa.name.trim().toLowerCase())
    );
  }, [globalResults]);

  // Flat list of selectable targets for keyboard navigation & Enter key
  const flatTargets = useMemo<GlobalSearchTarget[]>(() => {
    const list: GlobalSearchTarget[] = [];
    for (const a of globalResults.artists) list.push({ type: 'artist', artist: a });
    for (const aa of distinctAlbumArtists) list.push({ type: 'album-artist', artist: aa });
    for (const alb of globalResults.albums) list.push({ type: 'album', album: alb });
    for (const tr of globalResults.tracks) list.push({ type: 'track', track: tr });
    return list;
  }, [globalResults, distinctAlbumArtists]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const executeTarget = (target: GlobalSearchTarget) => {
    setIsDropdownOpen(false);
    if (target.type === 'artist') {
      onSearchChange('');
      onNavigateToArtist?.(target.artist.name);
    } else if (target.type === 'album-artist') {
      onSearchChange('');
      if (onNavigateToAlbumArtist) {
        onNavigateToAlbumArtist(target.artist.name);
      } else {
        onNavigateToArtist?.(target.artist.name);
      }
    } else if (target.type === 'album') {
      onSearchChange('');
      onNavigateToAlbum?.(target.album.title, target.album.id);
    } else if (target.type === 'track') {
      onPlayTrack?.(target.track, globalResults.tracks, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      return;
    }
    if (!searchQuery.trim()) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsDropdownOpen(true);
      if (flatTargets.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % flatTargets.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsDropdownOpen(true);
      if (flatTargets.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + flatTargets.length) % flatTargets.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex > 0 && flatTargets[selectedIndex]) {
        executeTarget(flatTargets[selectedIndex]);
      } else if (globalResults.directMatch) {
        executeTarget(globalResults.directMatch);
      } else if (flatTargets[0]) {
        executeTarget(flatTargets[0]);
      }
    }
  };

  const showDropdown = isDropdownOpen && searchQuery.trim().length > 0;
  let runningTargetIdx = -1;

  return (
    <div
      ref={containerRef}
      draggable={!isLocked}
      onDragStart={(e) => {
        if (isLocked) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('text/plain', 'search');
        e.dataTransfer.effectAllowed = 'move';
        onDragStartSection?.('search');
      }}
      onDragEnd={() => onDragEndSection?.()}
      style={{
        maxWidth: isHeroDeck ? `${Math.max(maxWidthPx, 1100)}px` : `${maxWidthPx}px`,
      }}
      data-testid="search-bar-section"
      data-position={pos}
      className={`no-drag relative flex-1 min-w-0 w-full transition-all duration-200 ${
        isHeroDeck ? 'mx-auto py-2 px-4' : 'mx-2 sm:mx-4'
      }`}
    >
      <div className="relative flex items-center w-full group">
        {/* Drag Handle for Search Section (only when unlocked) */}
        {!isLocked && (
          <div
            className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-500 hover:text-cyan-400 cursor-grab active:cursor-grabbing z-10"
            title="Drag Search Bar to Top Hero Deck, Bottom Command Bar, or Titlebar"
          >
            <GripVertical className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition" />
          </div>
        )}

        <Search
          style={{
            width: `${Math.max(15, Math.round(fontSizePx * 1.1))}px`,
            height: `${Math.max(15, Math.round(fontSizePx * 1.1))}px`,
            left: isLocked ? '14px' : '32px',
          }}
          className="absolute top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none z-10 transition-all"
        />

        <input
          ref={searchInputRef}
          type="text"
          draggable={false}
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleKeyDown}
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setIsDropdownOpen(true);
          }}
          style={{
            height: `${heightPx}px`,
            fontSize: `${fontSizePx}px`,
            paddingLeft: isLocked ? '40px' : '56px',
          }}
          placeholder="Global Search: artists, albums, tracks, genres... (Enter to jump to match)"
          className="w-full bg-[#111628] hover:bg-[#151b30] focus:bg-[#182039] text-slate-100 placeholder:text-slate-400 rounded-2xl pr-36 border border-white/15 focus:border-[var(--fin-accent)] focus:ring-2 focus:ring-[var(--fin-accent)]/25 focus:outline-none transition-all shadow-inner font-sans"
        />

        {searchQuery && (
          <button
            onClick={() => {
              onSearchChange('');
              setIsDropdownOpen(false);
              searchInputRef.current?.focus();
            }}
            className="absolute right-28 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Right Controls inside Search Bar: Quick Resize Popover + Shortcut Kbd */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {onUpdateLayout && (
            <button
              type="button"
              onClick={() => setShowSizePopover((v) => !v)}
              data-testid="search-size-popover-btn"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition ${
                showSizePopover
                  ? 'bg-[var(--fin-accent)] text-slate-950 border-[var(--fin-accent)]'
                  : 'bg-white/5 hover:bg-white/15 text-cyan-300 border-white/10'
              }`}
              title="Resize Search Bar Width, Height, Font Size, or Dock Position"
            >
              <ZoomIn className="w-3 h-3" />
              <span className="hidden sm:inline">{heightPx}px</span>
            </button>
          )}

          <kbd className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-black/40 border border-white/10 shadow-sm hidden md:inline">
            /
          </kbd>
        </div>
      </div>

      {/* Global Library Search Results Dropdown */}
      {showDropdown && (
        <div
          data-testid="global-search-dropdown"
          className={`absolute left-0 right-0 ${
            pos === 'bottom-deck' ? 'bottom-full mb-2' : 'top-full mt-2'
          } rounded-2xl bg-[#0b101e]/98 border border-cyan-500/35 shadow-2xl backdrop-blur-2xl z-50 max-h-[72vh] overflow-y-auto divide-y divide-white/10 text-left`}
        >
          {/* Top Direct Match Banner (Press Enter to jump) */}
          {globalResults.directMatch && (
            <div
              onClick={() => globalResults.directMatch && executeTarget(globalResults.directMatch)}
              className="px-4 py-2.5 bg-cyan-950/50 hover:bg-cyan-900/50 flex items-center justify-between gap-3 cursor-pointer transition"
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-[var(--fin-accent)] text-slate-950 font-mono font-extrabold text-[10px] uppercase">
                  Direct Match
                </span>
                <span className="font-bold text-white truncate">
                  {globalResults.directMatch.type === 'artist' ||
                  globalResults.directMatch.type === 'album-artist'
                    ? globalResults.directMatch.artist.name
                    : globalResults.directMatch.type === 'album'
                    ? `${globalResults.directMatch.album.title} — ${globalResults.directMatch.album.artist}`
                    : `${globalResults.directMatch.track.title} — ${globalResults.directMatch.track.artist}`}
                </span>
                <span className="text-[10px] font-mono text-cyan-300 uppercase">
                  ({globalResults.directMatch.type})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 shrink-0">
                <span>Press Enter</span>
                <CornerDownLeft className="w-3.5 h-3.5" />
              </div>
            </div>
          )}

          {flatTargets.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No artists, albums, or tracks found for "{searchQuery}".
            </div>
          ) : (
            <div className="p-3 space-y-4">
              {/* Artists Section */}
              {globalResults.artists.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    <Users className="w-3 h-3" />
                    <span>Artists</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {globalResults.artists.map((artist) => {
                      runningTargetIdx += 1;
                      const idx = runningTargetIdx;
                      const isSel = selectedIndex === idx;
                      const st = artistStatsMap.get(artist.name.trim().toLowerCase());
                      const albCount = st?.albumCount ?? artist.albums?.length ?? 0;
                      const trkCount = st?.trackCount ?? artist.trackCount ?? 0;
                      return (
                        <div
                          key={`gs-art-${artist.id}`}
                          onClick={() => executeTarget({ type: 'artist', artist })}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onContextMenuArtist?.(e, artist);
                          }}
                          className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition ${
                            isSel
                              ? 'bg-[var(--fin-accent)]/20 border border-[var(--fin-accent)]/50'
                              : 'hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={resolveCoverArt(st?.coverUrl || artist.coverUrl)}
                              onError={handleCoverImgError}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{artist.name}</p>
                              <p className="text-[10px] font-mono text-slate-400 truncate">
                                {albCount} {albCount === 1 ? 'album' : 'albums'}
                                {trkCount > 0 ? ` • ${trkCount} tracks` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-white/5 shrink-0">
                            Artist
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Album Artists Section (when distinct) */}
              {distinctAlbumArtists.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                    <UserCheck className="w-3 h-3" />
                    <span>Album Artists</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {distinctAlbumArtists.map((artist) => {
                      runningTargetIdx += 1;
                      const idx = runningTargetIdx;
                      const isSel = selectedIndex === idx;
                      const st = artistStatsMap.get(artist.name.trim().toLowerCase());
                      const albCount = st?.albumCount ?? artist.albums?.length ?? 0;
                      return (
                        <div
                          key={`gs-aa-${artist.id}`}
                          onClick={() => executeTarget({ type: 'album-artist', artist })}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onContextMenuArtist?.(e, artist);
                          }}
                          className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition ${
                            isSel
                              ? 'bg-[var(--fin-accent)]/20 border border-[var(--fin-accent)]/50'
                              : 'hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={resolveCoverArt(st?.coverUrl || artist.coverUrl)}
                              onError={handleCoverImgError}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{artist.name}</p>
                              <p className="text-[10px] font-mono text-slate-400 truncate">
                                {albCount} {albCount === 1 ? 'album' : 'albums'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-indigo-300 px-2 py-0.5 rounded bg-white/5 shrink-0">
                            Album Artist
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Albums Section */}
              {globalResults.albums.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                    <Disc className="w-3 h-3" />
                    <span>Albums</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {globalResults.albums.map((album) => {
                      runningTargetIdx += 1;
                      const idx = runningTargetIdx;
                      const isSel = selectedIndex === idx;
                      return (
                        <div
                          key={`gs-alb-${album.id}`}
                          onClick={() => executeTarget({ type: 'album', album })}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onContextMenuAlbum?.(e, album);
                          }}
                          className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition ${
                            isSel
                              ? 'bg-[var(--fin-accent)]/20 border border-[var(--fin-accent)]/50'
                              : 'hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={resolveCoverArt(album.coverUrl)}
                              onError={handleCoverImgError}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover border border-white/10 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{album.title}</p>
                              <p
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onContextMenuArtist?.(e, album.artist);
                                }}
                                className="text-[10px] text-slate-400 truncate hover:text-cyan-300"
                              >
                                {album.artist} • {album.year}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-300 px-2 py-0.5 rounded bg-white/5 shrink-0">
                            Album
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tracks Section */}
              {globalResults.tracks.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                    <Music className="w-3 h-3" />
                    <span>Tracks</span>
                  </div>
                  <div className="space-y-1">
                    {globalResults.tracks.map((track) => {
                      runningTargetIdx += 1;
                      const idx = runningTargetIdx;
                      const isSel = selectedIndex === idx;
                      return (
                        <div
                          key={`gs-trk-${track.id}`}
                          onClick={() => executeTarget({ type: 'track', track })}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onContextMenuTrack?.(e, track);
                          }}
                          className={`flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer transition ${
                            isSel
                              ? 'bg-[var(--fin-accent)]/20 border border-[var(--fin-accent)]/50'
                              : 'hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={resolveCoverArt(track.coverUrl)}
                              onError={handleCoverImgError}
                              alt=""
                              className="w-7 h-7 rounded-md object-cover border border-white/10 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white truncate">
                                {track.title}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDropdownOpen(false);
                                    onSearchChange('');
                                    onNavigateToArtist?.(track.artist);
                                  }}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onContextMenuArtist?.(e, track.artist);
                                  }}
                                  className="hover:underline hover:text-cyan-300"
                                >
                                  {track.artist}
                                </span>{' '}
                                •{' '}
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDropdownOpen(false);
                                    onSearchChange('');
                                    onNavigateToAlbum?.(track.album, track.albumId);
                                  }}
                                  className="hover:underline hover:text-slate-200"
                                >
                                  {track.album}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-mono text-cyan-300 px-1.5 py-0.5 rounded bg-white/5">
                              {track.codec}
                            </span>
                            <Play className="w-3.5 h-3.5 text-[var(--fin-accent)] fill-current" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Live Search Bar Sizing & Modularity Popover */}
      {showSizePopover && onUpdateLayout && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#0c1120] border border-cyan-500/40 shadow-2xl p-4 z-50 space-y-3.5 text-left">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-extrabold text-white uppercase font-mono">
              Search Bar Sizing & Dock
            </span>
            <button
              onClick={() => setShowSizePopover(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Done
            </button>
          </div>

          {/* Search Dock Position */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-300 font-semibold block">
              Search Bar Dock Location
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'titlebar', label: 'In Titlebar' },
                  { id: 'hero-top', label: 'Giant Top Hero' },
                  { id: 'bottom-deck', label: 'Bottom Deck' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onUpdateLayout({ searchBarPosition: opt.id })}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition ${
                    pos === opt.id
                      ? 'bg-[var(--fin-accent)] text-slate-950 border-[var(--fin-accent)]'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Width Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Max Search Width</span>
              <span className="font-mono text-cyan-400 font-bold">{maxWidthPx}px</span>
            </div>
            <input
              type="range"
              min="360"
              max="1600"
              step="20"
              value={maxWidthPx}
              onChange={(e) =>
                onUpdateLayout({ searchBarMaxWidthPx: parseInt(e.target.value) })
              }
              className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
            />
          </div>

          {/* Search Height Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Search Bar Height</span>
              <span className="font-mono text-cyan-400 font-bold">{heightPx}px</span>
            </div>
            <input
              type="range"
              min="34"
              max="72"
              step="2"
              value={heightPx}
              onChange={(e) => {
                const newH = parseInt(e.target.value);
                onUpdateLayout({
                  searchBarHeightPx: newH,
                  titlebarHeightPx: Math.max(layoutConfig?.titlebarHeightPx ?? 64, newH + 16),
                });
              }}
              className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
            />
          </div>

          {/* Search Font Size Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Search Text Size</span>
              <span className="font-mono text-cyan-400 font-bold">{fontSizePx}px</span>
            </div>
            <input
              type="range"
              min="12"
              max="24"
              step="1"
              value={fontSizePx}
              onChange={(e) =>
                onUpdateLayout({ searchBarFontSizePx: parseInt(e.target.value) })
              }
              className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[var(--fin-accent)]"
            />
          </div>

          {/* Quick Super-Size Preset Button */}
          <button
            onClick={() =>
              onUpdateLayout({
                searchBarPosition: 'hero-top',
                searchBarMaxWidthPx: 1400,
                searchBarHeightPx: 58,
                searchBarFontSizePx: 18,
              })
            }
            className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500/25 to-indigo-500/25 hover:from-cyan-500/40 hover:to-indigo-500/40 border border-cyan-400/40 text-xs font-bold text-cyan-200 transition"
          >
            Make Search Bar Ultra-Large Hero Deck
          </button>
        </div>
      )}
    </div>
  );
};

interface TitlebarProps {
  serverConfig: JellyfinServerConfig;
  currentTrack: Track | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  artists?: Artist[];
  albumArtists?: Artist[];
  albums?: Album[];
  tracks?: Track[];
  onNavigateToArtist?: (artistName: string) => void;
  onNavigateToAlbumArtist?: (artistName: string) => void;
  onNavigateToAlbum?: (albumTitle: string, albumId?: string) => void;
  onPlayTrack?: (track: Track, contextTracks?: Track[], index?: number) => void;
  onContextMenuArtist?: (e: React.MouseEvent, artistOrName: Artist | string) => void;
  onContextMenuAlbum?: (e: React.MouseEvent, album: Album) => void;
  onContextMenuTrack?: (e: React.MouseEvent, track: Track) => void;
  onGoHome?: () => void;
  onOpenServerModal: () => void;
  onOpenDspModal: () => void;
  onOpenSpecsModal: () => void;
  onOpenSettingsModal: () => void;
  onToggleVisualizer: () => void;
  layoutConfig?: LayoutConfig;
  onUpdateLayout?: (partial: Partial<LayoutConfig>) => void;
  isLayoutEditMode?: boolean;
  onToggleLayoutEditMode?: () => void;
  onDragStartSection?: (section: DraggableSectionId) => void;
  onDragEndSection?: () => void;
}

export const Titlebar: React.FC<TitlebarProps> = ({
  serverConfig,
  currentTrack,
  searchQuery,
  onSearchChange,
  artists,
  albumArtists,
  albums,
  tracks,
  onNavigateToArtist,
  onNavigateToAlbumArtist,
  onNavigateToAlbum,
  onPlayTrack,
  onContextMenuArtist,
  onContextMenuAlbum,
  onContextMenuTrack,
  onGoHome,
  onOpenServerModal,
  onOpenDspModal,
  onOpenSpecsModal,
  onOpenSettingsModal,
  onToggleVisualizer,
  layoutConfig,
  onUpdateLayout,
  isLayoutEditMode = false,
  onToggleLayoutEditMode,
  onDragStartSection,
  onDragEndSection,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const titlebarHeight = layoutConfig?.titlebarHeightPx ?? 64;
  const showSearchInTitlebar = (layoutConfig?.searchBarPosition || 'titlebar') === 'titlebar';

  const startTitlebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onUpdateLayout) return;

    setIsResizing(true);
    const startY = e.clientY;
    const startH = titlebarHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const nextH = Math.max(44, Math.min(110, startH + (moveEvent.clientY - startY)));
      onUpdateLayout({
        titlebarHeightPx: nextH,
        searchBarHeightPx: Math.max(32, Math.min(72, nextH - 16)),
      });
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'row-resize';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleCloseWindow = () => {
    const desktop = (window as any).jellywispDesktop;
    if (desktop?.closeWindow) {
      desktop.closeWindow();
    } else if (desktop?.close) {
      desktop.close();
    }
  };

  const handleMinimizeWindow = () => {
    const desktop = (window as any).jellywispDesktop;
    if (desktop?.minimizeWindow) {
      desktop.minimizeWindow();
    } else if (desktop?.minimize) {
      desktop.minimize();
    }
  };

  const handleMaximizeWindow = () => {
    const desktop = (window as any).jellywispDesktop;
    if (desktop?.maximizeWindow) {
      desktop.maximizeWindow();
    } else if (desktop?.maximize) {
      desktop.maximize();
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  const startWindowDragFallback = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('button, input, select, textarea, a, [role="button"], .no-drag')
    ) {
      return;
    }
    const desktop = (window as any).jellywispDesktop;
    if (!desktop?.moveWindowBy) return;

    let lastScreenX = e.screenX;
    let lastScreenY = e.screenY;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.screenX - lastScreenX;
      const dy = ev.screenY - lastScreenY;
      if (dx !== 0 || dy !== 0) {
        lastScreenX = ev.screenX;
        lastScreenY = ev.screenY;
        desktop.moveWindowBy(dx, dy);
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const isLocked = layoutConfig?.layoutLocked ?? true;
  const isMacTitlebar = layoutConfig?.titlebarStyle === 'mac';

  return (
    <header
      style={{ height: `${titlebarHeight}px` }}
      onMouseDown={startWindowDragFallback}
      onDoubleClick={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('button, input, select, textarea, a, [role="button"], .no-drag')) {
          handleMaximizeWindow();
        }
      }}
      className={`jellywisp-titlebar window-drag-region border-b border-white/10 flex items-center justify-between px-4 shrink-0 select-none backdrop-blur-md z-30 relative ${
        layoutConfig?.swapTitlebarSides ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Real-time Bottom Edge Drag Resize Handle (only when layout is unlocked) */}
      {onUpdateLayout && !isLocked && (
        <div
          onMouseDown={startTitlebarResize}
          title="Drag bottom edge to resize titlebar height"
          className={`absolute left-0 right-0 bottom-0 h-1.5 z-40 cursor-row-resize hover:bg-cyan-400/60 transition-colors ${
            isResizing ? 'bg-cyan-400' : ''
          }`}
        />
      )}

      {/* Left: Window Controls (if mac), App Branding & Server Status */}
      <div className="flex items-center gap-3 shrink-0">
        {layoutConfig?.showWindowControls !== false && isMacTitlebar && (
          <div className="flex items-center gap-1.5 mr-2">
            <button
              onClick={handleCloseWindow}
              aria-label="Close window"
              className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-500 flex items-center justify-center group transition"
            >
              <X className="w-2 h-2 text-rose-950 opacity-0 group-hover:opacity-100 transition" />
            </button>
            <button
              onClick={handleMinimizeWindow}
              aria-label="Minimize window"
              className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 flex items-center justify-center group transition"
            >
              <Minus className="w-2 h-2 text-amber-950 opacity-0 group-hover:opacity-100 transition" />
            </button>
            <button
              onClick={handleMaximizeWindow}
              aria-label="Maximize window"
              className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 flex items-center justify-center group transition"
            >
              <Maximize2 className="w-1.5 h-1.5 text-emerald-950 opacity-0 group-hover:opacity-100 transition" />
            </button>
          </div>
        )}

        {/* Clickable JellyWisp App Logo -> Returns to Home */}
        {layoutConfig?.showBrandLogo !== false && (
          <button
            type="button"
            onClick={() => onGoHome?.()}
            className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer group"
            title="Click JellyWisp logo to return Home"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/30 group-hover:scale-105 transition">
              <Waves className="w-3.5 h-3.5 text-slate-950" />
            </div>
            <span className="text-sm font-extrabold tracking-wider text-slate-100 group-hover:text-white transition">
              JELLY<span className="text-[var(--fin-accent)] font-black">WISP</span>
            </span>
          </button>
        )}

        {/* Jellyfin Server Connection Pill */}
        {layoutConfig?.showServerPill !== false && (
          <button
            onClick={onOpenServerModal}
            className="ml-1 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition border border-white/10 group"
            title="Click to configure Jellyfin Server"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                serverConfig.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <Server className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition" />
            <span className="font-semibold truncate max-w-[130px] hidden lg:inline text-[11px]">
              {serverConfig.isDemoMode ? 'SoundSphere (Demo)' : serverConfig.serverName}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{serverConfig.pingMs}ms</span>
          </button>
        )}
        {/* Dedicated Window Drag Grip Handle */}
        <div
          title="Drag anywhere on the titlebar or this grip to move window • Double-click to maximize"
          className="window-drag-region hidden md:flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-300 cursor-move select-none"
        >
          <GripVertical className="w-3.5 h-3.5 opacity-60" />
        </div>
      </div>

      {/* Center: Prominent Power Search Bar (when docked in titlebar) */}
      <div className="window-drag-region flex-1 flex items-center justify-center min-w-0">
        {showSearchInTitlebar ? (
          <SearchBarSection
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            artists={artists}
            albumArtists={albumArtists}
            albums={albums}
            tracks={tracks}
            onNavigateToArtist={onNavigateToArtist}
            onNavigateToAlbumArtist={onNavigateToAlbumArtist}
            onNavigateToAlbum={onNavigateToAlbum}
            onPlayTrack={onPlayTrack}
            onContextMenuArtist={onContextMenuArtist}
            onContextMenuAlbum={onContextMenuAlbum}
            onContextMenuTrack={onContextMenuTrack}
            layoutConfig={layoutConfig}
            onUpdateLayout={onUpdateLayout}
            onDragStartSection={onDragStartSection}
            onDragEndSection={onDragEndSection}
          />
        ) : (
          <button
            onClick={() => onUpdateLayout?.({ searchBarPosition: 'titlebar' })}
            className="no-drag text-[11px] font-mono text-slate-400 hover:text-cyan-300 px-3 py-1 rounded-lg bg-white/5 border border-white/5 transition"
          >
            Search Docked to {layoutConfig?.searchBarPosition === 'hero-top' ? 'Hero Deck' : 'Bottom Deck'} (Click to return to Titlebar)
          </button>
        )}
      </div>

      {/* Right: Drag & Drop Layout Mode + Audio Quality Specs + Dedicated Settings Button */}
      <div className="flex items-center gap-2 shrink-0">
        {currentTrack && layoutConfig?.showAudioSpecsBadge !== false && (
          <button
            onClick={onOpenSpecsModal}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-[11px] font-mono font-medium text-cyan-300 hover:bg-cyan-900/60 transition shadow-sm"
            title="Click to view real-time audio metrics and buffer health"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>
              {currentTrack.codec} {Math.round(currentTrack.sampleRate / 1000)}k/{currentTrack.bitDepth}b
            </span>
          </button>
        )}

        {/* Accidental Drag Prevention Lock Button */}
        {onUpdateLayout && (
          <button
            onClick={() => onUpdateLayout({ layoutLocked: !isLocked })}
            data-testid="toggle-layout-lock-btn"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border ${
              isLocked
                ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-400/50 shadow-md shadow-amber-500/10'
            }`}
            title={
              isLocked
                ? 'Layout is Locked: Accidental real-time drag & dock is disabled. Click to unlock.'
                : 'Layout is Unlocked: Real-time drag & dock is active. Click to lock.'
            }
          >
            {isLocked ? (
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            )}
            <span className="hidden sm:inline">{isLocked ? 'Locked' : 'Unlocked'}</span>
          </button>
        )}

        {onToggleLayoutEditMode && !isLocked && (
          <button
            onClick={onToggleLayoutEditMode}
            data-testid="toggle-layout-mode-btn"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border ${
              isLayoutEditMode
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/20'
                : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
            }`}
            title="Toggle Interactive Drag & Drop Dock Editor"
          >
            <Move className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {isLayoutEditMode ? 'Done Moving' : 'Edit Layout'}
            </span>
          </button>
        )}

        {layoutConfig?.showQuickUtilityButtons !== false && (
          <>
            <button
              onClick={onOpenSpecsModal}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-lg transition"
              title="Audio Engine Telemetry & Buffer Metrics"
              aria-label="Audio metrics"
            >
              <Activity className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={onOpenDspModal}
              className="p-2 text-slate-400 hover:text-[var(--fin-accent)] hover:bg-white/5 rounded-lg transition"
              title="10-Band Parametric Equalizer & DSP"
              aria-label="Equalizer"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleVisualizer}
              className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition hidden sm:block"
              title="Immersive 60fps Audio Visualizer"
              aria-label="Audio visualizer"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </>
        )}

        <button
          onClick={onOpenSettingsModal}
          data-testid="open-settings-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 text-white border border-[var(--fin-accent)]/40 hover:border-[var(--fin-accent)] transition text-xs font-bold shadow-sm shadow-cyan-500/10 ml-1"
          aria-label="All settings"
          title="Open Unified Settings & Customization Center"
        >
          <Settings className="w-4 h-4 text-[var(--fin-accent)]" />
          <span>Settings</span>
        </button>

        {/* Windows Desktop Titlebar Controls (Minimize, Maximize/Restore, Close) */}
        {layoutConfig?.showWindowControls !== false && !isMacTitlebar && (
          <div className="flex items-center h-full ml-2 border-l border-white/10 pl-1">
            <button
              onClick={handleMinimizeWindow}
              aria-label="Minimize"
              className="w-10 h-8 flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-white transition rounded-md"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximizeWindow}
              aria-label="Maximize or Restore"
              className="w-10 h-8 flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-white transition rounded-md"
              title="Maximize"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={handleCloseWindow}
              aria-label="Close"
              className="w-10 h-8 flex items-center justify-center hover:bg-rose-600 hover:text-white text-slate-400 transition rounded-md"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
