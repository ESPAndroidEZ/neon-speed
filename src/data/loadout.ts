/** How a car looks and sits: everything the garage can change without touching performance parts (docs/art-direction.md, section 4). */
export type Finish = 'gloss' | 'metallic' | 'pearl' | 'matte' | 'chrome' | 'shift';
export type GlowPattern = 'solid' | 'pulse' | 'rainbow' | 'chase';

export interface Vinyl {
  /** A key of `VINYL_PAINTERS` (world/vinylLayer), or null for plain paint. */
  kind: string | null;
  color: number;
  /** 0.5..2: pattern scale; rotation in degrees. */
  scale: number;
  rotation: number;
  /** Race number decal (empty = none). */
  number: string;
}

export interface Loadout {
  finish: Finish;
  vinyl: Vinyl;
  /** Key of `RIM_DESIGNS` (world/rims), size 17..21 inch as a visual scale, colour. */
  rim: { design: string; size: number; color: number };
  /** Window tint 0 (clear) .. 0.9 (limo). */
  tint: number;
  headlight: number;
  glowPattern: GlowPattern;
  caliper: number;
  /** Colours handed to the fx: exhaust flame and tyre smoke. */
  flame: number;
  smoke: number;
  plate: string;
  /** -1 (high, soft) .. +1 (slammed): ride height and camber; shifts handling slightly. */
  stance: number;
  /** Add-on body parts by slot (keys of `PARTS`): spoiler, splitter, skirts, hood. */
  parts: Record<string, string>;
}

export const FINISHES: Record<Finish, { name: string; metalness: number; roughness: number; clearcoat: number; ccRough: number }> = {
  gloss: { name: 'Gloss', metalness: 0.15, roughness: 0.22, clearcoat: 1, ccRough: 0.03 },
  metallic: { name: 'Metallic', metalness: 0.85, roughness: 0.3, clearcoat: 1, ccRough: 0.05 },
  pearl: { name: 'Pearl', metalness: 0.45, roughness: 0.28, clearcoat: 1, ccRough: 0.02 },
  matte: { name: 'Matte', metalness: 0.2, roughness: 0.85, clearcoat: 0, ccRough: 1 },
  chrome: { name: 'Chrome', metalness: 1, roughness: 0.06, clearcoat: 0, ccRough: 1 },
  shift: { name: 'Colour shift', metalness: 0.7, roughness: 0.22, clearcoat: 1, ccRough: 0.03 },
};

export const FINISH_IDS = Object.keys(FINISHES) as Finish[];
export const GLOW_PATTERNS: readonly GlowPattern[] = ['solid', 'pulse', 'rainbow', 'chase'];
export const HEADLIGHTS: readonly number[] = [0xdff2ff, 0xffe9b0, 0x6cf2ff, 0xff7ad0, 0xa8ff9a];
export const CALIPERS: readonly number[] = [0xc41a1a, 0xffb347, 0x2a6bff, 0x39ff88, 0xe8e8ee];

export const defaultLoadout = (): Loadout => ({
  finish: 'metallic',
  vinyl: { kind: null, color: 0xffffff, scale: 1, rotation: 0, number: '' },
  rim: { design: 'five', size: 18, color: 0xc4c8d4 },
  tint: 0.3,
  headlight: HEADLIGHTS[0],
  glowPattern: 'solid',
  caliper: CALIPERS[0],
  flame: 0xff7a2a,
  smoke: 0xe8e8ee,
  plate: 'RB-0001',
  stance: 0,
  parts: {},
});

const num = (v: unknown, d: number, lo: number, hi: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const col = (v: unknown, d: number): number => Math.round(num(v, d, 0, 0xffffff));
const str = (v: unknown, d: string, max: number): string => (typeof v === 'string' ? v.slice(0, max) : d);

const SLOTS = ['spoiler', 'splitter', 'skirts', 'hood'];
function sanitizeParts(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof raw === 'object' && raw !== null) for (const k of SLOTS) { const v = (raw as Record<string, unknown>)[k]; if (typeof v === 'string' && v.length < 24) out[k] = v; }
  return out;
}

/** Make a stored loadout safe: unknown fields dropped, numbers clamped, bad finishes and patterns replaced by defaults. */
export function sanitizeLoadout(raw: unknown): Loadout {
  const d = defaultLoadout();
  if (typeof raw !== 'object' || raw === null) return d;
  const r = raw as Record<string, unknown>;
  const v = (typeof r.vinyl === 'object' && r.vinyl !== null ? r.vinyl : {}) as Record<string, unknown>;
  const rim = (typeof r.rim === 'object' && r.rim !== null ? r.rim : {}) as Record<string, unknown>;
  return {
    finish: FINISH_IDS.includes(r.finish as Finish) ? (r.finish as Finish) : d.finish,
    vinyl: { kind: typeof v.kind === 'string' && v.kind.length < 24 ? v.kind : null, color: col(v.color, d.vinyl.color), scale: num(v.scale, 1, 0.5, 2), rotation: num(v.rotation, 0, -180, 180), number: str(v.number, '', 3) },
    rim: { design: str(rim.design, d.rim.design, 16), size: num(rim.size, d.rim.size, 17, 21), color: col(rim.color, d.rim.color) },
    tint: num(r.tint, d.tint, 0, 0.9),
    headlight: col(r.headlight, d.headlight),
    glowPattern: GLOW_PATTERNS.includes(r.glowPattern as GlowPattern) ? (r.glowPattern as GlowPattern) : d.glowPattern,
    caliper: col(r.caliper, d.caliper),
    flame: col(r.flame, d.flame),
    smoke: col(r.smoke, d.smoke),
    plate: str(r.plate, d.plate, 8).toUpperCase(),
    stance: num(r.stance, 0, -1, 1),
    parts: sanitizeParts(r.parts),
  };
}

/** Stance shifts handling a little: slammed lowers the centre of gravity (sharper, stiffer), high does the opposite. Returns the delta to cgHeight (m) and a grip factor. */
export function stanceEffect(stance: number): { cgDelta: number; grip: number } {
  return { cgDelta: -0.05 * stance, grip: 1 + 0.015 * stance - 0.02 * Math.max(0, stance - 0.7) };
}

/** Apply stance to a car's tuning in place (after the car's own tuning was applied). */
export function applyStance(t: { cgHeight: number; gripFront: number; gripRear: number }, stance: number): void {
  const e = stanceEffect(stance);
  t.cgHeight += e.cgDelta;
  t.gripFront *= e.grip;
  t.gripRear *= e.grip;
}
