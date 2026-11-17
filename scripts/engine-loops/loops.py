"""Suggest and cut steady-rpm loops from a tracked clip.
suggest: loops.py suggest track.npz ord rpm1,rpm2,...            -> best windows per target
cut:     loops.py cut clip track.npz ord t0 t1 out.wav             -> pitch-flattened seamless loop (prints its rpm)"""
import sys, subprocess, numpy as np, imageio_ffmpeg, wave
OSR = 32000
def load(path, sr):
    raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'quiet', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)
def suggest(npz, ord_, targets, L=1.0, mode='any'):
    z = np.load(npz); t, f, s, d = z['t'], z['f'], z['s'], z['d']
    rpm = f * 60 / ord_; dt = t[1] - t[0]; n = int(L / dt)
    dmax = np.percentile(d, 98)
    for R in targets:
        best = []
        for i in range(0, len(t) - n, 5):
            r = rpm[i:i + n]
            if np.abs(np.log(r / R)).max() > 0.12: continue
            jit = np.std(np.diff(np.log(r))) * 100  # frame-to-frame wobble (%)
            slope = (np.log(r[-1]) - np.log(r[0])) * 100
            loud = np.median(d[i:i + n]) - dmax
            if (mode == 'on' and slope < 1) or (mode == 'off' and slope > -1): continue
            score = np.median(s[i:i + n]) - 0.8 * jit - 0.03 * abs(slope) + 0.08 * loud
            best.append((score, t[i], np.median(r), jit, slope, loud))
        best.sort(reverse=True)
        out, used = [], []
        for b in best:
            if all(abs(b[1] - u) > 2 for u in used): out.append(b); used.append(b[1])
            if len(out) == 3: break
        print(f"target {R}: " + ('; '.join(f"t={b[1]:.1f} rpm={b[2]:.0f} sc={b[0]:.2f} jit={b[3]:.2f}% slope={b[4]:+.0f}% loud={b[5]:+.0f}dB" for b in out) or 'none'))
def cut(clip, npz, ord_, t0, t1, out, static_rpm=0.0):
    x = load(clip, OSR)
    if static_rpm: return finish(x[int(t0 * OSR):int(t1 * OSR)].copy(), out, static_rpm)
    z = np.load(npz); t, f = z['t'], z['f']
    sel = (t >= t0) & (t <= t1)
    tf, ff = t[sel], f[sel]
    # refine: re-track the line inside the window at high resolution (narrow band around the coarse track, parabolic peak)
    fm = float(np.median(ff)); n = 4096; h = 160; nfft = 65536; fr = np.fft.rfftfreq(nfft, 1 / OSR)
    lo_, hi_ = np.searchsorted(fr, fm * 0.8), np.searchsorted(fr, fm * 1.25)
    tr, fv = [], []
    prev = fm
    for i in range(int(t0 * OSR) - n // 2, int(t1 * OSR) - n // 2, h):
        m = np.abs(np.fft.rfft(x[max(0, i):max(0, i) + n] * np.hanning(n), nfft))
        a, b = np.searchsorted(fr, prev * 0.94), np.searchsorted(fr, prev * 1.06)  # follow the line, max 6 % per hop
        a, b = max(a, lo_), min(b, hi_)
        if b - a < 3: a, b = lo_, hi_
        j = a + int(np.argmax(m[a:b])); y0, y1, y2 = np.log(m[j - 1:j + 2] + 1e-12)
        dj = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2 + 1e-12)
        prev = (j + dj) * OSR / nfft; tr.append((i + n / 2) / OSR); fv.append(prev)
    tf, ff = np.array(tr), np.array(fv)
    k = 7; ff = np.convolve(np.pad(ff, k // 2, mode='edge'), np.ones(k) / k, 'valid')  # smooth the track
    fref = float(np.exp(np.mean(np.log(ff))))
    # read position advances by f(p)/fref per output sample -> pitch becomes constant fref
    pos = t0 * OSR; end = t1 * OSR; ys = []
    while pos < end - 2:
        r = np.interp(pos / OSR, tf, ff) / fref
        i = int(pos); fr = pos - i
        ys.append(x[i] * (1 - fr) + x[i + 1] * fr)
        pos += 1 / r  # output pitch = input pitch x read speed, so read slower where the input is higher
    finish(np.array(ys), out, fref * 60 / ord_)
def finish(y, out, rpm):
    y -= np.mean(y)
    xf = int(0.08 * OSR)
    if len(y) < 3 * xf: raise SystemExit('too short')
    a = np.sin(np.linspace(0, np.pi / 2, xf)) ** 2  # equal-power-ish fade
    head, tail = y[:xf], y[-xf:]
    loop = y[xf:].copy(); loop[-xf:] = tail * (1 - a) + head * a  # end blends into the start -> seamless wrap
    loop *= 10 ** (-12 / 20) / (np.sqrt(np.mean(loop ** 2)) + 1e-9)  # -12 dBFS RMS, about the synth's level
    loop = np.tanh(loop / 0.9) * 0.9  # soft-limit the peaks
    with wave.open(out, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(OSR); w.writeframes((loop * 32767).astype('<i2').tobytes())
    print(f"{out.rsplit('/', 1)[-1]}: rpm {rpm:.0f} len {len(loop) / OSR:.2f}s peak {np.abs(loop).max():.2f}")
if __name__ == '__main__':
    if sys.argv[1] == 'suggest': suggest(sys.argv[2], float(sys.argv[3]), [float(v) for v in sys.argv[4].split(',')], float(sys.argv[5]) if len(sys.argv) > 5 else 1.0, sys.argv[6] if len(sys.argv) > 6 else 'any')
    else: cut(sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6]), sys.argv[7], float(sys.argv[8]) if len(sys.argv) > 8 else 0.0)
