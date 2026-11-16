// Contact sheet of car shots: node scripts/contact-sheet.mjs <angle> <out.png> [car ...]  (reads logs/cars/<car>-<angle>.png, 4 per row, 1280 px wide)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const [angle = 'side', out = 'logs/cars/sheet.png', ...ids] = process.argv.slice(2);
const cars = ids.length ? ids : ['civic', 'golf', '350z', 'rx7', 'e61', 'm3', 'evo', 'supra'];
const img = (c) => `<figure><img src="data:image/png;base64,${readFileSync(`logs/cars/${c}-${angle}.png`).toString('base64')}"><figcaption>${c}</figcaption></figure>`;
const html = `<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(2,640px)"><style>figure{margin:0;position:relative}img{width:640px;display:block}figcaption{position:absolute;left:6px;top:4px;color:#fff;font:12px monospace}</style>${cars.map(img).join('')}</body>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 360 * Math.ceil(cars.length / 2) } });
await page.setContent(html);
await page.screenshot(out.endsWith('.jpg') ? { path: out, type: 'jpeg', quality: 78 } : { path: out });
await browser.close();
console.log('wrote', out);
