import { midiToHz } from './musicPatterns';

/** What a voice needs to make sound. `lite` (phones) drops detuned partners and the pad. */
export interface VoiceKit { ctx: BaseAudioContext; noise: AudioBuffer; lite: boolean }

function gainEnv(ctx: BaseAudioContext, t: number, attack: number, peak: number, dur: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  return g;
}

function osc(k: VoiceKit, type: OscillatorType, hz: number, t: number, dur: number, cents: number, dest: AudioNode): void {
  const o = k.ctx.createOscillator();
  o.type = type;
  o.frequency.value = hz;
  o.detune.value = cents;
  o.connect(dest);
  o.start(t);
  o.stop(t + dur + 0.03);
}

/** Filtered burst from the shared noise buffer (hats, claps, crash). */
export function noiseHit(k: VoiceKit, dest: AudioNode, t: number, dur: number, type: BiquadFilterType, freq: number, level: number, q = 0.7): void {
  const s = k.ctx.createBufferSource();
  s.buffer = k.noise;
  const f = k.ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  s.connect(f).connect(gainEnv(k.ctx, t, 0.002, level, dur)).connect(dest);
  s.start(t, (t * 7.31) % 1.5);
  s.stop(t + dur + 0.03);
}

export function kick(k: VoiceKit, dest: AudioNode, t: number, v: number): void {
  const o = k.ctx.createOscillator();
  o.frequency.setValueAtTime(165, t);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.1);
  const g = k.ctx.createGain();
  g.gain.setValueAtTime(0.5 * v, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.32);
  noiseHit(k, dest, t, 0.012, 'highpass', 3000, 0.1 * v); // beater click
}

export function clap(k: VoiceKit, dest: AudioNode, t: number, v: number): void {
  noiseHit(k, dest, t, 0.02, 'bandpass', 1500, 0.2 * v, 1.2);
  noiseHit(k, dest, t + 0.012, 0.02, 'bandpass', 1500, 0.18 * v, 1.2);
  noiseHit(k, dest, t + 0.026, 0.16, 'bandpass', 1300, 0.2 * v, 1.0);
}

export function hat(k: VoiceKit, dest: AudioNode, t: number, v: number, open: boolean): void {
  noiseHit(k, dest, t, open ? 0.14 : 0.04, 'highpass', open ? 6500 : 8000, (open ? 0.08 : 0.06) * v);
}

export function crash(k: VoiceKit, dest: AudioNode, t: number): void {
  noiseHit(k, dest, t, 1.3, 'highpass', 5200, 0.13);
}

/** Noise sweep that climbs for `dur` seconds, then stops (the lead-in to a drop). */
export function riser(k: VoiceKit, dest: AudioNode, t: number, dur: number): void {
  const s = k.ctx.createBufferSource();
  s.buffer = k.noise;
  s.loop = true;
  const f = k.ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 2;
  f.frequency.setValueAtTime(300, t);
  f.frequency.exponentialRampToValueAtTime(7000, t + dur);
  const g = k.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.14, t + dur);
  g.gain.linearRampToValueAtTime(0, t + dur + 0.04);
  s.connect(f).connect(g).connect(dest);
  s.start(t);
  s.stop(t + dur + 0.06);
}

/** Saw plus a sine sub, with a closing lowpass: the rolling house bass. */
export function bass(k: VoiceKit, dest: AudioNode, t: number, midi: number, dur: number, v: number): void {
  const hz = midiToHz(midi);
  const f = k.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 4;
  f.frequency.setValueAtTime(1100, t);
  f.frequency.exponentialRampToValueAtTime(170, t + dur);
  f.connect(gainEnv(k.ctx, t, 0.006, 0.2 * v, dur)).connect(dest);
  osc(k, 'sawtooth', hz, t, dur, 0, f);
  osc(k, 'sine', hz, t, dur, 0, f);
}

/** Minor/major 7th chord stab: detuned saws through a falling lowpass. */
export function stab(k: VoiceKit, dest: AudioNode, t: number, chord: Int16Array, dur: number, v: number): void {
  const f = k.ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 2;
  f.frequency.setValueAtTime(3600, t);
  f.frequency.exponentialRampToValueAtTime(700, t + dur);
  f.connect(gainEnv(k.ctx, t, 0.008, 0.045 * v, dur)).connect(dest);
  for (let i = 0; i < 4; i++) {
    osc(k, 'sawtooth', midiToHz(chord[i]), t, dur, k.lite ? 0 : -9, f);
    if (!k.lite) osc(k, 'sawtooth', midiToHz(chord[i]), t, dur, 9, f);
  }
}

/** Slow soft pad on the chord (menu, garage, story). */
export function pad(k: VoiceKit, dest: AudioNode, t: number, chord: Int16Array, dur: number): void {
  if (k.lite) return;
  const g = gainEnv(k.ctx, t, dur * 0.4, 0.03, dur);
  g.connect(dest);
  for (let i = 0; i < 4; i++) osc(k, 'triangle', midiToHz(chord[i]), t, dur, i * 3 - 4, g);
}

export function pluck(k: VoiceKit, dest: AudioNode, t: number, midi: number, dur: number, v: number): void {
  const g = gainEnv(k.ctx, t, 0.004, 0.04 * v, dur);
  g.connect(dest);
  osc(k, 'square', midiToHz(midi), t, dur, 0, g);
}

export function lead(k: VoiceKit, dest: AudioNode, t: number, midi: number, dur: number, v: number): void {
  const g = gainEnv(k.ctx, t, 0.01, 0.05 * v, dur);
  g.connect(dest);
  osc(k, 'sawtooth', midiToHz(midi), t, dur, -7, g);
  if (!k.lite) osc(k, 'sawtooth', midiToHz(midi), t, dur, 7, g);
}
