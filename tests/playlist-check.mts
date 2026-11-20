// @ts-nocheck
// W4.2: the music shuffle bag plays every song once before any repeats and never the same song twice in a row.
import { Playlist } from '../src/audio/playlist.ts';
import { styleItems, SYNTH_ITEM } from '../src/audio/musicDirector.ts';

let failed = 0;
const check = (n, ok, i = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  ${i}`); };
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
for (const style of ['auto', 'house', 'synth']) {
  const items = styleItems(style), n = items.length;
  const p = new Playlist(rnd);
  p.setItems(items);
  const seq = Array.from({ length: 50 }, () => p.next());
  let rounds = true, repeats = 0;
  for (let r = 0; r + n <= seq.length; r += n) if (new Set(seq.slice(r, r + n)).size !== n) rounds = false;
  for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) repeats++;
  check(`${style}: 50 rotations, every song once per round of ${n}`, rounds && seq.every((v) => items.includes(v)));
  check(`${style}: never twice in a row`, n === 1 ? repeats === 49 : repeats === 0, `${repeats} repeats`);
}
check('auto mixes the synthwave track in', styleItems('auto').includes(SYNTH_ITEM) && !styleItems('house').includes(SYNTH_ITEM));
// many seeds: also no repeat across the bag boundary after markPlayed and after a style change
let boundary = 0;
for (seed = 1; seed < 400; seed++) {
  const p = new Playlist(rnd);
  p.setItems(styleItems('house'));
  p.markPlayed(2);
  let last = 2;
  for (let i = 0; i < 30; i++) { const v = p.next(); if (v === last) boundary++; last = v; if (i === 12) p.setItems(styleItems('auto')); }
}
check('no repeat over 400 seeds incl. bag boundaries and a style change', boundary === 0, `${boundary}`);
check('empty pool returns -1', (() => { const p = new Playlist(); p.setItems([]); return p.next() === -1; })());
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
