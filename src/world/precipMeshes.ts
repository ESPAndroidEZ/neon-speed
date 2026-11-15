import { AdditiveBlending, BufferAttribute, Color, DoubleSide, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, NormalBlending, PlaneGeometry, ShaderMaterial, Vector2, Vector3, Vector4, type Blending, type IUniform } from 'three';
import { DROPS_FRAG, DROPS_VERT, SPLASH_FRAG, SPLASH_VERT, STREAK_FRAG, STREAK_VERT } from './precipShaders';

type U = Record<string, IUniform>;

/** Deterministic 0..1 sequence (mulberry32): the same seeds every run, so screenshots and tests are stable. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One quad per instance; `y0` = bottom row (0 for streaks: head..tail, -1 for centred splash quads). */
function quadPool(n: number, y0: number, seed: number): InstancedBufferGeometry {
  const g = new InstancedBufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array([-1, y0, 0, 1, y0, 0, -1, 1, 0, 1, 1, 0]), 3));
  g.setIndex([0, 1, 2, 2, 1, 3]);
  const r = rng(seed);
  const s = new Float32Array(n * 4);
  for (let i = 0; i < s.length; i++) s[i] = r();
  g.setAttribute('seed', new InstancedBufferAttribute(s, 4));
  g.instanceCount = n;
  return g;
}

const cover = (): U => ({ uCar: { value: new Vector4(0, -1e4, 0, 0) }, uTunA: { value: new Vector4() }, uTunB: { value: new Vector4() } });

function material(vert: string, frag: string, uniforms: U, blending: Blending): ShaderMaterial {
  return new ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, transparent: true, depthWrite: false, depthTest: true, blending, side: DoubleSide }); // quads flip with the streak direction
}

export interface StreakLook {
  color: number;
  alpha: number;
  width: number;
  exposure: number;
  minLen: number;
  maxLen: number;
  turb: number;
  round: number;
  additive: boolean;
}

/** Rain or snow: `n` instanced quads (fixed pool) in a box `bx, by, bz`. */
export function makeStreaks(n: number, bx: number, by: number, bz: number, look: StreakLook, seed: number): Mesh<InstancedBufferGeometry, ShaderMaterial> {
  const u: U = {
    ...cover(),
    uCentre: { value: new Vector3() }, uBox: { value: new Vector3(bx, by, bz) }, uDrift: { value: new Vector3() },
    uCamPos: { value: new Vector3() }, uRel: { value: new Vector3(0, -1, 0) }, uTime: { value: 0 },
    uWidth: { value: look.width }, uExposure: { value: look.exposure }, uMinLen: { value: look.minLen }, uMaxLen: { value: look.maxLen },
    uDensity: { value: 0 }, uTurb: { value: look.turb }, uRound: { value: look.round }, uPix: { value: 0.0016 },
    uEdge: { value: Math.min(bx, by, bz) * 0.18 }, uFar: { value: Math.max(bx, bz) * 0.62 },
    uColor: { value: new Color(look.color) }, uAlpha: { value: look.alpha },
  };
  const m = new Mesh(quadPool(n, 0, seed), material(STREAK_VERT, STREAK_FRAG, u, look.additive ? AdditiveBlending : NormalBlending));
  m.frustumCulled = false;
  m.visible = false;
  m.renderOrder = 5;
  return m;
}

/** Splash rings on the road plane: `n` instanced quads in a horizontal box `bx` x `bz`. */
export function makeSplashes(n: number, bx: number, bz: number): Mesh<InstancedBufferGeometry, ShaderMaterial> {
  const u: U = {
    ...cover(),
    uCentre: { value: new Vector3() }, uBox: { value: new Vector2(bx, bz) }, uClock: { value: 0 }, uDensity: { value: 0 },
    uCamPos: { value: new Vector3() }, uRoad: { value: new Vector4() }, uRoadT: { value: new Vector3(0, 1, 0) },
    uColor: { value: new Color(0xb8c8e0) }, uAlpha: { value: 0.25 },
  };
  const m = new Mesh(quadPool(n, -1, 977), material(SPLASH_VERT, SPLASH_FRAG, u, AdditiveBlending));
  m.frustumCulled = false;
  m.visible = false;
  m.renderOrder = 4;
  return m;
}

/** Full-screen windscreen droplets (clip space; drawn last, no depth). */
export function makeDrops(): Mesh<PlaneGeometry, ShaderMaterial> {
  const u: U = { uTime: { value: 0 }, uAlpha: { value: 0 }, uAspect: { value: 16 / 9 } };
  const mat = material(DROPS_VERT, DROPS_FRAG, u, NormalBlending);
  mat.depthTest = false;
  const m = new Mesh(new PlaneGeometry(2, 2), mat);
  m.frustumCulled = false;
  m.visible = false;
  m.renderOrder = 999;
  return m;
}
