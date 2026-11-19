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
import { CARS } from '../data/cars';
import { t } from '../i18n';
import { langRow } from './langRow';
import { settingsTabs } from './settingsTabs';
import { applyUiSizes } from './uiSizes';
import { engineSoundRow, musicStyleRow, soundCredits, soundMixRow } from './soundSettings';
import { ENGINE_SOURCE, MUSIC_SOURCE } from '../audio/audioParams';

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
  /** Rows added after the audio rows (screen and phone controls). */
  extraRows?: () => HTMLElement[];
  onBack: () => void;
}

/** Apply saved settings (call once at startup and after changes). */
export function applySettings(d: Omit<SettingsDeps, 'onBack'>): void {
  const s = d.store.data.settings;
  d.audio.setVolume(s.volume);
  d.audio.setMuted(s.muted);
  d.audio.setSfxVolume(s.sfxVolume);
  d.audio.setEngineVolume(s.engineVolume);
  d.audio.setMusicVolume(s.musicVolume);
  ENGINE_SOURCE.samples = s.engineSound !== 'synth';
  MUSIC_SOURCE.style = s.musicStyle;
  if (phoneDefaults(s)) d.store.commit();
  Object.assign(GRAPHICS, s.graphics);
  applyQuality(d.engine, s.quality, true);
  if (d.hud) applyGraphics(d.engine, { hud: d.hud, chase: d.game.chase });
  d.voice.enabled = s.voice;
  d.auto.enabled = s.autoQuality;
  d.game.physicsLevel = s.weatherPhysics;
  applyUiSizes(s);
  d.game.chase.tuning.shake = { OFF: 0, LOW: 0.5, NORMAL: 1 }[s.cameraShake];
}

export function buildSettings(d: SettingsDeps): HTMLElement {
  const s = d.store.data.settings;
  const root = h('div', 'rb-layer dim');
  root.style.cssText += ';overflow:auto;justify-content:flex-start;padding:max(16px,3vh) max(12px,env(safe-area-inset-right)) max(20px,4vh) max(12px,env(safe-area-inset-left))';
  root.append(h('h2', 'rb-title', t('set.title')));
  const slider = (label: string, key: 'volume' | 'sfxVolume' | 'engineVolume' | 'musicVolume'): HTMLElement => {
    const row = h('div', 'rb-row', `<span class="rb-lbl">${label}</span>`);
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
  const vol = slider(t('set.master'), 'volume');
  const engVol = slider(t('set.engine'), 'engineVolume');
  const sfxVol = slider(t('set.effects'), 'sfxVolume');
  const musVol = slider(t('set.music'), 'musicVolume');

  const mute = h('label', 'rb-row', `<span class="rb-lbl">${t('set.mute')}</span>`);
  const box = h('input') as HTMLInputElement;
  box.type = 'checkbox';
  box.checked = s.muted;
  box.addEventListener('change', () => {
    s.muted = box.checked;
    applySettings(d);
    d.store.commit();
  });
  mute.append(box);

  const voice = h('label', 'rb-row', `<span class="rb-lbl">${t('set.voice')}</span>`);
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

  const wp = h('div', 'rb-row', `<span class="rb-lbl">${t('set.wphys')}</span>`);
  const shake = h('div', 'rb-row', `<span class="rb-lbl">${t('set.shake')}</span>`);
  for (const lv of ['OFF', 'LOW', 'NORMAL'] as const) {
    const b = button(t(`opt.${lv}`), () => {
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
  for (const lv of LEVELS) {
    const b = button(t(`opt.${lv}`), () => {
      s.weatherPhysics = lv;
      applySettings(d);
      d.store.commit();
      refreshWp();
    });
    b.dataset.lv = lv;
    b.style.minWidth = '100px';
    wp.append(b);
  }
  const sizeRow = (label: 'ctl.subSize' | 'ctl.mapSize', key: 'subtitleSize' | 'minimapSize'): HTMLElement => {
    const row = h('div', 'rb-row', `<span class="rb-lbl">${t(label)}</span>`);
    for (const sz of ['S', 'M', 'L'] as const) {
      const b = button(t(`size.${sz}`), () => {
        s[key] = sz;
        applySettings(d);
        d.store.commit();
        row.querySelectorAll('button').forEach((x) => x.classList.toggle('hot', x === b));
      }, s[key] === sz ? 'hot' : '');
      b.style.minWidth = '90px';
      row.append(b);
    }
    return row;
  };
  const refreshWp = (): void => {
    wp.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.dataset.lv === s.weatherPhysics));
    hint.textContent = t(`hint.wphys.${s.weatherPhysics}`);
  };
  refreshWp();
  const panel = (title: string, rows: HTMLElement[]): HTMLElement => {
    const p = h('section', 'rb-panel');
    p.append(h('h3', '', title), ...rows);
    return p;
  };
  const driving = drivingRows(d.store, () => d.onDriving?.());
  const extra = d.extraRows?.() ?? [];
  const gfx = graphicsRows({ store: d.store, engine: d.engine, hud: d.hud, chase: d.game.chase, onAuto: () => applySettings(d) });
  const basic = h('div', 'rb-settings');
  basic.append(
    panel(t('set.secAudio'), [vol, soundMixRow(s, { engine: engVol, music: musVol }, () => applySettings(d), () => d.store.commit()), mute]),
    panel(t('set.secGame'), [langRow(), shake, wp, hint]),
    panel(t('set.secControls'), [...extra.filter((e) => !e.dataset.adv), ...driving.basic]),
    panel(t('set.graphics'), gfx.basic),
  );
  const advanced = h('div', 'rb-settings');
  advanced.append(
    panel(t('set.secAudio'), [engVol, sfxVol, musVol, engineSoundRow(s, () => d.store.commit()), musicStyleRow(s, () => d.store.commit()), voice, soundCredits()]),
    panel(t('set.secGame'), [sizeRow('ctl.subSize', 'subtitleSize'), sizeRow('ctl.mapSize', 'minimapSize'), unlockAll(d.store)]),
    panel(t('set.secControls'), [...extra.filter((e) => e.dataset.adv), ...driving.advanced]),
    panel(t('set.graphics'), gfx.advanced),
  );
  root.append(settingsTabs(basic, advanced), button(t('common.back'), d.onBack));
  return root;
}

/** Every car owned for free (the garage then lets anyone try them all). Under Advanced > Game. */
function unlockAll(store: SaveStore): HTMLElement {
  const b = button('', () => {
    for (const c of CARS) if (!store.data.owned.includes(c.id)) store.data.owned.push(c.id);
    store.commit();
    b.textContent = t('set.allUnlocked');
  });
  const all = CARS.every((c) => store.data.owned.includes(c.id));
  b.textContent = t(all ? 'set.allUnlocked' : 'set.unlockAll');
  return b;
}
