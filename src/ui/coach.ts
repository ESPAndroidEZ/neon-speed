import type { Engine } from '../core/engine';
import { isPhone } from '../core/quality';
import { COACH_STEPS, coachUpdate, newCoachMemory, newCoachRun, type CoachMemory } from '../game/coachLogic';
import type { Game } from '../game/game';
import { t } from '../i18n';

const KEY = 'ns.coach';
const CSS = `.rb-coach{position:fixed;left:50%;bottom:max(130px,18vh);transform:translateX(-50%);padding:8px 16px;border-radius:12px;background:#050812b3;
border:2px solid #18d8ff88;color:#e8f6ff;font:800 clamp(13px,1.8vw,17px)/1.2 system-ui,sans-serif;letter-spacing:.04em;pointer-events:none;opacity:0;transition:opacity .3s;white-space:nowrap}
.rb-coach.on{opacity:1}`;

function load(): CoachMemory {
  const m = newCoachMemory();
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { used?: unknown; shown?: unknown } | null;
    for (let i = 0; i < 4; i++) {
      m.used[i] = Array.isArray(o?.used) && o.used[i] === true;
      const n = Array.isArray(o?.shown) ? Number(o.shown[i]) : 0;
      m.shown[i] = Number.isFinite(n) ? Math.max(0, Math.min(9, n | 0)) : 0;
    }
  } catch {
    /* private mode or bad data: start fresh */
  }
  return m;
}

function store(m: CoachMemory): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ used: m.used, shown: m.shown }));
  } catch {
    /* ignore */
  }
}

/** One calm hint line in the first races (gas, brake, nitro, handbrake). Each vanishes for good once the player uses that control. Display only. */
export function attachCoach(engine: Engine, game: Game): void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const el = document.createElement('div');
  el.className = 'rb-coach';
  (document.getElementById('hud') ?? document.body).append(el);
  const mem = load();
  const run = newCoachRun();
  const touch = isPhone();
  let shown = -1;
  engine.onFrame((_a, dt) => {
    const rm = game.rm;
    const live = game.state === 'RACING' && rm.phase === 'RACING' && !game.paused && !game.player.finished;
    if (!live) {
      if (shown !== -1) el.classList.remove('on');
      shown = -1;
      return;
    }
    const tel = game.telemetry;
    const step = coachUpdate(mem, run, game.ctl, tel.raceTime, tel.speedKph, tel.nitroLevel, dt);
    if (step !== shown) {
      shown = step;
      if (step >= 0) el.textContent = t(`coach.${COACH_STEPS[step]}.${touch ? 'touch' : 'key'}`);
      el.classList.toggle('on', step >= 0);
    }
    if (mem.dirty) {
      mem.dirty = false;
      store(mem);
    }
  });
}
