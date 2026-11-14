// Procedural app icons (no external art): a neon "R" blade on a dark night gradient. Writes public/icons/*.png and the
// Android / iOS launcher sources. Usage: npm run icons
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const draw = (size, maskable) => {
  const png = new PNG({ width: size, height: size });
  const pad = maskable ? 0.18 : 0.08;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    // background: deep blue to magenta glow at the bottom right
    let r = 8 + 20 * v, g = 10 + 8 * v, b = 24 + 40 * v;
    const d = Math.hypot(u - 0.8, v - 0.9);
    const glow = Math.max(0, 1 - d * 1.6);
    r += 200 * glow * glow; g += 20 * glow; b += 120 * glow * glow;
    // speed slashes
    const s = (u * 0.7 + v) % 0.22;
    if (s < 0.012 && v > 0.55) { r += 40; g += 120; b += 160; }
    // the R: stem, bowl, leg inside the safe box
    const x0 = pad + 0.12, x1 = 1 - pad - 0.12, y0 = pad + 0.1, y1 = 1 - pad - 0.1;
    const w = x1 - x0, h = y1 - y0;
    const lu = (u - x0) / w, lv = (v - y0) / h;
    let on = false;
    if (lu >= 0 && lu <= 1 && lv >= 0 && lv <= 1) {
      const stem = lu < 0.24;
      const top = lv < 0.2 && lu < 0.85;
      const mid = lv > 0.42 && lv < 0.62 && lu < 0.85;
      const bowl = lu > 0.62 && lu < 0.86 && lv < 0.62 && lv > 0.05;
      const leg = lv > 0.55 && Math.abs(lu - (0.3 + (lv - 0.55) * 1.4)) < 0.13;
      on = stem || top || mid || bowl || leg;
    }
    if (on) { r = 255; g = 60; b = 170; const hl = Math.max(0, 1 - lv * 1.3); r += 0; g += 150 * hl; b += 60 * hl; }
    const i = (y * size + x) * 4;
    png.data[i] = Math.min(255, r); png.data[i + 1] = Math.min(255, g); png.data[i + 2] = Math.min(255, b); png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
};
mkdirSync('public/icons', { recursive: true });
for (const [name, size, maskable] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['maskable-512.png', 512, true], ['apple-touch-icon.png', 180, false]]) writeFileSync(`public/icons/${name}`, draw(size, maskable));
mkdirSync('resources', { recursive: true });
writeFileSync('resources/icon.png', draw(1024, false));
// native launchers (Android mipmaps, adaptive foreground, iOS 1024)
const DENS = { mdpi: [48, 108], hdpi: [72, 162], xhdpi: [96, 216], xxhdpi: [144, 324], xxxhdpi: [192, 432] };
for (const [d, [icon, fg]] of Object.entries(DENS)) {
  const dir = `android/app/src/main/res/mipmap-${d}`;
  try {
    writeFileSync(`${dir}/ic_launcher.png`, draw(icon, false));
    writeFileSync(`${dir}/ic_launcher_round.png`, draw(icon, false));
    writeFileSync(`${dir}/ic_launcher_foreground.png`, draw(fg, true));
  } catch { /* no android platform yet */ }
}
try { writeFileSync('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', draw(1024, false)); } catch { /* no ios platform yet */ }
console.log('icons written');
