import type { SaveStore } from '../core/save';
import { FINISHES } from '../data/loadout';
import { CARS } from '../data/cars';
import { h, button } from './uiKit';

export function buildLoadoutList(store: SaveStore, onBack: () => void): HTMLElement {
  const root = h('div', 'rb-layer dim');
  root.append(h('div', 'rb-title', 'Loadouts'));
  for (const car of CARS) {
    const saved = store.data.loadouts[car.id];
    const card = h('div', 'rb-card');
    card.append(h('div', 'rb-label', car.name));
    if (!saved) {
      card.append(h('div', '', 'default'));
    } else {
      card.append(h('span', 'rb-chip', FINISHES[saved.finish].name));
      const d = (t: string): HTMLElement => { const e = h('div', '', t); e.style.color = 'var(--text-dim)'; return e; };
      card.append(d(`${saved.vinyl.kind ?? 'plain'} · ${saved.rim.design} ${saved.rim.size}"`));
      card.append(d(['spoiler', 'splitter', 'skirts', 'hood'].map((s) => saved.parts[s] ?? 'stock').join(' · ')));
      card.append(d(`tint ${saved.tint} · stance ${saved.stance}`));
      const plate = h('div', '', saved.plate);
      plate.style.cssText = 'font-family:monospace;color:var(--text-dim)';
      card.append(plate);
    }
    root.append(card);
  }
  root.append(button('Back', onBack));
  return root;
}
