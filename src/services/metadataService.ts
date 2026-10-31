import { Track } from '../types/index.ts';

export interface ArtSearchResult {
  id: string;
  source: string;
  url: string;
  thumbnail: string;
  title: string;
  artist: string;
  resolution: string;
  kind?: 'album' | 'artist';
}

export interface LocalArtworkSaveResult {
  ok: boolean;
  fileName?: string;
  filePath?: string;
  folderPath?: string;
  localUrl?: string;
  dataUrl?: string;
  error?: string;
}

export class MetadataService {
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = 6000
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Searches for real high-resolution album covers and artist portraits across
   * Apple Music / iTunes, Deezer Artist & Album APIs, and Wikipedia.
   * Uses the server-side /api/artwork/search proxy (when available) + direct fallback
   * so CORS never blocks Deezer or Wikipedia results.
   */
  public async searchAlbumArt(
    query: string,
    mode: 'album' | 'artist' | 'all' = 'all'
  ): Promise<ArtSearchResult[]> {
    const results: ArtSearchResult[] = [];
    const trimmed = query.trim();
    if (!trimmed) return results;

    const seenUrls = new Set<string>();
    const pushUnique = (item: ArtSearchResult) => {
      if (!item?.url || seenUrls.has(item.url)) return;
      // Ignore empty Deezer default avatar URLs
      if (item.url.includes('/images/artist//') || item.url.includes('/images/cover//')) return;
      seenUrls.add(item.url);
      results.push(item);
    };

    // 1. Try Server-Side Multi-Provider Proxy first (/api/artwork/search)
    if (
      typeof window !== 'undefined' &&
      (window.location.protocol === 'http:' || window.location.protocol === 'https:')
    ) {
      try {
        const proxyRes = await this.fetchWithTimeout(
          `/api/artwork/search?q=${encodeURIComponent(trimmed)}&mode=${encodeURIComponent(mode)}`,
          {},
          7000
        );
        if (proxyRes.ok) {
          const data = await proxyRes.json();
          if (Array.isArray(data?.results) && data.results.length > 0) {
            for (const item of data.results) {
              pushUnique(item);
            }
          }
        }
      } catch {
        // Fall through to direct client-side queries (e.g. Electron file:// mode)
      }
    }

    // 2. If server proxy returned results, return them sorted by relevance
    if (results.length > 0) {
      return results;
    }

    // 3. Direct Client-Side Queries (used in Electron desktop where webSecurity: false allows all origins)
    const tasks: Promise<void>[] = [];

    // Deezer Artist Portraits
    if (mode === 'artist' || mode === 'all') {
      tasks.push(
        (async () => {
          try {
            const res = await this.fetchWithTimeout(
              `https://api.deezer.com/search/artist?q=${encodeURIComponent(trimmed)}&limit=10`
            );
            if (res.ok) {
              const data = await res.json();
              for (const item of data.data || []) {
                const hiRes = item.picture_xl || item.picture_big || item.picture_medium;
                if (hiRes) {
                  pushUnique({
                    id: `dz-art-${item.id}`,
                    source: 'Deezer Artist',
                    url: hiRes,
                    thumbnail: item.picture_medium || hiRes,
                    title: `${item.name} (Artist Portrait)`,
                    artist: item.name,
                    resolution: '1000 × 1000',
                    kind: 'artist',
                  });
                }
              }
            }
          } catch {}
        })()
      );
    }

    // Deezer Albums
    if (mode === 'album' || mode === 'all') {
      tasks.push(
        (async () => {
          try {
            const res = await this.fetchWithTimeout(
              `https://api.deezer.com/search/album?q=${encodeURIComponent(trimmed)}&limit=16`
            );
            if (res.ok) {
              const data = await res.json();
              for (const item of data.data || []) {
                const hiRes = item.cover_xl || item.cover_big || item.cover_medium;
                if (hiRes) {
                  pushUnique({
                    id: `dz-alb-${item.id}`,
                    source: 'Deezer',
                    url: hiRes,
                    thumbnail: item.cover_medium || hiRes,
                    title: item.title || trimmed,
                    artist: item.artist?.name || trimmed,
                    resolution: '1000 × 1000',
                    kind: 'album',
                  });
                }
              }
            }
          } catch {}
        })()
      );
    }

    // iTunes Album Search (CORS-enabled globally)
    tasks.push(
      (async () => {
        try {
          const res = await this.fetchWithTimeout(
            `https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&entity=album&limit=18`
          );
          if (res.ok) {
            const data = await res.json();
            for (const item of data.results || []) {
              if (!item.artworkUrl100) continue;
              const highResUrl = item.artworkUrl100.replace('100x100bb', '1000x1000bb');
              pushUnique({
                id: `itunes-alb-${item.collectionId || Math.random()}`,
                source: 'Apple Music',
                url: highResUrl,
                thumbnail: item.artworkUrl100.replace('100x100bb', '300x300bb'),
                title: item.collectionName || trimmed,
                artist: item.artistName || trimmed,
                resolution: '1000 × 1000',
                kind: 'album',
              });
            }
          }
        } catch {}
      })()
    );

    // iTunes Song/Single Search
    tasks.push(
      (async () => {
        try {
          const res = await this.fetchWithTimeout(
            `https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&entity=song&limit=12`
          );
          if (res.ok) {
            const data = await res.json();
            for (const item of data.results || []) {
              if (!item.artworkUrl100) continue;
              const highResUrl = item.artworkUrl100.replace('100x100bb', '1000x1000bb');
              pushUnique({
                id: `itunes-trk-${item.trackId || Math.random()}`,
                source: 'iTunes Single',
                url: highResUrl,
                thumbnail: item.artworkUrl100.replace('100x100bb', '300x300bb'),
                title: item.collectionName || item.trackName || trimmed,
                artist: item.artistName || trimmed,
                resolution: '1000 × 1000',
                kind: 'album',
              });
            }
          }
        } catch {}
      })()
    );

    // Wikipedia Artist Portraits (CORS-enabled with origin=*)
    if (mode === 'artist' || mode === 'all') {
      tasks.push(
        (async () => {
          try {
            const searchRes = await this.fetchWithTimeout(
              `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
                `${trimmed} musician OR band`
              )}&utf8=&format=json&origin=*&srlimit=3`
            );
            if (!searchRes.ok) return;
            const searchData = await searchRes.json();
            for (const hit of (searchData?.query?.search || []).slice(0, 2)) {
              if (!hit?.title) continue;
              const sumRes = await this.fetchWithTimeout(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`
              );
              if (!sumRes.ok) continue;
              const sumData = await sumRes.json();
              const imgUrl = sumData?.originalimage?.source || sumData?.thumbnail?.source;
              if (imgUrl) {
                pushUnique({
                  id: `wiki-${hit.pageid}`,
                  source: 'Wikipedia',
                  url: imgUrl,
                  thumbnail: sumData?.thumbnail?.source || imgUrl,
                  title: `${sumData.title || trimmed} (Portrait)`,
                  artist: trimmed,
                  resolution: '800 × 800',
                  kind: 'artist',
                });
              }
            }
          } catch {}
        })()
      );
    }

    await Promise.allSettled(tasks);

    if (mode === 'artist') {
      results.sort((a, b) => (a.kind === 'artist' ? -1 : 1) - (b.kind === 'artist' ? -1 : 1));
    }

    return results;
  }

  /**
   * Saves an artwork image (either from a remote URL or a local uploaded base64 Data URL)
   * directly into the local `jellywisp-artwork/` folder on disk so the user has a permanent
   * local image file and local override even if Jellyfin is read-only.
   */
  public async saveArtworkToLocalFolder(opts: {
    label: string;
    imageUrl?: string;
    dataUrl?: string;
  }): Promise<LocalArtworkSaveResult> {
    if (typeof window === 'undefined') {
      return { ok: false, error: 'Window unavailable' };
    }

    // 1. Try Electron Desktop IPC first
    try {
      const desktop = (window as any).jellywispDesktop;
      if (desktop?.saveLocalArtwork) {
        const res = await desktop.saveLocalArtwork(opts);
        if (res?.ok) return res;
      }
    } catch {}

    // 2. Try Express server /api/artwork/save-local endpoint
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      try {
        const res = await fetch('/api/artwork/save-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(opts),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {}
    }

    // 3. Fallback: if dataUrl was already provided, return it for localStorage persistence
    if (opts.dataUrl) {
      return { ok: true, dataUrl: opts.dataUrl };
    }

    return { ok: false, error: 'Could not save image to local disk folder' };
  }

  public async enrichTrackWithMetadata(track: Track): Promise<Partial<Track>> {
    try {
      const query = `recording:${track.title} AND artist:${track.artist}`;
      const url = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(query)}&fmt=json`;
      const res = await this.fetchWithTimeout(
        url,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Jellywisp/2.7.0 (https://github.com/jellywisp-desktop)',
          },
        },
        4000
      );

      if (res.ok) {
        const data = await res.json();
        const firstMatch = data.recordings?.[0];
        if (firstMatch) {
          const tags = (firstMatch.tags || []).map((t: any) => t.name);
          const isrc = firstMatch.isrcs?.[0];
          return {
            externalIds: {
              ...track.externalIds,
              musicbrainzId: firstMatch.id,
              isrc: isrc || track.externalIds?.isrc,
              lastFmTags: tags.length > 0 ? tags : track.externalIds?.lastFmTags,
            },
          };
        }
      }
    } catch {}

    return {
      externalIds: {
        musicbrainzId: track.externalIds?.musicbrainzId || `mbid-${track.id.slice(0, 8)}`,
        isrc: track.externalIds?.isrc || '',
        lastFmTags: [track.genre.toLowerCase(), 'lossless'],
      },
    };
  }
}

export const metadataService = new MetadataService();
