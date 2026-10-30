import { ThemeConfig } from '../types/index.ts';

export const PRESET_THEMES: ThemeConfig[] = [
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    accentColor: '#06b6d4',
    bgColor: '#07090e',
    surfaceColor: '#0e131f',
    titlebarColor: '#060911',
    sidebarColor: '#0a0e18',
    playerColor: '#0b101c',
    cardColor: '#121829',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    trackTitleColor: '#f8fafc',
    artistNameColor: '#94a3b8',
    albumNameColor: '#cbd5e1',
    borderColor: 'rgba(6, 182, 212, 0.25)',
    blurPx: 16,
    sidebarOpacity: 0.88,
    playerOpacity: 0.92,
    cardOpacity: 0.70,
    customCss: `/* Cyberpunk Neon Glow */
.jellywisp-player-bar {
  box-shadow: 0 -4px 30px rgba(6, 182, 212, 0.15);
  border-top: 1px solid rgba(6, 182, 212, 0.3) !important;
}
.jellywisp-accent-glow {
  text-shadow: 0 0 12px rgba(6, 182, 212, 0.6);
}`,
  },
  {
    id: 'oled-pitch-black',
    name: 'OLED Pitch Black',
    accentColor: '#38bdf8',
    bgColor: '#000000',
    surfaceColor: '#080808',
    titlebarColor: '#000000',
    sidebarColor: '#030303',
    playerColor: '#050505',
    cardColor: '#0c0c0c',
    textPrimary: '#ffffff',
    textSecondary: '#a3a3a3',
    trackTitleColor: '#ffffff',
    artistNameColor: '#a3a3a3',
    albumNameColor: '#d4d4d4',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    blurPx: 8,
    sidebarOpacity: 1.0,
    playerOpacity: 1.0,
    cardOpacity: 1.0,
    customCss: `/* Pure OLED Contrast */
* {
  --fin-card-border: 1px solid rgba(255,255,255,0.1);
}
.jellywisp-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
}`,
  },
  {
    id: 'tokyo-dusk',
    name: 'Tokyo Dusk',
    accentColor: '#ec4899',
    bgColor: '#0f0a1c',
    surfaceColor: '#1a1230',
    titlebarColor: '#120b22',
    sidebarColor: '#160e2b',
    playerColor: '#191030',
    cardColor: '#221740',
    textPrimary: '#fdf2f8',
    textSecondary: '#f472b6',
    trackTitleColor: '#fdf2f8',
    artistNameColor: '#f9a8d4',
    albumNameColor: '#e9d5ff',
    borderColor: 'rgba(236, 72, 153, 0.28)',
    blurPx: 18,
    sidebarOpacity: 0.90,
    playerOpacity: 0.92,
    cardOpacity: 0.65,
    customCss: `/* Tokyo Dusk City Lights */
.jellywisp-header-gradient {
  background: radial-gradient(circle at 50% 0%, rgba(236, 72, 153, 0.18), transparent 70%);
}`,
  },
  {
    id: 'vintage-hifi-walnut',
    name: 'Vintage Hi-Fi Walnut',
    accentColor: '#f59e0b',
    bgColor: '#140f0b',
    surfaceColor: '#211812',
    titlebarColor: '#17110c',
    sidebarColor: '#1c150f',
    playerColor: '#221912',
    cardColor: '#291f17',
    textPrimary: '#fef3c7',
    textSecondary: '#fbbf24',
    trackTitleColor: '#fef3c7',
    artistNameColor: '#fcd34d',
    albumNameColor: '#fde68a',
    borderColor: 'rgba(245, 158, 11, 0.28)',
    blurPx: 12,
    sidebarOpacity: 0.94,
    playerOpacity: 0.96,
    cardOpacity: 0.80,
    customCss: `/* Analog Warmth & VU Needle */
.jellywisp-vu-meter {
  filter: sepia(0.3) saturate(1.2);
}`,
  },
  {
    id: 'nordic-slate',
    name: 'Nordic Slate',
    accentColor: '#38bdf8',
    bgColor: '#0b121e',
    surfaceColor: '#131f33',
    titlebarColor: '#0d1626',
    sidebarColor: '#101b2d',
    playerColor: '#121f34',
    cardColor: '#17263f',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    trackTitleColor: '#f0f9ff',
    artistNameColor: '#7dd3fc',
    albumNameColor: '#bae6fd',
    borderColor: 'rgba(56, 189, 248, 0.25)',
    blurPx: 20,
    sidebarOpacity: 0.88,
    playerOpacity: 0.92,
    cardOpacity: 0.60,
    customCss: `/* Frosted Nordic Minimalism */
.jellywisp-frosted {
  backdrop-filter: blur(24px) saturate(160%);
}`,
  },
  {
    id: 'aurora-borealis',
    name: 'Aurora Borealis',
    accentColor: '#10b981',
    bgColor: '#041210',
    surfaceColor: '#08201d',
    titlebarColor: '#051715',
    sidebarColor: '#071c19',
    playerColor: '#09221e',
    cardColor: '#0d2b27',
    textPrimary: '#ecfdf5',
    textSecondary: '#6ee7b7',
    trackTitleColor: '#ecfdf5',
    artistNameColor: '#6ee7b7',
    albumNameColor: '#a7f3d0',
    borderColor: 'rgba(16, 185, 129, 0.28)',
    blurPx: 16,
    sidebarOpacity: 0.90,
    playerOpacity: 0.94,
    cardOpacity: 0.70,
    customCss: `/* Aurora Emerald Glow */
.jellywisp-active-nav {
  box-shadow: inset 0 0 15px rgba(16, 185, 129, 0.25);
}`,
  },
  {
    id: 'crimson-velvet',
    name: 'Crimson Velvet',
    accentColor: '#f43f5e',
    bgColor: '#14060a',
    surfaceColor: '#240b12',
    titlebarColor: '#18070c',
    sidebarColor: '#1e0910',
    playerColor: '#230b13',
    cardColor: '#2c0e18',
    textPrimary: '#fff1f2',
    textSecondary: '#fda4af',
    trackTitleColor: '#fff1f2',
    artistNameColor: '#fda4af',
    albumNameColor: '#fecdd3',
    borderColor: 'rgba(244, 63, 94, 0.28)',
    blurPx: 16,
    sidebarOpacity: 0.92,
    playerOpacity: 0.95,
    cardOpacity: 0.75,
    customCss: '',
  },
];

const STORAGE_KEY_THEME = 'jellywisp_theme_config';

export class ThemeEngine {
  private currentTheme: ThemeConfig;
  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved) {
      try {
        this.currentTheme = { ...PRESET_THEMES[0], ...JSON.parse(saved) };
      } catch {
        this.currentTheme = { ...PRESET_THEMES[0] };
      }
    } else {
      this.currentTheme = { ...PRESET_THEMES[0] };
    }

    this.ensureStyleTag();
    this.applyCurrentTheme();
  }

  private ensureStyleTag() {
    if (typeof document === 'undefined') return;
    let tag = document.getElementById('jellywisp-custom-styles') as HTMLStyleElement;
    if (!tag) {
      tag = document.createElement('style');
      tag.id = 'jellywisp-custom-styles';
      document.head.appendChild(tag);
    }
    this.styleElement = tag;
  }

  public getTheme(): ThemeConfig {
    return { ...this.currentTheme };
  }

  public setTheme(theme: ThemeConfig) {
    this.currentTheme = { ...theme };
    localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(this.currentTheme));
    this.applyCurrentTheme();
  }

  public updateTheme(partial: Partial<ThemeConfig>) {
    this.currentTheme = { ...this.currentTheme, ...partial };
    localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(this.currentTheme));
    this.applyCurrentTheme();
  }

  public selectPreset(presetId: string) {
    const found = PRESET_THEMES.find((p) => p.id === presetId);
    if (found) {
      this.setTheme(found);
    }
  }

  public applyCurrentTheme() {
    if (typeof document === 'undefined') return;
    this.ensureStyleTag();

    const t = this.currentTheme;
    const root = document.documentElement;

    const titlebarColor = t.titlebarColor || t.sidebarColor;
    const trackTitleColor = t.trackTitleColor || t.textPrimary || '#f8fafc';
    const artistNameColor = t.artistNameColor || t.textSecondary || '#94a3b8';
    const albumNameColor = t.albumNameColor || t.textSecondary || '#cbd5e1';

    root.style.setProperty('--fin-accent', t.accentColor);
    root.style.setProperty('--fin-bg', t.bgColor);
    root.style.setProperty('--fin-surface', t.surfaceColor);
    root.style.setProperty('--fin-titlebar', titlebarColor);
    root.style.setProperty('--fin-sidebar', t.sidebarColor);
    root.style.setProperty('--fin-player', t.playerColor);
    root.style.setProperty('--fin-card', t.cardColor);
    root.style.setProperty('--fin-border', t.borderColor);
    root.style.setProperty('--fin-blur', `${t.blurPx}px`);

    root.style.setProperty('--fin-text-primary', t.textPrimary || '#f8fafc');
    root.style.setProperty('--fin-text-secondary', t.textSecondary || '#94a3b8');
    root.style.setProperty('--fin-text-track', trackTitleColor);
    root.style.setProperty('--fin-text-artist', artistNameColor);
    root.style.setProperty('--fin-text-album', albumNameColor);

    root.style.setProperty('--fin-sidebar-opacity', `${t.sidebarOpacity}`);
    root.style.setProperty('--fin-player-opacity', `${t.playerOpacity}`);
    root.style.setProperty('--fin-card-opacity', `${t.cardOpacity}`);

    if (this.styleElement) {
      this.styleElement.textContent = `
        :root {
          --fin-accent: ${t.accentColor};
          --fin-bg: ${t.bgColor};
          --fin-surface: ${t.surfaceColor};
          --fin-titlebar: ${titlebarColor};
          --fin-sidebar: ${t.sidebarColor};
          --fin-player: ${t.playerColor};
          --fin-card: ${t.cardColor};
          --fin-text-primary: ${t.textPrimary || '#f8fafc'};
          --fin-text-secondary: ${t.textSecondary || '#94a3b8'};
          --fin-text-track: ${trackTitleColor};
          --fin-text-artist: ${artistNameColor};
          --fin-text-album: ${albumNameColor};
        }
        .jellywisp-titlebar {
          background-color: color-mix(in srgb, ${titlebarColor} 94%, transparent) !important;
          backdrop-filter: blur(${t.blurPx}px);
        }
        .jellywisp-sidebar {
          background-color: color-mix(in srgb, ${t.sidebarColor} ${Math.round(t.sidebarOpacity * 100)}%, transparent) !important;
          backdrop-filter: blur(${t.blurPx}px);
        }
        .jellywisp-player-bar {
          background-color: color-mix(in srgb, ${t.playerColor} ${Math.round(t.playerOpacity * 100)}%, transparent) !important;
          backdrop-filter: blur(${t.blurPx}px);
        }
        .jellywisp-card {
          background-color: color-mix(in srgb, ${t.cardColor} ${Math.round(t.cardOpacity * 100)}%, transparent);
          backdrop-filter: blur(${t.blurPx}px);
        }
        ${t.customCss || ''}
      `;
    }
  }

  public exportThemeJson(): string {
    return JSON.stringify(this.currentTheme, null, 2);
  }

  public importThemeJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.accentColor && parsed.bgColor) {
        this.setTheme({ ...this.currentTheme, ...parsed });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const themeEngine = new ThemeEngine();
