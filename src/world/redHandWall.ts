import { CanvasTexture, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { drawWall } from './wallArt';
import type { Track } from './track';

/**
 * The Red Hand Wall at the finish line: a painted wall panel on the street, with one red handprint per event passed.
 * Placed on the right-hand wall a few samples after the start line.
 */
export class RedHandWall {
  readonly mesh: Mesh;
  private readonly canvas = document.createElement('canvas');
  private readonly tex: CanvasTexture;

  constructor(tr: Track) {
    this.canvas.width = 960;
    this.canvas.height = 300;
    drawWall(this.canvas, 0);
    this.tex = new CanvasTexture(this.canvas);
    this.tex.colorSpace = SRGBColorSpace;
    this.mesh = new Mesh(new PlaneGeometry(10, 3.2), new MeshBasicMaterial({ map: this.tex, side: DoubleSide, color: 0xe8e0e0 }));
    const i = 7;
    const s = tr.samples[i];
    const off = -(tr.wall[i] - 0.06); // right-hand wall, a hair in front of the facade
    this.mesh.position.set(s.position.x + s.tangent.z * off, 3.0 + tr.heights[i], s.position.z - s.tangent.x * off);
    // plane normal must point at the road: the left normal (tz, -tx)
    this.mesh.rotation.y = Math.atan2(s.tangent.z, -s.tangent.x);
  }

  /** Redraw with `n` handprints (events passed). */
  setHandprints(n: number): void {
    drawWall(this.canvas, n);
    this.tex.needsUpdate = true;
  }
}
