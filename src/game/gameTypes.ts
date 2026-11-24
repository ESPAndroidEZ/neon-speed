import type { Upgrades } from '../data/upgrades';
import type { Engine } from '../core/engine';
import type { CarSpec } from '../data/cars';
import type { CarTuning } from '../physics/carTuning';
import type { AIRacerAgent, InputSource, Weather } from '../types/game';
import type { Hud } from '../ui/hud';
import type { ResultsScreen } from '../ui/results';
import type { World } from '../world/world';

export interface RaceSetup {
  car: CarSpec;
  paint: number;
  glow?: number;
  weather: Weather;
  /** Which map (src/data/tracks); Kestrel Bay when omitted. */
  trackId?: string;
  /** Switch weather mid-race after this many seconds of racing. */
  weatherChange?: { at: number; to: Weather };
  laps: number;
  /** Knockout: the last car is out at the end of every lap (core/knockout); `laps` is then one less than the field. */
  knockout?: boolean;
  /** A short grid fly-by first (camera/shots createFlybyShots); not on a restart. */
  flyby?: boolean;
  /** Play the intro cinematic first (otherwise straight to the countdown). */
  cinematic: boolean;
  /** What is needed to rebuild this race from a save. */
  meta?: { rivalIds: string[]; skillScale: number; wet: boolean; eventId: string | null; level?: string; raceId?: string };
  /** `upgrades`: performance upgrades the AI car runs (free races match the player's; none = stock). */
  agents: { agent: AIRacerAgent; car: CarSpec; paint: number; glow?: number; upgrades?: Upgrades }[];
}

export interface GameDeps {
  engine: Engine;
  world: World;
  hud: Hud;
  results: ResultsScreen;
  input: InputSource;
  tuning: CarTuning;
}
