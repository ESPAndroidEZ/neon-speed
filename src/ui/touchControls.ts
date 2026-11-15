import type { CarInput, InputSource } from '../types/game';

export interface TouchControls extends InputSource {
  /** Show or hide the overlay (the architect hides it in menus). */
  setVisible(v: boolean): void;
}

const CSS = `
.rb-tc{position:fixed;inset:0;z-index:100;pointer-events:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;
--sl:max(14px,env(safe-area-inset-left));--sr:max(14px,env(safe-area-inset-right));--sb:max(14px,env(safe-area-inset-bottom))}
.rb-tc .zone{position:absolute;left:0;bottom:0;width:48%;height:72%;pointer-events:auto}
.rb-tc .knob{position:absolute;width:118px;height:118px;margin:-59px 0 0 -59px;border-radius:50%;border:2px solid #18d8ff66;background:radial-gradient(#18d8ff22,#0000 70%);opacity:0;transition:opacity .15s}
.rb-tc .knob i{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px;border-radius:50%;background:#18d8ffcc;box-shadow:0 0 18px #18d8ff}
.rb-tc .hint{position:absolute;left:calc(var(--sl) + 24px);bottom:calc(var(--sb) + 30px);font:800 12px system-ui;letter-spacing:.12em;color:#ffffff66}
.rb-tc .b{position:absolute;display:flex;align-items:center;justify-content:center;flex-direction:column;pointer-events:auto;touch-action:none;
font:900 13px/1 system-ui,sans-serif;letter-spacing:.08em;color:#fff;background:#0b1024b3;border:2px solid var(--c);box-shadow:0 0 14px color-mix(in srgb,var(--c) 45%,transparent),inset 0 0 18px color-mix(in srgb,var(--c) 25%,transparent);
transition:transform .06s,background .06s;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.rb-tc .b small{font-size:9px;opacity:.7;margin-top:4px;letter-spacing:.14em}
.rb-tc .b.on{transform:scale(.93);background:color-mix(in srgb,var(--c) 55%,#0b1024);box-shadow:0 0 28px var(--c)}
.rb-tc .gas{right:var(--sr);bottom:var(--sb);width:96px;height:150px;border-radius:22px 22px 28px 28px;--c:#3dff8a}
.rb-tc .brk{right:calc(var(--sr) + 108px);bottom:var(--sb);width:88px;height:104px;border-radius:20px;--c:#ff3b4e}
.rb-tc .n2o{left:var(--sl);bottom:calc(var(--sb) + 40%);width:78px;height:78px;border-radius:50%;--c:#ff2a9d}
.rb-tc .hb{left:calc(var(--sl) + 88px);bottom:calc(var(--sb) + 40% + 26px);width:78px;height:78px;border-radius:50%;--c:#ffc23d}
.rb-tc .sm{top:max(12px,env(safe-area-inset-top));width:44px;height:44px;border-radius:12px;--c:#ffffff88;font-size:15px}
.rb-tc .sm{top:calc(max(12px,env(safe-area-inset-top)) + 34px)}.rb-tc .rst{left:calc(var(--sl) + 56px)}.rb-tc .pse{left:var(--sl)}
@media (max-height:420px){.rb-tc .gas{height:128px;width:88px}.rb-tc .brk{height:92px;width:80px;right:calc(var(--sr) + 98px)}.rb-tc .n2o,.rb-tc .hb{width:68px;height:68px}.rb-tc .hb{left:calc(var(--sl) + 78px)}}
`;

/**
 * Phone controls (landscape): RIGHT thumb = GAS (big) and BRAKE pedals; LEFT thumb = drag-anywhere steering in the
 * lower left, with NITRO and HANDBRAKE above it so the thumb can flick up for a drift. Short vibration on press where
 * supported. Steering keeps the floating-stick feel: it centres where the thumb lands.
 */
export function createTouchControls(container: HTMLElement, opts?: { onReset?: () => void; onPause?: () => void }): TouchControls {
  const isTouch = matchMedia('(pointer: coarse)').matches;
  let steer = 0, gas = 0, brake = 0, handbrake = false, nitro = false, visible = true;
  const buzz = (ms: number): void => void (navigator.vibrate?.(ms));

  const root = document.createElement('div');
  root.className = 'rb-tc';
  const style = document.createElement('style');
  style.textContent = CSS;
  root.append(style);
  if (!isTouch) root.style.display = 'none';

  // steering zone with a floating knob
  const zone = document.createElement('div');
  zone.className = 'zone';
  const knob = document.createElement('div');
  knob.className = 'knob';
  const dot = document.createElement('i');
  knob.append(dot);
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = '◀ DRAG TO STEER ▶';
  zone.append(knob, hint);
  let stickId: number | null = null;
  let startX = 0;
  zone.addEventListener('pointerdown', (e) => {
    if (stickId !== null) return;
    stickId = e.pointerId;
    startX = e.clientX;
    zone.setPointerCapture(e.pointerId);
    const r = zone.getBoundingClientRect();
    knob.style.left = `${e.clientX - r.left}px`;
    knob.style.top = `${e.clientY - r.top}px`;
    knob.style.opacity = '1';
    hint.style.display = 'none';
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stickId) return;
    const dx = Math.max(-55, Math.min(55, e.clientX - startX));
    steer = Math.max(-1, Math.min(1, -dx / 55)); // steer > 0 is LEFT
    dot.style.transform = `translateX(${dx}px)`;
  });
  const sUp = (e: PointerEvent): void => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    steer = 0;
    dot.style.transform = '';
    knob.style.opacity = '0';
  };
  zone.addEventListener('pointerup', sUp);
  zone.addEventListener('pointercancel', sUp);

  function button(cls: string, label: string, sub: string, down: () => void, up?: () => void): HTMLDivElement {
    const el = document.createElement('div');
    el.className = `b ${cls}`;
    el.innerHTML = sub ? `${label}<small>${sub}</small>` : label;
    let id: number | null = null;
    el.addEventListener('pointerdown', (e) => {
      if (id !== null) return;
      id = e.pointerId;
      el.setPointerCapture(e.pointerId);
      el.classList.add('on');
      buzz(12);
      down();
    });
    const u = (e: PointerEvent): void => {
      if (e.pointerId !== id) return;
      id = null;
      el.classList.remove('on');
      up?.();
    };
    el.addEventListener('pointerup', u);
    el.addEventListener('pointercancel', u);
    return el;
  }

  root.append(
    zone,
    button('gas', 'GAS', '', () => { gas = 1; }, () => { gas = 0; }),
    button('brk', 'BRAKE', 'REVERSE', () => { brake = 1; }, () => { brake = 0; }),
    button('n2o', 'NITRO', '', () => { nitro = true; }, () => { nitro = false; }),
    button('hb', 'HAND', 'BRAKE', () => { handbrake = true; }, () => { handbrake = false; }),
    button('sm rst', '↺', '', () => opts?.onReset?.()),
    button('sm pse', 'II', '', () => opts?.onPause?.()),
  );
  container.appendChild(root);

  function sample(out: CarInput): CarInput {
    const on = isTouch && visible;
    out.throttle = on ? gas : 0;
    out.brake = on ? brake : 0;
    out.steer = on ? steer : 0;
    out.handbrake = on && handbrake;
    out.nitro = on && nitro;
    return out;
  }

  function setVisible(v: boolean): void {
    visible = v;
    root.style.display = v && isTouch ? '' : 'none';
  }

  return { sample, setVisible, dispose: () => root.remove() };
}
