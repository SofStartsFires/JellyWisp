export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  year: number;
  genre: string;
  duration: number; // in seconds
  streamUrl: string;
  coverUrl: string;
  codec: 'FLAC' | 'DSD' | 'ALAC' | 'MP3' | 'AAC' | 'OGG' | 'WAV';
  bitrate: number; // in kbps
  sampleRate: number; // in Hz (e.g. 44100, 96000, 192000)
  bitDepth: number; // 16, 24, 32
  trackNumber: number;
  discNumber?: number;
  bpm: number;
  musicalKey?: string;
  replayGain?: number; // in dB e.g. -6.4
  lyrics?: string;
  moodTags: {
    energy: number; // 0 to 1
    valence: number; // 0 to 1 (positivity / happiness)
    danceability: number; // 0 to 1
    acousticness: number; // 0 to 1
  };
  externalIds?: {
    musicbrainzId?: string;
    isrc?: string;
    lastFmTags?: string[];
  };
  isFavorite?: boolean;
  playCount: number;
  addedAt: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number;
  genre: string;
  coverUrl: string;
  tracks: Track[];
  trackCount: number;
  totalDuration: number;
  isHiRes: boolean;
  hiresBadge?: string; // e.g. "FLAC 96kHz / 24-bit"
}

export interface Artist {
  id: string;
  name: string;
  coverUrl: string;
  bio: string;
  genres: string[];
  albums: Album[];
  trackCount: number;
  listenerCount?: number;
}

export interface MoodCriteria {
  minEnergy?: number;
  maxEnergy?: number;
  minValence?: number;
  maxValence?: number;
  minBpm?: number;
  maxBpm?: number;
  preferredGenres?: string[];
}

export interface SmartPlaylist {
  id: string;
  name: string;
  description: string;
  emoji: string;
  gradient: string;
  criteria: MoodCriteria;
  tracks: Track[];
  isMlGenerated?: boolean;
}

export interface JellyfinServerConfig {
  url: string;
  username: string;
  token: string;
  userId: string;
  serverName: string;
  serverVersion: string;
  isConnected: boolean;
  isDemoMode: boolean;
  pingMs: number;
  musicLibraries: { id: string; name: string }[];
}

export interface ThemeConfig {
  id: string;
  name: string;
  accentColor: string;
  bgColor: string;
  surfaceColor: string;
  sidebarColor: string;
  playerColor: string;
  cardColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  blurPx: number;
  sidebarOpacity: number; // 0.1 to 1.0
  playerOpacity: number;
  cardOpacity: number;
  customCss: string;
}

export interface DspSettings {
  enabled: boolean;
  preampDb: number; // -12dB to +12dB
  eqBands: number[]; // 10 bands gains in dB (-12 to +12)
  bassBoostDb: number; // 0 to 12
  stereoWidth: number; // 0.0 (mono) to 2.0 (super-wide), 1.0 default
  crossfadeSeconds: number; // 0 to 12
  replayGainMode: 'track' | 'album' | 'off';
  pitchSpeed: number; // 0.5 to 2.0
}

export interface HotkeyBinding {
  id: string;
  label: string;
  category: 'playback' | 'navigation' | 'dsp' | 'view';
  keyCombo: string; // e.g. "Space", "Ctrl+Right", "KeyM", "KeyL"
}

export interface PerformanceMetrics {
  sampleRate: number;
  bitDepth: number;
  codec: string;
  bitrate: number;
  bufferSeconds: number;
  bufferHealthPct: number;
  underrunCount: number;
  latencyMs: number;
  audioContextState: string;
  peakLevelL: number;
  peakLevelR: number;
}

export type FontFamilyChoice = 'sans' | 'mono' | 'space' | 'inter' | 'serif' | 'system';
export type PlayerPosition = 'bottom' | 'top' | 'left' | 'right' | 'floating' | 'compact';
export type NavPosition = 'left' | 'right' | 'top' | 'bottom' | 'compact';
export type QueueDockPosition = 'drawer' | 'right' | 'left';
export type PlayerArrangement = 'standard' | 'centered' | 'split';
export type TrackListDensity = 'compact' | 'standard' | 'spacious';
export type CornerRadiusChoice = 'none' | 'subtle' | 'rounded' | 'pill';
export type ArtworkShape = 'square' | 'rounded' | 'circle' | 'vinyl';
export type ScrubberStyle = 'smooth' | 'segmented' | 'wave' | 'thick' | 'hairline' | 'classic' | 'glow' | 'minimal';
export type TimeDisplayMode = 'elapsed-total' | 'elapsed-remaining' | 'milliseconds' | 'percent';
export type AmbientEffect = 'album-bleed' | 'solid' | 'cyber-grid' | 'scanlines' | 'aurora' | 'vignette' | 'none';
export type MiniVisStyle = 'bars' | 'wave' | 'mirrored' | 'dots' | 'off';
export type DraggableSectionId = 'navigation' | 'player' | 'inspector' | 'search';
export type SearchBarPosition = 'titlebar' | 'hero-top' | 'bottom-deck';

export interface LayoutConfig {
  // Core Typography
  fontFamily: FontFamilyChoice;
  headingFontFamily: FontFamilyChoice;
  monoFontFamily: FontFamilyChoice;
  fontSizeScale: number; // 80 to 135 (%)
  headingWeight: 'normal' | 'semibold' | 'bold' | 'black';
  letterSpacing: 'tight' | 'normal' | 'wide';
  uppercaseHeaders: boolean;

  // Modular Drag & Drop Dock Positions
  sidebarPosition: NavPosition; // 'left' | 'right' | 'top' (Top Tabs!) | 'bottom' | 'compact'
  sidebarWidth: number; // 160 to 420 px
  topTabsHeightPx: number; // 40 to 76 px
  navItemScale: number; // 85 to 135 (%)
  playerBarPosition: PlayerPosition; // 'bottom' | 'top' | 'left' | 'right' | 'floating' | 'compact'
  playerBarHeight: number; // 56 to 132 px
  playerSidebarWidth: number; // 220 to 440 px
  playerArrangement: PlayerArrangement;
  queueDockPosition: QueueDockPosition; // 'drawer' | 'right' | 'left'
  drawerWidthPx: number; // 260 to 560 px
  sectionOrder: DraggableSectionId[];

  // Search Bar Modularity & Sizing
  searchBarPosition: SearchBarPosition; // 'titlebar' | 'hero-top' | 'bottom-deck'
  searchBarWidth: 'compact' | 'standard' | 'wide' | 'full';
  searchBarMaxWidthPx: number; // 300 to 1600 px
  searchBarHeightPx: number; // 34 to 72 px
  searchBarFontSizePx: number; // 12 to 24 px
  titlebarHeightPx: number; // 48 to 96 px

  // Player Visual & Control Micro-Settings & Sizing
  artworkShape: ArtworkShape;
  playerArtworkSizePx: number; // 40 to 92 px in horizontal bar
  playerSidebarArtworkSizePx: number; // 120 to 280 px in sidebar player
  transportButtonSizePx: number; // 32 to 60 px
  spinArtworkWhenPlaying: boolean;
  scrubberStyle: ScrubberStyle;
  timeDisplayMode: TimeDisplayMode;
  showVolumeDb: boolean;
  transportButtonStyle: 'circle' | 'pill' | 'minimal' | 'bevel';

  // Library Table & Grid Customization & Sizing
  trackListDensity: TrackListDensity;
  trackRowHeightPx: number; // 36 to 84 px
  trackThumbnailSizePx: number; // 28 to 68 px
  zebraStriping: boolean;
  albumGridColumns: number; // 2 to 9
  albumCardPaddingPx: number; // 6 to 24 px
  showAlbumYearBadge: boolean;
  showAlbumGenreSubtext: boolean;
  visibleColumns: {
    index: boolean;
    artwork: boolean;
    album: boolean;
    genre: boolean;
    year: boolean;
    codec: boolean;
    hires: boolean;
    bitrate: boolean;
    replayGain: boolean;
    bpm: boolean;
    musicalKey: boolean;
    moodEnergy: boolean;
    playCount: boolean;
    favorite: boolean;
    duration: boolean;
  };

  // Surface, Geometry & Shaders
  cornerRadius: CornerRadiusChoice;
  panelGap: number; // 0 to 24 px workspace tile gap
  borderOpacity: number; // 0.0 to 0.4
  ambientEffect: AmbientEffect;
  ambientIntensity: number; // 0 to 100
  albumArtBleedOpacity: number; // 0 to 0.6
  glowIntensity: 'none' | 'subtle' | 'intense';
  animationSpeed: 'instant' | 'snappy' | 'smooth' | 'fluid';

  // Module & HUD Toggles
  showMiniSpectrum: boolean;
  miniVisStyle: MiniVisStyle;
  miniVisBarCount: 16 | 32 | 64;
  showAudioSpecsBadge: boolean;
  showReplayGainBadge: boolean;
  showPeakMeters: boolean;
  showTrackBitrate: boolean;
  showWindowControls: boolean;
  showBrandLogo: boolean;
  showServerPill: boolean;
  showQuickUtilityButtons: boolean;
  swapTitlebarSides: boolean;
  showNavBadges?: boolean;
  showSidebarQuickCard?: boolean;
}




