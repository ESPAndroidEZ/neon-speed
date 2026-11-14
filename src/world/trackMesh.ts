import { DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry } from 'three';
import { ribbon, stripedBand } from './ribbon';
import type { Track } from './track';
import { makeRoadTexture } from './textures';

export interface TrackMeshes {
  group: Group;
  roadMat: MeshStandardMaterial;
  groundMat: MeshStandardMaterial;
  vergeMat: MeshStandardMaterial;
}

const RED = [0.8, 0.08, 0.1];
const WHITE = [0.85, 0.85, 0.9];
const CONCRETE_A = [0.32, 0.33, 0.38];
const CONCRETE_B = [0.26, 0.27, 0.32];

/** Road, kerbs, verge, concrete barriers with neon caps, and a big ground plane. */
export function buildTrackMeshes(tr: Track): TrackMeshes {
  const group = new Group();
  const hw = tr.halfWidth;
  const bo = tr.barrierOffset;

  const roadMat = new MeshStandardMaterial({ map: makeRoadTexture(), roughness: 0.4, metalness: 0.35, side: DoubleSide });
  roadMat.map?.repeat.set(1, 1);
  const road = new Mesh(ribbon(tr, -hw, hw, 0.02), roadMat);
  road.receiveShadow = true;
  group.add(road);

  const vergeMat = new MeshStandardMaterial({ color: 0x1d2128, roughness: 0.85, metalness: 0.05, side: DoubleSide });
  group.add(new Mesh(ribbon(tr, hw, bo + 0.6, 0.01), vergeMat), new Mesh(ribbon(tr, -hw, -bo - 0.6, 0.01), vergeMat));

  const kerbMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: DoubleSide });
  group.add(new Mesh(stripedBand(tr, hw, hw + 0.7, 0.04, 0, RED, WHITE), kerbMat), new Mesh(stripedBand(tr, -hw, -hw - 0.7, 0.04, 0, RED, WHITE), kerbMat));

  const wallMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.1, side: DoubleSide });
  const wallH = 0.95;
  for (const s of [1, -1]) {
    group.add(new Mesh(stripedBand(tr, s * bo, s * (bo + 0.6), 0, wallH, CONCRETE_A, CONCRETE_B, 4), wallMat));
    // Neon cap: magenta on the left wall, cyan on the right. HDR colour so bloom picks it up.
    const cap = new MeshBasicMaterial({ color: s > 0 ? 0xff2a9d : 0x18d8ff, side: DoubleSide });
    cap.color.multiplyScalar(2.6);
    group.add(new Mesh(ribbon(tr, s * (bo - 0.02), s * (bo + 0.06), wallH * 0.7), cap));
  }

  const groundMat = new MeshStandardMaterial({ color: 0x14161c, roughness: 0.9, metalness: 0.05 });
  const ground = new Mesh(new PlaneGeometry(1600, 1600), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  group.add(ground);
  return { group, roadMat, groundMat, vergeMat };
}
