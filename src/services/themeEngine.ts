import { ThemeConfig } from '../types/index.ts';

export const PRESET_THEMES: ThemeConfig[] = [
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    accentColor: '#06b6d4',
    bgColor: '#07090e',
    surfaceColor: '#0e131f',
    sidebarColor: '#0a0e18',
    playerColor: '#0b101c',
    cardColor: '#121829',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    borderColor: 'rgba(6, 182, 212, 0.25)',
    blurPx: 16,
    sidebarOpacity: 0.85,
    playerOpacity: 0.92,
    cardOpacity: 0.70,
    customCss: `/* Cyberpunk Neon Glow */
.finamp-player-bar {
  box-shadow: 0 -4px 30px rgba(6, 182, 212, 0.15);
  border-top: 1px solid rgba(6, 182, 212, 0.3) !important;
}
.finamp-accent-glow {
  text-shadow: 0 0 12px rgba(6, 182, 212, 0.6);
}`,
  },
  {
    id: 'oled-pitch-black',
    name: 'OLED Pitch Black',
    accentColor: '#ffffff',
    bgColor: '#000000',
    surfaceColor: '#0a0a0a',
    sidebarColor: '#000000',
    playerColor: '#050505',
    cardColor: '#0c0c0c',
    textPrimary: '#ffffff',
    textSecondary: '#a3a3a3',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    blurPx: 8,
    sidebarOpacity: 1.0,
    playerOpacity: 1.0,
    cardOpacity: 1.0,
    customCss: `/* Pure OLED Contrast */
* {
  --fin-card-border: 1px solid rgba(255,255,255,0.1);
}
.finamp-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
}`,
  },
  {
    id: 'tokyo-dusk',
    name: 'Tokyo Dusk',
    accentColor: '#ec4899',
    bgColor: '#0f0c1b',
    surfaceColor: '#18132b',
    sidebarColor: '#130e24',
    playerColor: '#151029',
    cardColor: '#20183b',
    textPrimary: '#fdf2f8',
    textSecondary: '#cbd5e1',
    borderColor: 'rgba(236, 72, 153, 0.25)',
    blurPx: 18,
    sidebarOpacity: 0.82,
    playerOpacity: 0.88,
    cardOpacity: 0.65,
    customCss: `/* Tokyo Dusk City Lights */
.finamp-header-gradient {
  background: radial-gradient(circle at 50% 0%, rgba(236, 72, 153, 0.18), transparent 70%);
}`,
  },
  {
    id: 'vintage-hifi-walnut',
    name: 'Vintage Hi-Fi Walnut',
    accentColor: '#f59e0b',
    bgColor: '#120f0d',
    surfaceColor: '#1c1714',
    sidebarColor: '#171310',
    playerColor: '#191411',
    cardColor: '#241e1a',
    textPrimary: '#fef3c7',
    textSecondary: '#d97706',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    blurPx: 12,
    sidebarOpacity: 0.90,
    playerOpacity: 0.95,
    cardOpacity: 0.80,
    customCss: `/* Analog Warmth & VU Needle */
.finamp-vu-meter {
  filter: sepia(0.3) saturate(1.2);
}`,
  },
  {
    id: 'nordic-slate',
    name: 'Nordic Slate',
    accentColor: '#38bdf8',
    bgColor: '#0b111a',
    surfaceColor: '#131c2a',
    sidebarColor: '#0f1722',
    playerColor: '#101926',
    cardColor: '#172233',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    borderColor: 'rgba(56, 189, 248, 0.2)',
    blurPx: 20,
    sidebarOpacity: 0.80,
    playerOpacity: 0.85,
    cardOpacity: 0.60,
    customCss: `/* Frosted Nordic Minimalism */
.finamp-frosted {
  backdrop-filter: blur(24px) saturate(160%);
}`,
  },
  {
    id: 'aurora-borealis',
    name: 'Aurora Borealis',
    accentColor: '#10b981',
    bgColor: '#051111',
    surfaceColor: '#091c1b',
    sidebarColor: '#061615',
    playerColor: '#081918',
    cardColor: '#0c2423',
    textPrimary: '#ecfdf5',
    textSecondary: '#6ee7b7',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    blurPx: 16,
    sidebarOpacity: 0.82,
    playerOpacity: 0.90,
    cardOpacity: 0.70,
    customCss: `/* Aurora Emerald Glow */
.finamp-active-nav {
  box-shadow: inset 0 0 15px rgba(16, 185, 129, 0.25);
}`,
  },
];

const STORAGE_KEY_THEME = 'finamp_theme_config';

export class ThemeEngine {
  private currentTheme: ThemeConfig;
  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved) {
      try {
        this.currentTheme = JSON.parse(saved);
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
    let tag = document.getElementById('finamp-custom-styles') as HTMLStyleElement;
    if (!tag) {
      tag = document.createElement('style');
      tag.id = 'finamp-custom-styles';
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

    root.style.setProperty('--fin-accent', t.accentColor);
    root.style.setProperty('--fin-bg', t.bgColor);
    root.style.setProperty('--fin-surface', t.surfaceColor);
    root.style.setProperty('--fin-sidebar', t.sidebarColor);
    root.style.setProperty('--fin-player', t.playerColor);
    root.style.setProperty('--fin-card', t.cardColor);
    root.style.setProperty('--fin-border', t.borderColor);
    root.style.setProperty('--fin-blur', `${t.blurPx}px`);

    root.style.setProperty('--fin-sidebar-opacity', `${t.sidebarOpacity}`);
    root.style.setProperty('--fin-player-opacity', `${t.playerOpacity}`);
    root.style.setProperty('--fin-card-opacity', `${t.cardOpacity}`);

    if (this.styleElement) {
      this.styleElement.textContent = `
        :root {
          --fin-accent: ${t.accentColor};
          --fin-bg: ${t.bgColor};
        }
        .finamp-sidebar {
          background-color: ${t.sidebarColor};
          opacity: ${t.sidebarOpacity};
          backdrop-filter: blur(${t.blurPx}px);
        }
        .finamp-player-bar {
          background-color: ${t.playerColor};
          opacity: ${t.playerOpacity};
          backdrop-filter: blur(${t.blurPx}px);
        }
        .finamp-card {
          background-color: ${t.cardColor};
          opacity: ${t.cardOpacity};
          backdrop-filter: blur(${t.blurPx}px);
        }
        ${t.customCss}
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
