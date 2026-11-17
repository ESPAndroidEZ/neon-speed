import { carNav, navButton } from './carNav';
import { REV_TEST } from '../audio/revTest';
import { CARS, GLOWS, PAINTS, type CarSpec } from '../data/cars';
import type { SaveStore } from '../core/save';
import type { CarVisual } from '../world/proceduralCar';
import { setYawOverride } from '../world/modelPrefs';
import { modelStatus, statusListeners } from '../world/carFactory';
import { lookRows } from './garageLook';
import { clamp01, hex, soundTest, statsOf } from './garageParts';
import { button, h, money } from './uiKit';
import { onLangChange, t, tx } from '../i18n';
import { garageLayout } from './garageConfig';
import { speedText } from '../game/speedUnit';

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

/** Dev-only GLB yaw calibration row and nose arrow (`?calib` in a dev build). */
const CALIB = import.meta.env.DEV && new URLSearchParams(location.search).has('calib');

/** Browsed car index and when the language last changed (registered at import time, so it runs before the menu rebuilds the screen). */
let browsed = -1;
let langAt = -1e9;
onLangChange(() => { langAt = performance.now(); });

/** Car select with live stat bars, paint, underglow, buying, and GLB yaw calibration. */
export function buildGarage(d: GarageDeps): HTMLElement {
  const root = h('div', 'rb-layer');
  // desktop: panel on the left, car on the right; narrow screens: bottom sheet
  const wide = garageLayout(window.innerWidth) === 'side';
  root.style.justifyContent = wide ? 'center' : 'flex-end';
  root.style.alignItems = wide ? 'flex-start' : 'center';
  root.style.padding = wide ? '0 0 0 max(24px,3vw)' : '0 0 2vh';
  const panel = h('div', 'rb-panel rb-garage');
  panel.style.cssText += ';width:min(400px,92vw);max-height:88vh;overflow:auto;text-align:center';
  root.append(panel);
  let idx = Math.max(0, CARS.findIndex((c) => c.id === d.store.data.selected));
  if (performance.now() - langAt < 400 && browsed >= 0) idx = browsed; // rebuilt by a language switch: keep the browsed car
  browsed = idx;
  const goPrev = (): void => { REV_TEST.stop(); d.visual()?.calibrate?.setArrow(false); idx = browsed = (idx + CARS.length - 1) % CARS.length; render(); };
  const goNext = (): void => { REV_TEST.stop(); d.visual()?.calibrate?.setArrow(false); idx = browsed = (idx + 1) % CARS.length; render(); };
  carNav(root, goPrev, goNext); // keys + swipe, no arrow glyphs
  const watch = window.setInterval(() => { if (!root.isConnected) { REV_TEST.stop(); d.visual()?.calibrate?.setArrow(false); window.clearInterval(watch); } }, 400);
  let yaw = 0;
  let lookOpen = false; // the appearance panel is collapsed until asked for
  let shown = d.store.data.selected; // the menu already put the selected car on show

  const paintOf = (c: CarSpec): number => d.store.data.paint[c.id] ?? c.color;
  const glowOf = (c: CarSpec): number => d.store.data.glow[c.id] ?? GLOWS[0];
  const bar = (label: string, v: number, text: string): string =>
    `<div class="rb-row" style="justify-content:space-between;flex-wrap:nowrap"><span style="min-width:100px;flex:none;text-align:left;white-space:nowrap">${label}</span><div class="rb-bar"><i style="width:${Math.round(clamp01(v) * 100)}%"></i></div><span style="width:92px;white-space:nowrap;text-align:right;opacity:.8">${text}</span></div>`;
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
  const small = (label: string, f: () => void): HTMLButtonElement => {
    const b = button(label, f);
    b.style.minWidth = '56px';
    b.style.padding = '8px 10px';
    return b;
  };

  const calibration = (c: CarSpec): HTMLElement | null => {
    const cal = d.visual()?.calibrate;
    if (!cal) return null;
    if (!CALIB) { cal.setArrow(false); return null; } // dev tool only (?calib): no arrow in the real garage
    cal.setArrow(true);
    yaw = cal.getYaw();
    const row = h('div', 'rb-row');
    const label = h('span', 'rb-sub', '');
    const set = (r: number): void => {
      yaw = r;
      cal.setYaw(r);
      setYawOverride(c.id, r);
      label.textContent = `Model yaw ${Math.round((r * 180) / Math.PI)}°`;
    };
    label.textContent = `Model yaw ${Math.round((yaw * 180) / Math.PI)}°`;
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
    const badge = h('span', '', t(st2 === 'glb' ? 'garage.glb' : st2 === 'procedural' ? 'garage.procedural' : 'garage.checking'));
    badge.style.cssText = `margin-left:8px;padding:1px 7px;border-radius:9px;font-size:10px;letter-spacing:1px;text-transform:uppercase;border:1px solid ${st2 === 'glb' ? '#7dff9a' : '#ffb347'};color:${st2 === 'glb' ? '#7dff9a' : '#ffb347'}`;
    const brand = h('div', 'rb-sub', c.brand);
    if (import.meta.env.DEV) brand.append(badge); // model status: dev only
    panel.append(brand, title, h('div', 'rb-blurb', tx(c.blurb)));
    if (c.tuning.v2) panel.append(h('div', 'rb-note', tx(c.tuning.v2.spec.character))); // layout character (data/carSpecs)
    if (st2 === 'procedural' && import.meta.env.DEV) panel.append(h('div', 'rb-note', t('garage.putGlb', { id: c.id }))); // asset hint: dev only
    panel.insertAdjacentHTML('beforeend', bar(t('garage.accel'), 1 - (st.accel - 3.8) / 3, `${st.accel.toFixed(1)} s`) + bar(t('garage.top'), (st.topKph - 180) / 120, speedText(st.topKph)) + bar(t('garage.grip'), (st.grip - 1) / 0.7, st.grip.toFixed(2)) + bar(t('garage.slide'), st.slide / 1.2, st.slide.toFixed(2)));
    panel.append(
      h('div', 'rb-sub', t('garage.paint')),
      swatches(PAINTS, paintOf(c), (p) => {
        if (owned) d.store.setPaint(c.id, p);
        else d.store.data.paint[c.id] = p; // preview only until bought
        d.visual()?.setPaint(p);
        render();
      }),
      h('div', 'rb-sub', t('garage.underglow')),
      swatches(GLOWS, glowOf(c), (g) => {
        if (owned) d.store.setGlow(c.id, g);
        else d.store.data.glow[c.id] = g;
        d.visual()?.setUnderglow(g);
        render();
      }),
    );
    const toggle = small(t(lookOpen ? 'garage.appearanceOpen' : 'garage.appearance'), () => {
      lookOpen = !lookOpen;
      render();
    });
    toggle.style.width = '100%';
    panel.append(toggle);
    if (lookOpen) panel.append(lookRows(d.store, c.id, owned, (l) => d.visual()?.setAppearance?.(l, paintOf(c)), () => d.preview(c, paintOf(c), glowOf(c))));
    const cal = calibration(c);
    if (cal) panel.append(cal);
    const row = h('div', 'rb-row');
    row.style.flexWrap = 'nowrap';
    row.append(navButton('prev', goPrev));
    if (owned) {
      const sel = d.store.data.selected === c.id;
      const b = button(t(sel ? 'garage.selected' : 'garage.select'), () => { d.store.select(c.id); render(); }, sel ? '' : 'hot');
      b.style.minWidth = '100px';
      row.append(b);
    } else {
      const buy = button(t('garage.buy', { price: money(c.price) }), () => {
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
    const back = button(t('common.back'), () => { REV_TEST.stop(); d.visual()?.calibrate?.setArrow(false); d.onBack(); });
    back.style.minWidth = '80px';
    back.style.padding = '8px 10px';
    row.append(navButton('next', goNext), back);
    panel.append(row, soundTest(c.id));
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
