import type { Engine } from '../core/engine';
import { computeGaps, newGaps } from '../game/gapLogic';
import type { Game } from '../game/game';

const CSS = `.rb-gap{position:absolute;right:var(--mr);top:calc(var(--mt) + clamp(76px,10.5vw,108px));text-align:right;font:800 clamp(12px,1.7vw,17px)/1.45 system-ui,sans-serif;white-space:nowrap;opacity:0;transition:opacity .25s}
.rb-gap.on{opacity:1}.rb-gap .up{color:var(--red,#ff3b4e)}.rb-gap .dn{color:var(--green,#3dff8a)}.rb-gap div{width:max-content;margin:3px 0 0 auto;padding:1px 10px;border-radius:8px;background:#050812bf}.rb-gap div:empty{display:none}`;

const fmt = (s: number): string => s.toFixed(1);

/** Under lap / position: the rival just ahead (red, how far you are behind) and just behind (green, how close they are), in seconds. */
export function attachGapTags(engine: Engine, game: Game): void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const el = document.createElement('div');
  el.className = 'rb-gap';
  el.innerHTML = '<div class="up"></div><div class="dn"></div>';
  (document.getElementById('hud') ?? document.body).append(el);
  const up = el.children[0] as HTMLElement, dn = el.children[1] as HTMLElement;
  const gaps = newGaps();
  let keyA = -1, keyB = -1;
  let shown = false;
  engine.onFrame(() => {
    const rm = game.rm;
    const live = game.state === 'RACING' && rm.phase === 'RACING' && !game.paused && !game.player.finished && rm.racers.length > 1;
    if (live !== shown) {
      shown = live;
      el.classList.toggle('on', live);
    }
    if (!live) return;
    computeGaps(rm.racers, game.player, rm.track.spacing, gaps);
    // numeric keys: a string is built only when that side changed (tenths of a second)
    const ka = (gaps.ahead + 1) * 1e4 + Math.round(gaps.aheadSec * 10);
    const kb = (gaps.behind + 1) * 1e4 + Math.round(gaps.behindSec * 10);
    if (ka !== keyA) {
      keyA = ka;
      up.textContent = gaps.ahead >= 0 ? `▲ ${rm.racers[gaps.ahead].name}  +${fmt(gaps.aheadSec)}` : '';
    }
    if (kb !== keyB) {
      keyB = kb;
      dn.textContent = gaps.behind >= 0 ? `▼ ${rm.racers[gaps.behind].name}  −${fmt(gaps.behindSec)}` : '';
    }
  });
}
