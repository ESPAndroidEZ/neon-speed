import type { CarController } from '../physics/carController';
import type { TrackContact } from '../physics/trackContact';
import type { AIRacerAgent, CarInput } from '../types/game';
import type { LapCounter } from './lapCounter';

export interface Racer {
  id: string;
  name: string;
  isPlayer: boolean;
  car: CarController;
  contact: TrackContact;
  laps: LapCounter;
  agent: AIRacerAgent | null;
  input: CarInput;
  finished: boolean;
  finishTime: number;
  lapStart: number;
  bestLap: number;
  /** Finish order, 1-based, 0 until finished. */
  finishRank: number;
  /** Seconds a rival has been pinned (almost stopped) while racing; past UNSTICK_AFTER it is put back on the road. */
  stuck: number;
  /** Furthest progress (samples) reached so far: a rival that stops gaining ground is put back on the road. */
  progress: number;
}

export interface RaceResult {
  position: number;
  racers: { name: string; position: number; time: number | null; isPlayer: boolean }[];
  cash: number;
  totalTime: number;
  bestLap: number;
  driftScore: number;
}

const PAYOUT = [3000, 1800, 1100, 600, 300];

/** 1-based race position: finishers by finish order, then everyone else by distance driven. */
export function positionOf(racers: readonly Racer[], r: Racer): number {
  let p = 1;
  for (const o of racers) {
    if (o === r) continue;
    if (r.finished && o.finished ? o.finishRank < r.finishRank : o.finished || (!r.finished && o.laps.progress > r.laps.progress)) p++;
  }
  return p;
}

export function buildResult(racers: readonly Racer[], p: Racer, totalLaps: number): RaceResult {
  const position = positionOf(racers, p);
  const drift = p.car.drift.bank + p.car.drift.chain;
  const base = PAYOUT[Math.min(position - 1, PAYOUT.length - 1)];
  const rows = racers
    .map((r) => ({ name: r.name, position: positionOf(racers, r), time: r.finished ? r.finishTime : null, isPlayer: r.isPlayer }))
    .sort((a, b) => a.position - b.position);
  return {
    position,
    racers: rows,
    cash: Math.round(base * (totalLaps / 3) + drift / 10),
    totalTime: p.finishTime,
    bestLap: p.bestLap,
    driftScore: Math.floor(drift),
  };
}
