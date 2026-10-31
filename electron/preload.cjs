const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jellywispDesktop', {
  isDesktop: true,
  platform: process.platform,
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  moveWindowBy: (dx, dy) => ipcRenderer.send('window:move-by', { dx, dy }),
  updateTrayConfig: (config) => ipcRenderer.send('settings:updateTrayConfig', config),
  // Persistent Disk Storage IPC
  getStoredDataSync: () => ipcRenderer.sendSync('storage:get-all-sync'),
  setStoredItem: (key, value) => ipcRenderer.send('storage:set-item', { key, value }),
  removeStoredItem: (key) => ipcRenderer.send('storage:remove-item', key),
  // Fast Library Startup Index Cache IPC
  getLibraryCache: () => ipcRenderer.invoke('library:get-cache'),
  saveLibraryCache: (payload) => ipcRenderer.invoke('library:save-cache', payload),
  // Local Artwork Folder IPC
  saveLocalArtwork: (opts) => ipcRenderer.invoke('artwork:save-local', opts),
  openLocalArtworkFolder: () => ipcRenderer.invoke('artwork:open-folder'),
});
