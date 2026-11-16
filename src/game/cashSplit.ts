/**
 * Where a race payout came from (display only): the finishing-position prize and the share earned by drifting
 * (`buildResult` pays drift points / 10). Prize + drift always add up to `cash`. Null when there is nothing to split.
 */
export interface CashSplit { prize: number; drift: number }

export function cashSplit(cash: number, driftScore: number): CashSplit | null {
  if (!Number.isFinite(cash) || !Number.isFinite(driftScore) || cash <= 0 || driftScore <= 0) return null;
  const drift = Math.min(cash, Math.round(driftScore / 10));
  if (drift < 1 || drift >= cash) return null; // no drift income, or drift is all of it: one number says it all
  return { prize: cash - drift, drift };
}
