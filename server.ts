import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DISK_STORE_FILE = path.join(__dirname, '.jellywisp-store.json');
const LIBRARY_CACHE_FILE = path.join(__dirname, '.jellywisp-library-cache.json');
const LOCAL_ARTWORK_DIR = path.join(__dirname, 'jellywisp-artwork');

try {
  fs.mkdirSync(LOCAL_ARTWORK_DIR, { recursive: true });
} catch {}

let diskStoreCache: Record<string, string> | null = null;

function readDiskStore(): Record<string, string> {
  if (diskStoreCache) return diskStoreCache;
  try {
    if (fs.existsSync(DISK_STORE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DISK_STORE_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        diskStoreCache = parsed;
        return diskStoreCache!;
      }
    }
  } catch (err) {
    console.warn('[Server Storage] Failed to read disk store:', err);
  }
  diskStoreCache = {};
  return diskStoreCache;
}

function writeDiskStore(store: Record<string, string>) {
  try {
    diskStoreCache = store;
    const tmp = `${DISK_STORE_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf-8');
    fs.renameSync(tmp, DISK_STORE_FILE);
  } catch (err) {
    console.warn('[Server Storage] Failed to write disk store:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use('/local-artwork', express.static(LOCAL_ARTWORK_DIR));

  // 0. Persistent Disk Key-Value Store (preserves Jellyfin login, release types, artwork overrides, settings)
  app.get('/api/storage', (_req, res) => {
    res.json({ ok: true, items: readDiskStore() });
  });

  app.post('/api/storage', (req, res) => {
    const items = req.body?.items;
    if (!items || typeof items !== 'object') {
      res.status(400).json({ ok: false, error: 'Invalid items payload' });
      return;
    }
    const store = readDiskStore();
    for (const [k, v] of Object.entries(items)) {
      if (!k.startsWith('jellywisp_')) continue;
      if (v === null || v === undefined) {
        delete store[k];
      } else {
        store[k] = String(v);
      }
    }
    writeDiskStore(store);
    res.json({ ok: true });
  });

  // 0b. Fast Startup Library Index Cache
  app.get('/api/library-cache', async (_req, res) => {
    try {
      if (fs.existsSync(LIBRARY_CACHE_FILE)) {
        const raw = await fs.promises.readFile(LIBRARY_CACHE_FILE, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.send(raw);
        return;
      }
    } catch {}
    res.json(null);
  });

  app.post('/api/library-cache', async (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        res.status(400).json({ ok: false });
        return;
      }
      const tmp = `${LIBRARY_CACHE_FILE}.tmp`;
      await fs.promises.writeFile(tmp, JSON.stringify(payload), 'utf-8');
      await fs.promises.rename(tmp, LIBRARY_CACHE_FILE);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // 0c. Server-side Multi-Provider Cover Art & Artist Portrait Search (solves Deezer/MusicBrainz CORS)
  app.get('/api/artwork/search', async (req, res) => {
    const query = String(req.query.q || '').trim();
    const mode = String(req.query.mode || 'all');
    if (!query) {
      res.json({ results: [] });
      return;
    }

    const encoded = encodeURIComponent(query);
    const results: any[] = [];
    const seenUrls = new Set<string>();

    const pushResult = (item: any) => {
      if (!item?.url || seenUrls.has(item.url)) return;
      seenUrls.add(item.url);
      results.push(item);
    };

    const tasks: Promise<void>[] = [];

    // 1. Deezer Artist Search (High-res 1000x1000 artist portraits, server-side avoids browser CORS)
    if (mode === 'all' || mode === 'artist') {
      tasks.push(
        (async () => {
          try {
            const r = await fetch(`https://api.deezer.com/search/artist?q=${encoded}&limit=10`);
            if (!r.ok) return;
            const d: any = await r.json();
            for (const item of d?.data || []) {
              const hiRes = item.picture_xl || item.picture_big || item.picture_medium;
              if (hiRes && !hiRes.includes('/images/artist//')) {
                pushResult({
                  id: `dz-art-${item.id}`,
                  title: `${item.name} (Artist Portrait)`,
                  artist: item.name,
                  source: 'Deezer Artist',
                  kind: 'artist',
                  resolution: '1000x1000',
                  url: hiRes,
                  thumbnail: item.picture_medium || hiRes,
                });
              }
            }
          } catch {}
        })()
      );
    }

    // 2. Deezer Album Search (High-res 1000x1000 album covers)
    if (mode === 'all' || mode === 'album') {
      tasks.push(
        (async () => {
          try {
            const r = await fetch(`https://api.deezer.com/search/album?q=${encoded}&limit=16`);
            if (!r.ok) return;
            const d: any = await r.json();
            for (const item of d?.data || []) {
              const hiRes = item.cover_xl || item.cover_big || item.cover_medium;
              if (hiRes && !hiRes.includes('/images/cover//')) {
                pushResult({
                  id: `dz-alb-${item.id}`,
                  title: item.title || query,
                  artist: item.artist?.name || query,
                  source: 'Deezer',
                  kind: 'album',
                  resolution: '1000x1000',
                  url: hiRes,
                  thumbnail: item.cover_medium || hiRes,
                });
              }
            }
          } catch {}
        })()
      );
    }

    // 3. iTunes Album Search (High-res 1000x1000 album artwork)
    if (mode === 'all' || mode === 'album' || mode === 'artist') {
      tasks.push(
        (async () => {
          try {
            const r = await fetch(
              `https://itunes.apple.com/search?term=${encoded}&entity=album&limit=18`
            );
            if (!r.ok) return;
            const d: any = await r.json();
            for (const item of d?.results || []) {
              if (!item.artworkUrl100) continue;
              const hiRes = item.artworkUrl100.replace('100x100bb', '1000x1000bb');
              const thumb = item.artworkUrl100.replace('100x100bb', '300x300bb');
              pushResult({
                id: `it-alb-${item.collectionId}`,
                title: item.collectionName || query,
                artist: item.artistName || query,
                source: 'Apple Music',
                kind: 'album',
                resolution: '1000x1000',
                url: hiRes,
                thumbnail: thumb,
              });
            }
          } catch {}
        })()
      );
    }

    // 4. iTunes Song/Single Search (catches singles & EPs not indexed as collections)
    if (mode === 'all' || mode === 'album') {
      tasks.push(
        (async () => {
          try {
            const r = await fetch(
              `https://itunes.apple.com/search?term=${encoded}&entity=song&limit=10`
            );
            if (!r.ok) return;
            const d: any = await r.json();
            for (const item of d?.results || []) {
              if (!item.artworkUrl100) continue;
              const hiRes = item.artworkUrl100.replace('100x100bb', '1000x1000bb');
              const thumb = item.artworkUrl100.replace('100x100bb', '300x300bb');
              pushResult({
                id: `it-trk-${item.trackId}`,
                title: item.collectionName || item.trackName || query,
                artist: item.artistName || query,
                source: 'iTunes Single',
                kind: 'album',
                resolution: '1000x1000',
                url: hiRes,
                thumbnail: thumb,
              });
            }
          } catch {}
        })()
      );
    }

    // 5. Wikipedia Page Image (Great for artist photos & band portraits)
    if (mode === 'all' || mode === 'artist') {
      tasks.push(
        (async () => {
          try {
            const searchRes = await fetch(
              `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
                `${query} musician OR band`
              )}&utf8=&format=json&origin=*&srlimit=3`
            );
            if (!searchRes.ok) return;
            const searchData: any = await searchRes.json();
            const hits = searchData?.query?.search || [];
            for (const hit of hits.slice(0, 2)) {
              const title = hit?.title;
              if (!title) continue;
              const sumRes = await fetch(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
              );
              if (!sumRes.ok) continue;
              const sumData: any = await sumRes.json();
              const imgUrl = sumData?.originalimage?.source || sumData?.thumbnail?.source;
              if (imgUrl) {
                pushResult({
                  id: `wiki-${hit.pageid}`,
                  title: `${sumData.title || query} (Portrait)`,
                  artist: query,
                  source: 'Wikipedia',
                  kind: 'artist',
                  resolution: '800x800',
                  url: imgUrl,
                  thumbnail: sumData?.thumbnail?.source || imgUrl,
                });
              }
            }
          } catch {}
        })()
      );
    }

    await Promise.allSettled(tasks);

    // Prioritize artist portraits first when mode === 'artist'
    if (mode === 'artist') {
      results.sort((a, b) => (a.kind === 'artist' ? -1 : 1) - (b.kind === 'artist' ? -1 : 1));
    }

    res.json({ results });
  });

  // 0d. Save Artwork Image to Local Folder on Disk (./jellywisp-artwork/)
  app.post('/api/artwork/save-local', async (req, res) => {
    try {
      const { label, imageUrl, dataUrl } = req.body || {};
      await fs.promises.mkdir(LOCAL_ARTWORK_DIR, { recursive: true });

      const safeName =
        String(label || 'artwork')
          .replace(/[^a-z0-9_-]+/gi, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 80) || 'artwork';

      let buffer: Buffer | null = null;
      let ext = 'jpg';

      if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
        const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (match) {
          ext = match[1] === 'png' ? 'png' : match[1] === 'webp' ? 'webp' : 'jpg';
          buffer = Buffer.from(match[2], 'base64');
        }
      } else if (imageUrl && typeof imageUrl === 'string') {
        const upstream = await fetch(imageUrl);
        if (!upstream.ok) {
          res.status(400).json({ ok: false, error: `Failed to fetch image (${upstream.status})` });
          return;
        }
        const ct = upstream.headers.get('content-type') || '';
        if (ct.includes('png')) ext = 'png';
        else if (ct.includes('webp')) ext = 'webp';
        const ab = await upstream.arrayBuffer();
        buffer = Buffer.from(ab);
      }

      if (!buffer) {
        res.status(400).json({ ok: false, error: 'No valid image provided' });
        return;
      }

      const fileName = `${safeName}_${Date.now()}.${ext}`;
      const filePath = path.join(LOCAL_ARTWORK_DIR, fileName);
      await fs.promises.writeFile(filePath, buffer);

      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const base64DataUrl = `data:${mime};base64,${buffer.toString('base64')}`;

      res.json({
        ok: true,
        fileName,
        filePath,
        folderPath: LOCAL_ARTWORK_DIR,
        localUrl: `/local-artwork/${fileName}`,
        dataUrl: base64DataUrl,
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Failed to save local artwork' });
    }
  });

  // 1. Generic Jellyfin API Proxy (solves CORS & HTTP/HTTPS Mixed Content for remote servers)
  app.post('/api/jellyfin/request', async (req, res) => {
    const { url, method = 'GET', headers = {}, body } = req.body || {};

    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'Missing target url' });
      return;
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const fetchOptions: RequestInit = {
        method,
        headers: {
          Accept: 'application/json',
          ...headers,
        },
        signal: controller.signal,
      };

      if (body && method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;
      const contentType = response.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      res.status(200).json({
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        latencyMs,
        data,
      });
    } catch (err: any) {
      res.status(502).json({
        ok: false,
        status: 502,
        error: err?.message || 'Proxy failed to reach Jellyfin server',
      });
    }
  });

  // 2. Jellyfin Audio Stream Proxy (supports Range requests & Web Audio API CORS)
  app.get('/api/jellyfin/stream', async (req, res) => {
    const target = req.query.target as string;
    if (!target) {
      res.status(400).send('Missing target parameter');
      return;
    }

    try {
      const forwardHeaders: Record<string, string> = {};
      if (req.headers.range) {
        forwardHeaders['Range'] = req.headers.range;
      }

      const upstream = await fetch(target, {
        headers: forwardHeaders,
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization, X-Emby-Token');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

      const passthroughHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'cache-control',
      ];
      for (const h of passthroughHeaders) {
        const val = upstream.headers.get(h);
        if (val) res.setHeader(h, val);
      }

      res.status(upstream.status);

      if (upstream.body) {
        const nodeStream = Readable.fromWeb(upstream.body as any);
        nodeStream.on('error', () => {
          if (!res.headersSent) res.end();
        });
        req.on('close', () => {
          nodeStream.destroy();
        });
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(502).send(`Stream proxy error: ${err?.message || 'Unknown error'}`);
      }
    }
  });

  // 3. Jellyfin Image / Artwork Proxy
  app.get('/api/jellyfin/image', async (req, res) => {
    const target = req.query.target as string;
    if (!target) {
      res.status(400).send('Missing target parameter');
      return;
    }

    try {
      const upstream = await fetch(target);
      if (!upstream.ok) {
        res.status(upstream.status).end();
        return;
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const contentType = upstream.headers.get('content-type');
      if (contentType) res.setHeader('Content-Type', contentType);

      if (upstream.body) {
        const nodeStream = Readable.fromWeb(upstream.body as any);
        nodeStream.on('error', () => res.end());
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch {
      res.status(502).end();
    }
  });

  // Vite middleware for development vs static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Jellywisp Desktop Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
