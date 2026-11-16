// @ts-nocheck
// Renders every car's procedural engine voice to logs/engine-wav/<car>.wav for listening (no browser needed):
// idle 2 s, full-throttle pull from idle to redline in 3 gears, rev limiter 1 s, lift-off with pops 2 s.
// Usage: npx tsx tests/lab/engine-wavs.mts [voicing 0|1|2]
import { mkdirSync, writeFileSync } from 'node:fs';
import { EngineDsp } from '../../src/audio/engineDsp.ts';
import { ENGINE_VOICES, VOICE_IDS, engineVoiceIndex } from '../../src/data/engineVoices.ts';
import { CARS } from '../../src/data/cars.ts';

const SR = 44100;
const voicing = Number(process.argv[2] ?? 1);
const dir = 'logs/engine-wav';
mkdirSync(dir, { recursive: true });

function wav(data: Float32Array): Buffer {
  const b = Buffer.alloc(44 + data.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + data.length * 2, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i])) * 32000), 44 + i * 2);
  return b;
}

for (const car of CARS) {
  const idle = car.tuning.idleRpm ?? 900, red = car.tuning.redlineRpm ?? 7000;
  const voice = engineVoiceIndex(car.id, car.sound.layout);
  const d = new EngineDsp(SR, ENGINE_VOICES);
  // [seconds, rpm(t 0..1), load, cut, burble]
  const pull = (t: number): number => { const g = Math.min(2, Math.floor(t * 3)); const u = t * 3 - g; const from = g === 0 ? idle : red * 0.62; return from + (red - from) * u; };
  const segs: [number, (t: number) => number, number, boolean, number][] = [
    [2, () => idle, 0, false, 0],
    [6, pull, 1, false, 0],
    [1, () => red, 1, true, 0],
    [2.5, (t) => red - (red - idle * 1.6) * t, 0, false, 1],
    [1.5, () => idle, 0, false, 0],
  ];
  const total = segs.reduce((s, x) => s + x[0], 0);
  const out = new Float32Array(Math.floor(total * SR));
  let o = 0;
  for (const [secs, rpm, load, cut, burble] of segs) {
    const n = Math.floor(secs * SR);
    for (let i = 0; i < n; i += 128) {
      d.set(rpm(i / n), load, voice, cut, burble, 1, voicing);
      const m = Math.min(128, n - i, out.length - o);
      d.process(out.subarray(o, o + m), m);
      o += m;
    }
  }
  writeFileSync(`${dir}/${car.id}.wav`, wav(out));
  console.log(`${dir}/${car.id}.wav  ${VOICE_IDS.includes(car.id) ? 'own voice' : 'generic ' + car.sound.layout}  idle ${idle}  redline ${red}`);
}
