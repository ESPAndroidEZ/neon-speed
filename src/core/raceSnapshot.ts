import type { RewardData } from './rewards';
import type { LaunchData } from './launch';
import type { RaceManager } from './raceManager';
import type { CarInput } from '../types/game';

interface RacerData {
  id: string; finished: boolean; finishTime: number; lapStart: number; bestLap: number | null; lapTimes?: number[]; finishRank: number;
  input: CarInput; car: unknown; laps: unknown; hitIndex: number; agent: unknown; stuck: number; progress?: number;
}

export interface RaceData {
  phase: string; countdown: number; raceTime: number; finishCount: number; racers: RacerData[];
  launch?: LaunchData;
  rewards?: RewardData;
}

/** JSON-safe snapshot of the whole race: timers, every racer's car, lap counter, AI state. */
export function snapshotRace(rm: RaceManager): RaceData {
  return {
    phase: rm.phase, countdown: rm.countdown, raceTime: rm.raceTime, finishCount: rm.finishCount, launch: rm.launch.snapshot(), rewards: rm.rewards.snapshot(),
    racers: rm.racers.map((r) => ({
      id: r.id, finished: r.finished, finishTime: r.finishTime, lapStart: r.lapStart, bestLap: Number.isFinite(r.bestLap) ? r.bestLap : null, lapTimes: r.lapTimes.slice(),
      finishRank: r.finishRank, input: { ...r.input }, car: r.car.snapshot(), laps: r.laps.snapshot(), hitIndex: r.contact.hit.index,
      agent: r.agent?.snapshot?.() ?? null, stuck: r.stuck, progress: r.progress,
    })),
  };
}

/** Restore a snapshot onto a race built with the same racers in the same order. Throws if the racer list differs. */
export function restoreRace(rm: RaceManager, d: RaceData): void {
  if (d.racers.length !== rm.racers.length) throw new Error('save does not match the current racers');
  rm.phase = d.phase as typeof rm.phase;
  rm.countdown = d.countdown;
  rm.raceTime = d.raceTime;
  rm.finishCount = d.finishCount;
  rm.launch.restore(d.launch);
  rm.rewards.restore(d.rewards);
  rm.result = null;
  d.racers.forEach((x, i) => {
    const r = rm.racers[i];
    if (r.id !== x.id) throw new Error('save does not match the current racers');
    r.finished = x.finished;
    r.finishTime = x.finishTime;
    r.lapStart = x.lapStart;
    r.bestLap = x.bestLap ?? Infinity;
    r.lapTimes.length = 0;
    if (Array.isArray(x.lapTimes)) for (const v of x.lapTimes) if (typeof v === 'number' && Number.isFinite(v)) r.lapTimes.push(v);
    r.finishRank = x.finishRank;
    Object.assign(r.input, x.input);
    r.car.restore(x.car);
    r.laps.restore(x.laps);
    r.progress = x.progress ?? r.laps.total;
    r.contact.hit.index = x.hitIndex;
    r.stuck = x.stuck ?? 0;
    if (x.agent !== null) r.agent?.restore?.(x.agent);
  });
}
