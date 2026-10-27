import React from 'react';
import { Users, Disc, Music, Sparkles } from 'lucide-react';
import { Artist, Track } from '../types/index.ts';

interface ArtistListViewProps {
  artists: Artist[];
  onSelectArtist: (artist: Artist) => void;
}

export const ArtistListView: React.FC<ArtistListViewProps> = ({ artists, onSelectArtist }) => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 select-none space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Artists & Creators</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {artists.length} artists in your Jellyfin music collection
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {artists.map((artist) => (
          <div
            key={artist.id}
            onClick={() => onSelectArtist(artist)}
            className="p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 cursor-pointer transition flex items-start gap-4 group"
          >
            <img
              src={artist.coverUrl}
              alt={artist.name}
              className="w-20 h-20 rounded-full object-cover shadow-lg border border-white/10 group-hover:scale-105 transition shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition truncate">
                {artist.name}
              </h3>
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                {artist.bio}
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {artist.genres.map((g) => (
                  <span
                    key={g}
                    className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
