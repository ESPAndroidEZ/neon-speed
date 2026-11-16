/** A photo finish: the top two finishers crossed the line within PHOTO_GAP seconds, and the player was one of them. Display only. */
export const PHOTO_GAP = 0.3;

interface Finisher {
  position: number;
  time: number | null;
  isPlayer: boolean;
}

export function isPhotoFinish(racers: readonly Finisher[]): boolean {
  const first = racers.find((x) => x.position === 1);
  const second = racers.find((x) => x.position === 2);
  if (!first || !second || first.time === null || second.time === null) return false;
  if (!Number.isFinite(first.time) || !Number.isFinite(second.time)) return false;
  if (!first.isPlayer && !second.isPlayer) return false;
  const d = second.time - first.time;
  return d >= 0 && d < PHOTO_GAP;
}
