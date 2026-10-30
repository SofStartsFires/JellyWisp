import { createRoot } from 'react-dom/client';
import './index.css';
import {
  initPersistentStorageSync,
  hydrateFromServerDiskStore,
} from './services/storageService.ts';

// 1. Synchronously hydrate from Electron disk store and install localStorage write-through hooks
initPersistentStorageSync();

async function bootstrap() {
  // 2. Hydrate from Express /api/storage disk store (if running in web/server mode) before loading App singletons
  await hydrateFromServerDiskStore();
  const { default: App } = await import('./App.tsx');
  createRoot(document.getElementById('root')!).render(<App />);
}

bootstrap();
