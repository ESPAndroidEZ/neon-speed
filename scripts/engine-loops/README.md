# Engine loop cutter

How public/audio/engines/<car>/*.wav were made (2026-11-16). Python 3 + numpy, scipy, matplotlib, imageio-ffmpeg
(bundled ffmpeg), in a venv: `python3 -m venv --without-pip .venv && python3 -m pip --python .venv/bin/python install numpy scipy matplotlib imageio-ffmpeg`.

1. Download the sources listed in docs/audio-credits.md into one folder (Commons: upload.wikimedia.org original file;
   Freesound: the HQ mp3 preview) under the names used in spec.txt.
2. Track the dominant engine line: `vtrack.py <clip> <name> <fmin> <fmax>` -> name.npz + name.png (spectrogram + track).
3. Find steady windows: `loops.py suggest name.npz <ord> 2500,4500,6500 0.85 on|off|any`
   (ord = firings per crank rev of the tracked line: 2 for a four or a rotary, 3 for a six; check the top rpm against
   the real redline, and read idle lines by hand: the strongest idle line is often 2x or 3x the firing frequency).
   `screen.py` cuts the best candidates and ranks them by lump (periodic thumps) and half-to-half spectral drift.
4. Cut: `loops.py cut <clip> name.npz <ord> t0 t1 out.wav` (pitch-flattened to the window's mean rpm, 80 ms
   crossfade loop, -12 dBFS RMS, soft-limited) or with a trailing rpm for a steady idle (no flattening).
   spec.txt is the exact list used; cuts.txt maps every output file to its source and time.
5. `verify.py <dir> 2 out.png`: seam step, pitch spread, lump, plus a 4x-repeat spectrogram of each loop.
6. List the files in src/data/engineSounds.ts (name = load-rpm.wav) and credit sources in
   public/audio/engines/CREDITS.txt and docs/audio-credits.md. Render what the game plays:
   `npx tsx tests/lab/engine-sample-wavs.mts` -> logs/engine-wav/<car>-rec.wav.
