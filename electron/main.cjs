const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Suppress uncaught exception modal popups to ensure seamless user experience
process.on('uncaughtException', (err) => {
  console.warn('[Electron Main] Handled uncaught exception:', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[Electron Main] Handled unhandled rejection:', reason);
});

let mainWindow = null;
let miniPlayerWindow = null;
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
    // Windows Tray requires 16x16 or 32x32 native image
    const resizedIcon = icon.isEmpty() ? icon : icon.resize({ width: 16, height: 16 });

    tray = new Tray(resizedIcon);
    tray.setToolTip('Jellywisp - Audiophile Jellyfin Music Client');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Jellywisp',
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
        label: 'Quit Jellywisp',
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

    mainWindow = new BrowserWindow({
      width: 1440,
      height: 920,
      minWidth: 960,
      minHeight: 640,
      frame: false,
      titleBarStyle: 'hidden',
      backgroundColor: '#090d16',
      icon: icon.isEmpty() ? undefined : icon,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false, // Allows direct LAN/self-hosted Jellyfin streaming without CORS blocks
      },
    });

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

// IPC Window Control Handlers for Custom Frameless Windows Titlebar
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

ipcMain.on('settings:updateTrayConfig', (event, config) => {
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
