import { isNative, isStandalone } from './fullscreen';

/**
 * "Install the app" support for the web build.
 *   prompt  the browser offered its own install dialog (Chrome / Edge / Samsung on Android and desktop): one tap installs
 *   ios     iPhone / iPad Safari has no install API: show how to use Share > Add to Home Screen
 *   manual  an Android browser that did not offer the prompt (yet): point at its menu
 *   none    already installed, inside the native app, or a desktop browser without the prompt
 */
export type InstallKind = 'none' | 'prompt' | 'ios' | 'manual';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((fn) => fn());

// Registered when the module loads, because the browser fires the event once, early.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep it for our own button
    deferred = e as InstallEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
}

/** Pure decision, so it can be tested without a browser. */
export function classifyInstall(o: { ua: string; touchPoints: number; standalone: boolean; native: boolean; hasPrompt: boolean }): InstallKind {
  if (o.native || o.standalone) return 'none';
  if (o.hasPrompt) return 'prompt';
  if (/iPhone|iPad|iPod/.test(o.ua) || (/Macintosh/.test(o.ua) && o.touchPoints > 1)) return 'ios';
  if (/Android/.test(o.ua)) return 'manual';
  return 'none';
}

export function installKind(): InstallKind {
  if (installed) return 'none';
  return classifyInstall({ ua: navigator.userAgent, touchPoints: navigator.maxTouchPoints ?? 0, standalone: isStandalone(), native: isNative(), hasPrompt: deferred !== null });
}

/** Shows the browser's install dialog. Resolves false when there is none (the caller then shows the how-to card). */
export async function runInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  deferred = null; // the event can only be used once
  await e.prompt();
  const choice = await e.userChoice;
  if (choice.outcome === 'accepted') installed = true;
  notify();
  return true;
}

/** Called when the install state changes (the browser offered the prompt late, or the app got installed). */
export function onInstallChange(fn: () => void): void {
  listeners.add(fn);
}
