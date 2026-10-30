import React, { useState, useEffect } from 'react';
import { X, Search, Image as ImageIcon, Check, Disc, User, Loader2 } from 'lucide-react';
import { metadataService, ArtSearchResult } from '../services/metadataService.ts';
import { handleCoverImgError } from '../utils/jellywispArtwork.ts';

interface CoverArtSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultQuery: string;
  initialMode?: 'album' | 'artist' | 'all';
  targetLabel?: string;
  onSelectArt: (url: string, applyScope?: 'track-album' | 'artist') => void;
}

export const CoverArtSearchModal: React.FC<CoverArtSearchModalProps> = ({
  isOpen,
  onClose,
  defaultQuery,
  initialMode = 'all',
  targetLabel,
  onSelectArt,
}) => {
  const [query, setQuery] = useState(defaultQuery || '');
  const [searchMode, setSearchMode] = useState<'album' | 'artist' | 'all'>(initialMode);
  const [results, setResults] = useState<ArtSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [customDirectUrl, setCustomDirectUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      const cleanQuery = (defaultQuery || '').trim();
      setQuery(cleanQuery);
      setSearchMode(initialMode);
      setSelectedUrl(null);
      if (cleanQuery) {
        setIsSearching(true);
        metadataService
          .searchAlbumArt(cleanQuery, initialMode)
          .then((res) => {
            setResults(res);
          })
          .catch((err) => {
            console.warn('Cover art search failed:', err);
            setResults([]);
          })
          .finally(() => {
            setIsSearching(false);
          });
      } else {
        setResults([]);
      }
    }
  }, [isOpen, defaultQuery, initialMode]);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent, modeOverride?: 'album' | 'artist' | 'all') => {
    if (e) e.preventDefault();
    const activeMode = modeOverride || searchMode;
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const searchResults = await metadataService.searchAlbumArt(query, activeMode);
      setResults(searchResults);
    } catch (err) {
      console.warn('Artwork search error:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-4xl bg-[#0c111f] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/35">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Album &amp; Artist Artwork Search
              </h3>
              <p className="text-xs text-slate-400">
                {targetLabel
                  ? `Searching artwork for: ${targetLabel}`
                  : 'Search real high-resolution album covers & artist artwork via iTunes Hi-Res & Cover Art Archive'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar + Mode Filter */}
        <div className="p-4 border-b border-white/10 bg-black/20 space-y-3">
          <form onSubmit={(e) => handleSearch(e)} className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type artist name, album title, or single..."
                className="w-full bg-white/5 text-xs text-slate-100 placeholder:text-slate-500 pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:border-[var(--fin-accent)] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              {(
                [
                  { id: 'all', label: 'All Artwork' },
                  { id: 'album', label: 'Albums & Singles' },
                  { id: 'artist', label: 'Artist Images' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSearchMode(m.id);
                    if (query.trim()) handleSearch(undefined, m.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
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
              className="px-5 py-2.5 rounded-xl bg-[var(--fin-accent)] hover:opacity-90 text-slate-950 text-xs font-extrabold shadow-md transition disabled:opacity-40"
            >
              {isSearching ? 'Searching...' : 'Search Artwork'}
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
              placeholder="Or paste a direct image URL (https://...) to apply immediately"
              className="flex-1 bg-black/30 text-[11px] text-slate-300 placeholder:text-slate-500 px-3 py-1.5 rounded-lg border border-white/10 focus:border-[var(--fin-accent)] focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Results Grid */}
        <div className="p-6 flex-1 overflow-y-auto">
          {isSearching ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-cyan-300 text-xs font-mono">
              <Loader2 className="w-7 h-7 animate-spin text-[var(--fin-accent)]" />
              <span>Querying iTunes Hi-Res &amp; MusicBrainz Cover Art Archive for "{query}"...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-14 text-slate-400 text-xs space-y-2">
              <ImageIcon className="w-9 h-9 mx-auto text-slate-600" />
              <p className="font-semibold text-slate-300">
                {query.trim()
                  ? `No artwork found for "${query}". Try searching by Artist + Album or Artist Name.`
                  : 'Enter an album title or artist name above to search real high-resolution artwork.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {results.map((item) => {
                const isSelected = selectedUrl === item.url;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedUrl(item.url)}
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
        <div className="px-6 py-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/30">
          <span className="text-xs text-slate-400 font-mono truncate max-w-sm">
            {selectedUrl ? 'Artwork ready to apply' : 'Click any artwork card above to select'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              disabled={!selectedUrl}
              onClick={() => {
                if (selectedUrl) {
                  onSelectArt(selectedUrl, 'artist');
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white text-xs font-bold border border-white/10 transition"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Apply to Artist</span>
            </button>
            <button
              disabled={!selectedUrl}
              onClick={() => {
                if (selectedUrl) {
                  onSelectArt(selectedUrl, 'track-album');
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[var(--fin-accent)] hover:opacity-90 disabled:opacity-40 text-slate-950 text-xs font-extrabold shadow-md transition"
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Apply to Track &amp; Album</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
