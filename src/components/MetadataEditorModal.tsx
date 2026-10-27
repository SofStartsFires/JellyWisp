import React, { useState } from 'react';
import { X, Save, Search, Sparkles, Image, Music, Tag, FileText } from 'lucide-react';
import { Track } from '../types/index.ts';
import { CoverArtSearchModal } from './CoverArtSearchModal.tsx';
import { metadataService } from '../services/metadataService.ts';

interface MetadataEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  onSaveTrack: (updatedTrack: Track) => void;
}

export const MetadataEditorModal: React.FC<MetadataEditorModalProps> = ({
  isOpen,
  onClose,
  track,
  onSaveTrack,
}) => {
  if (!isOpen || !track) return null;

  const [formData, setFormData] = useState<Track>({ ...track });
  const [isArtModalOpen, setIsArtModalOpen] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  const handleChange = (field: keyof Track, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleMoodChange = (field: keyof Track['moodTags'], val: number) => {
    setFormData((prev) => ({
      ...prev,
      moodTags: {
        ...prev.moodTags,
        [field]: val,
      },
    }));
  };

  const handleEnrich = async () => {
    setIsEnriching(true);
    const enriched = await metadataService.enrichTrackWithMetadata(formData);
    setFormData((prev) => ({ ...prev, ...enriched }));
    setIsEnriching(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTrack(formData);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-[#0e1320] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--fin-accent)]/20 text-[var(--fin-accent)] border border-[var(--fin-accent)]/30 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Audio Metadata & ID3 Tag Management
                </h3>
                <p className="text-xs text-slate-400">
                  Granular control over library organization, acoustic vectors & artwork
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

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Top: Cover Art & Primary Details */}
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex flex-col items-center gap-2.5 shrink-0">
                <div className="relative group w-36 h-36 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                  <img
                    src={formData.coverUrl}
                    alt={formData.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setIsArtModalOpen(true)}
                    className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition text-white"
                  >
                    <Image className="w-5 h-5 text-cyan-400" />
                    <span className="text-[11px] font-semibold">Change Art</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsArtModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-cyan-300 font-semibold border border-white/10 transition"
                >
                  <Search className="w-3 h-3" />
                  <span>Search Online Art</span>
                </button>
              </div>

              {/* Title, Artist, Album, Genre Grid */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono">
                    TRACK TITLE
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full bg-white/5 text-xs text-white px-3 py-2 rounded-lg border border-white/10 focus:border-[var(--fin-accent)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono">
                    ARTIST
                  </label>
                  <input
                    type="text"
                    value={formData.artist}
                    onChange={(e) => handleChange('artist', e.target.value)}
                    className="w-full bg-white/5 text-xs text-white px-3 py-2 rounded-lg border border-white/10 focus:border-[var(--fin-accent)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono">
                    ALBUM ARTIST
                  </label>
                  <input
                    type="text"
                    value={formData.albumArtist || formData.artist}
                    onChange={(e) => handleChange('albumArtist', e.target.value)}
                    className="w-full bg-white/5 text-xs text-white px-3 py-2 rounded-lg border border-white/10 focus:border-[var(--fin-accent)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono">
                    ALBUM
                  </label>
                  <input
                    type="text"
                    value={formData.album}
                    onChange={(e) => handleChange('album', e.target.value)}
                    className="w-full bg-white/5 text-xs text-white px-3 py-2 rounded-lg border border-white/10 focus:border-[var(--fin-accent)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono">
                    GENRE
                  </label>
                  <input
                    type="text"
                    value={formData.genre}
                    onChange={(e) => handleChange('genre', e.target.value)}
                    className="w-full bg-white/5 text-xs text-white px-3 py-2 rounded-lg border border-white/10 focus:border-[var(--fin-accent)] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Technical Metadata Grid: Year, Track#, BPM, Key, ReplayGain */}
            <div className="bg-black/30 p-4 rounded-xl border border-white/5 grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400">YEAR</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => handleChange('year', parseInt(e.target.value) || 2024)}
                  className="w-full bg-white/5 text-xs text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400">TRACK #</label>
                <input
                  type="number"
                  value={formData.trackNumber}
                  onChange={(e) => handleChange('trackNumber', parseInt(e.target.value) || 1)}
                  className="w-full bg-white/5 text-xs text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400">BPM (TEMPO)</label>
                <input
                  type="number"
                  value={formData.bpm}
                  onChange={(e) => handleChange('bpm', parseInt(e.target.value) || 120)}
                  className="w-full bg-white/5 text-xs text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400">MUSICAL KEY</label>
                <input
                  type="text"
                  value={formData.musicalKey || 'C Major'}
                  onChange={(e) => handleChange('musicalKey', e.target.value)}
                  className="w-full bg-white/5 text-xs text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400">REPLAYGAIN (dB)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.replayGain || 0}
                  onChange={(e) => handleChange('replayGain', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white/5 text-xs text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:outline-none font-mono text-emerald-400"
                />
              </div>
            </div>

            {/* Acoustic Mood Vector Sliders */}
            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Acoustic Feature Vectors (For Smart Mood Playlist Clustering)
                </span>
                <button
                  type="button"
                  onClick={handleEnrich}
                  disabled={isEnriching}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isEnriching ? 'Fetching MusicBrainz...' : 'Fetch MusicBrainz Tags'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Energy</span>
                    <span>{Math.round(formData.moodTags.energy * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.moodTags.energy}
                    onChange={(e) => handleMoodChange('energy', parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Valence (Mood)</span>
                    <span>{Math.round(formData.moodTags.valence * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.moodTags.valence}
                    onChange={(e) => handleMoodChange('valence', parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Danceability</span>
                    <span>{Math.round(formData.moodTags.danceability * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.moodTags.danceability}
                    onChange={(e) => handleMoodChange('danceability', parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Acousticness</span>
                    <span>{Math.round(formData.moodTags.acousticness * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.moodTags.acousticness}
                    onChange={(e) => handleMoodChange('acousticness', parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Synced Lyrics Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 font-mono">
                <FileText className="w-3.5 h-3.5" />
                <span>LYRICS (LRC FORMAT OR PLAIN TEXT)</span>
              </div>
              <textarea
                value={formData.lyrics || ''}
                onChange={(e) => handleChange('lyrics', e.target.value)}
                rows={5}
                placeholder="[00:15.00] Enter synchronized lyrics here..."
                className="w-full bg-[#0a0d17] text-slate-300 font-mono text-xs p-3 rounded-xl border border-white/10 focus:border-[var(--fin-accent)] focus:outline-none"
              />
            </div>
          </form>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-black/30">
            <span className="text-[11px] font-mono text-slate-400">
              File: {formData.codec} {formData.sampleRate}Hz {formData.bitDepth}-bit
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[var(--fin-accent)] hover:opacity-90 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Cover Art Search Modal */}
      <CoverArtSearchModal
        isOpen={isArtModalOpen}
        onClose={() => setIsArtModalOpen(false)}
        defaultQuery={`${formData.artist} ${formData.album}`}
        onSelectArt={(artUrl) => handleChange('coverUrl', artUrl)}
      />
    </>
  );
};
