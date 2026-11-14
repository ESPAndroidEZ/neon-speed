import { CanvasTexture, SRGBColorSpace } from 'three';
import { createRng } from '../../core/rng';

/** A graffiti or mural painter: paints onto a transparent `w` x `h` canvas with `rnd` (a seeded 0..1 generator) and nothing else. */
export type GraffitiPainter = (g: CanvasRenderingContext2D, w: number, h: number, rnd: () => number) => void;

const NEON = ['#ff2a9d', '#18d8ff', '#ffb347', '#7a5cff', '#39ff88', '#ffffff'];
const pick = (rnd: () => number): string => NEON[Math.floor(rnd() * NEON.length)];

/**
 * Reference implementation of a graffiti painter ('tag-wave'): a flowing marker tag with an outline, a drip and a few sparks.
 * New painters (docs/tasks: 12 graffiti and murals) add a key to `GRAFFITI` in their own file and are merged by `allGraffiti`.
 */
export const GRAFFITI: Record<string, GraffitiPainter> = {
  'tag-wave': (g, w, h, rnd) => {
    const c = pick(rnd);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.shadowColor = c;
    g.shadowBlur = 10;
    g.strokeStyle = '#06070c';
    g.lineWidth = h * 0.16;
    const wave = (): void => {
      g.beginPath();
      g.moveTo(w * 0.08, h * 0.6);
      g.bezierCurveTo(w * 0.25, h * 0.1, w * 0.4, h * 0.95, w * 0.55, h * 0.45);
      g.bezierCurveTo(w * 0.7, h * 0.05, w * 0.85, h * 0.8, w * 0.94, h * 0.35);
    };
    wave();
    g.stroke();
    g.strokeStyle = c;
    g.lineWidth = h * 0.09;
    wave();
    g.stroke();
    g.shadowBlur = 0;
    g.fillStyle = c; // drips
    for (let i = 0; i < 3; i++) g.fillRect(w * (0.2 + rnd() * 0.6), h * 0.55, 3, h * (0.1 + rnd() * 0.25));
  },
};

/** Paint one design into a texture (transparent background, so it can decal onto any wall). */
export function makeGraffitiTexture(painter: GraffitiPainter, seed = 1, w = 512, h = 256): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (g) painter(g, w, h, createRng(seed));
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
