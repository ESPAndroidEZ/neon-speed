import { isNative } from './core/fullscreen';
import { installSync } from './core/serverSync';

/**
 * Entry point: load the player's progress from the server (a few seconds at most, then the cache is used), then start the
 * game. The game itself is main.ts, imported after, so its stores read the up-to-date copy.
 */
void (async () => {
  try {
    if (!isNative() && typeof localStorage !== 'undefined') {
      const url = (import.meta.env.VITE_API_URL as string | undefined) ?? './api/storage.php';
      const sync = installSync(url, localStorage, Storage.prototype, fetch.bind(window));
      let done = false;
      const pull = sync.pull().then(() => { done = true; });
      await Promise.race([pull, new Promise<void>((r) => setTimeout(r, 2500))]);
      if (!done) sync.cancel();
      window.addEventListener('online', () => void sync.flush());
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void sync.flush(); });
    }
  } catch {
    /* never block the game on storage trouble */
  }
  await import('./main');
})();
