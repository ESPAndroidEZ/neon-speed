import { AUDIO } from './audioParams';
import type { AudioBus } from './audioBus';

/** Always-on ambience bed: a low city hum (mains and traffic rumble) and distant sea washing against the quays. */
export class AmbienceBed {
  private readonly hum: GainNode;
  private readonly sea: GainNode;
  private readonly seaFilter: BiquadFilterNode;
  private readonly lfo: OscillatorNode;
  private readonly lfoGain: GainNode;

  constructor(bus: AudioBus) {
    const ctx = bus.ctx;
    this.hum = ctx.createGain();
    this.hum.gain.value = 0;
    for (const f of [55, 110.4, 165.9]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = f === 55 ? 0.5 : f < 120 ? 0.25 : 0.1;
      o.connect(g).connect(this.hum);
      o.start();
    }
    const rumble = ctx.createBiquadFilter();
    rumble.type = 'lowpass';
    rumble.frequency.value = 170;
    const rg = ctx.createGain();
    rg.gain.value = 0.6;
    bus.loopNoise().connect(rumble).connect(rg).connect(this.hum);
    this.hum.connect(bus.sfx);
    // sea: noise through a slowly sweeping low-pass, its level rising and falling like waves (0.11 Hz)
    this.seaFilter = ctx.createBiquadFilter();
    this.seaFilter.type = 'lowpass';
    this.seaFilter.frequency.value = 520;
    this.seaFilter.Q.value = 0.6;
    this.sea = ctx.createGain();
    this.sea.gain.value = 0;
    bus.loopNoise().connect(this.seaFilter).connect(this.sea).connect(bus.sfx);
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 0.11;
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 0.02;
    this.lfo.connect(this.lfoGain).connect(this.sea.gain);
    this.lfo.start();
  }

  /** `level` 0..1 (menus are quieter than racing). */
  update(level: number, bus: AudioBus): void {
    const t = bus.ctx.currentTime;
    const k = AUDIO.ambienceVolume * level;
    this.hum.gain.setTargetAtTime(0.05 * k, t, 0.5);
    this.sea.gain.setTargetAtTime(0.035 * k, t, 0.5);
    this.lfoGain.gain.setTargetAtTime(0.025 * k, t, 0.5);
  }
}
