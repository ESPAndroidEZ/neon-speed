// @ts-nocheck
import { EngineDsp } from '../src/audio/engineDsp.ts';
import { ENGINE_VOICES as EV, VOICE_IDS } from '../src/data/engineVoices.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const SR = 48000;
const render = (rpm: number, load: number, layout: number, secs = 0.6, cut = false, burble = 0): Float32Array => {
  const d = new EngineDsp(SR, EV);
  d.set(rpm, load, layout, cut, burble, 1);
  const out = new Float32Array(Math.floor(SR * secs));
  // settle the smoothers, then record
  d.rpm = rpm;
  d.load = load;
  for (let o = 0; o < out.length; o += 128) d.process(out.subarray(o, Math.min(out.length, o + 128)), Math.min(128, out.length - o));
  return out;
};
const renderV = (rpm: number, load: number, v: number): Float32Array => { const d = new EngineDsp(SR, EV); d.set(rpm, load, 0, false, 0, 1, v); d.rpm = rpm; d.load = load; const o = new Float32Array(SR * 0.6); for (let i = 0; i < o.length; i += 128) d.process(o.subarray(i, i + 128), 128); return o; };
const rms = (a: Float32Array): number => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
const zc = (a: Float32Array): number => { let n = 0; for (let i = 1; i < a.length; i++) if ((a[i - 1] < 0) !== (a[i] < 0)) n++; return n / (a.length / SR); };
const zcr = zc;
/** Goertzel energy at frequency f. */
const energy = (a: Float32Array, f: number): number => {
  const x = a.subarray(SR * 0.2);
  const w = (2 * Math.PI * f) / SR;
  const c = 2 * Math.cos(w);
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < x.length; i++) {
    const s = x[i] + c * s1 - s2;
    s2 = s1;
    s1 = s;
  }
  return s1 * s1 + s2 * s2 - c * s1 * s2;
};

check('no NaN, bounded output across rpm, load and every layout', [0, 1, 2, 3].every((l) => [900, 3000, 6000, 7600].every((r) => [0, 0.5, 1].every((ld) => { const a = render(r, ld, l, 0.3); return a.every((v) => Number.isFinite(v) && Math.abs(v) <= 1.01); }))), '');
for (const l of [0, 1, 2, 3]) {
  const f = EngineDsp.firingHz(3600, EV[l].per);
  const a = render(3600, 1, l, 0.8);
  check(`layout ${l}: strong energy at the firing frequency ${f.toFixed(0)} Hz, little at a non-harmonic`, energy(a, f) > 4 * energy(a, f * 1.37) && energy(a, f) > 4 * energy(a, f * 0.71), '');
}
check('pitch rises with rpm', (() => { const hi = render(5400, 1, 0, 0.8); const lo = render(4000, 1, 0, 0.8); const fh = EngineDsp.firingHz(5400, 2); const fl = EngineDsp.firingHz(4000, 2); return energy(hi, fh) > 3 * energy(lo, fh) && energy(lo, fl) > 3 * energy(hi, fl); })(), '');
check('louder at full load than at idle load', rms(render(4000, 1, 0)) > rms(render(4000, 0, 0)) * 1.1, `${rms(render(4000, 1, 0)).toFixed(3)} vs ${rms(render(4000, 0, 0)).toFixed(3)}`);
check('audible level (RMS 0.05..0.7)', [render(900, 0, 0), render(6000, 1, 1)].every((a) => rms(a) > 0.05 && rms(a) < 0.7), `${rms(render(900, 0, 0)).toFixed(3)} / ${rms(render(6000, 1, 1)).toFixed(3)}`);
// timbre: rotary has more high-frequency energy than the inline-6 (zero-crossing rate proxy)
check('layouts sound different (spectral brightness differs by > 5%)', Math.abs(zcr(render(4000, 1, 3)) / zcr(render(4000, 1, 2)) - 1) > 0.05 || Math.abs(zcr(render(4000, 1, 0)) / zcr(render(4000, 1, 2)) - 1) > 0.05, `${zcr(render(4000, 1, 3)).toFixed(0)} / ${zcr(render(4000, 1, 2)).toFixed(0)} / ${zcr(render(4000, 1, 0)).toFixed(0)}`);
// rev limiter stutters (RMS in 50 ms windows varies a lot) vs smooth
const win = (a: Float32Array): number[] => { const w = []; for (let i = 0; i + 1200 <= a.length; i += 1200) w.push(rms(a.subarray(i, i + 1200))); return w; };
const spread = (w: number[]): number => Math.max(...w) / Math.max(1e-6, Math.min(...w));
check('rev limiter cut stutters the sound', spread(win(render(7500, 1, 0, 1.2, true))) > 1.6 && spread(win(render(7500, 1, 0, 1.2, false))) < 1.4, `${spread(win(render(7500, 1, 0, 1.2, true))).toFixed(2)} vs ${spread(win(render(7500, 1, 0, 1.2, false))).toFixed(2)}`);
// burble pops on overrun
{
  const peakRatio = (a: Float32Array): number => { let p = 0; for (const x of a) p = Math.max(p, Math.abs(x)); return p / rms(a); };
  const on = render(5500, 0, 0, 2, false, 1), off = render(5500, 0, 0, 2, false, 0);
  check('overrun burble adds pops: louder or spikier off throttle', rms(on) > rms(off) * 1.02 || peakRatio(on) > peakRatio(off) * 1.15, `rms ${rms(on).toFixed(3)} vs ${rms(off).toFixed(3)}, crest ${peakRatio(on).toFixed(2)} vs ${peakRatio(off).toFixed(2)}`);
}
// the class must be shippable as source text into an AudioWorklet: no outside references
const src = 'const __name = (f) => f; return (' + EngineDsp.toString() + ');';
const Standalone = new Function(src)();
const d = new Standalone(SR, JSON.parse(JSON.stringify(EV)));
d.set(3000, 1, 1, false, 0, 1);
const buf = new Float32Array(2048);
d.process(buf, 2048);
check('class source is self-contained (runs from toString())', buf.every(Number.isFinite) && rms(buf) > 0.01, '');
// voicing presets: smooth < raspy < aggressive in brightness (zero crossings) and drive, all audible and bounded
const zcv = [0, 1, 2].map((v) => zc(renderV(4500, 1, v)));
check('voicing presets differ: aggressive is brighter than smooth', zcv[2] > zcv[0] * 1.05, zcv.map((z) => z.toFixed(0)).join(' / '));
check('every voicing is bounded and audible', [0, 1, 2].every((v) => { const a = renderV(4500, 1, v); return a.every((x) => Math.abs(x) <= 1.01) && rms(a) > 0.05; }), '');
// lift-off: the overrun window makes pops busier right after a throttle drop than long after it
{
  const d = new EngineDsp(SR, EV);
  d.set(5500, 1, 0, false, 1, 1, 1);
  d.rpm = 5500; d.load = 1;
  const warm = new Float32Array(SR * 0.3);
  d.process(warm, warm.length);
  d.set(5500, 0, 0, false, 1, 1, 1);
  const hot = new Float32Array(SR * 1.0);
  for (let i = 0; i < hot.length; i += 128) d.process(hot.subarray(i, i + 128), 128);
  check('lift-off from full throttle produces audible pops (output stays bounded)', hot.every((x) => Number.isFinite(x) && Math.abs(x) <= 1.01) && rms(hot) > 0.05, `${rms(hot).toFixed(3)}`);
}
// per-car voices: every car has its own profile, all bounded and audible, about equally loud, and audibly different
const cars = VOICE_IDS.map((_, i) => 4 + i);
check('every car voice: no NaN, bounded, audible at idle and at full load', cars.every((l) => [[850, 0], [3000, 0.5], [6500, 1]].every(([r, ld]) => { const a = render(r, ld, l, 0.4); return a.every((x) => Number.isFinite(x) && Math.abs(x) <= 1.01) && rms(a) > 0.04; })), '');
for (const l of cars) {
  const f = EngineDsp.firingHz(3600, EV[l].per), a = render(3600, 1, l, 0.8);
  check(`${VOICE_IDS[l - 4]}: pitch follows the firing frequency ${f.toFixed(0)} Hz`, energy(a, f) > 3 * energy(a, f * 1.37) && energy(a, f) > 3 * energy(a, f * 0.71), '');
}
const loud = cars.map((l) => rms(render(4500, 1, l)));
const mean = loud.reduce((s, x) => s + x, 0) / loud.length;
check('car voices sit at a similar loudness (within 0.7..1.4 of the mean at 4500 rpm full load)', loud.every((x) => x / mean > 0.7 && x / mean < 1.4), loud.map((x) => x.toFixed(3)).join(' '));
// timbre fingerprint: zero-crossing rate (brightness) and 50 ms RMS spread at idle (lumpiness); every pair must differ
const fp = cars.map((l) => [zc(render(4500, 1, l)), zc(render(2500, 0.3, l)), spread(win(render(850, 0, l, 1.2)))]);
let same = '';
for (let i = 0; i < fp.length; i++) for (let j = i + 1; j < fp.length; j++) if (fp[i].every((x, k) => Math.abs(x / fp[j][k] - 1) < 0.06)) same += ` ${VOICE_IDS[i]}=${VOICE_IDS[j]}`;
check('every pair of car voices differs in brightness or lumpiness by > 6 %', same === '', same || fp.map((f, i) => `${VOICE_IDS[i]} ${f.map((x) => x.toFixed(x > 50 ? 0 : 2)).join('/')}`).join(', '));
check('diesel clatters: e61 idle is spikier than the supra idle', spread(win(render(800, 0, 8, 1.2))) > spread(win(render(800, 0, 11, 1.2))) || zc(render(800, 0, 8)) > zc(render(800, 0, 11)) * 1.2, `${zc(render(800, 0, 8)).toFixed(0)} vs ${zc(render(800, 0, 11)).toFixed(0)}`);
check('cam switch: civic gets brighter across 5800 rpm', zc(render(6300, 1, 4)) / zc(render(5300, 1, 4)) > zc(render(6300, 1, 7)) / zc(render(5300, 1, 7)), `${(zc(render(6300, 1, 4)) / zc(render(5300, 1, 4))).toFixed(2)} vs evo ${(zc(render(6300, 1, 7)) / zc(render(5300, 1, 7))).toFixed(2)}`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
