const KEY = 'rb-model-yaw';

/** Per-car yaw corrections set in the garage (radians), kept in localStorage so a fix works without editing code. */
export function getYawOverride(id: string): number | null {
  try {
    const v = (JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, unknown>)[id];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

export function setYawOverride(id: string, yaw: number): void {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number>;
    all[id] = yaw;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage blocked: the fix lasts for this session only */
  }
}
