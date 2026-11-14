import { SAVE_VERSION, type GameSnapshot } from '../core/gameSave';
import { findCar } from '../data/cars';
import { buildField } from '../data/rivals';
import { findEvent } from '../data/story';
import type { PhysicsLevel } from '../physics/weatherLevels';
import type { Weather } from '../types/game';
import type { Game } from './game';

/** Can this moment be saved? Only a race in progress (countdown or racing) that was set up with save metadata. */
export function canSave(g: Game): boolean {
  return (g.state === 'RACING' || g.state === 'PODIUM') && g.setup?.meta !== undefined && g.rm.phase !== 'FINISHED' && g.rm.phase !== 'GRID';
}

/** Capture the whole game: setup, weather and every module's state. Returns null when there is nothing to save. */
export function captureGame(g: Game): GameSnapshot | null {
  const s = g.setup;
  if (!s?.meta || !canSave(g)) return null;
  const t = g.telemetry;
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    summary: {
      eventTitle: s.meta.eventId ? findEvent(s.meta.eventId).title : null, carName: `${s.car.brand} ${s.car.name}`,
      lap: t.lap, laps: t.totalLaps, position: t.position, racers: t.racerCount, weather: g.weather, raceTime: g.rm.raceTime,
    },
    setup: {
      carId: s.car.id, paint: s.paint, glow: s.glow ?? null, weather: s.weather, laps: s.laps, rivalIds: s.meta.rivalIds,
      skillScale: s.meta.skillScale, wet: s.meta.wet, eventId: s.meta.eventId, weatherChange: s.weatherChange ?? null,
    },
    race: g.rm.snapshot(),
    weather: g.weather,
    weatherIntensity: g.weatherIntensity,
    physicsLevel: g.physicsLevel,
    surfaceSeed: g.world.surfaces.seed,
  };
}

/**
 * Rebuild the race from a snapshot (same car, rivals, weather) and put every module back exactly as saved.
 * Throws if the snapshot does not fit (the caller shows an error and stays where it is).
 */
export function restoreGame(g: Game, snap: GameSnapshot): void {
  const car = findCar(snap.setup.carId);
  const hold = g.onCountdown;
  g.onCountdown = null; // no intro card for a resumed race
  try {
    g.startRace({
      car, paint: snap.setup.paint, glow: snap.setup.glow ?? undefined, weather: snap.setup.weather as Weather, laps: snap.setup.laps, cinematic: false,
      weatherChange: (snap.setup.weatherChange as { at: number; to: Weather } | null) ?? undefined,
      agents: buildField(snap.setup.rivalIds, snap.setup.skillScale, snap.setup.wet),
      meta: { rivalIds: snap.setup.rivalIds, skillScale: snap.setup.skillScale, wet: snap.setup.wet, eventId: snap.setup.eventId },
    });
  } finally {
    g.onCountdown = hold;
  }
  g.rm.restore(snap.race as Parameters<Game['rm']['restore']>[0]);
  g.physicsLevel = snap.physicsLevel as PhysicsLevel;
  g.world.surfaces.reseed(snap.surfaceSeed);
  g.setWeather(snap.weather as Weather);
  g.weatherIntensity = snap.weatherIntensity;
  const wc = snap.setup.weatherChange;
  g.plan = wc && g.rm.raceTime < wc.at ? { at: wc.at, to: wc.to as Weather } : null;
  g.views.update(0, 0);
  g.syncView(true);
  g.state = 'RACING';
}
