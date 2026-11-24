import type { SaveStore } from '../core/save';
import type { RoamSave } from '../types/world';
import type { RoamActivities } from './roamActivities';
import { emptyRoam } from '../core/roamSaveParse';
import { TOKEN_REWARDS } from '../core/tokens';
import { REP_FD } from '../core/rep';

const CELL = 128, SAVE_EVERY = 30;

/**
 * Free Drive progress in the profile save (`SaveData.roam`): camera / drift-zone bests and visited places come back into
 * the activities, new ones are saved at once; the car's spot and the cells driven through are saved every 30 s and on
 * leaving, so the next Free Drive starts where the last one ended. No money is involved (cash goes through claimRace).
 */
export class RoamProgress {
  private readonly store: SaveStore;
  private readonly half: number;
  private t = 0;
  private cell = -1;
  private seen: Set<string>;
  private lx = 0; private lz = 0; private lh = 0;

  constructor(store: SaveStore, acts: RoamActivities, half: number) {
    this.store = store;
    this.half = half;
    const r = this.roam();
    this.seen = new Set(r.seen);
    for (const [k, v] of Object.entries(r.best)) {
      const [kind, id] = k.split(':');
      if (kind === 'trap') acts.trapBest.set(Number(id), v);
      else if (kind === 'zone') acts.zoneBest.set(Number(id), v);
    }
    acts.restoreTokens(r.hands.filter((h) => h.startsWith('t')).map((h) => Number(h.slice(1))));
    acts.onToken = (id, count) => this.token(id, count);
    acts.onRecord = (key, value) => { this.roam().best[key] = Math.round(value * 10) / 10; this.store.commit(); };
    acts.onRep = (n) => this.store.addRep(n);
    acts.onVisit = (id) => { const v = this.roam().visited; if (!v.includes(id)) { v.push(id); this.store.commit(); if (id === 'meet') acts.award(REP_FD.meet); } };
  }

  /** A token was picked up: save it, and pay a milestone once (cash is added here; the milestone is remembered in `visited`). */
  private token(id: number, count: number): number {
    const r = this.roam();
    if (!r.hands.includes(`t${id}`)) r.hands.push(`t${id}`);
    let cash = 0;
    for (const m of TOKEN_REWARDS) {
      const key = `tok${m.n}`;
      if (count >= m.n && !r.visited.includes(key)) { r.visited.push(key); cash += m.cash; }
    }
    this.store.data.cash += cash;
    this.store.commit();
    return cash;
  }

  /** Where the last Free Drive ended (null on the first one). */
  start(): { x: number; z: number; h: number } | null {
    const r = this.store.data.roam;
    return r && (r.x !== 0 || r.z !== 0) ? { x: r.x, z: r.z, h: r.heading } : null;
  }

  update(dt: number, x: number, z: number, h: number): void {
    this.lx = x; this.lz = z; this.lh = h;
    const c = Math.floor((x + this.half) / CELL) * 64 + Math.floor((z + this.half) / CELL);
    if (c !== this.cell) {
      this.cell = c;
      const key = `${Math.floor((x + this.half) / CELL)},${Math.floor((z + this.half) / CELL)}`;
      if (!this.seen.has(key)) { this.seen.add(key); this.roam().seen.push(key); }
    }
    this.t += dt;
    if (this.t >= SAVE_EVERY) this.save();
  }

  /** Save the last spot seen by `update` (leaving runs after the menu reset the race manager: the car is gone by then). */
  save(): void {
    this.t = 0;
    if (this.cell < 0) return; // never driven this session
    const r = this.roam();
    r.x = Math.round(this.lx * 10) / 10; r.z = Math.round(this.lz * 10) / 10; r.heading = Math.round(this.lh * 100) / 100;
    this.store.commit();
  }

  private roam(): RoamSave {
    return (this.store.data.roam ??= emptyRoam());
  }
}
