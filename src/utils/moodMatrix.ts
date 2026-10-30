import { Track, MoodCriteria, SmartPlaylist } from '../types/index.ts';

export interface AcousticVector {
  energy: number; // 0 to 1
  valence: number; // 0 to 1
  danceability: number; // 0 to 1
  acousticness: number; // 0 to 1
  tempoNormalized: number; // 0 to 1 (mapped from 60-180 BPM)
}

export interface CustomSmartMixParams {
  prompt: string;
  customName: string;
  targetEnergyPercent: number; // 0 - 100
  targetBpm: number; // 60 - 190
  genreOrMoodFilter: string;
  eraFilter: string; // e.g. 'all', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s', '60s-70s'
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

  if (criteria.minYear !== undefined && track.year && track.year < criteria.minYear) return false;
  if (criteria.maxYear !== undefined && track.year && track.year > criteria.maxYear) return false;

  if (criteria.preferredGenres && criteria.preferredGenres.length > 0) {
    const haystack = `${track.genre} ${track.artist} ${track.albumArtist || ''} ${track.album}`.toLowerCase();
    const hasGenre = criteria.preferredGenres.some((g) => haystack.includes(g.toLowerCase()));
    if (!hasGenre) return false;
  }

  if (criteria.keywords && criteria.keywords.length > 0) {
    const haystack = `${track.title} ${track.artist} ${track.albumArtist || ''} ${track.album} ${track.genre}`.toLowerCase();
    const hasKeyword = criteria.keywords.some((k) => haystack.includes(k.toLowerCase()));
    if (!hasKeyword) return false;
  }

  return true;
}

/**
 * Computes average energy (%) and average BPM for a list of tracks
 */
export function computePlaylistTelemetry(
  tracks: Track[],
  fallbackEnergy = 65,
  fallbackBpm = 120
): { avgEnergy: number; avgBpm: number } {
  if (!tracks || tracks.length === 0) {
    return { avgEnergy: fallbackEnergy, avgBpm: fallbackBpm };
  }
  const sumEnergy = tracks.reduce((acc, t) => acc + (t.moodTags?.energy ?? 0.5), 0);
  const sumBpm = tracks.reduce((acc, t) => acc + (t.bpm || 115), 0);
  return {
    avgEnergy: Math.round((sumEnergy / tracks.length) * 100),
    avgBpm: Math.round(sumBpm / tracks.length),
  };
}

/**
 * Curated & Gimmick Smart Mood Profiles with ML centroid vectors
 */
export const PRESET_MOOD_PROFILES: {
  id: string;
  name: string;
  description: string;
  emoji: string;
  gradient: string;
  eraLabel: string;
  targetVector: AcousticVector;
  criteria: MoodCriteria;
}[] = [
  {
    id: 'boomer-rock',
    name: 'Boomer Rock!',
    description: '60s & 70s classic rock anthems, tube-amp overdrive, vintage vinyl guitar solos & arena legends.',
    emoji: '🎸',
    gradient: 'from-amber-500/25 via-orange-600/20 to-red-800/25',
    eraLabel: '1960s–1970s Classic Rock',
    targetVector: { energy: 0.76, valence: 0.72, danceability: 0.58, acousticness: 0.35, tempoNormalized: 0.52 },
    criteria: {
      minYear: 1960,
      maxYear: 1979,
      preferredGenres: ['Rock', 'Classic Rock', 'Blues', 'Hard Rock', 'Psychedelic', 'Folk Rock', 'Prog'],
    },
  },
  {
    id: 'not-a-phase-mom',
    name: "It's Not a Phase, Mom!",
    description: '2001–2011 3rd-wave emo, theatrical post-hardcore, Warped Tour pop-punk & MySpace-era melodic angst.',
    emoji: '🖤',
    gradient: 'from-rose-600/25 via-fuchsia-900/25 to-slate-950/40',
    eraLabel: '2001–2011 3rd-Wave Emo & Post-Hardcore',
    targetVector: { energy: 0.88, valence: 0.36, danceability: 0.54, acousticness: 0.06, tempoNormalized: 0.68 },
    criteria: {
      minEnergy: 0.64,
      minYear: 2001,
      maxYear: 2011,
      preferredGenres: [
        'Emo',
        'Post-Hardcore',
        'Pop Punk',
        'Pop-Punk',
        'Screamo',
        'Emo Pop',
        'Alternative Rock',
        'Melodic Hardcore',
      ],
    },
  },
  {
    id: '80s-neon-synth',
    name: '80s Neon Arcade & New Wave',
    description: 'Gated reverb drums, analog Roland Juno synths, VHS nostalgia, and late-80s midnight pop.',
    emoji: '📼',
    gradient: 'from-fuchsia-500/25 via-purple-600/20 to-cyan-600/25',
    eraLabel: '1980–1989 New Wave / Synth',
    targetVector: { energy: 0.78, valence: 0.76, danceability: 0.80, acousticness: 0.14, tempoNormalized: 0.56 },
    criteria: {
      minYear: 1980,
      maxYear: 1989,
      preferredGenres: ['Synth', 'New Wave', 'Pop', '80s', 'Electronic', 'Rock', 'Disco'],
    },
  },
  {
    id: '90s-grunge-garage',
    name: '90s Flannel & Grunge Garage',
    description: 'Seattle distortion pedals, slacker indie hooks, alternative rock grit, and basement fuzz.',
    emoji: '🌲',
    gradient: 'from-emerald-700/25 via-teal-900/25 to-stone-900/35',
    eraLabel: '1990–1999 Alt & Grunge',
    targetVector: { energy: 0.74, valence: 0.42, danceability: 0.48, acousticness: 0.22, tempoNormalized: 0.48 },
    criteria: {
      minYear: 1990,
      maxYear: 1999,
      preferredGenres: ['Grunge', 'Alternative', 'Indie', 'Rock', 'Shoegaze', 'Britpop', 'Punk'],
    },
  },
  {
    id: 'y2k-club-throwbacks',
    name: 'Y2K Flip-Phone Club Bangers',
    description: '2000s dancefloor nostalgia, glossy R&B hooks, electro-pop & millennium party energy.',
    emoji: '🕺',
    gradient: 'from-cyan-400/25 via-blue-600/20 to-indigo-800/25',
    eraLabel: '2000–2009 Y2K Club',
    targetVector: { energy: 0.84, valence: 0.82, danceability: 0.88, acousticness: 0.10, tempoNormalized: 0.58 },
    criteria: {
      minYear: 2000,
      maxYear: 2009,
      minEnergy: 0.6,
      preferredGenres: ['Pop', 'Dance', 'R&B', 'Hip-Hop', 'Hip Hop', 'Electronic', 'Club'],
    },
  },
  {
    id: 'heavy-riff-foundry',
    name: 'Heavy Riff Foundry',
    description: 'Double-kick velocity, drop-tuned chugs, thrash speed, and relentless metallic precision.',
    emoji: '🔥',
    gradient: 'from-red-600/25 via-orange-800/25 to-zinc-950/40',
    eraLabel: 'Metal / Hardcore / Industrial',
    targetVector: { energy: 0.96, valence: 0.38, danceability: 0.45, acousticness: 0.04, tempoNormalized: 0.76 },
    criteria: {
      minEnergy: 0.75,
      preferredGenres: ['Metal', 'Heavy', 'Thrash', 'Industrial', 'Hardcore', 'Death', 'Prog', 'Rock'],
    },
  },
  {
    id: 'cyberpunk-high-energy',
    name: 'Cyberpunk Night Drive',
    description: 'Neon arpeggiators, dark synth basslines, relentless pulse, and rain-slicked highway energy.',
    emoji: '🌌',
    gradient: 'from-cyan-500/20 via-blue-600/20 to-purple-700/20',
    eraLabel: 'Synthwave / Cyberpunk',
    targetVector: { energy: 0.88, valence: 0.65, danceability: 0.82, acousticness: 0.08, tempoNormalized: 0.65 },
    criteria: { minEnergy: 0.7, minBpm: 118, preferredGenres: ['Electronic', 'Synthwave', 'Cyberpunk', 'EDM'] },
  },
  {
    id: 'lofi-late-night-focus',
    name: 'Late Night Deep Focus',
    description: 'Subtle warmth, gentle swing, dusty Rhodes chords & velvet acoustics for coding flow state.',
    emoji: '☕',
    gradient: 'from-amber-600/20 via-orange-700/20 to-stone-900/20',
    eraLabel: 'Lo-Fi / Ambient / Chill',
    targetVector: { energy: 0.28, valence: 0.45, danceability: 0.50, acousticness: 0.78, tempoNormalized: 0.25 },
    criteria: { maxEnergy: 0.55, maxBpm: 108, preferredGenres: ['Lo-Fi', 'Ambient', 'Chillout', 'Jazz', 'Instrumental'] },
  },
  {
    id: 'euphoric-golden-hour',
    name: 'Euphoric Golden Hour',
    description: 'Uplifting major-key progressions, sunset warmth, serotonin rush, and vibrant melodies.',
    emoji: '☀️',
    gradient: 'from-yellow-500/20 via-rose-500/20 to-orange-600/20',
    eraLabel: 'High Valence / Feel-Good',
    targetVector: { energy: 0.75, valence: 0.88, danceability: 0.70, acousticness: 0.25, tempoNormalized: 0.55 },
    criteria: { minValence: 0.65, minEnergy: 0.55 },
  },
  {
    id: 'melancholic-rainy-solitude',
    name: 'Rain on the Windowpane',
    description: 'Contemplative strings, deep reverb, acoustic intimacy, and late-autumn reflection.',
    emoji: '🌧️',
    gradient: 'from-blue-700/20 via-indigo-950/30 to-slate-900/30',
    eraLabel: 'Acoustic / Melancholy',
    targetVector: { energy: 0.22, valence: 0.20, danceability: 0.32, acousticness: 0.85, tempoNormalized: 0.20 },
    criteria: { maxValence: 0.42, maxEnergy: 0.45 },
  },
  {
    id: 'audiophile-hifi-lounge',
    name: 'Audiophile Hi-Fi Reference',
    description: 'Wide dynamic range, uncompressed acoustic textures, and holographic soundstage.',
    emoji: '🎷',
    gradient: 'from-emerald-600/20 via-teal-800/20 to-slate-900/20',
    eraLabel: 'Jazz / Classical / Reference',
    targetVector: { energy: 0.45, valence: 0.60, danceability: 0.55, acousticness: 0.65, tempoNormalized: 0.40 },
    criteria: { preferredGenres: ['Jazz', 'Classical', 'Acoustic', 'Soul', 'Fusion', 'Blues'] },
  },
  {
    id: 'peak-workout-rush',
    name: 'Maximum Overdrive Adrenaline',
    description: '130+ BPM stamina, thunderous sub-bass impact, and zero-fatigue workout momentum.',
    emoji: '⚡',
    gradient: 'from-red-600/20 via-pink-600/20 to-violet-800/20',
    eraLabel: '130+ BPM High Octane',
    targetVector: { energy: 0.95, valence: 0.75, danceability: 0.90, acousticness: 0.05, tempoNormalized: 0.75 },
    criteria: { minEnergy: 0.8, minBpm: 128 },
  },
  {
    id: 'flac-audiophile-vault',
    name: 'FLAC Audiophile Vault',
    description: 'Lossless studio masters, 24-bit dynamic range, pristine stereo separation & zero clipping.',
    emoji: '💎',
    gradient: 'from-cyan-600/25 via-teal-700/20 to-slate-900/35',
    eraLabel: 'Hi-Res Lossless Masters',
    targetVector: { energy: 0.55, valence: 0.65, danceability: 0.60, acousticness: 0.40, tempoNormalized: 0.45 },
    criteria: { keywords: ['FLAC', '24-bit', 'Lossless', 'DSD', 'Master', 'Studio'] },
  },
  {
    id: 'late-night-melancholy',
    name: 'Late Night Melancholy & Reverie',
    description: 'Moody minor progressions, tape saturation, rainy streetscapes, and nocturnal introspection.',
    emoji: '🌙',
    gradient: 'from-indigo-900/30 via-slate-900/35 to-violet-950/40',
    eraLabel: 'Introspective / Midnight',
    targetVector: { energy: 0.32, valence: 0.22, danceability: 0.38, acousticness: 0.75, tempoNormalized: 0.28 },
    criteria: { maxEnergy: 0.52, maxValence: 0.45 },
  },
  {
    id: 'deep-focus-flow',
    name: 'Deep Focus & Algorithmic Flow',
    description: 'Steady pulse, minimalist synthesizers, ambient textures, and distraction-free cognitive rhythm.',
    emoji: '🧠',
    gradient: 'from-blue-700/20 via-indigo-900/25 to-cyan-900/20',
    eraLabel: 'Ambient / Minimal Electronic',
    targetVector: { energy: 0.50, valence: 0.50, danceability: 0.65, acousticness: 0.35, tempoNormalized: 0.48 },
    criteria: { preferredGenres: ['Electronic', 'Ambient', 'Instrumental', 'Lo-Fi', 'Techno', 'Synth'] },
  },
  {
    id: 'acoustic-unplugged',
    name: 'Acoustic Unplugged Sessions',
    description: 'Warm fingerpicked acoustics, raw vocal resonance, hollow-body archtops & coffeehouse intimacy.',
    emoji: '🪕',
    gradient: 'from-amber-700/25 via-stone-800/25 to-yellow-950/35',
    eraLabel: 'Acoustic & Folk',
    targetVector: { energy: 0.35, valence: 0.55, danceability: 0.45, acousticness: 0.90, tempoNormalized: 0.35 },
    criteria: { preferredGenres: ['Acoustic', 'Folk', 'Singer-Songwriter', 'Unplugged', 'Country', 'Bluegrass'] },
  },
  {
    id: 'forgotten-deep-cuts',
    name: 'Forgotten Archives & Deep Cuts',
    description: 'Hidden gems in your library that have gathered dust with zero or very low play counts.',
    emoji: '🗝️',
    gradient: 'from-stone-700/25 via-zinc-800/25 to-neutral-950/40',
    eraLabel: 'Low Play Count Gems',
    targetVector: { energy: 0.55, valence: 0.50, danceability: 0.55, acousticness: 0.50, tempoNormalized: 0.45 },
    criteria: {},
  },
  {
    id: 'city-pop-groove',
    name: 'Tokyo Midnight & City Pop',
    description: 'Brisk 1980s slap bass, shimmering FM synths, seaside disco horns & neon highway groove.',
    emoji: '🏙️',
    gradient: 'from-pink-600/25 via-rose-700/20 to-purple-900/30',
    eraLabel: '1979–1989 City Pop / Funk',
    targetVector: { energy: 0.82, valence: 0.85, danceability: 0.88, acousticness: 0.20, tempoNormalized: 0.58 },
    criteria: { minYear: 1978, maxYear: 1992, preferredGenres: ['City Pop', 'Funk', 'Disco', 'Pop', 'Soul', '80s'] },
  },
];

/**
 * Clusters library tracks into smart mood playlists using nearest-centroid ranking + metadata bonuses.
 * Samples up to 3,500 tracks evenly when library exceeds 3,500 tracks so clustering stays instantaneous.
 * Only displays playlists that contain at least 20 qualifying tracks when library has >= 20 tracks.
 */
export function clusterLibraryIntoMoodPlaylists(tracks: Track[]): SmartPlaylist[] {
  const MAX_SAMPLE = 3500;
  let sample = tracks;
  if (tracks.length > MAX_SAMPLE) {
    const step = tracks.length / MAX_SAMPLE;
    sample = [];
    for (let i = 0; i < MAX_SAMPLE; i++) {
      sample.push(tracks[Math.floor(i * step)]);
    }
  }

  const generated = PRESET_MOOD_PROFILES.map((profile) => {
    const ranked = sample
      .map((t) => {
        const vec = getTrackAcousticVector(t);
        const dist = calculateAcousticDistance(vec, profile.targetVector);

        let bonus = 0;
        if (matchesMoodCriteria(t, profile.criteria)) {
          bonus -= 0.65;
        }

        // Special handling for forgotten archives: reward low play count
        if (profile.id === 'forgotten-deep-cuts') {
          if ((t.playCount || 0) <= 1) bonus -= 0.85;
          else if ((t.playCount || 0) <= 3) bonus -= 0.4;
          else bonus += 0.8;
        }

        // Strict era reward AND out-of-era penalty when profile defines minYear / maxYear
        if (profile.criteria.minYear && profile.criteria.maxYear && t.year) {
          if (t.year >= profile.criteria.minYear && t.year <= profile.criteria.maxYear) {
            bonus -= 0.65;
          } else {
            const yearsOff =
              t.year < profile.criteria.minYear
                ? profile.criteria.minYear - t.year
                : t.year - profile.criteria.maxYear;
            bonus += Math.min(1.8, 0.65 + yearsOff * 0.1);
          }
        }

        // Special 3rd-wave emo / post-hardcore / pop-punk tuning for "It's Not a Phase, Mom!"
        if (profile.id === 'not-a-phase-mom') {
          const hay = `${t.genre} ${t.artist} ${t.albumArtist || ''} ${t.album} ${t.title}`.toLowerCase();
          if (
            hay.includes('emo') ||
            hay.includes('post-hardcore') ||
            hay.includes('post hardcore') ||
            hay.includes('pop punk') ||
            hay.includes('pop-punk') ||
            hay.includes('screamo') ||
            hay.includes('warped') ||
            hay.includes('melodic hardcore')
          ) {
            bonus -= 0.85;
          } else if (hay.includes('alternative rock') || hay.includes('punk rock')) {
            bonus -= 0.3;
          }

          if (t.year && t.year < 2001) {
            bonus += 1.45;
          }
          if (
            hay.includes('grunge') ||
            hay.includes('crust') ||
            hay.includes('80s') ||
            hay.includes('90s') ||
            hay.includes('classic rock') ||
            hay.includes('thrash') ||
            hay.includes('jazz') ||
            hay.includes('country') ||
            (hay.includes('hardcore') && !hay.includes('post-hardcore') && !hay.includes('post hardcore') && !hay.includes('melodic'))
          ) {
            bonus += 1.2;
          }
        } else if (profile.criteria.preferredGenres?.length) {
          const hay = `${t.genre} ${t.artist} ${t.album}`.toLowerCase();
          if (profile.criteria.preferredGenres.some((g) => hay.includes(g.toLowerCase()))) {
            bonus -= 0.55;
          }
        }

        return { track: t, score: dist + bonus };
      })
      .filter((item) => {
        // Filter out completely non-matching items (high acoustic distance + penalty)
        if (profile.criteria.minYear && profile.criteria.maxYear) {
          if (item.track.year && (item.track.year < profile.criteria.minYear - 2 || item.track.year > profile.criteria.maxYear + 2)) {
            return false;
          }
        }
        return item.score <= 1.45;
      })
      .sort((a, b) => a.score - b.score || a.track.id.localeCompare(b.track.id) || a.track.title.localeCompare(b.track.title))
      .slice(0, 60)
      .map((item) => item.track);

    const telemetry = computePlaylistTelemetry(
      ranked,
      Math.round(profile.targetVector.energy * 100),
      Math.round(60 + profile.targetVector.tempoNormalized * 120)
    );

    return {
      id: `smart-${profile.id}`,
      name: profile.name,
      description: profile.description,
      emoji: profile.emoji,
      gradient: profile.gradient,
      criteria: profile.criteria,
      tracks: ranked,
      isMlGenerated: true,
      avgEnergy: telemetry.avgEnergy,
      avgBpm: telemetry.avgBpm,
      eraLabel: profile.eraLabel,
    };
  });

  // Enforce rule: if library has at least 20 tracks, only show mixes with at least 20 results
  const MIN_THRESHOLD = 20;
  if (tracks.length >= MIN_THRESHOLD) {
    const qualifying = generated.filter((p) => p.tracks.length >= MIN_THRESHOLD);
    return qualifying.length > 0 ? qualifying : generated.slice(0, 3);
  }
  return generated.filter((p) => p.tracks.length > 0);
}

/**
 * Parses a natural language user request and auto-populates Smart Mix parameters
 * (Name, Energy %, BPM Average, Genre/Mood, Era) so the user gets instant smart defaults.
 */
export function autoPopulateFromPrompt(prompt: string): Omit<CustomSmartMixParams, 'prompt'> {
  const q = prompt.trim().toLowerCase();
  if (!q) {
    return {
      customName: 'Custom Acoustic Mix',
      targetEnergyPercent: 70,
      targetBpm: 120,
      genreOrMoodFilter: 'All Genres / Dynamic',
      eraFilter: 'all',
    };
  }

  let customName = prompt
    .trim()
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .slice(0, 38);
  let targetEnergyPercent = 68;
  let targetBpm = 118;
  let genreOrMoodFilter = '';
  let eraFilter = 'all';

  // Detect gimmicks & eras
  if (q.includes('boomer') || (q.includes('60s') && q.includes('70s')) || q.includes('classic rock')) {
    customName = q.includes('boomer') ? 'Boomer Rock! Vol. II' : 'Classic 60s & 70s Rock';
    targetEnergyPercent = 76;
    targetBpm = 122;
    genreOrMoodFilter = 'Rock, Classic Rock, Blues';
    eraFilter = '60s-70s';
  } else if (
    q.includes('phase') ||
    q.includes('emo') ||
    q.includes('post-hardcore') ||
    q.includes('pop punk') ||
    q.includes('screamo')
  ) {
    customName = "It's Not a Phase, Mom!";
    targetEnergyPercent = 88;
    targetBpm = 142;
    genreOrMoodFilter = 'Emo, Post-Hardcore, Pop-Punk, Alternative';
    eraFilter = '2000s';
  } else if (q.includes('60s') || q.includes('1960')) {
    eraFilter = '1960s';
    targetBpm = 116;
  } else if (q.includes('70s') || q.includes('1970')) {
    eraFilter = '1970s';
    targetBpm = 118;
  } else if (q.includes('80s') || q.includes('1980') || q.includes('new wave') || q.includes('synthpop')) {
    eraFilter = '1980s';
    targetEnergyPercent = 78;
    targetBpm = 124;
    genreOrMoodFilter = 'Synth, New Wave, Pop, Rock';
  } else if (q.includes('90s') || q.includes('1990') || q.includes('grunge')) {
    eraFilter = '1990s';
    targetEnergyPercent = 74;
    targetBpm = 116;
    genreOrMoodFilter = q.includes('grunge') ? 'Grunge, Alternative, Rock' : '90s, Alternative, Pop, Rock';
  } else if (q.includes('2000s') || q.includes('00s') || q.includes('y2k')) {
    eraFilter = '2000s';
    targetEnergyPercent = 80;
    targetBpm = 126;
  } else if (q.includes('2010s') || q.includes('10s')) {
    eraFilter = '2010s';
  } else if (q.includes('2020s') || q.includes('20s')) {
    eraFilter = '2020s';
  }

  // Energy & mood keywords
  if (q.includes('chill') || q.includes('sleep') || q.includes('study') || q.includes('calm') || q.includes('lofi') || q.includes('ambient')) {
    targetEnergyPercent = 28;
    targetBpm = 86;
    if (!genreOrMoodFilter) genreOrMoodFilter = 'Ambient, Lo-Fi, Chill, Jazz';
  } else if (q.includes('workout') || q.includes('gym') || q.includes('hyper') || q.includes('fast') || q.includes('running')) {
    targetEnergyPercent = 92;
    targetBpm = 138;
  } else if (q.includes('sad') || q.includes('melanchol') || q.includes('rain') || q.includes('heartbreak')) {
    targetEnergyPercent = 32;
    targetBpm = 88;
  } else if (q.includes('party') || q.includes('dance') || q.includes('club') || q.includes('upbeat')) {
    targetEnergyPercent = 85;
    targetBpm = 126;
  }

  // Genre extraction
  const knownGenres = [
    'rock',
    'metal',
    'jazz',
    'classical',
    'electronic',
    'synthwave',
    'pop',
    'hip-hop',
    'rap',
    'indie',
    'folk',
    'acoustic',
    'soul',
    'funk',
    'blues',
    'punk',
    'country',
    'r&b',
  ];
  const matchedGenres = knownGenres.filter((g) => q.includes(g));
  if (matchedGenres.length > 0 && !genreOrMoodFilter) {
    genreOrMoodFilter = matchedGenres.map((g) => g.charAt(0).toUpperCase() + g.slice(1)).join(', ');
  }

  if (!genreOrMoodFilter) {
    genreOrMoodFilter = prompt.trim();
  }

  return {
    customName,
    targetEnergyPercent,
    targetBpm,
    genreOrMoodFilter,
    eraFilter,
  };
}

/**
 * Generates a custom SmartPlaylist from user-typed prompt + customizable parameters
 */
export function generateCustomSmartPlaylist(
  tracks: Track[],
  params: CustomSmartMixParams
): SmartPlaylist {
  const targetEnergy = Math.max(0, Math.min(1, params.targetEnergyPercent / 100));
  const targetTempoNorm = normalizeBpm(params.targetBpm);

  const targetVector: AcousticVector = {
    energy: targetEnergy,
    valence: targetEnergy > 0.6 ? 0.68 : 0.45,
    danceability: params.targetBpm >= 115 ? 0.72 : 0.48,
    acousticness: targetEnergy < 0.45 ? 0.72 : 0.22,
    tempoNormalized: targetTempoNorm,
  };

  let minYear: number | undefined;
  let maxYear: number | undefined;
  let eraLabel = 'All Eras';

  if (params.eraFilter === '60s-70s') {
    minYear = 1960;
    maxYear = 1979;
    eraLabel = '1960s–1970s';
  } else if (params.eraFilter === '1960s') {
    minYear = 1960;
    maxYear = 1969;
    eraLabel = '1960s';
  } else if (params.eraFilter === '1970s') {
    minYear = 1970;
    maxYear = 1979;
    eraLabel = '1970s';
  } else if (params.eraFilter === '1980s') {
    minYear = 1980;
    maxYear = 1989;
    eraLabel = '1980s';
  } else if (params.eraFilter === '1990s') {
    minYear = 1990;
    maxYear = 1999;
    eraLabel = '1990s';
  } else if (params.eraFilter === '2000s') {
    minYear = 2000;
    maxYear = 2009;
    eraLabel = '2000s';
  } else if (params.eraFilter === '2010s') {
    minYear = 2010;
    maxYear = 2019;
    eraLabel = '2010s';
  } else if (params.eraFilter === '2020s') {
    minYear = 2020;
    maxYear = 2029;
    eraLabel = '2020s';
  }

  const rawKeywords = `${params.prompt} ${params.genreOrMoodFilter}`
    .toLowerCase()
    .split(/[,/\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && !['the', 'and', 'for', 'mix', 'music', 'songs', 'all', 'dynamic'].includes(s));

  const MAX_SAMPLE = 3000;
  let sample = tracks;
  if (tracks.length > MAX_SAMPLE) {
    const step = tracks.length / MAX_SAMPLE;
    sample = [];
    for (let i = 0; i < MAX_SAMPLE; i++) {
      sample.push(tracks[Math.floor(i * step)]);
    }
  }

  const ranked = sample
    .map((t) => {
      const vec = getTrackAcousticVector(t);
      const dist = calculateAcousticDistance(vec, targetVector);
      let bonus = 0;

      if (minYear !== undefined && maxYear !== undefined && t.year) {
        if (t.year >= minYear && t.year <= maxYear) {
          bonus -= 0.55;
        } else {
          bonus += 0.35;
        }
      }

      if (rawKeywords.length > 0) {
        const hay = `${t.title} ${t.artist} ${t.albumArtist || ''} ${t.album} ${t.genre}`.toLowerCase();
        for (const kw of rawKeywords) {
          if (hay.includes(kw)) {
            bonus -= 0.32;
          }
        }
      }

      return { track: t, score: dist + bonus };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 45)
    .map((item) => item.track);

  const telemetry = computePlaylistTelemetry(
    ranked,
    Math.round(params.targetEnergyPercent),
    Math.round(params.targetBpm)
  );

  return {
    id: `custom-${Date.now()}`,
    name: params.customName.trim() || 'Custom Smart Mix',
    description: params.prompt.trim()
      ? `Custom request: "${params.prompt.trim()}" • ${params.genreOrMoodFilter || 'Auto-Clustered'}`
      : `Target Energy ${Math.round(params.targetEnergyPercent)}% • ~${Math.round(params.targetBpm)} BPM • ${eraLabel}`,
    emoji: '✨',
    gradient: 'from-cyan-500/25 via-indigo-600/20 to-fuchsia-600/25',
    criteria: {
      minEnergy: Math.max(0, targetEnergy - 0.2),
      maxEnergy: Math.min(1, targetEnergy + 0.2),
      minYear,
      maxYear,
      keywords: rawKeywords,
    },
    tracks: ranked,
    isMlGenerated: true,
    isCustom: true,
    avgEnergy: telemetry.avgEnergy,
    avgBpm: telemetry.avgBpm,
    eraLabel: `${eraLabel} • ${params.genreOrMoodFilter || 'Custom'}`,
  };
}
