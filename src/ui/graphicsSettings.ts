import { applyGraphics, benchmark, GRAPHICS, PRESETS, usePreset, type Graphics } from '../core/graphics';
import type { Engine } from '../core/engine';
import { applyQuality } from '../core/quality';
import type { Quality, SaveStore } from '../core/save';
import { button, h } from './uiKit';
import { t } from '../i18n';

export interface GraphicsDeps {
  store: SaveStore;
  engine: Engine;
  hud?: { setScale(s: number): void };
  chase: { tuning: { fovMin: number; fovMax: number } };
}

const TIERS: Quality[] = ['low', 'medium', 'high', 'ultra'];

/** Graphics screen rows: presets, resolution scale, toggles, particle density, draw distance, anti-aliasing, FPS cap, FOV, HUD scale, motion blur, benchmark. */
export function graphicsRows(d: GraphicsDeps): HTMLElement[] {
  const s = d.store.data.settings;
  const apply = (): void => {
    s.graphics = { ...GRAPHICS };
    d.store.commit();
    applyQuality(d.engine, s.quality, true);
    if (d.hud) applyGraphics(d.engine, { hud: d.hud, chase: d.chase });
  };
  const presets = h('div', 'rb-row', `<span class="rb-lbl">${t('gfx.preset')}</span>`);
  const note = h('div', 'rb-sub', '');
  const refreshPreset = (): void => presets.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.dataset.lv === s.quality));
  const choose = (q: Quality): void => {
    s.quality = q;
    usePreset(q);
    apply();
    refreshPreset();
    rebuild();
  };
  for (const q of TIERS) {
    const b = button(t(`opt.${q}`), () => choose(q));
    b.dataset.lv = q;
    b.style.minWidth = '84px';
    presets.append(b);
  }
  const bench = button(t('gfx.bench'), () => {
    note.textContent = t('gfx.testing');
    window.setTimeout(() => {
      const r = benchmark(d.engine);
      note.textContent = t('gfx.result', { ms: r.ms.toFixed(1), tier: t(`opt.${r.tier}`).toUpperCase() });
      choose(r.tier);
    }, 60);
  });
  refreshPreset();
  const body = h('div');
  const rebuild = (): void => {
    body.replaceChildren();
    const slider = (name: string, key: keyof Graphics, min: number, max: number, step: number, fmt: (v: number) => string): void => {
      const row = h('div', 'rb-row', `<span class="rb-lbl" style="font-size:13px">${name}</span>`);
      const i = h('input') as HTMLInputElement;
      i.type = 'range';
      i.min = String(min);
      i.max = String(max);
      i.step = String(step);
      i.value = String(GRAPHICS[key]);
      const v = h('span', '', fmt(GRAPHICS[key] as number));
      v.style.cssText = 'width:64px;font-size:12px';
      i.addEventListener('input', () => {
        (GRAPHICS as unknown as Record<string, number>)[key] = parseFloat(i.value);
        v.textContent = fmt(parseFloat(i.value));
      });
      i.addEventListener('change', apply);
      row.append(i, v);
      body.append(row);
    };
    const toggle = (name: string, key: 'bloom' | 'reflections' | 'shadows'): void => {
      const row = h('label', 'rb-row', `<span class="rb-lbl" style="font-size:13px">${name}</span>`);
      const c = h('input') as HTMLInputElement;
      c.type = 'checkbox';
      c.checked = GRAPHICS[key];
      c.addEventListener('change', () => {
        GRAPHICS[key] = c.checked;
        apply();
      });
      row.append(c);
      body.append(row);
    };
    const chips = (name: string, key: 'msaa' | 'fpsCap' | 'drawDistance', opts: readonly [number, string][]): void => {
      const row = h('div', 'rb-row', `<span class="rb-lbl" style="font-size:13px">${name}</span>`);
      for (const [val, label] of opts) {
        const b = button(label, () => {
          (GRAPHICS as unknown as Record<string, number>)[key] = val;
          apply();
          row.querySelectorAll('button').forEach((x) => x.classList.toggle('hot', x === b));
        });
        b.style.cssText += ';min-width:0;padding:6px 12px;font-size:12px';
        b.classList.toggle('hot', GRAPHICS[key] === val);
        row.append(b);
      }
      body.append(row);
    };
    slider(t('gfx.res'), 'resScale', 0.5, 1.5, 0.05, (v) => `${Math.round(v * 100)}%`);
    toggle(t('gfx.bloom'), 'bloom');
    toggle(t('gfx.refl'), 'reflections');
    toggle(t('gfx.shadows'), 'shadows');
    slider(t('gfx.particles'), 'particles', 0.25, 1.5, 0.05, (v) => `${Math.round(v * 100)}%`);
    chips(t('gfx.draw'), 'drawDistance', [[0, t('gfx.short')], [1, t('opt.medium')], [2, t('gfx.far')]]);
    chips(t('gfx.aa'), 'msaa', [[0, t('opt.OFF')], [2, '2x'], [4, '4x']]);
    chips(t('gfx.fps'), 'fpsCap', [[0, t('gfx.display')], [30, '30'], [60, '60'], [120, '120']]);
    slider(t('gfx.fov'), 'fov', 50, 75, 1, (v) => `${Math.round(v)}°`);
    slider(t('gfx.hud'), 'hudScale', 0.8, 1.3, 0.05, (v) => `${Math.round(v * 100)}%`);
    slider(t('gfx.blur'), 'motionBlur', 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`);
  };
  rebuild();
  void PRESETS;
  return [presets, h('div', 'rb-row'), bench, note, body];
}
