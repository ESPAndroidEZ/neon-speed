import { VINYLS_B } from './vinylB';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import type { Vinyl } from '../data/loadout';

/**
 * Vinyl painters: each paints one pattern onto a transparent `size` x `size` canvas in `color`. Reference implementations: 'stripes',
 * 'racing' and 'checker'. Add a pattern by adding a key (see docs/tasks: 20 vinyl patterns); `makeVinylMap` composes it over the paint.
 */
export type VinylPainter = (g: CanvasRenderingContext2D, size: number, color: string) => void;

export const VINYL_PAINTERS: Record<string, VinylPainter> = {
  /** Two bold bands down the middle. */
  stripes: (g, s, c) => {
    g.fillStyle = c;
    g.fillRect(s * 0.36, 0, s * 0.11, s);
    g.fillRect(s * 0.53, 0, s * 0.11, s);
  },
  /** A wide band with two thin edge lines. */
  racing: (g, s, c) => {
    g.fillStyle = c;
    g.fillRect(s * 0.4, 0, s * 0.2, s);
    g.fillRect(s * 0.34, 0, s * 0.02, s);
    g.fillRect(s * 0.64, 0, s * 0.02, s);
  },
  /** A chequered band across the top third. */
  checker: (g, s, c) => {
    g.fillStyle = c;
    const n = 12;
    const cell = s / n;
    for (let y = 0; y < 4; y++) for (let x = 0; x < n; x++) if ((x + y) % 2 === 0) g.fillRect(x * cell, y * cell, cell, cell);
  },
};

Object.assign(VINYL_PAINTERS, VINYLS_B);
export const VINYL_IDS = Object.keys(VINYL_PAINTERS);
const css = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** The paint map: base colour, then the vinyl pattern (scaled, rotated), then the race number. The paint material's colour becomes white. */
export function makeVinylMap(baseHex: number, v: Vinyl): CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = css(baseHex);
    g.fillRect(0, 0, size, size);
    const paint = v.kind ? VINYL_PAINTERS[v.kind] : undefined;
    if (paint) {
      g.save();
      g.translate(size / 2, size / 2);
      g.rotate((v.rotation * Math.PI) / 180);
      g.scale(v.scale, v.scale);
      g.translate(-size / 2, -size / 2);
      paint(g, size, css(v.color));
      g.restore();
    }
    if (v.number) {
      g.fillStyle = '#ffffff';
      g.font = '900 120px system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText(v.number, size * 0.5, size * 0.9);
    }
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  return t;
}
