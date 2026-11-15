import type { ControlScheme, ControlStore } from '../input/controlPrefs';
import { SCHEMES, SCHEME_LABEL } from '../input/controlPrefs';
import type { TiltInput } from '../input/tiltInput';
import { ICONS } from './icons';
import { button, h, injectCss, toast } from './uiKit';

const CSS = `
.rb-ob{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:#05060dd9;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));box-sizing:border-box}
.rb-ob .card{max-width:min(560px,100%);max-height:100%;overflow:auto;box-sizing:border-box;padding:clamp(14px,3vmin,26px);border:1px solid #18d8ff88;border-radius:14px;background:#0a0d1cf2;color:#e8f6ff;font:600 clamp(14px,1.2vmin + 9px,18px)/1.4 system-ui,sans-serif;text-align:center}
.rb-ob h3{margin:0 0 8px;font-size:1.3em;font-style:italic;letter-spacing:.04em}
.rb-ob .opts{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:14px}
.rb-ob .rb-btn{min-width:min(200px,100%);min-height:48px}
.rb-tut{position:fixed;left:50%;top:max(64px,calc(env(safe-area-inset-top) + 56px));transform:translateX(-50%);z-index:90;max-width:min(92vw,440px);display:flex;gap:10px;align-items:center;
padding:10px 12px;background:#0a0d1ce6;border:1px solid #18d8ff88;border-radius:12px;color:#e8f6ff;font:600 13px/1.35 system-ui,sans-serif}
.rb-tut button{min-width:44px;min-height:44px;background:none;border:0;color:#fff;font-size:20px;cursor:pointer;flex:none}
`;
let styled = false;
const style = (): void => {
  injectCss();
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.append(s);
};

const overlay = (html: string): { root: HTMLElement; card: HTMLElement } => {
  style();
  const root = h('div', 'rb-ob');
  const card = h('div', 'card', html);
  root.append(card);
  root.addEventListener('pointerdown', (e) => e.stopPropagation()); // never skips the intro behind it
  document.body.append(root);
  return { root, card };
};

/** "Hold the phone in your normal driving position, tap to calibrate." Resolves when done or skipped. */
export function calibrate(tilt: TiltInput): Promise<void> {
  return new Promise((done) => {
    const { root, card } = overlay(`<h3>Calibrate tilt</h3><div>Hold the phone in your normal driving position, then tap <b>Calibrate</b>.</div>`);
    const go = button('Calibrate', () => {
      if (!tilt.calibrate()) {
        toast(tilt.receiving ? 'Hold the phone more upright, like a steering wheel' : 'No motion data yet: move the phone a little');
        return;
      }
      root.remove();
      toast('Tilt calibrated');
      done();
    }, 'hot');
    card.append(h('div', 'opts'));
    card.lastElementChild?.append(go, button('Later', () => { root.remove(); done(); }));
  });
}

/** Switch to tilt: asks for motion permission (iOS) from this tap; on denial falls back to the touch wheel. */
export async function enableTilt(store: ControlStore, tilt: TiltInput, calib = true): Promise<boolean> {
  const r = await tilt.enable();
  if (r !== 'granted') {
    store.data.scheme = 'wheel';
    store.commit();
    toast(r === 'denied' ? 'Motion access was denied: using the touch wheel. (iOS: Settings > Safari > Motion & Orientation Access)' : 'This device has no tilt sensor: using the touch wheel', 6000);
    return false;
  }
  store.data.scheme = 'tilt';
  store.commit();
  if (calib) await calibrate(tilt);
  return true;
}

/** First-run chooser on touch devices: Tilt, Touch wheel or Buttons. */
export function chooseControls(store: ControlStore, tilt: TiltInput): void {
  const { root, card } = overlay(`<h3>How do you want to steer?</h3><div>Landscape works best. You can change this any time in Settings.</div>`);
  const opts = h('div', 'opts');
  for (const s of SCHEMES) {
    opts.append(button(SCHEME_LABEL[s], () => {
      store.data.chosen = true;
      root.remove();
      if (s === 'tilt') void enableTilt(store, tilt);
      else {
        store.data.scheme = s;
        store.commit();
      }
    }, s === 'tilt' ? 'hot' : ''));
  }
  card.append(opts);
}

const TUTORIAL: Record<ControlScheme, string> = {
  tilt: 'Turn the phone like a wheel to steer. Gas is automatic: BRAKE on the left, NITRO and HANDBRAKE on the right.',
  wheel: 'Drag anywhere on the lower left to steer. GAS and BRAKE on the right, NITRO and HANDBRAKE above your left thumb.',
  buttons: 'Left arrows steer. GAS and BRAKE on the right, NITRO and HANDBRAKE above the arrows.',
};

/** Small dismissible tip the first time a scheme is used in a race. */
export function controlsTutorial(store: ControlStore): void {
  const s = store.data.scheme;
  if (store.data.seen.includes(s) || document.querySelector('.rb-tut')) return;
  style();
  const tip = h('div', 'rb-tut', `<div>${TUTORIAL[s]}</div>`);
  const x = h('button', '', ICONS.close) as HTMLButtonElement;
  x.setAttribute('aria-label', 'Got it');
  const close = (): void => {
    tip.remove();
    if (!store.data.seen.includes(s)) store.data.seen.push(s);
    store.commit();
  };
  x.addEventListener('click', close);
  tip.append(x);
  document.body.append(tip);
  window.setTimeout(close, 9000);
}
