import type { ControlStore } from '../input/controlPrefs';
import type { TouchControls } from './touchControls';
import { presetLayout, type LayoutPreset } from './touchLayout';
import { button, h } from './uiKit';
import { t } from '../i18n';

/**
 * "Edit buttons" screen for phones: the real touch buttons stay on screen and can be dragged anywhere (saved per scheme),
 * with one-tap presets that put the handbrake (and nitro) on the right under the gas thumb, and a size slider.
 */
export function openLayoutEditor(touch: TouchControls, prefs: ControlStore): void {
  const c = prefs.data;
  const root = h('div', 'rb-layer');
  root.style.cssText += ';z-index:2700;background:#05060dd9;pointer-events:none;justify-content:flex-start;padding-top:max(10px,env(safe-area-inset-top));gap:8px';
  const bar = h('div', 'rb-row');
  bar.style.cssText += ';pointer-events:auto;flex-wrap:wrap;justify-content:center;gap:8px;max-width:min(560px,60vw)';
  const set = (next: typeof c.layout): void => {
    for (const k of Object.keys(c.layout)) delete c.layout[k]; // same object: the drag handler keeps writing to it
    Object.assign(c.layout, next);
    prefs.commit();
  };
  const preset = (label: string, p: LayoutPreset): HTMLElement => button(label, () => set(presetLayout(p, touch.layer, c.scheme, c.layout)));
  const size = h('input') as HTMLInputElement;
  size.type = 'range';
  size.min = '0.8';
  size.max = '1.4';
  size.step = '0.05';
  size.value = String(c.btnScale);
  size.addEventListener('input', () => {
    c.btnScale = parseFloat(size.value);
    prefs.commit();
  });
  const done = button(t('ctl.done'), () => {
    touch.setEditing(false);
    root.remove();
    prefs.commit();
  }, 'hot');
  bar.append(
    preset(t('ctl.presetHb'), 'hb-right'),
    preset(t('ctl.presetBoth'), 'both-right'),
    button(t('ctl.presetReset'), () => {
      size.value = '1';
      c.btnScale = 1;
      set({});
    }),
    h('span', 'rb-sub', t('ctl.btnSize')), size, done,
  );
  root.append(h('h3', '', t('ctl.editTitle')), h('div', 'rb-sub', t('ctl.editHelp')), bar);
  document.body.append(root);
  touch.setEditing(true, c.layout, () => prefs.commit());
}
