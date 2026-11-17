import type { RaceResult } from '../core/raceResult';
import type { Game } from '../game/game';
import { ACHIEVEMENTS, loadAch, recordAchievements } from '../game/achievements';
import { loadStats } from '../game/driverStats';
import { raceStats } from '../game/raceStats';
import { t } from '../i18n';
import { h, toast } from './uiKit';

/** After the driver record counted a race: unlock what it earned and toast each new badge (staggered after the results fade in). */
export function announceAchievements(r: RaceResult, game: Game, carId: string): void {
  const fresh = recordAchievements({
    result: r, weather: game.weather, trackId: game.setup?.trackId ?? 'kestrel', carId: game.setup?.car.id ?? carId,
    near: raceStats.near, slip: raceStats.slip, style: raceStats.style, bestCombo: raceStats.bestCombo, topKph: raceStats.topKph,
  }, loadStats());
  fresh.forEach((id, i) => window.setTimeout(() => toast(t('ach.unlocked', { name: t(`ach.${id}` as 'ach.win') })), 2200 + i * 2000));
}

/** Badge grid for the Crew screen: unlocked ones lit, locked ones dim with how to get them. Built on open. */
export function achievementsCard(): HTMLElement {
  const s = loadAch();
  const wrap = h('div', '', `<div class="rb-sub" style="margin-top:14px">${t('ach.title')} · ${t('ach.count', { n: s.got.length, total: ACHIEVEMENTS.length })}</div>`);
  const box = h('div', 'rb-row');
  box.style.cssText += ';margin:8px 0 4px;gap:8px';
  for (const a of ACHIEVEMENTS) {
    const on = s.got.includes(a.id), k = `ach.${a.id}` as 'ach.win';
    const c = h('div', 'rb-card', `<div style="font-weight:900;font-size:14px;color:${on ? 'var(--hot, #ff2a9d)' : 'inherit'}">${t(k)}</div><div class="rb-sub" style="font-size:11px">${t(`${k}.d` as 'ach.win.d')}</div>`);
    c.style.cssText += `;cursor:default;width:150px;padding:8px 10px;opacity:${on ? 1 : 0.45}`;
    box.append(c);
  }
  wrap.append(box);
  return wrap;
}
