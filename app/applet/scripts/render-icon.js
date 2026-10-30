const sharp = require('sharp');
const path = require('path');

async function run() {
  const svgPath = path.resolve(__dirname, '../public/icon.svg');
  const pngPath = path.resolve(__dirname, '../public/icon.png');
  
  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(pngPath);
    
  console.log('Successfully rendered public/icon.png with sharp!');
}

run().catch(err => {
  console.error('Failed to render icon:', err);
  process.exit(1);
});
