import { BoxGeometry, CircleGeometry, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, type Texture } from 'three';
import type { SurfaceMap } from '../physics/surfaces';
import type { Weather } from '../types/game';
import { ribbon } from './ribbon';
import { halfWidthAt, type Track } from './track';

const MAX_PUDDLES = 24;

/** Visible side of the surface hazards: puddles (rain), snow banks and ice sheets (snow). Toggled per weather. */
export class SurfaceVisuals {
  private readonly puddles: InstancedMesh;
  private readonly banks: InstancedMesh;
  private readonly ice: Mesh;
  private readonly surfaces: SurfaceMap;
  private readonly d = new Object3D();

  constructor(track: Track, surfaces: SurfaceMap, root: Group, env: Texture) {
    this.surfaces = surfaces;
    this.puddles = new InstancedMesh(new CircleGeometry(1, 24).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: 0x04070e, roughness: 0.03, metalness: 1, envMap: env, envMapIntensity: 1.8 }), MAX_PUDDLES);
    this.puddles.frustumCulled = false;
    this.puddles.visible = false;
    // snow banks: lumpy white heaps along the edge of every tight corner
    const spots = surfaces.cornerIndex;
    this.banks = new InstancedMesh(new BoxGeometry(2.4, 0.7, 1.1), new MeshStandardMaterial({ color: 0xeaf2ff, roughness: 0.95 }), Math.max(1, spots.length * 2));
    let n = 0;
    for (const i of spots) {
      const s = track.samples[i];
      for (const side of [1, -1]) {
        const off = side * (halfWidthAt(track, i) - 0.55);
        this.d.position.set(s.position.x + s.tangent.z * off, 0.3, s.position.z - s.tangent.x * off);
        this.d.rotation.set(0, Math.atan2(s.tangent.x, s.tangent.z), 0);
        this.d.scale.set(1, 0.8 + ((i * 7) % 5) * 0.12, 1);
        this.d.updateMatrix();
        this.banks.setMatrixAt(n++, this.d.matrix);
      }
    }
    this.banks.count = n;
    this.banks.visible = false;
    // ice: a glossy sheet over the tunnel and bridge tarmac
    const onIce = (i: number): boolean => track.zones[i] === 'tunnel' || track.zones[i] === 'bridge';
    this.ice = new Mesh(ribbon(track, (i) => -halfWidthAt(track, i) + 0.2, (i) => halfWidthAt(track, i) - 0.2, 0.035, 8, onIce), new MeshStandardMaterial({ color: 0xb8d8ff, roughness: 0.04, metalness: 0.6, transparent: true, opacity: 0.45, envMap: env, envMapIntensity: 1.6 }));
    this.ice.visible = false;
    root.add(this.puddles, this.banks, this.ice);
  }

  /** Call after the puddles were reseeded and whenever the weather or physics level changes. */
  sync(weather: Weather): void {
    const on = this.surfaces.hazardsOn || (weather !== 'CLEAR');
    const hazards = this.surfaces.hazardsOn;
    const list = this.surfaces.puddles;
    for (let i = 0; i < Math.min(list.length, MAX_PUDDLES); i++) {
      this.d.position.set(list[i].x, 0.026, list[i].z);
      this.d.rotation.set(0, 0, 0);
      this.d.scale.set(list[i].r, 1, list[i].r);
      this.d.updateMatrix();
      this.puddles.setMatrixAt(i, this.d.matrix);
    }
    this.puddles.count = Math.min(list.length, MAX_PUDDLES);
    this.puddles.instanceMatrix.needsUpdate = true;
    this.puddles.visible = hazards && weather === 'RAIN';
    this.banks.visible = on && weather === 'SNOW';
    this.ice.visible = hazards && weather === 'SNOW';
  }
}
