/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  PanelTop,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { Titlebar, SearchBarSection } from './components/Titlebar.tsx';
import { Sidebar, NavView } from './components/Sidebar.tsx';
import { PlayerBar } from './components/PlayerBar.tsx';
import { TrackListView } from './components/TrackListView.tsx';
import { AlbumGridView } from './components/AlbumGridView.tsx';
import { ArtistListView } from './components/ArtistListView.tsx';
import { GenreDecadeView } from './components/GenreDecadeView.tsx';
import { SmartPlaylistsView } from './components/SmartPlaylistsView.tsx';
import { ThemeEditorView } from './components/ThemeEditorView.tsx';
import { HotkeysView } from './components/HotkeysView.tsx';
import { VisualizerOverlay } from './components/VisualizerOverlay.tsx';
import { DspEqualizerModal } from './components/DspEqualizerModal.tsx';
import { PerformanceSpecsModal } from './components/PerformanceSpecsModal.tsx';
import { MetadataEditorModal } from './components/MetadataEditorModal.tsx';
import { CoverArtSearchModal } from './components/CoverArtSearchModal.tsx';
import { JellyfinConfigModal } from './components/JellyfinConfigModal.tsx';
import { LyricsDrawer } from './components/LyricsDrawer.tsx';
import { QueueDrawer } from './components/QueueDrawer.tsx';
import { MiniPlayerOverlay } from './components/MiniPlayerOverlay.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { NowPlayingModal } from './components/NowPlayingModal.tsx';
import { TrackContextMenu } from './components/TrackContextMenu.tsx';
import { AlbumContextMenu } from './components/AlbumContextMenu.tsx';
import { ArtistContextMenu } from './components/ArtistContextMenu.tsx';
import { HomeView } from './components/HomeView.tsx';
import { ArtApplyTargetOverride } from './components/CoverArtSearchModal.tsx';

import {
  Track,
  Album,
  Artist,
  AlbumReleaseType,
  JellyfinServerConfig,
  ThemeConfig,
  DspSettings,
  HotkeyBinding,
  PerformanceMetrics,
  LayoutConfig,
  DraggableSectionId,
  LibrarySyncProgress,
  VisibleSidebarItems,
} from './types/index.ts';
import { audioEngine } from './services/audioEngine.ts';
import {
  jellyfin,
  saveAlbumReleaseTypeOverride,
  saveTrackFavoriteOverride,
  saveTrackMetadataOverride,
  saveArtworkOverride,
  applyLocalLibraryOverrides,
} from './services/jellyfinService.ts';
import {
  buildServerCacheKey,
  loadCachedLibrarySnapshot,
  saveCachedLibrarySnapshot,
} from './services/libraryCacheService.ts';
import { themeEngine } from './services/themeEngine.ts';
import { hotkeyService } from './services/hotkeyService.ts';
import { layoutEngine, WORKSPACE_PRESETS } from './services/layoutEngine.ts';
import { resolveSectionDrop } from './utils/layoutMath.ts';
import { JELLYWISP_COVER_PLACEHOLDER, isPlaceholderArt } from './utils/jellywispArtwork.ts';
import { computeArtistStatsMap } from './utils/libraryHelpers.ts';

const PLAYER_STATE_KEY = 'jellywisp_player_state_v1';

interface SavedPlayerState {
  currentView?: NavView;
  volume?: number;
  isShuffle?: boolean;
  repeatMode?: 'off' | 'all' | 'one';
  currentTrackId?: string;
}

function loadSavedPlayerState(): SavedPlayerState {
  try {
    const raw = localStorage.getItem(PLAYER_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

export default function App() {
  const savedPlayerState = useMemo(() => loadSavedPlayerState(), []);

  // Navigation & UI state
  const [currentView, setCurrentView] = useState<NavView>(() => {
    return savedPlayerState.currentView || layoutEngine.getConfig().defaultStartupView || 'home';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [initialSelectedAlbum, setInitialSelectedAlbum] = useState<{
    title: string;
    id?: string;
  } | null>(null);
  const [initialSelectedArtistName, setInitialSelectedArtistName] = useState<string | null>(null);

  // Playback tracking refs for real Jellyfin sessions & Last.fm scrobbling
  const lastReportedProgressRef = useRef<{ trackId: string; time: number } | null>(null);
  const hasScrobbledCurrentRef = useRef<string | null>(null);

  // Interactive Drag & Drop Layout state
  const [isLayoutEditMode, setIsLayoutEditMode] = useState(false);
  const [draggedSection, setDraggedSection] = useState<DraggableSectionId | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<
    'top' | 'bottom' | 'left' | 'right' | 'floating' | null
  >(null);

  // Library state
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [queue, setQueue] = useState<Track[]>([]);

  // Server state
  const [serverConfig, setServerConfig] = useState<JellyfinServerConfig>(() =>
    jellyfin.getConfig()
  );

  // Playback state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState<boolean>(() => Boolean(savedPlayerState.isShuffle));
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>(
    () => savedPlayerState.repeatMode || 'off'
  );
  const [volume, setVolume] = useState<number>(() =>
    typeof savedPlayerState.volume === 'number' ? savedPlayerState.volume : 0.85
  );
  const [isMuted, setIsMuted] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  // Theme, Layout, Hotkeys & DSP state
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(() =>
    layoutEngine.getConfig()
  );
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(() => themeEngine.getTheme());
  const [dspSettings, setDspSettings] = useState<DspSettings>(() =>
    audioEngine.getDspSettings()
  );
  const [hotkeyBindings, setHotkeyBindings] = useState<HotkeyBinding[]>(() =>
    hotkeyService.getBindings()
  );

  // Modals, Context Menu & Panels
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDedicatedPlayerOpen, setIsDedicatedPlayerOpen] = useState(false);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [isDspModalOpen, setIsDspModalOpen] = useState(false);
  const [isSpecsModalOpen, setIsSpecsModalOpen] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [isCoverArtFinderOpen, setIsCoverArtFinderOpen] = useState(false);
  const [coverArtSearchState, setCoverArtSearchState] = useState<{
    query: string;
    mode: 'album' | 'artist' | 'all';
    label?: string;
    targetTrack?: Track;
    targetArtistName?: string;
    targetAlbumId?: string;
    targetAlbumTitle?: string;
  } | null>(null);
  const [contextMenuState, setContextMenuState] = useState<{
    track: Track;
    position: { x: number; y: number };
  } | null>(null);
  const [albumContextMenuState, setAlbumContextMenuState] = useState<{
    album: Album;
    position: { x: number; y: number };
  } | null>(null);
  const [artistContextMenuState, setArtistContextMenuState] = useState<{
    artist: Artist;
    position: { x: number; y: number };
  } | null>(null);

  const [isSyncingLibrary, setIsSyncingLibrary] = useState(false);
  const [librarySyncError, setLibrarySyncError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<LibrarySyncProgress | null>(null);

  // Server-side search results for instant search while 80,000+ tracks are indexing
  const [serverSearchResults, setServerSearchResults] = useState<{
    tracks: Track[];
    albums: Album[];
    artists: Artist[];
  } | null>(null);

  // Fetch music data from active Jellyfin server or Demo library (with instant local cache hydration + progressive 80k+ streaming)
  const loadLibrary = useCallback(async () => {
    const activeCfg = jellyfin.reloadFromStorage();
    setServerConfig(activeCfg);
    setIsSyncingLibrary(true);
    setLibrarySyncError(null);

    const serverKey = buildServerCacheKey(
      activeCfg.url,
      activeCfg.userId,
      activeCfg.selectedLibraryId
    );

    let hydratedFromCache = false;
    if (!activeCfg.isDemoMode && activeCfg.url && activeCfg.userId) {
      const cached = await loadCachedLibrarySnapshot(serverKey);
      if (cached && cached.tracks.length > 0) {
        hydratedFromCache = true;
        const overriddenCache = applyLocalLibraryOverrides(
          cached.tracks,
          cached.albums,
          cached.artists
        );
        setTracks(overriddenCache.tracks);
        setAlbums(overriddenCache.albums);
        setArtists(overriddenCache.artists);
        if (cached.syncProgress) {
          setSyncProgress(cached.syncProgress);
        }
        setQueue(overriddenCache.tracks.slice(0, 250));
        setCurrentTrack((prev) => {
          if (prev) return prev;
          const savedId = loadSavedPlayerState().currentTrackId;
          const restored = savedId
            ? overriddenCache.tracks.find((t) => t.id === savedId)
            : null;
          const initial = restored || overriddenCache.tracks[0] || null;
          audioEngine.setInitialTrack(initial);
          return initial;
        });
      }
    }

    const data = await jellyfin.fetchMusicData((partial, prog) => {
      setTracks(partial.tracks);
      setAlbums(partial.albums);
      setArtists(partial.artists);
      setSyncProgress(prog);
      if (!activeCfg.isDemoMode) {
        saveCachedLibrarySnapshot({
          serverKey,
          tracks: partial.tracks,
          albums: partial.albums,
          artists: partial.artists,
          syncProgress: prog,
          updatedAt: Date.now(),
        });
      }
    });

    setIsSyncingLibrary(false);
    setServerConfig(jellyfin.getConfig());

    if (data.authExpired) {
      setIsServerModalOpen(true);
    }

    if (data.error) {
      setLibrarySyncError(data.error);
      // If we already hydrated from local cache, keep the cached library available while offline/reconnecting
      if (hydratedFromCache && data.tracks.length === 0) {
        return;
      }
    }

    if (data.progress) {
      setSyncProgress(data.progress);
    }

    if (!activeCfg.isDemoMode && data.tracks.length > 0) {
      saveCachedLibrarySnapshot({
        serverKey,
        tracks: data.tracks,
        albums: data.albums,
        artists: data.artists,
        syncProgress: data.progress,
        updatedAt: Date.now(),
      });
    }

    setTracks(data.tracks);
    setAlbums(data.albums);
    setArtists(data.artists);
    setQueue(data.tracks.slice(0, 250));
    setCurrentTrack((prev) => {
      if (data.tracks.length === 0) {
        audioEngine.setInitialTrack(null);
        return null;
      }
      if (prev && data.tracks.some((t) => t.id === prev.id)) {
        return prev;
      }
      const savedId = loadSavedPlayerState().currentTrackId;
      const restored = savedId ? data.tracks.find((t) => t.id === savedId) : null;
      const initial = restored || data.tracks[0];
      audioEngine.setInitialTrack(initial);
      return initial;
    });
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Persist player & view state so closing and reopening restores everything
  useEffect(() => {
    try {
      const stateToSave: SavedPlayerState = {
        currentView,
        volume,
        isShuffle,
        repeatMode,
        currentTrackId: currentTrack?.id,
      };
      localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(stateToSave));
    } catch {
      // ignore
    }
  }, [currentView, volume, isShuffle, repeatMode, currentTrack?.id]);

  // Audio Engine Listeners & Jellyfin Server Playback Reporting
  useEffect(() => {
    audioEngine.onTimeUpdate((curr, dur) => {
      setCurrentTime(curr);
      setDuration(dur);

      if (currentTrack) {
        // Throttled progress report every 8 seconds
        const lastTime = lastReportedProgressRef.current?.trackId === currentTrack.id
          ? lastReportedProgressRef.current.time
          : -999;
        if (Math.abs(curr - lastTime) >= 8) {
          jellyfin.reportPlaybackProgress(currentTrack, curr, !isPlaying);
          lastReportedProgressRef.current = { trackId: currentTrack.id, time: curr };
        }

        // Scrobble track when reached 80% duration (or 30s)
        if (dur > 15 && curr >= dur * 0.8 && hasScrobbledCurrentRef.current !== currentTrack.id) {
          hasScrobbledCurrentRef.current = currentTrack.id;
          jellyfin.markTrackPlayed(currentTrack.id);
          setTracks((prev) =>
            prev.map((t) => (t.id === currentTrack.id ? { ...t, playCount: (t.playCount || 0) + 1 } : t))
          );
          setCurrentTrack((prev) =>
            prev && prev.id === currentTrack.id ? { ...prev, playCount: (prev.playCount || 0) + 1 } : prev
          );
        }
      }
    });

    audioEngine.onPlayStateChange((playing) => {
      setIsPlaying(playing);
      if (currentTrack) {
        jellyfin.reportPlaybackProgress(currentTrack, currentTime, !playing);
      }
    });

    audioEngine.onMetrics((m) => {
      setMetrics(m);
    });

    audioEngine.onTrackEnded(() => {
      if (currentTrack) {
        if (hasScrobbledCurrentRef.current !== currentTrack.id) {
          hasScrobbledCurrentRef.current = currentTrack.id;
          jellyfin.markTrackPlayed(currentTrack.id);
          setTracks((prev) =>
            prev.map((t) => (t.id === currentTrack.id ? { ...t, playCount: (t.playCount || 0) + 1 } : t))
          );
          setCurrentTrack((prev) =>
            prev && prev.id === currentTrack.id ? { ...prev, playCount: (prev.playCount || 0) + 1 } : prev
          );
        }
        jellyfin.reportPlaybackStopped(currentTrack, duration);
      }
      handleNextTrack();
    });
  }, [queue, currentTrack, repeatMode, isShuffle, isPlaying, currentTime, duration]);

  // Playback actions (windows queue around selected track for 80,000+ track performance)
  const handlePlayTrack = useCallback(
    (track: Track, contextTracks?: Track[], indexInContext?: number) => {
      if (currentTrack && currentTrack.id !== track.id) {
        jellyfin.reportPlaybackStopped(currentTrack, currentTime);
      }

      setCurrentTrack(track);
      audioEngine.playTrack(track);

      // Report playback start to Jellyfin server (for Last.fm scrobblers and server active sessions)
      jellyfin.reportPlaybackStart(track);
      hasScrobbledCurrentRef.current = null;
      lastReportedProgressRef.current = { trackId: track.id, time: 0 };

      if (contextTracks && contextTracks.length > 0) {
        const startIdx =
          indexInContext !== undefined
            ? indexInContext
            : Math.max(
                0,
                contextTracks.findIndex((t) => t.id === track.id)
              );
        const windowedQueue = contextTracks.slice(startIdx, startIdx + 250);
        if (windowedQueue.length > 0) {
          setQueue(windowedQueue);
        }
      }
    },
    [currentTrack, currentTime]
  );

  const handleTogglePlay = useCallback(() => {
    if (!currentTrack && tracks.length > 0) {
      handlePlayTrack(tracks[0], tracks, 0);
      return;
    }
    audioEngine.togglePlay();
  }, [currentTrack, tracks, handlePlayTrack]);

  const handleNextTrack = useCallback(() => {
    if (queue.length === 0) return;
    if (repeatMode === 'one' && currentTrack) {
      audioEngine.seek(0);
      audioEngine.playTrack(currentTrack);
      return;
    }

    if (isShuffle) {
      const nextIdx = Math.floor(Math.random() * queue.length);
      handlePlayTrack(queue[nextIdx]);
      return;
    }

    const currentIdx = queue.findIndex((t) => t.id === currentTrack?.id);
    if (currentIdx !== -1 && currentIdx < queue.length - 1) {
      handlePlayTrack(queue[currentIdx + 1]);
    } else if (repeatMode === 'all') {
      handlePlayTrack(queue[0]);
    }
  }, [queue, currentTrack, repeatMode, isShuffle, handlePlayTrack]);

  const handlePrevTrack = useCallback(() => {
    if (queue.length === 0) return;
    if (currentTime > 3) {
      audioEngine.seek(0);
      return;
    }
    const currentIdx = queue.findIndex((t) => t.id === currentTrack?.id);
    if (currentIdx > 0) {
      handlePlayTrack(queue[currentIdx - 1]);
    } else {
      handlePlayTrack(queue[queue.length - 1]);
    }
  }, [queue, currentTrack, currentTime, handlePlayTrack]);

  const handleSeek = (seconds: number) => {
    audioEngine.seek(seconds);
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    audioEngine.setVolume(vol);
    setIsMuted(false);
  };

  const handleToggleMute = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const handleToggleRepeat = () => {
    const next = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    setRepeatMode(next);
  };

  const handlePlayAlbum = (album: Album) => {
    const albumTracks =
      album.tracks && album.tracks.length > 0
        ? album.tracks
        : tracks.filter(
            (t) =>
              t.albumId === album.id ||
              t.album.toLowerCase() === album.title.toLowerCase()
          );
    if (albumTracks.length > 0) {
      setQueue(albumTracks);
      handlePlayTrack(albumTracks[0], albumTracks, 0);
    }
  };

  const handlePlayNextAlbum = (album: Album) => {
    const albumTracks =
      album.tracks && album.tracks.length > 0
        ? album.tracks
        : tracks.filter(
            (t) =>
              t.albumId === album.id ||
              t.album.toLowerCase() === album.title.toLowerCase()
          );
    if (albumTracks.length > 0) {
      setQueue((prev) => {
        if (prev.length === 0) return albumTracks;
        const currentIdx = prev.findIndex((t) => t.id === currentTrack?.id);
        if (currentIdx === -1) {
          return [...albumTracks, ...prev];
        }
        const next = [...prev];
        next.splice(currentIdx + 1, 0, ...albumTracks);
        return next;
      });
    }
  };

  const handlePlayQueueList = (newQueue: Track[]) => {
    if (newQueue.length > 0) {
      setQueue(newQueue);
      handlePlayTrack(newQueue[0], newQueue, 0);
    }
  };

  const handleAddToQueue = (track: Track) => {
    setQueue((prev) => [...prev, track]);
  };

  const handlePlayNext = (track: Track) => {
    setQueue((prev) => {
      if (prev.length === 0) return [track];
      const currentIdx = prev.findIndex((t) => t.id === currentTrack?.id);
      if (currentIdx === -1) {
        return [track, ...prev];
      }
      const next = [...prev];
      next.splice(currentIdx + 1, 0, track);
      return next;
    });
  };

  const handleToggleFavorite = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const nextFav = !t.isFavorite;
          saveTrackFavoriteOverride(trackId, nextFav);
          return { ...t, isFavorite: nextFav };
        }
        return t;
      })
    );
    setCurrentTrack((prev) =>
      prev && prev.id === trackId ? { ...prev, isFavorite: !prev.isFavorite } : prev
    );
  };

  const handleUpdateTrack = (updated: Track) => {
    saveTrackMetadataOverride(updated.id, {
      title: updated.title,
      artist: updated.artist,
      albumArtist: updated.albumArtist,
      album: updated.album,
      genre: updated.genre,
      year: updated.year,
      bpm: updated.bpm,
      coverUrl: updated.coverUrl,
      lyrics: updated.lyrics,
    });
    setTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setAlbums((prev) =>
      prev.map((alb) => ({
        ...alb,
        tracks: alb.tracks.map((t) => (t.id === updated.id ? updated : t)),
        coverUrl: alb.tracks.some((t) => t.id === updated.id) ? updated.coverUrl : alb.coverUrl,
      }))
    );
    if (currentTrack?.id === updated.id) {
      setCurrentTrack(updated);
    }
  };

  const handleReclassifyAlbum = useCallback((albumId: string, releaseType: AlbumReleaseType, title?: string, artist?: string) => {
    saveAlbumReleaseTypeOverride(albumId, releaseType, title, artist);
    setAlbums((prev) =>
      prev.map((alb) =>
        alb.id === albumId || (title && alb.title.toLowerCase() === title.toLowerCase())
          ? { ...alb, releaseType }
          : alb
      )
    );
  }, []);

  const handleOpenAlbumContextMenu = useCallback((e: React.MouseEvent, album: Album) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setContextMenuState(null);
    setArtistContextMenuState(null);
    setAlbumContextMenuState({
      album,
      position: { x: e?.clientX ?? 200, y: e?.clientY ?? 200 },
    });
  }, []);

  // Navigation QoL Handlers (Home, Album, Artist, Album Artist, Genre, Decade)
  const handleGoHome = useCallback(() => {
    setInitialSelectedAlbum(null);
    setInitialSelectedArtistName(null);
    setSearchQuery('');
    setCurrentView('home');
  }, []);

  const handleNavigateToAlbum = useCallback((albumTitle: string, albumId?: string) => {
    setIsDedicatedPlayerOpen(false);
    setInitialSelectedAlbum({ title: albumTitle, id: albumId });
    setCurrentView('albums');
  }, []);

  const handleNavigateToArtist = useCallback((artistName: string) => {
    setIsDedicatedPlayerOpen(false);
    setInitialSelectedArtistName(artistName);
    setCurrentView('artists');
  }, []);

  const handleNavigateToAlbumArtist = useCallback((albumArtistName: string) => {
    setIsDedicatedPlayerOpen(false);
    setInitialSelectedArtistName(albumArtistName);
    setCurrentView('album-artists');
  }, []);

  const handleNavigateToGenre = useCallback((_genre: string) => {
    setIsDedicatedPlayerOpen(false);
    setCurrentView('genres');
  }, []);

  const handleNavigateToDecade = useCallback((_decade: string) => {
    setIsDedicatedPlayerOpen(false);
    setCurrentView('decades');
  }, []);

  const handleOpenTrackContextMenu = useCallback((e: React.MouseEvent, track: Track) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setAlbumContextMenuState(null);
    setArtistContextMenuState(null);
    setContextMenuState({
      track,
      position: { x: e?.clientX ?? 200, y: e?.clientY ?? 200 },
    });
  }, []);

  const artistStatsMap = useMemo(
    () => computeArtistStatsMap(artists, albums, tracks),
    [artists, albums, tracks]
  );

  const handleOpenArtistContextMenu = useCallback(
    (e: React.MouseEvent, artistOrName: Artist | string) => {
      if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      setContextMenuState(null);
      setAlbumContextMenuState(null);

      const rawName = typeof artistOrName === 'string' ? artistOrName : artistOrName.name;
      const lower = (rawName || '').trim().toLowerCase();
      const matched =
        typeof artistOrName === 'object'
          ? artistOrName
          : artists.find((a) => a.name.trim().toLowerCase() === lower);
      const st = artistStatsMap.get(lower);

      const resolvedArtist: Artist = {
        id: matched?.id || `art-${lower}`,
        name: matched?.name || rawName || 'Unknown Artist',
        bio: matched?.bio || '',
        coverUrl:
          (matched && !isPlaceholderArt(matched.coverUrl) ? matched.coverUrl : st?.coverUrl) ||
          JELLYWISP_COVER_PLACEHOLDER,
        albums: st?.albums?.length ? st.albums : matched?.albums || [],
        trackCount: st?.trackCount ?? matched?.trackCount ?? 0,
        genres: matched?.genres || [],
      };

      setArtistContextMenuState({
        artist: resolvedArtist,
        position: { x: e?.clientX ?? 200, y: e?.clientY ?? 200 },
      });
    },
    [artists, artistStatsMap]
  );

  const handleUpdateDsp = (settings: Partial<DspSettings>) => {
    audioEngine.updateDspSettings(settings);
    setDspSettings(audioEngine.getDspSettings());
  };

  const handleUpdateTheme = (themeUpdate: Partial<ThemeConfig>) => {
    themeEngine.updateTheme(themeUpdate);
    setCurrentTheme(themeEngine.getTheme());
  };

  const handleSelectPresetTheme = (presetId: string) => {
    themeEngine.selectPreset(presetId);
    setCurrentTheme(themeEngine.getTheme());
  };

  const handleUpdateHotkey = (id: string, keyCombo: string) => {
    hotkeyService.updateBinding(id, keyCombo);
    setHotkeyBindings(hotkeyService.getBindings());
  };

  const handleResetHotkeys = () => {
    hotkeyService.resetDefaults();
    setHotkeyBindings(hotkeyService.getBindings());
  };

  // Register Global Hotkeys
  useEffect(() => {
    hotkeyService.registerAction('toggle_play', handleTogglePlay);
    hotkeyService.registerAction('next_track', handleNextTrack);
    hotkeyService.registerAction('prev_track', handlePrevTrack);
    hotkeyService.registerAction('seek_forward_5', () => audioEngine.seekRelative(5));
    hotkeyService.registerAction('seek_backward_5', () => audioEngine.seekRelative(-5));
    hotkeyService.registerAction('volume_up', () => {
      const v = Math.min(1, audioEngine.getVolume() + 0.05);
      handleVolumeChange(v);
    });
    hotkeyService.registerAction('volume_down', () => {
      const v = Math.max(0, audioEngine.getVolume() - 0.05);
      handleVolumeChange(v);
    });
    hotkeyService.registerAction('toggle_mute', handleToggleMute);
    hotkeyService.registerAction('toggle_shuffle', handleToggleShuffle);
    hotkeyService.registerAction('toggle_repeat', handleToggleRepeat);
    hotkeyService.registerAction('toggle_eq', () => setIsDspModalOpen((v) => !v));
    hotkeyService.registerAction('toggle_lyrics', () => setIsLyricsOpen((v) => !v));
    hotkeyService.registerAction('toggle_visualizer', () => setIsVisualizerOpen((v) => !v));
    hotkeyService.registerAction('toggle_mini_player', () => setIsMiniPlayerOpen((v) => !v));
    hotkeyService.registerAction('focus_search', () => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      input?.focus();
    });
    hotkeyService.registerAction('open_metadata_editor', () => {
      if (currentTrack) setEditingTrack(currentTrack);
    });

    return () => {
      [
        'toggle_play',
        'next_track',
        'prev_track',
        'seek_forward_5',
        'seek_backward_5',
        'volume_up',
        'volume_down',
        'toggle_mute',
        'toggle_shuffle',
        'toggle_repeat',
        'toggle_eq',
        'toggle_lyrics',
        'toggle_visualizer',
        'toggle_mini_player',
        'focus_search',
        'open_metadata_editor',
      ].forEach((id) => hotkeyService.unregisterAction(id));
    };
  }, [
    handleTogglePlay,
    handleNextTrack,
    handlePrevTrack,
    currentTrack,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
  ]);

  // Debounced server-side search when querying an 80,000+ track library
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || serverConfig.isDemoMode || syncProgress?.isComplete) {
      setServerSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await jellyfin.searchServer(q);
      setServerSearchResults(res);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery, serverConfig.isDemoMode, syncProgress?.isComplete]);

  // Derive Album Artists collection from albums & tracks with full artist & album artwork support
  const albumArtists = useMemo<Artist[]>(() => {
    const artistByName = new Map<string, Artist>();
    for (const a of artists) {
      artistByName.set(a.name.trim().toLowerCase(), a);
    }

    const map = new Map<
      string,
      {
        id: string;
        name: string;
        coverUrl: string;
        bio: string;
        genres: Set<string>;
        albumMap: Map<string, Album>;
        trackCount: number;
      }
    >();

    for (const alb of albums) {
      const name = (alb.artist || 'Unknown Album Artist').trim();
      const key = name.toLowerCase();
      const matchedArtist = artistByName.get(key);
      const existing = map.get(key);

      if (existing) {
        existing.albumMap.set(alb.id, alb);
        if (alb.genre && alb.genre !== 'Music') existing.genres.add(alb.genre);
        if (isPlaceholderArt(existing.coverUrl) && !isPlaceholderArt(alb.coverUrl)) {
          existing.coverUrl = alb.coverUrl;
        }
      } else {
        const artistPortrait =
          matchedArtist && !isPlaceholderArt(matchedArtist.coverUrl)
            ? matchedArtist.coverUrl
            : !isPlaceholderArt(alb.coverUrl)
            ? alb.coverUrl
            : jellyfin.getArtistImageUrlByName(name);

        const albumMap = new Map<string, Album>();
        albumMap.set(alb.id, alb);

        map.set(key, {
          id: matchedArtist?.id || `aa-${key}`,
          name,
          coverUrl: artistPortrait || JELLYWISP_COVER_PLACEHOLDER,
          bio: matchedArtist?.bio || '',
          genres: new Set(
            [
              ...(alb.genre && alb.genre !== 'Music' ? [alb.genre] : []),
              ...(matchedArtist?.genres || []),
            ].filter(Boolean)
          ),
          albumMap,
          trackCount: alb.tracks?.length || 0,
        });
      }
    }

    for (const t of tracks) {
      const name = (t.albumArtist || t.artist || 'Unknown Album Artist').trim();
      const key = name.toLowerCase();
      const matchedArtist = artistByName.get(key);
      const existing = map.get(key);

      if (existing) {
        existing.trackCount += 1;
        if (t.genre && t.genre !== 'Music') existing.genres.add(t.genre);
        if (isPlaceholderArt(existing.coverUrl) && !isPlaceholderArt(t.coverUrl)) {
          existing.coverUrl = t.coverUrl;
        }
      } else {
        const artistPortrait =
          matchedArtist && !isPlaceholderArt(matchedArtist.coverUrl)
            ? matchedArtist.coverUrl
            : !isPlaceholderArt(t.coverUrl)
            ? t.coverUrl
            : jellyfin.getArtistImageUrlByName(name);

        map.set(key, {
          id: matchedArtist?.id || `aa-${key}`,
          name,
          coverUrl: artistPortrait || JELLYWISP_COVER_PLACEHOLDER,
          bio: matchedArtist?.bio || '',
          genres: new Set(t.genre && t.genre !== 'Music' ? [t.genre] : []),
          albumMap: new Map(),
          trackCount: 1,
        });
      }
    }

    return Array.from(map.values()).map((item) => {
      const artistAlbums = Array.from(item.albumMap.values());
      return {
        id: item.id,
        name: item.name,
        bio:
          item.bio ||
          `Album Artist with ${artistAlbums.length} release(s) and ${item.trackCount} track(s) in your library.`,
        coverUrl: item.coverUrl,
        albums: artistAlbums,
        trackCount: item.trackCount,
        genres: Array.from(item.genres).slice(0, 4),
      };
    });
  }, [albums, tracks, artists]);

  const filteredAlbums = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return albums;

    const seen = new Set<string>();
    const local: Album[] = [];

    for (const a of albums) {
      if (
        a.title.toLowerCase().includes(q) ||
        a.artist.toLowerCase().includes(q) ||
        (a.genre || '').toLowerCase().includes(q)
      ) {
        seen.add(a.id);
        local.push(a);
      }
    }

    if (serverSearchResults?.albums?.length) {
      for (const sa of serverSearchResults.albums) {
        if (!seen.has(sa.id)) {
          local.push(sa);
          seen.add(sa.id);
        }
      }
    }

    // Also synthesize any matching albums referenced directly on tracks
    for (const t of tracks) {
      if (t.album && (t.album.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))) {
        const alreadyHasTitle = local.some(
          (a) => a.title.trim().toLowerCase() === t.album.trim().toLowerCase()
        );
        if (!alreadyHasTitle) {
          const albId = t.albumId || `alb-${t.id}`;
          seen.add(albId);
          local.push({
            id: albId,
            title: t.album,
            artist: t.albumArtist || t.artist,
            year: t.year,
            genre: t.genre,
            coverUrl: t.coverUrl,
            tracks: [t],
            trackCount: 1,
            totalDuration: t.duration,
            isHiRes: true,
            hiresBadge: t.codec,
          });
        }
      }
    }

    return local;
  }, [albums, tracks, searchQuery, serverSearchResults]);

  // Memoized filtering so playback timeupdate never re-filters 80,000 tracks
  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tracks;

    const local = tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.albumArtist || '').toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q)
    );

    const seen = new Set(local.map((t) => t.id));

    if (serverSearchResults?.tracks?.length) {
      for (const st of serverSearchResults.tracks) {
        if (!seen.has(st.id)) {
          local.push(st);
          seen.add(st.id);
        }
      }
    }

    // Also include embedded tracks from any matching albums
    for (const alb of filteredAlbums) {
      for (const at of alb.tracks || []) {
        if (!seen.has(at.id)) {
          local.push(at);
          seen.add(at.id);
        }
      }
    }

    return local;
  }, [tracks, filteredAlbums, searchQuery, serverSearchResults]);

  const favoriteTracks = useMemo(
    () => filteredTracks.filter((t) => t.isFavorite),
    [filteredTracks]
  );

  const filteredArtists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return artists;

    const local = artists.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.genres || []).some((g) => g.toLowerCase().includes(q))
    );

    if (serverSearchResults?.artists?.length) {
      const seen = new Set(local.map((a) => a.id));
      for (const sar of serverSearchResults.artists) {
        if (!seen.has(sar.id)) {
          local.push(sar);
          seen.add(sar.id);
        }
      }
    }
    return local;
  }, [artists, searchQuery, serverSearchResults]);

  const filteredAlbumArtists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return albumArtists;
    return albumArtists.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.genres || []).some((g) => g.toLowerCase().includes(q))
    );
  }, [albumArtists, searchQuery]);

  // Merged library collections for the Global Search Dropdown (includes live server search results)
  const globalSearchAlbums = useMemo(() => {
    if (!serverSearchResults?.albums?.length) return albums;
    const seen = new Set(albums.map((a) => a.id));
    return [...albums, ...serverSearchResults.albums.filter((a) => !seen.has(a.id))];
  }, [albums, serverSearchResults]);

  const globalSearchArtists = useMemo(() => {
    if (!serverSearchResults?.artists?.length) return artists;
    const seen = new Set(artists.map((a) => a.id));
    return [...artists, ...serverSearchResults.artists.filter((a) => !seen.has(a.id))];
  }, [artists, serverSearchResults]);

  const globalSearchTracks = useMemo(() => {
    if (!serverSearchResults?.tracks?.length) return tracks;
    const seen = new Set(tracks.map((t) => t.id));
    return [...tracks, ...serverSearchResults.tracks.filter((t) => !seen.has(t.id))];
  }, [tracks, serverSearchResults]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenuState(null);
        setAlbumContextMenuState(null);
        setArtistContextMenuState(null);
        setIsDedicatedPlayerOpen(false);
        setIsSettingsModalOpen(false);
        setIsVisualizerOpen(false);
        setIsDspModalOpen(false);
        setIsSpecsModalOpen(false);
        setIsServerModalOpen(false);
        setIsCoverArtFinderOpen(false);
        setEditingTrack(null);
        setIsLyricsOpen(false);
        setIsQueueOpen(false);
        setIsMiniPlayerOpen(false);
        setIsLayoutEditMode(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleUpdateLayout = (partial: Partial<LayoutConfig>) => {
    layoutEngine.updateConfig(partial);
    setLayoutConfig(layoutEngine.getConfig());
  };

  const handleResetLayout = () => {
    layoutEngine.resetDefaults();
    setLayoutConfig(layoutEngine.getConfig());
  };

  const handleToggleSidebarItem = (key: keyof VisibleSidebarItems) => {
    const current = layoutConfig.visibleSidebarItems || ({} as VisibleSidebarItems);
    handleUpdateLayout({
      visibleSidebarItems: {
        ...current,
        [key]: current[key] === false ? true : false,
      },
    });
  };

  const handleSelectNavView = (view: NavView) => {
    if (view === 'dsp') {
      setIsDspModalOpen(true);
    } else if (view === 'specs') {
      setIsSpecsModalOpen(true);
    } else if (view === 'jellyfin-config') {
      setIsServerModalOpen(true);
    } else {
      if (view === 'art-search') {
        setCoverArtSearchState(null);
      }
      setInitialSelectedAlbum(null);
      setInitialSelectedArtistName(null);
      setCurrentView(view);
    }
  };

  // Handle Drag-and-Drop onto a Target Zone
  const handleDropOnZone = (
    zone: 'top' | 'bottom' | 'left' | 'right' | 'floating',
    e: React.DragEvent
  ) => {
    e.preventDefault();
    const rawSection = (e.dataTransfer.getData('text/plain') ||
      draggedSection) as DraggableSectionId | null;
    if (rawSection) {
      const update = resolveSectionDrop(rawSection, zone);
      handleUpdateLayout(update);
    }
    setDraggedSection(null);
    setActiveDropZone(null);
  };

  const renderPlayerBar = () => (
    <PlayerBar
      currentTrack={currentTrack}
      isPlaying={isPlaying}
      currentTime={currentTime}
      duration={duration}
      isShuffle={isShuffle}
      repeatMode={repeatMode}
      volume={volume}
      isMuted={isMuted}
      lyricsOpen={isLyricsOpen}
      queueOpen={isQueueOpen}
      onTogglePlay={handleTogglePlay}
      onPrev={handlePrevTrack}
      onNext={handleNextTrack}
      onSeek={handleSeek}
      onToggleShuffle={handleToggleShuffle}
      onToggleRepeat={handleToggleRepeat}
      onVolumeChange={handleVolumeChange}
      onToggleMute={handleToggleMute}
      onToggleLyrics={() => setIsLyricsOpen((v) => !v)}
      onToggleQueue={() => setIsQueueOpen((v) => !v)}
      onToggleDsp={() => setIsDspModalOpen(true)}
      onToggleVisualizer={() => setIsVisualizerOpen(true)}
      onToggleMiniPlayer={() => setIsMiniPlayerOpen((v) => !v)}
      onOpenMetadataEditor={(t) => setEditingTrack(t)}
      onOpenDedicatedPlayer={() => setIsDedicatedPlayerOpen(true)}
      onNavigateToArtist={handleNavigateToArtist}
      onContextMenuArtist={handleOpenArtistContextMenu}
      onContextMenuTrack={handleOpenTrackContextMenu}
      layoutConfig={layoutConfig}
      onUpdateLayout={handleUpdateLayout}
      onChangePosition={(pos) => handleUpdateLayout({ playerBarPosition: pos })}
      onDragStartSection={(sec) => setDraggedSection(sec)}
      onDragEndSection={() => {
        setDraggedSection(null);
        setActiveDropZone(null);
      }}
      isLayoutEditMode={isLayoutEditMode}
    />
  );

  const renderSidebar = () => (
    <Sidebar
      currentView={currentView}
      onSelectView={handleSelectNavView}
      trackCount={syncProgress?.totalTracks || tracks.length}
      albumCount={syncProgress?.totalAlbums || albums.length}
      artistCount={syncProgress?.totalArtists || artists.length}
      albumArtistCount={albumArtists.length}
      currentTrack={currentTrack}
      onOpenMetadataEditor={(t) => setEditingTrack(t)}
      onOpenDedicatedPlayer={() => setIsDedicatedPlayerOpen(true)}
      onNavigateToArtist={handleNavigateToArtist}
      onContextMenuArtist={handleOpenArtistContextMenu}
      sidebarWidth={layoutConfig.sidebarWidth}
      topTabsHeightPx={layoutConfig.topTabsHeightPx}
      navItemScale={layoutConfig.navItemScale}
      position={layoutConfig.sidebarPosition}
      uppercaseHeaders={layoutConfig.uppercaseHeaders}
      visibleSidebarItems={layoutConfig.visibleSidebarItems}
      onToggleSidebarItem={handleToggleSidebarItem}
      onResizeSidebarWidth={(w) => handleUpdateLayout({ sidebarWidth: w })}
      onResizeTopTabsHeight={(h) => handleUpdateLayout({ topTabsHeightPx: h })}
      onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      onMoveNavPosition={(pos) => handleUpdateLayout({ sidebarPosition: pos })}
      onDragStartSection={(sec) => setDraggedSection(sec)}
      onDragEndSection={() => {
        setDraggedSection(null);
        setActiveDropZone(null);
      }}
      isLayoutEditMode={isLayoutEditMode}
    />
  );

  const isPlayerSidebar =
    layoutConfig.playerBarPosition === 'left' || layoutConfig.playerBarPosition === 'right';
  const showDropZones = Boolean(draggedSection) || isLayoutEditMode;

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden select-none bg-[var(--fin-bg)] text-slate-100 font-sans relative"
      style={{
        backgroundColor: currentTheme.bgColor,
        letterSpacing: 'var(--jw-letter-spacing, 0em)',
      }}
    >
      {/* Dynamic Ambient Album Art Bleed / Shader Backdrop */}
      {layoutConfig.ambientEffect !== 'none' && (
        <div
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden transition-opacity duration-700"
          style={{ opacity: (layoutConfig.ambientIntensity ?? 45) / 100 }}
        >
          {layoutConfig.ambientEffect === 'album-bleed' && currentTrack?.coverUrl && (
            <img
              src={currentTrack.coverUrl}
              alt=""
              className="w-full h-full object-cover blur-[110px] scale-125 opacity-35 saturate-150"
            />
          )}
          {layoutConfig.ambientEffect === 'aurora' && (
            <div className="w-full h-full bg-gradient-to-tr from-cyan-500/20 via-indigo-600/15 to-fuchsia-600/20 blur-3xl" />
          )}
          {layoutConfig.ambientEffect === 'vignette' && (
            <div className="w-full h-full bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.85)_100%)]" />
          )}
        </div>
      )}

      {/* 1. Desktop Window Titlebar */}
      <Titlebar
        serverConfig={serverConfig}
        currentTrack={currentTrack}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        artists={globalSearchArtists}
        albumArtists={albumArtists}
        albums={globalSearchAlbums}
        tracks={globalSearchTracks}
        onNavigateToArtist={handleNavigateToArtist}
        onNavigateToAlbumArtist={handleNavigateToAlbumArtist}
        onNavigateToAlbum={handleNavigateToAlbum}
        onPlayTrack={handlePlayTrack}
        onContextMenuArtist={handleOpenArtistContextMenu}
        onContextMenuAlbum={handleOpenAlbumContextMenu}
        onContextMenuTrack={handleOpenTrackContextMenu}
        onGoHome={handleGoHome}
        onOpenServerModal={() => setIsServerModalOpen(true)}
        onOpenDspModal={() => setIsDspModalOpen(true)}
        onOpenSpecsModal={() => setIsSpecsModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onToggleVisualizer={() => setIsVisualizerOpen(true)}
        layoutConfig={layoutConfig}
        onUpdateLayout={handleUpdateLayout}
        isLayoutEditMode={isLayoutEditMode}
        onToggleLayoutEditMode={() => setIsLayoutEditMode((v) => !v)}
        onDragStartSection={(sec) => setDraggedSection(sec)}
        onDragEndSection={() => {
          setDraggedSection(null);
          setActiveDropZone(null);
        }}
      />

      {/* Interactive Drag-and-Drop Layout Bar (when Edit Layout is active or dragging) */}
      {showDropZones && (
        <div
          data-testid="layout-edit-banner"
          className="bg-gradient-to-r from-cyan-950/95 via-slate-900/95 to-indigo-950/95 border-b border-cyan-400/40 px-4 py-2.5 z-40 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md shadow-xl"
        >
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-extrabold text-[10px] uppercase">
              {draggedSection ? `Dragging: ${draggedSection.toUpperCase()}` : 'Drag & Drop Layout'}
            </span>
            <p className="text-xs text-slate-200 font-medium">
              Drag <strong className="text-cyan-300">Navigation</strong>,{' '}
              <strong className="text-cyan-300">Player</strong>, or{' '}
              <strong className="text-cyan-300">Search Bar</strong> grip handles into any dock zone below, or drag any panel border edge to resize:
            </p>
          </div>

          {/* 1-Click Workspace Architecture Presets in Banner */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {WORKSPACE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleUpdateLayout(preset.config)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[var(--fin-accent)] hover:text-slate-950 text-[11px] font-semibold text-slate-200 border border-white/10 transition"
              >
                {preset.name}
              </button>
            ))}
            <button
              onClick={handleResetLayout}
              className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-mono flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Interactive Drop Target Zones Row */}
          <div className="w-full grid grid-cols-5 gap-2 pt-1">
            {(
              [
                {
                  zone: 'top',
                  label: 'Drop to TOP BAR (Top Tabs / Hero Search)',
                  icon: PanelTop,
                },
                {
                  zone: 'left',
                  label: 'Drop to LEFT SIDEBAR (Left Nav / Left Player)',
                  icon: PanelLeft,
                },
                {
                  zone: 'right',
                  label: 'Drop to RIGHT SIDEBAR (Right Nav / Right Player)',
                  icon: PanelRight,
                },
                {
                  zone: 'bottom',
                  label: 'Drop to BOTTOM DOCK (Bottom Tabs / Bottom Player)',
                  icon: PanelBottom,
                },
                {
                  zone: 'floating',
                  label: 'Drop to FLOATING / COMPACT RAIL',
                  icon: Layers,
                },
              ] as const
            ).map((target) => {
              const Icon = target.icon;
              const isOver = activeDropZone === target.zone;
              return (
                <div
                  key={target.zone}
                  data-testid={`drop-zone-${target.zone}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setActiveDropZone(target.zone);
                  }}
                  onDragLeave={() => setActiveDropZone(null)}
                  onDrop={(e) => handleDropOnZone(target.zone, e)}
                  className={`p-2 rounded-xl border-2 border-dashed flex items-center justify-between gap-2 transition ${
                    isOver
                      ? 'border-amber-400 bg-amber-500/25 text-white scale-[1.01]'
                      : 'border-cyan-400/40 bg-black/40 text-slate-300 hover:border-cyan-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-[10px] font-mono font-bold truncate">
                      {target.zone.toUpperCase()} DOCK
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() =>
                        handleUpdateLayout(resolveSectionDrop('navigation', target.zone))
                      }
                      className="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-400 hover:text-slate-950 text-cyan-300 text-[9px] font-mono font-bold transition"
                      title={`Dock Navigation to ${target.zone}`}
                    >
                      +Nav
                    </button>
                    <button
                      onClick={() =>
                        handleUpdateLayout(resolveSectionDrop('player', target.zone))
                      }
                      className="px-1.5 py-0.5 rounded bg-indigo-500/25 hover:bg-indigo-400 hover:text-slate-950 text-indigo-200 text-[9px] font-mono font-bold transition"
                      title={`Dock Player to ${target.zone}`}
                    >
                      +Player
                    </button>
                    <button
                      onClick={() =>
                        handleUpdateLayout(resolveSectionDrop('search', target.zone))
                      }
                      className="px-1.5 py-0.5 rounded bg-emerald-500/25 hover:bg-emerald-400 hover:text-slate-950 text-emerald-200 text-[9px] font-mono font-bold transition"
                      title={`Dock Search Bar to ${target.zone}`}
                    >
                      +Search
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dedicated Full-Width Giant Hero Search Deck (when searchBarPosition === 'hero-top') */}
      {layoutConfig.searchBarPosition === 'hero-top' && (
        <div
          data-testid="hero-search-deck"
          className="w-full bg-[#090d18]/95 border-b border-cyan-500/20 px-6 py-2.5 z-25 backdrop-blur-md flex items-center justify-center shrink-0 shadow-lg"
        >
          <SearchBarSection
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            artists={globalSearchArtists}
            albumArtists={albumArtists}
            albums={globalSearchAlbums}
            tracks={globalSearchTracks}
            onNavigateToArtist={handleNavigateToArtist}
            onNavigateToAlbumArtist={handleNavigateToAlbumArtist}
            onNavigateToAlbum={handleNavigateToAlbum}
            onPlayTrack={handlePlayTrack}
            onContextMenuArtist={handleOpenArtistContextMenu}
            onContextMenuAlbum={handleOpenAlbumContextMenu}
            onContextMenuTrack={handleOpenTrackContextMenu}
            layoutConfig={layoutConfig}
            onUpdateLayout={handleUpdateLayout}
            onDragStartSection={(sec) => setDraggedSection(sec)}
            onDragEndSection={() => {
              setDraggedSection(null);
              setActiveDropZone(null);
            }}
            isHeroDeck
          />
        </div>
      )}

      {/* Top-Mounted Navigation Tabs (when sidebarPosition === 'top') */}
      {layoutConfig.sidebarPosition === 'top' && renderSidebar()}

      {/* Top-Mounted Player Deck (when playerBarPosition === 'top') */}
      {layoutConfig.playerBarPosition === 'top' && renderPlayerBar()}

      {/* 2. Middle Workspace Container: Left Docks + Main Content + Right Docks */}
      <div
        style={{
          gap: `${layoutConfig.panelGap || 0}px`,
          padding: layoutConfig.panelGap ? `${layoutConfig.panelGap}px` : undefined,
        }}
        className="flex-1 flex flex-row overflow-hidden relative z-10"
      >
        {/* Left-Docked Navigation Sidebar */}
        {(layoutConfig.sidebarPosition === 'left' ||
          layoutConfig.sidebarPosition === 'compact') &&
          renderSidebar()}

        {/* Left-Docked Vertical Sidebar Player Deck */}
        {layoutConfig.playerBarPosition === 'left' && renderPlayerBar()}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-transparent relative">
          {librarySyncError && (
            <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between gap-3 shrink-0">
              <span>Jellyfin Sync Error: {librarySyncError}</span>
              <button
                onClick={() => setIsServerModalOpen(true)}
                className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-white font-semibold border border-rose-400/30 shrink-0"
              >
                Server Settings
              </button>
            </div>
          )}

          {!serverConfig.isDemoMode && !isSyncingLibrary && !librarySyncError && tracks.length === 0 && (
            <div className="mx-6 mt-4 p-4 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-xs text-indigo-200 flex items-center justify-between gap-3 shrink-0">
              <div>
                <p className="font-bold text-white">
                  Connected to {serverConfig.serverName} ({serverConfig.username})
                </p>
                <p className="text-slate-300 mt-0.5">
                  No audio tracks were found in the selected library view. Try selecting a different library or resyncing.
                </p>
              </div>
              <button
                onClick={() => setIsServerModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shrink-0"
              >
                Change Library / Resync
              </button>
            </div>
          )}

          {currentView === 'home' && (
            <HomeView
              tracks={tracks}
              albums={albums}
              artists={artists}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
              onTogglePlay={handleTogglePlay}
              onPrevTrack={handlePrevTrack}
              onNextTrack={handleNextTrack}
              onPlayTrack={handlePlayTrack}
              onPlayAlbum={handlePlayAlbum}
              onPlayQueue={handlePlayQueueList}
              onNavigateView={(view: NavView) => setCurrentView(view)}
              onNavigateToAlbum={handleNavigateToAlbum}
              onNavigateToArtist={handleNavigateToArtist}
              onContextMenuTrack={handleOpenTrackContextMenu}
              onContextMenuAlbum={handleOpenAlbumContextMenu}
              onContextMenuArtist={handleOpenArtistContextMenu}
              serverName={serverConfig.isDemoMode ? 'SoundSphere (Demo Library)' : serverConfig.serverName}
              isConnected={serverConfig.isConnected}
              metrics={metrics}
              layoutConfig={layoutConfig}
            />
          )}

          {currentView === 'tracks' && (
            <TrackListView
              tracks={filteredTracks}
              searchQuery={searchQuery}
              matchedAlbums={filteredAlbums}
              matchedArtists={filteredArtists}
              totalTrackCount={syncProgress?.totalTracks}
              syncProgress={syncProgress}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onAddToQueue={handleAddToQueue}
              onOpenMetadataEditor={(t: Track) => setEditingTrack(t)}
              onToggleFavorite={handleToggleFavorite}
              onContextMenuTrack={handleOpenTrackContextMenu}
              onContextMenuArtist={handleOpenArtistContextMenu}
              onNavigateToAlbum={handleNavigateToAlbum}
              onNavigateToArtist={handleNavigateToArtist}
              onNavigateToAlbumArtist={handleNavigateToAlbumArtist}
              onNavigateToGenre={handleNavigateToGenre}
              onNavigateToDecade={handleNavigateToDecade}
              density={layoutConfig.trackListDensity}
              showTrackBitrate={layoutConfig.showTrackBitrate}
              layoutConfig={layoutConfig}
              onUpdateLayout={handleUpdateLayout}
            />
          )}

          {currentView === 'favorites' && (
            <TrackListView
              tracks={favoriteTracks}
              totalTrackCount={favoriteTracks.length}
              syncProgress={syncProgress}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onAddToQueue={handleAddToQueue}
              onOpenMetadataEditor={(t: Track) => setEditingTrack(t)}
              onToggleFavorite={handleToggleFavorite}
              onContextMenuTrack={handleOpenTrackContextMenu}
              onContextMenuArtist={handleOpenArtistContextMenu}
              onNavigateToAlbum={handleNavigateToAlbum}
              onNavigateToArtist={handleNavigateToArtist}
              onNavigateToAlbumArtist={handleNavigateToAlbumArtist}
              onNavigateToGenre={handleNavigateToGenre}
              onNavigateToDecade={handleNavigateToDecade}
              density={layoutConfig.trackListDensity}
              showTrackBitrate={layoutConfig.showTrackBitrate}
              layoutConfig={layoutConfig}
              onUpdateLayout={handleUpdateLayout}
            />
          )}

          {currentView === 'albums' && (
            <AlbumGridView
              albums={filteredAlbums}
              totalAlbumCount={syncProgress?.totalAlbums}
              allTracks={tracks}
              currentTrack={currentTrack}
              onPlayTrack={handlePlayTrack}
              onPlayAlbum={handlePlayAlbum}
              onOpenMetadataEditor={(t: Track) => setEditingTrack(t)}
              onContextMenuTrack={handleOpenTrackContextMenu}
              onContextMenuAlbum={handleOpenAlbumContextMenu}
              onContextMenuArtist={handleOpenArtistContextMenu}
              onNavigateToArtist={handleNavigateToArtist}
              onNavigateToGenre={handleNavigateToGenre}
              onNavigateToDecade={handleNavigateToDecade}
              onReclassifyAlbum={handleReclassifyAlbum}
              onSearchAlbumArt={(q, alb) => {
                setCoverArtSearchState({
                  query: q,
                  mode: 'album',
                  label: alb ? `${alb.title} — ${alb.artist}` : q,
                  targetAlbumId: alb?.id,
                  targetAlbumTitle: alb?.title,
                  targetArtistName: alb?.artist,
                });
                setIsCoverArtFinderOpen(true);
              }}
              initialSelectedAlbum={initialSelectedAlbum}
              onClearInitialAlbum={() => setInitialSelectedAlbum(null)}
              layoutConfig={layoutConfig}
              onUpdateLayout={handleUpdateLayout}
            />
          )}

          {currentView === 'artists' && (
            <ArtistListView
              mode="artists"
              artists={filteredArtists}
              allArtists={artists}
              totalArtistCount={syncProgress?.totalArtists}
              albums={albums}
              tracks={tracks}
              currentTrack={currentTrack}
              onPlayAlbum={handlePlayAlbum}
              onPlayTrack={handlePlayTrack}
              onPlayQueue={handlePlayQueueList}
              onContextMenuTrack={handleOpenTrackContextMenu}
              onContextMenuAlbum={handleOpenAlbumContextMenu}
              onContextMenuArtist={handleOpenArtistContextMenu}
              onNavigateToAlbum={handleNavigateToAlbum}
              onReclassifyAlbum={handleReclassifyAlbum}
              onSearchArtistArt={(artistName) => {
                setCoverArtSearchState({
                  query: artistName,
                  mode: 'artist',
                  label: artistName,
                  targetArtistName: artistName,
                });
                setIsCoverArtFinderOpen(true);
              }}
              initialSelectedArtistName={initialSelectedArtistName}
              onClearInitialArtist={() => setInitialSelectedArtistName(null)}
              layoutConfig={layoutConfig}
              onUpdateLayout={handleUpdateLayout}
            />
          )}

          {currentView === 'album-artists' && (
            <ArtistListView
              mode="album-artists"
              artists={filteredAlbumArtists}
              allArtists={artists}
              totalArtistCount={albumArtists.length}
              albums={albums}
              tracks={tracks}
              currentTrack={currentTrack}
              onPlayAlbum={handlePlayAlbum}
              onPlayTrack={handlePlayTrack}
              onPlayQueue={handlePlayQueueList}
              onContextMenuTrack={handleOpenTrackContextMenu}
              onContextMenuAlbum={handleOpenAlbumContextMenu}
              onContextMenuArtist={handleOpenArtistContextMenu}
              onNavigateToAlbum={handleNavigateToAlbum}
              onReclassifyAlbum={handleReclassifyAlbum}
              onSearchArtistArt={(artistName) => {
                setCoverArtSearchState({
                  query: artistName,
                  mode: 'artist',
                  label: artistName,
                  targetArtistName: artistName,
                });
                setIsCoverArtFinderOpen(true);
              }}
              initialSelectedArtistName={initialSelectedArtistName}
              onClearInitialArtist={() => setInitialSelectedArtistName(null)}
              layoutConfig={layoutConfig}
              onUpdateLayout={handleUpdateLayout}
            />
          )}

          {currentView === 'genres' && (
            <GenreDecadeView
              mode="genres"
              tracks={filteredTracks}
              albums={filteredAlbums}
              currentTrack={currentTrack}
              onPlayTrack={handlePlayTrack}
              onPlayAlbum={handlePlayAlbum}
              onPlayQueue={handlePlayQueueList}
              onNavigateToArtist={handleNavigateToArtist}
              onContextMenuArtist={handleOpenArtistContextMenu}
            />
          )}

          {currentView === 'decades' && (
            <GenreDecadeView
              mode="decades"
              tracks={filteredTracks}
              albums={filteredAlbums}
              currentTrack={currentTrack}
              onPlayTrack={handlePlayTrack}
              onPlayAlbum={handlePlayAlbum}
              onPlayQueue={handlePlayQueueList}
              onNavigateToArtist={handleNavigateToArtist}
              onContextMenuArtist={handleOpenArtistContextMenu}
            />
          )}

          {currentView === 'smart-playlists' && (
            <SmartPlaylistsView
              tracks={tracks}
              onPlayTrack={handlePlayTrack}
              onPlayQueue={handlePlayQueueList}
              onUpdateTrack={handleUpdateTrack}
              onNavigateToArtist={handleNavigateToArtist}
              onContextMenuArtist={handleOpenArtistContextMenu}
            />
          )}

          {currentView === 'themes' && (
            <ThemeEditorView
              currentTheme={currentTheme}
              onUpdateTheme={handleUpdateTheme}
              onSelectPreset={handleSelectPresetTheme}
            />
          )}

          {currentView === 'hotkeys' && (
            <HotkeysView
              bindings={hotkeyBindings}
              onUpdateBinding={handleUpdateHotkey}
              onResetDefaults={handleResetHotkeys}
            />
          )}

          {currentView === 'dsp' && (
            <div className="p-6">
              <button
                onClick={() => setIsDspModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[var(--fin-accent)] text-slate-950 font-bold text-xs"
              >
                Open Fullscreen DSP Equalizer Console
              </button>
            </div>
          )}

          {currentView === 'specs' && (
            <div className="p-6">
              <button
                onClick={() => setIsSpecsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs"
              >
                Open Performance Telemetry HUD
              </button>
            </div>
          )}

          {currentView === 'art-search' && (
            <CoverArtSearchModal
              isOpen={true}
              embedded={true}
              onClose={() => setCurrentView('home')}
              defaultQuery={coverArtSearchState?.query || ''}
              initialMode={coverArtSearchState?.mode || 'artist'}
              targetLabel={coverArtSearchState?.label}
              artists={artists}
              albums={albums}
              tracks={tracks}
              onSelectArt={(artUrl, applyScope, targetOverride?: ArtApplyTargetOverride) => {
                const targetArtist =
                  targetOverride?.artistName || coverArtSearchState?.targetArtistName;
                const targetAlbumId =
                  targetOverride?.albumId || coverArtSearchState?.targetAlbumId;
                const targetAlbumTitle =
                  targetOverride?.albumTitle || coverArtSearchState?.targetAlbumTitle;
                const targetTrack = coverArtSearchState?.targetTrack || currentTrack;

                if (applyScope === 'artist' && targetArtist) {
                  saveArtworkOverride({ artistName: targetArtist }, artUrl);
                  const key = targetArtist.trim().toLowerCase();
                  setArtists((prev) =>
                    prev.map((a) =>
                      a.name.trim().toLowerCase() === key ? { ...a, coverUrl: artUrl } : a
                    )
                  );
                } else if (targetAlbumId || targetAlbumTitle) {
                  saveArtworkOverride(
                    { albumId: targetAlbumId, albumTitle: targetAlbumTitle },
                    artUrl
                  );
                  setTracks((prev) =>
                    prev.map((t) =>
                      (targetAlbumId && t.albumId === targetAlbumId) ||
                      (targetAlbumTitle &&
                        t.album.toLowerCase() === targetAlbumTitle.toLowerCase())
                        ? { ...t, coverUrl: artUrl }
                        : t
                    )
                  );
                  setAlbums((prev) =>
                    prev.map((alb) =>
                      (targetAlbumId && alb.id === targetAlbumId) ||
                      (targetAlbumTitle &&
                        alb.title.toLowerCase() === targetAlbumTitle.toLowerCase())
                        ? {
                            ...alb,
                            coverUrl: artUrl,
                            tracks: alb.tracks.map((t) => ({ ...t, coverUrl: artUrl })),
                          }
                        : alb
                    )
                  );
                } else if (targetTrack) {
                  saveArtworkOverride(
                    { albumId: targetTrack.albumId, albumTitle: targetTrack.album },
                    artUrl
                  );
                  handleUpdateTrack({ ...targetTrack, coverUrl: artUrl });
                }
              }}
            />
          )}

          {currentView === 'jellyfin-config' && (
            <div className="p-6">
              <button
                onClick={() => setIsServerModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Open Jellyfin Server Configuration
              </button>
            </div>
          )}
        </main>

        {/* Right-Docked Vertical Sidebar Player Deck */}
        {layoutConfig.playerBarPosition === 'right' && renderPlayerBar()}

        {/* Right-Docked Navigation Sidebar */}
        {layoutConfig.sidebarPosition === 'right' && renderSidebar()}

        {/* Flyout Drawers */}
        <LyricsDrawer
          isOpen={isLyricsOpen}
          onClose={() => setIsLyricsOpen(false)}
          currentTrack={currentTrack}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onSeek={handleSeek}
          onOpenMetadataEditor={(t) => setEditingTrack(t)}
          onNavigateToArtist={handleNavigateToArtist}
          onNavigateToAlbum={handleNavigateToAlbum}
          widthPx={layoutConfig.drawerWidthPx}
          onResizeWidth={(w) => handleUpdateLayout({ drawerWidthPx: w })}
        />

        <QueueDrawer
          isOpen={isQueueOpen}
          onClose={() => setIsQueueOpen(false)}
          queue={queue}
          currentTrack={currentTrack}
          onPlayTrack={handlePlayTrack}
          onRemoveFromQueue={(idx) => {
            setQueue((prev) => prev.filter((_, i) => i !== idx));
          }}
          onClearQueue={() => setQueue([])}
          widthPx={layoutConfig.drawerWidthPx}
          onResizeWidth={(w) => handleUpdateLayout({ drawerWidthPx: w })}
        />
      </div>

      {/* Bottom-Mounted Navigation Tabs (when sidebarPosition === 'bottom') */}
      {layoutConfig.sidebarPosition === 'bottom' && renderSidebar()}

      {/* Dedicated Bottom Search Command Deck (when searchBarPosition === 'bottom-deck') */}
      {layoutConfig.searchBarPosition === 'bottom-deck' && (
        <div
          data-testid="bottom-search-deck"
          className="w-full bg-[#090d18]/95 border-t border-cyan-500/20 px-6 py-2 z-25 backdrop-blur-md flex items-center justify-center shrink-0"
        >
          <SearchBarSection
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            artists={globalSearchArtists}
            albumArtists={albumArtists}
            albums={globalSearchAlbums}
            tracks={globalSearchTracks}
            onNavigateToArtist={handleNavigateToArtist}
            onNavigateToAlbumArtist={handleNavigateToAlbumArtist}
            onNavigateToAlbum={handleNavigateToAlbum}
            onPlayTrack={handlePlayTrack}
            onContextMenuArtist={handleOpenArtistContextMenu}
            onContextMenuAlbum={handleOpenAlbumContextMenu}
            onContextMenuTrack={handleOpenTrackContextMenu}
            layoutConfig={layoutConfig}
            onUpdateLayout={handleUpdateLayout}
            onDragStartSection={(sec) => setDraggedSection(sec)}
            onDragEndSection={() => {
              setDraggedSection(null);
              setActiveDropZone(null);
            }}
            isHeroDeck
          />
        </div>
      )}

      {/* 3. Bottom or Floating Desktop Player Dock */}
      {!isPlayerSidebar && layoutConfig.playerBarPosition !== 'top' && renderPlayerBar()}

      {/* 4. Right-Click Track Context Menu */}
      <TrackContextMenu
        track={contextMenuState?.track || null}
        position={contextMenuState?.position || null}
        onClose={() => setContextMenuState(null)}
        onPlayNow={(t) => handlePlayTrack(t)}
        onPlayNext={handlePlayNext}
        onAddToQueue={handleAddToQueue}
        onToggleFavorite={handleToggleFavorite}
        onGoToAlbum={handleNavigateToAlbum}
        onGoToArtist={handleNavigateToArtist}
        onGoToAlbumArtist={handleNavigateToAlbumArtist}
        onSearchAlbumArtwork={(t) => {
          setCoverArtSearchState({
            query: `${t.artist} ${t.album}`.trim(),
            mode: 'album',
            label: `${t.album} — ${t.artist}`,
            targetTrack: t,
          });
          setIsCoverArtFinderOpen(true);
        }}
        onSearchArtistArtwork={(t) => {
          setCoverArtSearchState({
            query: t.artist,
            mode: 'artist',
            label: t.artist,
            targetTrack: t,
            targetArtistName: t.artist,
          });
          setIsCoverArtFinderOpen(true);
        }}
        onOpenMetadataEditor={(t) => setEditingTrack(t)}
      />

      {/* 4b. Right-Click Album Context Menu (One-Click Category Organization) */}
      <AlbumContextMenu
        album={albumContextMenuState?.album || null}
        position={albumContextMenuState?.position || null}
        onClose={() => setAlbumContextMenuState(null)}
        onPlayAlbum={handlePlayAlbum}
        onPlayNext={handlePlayNextAlbum}
        onAddToQueue={(alb) => {
          const albTracks =
            alb.tracks && alb.tracks.length > 0
              ? alb.tracks
              : tracks.filter(
                  (t) =>
                    t.albumId === alb.id ||
                    t.album.toLowerCase() === alb.title.toLowerCase()
                );
          setQueue((prev) => [...prev, ...albTracks]);
        }}
        onGoToArtist={handleNavigateToArtist}
        onReclassifyAlbum={(albumId, type) => {
          handleReclassifyAlbum(
            albumId,
            type,
            albumContextMenuState?.album.title,
            albumContextMenuState?.album.artist
          );
        }}
        onSearchArtwork={(alb) => {
          setCoverArtSearchState({
            query: `${alb.artist} ${alb.title}`.trim(),
            mode: 'album',
            label: `${alb.title} — ${alb.artist}`,
            targetAlbumId: alb.id,
            targetAlbumTitle: alb.title,
          });
          setIsCoverArtFinderOpen(true);
        }}
      />

      {/* 4c. Right-Click Artist Context Menu (Everywhere Artists Are Shown) */}
      <ArtistContextMenu
        artist={artistContextMenuState?.artist || null}
        position={artistContextMenuState?.position || null}
        onClose={() => setArtistContextMenuState(null)}
        onPlayArtist={(art) => {
          const lower = art.name.trim().toLowerCase();
          const artTracks = tracks.filter(
            (t) =>
              t.artist.trim().toLowerCase() === lower ||
              (t.albumArtist || '').trim().toLowerCase() === lower
          );
          if (artTracks.length > 0) {
            handlePlayQueueList(artTracks.slice(0, 250));
          }
        }}
        onShuffleArtist={(art) => {
          const lower = art.name.trim().toLowerCase();
          const artTracks = tracks
            .filter(
              (t) =>
                t.artist.trim().toLowerCase() === lower ||
                (t.albumArtist || '').trim().toLowerCase() === lower
            )
            .sort(() => Math.random() - 0.5);
          if (artTracks.length > 0) {
            handlePlayQueueList(artTracks.slice(0, 250));
          }
        }}
        onAddToQueue={(art) => {
          const lower = art.name.trim().toLowerCase();
          const artTracks = tracks.filter(
            (t) =>
              t.artist.trim().toLowerCase() === lower ||
              (t.albumArtist || '').trim().toLowerCase() === lower
          );
          if (artTracks.length > 0) {
            setQueue((prev) => [...prev, ...artTracks.slice(0, 250)]);
          }
        }}
        onOpenDiscography={(art) => {
          handleNavigateToArtist(art.name);
        }}
        onSearchArtistArt={(artistName) => {
          setCoverArtSearchState({
            query: artistName,
            mode: 'artist',
            label: artistName,
            targetArtistName: artistName,
          });
          setIsCoverArtFinderOpen(true);
        }}
      />

      {/* 5. Fullscreen Dedicated Track Player & Modal Overlays */}
      <NowPlayingModal
        isOpen={isDedicatedPlayerOpen}
        onClose={() => setIsDedicatedPlayerOpen(false)}
        currentTrack={currentTrack}
        queue={queue}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        volume={volume}
        isMuted={isMuted}
        metrics={metrics}
        layoutConfig={layoutConfig}
        onUpdateLayout={handleUpdateLayout}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrevTrack}
        onNext={handleNextTrack}
        onSeek={handleSeek}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onPlayTrack={handlePlayTrack}
        onToggleFavorite={handleToggleFavorite}
        onOpenDspModal={() => setIsDspModalOpen(true)}
        onOpenVisualizer={() => setIsVisualizerOpen(true)}
        onOpenMetadataEditor={(t) => setEditingTrack(t)}
        onOpenCoverArtSearch={() => {
          setCoverArtSearchState(
            currentTrack
              ? {
                  query: `${currentTrack.artist} ${currentTrack.album}`,
                  mode: 'album',
                  label: `${currentTrack.album} — ${currentTrack.artist}`,
                  targetTrack: currentTrack,
                }
              : null
          );
          setIsCoverArtFinderOpen(true);
        }}
        onNavigateToArtist={handleNavigateToArtist}
        onNavigateToAlbum={handleNavigateToAlbum}
        onContextMenuArtist={handleOpenArtistContextMenu}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        layoutConfig={layoutConfig}
        onUpdateLayout={handleUpdateLayout}
        onResetLayout={handleResetLayout}
        currentTheme={currentTheme}
        onUpdateTheme={handleUpdateTheme}
        onSelectPresetTheme={handleSelectPresetTheme}
        dspSettings={dspSettings}
        onUpdateDsp={handleUpdateDsp}
        hotkeyBindings={hotkeyBindings}
        onUpdateHotkey={handleUpdateHotkey}
        onResetHotkeys={handleResetHotkeys}
        serverConfig={serverConfig}
        onOpenServerModal={() => setIsServerModalOpen(true)}
        onToggleLayoutEditMode={() => setIsLayoutEditMode(true)}
      />

      <VisualizerOverlay
        isOpen={isVisualizerOpen}
        onClose={() => setIsVisualizerOpen(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrevTrack}
        onNext={handleNextTrack}
      />

      <DspEqualizerModal
        isOpen={isDspModalOpen}
        onClose={() => setIsDspModalOpen(false)}
        dspSettings={dspSettings}
        onUpdateDsp={handleUpdateDsp}
      />

      <PerformanceSpecsModal
        isOpen={isSpecsModalOpen}
        onClose={() => setIsSpecsModalOpen(false)}
        metrics={metrics}
        currentTrack={currentTrack}
      />

      <MetadataEditorModal
        isOpen={!!editingTrack}
        onClose={() => setEditingTrack(null)}
        track={editingTrack}
        onSaveTrack={handleUpdateTrack}
      />

      <CoverArtSearchModal
        isOpen={isCoverArtFinderOpen}
        onClose={() => setIsCoverArtFinderOpen(false)}
        defaultQuery={
          coverArtSearchState?.query ||
          (currentTrack ? `${currentTrack.artist} ${currentTrack.album}` : '')
        }
        initialMode={coverArtSearchState?.mode || 'all'}
        targetLabel={
          coverArtSearchState?.label ||
          (currentTrack ? `${currentTrack.album} — ${currentTrack.artist}` : undefined)
        }
        artists={artists}
        albums={albums}
        tracks={tracks}
        onSelectArt={(artUrl, applyScope, targetOverride?: ArtApplyTargetOverride) => {
          const targetArtist =
            targetOverride?.artistName || coverArtSearchState?.targetArtistName;
          const targetTrack = coverArtSearchState?.targetTrack || currentTrack;
          const targetAlbumId = targetOverride?.albumId || coverArtSearchState?.targetAlbumId;
          const targetAlbumTitle =
            targetOverride?.albumTitle || coverArtSearchState?.targetAlbumTitle;

          if ((applyScope === 'artist' || coverArtSearchState?.mode === 'artist') && targetArtist) {
            saveArtworkOverride({ artistName: targetArtist }, artUrl);
            const key = targetArtist.trim().toLowerCase();
            setArtists((prev) =>
              prev.map((a) => (a.name.trim().toLowerCase() === key ? { ...a, coverUrl: artUrl } : a))
            );
          }

          if (targetAlbumId || targetAlbumTitle) {
            saveArtworkOverride({ albumId: targetAlbumId, albumTitle: targetAlbumTitle }, artUrl);
            setTracks((prev) =>
              prev.map((t) =>
                (targetAlbumId && t.albumId === targetAlbumId) ||
                (targetAlbumTitle && t.album.toLowerCase() === targetAlbumTitle.toLowerCase())
                  ? { ...t, coverUrl: artUrl }
                  : t
              )
            );
            setAlbums((prev) =>
              prev.map((alb) =>
                (targetAlbumId && alb.id === targetAlbumId) ||
                (targetAlbumTitle && alb.title.toLowerCase() === targetAlbumTitle.toLowerCase())
                  ? {
                      ...alb,
                      coverUrl: artUrl,
                      tracks: alb.tracks.map((t) => ({ ...t, coverUrl: artUrl })),
                    }
                  : alb
              )
            );
          } else if (targetTrack && applyScope === 'track-album') {
            saveArtworkOverride(
              { albumId: targetTrack.albumId, albumTitle: targetTrack.album },
              artUrl
            );
            setTracks((prev) =>
              prev.map((t) =>
                t.album.toLowerCase() === targetTrack.album.toLowerCase() &&
                t.artist.toLowerCase() === targetTrack.artist.toLowerCase()
                  ? { ...t, coverUrl: artUrl }
                  : t
              )
            );
            setAlbums((prev) =>
              prev.map((alb) =>
                alb.title.toLowerCase() === targetTrack.album.toLowerCase()
                  ? {
                      ...alb,
                      coverUrl: artUrl,
                      tracks: alb.tracks.map((t) => ({ ...t, coverUrl: artUrl })),
                    }
                  : alb
              )
            );
          } else if (targetTrack && applyScope !== 'artist') {
            saveArtworkOverride({ trackId: targetTrack.id }, artUrl);
            handleUpdateTrack({ ...targetTrack, coverUrl: artUrl });
          }
        }}
      />

      <JellyfinConfigModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        serverConfig={serverConfig}
        onUpdateConfig={setServerConfig}
        onRefreshLibrary={loadLibrary}
      />

      <MiniPlayerOverlay
        isOpen={isMiniPlayerOpen}
        onClose={() => setIsMiniPlayerOpen(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrevTrack}
        onNext={handleNextTrack}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        isMuted={isMuted}
        volume={volume}
      />
    </div>
  );
}
