/**
 * Engine sound sets per car. Files live in public/audio/engines/<carId>/ and are picked up automatically when listed
 * here; a car with no layers (or files that fail to load) keeps the procedural synth (audio/engineVoice). The turbo
 * whistle, blow-off and pops stay procedural (audio/turboSound, LOCKED). Licences: docs/audio-credits.md.
 * Recordings are steady-rpm loops cut from CC0 / CC BY clips (sources and how they were cut: docs/audio-credits.md;
 * attribution shown in Settings from public/audio/engines/CREDITS.txt). Settings > Engine sound switches back to the synth.
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

/** Per-car voicing of the recordings: `trim` multiplies the playback pitch, `tone` is the low-pass corner in Hz (lower = less shrill). */
export interface SoundTune { trim?: number; tone?: number }

export interface EngineSoundSet {
  character: EngineCharacter;
  tune?: SoundTune;
  /** Short description of the real engine the set should sound like. */
  engine: string;
  layers: readonly EngineLayer[];
}

export const ENGINE_SOUNDS: Record<string, EngineSoundSet> = {
  civic: { character: 'na-i4-vtec', tune: { trim: 0.96, tone: 5200 }, engine: 'Honda B16B 1.6 VTEC, screams to 8400 rpm', layers: [{ file: 'both-732.wav', rpm: 732, load: 'both' }, { file: 'off-2373.wav', rpm: 2373, load: 'off' }, { file: 'on-2389.wav', rpm: 2389, load: 'on' }, { file: 'on-3705.wav', rpm: 3705, load: 'on' }, { file: 'off-4881.wav', rpm: 4881, load: 'off' }, { file: 'on-4934.wav', rpm: 4934, load: 'on' }, { file: 'on-6030.wav', rpm: 6030, load: 'on' }, { file: 'off-6394.wav', rpm: 6394, load: 'off' }, { file: 'on-6844.wav', rpm: 6844, load: 'on' }] },
  golf: { character: 'turbo-i4', tune: { trim: 0.97, tone: 5200 }, engine: 'VW 1.8 20V turbo four', layers: [{ file: 'both-1107.wav', rpm: 1107, load: 'both' }, { file: 'both-2619.wav', rpm: 2619, load: 'both' }, { file: 'on-3883.wav', rpm: 3883, load: 'on' }, { file: 'off-4215.wav', rpm: 4215, load: 'off' }, { file: 'on-5165.wav', rpm: 5165, load: 'on' }, { file: 'on-6695.wav', rpm: 6695, load: 'on' }] },
  '350z': { character: 'na-v6', tune: { trim: 0.97, tone: 5200 }, engine: 'Nissan VQ35DE 3.5 V6', layers: [{ file: 'both-1152.wav', rpm: 1152, load: 'both' }, { file: 'off-2612.wav', rpm: 2612, load: 'off' }, { file: 'on-2722.wav', rpm: 2722, load: 'on' }, { file: 'on-3189.wav', rpm: 3189, load: 'on' }, { file: 'off-4290.wav', rpm: 4290, load: 'off' }, { file: 'on-4867.wav', rpm: 4867, load: 'on' }, { file: 'on-5821.wav', rpm: 5821, load: 'on' }] },
  rx7: { character: 'rotary-twin-turbo', tune: { trim: 0.97, tone: 4800 }, engine: 'Mazda 13B-REW twin rotor, sequential turbos', layers: [{ file: 'both-880.wav', rpm: 880, load: 'both' }, { file: 'on-2453.wav', rpm: 2453, load: 'on' }, { file: 'on-4125.wav', rpm: 4125, load: 'on' }, { file: 'on-5585.wav', rpm: 5585, load: 'on' }, { file: 'on-7106.wav', rpm: 7106, load: 'on' }] },
  e61: { character: 'diesel-i6-twin-turbo', tune: { trim: 0.94, tone: 4200 }, engine: 'BMW M57 3.0 twin-turbo diesel six', layers: [{ file: 'both-834.wav', rpm: 834, load: 'both' }, { file: 'both-1507.wav', rpm: 1507, load: 'both' }, { file: 'on-3685.wav', rpm: 3685, load: 'on' }] },
  m3: { character: 'na-i6-high-rev', tune: { trim: 0.95, tone: 4600 }, engine: 'BMW S54 3.2 straight six to 8000 rpm', layers: [{ file: 'both-1270.wav', rpm: 1270, load: 'both' }, { file: 'on-2599.wav', rpm: 2599, load: 'on' }, { file: 'off-3178.wav', rpm: 3178, load: 'off' }, { file: 'on-4163.wav', rpm: 4163, load: 'on' }, { file: 'off-5524.wav', rpm: 5524, load: 'off' }, { file: 'on-5797.wav', rpm: 5797, load: 'on' }, { file: 'on-6337.wav', rpm: 6337, load: 'on' }] },
  evo: { character: 'turbo-i4-awd', tune: { trim: 0.9, tone: 3600 }, engine: 'Mitsubishi 4G63 2.0 turbo four', layers: [{ file: 'both-732.wav', rpm: 732, load: 'both' }, { file: 'both-4119.wav', rpm: 4119, load: 'both' }, { file: 'on-4930.wav', rpm: 4930, load: 'on' }, { file: 'off-5224.wav', rpm: 5224, load: 'off' }, { file: 'off-6395.wav', rpm: 6395, load: 'off' }, { file: 'on-6403.wav', rpm: 6403, load: 'on' }] },
  supra: { character: 'turbo-i6', tune: { trim: 0.94, tone: 4600 }, engine: 'Toyota 2JZ-GTE 3.0 twin-turbo six', layers: [{ file: 'both-1230.wav', rpm: 1230, load: 'both' }, { file: 'on-2677.wav', rpm: 2677, load: 'on' }, { file: 'on-3286.wav', rpm: 3286, load: 'on' }, { file: 'on-4481.wav', rpm: 4481, load: 'on' }, { file: 'on-5235.wav', rpm: 5235, load: 'on' }] },
};

export const engineSoundUrl = (carId: string, file: string): string =>
  `${(import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'}audio/engines/${carId}/${file}`;
