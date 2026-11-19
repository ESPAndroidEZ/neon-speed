import { sanitizeTilt } from './tiltMap';
import type { TiltPrefs } from './tiltMap';
import { sanitizeLayout, sanitizeScale, type Layout } from '../ui/touchLayout';

/** Phone control schemes: tilt the phone, the drag "touch wheel", or left/right buttons. */
export type ControlScheme = 'tilt' | 'wheel' | 'buttons';
export const SCHEMES: readonly ControlScheme[] = ['tilt', 'wheel', 'buttons'];

export interface ControlPrefs {
  scheme: ControlScheme;
  /** Tilt mode: the car accelerates on its own (brake button slows / reverses). */
  autoGas: boolean;
  tilt: TiltPrefs;
  /** The first-run chooser was answered. */
  chosen: boolean;
  /** Schemes whose in-game tutorial was dismissed. */
  seen: ControlScheme[];
  /** Where the player moved each touch button (`scheme:button` -> screen fraction); absent = the default spot. */
  layout: Layout;
  /** Size of all touch buttons, 0.8-1.4. */
  btnScale: number;
}

const KEY = 'rb-controls';
/** Bump with a migration step below when the layout changes. */
export const CONTROLS_VERSION = 1;

export const defaultControls = (): ControlPrefs => ({ scheme: 'wheel', autoGas: true, tilt: sanitizeTilt(null), chosen: false, seen: [], layout: {}, btnScale: 1 });

/** Parse stored JSON; corrupt or future versions fall back to defaults, field by field where possible. */
export function parseControls(json: string | null): ControlPrefs {
  const d = defaultControls();
  if (!json) return d;
  try {
    const o = JSON.parse(json) as Partial<ControlPrefs> & { v?: number };
    if (typeof o !== 'object' || o === null || (o.v ?? 1) > CONTROLS_VERSION) return d;
    return {
      scheme: SCHEMES.includes(o.scheme as ControlScheme) ? (o.scheme as ControlScheme) : d.scheme,
      autoGas: typeof o.autoGas === 'boolean' ? o.autoGas : d.autoGas,
      tilt: sanitizeTilt(o.tilt),
      chosen: o.chosen === true,
      seen: Array.isArray(o.seen) ? o.seen.filter((s): s is ControlScheme => SCHEMES.includes(s)) : [],
      layout: sanitizeLayout(o.layout),
      btnScale: sanitizeScale(o.btnScale),
    };
  } catch {
    return d;
  }
}

/** Live prefs plus save. Storage failures keep the prefs for this session only. */
export class ControlStore {
  readonly data: ControlPrefs;
  private readonly kv: Pick<Storage, 'getItem' | 'setItem'> | null;
  private readonly listeners = new Set<() => void>();

  constructor(kv: Pick<Storage, 'getItem' | 'setItem'> | null) {
    this.kv = kv;
    let raw: string | null = null;
    try {
      raw = kv?.getItem(KEY) ?? null;
    } catch {
      raw = null;
    }
    this.data = parseControls(raw);
  }

  /** Save and tell listeners (touch layout, tilt source). */
  commit(): void {
    try {
      this.kv?.setItem(KEY, JSON.stringify({ v: CONTROLS_VERSION, ...this.data }));
    } catch {
      /* blocked storage */
    }
    for (const fn of this.listeners) fn();
  }

  onChange(fn: () => void): void {
    this.listeners.add(fn);
  }
}
