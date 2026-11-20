import { applyChoice, chapter3Complete, completeEvent, driftCash, evaluate, isDone, playable, storyComplete, type CareerState } from '../core/career';
import type { RaceResult } from '../core/raceManager';
import type { SaveStore } from '../core/save';
import { findCar } from '../data/cars';
import { buildField, carTier, findRival } from '../data/rivals';
import { AI_SETTING } from '../physics/aiDifficulty';
import { CUTSCENES, cutsceneFlag } from '../data/cutsceneAll';
import type { CutscenePlayer } from './cutscene';
import { EVENTS, OPENING_CAPTIONS, type Line, type StoryEvent } from '../data/story';
import { findAnyEvent as findEvent } from '../data/story2';
import type { DialogueBox, Subtitles } from '../ui/dialogue';
import type { TitleCards } from '../ui/titleCards';
import { PREVIOUSLY } from '../data/lore';
import type { ResultsExtra, ResultsScreen } from '../ui/results';
import type { Cast } from './cast';
import type { Game } from './game';
import { t } from '../i18n';

export interface StoryDeps {
  game: Game;
  /** The people beside the showroom car (optional: tests run without it). */
  cast?: Cast;
  store: SaveStore;
  dialogue: DialogueBox;
  cards: TitleCards;
  results: ResultsScreen;
  subs: Subtitles;
  cutscenes: CutscenePlayer;
  /** Close any menu overlay before the cutscene or race starts. */
  hideMenu: () => void;
  /** Back to the chapter screen / ending card. */
  showStory: () => void;
  showEnding: (chapter: number) => void;
}

/** Runs Chapter 1 as a career: dialogue, race setup per event, objective check, rewards, unlocks and the ending. */
export class StoryController {
  /** The event being played, null in free race. */
  current: StoryEvent | null = null;
  private readonly d: StoryDeps;
  /** Failed attempts per event this session: repeated failures get different lines. */
  private readonly tries = new Map<string, number>();

  constructor(d: StoryDeps) {
    this.d = d;
    const g = d.game;
    g.onIntroStart = () => {
      if (this.current) d.subs.schedule(OPENING_CAPTIONS, true); // the opening narration is part of the cinematic
    };
    g.onIntroEnd = () => d.subs.clear();
    d.dialogue.onChoose = (opt) => {
      const reply = applyChoice(d.store.data.career, opt);
      d.store.commit();
      return playable(reply, d.store.data.career);
    };
    g.onCountdown = () => {
      const ev = this.current;
      if (!ev) return;
      const flags = this.view(ev).flags;
      d.subs.schedule((ev.cues ?? []).filter((c) => (!c.if || flags[c.if]) && (!c.unless || !flags[c.unless])));
      d.subs.flash(ev.card, 3.2);
    };
  }

  /** Career state plus what the game knows right now: replay, retry, the car and its tier. Lines can test these like story flags. */
  private view(ev: StoryEvent): CareerState {
    const save = this.d.store.data;
    const car = findCar(ev.carId ?? save.selected);
    const flags = { ...save.career.flags, [`car-${car.id}`]: true, [`tier-${carTier(car)}`]: true };
    if (save.career.completed.includes(ev.id)) flags.replay = true;
    if ((this.tries.get(ev.id) ?? 0) > 0) flags.retry = true;
    return { ...save.career, flags };
  }

  /** A restored race belongs to this event (or to none): the results screen then judges it as story. */
  resume(eventId: string | null): void {
    this.current = eventId ? findEvent(eventId) : null;
  }

  /** Begin a chapter event: cutscene dialogue first, then the race. */
  start(ev: StoryEvent): void {
    const d = this.d;
    this.current = ev;
    d.hideMenu();
    const save = d.store.data;
    const first = !save.career.seenIntro && save.career.completed.length === 0 && ev.id === EVENTS[0].id;
    const player = findCar(ev.carId ?? save.selected);
    const go = (): void => {
      // finale cutscene: Dante's car on show while he talks; otherwise your own
      if (ev.id === 'finale' || ev.id === 'c2-final') d.game.showroom(findCar(findRival('dante').carId), findRival('dante').color, findRival('dante').glow);
      else d.game.showroom(player, save.paint[player.id] ?? player.color, save.glow[player.id]);
      d.cast?.stage(ev.id === 'finale' || ev.id === 'c2-final' ? 'dante' : 'mara');
      // cold open: the very first run goes straight to the cinematic and the race; the first conversation comes after it
      const lines = first ? [] : playable(ev.before, this.view(ev));
      if (lines.length) d.dialogue.play(lines, () => this.launch(ev, false));
      else this.launch(ev, first);
    };
    if (first) go();
    else this.cutThen(ev.cutBefore, go);
  }

  /** Play a cutscene once (story flag `cs:<id>`), with the showroom car on stage; then `done`. Unknown, seen or flag-blocked cutscenes just continue. */
  private cutThen(id: string | undefined, done: () => void): void {
    const d = this.d;
    const cs = id ? CUTSCENES[id] : undefined;
    const c = d.store.data.career;
    if (!cs || c.flags[cutsceneFlag(cs.id)] || (cs.if && !c.flags[cs.if]) || (cs.unless && c.flags[cs.unless])) return done();
    c.flags[cutsceneFlag(cs.id)] = true;
    d.store.commit();
    const car = findCar(d.store.data.selected);
    d.game.showroom(car, d.store.data.paint[car.id] ?? car.color, d.store.data.glow[car.id]);
    d.cutscenes.play(cs, done);
  }

  private launch(ev: StoryEvent, cinematic: boolean): void {
    const d = this.d;
    const save = d.store.data;
    const car = findCar(ev.carId ?? save.selected);
    const rivals = Object.entries(ev.rivalsIf ?? {}).find(([flag]) => save.career.flags[flag])?.[1] ?? ev.rivals;
    if (cinematic) {
      save.career.seenIntro = true;
      d.store.commit();
    }
    d.game.startRace({
      car, paint: save.paint[car.id] ?? car.color, glow: save.glow[car.id], weather: ev.weather, laps: ev.laps, trackId: ev.trackId, cinematic,
      weatherChange: ev.weatherChange, agents: buildField(rivals, ev.skillScale, ev.weather !== 'CLEAR'),
      meta: { rivalIds: rivals, skillScale: ev.skillScale, wet: ev.weather !== 'CLEAR', eventId: ev.id, level: AI_SETTING.level },
    });
  }

  /** Called when the player finishes. Free race: bank cash and records. Story: judge the objective and build the results buttons. */
  finish(r: RaceResult): ResultsExtra | void {
    const d = this.d;
    const ev = this.current;
    if (!d.store.claimRace(d.game.setup?.meta?.raceId)) r.cash = 0; // already paid (a save of this finish was reloaded)
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
      if (got.firstTime) notes.push(t('story.bonus', { n: got.bonus.toLocaleString() }));
      for (const id of got.newCars) notes.push(t('story.unlocked', { car: `${findCar(id).brand} ${findCar(id).name}` }));
    }
    return {
      objective: outcome.summary,
      passed: outcome.passed,
      notes,
      buttons: outcome.passed
        ? [{ label: t('story.continue'), hot: true, action: () => this.after(ev, true) }]
        : [{ label: t('story.retry'), hot: true, action: () => this.after(ev, false) }, { label: t('story.chapterMenu'), action: () => this.leave() }],
    };
  }

  private after(ev: StoryEvent, won: boolean): void {
    const d = this.d;
    d.results.hide();
    const n = this.tries.get(ev.id) ?? 0;
    const sets: Line[][] = [ev.afterLose, ...(ev.loseAlt ?? [])];
    const lines = won ? ev.afterWin : sets[n % sets.length];
    if (won) this.tries.delete(ev.id);
    else this.tries.set(ev.id, n + 1);
    const play = (): void => d.dialogue.play(playable(lines, this.view(ev)), () => {
      if (!won) this.launch(ev, false);
      else if (storyComplete(d.store.data.career) && !d.store.data.career.epilogueSeen) {
        d.store.data.career.epilogueSeen = true;
        d.store.commit();
        d.showEnding(2);
      } else if (ev.chapter === 3 && chapter3Complete(d.store.data.career) && !d.store.data.career.flags.c3Seen) {
        d.store.data.career.flags.c3Seen = true;
        d.store.commit();
        this.cutThen(`ch3-end-${d.store.data.career.flags.deal ? 'deal' : 'public'}`, () => d.showEnding(3));
      } else if (isDone(d.store.data.career) && !d.store.data.career.endingSeen) {
        d.store.data.career.endingSeen = true;
        d.store.commit();
        d.game.showroom(findCar(d.store.data.selected), 0xe8e8ee);
        d.showEnding(1);
      } else this.leave();
    });
    const career = d.store.data.career;
    if (won && ev.id === EVENTS[0].id && !career.flags.cardsSeen) {
      career.flags.cardsSeen = true;
      d.store.commit();
      d.cards.play(PREVIOUSLY, play); // skippable "Previously in Kestrel Bay" cards, once, after the first race
    } else play();
  }

  private leave(): void {
    this.current = null;
    this.d.results.hide();
    const c = this.d.store.data;
    const car = findCar(c.selected);
    this.d.game.showroom(car, c.paint[car.id] ?? car.color, c.glow[car.id]);
    this.d.cast?.stage('mara');
    this.d.showStory();
  }

  /** Free race / menu: no event in progress. */
  endStory(): void {
    this.current = null;
  }
}
