const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    webPreferences: { offscreen: true }
  });

  const svgPath = 'file://' + path.resolve(__dirname, '../public/icon.svg');
  await win.loadURL(svgPath);

  setTimeout(async () => {
    try {
      const image = await win.webContents.capturePage();
      const pngBuffer = image.toPNG();
      fs.writeFileSync(path.resolve(__dirname, '../public/icon.png'), pngBuffer);
      console.log('Successfully generated public/icon.png from public/icon.svg!');
    } catch (e) {
      console.error('Failed to capture icon:', e);
    }
    app.quit();
  }, 1000);
});
