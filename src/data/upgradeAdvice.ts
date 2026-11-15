import type { UpgradeId, Upgrades } from './upgrades';
import type { Setup } from './setup';

/** When each upgrade actually helps (shown in the tuning menu next to the measured numbers). */
export const ADVICE: Record<UpgradeId, string> = {
  engine: 'More torque everywhere: faster out of every corner. The best all-round upgrade on long, fast tracks (Neon Strip, Cliffside).',
  turbo: 'More boost on turbo cars: huge mid-range, but it arrives late. Best on long straights; on tight tracks lag hurts.',
  ecu: 'Higher redline and quicker shifts: small, steady gain, best paired with engine and exhaust.',
  exhaust: 'Wider power band: stronger at high rpm. Good on fast tracks, little gain in tight streets.',
  tyres: 'More grip front and rear: faster through every corner and in the rain. The biggest gain on tight tracks (Container Maze, Kestrel Bay).',
  suspension: 'Less grip lost in roll: steadier in quick direction changes (S-bends, chicanes).',
  brakes: 'Shorter stops: brake later into hairpins. Pairs with more power (you arrive faster).',
  weight: 'Lighter car: accelerates, brakes and turns better. Small on its own, adds up with everything.',
  gearbox: 'Closer ratios: quicker acceleration, slightly lower top speed. Good for tight tracks.',
  nitrous: 'Bigger nitro shot. Rewards (near miss, slipstream, clean corner, drifts) refill it, so it pays off for aggressive drivers.',
  differential: 'More traction coming out of corners and steadier slides: easier, longer handbrake drifts.',
};

/** A stable key for "this exact build" (upgrades + setup), used to keep a best lap per setup. */
export function buildKey(upgrades: Upgrades, setup: Setup): string {
  const u = Object.keys(upgrades).sort().map((k) => `${k}${upgrades[k as UpgradeId] ?? 0}`).join('');
  const s = Object.keys(setup).sort().map((k) => `${k}${Math.round((setup as unknown as Record<string, number>)[k] * 100)}`).join('');
  return `${u}|${s}`;
}

const bestKey = (track: string, car: string, build: string): string => `rb-best:${track}:${car}:${build}`;

/** Best lap (s) recorded with this exact build on a track, or null. */
export function bestLapFor(track: string, car: string, build: string): number | null {
  try {
    const v = Number(localStorage.getItem(bestKey(track, car, build)));
    return v > 0 ? v : null;
  } catch { return null; }
}

/** Store a lap if it beats the best for this build. Returns true when it is a new best. */
export function recordLap(track: string, car: string, build: string, t: number): boolean {
  const b = bestLapFor(track, car, build);
  if (b !== null && b <= t) return false;
  try { localStorage.setItem(bestKey(track, car, build), t.toFixed(3)); } catch { return false; }
  return true;
}
