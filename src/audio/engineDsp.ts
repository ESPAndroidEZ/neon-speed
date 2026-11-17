import type { EngineProfile } from '../data/engineVoices';

/*
 * Engine sound synthesis, written as ONE self-contained class (no runtime imports, no module-level constants) so that
 * `EngineDsp.toString()` can be shipped into an AudioWorklet as source text. The same class runs in Node for tests.
 * The engine voices are plain data (data/engineVoices) handed to the constructor; `layout` selects one of them.
 *
 * Model: a wavetable of the firing-order harmonics (per voice, morphing from a soft low-load tone to a rich
 * full-load tone), a half-order lump for uneven firing, intake roar (filtered noise ~ load, chopped by the firing
 * pulses), an optional cam switch, diesel knock, exhaust resonance (three band filters), output darkening,
 * a rev limiter gate, and deceleration burble and pops.
 */
export class EngineDsp {
  sr: number; N: number; prof: EngineProfile[]; tables: Float32Array[][]; phase: number; ph2: number; rpm: number; rpmT: number;
  load: number; loadT: number; layout: number; cut: number; burble: number; volume: number; seed: number; cutPh: number;
  pop: number; popPh: number; z: number[]; coef: number[][]; fg: number[]; voicing: number; built: number; jit: number;
  overrun: number; prevLoad: number; ik1: number; ik2: number; kEnv: number; kLp: number; dk: number; dy: number;

  constructor(sampleRate: number, profiles: EngineProfile[]) {
    this.sr = sampleRate;
    this.N = 1024;
    this.prof = profiles;
    this.tables = [];
    for (let l = 0; l < profiles.length; l++) {
      const p = profiles[l];
      const row: Float32Array[] = [];
      for (let lv = 0; lv < 2; lv++) {
        const t = new Float32Array(this.N + 1);
        let peak = 0;
        const a = lv ? p.hi : p.lo;
        for (let i = 0; i < this.N; i++) {
          let s = 0;
          for (let k = 0; k < a.length; k++) s += (a[k] * Math.sin(2 * Math.PI * (k + 1) * (i / this.N) + k * p.phase)) / (1 + 0.15 * k);
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
    this.ph2 = 0;
    this.rpm = 1000;
    this.rpmT = 1000;
    this.load = 0;
    this.loadT = 0;
    this.layout = 0;
    this.cut = 0;
    this.burble = 0;
    this.volume = 1;
    this.seed = 12345;
    this.cutPh = 0;
    this.pop = 0;
    this.popPh = 0;
    this.z = [0, 0, 0, 0, 0, 0];
    this.voicing = 1;
    this.built = -1;
    this.coef = [[], [], []];
    this.fg = [0, 0, 0];
    this.jit = 0;
    this.overrun = 0;
    this.prevLoad = 0;
    this.ik1 = 0;
    this.ik2 = 0;
    this.kEnv = 0;
    this.kLp = 0;
    this.dk = 1;
    this.dy = 0;
    this.build();
  }

  /** Exhaust formants and output darkening for the current voice and voicing (0 smooth, 1 raspy, 2 aggressive). */
  build(): void {
    const p = this.prof[this.layout];
    const q = p.q * [1, 1.35, 1.9][this.voicing];
    const vg = [0.8, 1, 1.25][this.voicing];
    for (let k = 0; k < 3; k++) {
      this.coef[k] = this.band(p.formant[k], [1.2, 1.6, 1.1][k] * q);
      this.fg[k] = p.fGain[k] * vg;
    }
    const fc = 12000 * (1 - p.dark) * (1 - p.dark) + 500;
    this.dk = 1 - Math.exp((-2 * Math.PI * fc) / this.sr);
    this.built = this.layout * 3 + this.voicing;
  }

  /** RBJ band-pass helper: returns [b0, b2, a1, a2] normalised (constant skirt gain). */
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

  /** Set the target state (cheap; call once per block). `layout`: voice index. `cut`: rev limiter. `burble`: 0..1 pops on overrun. */
  set(rpm: number, load: number, layout: number, cut: boolean, burble: number, volume: number, voicing = 1): void {
    this.rpmT = Math.max(300, rpm);
    this.loadT = Math.min(1, Math.max(0, load));
    this.layout = Math.min(this.prof.length - 1, Math.max(0, layout | 0));
    this.cut = cut ? 1 : 0;
    this.burble = burble;
    this.volume = volume;
    this.voicing = Math.min(2, Math.max(0, voicing | 0));
    if (this.layout * 3 + this.voicing !== this.built) this.build();
  }

  /** Firing frequency in Hz (4-stroke: cylinders / 2 firings per revolution; `per` from the voice). */
  static firingHz(rpm: number, per: number): number {
    return (rpm / 60) * per;
  }

  process(out: Float32Array, n: number): void {
    const sr = this.sr;
    const p = this.prof[this.layout];
    const tabs = this.tables[this.layout];
    const N = this.N;
    const v = this.voicing;
    const drive = [0.95, 1.35, 2.0][v];
    const roarMix = [0.3, 0.55, 0.85][v] * p.roar;
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
      const idleFade = Math.max(0, 1 - this.rpm / 2600);
      const lump = 1 + this.jit * p.idle * idleFade;
      const f = (this.rpm / 60) * p.per * lump;
      this.phase += f / sr;
      if (this.phase >= 1) {
        this.phase -= 1;
        // diesel knock: one click per firing, loudest at idle and light load
        if (p.clatter > 0) this.kEnv = p.clatter * (1 - 0.5 * this.load) * Math.max(0.2, 1 - this.rpm / 4200);
      }
      this.ph2 += f / (2 * sr);
      if (this.ph2 >= 1) this.ph2 -= 1;
      const pos = this.phase * N;
      const i0 = pos | 0;
      const fr = pos - i0;
      const lo = tabs[0][i0] + (tabs[0][i0 + 1] - tabs[0][i0]) * fr;
      const hi = tabs[1][i0] + (tabs[1][i0 + 1] - tabs[1][i0]) * fr;
      const cam = p.cam > 0 ? Math.min(1, Math.max(0, (this.rpm - p.cam) / 300 + 0.5)) : 0;
      let tone = lo + (hi - lo) * Math.min(1, this.load + bright + 0.35 * cam * this.load);
      // uneven firing: every other firing a little stronger (half order), plus a rotary-style choppy idle
      tone *= 1 + p.sub * Math.sin(2 * Math.PI * this.ph2) + this.jit * p.idle * 4 * idleFade;
      // intake roar: band-limited noise whose centre rises with rpm, level ~ load^1.5, chopped by the firing pulses
      const w = this.rand();
      const fc = 0.04 + 0.22 * Math.min(1, this.rpm / 7500);
      this.ik1 += (w - this.ik1) * fc;
      this.ik2 += (this.ik1 - this.ik2) * fc * 0.7;
      const chop = 1 - p.pulse + p.pulse * 2.2 * tone * tone;
      const roar = (this.ik1 - this.ik2) * 9 * Math.pow(this.load, 1.5) * (0.35 + 0.65 * Math.min(1, this.rpm / 5000)) * chop * (1 + 1.2 * cam);
      let x = tone * (0.55 + 0.25 * this.load) + roar * roarMix;
      if (this.kEnv > 0.001) {
        this.kLp += (w - this.kLp) * 0.3;
        x += (w - this.kLp) * this.kEnv * 1.4;
        this.kEnv *= 0.9965;
      }
      // exhaust formants: three band-passed copies add the body of the pipe
      let add = 0;
      for (let k = 0; k < 3; k++) {
        const c = this.coef[k];
        const zi = k * 2;
        const y = c[0] * x + this.z[zi];
        this.z[zi] = this.z[zi + 1] - c[2] * y;
        this.z[zi + 1] = c[1] * x - c[3] * y;
        add += y * this.fg[k];
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
      this.dy += (Math.tanh(x * (drive + 0.9 * this.load)) - this.dy) * this.dk;
      out[i] = this.dy * 0.7 * p.level * this.volume;
    }
  }
}
