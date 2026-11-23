import { chromium } from 'playwright';
const [W,H,touch,lang]=[+process.argv[2],+process.argv[3],process.argv[4]==='1',process.argv[5]||'en'];
const tag=`${W}${touch?'t':''}-${lang}`;
const O='logs/qa/fd-audit/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const ctx = await browser.newContext({ viewport:{width:W,height:H}, hasTouch:touch, isMobile:touch });
const page = await ctx.newPage();
await page.route('**/api/*.php*', (r) => r.fulfill({ json: { keys: {}, now: 1 } }));
await page.addInitScript((l) => localStorage.setItem('rb-lang', l), lang);
const errs=[]; page.on('pageerror',e=>errs.push('PE '+e.message)); page.on('console',m=>{if(m.type()==='error')errs.push('CE '+m.text())});
await page.goto(`http://localhost:5173/?probe&roam=downtown&lang=${lang}`,{waitUntil:'load',timeout:90000});
await page.waitForFunction(()=>window.__rbGame?.state==='FREEROAM',null,{timeout:90000});
await page.waitForTimeout(3000);
const snap=async(n)=>page.screenshot({path:`${O}${tag}-${n}.png`,timeout:90000});
const list=()=>page.evaluate(()=>{const out=[];document.querySelectorAll('button,[role=button],.rb-btn,canvas,[class*=roam],[class*=rb-mini]').forEach(e=>{const r=e.getBoundingClientRect();const cs=getComputedStyle(e);if(r.width<1||r.height<1||cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)return;out.push(`${e.tagName}.${(e.className+'').slice(0,40)} "${(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,25).replace(/\n/g,'|')}" ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}${r.right>innerWidth+1||r.bottom>innerHeight+1||r.x<-1||r.y<-1?' OFFSCREEN':''}`)});return out.join('\n')});
await snap('1-hud'); console.log('== HUD ==\n'+await list());
console.log('state', await page.evaluate(()=>({paused:__rbGame.paused,body:document.body.className})));
// drive
await page.keyboard.down('KeyW'); await page.waitForTimeout(3000); await snap('2-driving'); await page.keyboard.up('KeyW');
for(const k of ['KeyM','KeyR','KeyT','KeyH','KeyP','Tab','KeyG']){ await page.keyboard.press(k); await page.waitForTimeout(600);
 console.log('key',k, JSON.stringify(await page.evaluate(()=>({paused:__rbGame.paused,layers:document.querySelectorAll('.rb-layer').length,canv:[...document.querySelectorAll('.rb-layer canvas')].filter(c=>c.offsetParent).length}))));
 await snap('k-'+k); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
 const st=await page.evaluate(()=>({paused:__rbGame.paused,canv:[...document.querySelectorAll('.rb-layer canvas')].filter(c=>c.offsetParent).length})); if(st.paused||st.canv) {console.log('STUCK after',k,JSON.stringify(st)); await page.keyboard.press('Escape');await page.waitForTimeout(400);}
}
await page.keyboard.press('Escape'); await page.waitForTimeout(800); await snap('3-pause'); console.log('== PAUSE ==\n'+await list());
console.log('ERRS',errs.slice(0,8));
await browser.close();
