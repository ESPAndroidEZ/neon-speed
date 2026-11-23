import type { MissionHook } from '../types/world';

/** Where a mission wants you: resolved from a place name by the game (null = place not available in this city). */
export type Resolve = (poi: string) => { x: number; z: number } | null;
export type MissionEvent = 'none' | 'offer' | 'start' | 'win' | 'fail';
const OFFER_COOLDOWN = 45; // s between offers, and after a fail
export const MISSION_R = 14; // arrive within this many metres

/**
 * Runs one `reach` mission at a time (pure, no allocation per step). States: idle -> offered (you are in the trigger
 * district; Enter / the offer button starts it) -> active (clock running toward the place) -> idle again with a
 * `win` (reward is `hook.reward`) or `fail` (time out). Missions already done (flags) are never offered again.
 */
export class MissionRunner {
  state: 'idle' | 'offered' | 'active' = 'idle';
  current: (MissionHook & { id: string }) | null = null;
  left = 0;
  tx = 0;
  tz = 0;
  private cool = 10;
  private readonly list: readonly MissionHook[];
  private readonly done: Set<string>;
  private readonly resolve: Resolve;

  constructor(list: readonly MissionHook[], done: Iterable<string>, resolve: Resolve) {
    this.list = list; this.done = new Set(done); this.resolve = resolve;
  }

  isDone(h: MissionHook): boolean { return h.reward.flag ? this.done.has(h.reward.flag) : false; }

  /** Call every step with the player's position and the district they are in. */
  step(dt: number, x: number, z: number, district: string): MissionEvent {
    if (this.state === 'active' && this.current) {
      this.left -= dt;
      if (Math.hypot(x - this.tx, z - this.tz) < MISSION_R) { const h = this.current; if (h.reward.flag) this.done.add(h.reward.flag); this.end(); return 'win'; }
      if (this.left <= 0) { this.end(); this.cool = OFFER_COOLDOWN; return 'fail'; }
      return 'none';
    }
    this.cool = Math.max(0, this.cool - dt);
    if (this.state === 'offered') {
      const t = this.current?.trigger;
      if (!t || !('district' in t) || t.district !== district) { this.state = 'idle'; this.current = null; }
      return 'none';
    }
    if (this.cool > 0) return 'none';
    for (const h of this.list) {
      if (this.isDone(h) || h.objective.kind !== 'reach' || !('district' in h.trigger) || h.trigger.district !== district) continue;
      if (!this.resolve(h.objective.poi)) continue;
      this.current = h; this.state = 'offered';
      return 'offer';
    }
    return 'none';
  }

  /** The player accepted the offer. Returns false when there is nothing to accept. */
  accept(): boolean {
    const h = this.current;
    if (this.state !== 'offered' || !h || h.objective.kind !== 'reach') return false;
    const p = this.resolve(h.objective.poi);
    if (!p) return false;
    this.tx = p.x; this.tz = p.z; this.left = h.objective.seconds ?? 120; this.state = 'active';
    return true;
  }

  /** Give up (pause > respawn is not a give-up; this is for leaving Free Drive). */
  abort(): void { this.end(); }

  private end(): void { this.state = 'idle'; this.current = null; }
}
