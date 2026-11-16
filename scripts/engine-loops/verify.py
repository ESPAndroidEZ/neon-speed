"""verify.py dir ord out.png : pitch flatness, seam click and a 4x-repeat spectrogram of every loop in dir."""
import sys, glob, wave, numpy as np, re
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
d, ord_, outp = sys.argv[1], float(sys.argv[2]), sys.argv[3]
files = sorted(glob.glob(d + '/*.wav'))
fig, axs = plt.subplots(len(files), 1, figsize=(12, 1.6 * len(files)))
axs = np.atleast_1d(axs)
for ax, f in zip(axs, files):
    w = wave.open(f); sr = w.getframerate(); y = np.frombuffer(w.readframes(w.getnframes()), '<i2') / 32768.0
    rpm = float(re.search(r'rpm(\d+)', f)[1]) if 'rpm' in f else None
    yy = np.tile(y, 4)
    n = 2048; h = 256; nfft = 16384; fr = np.fft.rfftfreq(nfft, 1 / sr)
    S = np.array([np.log(np.abs(np.fft.rfft(yy[i:i + n] * np.hanning(n), nfft))[: int(800 / sr * nfft)] + 1e-6) for i in range(0, len(yy) - n, h)])
    pk = fr[np.argmax(S[:, 40:], axis=1) + 40]
    seam = abs(y[0] - y[-1]); typ = np.median(np.abs(np.diff(y)))
    wr = np.array([np.sqrt(np.mean(y[i:i + sr // 20] ** 2)) for i in range(0, len(y) - sr // 20, sr // 100)]); lump = wr.max() / np.median(wr)
    ax.imshow(S.T, origin='lower', aspect='auto', extent=[0, len(yy) / sr, 0, 800], cmap='magma', vmin=np.percentile(S, 40))
    for k in range(1, 4): ax.axvline(k * len(y) / sr, color='c', lw=0.5, ls=':')
    ax.set_ylim(0, 600); ax.set_yticks([]); ax.set_xticks([])
    ax.set_title(f"{f.rsplit('/',1)[1]}  seam jump {seam / (typ + 1e-9):.1f}x typical step", fontsize=8, loc='left')
    print(f"{f.rsplit('/',1)[1]:28s} len {len(y)/sr:.2f}s  seam {seam / (typ + 1e-9):4.1f}x  peak-line {np.median(pk):5.0f}Hz spread {np.std(pk)/np.median(pk)*100:4.1f}%  lump {lump:.2f}  rms {20*np.log10(np.sqrt(np.mean(y**2))):.1f}dB")
plt.tight_layout(); plt.savefig(outp, dpi=60)
