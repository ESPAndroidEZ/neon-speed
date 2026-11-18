import type { CarInput } from '../types/game';

/** Driving coach: which control to hint next. Pure and allocation free; display lives in `ui/coach.ts`. */
export const COACH_STEPS = ['gas', 'brake', 'nitro', 'handbrake'] as const;
export const COACH_EXPIRE = 7;
/** A hint is shown in at most this many different races. */
export const COACH_MAX_RACES = 3;

/** Saved between sessions (own localStorage key, not the game save). */
export interface CoachMemory {
  used: boolean[];
  shown: number[];
  dirty: boolean;
}
/** Per race. */
export interface CoachRun {
  step: number;
  since: number;
  skipped: boolean[];
  counted: boolean[];
}

export const newCoachMemory = (): CoachMemory => ({ used: [false, false, false, false], shown: [0, 0, 0, 0], dirty: false });
export const newCoachRun = (): CoachRun => ({ step: -1, since: 0, skipped: [false, false, false, false], counted: [false, false, false, false] });

function usedNow(i: number, inp: CarInput, kph: number, nitroLevel: number): boolean {
  if (i === 0) return inp.throttle > 0.6;
  if (i === 1) return inp.brake > 0.4 && kph > 20;
  if (i === 2) return inp.nitro && nitroLevel > 0;
  return inp.handbrake && kph > 30;
}

function ready(i: number, raceTime: number, kph: number, nitroLevel: number): boolean {
  if (i === 0) return raceTime > 1.5;
  if (i === 1) return raceTime > 9 && kph > 100;
  if (i === 2) return raceTime > 5 && nitroLevel > 0.25;
  return raceTime > 16 && kph > 60;
}

/** Advance one frame. Returns the step index to show (see COACH_STEPS) or -1 for nothing. */
export function coachUpdate(m: CoachMemory, r: CoachRun, inp: CarInput, raceTime: number, kph: number, nitroLevel: number, dt: number): number {
  if (raceTime < 0.2) {
    r.step = -1;
    for (let i = 0; i < 4; i++) {
      r.skipped[i] = false;
      r.counted[i] = false;
    }
  }
  for (let i = 0; i < 4; i++) {
    if (!m.used[i] && usedNow(i, inp, kph, nitroLevel)) {
      m.used[i] = true;
      m.dirty = true;
    }
  }
  if (r.step >= 0) {
    r.since += dt;
    if (m.used[r.step] || r.since > COACH_EXPIRE) {
      r.skipped[r.step] = true;
      r.step = -1;
    }
  }
  if (r.step < 0) {
    for (let i = 0; i < 4; i++) {
      if (m.used[i] || r.skipped[i] || (!r.counted[i] && m.shown[i] >= COACH_MAX_RACES) || !ready(i, raceTime, kph, nitroLevel)) continue;
      r.step = i;
      r.since = 0;
      if (!r.counted[i]) {
        r.counted[i] = true;
        m.shown[i]++;
        m.dirty = true;
      }
      break;
    }
  }
  return r.step;
}
