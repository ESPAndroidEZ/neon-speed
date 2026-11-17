import type { StringKey } from './en';
import { ES_CONTROLS } from './esControls';
import { ES_GAME } from './esGame';
import { ES_MENU } from './esMenu';
import { ES_ONLINE } from './esOnline';

/** Spanish UI strings (Spain Spanish: coche, móvil, conducir, matrícula, vosotros). Same keys as en.ts, enforced by the type. */
export const ES: Record<StringKey, string> = {
  ...ES_CONTROLS,
  ...ES_MENU,
  ...ES_GAME,
  ...ES_ONLINE,
};
