import { lookOf, type Look } from '../data/characters';
import type { Mood } from '../data/story';

const css = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;
const shade = (c: number, k: number): string => css((Math.min(255, ((c >> 16) & 255) * k) << 16) | (Math.min(255, ((c >> 8) & 255) * k) << 8) | Math.min(255, (c & 255) * k));

/** Draw hair behind (`back`) or in front of (`front`) the face. */
function hair(g: CanvasRenderingContext2D, l: Look, s: number, back: boolean): void {
  g.fillStyle = css(l.hair);
  const cx = s / 2;
  switch (l.hairStyle) {
    case 'long':
      if (back) g.fillRect(cx - s * 0.3, s * 0.2, s * 0.6, s * 0.62);
      else { g.beginPath(); g.ellipse(cx, s * 0.3, s * 0.27, s * 0.17, 0, Math.PI, 0); g.fill(); }
      break;
    case 'bun':
      if (back) { g.beginPath(); g.arc(cx, s * 0.11, s * 0.09, 0, 7); g.fill(); } else { g.beginPath(); g.ellipse(cx, s * 0.3, s * 0.27, s * 0.17, 0, Math.PI, 0); g.fill(); }
      break;
    case 'spiky':
      if (!back) { g.beginPath(); g.moveTo(cx - s * 0.27, s * 0.34); for (let i = 0; i < 6; i++) { g.lineTo(cx - s * 0.27 + (i + 0.5) * s * 0.09, s * 0.1); g.lineTo(cx - s * 0.27 + (i + 1) * s * 0.09, s * 0.3); } g.fill(); }
      break;
    case 'mohawk':
      if (!back) g.fillRect(cx - s * 0.05, s * 0.07, s * 0.1, s * 0.27);
      break;
    case 'slick':
      if (!back) { g.beginPath(); g.ellipse(cx, s * 0.3, s * 0.27, s * 0.16, 0, Math.PI, 0); g.fill(); }
      break;
    case 'cap':
      if (!back) { g.fillStyle = css(l.accent); g.beginPath(); g.ellipse(cx, s * 0.3, s * 0.28, s * 0.16, 0, Math.PI, 0); g.fill(); g.fillRect(cx - s * 0.05, s * 0.28, s * 0.36, s * 0.04); }
      break;
    case 'bald':
      break;
    default:
      if (!back) { g.beginPath(); g.ellipse(cx, s * 0.31, s * 0.27, s * 0.15, 0, Math.PI, 0); g.fill(); }
  }
}

/**
 * A stylised portrait drawn with canvas shapes: head, hair, outfit, accessory and one of four expressions.
 * No assets. `size` is in CSS pixels; call again with another mood to redraw.
 */
export function drawPortrait(canvas: HTMLCanvasElement, id: string, mood: Mood = 'neutral'): void {
  const l = lookOf(id);
  const s = canvas.width;
  const g = canvas.getContext('2d');
  if (!g) return;
  const cx = s / 2;
  g.clearRect(0, 0, s, s);
  const bg = g.createRadialGradient(cx, s * 0.4, s * 0.05, cx, s * 0.5, s * 0.75);
  bg.addColorStop(0, shade(l.accent, 0.55));
  bg.addColorStop(1, '#0a0d1c');
  g.fillStyle = bg;
  g.fillRect(0, 0, s, s);
  hair(g, l, s, true);
  // shoulders and collar
  const w = l.build === 'heavy' ? 0.46 : l.build === 'slim' ? 0.34 : 0.4;
  g.fillStyle = css(l.outfit);
  g.beginPath();
  g.ellipse(cx, s * 1.02, s * w, s * 0.28, 0, Math.PI, 0);
  g.fill();
  g.fillStyle = css(l.accent);
  g.fillRect(cx - s * 0.04, s * 0.78, s * 0.08, s * 0.2);
  // neck and head
  g.fillStyle = shade(l.skin, 0.88);
  g.fillRect(cx - s * 0.07, s * 0.62, s * 0.14, s * 0.18);
  g.fillStyle = css(l.skin);
  g.beginPath();
  g.ellipse(cx, s * 0.45, s * 0.22 + (l.build === 'heavy' ? s * 0.03 : 0), s * 0.27, 0, 0, 7);
  g.fill();
  hair(g, l, s, false);
  // eyes and brows by mood
  const ey = s * 0.44;
  const ex = s * 0.09;
  // brows: [inner end, outer end] vertical offsets (fractions of the portrait); + is lower
  const BROW = { neutral: [0, 0], smirk: [0.004, -0.012], angry: [0.028, -0.008], worried: [-0.03, 0.012] }[mood];
  g.strokeStyle = shade(l.hair, 0.8);
  g.lineWidth = s * 0.02;
  for (const side of [-1, 1]) {
    const lift = mood === 'smirk' && side > 0 ? -0.025 : 0; // one raised brow
    g.beginPath();
    g.moveTo(cx + side * (ex - s * 0.045), ey - s * (0.07 - BROW[0] - lift));
    g.lineTo(cx + side * (ex + s * 0.06), ey - s * (0.07 - BROW[1] - lift));
    g.stroke();
  }
  const shades = l.accessory === 'shades';
  if (!shades) {
    g.fillStyle = '#10121a';
    for (const side of [-1, 1]) {
      g.beginPath();
      g.ellipse(cx + side * ex, ey, s * 0.028, s * (mood === 'smirk' ? 0.022 : mood === 'angry' ? 0.02 : 0.032), 0, 0, 7);
      g.fill();
    }
  } else {
    g.fillStyle = '#0b0d14';
    g.fillRect(cx - s * 0.19, ey - s * 0.03, s * 0.38, s * 0.06);
    g.fillStyle = css(l.accent);
    g.fillRect(cx - s * 0.18, ey - s * 0.01, s * 0.36, s * 0.012);
  }
  // mouth
  g.strokeStyle = '#3a1c16';
  g.lineWidth = s * 0.016;
  g.beginPath();
  const my = s * 0.58;
  if (mood === 'smirk') { g.moveTo(cx - s * 0.07, my + s * 0.01); g.quadraticCurveTo(cx + s * 0.02, my + s * 0.03, cx + s * 0.09, my - s * 0.02); }
  else if (mood === 'angry') { g.moveTo(cx - s * 0.07, my + s * 0.015); g.lineTo(cx + s * 0.07, my + s * 0.015); }
  else if (mood === 'worried') { g.moveTo(cx - s * 0.06, my + s * 0.025); g.quadraticCurveTo(cx, my - s * 0.015, cx + s * 0.06, my + s * 0.025); }
  else { g.moveTo(cx - s * 0.055, my); g.quadraticCurveTo(cx, my + s * 0.02, cx + s * 0.055, my); }
  g.stroke();
  // accessories
  g.lineWidth = s * 0.014;
  if (l.accessory === 'glasses' || l.accessory === 'goggles') {
    g.strokeStyle = l.accessory === 'goggles' ? css(l.accent) : '#cfd6e6';
    for (const side of [-1, 1]) { g.beginPath(); g.arc(cx + side * ex, ey, s * 0.055, 0, 7); g.stroke(); }
    g.beginPath(); g.moveTo(cx - ex + s * 0.055, ey); g.lineTo(cx + ex - s * 0.055, ey); g.stroke();
  }
  if (l.accessory === 'headphones') { g.strokeStyle = css(l.accent); g.lineWidth = s * 0.03; g.beginPath(); g.arc(cx, s * 0.42, s * 0.27, Math.PI, 0); g.stroke(); g.fillStyle = css(l.accent); for (const side of [-1, 1]) g.fillRect(cx + side * s * 0.27 - s * 0.03, s * 0.4, s * 0.06, s * 0.1); }
  if (l.accessory === 'scar') { g.strokeStyle = '#8a4a3a'; g.beginPath(); g.moveTo(cx + s * 0.1, s * 0.34); g.lineTo(cx + s * 0.15, s * 0.5); g.stroke(); }
  if (l.accessory === 'earring') { g.fillStyle = css(l.accent); g.beginPath(); g.arc(cx - s * 0.22, s * 0.52, s * 0.016, 0, 7); g.fill(); }
  if (l.accessory === 'beanie') { g.fillStyle = css(l.accent); g.beginPath(); g.ellipse(cx, s * 0.3, s * 0.27, s * 0.17, 0, Math.PI, 0); g.fill(); g.fillRect(cx - s * 0.27, s * 0.28, s * 0.54, s * 0.05); }
}

/** A ready-to-insert canvas element with a portrait. */
export function portraitEl(id: string, mood: Mood = 'neutral', size = 64): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size * 2;
  c.height = size * 2;
  c.style.cssText = `width:${size}px;height:${size}px;border-radius:12px;flex:none;border:1px solid #ffffff33`;
  drawPortrait(c, id, mood);
  return c;
}
