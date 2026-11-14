import { EngineDsp } from './engineDsp';

/** One engine sound source. Implemented by the AudioWorklet synth and by the oscillator fallback. */
export interface EngineVoice {
  /** Connect this to the mix. */
  readonly out: AudioNode;
  set(rpm: number, load: number, layout: number, cut: boolean, burble: number, volume: number): void;
  dispose(): void;
}

const NAME = 'rb-engine';
const loaded = new WeakMap<BaseAudioContext, Promise<boolean>>();

/** Worklet source: the pure EngineDsp class shipped as text, wrapped in a processor. */
function workletSource(): string {
  return `const __name = (f) => f;
const EngineDsp = ${EngineDsp.toString()};
registerProcessor('${NAME}', class extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return ['rpm', 'load', 'layout', 'cut', 'burble', 'vol'].map((name) => ({ name, defaultValue: name === 'rpm' ? 1000 : name === 'vol' ? 1 : 0, automationRate: 'k-rate' }));
  }
  constructor() { super(); this.d = new EngineDsp(sampleRate); }
  process(_in, out, p) {
    const o = out[0][0];
    this.d.set(p.rpm[0], p.load[0], p.layout[0], p.cut[0] > 0.5, p.burble[0], p.vol[0]);
    this.d.process(o, o.length);
    for (let c = 1; c < out[0].length; c++) out[0][c].set(o);
    return true;
  }
});`;
}

/** Create a worklet-backed engine voice, or null when AudioWorklet is unavailable or fails (caller falls back). */
export async function createWorkletVoice(ctx: AudioContext): Promise<EngineVoice | null> {
  if (!ctx.audioWorklet || typeof Blob === 'undefined') return null;
  let p = loaded.get(ctx);
  if (!p) {
    const url = URL.createObjectURL(new Blob([workletSource()], { type: 'application/javascript' }));
    p = ctx.audioWorklet.addModule(url).then(() => true, () => false).finally(() => URL.revokeObjectURL(url));
    loaded.set(ctx, p);
  }
  if (!(await p)) return null;
  try {
    const node = new AudioWorkletNode(ctx, NAME, { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] });
    const prm = (n: string): AudioParam => node.parameters.get(n) as AudioParam;
    const [rpm, load, layout, cut, burble, vol] = ['rpm', 'load', 'layout', 'cut', 'burble', 'vol'].map(prm);
    return {
      out: node,
      set(r, l, lay, c, b, v) {
        rpm.value = r;
        load.value = l;
        layout.value = lay;
        cut.value = c ? 1 : 0;
        burble.value = b;
        vol.value = v;
      },
      dispose() {
        node.disconnect();
      },
    };
  } catch {
    return null;
  }
}

/** Oscillator fallback with the same interface: saw + square + triangle at the firing frequency, through a lowpass. */
export function createOscillatorVoice(ctx: AudioContext): EngineVoice {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 2.5;
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) curve[i] = Math.tanh(((i / 255) * 2 - 1) * 2.2);
  shaper.curve = curve;
  const mix: [OscillatorType, number, number][] = [['sawtooth', 1, 0.5], ['square', 0.5, 0.35], ['triangle', 2, 0.25]];
  const oscs = mix.map(([type, mul, lvl]) => {
    const o = ctx.createOscillator();
    o.type = type;
    const g = ctx.createGain();
    g.gain.value = lvl;
    o.connect(g).connect(shaper);
    o.start();
    return { o, mul };
  });
  shaper.connect(filter).connect(gain);
  return {
    out: gain,
    set(rpm, load, layout, _cut, _burble, volume) {
      const t = ctx.currentTime;
      const hz = EngineDsp.firingHz(rpm, layout);
      for (const { o, mul } of oscs) o.frequency.setTargetAtTime(hz * mul, t, 0.03);
      filter.frequency.setTargetAtTime(350 + rpm * 0.45 + Math.max(0.2, load) * 1300, t, 0.05);
      gain.gain.setTargetAtTime((0.1 + Math.max(0.2, load) * 0.14) * volume, t, 0.08);
    },
    dispose() {
      for (const { o } of oscs) o.stop();
      gain.disconnect();
    },
  };
}
