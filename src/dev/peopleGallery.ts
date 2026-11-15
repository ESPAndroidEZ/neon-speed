import { Group, type Scene } from 'three';
import { Animator } from '../anim/animator';
import type { ClipName } from '../anim/clips';
import { crowdSpec } from '../anim/crowd';
import type { BuildPerson } from '../types/people';

/**
 * THROWAWAY dev scene (`?people`): 12 people in a row on the showroom stage, each playing a different clip, so a
 * people factory can be judged by eye. Pass the factory to preview (default: world/peopleAdapter; Qwen task 056:
 * world/peopleModels).
 */
const CLIPS: readonly ClipName[] = ['idle', 'walk', 'run', 'lean', 'armsCrossed', 'wave', 'cheer', 'flagUp', 'phone', 'talk', 'idle', 'cheer'];

export function showPeopleGallery(scene: Scene, build: BuildPerson, x: number, z: number): (dt: number) => void {
  const row = new Group();
  row.position.set(x, 0, z);
  scene.add(row);
  const anims = CLIPS.map((clip, i) => {
    const rig = build(crowdSpec(i * 13 + 5));
    rig.root.position.set((i - 5.5) * 1.1, 0, 0);
    row.add(rig.root);
    const a = new Animator(rig, i * 0.3);
    a.play(clip, 0.01);
    return a;
  });
  return (dt) => { for (const a of anims) a.update(dt); };
}
