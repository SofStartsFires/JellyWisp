/**
 * Unified Persistent Storage Service for JellyWisp
 *
 * Ensures all local user state (Jellyfin server login/credentials, album release-type
 * classifications, custom artwork, favorite tracks, metadata edits, layout, themes,
 * DSP settings, and hotkeys) persists reliably across app restarts in:
 *   1. Electron Desktop (NSIS installed & Portable .exe builds via IPC disk JSON file)
 *   2. Web / Express Server (via /api/storage disk JSON file + browser localStorage)
 */

const STORAGE_PREFIX = 'jellywisp_';

export const STORAGE_KEYS = {
  SERVER_CONFIG: 'jellywisp_server_config_v1',
  ALBUM_RELEASE_TYPES: 'jellywisp_album_release_types_v1',
  CUSTOM_PLAYLISTS: 'jellywisp_custom_playlists_v1',
  LAYOUT_CONFIG: 'jellywisp_layout_config_v4',
  THEME_CONFIG: 'jellywisp_theme_v1',
  DSP_SETTINGS: 'jellywisp_dsp_settings_v1',
  HOTKEYS: 'jellywisp_hotkeys_v1',
  FAVORITE_TRACKS: 'jellywisp_favorite_tracks_v1',
  TRACK_EDITS: 'jellywisp_track_edits_v1',
  ARTWORK_OVERRIDES: 'jellywisp_artwork_overrides_v1',
  PLAYER_STATE: 'jellywisp_player_state_v1',
} as const;

interface DesktopBridgeWithStorage {
  isDesktop?: boolean;
  getStoredDataSync?: () => Record<string, string>;
  setStoredItem?: (key: string, value: string) => void;
  removeStoredItem?: (key: string) => void;
}

function getDesktopBridge(): DesktopBridgeWithStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { jellywispDesktop?: DesktopBridgeWithStorage }).jellywispDesktop;
}

// Reference to original Storage methods before patching
let rawSetItem: ((key: string, value: string) => void) | null = null;
let rawRemoveItem: ((key: string) => void) | null = null;
let isHydrating = false;
let pendingServerSync: Record<string, string | null> = {};
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleServerSync(key: string, value: string | null) {
  if (typeof window === 'undefined' || isHydrating) return;
  // Do not sync non-jellywisp internal keys
  if (!key.startsWith(STORAGE_PREFIX)) return;

  // 1. Electron Desktop IPC disk persistence
  const desktop = getDesktopBridge();
  try {
    if (desktop) {
      if (value === null) {
        desktop.removeStoredItem?.(key);
      } else {
        desktop.setStoredItem?.(key, value);
      }
    }
  } catch (err) {
    console.warn('[Storage] Desktop IPC write error:', err);
  }

  // 2. Web / Express Server disk persistence (when running via HTTP/HTTPS)
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    pendingServerSync[key] = value;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      flushServerSync();
    }, 80);
  }
}

export async function flushServerSync(): Promise<void> {
  if (typeof window === 'undefined') return;
  const payload = { ...pendingServerSync };
  pendingServerSync = {};
  if (Object.keys(payload).length === 0) return;

  try {
    await fetch('/api/storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: payload }),
      keepalive: true,
    });
  } catch {
    // Offline or static host without /api/storage — localStorage + Electron IPC still active
  }
}

/**
 * Installs a transparent interceptor on window.localStorage so that every
 * localStorage.setItem('jellywisp_*', ...) call anywhere in the app automatically
 * persists to disk in Electron and Express server environments.
 */
export function initPersistentStorageSync(): void {
  if (typeof window === 'undefined' || rawSetItem) return;

  try {
    rawSetItem = window.localStorage.setItem.bind(window.localStorage);
    rawRemoveItem = window.localStorage.removeItem.bind(window.localStorage);

    // 1. Synchronously hydrate from Electron disk store if running in Desktop app
    const desktop = getDesktopBridge();
    if (desktop?.getStoredDataSync) {
      isHydrating = true;
      const diskStore = desktop.getStoredDataSync() || {};
      for (const [k, v] of Object.entries(diskStore)) {
        if (typeof v === 'string' && k.startsWith(STORAGE_PREFIX)) {
          rawSetItem(k, v);
        }
      }
      isHydrating = false;
    }

    // 2. Patch localStorage.setItem and removeItem
    window.localStorage.setItem = (key: string, value: string) => {
      rawSetItem!(key, value);
      scheduleServerSync(key, value);
    };

    window.localStorage.removeItem = (key: string) => {
      rawRemoveItem!(key);
      scheduleServerSync(key, null);
    };

    // 3. Flush any pending writes when window closes/reloads
    window.addEventListener('beforeunload', () => {
      flushServerSync();
    });
  } catch (err) {
    console.warn('[Storage] Could not initialize storage interceptor:', err);
  }
}

/**
 * Hydrates localStorage from the Express server disk store (/api/storage)
 * and syncs any local keys that the server doesn't have yet.
 */
export async function hydrateFromServerDiskStore(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
    return false;
  }

  try {
    const res = await fetch('/api/storage');
    if (!res.ok) return false;
    const data = await res.json();
    const serverItems: Record<string, string> = data?.items || {};
    let updatedAny = false;

    isHydrating = true;
    for (const [key, val] of Object.entries(serverItems)) {
      if (typeof val === 'string' && key.startsWith(STORAGE_PREFIX)) {
        const current = window.localStorage.getItem(key);
        if (current !== val) {
          if (rawSetItem) {
            rawSetItem(key, val);
          } else {
            window.localStorage.setItem(key, val);
          }
          updatedAny = true;
        }
      }
    }
    isHydrating = false;

    // Also push any existing localStorage keys that are missing on the server
    const missingOnServer: Record<string, string> = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX) && !(k in serverItems)) {
        const v = window.localStorage.getItem(k);
        if (v !== null) missingOnServer[k] = v;
      }
    }
    if (Object.keys(missingOnServer).length > 0) {
      fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: missingOnServer }),
      }).catch(() => {});
    }

    return updatedAny;
  } catch {
    isHydrating = false;
    return false;
  }
}

// Run synchronous initialization immediately on module import
initPersistentStorageSync();
