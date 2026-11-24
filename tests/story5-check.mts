import { chapter4Complete, chapter5Complete, chapter5Open, completeEvent, isUnlocked, nextEvent, nextEvent3, nextEvent4, nextEvent5 } from '../src/core/career.ts';
import { defaultSave, SaveStore, type KeyValueStore } from '../src/core/save.ts';
import { CARS } from '../src/data/cars.ts';
import { RIVALS } from '../src/data/rivals.ts';
import { SPEAKERS } from '../src/data/story.ts';
import { EVERY_EVENT, eventsOf } from '../src/data/story2.ts';
import { EVENTS_5, EPILOGUE_5 } from '../src/data/story5.ts';
import { RECAPS } from '../src/data/recaps.ts';
import { CUTSCENES } from '../src/data/cutsceneAll.ts';
import { TRACKS } from '../src/data/tracks/index.ts';
import { ES_CONTENT } from '../src/i18n/esContent.ts';
import { chapterEnd } from '../src/game/chapterEnd.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
const mem: Record<string, string> = {};
const kv: KeyValueStore = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => void (mem[k] = v) };
const s = new SaveStore(kv, defaultSave('civic', 0xffffff), CARS.map((x) => x.id));

check('five events, unique ids, chapter 5', EVENTS_5.length === 5 && eventsOf(5).length === 5 && new Set(EVERY_EVENT.map((e) => e.id)).size === EVERY_EVENT.length);
check('five different maps', new Set(EVENTS_5.map((e) => e.trackId)).size === 5, EVENTS_5.map((e) => e.trackId).join(','));
check('maps exist, drift sits on drift maps and uses its target', EVENTS_5.every((e) => { const t = TRACKS.find((x) => x.id === e.trackId); return !!t && (e.kind === 'drift') === (t.type === 'drift') && (e.kind !== 'drift' || e.driftTarget === t.driftTarget); }));
const ids = new Set(RIVALS.map((r) => r.id));
check('rivals and flag rivals exist, races have rivals', EVENTS_5.every((e) => [...e.rivals, ...Object.values(e.rivalsIf ?? {}).flat()].every((r) => ids.has(r)) && (e.kind === 'drift' || e.rivals.length >= 2)));
const all = EVENTS_5.flatMap((e) => [...e.before, ...e.afterWin, ...e.afterLose, ...(e.loseAlt ?? []).flat()]);
check('speakers known, lines short', all.every((l) => !!SPEAKERS[l.who] && l.text.length < 260 && l.text.length > 3));
check('line conditions only read the chapter 3 flags', all.every((l) => (!l.if || ['public', 'deal'].includes(l.if)) && (!l.unless || ['public', 'deal'].includes(l.unless))));
check('three lose variants per event, a win and an opening each', EVENTS_5.every((e) => 1 + (e.loseAlt?.length ?? 0) >= 3 && e.afterWin.length > 0 && e.before.length >= 3));
check('the final must be won and the cutscenes exist', EVENTS_5[4].needPosition === 1 && EVENTS_5.every((e) => !e.cutBefore || !!CUTSCENES[e.cutBefore]) && EVENTS_5[0].cutBefore === 'ch5-open' && EVENTS_5[4].cutBefore === 'ch5-final');
const texts = [...EVENTS_5.flatMap((e) => [e.title, e.blurb, e.card, ...(e.cues ?? []).map((c) => c.text)]), ...all.map((l) => l.text), ...Object.values(EPILOGUE_5).flatMap((c) => [c.title, c.text, ...c.credits.slice(1)]), ...Object.values(RECAPS).flat().flatMap((c) => [c.heading, c.text])];
const missing = texts.filter((x) => !ES_CONTENT[x]);
check('every chapter 5 text has Spanish', missing.length === 0, missing.slice(0, 2).join(' | '));
check('recaps exist for the first event of chapters 4 and 5', !!RECAPS['c4-yard'] && !!RECAPS['c5-key'] && EVERY_EVENT.some((e) => e.id === 'c5-key'));

check('locked on a new career', !chapter5Open(s.data.career) && nextEvent5(s.data.career) === null && !isUnlocked(s.data.career, 'c5-key'));
for (let n = 0, e = nextEvent(s.data.career); e && n < 50; n++, e = nextEvent(s.data.career)) completeEvent(s.data, e);
s.data.career.epilogueSeen = true;
for (let n = 0, e = nextEvent3(s.data.career); e && n < 20; n++, e = nextEvent3(s.data.career)) completeEvent(s.data, e);
s.data.career.flags.c3Seen = true;
for (let n = 0, e = nextEvent4(s.data.career); e && n < 20; n++, e = nextEvent4(s.data.career)) completeEvent(s.data, e);
check('chapter 4 done alone does not open chapter 5', chapter4Complete(s.data.career) && !chapter5Open(s.data.career));
s.data.career.flags.c4Seen = true;
check('after the chapter 4 ending the first chapter 5 event opens, the second waits', nextEvent5(s.data.career)?.id === 'c5-key' && isUnlocked(s.data.career, 'c5-key') && !isUnlocked(s.data.career, 'c5-wren'));
const seen: string[] = [];
for (let n = 0, e = nextEvent5(s.data.career); e && n < 20; n++, e = nextEvent5(s.data.career)) { seen.push(e.id); completeEvent(s.data, e); }
check('walked in order and ends', seen.join() === EVENTS_5.map((e) => e.id).join() && chapter5Complete(s.data.career));

// what plays after the last event of a chapter
const last = (id: string) => EVERY_EVENT.find((e) => e.id === id)!;
const c = s.data.career;
check('the chapter 5 ending plays once and follows the chapter 3 choice', chapterEnd(last('c5-dawn'), c)?.cut === 'ch5-end-public' && (c.flags.deal = true) && chapterEnd(last('c5-dawn'), c)?.cut === 'ch5-end-deal' && (c.flags.c5Seen = true) && chapterEnd(last('c5-dawn'), c) === null);
check('an unfinished chapter has no ending', chapterEnd(last('c5-key'), { ...c, completed: [], flags: {} }) === null && chapterEnd(last('c4-yard'), { ...c, completed: [], flags: {} }) === null);
console.log(failed ? `FAILED ${failed}` : 'ALL PASS');
process.exit(failed ? 1 : 0);
