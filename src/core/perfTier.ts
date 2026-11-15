import { PRESETS } from './graphics';
import type { Graphics } from './graphics';
import type { Quality } from './save';

/** What the first-run detection reads (structural, so tests can pass plain values). */
export interface DeviceHints {
  /** UNMASKED_RENDERER_WEBGL or '' when hidden. */
  gpu: string;
  cores: number;
  /** navigator.deviceMemory in GB, 0 when unknown. */
  memory: number;
  phone: boolean;
}

/**
 * First-run graphics tier from cheap hints (the "Test my device" benchmark in Settings is the precise one):
 * software renderers and small phones LOW, other phones and integrated GPUs MEDIUM, discrete GPUs HIGH.
 */
export function guessTier(h: DeviceHints): Quality {
  const g = h.gpu.toLowerCase();
  if (/swiftshader|llvmpipe|software|basic render/.test(g)) return 'low';
  if (h.phone) return (h.memory > 0 && h.memory <= 3) || (h.cores > 0 && h.cores <= 4) || /mali-[gt]?[1-7]\d\b|adreno \(tm\) [1-5]\d\d\b|powervr/.test(g) ? 'low' : 'medium';
  if (/intel|uhd|iris|apple m1|adreno|mali/.test(g) || (h.cores > 0 && h.cores <= 4)) return 'medium';
  return 'high';
}

/** Read the hints from the live WebGL context. */
export function deviceHints(gl: WebGLRenderingContext | WebGL2RenderingContext, phone: boolean): DeviceHints {
  let gpu = '';
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  } catch {
    gpu = '';
  }
  const nav = navigator as unknown as { hardwareConcurrency?: number; deviceMemory?: number };
  return { gpu, cores: nav.hardwareConcurrency ?? 0, memory: nav.deviceMemory ?? 0, phone };
}

/**
 * Once per device (key `rb-tier-detected`): lower the saved tier to the guess when the guess is lower. Never raises
 * a choice the player made. Returns true when it changed the settings.
 */
export function firstRunTier(s: { quality: Quality; graphics: Graphics }, hints: DeviceHints, kv: Pick<Storage, 'getItem' | 'setItem'> | null): boolean {
  try {
    if (!kv || kv.getItem('rb-tier-detected') === '1') return false;
    kv.setItem('rb-tier-detected', '1');
  } catch {
    return false;
  }
  const order: Quality[] = ['low', 'medium', 'high', 'ultra'];
  const guess = guessTier(hints);
  if (order.indexOf(guess) >= order.indexOf(s.quality)) return false;
  s.quality = guess;
  s.graphics = { ...PRESETS[guess] };
  return true;
}
