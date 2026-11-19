import { completeEvent, defaultCareer, driftCash, evaluate, isDone, isUnlocked, nextEvent } from '../src/core/career.ts';
import { defaultSave, SaveStore, type KeyValueStore } from '../src/core/save.ts';
import { CARS } from '../src/data/cars.ts';
import { RIVALS } from '../src/data/rivals.ts';
import { EVENTS, OPENING_CAPTIONS, SPEAKERS } from '../src/data/story.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const ids = CARS.map((c) => c.id);

check('four events in the specified order', EVENTS.map((e) => e.id).join() === 'warmup,dock,drift,finale', EVENTS.map((e) => e.id).join());
check('weather: dry, rain, snow, rain->snow', EVENTS[0].weather === 'CLEAR' && EVENTS[1].weather === 'RAIN' && EVENTS[2].weather === 'SNOW' && EVENTS[3].weather === 'RAIN' && EVENTS[3].weatherChange?.to === 'SNOW', '');
check('warm-up is forced to the Civic', EVENTS[0].carId === 'civic', '');
check('drift night is a scored drift event', EVENTS[2].kind === 'drift' && (EVENTS[2].driftTarget ?? 0) > 1000, '');
check('every rival and car id exists', EVENTS.every((e) => e.rivals.every((r) => RIVALS.some((x) => x.id === r)) && (!e.carId || ids.includes(e.carId)) && e.unlocks.every((u) => ids.includes(u))), '');
check('finale pits you against Dante and needs the win', EVENTS[3].rivals.includes('dante') && EVENTS[3].needPosition === 1, '');
check('350Z unlocked by event 2, Supra by event 4', EVENTS[1].unlocks.includes('350z') && EVENTS[3].unlocks.includes('supra') && EVENTS.filter((e) => e.unlocks.length).length === 2, '');
check('speakers are all defined, every line has text', EVENTS.every((e) => [...e.before, ...e.afterWin, ...e.afterLose].every((l) => SPEAKERS[l.who] && l.text.length > 3)), '');
check('every event has intro card, before, win and lose lines', EVENTS.every((e) => e.card.length > 10 && e.before.length && e.afterWin.length && e.afterLose.length), '');
check('Mara phones between events', EVENTS.some((e) => e.afterWin.some((l) => l.who === 'mara' && l.phone)), '');
check('Dante taunts before the dock, the finale and after drift night', EVENTS[1].before.some((l) => l.who === 'dante') && EVENTS[3].before.some((l) => l.who === 'dante') && EVENTS[2].afterWin.some((l) => l.who === 'dante'), '');
check('Switch captions from the script, in order, inside 11.5 s', OPENING_CAPTIONS.filter((c) => c.kind === 'switch').map((c) => c.text).join('|') === ['Kestrel Bay. Two a.m.', "The rain doesn't wash anything clean here.", 'Redline runs the Loop. Dante runs Redline.', "And Mara's garage is three days from the bank.", 'So tonight... you drive.'].join('|') && OPENING_CAPTIONS.every((c) => c.at + 0 < 11.5), '');
check('intro cards match the script', EVENTS.map((e) => e.card).join('|') === ["Warm-up lap. Don't embarrass yourself.", 'Wet road, short fuse. Brake earlier than you think.', 'First snow. Sideways is the only way.', 'Last race. Last chance. Bring everything.'].join('|'), '');

// progression
const kv: KeyValueStore = { getItem: () => null, setItem: () => undefined };
const store = new SaveStore(kv, defaultSave('civic', 0xe8e8ee), ids);
const c = store.data.career;
check('fresh career starts at the warm-up', nextEvent(c)?.id === 'warmup' && isUnlocked(c, 'warmup') && !isUnlocked(c, 'dock') && !isDone(c), '');
check('top-2 objective', evaluate(EVENTS[0], 2, 0).passed && !evaluate(EVENTS[0], 3, 0).passed, '');
check('finale needs the win', evaluate(EVENTS[3], 1, 0).passed && !evaluate(EVENTS[3], 2, 0).passed, '');
check('drift objective by score', evaluate(EVENTS[2], 9, 3200).passed && !evaluate(EVENTS[2], 1, 2500).passed, '');
const cash0 = store.data.cash;
const r1 = completeEvent(store.data, EVENTS[0]);
check('first pass pays the bonus once', r1.firstTime && store.data.cash === cash0 + EVENTS[0].bonus && !completeEvent(store.data, EVENTS[0]).firstTime && store.data.cash === cash0 + EVENTS[0].bonus, '');
const r2 = completeEvent(store.data, EVENTS[1]);
check('350Z is given after event 2', r2.newCars.join() === '350z' && store.owns('350z'), '');
check('next unlocks in order, replays allowed', nextEvent(store.data.career)?.id === 'drift' && isUnlocked(store.data.career, 'warmup') && !isUnlocked(store.data.career, 'finale'), '');
completeEvent(store.data, EVENTS[2]);
const r4 = completeEvent(store.data, EVENTS[3]);
check('Supra is given after event 4 and the chapter is done', r4.newCars.join() === 'supra' && store.owns('supra') && isDone(store.data.career), '');
check('drift cash scales with score', driftCash(9000) > driftCash(6000) && driftCash(0) === 0, `${driftCash(6000)}`);

// persistence of the career through the save
const mem = new Map<string, string>();
const kv2: KeyValueStore = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) };
const a = new SaveStore(kv2, defaultSave('civic', 0xe8e8ee), ids);
completeEvent(a.data, EVENTS[0]);
a.data.career.seenIntro = true;
a.commit();
const b = new SaveStore(kv2, defaultSave('civic', 0xe8e8ee), ids);
check('career survives save/load', b.data.career.completed.join() === 'warmup' && b.data.career.seenIntro, '');
mem.set('racers-blood-save-v1', JSON.stringify({ career: { completed: ['warmup', 5, null], seenIntro: 'yes' }, settings: { voice: 'x' } }));
const d = new SaveStore(kv2, defaultSave('civic', 0xe8e8ee), ids);
check('corrupt career fields are sanitised', d.data.career.completed.join() === 'warmup' && !d.data.career.seenIntro && !d.data.settings.voice, '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
