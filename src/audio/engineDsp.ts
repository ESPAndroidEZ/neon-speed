/*
 * Engine sound synthesis, written as ONE self-contained class (no imports, no module-level constants) so that
 * `EngineDsp.toString()` can be shipped into an AudioWorklet as source text. The same class runs in Node for tests.
 *
 * Model: one wavetable of the firing-order harmonics per voice spec (morphing from a soft low-load tone to a rich
 * full-load tone), plus intake roar (filtered noise ~ load), three exhaust resonances, a crossover brightening
 * (VTEC / intake howl), mechanical whine, diesel clatter, a rev limiter gate and deceleration pops. Everything
 * character-specific comes from an EngineVoiceSpec (data/engineVoices); `layout` selects the spec by index.
 */
import type { EngineVoiceSpec } from '../data/engineVoices';

export class EngineDsp {
  sr: number; N: number; specs: EngineVoiceSpec[]; tables: Float32Array[][]; phase: number; rpm: number; rpmT: number; load: number; loadT: number;
  layout: number; cut: number; burble: number; volume: number; seed: number; cutPh: number; wPh: number; prevW: number;
  pop: number; popPh: number; z: number[]; coef: number[][]; voicing: number; builtV: number; builtL: number; jit: number; overrun: number; prevLoad: number; ik1: number; ik2: number;

  constructor(sampleRate: number, specs: EngineVoiceSpec[]) {
    this.sr = sampleRate;
    this.N = 1024;
    this.specs = specs;
    this.tables = specs.map((sp, i) => [this.table(sp, i, 0), this.table(sp, i, 1)]);
    this.phase = 0; this.rpm = 1000; this.rpmT = 1000; this.load = 0; this.loadT = 0; this.layout = 0; this.cut = 0;
    this.burble = 0; this.volume = 1; this.seed = 12345; this.cutPh = 0; this.wPh = 0; this.prevW = 0;
    this.pop = 0; this.popPh = 0; this.z = [0, 0, 0, 0, 0, 0]; this.voicing = 1; this.builtV = -1; this.builtL = -1;
    this.coef = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    this.jit = 0; this.overrun = 0; this.prevLoad = 0; this.ik1 = 0; this.ik2 = 0;
    this.build(1, 0);
  }

  /** Firing-order wavetable of a spec at light (lv 0) or full (lv 1) load. */
  table(sp: EngineVoiceSpec, idx: number, lv: number): Float32Array {
    const N = this.N;
    const t = new Float32Array(N + 1);
    let peak = 0;
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (let k = 0; k < 16; k++) {
        const h = k + 1;
        const a = Math.exp(-sp.decay[lv] * k) * (h % 2 === 0 ? sp.even : 1) * (1 + sp.bump[1] * Math.exp(-((h - sp.bump[0]) ** 2) / 2));
        s += a * Math.sin(2 * Math.PI * h * (i / N) + k * 0.7 * (idx + 1));
      }
      // half-order lumpiness: every second firing slightly different (uneven cylinders)
      s += sp.lump * 1.4 * Math.sin(Math.PI * (i / N)) * Math.sin(2 * Math.PI * (i / N));
      t[i] = s;
      peak = Math.max(peak, Math.abs(s));
    }
    for (let i = 0; i < N; i++) t[i] /= peak;
    t[N] = t[0];
    return t;
  }

  /** Exhaust formants for a voicing (0 smooth, 1 raspy, 2 aggressive): sharper and hotter as it gets angrier. */
  build(voicing: number, layout: number): void {
    const q = [1, 1.35, 1.9][voicing];
    const sp = this.specs[layout];
    const qs = [1.2, 1.6, 1.1];
    for (let k = 0; k < 3; k++) this.band(this.coef[k], sp.formant[k], qs[k] * q);
    this.builtV = voicing;
    this.builtL = layout;
  }

  /** RBJ band-pass-ish helper, written into c = [b0, b2, a1, a2] (constant skirt gain). */
  band(c: number[], f: number, q: number): void {
    const w = (2 * Math.PI * f) / this.sr;
    const al = Math.sin(w) / (2 * q);
    const a0 = 1 + al;
    c[0] = al / a0; c[1] = -al / a0; c[2] = (-2 * Math.cos(w)) / a0; c[3] = (1 - al) / a0;
  }

  rand(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 2147483648 - 1;
  }

  /** Set the target state (cheap; call once per block). `cut`: rev limiter engaged. `burble`: 0..1 pops on overrun. */
  set(rpm: number, load: number, layout: number, cut: boolean, burble: number, volume: number, voicing = 1): void {
    this.rpmT = Math.max(300, rpm);
    this.loadT = Math.min(1, Math.max(0, load));
    this.layout = Math.min(this.specs.length - 1, Math.max(0, layout | 0));
    this.cut = cut ? 1 : 0;
    this.burble = burble;
    this.volume = volume;
    this.voicing = Math.min(2, Math.max(0, voicing | 0));
    if (this.voicing !== this.builtV || this.layout !== this.builtL) this.build(this.voicing, this.layout);
  }

  /** Firing frequency in Hz (4-stroke: `per` firings per revolution). */
  static firingHz(rpm: number, per: number): number {
    return (rpm / 60) * per;
  }

  process(out: Float32Array, n: number): void {
    const sr = this.sr;
    const sp = this.specs[this.layout];
    const tabs = this.tables[this.layout];
    const N = this.N;
    const v = this.voicing;
    const drive = [0.95, 1.35, 2.0][v] * sp.drive;
    const roarMix = [0.3, 0.55, 0.85][v] * sp.roar;
    const gains = [[0.8, 0.45, 0.2], [0.95, 0.75, 0.5], [1.05, 1.0, 0.9]][v];
    const bright = [0, 0.12, 0.25][v];
    const fg = sp.fgain;
    for (let i = 0; i < n; i++) {
      this.rpm += (this.rpmT - this.rpm) * 0.0015; // smooth rpm: no zipper noise when the telemetry steps
      this.load += (this.loadT - this.load) * 0.003;
      // lift-off detection: a fast drop from high load opens an "overrun" window where the exhaust pops and burbles
      if (this.prevLoad - this.load > 0.0008 && this.load < 0.5) this.overrun = Math.min(1, this.overrun + 0.6 * (this.prevLoad - this.load));
      this.prevLoad = this.load;
      this.overrun *= 0.99998;
      // lumpy idle: firing irregularity that fades out as the engine revs
      this.jit += (this.rand() * sp.idle - this.jit) * 0.0008;
      const lump = 1 + this.jit * Math.max(0, 1 - this.rpm / 2600);
      this.phase += (EngineDsp.firingHz(this.rpm, sp.per) * lump) / sr;
      if (this.phase >= 1) this.phase -= 1;
      const pos = this.phase * N;
      const i0 = pos | 0;
      const fr = pos - i0;
      const lo = tabs[0][i0] + (tabs[0][i0 + 1] - tabs[0][i0]) * fr;
      const hi = tabs[1][i0] + (tabs[1][i0 + 1] - tabs[1][i0]) * fr;
      // crossover: above the VTEC / howl rpm the tone opens up, and the whine and roar rise with it
      const x0 = Math.min(1, Math.max(0, (this.rpm - sp.vtec[0]) / 700));
      const cross = sp.vtec[1] > 0 ? x0 * x0 * (3 - 2 * x0) * sp.vtec[1] : 0;
      const tone = lo + (hi - lo) * Math.min(1, this.load + bright + cross);
      // intake roar: band-limited noise whose centre rises with rpm and whose level follows load^1.5
      const w = this.rand();
      const fc = 0.04 + sp.roarHz * Math.min(1, this.rpm / 7500);
      this.ik1 += (w - this.ik1) * fc;
      this.ik2 += (this.ik1 - this.ik2) * fc * 0.7;
      const roar = (this.ik1 - this.ik2) * 9 * Math.pow(this.load, 1.5) * (0.35 + 0.65 * Math.min(1, this.rpm / 5000)) * (1 + cross);
      let x = tone * (0.55 + 0.25 * this.load) + roar * roarMix;
      if (sp.whine[1] > 0) {
        this.wPh += ((this.rpm / 60) * sp.whine[0]) / sr;
        if (this.wPh >= 1) this.wPh -= 1;
        x += Math.sin(6.2831853 * this.wPh) * sp.whine[1] * (0.25 + 0.75 * this.load) * Math.min(1, this.rpm / 4000) * (1 + cross);
      }
      if (sp.clatter > 0 && this.phase < 0.14) {
        // diesel clatter: a short noise tick at every firing, strongest at idle and low revs
        const nz = this.rand();
        x += (nz - this.prevW) * sp.clatter * (1 - this.phase / 0.14) * (1.3 - Math.min(1, this.rpm / 4200)) * 0.6;
        this.prevW = nz;
      }
      // exhaust formants: three band-passed copies add the body of the pipe
      let add = 0;
      for (let k = 0; k < 3; k++) {
        const c = this.coef[k];
        const zi = k * 2;
        const y = c[0] * x + this.z[zi];
        this.z[zi] = this.z[zi + 1] - c[2] * y;
        this.z[zi + 1] = c[1] * x - c[3] * y;
        add += y * gains[k] * fg[k];
      }
      x += add;
      // rev limiter: stutter gate (rate and depth per car)
      if (this.cut) {
        this.cutPh += sp.cut[0] / sr;
        if (this.cutPh >= 1) this.cutPh -= 1;
        x *= this.cutPh < 0.5 ? 1 : sp.cut[1];
      }
      // overrun pops: crackle while off the throttle at high rpm, busier right after a lift-off
      const rate = (6 + 22 * this.overrun) * this.burble * sp.pop * (this.rpm / 6000);
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
