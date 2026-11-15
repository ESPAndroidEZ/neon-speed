import { isNative } from './fullscreen';

/**
 * Registers the offline service worker in production browsers (not inside the Capacitor shell, not in dev).
 * When a new release has installed and is waiting, `onUpdate(apply)` is called; `apply()` activates it and reloads.
 */
export function registerServiceWorker(onUpdate: (apply: () => void) => void): void {
  if (isNative() || import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  const start = (): void => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      const offer = (w: ServiceWorker | null): void => {
        if (!w || !navigator.serviceWorker.controller) return; // first install: nothing to update
        onUpdate(() => {
          navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
          w.postMessage('SKIP_WAITING');
        });
      };
      if (reg.waiting) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed') offer(w);
        });
      });
      window.setInterval(() => void reg.update().catch(() => undefined), 30 * 60 * 1000); // long sessions see new releases too
    }, () => undefined); // offline is a bonus: ignore failures
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
}

/** "Update ready" card: Reload now, or Later (it applies on the next start anyway). */
export function showUpdatePrompt(apply: () => void): void {
  if (document.querySelector('.rb-upd')) return;
  const el = document.createElement('div');
  el.className = 'rb-upd';
  el.style.cssText = 'position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:9000;display:flex;gap:10px;align-items:center;padding:10px 12px;background:#0a0d1cf2;border:1px solid #18d8ff88;border-radius:12px;color:#e8f6ff;font:600 14px system-ui';
  el.textContent = 'Update ready';
  const btn = (label: string, fn: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'min-width:64px;min-height:44px;padding:0 12px;font:800 13px system-ui;color:#e8f6ff;background:#18d8ff33;border:1px solid #18d8ff;border-radius:8px;cursor:pointer';
    b.addEventListener('click', fn);
    return b;
  };
  el.append(btn('Reload', apply), btn('Later', () => el.remove()));
  document.body.append(el);
}
