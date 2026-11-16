"""screen.py clip track ord L mode target... : cut the 5 best windows per target, rank by lump + half-to-half spectral change."""
import sys, io, contextlib, numpy as np, wave, tempfile, os
sys.path.insert(0, os.path.dirname(__file__)); import loops
clip, trk, ord_, L, mode = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
def quality(path):
    w = wave.open(path); sr = w.getframerate(); y = np.frombuffer(w.readframes(w.getnframes()), '<i2') / 32768.0
    wr = np.array([np.sqrt(np.mean(y[i:i + sr // 20] ** 2)) for i in range(0, len(y) - sr // 20, sr // 100)])
    h = len(y) // 2; spec = lambda a: 20 * np.log10(np.abs(np.fft.rfft(a * np.hanning(len(a)), 8192))[:1000] + 1e-6)
    a, b = spec(y[:h]), spec(y[h:2 * h])
    return wr.max() / np.median(wr), float(np.mean(np.abs(a - b)))
z = np.load(trk + '.npz'); t, f, s, d = z['t'], z['f'], z['s'], z['d']
rpm = f * 60 / ord_; dt = t[1] - t[0]; n = int(L / dt)
for R in [float(v) for v in sys.argv[6:]]:
    c = []
    for i in range(0, len(t) - n, 5):
        r = rpm[i:i + n]
        if np.abs(np.log(r / R)).max() > 0.15: continue
        slope = (np.log(r[-1]) - np.log(r[0])) * 100
        if (mode == 'on' and slope < 1) or (mode == 'off' and slope > -1): continue
        c.append((np.median(s[i:i + n]) - 0.8 * np.std(np.diff(np.log(r))) * 100, t[i]))
    c.sort(reverse=True); picks = []
    for sc, t0 in c:
        if all(abs(t0 - p) > 1.5 for p in picks): picks.append(t0)
        if len(picks) == 6: break
    res = []
    for t0 in picks:
        tmp = tempfile.mktemp(suffix='.wav')
        with contextlib.redirect_stdout(io.StringIO()) as o: loops.cut(clip, trk + '.npz', ord_, t0, t0 + L, tmp)
        lump, drift = quality(tmp); os.remove(tmp)
        res.append((lump + drift / 4, t0, lump, drift, o.getvalue().split('rpm ')[1].split()[0]))
    res.sort()
    print(f"target {R:.0f} {mode}: " + ' | '.join(f"t={r[1]:.1f} rpm={r[4]} lump={r[2]:.2f} drift={r[3]:.1f}dB" for r in res[:3]))
