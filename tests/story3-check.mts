import { applyChoice, chapter3Complete, chapter3Open, completeEvent, isUnlocked, nextEvent, nextEvent3, playable, storyComplete } from '../src/core/career.ts';
import { defaultSave, SaveStore, type KeyValueStore } from '../src/core/save.ts';
import { CARS } from '../src/data/cars.ts';
import { RIVALS } from '../src/data/rivals.ts';
import { SPEAKERS, type Line } from '../src/data/story.ts';
import { ALL_EVENTS, eventsOf, EVERY_EVENT, findAnyEvent } from '../src/data/story2.ts';
import { EPILOGUE_3, EVENTS_3 } from '../src/data/story3.ts';
import { TRACKS } from '../src/data/tracks/index.ts';
import { GEARBOX, manualNow } from '../src/physics/gearbox.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const mk = (): SaveStore => {
  const mem: Record<string, string> = {};
  const kv: KeyValueStore = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => void (mem[k] = v) };
  return new SaveStore(kv, defaultSave('civic', 0xffffff), CARS.map((x) => x.id));
};
const sets = (e: (typeof EVENTS_3)[number]): Line[][] => [e.before, e.afterWin, e.afterLose, ...(e.loseAlt ?? [])];
const lines = (e: (typeof EVENTS_3)[number]): Line[] => [...sets(e).flat(), ...e.before.flatMap((l) => l.choice?.options.flatMap((o) => o.reply) ?? [])];

check('chapter 3 has five events and the base story is untouched', EVENTS_3.length === 5 && ALL_EVENTS.length === 10 && eventsOf(3).length === 5 && EVERY_EVENT.length === 15, `${EVENTS_3.map((e) => e.id).join(',')}`);
check('ids are unique and chapter 3', new Set(EVERY_EVENT.map((e) => e.id)).size === 15 && EVENTS_3.every((e) => e.chapter === 3));
check('every map exists, drift events sit on drift maps', EVENTS_3.every((e) => { const t = TRACKS.find((x) => x.id === e.trackId); return !!t && (e.kind === 'drift') === (t.type === 'drift'); }), EVENTS_3.map((e) => e.trackId).join(','));
check('every drift target is the map\'s own target (reachable on that map)', EVENTS_3.filter((e) => e.kind === 'drift').every((e) => e.driftTarget === TRACKS.find((x) => x.id === e.trackId)?.driftTarget));
const rivalIds = new Set(RIVALS.map((r) => r.id));
check('rivals and flag rivals all exist, races have rivals', EVENTS_3.every((e) => [...e.rivals, ...Object.values(e.rivalsIf ?? {}).flat()].every((r) => rivalIds.has(r)) && (e.kind === 'drift' || e.rivals.length >= 3)));
check('unlocked cars exist', EVENTS_3.every((e) => e.unlocks.every((id) => CARS.some((c) => c.id === id))), EVENTS_3.flatMap((e) => e.unlocks).join(','));
check('the manual gearbox is forced in exactly one event and findAnyEvent knows it', EVENTS_3.filter((e) => e.manual).length === 1 && findAnyEvent('c3-gear').manual === true && findAnyEvent('c3-final').chapter === 3);
GEARBOX.manual = false; GEARBOX.forced = false;
const a = manualNow(); GEARBOX.forced = true; const b = manualNow(); GEARBOX.forced = false; GEARBOX.manual = true; const c = manualNow(); GEARBOX.manual = false;
check('manual shifting follows the setting OR the event', !a && b && c);

// locking and the walk
const s = mk();
check('chapter 3 is locked on a new career and after chapter 2 until its epilogue is seen', !chapter3Open(s.data.career) && nextEvent3(s.data.career) === null && !isUnlocked(s.data.career, 'c3-lighthouse'));
for (let n = 0, e = nextEvent(s.data.career); e && n < 50; n++, e = nextEvent(s.data.career)) completeEvent(s.data, e);
check('finishing chapter 2 completes the base story (Legend unlock) but chapter 3 waits for the epilogue', storyComplete(s.data.career) && !chapter3Open(s.data.career) && nextEvent3(s.data.career) === null);
s.data.career.epilogueSeen = true;
check('after the epilogue the first chapter 3 event opens, the second is still locked', chapter3Open(s.data.career) && nextEvent3(s.data.career)?.id === 'c3-lighthouse' && isUnlocked(s.data.career, 'c3-lighthouse') && !isUnlocked(s.data.career, 'c3-gear'));
const seen: string[] = [];
for (let n = 0, e = nextEvent3(s.data.career); e && n < 20; n++, e = nextEvent3(s.data.career)) { seen.push(e.id); completeEvent(s.data, e); }
check('chapter 3 is walked in order and ends', seen.join() === EVENTS_3.map((e) => e.id).join() && chapter3Complete(s.data.career), seen.join(','));
check('the final unlocks the M3 and the pass the 535d for the garage', s.owns('m3') && s.owns('e61'));
check('chapter 3 pays its bonuses once', EVENTS_3.every((e) => e.bonus >= 8000) && completeEvent(s.data, EVENTS_3[0]).firstTime === false);

// text quality
const all = EVENTS_3.flatMap(lines);
check('three different lose variants per event', EVENTS_3.every((e) => 1 + (e.loseAlt?.length ?? 0) >= 3 && new Set([e.afterLose, ...(e.loseAlt ?? [])]).size >= 3));
check('every event can be won and lost', EVENTS_3.every((e) => e.afterWin.length > 0 && e.afterLose.length > 0 && e.before.length >= 3));
check('every speaker is known and lines are short', all.every((l) => (l.who === 'narrator' || !!SPEAKERS[l.who]) && l.text.length > 3 && l.text.length < 260 && l.text.split(/\s+/).length <= 30), `${all.length} lines`);
const flags = new Set(['open', 'sponsor', 'public', 'deal']);
check('line conditions only read flags that exist', all.every((l) => (!l.if || flags.has(l.if)) && (!l.unless || flags.has(l.unless))));

// the final choice and both endings
const fin = findAnyEvent('c3-final');
const ch = fin.before.find((l) => l.choice)!.choice!;
const u = mk();
applyChoice(u.data.career, ch.options[0]);
const pub = playable(fin.afterWin, u.data.career).map((l) => l.text).join(' ');
applyChoice(u.data.career, ch.options[1]);
const dealt = playable(fin.afterWin, u.data.career).map((l) => l.text).join(' ');
check('the evidence choice sets one flag at a time and changes the win scene', !u.data.career.flags.public && u.data.career.flags.deal === true && /Cain Vega/.test(pub) && /Some roads you only drive once/.test(dealt) && !/Cain Vega/.test(dealt));
check('both endings exist with credits', ['public', 'deal'].every((k) => { const e = EPILOGUE_3[k as 'public' | 'deal']; return e.title.length > 3 && e.text.length > 40 && e.credits.length === 3; }));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
