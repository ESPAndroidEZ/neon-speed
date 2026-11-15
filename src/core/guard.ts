import { t } from '../i18n';
/**
 * Production hardening that must exist before anything else runs:
 * - a global error boundary: an uncaught error or rejection shows a friendly screen (Reload / Continue) instead of a
 *   frozen frame; repeated errors do not stack screens;
 * - console noise (log, info, debug) off in production builds; warnings and errors stay;
 * - WebGL context loss: the loop stops and a "restoring graphics" card shows; on restore the page reloads into the
 *   autosave path (Three.js cannot rebuild every GPU resource in place reliably).
 */
let shown = false;

/** The friendly error screen. Exported for tests and for code that catches a fatal error itself. */
export function showErrorScreen(message: string): void {
  if (shown || typeof document === 'undefined') return;
  shown = true;
  const el = document.createElement('div');
  el.setAttribute('role', 'alertdialog');
  el.style.cssText =
    'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;' +
    'background:#05060df2;color:#e8f6ff;font:600 16px/1.4 system-ui,sans-serif;text-align:center';
  const safe = message.replace(/[<>&]/g, '').slice(0, 160);
  el.innerHTML =
    '<div style="font:900 italic clamp(26px,6vw,44px) system-ui;color:#fff;text-shadow:0 0 18px #ff2a9d">' + t('guard.title') + '</div>' +
    '<div style="max-width:440px;opacity:.85">' + t('guard.body') + '</div>' +
    `<code style="max-width:90vw;opacity:.5;font-size:12px;word-break:break-word">${safe}</code>`;
  const btn = (label: string, fn: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'min-width:200px;min-height:48px;font:800 15px system-ui;letter-spacing:2px;text-transform:uppercase;color:#e8f6ff;background:#0a0d1c;border:1px solid #18d8ff;border-radius:8px;cursor:pointer';
    b.addEventListener('click', fn);
    return b;
  };
  el.append(btn(t('guard.reload'), () => location.reload()), btn(t('guard.continue'), () => { el.remove(); shown = false; }));
  document.body.append(el);
}

/** Install once at startup. `prod` silences the chatty console methods. */
export function installGuard(prod: boolean): void {
  if (prod) {
    const quiet = (): void => undefined;
    const c = console as unknown as Record<string, unknown>;
    for (const k of ['log', 'info', 'debug']) c[k] = quiet;
  }
  window.addEventListener('error', (e) => {
    if (e.error || e.message) showErrorScreen(String(e.error?.message ?? e.message));
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string } | undefined;
    // failed optional loads (models, worklets, plugins) are handled where they are made; only real bugs reach here
    if (r && /fetch|load|import|network/i.test(String(r.message ?? r))) return;
    showErrorScreen(String(r?.message ?? r));
  });
}

/** Stop rendering while the GPU context is lost; reload once it comes back. */
export function watchContextLoss(canvas: HTMLCanvasElement, stop: () => void, beforeReload: () => void): void {
  let card: HTMLDivElement | null = null;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); // allows the browser to restore it
    stop();
    card = document.createElement('div');
    card.textContent = t('guard.restoring');
    card.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9998;padding:14px 20px;background:#0a0d1cf2;border:1px solid #18d8ff88;border-radius:10px;color:#e8f6ff;font:700 16px system-ui';
    document.body.append(card);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    card?.remove();
    beforeReload();
    location.reload();
  });
}
