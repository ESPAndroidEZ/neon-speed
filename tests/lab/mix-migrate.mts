// @ts-nocheck
import { parseSave } from '../../src/core/saveParse.ts';
import { defaultSave } from '../../src/core/save.ts';
const P = (raw) => parseSave(raw, defaultSave('civic', 0), ['civic']);
const old = P(JSON.stringify({ settings: { engineVolume: 0.6, musicVolume: 0.55 } }));
const kept = P(JSON.stringify({ settings: { engineVolume: 0.4, musicVolume: 0.3, mix: 'engine' } }));
const fresh = P(null);
console.log('old save ->', old.settings.engineVolume, old.settings.musicVolume, '| chosen kept ->', kept.settings.engineVolume, kept.settings.musicVolume, kept.settings.mix, '| new ->', fresh.settings.engineVolume, fresh.settings.musicVolume, fresh.settings.mix);
