import { ENGINE_SOURCE } from '../audio/audioParams';
import { t } from '../i18n';
import { button, h } from './uiKit';

/** Settings row: engine sound from the recorded loops or from the procedural synth. */
export function engineSoundRow(s: { engineSound: 'rec' | 'synth' }, commit: () => void): HTMLElement {
  const row = h('div', 'rb-row', `<span class="rb-lbl">${t('set.engineSound')}</span>`);
  for (const v of ['rec', 'synth'] as const) {
    const b = button(t(v === 'rec' ? 'set.engineRec' : 'set.engineSynth'), () => {
      s.engineSound = v;
      ENGINE_SOURCE.samples = v === 'rec';
      commit();
      row.querySelectorAll('button').forEach((x) => x.classList.toggle('hot', x.dataset.v === v));
    });
    b.dataset.v = v;
    b.classList.toggle('hot', s.engineSound === v);
    b.style.minWidth = '90px';
    row.append(b);
  }
  return row;
}

/**
 * Sound credits (CC BY attribution for the engine recordings). The text lives in public/audio/engines/CREDITS.txt,
 * outside the bundle, so the brand-safe public build never rewrites titles or links. Loaded when opened.
 */
export function soundCredits(): HTMLElement {
  const box = h('details', 'rb-sub');
  box.style.cssText += ';text-align:left;max-width:min(680px,100%);width:100%';
  const sum = h('summary', '', t('set.credits'));
  sum.style.cursor = 'pointer';
  const pre = h('pre');
  pre.style.cssText = 'white-space:pre-wrap;font-size:12px;line-height:1.4;margin:8px 0 0';
  box.append(sum, pre);
  box.addEventListener('toggle', () => {
    if (!(box as HTMLDetailsElement).open || pre.textContent) return;
    const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    fetch(`${base}audio/engines/CREDITS.txt`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((txt) => { pre.textContent = txt; })
      .catch(() => { pre.textContent = t('set.creditsError'); });
  });
  return box;
}
