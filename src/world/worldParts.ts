import { Color, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, type Texture } from 'three';
import type { TrackDef } from '../data/tracks';
import type { PropsLayout } from './propsLayout';
import { buildCliffside, SEA_LEVEL } from './cliffside';
import { paletteOf } from '../data/palettes';
import { buildDetails, layoutDetails, type Details } from './city/details';
import { buildDock, type Dock } from './dock';
import { buildFacades } from './facades';
import { buildFurniture, type Furniture } from './furniture';
import { buildProps } from './props';
import { ribbon } from './ribbon';
import { buildStage } from './stage';
import type { Track } from './track';
import { buildTrackMeshes, type TrackMeshes } from './trackMesh';
import { buildBridge, buildTunnel } from './tunnelBridge';
import { buildYard } from './yard';
import { buildLandmarks } from './landmarks';

/** Everything a theme contributes to a map; the optional parts are what only some themes have. */
export interface Parts {
  group: Group;
  meshes: TrackMeshes;
  furniture: Furniture | null;
  dock: Dock | null;
  waterMat: MeshStandardMaterial;
  /** Materials the weather look drives; stand-ins when a theme has no lamps or signs. */
  poolMat: MeshBasicMaterial;
  streakMat: MeshBasicMaterial;
  shaftMat: MeshBasicMaterial;
  glowMat: Furniture['glowMat'];
  /** Facade and rooftop details (null on maps without buildings). */
  details: Details | null;
}

const dummy = (): MeshBasicMaterial => new MeshBasicMaterial({ color: new Color(0), transparent: true, opacity: 0 });

/** City (facades, lamps, signs, tunnel, bridge, dock), port (container yard, lamps, cranes) or cliff (terrain, rails, sea). */
export function buildParts(track: Track, def: TrackDef, layout: PropsLayout, env: Texture): Parts {
  const group = new Group();
  const meshes = buildTrackMeshes(track, def.theme === 'cliff' ? SEA_LEVEL : -0.02);
  group.add(meshes.group, buildStage(env));
  const n = track.samples.length;
  let furniture: Furniture | null = null;
  let dock: Dock | null = null;
  let details: Details | null = null;
  if (def.theme === 'city') {
    const facades = buildFacades(track, def.plaza, def.id);
    furniture = buildFurniture(track, facades.height);
    dock = buildDock(track);
    details = buildDetails(layoutDetails(track, facades.height, paletteOf(def.id)));
    group.add(facades.group, furniture.group, dock.group, details.group, buildTunnel(track), buildBridge(track), buildProps(layout, def.plaza ?? null));
    // tram lines: two steel rails and a faint cyan sleeper strip down the middle of every boulevard
    const onBoulevard = (i: number): boolean => track.zones[i % n] === 'boulevard';
    const steel = new MeshBasicMaterial({ color: new Color(0x9aa6b8).multiplyScalar(0.5), side: DoubleSide });
    if (track.zones.includes('boulevard')) {
      group.add(
        new Mesh(ribbon(track, 0.62, 0.74, 0.045, 16, onBoulevard), steel),
        new Mesh(ribbon(track, -0.74, -0.62, 0.045, 16, onBoulevard), steel),
        new Mesh(ribbon(track, -0.6, 0.6, 0.04, 2, (i) => onBoulevard(i) && i % 2 === 0), new MeshBasicMaterial({ color: new Color(0x18d8ff).multiplyScalar(0.18), side: DoubleSide })),
      );
    }
  } else if (def.theme === 'port') {
    furniture = buildFurniture(track, [new Float32Array(n), new Float32Array(n)]);
    dock = buildDock(track);
    group.add(furniture.group, dock.group, buildYard(track), buildProps(layout, null));
  } else group.add(buildCliffside(track), buildTunnel(track)); // the tunnel builder only adds meshes where a 'tunnel' zone exists
  const marks = buildLandmarks(track, def);
  if (marks) group.add(marks);
  return {
    group, meshes, furniture, dock, details,
    waterMat: dock?.waterMat ?? new MeshStandardMaterial({ color: 0x050c1c }),
    poolMat: furniture?.poolMat ?? dummy(), streakMat: furniture?.streakMat ?? dummy(), shaftMat: furniture?.shaftMat ?? dummy(),
    glowMat: furniture?.glowMat ?? (dummy() as unknown as Furniture['glowMat']),
  };
}
