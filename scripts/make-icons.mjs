// App icons from the brand art in resources/brand (Neon Speed). Usage: npm run icons
//   website-icon.png (wordmark only)  -> browser tab icons (public/icons/favicon-*.png, rounded, transparent corners)
//   app-icon.png (geometric car)      -> phone icons: PWA, apple-touch, maskable, Android mipmaps + adaptive foreground, iOS 1024
// The source art has rounded transparent corners; phone launchers want full-bleed squares (the OS masks them), so the
// corners are filled from the nearest opaque pixel towards the centre. Resampling is an alpha-weighted box filter.
import { PNG } from 'pngjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

/** The art ships with opaque white outside its rounded corners: flood-fill that white from the four corners and make it transparent. */
function load(p) {
  const png = PNG.sync.read(readFileSync(p)), { width: w, height: h, data } = png;
  const outside = new Uint8Array(w * h), stack = [0, w - 1, (h - 1) * w, h * w - 1];
  const white = (i) => data[i * 4 + 3] < 255 || Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) > 200;
  while (stack.length) {
    const i = stack.pop();
    if (outside[i] || !white(i)) continue;
    outside[i] = 1;
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }
  const cut = outside.slice(); // grow by 2 px to eat the anti-aliased white rim
  for (let r = 0; r < 2; r++) {
    const src = cut.slice();
    for (let i = 0; i < w * h; i++) if (!src[i] && ((i % w > 0 && src[i - 1]) || (i % w < w - 1 && src[i + 1]) || (i >= w && src[i - w]) || (i < w * (h - 1) && src[i + w]))) cut[i] = 1;
  }
  for (let i = 0; i < w * h; i++) if (cut[i]) data[i * 4 + 3] = 0;
  return png;
}

/** Full-bleed copy: every transparent or partly transparent pixel takes the colour found walking towards the centre. */
function bleed(src) {
  const { width: w, height: hh } = src;
  const out = new PNG({ width: w, height: hh });
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    let sx = x, sy = y, j = i;
    const dx = w / 2 - x, dy = hh / 2 - y, n = Math.max(1, Math.hypot(dx, dy));
    for (let k = 0; src.data[j + 3] < 255 && k < w; k++) {
      sx = Math.round(x + (dx / n) * k * 1.5); sy = Math.round(y + (dy / n) * k * 1.5);
      j = (Math.min(hh - 1, Math.max(0, sy)) * w + Math.min(w - 1, Math.max(0, sx))) * 4;
    }
    out.data[i] = src.data[j]; out.data[i + 1] = src.data[j + 1]; out.data[i + 2] = src.data[j + 2]; out.data[i + 3] = 255;
  }
  return out;
}

/** Resample `src` into a size x size canvas; the art is scaled by `scale` and centred, the margin clamps to the edge pixels. */
function render(src, size, scale = 1) {
  const out = new PNG({ width: size, height: size });
  const k = src.width / (size * scale), off = (src.width - size * k) / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const x0 = off + x * k, x1 = x0 + k, y0 = off + y * k, y1 = y0 + k;
    let r = 0, g = 0, b = 0, a = 0, wsum = 0;
    for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
      const wgt = (Math.min(sx + 1, x1) - Math.max(sx, x0)) * (Math.min(sy + 1, y1) - Math.max(sy, y0));
      const cx = Math.min(src.width - 5, Math.max(4, sx)), cy = Math.min(src.height - 5, Math.max(4, sy)); // stay 4 px inside: the border row carries a light anti-alias rim
      const p = (cy * src.width + cx) * 4, al = src.data[p + 3] * wgt;
      r += src.data[p] * al; g += src.data[p + 1] * al; b += src.data[p + 2] * al; a += al; wsum += wgt;
    }
    const i = (y * size + x) * 4;
    out.data[i] = a ? r / a : 0; out.data[i + 1] = a ? g / a : 0; out.data[i + 2] = a ? b / a : 0; out.data[i + 3] = Math.round(a / wsum);
  }
  return out;
}

const enc = (png, opaque = false) => PNG.sync.write(png, opaque ? { colorType: 2, inputHasAlpha: true } : {});
const site = load('resources/brand/website-icon.png');
const app = load('resources/brand/app-icon.png');
const full = bleed(app);

mkdirSync('public/icons', { recursive: true });
for (const s of [32, 48, 192, 512]) writeFileSync(`public/icons/favicon-${s}.png`, enc(render(site, s)));
writeFileSync('public/icons/icon-192.png', enc(render(full, 192)));
writeFileSync('public/icons/icon-512.png', enc(render(full, 512)));
writeFileSync('public/icons/maskable-512.png', enc(render(full, 512, 0.74))); // safe zone: art inside the central 80 % circle
writeFileSync('public/icons/apple-touch-icon.png', enc(render(full, 180))); // iOS rounds it itself, so no transparency
mkdirSync('resources', { recursive: true });
writeFileSync('resources/icon.png', enc(render(full, 1024)));
// native launchers (Android mipmaps, adaptive foreground, iOS 1024)
const DENS = { mdpi: [48, 108], hdpi: [72, 162], xhdpi: [96, 216], xxhdpi: [144, 324], xxxhdpi: [192, 432] };
for (const [d, [icon, fg]] of Object.entries(DENS)) {
  const dir = `android/app/src/main/res/mipmap-${d}`;
  try {
    writeFileSync(`${dir}/ic_launcher.png`, enc(render(full, icon)));
    writeFileSync(`${dir}/ic_launcher_round.png`, enc(render(full, icon, 0.9)));
    writeFileSync(`${dir}/ic_launcher_foreground.png`, enc(render(full, fg, 0.62))); // adaptive: only the central 66 % shows
  } catch { /* no android platform yet */ }
}
try { writeFileSync('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', enc(render(full, 1024), true)); } catch { /* no ios platform yet */ }
console.log('icons written');
