import type { SaveStore } from '../core/save';
import { CALIPERS, defaultLoadout, FINISHES, FINISH_IDS, GLOW_PATTERNS, HEADLIGHTS, type Loadout } from '../data/loadout';
import { PAINTS } from '../data/cars';
import { PART_SLOTS, PARTS } from '../world/carParts';
import { RIM_IDS } from '../world/rims';
import { VINYL_IDS } from '../world/vinylLayer';
import { h } from './uiKit';

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/**
 * Garage appearance panel: finish, vinyl (pattern, colour, scale, number), rims (design, size, colour), tint, headlights, underglow
 * pattern, calipers, stance and plate. `live` re-applies cheap changes on the showing car; `rebuild` re-creates the car (rims).
 */
export function lookRows(store: SaveStore, carId: string, owned: boolean, live: (l: Loadout) => void, rebuild: () => void): HTMLElement {
  const l: Loadout = store.data.loadouts[carId] ?? defaultLoadout();
  const root = h('div');
  const commit = (heavy = false): void => {
    if (owned) store.setLoadout(carId, l);
    else store.data.loadouts[carId] = l; // preview only until bought
    if (heavy) rebuild();
    else live(l);
  };
  const label = (t: string): void => void root.append(h('div', 'rb-sub', t));
  const chips = (opts: readonly { id: string; name: string }[], cur: string, pick: (id: string) => void): void => {
    const row = h('div', 'rb-row');
    for (const o of opts) {
      const b = h('button', `rb-btn${o.id === cur ? ' hot' : ''}`, o.name);
      b.style.cssText += ';min-width:0;padding:6px 10px;font-size:11px';
      b.addEventListener('click', () => {
        pick(o.id);
        row.querySelectorAll('button').forEach((x) => x.classList.toggle('hot', x === b));
      });
      row.append(b);
    }
    root.append(row);
  };
  const swatches = (cols: readonly number[], cur: number, pick: (c: number) => void): void => {
    const row = h('div', 'rb-row');
    for (const c of cols) {
      const s = h('div', `rb-sw${c === cur ? ' on' : ''}`);
      s.style.background = hex(c);
      s.addEventListener('click', () => {
        pick(c);
        row.querySelectorAll('.rb-sw').forEach((x) => x.classList.toggle('on', x === s));
      });
      row.append(s);
    }
    root.append(row);
  };
  const slider = (name: string, min: number, max: number, step: number, cur: number, set: (v: number) => void, heavy = false): void => {
    const row = h('div', 'rb-row', `<span style="width:80px;font-size:12px">${name}</span>`);
    const i = h('input') as HTMLInputElement;
    i.type = 'range';
    i.min = String(min);
    i.max = String(max);
    i.step = String(step);
    i.value = String(cur);
    i.addEventListener('input', () => {
      set(parseFloat(i.value));
      if (!heavy) commit();
    });
    i.addEventListener('change', () => heavy && commit(true));
    row.append(i);
    root.append(row);
  };
  label('Finish');
  chips(FINISH_IDS.map((id) => ({ id, name: FINISHES[id].name })), l.finish, (id) => { l.finish = id as Loadout['finish']; commit(); });
  label('Vinyl');
  chips([{ id: '', name: 'none' }, ...VINYL_IDS.map((id) => ({ id, name: id }))], l.vinyl.kind ?? '', (id) => { l.vinyl.kind = id || null; commit(); });
  swatches(PAINTS, l.vinyl.color, (c) => { l.vinyl.color = c; commit(); });
  slider('Scale', 0.5, 2, 0.1, l.vinyl.scale, (v) => (l.vinyl.scale = v));
  slider('Rotate', -90, 90, 5, l.vinyl.rotation, (v) => (l.vinyl.rotation = v));
  for (const slot of PART_SLOTS) {
    label(slot === 'skirts' ? 'Side skirts' : slot[0].toUpperCase() + slot.slice(1));
    chips([{ id: '', name: 'stock' }, ...Object.keys(PARTS[slot]).map((id) => ({ id, name: id }))], l.parts[slot] ?? '', (id) => {
      if (id) l.parts[slot] = id;
      else delete l.parts[slot];
      commit(slot === 'spoiler'); // the stock spoiler is part of the body: rebuild
    });
  }
  label('Rims');
  chips(RIM_IDS.map((id) => ({ id, name: id })), l.rim.design, (id) => { l.rim.design = id; commit(true); });
  slider('Size', 17, 21, 1, l.rim.size, (v) => (l.rim.size = v), true);
  swatches([0xc4c8d4, 0x14141a, 0xffd27d, 0xff2a9d, 0x18d8ff, 0xc41a1a], l.rim.color, (c) => { l.rim.color = c; commit(); });
  slider('Window tint', 0, 0.9, 0.05, l.tint, (v) => (l.tint = v));
  label('Headlights');
  swatches(HEADLIGHTS, l.headlight, (c) => { l.headlight = c; commit(); });
  label('Underglow pattern');
  chips(GLOW_PATTERNS.map((id) => ({ id, name: id })), l.glowPattern, (id) => { l.glowPattern = id as Loadout['glowPattern']; commit(); });
  label('Brake calipers');
  swatches(CALIPERS, l.caliper, (c) => { l.caliper = c; commit(); });
  slider('Stance', -1, 1, 0.1, l.stance, (v) => (l.stance = v));
  const plate = h('input') as HTMLInputElement;
  plate.value = l.plate;
  plate.maxLength = 8;
  plate.style.cssText = 'width:110px;text-transform:uppercase;font:700 14px monospace;text-align:center';
  plate.addEventListener('change', () => { l.plate = plate.value.toUpperCase(); commit(); });
  root.append(h('div', 'rb-sub', 'Plate'), plate);
  return root;
}
