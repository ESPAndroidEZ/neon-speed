import { ES_CONTENT_A } from './esContentA';
import { ES_CONTENT_B } from './esContentB';
import { ES_CONTENT_C } from './esContentC';
import { ES_CONTENT_D } from './esContentD';
import { ES_CONTENT_E } from './esContentE';
import { ES_CONTENT_F } from './esContentF';
import { ES_CONTENT_G } from './esContentG';
import { ES_CONTENT_H } from './esContentH';
import { ES_CONTENT_I } from './esContentI';
import { ES_CONTENT_J } from './esContentJ';
import { ES_CONTENT_K } from './esContentK';
import { ES_CONTENT_L } from './esContentL';
import { ES_CONTENT_M } from './esContentM';

/**
 * Spanish for long content, keyed by the exact English text in src/data (radio, barks, tips, lore, story, dialogue,
 * upgrades, car and track descriptions). Missing entries fall back to English; tests/i18n-check.mts fails on any gap.
 * To add a line: write it in English in src/data, then add `'English': 'Español'` to one of the esContent* files.
 */
export const ES_CONTENT: Record<string, string> = { ...ES_CONTENT_A, ...ES_CONTENT_B, ...ES_CONTENT_C, ...ES_CONTENT_D, ...ES_CONTENT_E, ...ES_CONTENT_F, ...ES_CONTENT_G, ...ES_CONTENT_H, ...ES_CONTENT_I, ...ES_CONTENT_J, ...ES_CONTENT_K, ...ES_CONTENT_L, ...ES_CONTENT_M };
