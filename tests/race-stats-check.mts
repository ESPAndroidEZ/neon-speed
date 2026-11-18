import { RaceStats } from '../src/game/raceStats.ts';
let failed = 0;
const check = (n: string, ok: boolean, d = ''): void => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' - ' + d : ''}`); if (!ok) failed++; };
const s = new RaceStats();
check('empty stats show nothing', !s.any);
s.step(10); s.step(50); s.step(30);
check('top speed keeps the maximum in km/h', Math.abs(s.topKph - 180) < 1e-9, String(s.topKph));
s.step(NaN); s.step(-5);
check('junk speeds are ignored', s.topKph === 180, String(s.topKph));
s.count('NEAR MISS'); s.count('NEAR MISS'); s.count('SLIPSTREAM'); s.count('CLEAN CORNER'); s.count(null);
check('rewards are counted by kind', s.near === 2 && s.slip === 1 && s.clean === 1);
check('any is true after driving', s.any);
s.reset();
check('reset clears everything', s.topKph === 0 && s.near + s.slip + s.clean === 0 && !s.any);
if (failed) { console.log(`${failed} failed`); process.exit(1); }
