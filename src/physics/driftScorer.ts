import type { Drivetrain } from './drivetrain';

const DRIFT_ANGLE = 0.22; // rad of slip before it counts as a drift
const DRIFT_MIN_SPEED = 10; // m/s
const DRIFT_BANK_DELAY = 0.8; // s without drifting before the chain banks

/** Chain scoring: points grow with speed x angle x chain time; banked after a calm spell, lost on a wall hit. */
export class DriftScorer {
  drifting = false;
  chain = 0;
  bank = 0;
  private chainTime = 0;
  private calm = 0;

  reset(): void {
    this.drifting = false;
    this.chain = this.bank = this.chainTime = this.calm = 0;
  }

  /** Lose the chain in progress (wall hit). */
  breakChain(): void {
    this.chain = this.chainTime = 0;
  }

  update(dt: number, speed: number, slip: number, dtn: Drivetrain, refillPerSec: number): void {
    const a = Math.abs(slip);
    this.drifting = speed > DRIFT_MIN_SPEED && a > DRIFT_ANGLE;
    if (this.drifting) {
      this.calm = 0;
      this.chainTime += dt;
      this.chain += speed * a * dt * 10 * (1 + Math.min(this.chainTime, 10) * 0.2);
      dtn.addNitro(refillPerSec * dt * Math.min(1, a / 0.6));
    } else if (this.chain > 0 && (this.calm += dt) > DRIFT_BANK_DELAY) {
      this.bank += this.chain;
      this.chain = this.chainTime = 0;
    }
  }
}
