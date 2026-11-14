import type { Weather, WeatherProfile } from '../types/game';

/** Starting values; tune live. Grip multiplies tyres AND brakes. */
export const WEATHER: Readonly<Record<Weather, WeatherProfile>> = {
  CLEAR: { name: 'CLEAR', grip: 1.0, fogDensity: 0.011, fogColor: 0x070914, precipitation: 0, roadRoughness: 0.4 },
  RAIN: { name: 'RAIN', grip: 0.72, fogDensity: 0.017, fogColor: 0x060a12, precipitation: 0.7, roadRoughness: 0.12 },
  SNOW: { name: 'SNOW', grip: 0.45, fogDensity: 0.02, fogColor: 0x0c111b, precipitation: 0.5, roadRoughness: 0.7 },
};
