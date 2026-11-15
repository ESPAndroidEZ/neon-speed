import type { AudioBus } from '../audio/audioBus';
import type { Engine } from '../core/engine';
import { applyGraphics, GRAPHICS } from '../core/graphics';
import { applyQuality, phoneDefaults } from '../core/quality';
import type { SaveStore } from '../core/save';
import { LEVELS, type PhysicsLevel } from '../physics/weatherLevels';
import type { Voice } from './dialogue';
import { drivingRows } from './drivingSettings';
import { graphicsRows } from './graphicsSettings';
import { button, h } from './uiKit';

export interface SettingsDeps {
  store: SaveStore;
  audio: AudioBus;
  engine: Engine;
  voice: Voice;
  auto: { enabled: boolean };
  /** Receives the weather physics level. */
  game: { physicsLevel: PhysicsLevel; chase: { tuning: { shake: number; fovMin: number; fovMax: number } } };
  hud?: { setScale(s: number): void };
  /** Called after a driving setting changes (copies the saved values into physics and the gamepad). */
  onDriving?: () => void;
  onBack: () => void;
}

/** Apply saved settings (call once at startup and after changes). */
export function applySettings(d: Omit<SettingsDeps, 'onBack'>): void {
  const s = d.store.data.settings;
  d.audio.setVolume(s.volume);
  d.audio.setMuted(s.muted);
  d.audio.setSfxVolume(s.sfxVolume);
  d.audio.setMusicVolume(s.musicVolume);
  if (phoneDefaults(s)) d.store.commit();
  Object.assign(GRAPHICS, s.graphics);
  applyQuality(d.engine, s.quality, true);
  if (d.hud) applyGraphics(d.engine, { hud: d.hud, chase: d.game.chase });
  d.voice.enabled = s.voice;
  d.auto.enabled = s.autoQuality;
  d.game.physicsLevel = s.weatherPhysics;
  d.game.chase.tuning.shake = { OFF: 0, LOW: 0.5, NORMAL: 1 }[s.cameraShake];
}

export function buildSettings(d: SettingsDeps): HTMLElement {
  const s = d.store.data.settings;
  const root = h('div', 'rb-layer dim');
  root.style.cssText += ';overflow:auto;justify-content:flex-start;padding:max(16px,3vh) 16px';
  root.append(h('h2', 'rb-title', 'SETTINGS'));
  const slider = (label: string, key: 'volume' | 'sfxVolume' | 'musicVolume'): HTMLElement => {
    const row = h('div', 'rb-row', `<span style="width:90px">${label}</span>`);
    const input = h('input') as HTMLInputElement;
    input.type = 'range';
    input.min = '0';
    input.max = '1';
    input.step = '0.05';
    input.value = String(s[key]);
    input.addEventListener('input', () => {
      s[key] = parseFloat(input.value);
      applySettings(d);
    });
    input.addEventListener('change', () => d.store.commit());
    row.append(input);
    return row;
  };
  const vol = slider('Master', 'volume');
  const sfxVol = slider('Effects', 'sfxVolume');
  const musVol = slider('Music', 'musicVolume');

  const mute = h('label', 'rb-row', '<span style="width:90px">Mute (M)</span>');
  const box = h('input') as HTMLInputElement;
  box.type = 'checkbox';
  box.checked = s.muted;
  box.addEventListener('change', () => {
    s.muted = box.checked;
    applySettings(d);
    d.store.commit();
  });
  mute.append(box);

  const voice = h('label', 'rb-row', '<span style="width:90px">Switch voice</span>');
  const vbox = h('input') as HTMLInputElement;
  vbox.type = 'checkbox';
  vbox.checked = s.voice;
  vbox.addEventListener('change', () => {
    s.voice = vbox.checked;
    applySettings(d);
    d.store.commit();
    if (s.voice) d.voice.say('Kestrel Bay. Two a.m.');
  });
  voice.append(vbox);

  const auto = h('label', 'rb-row', '<span style="width:90px">Auto quality</span>');
  const abox = h('input') as HTMLInputElement;
  abox.type = 'checkbox';
  abox.checked = s.autoQuality;
  abox.addEventListener('change', () => {
    s.autoQuality = abox.checked;
    applySettings(d);
    d.store.commit();
  });
  auto.append(abox);

  const wp = h('div', 'rb-row', '<span style="width:90px">Rain / snow physics</span>');
  const shake = h('div', 'rb-row', '<span style="width:90px">Camera shake</span>');
  for (const lv of ['OFF', 'LOW', 'NORMAL'] as const) {
    const b = button(lv.toLowerCase(), () => {
      s.cameraShake = lv;
      applySettings(d);
      d.store.commit();
      shake.querySelectorAll('button').forEach((x) => x.classList.toggle('hot', x.dataset.lv === s.cameraShake));
    });
    b.dataset.lv = lv;
    b.classList.toggle('hot', lv === s.cameraShake);
    b.style.minWidth = '90px';
    shake.append(b);
  }
  const hint = h('div', 'rb-sub', '');
  const HINT: Record<PhysicsLevel, string> = {
    NORMAL: 'Rain 72% grip, snow 45%.',
    AGGRESSIVE: 'Rain 60%, snow 34%, puddles, snow banks, ice, a loose tail.',
    EXTREME: 'Rain 50%, snow 26%. Brutal. Hold on.',
  };
  for (const lv of LEVELS) {
    const b = button(lv.toLowerCase(), () => {
      s.weatherPhysics = lv;
      applySettings(d);
      d.store.commit();
      refreshWp();
    });
    b.dataset.lv = lv;
    b.style.minWidth = '100px';
    wp.append(b);
  }
  const refreshWp = (): void => {
    wp.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.dataset.lv === s.weatherPhysics));
    hint.textContent = HINT[s.weatherPhysics];
  };
  refreshWp();
  root.append(vol, sfxVol, musVol, mute, voice, shake, wp, hint, ...drivingRows(d.store, () => d.onDriving?.()), h('div', 'rb-sub', 'Graphics'), ...graphicsRows({ store: d.store, engine: d.engine, hud: d.hud, chase: d.game.chase }), auto, button('Back', d.onBack));
  return root;
}
