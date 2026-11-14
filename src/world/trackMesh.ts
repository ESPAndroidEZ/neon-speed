import { DoubleSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { ribbon } from './ribbon';
import { makeRoadTexture } from './textures';
import { halfWidthAt, type Track } from './track';

export interface TrackMeshes {
  group: Group;
  roadMat: MeshStandardMaterial;
  groundMat: MeshStandardMaterial;
  /** Sidewalk strips (snow tints them). */
  vergeMat: MeshStandardMaterial;
}

/** Worn asphalt, raised sidewalk strips between road edge and wall, and the big ground plane. */
export function buildTrackMeshes(tr: Track, groundY = -0.02): TrackMeshes {
  const group = new Group();
  const hw = (i: number): number => halfWidthAt(tr, i);
  const roadMat = new MeshStandardMaterial({ map: makeRoadTexture(), roughness: 0.4, metalness: 0.3, side: DoubleSide });
  const road = new Mesh(ribbon(tr, (i) => -hw(i), hw, 0.02), roadMat);
  road.receiveShadow = true;
  group.add(road);

  const vergeMat = new MeshStandardMaterial({ color: 0x2a2d35, roughness: 0.85, metalness: 0.05, side: DoubleSide });
  group.add(
    new Mesh(ribbon(tr, hw, (i) => tr.wall[i] + 0.05, 0.16), vergeMat),
    new Mesh(ribbon(tr, (i) => -hw(i), (i) => -tr.wall[i] - 0.05, 0.16), vergeMat),
  );
  // kerb faces: thin lighter strips along the road edge
  const kerbMat = new MeshStandardMaterial({ color: 0x4a4d57, roughness: 0.7, side: DoubleSide });
  group.add(new Mesh(ribbon(tr, hw, (i) => hw(i) + 0.14, 0.17), kerbMat), new Mesh(ribbon(tr, (i) => -hw(i), (i) => -hw(i) - 0.14, 0.17), kerbMat));

  const groundMat = new MeshStandardMaterial({ color: 0x14161c, roughness: 0.9, metalness: 0.05 });
  const ground = new Mesh(new PlaneGeometry(2000, 2000), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = groundY;
  ground.receiveShadow = true;
  group.add(ground);
  return { group, roadMat, groundMat, vergeMat };
}
