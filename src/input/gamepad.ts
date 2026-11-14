import { clamp, damp } from '../core/math';
import type { CarInput, InputSource } from '../types/game';

const DEAD_ZONE = 0.12; // stick X below this is treated as centre
const STEER_LAMBDA = 10; // higher = snappier steer smoothing

/**
 * Gamepad input on the standard mapping, first connected pad. Polls `navigator.getGamepads()`
 * inside `sample`; the connect/disconnect events only maintain the `connected` hint.
 */
export class GamepadInput implements InputSource {
  private padConnected = false;
  private steer = 0;
  private last = performance.now();

  private readonly onConnect = (): void => {
    this.padConnected = true;
  };
  private readonly onDisconnect = (): void => {
    this.padConnected = this.anyPadConnected();
  };

  constructor() {
    this.padConnected = this.anyPadConnected();
    window.addEventListener('gamepadconnected', this.onConnect);
    window.addEventListener('gamepaddisconnected', this.onDisconnect);
  }

  /** True when a pad is connected (so the architect can show a hint). */
  get connected(): boolean {
    return this.padConnected;
  }

  /** First connected standard-mapping pad, or null. Never throws. */
  private findPad(): Gamepad | null {
    const fn = navigator.getGamepads;
    if (typeof fn !== 'function') return null;
    const list = fn.call(navigator);
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (p && p.connected && p.mapping === 'standard') return p;
    }
    return null;
  }

  private anyPadConnected(): boolean {
    const fn = navigator.getGamepads;
    if (typeof fn !== 'function') return false;
    const list = fn.call(navigator);
    for (let i = 0; i < list.length; i++) if (list[i]) return true;
    return false;
  }

  private pressed(b: readonly GamepadButton[], i: number): boolean {
    const btn = b[i];
    return !!btn && btn.pressed;
  }

  sample(out: CarInput): CarInput {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;

    const pad = this.findPad();
    if (!pad || pad.buttons.length === 0) {
      // No usable pad: return to a neutral state (steer eases back to centre).
      this.steer = damp(this.steer, 0, STEER_LAMBDA, dt);
      out.steer = this.steer;
      out.throttle = 0;
      out.brake = 0;
      out.handbrake = false;
      out.nitro = false;
      return out;
    }

    // Steering: left stick X, dead-zoneed, rescaled, smoothed. Stick X>0 is right; steer>0 is left, so steer = -x.
    const ax = pad.axes.length > 0 ? pad.axes[0] : 0;
    let target = 0;
    if (ax > DEAD_ZONE) target = -((ax - DEAD_ZONE) / (1 - DEAD_ZONE));
    else if (ax < -DEAD_ZONE) target = ((-ax - DEAD_ZONE) / (1 - DEAD_ZONE));
    this.steer = clamp(damp(this.steer, target, STEER_LAMBDA, dt), -1, 1);

    const b = pad.buttons;
    out.steer = this.steer;
    out.throttle = clamp(b[7] ? b[7].value : 0, 0, 1);
    out.brake = clamp(b[6] ? b[6].value : 0, 0, 1);
    out.handbrake = this.pressed(b, 0) || this.pressed(b, 2);
    out.nitro = this.pressed(b, 5) || this.pressed(b, 1);
    return out;
  }

  dispose(): void {
    window.removeEventListener('gamepadconnected', this.onConnect);
    window.removeEventListener('gamepaddisconnected', this.onDisconnect);
  }
}
