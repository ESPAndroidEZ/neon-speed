import { isWater } from '../data/world/districtMap';

const HINT_AFTER = 4; // s on the gas without moving
const AUTO_AFTER = 9; // s: the car is put back on the road by itself
const SLOW = 1; // m/s

/**
 * Free Drive stuck detector (pure): the car is stuck when it is on the gas but not moving for a few seconds (wedged
 * against a building or between cars) or sitting in water. `update` returns 0 fine, 1 show the respawn hint, 2 respawn now.
 */
export class RoamStuck {
  private still = 0;

  update(dt: number, speed: number, throttle: number, x: number, z: number): 0 | 1 | 2 {
    if (isWater(x, z) && Math.abs(speed) < 4) this.still += dt * 2; // water counts double
    else if (Math.abs(speed) < SLOW && throttle > 0.3) this.still += dt;
    else this.still = 0;
    return this.still > AUTO_AFTER ? 2 : this.still > HINT_AFTER ? 1 : 0;
  }

  reset(): void { this.still = 0; }
}
