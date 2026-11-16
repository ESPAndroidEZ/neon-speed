import { t } from '../i18n';
import { getUnit, toUnit, unitLabel } from '../game/speedUnit';
const CSS = `
.rb-gauge{position:relative;width:clamp(170px,22vw,250px);aspect-ratio:1;margin-left:auto}
.rb-gauge canvas{position:absolute;inset:0;width:100%;height:100%}
.rb-gauge .num{position:absolute;left:0;right:0;top:34%;text-align:center;font-size:clamp(40px,6.4vw,70px);font-style:italic;font-weight:900;letter-spacing:-2px;font-variant-numeric:tabular-nums;line-height:1}
.rb-gauge .num small{display:block;font-size:11px;letter-spacing:3px;opacity:.7;font-style:normal;margin-top:2px}
.rb-gauge .gear{position:absolute;left:0;right:0;bottom:15%;text-align:center;font-size:clamp(18px,2.6vw,28px);font-weight:900;font-style:italic;color:#18d8ff}
.rb-nitro-burst{position:absolute;right:6%;top:-10%;font-size:clamp(22px,3.4vw,40px);font-weight:900;font-style:italic;color:#fff;text-shadow:0 0 14px #ff2a9d,0 0 34px #ff2a9d;opacity:0;pointer-events:none}
.rb-nitro-burst.go{animation:rb-burst .7s var(--ease,ease-out) both}
@keyframes rb-burst{0%{opacity:0;transform:scale(.6) translateY(10px)}20%{opacity:1;transform:scale(1.15)}100%{opacity:0;transform:scale(1.5) translateY(-24px)}}
.rb-pop{position:absolute;left:50%;top:calc(var(--mt,18px) + 92px);transform:translateX(-50%);font-weight:900;font-style:italic;font-size:clamp(18px,min(3.4vw,5.5vh),38px);max-width:min(88vw,900px);text-align:center;white-space:normal !important;color:#ff2a9d;text-shadow:0 0 14px #ff2a9d;opacity:0;pointer-events:none;white-space:nowrap}
.rb-pop.go{animation:rb-pop 1.1s var(--ease,ease-out) both}
@keyframes rb-pop{0%{opacity:0;transform:translateX(-50%) scale(.5)}15%{opacity:1;transform:translateX(-50%) scale(1.2)}100%{opacity:0;transform:translateX(-50%) translateY(-34px) scale(1)}}
.rb-lines{position:absolute;inset:0;pointer-events:none;opacity:0;background:repeating-conic-gradient(from 0deg at 50% 52%,transparent 0 3.2deg,rgba(220,240,255,.11) 3.2deg 3.6deg);-webkit-mask-image:radial-gradient(circle at 50% 52%,transparent 48%,#000 100%);mask-image:radial-gradient(circle at 50% 52%,transparent 48%,#000 100%);animation:rb-spin 1.6s linear infinite}
.rb-shift{position:absolute;left:18%;right:18%;top:-2%;display:flex;gap:4%;justify-content:center;pointer-events:none}
.rb-shift i{flex:1;max-width:14%;aspect-ratio:1;border-radius:50%;background:#ffffff1c;transition:background .06s,box-shadow .06s}
.rb-shift i.on{background:#18d8ff;box-shadow:0 0 10px #18d8ff}.rb-shift i.on.y{background:#ffd23a;box-shadow:0 0 10px #ffd23a}.rb-shift i.on.r{background:#ff2a4a;box-shadow:0 0 12px #ff2a4a}
.rb-shift.fl i{animation:rb-shiftfl .12s steps(1) infinite}
@keyframes rb-shiftfl{50%{background:#ffffff1c;box-shadow:none}}
@media (prefers-reduced-motion:reduce){.rb-shift.fl i{animation:none}}
@keyframes rb-spin{to{background-position:0 0;transform:rotate(3.6deg)}}
`;

/**
 * Large tacho and speed gauge: a 270-degree arc with ticks and a redline zone, a gradient fill that follows the revs, a thin
 * outer arc for the nitro tank, the speed in the centre, the gear below and a NITRO burst when the nitro ignites.
 * Redraws only when a quantised value changes.
 */
export class ArcGauge {
  readonly el = document.createElement('div');
  private readonly cv = document.createElement('canvas');
  private readonly num = document.createElement('div');
  private readonly gear = document.createElement('div');
  private readonly burst = document.createElement('div');
  private readonly shift = document.createElement('div');
  private readonly leds: HTMLElement[] = [];
  private ledN = -1;
  private key = -1;
  private nitroWas = false;

  constructor() {
    this.el.className = 'rb-gauge';
    this.cv.width = this.cv.height = 500;
    this.num.className = 'num';
    this.gear.className = 'gear';
    this.burst.className = 'rb-nitro-burst';
    this.burst.textContent = t('pad.nitro');
    this.shift.className = 'rb-shift';
    for (let i = 0; i < 5; i++) { const d = document.createElement('i'); d.className = i < 2 ? '' : i < 4 ? 'y' : 'r'; this.leds.push(d); this.shift.append(d); }
    this.el.append(this.shift, this.cv, this.num, this.gear, this.burst);
  }

  static css(): string {
    return CSS;
  }

  update(kph: number, rpmFrac: number, gear: number, nitro: number, nitroActive: boolean): void {
    const shown = Math.round(toUnit(kph));
    const k = shown + (getUnit() === 'mph' ? 1e9 : 0) + 1000 * Math.round(rpmFrac * 60) + 1e5 * (gear + 2) + 1e7 * Math.round(nitro * 50); // numeric key: no string per frame
    if (nitroActive && !this.nitroWas) {
      this.burst.classList.remove('go');
      void this.burst.offsetWidth; // restart the animation
      this.burst.classList.add('go');
    }
    this.nitroWas = nitroActive;
    this.setShift(rpmFrac);
    if (k === this.key) return;
    this.key = k;
    this.num.innerHTML = `${shown}<small>${unitLabel().toUpperCase()}</small>`;
    this.gear.textContent = gear < 0 ? 'R' : String(gear);
    this.draw(rpmFrac, nitro);
  }

  /** Shift light: five LEDs fill between 80 % and 96 % of the redline; all flash at the limiter. Touches the DOM on change only. */
  private setShift(r: number): void {
    const n = r < 0.8 ? 0 : Math.min(6, Math.floor((r - 0.8) / 0.16 * 5) + 1);
    if (n === this.ledN) return;
    this.ledN = n;
    for (let i = 0; i < 5; i++) this.leds[i].classList.toggle('on', i < n);
    this.shift.classList.toggle('fl', n >= 6);
  }

  private draw(rpm: number, nitro: number): void {
    const g = this.cv.getContext('2d');
    if (!g) return;
    const S = 500;
    const c = S / 2;
    const a0 = Math.PI * 0.75;
    const sweep = Math.PI * 1.5;
    g.clearRect(0, 0, S, S);
    g.lineCap = 'round';
    g.fillStyle = '#05060d99';
    g.beginPath();
    g.arc(c, c, 200, 0, 7);
    g.fill();
    g.lineWidth = 26;
    g.strokeStyle = '#ffffff1c';
    g.beginPath();
    g.arc(c, c, 200, a0, a0 + sweep);
    g.stroke();
    const r = Math.max(0, Math.min(1, rpm));
    const grad = g.createLinearGradient(0, S, S, 0);
    grad.addColorStop(0, '#18d8ff');
    grad.addColorStop(0.7, '#7a5cff');
    grad.addColorStop(1, '#ff2a9d');
    g.strokeStyle = r > 0.9 ? '#ff2a4a' : grad;
    g.shadowColor = r > 0.9 ? '#ff2a4a' : '#18d8ff';
    g.shadowBlur = 18;
    g.beginPath();
    g.arc(c, c, 200, a0, a0 + sweep * r);
    g.stroke();
    g.shadowBlur = 0;
    for (let i = 0; i <= 9; i++) { // ticks, the last two in red (the redline zone)
      const a = a0 + (sweep * i) / 9;
      g.strokeStyle = i >= 8 ? '#ff2a4a' : '#e8f6ffaa';
      g.lineWidth = i % 3 === 0 ? 5 : 3;
      g.beginPath();
      g.moveTo(c + Math.cos(a) * 222, c + Math.sin(a) * 222);
      g.lineTo(c + Math.cos(a) * 238, c + Math.sin(a) * 238);
      g.stroke();
    }
    g.lineWidth = 9; // nitro tank on the inside
    g.strokeStyle = '#ffffff1c';
    g.beginPath();
    g.arc(c, c, 168, a0, a0 + sweep);
    g.stroke();
    g.strokeStyle = '#ff2a9d';
    g.shadowColor = '#ff2a9d';
    g.shadowBlur = nitro > 0 ? 12 : 0;
    g.beginPath();
    g.arc(c, c, 168, a0, a0 + sweep * Math.max(0.001, nitro));
    g.stroke();
  }
}
