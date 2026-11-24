import type { Engine } from '../core/engine';
import type { Game } from './game';
import type { Hud } from '../ui/hud';
import { t } from '../i18n';

/**
 * Knockout display (core/knockout): the rule at the countdown, a pop-up for every car that is out, and knocked-out cars
 * hidden (they are ghosts and coast to a stop). Display only.
 */
export function attachKnockoutFeedback(engine: Engine, game: Game, hud: Hud): void {
  let seen = 0, told = false;
  engine.onFrame(() => {
    const rm = game.rm, k = rm?.knockout;
    if (!k || game.state !== 'RACING') { told = false; return; }
    if (rm.phase === 'COUNTDOWN') { seen = 0; if (!told && rm.countdown < 2.4) { told = true; hud.popUp(t('ko.rule'), '#ff5470'); } }
    if (k.seq !== seen) {
      seen = k.seq;
      hud.popUp(k.lastWasPlayer ? t('ko.you') : t('ko.out', { name: k.last }), '#ff5470');
    }
    for (const v of game.views.views) v.holder.visible = !v.racer.out;
  });
}
