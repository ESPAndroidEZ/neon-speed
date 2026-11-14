import { EVENTS } from '../data/story';

/** Draw a stylised red hand (palm, thumb and four fingers) centred at (x, y); `s` is the palm height in pixels. */
export function drawHandprint(g: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number, color: string, alpha = 1): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.globalAlpha = alpha;
  g.fillStyle = color;
  const el = (cx: number, cy: number, rx: number, ry: number, r = 0): void => {
    g.beginPath();
    g.ellipse(cx * s, cy * s, rx * s, ry * s, r, 0, Math.PI * 2);
    g.fill();
  };
  el(0, 0.1, 0.3, 0.34); // palm
  el(-0.17, -0.42, 0.065, 0.24, -0.15); // fingers, little to index
  el(-0.06, -0.52, 0.065, 0.28, -0.04);
  el(0.06, -0.52, 0.065, 0.28, 0.04);
  el(0.17, -0.42, 0.065, 0.24, 0.15);
  el(0.36, 0.0, 0.075, 0.2, 1.05); // thumb
  g.restore();
}

/** Draw the Red Hand Wall: one red handprint per passed event, faint outlines for the rest. */
export function drawWall(canvas: HTMLCanvasElement, passed: number): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const w = canvas.width;
  const hgt = canvas.height;
  g.fillStyle = '#1b1416';
  g.fillRect(0, 0, w, hgt);
  for (let y = 0; y < hgt; y += 24) { // brick courses
    g.fillStyle = y % 48 === 0 ? '#241a1c' : '#20171a';
    for (let x = (y % 48 === 0 ? 0 : -30); x < w; x += 60) g.fillRect(x + 1, y + 1, 58, 22);
  }
  g.fillStyle = '#e8dcd8';
  g.font = `900 ${Math.round(hgt * 0.1)}px system-ui,sans-serif`;
  g.textAlign = 'center';
  g.fillText('EVERY STREET REMEMBERS WHO BLED FOR IT', w / 2, hgt * 0.14);
  const n = EVENTS.length;
  EVENTS.forEach((ev, i) => {
    const x = (w / n) * (i + 0.5);
    const y = hgt * 0.56;
    if (i < passed) {
      drawHandprint(g, x, y, hgt * 0.5, (i - 1.5) * 0.12, '#d4141c');
      drawHandprint(g, x + 3, y + 2, hgt * 0.5, (i - 1.5) * 0.12, '#ff3b3b', 0.35);
    } else drawHandprint(g, x, y, hgt * 0.5, 0, '#ffffff', 0.07);
    g.fillStyle = i < passed ? '#ffd0d0' : '#6a5a5c';
    g.font = `700 ${Math.round(hgt * 0.055)}px system-ui,sans-serif`;
    g.fillText(ev.title, x, hgt * 0.94);
  });
}

