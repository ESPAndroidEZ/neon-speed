/*
 * Engine sound synthesis, written as ONE self-contained class (no imports, no module-level constants) so that
 * `EngineDsp.toString()` can be shipped into an AudioWorklet as source text. The same class runs in Node for tests.
 *
 * Model: a wavetable of the firing-order harmonics (per engine layout, morphing from a soft low-load tone to a rich
 * full-load tone), plus intake roar (filtered noise ~ load), exhaust resonance (two band emphasis filters), a rev
 * limiter gate, and deceleration burble and pops.
 *   layout: 0 inline-4, 1 V6, 2 inline-6, 3 rotary.
 */
export class EngineDsp {
  sr: number; N: number; tables: Float32Array[][]; phase: number; rpm: number; rpmT: number; load: number; loadT: number;
  layout: number; cut: number; burble: number; volume: number; seed: number; lp: number; lp2: number; cutPh: number;
  pop: number; popPh: number; z: number[]; coef: number[][]; voicing: number; voicingBuilt: number; jit: number; overrun: number; prevLoad: number; ik1: number; ik2: number;

  constructor(sampleRate: number) {
    this.sr = sampleRate;
    this.N = 1024;
    // one wavetable per layout and load level (0 = light, 1 = full load)
    const amps: number[][][] = [
      // inline-4: strong firing order (2nd crank order), lumpy half order, thin top end
      [[1, 0.5, 0.18, 0.1, 0.05, 0.03], [1, 0.7, 0.55, 0.4, 0.3, 0.22, 0.16, 0.12, 0.09, 0.07]],
      // V6: smoother, strong 3rd order with a gruff mid
      [[1, 0.35, 0.3, 0.12, 0.08, 0.04], [1, 0.6, 0.65, 0.45, 0.4, 0.28, 0.22, 0.17, 0.12, 0.1]],
      // inline-6: very smooth, silky harmonics up high
      [[1, 0.3, 0.12, 0.2, 0.05, 0.08], [1, 0.5, 0.4, 0.5, 0.35, 0.38, 0.22, 0.25, 0.14, 0.15, 0.09, 0.1]],
      // rotary: dense buzzy harmonics, slow roll-off
      [[1, 0.6, 0.5, 0.42, 0.36, 0.3, 0.26, 0.22], [1, 0.9, 0.82, 0.75, 0.68, 0.6, 0.54, 0.48, 0.42, 0.37, 0.32, 0.28, 0.24, 0.2]],
    ];
    this.tables = [];
    for (let l = 0; l < 4; l++) {
      const row: Float32Array[] = [];
      for (let lv = 0; lv < 2; lv++) {
        const t = new Float32Array(this.N + 1);
        let peak = 0;
        const a = amps[l][lv];
        for (let i = 0; i < this.N; i++) {
          let s = 0;
          for (let k = 0; k < a.length; k++) s += (a[k] * Math.sin(2 * Math.PI * (k + 1) * (i / this.N) + k * 0.7 * (l + 1))) / (1 + 0.15 * k);
          // half-order lumpiness: every second firing slightly weaker (uneven cylinders)
          s += 0.12 * Math.sin(Math.PI * (i / this.N)) * Math.sin(2 * Math.PI * (i / this.N));
          t[i] = s;
          peak = Math.max(peak, Math.abs(s));
        }
        for (let i = 0; i < this.N; i++) t[i] /= peak;
        t[this.N] = t[0];
        row.push(t);
      }
      this.tables.push(row);
    }
    this.phase = 0;
    this.rpm = 1000;
    this.rpmT = 1000;
    this.load = 0;
    this.loadT = 0;
    this.layout = 0;
    this.cut = 0;
    this.burble = 0;
    this.volume = 1;
    this.seed = 12345;
    this.lp = 0; // intake noise one-pole
    this.lp2 = 0;
    this.cutPh = 0;
    this.pop = 0;
    this.popPh = 0;
    this.z = [0, 0, 0, 0, 0, 0];
    this.voicing = 1;
    this.voicingBuilt = -1;
    this.coef = [[], [], []];
    this.jit = 0;
    this.overrun = 0;
    this.prevLoad = 0;
    this.ik1 = 0;
    this.ik2 = 0;
    this.build(1);
  }

  /** Exhaust formants for a voicing (0 smooth, 1 raspy, 2 aggressive): three resonances, sharper and hotter as it gets angrier. */
  build(voicing: number): void {
    const q = [1, 1.35, 1.9][voicing];
    this.coef = [this.band(140, 1.2 * q), this.band(430, 1.6 * q), this.band(1150, 1.1 * q)];
    this.voicingBuilt = voicing;
  }

  /** RBJ band-pass-ish peaking helper: returns [b0, b2, a1, a2] normalised (constant skirt gain). */
  band(f: number, q: number): number[] {
    const w = (2 * Math.PI * f) / this.sr;
    const al = Math.sin(w) / (2 * q);
    const a0 = 1 + al;
    return [al / a0, -al / a0, (-2 * Math.cos(w)) / a0, (1 - al) / a0];
  }

  rand(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 2147483648 - 1;
  }

  /** Set the target state (cheap; call once per block). `cut`: rev limiter engaged. `burble`: 0..1 pops on overrun. */
  set(rpm: number, load: number, layout: number, cut: boolean, burble: number, volume: number, voicing = 1): void {
    this.rpmT = Math.max(300, rpm);
    this.loadT = Math.min(1, Math.max(0, load));
    this.layout = layout | 0;
    this.cut = cut ? 1 : 0;
    this.burble = burble;
    this.volume = volume;
    this.voicing = Math.min(2, Math.max(0, voicing | 0));
    if (this.voicing !== this.voicingBuilt) this.build(this.voicing);
  }

  /** Firing frequency in Hz for a layout and rpm (4-stroke: cylinders / 2 firings per revolution). */
  static firingHz(rpm: number, layout: number): number {
    const per = [2, 3, 3, 2][layout | 0];
    return (rpm / 60) * per;
  }

  process(out: Float32Array, n: number): void {
    const sr = this.sr;
    const tabs = this.tables[this.layout];
    const N = this.N;
    const v = this.voicing;
    const drive = [0.95, 1.35, 2.0][v];
    const roarMix = [0.3, 0.55, 0.85][v];
    const gains = [[0.8, 0.45, 0.2], [0.95, 0.75, 0.5], [1.05, 1.0, 0.9]][v];
    const bright = [0, 0.12, 0.25][v];
    for (let i = 0; i < n; i++) {
      this.rpm += (this.rpmT - this.rpm) * 0.0015; // smooth rpm: no zipper noise when the telemetry steps
      this.load += (this.loadT - this.load) * 0.003;
      // lift-off detection: a fast drop from high load opens an "overrun" window where the exhaust pops and burbles
      if (this.prevLoad - this.load > 0.0008 && this.load < 0.5) this.overrun = Math.min(1, this.overrun + 0.0006 * (this.prevLoad - this.load) * 1000);
      this.prevLoad = this.load;
      this.overrun *= 0.99998;
      // lumpy idle: firing irregularity that fades out as the engine revs
      this.jit += (this.rand() * 0.03 - this.jit) * 0.0008;
      const lump = 1 + this.jit * Math.max(0, 1 - this.rpm / 2600);
      const f = EngineDsp.firingHz(this.rpm, this.layout) * lump;
      this.phase += f / sr;
      if (this.phase >= 1) this.phase -= 1;
      const pos = this.phase * N;
      const i0 = pos | 0;
      const fr = pos - i0;
      const lo = tabs[0][i0] + (tabs[0][i0 + 1] - tabs[0][i0]) * fr;
      const hi = tabs[1][i0] + (tabs[1][i0 + 1] - tabs[1][i0]) * fr;
      const tone = lo + (hi - lo) * Math.min(1, this.load + bright);
      // intake roar: band-limited noise whose centre rises with rpm and whose level follows load^1.5
      const w = this.rand();
      const fc = 0.04 + 0.22 * Math.min(1, this.rpm / 7500);
      this.ik1 += (w - this.ik1) * fc;
      this.ik2 += (this.ik1 - this.ik2) * fc * 0.7;
      const roar = (this.ik1 - this.ik2) * 9 * Math.pow(this.load, 1.5) * (0.35 + 0.65 * Math.min(1, this.rpm / 5000));
      let x = tone * (0.55 + 0.25 * this.load) + roar * roarMix;
      // exhaust formants: three band-passed copies add the body of the pipe
      let add = 0;
      for (let k = 0; k < 3; k++) {
        const c = this.coef[k];
        const zi = k * 2;
        const y = c[0] * x + this.z[zi];
        this.z[zi] = this.z[zi + 1] - c[2] * y;
        this.z[zi + 1] = c[1] * x - c[3] * y;
        add += y * gains[k];
      }
      x += add;
      // rev limiter: hard stutter gate
      if (this.cut) {
        this.cutPh += 16 / sr;
        if (this.cutPh >= 1) this.cutPh -= 1;
        x *= this.cutPh < 0.5 ? 1 : 0.06;
      }
      // overrun pops: crackle while off the throttle at high rpm, busier right after a lift-off
      const rate = (6 + 22 * this.overrun) * this.burble * (this.rpm / 6000);
      if (this.load < 0.15 && this.burble > 0 && this.rpm > 2800 && this.pop < 0.04 && Math.abs(this.rand()) < (rate / sr) * 2) {
        this.pop = 0.6 + 0.4 * Math.abs(this.rand());
        this.popPh = 0;
      }
      if (this.pop > 0.001) {
        this.popPh += (80 + 40 * v) / sr;
        x += (this.rand() * 1.2 + Math.sin(2 * Math.PI * this.popPh) * 1.1) * this.pop * 1.3;
        this.pop *= 0.9972;
      }
      out[i] = Math.tanh(x * (drive + 0.9 * this.load)) * 0.7 * this.volume;
    }
  }
}
