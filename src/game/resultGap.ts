/** Gap to the winner for the results table: "+0.83" for a finisher behind the winner, "" for the winner, a DNF or a missing time. */
export function resultGap(time: number | null, winner: number | null): string {
  if (time === null || winner === null || !Number.isFinite(time) || !Number.isFinite(winner)) return '';
  const d = time - winner;
  return d < 0.005 ? '' : `+${d.toFixed(2)}`;
}
