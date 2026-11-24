import { activeLine, clipAt, cutDuration, sampleCut, yawToward, type CutSample } from '../src/core/cutsceneTimeline.ts';
import { CUTSCENES, cutsceneFlag } from '../src/data/cutsceneAll.ts';
import { SPEAKERS } from '../src/data/story.ts';
import { EVERY_EVENT } from '../src/data/story2.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const out: CutSample = { px: 0, py: 0, pz: 0, lx: 0, ly: 0, lz: 0, fov: 0, shot: 0 };

// timeline maths on a tiny scene
const shots = [
  { dur: 2, from: [0, 1, 5], to: [0, 1, 3], look: [0, 1, 0], fov: [40, 30], ease: 'linear' },
  { dur: 4, orbit: { center: [0, 0], r: [4, 4], angle: [0, Math.PI / 2], h: [2, 2] }, look: [0, 1, 0], fov: [50, 50], ease: 'linear' },
] as const;
check('total duration is the sum of the takes', cutDuration(shots) === 6);
sampleCut(shots, 0, out);
check('start of take 1: camera and fov at their first values', out.pz === 5 && out.fov === 40 && out.shot === 0);
sampleCut(shots, 1, out);
check('halfway through a move: position and fov are in the middle', out.pz === 4 && out.fov === 35);
sampleCut(shots, 2, out);
check('at the cut the second take starts', out.shot === 1 && Math.abs(out.pz - 4) < 1e-9 && Math.abs(out.px) < 1e-9 && out.py === 2);
sampleCut(shots, 6, out);
check('the end of an orbit lands on its last angle', Math.abs(out.px - 4) < 1e-9 && Math.abs(out.pz) < 1e-9);
let finite = true;
for (let t = -1; t <= 9; t += 0.05) { sampleCut(shots, t, out); if (![out.px, out.py, out.pz, out.lx, out.ly, out.lz, out.fov].every(Number.isFinite) || out.shot < 0 || out.shot > 1) finite = false; }
check('the camera is finite and in range before, during and after the cutscene', finite);

const lines = [{ at: 1, dur: 3, who: 'dante', text: 'a' }, { at: 3, dur: 2, who: 'mara', text: 'b' }];
check('captions: none before, the first, the later one when they overlap, none after', activeLine(lines, 0.5) === null && activeLine(lines, 2)?.text === 'a' && activeLine(lines, 3.5)?.text === 'b' && activeLine(lines, 5) === null);
const actor = { id: 'x', at: [0, 0], face: [0, 0], clip: 'idle', then: [[2, 'talk'], [5, 'idle']] } as const;
check('an actor changes clip on schedule', clipAt(actor, 1) === 'idle' && clipAt(actor, 3) === 'talk' && clipAt(actor, 6) === 'idle');
check('actors face their target (forward is sin h, cos h)', Math.abs(yawToward([-3, 0], [0, 0]) - Math.PI / 2) < 1e-9 && Math.abs(yawToward([0, 3], [0, 0]) - Math.PI) < 1e-9);

// the real data
const all = Object.values(CUTSCENES);
check('there are eleven cutscenes with unique ids and short flag keys', all.length === 11 && new Set(all.map((c) => c.id)).size === 11 && all.every((c) => CUTSCENES[c.id] === c && cutsceneFlag(c.id).length < 30), all.map((c) => c.id).join(','));
check('each runs 12 to 40 seconds with at least 3 takes', all.every((c) => { const d = cutDuration(c.shots); return d >= 12 && d <= 40 && c.shots.length >= 3 && c.shots.every((s) => s.dur > 0); }), all.map((c) => cutDuration(c.shots)).join(','));
check('every caption sits inside the cutscene, has a known speaker and does not overlap another', all.every((c) => { const d = cutDuration(c.shots); const ls = [...c.lines].sort((a, b) => a.at - b.at); return ls.every((l, i) => l.at >= 0 && l.at + l.dur <= d + 0.01 && l.dur >= 1.2 && (l.who === 'narrator' || !!SPEAKERS[l.who as keyof typeof SPEAKERS]) && l.text.length < 200 && (i === 0 || ls[i - 1].at + ls[i - 1].dur <= l.at + 0.01)); }));
check('actors are real characters, stand near the car and are never inside it', all.every((c) => c.actors.length >= 1 && c.actors.every((a) => !!SPEAKERS[a.id as keyof typeof SPEAKERS] && Math.hypot(...a.at) <= 12 && Math.hypot(...a.at) >= 2.2)));
check('cameras stay close to the stage and above the floor', all.every((c) => { for (let t = 0; t <= cutDuration(c.shots); t += 0.25) { sampleCut(c.shots, t, out); if (Math.hypot(out.px, out.pz) > 18 || out.py < 0.3 || out.py > 8) return false; } return true; }));
check('every cutscene with a card has both texts; flags used are real', all.every((c) => !c.card || (c.card.kicker.length > 2 && c.card.title.length > 2)) && all.every((c) => !c.if || ['public', 'deal'].includes(c.if)));
const used = EVERY_EVENT.filter((e) => e.cutBefore);
check('events point at cutscenes that exist: Redline Rising, the Council, the Lighthouse, the Final Loop, the prologue, Chapter 5 opening and showdown', used.map((e) => e.id).join() === 'c2-redline,c2-final,c3-lighthouse,c3-final,c4-yard,c5-key,c5-dawn' && used.every((e) => !!CUTSCENES[e.cutBefore!]), used.map((e) => e.cutBefore).join(','));
check('both Chapter 3 epilogue cutscenes exist and are exclusive', CUTSCENES['ch3-end-public']?.if === 'public' && CUTSCENES['ch3-end-deal']?.if === 'deal');
check('both Chapter 5 epilogue cutscenes exist and are exclusive', CUTSCENES['ch5-end-public']?.if === 'public' && CUTSCENES['ch5-end-deal']?.if === 'deal');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
