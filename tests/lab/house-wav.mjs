// Renders 16 s of the deep house track (intensity 0.2 then 0.9) offline in Chromium -> logs/music/house.wav + level stats. Needs `npm run dev`.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
await p.goto('http://localhost:5173/?probe');
const r = await p.evaluate(async () => {
  const { HouseMusic } = await import('/src/audio/houseMusic.ts');
  const sr = 44100, secs = 16, ctx = new OfflineAudioContext(2, sr * secs, sr);
  const noise = ctx.createBuffer(1, sr, sr); const nd = noise.getChannelData(0); for (let i = 0; i < sr; i++) nd[i] = Math.random() * 2 - 1;
  const music = ctx.createGain(); music.gain.value = 0.55 * 0.7; music.connect(ctx.destination);
  const m = new HouseMusic({ ctx, music, noise });
  // offline: drive the scheduler by suspending every 50 ms
  for (let t = 0.05; t < secs - 0.3; t += 0.05) ctx.suspend(t).then(() => { m.update(true, ctx.currentTime < 8 ? 0.2 : 0.95); ctx.resume(); });
  Object.defineProperty(ctx, 'state', { get: () => 'running' });
  m.update(true, 0.2);
  const buf = await ctx.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  let peak = 0, sq = 0; for (let i = 0; i < L.length; i++) { peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); sq += L[i] * L[i]; }
  const pcm = new Int16Array(L.length * 2); for (let i = 0; i < L.length; i++) { pcm[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; pcm[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
  return { peak, rms: Math.sqrt(sq / L.length), pcm: Array.from(new Uint8Array(pcm.buffer)) };
});
const data = Buffer.from(r.pcm), hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
hdr.writeUInt32LE(44100, 24); hdr.writeUInt32LE(44100 * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
writeFileSync('logs/music/house.wav', Buffer.concat([hdr, data]));
console.log(`peak ${r.peak.toFixed(3)} rms ${r.rms.toFixed(4)} (${(20 * Math.log10(r.rms)).toFixed(1)} dBFS) -> logs/music/house.wav`);
await b.close();
