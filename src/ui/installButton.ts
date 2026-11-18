import { installKind, runInstall } from '../core/install';
import { t } from '../i18n';
import { showHomescreenHint } from './fullscreenButton';
import { button } from './uiKit';

/**
 * "Install app" menu button, or null when there is nothing to offer (already installed, native app, desktop without a
 * prompt). Android Chrome opens its install dialog; iPhone / iPad and other Android browsers get a short how-to card.
 */
export function installButton(): HTMLButtonElement | null {
  const kind = installKind();
  if (kind === 'none') return null;
  return button(t('install.btn'), () => {
    void runInstall().then((shown) => {
      if (!shown) showHomescreenHint(true, kind === 'ios' ? 'install.ios' : 'install.android');
    });
  });
}
