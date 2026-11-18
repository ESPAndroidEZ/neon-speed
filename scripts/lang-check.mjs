// Language smoke test (needs `npm run dev`): the title screen follows navigator.language, ES/EN buttons switch live
// without a reload, the choice survives a reload, and the Spanish glyphs render. Usage: node scripts/lang-check.mjs [--base URL]
import { chromium } from 'playwright';

const BASE = process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : 'http://localhost:5173/';
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const browser = await chromium.launch();
const open = async (locale, ctx0) => {
  const ctx = ctx0 ?? (await browser.newContext({ locale, viewport: { width: 844, height: 390 } }));
  const page = await ctx.newPage();
  await page.goto(`${BASE}?probe`, { waitUntil: 'load' });
  await page.waitForSelector('.rb-wm', { timeout: 20000 });
  return { ctx, page };
};
const text = (page) => page.evaluate(() => document.body.innerText);

let { ctx, page } = await open('es-ES');
ok(/Pulsa Intro|Toca/i.test(await text(page)), 'es-ES browser starts in Spanish');
await page.click('button[lang=en]');
ok(/Press Enter/i.test(await text(page)), 'EN button switches live');
await page.click('button[lang=es]');
ok(/Pulsa Intro/i.test(await text(page)), 'ES button switches live');
const glyphs = await page.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 400; c.height = 40; const g = c.getContext('2d');
  g.font = '28px system-ui, sans-serif'; g.fillText('áéíóúñ¿¡ÁÉÍÓÚÑ', 4, 30);
  const px = g.getImageData(0, 0, 400, 40).data; let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 40) n++; return n;
});
ok(glyphs > 600, `Spanish glyphs render (${glyphs} px)`);
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.rb-wm');
ok(/Pulsa Intro/i.test(await text(page)), 'choice survives a reload (saved)');
// the main menu has its own language switch, and Enter on the title must not trigger it
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.rb-wm');
await page.keyboard.press('Enter');
await page.waitForSelector('.rb-stack');
ok(/AJUSTES/i.test(await text(page)), 'Enter on the title keeps Spanish');
await page.click('button[lang=en]');
ok(/SETTINGS/i.test(await text(page)) && /FREE RACE/i.test(await text(page)), 'main menu EN button switches live');
await page.click('button[lang=es]');
ok(/AJUSTES/i.test(await text(page)), 'main menu ES button switches back');
await ctx.close();
({ ctx, page } = await open('en-US'));
ok(/Press Enter/i.test(await text(page)), 'en-US browser starts in English');
await ctx.close();
await browser.close();
console.log(fails ? `${fails} FAILURES` : 'lang ok');
process.exit(fails ? 1 : 0);
