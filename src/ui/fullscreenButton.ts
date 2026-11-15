import type { FullscreenControl } from '../core/fullscreen';
import { isStandalone } from '../core/fullscreen';
import { ICONS } from './icons';
import { h, injectCss } from './uiKit';

const CSS = `
.rb-fs{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:44px;min-height:44px;padding:0 12px;font:800 13px system-ui,sans-serif;
letter-spacing:.08em;text-transform:uppercase;color:#e8f6ff;background:#0a0d1ccc;border:1px solid #18d8ff88;border-radius:10px;cursor:pointer;pointer-events:auto;touch-action:manipulation}
.rb-fs svg{font-size:20px;flex:none}.rb-fs.icon{padding:0;width:44px}.rb-fs.icon span{display:none}
.rb-fs:hover,.rb-fs:focus-visible{background:#18d8ff33;outline:none}
.rb-a2hs{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:70;max-width:min(92vw,420px);display:flex;gap:12px;align-items:center;
padding:12px 14px;background:#0a0d1cf2;border:1px solid #18d8ff88;border-radius:12px;color:#e8f6ff;font:600 14px/1.35 system-ui,sans-serif}
.rb-a2hs svg{font-size:28px;flex:none;color:#18d8ff}.rb-a2hs button{margin-left:auto;min-width:44px;min-height:44px;background:none;border:0;color:#fff;font-size:20px;cursor:pointer}
`;

/** One-time "Add to Home Screen" card for iPhone Safari (no Fullscreen API there). `force` shows it again (button tap). */
export function showHomescreenHint(force = false): void {
  injectCss();
  try {
    if (!force && localStorage.getItem('rb-a2hs') === '1') return;
    localStorage.setItem('rb-a2hs', '1');
  } catch {
    /* no storage: show it anyway */
  }
  if (isStandalone() || document.querySelector('.rb-a2hs')) return;
  const card = h('div', 'rb-a2hs', `${ICONS.homescreen}<div>For full screen: tap <b>Share</b>, then <b>Add to Home Screen</b>, and start the game from the new icon.</div>`);
  const x = h('button', '', ICONS.close) as HTMLButtonElement;
  x.setAttribute('aria-label', 'Close');
  x.addEventListener('click', () => card.remove());
  card.append(x);
  document.body.append(card);
  window.setTimeout(() => card.remove(), 12000);
}

let styled = false;

/**
 * A full-screen toggle: the icon and label always follow the real state (Esc included). `icon` makes it a 44 px
 * square for the HUD. On iPhone it becomes "Add to Home Screen"; in the native app, or when already installed
 * as a home-screen app, it returns null (nothing to show).
 */
export function fullscreenButton(fs: FullscreenControl, icon = false): HTMLButtonElement | null {
  if (fs.mode === 'native' || fs.mode === 'none' || (fs.mode === 'homescreen' && isStandalone())) return null;
  if (!styled) {
    styled = true;
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.append(s);
  }
  const b = h('button', `rb-fs${icon ? ' icon' : ''}`) as HTMLButtonElement;
  b.type = 'button';
  const paint = (on: boolean): void => {
    const label = fs.mode === 'homescreen' ? 'Add to Home Screen' : on ? 'Exit full screen' : 'Full screen';
    b.innerHTML = `${fs.mode === 'homescreen' ? ICONS.homescreen : on ? ICONS.fullscreenExit : ICONS.fullscreen}<span>${label}</span>`;
    b.setAttribute('aria-label', label);
    b.title = label;
    b.dataset.state = on ? 'on' : 'off';
  };
  paint(fs.active);
  const off = fs.onChange((on) => {
    if (b.isConnected) paint(on);
    else if (b.dataset.seen) off(); // menus rebuild their buttons: an old one unsubscribes on the next change
  });
  requestAnimationFrame(() => {
    if (b.isConnected) b.dataset.seen = '1';
  });
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (fs.mode === 'homescreen') showHomescreenHint(true);
    else void fs.toggle().then(() => paint(fs.active));
  });
  return b;
}
