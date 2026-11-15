import type { CarTuning } from '../carTuning';
import type { CarSpecV2 } from '../../types/cars';

/** Diff codes (numbers, no enum): 0 open, 1 helical, 2 viscous, 3 clutch, 4 active. Layout: 0 FWD, 1 RWD, 2 AWD. */
const DIFF: Record<CarSpecV2['diff'], number> = { open: 0, helical: 1, viscous: 2, clutch: 3, active: 4 };
const LAYOUT: Record<CarSpecV2['drive'], number> = { FWD: 0, RWD: 1, AWD: 2 };

/**
 * v2 handling: parameters derived from the car's real spec (types/cars) scaled by its live tuning (upgrades, setup),
 * plus the last step's telemetry for the F4 overlay. One object per car, rebuilt in place on reset (no allocation).
 */
export interface V2Car {
  mass: number; a: number; b: number; wb: number; trackF: number; trackR: number; cg: number; inertia: number; rollF: number;
  muF: number; muR: number; nomF: number; nomR: number; sens: number;
  /** Tyre curve per axle: Pacejka-style B, C (C sets the slide level), peak slip angle (rad), slide share of peak. */
  bF: number; cF: number; pkF: number; slideF: number; bR: number; cR: number; pkR: number; slideR: number;
  layout: number; awdFront: number; diff: number; lock: number; preload: number; wheelR: number;
  cdA: number; clF: number; clR: number; bias: number; brakeMax: number; ayc: number;
  // telemetry (written every step)
  fzF: number; fzR: number; alphaF: number; alphaR: number; useF: number; useR: number; split: number; delta: number; assist: number;
  lockedF: boolean; lockedR: boolean; spin: boolean;
}

const G = 9.81;
const RHO = 1.225;

/** Tyre peak slip angle and slide share from the size: wider and lower = earlier, sharper peak. */
function tyre(width: number, aspect: number, outIdx: 0 | 1, o: V2Car): void {
  const pk = 0.058 + 0.0008 * aspect - 0.00018 * (width - 195);
  const slide = Math.min(0.85, Math.max(0.75, 0.75 + (aspect - 35) * 0.005));
  const c = 2 - (2 / Math.PI) * Math.asin(slide); // sin(C pi/2) = slide: the force left when fully sliding
  const b = Math.tan(Math.PI / (2 * c)) / pk; // peak of sin(C atan(B a)) at a = pk
  if (outIdx === 0) { o.pkF = pk; o.slideF = slide; o.cF = c; o.bF = b; } else { o.pkR = pk; o.slideR = slide; o.cR = c; o.bR = b; }
}

/** A generic spec from a v1 tuning (cars without real data, e.g. test defaults). */
function generic(t: CarTuning): CarSpecV2 {
  const wb = t.cgToFront + t.cgToRear;
  const drive = t.driveFront >= 0.99 ? 'FWD' : t.driveFront > 0.01 ? 'AWD' : 'RWD';
  return {
    mass: t.mass, frontWeight: t.cgToRear / wb, wheelbase: wb, trackF: 1.5, trackR: 1.5, cgHeight: t.cgHeight, rollFront: t.rollFront, drive,
    awdFront: drive === 'AWD' ? t.driveFront : drive === 'FWD' ? 1 : 0, diff: 'helical', lsdPreload: 0, lsdLock: 0.3,
    tyreF: { width: 225, aspect: 45, rim: 17 }, tyreR: { width: 225, aspect: 45, rim: 17 }, tyreMu: 0.96,
    engine: { peakPs: 0, psRpm: 0, peakNm: t.engineTorque, nmRpm: t.peakRpm, redline: t.redlineRpm, idle: t.idleRpm },
    gears: [], finalDrive: t.finalDrive, cd: t.dragCoef / (0.5 * RHO * 2), frontalArea: 2, clF: 0, clR: 0, brakeBias: t.brakeBias,
    yawInertia: t.inertia, ayc: 0, character: '', est: [],
  };
}

/** Fill `o` from the tuning's spec link (or a generic spec). Safe to call on reset. */
export function buildV2(t: CarTuning, o: V2Car): V2Car {
  const link = t.v2;
  const s = link ? link.spec : generic(t);
  const ref = link?.ref;
  const sc = (now: number, base: number | undefined): number => (base && base > 0 ? now / base : 1);
  o.mass = t.mass;
  o.wb = s.wheelbase;
  o.a = s.wheelbase * (1 - s.frontWeight);
  o.b = s.wheelbase - o.a;
  o.trackF = s.trackF;
  o.trackR = s.trackR;
  o.cg = Math.max(0.3, s.cgHeight + (ref ? t.cgHeight - ref.cgHeight : 0));
  o.inertia = s.yawInertia * sc(t.mass, ref?.mass ?? s.mass);
  o.rollF = Math.min(0.75, Math.max(0.3, s.rollFront));
  o.muF = s.tyreMu * sc(t.gripFront, ref?.gripFront);
  o.muR = s.tyreMu * sc(t.gripRear, ref?.gripRear);
  o.nomF = 3600 * (s.tyreF.width / 225);
  o.nomR = 3600 * (s.tyreR.width / 225);
  o.sens = 0.1 * sc(t.loadSens, ref?.loadSens);
  tyre(s.tyreF.width, s.tyreF.aspect, 0, o);
  tyre(s.tyreR.width, s.tyreR.aspect, 1, o);
  o.layout = LAYOUT[s.drive];
  o.awdFront = s.awdFront;
  o.diff = DIFF[s.diff];
  o.lock = s.lsdLock;
  o.preload = s.lsdPreload;
  o.wheelR = t.wheelRadius;
  o.cdA = 0.5 * RHO * s.cd * s.frontalArea * sc(t.dragCoef, ref?.dragCoef);
  o.clF = 0.5 * RHO * s.clF;
  o.clR = 0.5 * RHO * s.clR;
  o.bias = Math.min(0.8, Math.max(0.5, s.brakeBias + (ref ? t.brakeBias - ref.brakeBias : 0)));
  o.brakeMax = 1.35 * t.mass * G * sc(t.brakeForce, ref?.brakeForce);
  o.ayc = s.ayc;
  return o;
}

export function createV2(t: CarTuning): V2Car {
  const o = {
    fzF: 0, fzR: 0, alphaF: 0, alphaR: 0, useF: 0, useR: 0, split: 0, delta: 0, assist: 0, lockedF: false, lockedR: false, spin: false,
  } as V2Car;
  return buildV2(t, o);
}
