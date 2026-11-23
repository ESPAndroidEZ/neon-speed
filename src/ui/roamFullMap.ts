import type { RoadGraph } from '../types/world';
import type { Route } from '../core/route';
import { DISTRICTS } from '../types/world';
import { districtAt, isWater } from '../data/world/districtMap';
import { t } from '../i18n';
import { button, h } from './uiKit';
import { injectRoamCss } from './roamCss';

export type MarkerKind = 'race' | 'trap' | 'zone' | 'meet' | 'token' | 'job';
export interface Marker { x: number; z: number; k: MarkerKind }
/** What the minimap owns and the full map reads. */
export interface MapState { px: number; pz: number; ph: number; wx: number; wz: number; route: Route | null; markers: () => readonly Marker[] }

export const ROAD_COL: Readonly<Record<string, string>> = { highway: '#8fa8d8', bridge: '#8fa8d8', avenue: '#cfd6e6', runway: '#5a6070' };
const MK: Record<MarkerKind, string> = { race: '#ffd27d', trap: '#ff5470', zone: '#7dff9a', meet: '#ff2a9d', token: '#18d8ff', job: '#ffffff' };
const KEYS: MarkerKind[] = ['race', 'zone', 'trap', 'meet', 'token'];
const SIZE = 1024, BASE = 2048;

export interface FullMap { open(): void; close(): void; readonly isOpen: boolean }

/**
 * Full map: north up, the city drawn once, then districts, markers, GPS route, waypoint and the player's arrow redrawn
 * live (8 Hz) while open. Tap sets a waypoint (tap on it again clears it); Zoom centres on the car.
 */
export function fullMap(g: RoadGraph, s: MapState, pick: (x: number, z: number) => void, clear: () => void, onClose: () => void): FullMap {
  injectRoamCss();
  const layer = h('div', 'rb-layer dim rb-fmap');
  const cv = document.createElement('canvas');
  cv.width = cv.height = SIZE;
  const cx = cv.getContext('2d') as CanvasRenderingContext2D;
  let base: HTMLCanvasElement | null = null, timer = 0, zoom = 1, labels: { id: string; x: number; z: number }[] | null = null;
  const W = g.half * 2;
  const bx = (v: number): number => ((v + g.half) / W) * BASE, bz = (v: number): number => ((g.half - v) / W) * BASE; // +Z is north = up

  const drawBase = (): HTMLCanvasElement => {
    const c = document.createElement('canvas');
    c.width = c.height = BASE;
    const x = c.getContext('2d') as CanvasRenderingContext2D;
    x.fillStyle = '#0b0f18'; x.fillRect(0, 0, BASE, BASE);
    x.fillStyle = '#0a2447';
    for (let a = -g.half; a < g.half; a += 64) for (let b = -g.half; b < g.half; b += 64) if (isWater(a + 32, b + 32)) x.fillRect(bx(a), bz(b + 64), BASE * 64 / W + 1, BASE * 64 / W + 1);
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (const e of g.edges) {
      x.strokeStyle = ROAD_COL[e.kind] ?? '#6a7286'; x.lineWidth = Math.max(1.5, (e.width / W) * BASE * 1.8);
      x.beginPath();
      for (let i = 0; i < e.cum.length; i++) (i ? x.lineTo : x.moveTo).call(x, bx(e.pts[i * 2]), bz(e.pts[i * 2 + 1]));
      x.stroke();
    }
    return c;
  };
  const centroids = (): { id: string; x: number; z: number }[] => {
    const acc = new Map<string, [number, number, number]>();
    for (let a = -g.half + 64; a < g.half; a += 128) for (let b = -g.half + 64; b < g.half; b += 128) {
      const id = districtAt(a, b), v = acc.get(id) ?? [0, 0, 0];
      v[0] += a; v[1] += b; v[2]++; acc.set(id, v);
    }
    return DISTRICTS.filter((d) => acc.has(d)).map((id) => { const v = acc.get(id) as [number, number, number]; return { id, x: v[0] / v[2], z: v[1] / v[2] }; });
  };

  const draw = (): void => {
    base ??= drawBase();
    labels ??= centroids();
    const vs = BASE / zoom; // source square in base pixels
    const sx = zoom === 1 ? 0 : Math.max(0, Math.min(BASE - vs, bx(s.px) - vs / 2)), sz = zoom === 1 ? 0 : Math.max(0, Math.min(BASE - vs, bz(s.pz) - vs / 2));
    const k = SIZE / vs;
    const X = (v: number): number => (bx(v) - sx) * k, Z = (v: number): number => (bz(v) - sz) * k;
    cx.drawImage(base, sx, sz, vs, vs, 0, 0, SIZE, SIZE);
    cx.font = '600 22px system-ui,sans-serif'; cx.textAlign = 'center'; cx.fillStyle = '#e8f6ff66';
    for (const d of labels) cx.fillText(t(`district.${d.id}` as 'district.bay').toUpperCase(), X(d.x), Z(d.z));
    if (s.route) {
      cx.strokeStyle = '#18d8ff'; cx.lineWidth = 6; cx.lineCap = 'round';
      for (const id of s.route.edges) { const e = g.edges[id]; cx.beginPath(); for (let i = 0; i < e.cum.length; i++) (i ? cx.lineTo : cx.moveTo).call(cx, X(e.pts[i * 2]), Z(e.pts[i * 2 + 1])); cx.stroke(); }
    }
    for (const m of s.markers()) {
      const x = X(m.x), z = Z(m.z);
      if (x < 0 || z < 0 || x > SIZE || z > SIZE) continue;
      cx.fillStyle = MK[m.k]; cx.strokeStyle = '#05060d'; cx.lineWidth = 2;
      cx.beginPath(); cx.arc(x, z, m.k === 'token' ? 6 : 10, 0, Math.PI * 2); cx.fill(); cx.stroke();
    }
    if (s.route) { cx.fillStyle = '#ff2a9d'; cx.strokeStyle = '#fff'; cx.lineWidth = 3; cx.beginPath(); cx.arc(X(s.wx), Z(s.wz), 13, 0, Math.PI * 2); cx.fill(); cx.stroke(); }
    cx.save(); cx.translate(X(s.px), Z(s.pz)); cx.rotate(s.ph); // heading 0 = +Z = up; a clockwise turn (+h) points right
    cx.fillStyle = '#fff'; cx.strokeStyle = '#05060d'; cx.lineWidth = 3;
    cx.beginPath(); cx.moveTo(0, -17); cx.lineTo(11, 12); cx.lineTo(0, 6); cx.lineTo(-11, 12); cx.closePath(); cx.fill(); cx.stroke();
    cx.restore();
  };
  cv.addEventListener('pointerdown', (ev) => {
    const r = cv.getBoundingClientRect(), vs = BASE / zoom;
    const sx = zoom === 1 ? 0 : Math.max(0, Math.min(BASE - vs, bx(s.px) - vs / 2)), sz = zoom === 1 ? 0 : Math.max(0, Math.min(BASE - vs, bz(s.pz) - vs / 2));
    const u = sx + ((ev.clientX - r.left) / r.width) * vs, v = sz + ((ev.clientY - r.top) / r.height) * vs;
    const x = (u / BASE) * W - g.half, z = g.half - (v / BASE) * W;
    if (s.route && Math.hypot(x - s.wx, z - s.wz) < (zoom === 1 ? 160 : 70)) clear(); else pick(x, z);
    draw();
  });
  const zoomBtn = button(t('map.zoomIn'), () => { zoom = zoom === 1 ? 3 : 1; zoomBtn.textContent = t(zoom === 1 ? 'map.zoomIn' : 'map.zoomOut'); draw(); });
  const key = h('div', 'rb-key');
  for (const k of KEYS) { const i = document.createElement('i'); i.style.background = MK[k]; key.append(i, h('span', '', t(`map.${k}` as 'map.race'))); }
  const side = h('div', 'rb-side');
  side.append(h('h2', 'rb-title', t('roam.map')), h('div', 'rb-sub', t('roam.mapHint')), key, zoomBtn, button(t('roam.clear'), () => { clear(); draw(); }), button(t('common.back'), () => close(), 'hot'));
  layer.append(cv, side);
  document.body.appendChild(layer);
  const onKey = (e: KeyboardEvent): void => { if (e.code === 'KeyM' || e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  let isOpen = false;
  function close(): void {
    if (!isOpen) return;
    isOpen = false; layer.style.display = 'none'; clearInterval(timer);
    window.removeEventListener('keydown', onKey, true);
    onClose();
  }
  return {
    get isOpen() { return isOpen; },
    open: () => { isOpen = true; layer.style.display = 'flex'; draw(); timer = window.setInterval(draw, 125); window.addEventListener('keydown', onKey, true); },
    close,
  };
}
