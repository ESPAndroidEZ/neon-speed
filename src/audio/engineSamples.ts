import { ENGINE_SOUNDS, engineSoundUrl, type EngineLayer } from '../data/engineSounds';
import type { EngineVoice } from './engineVoice';

/**
 * Sample-based engine: looping recordings at fixed rpm, crossfaded by rpm (equal power between the two nearest loops)
 * and pitched with playbackRate (rpm / loop rpm). On-load and off-load loops blend with the throttle.
 * Loaded once per car with fetch + decodeAudioData and cached. Returns null when a car has no samples or any file
 * fails, so the caller keeps the procedural synth.
 */
/** Loops are mastered at -12 dBFS RMS; this lifts them to about the synth's level. */
const SAMPLE_GAIN = 1.5;

const cache = new Map<string, Promise<{ layer: EngineLayer; buf: AudioBuffer }[] | null>>();

export function loadEngineSamples(ctx: BaseAudioContext, carId: string): Promise<{ layer: EngineLayer; buf: AudioBuffer }[] | null> {
  const set = ENGINE_SOUNDS[carId];
  if (!set || set.layers.length === 0) return Promise.resolve(null);
  let p = cache.get(carId);
  if (!p) {
    p = Promise.all(set.layers.map(async (layer) => {
      const r = await fetch(engineSoundUrl(carId, layer.file));
      if (!r.ok) throw new Error(`${layer.file}: HTTP ${r.status}`);
      return { layer, buf: await ctx.decodeAudioData(await r.arrayBuffer()) };
    })).catch((e: unknown) => {
      console.info(`[audio] ${carId}: engine samples unavailable (${e instanceof Error ? e.message : 'error'}), using the synth`);
      return null;
    });
    cache.set(carId, p);
  }
  return p;
}

/**
 * Pure mixing maths (unit tested): for `rpm` and the loops' recording rpms (any order), write each loop's gain
 * (equal-power crossfade between the two nearest, 0 for the rest) and playbackRate (clamped 0.5..2). NaN-free.
 */
export function layerMix(rpm: number, loopRpm: readonly number[], gains: Float32Array, rates: Float32Array): void {
  const r = Number.isFinite(rpm) ? Math.max(1, rpm) : 1;
  let lo = -1, hi = -1;
  for (let i = 0; i < loopRpm.length; i++) {
    gains[i] = 0;
    rates[i] = Math.min(2, Math.max(0.5, r / Math.max(1, loopRpm[i])));
    if (loopRpm[i] <= r && (lo < 0 || loopRpm[i] > loopRpm[lo])) lo = i;
    if (loopRpm[i] >= r && (hi < 0 || loopRpm[i] < loopRpm[hi])) hi = i;
  }
  if (lo < 0 && hi < 0) return;
  if (lo < 0 || hi < 0 || lo === hi) { gains[lo < 0 ? hi : lo] = 1; return; }
  const x = (r - loopRpm[lo]) / Math.max(1, loopRpm[hi] - loopRpm[lo]);
  gains[lo] = Math.cos((x * Math.PI) / 2);
  gains[hi] = Math.sin((x * Math.PI) / 2);
}

/** EngineVoice from loaded loops (same interface as the synth, so it drops in). */
export function createSampleVoice(ctx: AudioContext, loops: { layer: EngineLayer; buf: AudioBuffer }[]): EngineVoice {
  const out = ctx.createGain();
  const on = loops.filter((l) => l.layer.load !== 'off'), off = loops.filter((l) => l.layer.load !== 'on');
  const mk = (group: typeof loops): { src: AudioBufferSourceNode[]; g: GainNode[]; rpm: number[]; gains: Float32Array; rates: Float32Array; bus: GainNode } => {
    const bus = ctx.createGain();
    bus.connect(out);
    const src: AudioBufferSourceNode[] = [], g: GainNode[] = [];
    for (const l of group) {
      const s = ctx.createBufferSource();
      s.buffer = l.buf;
      s.loop = true;
      const gn = ctx.createGain();
      gn.gain.value = 0;
      s.connect(gn).connect(bus);
      s.start();
      src.push(s); g.push(gn);
    }
    return { src, g, rpm: group.map((l) => l.layer.rpm), gains: new Float32Array(group.length), rates: new Float32Array(group.length), bus };
  };
  // a separate off-throttle group only when there are real off-throttle loops (idle 'both' loops alone would be pitched up)
  const A = mk(on), B = loops.some((l) => l.layer.load === 'off') ? mk(off) : null;
  const apply = (m: ReturnType<typeof mk>, rpm: number, level: number, t: number): void => {
    layerMix(rpm, m.rpm, m.gains, m.rates);
    for (let i = 0; i < m.src.length; i++) {
      m.src[i].playbackRate.setTargetAtTime(m.rates[i], t, 0.03);
      m.g[i].gain.setTargetAtTime(m.gains[i] * level, t, 0.04);
    }
  };
  return {
    out,
    set(rpm, load, _layout, cut, _burble, volume) {
      const t = ctx.currentTime;
      const v = (cut ? volume * 0.35 : volume) * SAMPLE_GAIN; // limiter bounce
      const l = Math.min(1, Math.max(0, load));
      apply(A, rpm, B ? v * (0.35 + 0.65 * l) : v * (0.55 + 0.45 * l), t);
      if (B) apply(B, rpm, v * (1 - l) * 0.8, t);
    },
    dispose() {
      for (const m of [A, B]) if (m) { for (const s of m.src) { try { s.stop(); } catch { /* already stopped */ } } m.bus.disconnect(); }
      out.disconnect();
    },
  };
}
