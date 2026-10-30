const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jellywispDesktop', {
  isDesktop: true,
  platform: process.platform,
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  updateTrayConfig: (config) => ipcRenderer.send('settings:updateTrayConfig', config),
});
