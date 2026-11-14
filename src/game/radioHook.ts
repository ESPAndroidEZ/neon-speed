import type { Engine } from '../core/engine';
import type { Subtitles } from '../ui/dialogue';
import type { Game } from './game';
import { RadioDirector } from './radio';

/** DJ Switch's radio: feeds the race to the RadioDirector a few times per second and shows what it says. */
export function installRadio(engine: Engine, game: Game, subs: Subtitles): void {
  const radio = new RadioDirector(Date.now() & 0xffff);
  let radioImpact = 0;
  const baseImpact = game.onImpact;
  game.onImpact = (s) => {
    baseImpact?.(s);
    radioImpact = Math.max(radioImpact, s);
  };
  let radioRace: unknown = null;
  let radioClock = 0;
  let finishSaid = false;
  engine.onFrame((_a, dt) => {
    radioClock += dt;
    if (radioClock < 0.25) return;
    radioClock = 0;
    if (radioRace !== game.rm) {
      radioRace = game.rm;
      radio.reset();
    }
    const rm = game.rm;
    if (rm.phase === 'FINISHED' && !finishSaid && game.state !== 'MENU') {
      finishSaid = true;
      subs.flash(`DJ SWITCH: ${radio.finish(game.telemetry.position)}`, 5, 'switch');
    } else if (rm.phase !== 'FINISHED') finishSaid = false;
    const t = game.telemetry;
    const line = radio.update({
      racing: game.state === 'RACING' && rm.phase === 'RACING' && !game.paused, time: rm.raceTime, position: t.position, count: t.racerCount, lap: t.lap, laps: t.totalLaps,
      weather: game.weather, impact: radioImpact, driftChain: t.driftScore,
      rivals: rm.racers.filter((r) => !r.isPlayer).map((r) => ({ name: r.name, position: rm.positionOf(r) })),
    });
    radioImpact = 0;
    if (line) subs.flash(`DJ SWITCH: ${line}`, 4.2, 'switch');
  });
}
