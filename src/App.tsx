/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Move,
  PanelTop,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Layers,
  RotateCcw,
  Sparkles,
  Check,
} from 'lucide-react';
import { Titlebar, SearchBarSection } from './components/Titlebar.tsx';
import { Sidebar, NavView } from './components/Sidebar.tsx';
import { PlayerBar } from './components/PlayerBar.tsx';
import { TrackListView } from './components/TrackListView.tsx';
import { AlbumGridView } from './components/AlbumGridView.tsx';
import { ArtistListView } from './components/ArtistListView.tsx';
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

import {
  Track,
  Album,
  Artist,
  JellyfinServerConfig,
  ThemeConfig,
  DspSettings,
  HotkeyBinding,
  PerformanceMetrics,
  LayoutConfig,
  DraggableSectionId,
} from './types/index.ts';
import { audioEngine } from './services/audioEngine.ts';
import { jellyfin } from './services/jellyfinService.ts';
import { themeEngine } from './services/themeEngine.ts';
import { hotkeyService } from './services/hotkeyService.ts';
import { layoutEngine, WORKSPACE_PRESETS } from './services/layoutEngine.ts';
import { resolveSectionDrop } from './utils/layoutMath.ts';

export default function App() {
  // Navigation & UI state
  const [currentView, setCurrentView] = useState<NavView>('tracks');
  const [searchQuery, setSearchQuery] = useState('');

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
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [volume, setVolume] = useState(0.85);
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

  // Modals & Panels
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [isDspModalOpen, setIsDspModalOpen] = useState(false);
  const [isSpecsModalOpen, setIsSpecsModalOpen] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [isCoverArtFinderOpen, setIsCoverArtFinderOpen] = useState(false);

  // Fetch initial music data
  const loadLibrary = useCallback(async () => {
    const data = await jellyfin.fetchMusicData();
    setTracks(data.tracks);
    setAlbums(data.albums);
    setArtists(data.artists);
    setQueue(data.tracks);
    if (!currentTrack && data.tracks.length > 0) {
      setCurrentTrack(data.tracks[0]);
    }
  }, [currentTrack]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Audio Engine Listeners
  useEffect(() => {
    audioEngine.onTimeUpdate((curr, dur) => {
      setCurrentTime(curr);
      setDuration(dur);
    });

    audioEngine.onPlayStateChange((playing) => {
      setIsPlaying(playing);
    });

    audioEngine.onMetrics((m) => {
      setMetrics(m);
    });

    audioEngine.onTrackEnded(() => {
      handleNextTrack();
    });
  }, [queue, currentTrack, repeatMode, isShuffle]);

  // Playback actions
  const handlePlayTrack = useCallback((track: Track) => {
    setCurrentTrack(track);
    audioEngine.playTrack(track);
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (!currentTrack && tracks.length > 0) {
      handlePlayTrack(tracks[0]);
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
    if (album.tracks.length > 0) {
      setQueue(album.tracks);
      handlePlayTrack(album.tracks[0]);
    }
  };

  const handlePlayQueueList = (newQueue: Track[]) => {
    if (newQueue.length > 0) {
      setQueue(newQueue);
      handlePlayTrack(newQueue[0]);
    }
  };

  const handleAddToQueue = (track: Track) => {
    setQueue((prev) => [...prev, track]);
  };

  const handleToggleFavorite = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isFavorite: !t.isFavorite } : t))
    );
  };

  const handleUpdateTrack = (updated: Track) => {
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

  const filteredTracks = tracks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q) ||
      t.genre.toLowerCase().includes(q) ||
      t.codec.toLowerCase().includes(q)
    );
  });

  const filteredAlbums = albums.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.artist.toLowerCase().includes(q) ||
      a.genre.toLowerCase().includes(q)
    );
  });

  const filteredArtists = artists.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.genres.some((g) => g.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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

  const handleSelectNavView = (view: NavView) => {
    if (view === 'dsp') {
      setIsDspModalOpen(true);
    } else if (view === 'specs') {
      setIsSpecsModalOpen(true);
    } else if (view === 'art-search') {
      setIsCoverArtFinderOpen(true);
    } else if (view === 'jellyfin-config') {
      setIsServerModalOpen(true);
    } else {
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
      layoutConfig={layoutConfig}
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
      trackCount={tracks.length}
      albumCount={albums.length}
      artistCount={artists.length}
      currentTrack={currentTrack}
      onOpenMetadataEditor={(t) => setEditingTrack(t)}
      sidebarWidth={layoutConfig.sidebarWidth}
      topTabsHeightPx={layoutConfig.topTabsHeightPx}
      navItemScale={layoutConfig.navItemScale}
      position={layoutConfig.sidebarPosition}
      uppercaseHeaders={layoutConfig.uppercaseHeaders}
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

  const isNavHorizontal =
    layoutConfig.sidebarPosition === 'top' || layoutConfig.sidebarPosition === 'bottom';
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

      {/* Interactive Drag-and-Drop Layout Studio Bar (when Edit Layout is active or dragging) */}
      {showDropZones && (
        <div
          data-testid="layout-edit-banner"
          className="bg-gradient-to-r from-cyan-950/95 via-slate-900/95 to-indigo-950/95 border-b border-cyan-400/40 px-4 py-2.5 z-40 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md shadow-xl"
        >
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-extrabold text-[10px] uppercase">
              {draggedSection ? `Dragging: ${draggedSection.toUpperCase()}` : 'Drag & Drop Studio'}
            </span>
            <p className="text-xs text-slate-200 font-medium">
              Drag <strong className="text-cyan-300">Navigation</strong>,{' '}
              <strong className="text-cyan-300">Player</strong>, or{' '}
              <strong className="text-cyan-300">Search Bar</strong> grip handles into any dock zone below, or click a preset:
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

          {/* Interactive Drop Target Zones Row (works for both Drag-and-Drop AND Click) */}
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
          {currentView === 'tracks' && (
            <TrackListView
              tracks={filteredTracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onAddToQueue={handleAddToQueue}
              onOpenMetadataEditor={(t) => setEditingTrack(t)}
              onToggleFavorite={handleToggleFavorite}
              density={layoutConfig.trackListDensity}
              showTrackBitrate={layoutConfig.showTrackBitrate}
              layoutConfig={layoutConfig}
              onUpdateLayout={handleUpdateLayout}
            />
          )}

          {currentView === 'albums' && (
            <AlbumGridView
              albums={filteredAlbums}
              currentTrack={currentTrack}
              onPlayTrack={handlePlayTrack}
              onPlayAlbum={handlePlayAlbum}
              onOpenMetadataEditor={(t) => setEditingTrack(t)}
              layoutConfig={layoutConfig}
              onUpdateLayout={handleUpdateLayout}
            />
          )}

          {currentView === 'artists' && (
            <ArtistListView
              artists={filteredArtists}
              onSelectArtist={(artist) => {
                setSearchQuery(artist.name);
                setCurrentView('tracks');
              }}
            />
          )}

          {currentView === 'smart-playlists' && (
            <SmartPlaylistsView
              tracks={tracks}
              onPlayTrack={handlePlayTrack}
              onPlayQueue={handlePlayQueueList}
              onUpdateTrack={handleUpdateTrack}
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
            <div className="p-6">
              <button
                onClick={() => setIsCoverArtFinderOpen(true)}
                className="px-4 py-2 rounded-xl bg-pink-600 text-white font-bold text-xs"
              >
                Open High-Resolution Album Art Finder
              </button>
            </div>
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
          onSeek={handleSeek}
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

      {/* 4. Fullscreen & Modal Overlays */}
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
        defaultQuery={currentTrack ? `${currentTrack.artist} ${currentTrack.album}` : ''}
        onSelectArt={(artUrl) => {
          if (currentTrack) {
            handleUpdateTrack({ ...currentTrack, coverUrl: artUrl });
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
      />
    </div>
  );
}
