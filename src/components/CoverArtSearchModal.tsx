import React, { useState } from 'react';
import { X, Search, Image as ImageIcon, Check, Sparkles } from 'lucide-react';
import { metadataService, ArtSearchResult } from '../services/metadataService.ts';

interface CoverArtSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultQuery: string;
  onSelectArt: (url: string) => void;
}

export const CoverArtSearchModal: React.FC<CoverArtSearchModalProps> = ({
  isOpen,
  onClose,
  defaultQuery,
  onSelectArt,
}) => {
  const [query, setQuery] = useState(defaultQuery || 'Neon Odyssey');
  const [results, setResults] = useState<ArtSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      const initialQuery = defaultQuery || 'Neon Odyssey';
      setQuery(initialQuery);
      setIsSearching(true);
      metadataService.searchAlbumArt(initialQuery).then((res) => {
        setResults(res);
        setIsSearching(false);
      });
    }
  }, [isOpen, defaultQuery]);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    const searchResults = await metadataService.searchAlbumArt(query);
    setResults(searchResults);
    setIsSearching(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#0e1320] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                High-Resolution Album Art Finder
              </h3>
              <p className="text-xs text-slate-400">
                Search high-fidelity artwork across MusicBrainz, iTunes API & Audiophile archives
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

        {/* Search Bar */}
        <div className="p-4 border-b border-white/5 bg-black/10">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search artist, album name, or release group..."
                className="w-full bg-white/5 text-xs text-slate-200 placeholder:text-slate-500 pl-9 pr-4 py-2.5 rounded-xl border border-white/10 focus:border-pink-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-md shadow-pink-600/20 transition disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Results Grid */}
        <div className="p-6 flex-1 overflow-y-auto">
          {results.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs space-y-2">
              <ImageIcon className="w-8 h-8 mx-auto text-slate-600" />
              <p>Type an album name above or click Search to browse high-res artwork options.</p>
              <button
                onClick={() => handleSearch()}
                className="text-pink-400 font-semibold underline text-xs"
              >
                Browse Curated Hi-Fi Cover Library
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {results.map((item) => {
                const isSelected = selectedUrl === item.url;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedUrl(item.url)}
                    className={`group relative rounded-xl overflow-hidden border cursor-pointer transition flex flex-col bg-black/30 ${
                      isSelected
                        ? 'border-pink-500 ring-2 ring-pink-500/40'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="aspect-square w-full relative">
                      <img
                        src={item.thumbnail || item.url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <span className="absolute bottom-1.5 left-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-slate-300 backdrop-blur-sm">
                        {item.source}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center shadow">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-bold text-white truncate">{item.title}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.artist}
                      </p>
                      <p className="text-[10px] text-pink-400/90 font-mono mt-1">
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
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-black/20">
          <span className="text-xs text-slate-400 font-mono">
            {selectedUrl ? 'Cover selected' : 'Select a cover to apply'}
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
                  onSelectArt(selectedUrl);
                  onClose();
                }
              }}
              className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-pink-600/20 transition"
            >
              Apply to Track & Album
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
