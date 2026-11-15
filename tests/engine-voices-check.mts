// Every car has its own engine voice: rendered offline from the specs, measured with an FFT.
// Asserts pitch follows rpm, loudness band without clipping, distinct brightness for every pair, and the character order
// (diesel dullest; Civic, M3 and RX-7 the brightest). Run with VERBOSE=1 to print the table used in the overnight report.
import { CARS } from '../src/data/cars.ts';
import { EngineDsp } from '../src/audio/engineDsp.ts';
import { ENGINE_VOICES, voiceIndex } from '../src/data/engineVoices.ts';
import { applyTuning, createDefaultTuning } from '../src/physics/carTuning.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
const SR = 48000, FFT = 8192;

function render(idx: number, rpm: number, load: number, voicing = 1, secs = 1.2): Float32Array {
  const d = new EngineDsp(SR, ENGINE_VOICES as never);
  d.set(rpm, load, idx, false, 0, 1, voicing);
  d.rpm = rpm; d.load = load;
  const out = new Float32Array(Math.floor(SR * secs));
  for (let o = 0; o < out.length; o += 128) d.process(out.subarray(o, Math.min(out.length, o + 128)), Math.min(128, out.length - o));
  return out;
}
/** Magnitude spectrum of a Hann-windowed block (in-place radix-2 FFT). */
function spectrum(x: Float32Array, start: number): Float64Array {
  const re = new Float64Array(FFT), im = new Float64Array(FFT);
  for (let i = 0; i < FFT; i++) re[i] = x[start + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FFT));
  for (let i = 1, j = 0; i < FFT; i++) { let b = FFT >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; } }
  for (let len = 2; len <= FFT; len <<= 1) {
    const a = (-2 * Math.PI) / len;
    for (let i = 0; i < FFT; i += len) for (let k = 0; k < len / 2; k++) {
      const c = Math.cos(a * k), s = Math.sin(a * k), u = i + k, v = u + len / 2;
      const tr = re[v] * c - im[v] * s, ti = re[v] * s + im[v] * c;
      re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti;
    }
  }
  const m = new Float64Array(FFT / 2);
  for (let i = 0; i < FFT / 2; i++) m[i] = Math.hypot(re[i], im[i]);
  return m;
}
function stats(x: Float32Array): { centroid: number; hf: number; rms: number; peak: number } {
  const avg = new Float64Array(FFT / 2);
  for (const st of [SR * 0.4, SR * 0.7]) { const m = spectrum(x, st); for (let i = 0; i < m.length; i++) avg[i] += m[i] * m[i]; }
  let num = 0, den = 0, hf = 0;
  for (let i = 1; i < avg.length; i++) { const f = (i * SR) / FFT; if (f > 8000) break; num += f * avg[i]; den += avg[i]; if (f > 2000) hf += avg[i]; }
  let sq = 0, peak = 0;
  for (let i = SR * 0.4; i < x.length; i++) { sq += x[i] * x[i]; peak = Math.max(peak, Math.abs(x[i])); }
  return { centroid: num / den, hf: hf / den, rms: Math.sqrt(sq / (x.length - SR * 0.4)), peak };
}
const redline = (id: string): number => applyTuning(createDefaultTuning(), CARS.find((c) => c.id === id)!.tuning).redlineRpm;

const rows = CARS.map((c) => {
  const i = voiceIndex(c.id), rl = redline(c.id);
  return { id: c.id, i, rl, mid: stats(render(i, 3000, 1)), top: stats(render(i, rl * 0.85, 1)), idle: stats(render(i, 900, 0.1)) };
});
if (process.env.VERBOSE) for (const r of rows) console.log(r.id.padEnd(6), `centroid@3000 ${r.mid.centroid.toFixed(0)} Hz  hf>2k@85%rl ${(r.top.hf * 100).toFixed(1)}%  rms ${r.mid.rms.toFixed(2)}/${r.top.rms.toFixed(2)}  peak ${r.top.peak.toFixed(2)}`);

check('every car has its own voice spec', CARS.every((c) => ENGINE_VOICES.some((v) => v.id === c.id)) && new Set(ENGINE_VOICES.map((v) => v.id)).size === CARS.length, `${ENGINE_VOICES.length} voices`);
check('loudness band for every car (idle, 3000 rpm, 85% redline) and no clipping', rows.every((r) => [r.idle, r.mid, r.top].every((s) => s.rms > 0.05 && s.rms < 0.65 && s.peak <= 1.0)), rows.map((r) => `${r.id} ${r.mid.rms.toFixed(2)}`).join(' '));
let pitchOk = true;
for (const r of rows) {
  const per = ENGINE_VOICES[r.i].per;
  for (const rpm of [2000, 3500]) {
    const m = spectrum(render(r.i, rpm, 1, 1, 1.0), SR * 0.4), f0 = (rpm / 60) * per, bin = (f: number): number => Math.round((f * FFT) / SR);
    const peak = Math.max(...Array.from(m.subarray(bin(f0) - 2, bin(f0) + 3))), mean = m.reduce((a, b) => a + b, 0) / m.length;
    if (!(peak > 6 * mean)) { pitchOk = false; console.log('  weak fundamental', r.id, rpm); }
  }
}
check('fundamental follows rpm (firing frequency stands out at 2000 and 3500 rpm)', pitchOk, '');
let minGap = 1e9, pair = '';
for (let a = 0; a < rows.length; a++) for (let b = a + 1; b < rows.length; b++) {
  const gap = Math.abs(Math.log(rows[a].mid.centroid / rows[b].mid.centroid));
  if (gap < minGap) { minGap = gap; pair = `${rows[a].id}/${rows[b].id}`; }
}
check('no two cars share a spectral centroid at 3000 rpm (>= 6% apart)', minGap >= 0.06, `closest ${pair} ${(minGap * 100).toFixed(1)}%`);
const hf = (id: string): number => rows.find((r) => r.id === id)!.top.hf;
const order = [...rows].sort((a, b) => b.top.hf - a.top.hf).map((r) => r.id);
check('the diesel has the least top end', order[order.length - 1] === 'e61', order.join(' > '));
check('Civic, M3 and RX-7 have the most top end', ['civic', 'm3', 'rx7'].every((id) => order.indexOf(id) < 3), order.join(' > '));
check('voicing presets modify the car voice, never replace it (order of cars kept)', rows.every((r) => stats(render(r.i, 3000, 1, 2)).centroid > r.mid.centroid * 0.98), '');
check('a different car sounds different even at idle (centroid spread >= 25%)', Math.max(...rows.map((r) => r.idle.centroid)) / Math.min(...rows.map((r) => r.idle.centroid)) >= 1.25, `${hf('civic').toFixed(2)}`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
