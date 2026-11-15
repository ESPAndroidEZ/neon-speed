/**
 * Screen wake lock while a race runs, so the phone does not dim mid-race. `set(true)` requests it, `set(false)`
 * releases it (pause, menu, results). The browser drops the lock when the tab hides; the next `set(true)` after
 * the tab is visible again takes it back. Unsupported browsers and refusals are ignored.
 */
interface Sentinel {
  released: boolean;
  release(): Promise<void>;
}

export class WakeLock {
  private sentinel: Sentinel | null = null;
  private want = false;
  private pending = false;

  set(on: boolean): void {
    if (on === this.want && (!on || this.sentinel || this.pending)) return;
    this.want = on;
    if (on) void this.acquire();
    else this.drop();
  }

  /** Call when the tab becomes visible again: re-takes the lock if a race still wants it. */
  refresh(): void {
    if (this.want && (!this.sentinel || this.sentinel.released)) {
      this.sentinel = null;
      void this.acquire();
    }
  }

  private async acquire(): Promise<void> {
    const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } }).wakeLock;
    if (!wl || this.pending || typeof document === 'undefined' || document.hidden) return;
    this.pending = true;
    try {
      const s = await wl.request('screen');
      if (this.want) this.sentinel = s;
      else void s.release();
    } catch {
      /* refused: battery saver or no permission */
    }
    this.pending = false;
  }

  private drop(): void {
    const s = this.sentinel;
    this.sentinel = null;
    if (s && !s.released) void s.release().catch(() => undefined);
  }
}
