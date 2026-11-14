import { completeEvent, driftCash, evaluate, isDone } from '../core/career';
import type { RaceResult } from '../core/raceManager';
import type { SaveStore } from '../core/save';
import { findCar } from '../data/cars';
import { buildField, findRival } from '../data/rivals';
import { EVENTS, INTRO_LINES, OPENING_CAPTIONS, type StoryEvent } from '../data/story';
import type { DialogueBox, Subtitles } from '../ui/dialogue';
import type { TitleCards } from '../ui/titleCards';
import { PREVIOUSLY } from '../data/lore';
import type { ResultsExtra, ResultsScreen } from '../ui/results';
import type { Game } from './game';

export interface StoryDeps {
  game: Game;
  store: SaveStore;
  dialogue: DialogueBox;
  cards: TitleCards;
  results: ResultsScreen;
  subs: Subtitles;
  /** Close any menu overlay before the cutscene or race starts. */
  hideMenu: () => void;
  /** Back to the chapter screen / ending card. */
  showStory: () => void;
  showEnding: () => void;
}

/** Runs Chapter 1 as a career: dialogue, race setup per event, objective check, rewards, unlocks and the ending. */
export class StoryController {
  /** The event being played, null in free race. */
  current: StoryEvent | null = null;
  private readonly d: StoryDeps;

  constructor(d: StoryDeps) {
    this.d = d;
    const g = d.game;
    g.onIntroStart = () => {
      if (this.current) d.subs.schedule(OPENING_CAPTIONS);
    };
    g.onIntroEnd = () => d.subs.clear();
    g.onCountdown = () => {
      if (this.current) d.subs.flash(this.current.card, 3.2);
    };
  }

  /** Begin a chapter event: cutscene dialogue first, then the race. */
  start(ev: StoryEvent): void {
    const d = this.d;
    this.current = ev;
    d.hideMenu();
    const save = d.store.data;
    const first = !save.career.seenIntro && save.career.completed.length === 0 && ev.id === EVENTS[0].id;
    const player = findCar(ev.carId ?? save.selected);
    // finale cutscene: Dante's car on show while he talks; otherwise your own
    if (ev.id === 'finale') d.game.showroom(findCar(findRival('dante').carId), findRival('dante').color, findRival('dante').glow);
    else d.game.showroom(player, save.paint[player.id] ?? player.color, save.glow[player.id]);
    const lines = first ? [...INTRO_LINES, ...ev.before] : ev.before;
    const run = (): void => d.dialogue.play(lines, () => this.launch(ev, first));
    if (first) d.cards.play(PREVIOUSLY, run); // skippable "Previously in Kestrel Bay" cards before the intro
    else run();
  }

  private launch(ev: StoryEvent, cinematic: boolean): void {
    const d = this.d;
    const save = d.store.data;
    const car = findCar(ev.carId ?? save.selected);
    if (cinematic) {
      save.career.seenIntro = true;
      d.store.commit();
    }
    d.game.startRace({
      car, paint: save.paint[car.id] ?? car.color, glow: save.glow[car.id], weather: ev.weather, laps: ev.laps, cinematic,
      weatherChange: ev.weatherChange, agents: buildField(ev.rivals, ev.skillScale, ev.weather !== 'CLEAR'),
    });
  }

  /** Called when the player finishes. Free race: bank cash and records. Story: judge the objective and build the results buttons. */
  finish(r: RaceResult): ResultsExtra | void {
    const d = this.d;
    const ev = this.current;
    if (!ev) {
      d.store.recordRace(r.cash, r.bestLap, d.game.weather);
      return;
    }
    if (ev.kind === 'drift') r.cash = driftCash(r.driftScore);
    const outcome = evaluate(ev, r.position, r.driftScore);
    d.store.recordRace(r.cash, r.bestLap, ev.weatherChange ? ev.weatherChange.to : ev.weather);
    const notes: string[] = [];
    if (outcome.passed) {
      const got = completeEvent(d.store.data, ev);
      d.store.commit();
      if (got.firstTime) notes.push(`Story bonus + $${got.bonus.toLocaleString()}`);
      for (const id of got.newCars) notes.push(`Unlocked: ${findCar(id).brand} ${findCar(id).name}`);
    }
    return {
      objective: outcome.summary,
      passed: outcome.passed,
      notes,
      buttons: outcome.passed
        ? [{ label: 'Continue', hot: true, action: () => this.after(ev, true) }]
        : [{ label: 'Retry', hot: true, action: () => this.after(ev, false) }, { label: 'Chapter menu', action: () => this.leave() }],
    };
  }

  private after(ev: StoryEvent, won: boolean): void {
    const d = this.d;
    d.results.hide();
    d.dialogue.play(won ? ev.afterWin : ev.afterLose, () => {
      if (!won) this.launch(ev, false);
      else if (isDone(d.store.data.career) && !d.store.data.career.endingSeen) {
        d.store.data.career.endingSeen = true;
        d.store.commit();
        d.game.showroom(findCar(d.store.data.selected), 0xe8e8ee);
        d.showEnding();
      } else this.leave();
    });
  }

  private leave(): void {
    this.current = null;
    this.d.results.hide();
    const c = this.d.store.data;
    const car = findCar(c.selected);
    this.d.game.showroom(car, c.paint[car.id] ?? car.color, c.glow[car.id]);
    this.d.showStory();
  }

  /** Free race / menu: no event in progress. */
  endStory(): void {
    this.current = null;
  }
}
