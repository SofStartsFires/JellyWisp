import './storageService.ts';
import {
  Track,
  Album,
  Artist,
  AlbumReleaseType,
  JellyfinServerConfig,
  JellyfinPublicUser,
  LibrarySyncProgress,
} from '../types/index.ts';
import { INITIAL_TRACKS, INITIAL_ALBUMS, INITIAL_ARTISTS } from '../data/mockLibrary.ts';
import { JELLYWISP_COVER_PLACEHOLDER } from '../utils/jellywispArtwork.ts';

export const DEFAULT_FRESH_CONFIG: JellyfinServerConfig = {
  url: '',
  username: '',
  token: '',
  userId: '',
  serverName: 'Not Connected',
  serverVersion: '',
  isConnected: false,
  isDemoMode: false,
  pingMs: 0,
  useProxy: false,
  musicLibraries: [],
};

export const DEFAULT_DEMO_CONFIG: JellyfinServerConfig = {
  url: 'https://jellyfin.sound-sphere.internal:8096',
  username: 'Audiophile_Demo',
  token: 'jellywisp_demo_token_88912',
  userId: 'usr_demo_88192',
  serverName: 'SoundSphere Jellyfin Media Server',
  serverVersion: '10.9.11 (Official Linux x64)',
  isConnected: true,
  isDemoMode: true,
  pingMs: 14,
  useProxy: false,
  musicLibraries: [
    { id: 'lib-hires-lossless', name: 'Master Hi-Res Flac & DSD', collectionType: 'music' },
    { id: 'lib-citypop-vinyl', name: 'Vinyl Archives & City Pop', collectionType: 'music' },
  ],
};

const STORAGE_KEY_SERVER = 'jellywisp_jellyfin_config';
const STORAGE_KEY_DEVICE_ID = 'jellywisp_device_id';
const STORAGE_KEY_LAST_URL = 'jellywisp_last_real_url';
const STORAGE_KEY_ALBUM_RELEASE_TYPES = 'jellywisp_album_release_types_v1';
const STORAGE_KEY_FAVORITE_TRACKS = 'jellywisp_favorite_tracks_v1';
const STORAGE_KEY_TRACK_EDITS = 'jellywisp_track_edits_v1';
const STORAGE_KEY_ARTWORK_OVERRIDES = 'jellywisp_artwork_overrides_v1';

const FALLBACK_COVER_URL = JELLYWISP_COVER_PLACEHOLDER;

function safeGetLocalStorage(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {}
  return null;
}

function safeSetLocalStorage(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {}
}

export function getSavedAlbumReleaseTypes(): Record<string, AlbumReleaseType> {
  try {
    const raw = safeGetLocalStorage(STORAGE_KEY_ALBUM_RELEASE_TYPES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveAlbumReleaseTypeOverride(
  albumId: string,
  releaseType: AlbumReleaseType,
  albumTitle?: string,
  artistName?: string
) {
  try {
    const current = getSavedAlbumReleaseTypes();
    if (albumId) {
      current[albumId] = releaseType;
    }
    if (albumTitle) {
      const cleanTitle = albumTitle.trim().toLowerCase();
      current[`title:${cleanTitle}`] = releaseType;
      if (artistName) {
        current[`artalb:${artistName.trim().toLowerCase()}:::${cleanTitle}`] = releaseType;
      }
    }
    safeSetLocalStorage(STORAGE_KEY_ALBUM_RELEASE_TYPES, JSON.stringify(current));
  } catch {
    // ignore storage errors
  }
}

export function getAlbumReleaseTypeOverride(
  albumId?: string,
  title?: string,
  artistName?: string
): AlbumReleaseType | undefined {
  const overrides = getSavedAlbumReleaseTypes();
  if (albumId && overrides[albumId]) {
    return overrides[albumId];
  }
  const cleanTitle = String(title ?? '').trim().toLowerCase();
  const cleanArtist = String(artistName ?? '').trim().toLowerCase();
  if (cleanArtist && cleanTitle && overrides[`artalb:${cleanArtist}:::${cleanTitle}`]) {
    return overrides[`artalb:${cleanArtist}:::${cleanTitle}`];
  }
  if (cleanTitle && overrides[`title:${cleanTitle}`]) {
    return overrides[`title:${cleanTitle}`];
  }
  return undefined;
}

export function inferAlbumReleaseType(
  albumId: string,
  title: string,
  trackCount: number = 0,
  durationSec: number = 0,
  artistName?: string
): AlbumReleaseType {
  const explicitOverride = getAlbumReleaseTypeOverride(albumId, title, artistName);
  if (explicitOverride) {
    return explicitOverride;
  }

  const lower = String(title ?? '').toLowerCase();
  if (
    /\b(bootleg|audience recording|soundboard|unofficial|demos & outtakes|demo tape|rarities)\b/i.test(
      lower
    )
  ) {
    return 'bootleg';
  }
  if (
    /\b(live at|live in|live from|unplugged|in concert|live \d{4}|bbc sessions|peel sessions)\b/i.test(
      lower
    ) ||
    /\(live\)|\[live\]/i.test(lower)
  ) {
    return 'live';
  }
  if (
    /\b(greatest hits|best of|anthology|collection|essential|complete works|compilation|va -)\b/i.test(
      lower
    )
  ) {
    return 'compilation';
  }
  if (/\b(single|7"|promo single|b-sides)\b/i.test(lower) || /\(single\)|\[single\]/i.test(lower)) {
    return 'single';
  }
  if (/\b(ep)\b/i.test(lower) || /\(ep\)|\[ep\]/i.test(lower)) {
    return 'ep';
  }

  if (trackCount > 0 && trackCount <= 2 && (durationSec === 0 || durationSec < 900)) {
    return 'single';
  }
  if (trackCount >= 3 && trackCount <= 6 && (durationSec === 0 || durationSec < 1900)) {
    return 'ep';
  }

  return 'studio';
}

export function getSavedTrackFavorites(): Record<string, boolean> {
  try {
    const raw = safeGetLocalStorage(STORAGE_KEY_FAVORITE_TRACKS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveTrackFavoriteOverride(trackId: string, isFavorite: boolean): void {
  if (!trackId) return;
  const current = getSavedTrackFavorites();
  current[trackId] = isFavorite;
  safeSetLocalStorage(STORAGE_KEY_FAVORITE_TRACKS, JSON.stringify(current));
}

export function getSavedTrackMetadataOverrides(): Record<string, Partial<Track>> {
  try {
    const raw = safeGetLocalStorage(STORAGE_KEY_TRACK_EDITS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveTrackMetadataOverride(
  trackOrId: Track | string,
  partialEdits?: Partial<Track>
): void {
  if (!trackOrId) return;
  const current = getSavedTrackMetadataOverrides();
  if (typeof trackOrId === 'string') {
    if (!partialEdits) return;
    current[trackOrId] = {
      ...(current[trackOrId] || {}),
      ...partialEdits,
    };
  } else {
    if (!trackOrId.id) return;
    current[trackOrId.id] = {
      title: trackOrId.title,
      artist: trackOrId.artist,
      albumArtist: trackOrId.albumArtist,
      album: trackOrId.album,
      genre: trackOrId.genre,
      year: trackOrId.year,
      trackNumber: trackOrId.trackNumber,
      bpm: trackOrId.bpm,
      musicalKey: trackOrId.musicalKey,
      replayGain: trackOrId.replayGain,
      lyrics: trackOrId.lyrics,
      moodTags: trackOrId.moodTags,
      coverUrl: trackOrId.coverUrl,
    };
  }
  safeSetLocalStorage(STORAGE_KEY_TRACK_EDITS, JSON.stringify(current));
}

export interface ArtworkOverridesStore {
  albums: Record<string, string>;
  artists: Record<string, string>;
  tracks: Record<string, string>;
}

export function getSavedArtworkOverrides(): ArtworkOverridesStore {
  try {
    const raw = safeGetLocalStorage(STORAGE_KEY_ARTWORK_OVERRIDES);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      albums: parsed.albums || {},
      artists: parsed.artists || {},
      tracks: parsed.tracks || {},
    };
  } catch {
    return { albums: {}, artists: {}, tracks: {} };
  }
}

export interface ArtworkOverrideTarget {
  artistName?: string;
  albumId?: string;
  albumTitle?: string;
  trackId?: string;
}

export function saveArtworkOverride(
  targetOrScope: ArtworkOverrideTarget | 'album' | 'artist' | 'track',
  urlOrPrimaryKey: string,
  maybeUrl?: string,
  secondaryKey?: string
): void {
  const store = getSavedArtworkOverrides();

  if (typeof targetOrScope === 'object' && targetOrScope !== null) {
    const url = urlOrPrimaryKey;
    if (!url) return;
    if (targetOrScope.artistName) {
      store.artists[targetOrScope.artistName.trim().toLowerCase()] = url;
    }
    if (targetOrScope.albumId) {
      store.albums[targetOrScope.albumId] = url;
    }
    if (targetOrScope.albumTitle) {
      store.albums[`title:${targetOrScope.albumTitle.trim().toLowerCase()}`] = url;
    }
    if (targetOrScope.trackId) {
      store.tracks[targetOrScope.trackId] = url;
    }
    safeSetLocalStorage(STORAGE_KEY_ARTWORK_OVERRIDES, JSON.stringify(store));
    return;
  }

  const scope = targetOrScope;
  const primaryKey = urlOrPrimaryKey;
  const url = maybeUrl || '';
  if (!primaryKey || !url) return;
  const cleanPrimary = primaryKey.trim().toLowerCase();
  if (scope === 'album') {
    store.albums[primaryKey] = url;
    store.albums[`title:${cleanPrimary}`] = url;
    if (secondaryKey) {
      store.albums[`title:${secondaryKey.trim().toLowerCase()}`] = url;
    }
  } else if (scope === 'artist') {
    store.artists[cleanPrimary] = url;
  } else if (scope === 'track') {
    store.tracks[primaryKey] = url;
  }
  safeSetLocalStorage(STORAGE_KEY_ARTWORK_OVERRIDES, JSON.stringify(store));
}

export function applyLocalLibraryOverrides(
  tracks: Track[],
  albums: Album[],
  artists: Artist[]
): { tracks: Track[]; albums: Album[]; artists: Artist[] } {
  const favs = getSavedTrackFavorites();
  const edits = getSavedTrackMetadataOverrides();
  const art = getSavedArtworkOverrides();

  const updatedAlbums = albums.map((alb) => {
    const releaseType =
      getAlbumReleaseTypeOverride(alb.id, alb.title, alb.artist) ||
      alb.releaseType ||
      inferAlbumReleaseType(alb.id, alb.title, alb.trackCount, alb.totalDuration, alb.artist);
    const customCover =
      art.albums[alb.id] ||
      art.albums[`title:${alb.title.trim().toLowerCase()}`] ||
      alb.coverUrl;
    return {
      ...alb,
      releaseType,
      coverUrl: customCover,
    };
  });

  const updatedTracks = tracks.map((t) => {
    const edit = edits[t.id];
    const isFavorite = t.id in favs ? favs[t.id] : t.isFavorite;
    const merged = edit ? { ...t, ...edit, isFavorite } : { ...t, isFavorite };
    const customCover =
      art.tracks[merged.id] ||
      (merged.albumId && art.albums[merged.albumId]) ||
      art.albums[`title:${merged.album.trim().toLowerCase()}`] ||
      merged.coverUrl;
    return {
      ...merged,
      coverUrl: customCover,
    };
  });

  const updatedArtists = artists.map((a) => {
    const customArt = art.artists[a.name.trim().toLowerCase()];
    return customArt ? { ...a, coverUrl: customArt } : a;
  });

  return { tracks: updatedTracks, albums: updatedAlbums, artists: updatedArtists };
}

export interface JellyfinConnectionTestResult {
  success: boolean;
  normalizedUrl?: string;
  useProxy?: boolean;
  pingMs?: number;
  quickConnectEnabled?: boolean;
  publicUsers?: JellyfinPublicUser[];
  serverInfo?: {
    serverName: string;
    serverVersion: string;
    id: string;
  };
  error?: string;
}

export class JellyfinService {
  private config: JellyfinServerConfig;
  private deviceId: string;
  private activeSyncGeneration = 0;

  constructor() {
    const savedDevice = safeGetLocalStorage(STORAGE_KEY_DEVICE_ID);
    if (savedDevice) {
      this.deviceId = savedDevice;
    } else {
      this.deviceId = 'jellywisp-desktop-' + Math.random().toString(36).substring(2, 11);
      safeSetLocalStorage(STORAGE_KEY_DEVICE_ID, this.deviceId);
    }

    const saved = safeGetLocalStorage(STORAGE_KEY_SERVER);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // If the user previously saved real server credentials, ensure isConnected stays true so we auto-reconnect on launch
          if (!parsed.isDemoMode && parsed.url && parsed.token && parsed.userId) {
            this.config = { ...DEFAULT_FRESH_CONFIG, ...parsed, isConnected: true };
          } else {
            this.config = { ...DEFAULT_DEMO_CONFIG, ...parsed };
          }
        } else {
          this.config = { ...DEFAULT_DEMO_CONFIG };
        }
      } catch {
        this.config = { ...DEFAULT_DEMO_CONFIG };
      }
    } else {
      this.config = { ...DEFAULT_DEMO_CONFIG };
    }
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public getLastRealUrl(): string {
    if (!this.config.isDemoMode && this.config.url) {
      return this.config.url;
    }
    return localStorage.getItem(STORAGE_KEY_LAST_URL) || '';
  }

  public getConfig(): JellyfinServerConfig {
    return { ...this.config };
  }

  public saveConfig(config: JellyfinServerConfig) {
    this.config = { ...config };
    localStorage.setItem(STORAGE_KEY_SERVER, JSON.stringify(this.config));
    if (!config.isDemoMode && config.url) {
      localStorage.setItem(STORAGE_KEY_LAST_URL, config.url);
    }
  }

  public resetToDemo(): JellyfinServerConfig {
    this.activeSyncGeneration++;
    this.config = { ...DEFAULT_DEMO_CONFIG };
    localStorage.setItem(STORAGE_KEY_SERVER, JSON.stringify(this.config));
    return this.config;
  }

  public cancelBackgroundSync() {
    this.activeSyncGeneration++;
  }

  public normalizeUrl(rawUrl: string): string {
    let u = (rawUrl || '').trim();
    if (!u) return '';

    u = u.replace(/#.*$/, '');
    u = u.replace(/\/web\/index\.html.*$/i, '');
    u = u.replace(/\/web\/?$/i, '');
    u = u.replace(/\/+$/, '');

    if (!/^https?:\/\//i.test(u)) {
      const isLocalOrIp =
        /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|\[?::1\]?)/i.test(u) ||
        /\.local(:|\/|$)/i.test(u) ||
        /:8096(\/|$)/.test(u);
      u = `${isLocalOrIp ? 'http' : 'https'}://${u}`;
    }

    return u.replace(/\/+$/, '');
  }

  public getAuthHeaders(token?: string): Record<string, string> {
    const clientName = 'JellyWisp Desktop';
    const deviceName = 'Desktop Client';
    const version = '2.7.0';

    let mediaBrowserHeader = `MediaBrowser Client="${clientName}", Device="${deviceName}", DeviceId="${this.deviceId}", Version="${version}"`;
    if (token) {
      mediaBrowserHeader += `, Token="${token}"`;
    }

    const headers: Record<string, string> = {
      Authorization: mediaBrowserHeader,
      'X-Emby-Authorization': mediaBrowserHeader,
    };

    if (token) {
      headers['X-Emby-Token'] = token;
    }

    return headers;
  }

  public async request<T = any>(
    baseUrl: string,
    endpointPath: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
      token?: string;
      forceProxy?: boolean;
      allowProxyFallback?: boolean;
      timeoutMs?: number;
    } = {}
  ): Promise<{ ok: boolean; status: number; data: T; latencyMs: number; usedProxy: boolean; error?: string }> {
    const cleanBase = this.normalizeUrl(baseUrl);
    const pathClean = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
    const fullUrl = `${cleanBase}${pathClean}`;
    const method = options.method || 'GET';
    const timeoutMs = options.timeoutMs || 30000;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.getAuthHeaders(options.token),
      ...(options.headers || {}),
    };

    if (options.body && method !== 'GET' && method !== 'HEAD') {
      headers['Content-Type'] = 'application/json';
    }

    const isPageHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
    const isTargetHttp = fullUrl.startsWith('http://');
    const isTargetLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(fullUrl);

    const shouldUseProxy = Boolean(
      options.forceProxy || (isPageHttps && isTargetHttp && !isTargetLocalhost)
    );

    const tryDirectFetch = async () => {
      const startTime = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(fullUrl, {
          method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const latencyMs = Math.max(1, Math.round(performance.now() - startTime));
        const text = await res.text();
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = text;
        }
        return {
          ok: res.ok,
          status: res.status,
          data: data as T,
          latencyMs,
          usedProxy: false,
          error: res.ok
            ? undefined
            : `HTTP ${res.status}: ${res.statusText || (typeof data === 'string' ? data : '')}`,
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    const tryProxyFetch = async () => {
      const res = await fetch('/api/jellyfin/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: fullUrl,
          method,
          headers,
          body: options.body,
        }),
      });
      const payload = await res.json();
      if (res.status === 502 || (!payload.ok && payload.status === 502)) {
        throw new Error(payload.error || 'Proxy could not reach Jellyfin server');
      }
      return {
        ok: Boolean(payload.ok),
        status: payload.status || res.status,
        data: payload.data as T,
        latencyMs: payload.latencyMs || 25,
        usedProxy: true,
        error: payload.ok
          ? undefined
          : `HTTP ${payload.status}: ${payload.statusText || payload.error || 'Request failed'}`,
      };
    };

    if (shouldUseProxy) {
      try {
        return await tryProxyFetch();
      } catch (proxyErr: any) {
        if (options.allowProxyFallback) {
          try {
            return await tryDirectFetch();
          } catch {
            // fallthrough
          }
        }
        return {
          ok: false,
          status: 0,
          data: null as any,
          latencyMs: 0,
          usedProxy: true,
          error: proxyErr?.message || 'Unable to reach Jellyfin server.',
        };
      }
    } else {
      try {
        return await tryDirectFetch();
      } catch (directErr: any) {
        if (options.allowProxyFallback) {
          try {
            return await tryProxyFetch();
          } catch {
            // fallthrough
          }
        }
        return {
          ok: false,
          status: 0,
          data: null as any,
          latencyMs: 0,
          usedProxy: false,
          error:
            directErr?.message ||
            'Failed to connect to Jellyfin server. Verify the server URL and port.',
        };
      }
    }
  }

  public async testConnection(rawUrl: string, token?: string): Promise<JellyfinConnectionTestResult> {
    const normalizedUrl = this.normalizeUrl(rawUrl);
    if (!normalizedUrl) {
      return { success: false, error: 'Please enter a valid Jellyfin server URL.' };
    }

    const urlsToTry = [normalizedUrl];
    if (!/^https?:\/\//i.test(rawUrl.trim()) && normalizedUrl.startsWith('https://')) {
      urlsToTry.push(normalizedUrl.replace(/^https:\/\//i, 'http://'));
    }

    let lastError = 'Failed to connect to Jellyfin server.';

    for (const candidateUrl of urlsToTry) {
      const pubRes = await this.request<any>(candidateUrl, '/System/Info/Public', {
        token,
        allowProxyFallback: true,
      });
      if (pubRes.ok && pubRes.data && (pubRes.data.ServerName || pubRes.data.Id || pubRes.data.Version)) {
        const useProxy = pubRes.usedProxy;

        const [qcRes, usersRes] = await Promise.all([
          this.request<boolean>(candidateUrl, '/QuickConnect/Enabled', { forceProxy: useProxy }).catch(() => null),
          this.request<JellyfinPublicUser[]>(candidateUrl, '/Users/Public', { forceProxy: useProxy }).catch(() => null),
        ]);

        const quickConnectEnabled = qcRes && qcRes.ok ? Boolean(qcRes.data) : true;
        const publicUsers = usersRes && usersRes.ok && Array.isArray(usersRes.data) ? usersRes.data : [];

        return {
          success: true,
          normalizedUrl: candidateUrl,
          useProxy,
          pingMs: pubRes.latencyMs,
          quickConnectEnabled,
          publicUsers,
          serverInfo: {
            serverName: pubRes.data.ServerName || 'Jellyfin Server',
            serverVersion: pubRes.data.Version || '10.9.x',
            id: pubRes.data.Id || '',
          },
        };
      }
      if (pubRes.error) {
        lastError = pubRes.error;
      }
    }

    return {
      success: false,
      error: lastError,
    };
  }

  public async fetchUserLibraries(
    cleanUrl: string,
    userId: string,
    token: string,
    useProxy?: boolean
  ): Promise<{ id: string; name: string; collectionType?: string }[]> {
    try {
      const viewsRes = await this.request<any>(cleanUrl, `/Users/${userId}/Views`, {
        token,
        forceProxy: useProxy,
      });
      if (viewsRes.ok && viewsRes.data?.Items && Array.isArray(viewsRes.data.Items)) {
        const allViews = viewsRes.data.Items.map((v: any) => ({
          id: v.Id,
          name: v.Name || 'Library',
          collectionType: (v.CollectionType || '').toLowerCase(),
        }));
        const musicOnly = allViews.filter((v: any) => v.collectionType === 'music');
        return musicOnly.length > 0 ? musicOnly : allViews;
      }
    } catch {
      // ignore
    }
    return [];
  }

  public async authenticate(
    rawUrl: string,
    username: string,
    password = ''
  ): Promise<{ success: boolean; config?: JellyfinServerConfig; error?: string }> {
    const test = await this.testConnection(rawUrl);
    const cleanUrl = test.normalizedUrl || this.normalizeUrl(rawUrl);
    if (!cleanUrl) {
      return { success: false, error: 'Please enter a valid Jellyfin server URL.' };
    }
    if (!username.trim()) {
      return { success: false, error: 'Please enter your Jellyfin username.' };
    }

    const res = await this.request<any>(cleanUrl, '/Users/AuthenticateByName', {
      method: 'POST',
      forceProxy: test.useProxy,
      allowProxyFallback: true,
      body: {
        Username: username.trim(),
        Pw: password,
      },
    });

    if (!res.ok || !res.data?.AccessToken) {
      if (res.status === 401) {
        return { success: false, error: 'Invalid username or password.' };
      }
      return {
        success: false,
        error: res.error || 'Authentication failed. Check your credentials and server URL.',
      };
    }

    const data = res.data;
    const userId = data.User?.Id;
    const token = data.AccessToken;
    const useProxy = res.usedProxy;

    const libraries = await this.fetchUserLibraries(cleanUrl, userId, token, useProxy);
    const selectedMusicLib = libraries.find((l) => l.collectionType === 'music');

    const newConfig: JellyfinServerConfig = {
      url: cleanUrl,
      username: data.User?.Name || username.trim(),
      token,
      userId,
      serverName: test.serverInfo?.serverName || data.ServerId || 'Jellyfin Media Server',
      serverVersion: test.serverInfo?.serverVersion || '10.9.x',
      isConnected: true,
      isDemoMode: false,
      pingMs: res.latencyMs || test.pingMs || 20,
      useProxy,
      selectedLibraryId: selectedMusicLib?.id,
      musicLibraries: libraries,
    };

    this.saveConfig(newConfig);
    return { success: true, config: newConfig };
  }

  public async initiateQuickConnect(rawUrl: string): Promise<{
    success: boolean;
    code?: string;
    secret?: string;
    normalizedUrl?: string;
    useProxy?: boolean;
    error?: string;
  }> {
    const test = await this.testConnection(rawUrl);
    if (!test.success || !test.normalizedUrl) {
      return {
        success: false,
        error: test.error || 'Could not reach Jellyfin server. Verify the URL first.',
      };
    }

    if (test.quickConnectEnabled === false) {
      return {
        success: false,
        error:
          'Quick Connect is disabled on this Jellyfin server. Enable it in Jellyfin Dashboard → General → Quick Connect, or log in with Username & Password.',
      };
    }

    const cleanUrl = test.normalizedUrl;
    const useProxy = test.useProxy;

    let res = await this.request<any>(cleanUrl, '/QuickConnect/Initiate', {
      method: 'POST',
      forceProxy: useProxy,
      allowProxyFallback: true,
    });

    if (!res.ok && (res.status === 405 || res.status === 404)) {
      res = await this.request<any>(cleanUrl, '/QuickConnect/Initiate', {
        method: 'GET',
        forceProxy: useProxy,
        allowProxyFallback: true,
      });
    }

    if (!res.ok || !res.data?.Code || !res.data?.Secret) {
      return {
        success: false,
        error: res.error || 'Failed to initiate Quick Connect on this server.',
      };
    }

    return {
      success: true,
      code: res.data.Code,
      secret: res.data.Secret,
      normalizedUrl: cleanUrl,
      useProxy: res.usedProxy,
    };
  }

  public async checkQuickConnectStatus(
    cleanUrl: string,
    secret: string,
    useProxy?: boolean
  ): Promise<{ authenticated: boolean; error?: string }> {
    const res = await this.request<any>(
      cleanUrl,
      `/QuickConnect/Connect?secret=${encodeURIComponent(secret)}`,
      {
        method: 'GET',
        forceProxy: useProxy,
      }
    );

    if (!res.ok) {
      return { authenticated: false, error: res.error };
    }

    return {
      authenticated: Boolean(res.data?.Authenticated),
    };
  }

  public async authenticateWithQuickConnect(
    rawUrl: string,
    secret: string,
    useProxy?: boolean
  ): Promise<{ success: boolean; config?: JellyfinServerConfig; error?: string }> {
    const cleanUrl = this.normalizeUrl(rawUrl);

    const authRes = await this.request<any>(cleanUrl, '/Users/AuthenticateWithQuickConnect', {
      method: 'POST',
      forceProxy: useProxy,
      allowProxyFallback: true,
      body: { Secret: secret },
    });

    if (!authRes.ok || !authRes.data?.AccessToken) {
      return {
        success: false,
        error: authRes.error || 'Failed to complete Quick Connect authentication.',
      };
    }

    const data = authRes.data;
    const token = data.AccessToken;
    const userId = data.User?.Id;
    const finalUseProxy = authRes.usedProxy;

    const [infoRes, libraries] = await Promise.all([
      this.request<any>(cleanUrl, '/System/Info/Public', { token, forceProxy: finalUseProxy }),
      this.fetchUserLibraries(cleanUrl, userId, token, finalUseProxy),
    ]);

    const selectedMusicLib = libraries.find((l) => l.collectionType === 'music');

    const newConfig: JellyfinServerConfig = {
      url: cleanUrl,
      username: data.User?.Name || 'Jellyfin User',
      token,
      userId,
      serverName: infoRes.data?.ServerName || 'Jellyfin Media Server',
      serverVersion: infoRes.data?.Version || '10.9.x',
      isConnected: true,
      isDemoMode: false,
      pingMs: authRes.latencyMs || 18,
      useProxy: finalUseProxy,
      selectedLibraryId: selectedMusicLib?.id,
      musicLibraries: libraries,
    };

    this.saveConfig(newConfig);
    return { success: true, config: newConfig };
  }

  public async authenticateWithToken(
    rawUrl: string,
    token: string,
    preferredUsername?: string
  ): Promise<{ success: boolean; config?: JellyfinServerConfig; error?: string }> {
    const cleanToken = token.trim();
    if (!cleanToken) {
      return { success: false, error: 'Please enter a valid Jellyfin API token.' };
    }

    const test = await this.testConnection(rawUrl, cleanToken);
    if (!test.success || !test.normalizedUrl) {
      return {
        success: false,
        error: test.error || 'Could not connect to server with the provided URL and token.',
      };
    }

    const cleanUrl = test.normalizedUrl;
    const useProxy = test.useProxy;

    let userId = '';
    let resolvedUsername = preferredUsername?.trim() || 'API User';

    const meRes = await this.request<any>(cleanUrl, '/Users/Me', {
      token: cleanToken,
      forceProxy: useProxy,
    });

    if (meRes.ok && meRes.data?.Id) {
      userId = meRes.data.Id;
      resolvedUsername = meRes.data.Name || resolvedUsername;
    } else {
      const usersRes = await this.request<any[]>(cleanUrl, '/Users', {
        token: cleanToken,
        forceProxy: useProxy,
      });
      if (usersRes.ok && Array.isArray(usersRes.data) && usersRes.data.length > 0) {
        const matched = preferredUsername
          ? usersRes.data.find(
              (u) => u.Name?.toLowerCase() === preferredUsername.trim().toLowerCase()
            )
          : null;
        const chosen = matched || usersRes.data[0];
        userId = chosen.Id;
        resolvedUsername = chosen.Name || resolvedUsername;
      } else {
        return {
          success: false,
          error: 'Invalid API Token (HTTP 401): Could not resolve a Jellyfin user profile.',
        };
      }
    }

    const libraries = await this.fetchUserLibraries(cleanUrl, userId, cleanToken, useProxy);
    const selectedMusicLib = libraries.find((l) => l.collectionType === 'music');

    const newConfig: JellyfinServerConfig = {
      url: cleanUrl,
      username: resolvedUsername,
      token: cleanToken,
      userId,
      serverName: test.serverInfo?.serverName || 'Jellyfin Media Server',
      serverVersion: test.serverInfo?.serverVersion || '10.9.x',
      isConnected: true,
      isDemoMode: false,
      pingMs: test.pingMs || 20,
      useProxy,
      selectedLibraryId: selectedMusicLib?.id,
      musicLibraries: libraries,
    };

    this.saveConfig(newConfig);
    return { success: true, config: newConfig };
  }

  public formatMediaUrl(rawTargetUrl: string, type: 'stream' | 'image'): string {
    if (this.config.useProxy) {
      return `/api/jellyfin/${type}?target=${encodeURIComponent(rawTargetUrl)}`;
    }
    return rawTargetUrl;
  }

  /**
   * Builds a Jellyfin primary image URL for any item ID or Artist name
   */
  public getItemImageUrl(itemId: string, maxSize = 400): string {
    if (!itemId || this.config.isDemoMode || !this.config.url) return FALLBACK_COVER_URL;
    const cleanUrl = this.normalizeUrl(this.config.url);
    const tokenEnc = encodeURIComponent(this.config.token);
    const rawImg = `${cleanUrl}/Items/${encodeURIComponent(itemId)}/Images/Primary?maxHeight=${maxSize}&maxWidth=${maxSize}&quality=85&api_key=${tokenEnc}`;
    return this.formatMediaUrl(rawImg, 'image');
  }

  public getArtistImageUrlByName(artistName: string, maxSize = 350): string {
    if (!artistName || this.config.isDemoMode || !this.config.url) return FALLBACK_COVER_URL;
    const cleanUrl = this.normalizeUrl(this.config.url);
    const tokenEnc = encodeURIComponent(this.config.token);
    const rawImg = `${cleanUrl}/Artists/${encodeURIComponent(artistName)}/Images/Primary?maxHeight=${maxSize}&maxWidth=${maxSize}&quality=85&api_key=${tokenEnc}`;
    return this.formatMediaUrl(rawImg, 'image');
  }

  private extractGenreString(item: any): string {
    if (Array.isArray(item.Genres) && item.Genres.length > 0) {
      const cleaned = item.Genres.map((g: any) => String(g).trim()).filter(Boolean);
      if (cleaned.length > 0) return cleaned.slice(0, 2).join(' / ');
    }
    if (Array.isArray(item.GenreItems) && item.GenreItems.length > 0) {
      const cleaned = item.GenreItems.map((g: any) => String(g?.Name || '').trim()).filter(Boolean);
      if (cleaned.length > 0) return cleaned.slice(0, 2).join(' / ');
    }
    if (Array.isArray(item.Tags) && item.Tags.length > 0) {
      const cleaned = item.Tags.map((t: any) => String(t).trim()).filter(Boolean);
      if (cleaned.length > 0) return cleaned.slice(0, 2).join(' / ');
    }
    return '';
  }

  /**
   * Maps a raw Jellyfin Audio Item into a Track with multi-stage stream fallbacks
   */
  public mapJellyfinItemToTrack(item: any, idx: number, cleanUrl: string): Track {
    const durationSec = Math.round((item.RunTimeTicks || 0) / 10000000);
    const mediaSource = item.MediaSources?.[0];
    const audioStream = mediaSource?.MediaStreams?.find((s: any) => s.Type === 'Audio');
    const tokenEnc = encodeURIComponent(this.config.token);
    const containerExt = (item.Container || mediaSource?.Container || 'mp3')
      .split(',')[0]
      .trim()
      .toLowerCase();

    // 1. Direct static stream
    const rawStaticUrl = `${cleanUrl}/Audio/${item.Id}/stream?static=true&api_key=${tokenEnc}`;

    // 2. Direct static stream with extension
    const rawStaticExtUrl = `${cleanUrl}/Audio/${item.Id}/stream.${containerExt}?static=true&api_key=${tokenEnc}`;

    // 3. Jellyfin Universal Audio Endpoint
    const rawUniversalUrl = `${cleanUrl}/Audio/${item.Id}/universal?UserId=${encodeURIComponent(
      this.config.userId
    )}&DeviceId=${encodeURIComponent(
      this.deviceId
    )}&MaxStreamingBitrate=999999999&Container=flac,opus,webm|opus,mp3,aac,m4a|aac,m4b|aac,webma,webm|webma,wav,ogg&TranscodingContainer=ts&TranscodingProtocol=http&AudioCodec=aac&api_key=${tokenEnc}`;

    // 4. Real-time MP3 transcode fallback
    const rawTranscodeMp3Url = `${cleanUrl}/Audio/${item.Id}/stream.mp3?AudioCodec=mp3&AudioBitRate=320000&api_key=${tokenEnc}`;

    // 5. Proxied streams
    const proxiedStaticUrl = `/api/jellyfin/stream?target=${encodeURIComponent(rawStaticUrl)}`;
    const proxiedTranscodeUrl = `/api/jellyfin/stream?target=${encodeURIComponent(rawTranscodeMp3Url)}`;

    const primaryStreamUrl = this.config.useProxy ? proxiedStaticUrl : rawStaticUrl;
    const fallbackStreamUrls = this.config.useProxy
      ? [proxiedTranscodeUrl, rawUniversalUrl, rawStaticUrl, rawTranscodeMp3Url]
      : [rawUniversalUrl, rawStaticExtUrl, rawTranscodeMp3Url, proxiedStaticUrl, proxiedTranscodeUrl];

    // Cover Art URL: check own primary image, or AlbumPrimaryImageTag / AlbumId
    const hasOwnImage = Boolean(item.ImageTags?.Primary);
    const albumIdForImg = item.AlbumId || item.ParentId;
    let coverUrl = FALLBACK_COVER_URL;

    if (hasOwnImage) {
      const rawImg = `${cleanUrl}/Items/${item.Id}/Images/Primary?maxHeight=350&maxWidth=350&quality=85&api_key=${tokenEnc}`;
      coverUrl = this.formatMediaUrl(rawImg, 'image');
    } else if (albumIdForImg) {
      const rawImg = `${cleanUrl}/Items/${albumIdForImg}/Images/Primary?maxHeight=350&maxWidth=350&quality=85&api_key=${tokenEnc}`;
      coverUrl = this.formatMediaUrl(rawImg, 'image');
    }

    const rawCodec = (
      audioStream?.Codec ||
      item.Container ||
      mediaSource?.Container ||
      'FLAC'
    )
      .split(',')[0]
      .toUpperCase();
    const validCodecs = ['FLAC', 'DSD', 'ALAC', 'MP3', 'AAC', 'OGG', 'WAV'];
    const codec = (validCodecs.includes(rawCodec) ? rawCodec : 'FLAC') as Track['codec'];

    const seed = (item.Id || String(idx)).charCodeAt(0) + idx;
    const extractedGenre = this.extractGenreString(item);

    return {
      id: item.Id,
      title: item.Name || 'Unknown Title',
      artist: item.Artists?.[0] || item.ArtistItems?.[0]?.Name || item.AlbumArtist || 'Unknown Artist',
      album: item.Album || 'Singles & Unsorted',
      albumId: item.AlbumId,
      albumArtist:
        item.AlbumArtist ||
        item.AlbumArtists?.[0]?.Name ||
        item.Artists?.[0] ||
        'Unknown Artist',
      year: item.ProductionYear || 2024,
      genre: extractedGenre || 'Unclassified',
      duration: durationSec || 180,
      streamUrl: primaryStreamUrl,
      fallbackStreamUrls,
      coverUrl,
      codec,
      bitrate: Math.round((audioStream?.BitRate || mediaSource?.Bitrate || 1411000) / 1000),
      sampleRate: audioStream?.SampleRate || 44100,
      bitDepth: audioStream?.BitDepth || 16,
      trackNumber: item.IndexNumber || idx + 1,
      discNumber: item.ParentIndexNumber || 1,
      bpm: item.Bpm || 95 + (seed % 55),
      replayGain: item.NormalizationGain ?? -3.2,
      lyrics: '',
      moodTags: {
        energy: Math.round((0.35 + ((seed * 7) % 60) / 100) * 100) / 100,
        valence: Math.round((0.3 + ((seed * 13) % 65) / 100) * 100) / 100,
        danceability: Math.round((0.4 + ((seed * 17) % 55) / 100) * 100) / 100,
        acousticness: Math.round((0.15 + ((seed * 23) % 70) / 100) * 100) / 100,
      },
      playCount: item.UserData?.PlayCount || 0,
      isFavorite: item.UserData?.IsFavorite || false,
      addedAt: item.DateCreated || '',
    };
  }

  public mapJellyfinItemToAlbum(item: any, cleanUrl: string): Album {
    const tokenEnc = encodeURIComponent(this.config.token);
    const hasPrimary = Boolean(
      item.ImageTags?.Primary ||
        item.AlbumPrimaryImageTag ||
        (item.ImageTags && Object.keys(item.ImageTags).length > 0)
    );
    const imgTargetId = item.Id;
    const rawImg = `${cleanUrl}/Items/${imgTargetId}/Images/Primary?maxHeight=420&maxWidth=420&quality=85&api_key=${tokenEnc}`;
    // Even if ImageTags was omitted in a lightweight response, Jellyfin serves /Items/{id}/Images/Primary if an image exists, and our img onError handler falls back to JellyWisp artwork if 404.
    const coverUrl = imgTargetId ? this.formatMediaUrl(rawImg, 'image') : hasPrimary ? this.formatMediaUrl(rawImg, 'image') : FALLBACK_COVER_URL;
    const durationSec = Math.round((item.RunTimeTicks || 0) / 10000000);
    const trackCount = item.ChildCount || item.SongCount || 0;
    const title = item.Name || 'Unknown Album';
    const extractedGenre = this.extractGenreString(item);
    const artist =
      item.AlbumArtist ||
      item.AlbumArtists?.[0]?.Name ||
      item.Artists?.[0] ||
      'Various Artists';

    return {
      id: item.Id,
      title,
      artist,
      year: item.ProductionYear || 2024,
      genre: extractedGenre || 'Unclassified',
      coverUrl,
      tracks: [],
      trackCount,
      totalDuration: durationSec,
      isHiRes: true,
      hiresBadge: 'LOSSLESS',
      releaseType: inferAlbumReleaseType(item.Id, title, trackCount, durationSec, artist),
    };
  }

  public mapJellyfinItemToArtist(item: any, cleanUrl: string): Artist {
    const tokenEnc = encodeURIComponent(this.config.token);
    const rawImg = item.Id
      ? `${cleanUrl}/Items/${item.Id}/Images/Primary?maxHeight=360&maxWidth=360&quality=85&api_key=${tokenEnc}`
      : `${cleanUrl}/Artists/${encodeURIComponent(item.Name || '')}/Images/Primary?maxHeight=360&maxWidth=360&quality=85&api_key=${tokenEnc}`;
    const coverUrl = item.Id || item.Name ? this.formatMediaUrl(rawImg, 'image') : FALLBACK_COVER_URL;

    const genresList: string[] =
      Array.isArray(item.Genres) && item.Genres.length > 0
        ? item.Genres
        : Array.isArray(item.GenreItems) && item.GenreItems.length > 0
        ? item.GenreItems.map((g: any) => g.Name).filter(Boolean)
        : [];

    return {
      id: item.Id,
      name: item.Name || 'Unknown Artist',
      coverUrl,
      bio: item.Overview || `Artist in ${this.config.serverName}`,
      genres: genresList.length > 0 ? genresList : ['Unclassified'],
      albums: [],
      trackCount: item.SongCount || item.ChildCount || 0,
    };
  }

  /**
   * Propagates Album and Artist genres onto tracks that didn't have track-level ID3 genre tags
   */
  private enrichTrackGenresFromAlbumsAndArtists(
    tracks: Track[],
    albums: Album[],
    artists: Artist[]
  ) {
    const albumGenreById = new Map<string, string>();
    const albumGenreByTitle = new Map<string, string>();
    const albumCoverById = new Map<string, string>();

    for (const alb of albums) {
      if (alb.genre && alb.genre !== 'Unclassified' && alb.genre !== 'Music') {
        if (alb.id) albumGenreById.set(alb.id, alb.genre);
        if (alb.title) albumGenreByTitle.set(alb.title.toLowerCase(), alb.genre);
      }
      if (alb.id && alb.coverUrl && alb.coverUrl !== FALLBACK_COVER_URL) {
        albumCoverById.set(alb.id, alb.coverUrl);
      }
    }

    const artistGenreByName = new Map<string, string>();
    for (const art of artists) {
      const firstGenre = art.genres?.find((g) => g && g !== 'Unclassified' && g !== 'Music');
      if (firstGenre && art.name) {
        artistGenreByName.set(art.name.toLowerCase(), firstGenre);
      }
    }

    for (const t of tracks) {
      if (!t.genre || t.genre === 'Unclassified' || t.genre === 'Music') {
        const fromAlbum =
          (t.albumId && albumGenreById.get(t.albumId)) ||
          (t.album && albumGenreByTitle.get(t.album.toLowerCase()));
        const fromArtist =
          artistGenreByName.get(t.artist.toLowerCase()) ||
          (t.albumArtist && artistGenreByName.get(t.albumArtist.toLowerCase()));
        if (fromAlbum) {
          t.genre = fromAlbum;
        } else if (fromArtist) {
          t.genre = fromArtist;
        }
      }
      if ((!t.coverUrl || t.coverUrl === FALLBACK_COVER_URL) && t.albumId) {
        const albCover = albumCoverById.get(t.albumId);
        if (albCover) t.coverUrl = albCover;
      }
    }

    // Also back-fill album genres from tracks if an album had Unclassified
    for (const alb of albums) {
      if (!alb.genre || alb.genre === 'Unclassified' || alb.genre === 'Music') {
        const matchingTrack = tracks.find(
          (t) =>
            (t.albumId === alb.id || t.album.toLowerCase() === alb.title.toLowerCase()) &&
            t.genre &&
            t.genre !== 'Unclassified' &&
            t.genre !== 'Music'
        );
        if (matchingTrack) {
          alb.genre = matchingTrack.genre;
        }
      }
    }
  }

  /**
   * Fetches all tracks belonging to a specific Album on demand
   */
  public async fetchAlbumTracks(albumId: string): Promise<Track[]> {
    if (this.config.isDemoMode || !this.config.token || !this.config.userId) return [];
    const cleanUrl = this.normalizeUrl(this.config.url);
    const endpoint = `/Users/${this.config.userId}/Items?ParentId=${encodeURIComponent(
      albumId
    )}&IncludeItemTypes=Audio&Recursive=true&Fields=Genres,ProductionYear,AlbumArtist,Artists,ParentIndexNumber,IndexNumber&SortBy=ParentIndexNumber,IndexNumber,SortName&SortOrder=Ascending`;

    const res = await this.request<any>(cleanUrl, endpoint, {
      token: this.config.token,
      forceProxy: this.config.useProxy,
    });

    if (res.ok && Array.isArray(res.data?.Items)) {
      const mapped = res.data.Items.map((it: any, idx: number) =>
        this.mapJellyfinItemToTrack(it, idx, cleanUrl)
      );
      return applyLocalLibraryOverrides(mapped, [], []).tracks;
    }
    return [];
  }

  /**
   * Fetches all Albums belonging to a specific Artist or AlbumArtist on demand
   */
  public async fetchArtistAlbums(artistId: string, artistName: string): Promise<Album[]> {
    if (this.config.isDemoMode || !this.config.token || !this.config.userId) return [];
    const cleanUrl = this.normalizeUrl(this.config.url);

    const isSyntheticId =
      !artistId ||
      artistId.startsWith('art-') ||
      artistId.startsWith('albart-') ||
      artistId.startsWith('aa-');

    const fieldsParam = 'Fields=Genres,ProductionYear,AlbumArtist,Artists,ChildCount';

    if (!isSyntheticId) {
      const endpointById = `/Users/${this.config.userId}/Items?ArtistIds=${encodeURIComponent(
        artistId
      )}&IncludeItemTypes=MusicAlbum&Recursive=true&${fieldsParam}&SortBy=ProductionYear,SortName&SortOrder=Descending&Limit=200`;

      const res = await this.request<any>(cleanUrl, endpointById, {
        token: this.config.token,
        forceProxy: this.config.useProxy,
      });

      if (res.ok && Array.isArray(res.data?.Items) && res.data.Items.length > 0) {
        const mapped = res.data.Items.map((it: any) => this.mapJellyfinItemToAlbum(it, cleanUrl));
        return applyLocalLibraryOverrides([], mapped, []).albums;
      }
    }

    // Fallback or synthetic Album Artist ID: search by artist name and match Artist / AlbumArtist
    const endpointBySearch = `/Users/${this.config.userId}/Items?SearchTerm=${encodeURIComponent(
      artistName
    )}&IncludeItemTypes=MusicAlbum&Recursive=true&${fieldsParam}&SortBy=ProductionYear,SortName&SortOrder=Descending&Limit=200`;

    const searchRes = await this.request<any>(cleanUrl, endpointBySearch, {
      token: this.config.token,
      forceProxy: this.config.useProxy,
    });

    if (searchRes.ok && Array.isArray(searchRes.data?.Items)) {
      const lower = artistName.toLowerCase();
      const mapped = searchRes.data.Items.map((it: any) =>
        this.mapJellyfinItemToAlbum(it, cleanUrl)
      ).filter(
        (alb: Album) =>
          alb.artist.toLowerCase().includes(lower) ||
          alb.title.toLowerCase().includes(lower)
      );
      return applyLocalLibraryOverrides([], mapped, []).albums;
    }
    return [];
  }

  /**
   * Fetches synced LRC or plain lyrics for a track from Jellyfin 10.9+ Lyrics endpoint
   */
  public async fetchTrackLyrics(trackId: string): Promise<string | null> {
    if (!trackId || this.config.isDemoMode || !this.config.token) return null;
    const cleanUrl = this.normalizeUrl(this.config.url);

    for (const path of [`/Audio/${trackId}/Lyrics`, `/Items/${trackId}/Lyrics`]) {
      const res = await this.request<any>(cleanUrl, path, {
        token: this.config.token,
        forceProxy: this.config.useProxy,
      });
      if (res.ok && res.data) {
        if (Array.isArray(res.data.Lyrics) && res.data.Lyrics.length > 0) {
          return res.data.Lyrics.map((line: any) => {
            if (typeof line.Start === 'number') {
              const totalSec = line.Start / 10000000;
              const mins = Math.floor(totalSec / 60)
                .toString()
                .padStart(2, '0');
              const secs = Math.floor(totalSec % 60)
                .toString()
                .padStart(2, '0');
              const hundredths = Math.floor((totalSec % 1) * 100)
                .toString()
                .padStart(2, '0');
              return `[${mins}:${secs}.${hundredths}] ${line.Text || ''}`;
            }
            return line.Text || '';
          }).join('\n');
        }
        if (typeof res.data === 'string' && res.data.trim()) {
          return res.data;
        }
      }
    }
    return null;
  }

  /**
   * Server-side search across all 80,000+ tracks, albums, and artists
   */
  public async searchServer(query: string): Promise<{
    tracks: Track[];
    albums: Album[];
    artists: Artist[];
  }> {
    if (this.config.isDemoMode || !this.config.token || !this.config.userId || !query.trim()) {
      return { tracks: [], albums: [], artists: [] };
    }

    const cleanUrl = this.normalizeUrl(this.config.url);
    const q = encodeURIComponent(query.trim());
    const fields = 'Fields=Genres,ProductionYear,AlbumArtist,Artists,ParentIndexNumber,IndexNumber';

    const [tracksRes, albumsRes, artistsRes] = await Promise.all([
      this.request<any>(
        cleanUrl,
        `/Users/${this.config.userId}/Items?SearchTerm=${q}&IncludeItemTypes=Audio&Recursive=true&${fields}&Limit=250`,
        { token: this.config.token, forceProxy: this.config.useProxy }
      ),
      this.request<any>(
        cleanUrl,
        `/Users/${this.config.userId}/Items?SearchTerm=${q}&IncludeItemTypes=MusicAlbum&Recursive=true&${fields}&Limit=100`,
        { token: this.config.token, forceProxy: this.config.useProxy }
      ),
      this.request<any>(
        cleanUrl,
        `/Users/${this.config.userId}/Items?SearchTerm=${q}&IncludeItemTypes=MusicArtist&Recursive=true&Fields=Genres,Overview&Limit=100`,
        { token: this.config.token, forceProxy: this.config.useProxy }
      ),
    ]);

    return applyLocalLibraryOverrides(
      (tracksRes.data?.Items || []).map((it: any, i: number) =>
        this.mapJellyfinItemToTrack(it, i, cleanUrl)
      ),
      (albumsRes.data?.Items || []).map((it: any) =>
        this.mapJellyfinItemToAlbum(it, cleanUrl)
      ),
      (artistsRes.data?.Items || []).map((it: any) =>
        this.mapJellyfinItemToArtist(it, cleanUrl)
      )
    );
  }

  /**
   * High-Volume Progressive Library Loader with Genres & Metadata Fields
   */
  public async fetchMusicData(
    onProgress?: (
      partial: { tracks: Track[]; albums: Album[]; artists: Artist[] },
      progress: LibrarySyncProgress
    ) => void
  ): Promise<{
    tracks: Track[];
    albums: Album[];
    artists: Artist[];
    progress?: LibrarySyncProgress;
    authExpired?: boolean;
    error?: string;
  }> {
    const syncGen = ++this.activeSyncGeneration;

    if (this.config.isDemoMode) {
      const demoAlbums = INITIAL_ALBUMS.map((a) => ({
        ...a,
        releaseType: inferAlbumReleaseType(a.id, a.title, a.trackCount, a.totalDuration, a.artist),
      }));
      const overridden = applyLocalLibraryOverrides(
        [...INITIAL_TRACKS],
        demoAlbums,
        [...INITIAL_ARTISTS]
      );
      // Sync embedded album track lists with overridden tracks and synthesize any missing album entries
      const tracksByAlbum = new Map<string, Track[]>();
      for (const t of overridden.tracks) {
        const key = t.album.trim().toLowerCase();
        if (!tracksByAlbum.has(key)) tracksByAlbum.set(key, []);
        tracksByAlbum.get(key)!.push(t);
      }

      const seenAlbumTitles = new Set<string>();
      const syncedAlbums: Album[] = overridden.albums.map((alb) => {
        const titleKey = alb.title.trim().toLowerCase();
        seenAlbumTitles.add(titleKey);
        const matchedTracks = tracksByAlbum.get(titleKey) || alb.tracks;
        const trackCount = matchedTracks.length || alb.trackCount;
        const totalDuration =
          matchedTracks.reduce((acc, tr) => acc + (tr.duration || 0), 0) || alb.totalDuration;
        return {
          ...alb,
          tracks: matchedTracks,
          trackCount,
          totalDuration,
          releaseType:
            getAlbumReleaseTypeOverride(alb.id, alb.title, alb.artist) ||
            inferAlbumReleaseType(alb.id, alb.title, trackCount, totalDuration, alb.artist),
        };
      });

      for (const [titleKey, albTracks] of tracksByAlbum.entries()) {
        if (!seenAlbumTitles.has(titleKey) && albTracks.length > 0) {
          seenAlbumTitles.add(titleKey);
          const first = albTracks[0];
          const albId = first.albumId || `alb-demo-${syncedAlbums.length + 1}`;
          const albArtist = first.albumArtist || first.artist;
          const totalDuration = albTracks.reduce((acc, tr) => acc + (tr.duration || 0), 0);
          syncedAlbums.push({
            id: albId,
            title: first.album,
            artist: albArtist,
            year: first.year,
            genre: first.genre,
            coverUrl: first.coverUrl,
            tracks: albTracks,
            trackCount: albTracks.length,
            totalDuration,
            isHiRes: first.codec === 'FLAC' || first.codec === 'DSD' || first.codec === 'ALAC',
            hiresBadge: `${first.codec} ${Math.round((first.sampleRate || 44100) / 1000)}kHz / ${first.bitDepth || 16}-bit`,
            releaseType:
              getAlbumReleaseTypeOverride(albId, first.album, albArtist) ||
              inferAlbumReleaseType(albId, first.album, albTracks.length, totalDuration, albArtist),
          });
        }
      }

      const syncedArtists = overridden.artists.map((art) => {
        const lower = art.name.trim().toLowerCase();
        const artAlbums = syncedAlbums.filter(
          (a) => a.artist.trim().toLowerCase() === lower
        );
        const artTracks = overridden.tracks.filter(
          (t) =>
            t.artist.trim().toLowerCase() === lower ||
            (t.albumArtist || '').trim().toLowerCase() === lower
        );
        return {
          ...art,
          albums: artAlbums.length > 0 ? artAlbums : art.albums,
          trackCount: artTracks.length || art.trackCount,
        };
      });

      const demoProgress: LibrarySyncProgress = {
        loadedTracks: overridden.tracks.length,
        totalTracks: overridden.tracks.length,
        loadedAlbums: syncedAlbums.length,
        totalAlbums: syncedAlbums.length,
        loadedArtists: syncedArtists.length,
        totalArtists: syncedArtists.length,
        isComplete: true,
      };
      return {
        tracks: overridden.tracks,
        albums: syncedAlbums,
        artists: syncedArtists,
        progress: demoProgress,
      };
    }

    if (!this.config.token || !this.config.userId || !this.config.url) {
      return {
        tracks: [],
        albums: [],
        artists: [],
        error: 'Not authenticated with Jellyfin server.',
      };
    }

    try {
      const cleanUrl = this.normalizeUrl(this.config.url);
      let activeParentFilter = this.config.selectedLibraryId
        ? `&ParentId=${encodeURIComponent(this.config.selectedLibraryId)}`
        : '';

      const INITIAL_BATCH = 500;
      const trackFields = '&Fields=Genres,ProductionYear,AlbumArtist,Artists,ParentIndexNumber,IndexNumber';
      const albumFields = '&Fields=Genres,ProductionYear,AlbumArtist,Artists,ChildCount';
      const artistFields = '&Fields=Genres,Overview,ChildCount';

      const buildTracksUrl = (start: number, limit: number, pFilter: string) =>
        `/Users/${this.config.userId}/Items?IncludeItemTypes=Audio&Recursive=true&StartIndex=${start}&Limit=${limit}${trackFields}${pFilter}`;

      const buildAlbumsUrl = (start: number, limit: number, pFilter: string) =>
        `/Users/${this.config.userId}/Items?IncludeItemTypes=MusicAlbum&Recursive=true&StartIndex=${start}&Limit=${limit}${albumFields}${pFilter}`;

      const buildArtistsUrl = (start: number, limit: number, pFilter: string) =>
        `/Users/${this.config.userId}/Items?IncludeItemTypes=MusicArtist&Recursive=true&StartIndex=${start}&Limit=${limit}${artistFields}${pFilter}`;

      // 1. Fetch initial tracks batch first
      let tracksRes = await this.request<any>(
        cleanUrl,
        buildTracksUrl(0, INITIAL_BATCH, activeParentFilter),
        {
          token: this.config.token,
          forceProxy: this.config.useProxy,
        }
      );

      if (
        tracksRes.ok &&
        (!tracksRes.data?.Items || tracksRes.data.Items.length === 0) &&
        activeParentFilter
      ) {
        activeParentFilter = '';
        tracksRes = await this.request<any>(cleanUrl, buildTracksUrl(0, INITIAL_BATCH, ''), {
          token: this.config.token,
          forceProxy: this.config.useProxy,
        });
      }

      if (tracksRes.status === 401) {
        this.saveConfig({ ...this.config, isConnected: false });
        return {
          tracks: [],
          albums: [],
          artists: [],
          authExpired: true,
          error:
            'Your Jellyfin session token expired or was revoked (HTTP 401). Please sign in again.',
        };
      }

      if (!tracksRes.ok) {
        return {
          tracks: [],
          albums: [],
          artists: [],
          error: tracksRes.error || `Failed to fetch music library (HTTP ${tracksRes.status})`,
        };
      }

      // 2. Fetch initial albums and artists batches
      const albumsRes = await this.request<any>(
        cleanUrl,
        buildAlbumsUrl(0, INITIAL_BATCH, activeParentFilter),
        {
          token: this.config.token,
          forceProxy: this.config.useProxy,
        }
      );

      let artistsRes = await this.request<any>(
        cleanUrl,
        buildArtistsUrl(0, INITIAL_BATCH, activeParentFilter),
        {
          token: this.config.token,
          forceProxy: this.config.useProxy,
        }
      );

      if (!artistsRes.ok || !artistsRes.data?.Items?.length) {
        const fallbackArtists = await this.request<any>(
          cleanUrl,
          `/Artists/AlbumArtists?UserId=${encodeURIComponent(
            this.config.userId
          )}&StartIndex=0&Limit=${INITIAL_BATCH}${artistFields}${activeParentFilter}`,
          {
            token: this.config.token,
            forceProxy: this.config.useProxy,
          }
        );
        if (fallbackArtists.ok && fallbackArtists.data?.Items?.length) {
          artistsRes = fallbackArtists;
        }
      }

      const rawTracks = tracksRes.data?.Items || [];
      const totalTracks: number = tracksRes.data?.TotalRecordCount ?? rawTracks.length;

      const rawAlbums = albumsRes.ok ? albumsRes.data?.Items || [] : [];
      const totalAlbums: number = albumsRes.ok
        ? albumsRes.data?.TotalRecordCount ?? rawAlbums.length
        : 0;

      const rawArtists = artistsRes.ok ? artistsRes.data?.Items || [] : [];
      const totalArtists: number = artistsRes.ok
        ? artistsRes.data?.TotalRecordCount ?? rawArtists.length
        : 0;

      let allTracks: Track[] = rawTracks.map((it: any, idx: number) =>
        this.mapJellyfinItemToTrack(it, idx, cleanUrl)
      );

      let allAlbums: Album[] = rawAlbums.map((it: any) =>
        this.mapJellyfinItemToAlbum(it, cleanUrl)
      );

      let allArtists: Artist[] = rawArtists.map((it: any) =>
        this.mapJellyfinItemToArtist(it, cleanUrl)
      );

      if (allAlbums.length === 0 && allTracks.length > 0) {
        const albumMap = new Map<string, Album>();
        for (const t of allTracks) {
          const key = t.albumId || `${t.album}___${t.albumArtist}`;
          if (!albumMap.has(key)) {
            const albId = t.albumId || `alb-${t.id}`;
            const albArtist = t.albumArtist || t.artist;
            albumMap.set(key, {
              id: albId,
              title: t.album,
              artist: albArtist,
              year: t.year,
              genre: t.genre,
              coverUrl: t.coverUrl,
              tracks: [],
              trackCount: 0,
              totalDuration: 0,
              isHiRes: true,
              hiresBadge: t.codec,
              releaseType: inferAlbumReleaseType(albId, t.album, 1, t.duration, albArtist),
            });
          }
          const alb = albumMap.get(key)!;
          alb.trackCount++;
          alb.totalDuration += t.duration;
        }
        allAlbums = Array.from(albumMap.values());
      }

      if (allArtists.length === 0 && allTracks.length > 0) {
        const artistMap = new Map<string, Artist>();
        for (const t of allTracks) {
          if (!artistMap.has(t.artist)) {
            artistMap.set(t.artist, {
              id: `art-${t.id}`,
              name: t.artist,
              coverUrl: this.getArtistImageUrlByName(t.artist) || t.coverUrl,
              bio: `Artist on ${this.config.serverName}`,
              genres: [t.genre],
              albums: [],
              trackCount: 0,
            });
          }
          artistMap.get(t.artist)!.trackCount++;
        }
        allArtists = Array.from(artistMap.values());
      }

      this.enrichTrackGenresFromAlbumsAndArtists(allTracks, allAlbums, allArtists);
      const overriddenInitial = applyLocalLibraryOverrides(allTracks, allAlbums, allArtists);
      allTracks = overriddenInitial.tracks;
      allAlbums = overriddenInitial.albums;
      allArtists = overriddenInitial.artists;

      const isInitiallyComplete =
        allTracks.length >= totalTracks &&
        allAlbums.length >= totalAlbums &&
        allArtists.length >= totalArtists;

      const initialProgress: LibrarySyncProgress = {
        loadedTracks: allTracks.length,
        totalTracks: Math.max(totalTracks, allTracks.length),
        loadedAlbums: allAlbums.length,
        totalAlbums: Math.max(totalAlbums, allAlbums.length),
        loadedArtists: allArtists.length,
        totalArtists: Math.max(totalArtists, allArtists.length),
        isComplete: isInitiallyComplete,
      };

      if (!isInitiallyComplete && onProgress) {
        this.streamRemainingLibrary(
          syncGen,
          cleanUrl,
          activeParentFilter,
          allTracks,
          totalTracks,
          allAlbums,
          totalAlbums,
          allArtists,
          totalArtists,
          onProgress
        );
      }

      return {
        tracks: allTracks,
        albums: allAlbums,
        artists: allArtists,
        progress: initialProgress,
      };
    } catch (err: any) {
      console.warn('Could not fetch from Jellyfin server:', err);
      return {
        tracks: [],
        albums: [],
        artists: [],
        error: err?.message || 'Failed to load tracks from Jellyfin server.',
      };
    }
  }

  private async streamRemainingLibrary(
    syncGen: number,
    cleanUrl: string,
    parentFilter: string,
    initialTracks: Track[],
    totalTracks: number,
    initialAlbums: Album[],
    totalAlbums: number,
    initialArtists: Artist[],
    totalArtists: number,
    onProgress: (
      partial: { tracks: Track[]; albums: Album[]; artists: Artist[] },
      progress: LibrarySyncProgress
    ) => void
  ) {
    let tracks = initialTracks;
    let albums = initialAlbums;
    let artists = initialArtists;

    const CHUNK_SIZE = 1500;
    const trackFields = '&Fields=Genres,ProductionYear,AlbumArtist,Artists,ParentIndexNumber,IndexNumber';
    const albumFields = '&Fields=Genres,ProductionYear,AlbumArtist,Artists,ChildCount';
    const artistFields = '&Fields=Genres,Overview,ChildCount';

    // 1. Fetch remaining native Artists
    while (artists.length < totalArtists && syncGen === this.activeSyncGeneration) {
      const start = artists.length;
      const res = await this.request<any>(
        cleanUrl,
        `/Users/${this.config.userId}/Items?IncludeItemTypes=MusicArtist&Recursive=true&StartIndex=${start}&Limit=${CHUNK_SIZE}${artistFields}${parentFilter}`,
        { token: this.config.token, forceProxy: this.config.useProxy }
      );
      if (!res.ok || !res.data?.Items?.length) break;
      const mapped = applyLocalLibraryOverrides(
        [],
        [],
        res.data.Items.map((it: any) => this.mapJellyfinItemToArtist(it, cleanUrl))
      ).artists;
      artists = [...artists, ...mapped];

      if (syncGen !== this.activeSyncGeneration) return;
      onProgress(
        { tracks, albums, artists },
        {
          loadedTracks: tracks.length,
          totalTracks,
          loadedAlbums: albums.length,
          totalAlbums,
          loadedArtists: artists.length,
          totalArtists,
          isComplete: false,
        }
      );
      await new Promise((r) => setTimeout(r, 25));
    }

    // 2. Fetch remaining native Albums
    while (albums.length < totalAlbums && syncGen === this.activeSyncGeneration) {
      const start = albums.length;
      const res = await this.request<any>(
        cleanUrl,
        `/Users/${this.config.userId}/Items?IncludeItemTypes=MusicAlbum&Recursive=true&StartIndex=${start}&Limit=${CHUNK_SIZE}${albumFields}${parentFilter}`,
        { token: this.config.token, forceProxy: this.config.useProxy }
      );
      if (!res.ok || !res.data?.Items?.length) break;
      const mapped = applyLocalLibraryOverrides(
        [],
        res.data.Items.map((it: any) => this.mapJellyfinItemToAlbum(it, cleanUrl)),
        []
      ).albums;
      albums = [...albums, ...mapped];

      if (syncGen !== this.activeSyncGeneration) return;
      onProgress(
        { tracks, albums, artists },
        {
          loadedTracks: tracks.length,
          totalTracks,
          loadedAlbums: albums.length,
          totalAlbums,
          loadedArtists: artists.length,
          totalArtists,
          isComplete: false,
        }
      );
      await new Promise((r) => setTimeout(r, 25));
    }

    // 3. Stream all remaining Tracks in 1,500-track chunks
    while (tracks.length < totalTracks && syncGen === this.activeSyncGeneration) {
      const start = tracks.length;
      const res = await this.request<any>(
        cleanUrl,
        `/Users/${this.config.userId}/Items?IncludeItemTypes=Audio&Recursive=true&StartIndex=${start}&Limit=${CHUNK_SIZE}${trackFields}${parentFilter}`,
        { token: this.config.token, forceProxy: this.config.useProxy, timeoutMs: 30000 }
      );
      if (!res.ok || !res.data?.Items?.length) break;

      const baseIdx = tracks.length;
      const rawMapped = res.data.Items.map((it: any, i: number) =>
        this.mapJellyfinItemToTrack(it, baseIdx + i, cleanUrl)
      );
      this.enrichTrackGenresFromAlbumsAndArtists(rawMapped, albums, artists);
      const mapped = applyLocalLibraryOverrides(rawMapped, [], []).tracks;
      tracks = [...tracks, ...mapped];

      if (syncGen !== this.activeSyncGeneration) return;
      const isDone = tracks.length >= totalTracks;
      onProgress(
        { tracks, albums, artists },
        {
          loadedTracks: tracks.length,
          totalTracks,
          loadedAlbums: albums.length,
          totalAlbums,
          loadedArtists: artists.length,
          totalArtists,
          isComplete: isDone,
        }
      );

      await new Promise((r) => setTimeout(r, 30));
    }

    if (syncGen === this.activeSyncGeneration) {
      this.enrichTrackGenresFromAlbumsAndArtists(tracks, albums, artists);
      const finalOverridden = applyLocalLibraryOverrides(tracks, albums, artists);
      onProgress(
        finalOverridden,
        {
          loadedTracks: finalOverridden.tracks.length,
          totalTracks: Math.max(totalTracks, finalOverridden.tracks.length),
          loadedAlbums: finalOverridden.albums.length,
          totalAlbums: Math.max(totalAlbums, finalOverridden.albums.length),
          loadedArtists: finalOverridden.artists.length,
          totalArtists: Math.max(totalArtists, finalOverridden.artists.length),
          isComplete: true,
        }
      );
    }
  }

  /**
   * Reports playback start to Jellyfin server (/Sessions/Playing).
   * Notifies Jellyfin plugins (including Last.fm scrobblers) of current active track.
   */
  public async reportPlaybackStart(track: Track) {
    if (this.config.isDemoMode || !this.config.token || !track?.id) return;
    try {
      const cleanUrl = this.normalizeUrl(this.config.url);
      await this.request(cleanUrl, '/Sessions/Playing', {
        method: 'POST',
        token: this.config.token,
        forceProxy: this.config.useProxy,
        body: {
          ItemId: track.id,
          QueueableMediaTypes: ['Audio'],
          CanSeek: true,
          PlayMethod: 'DirectStream',
        },
      });
    } catch {
      // Fire-and-forget
    }
  }

  /**
   * Reports playback progress (/Sessions/Playing/Progress).
   * Called every 5-10s to keep playback session active and sync scrobblers.
   */
  public async reportPlaybackProgress(track: Track, currentSeconds: number, isPaused: boolean) {
    if (this.config.isDemoMode || !this.config.token || !track?.id) return;
    try {
      const cleanUrl = this.normalizeUrl(this.config.url);
      const positionTicks = Math.floor(Math.max(0, currentSeconds) * 10000000);
      await this.request(cleanUrl, '/Sessions/Playing/Progress', {
        method: 'POST',
        token: this.config.token,
        forceProxy: this.config.useProxy,
        body: {
          ItemId: track.id,
          PositionTicks: positionTicks,
          IsPaused: isPaused,
          PlayMethod: 'DirectStream',
          EventName: isPaused ? 'pause' : 'timeupdate',
        },
      });
    } catch {
      // Fire-and-forget
    }
  }

  /**
   * Reports playback stopped (/Sessions/Playing/Stopped).
   */
  public async reportPlaybackStopped(track: Track, currentSeconds: number) {
    if (this.config.isDemoMode || !this.config.token || !track?.id) return;
    try {
      const cleanUrl = this.normalizeUrl(this.config.url);
      const positionTicks = Math.floor(Math.max(0, currentSeconds) * 10000000);
      await this.request(cleanUrl, '/Sessions/Playing/Stopped', {
        method: 'POST',
        token: this.config.token,
        forceProxy: this.config.useProxy,
        body: {
          ItemId: track.id,
          PositionTicks: positionTicks,
        },
      });
    } catch {
      // Fire-and-forget
    }
  }

  /**
   * Marks a track as played on the Jellyfin server (/Users/{userId}/PlayedItems/{itemId}).
   * Increments server playcount and triggers Last.fm scrobble completion.
   */
  public async markTrackPlayed(trackId: string): Promise<boolean> {
    if (this.config.isDemoMode || !this.config.token || !trackId) return false;
    try {
      const cleanUrl = this.normalizeUrl(this.config.url);
      const endpoint = `/Users/${this.config.userId}/PlayedItems/${trackId}`;
      await this.request(cleanUrl, endpoint, {
        method: 'POST',
        token: this.config.token,
        forceProxy: this.config.useProxy,
      });
      return true;
    } catch {
      return false;
    }
  }

  public async reportProgress(itemId: string, positionTicks: number, isPaused: boolean) {
    if (this.config.isDemoMode || !this.config.token) return;
    try {
      const cleanUrl = this.normalizeUrl(this.config.url);
      const action = isPaused ? 'Progress' : 'Playing';
      await this.request(cleanUrl, `/Sessions/Playing/${action}`, {
        method: 'POST',
        token: this.config.token,
        forceProxy: this.config.useProxy,
        body: {
          ItemId: itemId,
          PositionTicks: positionTicks,
          IsPaused: isPaused,
        },
      });
    } catch {
      // Fire-and-forget
    }
  }
}

export const jellyfin = new JellyfinService();
