import type { Engine } from '../core/engine';
import type { LaunchResult } from '../core/launch';
import { WEATHER } from '../physics/weather';
import { CornerGuide } from '../ui/cornerGuide';
import { attachGhost } from './ghost';
import type { Hud } from '../ui/hud';
import type { Game } from './game';

const LAUNCH_POP: Record<Exclude<LaunchResult, 'NONE'>, [string, string]> = {
  PERFECT: ['PERFECT LAUNCH!', '#7dff9a'],
  GOOD: ['GOOD LAUNCH', '#18d8ff'],
  EARLY: ['OVER-REVVED', '#ffc23d'],
};

/**
 * Race feedback that reads the game and writes the HUD: the corner guide (next corner + BRAKE/EASE warning)
 * and the launch pop-up at GO. Display only: never touches physics, so replays and saves are unaffected.
 */
export function attachRaceFeedback(engine: Engine, game: Game, hud: Hud): CornerGuide {
  const guide = new CornerGuide(document.getElementById('hud') ?? document.body);
  attachGhost(engine, game, hud); // best-lap ghost car
  let countdownHint = false;
  let seenReward = 0;
  engine.onFrame(() => {
    const rm = game.rm;
    const racing = game.state === 'RACING' && rm.phase === 'RACING';
    if (game.state === 'RACING' && rm.phase === 'COUNTDOWN' && !countdownHint && rm.countdown < 2.2) {
      countdownHint = true;
      hud.popUp('HIT THE GAS JUST BEFORE GO', '#e8f6ff');
    }
    if (rm.phase !== 'COUNTDOWN') countdownHint = false;
    const a = rm.launch.announce;
    if (a && a !== 'NONE') {
      rm.launch.announce = null;
      hud.popUp(LAUNCH_POP[a][0], LAUNCH_POP[a][1]);
    }
    if (rm.rewards.seq !== seenReward) {
      seenReward = rm.rewards.seq;
      const k = rm.rewards.last;
      if (k) hud.popUp(`${k}  +NITRO`, k === 'NEAR MISS' ? '#ffc23d' : k === 'SLIPSTREAM' ? '#18d8ff' : '#7dff9a');
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
