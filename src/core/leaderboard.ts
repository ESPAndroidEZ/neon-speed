import type { Weather } from '../types/game';
import type { PhysicsLevel } from '../physics/weatherLevels';

/**
 * Online lap boards (server/api/scores.php). A board is one map + weather (with the weather-physics level, it changes
 * grip) + car tier, or the daily challenge. Entries wait in a small queue in browser storage until the server answers,
 * so a race driven offline is sent later. Times are checked for plausibility on the server, not verified ("unverified").
 */
export interface LbEntry { board: string; ms: number; car: string; f: number[]; name?: string }
export interface LbRow { name: string; ms: number; car: string }
export interface LbBoard { top: LbRow[]; of: number; rank?: number | null; mine?: number | null }
export type LbResult =
  | { state: 'sent'; rank: number | null; of: number; improved: boolean; mine: number | null }
  | { state: 'queued' }
  | { state: 'rejected'; why: string };
export interface LbStore { getItem(k: string): string | null; setItem(k: string, v: string): void }
type Fetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ status: number; json(): Promise<unknown> }>;

export const LB_QUEUE_KEY = 'ns.lbq';
const QUEUE_MAX = 12;

const wx = (w: Weather, level: PhysicsLevel): string => (w === 'CLEAR' ? 'CLEAR' : `${w}-${level[0]}`);
export const boardKey = (track: string, w: Weather, level: PhysicsLevel, tier: number): string => `${track}:${wx(w, level)}:${tier}`;
export const dailyKey = (day: number, track: string, w: Weather, level: PhysicsLevel): string => `daily:${day}:${track}:${wx(w, level)}`;

export class Leaderboard {
  private readonly url: string;
  private readonly code: () => string | null;
  private readonly fetch: Fetch;
  private readonly store: LbStore;
  private busy = false;

  constructor(url: string, code: () => string | null, fetchFn: Fetch, store: LbStore) {
    this.url = url;
    this.code = code;
    this.fetch = fetchFn;
    this.store = store;
  }

  queue(): LbEntry[] {
    try {
      const q: unknown = JSON.parse(this.store.getItem(LB_QUEUE_KEY) ?? '[]');
      return Array.isArray(q) ? q.filter((e: LbEntry) => e && typeof e.board === 'string' && typeof e.ms === 'number' && Array.isArray(e.f)) : [];
    } catch {
      return [];
    }
  }

  private save(q: LbEntry[]): void {
    try { this.store.setItem(LB_QUEUE_KEY, JSON.stringify(q.slice(-QUEUE_MAX))); } catch { /* full storage: the entry is lost, the game goes on */ }
  }

  /** Queue the entry (only the best per board is kept), then try to send everything. Never throws. */
  async submit(e: LbEntry): Promise<LbResult> {
    const q = this.queue();
    const old = q.findIndex((x) => x.board === e.board);
    if (old < 0) q.push(e);
    else if (e.ms < q[old].ms) q[old] = e;
    this.save(q);
    const res = await this.flush();
    return res.get(e.board) ?? { state: 'queued' };
  }

  /** Send the queue oldest first. Dropped: sent, or refused (400 / 413 / 422). Kept for later: no answer, 404 (API not deployed), 409 (player not synced yet), 429, 5xx. */
  async flush(): Promise<Map<string, LbResult>> {
    const out = new Map<string, LbResult>();
    const code = this.code();
    if (this.busy || !code) return out;
    this.busy = true;
    try {
      const q = this.queue();
      const left: LbEntry[] = [];
      for (let i = 0; i < q.length; i++) {
        const e = q[i];
        let status = 0, body: Record<string, unknown> = {};
        try {
          const r = await this.fetch(this.url, { method: 'POST', headers: { 'X-Player': code, 'Content-Type': 'application/json' }, body: JSON.stringify(e) });
          status = r.status;
          body = ((await r.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
        } catch { /* offline */ }
        if (status === 200) out.set(e.board, { state: 'sent', rank: num(body.rank), of: num(body.of) ?? 0, improved: body.improved === true, mine: num(body.mine) });
        else if (status === 400 || status === 413 || status === 422) out.set(e.board, { state: 'rejected', why: String(body.error ?? status) });
        else { left.push(...q.slice(i)); break; } // the server is not ready: keep the rest for later, in order
      }
      this.save(left);
    } finally {
      this.busy = false;
    }
    return out;
  }

  /** Top n of several boards (track select), or null when the server is not reachable. */
  async tops(boards: readonly string[], n = 3): Promise<Record<string, LbBoard> | null> {
    try {
      const r = await this.fetch(`${this.url}?boards=${encodeURIComponent(boards.join(','))}&n=${n}`, { headers: { 'X-Player': this.code() ?? '' } });
      if (r.status !== 200) return null;
      const j = (await r.json()) as { boards?: Record<string, LbBoard> };
      return j.boards ?? null;
    } catch {
      return null;
    }
  }
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
