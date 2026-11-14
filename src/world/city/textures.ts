import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three';
import { createRng } from '../../core/rng';

export type FacadeKind = 'brick' | 'concrete' | 'metal' | 'glass';

/** The four maps of a PBR-style facade sheet. One tile is 16 m x 16 m: 5 floors by 5 window bays. */
export interface FacadeSheet {
  map: CanvasTexture;
  emissiveMap: CanvasTexture;
  normalMap: CanvasTexture;
  roughnessMap: CanvasTexture;
}

const N = 512;
const COLS = 5;
const ROWS = 5;
const LIT: Record<FacadeKind, readonly number[]> = {
  brick: [0xffc070, 0xffb050, 0xffd9a0, 0xff9a2e],
  concrete: [0xffc070, 0x6fe0ff, 0xff7ac0, 0xffd9a0],
  metal: [0xffb050, 0xff9a2e, 0xffd9a0, 0xffe8c0],
  glass: [0xff2a9d, 0x18d8ff, 0x7a5cff, 0xc8f4ff, 0xffe8c0],
};

const tex = (c: HTMLCanvasElement, srgb: boolean): CanvasTexture => {
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  t.anisotropy = 4;
  return t;
};
const canvas = (): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = c.height = N;
  return c;
};
const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** Height field to a tangent-space normal map (central differences, `k` is the bump strength). */
function normalFrom(height: Float32Array, k: number): HTMLCanvasElement {
  const c = canvas();
  const g = c.getContext('2d');
  if (!g) return c;
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = height[y * N + ((x + 1) % N)] - height[y * N + ((x + N - 1) % N)];
      const dy = height[((y + 1) % N) * N + x] - height[((y + N - 1) % N) * N + x];
      const l = Math.hypot(dx * k, dy * k, 1);
      const i = (y * N + x) * 4;
      img.data[i] = (-dx * k / l * 0.5 + 0.5) * 255;
      img.data[i + 1] = (dy * k / l * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/**
 * Procedural facade sheet: wall material (brick courses, board-marked concrete, corrugated metal or curtain glass), a grid of
 * windows with frames, sills and lit/unlit variety, and matching roughness and normal maps. Deterministic per (kind, seed).
 * Reference implementation of a "canvas texture" for docs/tasks: copy its shape (seeded rng, 512 px, 4 maps) for new sheets.
 */
export function makeFacadeSheet(kind: FacadeKind, seed = 1, baseOverride?: string): FacadeSheet {
  const rnd = createRng(seed * 7919 + kind.length);
  const albedo = canvas();
  const emis = canvas();
  const rough = canvas();
  const a = albedo.getContext('2d');
  const e = emis.getContext('2d');
  const r = rough.getContext('2d');
  const height = new Float32Array(N * N);
  if (!a || !e || !r) return { map: tex(albedo, true), emissiveMap: tex(emis, true), normalMap: tex(canvas(), false), roughnessMap: tex(rough, false) };
  const base = baseOverride ?? { brick: '#9a6a5a', concrete: '#9a9a9c', metal: '#7d8794', glass: '#3a4a5e' }[kind];
  a.fillStyle = base;
  a.fillRect(0, 0, N, N);
  r.fillStyle = kind === 'glass' ? '#3a3a3a' : kind === 'metal' ? '#808080' : '#d8d8d8';
  r.fillRect(0, 0, N, N);
  e.fillStyle = '#000';
  e.fillRect(0, 0, N, N);
  // wall detail per kind: bricks (courses and mortar), concrete (board marks and stains), metal (ribs), glass (mullions)
  if (kind === 'brick') {
    for (let y = 0; y < N; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < N; x += 32) {
      const v = 0.8 + rnd() * 0.4;
      a.fillStyle = `rgb(${Math.min(255, 154 * v)},${Math.min(255, 96 * v)},${Math.min(255, 80 * v)})`;
      a.fillRect(x + 1, y + 1, 30, 14);
      for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 32; xx++) height[((y + yy) % N) * N + ((x + xx + N) % N)] = xx < 1 || yy < 1 || xx > 30 || yy > 14 ? 0 : 0.5 + rnd() * 0.1;
    }
  } else if (kind === 'concrete') {
    for (let y = 0; y < N; y += 64) { a.fillStyle = 'rgba(0,0,0,.12)'; a.fillRect(0, y, N, 2); for (let x = 0; x < N; x++) height[y * N + x] = -0.4; }
    for (let i = 0; i < 160; i++) { a.fillStyle = `rgba(20,24,30,${0.03 + rnd() * 0.07})`; a.fillRect(rnd() * N, rnd() * N * 0.5, 6 + rnd() * 30, 40 + rnd() * 160); }
  } else if (kind === 'metal') {
    for (let x = 0; x < N; x += 12) { a.fillStyle = x % 24 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.18)'; a.fillRect(x, 0, 6, N); for (let y = 0; y < N; y++) for (let xx = 0; xx < 6; xx++) height[y * N + x + xx] = x % 24 ? 0.5 : 0; }
  } else {
    for (let x = 0; x < N; x += N / COLS) { a.fillStyle = '#1a222e'; a.fillRect(x, 0, 4, N); }
    for (let y = 0; y < N; y += N / ROWS) { a.fillStyle = '#1a222e'; a.fillRect(0, y, N, 4); }
  }
  // grit: streaks of grime running down from the sills, brighter at the base of the tile
  for (let i = 0; i < 90; i++) { a.fillStyle = `rgba(10,12,16,${0.04 + rnd() * 0.08})`; a.fillRect(rnd() * N, rnd() * N, 2 + rnd() * 5, 30 + rnd() * 120); }
  // windows
  const cw = N / COLS;
  const ch = N / ROWS;
  const lits = LIT[kind];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * cw + cw * 0.2;
      const y = row * ch + ch * 0.2;
      const w = cw * 0.6;
      const h = ch * 0.56;
      const pane = rnd();
      const on = pane < (kind === 'glass' ? 0.55 : 0.4);
      const c = lits[Math.floor(rnd() * lits.length)];
      a.fillStyle = '#0b0f18';
      a.fillRect(x - 3, y - 3, w + 6, h + 6); // frame
      a.fillStyle = on ? hex(c) : `rgb(${14 + rnd() * 14},${20 + rnd() * 16},${30 + rnd() * 20})`;
      a.fillRect(x, y, w, h);
      a.fillStyle = 'rgba(160,190,230,.16)'; // glass sheen across the unlit panes
      if (!on) { a.beginPath(); a.moveTo(x, y + h); a.lineTo(x + w * 0.5, y); a.lineTo(x + w * 0.7, y); a.lineTo(x + w * 0.2, y + h); a.fill(); }
      a.fillStyle = '#3a3d46';
      a.fillRect(x - 5, y + h + 3, w + 10, 5); // sill
      r.fillStyle = '#262626';
      r.fillRect(x, y, w, h); // glass is glossy
      if (on) {
        const g2 = e.createLinearGradient(0, y, 0, y + h);
        g2.addColorStop(0, hex(c));
        g2.addColorStop(1, hex(c));
        e.fillStyle = g2;
        e.globalAlpha = 0.5 + rnd() * 0.3;
        e.fillRect(x, y, w, h);
        e.globalAlpha = 1;
        if (rnd() < 0.5) { e.fillStyle = 'rgba(0,0,0,.55)'; e.fillRect(x + w * (0.3 + rnd() * 0.3), y, 3, h); } // a curtain edge or a person
      }
      for (let yy = -4; yy < h + 4; yy++) for (let xx = -4; xx < w + 4; xx++) height[Math.floor(y + yy) * N + Math.floor(x + xx)] = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0.7 : -0.8; // frame proud, glass recessed
    }
  }
  return { map: tex(albedo, true), emissiveMap: tex(emis, true), normalMap: tex(normalFrom(height, 2.2), false), roughnessMap: tex(rough, false) };
}

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
