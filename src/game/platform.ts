import type { Engine } from '../core/engine';
import { FullscreenControl, isNative } from '../core/fullscreen';
import { WakeLock } from '../core/wakeLock';
import { showHomescreenHint } from '../ui/fullscreenButton';
import { shouldPauseOnBlur } from './blurPause';
import type { Game } from './game';
import type { PauseController } from './pause';

export interface PlatformDeps {
  engine: Engine;
  game: Game;
  pause: PauseController;
  audioCtx: AudioContext;
  /** Leave the race for the menu (Android back button from the pause menu). */
  toMenu: () => void;
}

/**
 * Browser and device plumbing in one place: full screen (re-entered on the first tap if the player left it on),
 * the iPhone "Add to Home Screen" hint, a wake lock while racing, pause + silent audio when the tab or app goes to
 * the background, and inside Capacitor the hidden status bar and the Android back button.
 */
export function installPlatform(d: PlatformDeps): FullscreenControl {
  const fs = new FullscreenControl();
  const wake = new WakeLock();
  if (fs.mode === 'api' && fs.remembered) {
    const again = (): void => {
      window.removeEventListener('pointerup', again, true);
      void fs.enter(); // inside a gesture, as the API requires; never automatic
    };
    window.addEventListener('pointerup', again, true);
  }
  if (fs.mode === 'homescreen') window.setTimeout(() => showHomescreenHint(), 4000);

  const racing = (): boolean => !d.game.paused && (d.game.state === 'RACING' || d.game.state === 'CINEMATIC');
  d.engine.onFrame(() => wake.set(racing() && !document.hidden));

  const background = (): void => {
    d.pause.pause();
    d.pause.autosave();
    void d.audioCtx.suspend().catch(() => undefined);
  };
  const foreground = (): void => {
    void d.audioCtx.resume().catch(() => undefined); // still paused: the player resumes from the pause menu
    wake.refresh();
  };
  document.addEventListener('visibilitychange', () => (document.hidden ? background() : foreground()));
  window.addEventListener('blur', () =>
    window.setTimeout(() => {
      if (shouldPauseOnBlur({ finePointer: window.matchMedia('(pointer: fine)').matches, automated: navigator.webdriver === true, stillFocused: document.hasFocus() })) d.pause.pause();
    }, 120),
  );
  window.addEventListener('pagehide', () => d.pause.autosave());
  if (isNative()) void nativeShell(d, background, foreground);
  return fs;
}

/** Capacitor: hide the status bar, Android back = pause (or back out of the pause menu), app background = pause. */
async function nativeShell(d: PlatformDeps, background: () => void, foreground: () => void): Promise<void> {
  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined);
    await StatusBar.hide();
  } catch {
    /* plugin missing in this build */
  }
  try {
    const { App } = await import('@capacitor/app');
    void App.addListener('backButton', () => {
      if (d.game.state === 'MENU') return; // menus have their own Back buttons
      if (!d.game.paused) d.pause.pause();
      else d.toMenu();
    });
    void App.addListener('appStateChange', (s) => (s.isActive ? foreground() : background()));
  } catch {
    /* plugin missing */
  }
}
