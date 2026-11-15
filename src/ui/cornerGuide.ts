import { racingLine, speedProfile, type RacingLine } from '../physics/aiLine';
import type { TrackSample } from '../types/game';
import { t } from '../i18n';

const CSS = `
.rb-cg{position:fixed;left:50%;top:calc(max(14px,env(safe-area-inset-top),2vh) + clamp(40px,6vh,56px));transform:translateX(-50%);
display:flex;align-items:center;gap:10px;padding:6px 14px 6px 10px;border-radius:12px;background:#05081299;pointer-events:none;
font:800 clamp(13px,1.8vw,17px)/1 system-ui,sans-serif;letter-spacing:.04em;color:#e8f6ff;opacity:0;transition:opacity .25s,color .15s,border-color .15s;border:2px solid #ffffff33}
.rb-cg svg{width:clamp(26px,3.4vw,36px);height:clamp(26px,3.4vw,36px);fill:none;stroke:currentColor;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}
.rb-cg small{display:block;font-size:.72em;opacity:.75;margin-top:3px;font-weight:700}
.rb-cg.warn{color:#ffc23d;border-color:#ffc23d}
.rb-cg.brake{color:#ff3b4e;border-color:#ff3b4e;animation:rb-cg-pulse .35s ease-in-out infinite alternate}
@keyframes rb-cg-pulse{from{transform:translateX(-50%) scale(1)}to{transform:translateX(-50%) scale(1.08)}}
`;
// arrow turning right; mirrored for left. Tighter corners bend the arrow more.
const ARROWS = ['M8 30 V18 Q8 8 18 8 H26 M21 3 L27 8 L21 13', 'M8 30 V14 Q8 8 14 8 H26 M21 3 L27 8 L21 13', 'M10 30 V20 Q10 6 24 6 M18 2 L24 6 L19 11'];

/**
 * Corner guide: the next corner's direction and severity (HAIRPIN / SHARP, or FAST when you are too quick for it) with its distance, and a
 * speed warning from the same speed profile the AI uses, scaled to the weather grip: white = fine,
 * amber EASE = lift now, red BRAKE = brake now or you will not make it. Reads only; allocation free per frame.
 */
export class CornerGuide {
  readonly el = document.createElement('div');
  private readonly path: SVGPathElement;
  private readonly text = document.createElement('div');
  private line: RacingLine | null = null;
  private profile = new Float32Array(0);
  private samples: readonly TrackSample[] | null = null;
  private grip = -1;
  private aBrake = 8;
  private lastKey = '';
  enabled = true;

  constructor(parent: HTMLElement) {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.el.className = 'rb-cg';
    this.el.innerHTML = '<svg viewBox="0 0 32 32"><path/></svg>';
    this.path = this.el.querySelector('path') as SVGPathElement;
    this.el.append(this.text);
    parent.append(style, this.el);
  }

  /** (Re)build for a track and weather grip. Cheap to call every frame: only rebuilds when either changes. */
  prepare(samples: readonly TrackSample[], grip: number): void {
    if (samples === this.samples && Math.abs(grip - this.grip) < 0.02) return;
    this.samples = samples;
    this.grip = grip;
    this.line = racingLine(samples, grip > 0.7 ? 1.7 : 2.4);
    if (this.profile.length !== this.line.n) this.profile = new Float32Array(this.line.n);
    this.aBrake = 7.5 * Math.max(0.45, grip);
    speedProfile(this.line, { aLat: 9 * grip, aBrake: this.aBrake, aAccel: 6, vMax: 90 }, this.profile);
  }

  /** index: the car's track sample; speed m/s. Hides the guide when no corner is within 180 m. */
  update(index: number, speed: number): void {
    const l = this.line;
    if (!l || !this.enabled) return this.show(false);
    const n = l.n;
    const look = Math.ceil(180 / l.ds);
    let start = -1;
    for (let i = 1; i < look; i++) if (l.k[(index + i) % n] > 1 / 75) { start = i; break; }
    if (start < 0) return this.show(false);
    let kMax = 0, turn = 0, vMin = 999;
    for (let i = start; i < start + Math.ceil(120 / l.ds); i++) {
      const j = (index + i) % n;
      if (l.k[j] < 1 / 110) break;
      kMax = Math.max(kMax, l.k[j]);
      turn += l.ks[j];
      vMin = Math.min(vMin, this.profile[j]);
    }
    const dist = start * l.ds;
    const radius = 1 / Math.max(kMax, 1e-4);
    const sev = radius < 12 ? 2 : radius < 30 ? 1 : 0; // racing-line radius (tests/lab/corner-radii): plaza 10 m, city 90s 14-29 m
    // deceleration needed to reach the corner speed by the corner entry
    const need = speed > vMin ? (speed * speed - vMin * vMin) / (2 * Math.max(dist, 4)) : 0;
    const state = need > this.aBrake * 0.8 ? 'brake' : need > this.aBrake * 0.45 ? 'warn' : '';
    if (sev === 0 && !state) return this.show(false);
    const kind = t(['cg.fast', 'cg.sharp', 'cg.hairpin'][sev] as 'cg.fast');
    const word = state === 'brake' ? t('cg.brake') : state === 'warn' ? t('cg.ease') : kind;
    const left = turn < 0; // ks > 0 is a RIGHT turn (tests/lab/turn-sign.mts)
    const key = `${state}|${sev}|${left}|${Math.round(dist / 10)}|${word}`;
    this.show(true);
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.el.className = `rb-cg${state ? ' ' + state : ''}`;
    this.path.setAttribute('d', ARROWS[sev]);
    this.path.style.transform = left ? 'scaleX(-1)' : '';
    this.path.style.transformOrigin = '16px 16px';
    this.text.innerHTML = `${word}<small>${state ? kind + ' ' : ''}${t(left ? 'cg.left' : 'cg.right')} · ${Math.round(dist / 10) * 10} m</small>`;
  }

  private show(v: boolean): void {
    const o = v ? '1' : '0';
    if (this.el.style.opacity !== o) this.el.style.opacity = o;
  }
}
