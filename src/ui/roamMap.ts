import type { ChunkInfo, RoadGraph } from '../types/world';
import type { RoamTraffic } from '../physics/roamTraffic';
import type { RoadIndex } from '../world/roads/roadIndex';
import { createRoadHit } from '../world/roads/roadIndex';
import { cellOf, chunkCount } from '../world/open/chunkIndex';
import { findRoute, nearestNode, type Route } from '../core/route';
import { isWater } from '../data/world/districtMap';
import { t } from '../i18n';
import { button, h, toast } from './uiKit';

const VIEW = 640; // metres across the minimap
const ROAD_COL: Readonly<Record<string, string>> = { highway: '#8fa8d8', bridge: '#8fa8d8', avenue: '#cfd6e6', runway: '#5a6070' };

export interface RoamMap { update(dt: number, x: number, z: number, heading: number, traffic: RoamTraffic): void; open(): void; closeFull(): void; show(on: boolean): void; waypoint(x: number, z: number): void; clearWaypoint(): void; readonly route: Route | null }

/** Free Drive minimap (rotates with the car) and full map (tap to set a waypoint; GPS route on both, re-routed when you stray). */
export function roamMap(g: RoadGraph, chunks: readonly ChunkInfo[], roads: RoadIndex, onClose: () => void): RoamMap {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const mini = document.createElement('canvas');
  mini.width = mini.height = Math.round(170 * dpr);
  mini.className = 'rb-roam-mini';
  mini.style.cssText = 'position:fixed;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));width:170px;height:170px;border-radius:50%;z-index:11;display:none;box-shadow:0 0 0 2px #18d8ff55,0 0 18px #0008';
  document.body.appendChild(mini);
  const mc = mini.getContext('2d') as CanvasRenderingContext2D;
  const n = chunkCount(g), stamp = new Uint32Array(g.edges.length), onRoute = new Uint8Array(g.edges.length);
  let frame = 1, acc = 0, stray = 0, route: Route | null = null, wx = 0, wz = 0, px = 0, pz = 0, ph = 0;
  const hit = createRoadHit();

  const setRoute = (r: Route | null): void => {
    if (route) for (const e of route.edges) onRoute[e] = 0;
    route = r;
    if (route) for (const e of route.edges) onRoute[e] = 1;
  };
  const plan = (): void => { const a = nearestNode(g, px, pz), b = nearestNode(g, wx, wz); setRoute(a >= 0 && b >= 0 ? findRoute(g, a, b) : null); };

  const drawMini = (traffic: RoamTraffic): void => {
    const s = mini.width, k = s / VIEW;
    mc.setTransform(1, 0, 0, 1, 0, 0);
    mc.clearRect(0, 0, s, s);
    mc.fillStyle = '#05070fdd';
    mc.beginPath(); mc.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); mc.fill();
    mc.save();
    mc.beginPath(); mc.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2); mc.clip();
    // world -> map: car at the centre, heading up (+Z forward = up on screen, +X left)
    mc.translate(s / 2, s / 2); mc.rotate(ph + Math.PI); mc.scale(k, k); mc.translate(-px, -pz); // forward (sin h, cos h) -> up, car's left -> left
    frame++;
    const cx = cellOf(g, px), cz = cellOf(g, pz);
    for (let z = Math.max(0, cz - 3); z <= Math.min(n - 1, cz + 3); z++) for (let x = Math.max(0, cx - 3); x <= Math.min(n - 1, cx + 3); x++) {
      for (const id of chunks[z * n + x].edges) {
        if (stamp[id] === frame) continue;
        stamp[id] = frame;
        const e = g.edges[id];
        mc.strokeStyle = onRoute[id] ? '#18d8ff' : ROAD_COL[e.kind] ?? '#7a8296';
        mc.lineWidth = onRoute[id] ? Math.max(e.width, 14) : e.width;
        mc.beginPath();
        for (let i = 0; i < e.cum.length; i++) (i ? mc.lineTo : mc.moveTo).call(mc, e.pts[i * 2], e.pts[i * 2 + 1]);
        mc.stroke();
      }
    }
    mc.fillStyle = '#ffffffaa';
    for (let i = 0; i < traffic.agents.length; i++) mc.fillRect(traffic.x[i] - 3, traffic.z[i] - 3, 6, 6);
    if (route) { mc.fillStyle = '#ff2a9d'; mc.beginPath(); mc.arc(wx, wz, 14, 0, Math.PI * 2); mc.fill(); }
    mc.restore();
    mc.fillStyle = '#ff2a9d'; // the player: an arrow pointing up
    mc.beginPath(); mc.moveTo(s / 2, s / 2 - 9 * dpr); mc.lineTo(s / 2 + 6 * dpr, s / 2 + 7 * dpr); mc.lineTo(s / 2 - 6 * dpr, s / 2 + 7 * dpr); mc.fill();
  };

  // full map: the city drawn once, then the player, route and waypoint on top
  let base: HTMLCanvasElement | null = null;
  const layer = h('div', 'rb-layer dim');
  layer.style.cssText += ';display:none;z-index:31';
  const big = document.createElement('canvas');
  big.style.cssText = 'width:min(86vw,74vh);height:min(86vw,74vh);border-radius:10px;touch-action:none;cursor:crosshair';
  const toMap = (v: number, size: number): number => ((v + g.half) / (g.half * 2)) * size;
  const drawBase = (): HTMLCanvasElement => {
    const c = document.createElement('canvas'), S = 1024;
    c.width = c.height = S;
    const x = c.getContext('2d') as CanvasRenderingContext2D;
    x.fillStyle = '#0b0f18'; x.fillRect(0, 0, S, S);
    x.fillStyle = '#081a33';
    for (let a = -g.half; a < g.half; a += 64) for (let b = -g.half; b < g.half; b += 64) if (isWater(a + 32, b + 32)) x.fillRect(toMap(a, S), toMap(b, S), (64 / (2 * g.half)) * S + 1, (64 / (2 * g.half)) * S + 1);
    for (const e of g.edges) {
      x.strokeStyle = ROAD_COL[e.kind] ?? '#6a7286'; x.lineWidth = Math.max(1, (e.width / (2 * g.half)) * S * 1.6);
      x.beginPath();
      for (let i = 0; i < e.cum.length; i++) (i ? x.lineTo : x.moveTo).call(x, toMap(e.pts[i * 2], S), toMap(e.pts[i * 2 + 1], S));
      x.stroke();
    }
    return c;
  };
  const drawBig = (): void => {
    base ??= drawBase();
    const S = big.width = big.height = 1024, x = big.getContext('2d') as CanvasRenderingContext2D;
    x.drawImage(base, 0, 0);
    if (route) {
      x.strokeStyle = '#18d8ff'; x.lineWidth = 5;
      for (const id of route.edges) { const e = g.edges[id]; x.beginPath(); for (let i = 0; i < e.cum.length; i++) (i ? x.lineTo : x.moveTo).call(x, toMap(e.pts[i * 2], S), toMap(e.pts[i * 2 + 1], S)); x.stroke(); }
      x.fillStyle = '#ff2a9d'; x.beginPath(); x.arc(toMap(wx, S), toMap(wz, S), 9, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(toMap(px, S), toMap(pz, S), 7, 0, Math.PI * 2); x.fill();
  };
  big.addEventListener('pointerdown', (ev) => {
    const r = big.getBoundingClientRect();
    wx = ((ev.clientX - r.left) / r.width) * 2 * g.half - g.half;
    wz = ((ev.clientY - r.top) / r.height) * 2 * g.half - g.half;
    plan();
    drawBig();
  });
  const close = (): void => { layer.style.display = 'none'; onClose(); };
  layer.append(h('h2', 'rb-title', t('roam.map')), h('div', 'rb-sub', t('roam.mapHint')), big, button(t('roam.clear'), () => { setRoute(null); drawBig(); }), button(t('common.back'), close, 'hot'));
  document.body.appendChild(layer);

  return {
    get route() { return route; },
    waypoint: (x, z) => { wx = x; wz = z; plan(); },
    clearWaypoint: () => setRoute(null),
    show: (on) => { mini.style.display = on ? 'block' : 'none'; if (!on) layer.style.display = 'none'; },
    open: () => { drawBig(); layer.style.display = 'flex'; },
    closeFull: () => { layer.style.display = 'none'; },
    update: (dt, x, z, heading, traffic) => {
      px = x; pz = z; ph = heading;
      acc += dt;
      if (acc < 0.1) return; // 10 Hz is plenty for a map
      const step = acc;
      acc = 0;
      if (route) {
        if (Math.hypot(x - wx, z - wz) < 30) { setRoute(null); toast(t('roam.arrived')); }
        else {
          roads.nearest(x, z, hit);
          stray = hit.edge >= 0 && onRoute[hit.edge] ? 0 : stray + step;
          if (stray > 2) { stray = 0; plan(); } // left the route for 2 s: plan again from here
        }
      }
      drawMini(traffic);
    },
  };
}
