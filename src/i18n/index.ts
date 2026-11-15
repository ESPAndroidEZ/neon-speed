import { EN } from './en';
import type { StringKey } from './en';
import { ES } from './es';
import { ES_CONTENT } from './esContent';

export type { StringKey } from './en';
export type Lang = 'en' | 'es';
export const LANGS: readonly Lang[] = ['en', 'es'];
/** Names shown in the chooser, each in its own language. */
export const LANG_NAME: Record<Lang, string> = { en: 'English', es: 'Español' };

const TABLES: Record<Lang, Record<StringKey, string>> = { en: EN, es: ES };
let current: Lang = 'en';
const listeners = new Set<(l: Lang) => void>();

/** es* browser languages give Spanish, everything else English. */
export const detectLang = (navLang: string | undefined): Lang => (/^es\b|^es-/i.test(navLang ?? '') ? 'es' : 'en');

export const getLang = (): Lang => current;

/** Switch live: every listener (open menus, HUD, touch labels) re-renders its text. */
export function setLang(l: Lang): void {
  if (l === current) return;
  current = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  for (const fn of listeners) fn(l);
}

/** Called on every language change. Returns an unsubscribe. */
export function onLangChange(fn: (l: Lang) => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** Fill `{name}` placeholders. Unknown placeholders stay visible so a missing param is easy to spot. */
export function fill(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** UI string for the current language, with params. Falls back to English (never to the key). */
export function t(key: StringKey, params?: Record<string, string | number>): string {
  return fill(TABLES[current][key] || EN[key], params);
}

/**
 * Long content (story lines, radio, barks, tips, lore) is written in English in src/data and translated by its
 * English text: `tx(line)` returns the Spanish version when it exists, else the English one.
 */
export function tx(english: string, params?: Record<string, string | number>): string {
  const s = current === 'es' ? ES_CONTENT[english] : undefined;
  return fill(s ?? english, params);
}

/** For tests: a language table by code. */
export const table = (l: Lang): Record<StringKey, string> => TABLES[l];
