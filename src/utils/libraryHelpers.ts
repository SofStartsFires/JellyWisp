import { Artist, Album, Track } from '../types/index.ts';
import { isPlaceholderArt, JELLYWISP_COVER_PLACEHOLDER } from './jellywispArtwork.ts';

export interface ArtistComputedStats {
  albumCount: number;
  trackCount: number;
  coverUrl: string;
  albums: Album[];
}

/**
 * Computes accurate album counts, track counts, and resolved cover art for all artists
 * by cross-referencing the library's `albums` and `tracks` arrays instead of relying on
 * unpopulated `artist.albums` arrays or `trackCount / 10` estimates.
 */
export function computeArtistStatsMap(
  artists: Artist[],
  albums: Album[],
  tracks: Track[]
): Map<string, ArtistComputedStats> {
  const map = new Map<
    string,
    {
      albumIdsOrTitles: Set<string>;
      matchedAlbums: Map<string, Album>;
      trackIds: Set<string>;
      explicitTrackCount: number;
      coverUrl: string;
    }
  >();

  const ensureEntry = (rawName: string) => {
    const key = (rawName || '').trim().toLowerCase();
    if (!key) return null;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        albumIdsOrTitles: new Set<string>(),
        matchedAlbums: new Map<string, Album>(),
        trackIds: new Set<string>(),
        explicitTrackCount: 0,
        coverUrl: JELLYWISP_COVER_PLACEHOLDER,
      };
      map.set(key, entry);
    }
    return entry;
  };

  for (const art of artists) {
    const entry = ensureEntry(art.name);
    if (!entry) continue;
    if (!isPlaceholderArt(art.coverUrl)) {
      entry.coverUrl = art.coverUrl;
    }
    if (art.trackCount && art.trackCount > entry.explicitTrackCount) {
      entry.explicitTrackCount = art.trackCount;
    }
    if (Array.isArray(art.albums)) {
      for (const alb of art.albums) {
        const albKey = (alb.title || alb.id || '').trim().toLowerCase();
        if (albKey) {
          entry.albumIdsOrTitles.add(albKey);
          entry.matchedAlbums.set(albKey, alb);
        }
      }
    }
  }

  for (const alb of albums) {
    const entry = ensureEntry(alb.artist);
    if (!entry) continue;
    const titleKey = (alb.title || alb.id || '').trim().toLowerCase();
    if (titleKey) {
      entry.albumIdsOrTitles.add(titleKey);
      entry.matchedAlbums.set(titleKey, alb);
    }
    if (isPlaceholderArt(entry.coverUrl) && !isPlaceholderArt(alb.coverUrl)) {
      entry.coverUrl = alb.coverUrl;
    }
  }

  for (const t of tracks) {
    const artistNames = new Set<string>();
    if (t.artist) artistNames.add(t.artist.trim());
    if (t.albumArtist) artistNames.add(t.albumArtist.trim());

    for (const name of artistNames) {
      const entry = ensureEntry(name);
      if (!entry) continue;
      entry.trackIds.add(t.id);
      if (t.album) {
        const albTitleKey = t.album.trim().toLowerCase();
        if (albTitleKey) {
          entry.albumIdsOrTitles.add(albTitleKey);
        }
      }
      if (isPlaceholderArt(entry.coverUrl) && !isPlaceholderArt(t.coverUrl)) {
        entry.coverUrl = t.coverUrl;
      }
    }
  }

  const result = new Map<string, ArtistComputedStats>();
  for (const [key, entry] of map.entries()) {
    const albumCount = entry.albumIdsOrTitles.size;
    const trackCount = Math.max(entry.trackIds.size, entry.explicitTrackCount);
    result.set(key, {
      albumCount,
      trackCount,
      coverUrl: entry.coverUrl,
      albums: Array.from(entry.matchedAlbums.values()),
    });
  }

  return result;
}

/**
 * Finds all artists and albums that are currently missing cover art (using placeholder art),
 * deduplicated and sorted so the user can quickly fill in missing artwork gaps.
 */
export function computeMissingArtworkItems(
  artists: Artist[],
  albums: Album[],
  tracks: Track[] = []
): {
  missingArtists: Artist[];
  missingAlbums: Album[];
} {
  const seenArtists = new Set<string>();
  const missingArtists: Artist[] = [];

  // Include both explicit artists and any track/album artists that lack cover art
  const allCandidateArtists: Artist[] = [...artists];
  const existingNames = new Set(artists.map((a) => a.name.trim().toLowerCase()));

  for (const alb of albums) {
    const name = (alb.artist || '').trim();
    const lower = name.toLowerCase();
    if (name && !existingNames.has(lower)) {
      existingNames.add(lower);
      allCandidateArtists.push({
        id: `aa-${lower}`,
        name,
        bio: '',
        coverUrl: JELLYWISP_COVER_PLACEHOLDER,
        albums: [],
        trackCount: alb.trackCount || 0,
        genres: alb.genre ? [alb.genre] : [],
      });
    }
  }

  for (const t of tracks) {
    const name = (t.artist || '').trim();
    const lower = name.toLowerCase();
    if (name && !existingNames.has(lower)) {
      existingNames.add(lower);
      allCandidateArtists.push({
        id: `art-${lower}`,
        name,
        bio: '',
        coverUrl: JELLYWISP_COVER_PLACEHOLDER,
        albums: [],
        trackCount: 1,
        genres: t.genre ? [t.genre] : [],
      });
    }
  }

  for (const a of allCandidateArtists) {
    const key = (a.name || '').trim().toLowerCase();
    if (!key || seenArtists.has(key)) continue;
    if (isPlaceholderArt(a.coverUrl)) {
      seenArtists.add(key);
      missingArtists.push(a);
    }
  }

  missingArtists.sort((a, b) => a.name.localeCompare(b.name));

  const seenAlbums = new Set<string>();
  const missingAlbums: Album[] = [];
  for (const alb of albums) {
    const key = `${(alb.artist || '').trim().toLowerCase()}::${(alb.title || '').trim().toLowerCase()}`;
    if (!alb.title || seenAlbums.has(key)) continue;
    if (isPlaceholderArt(alb.coverUrl)) {
      seenAlbums.add(key);
      missingAlbums.push(alb);
    }
  }

  missingAlbums.sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));

  return { missingArtists, missingAlbums };
}

export type GlobalSearchTarget =
  | { type: 'artist'; artist: Artist }
  | { type: 'album-artist'; artist: Artist }
  | { type: 'album'; album: Album }
  | { type: 'track'; track: Track };

export interface GlobalSearchResults {
  artists: Artist[];
  albumArtists: Artist[];
  albums: Album[];
  tracks: Track[];
  totalCount: number;
  directMatch: GlobalSearchTarget | null;
}

/**
 * Searches globally across Artists, Album Artists, Albums, and Tracks regardless of the active tab.
 * Also resolves `directMatch` so pressing Enter immediately jumps to the single/exact match.
 */
export function searchGlobalLibrary(
  rawQuery: string,
  library: {
    artists: Artist[];
    albumArtists: Artist[];
    albums: Album[];
    tracks: Track[];
  },
  limitPerSection = 6
): GlobalSearchResults {
  const q = (rawQuery || '').trim().toLowerCase();
  if (!q) {
    return {
      artists: [],
      albumArtists: [],
      albums: [],
      tracks: [],
      totalCount: 0,
      directMatch: null,
    };
  }

  const matchedArtists = library.artists.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      (a.genres || []).some((g) => g.toLowerCase().includes(q))
  );

  const matchedAlbumArtists = library.albumArtists.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      (a.genres || []).some((g) => g.toLowerCase().includes(q))
  );

  const matchedAlbums = library.albums.filter(
    (alb) =>
      alb.title.toLowerCase().includes(q) ||
      alb.artist.toLowerCase().includes(q) ||
      (alb.genre || '').toLowerCase().includes(q)
  );

  const matchedTracks = library.tracks.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.albumArtist || '').toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q) ||
      (t.genre || '').toLowerCase().includes(q)
  );

  // Sort exact & prefix matches to the top of each category
  const rankText = (text: string) => {
    const lower = (text || '').trim().toLowerCase();
    if (lower === q) return 0;
    if (lower.startsWith(q)) return 1;
    return 2;
  };

  matchedArtists.sort(
    (a, b) => rankText(a.name) - rankText(b.name) || a.name.localeCompare(b.name)
  );
  matchedAlbumArtists.sort(
    (a, b) => rankText(a.name) - rankText(b.name) || a.name.localeCompare(b.name)
  );
  matchedAlbums.sort(
    (a, b) => rankText(a.title) - rankText(b.title) || a.title.localeCompare(b.title)
  );
  matchedTracks.sort(
    (a, b) => rankText(a.title) - rankText(b.title) || a.title.localeCompare(b.title)
  );

  // Determine direct match for Enter key navigation:
  // 1. Exact name/title match priority: Artist -> Album Artist -> Album -> Track
  // 2. Or if only one unique entity matches across categories
  // 3. Or top-ranked match if the user presses Enter
  let directMatch: GlobalSearchTarget | null = null;

  const exactArtist = matchedArtists.find((a) => a.name.trim().toLowerCase() === q);
  const exactAlbumArtist = matchedAlbumArtists.find((a) => a.name.trim().toLowerCase() === q);
  const exactAlbum = matchedAlbums.find((alb) => alb.title.trim().toLowerCase() === q);
  const exactTrack = matchedTracks.find((t) => t.title.trim().toLowerCase() === q);

  if (exactArtist) {
    directMatch = { type: 'artist', artist: exactArtist };
  } else if (exactAlbumArtist) {
    directMatch = { type: 'album-artist', artist: exactAlbumArtist };
  } else if (exactAlbum) {
    directMatch = { type: 'album', album: exactAlbum };
  } else if (exactTrack) {
    directMatch = { type: 'track', track: exactTrack };
  } else if (matchedArtists.length === 1 && matchedAlbums.length === 0 && matchedTracks.length === 0) {
    directMatch = { type: 'artist', artist: matchedArtists[0] };
  } else if (matchedAlbumArtists.length === 1 && matchedArtists.length === 0 && matchedAlbums.length === 0) {
    directMatch = { type: 'album-artist', artist: matchedAlbumArtists[0] };
  } else if (
    matchedArtists.length === 1 &&
    matchedAlbumArtists.length <= 1 &&
    matchedArtists[0].name.toLowerCase().includes(q) &&
    matchedAlbums.every((alb) => alb.artist.toLowerCase() === matchedArtists[0].name.toLowerCase()) &&
    matchedTracks.every(
      (t) =>
        t.artist.toLowerCase() === matchedArtists[0].name.toLowerCase() ||
        (t.albumArtist || '').toLowerCase() === matchedArtists[0].name.toLowerCase()
    )
  ) {
    // All matching albums/tracks belong to this single matching artist!
    directMatch = { type: 'artist', artist: matchedArtists[0] };
  } else if (
    matchedAlbumArtists.length === 1 &&
    matchedArtists.length === 0 &&
    matchedAlbums.every((alb) => alb.artist.toLowerCase() === matchedAlbumArtists[0].name.toLowerCase())
  ) {
    directMatch = { type: 'album-artist', artist: matchedAlbumArtists[0] };
  } else if (
    matchedAlbums.length === 1 &&
    matchedArtists.length === 0 &&
    matchedAlbumArtists.length === 0 &&
    matchedTracks.every((t) => t.album.toLowerCase() === matchedAlbums[0].title.toLowerCase())
  ) {
    // All matching tracks belong to this single matching album!
    directMatch = { type: 'album', album: matchedAlbums[0] };
  } else if (
    matchedTracks.length === 1 &&
    matchedArtists.length === 0 &&
    matchedAlbumArtists.length === 0 &&
    matchedAlbums.length === 0
  ) {
    directMatch = { type: 'track', track: matchedTracks[0] };
  } else if (matchedArtists.length > 0) {
    directMatch = { type: 'artist', artist: matchedArtists[0] };
  } else if (matchedAlbumArtists.length > 0) {
    directMatch = { type: 'album-artist', artist: matchedAlbumArtists[0] };
  } else if (matchedAlbums.length > 0) {
    directMatch = { type: 'album', album: matchedAlbums[0] };
  } else if (matchedTracks.length > 0) {
    directMatch = { type: 'track', track: matchedTracks[0] };
  }

  return {
    artists: matchedArtists.slice(0, limitPerSection),
    albumArtists: matchedAlbumArtists.slice(0, limitPerSection),
    albums: matchedAlbums.slice(0, limitPerSection),
    tracks: matchedTracks.slice(0, limitPerSection),
    totalCount:
      matchedArtists.length +
      matchedAlbumArtists.length +
      matchedAlbums.length +
      matchedTracks.length,
    directMatch,
  };
}
