import { dailyChallenge, dayNumber } from '../data/dailyChallenge';
import { findTrackDef } from '../data/tracks';
import { t } from '../i18n';
import type { Weather } from '../types/game';
import { button } from './uiKit';

/** Main-menu button for today's challenge: shows the map and weather, starts that free race. */
export function dailyButton(start: (w: Weather, rivals: number, trackId: string) => void): HTMLButtonElement {
  const c = dailyChallenge(dayNumber(new Date()));
  const b = button(t('menu.daily'), () => start(c.weather, c.rivals, c.trackId));
  const sub = document.createElement('small');
  sub.style.cssText = 'display:block;opacity:.7;font-size:.62em;font-weight:600;letter-spacing:.04em';
  sub.textContent = `${findTrackDef(c.trackId).name} · ${t(`weather.${c.weather}`)}`;
  b.append(sub);
  return b;
}
