import { button, h } from './uiKit';
import { t } from '../i18n';

let lastTab: 'basic' | 'advanced' = 'basic';

/** Two panes with a tab bar on top: the few settings everyone needs, and the full list under Advanced. Remembers the tab while the game runs. */
export function settingsTabs(basic: HTMLElement, advanced: HTMLElement): HTMLElement {
  const root = h('div', 'rb-tabs');
  const bar = h('div', 'rb-tabbar');
  const tabs: Record<'basic' | 'advanced', HTMLButtonElement> = {
    basic: button(t('set.tabBasic'), () => show('basic')),
    advanced: button(t('set.tabAdvanced'), () => show('advanced')),
  };
  const show = (k: 'basic' | 'advanced'): void => {
    lastTab = k;
    basic.hidden = k !== 'basic';
    advanced.hidden = k !== 'advanced';
    for (const [id, b] of Object.entries(tabs)) b.classList.toggle('hot', id === k);
  };
  bar.append(tabs.basic, tabs.advanced);
  root.append(bar, basic, advanced);
  show(lastTab);
  return root;
}
