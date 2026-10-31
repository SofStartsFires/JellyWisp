const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Suppress uncaught exception modal popups to ensure seamless user experience
process.on('uncaughtException', (err) => {
  console.warn('[Electron Main] Handled uncaught exception:', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[Electron Main] Handled unhandled rejection:', reason);
});

/**
 * Configure a permanent, non-ephemeral data directory BEFORE app.whenReady().
 * Fixes Windows Portable .exe builds where default userData points to a random
 * %TEMP% folder that gets wiped when the app closes.
 */
function resolvePersistentDataDir() {
  try {
    if (process.env.PORTABLE_EXECUTABLE_DIR) {
      const portableDataDir = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'JellyWisp-Data');
      fs.mkdirSync(portableDataDir, { recursive: true });
      app.setPath('userData', portableDataDir);
      return portableDataDir;
    }
    const appDataDir = path.join(app.getPath('appData'), 'JellyWisp');
    fs.mkdirSync(appDataDir, { recursive: true });
    app.setPath('userData', appDataDir);
    return appDataDir;
  } catch (err) {
    console.warn('[Electron Main] Fallback to default userData path:', err?.message || err);
    return app.getPath('userData');
  }
}

const DATA_DIR = resolvePersistentDataDir();
const STORAGE_FILE = path.join(DATA_DIR, 'jellywisp-storage.json');
const LIBRARY_CACHE_FILE = path.join(DATA_DIR, 'jellywisp-library-cache.json');
const WINDOW_BOUNDS_FILE = path.join(DATA_DIR, 'window-bounds.json');
const LOCAL_ARTWORK_DIR = path.join(DATA_DIR, 'jellywisp-artwork');

try {
  fs.mkdirSync(LOCAL_ARTWORK_DIR, { recursive: true });
} catch (_) {}

let memoryStoreCache = null;

function readStorageStore() {
  if (memoryStoreCache) return memoryStoreCache;
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        memoryStoreCache = parsed;
        return memoryStoreCache;
      }
    }
  } catch (err) {
    console.warn('[Electron Main] Failed to read storage file:', err?.message || err);
  }
  memoryStoreCache = {};
  return memoryStoreCache;
}

function writeStorageStore(store) {
  try {
    memoryStoreCache = store;
    fs.mkdirSync(path.dirname(STORAGE_FILE), { recursive: true });
    const tmpFile = `${STORAGE_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf-8');
    fs.renameSync(tmpFile, STORAGE_FILE);
  } catch (err) {
    console.warn('[Electron Main] Failed to write storage file:', err?.message || err);
  }
}

function readWindowBounds() {
  try {
    if (fs.existsSync(WINDOW_BOUNDS_FILE)) {
      return JSON.parse(fs.readFileSync(WINDOW_BOUNDS_FILE, 'utf-8'));
    }
  } catch (_) {}
  return { width: 1440, height: 920 };
}

function saveWindowBounds(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const isMaximized = win.isMaximized();
    const bounds = isMaximized ? readWindowBounds() : win.getBounds();
    fs.writeFileSync(
      WINDOW_BOUNDS_FILE,
      JSON.stringify({ ...bounds, isMaximized }, null, 2),
      'utf-8'
    );
  } catch (_) {}
}

let mainWindow = null;
let tray = null;
let traySettings = {
  minimizeToTray: false,
  closeToTray: false,
  maintainMiniPlayerOnMinimize: false,
};

function getAppIcon() {
  try {
    const pngPath = path.join(__dirname, '../public/icon.png');
    if (fs.existsSync(pngPath)) {
      return nativeImage.createFromPath(pngPath);
    }
    const svgPath = path.join(__dirname, '../public/icon.svg');
    if (process.platform !== 'win32' && fs.existsSync(svgPath)) {
      return nativeImage.createFromPath(svgPath);
    }
  } catch (err) {
    console.warn('[Electron Main] Error loading icon file:', err);
  }
  return nativeImage.createEmpty();
}

function createTray() {
  if (tray) return;

  try {
    const icon = getAppIcon();
    const resizedIcon = icon.isEmpty() ? icon : icon.resize({ width: 16, height: 16 });

    tray = new Tray(resizedIcon);
    tray.setToolTip('JellyWisp - Audiophile Jellyfin Music Client');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open JellyWisp',
        click: () => {
          try {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            } else {
              createWindow();
            }
          } catch (e) {
            console.error('Failed to show window from tray:', e);
          }
        },
      },
      {
        label: 'Mini Player',
        click: () => {
          try {
            if (mainWindow) {
              mainWindow.webContents.send('hotkey:toggle-mini-player');
            }
          } catch (e) {}
        },
      },
      { type: 'separator' },
      {
        label: 'Play / Pause',
        click: () => {
          try {
            if (mainWindow) mainWindow.webContents.send('hotkey:toggle-play');
          } catch (e) {}
        },
      },
      {
        label: 'Next Track',
        click: () => {
          try {
            if (mainWindow) mainWindow.webContents.send('hotkey:next-track');
          } catch (e) {}
        },
      },
      {
        label: 'Previous Track',
        click: () => {
          try {
            if (mainWindow) mainWindow.webContents.send('hotkey:prev-track');
          } catch (e) {}
        },
      },
      { type: 'separator' },
      {
        label: 'Quit JellyWisp',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      try {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.focus();
          } else {
            mainWindow.show();
          }
        }
      } catch (e) {}
    });
  } catch (err) {
    console.warn('[Electron Main] System tray creation skipped or failed safely:', err?.message || err);
    tray = null;
  }
}

function createWindow() {
  try {
    const icon = getAppIcon();
    const savedBounds = readWindowBounds();

    mainWindow = new BrowserWindow({
      x: typeof savedBounds.x === 'number' ? savedBounds.x : undefined,
      y: typeof savedBounds.y === 'number' ? savedBounds.y : undefined,
      width: savedBounds.width || 1440,
      height: savedBounds.height || 920,
      minWidth: 800,
      minHeight: 560,
      frame: false,
      titleBarStyle: 'hidden',
      resizable: true,
      movable: true,
      maximizable: true,
      minimizable: true,
      backgroundColor: '#090d16',
      icon: icon.isEmpty() ? undefined : icon,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false, // Allows direct LAN/self-hosted Jellyfin streaming without CORS blocks
      },
    });

    if (savedBounds.isMaximized) {
      mainWindow.maximize();
    }

    const devUrl = process.env.VITE_DEV_SERVER_URL;
    if (devUrl) {
      mainWindow.loadURL(devUrl).catch((err) => {
        console.warn('Failed to load dev URL:', err);
      });
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch((err) => {
        console.warn('Failed to load dist file:', err);
      });
    }

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    mainWindow.on('resize', () => saveWindowBounds(mainWindow));
    mainWindow.on('move', () => saveWindowBounds(mainWindow));

    mainWindow.on('minimize', (event) => {
      try {
        if (traySettings.minimizeToTray) {
          event.preventDefault();
          mainWindow.hide();
          createTray();
        }
        if (traySettings.maintainMiniPlayerOnMinimize) {
          mainWindow.webContents.send('desktop:maintain-miniplayer');
        }
      } catch (err) {
        console.error('Error in minimize handler:', err);
      }
    });

    mainWindow.on('close', (event) => {
      try {
        saveWindowBounds(mainWindow);
        if (traySettings.closeToTray && !app.isQuitting) {
          event.preventDefault();
          mainWindow.hide();
          createTray();
          return false;
        }
      } catch (err) {
        console.error('Error in close handler:', err);
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  } catch (err) {
    console.error('Failed to create main window:', err);
  }
}

// ============================================================================
// IPC: Persistent Key-Value Storage (Login, Release Types, Artwork, Settings)
// ============================================================================
ipcMain.on('storage:get-all-sync', (event) => {
  event.returnValue = readStorageStore();
});

ipcMain.on('storage:set-item', (_event, { key, value }) => {
  if (!key || typeof key !== 'string') return;
  const store = readStorageStore();
  store[key] = String(value);
  writeStorageStore(store);
});

ipcMain.on('storage:remove-item', (_event, key) => {
  if (!key || typeof key !== 'string') return;
  const store = readStorageStore();
  if (key in store) {
    delete store[key];
    writeStorageStore(store);
  }
});

// ============================================================================
// IPC: Fast Startup Library Index Cache
// ============================================================================
ipcMain.handle('library:get-cache', async () => {
  try {
    if (fs.existsSync(LIBRARY_CACHE_FILE)) {
      const raw = await fs.promises.readFile(LIBRARY_CACHE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[Electron Main] Failed to read library cache:', err?.message || err);
  }
  return null;
});

ipcMain.handle('library:save-cache', async (_event, payload) => {
  try {
    await fs.promises.mkdir(path.dirname(LIBRARY_CACHE_FILE), { recursive: true });
    const tmp = `${LIBRARY_CACHE_FILE}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(payload), 'utf-8');
    await fs.promises.rename(tmp, LIBRARY_CACHE_FILE);
    return { ok: true };
  } catch (err) {
    console.warn('[Electron Main] Failed to write library cache:', err?.message || err);
    return { ok: false };
  }
});

// ============================================================================
// IPC: Local Artwork Folder Saving & File Picker
// ============================================================================
ipcMain.handle('artwork:save-local', async (_event, { label, imageUrl, dataUrl }) => {
  try {
    await fs.promises.mkdir(LOCAL_ARTWORK_DIR, { recursive: true });
    const safeName =
      String(label || 'artwork')
        .replace(/[^a-z0-9_-]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80) || 'artwork';

    let buffer = null;
    let ext = 'jpg';

    if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
      const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        ext = match[1] === 'png' ? 'png' : match[1] === 'webp' ? 'webp' : 'jpg';
        buffer = Buffer.from(match[2], 'base64');
      }
    } else if (imageUrl && typeof imageUrl === 'string') {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching image`);
      }
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('png')) ext = 'png';
      else if (ct.includes('webp')) ext = 'webp';
      const ab = await response.arrayBuffer();
      buffer = Buffer.from(ab);
    }

    if (!buffer) {
      return { ok: false, error: 'No valid image data provided' };
    }

    const fileName = `${safeName}_${Date.now()}.${ext}`;
    const filePath = path.join(LOCAL_ARTWORK_DIR, fileName);
    await fs.promises.writeFile(filePath, buffer);
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const base64DataUrl = `data:${mime};base64,${buffer.toString('base64')}`;

    return {
      ok: true,
      filePath,
      folderPath: LOCAL_ARTWORK_DIR,
      dataUrl: base64DataUrl,
    };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to save local artwork' };
  }
});

ipcMain.handle('artwork:open-folder', async () => {
  try {
    await fs.promises.mkdir(LOCAL_ARTWORK_DIR, { recursive: true });
    await shell.openPath(LOCAL_ARTWORK_DIR);
    return { ok: true, folderPath: LOCAL_ARTWORK_DIR };
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not open folder' };
  }
});

// ============================================================================
// IPC: Window Controls & Dragging
// ============================================================================
ipcMain.on('window:minimize', () => {
  try {
    if (mainWindow) {
      if (traySettings.minimizeToTray) {
        mainWindow.hide();
        createTray();
      } else {
        mainWindow.minimize();
      }
    }
  } catch (err) {
    console.error('Error minimizing window:', err);
  }
});

ipcMain.on('window:maximize', () => {
  try {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  } catch (err) {
    console.error('Error maximizing window:', err);
  }
});

ipcMain.on('window:close', () => {
  try {
    if (!mainWindow) return;
    saveWindowBounds(mainWindow);
    if (traySettings.closeToTray && !app.isQuitting) {
      mainWindow.hide();
      createTray();
    } else {
      mainWindow.close();
    }
  } catch (err) {
    console.error('Error closing window:', err);
  }
});

ipcMain.on('window:move-by', (_event, { dx, dy }) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    }
    const [x, y] = mainWindow.getPosition();
    mainWindow.setPosition(Math.round(x + (Number(dx) || 0)), Math.round(y + (Number(dy) || 0)));
  } catch (_) {}
});

ipcMain.on('settings:updateTrayConfig', (_event, config) => {
  try {
    if (config) {
      traySettings = { ...traySettings, ...config };
      if (traySettings.minimizeToTray || traySettings.closeToTray) {
        createTray();
      } else if (tray && !traySettings.minimizeToTray && !traySettings.closeToTray) {
        try {
          tray.destroy();
          tray = null;
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('Handled tray config update error:', err);
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !traySettings.closeToTray) {
    app.quit();
  }
});
