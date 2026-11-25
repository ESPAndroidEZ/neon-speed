import type { SaveStore } from '../core/save';
import { buyItem, GLOW_PRICE, ownsItem } from '../core/shopItems';
import { GLOWS } from '../data/cars';
import { button, h, money } from './uiKit';
import { t } from '../i18n';

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
/** After a purchase: every cash pill on screen shows the new total. */
export const paintCash = (store: SaveStore): void => document.querySelectorAll('.rb-cash').forEach((el) => { el.textContent = money(store.data.cash); });

/**
 * Underglow in the garage (Underground round, stage 4): a kit bought once per car. Without it the colours are a preview
 * (shown on the car, not saved, and no underglow in races); with it the pick is saved. `show` lights the car, `again` redraws.
 */
export function glowRows(store: SaveStore, carId: string, carOwned: boolean, show: (g: number) => void, again: () => void): HTMLElement[] {
  const kit = ownsItem(store, carId, 'glow');
  let pick = store.data.glow[carId] ?? GLOWS[0];
  const row = h('div', 'rb-row');
  row.style.margin = '6px 0';
  for (const g of GLOWS) {
    const s = h('div', `rb-sw${kit && g === pick ? ' on' : ''}`);
    s.style.background = hex(g);
    s.addEventListener('click', () => {
      pick = g;
      if (kit && carOwned) store.setGlow(carId, g);
      show(g);
      row.querySelectorAll('.rb-sw').forEach((x) => x.classList.toggle('on', x === s));
    });
    row.append(s);
  }
  const out: HTMLElement[] = [h('div', 'rb-sub', t('garage.underglow') + (kit ? '' : ` · ${t('shop.preview')}`)), row];
  if (!kit && carOwned) {
    const short = store.data.cash < GLOW_PRICE;
    const b = button(short ? t('shop.noCash', { price: money(GLOW_PRICE) }) : t('shop.buyGlow', { price: money(GLOW_PRICE) }), () => {
      if (buyItem(store, carId, 'glow')) { store.setGlow(carId, pick); show(pick); paintCash(store); again(); }
    }, short ? '' : 'hot');
    b.disabled = short;
    out.push(b);
  }
  return out;
}
