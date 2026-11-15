import { chooseLang } from '../i18n/langPrefs';
import { getLang, LANGS, LANG_NAME, t } from '../i18n';
import { button, h } from './uiKit';

/** Language chooser row (one button per language, named in its own language). `after` runs once the switch is done. */
export function langRow(after?: () => void, withLabel = true): HTMLElement {
  const row = h('div', 'rb-row', withLabel ? `<span class="rb-lbl">${t('ctl.language')}</span>` : '');
  for (const l of LANGS) {
    const b = button(LANG_NAME[l], () => {
      chooseLang(l);
      after?.();
    }, l === getLang() ? 'hot' : '');
    b.style.minWidth = '110px';
    b.lang = l;
    row.append(b);
  }
  return row;
}
