import { createRng } from '../core/rng';
import { smoothstep } from '../core/math';
import type { Weather } from '../types/game';
import { curvatureAt, halfWidthAt, type Track } from '../world/track';
import type { PhysicsLevel } from './weatherLevels';

export type SurfaceKind = 'dry' | 'puddle' | 'ice' | 'snowbank';

export interface Puddle {
  x: number;
  z: number;
  index: number;
  lateral: number;
  r: number;
}

/** What the tyres feel at one spot. Reused by the caller; never allocated per query. */
export interface SurfaceHit {
  kind: SurfaceKind;
  /** Multiplies tyre grip. */
  grip: number;
  /** Extra drag, 1/s. */
  drag: number;
  /** Steering authority 0..1 (hydroplaning fades it at speed). */
  steer: number;
}

export const createSurfaceHit = (): SurfaceHit => ({ kind: 'dry', grip: 1, drag: 0, steer: 1 });

/** Per-level strength of each hazard: [puddle grip, ice grip, bank drag, bank grip]. NORMAL has no hazards. */
const HAZARD: Record<PhysicsLevel, { puddle: number; ice: number; bankDrag: number; bankGrip: number } | null> = {
  NORMAL: null,
  AGGRESSIVE: { puddle: 0.55, ice: 0.55, bankDrag: 0.15, bankGrip: 0.8 },
  EXTREME: { puddle: 0.45, ice: 0.4, bankDrag: 0.25, bankGrip: 0.7 },
};

/**
 * Track surface hazards on top of the weather grip. Rain: random puddles (seeded per race) that cut grip to 55% and
 * fade steering at speed (hydroplaning). Snow: banks at the edge of tight corners drag the car, ice patches in the tunnel
 * and on the bridge. Pure; shared by the player, the AI and the visuals.
 */
export class SurfaceMap {
  puddles: Puddle[] = [];
  /** Seed of the current puddle layout (saved so a restored race has the same puddles). */
  seed = 1;
  /** Sample indices at the edge of tight corners (snow banks sit there). */
  readonly cornerIndex: number[] = [];
  private weather: Weather = 'CLEAR';
  private level: PhysicsLevel = 'AGGRESSIVE';
  private intensity = 1;
  private readonly track: Track;
  private readonly corner: Uint8Array;
  private readonly puddleAt: Puddle[][];
  private readonly n: number;

  constructor(track: Track) {
    this.track = track;
    this.n = track.samples.length;
    this.corner = new Uint8Array(this.n);
    for (let i = 0; i < this.n; i++) {
      if (Math.abs(curvatureAt(track, i)) > 0.04 && i > 8 && i < this.n - 26) {
        this.corner[i] = 1;
        this.cornerIndex.push(i);
      }
    }
    this.puddleAt = Array.from({ length: this.n }, () => []);
    this.reseed(1);
  }

  setConditions(w: Weather, level: PhysicsLevel, intensity: number): void {
    this.weather = w;
    this.level = level;
    this.intensity = intensity;
  }

  /** New random puddle layout (about 18 per lap on streets, alleys and the dock; none on the start grid). */
  reseed(seed: number): void {
    this.seed = seed;
    const rnd = createRng(seed * 7919 + 13);
    const t = this.track;
    this.puddles = [];
    for (const b of this.puddleAt) b.length = 0;
    for (let k = 0, tries = 0; k < 18 && tries < 200; tries++) {
      const i = 10 + Math.floor(rnd() * (this.n - 40));
      const z = t.zones[i];
      if (z === 'tunnel' || z === 'bridge') continue;
      const hw = halfWidthAt(t, i);
      const r = 1.5 + rnd() * 1.7;
      const lat = (rnd() * 2 - 1) * (hw - 1);
      const s = t.samples[i];
      const p: Puddle = { x: s.position.x + s.tangent.z * lat, z: s.position.z - s.tangent.x * lat, index: i, lateral: lat, r };
      this.puddles.push(p);
      for (let d = -3; d <= 3; d++) this.puddleAt[(i + d + this.n) % this.n].push(p);
      k++;
    }
  }

  /** Whether hazards are active at all (a wet or snowy track at AGGRESSIVE or EXTREME). */
  get hazardsOn(): boolean {
    return HAZARD[this.level] !== null && this.weather !== 'CLEAR' && this.intensity > 0.35;
  }

  /** Surface under a point of the track: sample index, signed lateral offset (m), and speed (m/s). */
  query(index: number, lateral: number, x: number, z: number, speed: number, out: SurfaceHit): SurfaceHit {
    out.kind = 'dry';
    out.grip = 1;
    out.drag = 0;
    out.steer = 1;
    const h = HAZARD[this.level];
    if (!h || this.weather === 'CLEAR' || this.intensity <= 0.35) return out;
    const hw = halfWidthAt(this.track, index);
    if (this.weather === 'RAIN') {
      const list = this.puddleAt[index];
      for (let i = 0; i < list.length; i++) {
        const dx = x - list[i].x;
        const dz = z - list[i].z;
        if (dx * dx + dz * dz < list[i].r * list[i].r) {
          out.kind = 'puddle';
          out.grip = h.puddle;
          out.steer = 1 - 0.6 * smoothstep(8, 30, speed); // hydroplaning: the front tyres float
          return out;
        }
      }
    } else {
      const zone = this.track.zones[index];
      if (zone === 'tunnel' || zone === 'bridge') {
        out.kind = 'ice';
        out.grip = h.ice;
      } else if (this.corner[index] === 1 && Math.abs(lateral) > hw - 1.6) {
        out.kind = 'snowbank';
        out.grip = h.bankGrip;
        out.drag = h.bankDrag;
      }
    }
    return out;
  }
}
