import type { Engine } from '../core/engine';
import type { Game } from '../game/game';
import { raceStats } from '../game/raceStats';
import { t } from '../i18n';
import type { Hud } from './hud';
import { COMBO } from '../core/styleCombo';

const CSS = `.rb-combo{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 15vh);transform:translateX(-50%);z-index:6;pointer-events:none;
font:900 clamp(13px,2.4vmin,20px)/1 system-ui,sans-serif;letter-spacing:.08em;color:#fff;text-shadow:0 0 10px #ff2a9d,0 0 2px #000;opacity:0;transition:opacity .25s}
.rb-combo b{font-size:1.5em;color:#ffc23d;margin-right:.35em}.rb-combo i{display:block;height:3px;margin-top:5px;background:#ff2a9d;box-shadow:0 0 8px #ff2a9d;transform-origin:left;border-radius:2px}`;

/**
 * Style combo on the HUD: "x3 STYLE 1,240" with a draining timer bar while a chain runs, a pop-up when it banks or
 * breaks. Reads rm.rewards.combo (core/styleCombo) each frame; writes the DOM only when the shown values change.
 */
export function installComboHud(engine: Engine, game: Game, hud: Hud): void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const el = document.createElement('div');
  el.className = 'rb-combo';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<b></b><span></span><i></i>';
  document.body.append(el);
  const [mult, pts, bar] = [el.children[0] as HTMLElement, el.children[1] as HTMLElement, el.children[2] as HTMLElement];
  let seen = -1, shown = '', on = false, lastBar = -1;
  engine.onFrame(() => {
    const c = game.rm.rewards.combo, live = game.state === 'RACING' && !game.paused && c.timer > 0 && c.chain > 0;
    if (c.seq !== seen) {
      if (seen >= 0 && c.event === 'banked' && c.score > raceStats.style) hud.popUp(t('combo.banked', { n: (c.score - raceStats.style).toLocaleString() }), '#ffc23d');
      if (seen >= 0 && c.event === 'broken') hud.popUp(t('combo.lost'), '#ff5c7a');
      seen = c.seq;
      raceStats.style = c.score;
      raceStats.bestCombo = c.best;
    }
    if (live !== on) el.style.opacity = (on = live) ? '1' : '0';
    if (!live) return;
    const s = `x${Math.max(1, c.mult - 1)}|${Math.round(c.chain)}`;
    if (s !== shown) {
      shown = s;
      mult.textContent = `x${Math.max(1, c.mult - 1)}`;
      pts.textContent = `${t('combo.style')} ${Math.round(c.chain).toLocaleString()}`;
    }
    const k = Math.round((c.timer / COMBO.window) * 50) / 50;
    if (k !== lastBar) bar.style.transform = `scaleX(${(lastBar = k)})`;
  });
}
