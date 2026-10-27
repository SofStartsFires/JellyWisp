import test from 'node:test';
import assert from 'node:assert/strict';
import { dbToGain, gainToDb, calculateReplayGain, formatDuration, calculateBufferHealth } from './audioMath.ts';
import { normalizeBpm, calculateAcousticDistance, matchesMoodCriteria } from './moodMatrix.ts';
import { Track } from '../types/index.ts';

test('audioMath: dbToGain converts accurately', () => {
  assert.equal(dbToGain(0), 1);
  assert.ok(Math.abs(dbToGain(6) - 1.995) < 0.01);
  assert.ok(Math.abs(dbToGain(-6) - 0.501) < 0.01);
  assert.equal(dbToGain(-60), 0);
  assert.equal(dbToGain(-70), 0);
});

test('audioMath: gainToDb converts accurately', () => {
  assert.equal(gainToDb(1), 0);
  assert.ok(Math.abs(gainToDb(2) - 6.02) < 0.05);
  assert.equal(gainToDb(0), -60);
});

test('audioMath: calculateReplayGain applies mode and preamp correctly', () => {
  // Mode off: only preamp applies
  const gainOff = calculateReplayGain(-5, 3, 'off');
  assert.ok(Math.abs(gainOff - dbToGain(3)) < 0.001);

  // Mode track: trackGain + preamp clamped
  const gainTrack = calculateReplayGain(-4, 2, 'track');
  assert.ok(Math.abs(gainTrack - dbToGain(-2)) < 0.001);

  // Maximum upper ceiling +12dB protection
  const gainCapped = calculateReplayGain(15, 10, 'track');
  assert.equal(gainCapped, dbToGain(12));
});

test('audioMath: formatDuration formats mm:ss and hh:mm:ss properly', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(45), '0:45');
  assert.equal(formatDuration(185), '3:05');
  assert.equal(formatDuration(3665), '1:01:05');
  assert.equal(formatDuration(-10), '0:00');
});

test('audioMath: calculateBufferHealth assesses buffer thresholds', () => {
  assert.deepEqual(calculateBufferHealth(15, 15), { pct: 100, status: 'optimal' });
  assert.deepEqual(calculateBufferHealth(7.5, 15), { pct: 50, status: 'stable' });
  assert.deepEqual(calculateBufferHealth(2, 15), { pct: 13, status: 'critical' });
});

test('moodMatrix: normalizeBpm scales properly', () => {
  assert.equal(normalizeBpm(60), 0);
  assert.equal(normalizeBpm(180), 1);
  assert.equal(normalizeBpm(120), 0.5);
  assert.equal(normalizeBpm(30), 0);
  assert.equal(normalizeBpm(240), 1);
});

test('moodMatrix: calculateAcousticDistance evaluates vector proximity', () => {
  const v1 = { energy: 0.8, valence: 0.7, danceability: 0.8, acousticness: 0.1, tempoNormalized: 0.5 };
  const v2 = { energy: 0.8, valence: 0.7, danceability: 0.8, acousticness: 0.1, tempoNormalized: 0.5 };
  const v3 = { energy: 0.2, valence: 0.2, danceability: 0.2, acousticness: 0.9, tempoNormalized: 0.1 };

  assert.equal(calculateAcousticDistance(v1, v2), 0);
  assert.ok(calculateAcousticDistance(v1, v3) > 1.0);
});

test('moodMatrix: matchesMoodCriteria filters tracks appropriately', () => {
  const mockTrack: Track = {
    id: 'test-1',
    title: 'Neon Nights',
    artist: 'Cyber Pulse',
    album: 'Grid 2099',
    year: 2024,
    genre: 'Synthwave',
    duration: 210,
    streamUrl: '',
    coverUrl: '',
    codec: 'FLAC',
    bitrate: 1411,
    sampleRate: 96000,
    bitDepth: 24,
    trackNumber: 1,
    bpm: 128,
    moodTags: {
      energy: 0.85,
      valence: 0.75,
      danceability: 0.8,
      acousticness: 0.05,
    },
    playCount: 12,
    addedAt: '2024-01-01',
  };

  assert.equal(matchesMoodCriteria(mockTrack, { minEnergy: 0.8, minBpm: 120 }), true);
  assert.equal(matchesMoodCriteria(mockTrack, { minEnergy: 0.9 }), false);
  assert.equal(matchesMoodCriteria(mockTrack, { preferredGenres: ['Synthwave'] }), true);
  assert.equal(matchesMoodCriteria(mockTrack, { preferredGenres: ['Classical'] }), false);
});
