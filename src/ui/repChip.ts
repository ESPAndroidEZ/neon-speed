import type { SaveStore } from '../core/save';
import { repBar } from '../core/rep';
import { h, money } from './uiKit';
import { t } from '../i18n';

/** Top-right header of the menus: the REP level with its bar, and the cash. */
export function menuHeader(store: SaveStore): HTMLElement {
  const bar = repBar(store.data.rep ?? 0);
  const root = h('div', 'rb-hdr');
  const rep = h('div', 'rb-rep', `<b>${t('rep.lv', { n: bar.level })}</b><i><u style="width:${Math.round(bar.frac * 100)}%"></u></i>`);
  rep.title = bar.need ? t('rep.tip', { into: bar.into, need: bar.need }) : t('rep.max');
  root.append(rep, h('div', 'rb-cash', money(store.data.cash)));
  return root;
}
