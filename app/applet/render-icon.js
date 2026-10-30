import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const svgPath = path.resolve(__dirname, 'public/icon.svg');
  const pngPath = path.resolve(__dirname, 'public/icon.png');
  
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
