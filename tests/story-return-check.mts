import { StoryController } from '../src/game/story.ts';
import { defaultSave, SaveStore, type KeyValueStore } from '../src/core/save.ts';
import { CARS } from '../src/data/cars.ts';
import { EVERY_EVENT } from '../src/data/story2.ts';
import type { RaceResult } from '../src/core/raceResult.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
const mem: Record<string, string> = {};
const kv: KeyValueStore = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => void (mem[k] = v) };
const store = new SaveStore(kv, defaultSave('civic', 0xffffff), CARS.map((x) => x.id));
store.data.career.seenIntro = true; // not the cold open

const log: string[] = [];
const game = { setup: { meta: { rivalIds: ['pixel', 'lola'], skillScale: 1, wet: false, eventId: null } }, weather: 'CLEAR', onIntroStart: null, onIntroEnd: null, onCountdown: null, showroom() { log.push('showroom'); }, startRace() { log.push('race'); } };
const story = new StoryController({
  game: game as never, store,
  dialogue: { play: (_l: unknown, cb: () => void) => cb(), onChoose: null } as never,
  cards: { play: (_c: unknown, cb: () => void) => cb() } as never,
  results: { hide() { log.push('hide'); } } as never,
  subs: { schedule() {}, clear() {}, flash() {} } as never,
  cutscenes: { play: (_c: unknown, cb: () => void) => cb() } as never,
  hideMenu: () => log.push('hideMenu'), showStory: () => log.push('showStory'), showEnding: (n: number) => log.push(`ending${n}`),
});
const result = (position: number): RaceResult => ({ position, racers: [{ name: 'You', position, time: 100, isPlayer: true }, { name: 'A', position: 3 - position, time: 101, isPlayer: false }], cash: 100, totalTime: 100, bestLap: 50, driftScore: 0 } as unknown as RaceResult);

const ev = EVERY_EVENT[0];
story.start(ev, () => log.push('city'));
check('an event started from the city runs as normal (dialogue then race)', log.includes('race') && log.includes('hideMenu'));
const lost = story.finish(result(3));
const labelBack = lost && 'buttons' in lost ? lost.buttons[1].label : '';
check('a lost event offers a way back to the city, not the chapter list', !!lost && !lost.passed && /city|ciudad/i.test(labelBack), labelBack);
(lost as { buttons: { action: () => void }[] }).buttons[1].action();
check('that button goes back to the city and not to the story menu', log.includes('city') && !log.includes('showStory'), log.join(','));

log.length = 0;
story.start(ev, () => log.push('city'));
const won = story.finish(result(1));
check('a won event passes and continues', !!won && won.passed);
(won as { buttons: { action: () => void }[] }).buttons[0].action();
check('after the win dialogue the city comes back (no chapter list)', log.includes('city') && !log.includes('showStory'), log.join(','));

log.length = 0;
const second = EVERY_EVENT[1];
story.start(second); // from the story menu: no return
const lost2 = story.finish(result(3));
(lost2 as { buttons: { action: () => void }[] }).buttons[1].action();
check('started from the story menu it still goes to the chapter list', log.includes('showStory') && !log.includes('city'), log.join(','));

log.length = 0;
story.start(second, () => log.push('city'));
story.endStory(); // leaving to the main menu clears the event and its way back
check('after endStory no event is in progress', story.current === null);
console.log(failed ? `FAILED ${failed}` : 'ALL PASS');
process.exit(failed ? 1 : 0);
