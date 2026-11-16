import type { SaveStore } from '../core/save';
import { ADVICE, affordableTip } from '../data/upgradeAdvice';
import { t, tx } from '../i18n';

/** One line for the results screen after a lost race: an upgrade the player can buy now and why it helps. Null when nothing is affordable. */
export function tuneTip(store: SaveStore): string | null {
  const tip = affordableTip(store.data.upgrades[store.data.selected] ?? {}, store.data.cash);
  if (!tip) return null;
  const why = tx(ADVICE[tip.id]);
  const cut = why.indexOf('. ');
  return t('res.tip', { name: tx(tip.name), price: tip.price.toLocaleString(), why: cut > 0 ? why.slice(0, cut + 1) : why });
}
