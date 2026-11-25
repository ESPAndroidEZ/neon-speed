import { h } from './uiKit';

let el: HTMLElement | null = null, timer = 0;

/**
 * A short message card over the Free Drive cards (the HUD pop-up sits under the job card on phones): used for the locked
 * area message. Shows for `ms`, then hides; a new message replaces the old one.
 */
export function roamToast(text: string, color = '#ff5470', ms = 3200): void {
  if (typeof document === 'undefined') return; // physics tests in Node
  if (!el) {
    el = h('div', 'rb-panel');
    el.style.cssText = 'position:fixed;left:50%;top:calc(max(12px,env(safe-area-inset-top)) + 54px);transform:translateX(-50%);z-index:40;padding:8px 14px;font:700 14px var(--font,system-ui);pointer-events:none;display:none;max-width:calc(100vw - 32px);text-align:center';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.color = color;
  el.style.borderColor = color;
  el.style.display = 'block';
  clearTimeout(timer);
  timer = window.setTimeout(() => { if (el) el.style.display = 'none'; }, ms);
}
