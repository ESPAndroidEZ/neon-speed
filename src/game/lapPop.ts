/** Pure text for the pop-up shown when a lap ends (no DOM, no i18n): "LAP 2  1:24.10  +0.31". */
export interface LapPop { text: string; color: string }

const mmss = (sec: number): string => `${Math.floor(sec / 60)}:${(sec % 60).toFixed(2).padStart(5, '0')}`;

/**
 * `label` is the translated "LAP n". `best` is the stored best lap in seconds before this lap (null = none yet).
 * Faster than the best is green with a minus, slower is red with a plus; with no best only the time shows.
 */
export function lapPop(label: string, time: number, best: number | null): LapPop {
  if (best === null || !Number.isFinite(best) || best <= 0) return { text: `${label}  ${mmss(time)}`, color: '#e8f6ff' };
  const d = time - best;
  const rounded = Math.abs(d) < 0.005 ? 0 : d;
  return {
    text: `${label}  ${mmss(time)}  ${rounded <= 0 ? '−' : '+'}${Math.abs(rounded).toFixed(2)}`,
    color: rounded <= 0 ? 'var(--green)' : 'var(--red)',
  };
}
