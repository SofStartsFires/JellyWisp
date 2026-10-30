import { LayoutConfig } from '../types/index.ts';
import { getFontFamilyCss, clampFontScale } from '../utils/layoutMath.ts';

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  // Core Typography
  fontFamily: 'sans',
  headingFontFamily: 'space',
  monoFontFamily: 'mono',
  fontSizeScale: 100,
  headingWeight: 'bold',
  letterSpacing: 'normal',
  uppercaseHeaders: true,

  customFontName: '',
  customFontUrl: '',

  // Window & Desktop Behavior
  titlebarStyle: 'windows',
  layoutLocked: true, // Locked by default to prevent accidental moves, unlocked via top-right Lock icon
  defaultStartupView: 'home',
  minimizeToTray: false,
  closeToTray: true,
  maintainMiniPlayerOnMinimize: true,

  // Audio Driver & Hardware Output Engine
  audioOutputDeviceId: 'default',
  audioDriverMode: 'default',
  sampleRatePreference: 0, // Auto/track native
  bufferSizePreference: 512,

  // Visualizer Customization
  visualizerIntensity: 1.0,
  visualizerStyle: 'bars',
  visualizerSmoothness: 0.82,
  visualizerEyeComfort: true,

  // Artist View Customization
  artistGridColumns: 3,
  artistSortBy: 'name-asc',

  // Modular Drag & Drop Dock Positions
  sidebarPosition: 'left',
  sidebarWidth: 235,
  topTabsHeightPx: 50,
  navItemScale: 100,
  playerBarPosition: 'bottom',
  playerBarHeight: 86,
  playerSidebarWidth: 295,
  playerArrangement: 'standard',
  dedicatedPlayerStyle: 'vinyl-turntable',
  queueDockPosition: 'drawer',
  drawerWidthPx: 360,
  sectionOrder: ['navigation', 'player', 'inspector', 'search'],

  // Sidebar Item Visibility Customization (user can show/hide any item; Customize items live in Settings by default)
  visibleSidebarItems: {
    home: true,
    tracks: true,
    albums: true,
    'album-artists': true,
    artists: true,
    genres: true,
    decades: true,
    favorites: true,
    'smart-playlists': true,
    dsp: false,
    specs: false,
    themes: false,
    hotkeys: false,
    'art-search': false,
    'jellyfin-config': true,
  },

  // Search Bar Modularity & Sizing
  searchBarPosition: 'titlebar',
  searchBarWidth: 'full',
  searchBarMaxWidthPx: 860,
  searchBarHeightPx: 46,
  searchBarFontSizePx: 15,
  titlebarHeightPx: 64,

  // Player Visual & Control Micro-Settings & Sizing
  artworkShape: 'rounded',
  playerArtworkSizePx: 54,
  playerSidebarArtworkSizePx: 184,
  transportButtonSizePx: 40,
  spinArtworkWhenPlaying: false,
  scrubberStyle: 'glow',
  timeDisplayMode: 'elapsed-total',
  showVolumeDb: false,
  transportButtonStyle: 'circle',

  // Library Table & Grid Customization & Sizing
  trackListDensity: 'standard',
  trackRowHeightPx: 52,
  trackThumbnailSizePx: 40,
  zebraStriping: true,
  albumGridColumns: 5,
  albumCardPaddingPx: 12,
  showAlbumYearBadge: true,
  showAlbumGenreSubtext: true,
  visibleColumns: {
    index: true,
    artwork: true,
    albumArtist: true,
    album: true,
    genre: true,
    decade: false,
    year: true,
    codec: true,
    hires: true,
    bitrate: true,
    replayGain: true,
    bpm: false,
    musicalKey: false,
    moodEnergy: false,
    playCount: false,
    favorite: true,
    duration: true,
  },

  // Surface, Geometry & Shaders
  cornerRadius: 'rounded',
  panelGap: 0,
  borderOpacity: 0.08,
  ambientEffect: 'album-bleed',
  ambientIntensity: 45,
  albumArtBleedOpacity: 0.22,
  glowIntensity: 'subtle',
  animationSpeed: 'smooth',

  // Module & HUD Toggles
  showMiniSpectrum: true,
  miniVisStyle: 'bars',
  miniVisBarCount: 32,
  showAudioSpecsBadge: true,
  showReplayGainBadge: true,
  showPeakMeters: true,
  showTrackBitrate: true,
  showWindowControls: true,
  showBrandLogo: true,
  showServerPill: true,
  showQuickUtilityButtons: true,
  swapTitlebarSides: false,
  showNavBadges: true,
  showSidebarQuickCard: true,

  genreTaxonomyMode: 'canonical',
  homeConfig: {
    showHeroPlayer: false,
    showTelemetryStats: false,
    telemetryItems: {
      tracks: true,
      albums: true,
      lossless: false,
      ping: false,
      artists: false,
    },
    showHeavyRotation: true,
    heavyRotationCount: 6,
    showRecentAlbums: true,
    recentAlbumsCount: 6,
    showFeaturedArtists: false,
    featuredArtistsCount: 6,
    showSmartMixes: true,
    sectionOrder: ['heavy-rotation', 'recent-albums', 'smart-mixes', 'hero', 'telemetry', 'featured-artists'],
  },
};

export const WORKSPACE_PRESETS: {
  id: string;
  name: string;
  description: string;
  badge: string;
  config: Partial<LayoutConfig>;
}[] = [
  {
    id: 'classic-desktop',
    name: 'Classic Desktop',
    description: 'Left vertical navigation sidebar with a full-width bottom docked player and oversized titlebar search.',
    badge: 'Default',
    config: {
      sidebarPosition: 'left',
      playerBarPosition: 'bottom',
      searchBarPosition: 'titlebar',
      searchBarMaxWidthPx: 860,
      searchBarHeightPx: 46,
      queueDockPosition: 'drawer',
      panelGap: 0,
    },
  },
  {
    id: 'hero-search-power',
    name: 'Giant Spotlight Search + Top Tabs',
    description: 'Dedicates a massive full-width Hero Search Command Bar across the top with horizontal navigation tabs.',
    badge: 'Search First',
    config: {
      searchBarPosition: 'hero-top',
      searchBarMaxWidthPx: 1400,
      searchBarHeightPx: 56,
      searchBarFontSizePx: 18,
      sidebarPosition: 'top',
      playerBarPosition: 'bottom',
    },
  },
  {
    id: 'top-tabs-sidebar-player',
    name: 'Top Tabs + Sidebar Player Deck',
    description: 'Pushes navigation into sleek top tabs and transforms the player into a vertical left deck.',
    badge: 'Power User',
    config: {
      sidebarPosition: 'top',
      playerBarPosition: 'left',
      playerSidebarWidth: 300,
      playerSidebarArtworkSizePx: 196,
      artworkShape: 'vinyl',
      spinArtworkWhenPlaying: true,
    },
  },
  {
    id: 'top-everything-horizon',
    name: 'Top-Mounted Command Deck',
    description: 'Both navigation tabs and audio player mounted up top for a 100% wide, unobstructed library table.',
    badge: 'Wide View',
    config: {
      sidebarPosition: 'top',
      playerBarPosition: 'top',
      trackListDensity: 'compact',
      trackRowHeightPx: 42,
      zebraStriping: true,
    },
  },
  {
    id: 'dual-sidebar-audiophile',
    name: 'Dual-Sidebar Audiophile Rack',
    description: 'Left navigation sidebar + Right vertical player rack + Permanently docked queue.',
    badge: 'Hi-Fi Rack',
    config: {
      sidebarPosition: 'left',
      playerBarPosition: 'right',
      playerSidebarWidth: 310,
      queueDockPosition: 'right',
      showVolumeDb: true,
      timeDisplayMode: 'milliseconds',
    },
  },
  {
    id: 'floating-tiles-modern',
    name: 'Floating Glass Tiles',
    description: 'Separated floating glass panels with 10px tile margins, top tabs, and a floating island player.',
    badge: 'Modern Glass',
    config: {
      sidebarPosition: 'top',
      playerBarPosition: 'floating',
      panelGap: 10,
      cornerRadius: 'pill',
      ambientEffect: 'album-bleed',
      albumArtBleedOpacity: 0.35,
    },
  },
];

const STORAGE_KEY_LAYOUT = 'jellywisp_layout_config_v4';

export class LayoutEngine {
  private config: LayoutConfig;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY_LAYOUT);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.config = {
          ...DEFAULT_LAYOUT_CONFIG,
          ...parsed,
          visibleColumns: {
            ...DEFAULT_LAYOUT_CONFIG.visibleColumns,
            ...(parsed.visibleColumns || {}),
          },
          visibleSidebarItems: {
            ...DEFAULT_LAYOUT_CONFIG.visibleSidebarItems,
            ...(parsed.visibleSidebarItems || {}),
          },
        };
      } catch {
        this.config = { ...DEFAULT_LAYOUT_CONFIG };
      }
    } else {
      this.config = { ...DEFAULT_LAYOUT_CONFIG };
    }

    this.applyToDom();
  }

  public getConfig(): LayoutConfig {
    return {
      ...this.config,
      visibleColumns: { ...this.config.visibleColumns },
      visibleSidebarItems: { ...this.config.visibleSidebarItems },
    };
  }

  public updateConfig(partial: Partial<LayoutConfig>) {
    this.config = {
      ...this.config,
      ...partial,
      visibleColumns: {
        ...this.config.visibleColumns,
        ...(partial.visibleColumns || {}),
      },
      visibleSidebarItems: {
        ...this.config.visibleSidebarItems,
        ...(partial.visibleSidebarItems || {}),
      },
    };
    if (partial.sidebarWidth !== undefined) {
      this.config.sidebarWidth = Math.max(140, Math.min(520, partial.sidebarWidth));
    }
    if (partial.playerBarHeight !== undefined) {
      this.config.playerBarHeight = Math.max(56, Math.min(220, partial.playerBarHeight));
    }
    if (partial.playerSidebarWidth !== undefined) {
      this.config.playerSidebarWidth = Math.max(200, Math.min(540, partial.playerSidebarWidth));
    }
    if (partial.topTabsHeightPx !== undefined) {
      this.config.topTabsHeightPx = Math.max(36, Math.min(96, partial.topTabsHeightPx));
    }
    if (partial.titlebarHeightPx !== undefined) {
      this.config.titlebarHeightPx = Math.max(44, Math.min(110, partial.titlebarHeightPx));
    }
    if (partial.drawerWidthPx !== undefined) {
      this.config.drawerWidthPx = Math.max(260, Math.min(640, partial.drawerWidthPx));
    }
    if (partial.fontSizeScale !== undefined) {
      this.config.fontSizeScale = clampFontScale(partial.fontSizeScale);
    }
    localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(this.config));
    this.applyToDom();

    // Sync desktop tray settings if running in Electron
    if (typeof window !== 'undefined' && (window as any).jellywispDesktop?.updateTrayConfig) {
      try {
        (window as any).jellywispDesktop.updateTrayConfig({
          minimizeToTray: this.config.minimizeToTray,
          closeToTray: this.config.closeToTray,
          maintainMiniPlayerOnMinimize: this.config.maintainMiniPlayerOnMinimize,
        });
      } catch (err) {
        console.warn('Electron tray config sync prevented:', err);
      }
    }
  }

  public applyPreset(presetId: string) {
    const found = WORKSPACE_PRESETS.find((p) => p.id === presetId);
    if (found) {
      this.updateConfig(found.config);
    }
  }

  public resetDefaults() {
    this.config = {
      ...DEFAULT_LAYOUT_CONFIG,
      visibleColumns: { ...DEFAULT_LAYOUT_CONFIG.visibleColumns },
      visibleSidebarItems: { ...DEFAULT_LAYOUT_CONFIG.visibleSidebarItems },
    };
    localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(this.config));
    this.applyToDom();
  }

  public applyToDom() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // Handle custom web font link injection if specified
    if (this.config.customFontUrl && this.config.customFontUrl.startsWith('http')) {
      let linkEl = document.getElementById('jw-custom-font-link') as HTMLLinkElement | null;
      if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.id = 'jw-custom-font-link';
        linkEl.rel = 'stylesheet';
        document.head.appendChild(linkEl);
      }
      if (linkEl.href !== this.config.customFontUrl) {
        linkEl.href = this.config.customFontUrl;
      }
    }

    const customName = this.config.customFontFamily || this.config.customFontName;
    const sansCss = getFontFamilyCss(this.config.fontFamily, customName);
    const headingCss = getFontFamilyCss(this.config.headingFontFamily, customName);
    const monoCss = getFontFamilyCss(this.config.monoFontFamily, customName);

    root.style.fontFamily = sansCss;
    root.style.setProperty('--jw-font-sans', sansCss);
    root.style.setProperty('--jw-font-heading', headingCss);
    root.style.setProperty('--jw-font-mono', monoCss);

    root.style.fontSize = `${this.config.fontSizeScale}%`;

    root.style.setProperty('--jw-sidebar-width', `${this.config.sidebarWidth}px`);
    root.style.setProperty('--jw-player-height', `${this.config.playerBarHeight}px`);
    root.style.setProperty('--jw-player-sidebar-width', `${this.config.playerSidebarWidth}px`);
    root.style.setProperty('--jw-panel-gap', `${this.config.panelGap}px`);
    root.style.setProperty('--jw-border-opacity', `${this.config.borderOpacity}`);
    root.style.setProperty('--jw-search-max-width', `${this.config.searchBarMaxWidthPx}px`);
    root.style.setProperty('--jw-search-height', `${this.config.searchBarHeightPx}px`);
    root.style.setProperty('--jw-search-font-size', `${this.config.searchBarFontSizePx}px`);
    root.style.setProperty('--jw-titlebar-height', `${this.config.titlebarHeightPx}px`);
  }
}

export const layoutEngine = new LayoutEngine();
