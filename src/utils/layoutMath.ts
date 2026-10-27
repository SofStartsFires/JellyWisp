import {
  FontFamilyChoice,
  CornerRadiusChoice,
  TrackListDensity,
  TimeDisplayMode,
  DraggableSectionId,
  LayoutConfig,
} from '../types/index.ts';
import { formatDuration } from './audioMath.ts';

export function getFontFamilyCss(family: FontFamilyChoice): string {
  switch (family) {
    case 'sans':
      return "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
    case 'mono':
      return "'JetBrains Mono', monospace";
    case 'space':
      return "'Space Grotesk', system-ui, sans-serif";
    case 'inter':
      return "'Inter', system-ui, sans-serif";
    case 'serif':
      return "'Playfair Display', Georgia, serif";
    case 'system':
    default:
      return "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  }
}

export function getCornerRadiusClass(choice: CornerRadiusChoice): string {
  switch (choice) {
    case 'none':
      return 'rounded-none';
    case 'subtle':
      return 'rounded-md';
    case 'rounded':
      return 'rounded-xl';
    case 'pill':
      return 'rounded-3xl';
    default:
      return 'rounded-xl';
  }
}

export function getDensityRowClass(density: TrackListDensity): { py: string; gap: string; text: string } {
  switch (density) {
    case 'compact':
      return { py: 'py-1.5', gap: 'gap-2', text: 'text-[11px]' };
    case 'spacious':
      return { py: 'py-3.5', gap: 'gap-4', text: 'text-sm' };
    case 'standard':
    default:
      return { py: 'py-2.5', gap: 'gap-3', text: 'text-xs' };
  }
}

export function clampSidebarWidth(width: number): number {
  return Math.max(180, Math.min(320, Math.round(width)));
}

export function clampFontScale(scale: number): number {
  return Math.max(80, Math.min(140, Math.round(scale)));
}

/**
 * Formats player scrubber timestamps according to user's selected TimeDisplayMode
 */
export function formatTimeDisplay(
  currentSec: number,
  durationSec: number,
  mode: TimeDisplayMode
): { left: string; right: string } {
  const safeCurr = Math.max(0, currentSec || 0);
  const safeDur = Math.max(0, durationSec || 0);

  if (mode === 'elapsed-remaining') {
    const remaining = Math.max(0, safeDur - safeCurr);
    return {
      left: formatDuration(safeCurr),
      right: `-${formatDuration(remaining)}`,
    };
  }

  if (mode === 'milliseconds') {
    const fmtMs = (s: number) => {
      const mins = Math.floor(s / 60);
      const secs = Math.floor(s % 60);
      const ms = Math.floor((s % 1) * 100);
      return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };
    return {
      left: fmtMs(safeCurr),
      right: fmtMs(safeDur),
    };
  }

  if (mode === 'percent') {
    const pct = safeDur > 0 ? Math.min(100, Math.round((safeCurr / safeDur) * 100)) : 0;
    return {
      left: `${pct}%`,
      right: formatDuration(safeDur),
    };
  }

  return {
    left: formatDuration(safeCurr),
    right: formatDuration(safeDur),
  };
}

/**
 * Resolves a drag-and-drop operation when a user drags a UI section ('navigation', 'player', 'inspector')
 * into a target dock zone ('top', 'bottom', 'left', 'right', 'floating')
 */
export function resolveSectionDrop(
  section: DraggableSectionId,
  targetZone: 'top' | 'bottom' | 'left' | 'right' | 'floating'
): Partial<LayoutConfig> {
  if (section === 'navigation') {
    if (targetZone === 'top') return { sidebarPosition: 'top' };
    if (targetZone === 'bottom') return { sidebarPosition: 'bottom' };
    if (targetZone === 'right') return { sidebarPosition: 'right' };
    return { sidebarPosition: 'left' };
  }

  if (section === 'player') {
    if (targetZone === 'top') return { playerBarPosition: 'top' };
    if (targetZone === 'left') return { playerBarPosition: 'left' };
    if (targetZone === 'right') return { playerBarPosition: 'right' };
    if (targetZone === 'floating') return { playerBarPosition: 'floating' };
    return { playerBarPosition: 'bottom' };
  }

  if (section === 'inspector') {
    if (targetZone === 'left') return { queueDockPosition: 'left' };
    if (targetZone === 'right') return { queueDockPosition: 'right' };
    return { queueDockPosition: 'drawer' };
  }

  if (section === 'search') {
    if (targetZone === 'top') return { searchBarPosition: 'hero-top' };
    if (targetZone === 'bottom') return { searchBarPosition: 'bottom-deck' };
    return { searchBarPosition: 'titlebar' };
  }

  return {};
}

