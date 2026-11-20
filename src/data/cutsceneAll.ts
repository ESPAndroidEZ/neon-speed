import type { Cutscene } from '../core/cutsceneTimeline';
import { CUTSCENES_A } from './cutscenes';
import { CUTSCENES_B } from './cutscenes2';

export const CUTSCENES: Readonly<Record<string, Cutscene>> = { ...CUTSCENES_A, ...CUTSCENES_B };
/** Story flag that remembers a cutscene was watched (it then appears in Crew > Cinematics). */
export const cutsceneFlag = (id: string): string => `cs:${id}`;
