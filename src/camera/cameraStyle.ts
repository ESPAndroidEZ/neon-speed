import type { DrivingStyle } from '../physics/drivingStyle';
import { createChaseTuning, type ChaseTuning } from './chaseCam';

/** Street camera: stays closer and lower at speed, follows the heading a little faster, bigger nitro FOV kick. */
export const STREET_CAM = { distanceFast: 7.3, heightFast: 2.65, yawLag: 6.2, nitroKick: 12 } as const;

/** Set the style-owned chase fields (distance, height, yaw lag, nitro kick); Classic restores the defaults. FOV and shake stay with their settings. */
export function chaseStyle(t: ChaseTuning, style: DrivingStyle): void {
  const d = createChaseTuning();
  const street = style === 'STREET';
  t.distanceFast = street ? STREET_CAM.distanceFast : d.distanceFast;
  t.heightFast = street ? STREET_CAM.heightFast : d.heightFast;
  t.yawLag = street ? STREET_CAM.yawLag : d.yawLag;
  t.nitroKick = street ? STREET_CAM.nitroKick : d.nitroKick;
}
