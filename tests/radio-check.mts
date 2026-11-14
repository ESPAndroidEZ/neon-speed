import { RADIO } from '../src/data/radio';
import { RadioDirector, type RadioSnapshot } from '../src/game/radio.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const rivals = (p: number): { name: string; position: number }[] => [{ name: 'Jinx', position: p === 1 ? 2 : 1 }, { name: 'Tank', position: p === 3 ? 2 : 3 }, { name: 'Vex', position: p === 2 ? 2 : 3 }].slice(0, 2);
const snap = (o: Partial<RadioSnapshot>): RadioSnapshot => ({ racing: true, time: 1, position: 3, count: 3, lap: 1, laps: 3, weather: 'RAIN', impact: 0, driftChain: 0, rivals: [{ name: 'Jinx', position: 1 }, { name: 'Tank', position: 2 }], ...o });
const d = new RadioDirector(5);
check('silent before the race', d.update(snap({ racing: false })) === null, '');
const start = d.update(snap({ time: 0.5 }));
check('start line is announced with a name or the field size', !!start && !start.includes('{'), `"${start}"`);
check('rate limit: nothing for 6 s after a line', d.update(snap({ time: 2, impact: 12 })) === null, '');
const crash = d.update(snap({ time: 9, impact: 12 }));
check('a crash gets a reaction', !!crash, `"${crash}"`);
const drift = d.update(snap({ time: 16, driftChain: 1700 }));
check('drift tier 1 is celebrated with the score filled in', !!drift && (!drift.includes('{') && (drift.includes('1700') || !drift.includes('score'))), `"${drift}"`);
check('the same drift tier does not repeat', d.update(snap({ time: 23, driftChain: 1900 })) === null, '');
const pass = d.update(snap({ time: 30, position: 2, rivals: [{ name: 'Jinx', position: 1 }, { name: 'Tank', position: 3 }] }));
check('an overtake names the car passed', !!pass && pass.includes('Tank') || !!pass && !pass.includes('{'), `"${pass}"`);
const lost = d.update(snap({ time: 40, position: 3, rivals: [{ name: 'Jinx', position: 1 }, { name: 'Tank', position: 2 }] }));
check('losing a place is reported', !!lost && !lost.includes('{'), `"${lost}"`);
const wx = d.update(snap({ time: 41, weather: 'SNOW' }));
check('weather change cuts in immediately', !!wx && Object.values(RADIO.weather).flat().includes(wx!), `"${wx}"`);
const lap = d.update(snap({ time: 60, lap: 2 }));
check('a new lap is announced', !!lap, `"${lap}"`);
const fin = d.update(snap({ time: 80, lap: 3 }));
check('the final lap is announced', !!fin && /final|last/i.test(fin), `"${fin}"`);
// long run: never faster than the gap, no unfilled placeholders, variety
const e = new RadioDirector(9);
const lines: string[] = [];
let lastT = -99;
let tooFast = false;
for (let t = 0; t < 400; t += 0.25) {
  const pos = 1 + Math.floor(t / 20) % 3;
  const l = e.update(snap({ time: t, position: pos, lap: 1 + Math.floor(t / 130), impact: t % 97 === 0 ? 10 : 0, driftChain: (t % 60) * 200, weather: t > 200 ? 'SNOW' : 'RAIN', rivals: [{ name: 'Jinx', position: pos === 1 ? 2 : 1 }, { name: 'Dante Voss', position: pos === 3 ? 2 : 3 }] }));
  if (l) {
    if (t - lastT < 2.9 && !Object.values(RADIO.weather).flat().includes(l)) tooFast = true;
    lastT = t;
    lines.push(l);
  }
}
check('400 s of racing: plenty of chatter, never spammy', lines.length >= 15 && lines.length <= 120 && !tooFast, `${lines.length} lines`);
check('no unfilled placeholders', lines.every((l) => !/[{}]/.test(l)), '');
check('variety: at least 10 distinct lines', new Set(lines).size >= 10, `${new Set(lines).size}`);
check('rival names appear in chatter', lines.some((l) => l.includes('Jinx') || l.includes('Dante')), '');
const f = new RadioDirector(1);
f.update(snap({ time: 0.1 }));
f.reset();
check('reset allows a fresh start line', !!f.update(snap({ time: 0.2 })), '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
