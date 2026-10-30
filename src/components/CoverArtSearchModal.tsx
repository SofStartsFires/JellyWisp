import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { metadataService, ArtSearchResult } from '../services/metadataService.ts';
import { handleCoverImgError, resolveCoverArt } from '../utils/jellywispArtwork.ts';
import { Artist, Album, Track } from '../types/index.ts';
import { computeMissingArtworkItems } from '../utils/libraryHelpers.ts';

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
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [customDirectUrl, setCustomDirectUrl] = useState('');
  const [missingTab, setMissingTab] = useState<'artists' | 'albums'>('artists');
  const [missingFilter, setMissingFilter] = useState('');
  const [activeTargetOverride, setActiveTargetOverride] = useState<ArtApplyTargetOverride | null>(
    null
  );
  const [activeTargetLabel, setActiveTargetLabel] = useState<string | undefined>(targetLabel);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { missingArtists, missingAlbums } = useMemo(
    () => computeMissingArtworkItems(artists, albums, tracks),
    [artists, albums, tracks]
  );

  const filteredMissingArtists = useMemo(() => {
    const q = missingFilter.trim().toLowerCase();
    if (!q) return missingArtists;
    return missingArtists.filter((a) => a.name.toLowerCase().includes(q));
  }, [missingArtists, missingFilter]);

  const filteredMissingAlbums = useMemo(() => {
    const q = missingFilter.trim().toLowerCase();
    if (!q) return missingAlbums;
    return missingAlbums.filter(
      (a) => a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)
    );
  }, [missingAlbums, missingFilter]);

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
        // Automatically select the first artist missing artwork so user can start right away
        const firstArtist = missingArtists[0];
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

  const handleApplyArt = (urlToApply: string, scope: 'artist' | 'track-album') => {
    if (!urlToApply) return;
    const targetOverride: ArtApplyTargetOverride = activeTargetOverride || {
      artistName: scope === 'artist' ? activeTargetLabel || query.trim() : undefined,
    };

    onSelectArt(urlToApply, scope, targetOverride);

    const appliedLabel =
      targetOverride.albumTitle || targetOverride.artistName || activeTargetLabel || query.trim();
    setStatusMessage(`Saved artwork for "${appliedLabel}"`);
    setCustomDirectUrl('');

    // If working through missing artists, auto-advance to the next missing artist
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
  };

  const content = (
    <div
      className={`${
        embedded
          ? 'flex-1 flex flex-col h-full overflow-hidden bg-[#0a0f1c]'
          : 'w-full max-w-6xl bg-[#0c111f] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]'
      } select-none`}
    >
      {/* Header */}
      <div className="px-6 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/35 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Cover Art Finder
              </h3>
              {missingArtists.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-300">
                  {missingArtists.length} artists missing art
                </span>
              )}
              {missingAlbums.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300">
                  {missingAlbums.length} albums missing art
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {activeTargetLabel
                ? `Target: ${activeTargetLabel}`
                : 'Select any artist or album missing artwork on the left, or search below'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusMessage && (
            <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>{statusMessage}</span>
            </span>
          )}
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

      {/* Main Two-Column Body: Left Missing Artwork Queue + Right Search & Results */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left Sidebar: All Artists & Albums Missing Artwork */}
        <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-white/10 bg-black/25 flex flex-col shrink-0 max-h-56 md:max-h-none">
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
                <span>Missing Artists ({missingArtists.length})</span>
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
                <span>Albums ({missingAlbums.length})</span>
              </button>
            </div>

            <input
              type="text"
              value={missingFilter}
              onChange={(e) => setMissingFilter(e.target.value)}
              placeholder={`Filter missing ${missingTab}...`}
              className="w-full bg-white/5 text-xs text-slate-200 placeholder:text-slate-500 px-3 py-1.5 rounded-lg border border-white/10 focus:border-[var(--fin-accent)] focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {missingTab === 'artists' ? (
              filteredMissingArtists.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                  <Sparkles className="w-5 h-5 text-emerald-400 mx-auto" />
                  <p className="text-slate-300 font-semibold">All artists have artwork!</p>
                </div>
              ) : (
                filteredMissingArtists.map((art) => {
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
            ) : filteredMissingAlbums.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                <Sparkles className="w-5 h-5 text-emerald-400 mx-auto" />
                <p className="text-slate-300 font-semibold">All albums have cover art!</p>
              </div>
            ) : (
              filteredMissingAlbums.map((alb) => {
                const isCurrentTarget = activeTargetOverride?.albumId === alb.id;
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
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{alb.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{alb.artist}</p>
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

            {/* Optional direct image URL input */}
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={customDirectUrl}
                onChange={(e) => {
                  setCustomDirectUrl(e.target.value);
                  if (e.target.value.trim()) setSelectedUrl(e.target.value.trim());
                }}
                placeholder="Or paste a direct image URL (https://...)"
                className="flex-1 bg-black/30 text-[11px] text-slate-300 placeholder:text-slate-500 px-3 py-1.5 rounded-lg border border-white/10 focus:border-[var(--fin-accent)] focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Results Grid */}
          <div className="p-5 flex-1 overflow-y-auto">
            {isSearching ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-cyan-300 text-xs font-mono">
                <Loader2 className="w-7 h-7 animate-spin text-[var(--fin-accent)]" />
                <span>Searching artwork for "{query}"...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-14 text-slate-400 text-xs space-y-2">
                <ImageIcon className="w-9 h-9 mx-auto text-slate-600" />
                <p className="font-semibold text-slate-300">
                  {query.trim()
                    ? `No artwork found for "${query}".`
                    : 'Click any missing artist on the left or search above.'}
                </p>
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
                            : 'track-album'
                        )
                      }
                      title="Click to select • Double-click to apply immediately"
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
            <span className="text-xs text-slate-400 font-mono truncate max-w-sm">
              {selectedUrl
                ? `Selected artwork ready for ${activeTargetLabel || query || 'target'}`
                : 'Click any artwork card to select (or double-click to apply)'}
            </span>
            <div className="flex items-center gap-2">
              {!embedded && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
              )}
              <button
                disabled={!selectedUrl}
                onClick={() => selectedUrl && handleApplyArt(selectedUrl, 'artist')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white text-xs font-bold border border-white/10 transition"
              >
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  Apply to Artist
                  {activeTargetOverride?.artistName ? ` (${activeTargetOverride.artistName})` : ''}
                </span>
              </button>
              <button
                disabled={!selectedUrl}
                onClick={() => selectedUrl && handleApplyArt(selectedUrl, 'track-album')}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[var(--fin-accent)] hover:opacity-90 disabled:opacity-40 text-slate-950 text-xs font-extrabold shadow-md transition"
              >
                <Disc className="w-3.5 h-3.5" />
                <span>Apply to Album &amp; Tracks</span>
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
