import { BackSide, BoxGeometry, Color, DoubleSide, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, ShaderMaterial, SphereGeometry } from 'three';
import { createRng } from '../core/rng';
import type { Look } from '../core/looks';
import type { Palette } from '../data/palettes';
import { markSky } from './shadowRig';

const VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = `
varying vec3 vDir;
uniform vec3 top, horizon, moonDir, moonCol;
uniform float stars, clouds, moon, time;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 c = mix(horizon, top, pow(smoothstep(0.0, 0.75, h), 0.65));
  c += horizon * 0.35 * exp(-abs(h) * 14.0); // horizon glow band
  // stars: hashed cells, twinkle, fade toward the horizon
  vec2 sp = d.xz / (d.y + 0.25) * 170.0;
  vec2 cell = floor(sp);
  float r = h21(cell);
  float star = step(0.9965, r) * smoothstep(0.1, 0.4, h) * (0.6 + 0.4 * sin(time * 2.0 + r * 60.0));
  c += vec3(0.8, 0.9, 1.0) * star * stars * 1.6;
  // two cloud layers lit from below by the city glow
  vec2 cp = d.xz / (d.y + 0.35);
  float cl = fbm(cp * 1.3 + vec2(time * 0.004, 0.0)) * 0.65 + fbm(cp * 3.1 - vec2(time * 0.007, 0.0)) * 0.35;
  float cov = smoothstep(0.55 - clouds * 0.3, 0.9, cl) * smoothstep(0.02, 0.3, h) * clouds;
  c = mix(c, mix(horizon * 0.9, top * 1.8, smoothstep(0.1, 0.6, h)) * 0.8, cov * 0.75);
  // moon disc and halo
  float md = max(dot(d, normalize(moonDir)), 0.0);
  c += moonCol * (pow(md, 900.0) * 3.0 + pow(md, 60.0) * 0.35 + pow(md, 8.0) * 0.06) * moon * (1.0 - cov * 0.6);
  gl_FragColor = vec4(c, 1.0);
}`;

export interface Sky {
  group: Group;
  /** Follow the camera (x, z), advance the clouds, and re-colour for a look and a district. */
  update(x: number, z: number, t: number): void;
  setLook(l: Look, p: Palette): void;
  dispose(): void;
}

/**
 * Procedural night sky: gradient, stars, drifting cloud layers, a moon with halo, and two rings of distant skyline silhouettes
 * (the farther ring is lost in fog). Everything is shader maths or instanced boxes: no textures, one draw call each.
 */
export function buildSky(p: Palette, seed = 12): Sky {
  const group = new Group();
  const mat = new ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, side: BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new Color() }, horizon: { value: new Color() }, moonDir: { value: [0.35, 0.45, -0.8] }, moonCol: { value: new Color(0xbfd0ff) }, stars: { value: 1 }, clouds: { value: 0.5 }, moon: { value: 0.5 }, time: { value: 0 } },
  });
  const dome = new Mesh(new SphereGeometry(640, 24, 16), mat);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  group.add(dome);
  const rnd = createRng(seed);
  const skyline: InstancedMesh[] = [];
  const o = new Object3D();
  if (p.skyline.count > 0) {
    for (const [ring, dist, shade] of [[0, 520, 0.55], [1, 420, 0.85]] as const) {
      const n = p.skyline.count;
      const m = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: new Color(p.fog).multiplyScalar(shade * 0.9), fog: true }), n);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd() * 0.05 + ring * 0.03;
        const h = p.skyline.min + rnd() * (p.skyline.max - p.skyline.min) * (ring ? 0.7 : 1);
        o.position.set(Math.sin(a) * (dist + rnd() * 30), h / 2 - 6, Math.cos(a) * (dist + rnd() * 30));
        o.scale.set(14 + rnd() * 26, h, 14 + rnd() * 26);
        o.rotation.y = rnd() * 3;
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      }
      group.add(m);
      skyline.push(m);
    }
    // lit windows: a sparse band of tiny emissive boxes on the near ring, so the skyline reads as a city
    const w = new InstancedMesh(new BoxGeometry(1, 1.2, 1), new MeshBasicMaterial({ color: new Color(p.window).multiplyScalar(2.6), fog: true, side: DoubleSide }), 420);
    for (let i = 0; i < 420; i++) {
      const a = rnd() * Math.PI * 2;
      o.position.set(Math.sin(a) * 405, 10 + rnd() * p.skyline.max * 0.8, Math.cos(a) * 405);
      o.scale.set(2 + rnd() * 3, 1.2, 1);
      o.rotation.y = a;
      o.updateMatrix();
      w.setMatrixAt(i, o.matrix);
    }
    group.add(w);
  }
  group.name = 'sky';
  markSky(group); // background: never casts or receives shadows (bug A3)
  return {
    group,
    update: (x, z, t) => {
      group.position.set(x, 0, z);
      mat.uniforms.time.value = t;
    },
    setLook: (l, pal) => {
      const u = mat.uniforms;
      u.top.value.setHex(l.skyTop);
      u.horizon.value.setHex(l.skyHorizon).lerp(new Color(pal.horizon), 0.55);
      u.stars.value = l.stars;
      u.moon.value = l.moon;
      u.clouds.value = l.clouds;
    },
    dispose: () => {
      dome.geometry.dispose();
      mat.dispose();
      for (const m of skyline) { m.geometry.dispose(); (m.material as MeshBasicMaterial).dispose(); }
    },
  };
}
