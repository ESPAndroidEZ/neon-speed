import type { Weather } from '../types/game';
import type { Rival } from '../data/rivals';

/** One rival duel (docs/nfs-vision.md section 2): you against one named rival on their map; the first win takes their car. */
export interface Duel { rival: string; trackId: string; weather: Weather; level: number; cash: number }

const HOME = ['kestrel', 'neon', 'maze', 'cliff', 'mountain', 'coast'];
const WET: Record<string, Weather> = { rain: 'RAIN', snow: 'SNOW' };

/** REP level needed to challenge a rival: the better they drive, the later. */
export const duelLevel = (skill: number): number => 1 + Math.round(skill * 10);
/** First-win prize in cash. */
export const duelCash = (skill: number): number => 2000 + Math.round(skill * 6000);

/** The duel for every rival, in the order of the rival list: home maps rotate, rain and snow specialists pick their weather. */
export function duelsFor(rivals: readonly Rival[]): Duel[] {
  return rivals.map((r, i) => {
    const wet = r.rain && r.rain >= 0.1 ? WET.rain : r.snow && r.snow >= 0.1 ? WET.snow : 'CLEAR';
    return { rival: r.id, trackId: HOME[i % HOME.length], weather: wet as Weather, level: duelLevel(r.skill), cash: duelCash(r.skill) };
  });
}

/** Career flag that remembers a first win. */
export const duelFlag = (rival: string): string => `duel-${rival}`;
