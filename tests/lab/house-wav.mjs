// Renders each deep house song for 14 s offline in Chromium (intensity 0.3, then 0.95 after 7 s) -> logs/music/house-<n>.wav + levels. Needs `npm run dev`.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('logs/music', { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const N = 5, SECS = 14;
for (let k = 0; k < N; k++) {
  const p = await b.newPage();
  await p.goto('http://localhost:5173/?probe');
  await p.waitForTimeout(3000);
  const r = await p.evaluate(async ([k, secs]) => {
    const { HouseMusic } = await import('/src/audio/houseMusic.ts');
    const { MUSIC_SOURCE } = await import('/src/audio/audioParams.ts');
    const { HOUSE_SONGS } = await import('/src/audio/houseSongs.ts');
    if (k >= HOUSE_SONGS.length) return null;
    const sr = 44100, ctx = new OfflineAudioContext(2, sr * secs, sr);
    Object.defineProperty(ctx, 'state', { get: () => 'running' });
    const noise = ctx.createBuffer(1, sr, sr); const nd = noise.getChannelData(0); for (let i = 0; i < sr; i++) nd[i] = Math.random() * 2 - 1;
    const music = ctx.createGain(); music.gain.value = 0.55 * 0.7; music.connect(ctx.destination);
    const m = new HouseMusic({ ctx, music, noise });
    while (MUSIC_SOURCE.song !== HOUSE_SONGS[k].name) { MUSIC_SOURCE.skip++; m.update(true, 0.3); }
    for (let t = 0.05; t < secs - 0.3; t += 0.05) ctx.suspend(t).then(() => { m.update(true, ctx.currentTime < secs / 2 ? 0.3 : 0.95); ctx.resume(); });
    const buf = await ctx.startRendering();
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    let peak = 0, sq = 0; for (let i = sr * 3; i < L.length; i++) { peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); sq += L[i] * L[i]; }
    const pcm = new Int16Array(L.length * 2); for (let i = 0; i < L.length; i++) { pcm[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; pcm[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
    return { name: HOUSE_SONGS[k].name, peak, rms: Math.sqrt(sq / (L.length - sr * 3)), pcm: Array.from(new Uint8Array(pcm.buffer)) };
  }, [k, SECS]);
  await p.close();
  if (!r) break;
  const data = Buffer.from(r.pcm), hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
  hdr.writeUInt32LE(44100, 24); hdr.writeUInt32LE(44100 * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
  const file = `logs/music/house-${k + 1}-${r.name.toLowerCase().replace(/\W+/g, '-')}.wav`;
  writeFileSync(file, Buffer.concat([hdr, data]));
  console.log(`${r.name.padEnd(18)} peak ${r.peak.toFixed(2)}  rms ${(20 * Math.log10(r.rms)).toFixed(1)} dBFS  -> ${file}`);
}
await b.close();
