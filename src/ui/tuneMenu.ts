import { carNav, navButton } from './carNav';
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
import { t, tx } from '../i18n';

const CLASS_COLOR = { D: '#8a8f99', C: '#7dff9a', B: '#18d8ff', A: '#ffb347', S: '#ff2a9d' } as const;

/** Tuning screen: PR and class, the 11 upgrade categories (buy the next level), setup sliders with safe ranges, and the dyno graph. */
export function buildTuneMenu(store: SaveStore, onBack: () => void): HTMLElement {
  const root = h('div', 'rb-layer dim rb-tune');
  root.style.cssText += ';overflow:auto;justify-content:flex-start;padding:max(14px,2.5vh) 14px max(20px,4vh)';
  let idx = Math.max(0, CARS.findIndex((c) => c.id === store.data.selected));
  const goPrev = (): void => { idx = (idx + CARS.length - 1) % CARS.length; render(); };
  const goNext = (): void => { idx = (idx + 1) % CARS.length; render(); };
  carNav(root, goPrev, goNext);
  const stock = (c: CarSpec): CarTuning => applyTuning(createDefaultTuning(), c.tuning);
  const current = (c: CarSpec): CarTuning => {
    const tn = stock(c);
    applyUpgrades(tn, store.data.upgrades[c.id] ?? {}, c.id);
    applySetup(tn, store.data.setups[c.id] ?? defaultSetup());
    return tn;
  };
  const render = (): void => {
    const c = CARS[idx];
    const owned = store.owns(c.id);
    const cur = current(c);
    const r = rate(cur);
    const r0 = rate(stock(c));
    root.replaceChildren();
    root.append(h('h2', 'rb-title', t('tune.title')));
    const head = h('div', 'rb-row');
    const prev = navButton('prev', goPrev);
    const next = navButton('next', goNext);
    prev.style.minWidth = next.style.minWidth = '60px';
    head.append(prev, h('div', '', `<div class="rb-sub">${c.brand}</div><div style="font-size:26px;font-weight:900">${c.name}</div>`), next);
    root.append(head);
    const badge = h('div', 'rb-row', `<div class="rb-class" style="--c:${CLASS_COLOR[r.cls]}"><span>${r.cls}</span>${r.pr}</div><div class="rb-sub">${t('tune.stats', { cls: r0.cls, pr: r0.pr, accel: r.accel.toFixed(1), top: Math.round(r.topKph), stop: r.brake30.toFixed(0) })}</div>`);
    root.append(badge);
    const bk = buildKey(store.data.upgrades[c.id] ?? {}, store.data.setups[c.id] ?? defaultSetup());
    const laps = TRACKS.map((tr) => { const b = bestLapFor(tr.id, c.id, bk); return b ? `${tr.name} ${Math.floor(b / 60)}:${(b % 60).toFixed(1).padStart(4, '0')}` : ''; }).filter(Boolean);
    root.append(h('div', 'rb-sub', laps.length ? t('tune.bests', { laps: laps.join(' · ') }) : t('tune.noBests')));
    if (!owned) root.append(h('div', 'rb-sub', t('tune.buyFirst')));
    const cols = h('div', 'rb-row');
    cols.style.alignItems = 'flex-start';
    const ups = h('section', 'rb-panel');
    ups.style.width = 'min(460px,94vw)';
    ups.append(h('h3', '', t('tune.upgrades', { cash: money(store.data.cash) })));
    for (const u of UPGRADES) {
      const level = store.data.upgrades[c.id]?.[u.id] ?? 0;
      const absent = u.needs === 'turbo' && cur.turboTorque <= 0;
      const next = level < u.levels.length ? u.levels[level] : null;
      let gain = '';
      if (next && !absent) { // measured effect of the next level (same physics as the race)
        const tn = stock(c);
        applyUpgrades(tn, { ...(store.data.upgrades[c.id] ?? {}), [u.id]: level + 1 }, c.id);
        applySetup(tn, store.data.setups[c.id] ?? defaultSetup());
        const rn = rate(tn), f = (x: number, d = 1): string => { const v = Number(x.toFixed(d)); return v > 0 ? `+${v}` : v < 0 ? String(v) : '0'; };
        gain = `<div class="u-g">${t('tune.next', { pr: f(rn.pr - r.pr, 0), accel: f(rn.accel - r.accel), top: f(rn.topKph - r.topKph, 0), stop: f(rn.brake30 - r.brake30, 0) })}</div>`;
      }
      const row = h('div', 'rb-row rb-up', `<div style="flex:1;min-width:150px"><b class="u-n">${tx(u.name)}</b> <span class="u-d">${'<i class="on"></i>'.repeat(level)}${'<i></i>'.repeat(u.levels.length - level)}</span>${u.id === 'stage' ? ` <div class="u-p">${stageSpec(c.id, level).ps} PS / ${stageSpec(c.id, level).nm} Nm${next ? ` → ${stageSpec(c.id, level + 1).ps} PS / ${stageSpec(c.id, level + 1).nm} Nm (${tx(stageSpec(c.id, level + 1).parts)})` : ''}</div>` : ''}<div class="u-p">${absent ? t('tune.needsTurbo') : next ? tx(next.name) : t('tune.maxed')}</div>${gain}<div class="u-a">${tx(ADVICE[u.id])}</div></div>`);
      row.style.justifyContent = 'space-between';
      if (next && !absent) {
        const b = button(`$${next.price.toLocaleString()}`, () => {
          if (owned && store.buyUpgrade(c.id, u.id, next.price)) render();
        });
        b.style.cssText += ';min-width:96px;padding:6px 10px;font-size:12px;font-variant-numeric:tabular-nums';
        b.disabled = !owned || store.data.cash < next.price;
        row.append(b);
      }
      ups.append(row);
    }
    const tune = h('section', 'rb-panel');
    tune.style.width = 'min(420px,94vw)';
    tune.append(h('h3', '', t('tune.setup')));
    const setup = store.data.setups[c.id] ?? defaultSetup();
    let timer = 0;
    for (const k of Object.keys(SETUP_RANGES) as (keyof Setup)[]) {
      const [lo, hi, step] = SETUP_RANGES[k];
      const row = h('div', 'rb-row rb-set', `<span class="rb-lbl">${t(`setup.${k}`)}</span>`);
      const input = h('input') as HTMLInputElement;
      input.type = 'range';
      input.min = String(lo);
      input.max = String(hi);
      input.step = String(step);
      input.value = String(setup[k]);
      input.disabled = !owned;
      const val = h('span', '', setup[k].toFixed(2));
      val.className = 'rb-val';
      input.addEventListener('input', () => {
        setup[k] = parseFloat(input.value);
        val.textContent = setup[k].toFixed(2);
        window.clearTimeout(timer);
        timer = window.setTimeout(() => { store.setSetup(c.id, { ...setup }); render(); }, 350);
      });
      row.append(input, val);
      tune.append(row);
    }
    tune.append(button(t('tune.reset'), () => { store.setSetup(c.id, defaultSetup()); render(); }));
    const dyno = document.createElement('canvas');
    dyno.width = 420;
    dyno.height = 220;
    dyno.style.cssText = 'width:100%;background:#05060dcc;border:1px solid #18d8ff22;border-radius:8px;margin-top:8px';
    drawDyno(dyno, dynoCurve(cur), dynoCurve(stock(c)));
    tune.append(h('h3', '', t('tune.dyno')), dyno);
    cols.append(ups, tune);
    root.append(cols, button(t('common.back'), onBack));
  };
  render();
  return root;
}
