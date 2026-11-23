export type HairStyle = 'short' | 'long' | 'spiky' | 'bun' | 'slick' | 'bald' | 'mohawk' | 'cap';
export type Accessory = 'none' | 'glasses' | 'headphones' | 'scar' | 'beanie' | 'goggles' | 'earring' | 'shades';
export type Build = 'slim' | 'average' | 'heavy';

/** What a person looks like. The 2D portraits and the 3D figures are both built from this. Colours are 0xRRGGBB. */
export interface Look {
  name: string;
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  /** Jacket / top colour and accent (collar, stripes). */
  outfit: number;
  accent: number;
  accessory: Accessory;
  build: Build;
  /** Metres, for the 3D figure. */
  height: number;
}

/** Everyone who talks or races. Ids match `Speaker` and rival ids ('rookie' is the player). */
export const LOOKS: Record<string, Look> = {
  rookie: { name: 'You', skin: 0xd9a37c, hair: 0x2a1c14, hairStyle: 'short', outfit: 0x2b3446, accent: 0xff2a9d, accessory: 'none', build: 'average', height: 1.75 },
  mara: { name: 'Mara', skin: 0xb9805a, hair: 0x3a1f12, hairStyle: 'bun', outfit: 0xd98a2b, accent: 0x2a2a30, accessory: 'goggles', build: 'average', height: 1.68 },
  cain: { name: 'Cain', skin: 0xb9805a, hair: 0x555a62, hairStyle: 'slick', outfit: 0x4a4038, accent: 0xffd27d, accessory: 'scar', build: 'average', height: 1.82 },
  switch: { name: 'DJ Switch', skin: 0xb9805a, hair: 0x555a62, hairStyle: 'slick', outfit: 0x16222e, accent: 0x18d8ff, accessory: 'headphones', build: 'average', height: 1.82 },
  dante: { name: 'Dante', skin: 0xe2b896, hair: 0x14110a, hairStyle: 'slick', outfit: 0x15130e, accent: 0xffb347, accessory: 'none', build: 'slim', height: 1.84 },
  vex: { name: 'Vex', skin: 0xc58b66, hair: 0x7a2fd6, hairStyle: 'spiky', outfit: 0x3a2260, accent: 0xff2a9d, accessory: 'earring', build: 'slim', height: 1.7 },
  jinx: { name: 'Jinx', skin: 0xf0c8a8, hair: 0x39ff88, hairStyle: 'mohawk', outfit: 0x1d3a2a, accent: 0x39ff88, accessory: 'none', build: 'slim', height: 1.64 },
  tank: { name: 'Tank', skin: 0x9a6a4a, hair: 0x1a1410, hairStyle: 'bald', outfit: 0x5a5f68, accent: 0xc9cdd6, accessory: 'none', build: 'heavy', height: 1.92 },
  pixel: { name: 'Pixel', skin: 0xe8c4a0, hair: 0xff2a9d, hairStyle: 'cap', outfit: 0x1c1f3a, accent: 0x6cf2ff, accessory: 'glasses', build: 'slim', height: 1.72 },
  lola: { name: 'Lola', skin: 0xa8704c, hair: 0x20140e, hairStyle: 'long', outfit: 0xc9a02a, accent: 0xff7aa8, accessory: 'none', build: 'slim', height: 1.66 },
  rook: { name: 'Rook', skin: 0xd0a07a, hair: 0x2c2a26, hairStyle: 'short', outfit: 0x2f6a3a, accent: 0x9aa4b2, accessory: 'scar', build: 'average', height: 1.78 },
  nova: { name: 'Nova', skin: 0xc58b66, hair: 0xff4fa3, hairStyle: 'long', outfit: 0x2a1a3a, accent: 0xff4fa3, accessory: 'shades', build: 'slim', height: 1.7 },
  brick: { name: 'Brick', skin: 0x8a5a3c, hair: 0x1a1410, hairStyle: 'short', outfit: 0xc77b1a, accent: 0x20242c, accessory: 'beanie', build: 'heavy', height: 1.94 },
  adeyemi: { name: 'Madame Adeyemi', skin: 0x8a5a3c, hair: 0x1a1410, hairStyle: 'bun', outfit: 0x1a1a22, accent: 0xe6b84a, accessory: 'earring', build: 'average', height: 1.74 },
  calloway: { name: 'Calloway', skin: 0xe8c4a0, hair: 0xd8c690, hairStyle: 'slick', outfit: 0xdfe6f2, accent: 0x18d8ff, accessory: 'shades', build: 'slim', height: 1.86 },
};

export const lookOf = (id: string): Look => LOOKS[id] ?? LOOKS.rookie;
