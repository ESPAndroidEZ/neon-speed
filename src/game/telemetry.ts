import type { CarState, RaceTelemetry } from '../types/game';

export const createTelemetry = (): RaceTelemetry => ({
  speedKph: 0, rpm: 0, redlineRpm: 7500, gear: 1, nitroLevel: 1, nitroActive: false, drifting: false,
  driftScore: 0, lap: 1, totalLaps: 3, position: 1, racerCount: 1, raceTime: 0,
});

export const createViewState = (): CarState => ({
  position: { x: 0, y: 0, z: 0 }, heading: 0, velocity: { x: 0, y: 0, z: 0 }, speed: 0, yawRate: 0, slipAngle: 0,
});
