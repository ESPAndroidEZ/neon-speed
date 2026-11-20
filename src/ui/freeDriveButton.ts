import { t } from '../i18n';
import { button } from './uiKit';

let enter: (() => void) | null = null;

/** main wires Free Drive here once it is installed (the menu is built before). */
export const setFreeDrive = (fn: () => void): void => { enter = fn; };

/** Main-menu button: drive the garage car around Neon Harbor. */
export const freeDriveButton = (): HTMLButtonElement => button(t('menu.freeDrive'), () => enter?.());
