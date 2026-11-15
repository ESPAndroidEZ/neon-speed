/**
 * Engine sound sets per car. Files live in public/audio/engines/<carId>/ and are picked up automatically when listed
 * here; a car with no layers (or files that fail to load) keeps the procedural synth (audio/engineVoice). The turbo
 * whistle, blow-off and pops stay procedural (audio/turboSound, LOCKED). Licences: docs/audio-credits.md.
 * Missing recordings and what to look for: docs/audio-todo.md.
 */
export type EngineCharacter = 'na-i4-vtec' | 'turbo-i4' | 'na-v6' | 'rotary-twin-turbo' | 'diesel-i6-twin-turbo' | 'na-i6-high-rev' | 'turbo-i4-awd' | 'turbo-i6';

export interface EngineLayer {
  /** File name inside public/audio/engines/<carId>/ (ogg or mp3). */
  file: string;
  /** Engine speed the loop was recorded at. */
  rpm: number;
  /** 'on' = under load, 'off' = coasting / lifted, 'both' = used for either. */
  load: 'on' | 'off' | 'both';
}

export interface EngineSoundSet {
  character: EngineCharacter;
  /** Short description of the real engine the set should sound like. */
  engine: string;
  layers: readonly EngineLayer[];
}

export const ENGINE_SOUNDS: Record<string, EngineSoundSet> = {
  civic: { character: 'na-i4-vtec', engine: 'Honda B16B 1.6 VTEC, screams to 8400 rpm', layers: [] },
  golf: { character: 'turbo-i4', engine: 'VW 1.8 20V turbo four', layers: [] },
  '350z': { character: 'na-v6', engine: 'Nissan VQ35DE 3.5 V6', layers: [] },
  rx7: { character: 'rotary-twin-turbo', engine: 'Mazda 13B-REW twin rotor, sequential turbos', layers: [] },
  e61: { character: 'diesel-i6-twin-turbo', engine: 'BMW M57 3.0 twin-turbo diesel six', layers: [] },
  m3: { character: 'na-i6-high-rev', engine: 'BMW S54 3.2 straight six to 8000 rpm', layers: [] },
  evo: { character: 'turbo-i4-awd', engine: 'Mitsubishi 4G63 2.0 turbo four', layers: [] },
  supra: { character: 'turbo-i6', engine: 'Toyota 2JZ-GTE 3.0 twin-turbo six', layers: [] },
};

export const engineSoundUrl = (carId: string, file: string): string =>
  `${(import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'}audio/engines/${carId}/${file}`;
