import { TEXT_SIZES, getTextSize, setTextSize } from './textScale';
import type { TextSize } from './textScale';
import { button, h } from './uiKit';
import { t } from '../i18n';

const LABEL: Readonly<Record<TextSize, string>> = { N: 'A', L: 'A+', XL: 'A++' };

/** Settings row: menu text size (normal, large, larger). */
export function textSizeRow(): HTMLElement {
  const row = h('div', 'rb-row', `<span class="rb-lbl">${t('drv.textSize')}</span>`);
  const refresh = (): void => row.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.dataset.lv === getTextSize()));
  for (const s of TEXT_SIZES) {
    const b = button(LABEL[s], () => { setTextSize(s); refresh(); });
    b.dataset.lv = s;
    b.style.minWidth = '70px';
    row.append(b);
  }
  refresh();
  return row;
}
