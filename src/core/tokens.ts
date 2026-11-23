import type { RoadGraph } from '../types/world';
import { createRng } from './rng';

/** A neon token floats above the street (x, z, y metres above the ground). */
export interface Token { id: number; x: number; z: number }

/** Districts of the dense play area ("the core"): tokens, rings and the meet all sit in or near it. */
export const CORE_DISTRICTS = ['downtown', 'strip', 'oldtown', 'harbour'] as const;
export const TOKEN_R = 4.5; // pickup radius, m
const SPACING = 110; // minimum distance between two tokens, m
/** Collected counts that pay cash (once each), and how much. The last one is "all of them". */
export const TOKEN_REWARDS: readonly { n: number; cash: number }[] = [{ n: 10, cash: 1000 }, { n: 25, cash: 2500 }, { n: 50, cash: 6000 }];
export const TOKEN_COUNT = 50;

/**
 * Fifty tokens on the centre lines of streets in the core districts, never in tunnels or on bridges, at least 110 m
 * apart, spread by a seeded shuffle of the edges. Deterministic for a graph.
 */
export function placeTokens(g: RoadGraph, count = TOKEN_COUNT): Token[] {
  const core = new Set<string>(CORE_DISTRICTS);
  const edges = g.edges.filter((e) => core.has(e.district) && !e.tunnel && e.length > 70 && (e.kind === 'street' || e.kind === 'avenue' || e.kind === 'alley'));
  const rnd = createRng(g.seed * 31 + 7);
  for (let i = edges.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [edges[i], edges[j]] = [edges[j], edges[i]]; }
  const out: Token[] = [];
  for (const e of edges) {
    if (out.length >= count) break;
    const want = e.length * (0.35 + rnd() * 0.3);
    let k = 0;
    while (k + 2 < e.cum.length && e.cum[k + 1] < want) k++;
    const len = e.cum[k + 1] - e.cum[k] || 1, t = Math.min(1, Math.max(0, (want - e.cum[k]) / len));
    const x = e.pts[k * 2] + (e.pts[k * 2 + 2] - e.pts[k * 2]) * t, z = e.pts[k * 2 + 1] + (e.pts[k * 2 + 3] - e.pts[k * 2 + 1]) * t;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < SPACING)) continue;
    out.push({ id: out.length, x, z });
  }
  return out;
}

/** Which tokens are collected; `step` returns the id picked up this step or -1. Pure, no allocation. */
export class TokenWatch {
  readonly tokens: readonly Token[];
  readonly got: Uint8Array;
  count = 0;

  constructor(tokens: readonly Token[], collected: readonly number[] = []) {
    this.tokens = tokens;
    this.got = new Uint8Array(tokens.length);
    for (const id of collected) if (id >= 0 && id < tokens.length && !this.got[id]) { this.got[id] = 1; this.count++; }
  }

  step(x: number, z: number): number {
    for (let i = 0; i < this.tokens.length; i++) {
      if (this.got[i]) continue;
      const dx = x - this.tokens[i].x, dz = z - this.tokens[i].z;
      if (dx * dx + dz * dz < TOKEN_R * TOKEN_R) { this.got[i] = 1; this.count++; return i; }
    }
    return -1;
  }

  /** The nearest token not collected yet, as an index (-1 when all are), for the HUD arrow and the map. */
  nearest(x: number, z: number): number {
    let best = -1, bd = Infinity;
    for (let i = 0; i < this.tokens.length; i++) {
      if (this.got[i]) continue;
      const d = (x - this.tokens[i].x) ** 2 + (z - this.tokens[i].z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
}
