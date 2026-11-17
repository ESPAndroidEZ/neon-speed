"""Viterbi track of the dominant engine line in [flo, fhi]: python vtrack.py clip out flo fhi -> out.npz + out.png"""
import sys, numpy as np
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
from track import load, SR
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
path, out, flo, fhi = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
x = load(path)
n, h, nfft = 2048, 441, 16384
w = np.hanning(n); fr = np.fft.rfftfreq(nfft, 1 / SR)
band = (fr >= flo) & (fr <= fhi); bf = fr[band]
frames = []
for i in range(0, len(x) - n, h):
    m = np.abs(np.fft.rfft(x[i:i + n] * w, nfft))
    lm = np.log(m[band] + 1e-6)
    frames.append(lm - np.median(lm))
E = np.array(frames)  # T x K
K = len(bf); T = len(E)
# transition: penalise log-frequency jumps (allow ~ 6 %/frame freely)
lf = np.log(bf)
cost = np.empty((T, K)); back = np.zeros((T, K), int)
cost[0] = -E[0]
idx = np.arange(K)
span = 60
for t in range(1, T):
    best = np.full(K, np.inf); arg = np.zeros(K, int)
    for d in range(-span, span + 1):
        src = np.clip(idx - d, 0, K - 1)
        c = cost[t - 1][src] + 40 * np.maximum(0, np.abs(lf - lf[src]) - 0.01) ** 1.2
        better = c < best; best[better] = c[better]; arg[better] = src[better]
    cost[t] = best - E[t]; back[t] = arg
path_k = np.zeros(T, int); path_k[-1] = int(np.argmin(cost[-1]))
for t in range(T - 1, 0, -1): path_k[t - 1] = back[t][path_k[t]]
F = bf[path_k]; S = E[np.arange(T), path_k]
tt = np.arange(T) * h / SR
db = np.array([20 * np.log10(np.sqrt(np.mean(x[i:i + n] ** 2)) + 1e-9) for i in range(0, len(x) - n, h)])
np.savez(out + '.npz', t=tt, f=F, s=S, d=db)
fig, ax = plt.subplots(figsize=(16, 4)); ax.imshow(E.T, origin='lower', aspect='auto', extent=[0, tt[-1], flo, fhi], cmap='magma', vmin=0, vmax=np.percentile(E, 99.5))
ax.plot(tt, F, 'c', lw=0.8); ax.set_xticks(np.arange(0, tt[-1], 5)); ax.grid(alpha=0.3); ax.set_title(out); plt.tight_layout(); plt.savefig(out + '.png', dpi=60)
# summary: 1 s bins
for b in ([] if len(sys.argv) < 6 else range(0, int(tt[-1]))):
    s = (tt >= b) & (tt < b + 1)
    if s.any(): print(f"{b:4d}s f {np.median(F[s]):6.1f} [{F[s].min():5.0f}-{F[s].max():5.0f}] sal {np.median(S[s]):4.1f} db {np.median(db[s]):5.1f}", end=' |' if b % 3 != 2 else '\n')
print()
