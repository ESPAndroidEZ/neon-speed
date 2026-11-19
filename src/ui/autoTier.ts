import type { Engine } from '../core/engine';
import { deviceHints, firstRunTier } from '../core/perfTier';
import { AutoQuality, isPhone } from '../core/quality';
import type { SaveStore } from '../core/save';
import { t } from '../i18n';
import { toast } from './uiKit';

/** First-run tier from the device, then the frame-time watchdog that drops a tier (with a toast) when it stays slow. */
export function installAutoTier(engine: Engine, store: SaveStore, kv: Storage | null): AutoQuality {
  const auto = new AutoQuality();
  auto.onDowngrade = (tier) => {
    store.data.settings.quality = tier;
    store.commit();
    toast(t('main.lowFps', { tier: t(`opt.${tier}`).toUpperCase() }));
  };
  auto.onUpgrade = (tier) => {
    store.data.settings.quality = tier;
    store.commit();
  };
  auto.ceiling = isPhone() ? 'medium' : 'high';
  engine.onFrame((_a, dt) => auto.update(dt, engine));
  if (!navigator.webdriver && firstRunTier(store.data.settings, deviceHints(engine.renderer.getContext(), isPhone()), kv)) store.commit(); // tests keep their tier
  return auto;
}
