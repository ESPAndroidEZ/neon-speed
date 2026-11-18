import { keyLabel } from '../input/keyBindings';
import { t } from '../i18n';

/** Key name in the player's language (Space and Shift are translated; the rest is the same everywhere). */
export function niceKey(code: string): string {
  if (code === 'Space') return t('keys.space');
  if (code === 'ShiftLeft' || code === 'ShiftRight') return t('keys.shift');
  return keyLabel(code);
}
