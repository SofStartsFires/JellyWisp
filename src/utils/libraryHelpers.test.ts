import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeArtistStatsMap,
  computeMissingArtworkItems,
  searchGlobalLibrary,
  sortArtistsDefault,
  sortAlbumsDefault,
  sortTracksDefault,
} from './libraryHelpers.ts';
import { JELLYWISP_COVER_PLACEHOLDER } from './jellywispArtwork.ts';
import { Artist, Album, Track } from '../types/index.ts';

describe('libraryHelpers', () => {
  const sampleTracks: Track[] = [
    {
      id: 't1',
      title: 'Subterranean Homesick Alien',
      artist: 'Radiohead',
      albumArtist: 'Radiohead',
      album: 'OK Computer',
      albumId: 'alb-okc',
      duration: 267,
      coverUrl: 'https://example.com/okc.jpg',
      genre: 'Alternative Rock',
      year: 1997,
      trackNumber: 3,
      codec: 'FLAC',
      bitrate: 1050,
      sampleRate: 96000,
      bitDepth: 24,
      bpm: 120,
      playCount: 15,
      isFavorite: true,
    },
    {
      id: 't2',
      title: 'Everything In Its Right Place',
      artist: 'Radiohead',
      albumArtist: 'Radiohead',
      album: 'Kid A',
      albumId: 'alb-kida',
      duration: 251,
      coverUrl: 'https://example.com/kida.jpg',
      genre: 'Electronic',
      year: 2000,
      trackNumber: 1,
      codec: 'FLAC',
      bitrate: 980,
      sampleRate: 44100,
      bitDepth: 16,
      bpm: 124,
      playCount: 22,
      isFavorite: false,
    },
    {
      id: 't3',
      title: 'Weird Fishes/Arpeggi',
      artist: 'Radiohead',
      albumArtist: 'Radiohead',
      album: 'In Rainbows',
      albumId: 'alb-ir',
      duration: 318,
      coverUrl: 'https://example.com/ir.jpg',
      genre: 'Art Rock',
      year: 2007,
      trackNumber: 4,
      codec: 'FLAC',
      bitrate: 1120,
      sampleRate: 48000,
      bitDepth: 24,
      bpm: 153,
      playCount: 30,
      isFavorite: true,
    },
  ];

  const sampleAlbums: Album[] = [
    {
      id: 'alb-okc',
      title: 'OK Computer',
      artist: 'Radiohead',
      year: 1997,
      coverUrl: 'https://example.com/okc.jpg',
      genre: 'Alternative Rock',
      tracks: [sampleTracks[0]],
      trackCount: 12,
      totalDuration: 3200,
    },
    {
      id: 'alb-kida',
      title: 'Kid A',
      artist: 'Radiohead',
      year: 2000,
      coverUrl: 'https://example.com/kida.jpg',
      genre: 'Electronic',
      tracks: [sampleTracks[1]],
      trackCount: 10,
      totalDuration: 2900,
    },
    {
      id: 'alb-ir',
      title: 'In Rainbows',
      artist: 'Radiohead',
      year: 2007,
      coverUrl: JELLYWISP_COVER_PLACEHOLDER,
      genre: 'Art Rock',
      tracks: [sampleTracks[2]],
      trackCount: 10,
      totalDuration: 2550,
    },
  ];

  const sampleArtists: Artist[] = [
    {
      id: 'art-rh',
      name: 'Radiohead',
      bio: 'English rock band',
      coverUrl: JELLYWISP_COVER_PLACEHOLDER,
      albums: [],
      trackCount: 32,
      genres: ['Alternative Rock'],
    },
    {
      id: 'art-boards',
      name: 'Boards of Canada',
      bio: 'Scottish electronic duo',
      coverUrl: 'https://example.com/boc.jpg',
      albums: [],
      trackCount: 18,
      genres: ['IDM'],
    },
  ];

  it('computes exact album count for artists from albums and tracks instead of trackCount/10', () => {
    const artistsWithEmbeddedAlbum: Artist[] = [
      {
        ...sampleArtists[0],
        albums: [sampleAlbums[0]],
      },
      sampleArtists[1],
    ];
    const statsMap = computeArtistStatsMap(artistsWithEmbeddedAlbum, sampleAlbums, sampleTracks);
    const rhStats = statsMap.get('radiohead');
    assert.ok(rhStats);
    assert.equal(rhStats.albumCount, 3);
    assert.equal(rhStats.trackCount, 32);
    assert.equal(rhStats.coverUrl, 'https://example.com/okc.jpg');
  });

  it('identifies all artists and albums missing artwork', () => {
    const { missingArtists, missingAlbums } = computeMissingArtworkItems(
      sampleArtists,
      sampleAlbums,
      sampleTracks
    );
    assert.equal(missingArtists.length, 1);
    assert.equal(missingArtists[0].name, 'Radiohead');
    assert.equal(missingAlbums.length, 1);
    assert.equal(missingAlbums[0].title, 'In Rainbows');
  });

  it('searches globally across artists, album artists, albums, and tracks with directMatch', () => {
    const res = searchGlobalLibrary('Boards of Canada', {
      artists: sampleArtists,
      albumArtists: sampleArtists,
      albums: sampleAlbums,
      tracks: sampleTracks,
    });
    assert.ok(res.directMatch);
    assert.equal(res.directMatch.type, 'artist');
    if (res.directMatch.type === 'artist') {
      assert.equal(res.directMatch.artist.name, 'Boards of Canada');
    }

    // Synthesizes matching albums from tracks even when albums array is empty
    const albumFromTracksOnly = searchGlobalLibrary('OK Computer', {
      artists: [],
      albumArtists: [],
      albums: [],
      tracks: sampleTracks,
    });
    assert.equal(albumFromTracksOnly.albums.length, 1);
    assert.equal(albumFromTracksOnly.albums[0].title, 'OK Computer');
    assert.ok(albumFromTracksOnly.directMatch);
    assert.equal(albumFromTracksOnly.directMatch.type, 'album');

    // Unique track search resolves to track directMatch
    const trackRes = searchGlobalLibrary('Weird Fishes', {
      artists: sampleArtists,
      albumArtists: [],
      albums: sampleAlbums,
      tracks: sampleTracks,
    });
    assert.ok(trackRes.directMatch);
    assert.equal(trackRes.directMatch.type, 'track');
    if (trackRes.directMatch.type === 'track') {
      assert.equal(trackRes.directMatch.track.title, 'Weird Fishes/Arpeggi');
    }
  });

  it('sorts artists, albums, and tracks deterministically ignoring leading articles (The/A/An)', () => {
    const unsortedArtists: Artist[] = [
      { id: '1', name: 'The Weeknd', bio: '', coverUrl: '', albums: [], trackCount: 5, genres: [] },
      { id: '2', name: 'Pain of Salvation', bio: '', coverUrl: '', albums: [], trackCount: 5, genres: [] },
      { id: '3', name: 'A Perfect Circle', bio: '', coverUrl: '', albums: [], trackCount: 5, genres: [] },
      { id: '4', name: 'Aphex Twin', bio: '', coverUrl: '', albums: [], trackCount: 5, genres: [] },
    ];
    const sorted = sortArtistsDefault(unsortedArtists);
    assert.deepEqual(
      sorted.map((a) => a.name),
      ['Aphex Twin', 'Pain of Salvation', 'A Perfect Circle', 'The Weeknd']
    );

    const sortedAlbums = sortAlbumsDefault(sampleAlbums);
    assert.deepEqual(
      sortedAlbums.map((a) => a.title),
      ['In Rainbows', 'Kid A', 'OK Computer']
    );

    const sortedTracks = sortTracksDefault(sampleTracks);
    assert.deepEqual(
      sortedTracks.map((t) => t.album),
      ['In Rainbows', 'Kid A', 'OK Computer']
    );
  });
});
