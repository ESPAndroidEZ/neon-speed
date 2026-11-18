import { loadStats } from '../game/driverStats';
import { t } from '../i18n';
import { h } from './uiKit';

/** Time raced as "2 h 05 min" or "14 min". */
export function hoursMinutes(sec: number): string {
  const m = Math.floor(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
}

/** "Your record" strip for the Crew screen: lifetime races, wins, podiums, laps, time raced, cash and best drift. Built on open, not per frame. */
export function statsCard(): HTMLElement {
  const s = loadStats();
  const cells: [string, string][] = [
    [t('stats.races'), String(s.races)], [t('stats.wins'), String(s.wins)], [t('stats.podiums'), String(s.podiums)], [t('stats.dnf'), String(s.dnf)],
    [t('stats.laps'), String(s.laps)], [t('stats.time'), hoursMinutes(s.seconds)], [t('stats.cash'), `$${Math.round(s.cash).toLocaleString('en-US')}`],
    [t('stats.drift'), String(Math.round(s.bestDrift))],
  ];
  const box = h('div', 'rb-row');
  box.style.cssText += ';margin:14px 0 4px;gap:10px';
  for (const [label, value] of cells) {
    const c = h('div', 'rb-card', `<div class="rb-sub" style="font-size:11px">${label}</div><div style="font-weight:900;font-size:20px">${value}</div>`);
    c.style.cssText += ';cursor:default;min-width:96px;padding:8px 12px';
    box.append(c);
  }
  const wrap = h('div', '', `<div class="rb-sub" style="margin-top:14px">${t('stats.title')}</div>`);
  wrap.append(box);
  return wrap;
}
