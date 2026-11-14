import { BoxGeometry, Color, Mesh, MeshBasicMaterial, PMREMGenerator, Scene, type Texture, type WebGLRenderer } from 'three';

/** Fake city reflection probe: dark sky with a ring of bright neon boxes, baked once into a PMREM env map. */
export function buildNeonEnvMap(renderer: WebGLRenderer): Texture {
  const s = new Scene();
  s.background = new Color(0x0a0f24);
  const colors = [0xff2a9d, 0x18d8ff, 0xffb347, 0x7a5cff, 0xffffff];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const m = new MeshBasicMaterial({ color: new Color(colors[i % colors.length]).multiplyScalar(4) });
    const b = new Mesh(new BoxGeometry(3 + (i % 3) * 3, 1 + (i % 4), 0.5), m);
    b.position.set(Math.sin(a) * 40, 4 + (i % 5) * 3, Math.cos(a) * 40);
    b.lookAt(0, 0, 0);
    s.add(b);
  }
  const top = new Mesh(new BoxGeometry(60, 0.5, 60), new MeshBasicMaterial({ color: new Color(0x3b4a8a).multiplyScalar(1.5) }));
  top.position.y = 30;
  s.add(top);
  const pm = new PMREMGenerator(renderer);
  const env = pm.fromScene(s, 0.04).texture;
  pm.dispose();
  return env;
}
