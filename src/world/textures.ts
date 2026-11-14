import { CanvasTexture, LinearFilter, RepeatWrapping, SRGBColorSpace } from 'three';
import { createRng } from '../core/rng';

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

/**
 * Worn city asphalt: grain, patched repairs, cracks, oil stains and faded tyre lines. No lane markings:
 * this is a street, not a highway. U across the road (0..1), V along it (one tile = 16 m).
 */
export function makeRoadTexture(): CanvasTexture {
  const rnd = createRng(99);
  const [c, g] = canvas(512, 1024);
  g.fillStyle = '#1a1b21';
  g.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 26000; i++) {
    const v = 18 + rnd() * 30;
    g.fillStyle = `rgba(${v},${v},${v + 5},0.55)`;
    g.fillRect(rnd() * 512, rnd() * 1024, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  for (let i = 0; i < 14; i++) { // repaired patches: slightly different tone, hard edges
    const v = 14 + rnd() * 16;
    g.fillStyle = `rgb(${v},${v},${v + 4})`;
    g.fillRect(rnd() * 440, rnd() * 960, 40 + rnd() * 120, 30 + rnd() * 110);
  }
  g.strokeStyle = 'rgba(0,0,0,0.6)';
  g.lineWidth = 1.2;
  for (let i = 0; i < 40; i++) { // cracks
    let x = rnd() * 512;
    let y = rnd() * 1024;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 8; k++) {
      x += (rnd() - 0.5) * 30;
      y += rnd() * 26;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 10; i++) { // oil stains
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 40);
    gr.addColorStop(0, 'rgba(6,6,10,0.7)');
    gr.addColorStop(1, 'rgba(6,6,10,0)');
    g.save();
    g.translate(60 + rnd() * 390, rnd() * 1024);
    g.scale(1, 1.8);
    g.fillStyle = gr;
    g.fillRect(-40, -40, 80, 80);
    g.restore();
  }
  g.fillStyle = 'rgba(0,0,0,0.25)'; // two faded wheel tracks
  g.fillRect(150, 0, 34, 1024);
  g.fillRect(328, 0, 34, 1024);
  return finish(c, true);
}

/** Window grid for building facades. `warm` picks the lit-window tint. One tile = 8 x 8 windows. */
export function makeWindowTexture(warm: boolean): CanvasTexture {
  const rnd = createRng(warm ? 3 : 4);
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#05060a';
  g.fillRect(0, 0, 128, 128);
  const tints = warm ? ['#ffd890', '#ffb060', '#fff0c0'] : ['#8fd8ff', '#c0a0ff', '#ffffff'];
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      if (rnd() < 0.5) continue;
      g.fillStyle = tints[Math.floor(rnd() * tints.length)];
      g.globalAlpha = 0.5 + rnd() * 0.5;
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

/** Soft rounded dark patch for the contact shadow under a car. */
export function makeShadowTexture(): CanvasTexture {
  const [c, g] = canvas(128, 128);
  const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,0.85)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.5)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.minFilter = LinearFilter;
  return t;
}

/** Third window style: mostly dark with a few neon-coloured rooms and bright office floors, for skyline variety. */
export function makeNeonWindowTexture(): CanvasTexture {
  const rnd = createRng(8);
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#04050a';
  g.fillRect(0, 0, 128, 128);
  const tints = ['#ff2a9d', '#18d8ff', '#7a5cff', '#39ff88', '#ffb347'];
  for (let y = 0; y < 8; y++) {
    const floorLit = rnd() < 0.2; // whole office floor lit white
    for (let x = 0; x < 8; x++) {
      const r = rnd();
      if (!floorLit && r < 0.7) continue;
      g.fillStyle = floorLit ? '#e8f0ff' : tints[Math.floor(rnd() * tints.length)];
      g.globalAlpha = floorLit ? 0.8 : 0.9;
      g.fillRect(x * 16 + 2, y * 16 + 3, 12, 9);
    }
  }
  return finish(c, true);
}

/** Fine random speckle used as a bump map: the metallic flake in the paint. */
export function flakeTexture(): CanvasTexture {
  const rnd = createRng(555);
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2600; i++) {
    const v = 90 + Math.floor(rnd() * 90);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(rnd() * 128, rnd() * 128, 1 + rnd() * 1.4, 1 + rnd() * 1.4);
  }
  return finish(c, false);
}
