import { Track, MoodCriteria, SmartPlaylist } from '../types/index.ts';

export interface AcousticVector {
  energy: number; // 0 to 1
  valence: number; // 0 to 1
  danceability: number; // 0 to 1
  acousticness: number; // 0 to 1
  tempoNormalized: number; // 0 to 1 (mapped from 60-180 BPM)
}

/**
 * Normalizes BPM between 60 and 180 to a 0-1 range
 */
export function normalizeBpm(bpm: number): number {
  return Math.max(0, Math.min(1, (bpm - 60) / 120));
}

/**
 * Extracts normalized acoustic feature vector from a track
 */
export function getTrackAcousticVector(track: Track): AcousticVector {
  return {
    energy: track.moodTags?.energy ?? 0.5,
    valence: track.moodTags?.valence ?? 0.5,
    danceability: track.moodTags?.danceability ?? 0.5,
    acousticness: track.moodTags?.acousticness ?? 0.5,
    tempoNormalized: normalizeBpm(track.bpm ?? 110),
  };
}

/**
 * Calculates Euclidean acoustic distance between two vectors (0 = identical, 1+ = distant)
 */
export function calculateAcousticDistance(v1: AcousticVector, v2: AcousticVector): number {
  const dEnergy = v1.energy - v2.energy;
  const dValence = v1.valence - v2.valence;
  const dDance = v1.danceability - v2.danceability;
  const dAcoustic = v1.acousticness - v2.acousticness;
  const dTempo = v1.tempoNormalized - v2.tempoNormalized;

  return Math.sqrt(
    dEnergy * dEnergy * 1.5 + // energy weighted higher
    dValence * dValence * 1.2 +
    dDance * dDance * 1.0 +
    dAcoustic * dAcoustic * 1.0 +
    dTempo * dTempo * 0.8
  );
}

/**
 * Determines whether a track satisfies given mood criteria filters
 */
export function matchesMoodCriteria(track: Track, criteria: MoodCriteria): boolean {
  const { energy, valence } = track.moodTags;
  
  if (criteria.minEnergy !== undefined && energy < criteria.minEnergy) return false;
  if (criteria.maxEnergy !== undefined && energy > criteria.maxEnergy) return false;
  if (criteria.minValence !== undefined && valence < criteria.minValence) return false;
  if (criteria.maxValence !== undefined && valence > criteria.maxValence) return false;
  if (criteria.minBpm !== undefined && track.bpm < criteria.minBpm) return false;
  if (criteria.maxBpm !== undefined && track.bpm > criteria.maxBpm) return false;

  if (criteria.preferredGenres && criteria.preferredGenres.length > 0) {
    const trackGenre = track.genre.toLowerCase();
    const hasGenre = criteria.preferredGenres.some((g) =>
      trackGenre.includes(g.toLowerCase())
    );
    if (!hasGenre) return false;
  }

  return true;
}

/**
 * Default mood matrix profiles with ML centroid vectors
 */
export const PRESET_MOOD_PROFILES: {
  id: string;
  name: string;
  description: string;
  emoji: string;
  gradient: string;
  targetVector: AcousticVector;
  criteria: MoodCriteria;
}[] = [
  {
    id: 'cyberpunk-high-energy',
    name: 'Cyberpunk Drive',
    description: 'Neon synth basslines, relentless pulse, futuristic energy.',
    emoji: '🌌',
    gradient: 'from-cyan-500/20 via-blue-600/20 to-purple-700/20',
    targetVector: { energy: 0.88, valence: 0.65, danceability: 0.82, acousticness: 0.08, tempoNormalized: 0.65 },
    criteria: { minEnergy: 0.7, minBpm: 120, preferredGenres: ['Electronic', 'Synthwave', 'Cyberpunk', 'EDM'] }
  },
  {
    id: 'lofi-late-night-focus',
    name: 'Late Night Deep Focus',
    description: 'Subtle warmth, gentle swing, velvet acoustics for flow state.',
    emoji: '☕',
    gradient: 'from-amber-600/20 via-orange-700/20 to-stone-900/20',
    targetVector: { energy: 0.28, valence: 0.45, danceability: 0.50, acousticness: 0.78, tempoNormalized: 0.25 },
    criteria: { maxEnergy: 0.55, maxBpm: 105, preferredGenres: ['Lo-Fi', 'Ambient', 'Chillout', 'Jazz'] }
  },
  {
    id: 'euphoric-golden-hour',
    name: 'Euphoric Golden Hour',
    description: 'Uplifting chords, serotonin rush, vibrant melodies.',
    emoji: '☀️',
    gradient: 'from-yellow-500/20 via-rose-500/20 to-orange-600/20',
    targetVector: { energy: 0.75, valence: 0.88, danceability: 0.70, acousticness: 0.25, tempoNormalized: 0.55 },
    criteria: { minValence: 0.65, minEnergy: 0.55 }
  },
  {
    id: 'melancholic-rainy-solitude',
    name: 'Melancholic Rainy Solitude',
    description: 'Contemplative strings, deep reverb, intimate emotions.',
    emoji: '🌧️',
    gradient: 'from-blue-700/20 via-indigo-950/30 to-slate-900/30',
    targetVector: { energy: 0.22, valence: 0.20, danceability: 0.32, acousticness: 0.85, tempoNormalized: 0.20 },
    criteria: { maxValence: 0.42, maxEnergy: 0.45 }
  },
  {
    id: 'audiophile-hifi-lounge',
    name: 'Audiophile Hi-Fi Lounge',
    description: 'Ultra dynamic range, pristine acoustic textures, wide soundstage.',
    emoji: '🎷',
    gradient: 'from-emerald-600/20 via-teal-800/20 to-slate-900/20',
    targetVector: { energy: 0.45, valence: 0.60, danceability: 0.55, acousticness: 0.65, tempoNormalized: 0.40 },
    criteria: { preferredGenres: ['Jazz', 'Classical', 'Acoustic', 'Soul', 'Fusion'] }
  },
  {
    id: 'peak-workout-rush',
    name: 'Peak Workout Hyper',
    description: 'Maximum BPM, thunderous low-end, zero fatigue.',
    emoji: '⚡',
    gradient: 'from-red-600/20 via-pink-600/20 to-violet-800/20',
    targetVector: { energy: 0.95, valence: 0.75, danceability: 0.90, acousticness: 0.05, tempoNormalized: 0.75 },
    criteria: { minEnergy: 0.8, minBpm: 128 }
  }
];

/**
 * Clusters library tracks into smart mood playlists using nearest-centroid ranking
 */
export function clusterLibraryIntoMoodPlaylists(tracks: Track[]): SmartPlaylist[] {
  return PRESET_MOOD_PROFILES.map((profile) => {
    // Rank tracks by proximity to the target centroid
    const ranked = tracks
      .map((t) => {
        const vec = getTrackAcousticVector(t);
        const dist = calculateAcousticDistance(vec, profile.targetVector);
        const criteriaBonus = matchesMoodCriteria(t, profile.criteria) ? -0.3 : 0;
        return { track: t, score: dist + criteriaBonus };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 15) // Top matching tracks
      .map((item) => item.track);

    return {
      id: `smart-${profile.id}`,
      name: profile.name,
      description: profile.description,
      emoji: profile.emoji,
      gradient: profile.gradient,
      criteria: profile.criteria,
      tracks: ranked,
      isMlGenerated: true,
    };
  });
}
