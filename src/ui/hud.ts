import type { RaceTelemetry, Weather } from '../types/game';

const CSS = `
#hud{position:fixed;inset:0;pointer-events:none;font:700 14px/1.1 system-ui,sans-serif;color:#e8f6ff;text-shadow:0 0 8px #18d8ff}
#hud .br{position:absolute;right:24px;bottom:24px;text-align:right}
#hud .spd{font-size:64px;font-style:italic;letter-spacing:-2px}
#hud .bar{height:8px;width:220px;margin:6px 0 0 auto;background:#ffffff1f;border-radius:4px;overflow:hidden}
#hud .bar i{display:block;height:100%;width:0;background:#18d8ff}
#hud .nit i{background:#ff2a9d}
#hud .tl{position:absolute;left:24px;top:20px;font-size:13px;opacity:.85}
#hud .info{position:absolute;right:24px;top:20px;text-align:right;font-size:20px;line-height:1.5}
#hud .ban{position:absolute;left:0;right:0;top:28%;text-align:center;font-size:120px;font-style:italic;color:#fff;text-shadow:0 0 24px #ff2a9d,0 0 60px #18d8ff}
#hud .ds{position:absolute;left:50%;top:18px;transform:translateX(-50%);font-size:34px;font-style:italic;color:#ff2a9d;text-shadow:0 0 12px #ff2a9d;opacity:0;transition:opacity .2s}
`;

/** Plain-DOM HUD. Only touches the DOM when a value actually changes. */
export class Hud {
  private readonly root = document.createElement('div');
  private readonly spd = document.createElement('div');
  private readonly gear = document.createElement('div');
  private readonly rpm = document.createElement('i');
  private readonly nit = document.createElement('i');
  private readonly drift = document.createElement('div');
  private readonly weather = document.createElement('div');
  private readonly info = document.createElement('div');
  private readonly banner = document.createElement('div');
  private lastInfo = '';
  private lastSpd = -1;
  private lastGear = 99;
  private lastScore = -1;
  private lastRpm = -1;
  private lastNit = -1;

  constructor(parent: HTMLElement) {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.root.id = 'hud';
    this.spd.className = 'spd';
    this.drift.className = 'ds';
    this.weather.className = 'tl';
    this.info.className = 'info';
    this.banner.className = 'ban';
    const br = document.createElement('div');
    br.className = 'br';
    const rpmBar = document.createElement('div');
    rpmBar.className = 'bar';
    rpmBar.appendChild(this.rpm);
    const nitBar = document.createElement('div');
    nitBar.className = 'bar nit';
    nitBar.appendChild(this.nit);
    br.append(this.spd, this.gear, rpmBar, nitBar);
    this.root.append(style, this.weather, this.info, this.banner, this.drift, br);
    parent.appendChild(this.root);
  }

  setWeather(w: Weather): void {
    this.weather.textContent = `${w}  [1 clear  2 rain  3 snow]  [R reset]  [\` tuning]`;
  }

  /** Centre banner: countdown digits and GO. Empty string hides it. */
  setBanner(text: string): void {
    if (this.banner.textContent !== text) this.banner.textContent = text;
  }

  setVisible(v: boolean): void {
    this.root.style.display = v ? '' : 'none';
  }

  update(t: RaceTelemetry): void {
    const secs = Math.floor(t.raceTime * 10) / 10;
    const info = `LAP ${t.lap}/${t.totalLaps}<br>POS ${t.position}/${t.racerCount}<br>${Math.floor(secs / 60)}:${(secs % 60).toFixed(1).padStart(4, '0')}`;
    if (info !== this.lastInfo) {
      this.lastInfo = info;
      this.info.innerHTML = info;
    }
    const kph = Math.round(t.speedKph);
    if (kph !== this.lastSpd) {
      this.lastSpd = kph;
      this.spd.textContent = String(kph);
    }
    if (t.gear !== this.lastGear) {
      this.lastGear = t.gear;
      this.gear.textContent = `km/h   GEAR ${t.gear < 0 ? 'R' : t.gear}`;
    }
    const rpm = Math.round((t.rpm / t.redlineRpm) * 50);
    if (rpm !== this.lastRpm) {
      this.lastRpm = rpm;
      this.rpm.style.width = `${rpm * 2}%`;
      this.rpm.style.background = rpm > 90 ? '#ff2a4a' : '#18d8ff';
    }
    const nit = Math.round(t.nitroLevel * 100);
    if (nit !== this.lastNit) {
      this.lastNit = nit;
      this.nit.style.width = `${nit}%`;
    }
    if (t.driftScore !== this.lastScore) {
      this.lastScore = t.driftScore;
      this.drift.textContent = `DRIFT ${t.driftScore}`;
      this.drift.style.opacity = t.driftScore > 0 ? '1' : '0';
    }
  }
}
