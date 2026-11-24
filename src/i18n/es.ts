import type { StringKey } from './en';
import { ES_CONTROLS } from './esControls';
import { ES_GAME } from './esGame';
import { ES_MENU } from './esMenu';
import { ES_ONLINE } from './esOnline';
import { ES_ACH } from './esAch';
import { ES_LOOK } from './esLook';
import { ES_STORY } from './esStory';

/** Spanish UI strings (Spain Spanish: coche, móvil, conducir, matrícula, vosotros). Same keys as en.ts, enforced by the type. */
export const ES: Record<StringKey, string> = {
  ...ES_CONTROLS,
  ...ES_MENU,
  ...ES_GAME,
  ...ES_ONLINE,
  ...ES_ACH,
  ...ES_LOOK,
  ...ES_STORY,
};
