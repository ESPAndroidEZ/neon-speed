import type { Group } from 'three';
import { createRng } from '../core/rng';
import type { BuildPerson, PersonSpec } from '../types/people';
import { Animator } from './animator';
import type { ClipName } from './clips';

/**
 * Spectators: a pool of rigs (shared geometry and materials come from the people factory), placed from a list of
 * spots, each with a seeded look, clip and phase so a crowd never moves in sync. Only people within ANIMATE_RANGE of
 * the camera animate; further away they hold their last pose (frozen LOD) and beyond HIDE_RANGE they are hidden.
 * Heads turn toward the player car when it is close. No allocation in update().
 */
const ANIMATE_RANGE = 40;
const HIDE_RANGE = 160;
const SKINS = [0x5a3a26, 0x8a5a3c, 0xb9805a, 0xd9a37c, 0xe8c4a0, 0x3e281c];
const CLOTH = [0x1a1c24, 0x2b3446, 0x3a2260, 0x14363a, 0x4a1a22, 0x2a2a30, 0x5a4a32, 0xd0d4dc, 0xff2a9d, 0x18d8ff];
const HAIR = ['short', 'long', 'spiky', 'bun', 'slick', 'bald', 'curly', 'mohawk'] as const;
const CHEERS: readonly ClipName[] = ['cheer', 'cheer', 'wave', 'idle', 'armsCrossed', 'phone', 'talk'];

export interface Spot { x: number; y: number; z: number; facing: number }

export function crowdSpec(seed: number): PersonSpec {
  const r = createRng(seed * 7919 + 1);
  const pick = <T>(a: readonly T[]): T => a[Math.floor(r() * a.length) % a.length];
  return {
    skin: pick(SKINS), hair: pick([0x14110a, 0x2a1c14, 0x5a3a20, 0x8a6a3a, 0x555a62, 0x7a2fd6]), hairStyle: pick(HAIR),
    outfit: { jacket: pick(CLOTH), pants: pick(CLOTH.slice(0, 7)), shoes: pick([0x14141a, 0xe8e8ee, 0x3a2a1a]) },
    accessories: { cap: r() < 0.25, sunglasses: r() < 0.2, hood: r() < 0.15 },
    body: pick(['slim', 'average', 'average', 'broad'] as const), height: 1.58 + r() * 0.32, seed,
  };
}

interface Member { anim: Animator; root: Group; x: number; z: number; facing: number }

export class Crowd {
  private readonly pool: Member[] = [];
  private active = 0;
  private readonly parent: Group;
  private readonly build: BuildPerson;

  constructor(parent: Group, build: BuildPerson) {
    this.parent = parent;
    this.build = build;
  }

  /** Place one spectator per spot (reusing pooled rigs). `seed` makes the same track get the same crowd. */
  place(spots: readonly Spot[], seed: number): void {
    const r = createRng(seed);
    while (this.pool.length < spots.length) {
      const rig = this.build(crowdSpec(seed * 1000 + this.pool.length));
      this.parent.add(rig.root);
      this.pool.push({ anim: new Animator(rig, 0), root: rig.root, x: 0, z: 0, facing: 0 });
    }
    spots.forEach((s, i) => {
      const m = this.pool[i];
      m.x = s.x; m.z = s.z; m.facing = s.facing;
      m.root.position.set(s.x, s.y, s.z);
      m.root.rotation.y = s.facing;
      m.root.visible = true;
      m.anim.phase = r() * 4;
      m.anim.play(CHEERS[Math.floor(r() * CHEERS.length)], 0.01);
      m.anim.update(0.016);
    });
    for (let i = spots.length; i < this.pool.length; i++) this.pool[i].root.visible = false;
    this.active = spots.length;
  }

  /** Everyone cheers (or calms down) at once, e.g. at the start or when the player passes. */
  mood(clip: ClipName): void {
    for (let i = 0; i < this.active; i++) this.pool[i].anim.play(clip, 0.25);
  }

  /** camX/Z = camera, carX/Z = player car (heads follow it). Returns how many animated this frame. */
  update(dt: number, camX: number, camZ: number, carX: number, carZ: number): number {
    let n = 0;
    for (let i = 0; i < this.active; i++) {
      const m = this.pool[i];
      const d = Math.hypot(m.x - camX, m.z - camZ);
      m.root.visible = d < HIDE_RANGE;
      if (d > ANIMATE_RANGE) continue; // frozen LOD
      const dx = carX - m.x, dz = carZ - m.z;
      const near = dx * dx + dz * dz < 900;
      let yaw = Math.atan2(dx, dz) - m.facing;
      yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      m.anim.update(dt, near ? yaw : null, 0);
      n++;
    }
    return n;
  }

  get count(): number { return this.active; }

  dispose(): void {
    for (const m of this.pool) m.root.removeFromParent();
    this.pool.length = 0;
    this.active = 0;
  }
}
