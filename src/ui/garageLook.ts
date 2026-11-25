import type { SaveStore } from '../core/save';
import { CALIPERS, defaultLoadout, FINISHES, FINISH_IDS, GLOW_PATTERNS, HEADLIGHTS, type Loadout } from '../data/loadout';
import { PAINTS } from '../data/cars';
import { PART_SLOTS, PARTS } from '../world/carParts';
import { RIM_IDS } from '../world/rims';
import { VINYL_IDS } from '../world/vinylLayer';
import { button, h, money } from './uiKit';
import { buyItem, ownsItem, VINYL_PRICE } from '../core/shopItems';
import { paintCash } from './glowShop';
import { t, tx } from '../i18n';
import type { StringKey } from '../i18n';

/** Translated display name of a vinyl, rim, part or glow id. */
const lookName = (id: string): string => t(`lookid.${id}` as StringKey);

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/**
 * Garage appearance panel: finish, vinyl (pattern, colour, scale, number), rims (design, size, colour), tint, headlights, underglow
 * pattern, calipers, stance and plate. `live` re-applies cheap changes on the showing car; `rebuild` re-creates the car (rims).
 */
export function lookRows(store: SaveStore, carId: string, owned: boolean, live: (l: Loadout) => void, rebuild: () => void): HTMLElement {
  const l: Loadout = structuredClone(store.data.loadouts[carId] ?? defaultLoadout()); // a working copy: previews never leak into the save
  let ownedKind = l.vinyl.kind; // the vinyl on the car when the panel opened is owned (core/shopItems ownsItem)
  const root = h('div');
  const has = (k: string | null): boolean => !k || k === ownedKind || ownsItem(store, carId, `vinyl:${k}`);
  const commit = (heavy = false): void => {
    const keep = structuredClone(l);
    if (!has(keep.vinyl.kind)) keep.vinyl.kind = ownedKind; // an unbought vinyl only shows on the car
    if (owned) store.setLoadout(carId, keep);
    else store.data.loadouts[carId] = keep; // preview only until bought
    if (heavy) rebuild();
    else live(l);
  };
  const label = (text: string): void => void root.append(h('div', 'rb-sub', text));
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
    const row = h('div', 'rb-row', `<span class="rb-lbl" style="font-size:12px">${name}</span>`);
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
  label(t('look.finish'));
  chips(FINISH_IDS.map((id) => ({ id, name: tx(FINISHES[id].name) })), l.finish, (id) => { l.finish = id as Loadout['finish']; commit(); });
  label(t('look.vinyl'));
  const buyBox = h('div', 'rb-row');
  const refreshBuy = (): void => {
    buyBox.replaceChildren();
    const k = l.vinyl.kind;
    if (!k || has(k) || !owned) return;
    const short = store.data.cash < VINYL_PRICE;
    const b = button(t(short ? 'shop.noCash' : 'shop.buyVinyl', { price: money(VINYL_PRICE) }), () => { if (buyItem(store, carId, `vinyl:${k}`)) { ownedKind = k; commit(); refreshBuy(); paintCash(store); root.querySelectorAll('button').forEach((x) => { if (x.textContent === `${lookName(k)} $`) x.textContent = lookName(k); }); } }, short ? '' : 'hot');
    b.disabled = short;
    buyBox.append(b, h('span', 'rb-sub', t('shop.preview')));
  };
  chips([{ id: '', name: t('look.none') }, ...VINYL_IDS.map((id) => ({ id, name: lookName(id) + (has(id) ? '' : ' $') }))], l.vinyl.kind ?? '', (id) => { l.vinyl.kind = id || null; commit(); refreshBuy(); });
  root.append(buyBox);
  refreshBuy();
  swatches(PAINTS, l.vinyl.color, (c) => { l.vinyl.color = c; commit(); });
  slider(t('look.scale'), 0.5, 2, 0.1, l.vinyl.scale, (v) => (l.vinyl.scale = v));
  slider(t('look.rotate'), -90, 90, 5, l.vinyl.rotation, (v) => (l.vinyl.rotation = v));
  for (const slot of PART_SLOTS) {
    label(t(`look.slot.${slot}`));
    chips([{ id: '', name: t('look.stock') }, ...Object.keys(PARTS[slot]).map((id) => ({ id, name: lookName(id) }))], l.parts[slot] ?? '', (id) => {
      if (id) l.parts[slot] = id;
      else delete l.parts[slot];
      commit(slot === 'spoiler'); // the stock spoiler is part of the body: rebuild
    });
  }
  label(t('look.rims'));
  chips(RIM_IDS.map((id) => ({ id, name: lookName(id) })), l.rim.design, (id) => { l.rim.design = id; commit(true); });
  slider(t('look.size'), 17, 21, 1, l.rim.size, (v) => (l.rim.size = v), true);
  swatches([0xc4c8d4, 0x14141a, 0xffd27d, 0xff2a9d, 0x18d8ff, 0xc41a1a], l.rim.color, (c) => { l.rim.color = c; commit(); });
  slider(t('look.tint'), 0, 0.9, 0.05, l.tint, (v) => (l.tint = v));
  label(t('look.headlights'));
  swatches(HEADLIGHTS, l.headlight, (c) => { l.headlight = c; commit(); });
  label(t('look.glowPattern'));
  chips(GLOW_PATTERNS.map((id) => ({ id, name: lookName(id) })), l.glowPattern, (id) => { l.glowPattern = id as Loadout['glowPattern']; commit(); });
  label(t('look.calipers'));
  swatches(CALIPERS, l.caliper, (c) => { l.caliper = c; commit(); });
  slider(t('look.stance'), -1, 1, 0.1, l.stance, (v) => (l.stance = v));
  const plate = h('input') as HTMLInputElement;
  plate.value = l.plate;
  plate.maxLength = 8;
  plate.style.cssText = 'width:110px;text-transform:uppercase;font:700 14px monospace;text-align:center';
  plate.addEventListener('change', () => { l.plate = plate.value.toUpperCase(); commit(); });
  root.append(h('div', 'rb-sub', t('look.plate')), plate);
  return root;
}
