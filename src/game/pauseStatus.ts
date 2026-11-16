/** Pure text for the line under PAUSED: "LAP 2/3 · P3/6 · 1:24.1". No DOM, no i18n (labels come in translated). */
export interface PauseStatusInput {
  lap: number;
  totalLaps: number;
  position: number;
  racerCount: number;
  raceTime: number;
}

const clock = (sec: number): string => {
  const tenths = Math.round(Math.max(0, sec) * 10); // whole tenths first, so 59.96 reads 1:00.0, never 0:60.0
  const m = Math.floor(tenths / 600);
  return `${m}:${((tenths - m * 600) / 10).toFixed(1).padStart(4, '0')}`;
};

/** Empty when there is nothing sensible to show (no race, bad numbers). Laps are 1-based and clamped to the total. */
export function pauseStatus(s: PauseStatusInput, lapLabel: string): string {
  if (!(s.racerCount > 0) || !(s.raceTime >= 0) || !Number.isFinite(s.raceTime)) return '';
  const parts: string[] = [];
  if (s.totalLaps > 1) parts.push(`${lapLabel} ${Math.min(Math.max(1, s.lap), s.totalLaps)}/${s.totalLaps}`);
  if (s.racerCount > 1) parts.push(`P${Math.min(Math.max(1, s.position), s.racerCount)}/${s.racerCount}`);
  parts.push(clock(s.raceTime));
  return parts.join(' · ');
}
