import { SIGNS_A } from './signsA';
import { SIGNS_B } from './signsB';
import { BoxGeometry, CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';

/** A shop sign design. Brands are FICTIONAL (docs/art-direction.md): never use a real company name. */
export interface SignSpec {
  text: string;
  sub?: string;
  /** Neon colour of the letters and the tube border. */
  color: string;
  /** Second colour (tube border or icon). */
  alt: string;
  /** 'tube' outlined letters in a rounded frame, 'solid' lit panel with dark letters, 'bar' stripe with a small icon. */
  style: 'tube' | 'solid' | 'bar';
  icon?: 'bowl' | 'bolt' | 'scissors' | 'star' | 'ring' | 'cup';
}

export const SIGNS: readonly SignSpec[] = [
  { text: 'KAIJU RAMEN', sub: 'OPEN LATE', color: '#ff2a9d', alt: '#18d8ff', style: 'tube', icon: 'bowl' },
  { text: 'VOLT 24', sub: 'CONVENIENCE', color: '#18d8ff', alt: '#ffffff', style: 'solid', icon: 'bolt' },
  { text: 'NOVA CUTS', sub: 'BARBER', color: '#ffb347', alt: '#ff2a9d', style: 'tube', icon: 'scissors' },
  { text: 'PIXEL ARCADE', sub: 'INSERT COIN', color: '#7a5cff', alt: '#39ff88', style: 'tube', icon: 'star' },
  { text: 'BLUE LOTUS', sub: 'TEA HOUSE', color: '#39ff88', alt: '#18d8ff', style: 'bar', icon: 'cup' },
  { text: 'HEXA MOTORS', sub: 'TUNING', color: '#ff9a2e', alt: '#ffffff', style: 'solid', icon: 'ring' },
  { text: 'DRIP', sub: 'COFFEE + NOODLES', color: '#ff4fa3', alt: '#ffd27d', style: 'bar', icon: 'cup' },
  { text: 'OCTO BAR', sub: 'LIVE DJ', color: '#c8f4ff', alt: '#ff2a9d', style: 'tube', icon: 'ring' },
  ...SIGNS_A,
  ...SIGNS_B,
];

const CELL_W = 256;
const CELL_H = 128;
const COLS = 4;

function icon(g: CanvasRenderingContext2D, kind: NonNullable<SignSpec['icon']>, x: number, y: number, s: number): void {
  g.beginPath();
  if (kind === 'bowl') { g.arc(x, y - s * 0.1, s * 0.5, 0, Math.PI); g.moveTo(x - s * 0.6, y - s * 0.1); g.lineTo(x + s * 0.6, y - s * 0.1); }
  else if (kind === 'bolt') { g.moveTo(x + s * 0.2, y - s * 0.55); g.lineTo(x - s * 0.3, y + s * 0.05); g.lineTo(x, y + s * 0.05); g.lineTo(x - s * 0.2, y + s * 0.55); g.lineTo(x + s * 0.3, y - s * 0.1); g.lineTo(x, y - s * 0.1); g.closePath(); }
  else if (kind === 'scissors') { g.arc(x - s * 0.3, y + s * 0.3, s * 0.18, 0, 7); g.moveTo(x + s * 0.48, y + s * 0.3); g.arc(x + s * 0.3, y + s * 0.3, s * 0.18, 0, 7); g.moveTo(x - s * 0.25, y + s * 0.15); g.lineTo(x + s * 0.3, y - s * 0.5); g.moveTo(x + s * 0.25, y + s * 0.15); g.lineTo(x - s * 0.3, y - s * 0.5); }
  else if (kind === 'star') { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? s * 0.22 : s * 0.5; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
  else if (kind === 'ring') { g.arc(x, y, s * 0.42, 0, 7); g.moveTo(x + s * 0.2, y); g.arc(x, y, s * 0.2, 0, 7); }
  else { g.rect(x - s * 0.35, y - s * 0.3, s * 0.6, s * 0.6); g.moveTo(x + s * 0.25, y - s * 0.1); g.arc(x + s * 0.3, y, s * 0.2, -1.2, 1.2); }
}

/** One sign painted into its cell of the atlas: dark panel, neon letters with glow, a tube frame or solid fill, an icon. */
function paint(g: CanvasRenderingContext2D, s: SignSpec, ox: number, oy: number): void {
  g.save();
  g.translate(ox, oy);
  g.fillStyle = s.style === 'solid' ? s.color : '#07080f';
  g.fillRect(4, 4, CELL_W - 8, CELL_H - 8);
  g.lineWidth = 5;
  g.lineJoin = 'round';
  g.shadowBlur = s.style === 'solid' ? 0 : 14;
  g.shadowColor = s.color;
  g.strokeStyle = s.style === 'solid' ? '#07080f' : s.alt;
  g.strokeRect(12, 12, CELL_W - 24, CELL_H - 24);
  if (s.style === 'bar') { g.fillStyle = s.alt; g.fillRect(12, CELL_H - 30, CELL_W - 24, 6); }
  g.fillStyle = s.style === 'solid' ? '#07080f' : s.color;
  g.strokeStyle = s.color;
  g.font = `900 ${s.text.length > 9 ? 27 : 38}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (s.style === 'tube') { g.lineWidth = 2.5; g.strokeText(s.text, CELL_W / 2 + (s.icon ? 14 : 0), 54); } else g.fillText(s.text, CELL_W / 2 + (s.icon ? 14 : 0), 54);
  g.font = '700 14px system-ui, sans-serif';
  g.shadowBlur = 6;
  g.fillStyle = s.style === 'solid' ? '#07080f' : s.alt;
  if (s.sub) g.fillText(s.sub, CELL_W / 2, 92);
  if (s.icon) { g.lineWidth = 3; g.strokeStyle = s.style === 'solid' ? '#07080f' : s.alt; icon(g, s.icon, 34, 54, 34); g.stroke(); }
  g.restore();
}

/** Atlas of every `SIGNS` design (4 x 2 cells of 256 x 128). Reference implementation of a sign texture: copy `paint` for new designs. */
export function makeSignAtlas(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = CELL_W * COLS;
  c.height = CELL_H * Math.ceil(SIGNS.length / COLS);
  const g = c.getContext('2d');
  if (g) SIGNS.forEach((s, i) => paint(g, s, (i % COLS) * CELL_W, Math.floor(i / COLS) * CELL_H));
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.minFilter = LinearFilter;
  t.anisotropy = 4;
  return t;
}

/** A thin box whose UVs show only atlas cell `k` (all faces), so each design is its own instanced mesh. */
export function signGeometry(k: number): BoxGeometry {
  const geo = new BoxGeometry(1, 1, 0.2);
  const rows = Math.ceil(SIGNS.length / COLS);
  const u0 = (k % COLS) / COLS;
  const v0 = 1 - (Math.floor(k / COLS) + 1) / rows;
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) / COLS, v0 + uv.getY(i) / rows);
  return geo;
}
