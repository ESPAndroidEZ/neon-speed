import type { Group, Object3D } from 'three';

/**
 * PEOPLE CONTRACT (2026-11-15). Every person in the game (story cast, starter, spectators, mechanics) is built by
 * `buildPerson(spec)` and animated by src/anim through these named joints. Changing this file is an architecture
 * change: log it in docs/handoff.md. Implementations: src/world/peopleAdapter.ts (default) and, from Qwen,
 * src/world/peopleModels.ts. Space: +Y up, +Z forward (the person faces +Z), +X is the person's LEFT, metres.
 */
export type JointName =
  | 'hips' | 'spine' | 'chest' | 'neck' | 'head'
  | 'upperArmL' | 'foreArmL' | 'handL' | 'upperArmR' | 'foreArmR' | 'handR'
  | 'thighL' | 'shinL' | 'footL' | 'thighR' | 'shinR' | 'footR';

/** Every joint, parents before children (safe build order). */
export const JOINTS: readonly JointName[] = ['hips', 'spine', 'chest', 'neck', 'head', 'upperArmL', 'foreArmL', 'handL', 'upperArmR', 'foreArmR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];

/** Parent of each joint ('root' = the rig root group). */
export const PARENT: Readonly<Record<JointName, JointName | 'root'>> = {
  hips: 'root', spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck',
  upperArmL: 'chest', foreArmL: 'upperArmL', handL: 'foreArmL', upperArmR: 'chest', foreArmR: 'upperArmR', handR: 'foreArmR',
  thighL: 'hips', shinL: 'thighL', footL: 'shinL', thighR: 'hips', shinR: 'thighR', footR: 'shinR',
};

/**
 * Rest offset of each joint from its parent for a 1.75 m adult (metres). Pivots sit AT the joint, so rotating
 * `foreArmL` bends the elbow. Hip height 0.95; leg 0.05 + 0.44 + 0.43 + 0.03 ankle = 0.95; head top = 1.75.
 */
export const REST: Readonly<Record<JointName, readonly [number, number, number]>> = {
  hips: [0, 0.95, 0], spine: [0, 0.1, 0], chest: [0, 0.2, 0], neck: [0, 0.2, 0], head: [0, 0.1, 0],
  upperArmL: [0.19, 0.17, 0], foreArmL: [0, -0.29, 0], handL: [0, -0.26, 0],
  upperArmR: [-0.19, 0.17, 0], foreArmR: [0, -0.29, 0], handR: [0, -0.26, 0],
  thighL: [0.09, -0.05, 0], shinL: [0, -0.44, 0], footL: [0, -0.43, 0],
  thighR: [-0.09, -0.05, 0], shinR: [0, -0.44, 0], footR: [0, -0.43, 0],
};

export type BodyVariant = 'slim' | 'average' | 'broad';
export type PeopleHair = 'short' | 'long' | 'spiky' | 'bun' | 'slick' | 'bald' | 'mohawk' | 'curly';

export interface PersonSpec {
  /** 0xRRGGBB. */
  skin: number;
  hair: number;
  hairStyle: PeopleHair;
  outfit: { jacket: number; pants: number; shoes: number };
  accessories: { cap?: boolean; sunglasses?: boolean; hood?: boolean };
  body: BodyVariant;
  /** Overall height in metres (default 1.75): the rig scales uniformly. */
  height?: number;
  /** Same seed = same person (small variations an implementation picks). */
  seed: number;
}

export interface PersonRig {
  readonly root: Group;
  readonly joints: Record<JointName, Object3D>;
  readonly spec: PersonSpec;
  /** Free GPU resources the rig owns (shared geometry/material caches are NOT freed). */
  dispose(): void;
}

/** The factory every implementation exports. */
export type BuildPerson = (spec: PersonSpec) => PersonRig;
