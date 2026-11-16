/** Remappable driving keys. Arrow keys always work as a second set for steering, gas and brake. */
export type KeyAction = 'gas' | 'brake' | 'left' | 'right' | 'handbrake' | 'nitro';
export const KEY_ACTIONS: readonly KeyAction[] = ['gas', 'brake', 'left', 'right', 'handbrake', 'nitro'];

export const DEFAULT_KEYS: Readonly<Record<KeyAction, string>> = {
  gas: 'KeyW', brake: 'KeyS', left: 'KeyA', right: 'KeyD', handbrake: 'Space', nitro: 'ShiftLeft',
};

/** Keys the game uses for itself (menus, reset, mute, pause, dev) cannot be bound. */
const RESERVED = new Set(['Escape', 'Enter', 'KeyR', 'KeyM', 'KeyP', 'Backquote', 'Tab', 'Digit1', 'Digit2', 'Digit3']);

/** Only plain keys: letters, digits, space, shift, control, punctuation. No function keys or the arrows (already alternates). */
export function bindable(code: string): boolean {
  if (RESERVED.has(code) || code.startsWith('Arrow') || /^F\d+$/.test(code) || code === 'Unidentified') return false;
  return /^(Key[A-Z]|Digit\d|Numpad.+|Space|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Comma|Period|Slash|Semicolon|Quote|Bracket(Left|Right)|Backslash|Minus|Equal|Backspace|Intl.+|Home|End|PageUp|PageDown|Insert|Delete)$/.test(code);
}

/** Short player-facing name for a KeyboardEvent.code. */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Space') return 'Space';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  if (code === 'AltLeft' || code === 'AltRight') return 'Alt';
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  return code.replace(/([a-z])([A-Z])/g, '$1 $2');
}

const KEY = 'ns.keys';
type KV = Pick<Storage, 'getItem' | 'setItem'> | null;

/** Parse stored JSON field by field. Junk, reserved or duplicate codes fall back to the defaults (all-or-nothing on duplicates). */
export function parseKeys(json: string | null): Record<KeyAction, string> {
  const out = { ...DEFAULT_KEYS };
  if (!json) return out;
  try {
    const o = JSON.parse(json) as Record<string, unknown> | null;
    if (typeof o !== 'object' || o === null) return out;
    const got = { ...DEFAULT_KEYS };
    for (const a of KEY_ACTIONS) if (typeof o[a] === 'string' && bindable(o[a] as string)) got[a] = o[a] as string;
    return new Set(Object.values(got)).size === KEY_ACTIONS.length ? got : out;
  } catch {
    return out;
  }
}

/** Live bindings plus save, on their own key (not the game save). */
export class KeyBindings {
  /** The bindings of the keyboard in use (read by hint texts). */
  static live: KeyBindings | null = null;
  readonly codes: Record<KeyAction, string>;
  private readonly kv: KV;

  constructor(kv: KV) {
    this.kv = kv;
    let raw: string | null = null;
    try {
      raw = kv?.getItem(KEY) ?? null;
    } catch {
      raw = null;
    }
    this.codes = parseKeys(raw);
    KeyBindings.live = this;
  }

  /** Bind `code` to `action`. If another action had it, that action takes the old key (a swap). Returns false for keys that cannot be bound. */
  set(action: KeyAction, code: string): boolean {
    if (!bindable(code)) return false;
    const old = this.codes[action];
    for (const a of KEY_ACTIONS) if (a !== action && this.codes[a] === code) this.codes[a] = old;
    this.codes[action] = code;
    this.save();
    return true;
  }

  reset(): void {
    Object.assign(this.codes, DEFAULT_KEYS);
    this.save();
  }

  private save(): void {
    try {
      this.kv?.setItem(KEY, JSON.stringify(this.codes));
    } catch {
      /* blocked storage: keeps for this session */
    }
  }
}
