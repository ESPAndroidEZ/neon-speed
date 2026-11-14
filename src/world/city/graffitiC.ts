import type { GraffitiPainter } from './graffiti';

export const GRAFFITI_C: Record<string, GraffitiPainter> = {
  'city-skyline': (g, w, h, rnd) => {
    g.shadowBlur = 10; g.shadowColor = '#18d8ff';
    g.strokeStyle = '#18d8ff'; g.lineWidth = 2;
    const n = 5 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const bw = w / n, bh = h * (0.3 + rnd() * 0.6), x = i * bw;
      g.fillStyle = '#06070c'; g.fillRect(x, h - bh, bw - 2, bh);
      g.strokeRect(x, h - bh, bw - 2, bh);
      g.fillStyle = '#ffb347'; g.shadowColor = '#ffb347';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++)
        if (rnd() > 0.4) g.fillRect(x + 4 + c * 8, h - bh + 6 + r * 10, 4, 5);
      g.fillStyle = '#06070c'; g.shadowColor = '#18d8ff';
    }
  },
  eye: (g, w, h, _rnd) => {
    g.shadowBlur = 14; g.shadowColor = '#ff2a9d';
    g.strokeStyle = '#ff2a9d'; g.lineWidth = 3;
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.35, h * 0.25, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#7a5cff'; g.shadowColor = '#7a5cff';
    g.beginPath(); g.arc(w / 2, h / 2, h * 0.12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#06070c'; g.shadowColor = '#06070c';
    g.beginPath(); g.arc(w / 2, h / 2, h * 0.06, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ff2a9d'; g.shadowColor = '#ff2a9d'; g.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.3 + i * Math.PI * 0.15;
      g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * w * 0.35, h / 2 + Math.sin(a) * h * 0.25);
      g.lineTo(w / 2 + Math.cos(a) * w * 0.45, h / 2 + Math.sin(a) * h * 0.35); g.stroke();
    }
  },
  robot: (g, w, h, _rnd) => {
    g.shadowBlur = 12; g.shadowColor = '#39ff88';
    g.strokeStyle = '#39ff88'; g.lineWidth = 3;
    g.fillStyle = '#06070c';
    g.fillRect(w * 0.2, h * 0.15, w * 0.6, h * 0.55);
    g.strokeRect(w * 0.2, h * 0.15, w * 0.6, h * 0.55);
    g.fillStyle = '#18d8ff'; g.shadowColor = '#18d8ff';
    g.fillRect(w * 0.3, h * 0.3, w * 0.15, h * 0.12);
    g.fillRect(w * 0.55, h * 0.3, w * 0.15, h * 0.12);
    g.fillStyle = '#ffb347'; g.shadowColor = '#ffb347';
    g.fillRect(w * 0.35, h * 0.55, w * 0.3, h * 0.08);
    g.strokeStyle = '#39ff88'; g.shadowColor = '#39ff88';
    g.beginPath(); g.moveTo(w / 2, h * 0.15); g.lineTo(w / 2, h * 0.05); g.stroke();
    g.beginPath(); g.arc(w / 2, h * 0.04, 4, 0, Math.PI * 2); g.fillStyle = '#ff2a9d'; g.fill();
  },
  flowers: (g, w, h, rnd) => {
    g.shadowBlur = 10; g.shadowColor = '#ff2a9d';
    g.strokeStyle = '#39ff88'; g.lineWidth = 2;
    const cols = ['#ff2a9d', '#18d8ff', '#ffb347', '#7a5cff', '#ffffff'];
    for (let i = 0; i < 5; i++) {
      const x = w * (0.1 + i * 0.2), y = h * (0.3 + rnd() * 0.2);
      g.strokeStyle = '#39ff88'; g.shadowColor = '#39ff88';
      g.beginPath(); g.moveTo(x, h); g.lineTo(x, y); g.stroke();
      g.fillStyle = cols[i]; g.shadowColor = cols[i];
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        g.beginPath(); g.ellipse(x + Math.cos(a) * 8, y + Math.sin(a) * 8, 5, 3, a, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#ffb347'; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
    }
  },
};
