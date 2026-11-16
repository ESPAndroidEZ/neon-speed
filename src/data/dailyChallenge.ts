import { createRng } from '../core/rng';
import type { Weather } from '../types/game';
import { TRACKS } from './tracks';

export interface DailyChallenge {
  /** Whole days since 1970-01-01 in the player's local calendar: the seed. */
  day: number;
  trackId: string;
  weather: Weather;
  /** 0 = time trial (sprints and drift maps), else the number of rivals. */
  rivals: number;
}

/** Local calendar day number, so the challenge changes at the player's midnight. */
export const dayNumber = (d: Date): number => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);

const WEATHERS: readonly Weather[] = ['CLEAR', 'CLEAR', 'RAIN', 'RAIN', 'SNOW'];

/** Every map once per block of TRACKS.length days, in a shuffled order that depends only on the block number. */
const block = (b: number): number[] => {
  const rnd = createRng(b * 2654435761 + 97);
  const order = TRACKS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
};

/**
 * Today's free race, the same for everyone on the same date: a map, a weather and a field size drawn from the day number.
 * Every map comes round once a block and never twice in a row. Pure and deterministic: no server, no save data.
 */
export function dailyChallenge(day: number): DailyChallenge {
  const n = TRACKS.length;
  const b = Math.floor(day / n);
  const order = block(b);
  if (order[0] === block(b - 1)[n - 1]) [order[0], order[1]] = [order[1], order[0]]; // no repeat across the block edge
  const def = TRACKS[order[day - b * n]];
  const rnd = createRng(day * 40503 + 7);
  const weather = WEATHERS[Math.floor(rnd() * WEATHERS.length)];
  return { day, trackId: def.id, weather, rivals: def.type === 'circuit' ? (rnd() < 0.5 ? 3 : 5) : 0 };
}
