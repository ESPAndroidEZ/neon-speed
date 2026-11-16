import { photoName } from '../src/ui/photo.ts';

let fails = 0;
const eq = (a: unknown, b: unknown, m: string): void => {
  if (a !== b) { fails++; console.log(`FAIL ${m}: ${String(a)} != ${String(b)}`); }
};
eq(photoName(new Date(2026, 10, 16, 23, 5, 2)), 'neon-speed-20261116-230502.png', 'name padded');
eq(photoName(new Date(2027, 0, 1, 0, 0, 0)), 'neon-speed-20270101-000000.png', 'name new year');
console.log(fails ? `photo-check: ${fails} FAIL` : 'photo-check: ok');
process.exit(fails ? 1 : 0);
