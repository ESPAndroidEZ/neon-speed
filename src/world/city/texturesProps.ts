import { CanvasTexture, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace } from 'three';
import { N, normalFrom, tex } from './textures';

// Props textures of the city (shop fronts, shipping containers), split from textures.ts to keep files short.

/**
 * A shopfront tile (one 6 m bay, ground floor): a dark frame, a big glass window whose interior glows (white, so the vertex
 * colour tints it per shop), shelves and a counter silhouette, a door, and a bright lintel strip. Used unlit.
 */
export function makeShopfrontTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#05060a';
    g.fillRect(0, 0, 256, 256);
    const glow = g.createLinearGradient(0, 40, 0, 230);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.6, '#c8c8c8');
    glow.addColorStop(1, '#707070');
    g.fillStyle = glow;
    g.fillRect(14, 44, 160, 180); // window
    g.fillRect(190, 52, 52, 172); // door glass
    g.fillStyle = '#0a0b10';
    for (const x of [60, 112]) g.fillRect(x, 44, 5, 180); // mullions
    g.fillRect(14, 150, 160, 6);
    g.fillStyle = 'rgba(0,0,0,.55)'; // shelves, a counter and a figure inside
    for (let y = 80; y < 140; y += 28) g.fillRect(20, y, 40, 4);
    g.fillRect(70, 170, 90, 54);
    g.beginPath();
    g.arc(130, 130, 14, 0, 7);
    g.fillRect(118, 140, 24, 40);
    g.fill();
    g.fillStyle = '#ffffff'; // lintel strip: the sign box above the window
    g.fillRect(14, 8, 228, 24);
    g.fillStyle = '#05060a';
    for (let x = 22; x < 232; x += 18) g.fillRect(x, 14, 9, 12);
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.minFilter = LinearMipmapLinearFilter;
  t.anisotropy = 4;
  return t;
}

/** Shipping-container side: vertical corrugation (with a matching normal map), door bars, rust streaks and a stencilled code. Greyscale paint: instance colours tint it. */
export function makeContainerSheet(): { map: CanvasTexture; normalMap: CanvasTexture } {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const height = new Float32Array(N * N);
  if (g) {
    g.fillStyle = '#c8c8c8';
    g.fillRect(0, 0, S, S);
    for (let x = 0; x < S; x += 8) { g.fillStyle = x % 16 ? '#ffffff30' : '#00000038'; g.fillRect(x, 0, 4, S); }
    g.fillStyle = '#00000050'; // frame and door seam
    g.fillRect(0, 0, S, 6); g.fillRect(0, S - 6, S, 6); g.fillRect(S - 70, 6, 3, S - 12);
    g.fillStyle = '#d0d0d0';
    for (const x of [S - 56, S - 40, S - 24]) g.fillRect(x, 20, 3, S - 40); // locking bars
    for (let i = 0; i < 34; i++) { g.fillStyle = `rgba(110,50,20,${0.05 + Math.random() * 0.12})`; g.fillRect(Math.random() * S, 0, 2 + Math.random() * 4, 40 + Math.random() * 150); }
    g.fillStyle = '#f2f2f2';
    g.font = '700 22px monospace';
    g.fillText('RBLU 4417', 14, 40);
    g.font = '700 11px monospace';
    g.fillText('22G1  MAX 30480 KG', 14, 58);
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) height[y * N + x] = (Math.floor((x / N) * 64) % 2) * 0.9;
  return { map: tex(c, true), normalMap: tex(normalFrom(height, 2), false) };
}
