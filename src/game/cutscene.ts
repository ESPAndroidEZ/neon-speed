import type { PerspectiveCamera } from 'three';
import { activeLine, clipAt, cutDuration, sampleCut, type CutSample, type Cutscene } from '../core/cutsceneTimeline';
import { SPEAKERS } from '../data/story';
import { STAGE } from '../world/stage';
import { button, h } from '../ui/uiKit';
import { t, tx } from '../i18n';
import type { Cast } from './cast';
import type { Game } from './game';

/**
 * Plays a cutscene (data/cutscenes*.ts) in the showroom: the camera follows the shots (core/cutsceneTimeline), the actors
 * stand around the player's car and play their clips, letterbox bars frame it, captions give the lines (always visible:
 * they ARE the dialogue), a chapter card opens the big ones. Skip with the button, Esc or Enter. The showroom camera hands
 * its per-frame update to `frame` while a cutscene runs, so the clock is the game's frame time.
 */
const CSS = `.rb-cut{position:fixed;inset:0;z-index:3500;pointer-events:none;font-family:system-ui,sans-serif;color:#fff}
.rb-cut .bar{position:absolute;left:0;right:0;height:11vh;background:#000;transition:transform .8s ease}
.rb-cut .top{top:0;transform:translateY(-100%)}.rb-cut .bot{bottom:0;transform:translateY(100%);display:flex;align-items:center;justify-content:center;padding:0 6vw}
.rb-cut.on .top,.rb-cut.on .bot{transform:none}
.rb-cut .cap{text-align:center;font-weight:700;font-size:clamp(14px,2.6vw,22px);line-height:1.3;text-shadow:0 0 8px #000;min-height:2.6em;opacity:0;transition:opacity .25s}
.rb-cut .cap.show{opacity:1}.rb-cut .cap b{display:block;font-size:.72em;letter-spacing:.22em;text-transform:uppercase;margin-bottom:2px}
.rb-cut .card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;opacity:0;transition:opacity .7s;text-align:center}
.rb-cut .card{background:radial-gradient(ellipse 75% 38% at 50% 50%,#000b,#0000 72%)}.rb-cut .card.show{opacity:1}.rb-cut .card i{font-style:normal;font-weight:800;letter-spacing:.4em;font-size:clamp(14px,2.8vw,24px);color:#fff;text-shadow:0 0 12px #18d8ff,0 0 4px #000}
.rb-cut .card strong{font-size:clamp(30px,8vw,84px);font-style:italic;font-weight:900;text-shadow:0 0 18px #ff2a9d,0 0 50px #ff2a9d88}
.rb-cut .skip{position:absolute;right:max(14px,env(safe-area-inset-right));top:calc(11vh + 10px);pointer-events:auto;min-width:0;padding:6px 14px;font-size:12px}
.rb-cut .fade{position:absolute;inset:0;background:#000;opacity:1;transition:opacity .9s}`;

export interface CutsceneDeps { game: Game; cast: Cast | null }

let current: CutscenePlayer | null = null;
export const getCutscenePlayer = (): CutscenePlayer | null => current;

export class CutscenePlayer {
  active = false;
  private readonly d: CutsceneDeps;
  private readonly s: CutSample = { px: 0, py: 0, pz: 0, lx: 0, ly: 0, lz: 0, fov: 45, shot: 0 };

  constructor(d: CutsceneDeps) {
    this.d = d;
    current = this;
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__rbCutscene = this;
  }

  /** Run `cs`, then call `done` (also when skipped). The caller has put the showroom car on stage. */
  play(cs: Cutscene, done: () => void): void {
    if (this.active) return;
    this.active = true;
    const { game, cast } = this.d;
    const total = cutDuration(cs.shots) + 0.8;
    const root = h('div', 'rb-cut');
    const style = h('style');
    style.textContent = CSS;
    const bot = h('div', 'bar bot'), cap = h('div', 'cap');
    bot.append(cap);
    const card = h('div', 'card');
    if (cs.card) card.append(h('i', '', tx(cs.card.kicker)), h('strong', '', tx(cs.card.title)));
    const fade = h('div', 'fade');
    const skip = button(t('cut.skip'), () => finish(), 'skip');
    root.append(style, h('div', 'bar top'), bot, card, skip, fade);
    document.body.append(root);
    let time = 0, over = false, lastLine: unknown = null;
    const lastClip = new Map<string, string>();
    cast?.setScene(cs.actors);
    if (cast) cast.scripted = true;
    requestAnimationFrame(() => { root.classList.add('on'); fade.style.opacity = '0'; });
    const key = (e: KeyboardEvent): void => {
      if (e.code === 'Escape' || e.code === 'Enter') { e.stopPropagation(); e.preventDefault(); finish(); }
    };
    window.addEventListener('keydown', key, true);
    const finish = (): void => {
      if (over) return;
      over = true;
      fade.style.opacity = '1';
      window.setTimeout(() => {
        window.removeEventListener('keydown', key, true);
        game.showroomCam.override = null;
        if (cast) { cast.scripted = false; cast.hideAll(); }
        root.remove();
        this.active = false;
        done();
      }, 700);
    };
    game.showroomCam.override = (cam: PerspectiveCamera, dt: number): void => {
      if (over) return;
      time += Math.min(dt, 0.1);
      const s = sampleCut(cs.shots, Math.min(time, total - 0.8), this.s);
      const sh = cs.shots[s.shot].shake ?? 0;
      const w = sh * 0.5;
      cam.position.set(STAGE.x + s.px + Math.sin(time * 21.7) * sh, s.py + Math.sin(time * 17.3) * sh * 0.6, STAGE.z + s.pz + Math.cos(time * 19.1) * sh);
      cam.lookAt(STAGE.x + s.lx + Math.sin(time * 13.1) * w, s.ly, STAGE.z + s.lz + Math.cos(time * 11.7) * w);
      if (Math.abs(cam.fov - s.fov) > 0.01) { cam.fov = s.fov; cam.updateProjectionMatrix(); }
      if (cast) for (const a of cs.actors) { const c = clipAt(a, time); if (lastClip.get(a.id) !== c) { lastClip.set(a.id, c); if (time > 0.05) cast.setClip(a.id, c); } }
      card.classList.toggle('show', time > 0.4 && time < 3.4);
      const ln = activeLine(cs.lines, time);
      if (ln !== lastLine) {
        lastLine = ln;
        cap.classList.toggle('show', ln !== null);
        if (ln) {
          const sp = SPEAKERS[ln.who as keyof typeof SPEAKERS];
          cap.replaceChildren(...(sp && ln.who !== 'narrator' ? [Object.assign(h('b'), { textContent: sp.name }), document.createTextNode(tx(ln.text))] : [document.createTextNode(tx(ln.text))]));
          const b = cap.querySelector('b');
          if (b && sp) b.style.color = `#${sp.color.toString(16).padStart(6, '0')}`;
        }
      }
      if (time >= total) finish();
    };
  }
}
