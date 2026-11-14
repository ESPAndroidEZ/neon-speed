import { BackSide, BoxGeometry, BufferAttribute, Color, Mesh, MeshBasicMaterial, PMREMGenerator, Scene, SphereGeometry, type Texture, type WebGLRenderer } from 'three';
import { createRng } from '../core/rng';

/**
 * Procedural night-city environment baked once into a PMREM: a dusk gradient dome (deep blue above, warm haze at the
 * horizon), a ring of lit building blocks with window bands, and neon sign boxes. No HDR file needed.
 */
export function buildNeonEnvMap(renderer: WebGLRenderer): Texture {
  const rnd = createRng(77);
  const s = new Scene();
  const dome = new SphereGeometry(100, 24, 16);
  const pos = dome.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  const top = new Color(0x050a24);
  const mid = new Color(0x1b2a5e);
  const low = new Color(0x6a3a4a); // warm city haze
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i) / 100; // -1..1
    if (h > 0.25) c.copy(mid).lerp(top, (h - 0.25) / 0.75);
    else c.copy(low).lerp(mid, Math.max(0, (h + 0.1) / 0.35));
    col.set([c.r, c.g, c.b], i * 3);
  }
  dome.setAttribute('color', new BufferAttribute(col, 3));
  s.add(new Mesh(dome, new MeshBasicMaterial({ vertexColors: true, side: BackSide })));

  const neon = [0xff2a9d, 0x18d8ff, 0xffb347, 0x7a5cff, 0x39ff88, 0xffffff];
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2 + rnd() * 0.1;
    const h = 8 + rnd() * 30;
    const block = new Mesh(new BoxGeometry(6 + rnd() * 8, h, 6), new MeshBasicMaterial({ color: new Color(0x10141f).multiplyScalar(1 + rnd()) }));
    block.position.set(Math.sin(a) * 55, h / 2 - 4, Math.cos(a) * 55);
    s.add(block);
    for (let k = 0; k < 3; k++) { // lit window bands and neon signs on the block face
      const lit = new Mesh(new BoxGeometry(5, 0.6 + rnd(), 0.4), new MeshBasicMaterial({ color: new Color(neon[Math.floor(rnd() * neon.length)]).multiplyScalar(2 + rnd() * 3) }));
      lit.position.set(Math.sin(a) * 51.8, 2 + rnd() * (h - 6), Math.cos(a) * 51.8);
      lit.lookAt(0, lit.position.y, 0);
      s.add(lit);
    }
  }
  for (let i = 0; i < 10; i++) { // overhead lamps
    const a = rnd() * Math.PI * 2;
    const lamp = new Mesh(new BoxGeometry(3, 0.4, 1), new MeshBasicMaterial({ color: new Color(0xffd9a0).multiplyScalar(6) }));
    lamp.position.set(Math.sin(a) * 25, 14 + rnd() * 6, Math.cos(a) * 25);
    s.add(lamp);
  }
  // softbox strips and neon tubes: what gives glossy paint its long, streaky highlights (HDR so they stay bright after blur)
  const tubeCols = [0xff2a9d, 0x18d8ff, 0xffb347, 0x7a5cff, 0xffffff];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.2;
    const tube = new Mesh(new BoxGeometry(0.9, 26 + rnd() * 10, 0.9), new MeshBasicMaterial({ color: new Color(tubeCols[i % tubeCols.length]).multiplyScalar(8) }));
    tube.position.set(Math.sin(a) * 34, 12, Math.cos(a) * 34);
    s.add(tube);
  }
  for (const [x, z, w] of [[0, -10, 40], [-18, 12, 30], [16, 18, 30]] as const) {
    const strip = new Mesh(new BoxGeometry(w, 0.8, 2.4), new MeshBasicMaterial({ color: new Color(0xdfe8ff).multiplyScalar(4.5) }));
    strip.position.set(x, 28, z);
    s.add(strip);
  }
  const pm = new PMREMGenerator(renderer);
  const env = pm.fromScene(s, 0.03).texture;
  pm.dispose();
  return env;
}
