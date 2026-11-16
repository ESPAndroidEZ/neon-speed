import { HAPTIC_GAP_MS, ImpactHaptic } from '../src/input/impactHaptic';

let fails = 0;
const ok = (c: boolean, m: string): void => { if (!c) { fails++; console.error('FAIL', m); } };

const h = new ImpactHaptic();
ok(h.pulse(1, 0) === null, 'a light scrape is silent');
ok(h.pulse(NaN, 10) === null && h.pulse(-5, 20) === null, 'NaN and negative are silent');
const soft = h.pulse(4, 1000);
ok(!!soft && !soft.strong && soft.ms > 12 && soft.ms < 70, 'a bump buzzes briefly');
const softMs = soft?.ms ?? 0;
ok(h.pulse(20, 1000 + HAPTIC_GAP_MS - 1) === null, 'inside the gap nothing buzzes');
const hard = h.pulse(20, 1000 + HAPTIC_GAP_MS);
ok(!!hard && hard.strong && hard.ms === 70 && hard.ms > softMs, 'a hard hit after the gap is strong and capped at 70 ms');
ok(h.pulse(2.9, 5000) === null, 'just under the threshold');
const edge = h.pulse(3, 6000);
ok(!!edge && !edge.strong, 'exactly at the threshold buzzes lightly');
const again = new ImpactHaptic();
ok(again.pulse(5, 0) !== null, 'a fresh instance buzzes at time 0');
if (fails) process.exit(1);
console.log('impact-haptic-check ok');
