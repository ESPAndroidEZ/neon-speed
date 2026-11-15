import type { CarInput, InputSource } from '../types/game';
import type { ControlStore } from './controlPrefs';
import { MIN_INPLANE, rollFrom, smoothSteer, steerFromRoll } from './tiltMap';
import type { Roll } from './tiltMap';

export type TiltPermission = 'granted' | 'denied' | 'unsupported';

type OrientationCtor = { requestPermission?: () => Promise<'granted' | 'denied'> };

/** Screen angle in degrees (0 portrait, 90 / 270 landscape). */
export const screenAngle = (): number => {
  const a = (screen as unknown as { orientation?: { angle?: number } }).orientation?.angle;
  if (typeof a === 'number') return a;
  const w = (window as unknown as { orientation?: number }).orientation; // old iOS
  return typeof w === 'number' ? (w + 360) % 360 : 0;
};

/**
 * Tilt steering source. Only steer is produced (gas / brake come from the touch buttons). Listens to
 * deviceorientation once enabled; iOS needs `enable()` from a tap (permission prompt), Android does not.
 */
export class TiltInput implements InputSource {
  active = false;
  speedKph = 0;
  /** Latest raw wheel angle (degrees) and its confidence; the calibration reads it. */
  readonly roll: Roll = { deg: 0, inPlane: 0 };
  private steer = 0;
  private target = 0;
  private last = 0;
  private listening = false;
  private readonly prefs: ControlStore;

  constructor(prefs: ControlStore) {
    this.prefs = prefs;
  }

  /** Ask for motion access where needed (call from a click). */
  async enable(): Promise<TiltPermission> {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return 'unsupported';
    const ctor = (window as unknown as { DeviceOrientationEvent: OrientationCtor }).DeviceOrientationEvent;
    if (typeof ctor.requestPermission === 'function') {
      try {
        if ((await ctor.requestPermission()) !== 'granted') return 'denied';
      } catch {
        return 'denied';
      }
    }
    this.listen();
    return 'granted';
  }

  /** Android / desktop: start listening without a prompt when allowed. */
  listen(): void {
    if (this.listening || typeof window === 'undefined') return;
    this.listening = true;
    window.addEventListener('deviceorientation', this.onEvent);
  }

  /** The current wheel angle becomes the centre. Returns false while the phone is too flat to read. */
  calibrate(): boolean {
    if (this.roll.inPlane < MIN_INPLANE) return false;
    this.prefs.data.tilt.zeroDeg = this.roll.deg;
    this.prefs.commit();
    return true;
  }

  /** True once real orientation events arrived. */
  get receiving(): boolean {
    return this.last > 0 && performance.now() - this.last < 1000;
  }

  sample(out: CarInput): CarInput {
    const now = performance.now();
    const dt = this.lastSample ? (now - this.lastSample) / 1000 : 0;
    this.lastSample = now;
    this.steer = this.active && this.receiving ? smoothSteer(this.steer, this.target, dt, this.speedKph) : 0;
    out.throttle = 0;
    out.brake = 0;
    out.steer = this.steer;
    out.handbrake = false;
    out.nitro = false;
    return out;
  }

  dispose(): void {
    window.removeEventListener('deviceorientation', this.onEvent);
    this.listening = false;
  }

  private lastSample = 0;

  private readonly onEvent = (e: DeviceOrientationEvent): void => {
    if (e.beta === null || e.gamma === null) return;
    rollFrom(e.beta, e.gamma, screenAngle(), this.roll);
    this.last = performance.now();
    if (this.roll.inPlane >= MIN_INPLANE) this.target = steerFromRoll(this.roll.deg, this.prefs.data.tilt); // flat: hold the last value
  };
}
