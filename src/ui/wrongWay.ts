import { isPhone } from '../core/quality';
import type { Engine } from '../core/engine';
import { newWrongWay, wrongWayUpdate } from '../game/wrongWayLogic';
import type { Game } from '../game/game';
import { t } from '../i18n';

const CSS = `.rb-ww{position:fixed;left:50%;top:30vh;transform:translateX(-50%);padding:8px 20px;border-radius:12px;background:#050812cc;border:3px solid var(--red,#ff3b4e);
color:var(--red,#ff3b4e);font:900 clamp(18px,3vw,30px)/1.1 system-ui,sans-serif;letter-spacing:.08em;text-align:center;pointer-events:none;opacity:0;transition:opacity .2s;animation:rb-ww .5s ease-in-out infinite alternate}
.rb-ww small{display:block;font-size:.5em;letter-spacing:.06em;color:#e8f6ff;margin-top:4px;font-weight:700}
.rb-ww.on{opacity:1}
@keyframes rb-ww{from{box-shadow:0 0 0 #ff3b4e00}to{box-shadow:0 0 22px #ff3b4e88}}
:root[data-calm] .rb-ww{animation:none}`;

/** "WRONG WAY" banner (with the reset key on keyboards) after a spin leaves the player driving against the road. */
export function attachWrongWay(engine: Engine, game: Game): void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const el = document.createElement('div');
  el.className = 'rb-ww';
  el.setAttribute('role', 'alert');
  (document.getElementById('hud') ?? document.body).append(el);
  const mem = newWrongWay();
  const phone = isPhone();
  let shown = false;
  const paint = (): void => {
    el.innerHTML = `${t('ww.title')}${phone ? '' : `<small>${t('ww.hint')}</small>`}`;
  };
  paint();
  engine.onFrame((_a, dt) => {
    const rm = game.rm;
    const p = game.player;
    const live = game.state === 'RACING' && rm.phase === 'RACING' && !game.paused && !p.finished;
    let on = false;
    if (live) {
      const v = p.car.state.velocity;
      const tg = rm.track.samples[p.contact.hit.index].tangent;
      on = wrongWayUpdate(mem, dt, v.x, v.z, tg.x, tg.z);
    } else if (mem.time > 0) {
      mem.time = 0;
      mem.on = false;
    }
    if (on !== shown) {
      shown = on;
      el.classList.toggle('on', on);
    }
  });
}
