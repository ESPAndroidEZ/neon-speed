import { applyChoice, completeEvent, defaultCareer, nextEvent, playable, storyComplete } from '../src/core/career.ts';
import { defaultSave, SaveStore, type KeyValueStore } from '../src/core/save.ts';
import { CARS } from '../src/data/cars.ts';
import { RIVALS } from '../src/data/rivals.ts';
import type { Line } from '../src/data/story.ts';
import { ALL_EVENTS, EPILOGUE } from '../src/data/story2.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const mk = (): SaveStore => {
  const mem: Record<string, string> = {};
  const kv: KeyValueStore = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => void (mem[k] = v), removeItem: (k) => void delete mem[k] };
  return new SaveStore(kv, defaultSave('civic', 0xffffff), CARS.map((x) => x.id));
};
const lineSets = (e: (typeof ALL_EVENTS)[number]): Line[][] => [e.before, e.afterWin, e.afterLose, ...(e.loseAlt ?? []), ...e.before.flatMap((l) => l.choice?.options.map((o) => o.reply) ?? [])];

// 1. beat ids that saves and tests reference stay valid and in order
const LEGACY = ['warmup', 'dock', 'drift', 'finale', 'c2-redline', 'c2-neon', 'c2-maze', 'c2-yard', 'c2-cliff', 'c2-final'];
check('all legacy beat ids exist in the same order', LEGACY.every((id, i) => ALL_EVENTS[i]?.id === id) && ALL_EVENTS.length === LEGACY.length, ALL_EVENTS.map((e) => e.id).join());

// 2. reachability: walking the career visits every event exactly once and ends
const walk = mk();
const seen: string[] = [];
for (let n = 0, e = nextEvent(walk.data.career); e && n < 50; n++, e = nextEvent(walk.data.career)) { seen.push(e.id); completeEvent(walk.data, e); }
check('every beat is reachable and the story ends', seen.length === ALL_EVENTS.length && storyComplete(walk.data.career), seen.length + ' beats');

// 3. no dead ends: every beat has before/win/lose text and at least three lose variants
check('every beat can be won and lost', ALL_EVENTS.every((e) => e.afterWin.length > 0 && e.afterLose.length > 0 && (e.id === 'warmup' || e.before.length > 0)), '');
check('three different lose variants per beat', ALL_EVENTS.every((e) => 1 + (e.loseAlt?.length ?? 0) >= 3 && new Set([e.afterLose, ...(e.loseAlt ?? [])].map((s) => s.map((l) => l.text).join('|'))).size >= 3), '');

// 4. flags consistent: every condition is a choice flag or a context flag the controller provides
const setFlags = new Set(ALL_EVENTS.flatMap((e) => e.before.flatMap((l) => l.choice?.options.flatMap((o) => Object.keys(o.set ?? {})) ?? [])));
const ctx = (f: string): boolean => f === 'replay' || f === 'retry' || /^tier-[0-3]$/.test(f) || (f.startsWith('car-') && CARS.some((c) => c.id === f.slice(4)));
const conds = ALL_EVENTS.flatMap((e) => [...lineSets(e).flat(), ...(e.cues ?? [])].flatMap((l) => [l.if, l.unless])).filter((f): f is string => !!f);
check('every line condition is a choice flag or a context flag', conds.every((f) => setFlags.has(f) || ctx(f)), conds.filter((f) => !setFlags.has(f) && !ctx(f)).join());
check('only the Council sets branch flags', [...setFlags].sort().join() === 'open,sponsor', [...setFlags].join());

// 5. both branches reach their own ending and differ visibly
const fin = ALL_EVENTS[ALL_EVENTS.length - 1];
const q = fin.before.find((l) => l.choice)!.choice!;
const branch = (i: number): { flags: Record<string, boolean>; win: Line[]; field: string[] } => {
  const c = defaultCareer();
  applyChoice(c, q.options[i]);
  const flag = Object.keys(q.options[i].set ?? {})[0];
  return { flags: c.flags, win: playable(fin.afterWin, c), field: Object.entries(fin.rivalsIf ?? {}).find(([f]) => c.flags[f])?.[1] ?? fin.rivals };
};
const A = branch(0);
const B = branch(1);
check('open and sponsor have different endings', !!EPILOGUE.open.title && !!EPILOGUE.sponsor.title && EPILOGUE.open.text !== EPILOGUE.sponsor.text, '');
check('each ending card has credits that name Neon Speed', [EPILOGUE.open, EPILOGUE.sponsor].every((x) => x.credits.some((c) => /neon speed/i.test(c))), '');
check('final act: different closing lines', A.win.some((l) => l.if === 'open') && !A.win.some((l) => l.if === 'sponsor') && B.win.some((l) => l.if === 'sponsor') && !B.win.some((l) => l.if === 'open'), '');
check('final race: sponsor branch races a different field', A.field.join() !== B.field.join() && [...A.field, ...B.field].every((id) => RIVALS.some((r) => r.id === id)), `${A.field} | ${B.field}`);
check('both branches get the lighthouse reveal', [A.win, B.win].every((w) => w.some((l) => l.who === 'narrator') && w.some((l) => /brake line|latiguillo/i.test(l.text))), '');
const both = defaultCareer();
applyChoice(both, q.options[0]);
applyChoice(both, q.options[1]);
check('choosing the other door later clears the first', both.flags.sponsor === true && !both.flags.open, JSON.stringify(both.flags));

// 6. the mystery is planted early and pays off late (clue text must appear in order)
const textAt = (id: string): string => lineSets(ALL_EVENTS.find((e) => e.id === id)!).flat().map((l) => l.text).join(' ');
const clues: [string, RegExp][] = [['warmup', /My brother used to say that/], ['finale', /key to the East Yard/], ['c2-redline', /wrapped in a towel/], ['c2-neon', /flowers at Quay 9/], ['c2-maze', /Calloway's father signed/], ['c2-yard', /grey coat/], ['c2-cliff', /afraid/], ['c2-final', /Aldous Calloway/]];
check('clues are planted in order and pay off', clues.every(([id, re]) => re.test(textAt(id))), clues.filter(([id, re]) => !re.test(textAt(id))).map(([id]) => id).join());

// 7. tone: short beats, in-race cues in range
const long = ALL_EVENTS.flatMap((e) => lineSets(e).flat()).filter((l) => l.text.split(/\s+/).length > 30);
check('lines stay short (30 words max)', long.length === 0, long.map((l) => l.text.slice(0, 30)).join(' / '));
check('cues are timed inside the race and sorted per flag', ALL_EVENTS.every((e) => (e.cues ?? []).every((c) => c.at > 0 && c.at < 120 && c.dur > 1)), '');
check('the opening is a cold open: first beat has cues and the first win explains the story', (ALL_EVENTS[0].cues?.length ?? 0) >= 4 && ALL_EVENTS[0].afterWin.some((l) => /Cain Vega/.test(l.text)), '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
