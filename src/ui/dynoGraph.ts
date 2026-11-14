import type { DynoCurve } from '../physics/dyno';

/**
 * Draws a dyno chart: torque (cyan) and power (magenta) against rpm, with grid, axes, peak markers and the compared curve
 * (the stock car, dashed) when given. Minimal first version: docs/tasks has the polish task (smooth lines, tooltips).
 */
export function drawDyno(c: HTMLCanvasElement, curve: DynoCurve, stock?: DynoCurve): void {
  const g = c.getContext('2d');
  if (!g) return;
  const W = c.width;
  const H = c.height;
  const pad = { l: 38, r: 38, t: 14, b: 26 };
  g.clearRect(0, 0, W, H);
  const maxT = Math.max(...curve.torque, ...(stock?.torque ?? [0])) * 1.1;
  const maxP = Math.max(...curve.power, ...(stock?.power ?? [0])) * 1.1;
  const x = (i: number, cv: DynoCurve): number => pad.l + ((cv.rpm[i] - curve.rpm[0]) / (curve.rpm[curve.rpm.length - 1] - curve.rpm[0])) * (W - pad.l - pad.r);
  const y = (v: number, max: number): number => H - pad.b - (v / max) * (H - pad.t - pad.b);
  g.strokeStyle = '#ffffff1f';
  g.fillStyle = '#e8f6ffa0';
  g.font = '11px system-ui, sans-serif';
  for (let k = 0; k <= 4; k++) {
    const yy = pad.t + (k / 4) * (H - pad.t - pad.b);
    g.beginPath(); g.moveTo(pad.l, yy); g.lineTo(W - pad.r, yy); g.stroke();
    g.fillText(String(Math.round(maxT * (1 - k / 4))), 4, yy + 4);
    g.fillText(String(Math.round(maxP * (1 - k / 4))), W - pad.r + 4, yy + 4);
  }
  for (let k = 0; k < curve.rpm.length; k += 7) g.fillText(`${(curve.rpm[k] / 1000).toFixed(1)}k`, x(k, curve) - 10, H - 8);
  const line = (cv: DynoCurve, vals: number[], max: number, color: string, dash: number[]): void => {
    g.setLineDash(dash);
    g.strokeStyle = color;
    g.lineWidth = dash.length ? 1.5 : 2.5;
    g.beginPath();
    vals.forEach((v, i) => (i ? g.lineTo(x(i, cv), y(v, max)) : g.moveTo(x(i, cv), y(v, max))));
    g.stroke();
    g.setLineDash([]);
  };
  if (stock) { line(stock, stock.torque, maxT, '#18d8ff88', [5, 4]); line(stock, stock.power, maxP, '#ff2a9d88', [5, 4]); }
  line(curve, curve.torque, maxT, '#18d8ff', []);
  line(curve, curve.power, maxP, '#ff2a9d', []);
  g.fillStyle = '#18d8ff';
  g.fillText(`${Math.round(curve.peakTorque.value)} Nm @ ${Math.round(curve.peakTorque.rpm)}`, pad.l + 6, pad.t + 12);
  g.fillStyle = '#ff2a9d';
  g.fillText(`${Math.round(curve.peakPower.value)} hp @ ${Math.round(curve.peakPower.rpm)}`, pad.l + 6, pad.t + 26);
}
