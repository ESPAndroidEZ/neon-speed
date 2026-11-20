/** Gearbox choice (Settings > Gearbox). The player's drivetrain follows it; rivals always shift by themselves. */
export const GEARBOX = { manual: false, forced: false };
/** Manual shifting is on: the player's setting, or an event that forces it (story chapter 3 "Cain's Gearbox"). */
export const manualNow = (): boolean => GEARBOX.manual || GEARBOX.forced;
