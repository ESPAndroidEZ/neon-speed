// People contract + animation: joints, clip validity, NaN-free sampling/blending, determinism, crowd frame-time bench.
import { Group } from 'three';
import { JOINTS, type PersonSpec } from '../src/types/people.ts';
import { buildPerson } from '../src/world/peopleAdapter.ts';
import { CLIPS } from '../src/anim/clips.ts';
import { Animator, blendPose, sampleClip } from '../src/anim/animator.ts';
import { Crowd, crowdSpec } from '../src/anim/crowd.ts';
let failed = 0;
const check = (n: string, ok: boolean, i: string): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
const specs: PersonSpec[] = [];
for (const body of ['slim', 'average', 'broad'] as const) for (const hairStyle of ['short', 'long', 'spiky', 'bun', 'slick', 'bald', 'mohawk', 'curly'] as const)
  specs.push({ skin: 0xc58b66, hair: 0x222222, hairStyle, outfit: { jacket: 0x2b3446, pants: 0x1a1c24, shoes: 0x14141a }, accessories: { cap: hairStyle === 'short', sunglasses: body === 'slim', hood: hairStyle === 'bun' }, body, seed: specs.length });
const missing = specs.flatMap((s) => { const r = buildPerson(s); return JOINTS.filter((j) => !r.joints[j] || r.joints[j].name !== j); });
check(`all ${JOINTS.length} joints exist for every PersonSpec (${specs.length} variants)`, missing.length === 0, missing.join(',') || 'ok');
const r0 = buildPerson(specs[0]);
check('pivots: rotating foreArmL moves the left hand', (() => { r0.root.updateMatrixWorld(true); const a = r0.joints.handL.getWorldPosition(r0.joints.handL.position.clone()); r0.joints.foreArmL.rotation.x = -1.5; r0.root.updateMatrixWorld(true); const b = r0.joints.handL.getWorldPosition(a.clone()); return a.distanceTo(b) > 0.15; })(), '');
const bad = Object.values(CLIPS).flatMap((c) => c.keys.flatMap((k) => Object.keys(k.pose).filter((j) => !(JOINTS as readonly string[]).includes(j)).map((j) => `${c.name}:${j}`)));
check('every clip only references valid joints', bad.length === 0, bad.join(',') || `${Object.keys(CLIPS).length} clips`);
const keysOk = Object.values(CLIPS).every((c) => c.keys[0].t === 0 && Math.abs(c.keys[c.keys.length - 1].t - c.duration) < 1e-6 && c.keys.every((k, i) => i === 0 || k.t > c.keys[i - 1].t));
check('clip keys start at 0, end at the duration, strictly increasing', keysOk, '');
const a = new Float32Array(JOINTS.length * 3 + 1), b = new Float32Array(a.length), o = new Float32Array(a.length);
let nan = 0;
const cl = Object.values(CLIPS);
for (let i = 0; i < 2000; i++) {
  const t = (i * 0.0137) - 3;
  sampleClip(cl[i % cl.length], t, a); sampleClip(cl[(i * 7) % cl.length], t * 1.3, b);
  blendPose(a, b, (i % 13) / 12, o);
  for (const v of o) if (!Number.isFinite(v)) nan++;
}
sampleClip(CLIPS.walk, NaN, a); blendPose(a, b, NaN, o);
check('sampling and blending are NaN-free (2000 random samples, NaN inputs)', nan === 0 && [...o].every(Number.isFinite), `${nan}`);
check('same seed, same person', JSON.stringify(crowdSpec(42)) === JSON.stringify(crowdSpec(42)) && JSON.stringify(crowdSpec(42)) !== JSON.stringify(crowdSpec(43)), '');
const an = new Animator(buildPerson(specs[3]));
an.play('flagDrop', 0.05);
for (let i = 0; i < 60; i++) an.update(1 / 60, 0.4, 0.1);
check('one-shot clips finish and hold (flag drop)', an.done && an.current === 'flagDrop', '');
const parent = new Group(), crowd = new Crowd(parent, buildPerson);
crowd.place(Array.from({ length: 200 }, (_, i) => ({ x: (i % 20) * 1.5, y: 0, z: Math.floor(i / 20) * 1.5, facing: 0 })), 7);
let animated = 0;
const t0 = performance.now();
for (let f = 0; f < 300; f++) { animated = crowd.update(1 / 60, 15, 7, 15, 10); parent.updateMatrixWorld(true); }
const ms = (performance.now() - t0) / 300;
check('200 spectators all animating fit the 60 fps budget (animation + matrices < 8 ms per frame)', animated === 200 && ms < 8, `${ms.toFixed(2)} ms/frame, ${animated} animated`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
