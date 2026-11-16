import type { Engine } from '../core/engine';
import type { LaunchResult } from '../core/launch';
import { WEATHER } from '../physics/weather';
import { updatePrecipCover } from '../world/precipCover';
import { attachCoach } from '../ui/coach';
import { attachWrongWay } from '../ui/wrongWay';
import { attachGapTags } from '../ui/gapTags';
import { CornerGuide } from '../ui/cornerGuide';
import { attachGhost } from './ghost';
import { FinalLapCue } from './finalLap';
import { PosCue } from './posCue';
import type { Hud } from '../ui/hud';
import type { Game } from './game';
import { t } from '../i18n';

const LAUNCH_POP: Record<Exclude<LaunchResult, 'NONE'>, ['launch.perfect' | 'launch.good' | 'launch.early', string]> = {
  PERFECT: ['launch.perfect', 'var(--green)'],
  GOOD: ['launch.good', '#18d8ff'],
  EARLY: ['launch.early', '#ffc23d'],
};
const REWARD: Record<string, 'rw.near' | 'rw.slip' | 'rw.clean'> = { 'NEAR MISS': 'rw.near', SLIPSTREAM: 'rw.slip', 'CLEAN CORNER': 'rw.clean' };

/**
 * Race feedback that reads the game and writes the HUD: the corner guide (next corner + BRAKE/EASE warning)
 * and the launch pop-up at GO. Display only: never touches physics, so replays and saves are unaffected.
 */
export function attachRaceFeedback(engine: Engine, game: Game, hud: Hud): CornerGuide {
  const guide = new CornerGuide(document.getElementById('hud') ?? document.body);
  const bestDelta = attachGhost(engine, game, hud); // best-lap ghost car
  attachCoach(engine, game); // first-races control hints
  attachWrongWay(engine, game); // WRONG WAY banner after a spin
  attachGapTags(engine, game, bestDelta); // seconds to the rivals ahead / behind, and to your best lap
  const finalLap = new FinalLapCue();
  const posCue = new PosCue();
  let countdownHint = false;
  let seenReward = 0;
  let finalIn = -1; // seconds until FINAL LAP shows (after the lap-time pop-up)
  engine.onFrame((_a, dt) => {
    const rm = game.rm;
    const me = rm.player; // rain / snow stop under tunnel roofs and at the car's roof
    if (me) updatePrecipCover(rm.track, me.contact.hit.index, engine.camera.position.x, engine.camera.position.z, me.car.state.position);
    const racing = game.state === 'RACING' && rm.phase === 'RACING';
    if (game.state === 'RACING' && rm.phase === 'COUNTDOWN' && !countdownHint && rm.countdown < 2.2) {
      countdownHint = true;
      hud.popUp(t('launch.hint'), '#e8f6ff');
    }
    if (rm.phase !== 'COUNTDOWN') countdownHint = false;
    else { finalLap.reset(); posCue.reset(); finalIn = -1; }
    if (racing && finalLap.step(rm.playerLap, rm.totalLaps)) finalIn = 1.3;
    if (finalIn >= 0 && !game.paused && (finalIn -= dt) < 0) { finalIn = -1; if (racing) hud.popUp(t('lap.final'), '#ffc23d'); }
    if (racing && !game.paused && !game.player.finished) {
      const moved = posCue.step(game.telemetry.position, game.telemetry.racerCount, dt);
      if (moved) hud.flashPosition(moved > 0);
    }
    const a = rm.launch.announce;
    if (a && a !== 'NONE') {
      rm.launch.announce = null;
      hud.popUp(t(LAUNCH_POP[a][0]), LAUNCH_POP[a][1]);
    }
    if (rm.rewards.seq !== seenReward) {
      seenReward = rm.rewards.seq;
      const k = rm.rewards.last;
      if (k) hud.popUp(`${t(REWARD[k] ?? 'rw.clean')}  +${t('pad.nitro')}`, k === 'NEAR MISS' ? '#ffc23d' : k === 'SLIPSTREAM' ? '#18d8ff' : 'var(--green)');
    }
    if (!racing || game.player.finished) {
      guide.el.style.opacity = '0';
      return;
    }
    guide.prepare(rm.track.samples, WEATHER[game.weather].grip * Math.min(1, 0.6 + 0.4 * game.weatherIntensity));
    guide.update(game.player.contact.hit.index, game.player.car.state.speed);
  });
  return guide;
}
