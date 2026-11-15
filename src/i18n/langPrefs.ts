import { detectLang, setLang } from './index';
import type { Lang } from './index';

/** The slice of the save store the language needs (no dependency on core/save). */
interface LangStore {
  data: { settings: { lang: '' | Lang } };
  commit(): void;
}
let store: LangStore | null = null;

/** Startup: the saved choice wins; '' (never chosen) follows the browser language (es* gives Spanish). */
export function initLang(s: LangStore, navLang: string | undefined = typeof navigator === 'undefined' ? undefined : navigator.language): Lang {
  store = s;
  const forced = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('lang'); // ?lang=es: tests and screenshots, not saved
  const l: Lang = forced === 'es' || forced === 'en' ? forced : s.data.settings.lang || detectLang(navLang);
  setLang(l);
  return l;
}

/** The player picked a language: save it and switch every open screen live. */
export function chooseLang(l: Lang): void {
  if (store) {
    store.data.settings.lang = l;
    store.commit();
  }
  setLang(l);
}
