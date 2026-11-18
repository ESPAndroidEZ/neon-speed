import { EN_CONTROLS } from './enControls';
import { EN_GAME } from './enGame';
import { EN_MENU } from './enMenu';
import { EN_ONLINE } from './enOnline';
import { EN_ACH } from './enAch';
import { EN_LOOK } from './enLook';

/**
 * English UI strings: the reference table. Spanish (es.ts) must have exactly the same keys (tests/i18n-check).
 * Split by area into en*.ts files to stay under the line limit; keys are dotted by area.
 * Long content (story, radio, tips...) is NOT here: it stays in src/data and is translated by `tx()` (esContent*.ts).
 */
export const EN = {
  ...EN_CONTROLS,
  ...EN_ACH,
  ...EN_MENU,
  ...EN_GAME,
  ...EN_ONLINE,
  ...EN_LOOK,
} as const;

export type StringKey = keyof typeof EN;
