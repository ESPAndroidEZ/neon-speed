/** Speed display unit (km/h or mph). Display only: physics stays in m/s. Own localStorage key (`ns.units`), not the game save. */
export type SpeedUnit = 'kmh' | 'mph';

export const UNITS_KEY = 'ns.units';
const KPH_TO_MPH = 0.621371;

let current: SpeedUnit = 'kmh';
let loaded = false;

/** Anything other than 'mph' (junk, null) is km/h. */
export function parseUnit(raw: string | null): SpeedUnit {
  return raw === 'mph' ? 'mph' : 'kmh';
}

export function getUnit(): SpeedUnit {
  if (!loaded) loadUnit();
  return current;
}

/** Set the unit in memory and (never throwing) in localStorage. */
export function setUnit(u: SpeedUnit): void {
  current = u;
  loaded = true;
  try {
    localStorage.setItem(UNITS_KEY, u);
  } catch {
    /* private mode or full storage: the choice just lasts this session */
  }
}

/** Read the stored unit (done lazily on first use). */
export function loadUnit(): void {
  loaded = true;
  try {
    current = parseUnit(localStorage.getItem(UNITS_KEY));
  } catch {
    current = 'kmh';
  }
}

/** Convert km/h to the display unit. */
export function toUnit(kph: number, u: SpeedUnit = getUnit()): number {
  return u === 'mph' ? kph * KPH_TO_MPH : kph;
}

export function unitLabel(u: SpeedUnit = getUnit()): string {
  return u === 'mph' ? 'mph' : 'km/h';
}

/** "187 km/h" or "116 mph". */
export function speedText(kph: number, u: SpeedUnit = getUnit()): string {
  return `${Math.round(toUnit(kph, u))} ${unitLabel(u)}`;
}
