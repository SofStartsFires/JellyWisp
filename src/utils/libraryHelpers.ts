import { Artist, Album, Track } from '../types/index.ts';
import { isPlaceholderArt, JELLYWISP_COVER_PLACEHOLDER } from './jellywispArtwork.ts';

export interface ArtistComputedStats {
  albumCount: number;
  trackCount: number;
  coverUrl: string;
  albums: Album[];
}

/**
 * Normalizes a title or artist name for musical alphabetical sorting (SortName style):
 * strips leading articles ("The ", "A ", "An ") so "The Weeknd" sorts under W ("weeknd")
 * instead of clustering at the top or appearing in arbitrary database scan order.
 */
export function normalizeSortName(raw: string | undefined | null): string {
  const clean = (raw || '').trim();
  if (!clean) return 'zzzz';
  return clean
    .replace(/^(the|a|an)\s+/i, '')
    .trim()
    .toLowerCase();
}

export function compareSortableStrings(a: string | undefined | null, b: string | undefined | null): number {
  const sa = normalizeSortName(a);
  const sb = normalizeSortName(b);
  if (sa !== sb) return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: 'base' });
  return (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' });
}

export function sortArtistsDefault(artists: Artist[]): Artist[] {
  return [...artists].sort((a, b) => compareSortableStrings(a.name, b.name));
}

export function sortAlbumsDefault(albums: Album[]): Album[] {
  return [...albums].sort(
    (a, b) =>
      compareSortableStrings(a.title, b.title) ||
      compareSortableStrings(a.artist, b.artist) ||
      (a.year || 0) - (b.year || 0)
  );
}

export function sortTracksDefault(tracks: Track[]): Track[] {
  return [...tracks].sort(
    (a, b) =>
      compareSortableStrings(a.albumArtist || a.artist, b.albumArtist || b.artist) ||
      compareSortableStrings(a.album, b.album) ||
      compareSortableStrings(a.title, b.title)
  );
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

  missingArtists.sort((a, b) => compareSortableStrings(a.name, b.name));

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

  // Also check albums referenced on tracks that might not be in `albums` array yet
  for (const t of tracks) {
    if (!t.album) continue;
    const key = `${(t.albumArtist || t.artist || '').trim().toLowerCase()}::${t.album.trim().toLowerCase()}`;
    if (seenAlbums.has(key)) continue;
    const existingAlb = albums.find(
      (a) => a.title.trim().toLowerCase() === t.album.trim().toLowerCase()
    );
    if (!existingAlb && isPlaceholderArt(t.coverUrl)) {
      seenAlbums.add(key);
      missingAlbums.push({
        id: t.albumId || `alb-${t.id}`,
        title: t.album,
        artist: t.albumArtist || t.artist,
        year: t.year || 2020,
        coverUrl: t.coverUrl,
        genre: t.genre || 'Music',
        tracks: [t],
        trackCount: 1,
        totalDuration: t.duration,
        isHiRes: true,
        hiresBadge: t.codec,
      });
    }
  }

  missingAlbums.sort(
    (a, b) => compareSortableStrings(a.artist, b.artist) || compareSortableStrings(a.title, b.title)
  );

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
 * Also synthesizes any matching albums/artists referenced on tracks so searching for an album
 * while on Track View (or before all endpoints finish streaming) ALWAYS finds the album.
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

  const matchedArtistsMap = new Map<string, Artist>();
  for (const a of library.artists) {
    if (
      a.name.toLowerCase().includes(q) ||
      (a.genres || []).some((g) => g.toLowerCase().includes(q))
    ) {
      matchedArtistsMap.set(a.name.trim().toLowerCase(), a);
    }
  }

  const matchedAlbumArtistsMap = new Map<string, Artist>();
  for (const a of library.albumArtists) {
    if (
      a.name.toLowerCase().includes(q) ||
      (a.genres || []).some((g) => g.toLowerCase().includes(q))
    ) {
      matchedAlbumArtistsMap.set(a.name.trim().toLowerCase(), a);
    }
  }

  const matchedAlbumsMap = new Map<string, Album>();
  for (const alb of library.albums) {
    if (
      alb.title.toLowerCase().includes(q) ||
      alb.artist.toLowerCase().includes(q) ||
      (alb.genre || '').toLowerCase().includes(q)
    ) {
      const key = `${alb.title.trim().toLowerCase()}::${alb.artist.trim().toLowerCase()}`;
      matchedAlbumsMap.set(key, alb);
    }
  }

  const matchedTracks: Track[] = [];
  for (const t of library.tracks) {
    const titleMatch = t.title.toLowerCase().includes(q);
    const artistMatch = t.artist.toLowerCase().includes(q);
    const albumArtistMatch = (t.albumArtist || '').toLowerCase().includes(q);
    const albumMatch = (t.album || '').toLowerCase().includes(q);
    const genreMatch = (t.genre || '').toLowerCase().includes(q);

    if (titleMatch || artistMatch || albumArtistMatch || albumMatch || genreMatch) {
      matchedTracks.push(t);
    }

    // Ensure any album referenced on a track is also discoverable as an Album in Global Search
    if ((albumMatch || artistMatch || albumArtistMatch) && t.album) {
      const albArtist = (t.albumArtist || t.artist || 'Unknown Artist').trim();
      const key = `${t.album.trim().toLowerCase()}::${albArtist.toLowerCase()}`;
      if (!matchedAlbumsMap.has(key)) {
        // Also check if another album with same title already exists in matchedAlbumsMap
        const hasTitleAlready = Array.from(matchedAlbumsMap.values()).some(
          (existing) => existing.title.trim().toLowerCase() === t.album.trim().toLowerCase()
        );
        if (!hasTitleAlready) {
          matchedAlbumsMap.set(key, {
            id: t.albumId || `alb-${t.id}`,
            title: t.album,
            artist: albArtist,
            year: t.year || 2020,
            coverUrl: t.coverUrl || JELLYWISP_COVER_PLACEHOLDER,
            genre: t.genre || 'Music',
            tracks: [t],
            trackCount: 1,
            totalDuration: t.duration,
            isHiRes: true,
            hiresBadge: t.codec,
          });
        }
      }
    }

    // Ensure any artist referenced on a track is also discoverable as an Artist in Global Search
    if (artistMatch && t.artist) {
      const artKey = t.artist.trim().toLowerCase();
      if (!matchedArtistsMap.has(artKey)) {
        matchedArtistsMap.set(artKey, {
          id: `art-${artKey}`,
          name: t.artist.trim(),
          bio: '',
          coverUrl: t.coverUrl || JELLYWISP_COVER_PLACEHOLDER,
          albums: [],
          trackCount: 1,
          genres: t.genre ? [t.genre] : [],
        });
      }
    }
  }

  const matchedArtists = Array.from(matchedArtistsMap.values());
  const matchedAlbumArtists = Array.from(matchedAlbumArtistsMap.values());
  const matchedAlbums = Array.from(matchedAlbumsMap.values());

  // Sort exact & prefix matches to the top of each category
  const rankText = (text: string) => {
    const lower = (text || '').trim().toLowerCase();
    const sortNorm = normalizeSortName(text);
    if (lower === q || sortNorm === q) return 0;
    if (lower.startsWith(q) || sortNorm.startsWith(q)) return 1;
    return 2;
  };

  matchedArtists.sort(
    (a, b) => rankText(a.name) - rankText(b.name) || compareSortableStrings(a.name, b.name)
  );
  matchedAlbumArtists.sort(
    (a, b) => rankText(a.name) - rankText(b.name) || compareSortableStrings(a.name, b.name)
  );
  matchedAlbums.sort(
    (a, b) => rankText(a.title) - rankText(b.title) || compareSortableStrings(a.title, b.title)
  );
  matchedTracks.sort(
    (a, b) => rankText(a.title) - rankText(b.title) || compareSortableStrings(a.title, b.title)
  );

  let directMatch: GlobalSearchTarget | null = null;

  const exactArtist = matchedArtists.find(
    (a) => a.name.trim().toLowerCase() === q || normalizeSortName(a.name) === q
  );
  const exactAlbumArtist = matchedAlbumArtists.find(
    (a) => a.name.trim().toLowerCase() === q || normalizeSortName(a.name) === q
  );
  const exactAlbum = matchedAlbums.find(
    (alb) => alb.title.trim().toLowerCase() === q || normalizeSortName(alb.title) === q
  );
  const exactTrack = matchedTracks.find(
    (t) => t.title.trim().toLowerCase() === q || normalizeSortName(t.title) === q
  );

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
    directMatch = { type: 'album', album: matchedAlbums[0] };
  } else if (
    matchedTracks.length === 1 &&
    matchedArtists.length === 0 &&
    matchedAlbumArtists.length === 0 &&
    matchedAlbums.length === 0
  ) {
    directMatch = { type: 'track', track: matchedTracks[0] };
  } else if (matchedAlbums.length > 0 && matchedAlbums[0].title.toLowerCase().includes(q)) {
    // If an album title directly matches the query, prioritize the album
    directMatch = { type: 'album', album: matchedAlbums[0] };
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
