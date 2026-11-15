// Full-screen state logic against a mocked Fullscreen API: enter / exit / Esc (the browser leaving by itself) keep
// the state and every listener right, the webkit-prefixed fallback works, refusals do not flip the state,
// iPhone gets the home-screen path, the native app shows nothing, and the last choice is remembered.
import { FullscreenControl } from '../src/core/fullscreen.ts';
import type { FsDocument } from '../src/core/fullscreen.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`);
};
(globalThis as unknown as { screen: unknown }).screen = { orientation: { lock: () => Promise.reject(new Error('not allowed')) } };

function mockDoc(kind: 'std' | 'webkit' | 'refuse' | 'none'): FsDocument & { esc(): void; events: Record<string, (() => void)[]> } {
  const events: Record<string, (() => void)[]> = {};
  const fire = (t: string): void => void (events[t] ?? []).forEach((f) => f());
  const el = {} as Element;
  const d: FsDocument & { esc(): void; events: typeof events } = {
    events,
    fullscreenElement: null,
    webkitFullscreenElement: null,
    documentElement: {},
    addEventListener: (t, f) => void (events[t] ??= []).push(f),
    esc() {
      if (kind === 'webkit') d.webkitFullscreenElement = null;
      else d.fullscreenElement = null;
      fire(kind === 'webkit' ? 'webkitfullscreenchange' : 'fullscreenchange');
    },
  };
  if (kind === 'std' || kind === 'refuse') {
    d.documentElement.requestFullscreen = async () => {
      if (kind === 'refuse') throw new Error('no gesture');
      d.fullscreenElement = el;
      fire('fullscreenchange');
    };
    d.exitFullscreen = async () => {
      d.fullscreenElement = null;
      fire('fullscreenchange');
    };
  }
  if (kind === 'webkit') {
    d.documentElement.webkitRequestFullscreen = () => {
      d.webkitFullscreenElement = el;
      fire('webkitfullscreenchange');
    };
    d.webkitExitFullscreen = () => {
      d.webkitFullscreenElement = null;
      fire('webkitfullscreenchange');
    };
  }
  return d;
}
const mem = (): Pick<Storage, 'getItem' | 'setItem'> & { m: Record<string, string> } => {
  const m: Record<string, string> = {};
  return { m, getItem: (k) => m[k] ?? null, setItem: (k, v) => void (m[k] = v) };
};
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/131 Mobile';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1';

for (const kind of ['std', 'webkit'] as const) {
  const doc = mockDoc(kind), kv = mem();
  const fs = new FullscreenControl(doc, ANDROID, kv, false);
  const seen: boolean[] = [];
  fs.onChange((on) => seen.push(on));
  check(`${kind}: mode api, starts off`, fs.mode === 'api' && !fs.active);
  await fs.enter();
  check(`${kind}: enter -> active, listener told`, fs.active && seen.at(-1) === true);
  check(`${kind}: choice remembered`, fs.remembered && kv.m['rb-fullscreen'] === '1');
  doc.esc(); // the user pressed Esc: the browser left full screen on its own
  check(`${kind}: Esc -> inactive, listener told`, !fs.active && seen.at(-1) === false);
  await fs.toggle();
  check(`${kind}: toggle enters again`, fs.active);
  await fs.toggle();
  check(`${kind}: toggle exits, choice off`, !fs.active && !fs.remembered && seen.join() === 'true,false,true,false');
}

const refuse = new FullscreenControl(mockDoc('refuse'), ANDROID, mem(), false);
check('refused request: stays off, not remembered', (await refuse.enter()) === false && !refuse.active && !refuse.remembered);
check('iPhone: home-screen path', new FullscreenControl(mockDoc('none'), IPHONE, mem(), false).mode === 'homescreen');
check('iPhone even with a prefixed API: home-screen path', new FullscreenControl(mockDoc('webkit'), IPHONE, mem(), false).mode === 'homescreen');
check('native app: no button', new FullscreenControl(mockDoc('std'), ANDROID, mem(), true).mode === 'native');
check('no API (old desktop): none', new FullscreenControl(mockDoc('none'), 'Mozilla/5.0 (X11; Linux x86_64)', mem(), false).mode === 'none');
const unsub = new FullscreenControl(mockDoc('std'), ANDROID, mem(), false);
let calls = 0;
const off = unsub.onChange(() => calls++);
off();
await unsub.enter();
check('unsubscribed listener is not called', calls === 0);

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
