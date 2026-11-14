import { RADIO } from '../data/radio';
import { createRng } from '../core/rng';
import type { Weather } from '../types/game';

export interface RadioSnapshot {
  /** Race is on (countdown over, not finished). */
  racing: boolean;
  /** Seconds since GO. */
  time: number;
  position: number;
  count: number;
  lap: number;
  laps: number;
  weather: Weather;
  /** Closing speed of the latest hit this frame (0 = none). */
  impact: number;
  /** Points in the drift chain being built. */
  driftChain: number;
  /** Rivals with their current position. */
  rivals: readonly { name: string; position: number }[];
}

const MIN_GAP = 6; // seconds between lines
const DRIFT_TIERS = [1500, 4000, 9000];

/**
 * DJ Switch's radio: decides WHAT to say and when (overtakes, crashes, drift combos, weather, laps, rival names).
 * Pure logic, deterministic from the seed; the UI shows the returned text.
 */
export class RadioDirector {
  private readonly rnd: () => number;
  private lastPos = 0;
  private lastSay = -99;
  private lastWeather: Weather | null = null;
  private lastLap = 0;
  private tier = 0;
  private started = false;
  private nextIdle = 25;
  private readonly lastIdx = new Map<string, number>();

  constructor(seed = 1) {
    this.rnd = createRng(seed);
  }

  reset(): void {
    this.lastPos = 0;
    this.lastSay = -99;
    this.lastWeather = null;
    this.lastLap = 0;
    this.tier = 0;
    this.started = false;
    this.nextIdle = 25;
  }

  private pick(key: string, list: readonly string[]): string {
    let i = Math.floor(this.rnd() * list.length);
    if (list.length > 1 && i === this.lastIdx.get(key)) i = (i + 1) % list.length;
    this.lastIdx.set(key, i);
    return list[i];
  }

  private fill(t: string, s: RadioSnapshot, name: string): string {
    return t
      .replace('{name}', name)
      .replace('{pos}', String(s.position))
      .replace('{n}', String(s.count))
      .replace('{lap}', String(s.lap))
      .replace('{laps}', String(s.laps))
      .replace('{score}', String(Math.floor(s.driftChain / 10) * 10));
  }

  /** Returns a line to show, or null. Call once per frame (or per fixed step). */
  update(s: RadioSnapshot): string | null {
    if (!s.racing) return null;
    const rivalAt = (p: number): string => s.rivals.find((r) => r.position === p)?.name ?? s.rivals[0]?.name ?? 'the pack';
    const say = (key: string, list: readonly string[], name: string, gap = MIN_GAP): string | null => {
      if (s.time - this.lastSay < gap) return null;
      this.lastSay = s.time;
      return this.fill(this.pick(key, list), s, name);
    };
    let out: string | null = null;
    if (!this.started) {
      this.started = true;
      this.lastPos = s.position;
      this.lastLap = s.lap;
      this.lastWeather = s.weather;
      out = s.rivals.length > 0 ? say('start', RADIO.start, rivalAt(1), 0) : null;
      if (out) return out;
    }
    if (s.weather !== this.lastWeather) {
      this.lastWeather = s.weather;
      this.lastSay = -99; // weather news always cuts in
      return say('weather' + s.weather, RADIO.weather[s.weather], '', 0);
    }
    if (s.impact > 8) out = say('crash', RADIO.crash, '', 5);
    if (!out) {
      const tier = DRIFT_TIERS.filter((t) => s.driftChain >= t).length;
      if (tier > this.tier) out = say('drift', RADIO.drift, '', 3);
      if (tier !== this.tier && (out || tier < this.tier)) this.tier = tier;
    }
    if (!out && s.position !== this.lastPos && s.rivals.length > 0) {
      const better = s.position < this.lastPos;
      const name = better ? rivalAt(s.position + 1) : rivalAt(s.position - 1);
      out = say(better ? 'overtake' : 'overtaken', better ? RADIO.overtake : RADIO.overtaken, name);
      if (out) this.lastPos = s.position;
      else if (s.time - this.lastSay > MIN_GAP) this.lastPos = s.position;
    }
    if (!out && s.lap !== this.lastLap) {
      this.lastLap = s.lap;
      out = s.lap === s.laps && s.laps > 1 ? say('final', RADIO.finalLap, '', 3) : say('lap', RADIO.lap, rivalAt(1), 3);
    }
    if (!out && s.time > this.nextIdle && s.rivals.length > 0) {
      this.nextIdle = s.time + 22 + this.rnd() * 10;
      const r = s.rivals[Math.floor(this.rnd() * s.rivals.length)];
      const specific = RADIO.rival[r.name];
      if (s.position === 1) out = say('leading', RADIO.leading, rivalAt(2));
      else if (s.position === s.count) out = say('last', RADIO.last, rivalAt(s.position - 1));
      else if (specific && this.rnd() < 0.6) out = say('rival' + r.name, specific, r.name);
      else out = say('idle', RADIO.idle, r.name);
    }
    return out;
  }
}
