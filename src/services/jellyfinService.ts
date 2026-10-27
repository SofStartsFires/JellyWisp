import { Track, Album, Artist, JellyfinServerConfig } from '../types/index.ts';
import { INITIAL_TRACKS, INITIAL_ALBUMS, INITIAL_ARTISTS } from '../data/mockLibrary.ts';

export const DEFAULT_DEMO_CONFIG: JellyfinServerConfig = {
  url: 'https://jellyfin.sound-sphere.internal:8096',
  username: 'Audiophile_Demo',
  token: 'finamp_demo_token_88912',
  userId: 'usr_demo_88192',
  serverName: 'SoundSphere Jellyfin Media Server',
  serverVersion: '10.9.11 (Official Linux x64)',
  isConnected: true,
  isDemoMode: true,
  pingMs: 14,
  musicLibraries: [
    { id: 'lib-hires-lossless', name: 'Master Hi-Res Flac & DSD' },
    { id: 'lib-citypop-vinyl', name: 'Vinyl Archives & City Pop' },
  ],
};

const STORAGE_KEY_SERVER = 'finamp_jellyfin_config';

export class JellyfinService {
  private config: JellyfinServerConfig;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY_SERVER);
    if (saved) {
      try {
        this.config = JSON.parse(saved);
      } catch {
        this.config = { ...DEFAULT_DEMO_CONFIG };
      }
    } else {
      this.config = { ...DEFAULT_DEMO_CONFIG };
    }
  }

  public getConfig(): JellyfinServerConfig {
    return { ...this.config };
  }

  public saveConfig(config: JellyfinServerConfig) {
    this.config = { ...config };
    localStorage.setItem(STORAGE_KEY_SERVER, JSON.stringify(this.config));
  }

  public resetToDemo(): JellyfinServerConfig {
    this.config = { ...DEFAULT_DEMO_CONFIG };
    this.saveConfig(this.config);
    return this.config;
  }

  /**
   * Tests connection to a real Jellyfin server endpoint
   */
  public async testConnection(url: string, token: string): Promise<{ success: boolean; serverInfo?: any; error?: string }> {
    const cleanUrl = url.replace(/\/+$/, '');
    try {
      const response = await fetch(`${cleanUrl}/System/Info/Public`, {
        headers: token ? { 'X-Emby-Token': token } : {},
      });
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return {
        success: true,
        serverInfo: {
          serverName: data.ServerName || 'Jellyfin Server',
          serverVersion: data.Version || '10.9.x',
          id: data.Id,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to connect to Jellyfin server. Check URL and CORS settings.',
      };
    }
  }

  /**
   * Authenticates user against Jellyfin via username and password
   */
  public async authenticate(url: string, username: string, password = ''): Promise<{ success: boolean; config?: JellyfinServerConfig; error?: string }> {
    const cleanUrl = url.replace(/\/+$/, '');
    const clientName = 'FinAmp Desktop';
    const deviceName = 'Web Desktop Client';
    const deviceId = 'finamp-desktop-' + Math.random().toString(36).substring(2, 9);
    const version = '2.4.0';

    const authHeader = `MediaBrowser Client="${clientName}", Device="${deviceName}", DeviceId="${deviceId}", Version="${version}"`;

    try {
      const res = await fetch(`${cleanUrl}/Users/AuthenticateByName`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Authorization': authHeader,
        },
        body: JSON.stringify({
          Username: username,
          Pw: password,
        }),
      });

      if (!res.ok) {
        throw new Error(`Authentication failed: HTTP ${res.status}`);
      }

      const data = await res.json();
      const newConfig: JellyfinServerConfig = {
        url: cleanUrl,
        username: data.User?.Name || username,
        token: data.AccessToken,
        userId: data.User?.Id,
        serverName: data.ServerId || 'Jellyfin Server',
        serverVersion: '10.9.x',
        isConnected: true,
        isDemoMode: false,
        pingMs: 24,
        musicLibraries: [],
      };

      this.saveConfig(newConfig);
      return { success: true, config: newConfig };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Authentication error. Please check credentials and CORS.',
      };
    }
  }

  /**
   * Fetches music items from Jellyfin server or falls back to demo library
   */
  public async fetchMusicData(): Promise<{ tracks: Track[]; albums: Album[]; artists: Artist[] }> {
    if (this.config.isDemoMode || !this.config.token || !this.config.userId) {
      return {
        tracks: [...INITIAL_TRACKS],
        albums: [...INITIAL_ALBUMS],
        artists: [...INITIAL_ARTISTS],
      };
    }

    try {
      const cleanUrl = this.config.url.replace(/\/+$/, '');
      const headers = {
        'X-Emby-Token': this.config.token,
      };

      // Query audio items
      const queryUrl = `${cleanUrl}/Users/${this.config.userId}/Items?IncludeItemTypes=Audio&Recursive=true&Fields=MediaSources,Tags,PrimaryImageAspectRatio,Genres,RunTimeTicks,IndexNumber,ParentIndexNumber,AlbumArtist,AlbumId,ArtistItems`;
      const res = await fetch(queryUrl, { headers });
      if (!res.ok) throw new Error('Failed to fetch items from Jellyfin');

      const data = await res.json();
      const serverTracks: Track[] = (data.Items || []).map((item: any) => {
        const durationSec = Math.round((item.RunTimeTicks || 0) / 10000000);
        const mediaSource = item.MediaSources?.[0];
        const audioStream = mediaSource?.MediaStreams?.find((s: any) => s.Type === 'Audio');

        const streamUrl = `${cleanUrl}/Audio/${item.Id}/stream?static=true&api_key=${this.config.token}`;
        const coverUrl = item.AlbumId
          ? `${cleanUrl}/Items/${item.AlbumId}/Images/Primary?maxHeight=600&maxWidth=600`
          : `${cleanUrl}/Items/${item.Id}/Images/Primary?maxHeight=600&maxWidth=600`;

        return {
          id: item.Id,
          title: item.Name || 'Unknown Title',
          artist: item.Artists?.[0] || item.AlbumArtist || 'Unknown Artist',
          album: item.Album || 'Unknown Album',
          albumArtist: item.AlbumArtist,
          year: item.ProductionYear || 2024,
          genre: item.Genres?.[0] || 'Unknown',
          duration: durationSec || 180,
          streamUrl,
          coverUrl,
          codec: (audioStream?.Codec?.toUpperCase() as any) || 'FLAC',
          bitrate: Math.round((audioStream?.BitRate || 1411000) / 1000),
          sampleRate: audioStream?.SampleRate || 96000,
          bitDepth: audioStream?.BitDepth || 24,
          trackNumber: item.IndexNumber || 1,
          discNumber: item.ParentIndexNumber || 1,
          bpm: item.Bpm || 120,
          replayGain: -4.5,
          lyrics: '',
          moodTags: {
            energy: 0.6,
            valence: 0.6,
            danceability: 0.6,
            acousticness: 0.3,
          },
          playCount: item.UserData?.PlayCount || 0,
          isFavorite: item.UserData?.IsFavorite || false,
          addedAt: item.DateCreated || new Date().toISOString(),
        };
      });

      if (serverTracks.length === 0) {
        return {
          tracks: [...INITIAL_TRACKS],
          albums: [...INITIAL_ALBUMS],
          artists: [...INITIAL_ARTISTS],
        };
      }

      // Group tracks into albums
      const albumMap = new Map<string, Album>();
      for (const t of serverTracks) {
        if (!albumMap.has(t.album)) {
          albumMap.set(t.album, {
            id: `alb-${t.album}`,
            title: t.album,
            artist: t.artist,
            year: t.year,
            genre: t.genre,
            coverUrl: t.coverUrl,
            tracks: [],
            trackCount: 0,
            totalDuration: 0,
            isHiRes: t.sampleRate >= 88200 || t.bitDepth >= 24,
            hiresBadge: `${t.codec} ${Math.round(t.sampleRate / 1000)}kHz / ${t.bitDepth}-bit`,
          });
        }
        const alb = albumMap.get(t.album)!;
        alb.tracks.push(t);
        alb.trackCount += 1;
        alb.totalDuration += t.duration;
      }

      // Group into artists
      const artistMap = new Map<string, Artist>();
      for (const t of serverTracks) {
        if (!artistMap.has(t.artist)) {
          artistMap.set(t.artist, {
            id: `art-${t.artist}`,
            name: t.artist,
            coverUrl: t.coverUrl,
            bio: `Artist in your Jellyfin music library with ${t.album}`,
            genres: [t.genre],
            albums: [],
            trackCount: 0,
          });
        }
        const art = artistMap.get(t.artist)!;
        art.trackCount += 1;
      }

      return {
        tracks: serverTracks,
        albums: Array.from(albumMap.values()),
        artists: Array.from(artistMap.values()),
      };
    } catch (err) {
      console.warn('Failed to fetch from Jellyfin server, using mock library:', err);
      return {
        tracks: [...INITIAL_TRACKS],
        albums: [...INITIAL_ALBUMS],
        artists: [...INITIAL_ARTISTS],
      };
    }
  }

  /**
   * Reports playback progress back to Jellyfin server sessions
   */
  public async reportProgress(itemId: string, positionTicks: number, isPaused: boolean) {
    if (this.config.isDemoMode || !this.config.token) return;
    try {
      const cleanUrl = this.config.url.replace(/\/+$/, '');
      const action = isPaused ? 'Progress' : 'Playing';
      await fetch(`${cleanUrl}/Sessions/Playing/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Token': this.config.token,
        },
        body: JSON.stringify({
          ItemId: itemId,
          PositionTicks: positionTicks,
          IsPaused: isPaused,
        }),
      });
    } catch {
      // Fire-and-forget
    }
  }
}

export const jellyfin = new JellyfinService();
