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

/** Small language switch pinned to the top-left of a screen (main menu), so the language can be changed after the first run. */
export function langCorner(): HTMLElement {
  const row = langRow(undefined, false);
  row.style.cssText = 'position:fixed;left:max(14px,env(safe-area-inset-left),2.5vw);top:max(14px,env(safe-area-inset-top),2vh);z-index:31;gap:6px;margin:0';
  row.querySelectorAll('button').forEach((b) => { b.style.minWidth = '0'; b.style.minHeight = '36px'; b.style.padding = '4px 12px'; b.style.fontSize = '13px'; });
  return row;
}
