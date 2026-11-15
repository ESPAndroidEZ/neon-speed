import { TAU } from '../core/math';
import type { CarState, Disposable, TrackSample } from '../types/game';

const CSS = `
#minimap{position:fixed;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));width:calc(clamp(120px,18vw,190px) * var(--rb-map-scale,1));height:calc(clamp(120px,18vw,190px) * var(--rb-map-scale,1));pointer-events:none;background:rgba(8,14,26,.55);border-radius:12px;box-shadow:0 0 0 1px rgba(24,216,255,.28),0 8px 24px rgba(0,0,0,.45);z-index:5}
@media (pointer:coarse){#minimap{left:auto;right:max(14px,env(safe-area-inset-right));bottom:auto;top:calc(max(14px,env(safe-area-inset-top)) + 84px);width:calc(clamp(84px,15vmin,130px) * var(--rb-map-scale,1));height:calc(clamp(84px,15vmin,130px) * var(--rb-map-scale,1))}}
`;

/** A 2d context or throw; returning a non-null type so it is usable inside closures. */
function get2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const g = c.getContext('2d');
  if (!g) throw new Error('2d canvas unavailable');
  return g;
}

/** Bottom-left radar: a static track outline (cached offscreen) plus a live dot per racer. */
export interface Minimap extends Disposable {
  /** Call once per display frame. `racers[playerIndex]` is drawn bigger and in magenta. */
  update(racers: readonly CarState[], playerIndex: number): void;
  setVisible(v: boolean): void;
}

export function createMinimap(parent: HTMLElement, track: readonly TrackSample[]): Minimap {
  const canvas = document.createElement('canvas');
  canvas.id = 'minimap';
  const style = document.createElement('style');
  style.textContent = CSS;
  parent.appendChild(style);
  parent.appendChild(canvas);

  const ctx = get2d(canvas);
  const off = document.createElement('canvas');
  const octx = get2d(off);

  // World-space bounding box of the centre line (metres).
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const s of track) {
    const p = s.position;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  const worldW = Math.max(1, maxX - minX);
  const worldH = Math.max(1, maxZ - minZ);

  let visible = true;
  let cssSize = 0;
  let dpr = 1;
  let scale = 1;
  let offX = 0;
  let offZ = 0;

  /** Rasterise the (static) track path + start line into the offscreen cache at size `w`. */
  function renderOutline(w: number): void {
    const content = w * 0.8; // 10% padding on every side
    scale = Math.min(content / worldW, content / worldH);
    offX = (w - worldW * scale) / 2;
    offZ = (w - worldH * scale) / 2;
    octx.clearRect(0, 0, w, w);
    if (track.length === 0) return;
    octx.lineJoin = 'round';
    octx.lineWidth = 3;
    octx.strokeStyle = 'rgba(24,216,255,0.7)';
    octx.beginPath();
    for (let i = 0; i < track.length; i++) {
      const p = track[i].position;
      const x = offX + (p.x - minX) * scale;
      const y = offZ + (p.z - minZ) * scale;
      if (i === 0) octx.moveTo(x, y);
      else octx.lineTo(x, y);
    }
    octx.closePath();
    octx.stroke();
    // Start line: a short white bar across the road at sample 0 (perpendicular to travel).
    const s0 = track[0];
    const perpX = -s0.tangent.z;
    const perpZ = s0.tangent.x;
    const half = s0.width / 2;
    octx.lineWidth = 3;
    octx.strokeStyle = '#ffffff';
    octx.beginPath();
    octx.moveTo(offX + (s0.position.x + perpX * half - minX) * scale, offZ + (s0.position.z + perpZ * half - minZ) * scale);
    octx.lineTo(offX + (s0.position.x - perpX * half - minX) * scale, offZ + (s0.position.z - perpZ * half - minZ) * scale);
    octx.stroke();
  }

  /** Match the backing store to the CSS size * dpr, then re-render the outline. */
  function layout(): void {
    const w = canvas.getBoundingClientRect().width || cssSize || 120;
    cssSize = w;
    dpr = window.devicePixelRatio || 1;
    const px = Math.max(1, Math.round(w * dpr));
    if (canvas.width !== px || canvas.height !== px) {
      canvas.width = px;
      canvas.height = px;
      off.width = px;
      off.height = px;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderOutline(w);
  }

  function onResize(): void {
    layout();
  }
  window.addEventListener('resize', onResize);
  layout();

  return {
    update(racers: readonly CarState[], playerIndex: number): void {
      if (!visible) return;
      ctx.clearRect(0, 0, cssSize, cssSize);
      ctx.drawImage(off, 0, 0, cssSize, cssSize);
      for (let i = 0; i < racers.length; i++) {
        const p = racers[i].position;
        const player = i === playerIndex;
        ctx.beginPath();
        ctx.arc(offX + (p.x - minX) * scale, offZ + (p.z - minZ) * scale, player ? 5 : 3, 0, TAU);
        ctx.fillStyle = player ? '#ff2a9d' : '#ffffff';
        ctx.fill();
      }
    },
    setVisible(v: boolean): void {
      visible = v;
      canvas.style.display = v ? '' : 'none';
      if (v) layout();
    },
    dispose(): void {
      window.removeEventListener('resize', onResize);
      canvas.remove();
      style.remove();
    },
  };
}
