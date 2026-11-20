import type { CarInput, InputSource } from '../types/game';
import type { ControlPrefs, ControlScheme } from '../input/controlPrefs';
import { SteerRamp } from '../input/steerRamp';
import { ICONS } from './icons';
import { holdButton, place, TOUCH_CSS } from './touchButton';
import { applyLayout, enableDrag, type Layout } from './touchLayout';
import { manualNow } from '../physics/gearbox';
import { onLangChange, t } from '../i18n';

export interface TouchControls extends InputSource {
  /** Show or hide the overlay (the architect hides it in menus). */
  setVisible(v: boolean): void;
  /** Rebuild the layout for a scheme (tilt / touch wheel / buttons) and the auto-gas choice. */
  setScheme(p: Pick<ControlPrefs, 'scheme' | 'autoGas'> & Partial<Pick<ControlPrefs, 'layout' | 'btnScale'>>): void;
  /** Layout editor: while on, buttons are dragged (not pressed), the overlay stays above menus and `onMoved` fires after each drop. */
  setEditing(on: boolean, layout?: Layout, onMoved?: () => void): void;
  /** True from the grid until GO: tilt auto-gas is off and a GAS pedal shows, so the launch can be timed (set by game/inputSetup). */
  starting: boolean;
  /** Current layer (the editor measures the pedals from it). */
  readonly layer: HTMLElement;
  /** Speed for the digital-steering ramp of the Buttons scheme. */
  speedKph: number;
}

const ARROW_L = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M15.5 4 6 12l9.5 8z"/></svg>';
const ARROW_R = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M8.5 4 18 12l-9.5 8z"/></svg>';

/**
 * Phone controls, three schemes (landscape thumb zones, bottom-left and bottom-right):
 * - wheel (approved layout): LEFT thumb drags anywhere in the lower left to steer, NITRO + HANDBRAKE above it;
 *   RIGHT thumb GAS (big) and BRAKE.
 * - tilt: steering comes from input/tiltInput; LEFT a large BRAKE, RIGHT nitro, handbrake and a small pause.
 *   Gas is automatic unless the player switched auto-gas off (then a GAS pedal joins the right side).
 * - buttons: LEFT two steering arrows (ramped like the keyboard), RIGHT GAS + BRAKE, nitro/handbrake above the arrows.
 * Every button tracks its own pointer id, so any mix of fingers works.
 */
export function createTouchControls(container: HTMLElement, opts?: { onReset?: () => void; onPause?: () => void }): TouchControls {
  const isTouch = matchMedia('(pointer: coarse)').matches;
  let gas = 0, brake = 0, handbrake = false, nitro = false, visible = true;
  let stick = 0, left = false, right = false, auto = false, lastT = 0, editing = false, shiftUp = false, shiftDown = false;
  let stopDrag: (() => void) | null = null;
  const ramp = new SteerRamp();
  const root = document.createElement('div');
  root.className = 'rb-tc';
  root.addEventListener('contextmenu', (e) => e.preventDefault());
  const style = document.createElement('style');
  style.textContent = TOUCH_CSS;
  const layer = document.createElement('div');
  root.append(style, layer);
  if (!isTouch) root.style.display = 'none';
  container.appendChild(root);

  const release = (): void => {
    gas = brake = stick = 0;
    handbrake = nitro = left = right = shiftUp = shiftDown = false;
  };
  const tag = (el: HTMLDivElement, id: string): HTMLDivElement => {
    el.dataset.id = id; // the layout editor and saved layouts find buttons by this id
    return el;
  };
  const pedal = (k: 'gas' | 'brake', cls: string, label: string, sub = ''): HTMLDivElement =>
    tag(holdButton(cls, sub ? `${label}<small>${sub}</small>` : label, () => (k === 'gas' ? (gas = 1) : (brake = 1)), () => (k === 'gas' ? (gas = 0) : (brake = 0))), k);
  const n2o = (): HTMLDivElement => tag(holdButton('round n2o', t('pad.nitro'), () => { nitro = true; }, () => { nitro = false; }), 'nitro');
  const hb = (): HTMLDivElement => tag(holdButton('round hb', `${t('pad.hand')}<small>${t('pad.handSub')}</small>`, () => { handbrake = true; }, () => { handbrake = false; }), 'hb');
  const small = (cls: string, icon: string, fn?: () => void, label = ''): HTMLDivElement => {
    const b = tag(holdButton(`sm ${cls}`, icon, () => fn?.()), cls === 'rst' ? 'reset' : 'pause');
    b.setAttribute('aria-label', label);
    return b;
  };
  const S = { l: 'var(--sl)', r: 'var(--sr)', b: 'var(--sb)', u: 'var(--u)' };

  function wheelZone(): HTMLElement {
    const zone = document.createElement('div');
    zone.className = 'zone';
    const knob = document.createElement('div');
    knob.className = 'knob';
    const dot = document.createElement('i');
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = t('pad.drag');
    knob.append(dot);
    zone.append(knob, hint);
    let id: number | null = null, startX = 0;
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (id !== null) return;
      id = e.pointerId;
      startX = e.clientX;
      zone.setPointerCapture(e.pointerId);
      const r = zone.getBoundingClientRect();
      knob.style.left = `${e.clientX - r.left}px`;
      knob.style.top = `${e.clientY - r.top}px`;
      knob.style.opacity = '1';
      hint.style.display = 'none';
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const dx = Math.max(-55, Math.min(55, e.clientX - startX));
      stick = -dx / 55; // steer > 0 is LEFT
      dot.style.transform = `translateX(${dx}px)`;
    });
    const up = (e: PointerEvent): void => {
      if (e.pointerId !== id) return;
      id = null;
      stick = 0;
      dot.style.transform = '';
      knob.style.opacity = '0';
    };
    zone.addEventListener('pointerup', up);
    zone.addEventListener('pointercancel', up);
    return zone;
  }

  type SchemeArg = Pick<ControlPrefs, 'scheme' | 'autoGas'> & Partial<Pick<ControlPrefs, 'layout' | 'btnScale'>>;
  let lastP: SchemeArg | null = null;
  onLangChange(() => lastP && setScheme(lastP)); // labels follow the language
  function setScheme(p: SchemeArg): void {
    lastP = p;
    release();
    layer.replaceChildren();
    root.dataset.scheme = p.scheme;
    auto = p.scheme === 'tilt' && p.autoGas;
    const reset = small('rst', ICONS.reset, opts?.onReset, t('pad.reset'));
    const pause = small('pse', ICONS.pause, opts?.onPause, t('pad.pause'));
    const scheme: ControlScheme = p.scheme;
    if (scheme === 'tilt') {
      const gasPedal = place(pedal('gas', p.autoGas ? 'pedal gas startgas' : 'pedal gas', t('pad.gas')), { right: S.r, bottom: S.b }); // with auto gas it only shows during the countdown
      const col = p.autoGas ? S.r : `calc(${S.r} + ${S.u} * 1.05 + 22px)`;
      layer.append(
        place(pedal('brake', 'big brk', t('pad.brake'), t('pad.reverse')), { left: S.l, bottom: S.b }),
        place(n2o(), { right: col, bottom: S.b }),
        place(hb(), p.autoGas ? { right: `calc(${S.r} + ${S.u} + 26px)`, bottom: `calc(${S.b} + ${S.u} * 0.45)` } : { right: col, bottom: `calc(${S.b} + ${S.u} + 24px)` }),
        place(pause, { right: p.autoGas ? `calc(${S.r} + ${S.u} / 2 - 22px)` : `calc(${S.r} + ${S.u} * 0.52 - 22px)`, bottom: `calc(${S.b} + ${S.u} * ${p.autoGas ? 1 : 1.55} + 30px)`, top: 'auto' }),
        place(reset, { left: S.l }),
      );
      layer.append(gasPedal);
    } else {
      const arrows = scheme === 'buttons';
      if (!arrows) layer.append(wheelZone());
      else layer.append(
        place(tag(holdButton('arrow', ARROW_L, () => { left = true; }, () => { left = false; }), 'arrowL'), { left: S.l, bottom: S.b }),
        place(tag(holdButton('arrow', ARROW_R, () => { right = true; }, () => { right = false; }), 'arrowR'), { left: `calc(${S.l} + ${S.u} * 1.15 + 18px)`, bottom: S.b }),
      );
      const above = arrows ? `calc(${S.b} + ${S.u} * 1.15 + 26px)` : `calc(${S.b} + min(40%, ${S.u} * 2.4))`;
      layer.append(
        place(pedal('gas', 'pedal gas', t('pad.gas')), { right: S.r, bottom: S.b }),
        place(pedal('brake', 'pedal brk', t('pad.brake'), t('pad.reverse')), { right: `calc(${S.r} + ${S.u} * 1.05 + 16px)`, bottom: S.b }),
        place(n2o(), { left: S.l, bottom: above }),
        place(hb(), { left: `calc(${S.l} + ${S.u} + 30px)`, bottom: arrows ? above : `calc(${S.b} + min(40%, ${S.u} * 2.4) + 26px)` }),
        place(pause, { left: S.l }),
        place(reset, { left: `calc(${S.l} + 56px)` }),
      );
    }
    const row = `calc(${S.b} + ${S.u} * ${scheme === 'tilt' ? 2.3 : 1.55} + 22px)`; // manual gearbox: + above the gas side, - next to it (shown only when Settings > Gearbox is manual)
    layer.append(
      place(tag(holdButton('shift', '+', () => { shiftUp = true; }, () => { shiftUp = false; }), 'shiftUp'), { right: S.r, bottom: row }),
      place(tag(holdButton('shift', '&minus;', () => { shiftDown = true; }, () => { shiftDown = false; }), 'shiftDown'), { right: `calc(${S.r} + ${S.u} * 0.72 + 16px)`, bottom: row }),
    );
    applyLayout(layer, p.scheme, p.layout ?? {}, p.btnScale ?? 1);
  }
  setScheme({ scheme: 'wheel', autoGas: true });

  const api: TouchControls = {
    speedKph: 0,
    starting: false,
    sample(out: CarInput): CarInput {
      const on = isTouch && visible;
      const now = performance.now();
      const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0;
      lastT = now;
      const digital = ramp.update((left ? 1 : 0) - (right ? 1 : 0), api.speedKph, dt);
      const gasByHand = !auto || api.starting; // tilt auto-gas only after GO: holding gas through the countdown timed the launch as EARLY (bogged)
      if ((auto && api.starting) !== (root.dataset.start === '1')) { if (auto && api.starting) root.dataset.start = '1'; else delete root.dataset.start; }
      out.throttle = on ? (gasByHand ? gas : brake > 0 ? 0 : 1) : 0;
      out.brake = on ? brake : 0;
      out.steer = on ? (root.dataset.scheme === 'buttons' ? digital : stick) : 0;
      out.handbrake = on && handbrake;
      out.shiftUp = on && shiftUp;
      out.shiftDown = on && shiftDown;
      if (root.dataset.manual !== (manualNow() ? '1' : undefined)) { if (manualNow()) root.dataset.manual = '1'; else delete root.dataset.manual; }
      out.nitro = on && nitro;
      return out;
    },
    setVisible(v: boolean): void {
      visible = v;
      if (!v) release();
      root.style.display = (v && isTouch) || editing ? '' : 'none';
    },
    setScheme,
    layer,
    setEditing(on: boolean, layout?: Layout, onMoved?: () => void): void {
      editing = on;
      stopDrag?.();
      stopDrag = on && layout ? enableDrag(root, () => lastP?.scheme ?? 'wheel', layout, () => onMoved?.()) : null;
      release();
      root.style.zIndex = on ? '2600' : '';
      root.style.display = on || (visible && isTouch) ? '' : 'none';
    },
    dispose: () => root.remove(),
  };
  return api;
}
