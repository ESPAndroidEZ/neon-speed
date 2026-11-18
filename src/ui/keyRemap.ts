import { KEY_ACTIONS } from '../input/keyBindings';
import { niceKey } from './keyName';
import type { KeyBindings } from '../input/keyBindings';
import { button, h } from './uiKit';
import { t } from '../i18n';

/**
 * Settings rows for the keyboard: one button per driving action showing its key. Press it, then press the new key
 * (Esc cancels). A key already used by another action swaps places with it; keys the game keeps for itself are refused.
 */
export function keyRows(keys: KeyBindings): HTMLElement[] {
  const rows: HTMLElement[] = [h('div', 'rb-sub', t('keys.section'))];
  const btns = new Map<string, HTMLButtonElement>();
  const refresh = (): void => {
    for (const a of KEY_ACTIONS) {
      const b = btns.get(a);
      if (b) {
        b.textContent = niceKey(keys.codes[a]);
        b.classList.remove('hot');
      }
    }
  };
  let stop: (() => void) | null = null;
  for (const a of KEY_ACTIONS) {
    const r = h('div', 'rb-row', `<span class="rb-lbl">${t(`keys.${a}`)}</span>`);
    const b = button(niceKey(keys.codes[a]), () => {
      stop?.();
      refresh();
      b.textContent = t('keys.press');
      b.classList.add('hot');
      const onKey = (e: KeyboardEvent): void => {
        if (e.code === 'Escape' || keys.set(a, e.code)) {
          // Esc cancels; a bound key is consumed so the menu does not react to it
        } else {
          b.textContent = t('keys.refused');
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        stop?.();
        refresh();
      };
      stop = (): void => {
        window.removeEventListener('keydown', onKey, true);
        stop = null;
      };
      window.addEventListener('keydown', onKey, true);
    });
    b.style.minWidth = '120px';
    btns.set(a, b);
    r.append(b);
    rows.push(r);
  }
  rows.push(button(t('keys.reset'), () => {
    stop?.();
    keys.reset();
    refresh();
  }));
  return rows;
}
