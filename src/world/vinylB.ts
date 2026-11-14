import type { VinylPainter } from './vinylLayer';

export const VINYLS_B: Record<string, VinylPainter> = {
  tiger(g, size, color) {
    g.strokeStyle = color; g.lineWidth = size / 24;
    for (let i = 0; i < 5; i++) {
      const y = size * (i + 0.5) / 5;
      g.beginPath();
      for (let x = 0; x <= size; x += size / 8) {
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y + Math.sin(x / size * Math.PI * 3 + i * 1.2) * size / 12);
      }
      g.stroke();
    }
  },
  wave(g, size, color) {
    g.strokeStyle = color; g.lineWidth = size / 32;
    for (let i = 0; i < 8; i++) {
      const y = size * (i + 0.5) / 8;
      g.beginPath();
      for (let x = 0; x <= size; x += size / 16) {
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y + Math.sin(x / size * Math.PI * 2 + i * 0.8) * size / 16);
      }
      g.stroke();
    }
  },
  shards(g, size, color) {
    g.fillStyle = color;
    const n = 4;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const x = size * c / n, y = size * r / n, s = size / n;
      g.beginPath();
      g.moveTo(x + s * 0.5, y); g.lineTo(x + s, y + s * 0.7); g.lineTo(x + s * 0.2, y + s);
      g.closePath(); g.fill();
    }
  },
  scales(g, size, color) {
    g.strokeStyle = color; g.lineWidth = size / 48;
    const n = 6, r = size / n;
    for (let row = 0; row < n + 1; row++) for (let col = 0; col < n + 1; col++) {
      const cx = col * r + (row % 2 ? r / 2 : 0), cy = row * r;
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI); g.stroke();
    }
  },
  circuit(g, size, color) {
    g.strokeStyle = color; g.lineWidth = size / 48;
    const n = 4;
    for (let i = 0; i < n; i++) {
      const y = size * (i + 0.5) / n, x0 = size * i / n;
      g.beginPath(); g.moveTo(0, y); g.lineTo(x0, y); g.lineTo(x0, y + size / n); g.lineTo(size, y + size / n); g.stroke();
    }
  },
  'speed-lines'(g, size, color) {
    g.strokeStyle = color; g.lineWidth = size / 32;
    for (let i = 0; i < 10; i++) {
      const y = size * (i + 0.5) / 10, len = size * (0.3 + 0.7 * ((i * 7) % 10) / 10);
      g.beginPath(); g.moveTo(size - len, y); g.lineTo(size, y); g.stroke();
    }
  },
  'cross-hatch'(g, size, color) {
    g.strokeStyle = color; g.lineWidth = size / 48;
    const step = size / 8;
    for (let i = -size; i < size * 2; i += step) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + size, size); g.stroke();
      g.beginPath(); g.moveTo(i + size, 0); g.lineTo(i, size); g.stroke();
    }
  },
  stars(g, size, color) {
    g.fillStyle = color;
    const n = 3, r = size / 12;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cx = size * (i + 0.5) / n, cy = size * (j + 0.5) / n;
      g.beginPath();
      for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, d = k % 2 ? r * 0.4 : r; k === 0 ? g.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d) : g.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); }
      g.closePath(); g.fill();
    }
  },
  zigzag(g, size, color) {
    g.strokeStyle = color; g.lineWidth = size / 24;
    const n = 6, seg = size / 8;
    for (let i = 0; i < n; i++) {
      const y = size * (i + 0.5) / n;
      g.beginPath(); g.moveTo(0, y);
      for (let x = seg; x <= size; x += seg) g.lineTo(x, y + (x / seg % 2 ? -1 : 1) * size / 16);
      g.stroke();
    }
  },
  halftone(g, size, color) {
    g.fillStyle = color;
    const n = 8, r = size / n / 3;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cx = size * (i + 0.5) / n, cy = size * (j + 0.5) / n;
      g.beginPath(); g.arc(cx, cy, r * (1 - Math.abs(i - j) / n * 0.5), 0, Math.PI * 2); g.fill();
    }
  },
};
