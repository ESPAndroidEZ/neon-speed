import type { RaceTelemetry, Weather } from '../types/game';
import { ArcGauge } from './gauge';
import { onLangChange, t } from '../i18n';

const CSS = `
#hud{position:fixed;inset:0;pointer-events:none;font:700 14px/1.1 system-ui,sans-serif;color:#e8f6ff;text-shadow:0 0 8px #18d8ff;--mr:max(18px,env(safe-area-inset-right),2.5vw);--ml:max(18px,env(safe-area-inset-left),2.5vw);--mt:max(14px,env(safe-area-inset-top),2vh);--mb:max(16px,env(safe-area-inset-bottom),2.5vh)}
#hud .br{position:absolute;right:var(--mr);bottom:var(--mb);text-align:right}
#hud .spd{font-size:clamp(44px,7vw,64px);font-style:italic;letter-spacing:-2px}
#hud .bar{height:8px;width:clamp(140px,18vw,220px);margin:6px 0 0 auto;background:#ffffff1f;border-radius:4px;overflow:hidden}
#hud .bar i{display:block;height:100%;width:0;background:#18d8ff}
#hud .nit i{background:#ff2a9d}
#hud .tl{position:absolute;left:var(--ml);top:var(--mt);font-size:13px;opacity:.85;max-width:48vw}
#hud .tl small{display:block;opacity:.7;font-size:11px;margin-top:3px}
#hud .info{position:absolute;right:var(--mr);top:var(--mt);text-align:right;font-size:clamp(14px,2vw,20px);line-height:1.5;white-space:nowrap}
#hud .ban{position:absolute;left:0;right:0;top:28%;text-align:center;font-size:clamp(70px,12vw,120px);font-style:italic;color:#fff;text-shadow:0 0 24px #ff2a9d,0 0 60px #18d8ff}
#hud .ds{position:absolute;left:50%;top:var(--mt);transform:translateX(-50%);font-size:clamp(20px,3vw,34px);white-space:nowrap;font-style:italic;color:#ff2a9d;text-shadow:0 0 12px #ff2a9d;opacity:0;transition:opacity .2s}
#hud .hb-fs{position:absolute;left:var(--ml);top:calc(var(--mt) + 40px)}
@media (pointer:coarse){#hud .hb-fs{left:calc(max(14px,env(safe-area-inset-left)) + 112px);top:calc(max(10px,env(safe-area-inset-top)) + 34px)}}
@media (max-width:760px){#hud .tl small{display:none}}
@media (pointer:coarse){#hud{--u:clamp(64px,min(15vmin,19vw),118px)}#hud .br{right:calc(max(14px,env(safe-area-inset-right)) + var(--u) * 2.1 + 34px);bottom:calc(var(--mb) - 6px);transform:scale(.7);transform-origin:right bottom}#hud .tl small{display:none}}
@media (pointer:coarse) and (orientation:portrait){#hud .br{right:auto;left:var(--ml);bottom:auto;top:calc(var(--mt) + 84px);transform:scale(.55);transform-origin:left top;text-align:left}}
`;

/** Plain-DOM HUD. Only touches the DOM when a value actually changes. */
export class Hud {
  private readonly root = document.createElement('div');
  private readonly drift = document.createElement('div');
  private readonly weather = document.createElement('div');
  private readonly info = document.createElement('div');
  private readonly banner = document.createElement('div');
  private readonly gauge = new ArcGauge();
  private readonly lines = document.createElement('div');
  private readonly pop = document.createElement('div');
  private lastTier = 0;
  private lastInfo = '';
  private lastScore = -1;
  private weatherNow: Weather | null = null;

  /** Add a small HUD button (full screen) in the top-left button row; null is ignored. */
  mount(el: HTMLElement | null): void {
    if (!el) return;
    el.classList.add('hb-fs');
    this.root.append(el);
  }

  /** HUD size 0.8 .. 1.3 (graphics settings). */
  setScale(s: number): void {
    (this.root.style as unknown as { zoom: string }).zoom = String(s);
  }

  constructor(parent: HTMLElement) {
    const style = document.createElement('style');
    style.textContent = CSS + ArcGauge.css();
    this.root.id = 'hud';
    this.drift.className = 'ds';
    this.weather.className = 'tl';
    this.info.className = 'info';
    this.banner.className = 'ban';
    const br = document.createElement('div');
    br.className = 'br';
    br.append(this.gauge.el);
    this.lines.className = 'rb-lines';
    this.pop.className = 'rb-pop';
    this.root.append(style, this.lines, this.weather, this.info, this.banner, this.drift, this.pop, br);
    parent.appendChild(this.root);
    onLangChange(() => {
      this.lastInfo = '';
      this.lastScore = -1; // labels re-render on the next update
      if (this.weatherNow) this.setWeather(this.weatherNow);
    });
  }

  setWeather(w: Weather): void {
    this.weatherNow = w;
    this.weather.innerHTML = `${t(`weather.${w}`).toUpperCase()}<small>${t('hud.keys')}</small>`;
  }

  /** Centre banner: countdown digits and GO. Empty string hides it. */
  /** A short floating message above the HUD (drift tiers, banked points). */
  popUp(text: string, color: string): void {
    this.pop.textContent = text;
    this.pop.style.color = color;
    this.pop.style.textShadow = `0 0 14px ${color}`;
    this.pop.classList.remove('go');
    void this.pop.offsetWidth;
    this.pop.classList.add('go');
  }

  setBanner(text: string): void {
    if (this.banner.textContent !== text) this.banner.textContent = text;
  }

  setVisible(v: boolean): void {
    this.root.style.display = v ? '' : 'none';
  }

  update(tel: RaceTelemetry): void {
    const secs = Math.floor(tel.raceTime * 10) / 10;
    const info = `${t('hud.lap')} ${tel.lap}/${tel.totalLaps}<br>${t('hud.pos')} ${tel.position}/${tel.racerCount}<br>${Math.floor(secs / 60)}:${(secs % 60).toFixed(1).padStart(4, '0')}`;
    if (info !== this.lastInfo) {
      this.lastInfo = info;
      this.info.innerHTML = info;
    }
    this.gauge.update(tel.speedKph, tel.rpm / tel.redlineRpm, tel.gear, tel.nitroLevel, tel.nitroActive);
    // edge speed lines fade in between 110 and 220 km/h
    this.lines.style.opacity = String(Math.max(0, Math.min(1, (tel.speedKph - 110) / 110)) * 0.85);
    if (tel.driftScore !== this.lastScore) {
      const tier = Math.floor(tel.driftScore / 1000);
      if (tier > this.lastTier) this.popUp(`+${tier * 1000}`, '#ff2a9d');
      else if (tel.driftScore === 0 && this.lastScore > 600) this.popUp(t('hud.banked', { n: this.lastScore }), '#7dff9a');
      this.lastTier = tier;
      this.lastScore = tel.driftScore;
      this.drift.textContent = `${t('hud.drift')} ${tel.driftScore}`;
      this.drift.style.opacity = tel.driftScore > 0 ? '1' : '0';
    }
  }
}
