/** Registers the offline service worker in production browsers (not inside the Capacitor shell, not in dev). */
export function registerServiceWorker(): void {
  const native = typeof (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform === 'function' && (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor.isNativePlatform();
  if (native || import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined); // offline is a bonus: ignore failures
  });
}
