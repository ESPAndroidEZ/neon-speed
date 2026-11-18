import { pauseStatus } from '../src/game/pauseStatus.ts';

let fails = 0;
const eq = (name: string, got: string, want: string): void => {
  if (got === want) console.log(`PASS ${name}`);
  else { console.log(`FAIL ${name}: got "${got}" want "${want}"`); fails++; }
};
const base = { lap: 2, totalLaps: 3, position: 3, racerCount: 6, raceTime: 84.12 };
eq('full line', pauseStatus(base, 'LAP'), 'LAP 2/3 · P3/6 · 1:24.1');
eq('sprint hides lap', pauseStatus({ ...base, totalLaps: 1 }, 'LAP'), 'P3/6 · 1:24.1');
eq('solo hides position', pauseStatus({ ...base, racerCount: 1 }, 'LAP'), 'LAP 2/3 · 1:24.1');
eq('lap clamped', pauseStatus({ ...base, lap: 9 }, 'VUELTA'), 'VUELTA 3/3 · P3/6 · 1:24.1');
eq('lap zero becomes one', pauseStatus({ ...base, lap: 0 }, 'LAP'), 'LAP 1/3 · P3/6 · 1:24.1');
eq('seconds pad', pauseStatus({ ...base, raceTime: 5.04 }, 'LAP'), 'LAP 2/3 · P3/6 · 0:05.0');
eq('rounding carries', pauseStatus({ ...base, raceTime: 59.96 }, 'LAP'), 'LAP 2/3 · P3/6 · 1:00.0');
eq('no race', pauseStatus({ ...base, racerCount: 0 }, 'LAP'), '');
eq('NaN time', pauseStatus({ ...base, raceTime: NaN }, 'LAP'), '');
eq('negative time', pauseStatus({ ...base, raceTime: -3 }, 'LAP'), '');
if (fails) process.exit(1);
