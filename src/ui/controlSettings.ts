import type { FullscreenControl } from '../core/fullscreen';
import type { ControlStore } from '../input/controlPrefs';
import { SCHEMES, SCHEME_LABEL } from '../input/controlPrefs';
import type { TiltInput } from '../input/tiltInput';
import { calibrate, enableTilt } from './controlsOnboard';
import { fullscreenButton } from './fullscreenButton';
import { button, h } from './uiKit';

export interface ControlRowsDeps {
  fs: FullscreenControl;
  controls: ControlStore;
  tilt: TiltInput;
}

/** Settings rows for the screen and the phone controls: full screen, scheme, and the tilt options. */
export function controlRows(d: ControlRowsDeps): HTMLElement[] {
  const c = d.controls.data;
  const rows: HTMLElement[] = [h('div', 'rb-sub', 'Screen and controls')];
  const fsBtn = fullscreenButton(d.fs);
  if (fsBtn) {
    const r = h('div', 'rb-row', '<span style="width:90px">Display</span>');
    r.append(fsBtn);
    rows.push(r);
  }
  const scheme = h('div', 'rb-row', '<span style="width:90px">Phone controls</span>');
  const tiltBox = h('div');
  tiltBox.style.cssText = 'display:flex;flex-direction:column;gap:10px;align-items:center';
  const refresh = (): void => {
    scheme.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.dataset.s === c.scheme));
    tiltBox.style.display = c.scheme === 'tilt' ? 'flex' : 'none';
  };
  for (const s of SCHEMES) {
    const b = button(SCHEME_LABEL[s], () => {
      c.chosen = true;
      if (s === 'tilt') void enableTilt(d.controls, d.tilt).then(refresh);
      else {
        c.scheme = s;
        d.controls.commit();
      }
      refresh();
    });
    b.dataset.s = s;
    b.style.minWidth = '120px';
    scheme.append(b);
  }
  const slider = (label: string, min: number, max: number, step: number, get: () => number, set: (v: number) => void): HTMLElement => {
    const r = h('div', 'rb-row', `<span style="width:90px">${label}</span>`);
    const i = h('input') as HTMLInputElement;
    i.type = 'range';
    i.min = String(min);
    i.max = String(max);
    i.step = String(step);
    i.value = String(get());
    i.addEventListener('input', () => set(parseFloat(i.value)));
    i.addEventListener('change', () => d.controls.commit());
    r.append(i);
    return r;
  };
  const check = (label: string, get: () => boolean, set: (v: boolean) => void): HTMLElement => {
    const r = h('label', 'rb-row', `<span style="width:90px">${label}</span>`);
    const i = h('input') as HTMLInputElement;
    i.type = 'checkbox';
    i.checked = get();
    i.addEventListener('change', () => {
      set(i.checked);
      d.controls.commit();
    });
    r.append(i);
    return r;
  };
  tiltBox.append(
    slider('Tilt sensitivity', 0.5, 2, 0.05, () => c.tilt.sens, (v) => { c.tilt.sens = v; }),
    slider('Full lock angle', 15, 60, 1, () => c.tilt.maxDeg, (v) => { c.tilt.maxDeg = v; }),
    check('Invert tilt', () => c.tilt.invert, (v) => { c.tilt.invert = v; }),
    check('Auto gas', () => c.autoGas, (v) => { c.autoGas = v; }),
    button('Recalibrate tilt', () => void calibrate(d.tilt)),
  );
  refresh();
  rows.push(scheme, tiltBox);
  return rows;
}
