import { isNative } from '../core/fullscreen';

type HapticsApi = { impact: (o: { style: string }) => Promise<void> };
let native: HapticsApi | null = null;
let loading = false;

/** Short haptic tick: Capacitor Haptics in the app, navigator.vibrate on Android browsers, nothing elsewhere. */
export function buzz(ms = 12, strong = false): void {
  if (isNative()) {
    if (native) void native.impact({ style: strong ? 'MEDIUM' : 'LIGHT' }).catch(() => undefined);
    else if (!loading) {
      loading = true;
      void import('@capacitor/haptics').then((m) => { native = m.Haptics as unknown as HapticsApi; }).catch(() => undefined);
    }
    return;
  }
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* blocked */
  }
}
