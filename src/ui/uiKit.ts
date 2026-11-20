import { THEME_CSS } from './theme';
import { MENU_CSS } from './menuCss';
import { getLang } from '../i18n';

let injected = false;

export function injectCss(): void {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = THEME_CSS + MENU_CSS;
  document.head.appendChild(s);
}

/** The NEON SPEED title treatment (styles in ui/theme). */
export function wordmark(): HTMLElement {
  return h('h1', 'rb-wm', '<em>NEON</em> <strong>SPEED</strong>');
}

export function h(tag: string, cls = '', html = ''): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export function button(label: string, onClick: () => void, cls = ''): HTMLButtonElement {
  const b = h('button', `rb-btn ${cls}`.trim(), label) as HTMLButtonElement;
  b.addEventListener('click', onClick);
  return b;
}

export const money = (n: number): string => (getLang() === 'es' ? `${n.toLocaleString('de-DE')} $` : `$${n.toLocaleString('en-US')}`); // Spanish: 1.200 $
export const lapText = (t: number | null): string => (t === null ? '--' : `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`);

/** Small transient message at the bottom centre. */
export function toast(text: string, ms = 3500): void {
  injectCss();
  const t = h('div', 'rb-toast', text);
  document.body.appendChild(t);
  window.setTimeout(() => t.remove(), ms);
}
