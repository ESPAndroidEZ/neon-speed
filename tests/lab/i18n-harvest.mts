import { RADIO } from '../../src/data/radio';
import { RIVAL_RADIO_2, TRACK_RADIO } from '../../src/data/radio2';
import { BARKS } from '../../src/data/barks';
import { CREW, PREVIOUSLY, TIPS } from '../../src/data/lore';
import { CHAPTER, ENDING, EVENTS, OPENING_CAPTIONS } from '../../src/data/story';
import { ALL_EVENTS, CHAPTER_2, EPILOGUE, EVERY_EVENT } from '../../src/data/story2';
import { CHAPTER_3, EPILOGUE_3 } from '../../src/data/story3';
import { CHAPTER_4, EPILOGUE_4 } from '../../src/data/story4';
import { CUTSCENES } from '../../src/data/cutsceneAll';
import { ADVICE } from '../../src/data/upgradeAdvice';
import { UPGRADES } from '../../src/data/upgrades';
import { FINISHES } from '../../src/data/loadout';
import { LOOKS } from '../../src/core/looks';
import { CARS } from '../../src/data/cars';
import { TRACKS } from '../../src/data/tracks';
import { REAL } from '../../src/data/carReal';

/** Keys whose string values are player-visible prose in the story data. */
const PROSE = new Set(['text', 'title', 'blurb', 'tagline', 'label', 'prompt', 'heading', 'bio', 'role', 'revealed', 'objective', 'summary', 'truth', 'credits', 'card', 'kicker']);

function walk(v: unknown, out: Set<string>, key = ''): void {
  if (typeof v === 'string') {
    if (PROSE.has(key) && /[A-Za-z]/.test(v)) out.add(v);
  } else if (Array.isArray(v)) for (const x of v) walk(x, out, key);
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, out, k);
}

/** Every English string in src/data that the player can read and that goes through tx(). */
import { CITY_TEXT } from '../../src/core/cityRace.ts';
import { DISTRICT_BLURB } from '../../src/data/world/districtText.ts';
export function harvest(): string[] {
  const out = new Set<string>();
  const list = (a: unknown): void => { for (const s of a as string[]) out.add(s); };
  const rec = (r: Record<string, unknown>): void => { for (const v of Object.values(r)) Array.isArray(v) ? list(v) : rec(v as Record<string, unknown>); };
  rec(RADIO as unknown as Record<string, unknown>);
  for (const t of Object.values(TRACK_RADIO)) { list(t.start); list(t.idle); }
  for (const l of Object.values(RIVAL_RADIO_2)) list(l);
  for (const l of Object.values(BARKS)) list(l);
  list(TIPS);
  list(CITY_TEXT);
  list(Object.values(DISTRICT_BLURB));
  walk([PREVIOUSLY, CREW, CHAPTER, ENDING, EVENTS, ALL_EVENTS, EVERY_EVENT, CHAPTER_2, EPILOGUE, CHAPTER_3, EPILOGUE_3, CHAPTER_4, EPILOGUE_4, Object.values(CUTSCENES)], out);
  for (const c of OPENING_CAPTIONS) out.add(c.text);
  for (const a of Object.values(ADVICE)) out.add(a);
  for (const u of UPGRADES) { out.add(u.name); for (const l of u.levels) out.add(l.name); }
  for (const f of Object.values(FINISHES)) out.add(f.name);
  for (const l of Object.values(LOOKS)) out.add(l.name);
  for (const c of CARS) { out.add(c.blurb); if (c.tuning.v2) out.add(c.tuning.v2.spec.character); }
  for (const t of TRACKS) out.add(t.blurb);
  out.add('stock'); // stageSpec level 0
  for (const r of Object.values(REAL)) for (const st of r.stages) out.add(st.parts);
  return [...out];
}

if (process.argv[1]?.endsWith('i18n-harvest.mts')) {
  const all = harvest();
  console.log(all.length, 'strings;', all.reduce((n, s) => n + s.length, 0), 'chars');
}
