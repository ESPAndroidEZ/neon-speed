// W4.3: renders three song joins of the real MusicDirector offline in Chromium (house > house, house > synthwave,
// synthwave > house): the old song starts 6 bars before its end, the director hands over by itself. A click shows
// as a sample-to-sample jump: the largest jump during the crossfade must stay below the largest jump in the full
// grooves (hats and kicks) before and after it; the two songs must be within 3 dB RMS of each other, no clipping. Writes logs/music/join-*.wav to listen to. Needs `npm run dev`.
// LD_LIBRARY_PATH=~/.cache/rb-chromium-libs/root/usr/lib/x86_64-linux-gnu node tests/lab/music-join.mjs
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('logs/music', { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
let failed = 0;
for (const [A, B] of [[0, 5], [6, 100], [100, 8]]) {
  const p = await b.newPage();
  await p.goto('http://localhost:5173/?probe');
  await p.waitForTimeout(2500);
  const r = await p.evaluate(async ([A, B]) => {
    const { MusicDirector } = await import('/src/audio/musicDirector.ts');
    // Vite adds ?t=<edit time> to imports of changed files: use the same module instance as the director
    const url = performance.getEntriesByType('resource').map((e) => e.name).filter((n) => n.includes('/src/audio/audioParams.ts')).pop() ?? '/src/audio/audioParams.ts';
    const { MUSIC_SOURCE } = await import(url);
    const { SONG_BARS } = await import('/src/audio/housePatterns.ts');
    const { SYNTH_BARS } = await import('/src/audio/music.ts');
    const sr = 44100, secs = 22, ctx = new OfflineAudioContext(2, sr * secs, sr);
    Object.defineProperty(ctx, 'state', { get: () => 'running' });
    const noise = ctx.createBuffer(1, sr, sr); const nd = noise.getChannelData(0); for (let i = 0; i < sr; i++) nd[i] = Math.random() * 2 - 1;
    const music = ctx.createGain(); music.gain.value = 0.55 * 0.7; music.connect(ctx.destination);
    MUSIC_SOURCE.style = 'auto';
    let join = -1, names = [];
    MUSIC_SOURCE.onSong = (n) => { names.push(n); if (names.length === 2) join = ctx.currentTime; };
    const d = new MusicDirector({ ctx, music, noise });
    d.play(A, (A === 100 ? SYNTH_BARS : SONG_BARS) - 6, 0);
    d.update(0.6);
    d.playlist.setItems([B]);
    for (let t = 0.05; t < secs - 0.3; t += 0.05) ctx.suspend(t).then(() => { d.update(0.6); ctx.resume(); });
    const buf = await ctx.startRendering();
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    const maxJump = (a, z) => { let m = 0; for (let i = Math.max(1, Math.floor(a * sr)); i < Math.min(L.length, z * sr); i++) m = Math.max(m, Math.abs(L[i] - L[i - 1]), Math.abs(R[i] - R[i - 1])); return m; };
    const rms = (a, z) => { let s = 0, n = 0; for (let i = Math.floor(a * sr); i < z * sr; i++, n++) s += L[i] * L[i]; return Math.sqrt(s / n); };
    // join = when the next song starts (2 bars before the old one ends); the crossfade runs ~2 bars after that
    const groove = Math.max(maxJump(0.3, Math.max(0.6, join - 6)), maxJump(join + 6, secs - 0.5)), fade = maxJump(join - 0.2, join + 5);
    let peak = 0; for (let i = sr; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    const pcm = new Int16Array(L.length * 2); for (let i = 0; i < L.length; i++) { pcm[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; pcm[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
    return { names, join, groove, fade, peak, rmsBefore: rms(0.3, join), rmsAfter: rms(join + 6, secs - 0.5), pcm: Array.from(new Uint8Array(pcm.buffer)) };
  }, [A, B]);
  await p.close();
  const data = Buffer.from(r.pcm), hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
  hdr.writeUInt32LE(44100, 24); hdr.writeUInt32LE(44100 * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
  const file = `logs/music/join-${r.names.join('-to-').toLowerCase().replace(/[^a-z-]+/g, '-')}.wav`;
  writeFileSync(file, Buffer.concat([hdr, data]));
  const level = Math.abs(20 * Math.log10(r.rmsBefore / r.rmsAfter));
  const ok = r.names.length === 2 && r.join > 0 && r.fade < r.groove && level < 3 && r.peak < 0.98;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.names.join(' > ')}  join at ${r.join.toFixed(2)} s, max jump crossfade ${r.fade.toFixed(3)} < grooves ${r.groove.toFixed(3)}, peak ${r.peak.toFixed(2)}, rms ${(20 * Math.log10(r.rmsBefore)).toFixed(1)} / ${(20 * Math.log10(r.rmsAfter)).toFixed(1)} dBFS -> ${file}`);
}
await b.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
