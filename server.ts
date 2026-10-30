import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

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
