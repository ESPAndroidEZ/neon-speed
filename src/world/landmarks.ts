import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Quaternion, Vector3 } from 'three';
import type { TrackDef } from '../data/tracks';
import { createRng } from '../core/rng';
import type { Track } from './track';
import { markSky } from './shadowRig';

/**
 * Per-track landmarks on top of a theme (instanced: one draw call per kind). Mountain Pass: pines on both verges,
 * distant snow-capped peaks, valley mist sheets and the lit lookout at the summit. Coast Run: palms on the esplanade
 * and boulevards, a beach strip with the sea, moored yachts at the harbour and the lit casino facade on the square.
 * Placement comes from the track samples (left of travel = (tangent.z, -tangent.x)). Kept dark and moody.
 */
const m4 = new Matrix4(), q = new Quaternion(), p = new Vector3(), sc = new Vector3(), up = new Vector3(0, 1, 0);

function scatter(track: Track, every: number, pick: (i: number) => boolean, offset: (rnd: () => number) => number, seed: number): { x: number; y: number; z: number; r: number }[] {
  const s = track.samples, n = s.length, rnd = createRng(seed), out: { x: number; y: number; z: number; r: number }[] = [];
  for (let i = 0; i < n; i += every) {
    if (!pick(i)) continue;
    const t = s[i].tangent, o = offset(rnd);
    const side = o > 0 ? 1 : -1, off = o + side * s[i].width / 2;
    out.push({ x: s[i].position.x + t.z * off, y: track.heights?.[i] ?? 0, z: s[i].position.z - t.x * off, r: rnd() });
  }
  return out;
}

function instanced(geo: BoxGeometry | ConeGeometry | CylinderGeometry, mat: MeshStandardMaterial | MeshBasicMaterial, pts: { x: number; y: number; z: number; r: number }[], size: (r: number) => [number, number], lift = 0): InstancedMesh {
  const im = new InstancedMesh(geo, mat, Math.max(1, pts.length));
  pts.forEach((pt, i) => {
    const [w, h] = size(pt.r);
    q.setFromAxisAngle(up, pt.r * 6.28);
    m4.compose(p.set(pt.x, pt.y + lift * h, pt.z), q, sc.set(w, h, w));
    im.setMatrixAt(i, m4);
  });
  im.count = pts.length;
  return im;
}

function mountain(track: Track): Group {
  const g = new Group(), n = track.samples.length;
  // pines on both verges, denser low down
  const pines = scatter(track, 3, () => true, (rnd) => (rnd() < 0.5 ? -1 : 1) * (6 + rnd() * 50), 41);
  g.add(instanced(new ConeGeometry(1, 1, 6).translate(0, 0.5, 0), new MeshStandardMaterial({ color: 0x0d1f18, roughness: 0.95 }), pines, (r) => [2.2 + r * 1.6, 9 + r * 9]));
  g.add(instanced(new CylinderGeometry(0.15, 0.2, 1, 5).translate(0, 0.5, 0), new MeshStandardMaterial({ color: 0x1a120c }), pines, () => [1, 2.2]));
  // distant peaks with snow caps on a ring around the track
  const c = track.samples.reduce((a, s) => a.add(s.position as unknown as Vector3), new Vector3()).multiplyScalar(1 / n);
  const peaks: { x: number; y: number; z: number; r: number }[] = [];
  const rnd = createRng(7);
  for (let k = 0; k < 16; k++) { const a = (k / 16) * 6.28 + rnd() * 0.3, d = 1700 + rnd() * 600; peaks.push({ x: c.x + Math.sin(a) * d, y: -20, z: c.z + Math.cos(a) * d, r: rnd() }); }
  g.add(markSky(instanced(new ConeGeometry(1, 1, 7).translate(0, 0.5, 0), new MeshStandardMaterial({ color: 0x141a2a, roughness: 1 }), peaks, (r) => [380 + r * 260, 420 + r * 380])));
  g.add(markSky(instanced(new ConeGeometry(1, 1, 7).translate(0, 0.5, 0), new MeshStandardMaterial({ color: 0xc8d4ec, roughness: 0.8, emissive: 0x1a2236 }), peaks.map((pk) => ({ ...pk, y: pk.y + (420 + pk.r * 380) * 0.72 })), (r) => [(380 + r * 260) * 0.29, (420 + r * 380) * 0.28])));
  // valley mist: soft sheets low over the valley road
  const mist = new MeshBasicMaterial({ color: 0x8090b0, transparent: true, opacity: 0.07, depthWrite: false, side: DoubleSide });
  for (const pt of scatter(track, 60, (i) => (track.heights?.[i] ?? 0) < 12, () => 25, 3)) {
    const m = new Mesh(new PlaneGeometry(220, 220).rotateX(-Math.PI / 2), mist);
    m.position.set(pt.x, pt.y + 3 + pt.r * 4, pt.z);
    g.add(markSky(m));
  }
  // lookout at the summit: warm lamps and a glow pool
  let top = 0;
  for (let i = 0; i < n; i++) if ((track.heights?.[i] ?? 0) > (track.heights?.[top] ?? 0)) top = i;
  const lamp = new MeshBasicMaterial({ color: new Color(0xffb040).multiplyScalar(3) });
  for (const pt of scatter(track, 4, (i) => Math.abs(i - top) < 24, () => -3, 9)) {
    const pole = new Mesh(new BoxGeometry(0.15, 5, 0.15), new MeshStandardMaterial({ color: 0x222831 }));
    pole.position.set(pt.x, pt.y + 2.5, pt.z);
    const bulb = new Mesh(new BoxGeometry(0.6, 0.25, 0.6), lamp);
    bulb.position.set(pt.x, pt.y + 5.1, pt.z);
    g.add(pole, bulb);
  }
  return g;
}

function coast(track: Track): Group {
  const g = new Group(), z = track.zones;
  // palms along the esplanade and boulevards (right side: the sea is on the left of the beach road)
  const palms = scatter(track, 6, (i) => z[i] === 'dock' || z[i] === 'boulevard', (rnd) => 2 + rnd() * 3, 21);
  g.add(instanced(new CylinderGeometry(0.18, 0.28, 1, 6).translate(0, 0.5, 0), new MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9 }), palms, (r) => [1, 7 + r * 4]));
  g.add(instanced(new ConeGeometry(1, 1, 7).translate(0, 0.5, 0), new MeshStandardMaterial({ color: 0x0f2a1c, roughness: 0.8 }), palms.map((pt) => ({ ...pt, y: pt.y + 6.5 + pt.r * 4 })), () => [3.2, 1.6]));
  // beach strip and sea beside the beach road (left side)
  const sand = new MeshStandardMaterial({ color: 0x3a3226, roughness: 1 });
  const sea = new MeshStandardMaterial({ color: 0x041420, roughness: 0.12, metalness: 0.3 });
  for (const pt of scatter(track, 8, (i) => z[i] === 'boulevard', () => -16, 5)) {
    const b = new Mesh(new PlaneGeometry(30, 30).rotateX(-Math.PI / 2), sand);
    b.position.set(pt.x, -0.05, pt.z);
    const w = new Mesh(new PlaneGeometry(80, 80).rotateX(-Math.PI / 2), sea);
    w.position.set(pt.x + (pt.x > 0 ? 40 : -40), -0.3, pt.z);
    g.add(b, w);
  }
  // moored yachts off the harbour esplanade
  const yachts = scatter(track, 9, (i) => z[i] === 'dock', (rnd) => -(14 + rnd() * 20), 13);
  g.add(instanced(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.3 }), yachts, (r) => [3.5 + r * 2, 2.2], 0.1));
  g.add(instanced(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: new Color(0xffd9a0).multiplyScalar(1.6) }), yachts.map((y) => ({ ...y, y: y.y + 2.3 })), () => [1.6, 0.6]));
  // casino facade on the square: warm windows and a magenta neon band
  for (const pt of scatter(track, 400, (i) => z[i] === 'plaza', () => 18, 2).slice(0, 1)) {
    const hall = new Mesh(new BoxGeometry(36, 16, 14), new MeshStandardMaterial({ color: 0x2a2230, roughness: 0.6, emissive: 0x1a0c08 }));
    hall.position.set(pt.x, pt.y + 8, pt.z);
    const band = new Mesh(new BoxGeometry(36.4, 0.6, 14.4), new MeshBasicMaterial({ color: new Color(0xff2a9d).multiplyScalar(3) }));
    band.position.set(pt.x, pt.y + 14, pt.z);
    const win = new Mesh(new BoxGeometry(30, 6, 14.2), new MeshBasicMaterial({ color: new Color(0xffc070).multiplyScalar(1.4) }));
    win.position.set(pt.x, pt.y + 6, pt.z);
    g.add(hall, win, band);
  }
  return g;
}

/** Landmarks for a map, or null when it has none. */
export function buildLandmarks(track: Track, def: TrackDef): Group | null {
  return def.id === 'mountain' ? mountain(track) : def.id === 'coast' ? coast(track) : null;
}
