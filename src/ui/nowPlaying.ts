import { MUSIC_SOURCE } from '../audio/audioParams';
import { t } from '../i18n';

/**
 * The tiny "Now playing: <song>" line (Settings > Advanced > Sound, on by default). The music director calls it once
 * per song change through MUSIC_SOURCE.onSong, so it costs nothing per frame; one element, reused.
 */
let el: HTMLDivElement | null = null;
let timer = 0;
let on = true;

function show(name: string): void {
  if (!on || typeof document === 'undefined') return;
  if (!el) {
    el = document.createElement('div');
    el.className = 'rb-np';
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);padding:4px 12px;'
      + 'border-radius:999px;background:#0a0f1ccc;border:1px solid #18d8ff55;color:#cfefff;font:600 12px/1.3 system-ui,sans-serif;'
      + 'letter-spacing:.03em;white-space:nowrap;pointer-events:none;z-index:55;opacity:0;transition:opacity .5s ease';
    document.body.appendChild(el);
    const css = document.createElement('style'); // Free Drive: the top centre holds the bar and the race offer
    css.textContent = 'body.rb-roaming .rb-np{top:auto!important;bottom:max(14px,env(safe-area-inset-bottom))}';
    document.head.appendChild(css);
  }
  el.textContent = t('set.nowPlayingLine', { song: name });
  el.style.opacity = '1';
  window.clearTimeout(timer);
  timer = window.setTimeout(() => { if (el) el.style.opacity = '0'; }, 4000);
}

/** Applied from Settings (applySettings). */
export function setNowPlaying(enabled: boolean): void {
  on = enabled;
  MUSIC_SOURCE.onSong = show;
  if (!enabled && el) el.style.opacity = '0';
}
