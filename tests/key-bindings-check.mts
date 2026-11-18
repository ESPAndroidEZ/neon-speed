import { DEFAULT_KEYS, KeyBindings, bindable, keyLabel, parseKeys } from '../src/input/keyBindings.ts';

let fails = 0;
const eq = (a: unknown, b: unknown, m: string): void => {
  if (a !== b) { fails++; console.log(`FAIL ${m}: ${String(a)} != ${String(b)}`); }
};
const mem = (): Pick<Storage, 'getItem' | 'setItem'> & { raw: string | null } => ({
  raw: null,
  getItem() { return this.raw; },
  setItem(_k: string, v: string) { this.raw = v; },
});

eq(bindable('KeyQ'), true, 'letter ok');
eq(bindable('Escape'), false, 'esc reserved');
eq(bindable('KeyR'), false, 'reset reserved');
eq(bindable('ArrowUp'), false, 'arrows are fixed alternates');
eq(bindable('F5'), false, 'function keys refused');
eq(keyLabel('KeyQ'), 'Q', 'label letter');
eq(keyLabel('ShiftRight'), 'Shift', 'label shift');
eq(keyLabel('Numpad4'), 'Num 4', 'label numpad');

const kv = mem();
const k = new KeyBindings(kv);
eq(k.codes.gas, DEFAULT_KEYS.gas, 'default gas');
eq(k.set('gas', 'KeyE'), true, 'rebind gas');
eq(k.codes.gas, 'KeyE', 'gas now E');
eq(k.set('brake', 'KeyE'), true, 'brake takes E');
eq(k.codes.brake, 'KeyE', 'brake E');
eq(k.codes.gas, DEFAULT_KEYS.brake, 'gas got the old brake key (swap)');
eq(k.set('nitro', 'Escape'), false, 'reserved refused');
eq(k.codes.nitro, DEFAULT_KEYS.nitro, 'nitro unchanged');
eq(new KeyBindings(kv).codes.brake, 'KeyE', 'persisted');
k.reset();
eq(k.codes.brake, DEFAULT_KEYS.brake, 'reset');

eq(parseKeys('nope').gas, DEFAULT_KEYS.gas, 'junk json');
eq(parseKeys('null').gas, DEFAULT_KEYS.gas, 'null json');
eq(parseKeys(JSON.stringify({ gas: 'Escape' })).gas, DEFAULT_KEYS.gas, 'reserved in storage');
eq(parseKeys(JSON.stringify({ gas: 'KeyT', left: 'KeyT' })).gas, DEFAULT_KEYS.gas, 'duplicates fall back');
eq(parseKeys(JSON.stringify({ gas: 'KeyT' })).gas, 'KeyT', 'partial ok');
eq(parseKeys(JSON.stringify({ gas: 42 })).gas, DEFAULT_KEYS.gas, 'wrong type');
const blocked = new KeyBindings({ getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } });
eq(blocked.set('gas', 'KeyZ'), true, 'blocked storage still binds');
console.log(fails ? `key-bindings-check: ${fails} FAIL` : 'key-bindings-check: ok');
process.exit(fails ? 1 : 0);
