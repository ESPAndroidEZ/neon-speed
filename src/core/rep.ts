/**
 * Reputation (REP, docs/nfs-vision.md section 3): one number that grows with everything the player does (races, story,
 * Free Drive) and opens cars in the garage. Level n starts at `xpToReach(n)`; pure, no state.
 */
export const MAX_REP_LEVEL = 30;

/** REP needed to reach a level (level 1 = 0): 60, 180, 360, 600, ... */
export const xpToReach = (level: number): number => 30 * level * (level - 1);

/** Garage gate: a car cannot be bought below this level (cars the story hands out ignore it). */
export const CAR_REP: Readonly<Record<string, number>> = { civic: 1, golf: 2, '350z': 3, rx7: 4, e61: 5, m3: 7, evo: 9, supra: 11 };
export const carLevel = (id: string): number => CAR_REP[id] ?? 1;

export function repLevel(xp: number): number {
  let l = 1;
  while (l < MAX_REP_LEVEL && xp >= xpToReach(l + 1)) l++;
  return l;
}

export interface RepBar { level: number; into: number; need: number; frac: number }

/** Where the player is on the bar: the level, REP into it, REP the level needs, and the fraction (1 at the cap). */
export function repBar(xp: number): RepBar {
  const level = repLevel(xp);
  if (level >= MAX_REP_LEVEL) return { level, into: 0, need: 0, frac: 1 };
  const from = xpToReach(level), need = xpToReach(level + 1) - from, into = Math.max(0, xp - from);
  return { level, into, need, frac: Math.min(1, into / need) };
}

/** REP for a finished race: 20 for finishing plus up to 60 for the place; story events count half as much again. */
export function raceRep(position: number, field: number, story: boolean): number {
  const place = Math.max(0, field - position + 1) / Math.max(1, field);
  return Math.round((20 + 60 * place) * (story ? 1.5 : 1));
}

/** Cash for reaching a level. */
export const levelCash = (level: number): number => 500 * level;

/** REP for Free Drive finds. */
export const REP_FD = { token: 5, mission: 60, trap: 10, meet: 25, zoneMax: 30 };
