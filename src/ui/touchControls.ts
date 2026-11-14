import type { CarInput, InputSource } from '../types/game';

export interface TouchControls extends InputSource {
  /** Show or hide the overlay (the architect hides it in menus). */
  setVisible(v: boolean): void;
}

export function createTouchControls(
  container: HTMLElement,
  opts?: { onReset?: () => void; onPause?: () => void },
): TouchControls {
  const isTouch = matchMedia('(pointer: coarse)').matches;

  let steer = 0;
  let brake = 0;
  let handbrake = false;
  let nitro = false;
  let visible = true;

  const root = document.createElement('div');
  root.style.cssText =
    'position:fixed;inset:0;z-index:100;pointer-events:none;touch-action:none;' +
    '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;' +
    'padding:env(safe-area-inset-top) env(safe-area-inset-right) ' +
    'env(safe-area-inset-bottom) env(safe-area-inset-left);box-sizing:border-box;';
  if (!isTouch) root.style.display = 'none';

  // ── Virtual stick (left half, drag-anywhere) ──────────────────────
  const stick = document.createElement('div');
  stick.style.cssText =
    'position:absolute;left:0;top:0;width:50%;height:100%;pointer-events:auto;';

  let stickId: number | null = null;
  let startX = 0;

  const sDown = (e: PointerEvent) => {
    if (stickId !== null) return;
    stickId = e.pointerId;
    startX = e.clientX;
    stick.setPointerCapture(e.pointerId);
  };
  const sMove = (e: PointerEvent) => {
    if (e.pointerId !== stickId) return;
    steer = Math.max(-1, Math.min(1, -(e.clientX - startX) / 70));
  };
  const sUp = (e: PointerEvent) => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    steer = 0;
  };

  stick.addEventListener('pointerdown', sDown);
  stick.addEventListener('pointermove', sMove);
  stick.addEventListener('pointerup', sUp);
  stick.addEventListener('pointercancel', sUp);

  // ── Buttons (right side) ──────────────────────────────────────────
  const btns = document.createElement('div');
  btns.style.cssText =
    'position:absolute;right:16px;bottom:24px;display:flex;flex-direction:column;' +
    'gap:10px;align-items:center;pointer-events:auto;';

  function mkBtn(
    label: string,
    size: number,
    onDown: () => void,
    onUp?: () => void,
  ): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText =
      `width:${size}px;height:${size}px;border-radius:50%;display:flex;` +
      `align-items:center;justify-content:center;background:rgba(255,255,255,.15);` +
      `border:2px solid rgba(255,255,255,.4);color:#fff;` +
      `font:${Math.round(size * 0.3)}px sans-serif;pointer-events:auto;` +
      'touch-action:none;-webkit-user-select:none;user-select:none;' +
      '-webkit-touch-callout:none;';
    el.textContent = label;

    let id: number | null = null;
    const d = (e: PointerEvent) => {
      if (id !== null) return;
      id = e.pointerId;
      el.setPointerCapture(e.pointerId);
      onDown();
    };
    const u = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      onUp?.();
    };
    el.addEventListener('pointerdown', d);
    el.addEventListener('pointerup', u);
    el.addEventListener('pointercancel', u);
    return el;
  }

  btns.appendChild(mkBtn('BRK', 64, () => { brake = 1; }, () => { brake = 0; }));
  btns.appendChild(mkBtn('HB', 64, () => { handbrake = true; }, () => { handbrake = false; }));
  btns.appendChild(mkBtn('N2O', 64, () => { nitro = true; }, () => { nitro = false; }));
  btns.appendChild(mkBtn('R', 36, () => opts?.onReset?.()));
  btns.appendChild(mkBtn('II', 36, () => opts?.onPause?.()));

  root.appendChild(stick);
  root.appendChild(btns);
  container.appendChild(root);

  // ── InputSource ───────────────────────────────────────────────────
  function sample(out: CarInput): CarInput {
    if (!isTouch || !visible) {
      out.throttle = 0;
      out.brake = 0;
      out.steer = 0;
      out.handbrake = false;
      out.nitro = false;
      return out;
    }
    out.throttle = brake > 0 ? 0 : 1;
    out.brake = brake;
    out.steer = steer;
    out.handbrake = handbrake;
    out.nitro = nitro;
    return out;
  }

  function setVisible(v: boolean): void {
    visible = v;
    root.style.display = v && isTouch ? '' : 'none';
  }

  function dispose(): void {
    root.remove();
  }

  return { sample, setVisible, dispose };
}
