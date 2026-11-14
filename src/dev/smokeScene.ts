import {
  BoxGeometry,
  CylinderGeometry,
  DirectionalLight,
  GridHelper,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  type Scene,
} from 'three';

/*
 * THROWAWAY dev scene: a placeholder car and a neon street so the cameras and bloom
 * can be eyeballed before real .glb assets and the track exist. Delete once world/ lands.
 */

const box = (w: number, h: number, d: number, mat: MeshStandardMaterial, x: number, y: number, z: number): Mesh => {
  const mesh = new Mesh(new BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
};

export function buildSmokeScene(scene: Scene): Group {
  scene.add(new HemisphereLight(0x3a4a8a, 0x0a0a12, 0.7));
  const moon = new DirectionalLight(0x8fa4ff, 0.6);
  moon.position.set(-20, 30, -10);
  scene.add(moon);

  const road = new Mesh(
    new PlaneGeometry(400, 400),
    new MeshStandardMaterial({ color: 0x0c0d14, roughness: 0.4, metalness: 0.3 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  scene.add(road);

  const grid = new GridHelper(400, 100, 0x00e5ff, 0x1a1f3d);
  grid.position.y = 0.01;
  scene.add(grid);

  // Emissive neon posts down both sides: parallax for the camera and something for bloom to chew on.
  for (let i = -12; i <= 12; i++) {
    const glow = i % 2 === 0 ? 0xff1f8e : 0x18d8ff;
    const mat = new MeshStandardMaterial({ color: 0x111111, emissive: glow, emissiveIntensity: 3.5 });
    for (const x of [-9, 9]) {
      const post = new Mesh(new BoxGeometry(0.25, 4, 0.25), mat);
      post.position.set(x, 2, i * 14);
      scene.add(post);
    }
  }

  const magenta = new PointLight(0xff2a9d, 150, 24);
  magenta.position.set(-6, 3, -4);
  const cyan = new PointLight(0x20d8ff, 150, 24);
  cyan.position.set(6, 3, 6);
  scene.add(magenta, cyan);

  const car = new Group();
  const paint = new MeshStandardMaterial({ color: 0xd4141c, metalness: 0.75, roughness: 0.22 });
  const glass = new MeshStandardMaterial({ color: 0x070a12, metalness: 0.9, roughness: 0.08 });
  const tyre = new MeshStandardMaterial({ color: 0x050505, roughness: 0.9 });
  const lamp = new MeshStandardMaterial({ color: 0xffffff, emissive: 0xdff2ff, emissiveIntensity: 5 });
  const tail = new MeshStandardMaterial({ color: 0x220000, emissive: 0xff1010, emissiveIntensity: 4 });
  const under = new MeshStandardMaterial({ color: 0x001030, emissive: 0x2a6bff, emissiveIntensity: 3 });

  car.add(box(1.8, 0.5, 4.3, paint, 0, 0.55, 0));
  car.add(box(1.5, 0.45, 2.0, glass, 0, 1.02, -0.2));
  car.add(box(1.9, 0.06, 0.5, paint, 0, 1.3, -1.95));
  car.add(box(1.6, 0.02, 3.8, under, 0, 0.06, 0));
  for (const x of [-0.65, 0.65]) {
    car.add(box(0.4, 0.14, 0.08, lamp, x, 0.62, 2.16));
    car.add(box(0.4, 0.1, 0.08, tail, x, 0.65, -2.16));
  }
  for (const x of [-0.95, 0.95]) {
    for (const z of [-1.35, 1.35]) {
      const wheel = new Mesh(new CylinderGeometry(0.34, 0.34, 0.26, 20), tyre);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.34, z);
      wheel.castShadow = true;
      car.add(wheel);
    }
  }
  const glow = new PointLight(0x2a6bff, 40, 8);
  glow.position.set(0, 0.2, 0);
  car.add(glow);

  scene.add(car);
  return car;
}
