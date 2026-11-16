"""Decode a clip, track the engine firing frequency, write <name>.npz (t, f0, conf, db) and a spectrogram PNG."""
import sys, subprocess, numpy as np, imageio_ffmpeg
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
SR = 22050
def load(path):
    raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'quiet', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()
def track(x, fmin, fmax, win=0.12, hop=0.02):
    n = int(win * SR); h = int(hop * SR); nfft = 8192
    w = np.hanning(n); fr = np.fft.rfftfreq(nfft, 1 / SR)
    cands = np.geomspace(fmin, fmax, 400)
    T, F, C, D, SPEC = [], [], [], [], []
    for i in range(0, len(x) - n, h):
        seg = x[i:i + n] * w
        m = np.abs(np.fft.rfft(seg, nfft)); lm = np.log1p(m / (m.max() + 1e-9) * 1000)
        SPEC.append(lm[: int(1200 / SR * nfft)])
        # harmonic sum over the first 6 harmonics (weights falling), minus a penalty at half-harmonics (octave errors)
        idx = lambda f: np.clip((f / SR * nfft).astype(int), 0, len(lm) - 1)
        s = sum(lm[idx(cands * k)] / k ** 0.5 for k in range(1, 7)) - 0.5 * sum(lm[idx(cands * (k - 0.5))] / k ** 0.5 for k in range(1, 7))
        j = int(np.argmax(s))
        T.append(i / SR); F.append(cands[j]); C.append(float(s[j] / (np.median(s) + 1e-9))); D.append(20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9))
    return np.array(T), np.array(F), np.array(C), np.array(D), np.array(SPEC)
if __name__ == '__main__':
    path, name, fmin, fmax = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
    x = load(path)
    T, F, C, D, SPEC = track(x, fmin, fmax)
    np.savez(name + '.npz', t=T, f=F, c=C, d=D, sr=SR, n=len(x))
    fig, ax = plt.subplots(2, 1, figsize=(16, 6), sharex=True, gridspec_kw={'height_ratios': [3, 1]})
    ax[0].imshow(SPEC.T, origin='lower', aspect='auto', extent=[T[0], T[-1], 0, 1200], cmap='magma')
    ax[0].plot(T, F, 'c.', ms=1.5); ax[0].set_ylim(0, 800); ax[0].set_title(name)
    ax[1].plot(T, D, 'k', lw=0.6); ax[1].set_ylim(D.max() - 50, D.max() + 2)
    for a in ax: a.set_xticks(np.arange(0, T[-1], 5)); a.grid(alpha=0.3)
    plt.tight_layout(); plt.savefig(name + '.png', dpi=60)
    print(name, f'{len(x)/SR:.1f}s', 'peak dB', round(D.max(), 1))
