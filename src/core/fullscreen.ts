/**
 * Full screen through the Fullscreen API with the webkit-prefixed fallback. The state always comes from the
 * document (so Esc or the system gesture that leaves full screen updates every button). iPhone Safari has no
 * Fullscreen API for pages: `mode` is then 'homescreen' and the UI offers "Add to Home Screen" instead.
 * Inside Capacitor (`native`) the shell is already immersive, so no button is shown ('native').
 * The document and storage are injectable so tests can drive it with a mock.
 */
export interface FsDocument {
  fullscreenElement?: Element | null;
  webkitFullscreenElement?: Element | null;
  fullscreenEnabled?: boolean;
  webkitFullscreenEnabled?: boolean;
  documentElement: { requestFullscreen?: (o?: FullscreenOptions) => Promise<void>; webkitRequestFullscreen?: () => void };
  exitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => void;
  addEventListener(type: string, fn: () => void): void;
}

export type FsMode = 'api' | 'homescreen' | 'native' | 'none';

const KEY = 'rb-fullscreen';

/** Capacitor native shell (iOS/Android app). */
export const isNative = (): boolean => {
  const c = (globalThis as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return typeof c?.isNativePlatform === 'function' && c.isNativePlatform();
};

/** iPhone / iPod (iPad Safari has the API). iPadOS reports as Mac with touch, which is fine. */
export const isIPhone = (ua: string): boolean => /iPhone|iPod/.test(ua);

/** Running as an installed web app (home screen), where the page already fills the screen. */
export const isStandalone = (): boolean =>
  (typeof matchMedia === 'function' && (matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches)) ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

export class FullscreenControl {
  readonly mode: FsMode;
  private readonly doc: FsDocument;
  private readonly kv: Pick<Storage, 'getItem' | 'setItem'> | null;
  private readonly listeners = new Set<(on: boolean) => void>();

  constructor(doc: FsDocument = document as unknown as FsDocument, ua = navigator.userAgent, kv: Pick<Storage, 'getItem' | 'setItem'> | null = safeStorage(), native = isNative()) {
    this.doc = doc;
    this.kv = kv;
    const api = !!(doc.documentElement.requestFullscreen || doc.documentElement.webkitRequestFullscreen) && doc.fullscreenEnabled !== false;
    this.mode = native ? 'native' : api && !isIPhone(ua) ? 'api' : isIPhone(ua) ? 'homescreen' : 'none';
    const fire = (): void => {
      const on = this.active;
      for (const fn of this.listeners) fn(on);
    };
    doc.addEventListener('fullscreenchange', fire);
    doc.addEventListener('webkitfullscreenchange', fire);
  }

  /** True while the page is in full screen (read from the document, never cached). */
  get active(): boolean {
    return !!(this.doc.fullscreenElement ?? this.doc.webkitFullscreenElement);
  }

  /** The player's last choice (true = they last entered full screen). */
  get remembered(): boolean {
    return this.kv?.getItem(KEY) === '1';
  }

  /** Called with the new state on every change, including Esc. Returns an unsubscribe. */
  onChange(fn: (on: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  /** Must run inside a user gesture (click / tap handler). */
  async enter(): Promise<boolean> {
    if (this.mode !== 'api' || this.active) return this.active;
    const el = this.doc.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else el.webkitRequestFullscreen?.();
    } catch {
      return false; // refused (no gesture, iframe policy): the button simply stays "enter"
    }
    this.kv?.setItem(KEY, '1');
    lockLandscape();
    return true;
  }

  async exit(): Promise<void> {
    this.kv?.setItem(KEY, '0');
    if (!this.active) return;
    try {
      if (this.doc.exitFullscreen) await this.doc.exitFullscreen();
      else this.doc.webkitExitFullscreen?.();
    } catch {
      /* already left */
    }
  }

  toggle(): Promise<unknown> {
    return this.active ? this.exit() : this.enter();
  }
}

/** Landscape lock where the browser allows it (Android Chrome in full screen); every failure is ignored. */
export function lockLandscape(): void {
  const o = (screen as unknown as { orientation?: { lock?: (k: string) => Promise<void> } }).orientation;
  try {
    o?.lock?.('landscape')?.catch(() => undefined);
  } catch {
    /* not supported */
  }
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
