/** Long-press on a phone must never select text, open a context menu or the image/link callout (keeps typing fields usable). */
export function installNoSelect(): void {
  const editable = (t: EventTarget | null): boolean => t instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(t.tagName);
  document.addEventListener('contextmenu', (e) => { if (!editable(e.target)) e.preventDefault(); });
  document.addEventListener('selectstart', (e) => { if (!editable(e.target)) e.preventDefault(); });
  document.addEventListener('dblclick', (e) => { if (!editable(e.target)) e.preventDefault(); }); // no double-tap select / zoom
}
