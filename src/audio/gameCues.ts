import type { Game } from '../game/game';
import type { AudioBus } from './audioBus';
import { CountdownBeeps } from './countdownBeep';
import { RaceCues } from './raceCue';
import { installUiSound } from './uiSound';

/** Menu blips, start-line beeps, lap/finish stings and reward pings. Returns the per-frame update. */
export function installGameCues(bus: AudioBus, game: Game): () => void {
  installUiSound(bus, () => 9); // A: the key of the first house song
  const beeps = new CountdownBeeps(bus), cues = new RaceCues(bus);
  return () => {
    const rm = game.rm, p = rm.player;
    beeps.update(rm.banner);
    cues.update(p.lapTimes.length, p.finished, p.finishRank);
    cues.reward(rm.rewards.seq, rm.rewards.last);
  };
}
