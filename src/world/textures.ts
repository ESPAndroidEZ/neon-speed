import { CanvasTexture, LinearFilter, RepeatWrapping, SRGBColorSpace } from 'three';

const canvas = (w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');
  return [c, ctx];
};

const finish = (c: HTMLCanvasElement, srgb: boolean): CanvasTexture => {
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = SRGBColorSpace;
  return t;
};

/** Asphalt with centre dashes and edge lines. U across the road (0..1), V along it (one tile = 16 m). */
export function makeRoadTexture(): CanvasTexture {
  const [c, g] = canvas(256, 512);
  g.fillStyle = '#17181f';
  g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 9000; i++) {
    const v = 20 + Math.random() * 28;
    g.fillStyle = `rgba(${v},${v},${v + 4},0.5)`;
    g.fillRect(Math.random() * 256, Math.random() * 512, 2, 2);
  }
  g.fillStyle = '#d8dce8';
  g.fillRect(8, 0, 5, 512);
  g.fillRect(243, 0, 5, 512);
  g.fillStyle = '#e8c85a';
  for (let y = 0; y < 512; y += 128) g.fillRect(125, y, 6, 64);
  return finish(c, true);
}

/** Window grid for building facades. `warm` picks the lit-window tint. */
export function makeWindowTexture(warm: boolean): CanvasTexture {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#05060a';
  g.fillRect(0, 0, 128, 128);
  const tints = warm ? ['#ffd890', '#ffb060', '#fff0c0'] : ['#8fd8ff', '#c0a0ff', '#ffffff'];
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      if (Math.random() < 0.45) continue;
      g.fillStyle = tints[Math.floor(Math.random() * tints.length)];
      g.globalAlpha = 0.5 + Math.random() * 0.5;
      g.fillRect(x * 16 + 3, y * 16 + 4, 10, 8);
    }
  return finish(c, true);
}

/** Soft white radial gradient used for additive light pools and streaks. */
export function makePoolTexture(): CanvasTexture {
  const [c, g] = canvas(64, 64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(c);
  t.minFilter = LinearFilter;
  return t;
}
