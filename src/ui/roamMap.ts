import type { ChunkInfo, RoadGraph } from '../types/world';
import type { RoamTraffic } from '../physics/roamTraffic';
import type { RoadIndex } from '../world/roads/roadIndex';
import { createRoadHit } from '../world/roads/roadIndex';
import { cellOf, chunkCount } from '../world/open/chunkIndex';
import { findRoute, nearestNode, type Route } from '../core/route';
import { t } from '../i18n';
import { toast } from './uiKit';
import { fullMap, MK, ROAD_COL, type MapState, type Marker } from './roamFullMap';
import { injectRoamCss } from './roamCss';

const VIEW = 640; // metres across the minimap

export interface RoamMap { update(dt: number, x: number, z: number, heading: number, traffic: RoamTraffic): void; open(): void; closeFull(): void; show(on: boolean): void; setMarkers(fn: () => readonly Marker[]): void; readonly fullOpen: boolean; waypoint(x: number, z: number): void; clearWaypoint(): void; readonly route: Route | null }

/** Free Drive minimap (rotates with the car) and full map (tap to set a waypoint; GPS route on both, re-routed when you stray). */
export function roamMap(g: RoadGraph, chunks: readonly ChunkInfo[], roads: RoadIndex, onClose: () => void): RoamMap {
  injectRoamCss();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const mini = document.createElement('canvas');
  mini.width = mini.height = Math.round(150 * dpr);
  mini.className = 'rb-roam-mini';
  document.body.appendChild(mini);
  const mc = mini.getContext('2d') as CanvasRenderingContext2D;
  const n = chunkCount(g), stamp = new Uint32Array(g.edges.length), onRoute = new Uint8Array(g.edges.length);
  let frame = 1, acc = 0, stray = 0, route: Route | null = null, wx = 0, wz = 0, px = 0, pz = 0, ph = 0;
  const hit = createRoadHit();

  const setRoute = (r: Route | null): void => {
    st.route = r;
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
    const near = (m: Marker): boolean => Math.abs(m.x - px) < VIEW / 2 && Math.abs(m.z - pz) < VIEW / 2;
    for (const m of st.markers()) if (m.k !== 'token' && m.k !== 'storyLock' && near(m)) { mc.fillStyle = MK[m.k]; mc.beginPath(); mc.arc(m.x, m.z, m.k === 'story' ? 24 : 16, 0, Math.PI * 2); mc.fill(); }
    if (route) { mc.fillStyle = '#ff2a9d'; mc.beginPath(); mc.arc(wx, wz, 16, 0, Math.PI * 2); mc.fill(); }
    mc.restore();
    mc.fillStyle = '#e8f6ffcc'; mc.font = `700 ${11 * dpr}px system-ui`; mc.textAlign = 'center'; // N marker: where north is
    const nr = s / 2 - 10 * dpr; // north (+Z) after the heading rotation points to (sin h, -cos h)
    mc.fillText('N', s / 2 + Math.sin(ph) * nr, s / 2 - Math.cos(ph) * nr + 4 * dpr);
    mc.fillStyle = '#ff2a9d'; // the player: an arrow pointing up
    mc.beginPath(); mc.moveTo(s / 2, s / 2 - 9 * dpr); mc.lineTo(s / 2 + 6 * dpr, s / 2 + 7 * dpr); mc.lineTo(s / 2 - 6 * dpr, s / 2 + 7 * dpr); mc.fill();
  };

  const st: MapState = { px: 0, pz: 0, ph: 0, wx: 0, wz: 0, route: null, markers: () => [] };
  const pick = (x: number, z: number): void => { wx = st.wx = x; wz = st.wz = z; plan(); };
  const clear = (): void => setRoute(null);
  const full = fullMap(g, st, pick, clear, onClose);

  return {
    get route() { return route; },
    waypoint: pick,
    setMarkers: (fn) => { st.markers = fn; },
    get fullOpen() { return full.isOpen; },
    clearWaypoint: () => setRoute(null),
    show: (on) => { mini.style.display = on ? 'block' : 'none'; if (!on) full.close(); },
    open: () => full.open(),
    closeFull: () => full.close(),
    update: (dt, x, z, heading, traffic) => {
      px = st.px = x; pz = st.pz = z; ph = st.ph = heading;
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
