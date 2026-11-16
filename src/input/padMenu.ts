import { newPadNav, PAD_BACK, PAD_DOWN, PAD_LEFT, PAD_OK, PAD_RIGHT, PAD_UP, padBits, primePadNav, stepPadNav } from './padNavLogic';

const FOCUSABLE = 'button:not([disabled]),input:not([disabled]),select:not([disabled])';
const CSS = ':root[data-padnav] :focus{outline:3px solid #18d8ff!important;outline-offset:3px}';

const key = (code: string): void => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true, cancelable: true }));
};

/** Move focus up or down the buttons and inputs of the topmost menu layer. Runs on a press only. */
function move(layer: Element, dir: 1 | -1): void {
  const items = Array.from(layer.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((e) => e.getClientRects().length > 0);
  if (items.length === 0) return;
  const at = items.indexOf(document.activeElement as HTMLElement);
  items[at < 0 ? (dir > 0 ? 0 : items.length - 1) : (at + dir + items.length) % items.length].focus({ preventScroll: false });
}

/** Sliders step with left/right; anything else tells the screen (the garage car picker listens for the arrow keys). */
function sideways(dir: 1 | -1): void {
  const el = document.activeElement;
  if (el instanceof HTMLInputElement && el.type === 'range') {
    const step = Number(el.step) || 1;
    el.value = String(Math.min(Number(el.max), Math.max(Number(el.min), Number(el.value) + dir * step)));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else key(dir > 0 ? 'ArrowRight' : 'ArrowLeft');
}

/**
 * Lets a gamepad drive the menus: d-pad or left stick moves focus, A presses, B goes back (Esc). Only runs while `active`
 * (no race in progress, since A is the handbrake while driving) and while a menu layer is on screen. Allocation happens on presses only.
 */
export class PadMenu {
  private readonly nav = newPadNav();
  private was = false;

  constructor() {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.append(st);
    const off = (): void => document.documentElement.removeAttribute('data-padnav');
    window.addEventListener('pointerdown', off, true);
    window.addEventListener('keydown', (e) => { if (e.isTrusted) off(); }, true);
  }

  private bits(): number {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      if (p && p.connected && p.buttons.length > 0) return padBits(p.buttons, p.axes);
    }
    return 0;
  }

  update(dt: number, active: boolean): void {
    if (!active || !document.querySelector('.rb-layer')) {
      this.was = false;
      return;
    }
    const down = this.bits();
    if (!this.was) {
      this.was = true;
      primePadNav(this.nav, down);
      return;
    }
    const fire = stepPadNav(this.nav, dt, down);
    if (fire === 0) return;
    const layer = Array.from(document.querySelectorAll('.rb-layer')).pop() as Element; // topmost = last in the page
    document.documentElement.setAttribute('data-padnav', '');
    if (fire & PAD_UP) move(layer, -1);
    if (fire & PAD_DOWN) move(layer, 1);
    if (fire & PAD_LEFT) sideways(-1);
    if (fire & PAD_RIGHT) sideways(1);
    if (fire & PAD_BACK) key('Escape');
    if (fire & PAD_OK) {
      const el = document.activeElement;
      if (el instanceof HTMLElement && layer.contains(el) && el.matches(FOCUSABLE) && !(el instanceof HTMLInputElement && el.type === 'range')) el.click();
      else key('Enter');
    }
  }
}
