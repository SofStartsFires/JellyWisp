import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  Database,
  Check,
  Share2,
  Compass,
  Wand2,
  Flame,
  Activity,
  Trash2,
  Sliders,
} from 'lucide-react';
import { SmartPlaylist, Track } from '../types/index.ts';
import {
  clusterLibraryIntoMoodPlaylists,
  autoPopulateFromPrompt,
  generateCustomSmartPlaylist,
} from '../utils/moodMatrix.ts';
import { metadataService } from '../services/metadataService.ts';
import { resolveCoverArt, handleCoverImgError } from '../utils/jellywispArtwork.ts';

interface SmartPlaylistsViewProps {
  tracks: Track[];
  onPlayTrack: (track: Track, contextTracks?: Track[], index?: number) => void;
  onPlayQueue: (tracks: Track[]) => void;
  onUpdateTrack: (track: Track) => void;
  onNavigateToArtist?: (artistName: string) => void;
  onContextMenuArtist?: (e: React.MouseEvent, artistName: string) => void;
}

const CUSTOM_MIXES_STORAGE_KEY = 'jellywisp_custom_smart_mixes_v1';

export const SmartPlaylistsView: React.FC<SmartPlaylistsViewProps> = ({
  tracks,
  onPlayTrack,
  onPlayQueue,
  onUpdateTrack,
  onNavigateToArtist,
  onContextMenuArtist,
}) => {
  const [customPlaylists, setCustomPlaylists] = useState<SmartPlaylist[]>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_MIXES_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const PRESET_CACHE_KEY = 'jellywisp_preset_smart_mixes_cache_v2';
  const [presetPlaylists, setPresetPlaylists] = useState<SmartPlaylist[]>(() => {
    try {
      const cached = localStorage.getItem(PRESET_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    const initial = clusterLibraryIntoMoodPlaylists(tracks);
    try {
      localStorage.setItem(PRESET_CACHE_KEY, JSON.stringify(initial));
    } catch {}
    return initial;
  });
  const lastClusteredCountRef = React.useRef(tracks.length);

  // Re-cluster only when library tracks grow significantly or user manually clicks Refresh Mixes
  const handleRecluster = () => {
    setIsClustering(true);
    setTimeout(() => {
      const reclustered = clusterLibraryIntoMoodPlaylists(tracks);
      setPresetPlaylists(reclustered);
      try {
        localStorage.setItem(PRESET_CACHE_KEY, JSON.stringify(reclustered));
      } catch {}
      setIsClustering(false);
    }, 350);
  };

  const allPlaylists = [...customPlaylists, ...presetPlaylists];
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(
    () => allPlaylists[0]?.id || ''
  );

  const selectedPlaylist =
    allPlaylists.find((p) => p.id === selectedPlaylistId) || allPlaylists[0];

  const [isClustering, setIsClustering] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichedCount, setEnrichedCount] = useState<number | null>(null);

  // Always-On-Top Custom Smart Mix Request Builder State
  const [promptInput, setPromptInput] = useState('');
  const [customName, setCustomName] = useState('Midnight Highway Riffs');
  const [targetEnergyPercent, setTargetEnergyPercent] = useState(76);
  const [targetBpm, setTargetBpm] = useState(124);
  const [genreOrMoodFilter, setGenreOrMoodFilter] = useState('Rock, Synthwave, Indie');
  const [eraFilter, setEraFilter] = useState('all');
  const [autoPopulateEnabled, setAutoPopulateEnabled] = useState(true);

  const handlePromptChange = (val: string) => {
    setPromptInput(val);
    if (autoPopulateEnabled && val.trim().length > 1) {
      const auto = autoPopulateFromPrompt(val);
      setCustomName(auto.customName);
      setTargetEnergyPercent(auto.targetEnergyPercent);
      setTargetBpm(auto.targetBpm);
      setGenreOrMoodFilter(auto.genreOrMoodFilter);
      setEraFilter(auto.eraFilter);
    }
  };

  const handleApplyQuickIdea = (ideaPrompt: string) => {
    setPromptInput(ideaPrompt);
    const auto = autoPopulateFromPrompt(ideaPrompt);
    setCustomName(auto.customName);
    setTargetEnergyPercent(auto.targetEnergyPercent);
    setTargetBpm(auto.targetBpm);
    setGenreOrMoodFilter(auto.genreOrMoodFilter);
    setEraFilter(auto.eraFilter);

    const created = generateCustomSmartPlaylist(tracks, {
      prompt: ideaPrompt,
      ...auto,
    });
    const nextCustom = [created, ...customPlaylists.slice(0, 14)];
    setCustomPlaylists(nextCustom);
    setSelectedPlaylistId(created.id);
    try {
      localStorage.setItem(CUSTOM_MIXES_STORAGE_KEY, JSON.stringify(nextCustom));
    } catch {
      // ignore
    }
  };

  const handleGenerateCustomMix = (e: React.FormEvent) => {
    e.preventDefault();
    const created = generateCustomSmartPlaylist(tracks, {
      prompt: promptInput,
      customName: customName || 'Custom Smart Mix',
      targetEnergyPercent,
      targetBpm,
      genreOrMoodFilter,
      eraFilter,
    });
    const nextCustom = [created, ...customPlaylists.slice(0, 14)];
    setCustomPlaylists(nextCustom);
    setSelectedPlaylistId(created.id);
    try {
      localStorage.setItem(CUSTOM_MIXES_STORAGE_KEY, JSON.stringify(nextCustom));
    } catch {
      // ignore
    }
  };

  const handleDeleteCustomMix = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextCustom = customPlaylists.filter((p) => p.id !== id);
    setCustomPlaylists(nextCustom);
    try {
      localStorage.setItem(CUSTOM_MIXES_STORAGE_KEY, JSON.stringify(nextCustom));
    } catch {
      // ignore
    }
    if (selectedPlaylistId === id) {
      setSelectedPlaylistId(presetPlaylists[0]?.id || '');
    }
  };



  const handleEnrichAll = async () => {
    setIsEnriching(true);
    let count = 0;
    const sampleToEnrich = tracks.slice(0, 100);
    for (const track of sampleToEnrich) {
      const enriched = await metadataService.enrichTrackWithMetadata(track);
      if (enriched.externalIds) {
        onUpdateTrack({ ...track, ...enriched });
        count++;
      }
    }
    setEnrichedCount(count);
    setIsEnriching(false);

    const refreshed = clusterLibraryIntoMoodPlaylists(tracks);
    setPresetPlaylists(refreshed);
  };

  const handleExportM3U = (playlist: SmartPlaylist) => {
    const lines = ['#EXTM3U', `#PLAYLIST:${playlist.name}`];
    playlist.tracks.forEach((t) => {
      lines.push(`#EXTINF:${Math.round(t.duration)},${t.artist} - ${t.title}`);
      lines.push(t.streamUrl);
    });
    const blob = new Blob([lines.join('\n')], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${playlist.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.m3u`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 select-none space-y-4">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Smart Mood &amp; Era Mixes
              </h1>
              <p className="text-xs text-slate-400 tabular-nums">
                {allPlaylists.length} mixes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRecluster}
            disabled={isClustering}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition"
          >
            <Compass className={`w-3.5 h-3.5 text-cyan-400 ${isClustering ? 'animate-spin' : ''}`} />
            <span>{isClustering ? 'Re-Scoring...' : 'Refresh Mixes'}</span>
          </button>

          <button
            onClick={handleEnrichAll}
            disabled={isEnriching}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:opacity-90 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 transition"
          >
            <Database className={`w-3.5 h-3.5 ${isEnriching ? 'animate-bounce' : ''}`} />
            <span>{isEnriching ? 'Enriching...' : 'Enrich Tags'}</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ALWAYS-ON-TOP CUSTOM SMART MIX GENERATOR                              */}
      {/* ===================================================================== */}
      <form
        onSubmit={handleGenerateCustomMix}
        className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/50 via-slate-900/80 to-indigo-950/50 border border-cyan-500/30 shadow-xl shrink-0 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-[var(--fin-accent)]" />
            <span className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
              Custom Smart Mix Builder
            </span>
          </div>

          {/* Quick 1-Click Prompt Ideas */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-slate-400">Try:</span>
            {[
              { label: '🎸 Boomer Rock!', prompt: 'Boomer Rock 60s and 70s classic rock' },
              { label: "🖤 It's Not a Phase, Mom!", prompt: "It's not a phase mom 2000s emo post-hardcore pop-punk" },
              { label: '📼 80s Retro Synth', prompt: '80s synthpop new wave retro arcade' },
              { label: '🌲 90s Grunge Garage', prompt: '90s grunge alternative rock flannel' },
              { label: '☕ Rainy Jazz Coding', prompt: 'chill rainy night jazz lofi focus' },
            ].map((idea) => (
              <button
                key={idea.label}
                type="button"
                onClick={() => handleApplyQuickIdea(idea.prompt)}
                className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-[var(--fin-accent)]/20 hover:text-cyan-200 text-[10px] font-semibold text-slate-300 border border-white/10 transition"
              >
                {idea.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 1: Natural Language Request Input + Mix Name + Generate Button */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
          <div className="lg:col-span-6 relative">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder="Type any vibe, era, or request (e.g. '70s arena rock', '3rd wave emo', 'upbeat 130bpm synth')..."
              className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 focus:border-[var(--fin-accent)] focus:outline-none text-xs text-white placeholder-slate-500"
            />
          </div>

          <div className="lg:col-span-4">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Mix Name (e.g. Boomer Rock!)"
              className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 focus:border-[var(--fin-accent)] focus:outline-none text-xs font-bold text-cyan-300 placeholder-slate-500"
            />
          </div>

          <div className="lg:col-span-2 flex items-center">
            <button
              type="submit"
              className="w-full py-2 px-4 rounded-xl bg-[var(--fin-accent)] hover:opacity-90 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Build Mix</span>
            </button>
          </div>
        </div>

        {/* Row 2: Live Editable / Auto-Generated Parameters (Energy %, BPM Average, Mood/Genre, Era) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Energy Level */}
          <div className="px-3 py-2 rounded-xl bg-black/35 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                Energy Level
              </span>
              <span className="font-mono font-bold text-amber-300 tabular-nums">
                {Math.round(targetEnergyPercent)}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="2"
              value={targetEnergyPercent}
              onChange={(e) => setTargetEnergyPercent(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-amber-400 mt-1.5"
            />
          </div>

          {/* BPM Average */}
          <div className="px-3 py-2 rounded-xl bg-black/35 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-400" />
                BPM Average
              </span>
              <span className="font-mono font-bold text-cyan-300 tabular-nums">
                {Math.round(targetBpm)} BPM
              </span>
            </div>
            <input
              type="range"
              min="65"
              max="180"
              step="1"
              value={targetBpm}
              onChange={(e) => setTargetBpm(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-cyan-400 mt-1.5"
            />
          </div>

          {/* Mood / Genre Tags */}
          <div className="px-3 py-2 rounded-xl bg-black/35 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Sliders className="w-3 h-3 text-indigo-400" />
                Mood / Genre
              </span>
              <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPopulateEnabled}
                  onChange={(e) => setAutoPopulateEnabled(e.target.checked)}
                  className="w-3 h-3 rounded"
                />
                <span>Auto-fill</span>
              </label>
            </div>
            <input
              type="text"
              value={genreOrMoodFilter}
              onChange={(e) => setGenreOrMoodFilter(e.target.value)}
              placeholder="e.g. Rock, Emo, Synth"
              className="w-full bg-transparent text-xs font-mono text-slate-200 focus:outline-none border-b border-white/10 focus:border-cyan-400 mt-1 pb-0.5"
            />
          </div>

          {/* Decade / Era Selector */}
          <div className="px-3 py-2 rounded-xl bg-black/35 border border-white/10 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 font-semibold">Decade / Era Target</span>
            <select
              value={eraFilter}
              onChange={(e) => setEraFilter(e.target.value)}
              className="w-full bg-black/60 text-xs font-mono text-cyan-300 rounded-lg px-2 py-1 border border-white/10 focus:outline-none mt-1"
            >
              <option value="all">All Decades (Any Era)</option>
              <option value="60s-70s">1960s & 1970s (Boomer Era)</option>
              <option value="1960s">1960s Only</option>
              <option value="1970s">1970s Only</option>
              <option value="1980s">1980s Retro</option>
              <option value="1990s">1990s Golden Era</option>
              <option value="2000s">2000s Y2K / Emo Era</option>
              <option value="2010s">2010s Modern</option>
              <option value="2020s">2020s Current</option>
            </select>
          </div>
        </div>
      </form>

      {enrichedCount !== null && (
        <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between shrink-0">
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

      {/* Main Grid: Left Mood & Gimmick Cards, Right Playlist Tracklist */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden min-h-0">
        {/* Left Column: Smart Mix Cards */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 overflow-y-auto pr-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Smart & Gimmick Mixes ({allPlaylists.length})
            </span>
            {customPlaylists.length > 0 && (
              <span className="text-[10px] font-mono text-cyan-400">
                {customPlaylists.length} Custom + {presetPlaylists.length} Autogenerated
              </span>
            )}
          </div>

          {allPlaylists.map((playlist) => {
            const isSelected = selectedPlaylist?.id === playlist.id;
            const energyDisplay =
              playlist.avgEnergy ??
              Math.round((playlist.criteria.minEnergy || 0.65) * 100);
            const bpmDisplay =
              playlist.avgBpm ?? (playlist.criteria.minBpm || 120);

            return (
              <div
                key={playlist.id}
                onClick={() => setSelectedPlaylistId(playlist.id)}
                className={`p-3.5 rounded-xl cursor-pointer transition border relative flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-gradient-to-r ' +
                      playlist.gradient +
                      ' border-[var(--fin-accent)] shadow-lg'
                    : 'bg-white/5 hover:bg-white/10 border-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{playlist.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition truncate">
                          {playlist.name}
                        </h4>
                        {playlist.isCustom && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300/90 mt-0.5 line-clamp-1">
                        {playlist.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-white/10">
                      {playlist.tracks.length} tracks
                    </span>
                    {playlist.isCustom && (
                      <button
                        onClick={(e) => handleDeleteCustomMix(playlist.id, e)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-black/40 transition"
                        title="Delete custom mix"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Telemetry Badges: Energy %, BPM Average, Era/Genre */}
                <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[10px] font-mono text-slate-300">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25 tabular-nums">
                      ⚡ Energy {Math.round(energyDisplay)}%
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 tabular-nums">
                      ♥ ~{Math.round(bpmDisplay)} BPM
                    </span>
                    {playlist.eraLabel && (
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 truncate max-w-[150px]">
                        {playlist.eraLabel}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayQueue(playlist.tracks);
                    }}
                    className="p-1.5 rounded-lg bg-[var(--fin-accent)] text-slate-950 font-bold hover:scale-105 transition shrink-0"
                    title="Play this mix"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Selected Playlist Details & Track Table */}
        {selectedPlaylist && (
          <div className="lg:col-span-7 flex flex-col bg-black/30 rounded-2xl border border-white/5 overflow-hidden">
            {/* Playlist Detail Header */}
            <div className="p-5 border-b border-white/5 bg-gradient-to-r from-black/60 to-transparent flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <span className="text-4xl p-3 rounded-2xl bg-white/5 border border-white/10 shadow-lg shrink-0">
                  {selectedPlaylist.emoji}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-extrabold text-white tracking-tight truncate">
                      {selectedPlaylist.name}
                    </h3>
                    {selectedPlaylist.eraLabel && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {selectedPlaylist.eraLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                    {selectedPlaylist.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-cyan-400 flex-wrap">
                    <span>{selectedPlaylist.tracks.length} tracks</span>
                    <span>•</span>
                    <span>
                      Avg Energy:{' '}
                      {Math.round(
                        selectedPlaylist.avgEnergy ??
                          (selectedPlaylist.criteria.minEnergy || 0.65) * 100
                      )}
                      %
                    </span>
                    <span>•</span>
                    <span>
                      Avg BPM: ~
                      {Math.round(
                        selectedPlaylist.avgBpm ??
                          (selectedPlaylist.criteria.minBpm || 120)
                      )}
                    </span>
                    <span>•</span>
                    <span>
                      {Math.round(
                        selectedPlaylist.tracks.reduce((acc, t) => acc + t.duration, 0) / 60
                      )}{' '}
                      mins
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleExportM3U(selectedPlaylist)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
                  title="Export as M3U Playlist"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onPlayQueue(selectedPlaylist.tracks)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--fin-accent)] hover:opacity-90 text-slate-950 text-xs font-extrabold transition shadow-md shadow-cyan-500/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Full Mix</span>
                </button>
              </div>
            </div>

            {/* Tracks Table */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {selectedPlaylist.tracks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No matching tracks found in current library.
                </div>
              ) : (
                selectedPlaylist.tracks.map((track, idx) => (
                  <div
                    key={`${track.id}-${idx}`}
                    onClick={() => onPlayTrack(track, selectedPlaylist.tracks, idx)}
                    className="px-4 py-2.5 flex items-center justify-between hover:bg-white/5 cursor-pointer group transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-slate-500 w-5 text-center group-hover:hidden">
                        {idx + 1}
                      </span>
                      <Play className="w-4 h-4 text-cyan-400 fill-current hidden group-hover:block shrink-0" />

                      <img
                        src={resolveCoverArt(track.coverUrl)}
                        onError={handleCoverImgError}
                        alt={track.title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/10 shadow"
                      />

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition truncate">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          <span
                            onClick={(e) => {
                              if (onNavigateToArtist) {
                                e.stopPropagation();
                                onNavigateToArtist(track.artist);
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onContextMenuArtist?.(e, track.artist);
                            }}
                            className="hover:underline hover:text-cyan-300"
                            title="Click for Artist Discography • Right-click for Artist Options"
                          >
                            {track.artist}
                          </span>{' '}
                          — {track.album} {track.year ? `(${track.year})` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5 hidden sm:inline">
                        {track.genre}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 tabular-nums">
                        ⚡ {Math.round(track.moodTags.energy * 100)}%
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 tabular-nums hidden md:inline">
                        {Math.round(track.bpm || 118)} BPM
                      </span>

                      <span className="text-[10px] font-mono text-slate-500 tabular-nums w-10 text-right">
                        {Math.floor(track.duration / 60)}:
                        {Math.floor(track.duration % 60)
                          .toString()
                          .padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
