import { carNav, NAV_LABEL } from './carNav';
import { stageSpec } from '../data/carReal';
import { ADVICE, bestLapFor, buildKey } from '../data/upgradeAdvice';
import { TRACKS } from '../data/tracks';
import type { SaveStore } from '../core/save';
import { CARS, type CarSpec } from '../data/cars';
import { defaultSetup, SETUP_RANGES, type Setup } from '../data/setup';
import { applyUpgrades, UPGRADES } from '../data/upgrades';
import { applySetup } from '../data/setup';
import { dynoCurve } from '../physics/dyno';
import { rate } from '../physics/carRating';
import { applyTuning, createDefaultTuning, type CarTuning } from '../physics/carTuning';
import { drawDyno } from './dynoGraph';
import { button, h, money } from './uiKit';

const SETUP_LABELS: Record<keyof Setup, string> = { finalDrive: 'Final drive', spring: 'Springs', rideHeight: 'Ride height', brakeBias: 'Brake bias', steer: 'Steering', diff: 'Diff lock', pressure: 'Tyre pressure', downforce: 'Downforce' };
const CLASS_COLOR = { D: '#8a8f99', C: '#7dff9a', B: '#18d8ff', A: '#ffb347', S: '#ff2a9d' } as const;

/** Tuning screen: PR and class, the 11 upgrade categories (buy the next level), setup sliders with safe ranges, and the dyno graph. */
export function buildTuneMenu(store: SaveStore, onBack: () => void): HTMLElement {
  const root = h('div', 'rb-layer dim');
  root.style.cssText += ';overflow:auto;justify-content:flex-start;padding:max(14px,2.5vh) 14px';
  let idx = Math.max(0, CARS.findIndex((c) => c.id === store.data.selected));
  const goPrev = (): void => { idx = (idx + CARS.length - 1) % CARS.length; render(); };
  const goNext = (): void => { idx = (idx + 1) % CARS.length; render(); };
  carNav(root, goPrev, goNext);
  const stock = (c: CarSpec): CarTuning => applyTuning(createDefaultTuning(), c.tuning);
  const current = (c: CarSpec): CarTuning => {
    const t = stock(c);
    applyUpgrades(t, store.data.upgrades[c.id] ?? {}, c.id);
    applySetup(t, store.data.setups[c.id] ?? defaultSetup());
    return t;
  };
  const render = (): void => {
    const c = CARS[idx];
    const owned = store.owns(c.id);
    const t = current(c);
    const r = rate(t);
    const r0 = rate(stock(c));
    root.replaceChildren();
    root.append(h('h2', 'rb-title', 'TUNING'));
    const head = h('div', 'rb-row');
    const prev = button(NAV_LABEL.prev, goPrev);
    const next = button(NAV_LABEL.next, goNext);
    prev.style.minWidth = next.style.minWidth = '60px';
    head.append(prev, h('div', '', `<div class="rb-sub">${c.brand}</div><div style="font-size:26px;font-weight:900">${c.name}</div>`), next);
    root.append(head);
    const badge = h('div', 'rb-row', `<div style="font-size:30px;font-weight:900;color:${CLASS_COLOR[r.cls]}">${r.cls} ${r.pr}</div><div class="rb-sub">stock ${r0.cls} ${r0.pr} · 0-100 ${r.accel.toFixed(1)} s · top ${Math.round(r.topKph)} km/h · 30 m/s stop ${r.brake30.toFixed(0)} m</div>`);
    root.append(badge);
    const bk = buildKey(store.data.upgrades[c.id] ?? {}, store.data.setups[c.id] ?? defaultSetup());
    const laps = TRACKS.map((tr) => { const b = bestLapFor(tr.id, c.id, bk); return b ? `${tr.name} ${Math.floor(b / 60)}:${(b % 60).toFixed(1).padStart(4, '0')}` : ''; }).filter(Boolean);
    root.append(h('div', 'rb-sub', laps.length ? `Your best laps with this exact setup: ${laps.join(' · ')}` : 'Your best laps with this exact setup will show here (race to record them).'));
    if (!owned) root.append(h('div', 'rb-sub', 'Buy this car in the garage first.'));
    const cols = h('div', 'rb-row');
    cols.style.alignItems = 'flex-start';
    const ups = h('div', 'rb-card');
    ups.style.cssText += ';cursor:default;width:min(420px,94vw);text-align:left';
    ups.append(h('div', 'rb-sub', `Upgrades · cash ${money(store.data.cash)}`));
    for (const u of UPGRADES) {
      const level = store.data.upgrades[c.id]?.[u.id] ?? 0;
      const absent = u.needs === 'turbo' && t.turboTorque <= 0;
      const next = level < u.levels.length ? u.levels[level] : null;
      let gain = '';
      if (next && !absent) { // measured effect of the next level (same physics as the race)
        const tn = stock(c);
        applyUpgrades(tn, { ...(store.data.upgrades[c.id] ?? {}), [u.id]: level + 1 }, c.id);
        applySetup(tn, store.data.setups[c.id] ?? defaultSetup());
        const rn = rate(tn), f = (x: number, d = 1): string => { const v = Number(x.toFixed(d)); return v > 0 ? `+${v}` : v < 0 ? String(v) : '0'; };
        gain = `<div style="font-size:11px;color:#7dff9a">next: PR ${f(rn.pr - r.pr, 0)} · 0-100 ${f(rn.accel - r.accel)} s · top ${f(rn.topKph - r.topKph, 0)} km/h · stop ${f(rn.brake30 - r.brake30, 0)} m</div>`;
      }
      const row = h('div', 'rb-row', `<div style="flex:1;min-width:150px"><b>${u.name}</b> ${'●'.repeat(level)}${'○'.repeat(u.levels.length - level)}${u.id === 'stage' ? ` <span style="font-size:11px;opacity:.8">${stageSpec(c.id, level).ps} PS / ${stageSpec(c.id, level).nm} Nm${next ? ` → ${stageSpec(c.id, level + 1).ps} PS / ${stageSpec(c.id, level + 1).nm} Nm (${stageSpec(c.id, level + 1).parts})` : ''}</span>` : ''}<div style="font-size:11px;opacity:.7">${absent ? 'needs a turbo car' : next ? next.name : 'maxed'}</div>${gain}<div style="font-size:11px;opacity:.55;max-width:330px">${ADVICE[u.id]}</div></div>`);
      row.style.justifyContent = 'space-between';
      if (next && !absent) {
        const b = button(`$${next.price.toLocaleString()}`, () => {
          if (owned && store.buyUpgrade(c.id, u.id, next.price)) render();
        });
        b.style.cssText += ';min-width:96px;padding:6px 10px;font-size:12px';
        b.disabled = !owned || store.data.cash < next.price;
        row.append(b);
      }
      ups.append(row);
    }
    const tune = h('div', 'rb-card');
    tune.style.cssText += ';cursor:default;width:min(380px,94vw);text-align:left';
    tune.append(h('div', 'rb-sub', 'Setup'));
    const setup = store.data.setups[c.id] ?? defaultSetup();
    let timer = 0;
    for (const k of Object.keys(SETUP_RANGES) as (keyof Setup)[]) {
      const [lo, hi, step] = SETUP_RANGES[k];
      const row = h('div', 'rb-row', `<span style="width:100px;font-size:12px">${SETUP_LABELS[k]}</span>`);
      const input = h('input') as HTMLInputElement;
      input.type = 'range';
      input.min = String(lo);
      input.max = String(hi);
      input.step = String(step);
      input.value = String(setup[k]);
      input.disabled = !owned;
      const val = h('span', '', setup[k].toFixed(2));
      val.style.cssText = 'width:42px;font-size:12px';
      input.addEventListener('input', () => {
        setup[k] = parseFloat(input.value);
        val.textContent = setup[k].toFixed(2);
        window.clearTimeout(timer);
        timer = window.setTimeout(() => { store.setSetup(c.id, { ...setup }); render(); }, 350);
      });
      row.append(input, val);
      tune.append(row);
    }
    tune.append(button('Reset setup', () => { store.setSetup(c.id, defaultSetup()); render(); }));
    const dyno = document.createElement('canvas');
    dyno.width = 420;
    dyno.height = 220;
    dyno.style.cssText = 'width:min(420px,94vw);background:#05060d99;border-radius:8px;margin-top:8px';
    drawDyno(dyno, dynoCurve(t), dynoCurve(stock(c)));
    tune.append(h('div', 'rb-sub', 'Dyno: torque (cyan), power (magenta), dashed = stock'), dyno);
    cols.append(ups, tune);
    root.append(cols, button('Back', onBack));
  };
  render();
  return root;
}
