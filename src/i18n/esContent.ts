import { ES_CONTENT_A } from './esContentA';
import { ES_CONTENT_B } from './esContentB';
import { ES_CONTENT_C } from './esContentC';
import { ES_CONTENT_D } from './esContentD';

/**
 * Spanish for long content, keyed by the exact English text in src/data (radio, barks, tips, lore, story, dialogue,
 * upgrades, car and track descriptions). Missing entries fall back to English; tests/i18n-check.mts fails on any gap.
 * To add a line: write it in English in src/data, then add `'English': 'Español'` to one of the esContent* files.
 */
export const ES_CONTENT: Record<string, string> = { ...ES_CONTENT_A, ...ES_CONTENT_B, ...ES_CONTENT_C, ...ES_CONTENT_D };
