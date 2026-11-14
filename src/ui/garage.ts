import { CARS, GLOWS, PAINTS, type CarSpec } from '../data/cars';
import type { SaveStore } from '../core/save';
import { measureCar, type CarStats } from '../physics/carStats';
import type { CarVisual } from '../world/proceduralCar';
import { setYawOverride } from '../world/modelPrefs';
import { modelStatus, statusListeners } from '../world/carFactory';
import { button, h, money } from './uiKit';

export interface GarageDeps {
  store: SaveStore;
  /** Show this car as the backdrop (rebuilds the 3D car). */
  preview: (car: CarSpec, paint: number, glow: number) => void;
  /** The visual currently on show, for live paint/glow changes and yaw calibration. */
  visual: () => CarVisual | null;
  /** Register a callback fired when a GLB replaces the procedural body. */
  onSwap: (fn: (() => void) | null) => void;
  onBack: () => void;
}

const statCache = new Map<string, CarStats>();
const statsOf = (c: CarSpec): CarStats => {
  let s = statCache.get(c.id);
  if (!s) statCache.set(c.id, (s = measureCar(c.tuning)));
  return s;
};
const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
const clamp01 = (v: number): number => Math.max(0.04, Math.min(1, v));

/** Car select with live stat bars, paint, underglow, buying, and GLB yaw calibration. */
export function buildGarage(d: GarageDeps): HTMLElement {
  const root = h('div', 'rb-layer');
  // desktop: panel on the left, car on the right; narrow screens: bottom sheet
  const wide = window.innerWidth > 800;
  root.style.justifyContent = wide ? 'center' : 'flex-end';
  root.style.alignItems = wide ? 'flex-start' : 'center';
  root.style.padding = wide ? '0 0 0 max(24px,3vw)' : '0 0 2vh';
  const panel = h('div', 'rb-card');
  panel.style.cssText += ';cursor:default;width:min(400px,92vw);box-sizing:border-box;max-height:88vh;overflow:auto';
  root.append(panel);
  let idx = Math.max(0, CARS.findIndex((c) => c.id === d.store.data.selected));
  let yaw = 0;
  let shown = d.store.data.selected; // the menu already put the selected car on show

  const paintOf = (c: CarSpec): number => d.store.data.paint[c.id] ?? c.color;
  const glowOf = (c: CarSpec): number => d.store.data.glow[c.id] ?? GLOWS[0];
  const bar = (label: string, v: number, text: string): string =>
    `<div class="rb-row" style="justify-content:space-between;flex-wrap:nowrap"><span style="width:100px;text-align:left;white-space:nowrap">${label}</span><div class="rb-bar"><i style="width:${Math.round(clamp01(v) * 100)}%"></i></div><span style="width:92px;white-space:nowrap;text-align:right;opacity:.8">${text}</span></div>`;
  const swatches = (list: readonly number[], cur: number, pick: (c: number) => void): HTMLElement => {
    const row = h('div', 'rb-row');
    row.style.margin = '6px 0';
    for (const p of list) {
      const s = h('div', `rb-sw${p === cur ? ' on' : ''}`);
      s.style.background = hex(p);
      s.addEventListener('click', () => pick(p));
      row.append(s);
    }
    return row;
  };
  const small = (t: string, f: () => void): HTMLButtonElement => {
    const b = button(t, f);
    b.style.minWidth = '56px';
    b.style.padding = '8px 10px';
    return b;
  };

  const calibration = (c: CarSpec): HTMLElement | null => {
    const cal = d.visual()?.calibrate;
    if (!cal) return null;
    cal.setArrow(true);
    yaw = cal.getYaw();
    const row = h('div', 'rb-row');
    const label = h('span', 'rb-sub', '');
    const set = (r: number): void => {
      yaw = r;
      cal.setYaw(r);
      setYawOverride(c.id, r);
      label.textContent = `Model yaw ${Math.round((r * 180) / Math.PI)}°  (arrow = game nose)`;
    };
    label.textContent = `Model yaw ${Math.round((yaw * 180) / Math.PI)}°  (arrow = game nose)`;
    row.append(
      label,
      small('⟲', () => set(yaw - Math.PI / 36)),
      small('⟳', () => set(yaw + Math.PI / 36)),
      small('180°', () => set(yaw + Math.PI)),
      small('Copy', () => void navigator.clipboard?.writeText(`${c.id}: model: { yaw: ${yaw.toFixed(4)}, scale: ${c.model.scale} }`)),
    );
    return row;
  };

  const render = (): void => {
    const c = CARS[idx];
    const owned = d.store.owns(c.id);
    if (shown !== c.id) {
      d.preview(c, paintOf(c), glowOf(c));
      shown = c.id;
    }
    panel.innerHTML = '';
    const title = h('div', 'rb-title', c.name);
    title.style.fontSize = c.name.length > 10 ? '26px' : '38px';
    const st = statsOf(c);
    const st2 = modelStatus(c.id);
    const badge = h('span', '', st2 === 'glb' ? 'GLB model' : st2 === 'procedural' ? 'procedural' : 'checking...');
    badge.style.cssText = `margin-left:8px;padding:1px 7px;border-radius:9px;font-size:10px;letter-spacing:1px;text-transform:uppercase;border:1px solid ${st2 === 'glb' ? '#7dff9a' : '#ffb347'};color:${st2 === 'glb' ? '#7dff9a' : '#ffb347'}`;
    const brand = h('div', 'rb-sub', c.brand);
    brand.append(badge);
    panel.append(brand, title, h('div', '', c.blurb));
    if (st2 === 'procedural') panel.append(h('div', 'rb-sub', `Put ${c.id}.glb in public/models/`));
    panel.insertAdjacentHTML('beforeend', bar('Acceleration', 1 - (st.accel - 3.8) / 3, `${st.accel.toFixed(1)} s`) + bar('Top speed', (st.topKph - 180) / 120, `${Math.round(st.topKph)} km/h`) + bar('Grip', (st.grip - 1) / 0.7, st.grip.toFixed(2)) + bar('Slides easily', st.slide / 1.2, st.slide.toFixed(2)));
    panel.append(
      h('div', 'rb-sub', 'Paint'),
      swatches(PAINTS, paintOf(c), (p) => {
        if (owned) d.store.setPaint(c.id, p);
        else d.store.data.paint[c.id] = p; // preview only until bought
        d.visual()?.setPaint(p);
        render();
      }),
      h('div', 'rb-sub', 'Underglow'),
      swatches(GLOWS, glowOf(c), (g) => {
        if (owned) d.store.setGlow(c.id, g);
        else d.store.data.glow[c.id] = g;
        d.visual()?.setUnderglow(g);
        render();
      }),
    );
    const cal = calibration(c);
    if (cal) panel.append(cal);
    const row = h('div', 'rb-row');
    row.style.flexWrap = 'nowrap';
    row.append(small('◀', () => { d.visual()?.calibrate?.setArrow(false); idx = (idx + CARS.length - 1) % CARS.length; render(); }));
    if (owned) {
      const sel = d.store.data.selected === c.id;
      const b = button(sel ? 'Selected' : 'Select', () => { d.store.select(c.id); render(); }, sel ? '' : 'hot');
      b.style.minWidth = '100px';
      row.append(b);
    } else {
      const buy = button(`Buy ${money(c.price)}`, () => {
        if (d.store.buy(c.id, c.price)) {
          d.store.setPaint(c.id, paintOf(c));
          d.store.setGlow(c.id, glowOf(c));
          d.store.select(c.id);
        }
        refreshCash();
        render();
      }, 'hot');
      buy.disabled = d.store.data.cash < c.price;
      buy.style.minWidth = '100px';
      buy.style.padding = '8px 6px';
      row.append(buy);
    }
    const back = button('Back', () => { d.visual()?.calibrate?.setArrow(false); d.onBack(); });
    back.style.minWidth = '80px';
    back.style.padding = '8px 10px';
    row.append(small('▶', () => { d.visual()?.calibrate?.setArrow(false); idx = (idx + 1) % CARS.length; render(); }), back);
    panel.append(row);
  };
  const refreshCash = (): void => {
    document.querySelectorAll('.rb-cash').forEach((el) => (el.textContent = money(d.store.data.cash)));
  };
  d.onSwap(() => {
    if (root.isConnected) render();
    else d.onSwap(null);
  });
  window.addEventListener('keydown', function nudge(e) {
    if (!root.isConnected) return window.removeEventListener('keydown', nudge);
    const cal = d.visual()?.calibrate;
    if (!cal || (e.key !== ',' && e.key !== '.')) return;
    const step = (e.shiftKey ? 1 : 5) * (Math.PI / 180) * (e.key === ',' ? -1 : 1);
    cal.setYaw(cal.getYaw() + step);
    setYawOverride(CARS[idx].id, cal.getYaw());
    render();
  });
  const rerender = (): void => {
    if (root.isConnected) render();
    else statusListeners.delete(rerender);
  };
  statusListeners.add(rerender);
  render();
  return root;
}
