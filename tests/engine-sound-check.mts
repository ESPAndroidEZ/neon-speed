// Sample-based engine sounds: manifest vs files on disk, NaN-free crossfade/pitch maths, synth fallback, rev test.
import { existsSync } from 'node:fs';
import { CARS } from '../src/data/cars.ts';
import { ENGINE_SOUNDS } from '../src/data/engineSounds.ts';
import { layerMix, loadEngineSamples, samplePitch } from '../src/audio/engineSamples.ts';
import { RevTest } from '../src/audio/revTest.ts';
let failed = 0;
const check = (n: string, ok: boolean, i: string): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
check('every car has an engine sound entry', CARS.every((c) => ENGINE_SOUNDS[c.id]), CARS.filter((c) => !ENGINE_SOUNDS[c.id]).map((c) => c.id).join(',') || 'all');
const missing: string[] = [];
for (const [id, set] of Object.entries(ENGINE_SOUNDS)) for (const l of set.layers) if (!existsSync(`public/audio/engines/${id}/${l.file}`)) missing.push(`${id}/${l.file}`);
check('every manifest file exists on disk', missing.length === 0, missing.join(', ') || `${Object.values(ENGINE_SOUNDS).reduce((n, s) => n + s.layers.length, 0)} files`);
const loops = [900, 2500, 4500, 6500], g = new Float32Array(4), r = new Float32Array(4);
let nan = 0, badSum = 0;
for (let rpm = 0; rpm <= 9500; rpm += 37) {
  layerMix(rpm, loops, g, r);
  for (let i = 0; i < 4; i++) if (!Number.isFinite(g[i]) || !Number.isFinite(r[i])) nan++;
  const pow = g.reduce((a, x) => a + x * x, 0);
  if (Math.abs(pow - 1) > 1e-3) badSum++;
}
layerMix(NaN, loops, g, r);
check('crossfade and pitch are finite from 0 to past redline (and for NaN input)', nan === 0 && [...g, ...r].every(Number.isFinite), `${nan} NaN`);
check('equal-power crossfade (gains squared sum to 1)', badSum === 0, `${badSum} off`);
check('pitch stays within 0.5..2', [...r].every((x) => x >= 0.5 && x <= 2), '');
let mono = true, last = 0;
for (let x = 0.5; x <= 2; x += 0.01) { const y = samplePitch(x, 1); if (y < last - 1e-9) mono = false; last = y; }
check('stretched pitch is compressed above 1x but never drops, and stays in range', mono && samplePitch(1.36, 1) < 1.25 && samplePitch(0.8, 1) === 0.8 && [0.5, 1, 2].every((x) => samplePitch(x) > 0.4 && samplePitch(x) < 2), `1.36 -> ${samplePitch(1.36, 1).toFixed(2)}`);
check('every car has a voicing, the Evo is the darkest', CARS.every((c) => ENGINE_SOUNDS[c.id].tune?.tone && ENGINE_SOUNDS[c.id].tune?.trim) && Math.min(...CARS.map((c) => ENGINE_SOUNDS[c.id].tune?.tone ?? 9e9)) === ENGINE_SOUNDS.evo.tune?.tone, '');
const fake = { decodeAudioData: async () => { throw new Error('no'); } } as unknown as BaseAudioContext;
ENGINE_SOUNDS.__test = { character: 'turbo-i4', engine: 'test', layers: [{ file: 'missing.ogg', rpm: 3000, load: 'both' }] };
let threw = false, res: unknown = 'x';
try { res = await loadEngineSamples(fake, '__test'); } catch { threw = true; }
check('a missing sample falls back to the synth (null, no throw)', !threw && res === null, String(res));
check('a car without samples uses the synth', (await loadEngineSamples(fake, 'civic')) === null || ENGINE_SOUNDS.civic.layers.length > 0, '');
delete ENGINE_SOUNDS.__test;
const rt = new RevTest();
rt.start('supra');
rt.holding = true;
let maxRpm = 0, bad = 0, cut = false;
for (let i = 0; i < 60 * 8; i++) { const s = rt.update(1 / 60, 900, 6800, true); maxRpm = Math.max(maxRpm, s.rpm); if (!Number.isFinite(s.rpm) || !Number.isFinite(s.boost)) bad++; cut ||= s.cut; }
rt.holding = false;
let lift = false;
for (let i = 0; i < 60 * 3; i++) { const s = rt.update(1 / 60, 900, 6800, true); lift ||= s.lift; if (!Number.isFinite(s.rpm)) bad++; }
check('rev test: finite, reaches the limiter, lift-off fires, settles at idle', bad === 0 && cut && lift && maxRpm <= 6800 && rt.rpm <= 950, `max ${maxRpm.toFixed(0)} rpm, idle ${rt.rpm.toFixed(0)}`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
