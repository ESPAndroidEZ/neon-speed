import { getSync, normalizeCode, showCode } from '../core/serverSync';
import { button, h, toast } from './uiKit';
import { t } from '../i18n';

/** Settings rows for server saving: the player code (copy it, or type another to load that progress here) and the sync state. */
export function playerCodeRows(): HTMLElement[] {
  const sync = getSync();
  if (!sync) return [h('div', 'rb-sub', t('sync.off'))]; // static hosting or the phone app: progress stays on this device
  const code = sync.code();
  const row = h('div', 'rb-row', `<span class="rb-lbl">${t('sync.code')}</span>`);
  const shown = h('b', '', showCode(code));
  shown.style.cssText += ';font-family:ui-monospace,monospace;letter-spacing:1px;user-select:text;-webkit-user-select:text';
  row.append(shown);
  const actions = h('div', 'rb-row');
  actions.append(
    button(t('sync.copy'), () => {
      void navigator.clipboard?.writeText(showCode(code)).then(() => toast(t('sync.copied')), () => undefined);
    }),
    button(t('sync.use'), () => {
      const v = window.prompt(t('sync.prompt'));
      if (v === null) return;
      const c = normalizeCode(v);
      if (!c) return void toast(t('sync.bad'));
      if (!window.confirm(t('sync.confirm'))) return;
      sync.switchTo(c);
      location.reload(); // the game starts again and loads that player's progress from the server
    }),
  );
  return [row, actions, h('div', 'rb-sub', t(`sync.${sync.status}` as 'sync.ok'))];
}
