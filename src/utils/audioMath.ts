/**
 * Audio engineering math utilities for Jellywisp DSP engine
 */

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

/**
 * Converts Decibels to Linear Gain multiplier (e.g. 0 dB -> 1.0, +6 dB -> ~2.0, -6 dB -> ~0.5)
 */
export function dbToGain(db: number): number {
  if (db <= -60) return 0;
  return Math.pow(10, db / 20);
}

/**
 * Converts Linear Gain multiplier to Decibels
 */
export function gainToDb(gain: number): number {
  if (gain <= 0.0001) return -60;
  return 20 * Math.log10(gain);
}

/**
 * Calculates effective gain applying ReplayGain metadata and user preamp
 */
export function calculateReplayGain(
  trackGainDb = 0,
  preampDb = 0,
  mode: 'track' | 'album' | 'off' = 'track'
): number {
  if (mode === 'off') {
    return dbToGain(preampDb);
  }
  // Clamp effective gain to prevent severe clipping (+12dB max limit)
  const totalDb = Math.min(12, Math.max(-24, trackGainDb + preampDb));
  return dbToGain(totalDb);
}

/**
 * Formats time in seconds to mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const totalSec = Math.floor(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculates buffer health percentage and status based on how many seconds of audio are cached ahead
 */
export function calculateBufferHealth(
  bufferedAheadSeconds: number,
  targetSeconds = 15
): { pct: number; status: 'critical' | 'stable' | 'optimal' } {
  const safeBuffer = Math.max(0, bufferedAheadSeconds);
  const pct = Math.min(100, Math.round((safeBuffer / targetSeconds) * 100));

  let status: 'critical' | 'stable' | 'optimal' = 'optimal';
  if (pct < 25) {
    status = 'critical';
  } else if (pct < 70) {
    status = 'stable';
  }

  return { pct, status };
}

/**
 * Returns Nyquist frequency (half the sample rate)
 */
export function calculateNyquistFrequency(sampleRate: number): number {
  return sampleRate / 2;
}
