import React, { useState } from 'react';
import { Sparkles, Play, Database, Sliders, Music, Zap, Check, Share2, Compass } from 'lucide-react';
import { SmartPlaylist, Track } from '../types/index.ts';
import { PRESET_MOOD_PROFILES, clusterLibraryIntoMoodPlaylists } from '../utils/moodMatrix.ts';
import { metadataService } from '../services/metadataService.ts';

interface SmartPlaylistsViewProps {
  tracks: Track[];
  onPlayTrack: (track: Track) => void;
  onPlayQueue: (tracks: Track[]) => void;
  onUpdateTrack: (track: Track) => void;
}

export const SmartPlaylistsView: React.FC<SmartPlaylistsViewProps> = ({
  tracks,
  onPlayTrack,
  onPlayQueue,
  onUpdateTrack,
}) => {
  const [playlists, setPlaylists] = useState<SmartPlaylist[]>(() =>
    clusterLibraryIntoMoodPlaylists(tracks)
  );
  const [selectedPlaylist, setSelectedPlaylist] = useState<SmartPlaylist>(playlists[0]);
  const [isClustering, setIsClustering] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichedCount, setEnrichedCount] = useState<number | null>(null);

  const handleRecluster = () => {
    setIsClustering(true);
    setTimeout(() => {
      const reclustered = clusterLibraryIntoMoodPlaylists(tracks);
      setPlaylists(reclustered);
      setSelectedPlaylist(reclustered[0]);
      setIsClustering(false);
    }, 600);
  };

  const handleEnrichAll = async () => {
    setIsEnriching(true);
    let count = 0;
    for (const track of tracks) {
      const enriched = await metadataService.enrichTrackWithMetadata(track);
      if (enriched.externalIds) {
        onUpdateTrack({ ...track, ...enriched });
        count++;
      }
    }
    setEnrichedCount(count);
    setIsEnriching(false);

    // Refresh smart playlist clustering with updated tags
    const refreshed = clusterLibraryIntoMoodPlaylists(tracks);
    setPlaylists(refreshed);
  };

  const handleExportM3U = (playlist: SmartPlaylist) => {
    const lines = ['#EXTM3U', `#PLAYLIST:${playlist.name}`];
    playlist.tracks.forEach((t) => {
      lines.push(`#EXTINF:${t.duration},${t.artist} - ${t.title}`);
      lines.push(t.streamUrl);
    });
    const blob = new Blob([lines.join('\n')], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${playlist.name.toLowerCase().replace(/\s+/g, '_')}.m3u`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 select-none">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Smart Playlists by Mood & Genre
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Machine learning acoustic matrix clusters your Jellyfin music library into dynamic moods using acoustic vectors, valence, and tempo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* ML Recluster Button */}
          <button
            onClick={handleRecluster}
            disabled={isClustering}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition"
          >
            <Compass className={`w-3.5 h-3.5 text-cyan-400 ${isClustering ? 'animate-spin' : ''}`} />
            <span>{isClustering ? 'Clustering...' : 'ML Re-Cluster'}</span>
          </button>

          {/* MusicBrainz / Last.fm Enrichment Button */}
          <button
            onClick={handleEnrichAll}
            disabled={isEnriching}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:opacity-90 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 transition"
          >
            <Database className={`w-3.5 h-3.5 ${isEnriching ? 'animate-bounce' : ''}`} />
            <span>{isEnriching ? 'Enriching...' : 'Enrich with MusicBrainz'}</span>
          </button>
        </div>
      </div>

      {enrichedCount !== null && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Enriched {enrichedCount} tracks with MusicBrainz MBIDs, ISRCs, and Last.fm tags!</span>
          </div>
          <button
            onClick={() => setEnrichedCount(null)}
            className="text-[10px] text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Left Mood Cards, Right Playlist Tracklist */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 overflow-hidden min-h-0">
        {/* Left Column: Mood Profiles Grid (4 cols on large screens) */}
        <div className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto pr-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono px-1">
            Acoustic Mood Clusters ({playlists.length})
          </span>

          {playlists.map((playlist) => {
            const isSelected = selectedPlaylist.id === playlist.id;
            return (
              <div
                key={playlist.id}
                onClick={() => setSelectedPlaylist(playlist)}
                className={`p-4 rounded-xl cursor-pointer transition border relative flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-gradient-to-r ' +
                      playlist.gradient +
                      ' border-[var(--fin-accent)] shadow-lg'
                    : 'bg-white/5 hover:bg-white/10 border-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl shrink-0">{playlist.emoji}</span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition truncate">
                        {playlist.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {playlist.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-white/10 shrink-0">
                    {playlist.tracks.length} tracks
                  </span>
                </div>

                {/* Acoustic Vector Mini Bar Indicators */}
                <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>⚡ Energy: {Math.round((playlist.criteria.minEnergy || 0.5) * 100)}%</span>
                  <span>BPM: {playlist.criteria.minBpm ? `${playlist.criteria.minBpm}+` : 'Dynamic'}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayQueue(playlist.tracks);
                    }}
                    className="p-1.5 rounded-lg bg-[var(--fin-accent)] text-slate-950 font-bold hover:scale-105 transition"
                    title="Play this mood mix"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Selected Playlist Details & Track Table (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-black/30 rounded-2xl border border-white/5 overflow-hidden">
          {/* Playlist Detail Header */}
          <div className="p-6 border-b border-white/5 bg-gradient-to-r from-black/60 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl p-3 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
                {selectedPlaylist.emoji}
              </span>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {selectedPlaylist.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedPlaylist.description}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-cyan-400">
                  <span>{selectedPlaylist.tracks.length} tracks</span>
                  <span>•</span>
                  <span>
                    {Math.round(
                      selectedPlaylist.tracks.reduce((acc, t) => acc + t.duration, 0) / 60
                    )}{' '}
                    mins total
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportM3U(selectedPlaylist)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
                title="Export as M3U Playlist"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => onPlayQueue(selectedPlaylist.tracks)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--fin-accent)] hover:opacity-90 text-slate-950 text-xs font-bold transition shadow-md shadow-cyan-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Mix</span>
              </button>
            </div>
          </div>

          {/* Tracks Table */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {selectedPlaylist.tracks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No matching tracks found for this mood criteria in current library.
              </div>
            ) : (
              selectedPlaylist.tracks.map((track, idx) => (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  className="px-4 py-3 flex items-center justify-between hover:bg-white/5 cursor-pointer group transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-slate-500 w-5 text-center group-hover:hidden">
                      {idx + 1}
                    </span>
                    <Play className="w-4 h-4 text-cyan-400 fill-current hidden group-hover:block shrink-0" />

                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/10 shadow"
                    />

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition truncate">
                        {track.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {track.artist} — {track.album}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Acoustic Energy Tag */}
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                      ⚡ {Math.round(track.moodTags.energy * 100)}%
                    </span>

                    <span className="text-[10px] font-mono text-slate-500">
                      {Math.floor(track.duration / 60)}:
                      {(track.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
