// @ts-nocheck
// Renders each car's RECORDED engine loops the way the game mixes them (layerMix crossfade + pitch, on/off by
// throttle) to logs/engine-wav/<car>-rec.wav: idle 2 s, pull to redline in 3 gears, lift-off 2.5 s, idle.
// Compare with the synth renders from tests/lab/engine-wavs.mts. Usage: npx tsx tests/lab/engine-sample-wavs.mts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CARS } from '../../src/data/cars.ts';
import { ENGINE_SOUNDS } from '../../src/data/engineSounds.ts';
import { layerMix } from '../../src/audio/engineSamples.ts';

const SR = 32000;
const dir = 'logs/engine-wav';
mkdirSync(dir, { recursive: true });
const readWav = (p: string): Float32Array => {
  const b = readFileSync(p);
  let o = 12;
  while (b.toString('ascii', o, o + 4) !== 'data') o += 8 + b.readUInt32LE(o + 4);
  const n = b.readUInt32LE(o + 4) / 2, out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = b.readInt16LE(o + 8 + i * 2) / 32768;
  return out;
};
const writeWav = (p: string, d: Float32Array): void => {
  const b = Buffer.alloc(44 + d.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + d.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(d.length * 2, 40);
  for (let i = 0; i < d.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, d[i])) * 32000), 44 + i * 2);
  writeFileSync(p, b);
};

for (const car of CARS) {
  const set = ENGINE_SOUNDS[car.id];
  if (!set?.layers.length) continue;
  const idle = car.tuning.idleRpm ?? 900, red = car.tuning.redlineRpm ?? 7000;
  const loops = set.layers.map((l) => ({ l, buf: readWav(`public/audio/engines/${car.id}/${l.file}`), pos: 0 }));
  const on = loops.filter((x) => x.l.load !== 'off'), off = loops.filter((x) => x.l.load !== 'on');
  const hasOff = loops.some((x) => x.l.load === 'off');
  const groups = [{ g: on, gains: new Float32Array(on.length), rates: new Float32Array(on.length) }, { g: off, gains: new Float32Array(off.length), rates: new Float32Array(off.length) }];
  const pull = (t: number): number => { const g = Math.min(2, Math.floor(t * 3)); const u = t * 3 - g; const from = g === 0 ? idle : red * 0.62; return from + (red - from) * u; };
  const segs: [number, (t: number) => number, number][] = [[2, () => idle, 0], [6, pull, 1], [2.5, (t) => red - (red - idle * 1.6) * t, 0], [1.5, () => idle, 0]];
  const out = new Float32Array(Math.floor(segs.reduce((s, x) => s + x[0], 0) * SR));
  let o = 0;
  for (const [secs, rpmAt, load] of segs) {
    const n = Math.floor(secs * SR);
    for (let i = 0; i < n && o < out.length; i++, o++) {
      const rpm = rpmAt(i / n);
      const lvl = [hasOff ? 0.35 + 0.65 * load : 0.55 + 0.45 * load, hasOff ? (1 - load) * 0.8 : 0];
      let s = 0;
      groups.forEach((G, gi) => {
        if (!lvl[gi]) return;
        layerMix(rpm, G.g.map((x) => x.l.rpm), G.gains, G.rates);
        G.g.forEach((x, k) => {
          const j = Math.floor(x.pos), f = x.pos - j, b = x.buf;
          s += (b[j % b.length] * (1 - f) + b[(j + 1) % b.length] * f) * G.gains[k] * lvl[gi];
          x.pos = (x.pos + G.rates[k]) % b.length;
        });
      });
      out[o] = s * 1.5 * 0.6;
    }
  }
  writeWav(`${dir}/${car.id}-rec.wav`, out);
  console.log(`${dir}/${car.id}-rec.wav  ${set.layers.length} loops`);
}
