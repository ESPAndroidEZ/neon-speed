import type { AudioBus } from './audioBus';
import { midiToHz } from './musicPatterns';
import { t } from '../i18n';

export type UiKind = 'hover' | 'select' | 'back' | 'error';

/** Scale degrees (semitones above the song key, pentatonic so it never clashes with the menu music). */
const NOTES: Record<UiKind, readonly number[]> = { hover: [12], select: [12, 19], back: [19, 12], error: [-1, -6] };

/** Pure: MIDI notes of one blip in the given key (pitch class 0..11), around C5. Used by the tests. */
export function uiNotes(kind: UiKind, keyPc: number): number[] {
  return NOTES[kind].map((d) => 60 + ((keyPc + 12) % 12) + d - (keyPc > 6 ? 12 : 0));
}

const LEVEL: Record<UiKind, number> = { hover: 0.05, select: 0.1, back: 0.08, error: 0.09 };

/** Play one blip on the sfx bus: short sine/triangle plucks, quiet under the music. */
export function playUi(bus: AudioBus, kind: UiKind, keyPc: number): void {
  const ctx = bus.ctx;
  if (ctx.state !== 'running') return;
  const notes = uiNotes(kind, keyPc);
  for (let i = 0; i < notes.length; i++) {
    const t0 = ctx.currentTime + i * 0.06;
    const o = ctx.createOscillator();
    o.type = kind === 'error' ? 'square' : 'triangle';
    o.frequency.value = midiToHz(notes[i]);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(LEVEL[kind], t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (kind === 'hover' ? 0.07 : 0.16));
    o.connect(g).connect(bus.sfx);
    o.start(t0);
    o.stop(t0 + 0.2);
  }
}

/** One delegated listener set: hover/focus on buttons and cards, click = select / back / error. */
export function installUiSound(bus: AudioBus, getKey: () => number): void {
  const pick = (e: Event): HTMLElement | null => ((e.target as HTMLElement | null)?.closest?.('.rb-btn,.rb-card') as HTMLElement | null) ?? null;
  let last: HTMLElement | null = null;
  const hover = (e: Event): void => {
    const el = pick(e);
    if (!el || el === last || (el as HTMLButtonElement).disabled) return;
    last = el;
    playUi(bus, 'hover', getKey());
  };
  document.addEventListener('pointerover', (e) => { if ((e as PointerEvent).pointerType === 'mouse') hover(e); });
  document.addEventListener('focusin', hover);
  document.addEventListener('pointerout', () => { last = null; });
  document.addEventListener('click', (e) => {
    const el = pick(e);
    if (!el) return;
    const dis = (el as HTMLButtonElement).disabled;
    playUi(bus, dis ? 'error' : el.textContent?.trim().toLowerCase() === t('common.back').toLowerCase() ? 'back' : 'select', getKey());
  }, true);
}
