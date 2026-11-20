import { Group, type Scene } from 'three';
import { Animator } from '../anim/animator';
import type { ClipName } from '../anim/clips';
import { Crowd, type Spot } from '../anim/crowd';
import { lookOf } from '../data/characters';
import { yawToward, type CutActor } from '../core/cutsceneTimeline';
import type { PersonRig } from '../types/people';
import { buildPerson, lookToSpec } from '../world/peopleAdapter';
import { STAGE } from '../world/stage';
import { DIALOGUE } from '../ui/dialogue';
import type { Game } from './game';

/**
 * The people in the world, all on the people contract (src/types/people) and the procedural animator (src/anim):
 * the character and a mechanic beside the showroom car (menus, garage, cutscenes; `speaking()` drives talk gestures),
 * the rivals leaning on their cars at the grid, the starter who raises the flags in the countdown and drops them at
 * GO, and spectators along every track (pooled crowd, animated within 40 m). Swapping the factory for Qwen's
 * peopleModels.buildPerson changes the looks, not this file.
 */
interface Actor { rig: PersonRig; anim: Animator }

export class Cast {
  private readonly scene: Scene;
  private readonly cache = new Map<string, Actor>();
  private readonly shown = new Set<Actor>();
  private readonly crowdRoot = new Group();
  private readonly crowd = new Crowd(this.crowdRoot, buildPerson);
  private gridKey: unknown = null;
  private crowdKey: unknown = null;
  private starterT = -1;
  private talk = 0;
  /** Cutscene mode: actors keep the clips the cutscene gives them (no menu idle/talk switching). */
  scripted = false;

  constructor(scene: Scene) {
    this.scene = scene;
    scene.add(this.crowdRoot);
  }

  private get(id: string): Actor {
    let a = this.cache.get(id);
    if (!a) {
      const rig = buildPerson(id === 'starter' ? { skin: 0xd9a37c, hair: 0x14110a, hairStyle: 'long', outfit: { jacket: 0xe8e8ee, pants: 0x14141a, shoes: 0x14141a }, accessories: { sunglasses: true }, body: 'slim', height: 1.72, seed: 7 }
        : id === 'mechanic' ? { skin: 0x8a5a3c, hair: 0x14110a, hairStyle: 'short', outfit: { jacket: 0x2b3446, pants: 0x2b3446, shoes: 0x3a2a1a }, accessories: { cap: true }, body: 'broad', seed: 11 }
          : lookToSpec(lookOf(id), id.length * 97));
      a = { rig, anim: new Animator(rig, (id.length % 7) * 0.37) };
      this.cache.set(id, a);
    }
    return a;
  }

  private place(id: string, x: number, z: number, yaw: number, clip: ClipName, y = 0): Actor {
    const a = this.get(id);
    a.anim.play(clip, 0.2);
    a.rig.root.position.set(x, y, z);
    a.rig.root.rotation.y = yaw;
    if (!this.shown.has(a)) {
      this.scene.add(a.rig.root);
      this.shown.add(a);
    }
    return a;
  }

  hideAll(): void {
    for (const a of this.shown) this.scene.remove(a.rig.root);
    this.shown.clear();
    this.gridKey = null;
    this.starterT = -1;
  }

  /** Put a cutscene's actors around the stage (positions are relative to the stage centre). */
  setScene(list: readonly CutActor[]): void {
    this.hideAll();
    for (const a of list) this.place(a.id, STAGE.x + a.at[0], STAGE.z + a.at[1], yawToward(a.at, a.face), a.clip as ClipName);
  }

  setClip(id: string, clip: string): void {
    this.get(id).anim.play(clip as ClipName, 0.35);
  }

  /** Dialogue on screen: 0 = silent, 1 = talking (the showroom character gestures). */
  speaking(level: number): void {
    this.talk = level;
  }

  /** The character and a mechanic beside the showroom car (menus, garage, cutscenes). */
  stage(id: string | null): void {
    this.hideAll();
    if (!id) return;
    this.place(id, STAGE.x - 3.1, STAGE.z + 1.2, Math.atan2(3.1, -1.2) + 0.1, id === 'mara' ? 'phone' : 'idle');
    this.place('mechanic', STAGE.x + 2.6, STAGE.z - 1.6, Math.atan2(-2.6, 1.6), 'armsCrossed');
  }

  update(game: Game, dt: number): void {
    const menu = game.state === 'MENU';
    this.crowdRoot.visible = !menu;
    if (menu && this.scripted) {
      for (const a of this.shown) a.anim.update(dt);
      return;
    }
    if (menu) {
      this.talk = DIALOGUE.active ? 1 : 0; // the speaker gestures while a line is on screen
      for (const a of this.shown) {
        if (a.anim.current !== 'phone' && a.rig.spec.seed !== 11) a.anim.play(this.talk > 0.05 ? 'talk' : 'idle', 0.3);
        a.anim.talk = this.talk;
        a.anim.update(dt);
      }
      return;
    }
    const rm = game.rm;
    if (this.crowdKey !== rm.track) this.placeCrowd(game);
    const p = game.player.car.state, cam = game.chase.camera.position;
    this.crowd.update(dt, cam.x, cam.z, p.position.x, p.position.z);
    const grid = rm.phase === 'GRID' || rm.phase === 'COUNTDOWN';
    if (grid && this.gridKey !== rm) this.placeGrid(game);
    if (!grid && this.gridKey) {
      if (this.starterT < 0) { this.starterT = 0; this.get('starter').anim.play('flagDrop', 0.05); this.crowd.mood('cheer'); }
      this.starterT += dt;
      if (this.starterT > 2.2) this.hideAll();
    }
    for (const a of this.shown) a.anim.update(dt);
  }

  private placeGrid(game: Game): void {
    this.hideAll();
    this.gridKey = game.rm;
    let lead = game.rm.racers[0].car.state;
    game.rm.racers.forEach((r) => {
      const s = r.car.state;
      const fx = Math.sin(s.heading), fz = Math.cos(s.heading);
      if (fx * (s.position.x - lead.position.x) + fz * (s.position.z - lead.position.z) > 0) lead = s;
      if (r.isPlayer) return;
      // car space: +X is left, so the driver's door side is the left flank
      this.place(r.agent?.id ?? r.id, s.position.x + fz * 2.1, s.position.z - fx * 2.1, s.heading - Math.PI / 2 + 0.25, 'lean');
    });
    const fx = Math.sin(lead.heading), fz = Math.cos(lead.heading);
    this.place('starter', lead.position.x + fx * 9 + fz * 4.5, lead.position.z + fz * 9 - fx * 4.5, lead.heading + Math.PI, 'flagUp', lead.position.y);
  }

  /** Spectators along both verges, behind the barrier, facing the road (about one every 27 m per side). */
  private placeCrowd(game: Game): void {
    const tr = game.rm.track;
    this.crowdKey = tr;
    const s = tr.samples, spots: Spot[] = [];
    for (let i = 0; i < s.length && spots.length < 140; i += 9) {
      if (tr.zones[i] === 'tunnel' || tr.zones[i] === 'bridge') continue;
      const t = s[i].tangent, off = s[i].width / 2 + 4;
      for (const side of [1, -1]) {
        if ((i / 9 + (side > 0 ? 0 : 1)) % 2 === 0) continue;
        const x = s[i].position.x + t.z * off * side, z = s[i].position.z - t.x * off * side;
        spots.push({ x, y: tr.heights[i] ?? 0, z, facing: Math.atan2(s[i].position.x - x, s[i].position.z - z) });
      }
    }
    this.crowd.place(spots, s.length);
  }
}
