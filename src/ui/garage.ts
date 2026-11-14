import { CARS, PAINTS, type CarSpec } from '../data/cars';
import type { SaveStore } from '../core/save';
import { createDefaultTuning } from '../physics/carTuning';
import { button, h, money } from './uiKit';

export interface GarageDeps {
  store: SaveStore;
  /** Show this car (with this paint) as the backdrop. */
  preview: (car: CarSpec, paint: number) => void;
  onBack: () => void;
}

const base = createDefaultTuning();
const maxOf = (f: (c: CarSpec) => number): number => Math.max(...CARS.map(f));
const stat = (c: CarSpec, k: 'engineTorque' | 'gripRear' | 'mass'): number => c.tuning[k] ?? base[k];

/** Car select and paint, plus buying the next car with cash. */
export function buildGarage(d: GarageDeps): HTMLElement {
  const root = h('div', 'rb-layer');
  root.style.justifyContent = 'flex-end';
  root.style.paddingBottom = '28px';
  const panel = h('div', 'rb-card');
  panel.style.cursor = 'default';
  panel.style.width = 'min(520px,92vw)';
  panel.style.boxSizing = 'border-box';
  root.append(panel);
  let idx = Math.max(0, CARS.findIndex((c) => c.id === d.store.data.selected));

  const paintOf = (c: CarSpec): number => d.store.data.paint[c.id] ?? c.color;
  const bar = (label: string, v: number): string => `<div class="rb-row" style="justify-content:space-between"><span>${label}</span><div class="rb-bar"><i style="width:${Math.round(v * 100)}%"></i></div></div>`;

  const render = (): void => {
    const c = CARS[idx];
    const owned = d.store.owns(c.id);
    d.preview(c, paintOf(c));
    panel.innerHTML = '';
    const title = h('div', 'rb-title', c.name);
    title.style.fontSize = '44px';
    panel.append(h('div', 'rb-sub', c.brand), title);
    panel.append(h('div', '', c.blurb));
    panel.insertAdjacentHTML('beforeend', bar('Power', stat(c, 'engineTorque') / maxOf((x) => stat(x, 'engineTorque'))) + bar('Grip', stat(c, 'gripRear') / maxOf((x) => stat(x, 'gripRear'))) + bar('Weight', stat(c, 'mass') / maxOf((x) => stat(x, 'mass'))));
    const sw = h('div', 'rb-row');
    sw.style.margin = '12px 0';
    for (const p of PAINTS) {
      const s = h('div', `rb-sw${p === paintOf(c) ? ' on' : ''}`);
      s.style.background = `#${p.toString(16).padStart(6, '0')}`;
      s.addEventListener('click', () => {
        if (owned) d.store.setPaint(c.id, p);
        else d.store.data.paint[c.id] = p; // preview only, saved when bought
        render();
      });
      sw.append(s);
    }
    const row = h('div', 'rb-row');
    const arrow = (t: string, f: () => void): HTMLButtonElement => {
      const b = button(t, f);
      b.style.minWidth = '64px';
      return b;
    };
    row.append(arrow('◀', () => { idx = (idx + CARS.length - 1) % CARS.length; render(); }));
    if (owned) row.append(button(d.store.data.selected === c.id ? 'Selected' : 'Select', () => { d.store.select(c.id); render(); }, d.store.data.selected === c.id ? '' : 'hot'));
    else {
      const buy = button(`Buy ${money(c.price)}`, () => {
        if (d.store.buy(c.id, c.price)) {
          d.store.setPaint(c.id, paintOf(c));
          d.store.select(c.id);
        }
        refreshCash();
        render();
      }, 'hot');
      buy.disabled = d.store.data.cash < c.price;
      row.append(buy);
    }
    const back = button('Back', d.onBack);
    back.style.minWidth = '110px';
    row.append(arrow('▶', () => { idx = (idx + 1) % CARS.length; render(); }), back);
    panel.append(sw, row);
  };
  const refreshCash = (): void => {
    document.querySelectorAll('.rb-cash').forEach((c) => (c.textContent = money(d.store.data.cash)));
  };
  render();
  return root;
}
