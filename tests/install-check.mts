import { classifyInstall } from '../src/core/install.ts';

let failed = 0;
const check = (n: string, ok: boolean): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`); };
const base = { touchPoints: 5, standalone: false, native: false, hasPrompt: false };
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';

check('iPhone Safari: how-to card', classifyInstall({ ...base, ua: IPHONE }) === 'ios');
check('iPad reporting as a Mac with touch: how-to card', classifyInstall({ ...base, ua: IPAD_DESKTOP_UA }) === 'ios');
check('a real Mac (no touch) gets nothing', classifyInstall({ ...base, ua: IPAD_DESKTOP_UA, touchPoints: 0 }) === 'none');
check('Android Chrome with the browser prompt: one-tap install', classifyInstall({ ...base, ua: ANDROID, hasPrompt: true }) === 'prompt');
check('Android without the prompt: menu how-to', classifyInstall({ ...base, ua: ANDROID }) === 'manual');
check('desktop Chrome with the prompt can install too', classifyInstall({ ...base, ua: DESKTOP, touchPoints: 0, hasPrompt: true }) === 'prompt');
check('desktop without the prompt: nothing', classifyInstall({ ...base, ua: DESKTOP, touchPoints: 0 }) === 'none');
check('already installed (standalone): nothing', classifyInstall({ ...base, ua: IPHONE, standalone: true }) === 'none');
check('native app: nothing', classifyInstall({ ...base, ua: ANDROID, native: true, hasPrompt: true }) === 'none');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
