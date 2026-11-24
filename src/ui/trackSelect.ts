import { fillTrackTops, trackBoardKey } from './trackTop';
import type { SaveStore } from '../core/save';
import { buildTrack, TRACKS, type TrackDef } from '../data/tracks';
import type { Weather } from '../types/game';
import { button, h, lapText } from './uiKit';
import { cityRaces } from '../game/cityRaces';
import { driftMedal, driftTimes, medalFor, medalTimes, type Medal } from '../core/medals';
import { t, tx } from '../i18n';

const MEDAL_COLOR: Record<Medal, string> = { gold: '#ffd27d', silver: '#cfd6e6', bronze: '#d98a4a' };
const dot = (m: Medal | null): string => (m ? ` <span style="color:${MEDAL_COLOR[m]}">●</span>` : '');
const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const WEATHER_ICON: Record<Weather, string> = { CLEAR: '☀', RAIN: '☂', SNOW: '❄' };

/** Draw the road outline of a map (north up) on a small canvas; the start line is the white bar, a sprint's finish the pink one. */
export function drawOutline(c: HTMLCanvasElement, def: TrackDef): void {
  const tr = buildTrack(def);
  const g = c.getContext('2d');
  if (!g) return;
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const s of tr.samples) {
    x0 = Math.min(x0, s.position.x);
    x1 = Math.max(x1, s.position.x);
    z0 = Math.min(z0, s.position.z);
    z1 = Math.max(z1, s.position.z);
  }
  const pad = 14;
  const k = Math.min((c.width - pad * 2) / (x1 - x0 || 1), (c.height - pad * 2) / (z1 - z0 || 1));
  const px = (x: number): number => pad + (x - x0) * k + (c.width - pad * 2 - (x1 - x0) * k) / 2;
  const pz = (z: number): number => pad + (z - z0) * k + (c.height - pad * 2 - (z1 - z0) * k) / 2;
  g.clearRect(0, 0, c.width, c.height);
  g.lineWidth = 3;
  g.lineJoin = 'round';
  const path = (from: number, to: number): void => {
    g.beginPath();
    for (let i = from; i <= to; i++) {
      const p = tr.samples[i % tr.samples.length].position;
      if (i === from) g.moveTo(px(p.x), pz(p.z));
      else g.lineTo(px(p.x), pz(p.z));
    }
  };
  if (def.type === 'sprint') {
    g.strokeStyle = 'rgba(24,216,255,.25)';
    path(tr.raceSamples - 1, tr.samples.length);
    g.stroke();
  }
  g.strokeStyle = '#18d8ff';
  path(0, def.type === 'sprint' ? tr.raceSamples - 1 : tr.samples.length);
  g.stroke();
  const mark = (i: number, color: string): void => {
    const p = tr.samples[i % tr.samples.length].position;
    g.fillStyle = color;
    g.beginPath();
    g.arc(px(p.x), pz(p.z), 5, 0, Math.PI * 2);
    g.fill();
  };
  mark(0, '#ffffff');
  if (def.type === 'sprint') mark(tr.raceSamples - 1, '#ff2a9d');
}

export interface TrackSelectDeps {
  store: SaveStore;
  onPick: (def: TrackDef) => void;
  onBack: () => void;
  /** Rival duels screen (the button shows when given). */
  onDuels?: () => void;
}

/** Choose a map: outline, event type, length, best times and the weather it suits. */
export function buildTrackSelect(d: TrackSelectDeps): HTMLElement {
  const root = h('div', 'rb-layer dim');
  root.style.cssText += ';overflow:auto;justify-content:flex-start;padding:max(16px,3vh) 16px';
  root.append(h('h2', 'rb-title', t('maps.title')));
  const row = h('div', 'rb-row');
  const makeCard = (def: TrackDef): HTMLElement => {
    const tr = buildTrack(def);
    const km = (tr.raceSamples * tr.spacing) / 1000;
    const climb = Math.max(...tr.heights) - Math.min(...tr.heights);
    const best = d.store.data.trackBest;
    const times = def.type === 'drift'
      ? t('maps.bestScore', { score: `<b>${best[`${def.id}:drift`]?.toLocaleString() ?? '--'}</b>${dot(driftMedal(def.driftTarget, best[`${def.id}:drift`]))}`, target: def.driftTarget?.toLocaleString() ?? '--' })
      : (['CLEAR', 'RAIN', 'SNOW'] as Weather[]).map((w) => `${t(`weather.${w}`).toLowerCase()} ${lapText(best[`${def.id}:${w}`] ?? null)}${dot(medalFor(def.id, w, best[`${def.id}:${w}`]))}`).join(' · ');
    const mt = def.type === 'drift' ? driftTimes(def.driftTarget ?? 0) : medalTimes(def.id, 'CLEAR');
    const medals = mt ? t(def.type === 'drift' ? 'maps.medalsDrift' : 'maps.medals', def.type === 'drift' ? { g: `<span style="color:${MEDAL_COLOR.gold}">${mt.gold.toLocaleString()}</span>`, s: `<span style="color:${MEDAL_COLOR.silver}">${mt.silver.toLocaleString()}</span>`, b: `<span style="color:${MEDAL_COLOR.bronze}">${mt.bronze.toLocaleString()}</span>` } : { g: `<span style="color:${MEDAL_COLOR.gold}">${mmss(mt.gold)}</span>`, s: `<span style="color:${MEDAL_COLOR.silver}">${mmss(mt.silver)}</span>`, b: `<span style="color:${MEDAL_COLOR.bronze}">${mmss(mt.bronze)}</span>` }) : '';
    const card = h('div', 'rb-card rb-pick');
    card.style.cssText += ';width:min(300px,86vw);text-align:left';
    card.tabIndex = 0;
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') d.onPick(def); });
    const cv = document.createElement('canvas');
    cv.width = 270;
    cv.height = 150;
    cv.style.cssText = 'width:100%;height:auto;background:radial-gradient(ellipse at center,#10183acc,#05060dcc);border-radius:8px;border:1px solid #18d8ff22';
    drawOutline(cv, def);
    card.append(cv);
    card.append(h('div', '', `<div style="font-size:22px;font-weight:900;margin-top:8px">${def.name}</div>
      <div class="rb-sub">${t(`maps.type.${def.type}`)} · ${def.type === 'sprint' ? t('story.oneRun') : t('story.laps', { n: def.laps })} · ${km.toFixed(1)} km${climb > 1 ? ` · ${t('maps.climb', { m: climb.toFixed(0) })}` : ''}</div>
      <div style="opacity:.85;margin:6px 0;font-size:14px;line-height:1.35">${tx(def.blurb)}</div>
      <div style="font-size:13px;opacity:.9">${t('maps.suits')} ${def.recommendedWeather.map((w) => `${WEATHER_ICON[w]} ${t(`weather.${w}`).toLowerCase()}`).join(' · ')}</div>
      <div style="font-size:12px;opacity:.75;margin-top:4px">${times}</div>${medals ? `<div style="font-size:12px;opacity:.85;margin-top:2px">${medals}</div>` : ''}`));
    const key = trackBoardKey(def, d.store);
    if (key) {
      const top = h('div', '');
      top.style.cssText = 'font-size:12px;opacity:.75;margin-top:2px;color:#8fd8ff;min-height:1.3em';
      top.dataset.lb = key;
      card.append(top);
    }
    card.addEventListener('click', () => d.onPick(def));
    return card;
  };
  for (const def of TRACKS) row.append(makeCard(def));
  // the six city circuits (one loop per district of Neon Harbor) are built on demand: the road network takes a moment to generate
  const city = button(t('maps.city'), () => {
    city.disabled = true;
    city.textContent = t('maps.cityLoading');
    window.setTimeout(() => { for (const r of cityRaces()) row.append(makeCard(r.def)); city.remove(); fillTrackTops(root); }, 40);
  });
  root.append(row, city, ...(d.onDuels ? [button(t('duel.open'), d.onDuels)] : []), button(t('common.back'), d.onBack));
  fillTrackTops(root); // online top 3 per map, filled in when the server answers
  return root;
}
