import * as THREE from 'three';

export function buildBarrel(): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xc77b1a });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x8a5510 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 16), bodyMat);
  body.position.y = 0.45;
  g.add(body);
  const ringGeo = new THREE.CylinderGeometry(0.31, 0.31, 0.04, 16);
  const r1 = new THREE.Mesh(ringGeo, ringMat);
  r1.position.y = 0.25;
  g.add(r1);
  const r2 = new THREE.Mesh(ringGeo, ringMat);
  r2.position.y = 0.65;
  g.add(r2);
  return g;
}

export function buildPallet(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a7b4a });
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a });
  const slatGeo = new THREE.BoxGeometry(1.2, 0.09, 0.12);
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(slatGeo, woodMat);
    s.position.set(0, 0.105, -0.4 + i * 0.2);
    g.add(s);
  }
  const runnerGeo = new THREE.BoxGeometry(1.2, 0.06, 0.1);
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(runnerGeo, woodMat);
    r.position.set(0, 0.03, -0.45 + i * 0.45);
    g.add(r);
  }
  const boxGeo = new THREE.BoxGeometry(0.5, 0.3, 0.4);
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(boxGeo, boxMat);
    b.position.set(0, 0.3 + i * 0.3, 0);
    g.add(b);
  }
  return g;
}

export function buildForklift(): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe0b020 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.2), bodyMat);
  body.position.set(0, 0.6, -0.3);
  g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.8), bodyMat);
  cab.position.set(0, 1.4, -0.5);
  g.add(cab);
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.0, 0.1), blackMat);
  mast.position.set(0, 1.0, 0.6);
  g.add(mast);
  const forkGeo = new THREE.BoxGeometry(0.08, 0.06, 1.0);
  const f1 = new THREE.Mesh(forkGeo, blackMat);
  f1.position.set(-0.2, 0.1, 1.0);
  g.add(f1);
  const f2 = new THREE.Mesh(forkGeo, blackMat);
  f2.position.set(0.2, 0.1, 1.0);
  g.add(f2);
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
  const w1 = new THREE.Mesh(wheelGeo, blackMat);
  w1.rotation.z = Math.PI / 2;
  w1.position.set(-0.55, 0.4, 0.2);
  g.add(w1);
  const w2 = new THREE.Mesh(wheelGeo, blackMat);
  w2.rotation.z = Math.PI / 2;
  w2.position.set(0.55, 0.4, 0.2);
  g.add(w2);
  return g;
}

export function buildFloodlight(): THREE.Group {
  const g = new THREE.Group();
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 9, 8), mastMat);
  mast.position.y = 4.5;
  g.add(mast);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.4), lampMat);
  head.position.y = 9.0;
  g.add(head);
  return g;
}
