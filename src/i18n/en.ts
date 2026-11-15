import { EN_CONTROLS } from './enControls';

/**
 * English UI strings: the reference table. Spanish (es.ts) must have exactly the same keys (tests/i18n-check).
 * Split by area into en*.ts files to stay under the line limit; keys are dotted by area.
 */
export const EN = {
  ...EN_CONTROLS,
} as const;

export type StringKey = keyof typeof EN;
