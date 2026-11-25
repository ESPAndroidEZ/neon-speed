import { writeFileSync } from 'node:fs';
import { CARS } from '../../src/data/cars.ts';
import { TRACKS } from '../../src/data/tracks/index.ts';
import { BOTS } from './bots.mts';
import { runLaps, WEATHERS, type LapStats } from './laps.mts';

/* Handling lab: bot drivers on every car x map x weather. Usage: npx tsx tests/lab/handling-lab.mts <label> [assist] [street]. */
const label = process.argv[2] ?? 'run';
const assist = (process.argv[3] ?? 'STANDARD') as 'BEGINNER' | 'STANDARD' | 'PRO';
const mod = process.argv[4] === 'street' ? (await import('../../src/physics/drivingStyle.ts')).streetTuning : undefined;
const rows: (LapStats & { car: string; track: string; weather: string; bot: string })[] = [];
for (const bot of BOTS) for (const c of CARS) for (const tr of TRACKS) for (const w of WEATHERS)
  rows.push({ car: c.id, track: tr.id, weather: w, bot, ...runLaps({ car: c.id, track: tr.id, weather: w, bot, assist, mod }) });

const f = (v: number, d = 2): string => v.toFixed(d);
function agg(sel: (r: (typeof rows)[number]) => boolean): string {
  const rs = rows.filter(sel);
  const laps = rs.reduce((a, r) => a + r.laps, 0);
  const sum = (k: 'spins' | 'stuck' | 'hits'): number => rs.reduce((a, r) => a + r[k], 0);
  const mean = (k: 'driftShare' | 'slip90' | 'slip99' | 'lapSd'): number => rs.reduce((a, r) => a + r[k], 0) / rs.length;
  const dnf = rs.filter((r) => r.laps < 4).length;
  return `laps ${String(laps).padStart(4)}  spins/lap ${f(sum('spins') / laps)}  stuck/lap ${f(sum('stuck') / laps)}  wallhits/lap ${f(sum('hits') / laps)}  drift% ${f(mean('driftShare') * 100, 1)}  slip p90 ${f(mean('slip90'))} p99 ${f(mean('slip99'))}  lap sd ${f(mean('lapSd'), 1)}s  dnf ${dnf}`;
}
console.log(`== handling lab: ${label} (assist ${assist})`);
for (const bot of BOTS) {
  console.log(`\n[${bot}]  ${agg((r) => r.bot === bot)}`);
  for (const w of WEATHERS) console.log(`  ${w.padEnd(6)} ${agg((r) => r.bot === bot && r.weather === w)}`);
  for (const c of CARS) console.log(`  ${c.id.padEnd(6)} ${agg((r) => r.bot === bot && r.car === c.id)}`);
  for (const t of TRACKS) console.log(`  ${t.id.padEnd(12).slice(0, 12)} ${agg((r) => r.bot === bot && r.track === t.id)}`);
}
const worst = rows.filter((r) => r.bot === 'keyboard').sort((a, b) => b.spins / Math.max(1, b.laps) - a.spins / Math.max(1, a.laps)).slice(0, 6);
console.log('\nworst keyboard cases: ' + worst.map((r) => `${r.car}/${r.track}/${r.weather} ${r.spins}sp/${r.laps}l`).join('  '));
writeFileSync(`logs/handling/${label}.json`, JSON.stringify(rows));
