import { clamp, damp } from '../core/math';
import type { CarInput, InputSource } from '../types/game';

const STEER_LAMBDA = 10; // higher = snappier steer smoothing

export interface PadButtons {
  onPause?: () => void;
  onReset?: () => void;
}

/**
 * Gamepad input on the standard mapping, first connected pad. Analog left stick (radial-free dead zone, rescaled,
 * smoothed), analog triggers, d-pad as a digital steer, rumble on impacts, Start = pause, Y = reset.
 * Polls `navigator.getGamepads()` inside `sample`; the connect events only maintain the `connected` hint.
 */
export class GamepadInput implements InputSource {
  /** Stick dead zone (0.02 to 0.4) and rumble switch: set from the settings screen. */
  deadZone = 0.12;
  rumbleOn = true;
  private padConnected = false;
  private steer = 0;
  private last = performance.now();
  private startHeld = false;
  private resetHeld = false;
  private readonly buttons: PadButtons;
  private readonly fx = { startDelay: 0, duration: 0, weakMagnitude: 0, strongMagnitude: 0 };

  private readonly onConnect = (): void => {
    this.padConnected = true;
  };
  private readonly onDisconnect = (): void => {
    this.padConnected = this.anyPadConnected();
  };

  constructor(buttons: PadButtons = {}) {
    this.buttons = buttons;
    this.padConnected = this.anyPadConnected();
    window.addEventListener('gamepadconnected', this.onConnect);
    window.addEventListener('gamepaddisconnected', this.onDisconnect);
  }

  /** True when a pad is connected (so the architect can show a hint). */
  get connected(): boolean {
    return this.padConnected;
  }

  /** Short rumble: `strong` 0..1 is the low-frequency motor (crashes), `weak` the high one (kerbs, slides). */
  rumble(strong: number, weak: number, seconds: number): void {
    if (!this.rumbleOn) return;
    const pad = this.findPad();
    const act = (pad as unknown as { vibrationActuator?: { playEffect?: (t: string, p: object) => Promise<unknown> } } | null)?.vibrationActuator;
    if (!act?.playEffect) return;
    this.fx.duration = seconds * 1000;
    this.fx.strongMagnitude = clamp(strong, 0, 1);
    this.fx.weakMagnitude = clamp(weak, 0, 1);
    void act.playEffect('dual-rumble', this.fx).catch(() => undefined);
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
      out.shiftUp = out.shiftDown = false;
      return out;
    }

    // Steering: left stick X (or the d-pad), dead-zoned and rescaled; X>0 is right, steer>0 is left, so steer = -x.
    const b = pad.buttons;
    const dz = this.deadZone;
    const ax = pad.axes.length > 0 ? pad.axes[0] : 0;
    let target = 0;
    if (ax > dz) target = -((ax - dz) / (1 - dz));
    else if (ax < -dz) target = (-ax - dz) / (1 - dz);
    if (target === 0) target = (this.pressed(b, 14) ? 1 : 0) - (this.pressed(b, 15) ? 1 : 0);
    // a gentle response curve: fine control near the centre, full lock at the edge
    target = Math.sign(target) * Math.pow(Math.abs(target), 1.35);
    this.steer = clamp(damp(this.steer, target, STEER_LAMBDA, dt), -1, 1);

    out.steer = this.steer;
    out.throttle = clamp(b[7] ? b[7].value : 0, 0, 1);
    out.brake = clamp(b[6] ? b[6].value : 0, 0, 1);
    out.handbrake = this.pressed(b, 0) || this.pressed(b, 2);
    out.nitro = this.pressed(b, 5) || this.pressed(b, 1);
    out.shiftUp = this.pressed(b, 12); // manual gearbox: d-pad up / down
    out.shiftDown = this.pressed(b, 13);
    const start = this.pressed(b, 9);
    if (start && !this.startHeld) this.buttons.onPause?.();
    this.startHeld = start;
    const reset = this.pressed(b, 3);
    if (reset && !this.resetHeld) this.buttons.onReset?.();
    this.resetHeld = reset;
    return out;
  }

  dispose(): void {
    window.removeEventListener('gamepadconnected', this.onConnect);
    window.removeEventListener('gamepaddisconnected', this.onDisconnect);
  }
}
