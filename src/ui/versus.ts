import type { CarSpec } from '../data/cars';
import { findCar } from '../data/cars';
import { findRival } from '../data/rivals';
import type { TrackDef } from '../data/tracks';
import { measureCar, type CarStats } from '../physics/carStats';
import type { Weather } from '../types/game';
import { BARKS } from '../data/barks';
import { portraitEl } from './portraits';
import { drawOutline } from './trackSelect';
import { h, injectCss } from './uiKit';

const stats = new Map<string, CarStats>();
const statsOf = (c: CarSpec): CarStats => {
  let s = stats.get(c.id);
  if (!s) stats.set(c.id, (s = measureCar(c.tuning)));
  return s;
};

const bar = (label: string, v: number, color: string): string =>
  `<div style="display:flex;gap:8px;align-items:center;font-size:12px;letter-spacing:2px"><span style="width:62px;text-transform:uppercase;opacity:.7">${label}</span><span style="flex:1;height:7px;background:#ffffff22;border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:${Math.round(Math.max(0.06, Math.min(1, v)) * 100)}%;background:${color}"></i></span></div>`;

function side(who: string, name: string, car: CarSpec, align: 'left' | 'right', color: string, tag: string): HTMLElement {
  const s = statsOf(car);
  const col = h('div');
  col.style.cssText = `display:flex;flex-direction:column;gap:8px;align-items:${align === 'left' ? 'flex-start' : 'flex-end'};width:min(300px,42vw)`;
  const head = h('div', '', `<div class="rb-sub" style="color:${color}">${tag}</div><div style="font-size:clamp(22px,4vw,34px);font-weight:900;font-style:italic">${name}</div><div class="rb-sub">${car.brand} ${car.name}</div>`);
  head.style.textAlign = align;
  const p = portraitEl(who, align === 'left' ? 'neutral' : 'smirk', 120);
  const bars = h('div', '', bar('Accel', 1 - (s.accel - 3.5) / 3.5, color) + bar('Top', (s.topKph - 180) / 120, color) + bar('Slide', s.slide / 1.4, color) + bar('Grip', (s.grip - 1) / 0.8, color));
  bars.style.cssText = 'width:100%;display:flex;flex-direction:column;gap:5px';
  col.append(p, head, bars);
  return col;
}

/**
 * The versus screen before a race: your portrait, car and stats against the strongest rival (or the clock / the target
 * on a map with no rivals), the map outline, weather and the rest of the field. Enter, click or a few seconds continue.
 */
export function showVersus(d: { player: CarSpec; weather: Weather; def: TrackDef; rivalIds: readonly string[] }, go: () => void): void {
  injectCss();
  const layer = h('div', 'rb-layer');
  layer.style.cssText += ';z-index:40;background:radial-gradient(ellipse at center,#05060dcc,#05060dff);cursor:pointer';
  const lead = [...d.rivalIds].map(findRival).sort((a, b) => b.skill - a.skill)[0];
  const row = h('div');
  row.style.cssText = 'display:flex;gap:clamp(12px,4vw,60px);align-items:center;justify-content:center;width:100%';
  const mid = h('div');
  mid.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px';
  const cv = document.createElement('canvas');
  cv.width = 220;
  cv.height = 130;
  cv.style.cssText = 'width:min(220px,28vw);opacity:.9';
  drawOutline(cv, d.def);
  mid.append(h('div', '', '<div style="font-size:clamp(40px,8vw,80px);font-weight:900;font-style:italic;color:#ff2a9d;text-shadow:0 0 30px #ff2a9d">VS</div>'), cv, h('div', 'rb-sub', `${d.def.name} · ${d.weather.toLowerCase()}`));
  row.append(side('rookie', 'You', d.player, 'left', '#18d8ff', 'Driver'));
  row.append(mid);
  const bark = lead ? BARKS[lead.id]?.[Math.floor(Math.random() * 4)] : undefined;
  if (lead) row.append(side(lead.id, lead.name, findCar(lead.carId), 'right', '#ff2a9d', lead.style.replace('-', ' ')));
  else {
    const clock = h('div', '', `<div class="rb-sub" style="color:#ff2a9d">${d.def.type === 'drift' ? 'Target' : 'Against'}</div><div style="font-size:clamp(24px,4vw,36px);font-weight:900;font-style:italic">${d.def.type === 'drift' ? `${(d.def.driftTarget ?? 0).toLocaleString()} points` : 'The clock'}</div><div class="rb-sub">${d.def.blurb.slice(0, 80)}…</div>`);
    clock.style.cssText = 'width:min(260px,40vw);text-align:right';
    row.append(clock);
  }
  if (bark && lead) layer.append(h('div', '', `<div class="rb-sub" style="color:#ff2a9d">${lead.name} says</div><div style="font-size:20px;font-style:italic;max-width:min(620px,88vw);text-align:center">“${bark}”</div>`));
  const others = d.rivalIds.filter((id) => id !== lead?.id);
  layer.append(row);
  if (others.length) {
    const f = h('div', 'rb-row');
    f.append(h('span', 'rb-sub', 'Also on the grid'), ...others.map((id) => portraitEl(id, 'neutral', 44)));
    layer.append(f);
  }
  layer.append(h('div', 'rb-sub', 'Enter / click to go'));
  document.body.appendChild(layer);
  let done = false;
  const finish = (): void => {
    if (done) return;
    done = true;
    window.removeEventListener('keydown', onKey);
    clearTimeout(timer);
    layer.remove();
    go();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') {
      e.preventDefault();
      finish();
    }
  };
  const timer = window.setTimeout(finish, 4500);
  window.addEventListener('keydown', onKey);
  layer.addEventListener('click', finish);
}
