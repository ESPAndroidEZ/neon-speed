import type { VinylPainter } from './vinylLayer';

/** Underground-round vinyls (our own designs): a harbour skyline, a two-tone split fade and thin pinstripes. */
export const VINYLS_C: Record<string, VinylPainter> = {
  /** A row of tower silhouettes along the lower edge, with lit windows cut out. */
  skyline: (g, s, c) => {
    g.fillStyle = c;
    let x = 0, k = 7;
    while (x < s) {
      k = (k * 1103515245 + 12345) & 0x7fffffff; // fixed sequence: the same skyline on every car
      const w = s * (0.04 + (k % 100) / 1600), hgt = s * (0.12 + ((k >> 8) % 100) / 380);
      g.fillRect(x, s - hgt, w, hgt);
      x += w + s * 0.006;
    }
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 90; i++) { k = (k * 1103515245 + 12345) & 0x7fffffff; g.fillRect((k % s), s - s * 0.04 - ((k >> 9) % Math.floor(s * 0.3)), s * 0.008, s * 0.012); }
    g.globalCompositeOperation = 'source-over';
  },
  /** The colour fades in from one side over the whole body. */
  'split-fade': (g, s, c) => {
    const gr = g.createLinearGradient(0, 0, s, 0);
    gr.addColorStop(0, c); gr.addColorStop(0.45, c); gr.addColorStop(0.62, `${c}00`);
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
  },
  /** Three hairline stripes with a gap, offset to one side. */
  pinstripe: (g, s, c) => {
    g.fillStyle = c;
    for (const f of [0.22, 0.245, 0.31]) g.fillRect(s * f, 0, s * 0.008, s);
  },
};
