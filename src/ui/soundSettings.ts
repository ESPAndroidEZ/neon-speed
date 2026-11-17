import { ENGINE_SOURCE, MIX_PRESETS, MUSIC_SOURCE, type SoundMix } from '../audio/audioParams';
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

/** Settings row: sound mix preset. Music loud (default) or engine loud; sets the Engine and Music sliders, which stay free to fine-tune. */
export function soundMixRow(s: { mix: SoundMix; engineVolume: number; musicVolume: number }, sliders: { engine: HTMLElement; music: HTMLElement }, apply: () => void, commit: () => void): HTMLElement {
  const row = h('div', 'rb-row', `<span class="rb-lbl">${t('set.mix')}</span>`);
  for (const v of ['music', 'engine'] as const) {
    const b = button(t(v === 'music' ? 'set.mixMusic' : 'set.mixEngine'), () => {
      s.mix = v;
      s.engineVolume = MIX_PRESETS[v].engine;
      s.musicVolume = MIX_PRESETS[v].music;
      for (const [el, val] of [[sliders.engine, s.engineVolume], [sliders.music, s.musicVolume]] as const) {
        const input = el.querySelector('input');
        if (input) input.value = String(val);
      }
      apply();
      commit();
      row.querySelectorAll('button').forEach((x) => x.classList.toggle('hot', x.dataset.v === v));
    });
    b.dataset.v = v;
    b.classList.toggle('hot', s.mix === v);
    b.style.minWidth = '90px';
    row.append(b);
  }
  return row;
}

/** Settings row: background music style, generative deep house or synthwave. */
export function musicStyleRow(s: { musicStyle: 'house' | 'synth' }, commit: () => void): HTMLElement {
  const row = h('div', 'rb-row', `<span class="rb-lbl">${t('set.musicStyle')}</span>`);
  for (const v of ['house', 'synth'] as const) {
    const b = button(t(v === 'house' ? 'set.musicHouse' : 'set.musicSynth'), () => {
      s.musicStyle = v;
      MUSIC_SOURCE.style = v;
      commit();
      row.querySelectorAll('button').forEach((x) => x.classList.toggle('hot', x.dataset.v === v));
    });
    b.dataset.v = v;
    b.classList.toggle('hot', s.musicStyle === v);
    b.style.minWidth = '90px';
    row.append(b);
  }
  // skip to the next deep house song; the label shows what is playing
  const skip = button('', () => {
    MUSIC_SOURCE.style = s.musicStyle = 'house';
    MUSIC_SOURCE.skip++;
    commit();
    row.querySelectorAll('button[data-v]').forEach((x) => x.classList.toggle('hot', (x as HTMLElement).dataset.v === 'house'));
    window.setTimeout(label, 120);
  });
  const label = (): void => { skip.textContent = t('set.nextSong', { song: MUSIC_SOURCE.song || '-' }); };
  label();
  row.append(skip);
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
