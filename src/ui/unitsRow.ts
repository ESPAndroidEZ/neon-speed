import { getUnit, setUnit } from '../game/speedUnit';
import type { SpeedUnit } from '../game/speedUnit';
import { button, h } from './uiKit';
import { t } from '../i18n';

/** Settings row: show speeds in km/h or mph. */
export function unitsRow(): HTMLElement {
  const row = h('div', 'rb-row', `<span class="rb-lbl">${t('drv.units')}</span>`);
  const refresh = (): void => row.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.dataset.lv === getUnit()));
  for (const u of ['kmh', 'mph'] as SpeedUnit[]) {
    const b = button(u === 'mph' ? 'MPH' : 'KM/H', () => { setUnit(u); refresh(); });
    b.dataset.lv = u;
    b.style.minWidth = '90px';
    row.append(b);
  }
  refresh();
  return row;
}
