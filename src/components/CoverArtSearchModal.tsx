import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Search,
  Image as ImageIcon,
  Check,
  Disc,
  User,
  Loader2,
  AlertCircle,
  Sparkles,
  Upload,
  FolderOpen,
  Download,
} from 'lucide-react';
import { metadataService, ArtSearchResult } from '../services/metadataService.ts';
import { jellyfin } from '../services/jellyfinService.ts';
import { handleCoverImgError, resolveCoverArt } from '../utils/jellywispArtwork.ts';
import { Artist, Album, Track } from '../types/index.ts';
import {
  computeMissingArtworkItems,
  sortArtistsDefault,
  sortAlbumsDefault,
} from '../utils/libraryHelpers.ts';

export interface ArtApplyTargetOverride {
  artistName?: string;
  albumId?: string;
  albumTitle?: string;
}

interface CoverArtSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultQuery: string;
  initialMode?: 'album' | 'artist' | 'all';
  targetLabel?: string;
  artists?: Artist[];
  albums?: Album[];
  tracks?: Track[];
  embedded?: boolean;
  onSelectArt: (
    url: string,
    applyScope?: 'track-album' | 'artist',
    targetOverride?: ArtApplyTargetOverride
  ) => void;
}

export const CoverArtSearchModal: React.FC<CoverArtSearchModalProps> = ({
  isOpen,
  onClose,
  defaultQuery,
  initialMode = 'all',
  targetLabel,
  artists = [],
  albums = [],
  tracks = [],
  embedded = false,
  onSelectArt,
}) => {
  const [query, setQuery] = useState(defaultQuery || '');
  const [searchMode, setSearchMode] = useState<'album' | 'artist' | 'all'>(initialMode);
  const [results, setResults] = useState<ArtSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [customDirectUrl, setCustomDirectUrl] = useState('');
  const [missingTab, setMissingTab] = useState<'artists' | 'albums'>('artists');
  const [showAllLibraryItems, setShowAllLibraryItems] = useState(false);
  const [missingFilter, setMissingFilter] = useState('');
  const [activeTargetOverride, setActiveTargetOverride] = useState<ArtApplyTargetOverride | null>(
    null
  );
  const [activeTargetLabel, setActiveTargetLabel] = useState<string | undefined>(targetLabel);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { missingArtists, missingAlbums } = useMemo(
    () => computeMissingArtworkItems(artists, albums, tracks),
    [artists, albums, tracks]
  );

  const displayedArtists = useMemo(() => {
    const source = showAllLibraryItems ? sortArtistsDefault(artists) : missingArtists;
    const q = missingFilter.trim().toLowerCase();
    if (!q) return source;
    return source.filter((a) => a.name.toLowerCase().includes(q));
  }, [showAllLibraryItems, artists, missingArtists, missingFilter]);

  const displayedAlbums = useMemo(() => {
    const source = showAllLibraryItems ? sortAlbumsDefault(albums) : missingAlbums;
    const q = missingFilter.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (a) => a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)
    );
  }, [showAllLibraryItems, albums, missingAlbums, missingFilter]);

  const runSearch = async (searchQ: string, mode: 'album' | 'artist' | 'all') => {
    const clean = searchQ.trim();
    if (!clean) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    setSelectedUrl(null);
    try {
      const res = await metadataService.searchAlbumArt(clean, mode);
      setResults(res);
      if (res.length > 0) {
        setSelectedUrl(res[0].url);
      }
    } catch (err) {
      console.warn('Cover art search failed:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (isOpen || embedded) {
      const cleanQuery = (defaultQuery || '').trim();
      setActiveTargetOverride(null);
      setActiveTargetLabel(targetLabel);
      setStatusMessage(null);

      if (cleanQuery) {
        setQuery(cleanQuery);
        setSearchMode(initialMode);
        runSearch(cleanQuery, initialMode);
      } else if (missingArtists.length > 0) {
        const firstArtist = missingArtists[0];
        setActiveTargetOverride({ artistName: firstArtist.name });
        setActiveTargetLabel(firstArtist.name);
        setQuery(firstArtist.name);
        setSearchMode('artist');
        runSearch(firstArtist.name, 'artist');
      } else if (missingAlbums.length > 0) {
        const firstAlbum = missingAlbums[0];
        const searchStr = `${firstAlbum.artist} ${firstAlbum.title}`.trim();
        setActiveTargetOverride({
          albumId: firstAlbum.id,
          albumTitle: firstAlbum.title,
          artistName: firstAlbum.artist,
        });
        setActiveTargetLabel(`${firstAlbum.title} — ${firstAlbum.artist}`);
        setMissingTab('albums');
        setQuery(searchStr);
        setSearchMode('album');
        runSearch(searchStr, 'album');
      } else if (artists.length > 0) {
        const firstArtist = artists[0];
        setActiveTargetOverride({ artistName: firstArtist.name });
        setActiveTargetLabel(firstArtist.name);
        setQuery(firstArtist.name);
        setSearchMode('artist');
        runSearch(firstArtist.name, 'artist');
      } else {
        setResults([]);
      }
    }
  }, [isOpen, embedded, defaultQuery, initialMode, targetLabel]);

  if (!isOpen && !embedded) return null;

  const handleSearch = async (e?: React.FormEvent, modeOverride?: 'album' | 'artist' | 'all') => {
    if (e) e.preventDefault();
    const activeMode = modeOverride || searchMode;
    await runSearch(query, activeMode);
  };

  const handleSelectMissingArtist = (artist: Artist) => {
    setActiveTargetOverride({ artistName: artist.name });
    setActiveTargetLabel(artist.name);
    setSearchMode('artist');
    setQuery(artist.name);
    setStatusMessage(null);
    runSearch(artist.name, 'artist');
  };

  const handleSelectMissingAlbum = (album: Album) => {
    const searchStr = `${album.artist} ${album.title}`.trim();
    setActiveTargetOverride({
      albumId: album.id,
      albumTitle: album.title,
      artistName: album.artist,
    });
    setActiveTargetLabel(`${album.title} — ${album.artist}`);
    setSearchMode('album');
    setQuery(searchStr);
    setStatusMessage(null);
    runSearch(searchStr, 'album');
  };

  const handleApplyArt = async (
    urlToApply: string,
    scope: 'artist' | 'track-album',
    saveToDiskFolder = true
  ) => {
    if (!urlToApply) return;
    setIsSavingLocal(true);

    const targetOverride: ArtApplyTargetOverride = activeTargetOverride || {
      artistName: scope === 'artist' ? activeTargetLabel || query.trim() : undefined,
      albumTitle: scope === 'track-album' ? activeTargetLabel || query.trim() : undefined,
    };

    const appliedLabel =
      targetOverride.albumTitle || targetOverride.artistName || activeTargetLabel || query.trim() || 'artwork';

    let finalArtworkUrl = urlToApply;
    let savedDiskNote = '';

    // 1. Save image to local disk folder (./jellywisp-artwork/) so it persists locally even offline
    if (saveToDiskFolder) {
      try {
        const localSaved = await metadataService.saveArtworkToLocalFolder({
          label: `${scope}_${appliedLabel}`,
          imageUrl: urlToApply.startsWith('data:') ? undefined : urlToApply,
          dataUrl: urlToApply.startsWith('data:') ? urlToApply : undefined,
        });
        if (localSaved.ok) {
          if (localSaved.localUrl) {
            finalArtworkUrl = localSaved.localUrl;
          } else if (localSaved.dataUrl) {
            finalArtworkUrl = localSaved.dataUrl;
          }
          if (localSaved.fileName) {
            savedDiskNote = ` (saved to jellywisp-artwork/${localSaved.fileName})`;
          } else if (localSaved.filePath) {
            savedDiskNote = ' (saved to local artwork folder)';
          }

          // 2. Also attempt to push the image to the Jellyfin server if connected
          if (localSaved.dataUrl) {
            if (scope === 'track-album' && targetOverride.albumId) {
              jellyfin.uploadItemImage(targetOverride.albumId, localSaved.dataUrl).catch(() => {});
            } else if (scope === 'artist' && targetOverride.artistName) {
              const matchedArt = artists.find(
                (a) => a.name.trim().toLowerCase() === targetOverride.artistName!.trim().toLowerCase()
              );
              if (matchedArt?.id) {
                jellyfin.uploadItemImage(matchedArt.id, localSaved.dataUrl).catch(() => {});
              }
            }
          }
        }
      } catch {}
    }

    onSelectArt(finalArtworkUrl, scope, targetOverride);
    setIsSavingLocal(false);
    setStatusMessage(`Applied artwork for "${appliedLabel}"${savedDiskNote}`);
    setCustomDirectUrl('');

    // Auto-advance if working through the missing queue
    if (!showAllLibraryItems) {
      if (scope === 'artist' && targetOverride.artistName) {
        const currentKey = targetOverride.artistName.trim().toLowerCase();
        const remaining = missingArtists.filter(
          (a) => a.name.trim().toLowerCase() !== currentKey
        );
        if (remaining.length > 0) {
          const nextArtist = remaining[0];
          setActiveTargetOverride({ artistName: nextArtist.name });
          setActiveTargetLabel(nextArtist.name);
          setQuery(nextArtist.name);
          runSearch(nextArtist.name, 'artist');
        }
      } else if (scope === 'track-album' && targetOverride.albumId) {
        const remainingAlbums = missingAlbums.filter((a) => a.id !== targetOverride.albumId);
        if (remainingAlbums.length > 0) {
          handleSelectMissingAlbum(remainingAlbums[0]);
        }
      }
    }
  };

  const handleLocalFileSelected = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const localCard: ArtSearchResult = {
        id: `local-file-${Date.now()}`,
        source: 'Local File',
        url: dataUrl,
        thumbnail: dataUrl,
        title: file.name.replace(/\.[^.]+$/, ''),
        artist: activeTargetLabel || query || 'Local Image',
        resolution: `${Math.round(file.size / 1024)} KB (Local Replacement)`,
        kind: searchMode === 'artist' ? 'artist' : 'album',
      };
      setResults((prev) => [localCard, ...prev]);
      setSelectedUrl(dataUrl);
      setStatusMessage(`Loaded local file "${file.name}" — click Apply below or double-click card`);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenLocalArtworkFolder = async () => {
    const desktop = (window as any).jellywispDesktop;
    if (desktop?.openLocalArtworkFolder) {
      const res = await desktop.openLocalArtworkFolder();
      if (res?.folderPath) {
        setStatusMessage(`Opened folder: ${res.folderPath}`);
      }
    } else {
      setStatusMessage('Local artwork files are saved to ./jellywisp-artwork/ on disk');
    }
  };

  const content = (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFile(true);
      }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFile(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) handleLocalFileSelected(file);
      }}
      className={`${
        embedded
          ? 'flex-1 flex flex-col h-full overflow-hidden bg-[#0a0f1c]'
          : 'w-full max-w-6xl bg-[#0c111f] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]'
      } select-none relative`}
    >
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-cyan-950/80 border-2 border-dashed border-cyan-400 rounded-2xl flex flex-col items-center justify-center gap-2 pointer-events-none">
          <Upload className="w-10 h-10 text-cyan-300 animate-bounce" />
          <p className="text-sm font-extrabold text-white">
            Drop image file here to replace artwork locally
          </p>
        </div>
      )}

      {/* Hidden File Input for Local Image Replacement */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleLocalFileSelected(f);
          e.target.value = '';
        }}
      />

      {/* Header */}
      <div className="px-6 py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/35 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Cover Art Finder &amp; Local Artwork Manager
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-300">
                {missingArtists.length} artists missing art
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300">
                {missingAlbums.length} albums missing art
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {activeTargetLabel
                ? `Active Target: ${activeTargetLabel}`
                : 'Search online (Apple Music, Deezer, Wikipedia) or upload a local image file to replace artwork'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusMessage && (
            <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 max-w-md truncate">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{statusMessage}</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            data-testid="upload-local-artwork-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition"
            title="Select an image file (.jpg, .png, .webp) from your computer to replace artwork locally"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Local Image</span>
          </button>

          <button
            type="button"
            onClick={handleOpenLocalArtworkFolder}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition"
            title="View local jellywisp-artwork folder where saved images are stored on disk"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Artwork Folder</span>
          </button>

          {!embedded && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Body: Left Missing/All Queue + Right Search & Results */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left Sidebar: Artists & Albums Queue */}
        <aside className="w-full md:w-76 border-b md:border-b-0 md:border-r border-white/10 bg-black/25 flex flex-col shrink-0 max-h-60 md:max-h-none">
          <div className="p-3 border-b border-white/10 space-y-2">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setMissingTab('artists')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  missingTab === 'artists'
                    ? 'bg-[var(--fin-accent)] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>
                  Artists ({showAllLibraryItems ? artists.length : missingArtists.length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMissingTab('albums')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  missingTab === 'albums'
                    ? 'bg-[var(--fin-accent)] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Disc className="w-3.5 h-3.5" />
                <span>
                  Albums ({showAllLibraryItems ? albums.length : missingAlbums.length})
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {showAllLibraryItems ? 'Showing All Library' : 'Showing Missing Art Only'}
              </span>
              <button
                type="button"
                onClick={() => setShowAllLibraryItems((v) => !v)}
                className="text-[10px] font-mono font-bold text-cyan-400 hover:underline"
              >
                {showAllLibraryItems ? 'Show Missing Only' : 'Show All Library'}
              </button>
            </div>

            <input
              type="text"
              value={missingFilter}
              onChange={(e) => setMissingFilter(e.target.value)}
              placeholder={`Filter ${missingTab}...`}
              className="w-full bg-white/5 text-xs text-slate-200 placeholder:text-slate-500 px-3 py-1.5 rounded-lg border border-white/10 focus:border-[var(--fin-accent)] focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {missingTab === 'artists' ? (
              displayedArtists.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                  <Sparkles className="w-5 h-5 text-emerald-400 mx-auto" />
                  <p className="text-slate-200 font-semibold">
                    {missingFilter ? 'No matching artists' : 'All artists have artwork!'}
                  </p>
                  {!showAllLibraryItems && artists.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllLibraryItems(true)}
                      className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-cyan-300 text-[11px] font-bold transition"
                    >
                      Browse All {artists.length} Artists to Replace Art
                    </button>
                  )}
                </div>
              ) : (
                displayedArtists.map((art) => {
                  const isCurrentTarget =
                    activeTargetOverride?.artistName?.toLowerCase() === art.name.toLowerCase();
                  return (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => handleSelectMissingArtist(art)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs transition ${
                        isCurrentTarget
                          ? 'bg-[var(--fin-accent)]/20 text-[var(--fin-accent)] border border-[var(--fin-accent)]/40 font-bold'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={resolveCoverArt(art.coverUrl)}
                          onError={handleCoverImgError}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0"
                        />
                        <span className="truncate">{art.name}</span>
                      </div>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                    </button>
                  );
                })
              )
            ) : displayedAlbums.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                <Sparkles className="w-5 h-5 text-emerald-400 mx-auto" />
                <p className="text-slate-200 font-semibold">
                  {missingFilter ? 'No matching albums' : 'All albums have cover art!'}
                </p>
                {!showAllLibraryItems && albums.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllLibraryItems(true)}
                    className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-cyan-300 text-[11px] font-bold transition"
                  >
                    Browse All {albums.length} Albums to Replace Art
                  </button>
                )}
              </div>
            ) : (
              displayedAlbums.map((alb) => {
                const isCurrentTarget =
                  activeTargetOverride?.albumId === alb.id ||
                  activeTargetOverride?.albumTitle?.toLowerCase() === alb.title.toLowerCase();
                return (
                  <button
                    key={alb.id}
                    type="button"
                    onClick={() => handleSelectMissingAlbum(alb)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs transition ${
                      isCurrentTarget
                        ? 'bg-[var(--fin-accent)]/20 text-[var(--fin-accent)] border border-[var(--fin-accent)]/40 font-bold'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={resolveCoverArt(alb.coverUrl)}
                        onError={handleCoverImgError}
                        alt=""
                        className="w-7 h-7 rounded-md object-cover border border-white/10 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{alb.title}</p>
                        <p className="text-[10px] text-slate-500 truncate">{alb.artist}</p>
                      </div>
                    </div>
                    <AlertCircle className="w-3.5 h-3.5 text-cyan-400/80 shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Column: Search Controls + Artwork Results Grid */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Search Bar + Mode Filter */}
          <div className="p-4 border-b border-white/10 bg-black/20 space-y-2.5 shrink-0">
            <form onSubmit={(e) => handleSearch(e)} className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search artist name, album title, or single..."
                  className="w-full bg-white/5 text-xs text-slate-100 placeholder:text-slate-500 pl-10 pr-4 py-2 rounded-xl border border-white/10 focus:border-[var(--fin-accent)] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'artist', label: 'Artists' },
                    { id: 'album', label: 'Albums' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSearchMode(m.id);
                      if (query.trim()) handleSearch(undefined, m.id);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      searchMode === m.id
                        ? 'bg-[var(--fin-accent)] text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className="px-4 py-2 rounded-xl bg-[var(--fin-accent)] hover:opacity-90 text-slate-950 text-xs font-extrabold shadow-md transition disabled:opacity-40"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {/* Direct image URL input + Local File Drop Hint */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="url"
                value={customDirectUrl}
                onChange={(e) => {
                  setCustomDirectUrl(e.target.value);
                  if (e.target.value.trim()) setSelectedUrl(e.target.value.trim());
                }}
                placeholder="Paste direct image URL (https://...) or drag & drop an image file anywhere..."
                className="flex-1 bg-black/30 text-[11px] text-slate-300 placeholder:text-slate-500 px-3 py-1.5 rounded-lg border border-white/10 focus:border-[var(--fin-accent)] focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Results Grid */}
          <div className="p-5 flex-1 overflow-y-auto">
            {isSearching ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-cyan-300 text-xs font-mono">
                <Loader2 className="w-7 h-7 animate-spin text-[var(--fin-accent)]" />
                <span>Searching Apple Music, Deezer &amp; Wikipedia for "{query}"...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-14 text-slate-400 text-xs space-y-3">
                <ImageIcon className="w-9 h-9 mx-auto text-slate-600" />
                <p className="font-semibold text-slate-300">
                  {query.trim()
                    ? `No online artwork found for "${query}".`
                    : 'Select an artist or album on the left, search above, or upload a local image.'}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-cyan-300 text-xs font-bold border border-white/10 transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choose Local Image File from Disk</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.map((item) => {
                  const isSelected = selectedUrl === item.url;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedUrl(item.url)}
                      onDoubleClick={() =>
                        handleApplyArt(
                          item.url,
                          searchMode === 'artist' || activeTargetOverride?.artistName
                            ? 'artist'
                            : 'track-album',
                          true
                        )
                      }
                      title="Click to select • Double-click to save to local folder & apply immediately"
                      className={`group relative rounded-xl overflow-hidden border cursor-pointer transition flex flex-col bg-black/40 ${
                        isSelected
                          ? 'border-[var(--fin-accent)] ring-2 ring-[var(--fin-accent)]/40'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="aspect-square w-full relative bg-black/50">
                        <img
                          src={item.thumbnail || item.url}
                          onError={handleCoverImgError}
                          alt={item.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <span className="absolute bottom-1.5 left-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/80 text-cyan-300 border border-white/10 backdrop-blur-sm">
                          {item.source}
                        </span>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--fin-accent)] text-slate-950 flex items-center justify-center shadow-lg">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-bold jw-text-track truncate">{item.title}</p>
                        <p className="text-[11px] jw-text-artist truncate mt-0.5">{item.artist}</p>
                        <p className="text-[10px] text-cyan-400/90 font-mono mt-1">
                          {item.resolution}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/30 shrink-0">
            <span className="text-xs text-slate-400 font-mono truncate max-w-sm flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">
                {selectedUrl
                  ? `Ready to save locally & apply to ${activeTargetLabel || query || 'target'}`
                  : 'Select a cover card or upload a local file'}
              </span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {!embedded && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
              )}
              <button
                disabled={!selectedUrl || isSavingLocal}
                onClick={() => selectedUrl && handleApplyArt(selectedUrl, 'artist', true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white text-xs font-bold border border-white/10 transition"
              >
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {isSavingLocal ? 'Saving...' : 'Save Locally & Apply to Artist'}
                  {activeTargetOverride?.artistName ? ` (${activeTargetOverride.artistName})` : ''}
                </span>
              </button>
              <button
                disabled={!selectedUrl || isSavingLocal}
                onClick={() => selectedUrl && handleApplyArt(selectedUrl, 'track-album', true)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[var(--fin-accent)] hover:opacity-90 disabled:opacity-40 text-slate-950 text-xs font-extrabold shadow-md transition"
              >
                <Disc className="w-3.5 h-3.5" />
                <span>{isSavingLocal ? 'Saving...' : 'Save Locally & Apply to Album'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      {content}
    </div>
  );
};
