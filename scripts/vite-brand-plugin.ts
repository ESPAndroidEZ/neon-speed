import type { Plugin } from 'vite';

/**
 * Brand-safe public build (VITE_PUBLIC_BUILD=1): every real car brand and model name inside a STRING LITERAL of the
 * game source is swapped for a fictional one at build time. Only names change; ids ('civic', 'rx7' ...), model file
 * names and every number stay the same, so handling, prices and saves are identical. Logos: none are drawn in code.
 * Longest names first so "Lancer Evolution VIII" never half-matches.
 */
export const PUBLIC_NAMES: [string, string][] = [
  ['Lancer Evolution', 'Lancet Evolve'],
  ['Golf IV GTI', 'Gale IV GTS'],
  ['535d Touring', '535d Tourer'],
  ['Volkswagen', 'Volkner'],
  ['Mitsubishi', 'Mitsuya'],
  ['Evolution', 'Evolve'],
  ['Toyota', 'Tokara'],
  ['Nissan', 'Nisaru'],
  ['Honda', 'Hanzo'],
  ['Mazda', 'Mazuki'],
  ['Lancer', 'Lancet'],
  ['Civic', 'Civis'],
  ['Supra', 'Sovra'],
  ['Golf', 'Gale'],
  ['RX-7', 'RZ-7'],
  ['350Z', 'Z-350'],
  ['GTI', 'GTS'],
  ['BMW', 'BMR'],
  ['E61', 'K61'],
  ['E46', 'K46'],
  ['Evo', 'Evolve'],
  ['VW', 'VK'],
  ['M3', 'R3'],
];

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
const WORDS = new RegExp(`(?<![A-Za-z0-9])(${PUBLIC_NAMES.map(([r]) => esc(r)).join('|')})(?![A-Za-z0-9])`, 'g');
const MAP = new Map(PUBLIC_NAMES);
/** Quoted strings and template literals (no nesting needed: the data files hold plain text). */
const LITERAL = /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g;

const swap = (t: string): string => t.replace(WORDS, (w) => MAP.get(w) ?? w);

/** Swap the names inside string literals of one source file. Pure, exported for tests/brand-check. */
export function publicize(code: string): string {
  return code.replace(LITERAL, (lit) => {
    if (!lit.startsWith('`')) return swap(lit);
    // template literal: swap only the text parts, never inside ${...}
    let out = '', text = '', depth = 0;
    for (let i = 0; i < lit.length; i++) {
      const c = lit[i];
      if (depth === 0 && c === '$' && lit[i + 1] === '{') {
        out += swap(text) + '${';
        text = '';
        depth = 1;
        i++;
      } else if (depth > 0) {
        out += c;
        if (c === '{') depth++;
        else if (c === '}') depth--;
      } else text += c;
    }
    return out + swap(text);
  });
}

export function brandSafe(enabled: boolean): Plugin {
  return {
    name: 'rb-brand-safe',
    enforce: 'pre',
    apply: 'build',
    transform(code, id) {
      if (!enabled || !/[\\/]src[\\/].*\.ts$/.test(id)) return null;
      const out = publicize(code);
      return out === code ? null : { code: out, map: null };
    },
  };
}
