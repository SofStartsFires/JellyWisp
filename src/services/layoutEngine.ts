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

  // Modular Drag & Drop Dock Positions
  sidebarPosition: 'left',
  sidebarWidth: 235,
  topTabsHeightPx: 50,
  navItemScale: 100,
  playerBarPosition: 'bottom',
  playerBarHeight: 86,
  playerSidebarWidth: 295,
  playerArrangement: 'standard',
  queueDockPosition: 'drawer',
  drawerWidthPx: 360,
  sectionOrder: ['navigation', 'player', 'inspector', 'search'],

  // Search Bar Modularity & Sizing (Bigger out of the box, fully scalable!)
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
    album: true,
    genre: true,
    year: false,
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
    name: 'Classic Desktop Studio',
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
    description: 'Dedicates a massive full-width Hero Search Command Bar across the top with horizontal navigation tabs!',
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
    description: 'Pushes navigation into sleek top tabs and transforms the player into a vertical left studio deck!',
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
    badge: 'Studio Rack',
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

const STORAGE_KEY_LAYOUT = 'jellywisp_layout_config_v3';

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
    };
    if (partial.sidebarWidth !== undefined) {
      this.config.sidebarWidth = Math.max(160, Math.min(440, partial.sidebarWidth));
    }
    if (partial.fontSizeScale !== undefined) {
      this.config.fontSizeScale = clampFontScale(partial.fontSizeScale);
    }
    localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(this.config));
    this.applyToDom();
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
    };
    localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(this.config));
    this.applyToDom();
  }

  public applyToDom() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.style.fontFamily = getFontFamilyCss(this.config.fontFamily);
    root.style.setProperty('--jw-font-sans', getFontFamilyCss(this.config.fontFamily));
    root.style.setProperty('--jw-font-heading', getFontFamilyCss(this.config.headingFontFamily));
    root.style.setProperty('--jw-font-mono', getFontFamilyCss(this.config.monoFontFamily));

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
