import { Track, Album, Artist, LibrarySyncProgress } from '../types/index.ts';

export interface CachedLibrarySnapshot {
  serverKey: string;
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  syncProgress?: LibrarySyncProgress | null;
  updatedAt: number;
}

const IDB_NAME = 'jellywisp_library_cache_db_v1';
const IDB_STORE = 'snapshots';
const SNAPSHOT_KEY = 'active_library';

function openCacheDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readIdbSnapshot(): Promise<CachedLibrarySnapshot | null> {
  const db = await openCacheDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(SNAPSHOT_KEY);
      req.onsuccess = () => resolve((req.result as CachedLibrarySnapshot) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeIdbSnapshot(snapshot: CachedLibrarySnapshot): Promise<void> {
  const db = await openCacheDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(snapshot, SNAPSHOT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function buildServerCacheKey(url: string, userId: string, selectedLibraryId?: string): string {
  return `${(url || '').trim().toLowerCase()}::${(userId || '').trim()}::${selectedLibraryId || 'all'}`;
}

/**
 * Loads the cached library index (Tracks, Albums, Artists) from IndexedDB, Electron disk,
 * or Express disk cache so startup is near-instantaneous even before Jellyfin network
 * requests complete.
 */
export async function loadCachedLibrarySnapshot(
  expectedServerKey?: string
): Promise<CachedLibrarySnapshot | null> {
  if (typeof window === 'undefined') return null;

  // 1. Try IndexedDB first (fastest in-process binary structured clone)
  try {
    const idbSnap = await readIdbSnapshot();
    if (
      idbSnap &&
      Array.isArray(idbSnap.tracks) &&
      idbSnap.tracks.length > 0 &&
      (!expectedServerKey || idbSnap.serverKey === expectedServerKey)
    ) {
      return idbSnap;
    }
  } catch {}

  // 2. Try Electron Desktop IPC disk cache
  try {
    const desktop = (window as any).jellywispDesktop;
    if (desktop?.getLibraryCache) {
      const diskSnap = (await desktop.getLibraryCache()) as CachedLibrarySnapshot | null;
      if (
        diskSnap &&
        Array.isArray(diskSnap.tracks) &&
        diskSnap.tracks.length > 0 &&
        (!expectedServerKey || diskSnap.serverKey === expectedServerKey)
      ) {
        writeIdbSnapshot(diskSnap).catch(() => {});
        return diskSnap;
      }
    }
  } catch {}

  // 3. Try Express server disk cache (/api/library-cache)
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    try {
      const res = await fetch('/api/library-cache');
      if (res.ok) {
        const srvSnap = (await res.json()) as CachedLibrarySnapshot | null;
        if (
          srvSnap &&
          Array.isArray(srvSnap.tracks) &&
          srvSnap.tracks.length > 0 &&
          (!expectedServerKey || srvSnap.serverKey === expectedServerKey)
        ) {
          writeIdbSnapshot(srvSnap).catch(() => {});
          return srvSnap;
        }
      }
    } catch {}
  }

  return null;
}

let saveCacheDebounce: ReturnType<typeof setTimeout> | null = null;

/**
 * Saves the indexed library snapshot to IndexedDB, Electron disk, and Express server disk.
 * Caps stored tracks at 15,000 in JSON disk files while keeping full index in IndexedDB.
 */
export function saveCachedLibrarySnapshot(snapshot: CachedLibrarySnapshot): void {
  if (typeof window === 'undefined') return;
  if (!snapshot.tracks || snapshot.tracks.length === 0) return;

  if (saveCacheDebounce) clearTimeout(saveCacheDebounce);
  saveCacheDebounce = setTimeout(async () => {
    try {
      await writeIdbSnapshot(snapshot);
    } catch {}

    // Trim disk JSON payload to avoid excessive disk write times on 100k+ libraries
    const diskPayload: CachedLibrarySnapshot = {
      ...snapshot,
      tracks: snapshot.tracks.slice(0, 12000),
      albums: snapshot.albums.slice(0, 6000),
      artists: snapshot.artists.slice(0, 4000),
    };

    try {
      const desktop = (window as any).jellywispDesktop;
      if (desktop?.saveLibraryCache) {
        await desktop.saveLibraryCache(diskPayload);
      }
    } catch {}

    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      try {
        await fetch('/api/library-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(diskPayload),
        });
      } catch {}
    }
  }, 300);
}
