import type { AudioBus } from '../audio/audioBus';
import type { Engine } from '../core/engine';
import { applyQuality } from '../core/quality';
import type { Quality, SaveStore } from '../core/save';
import type { Voice } from './dialogue';
import { button, h } from './uiKit';

export interface SettingsDeps {
  store: SaveStore;
  audio: AudioBus;
  engine: Engine;
  voice: Voice;
  auto: { enabled: boolean };
  onBack: () => void;
}

/** Apply saved settings (call once at startup and after changes). */
export function applySettings(d: Omit<SettingsDeps, 'onBack'>): void {
  const s = d.store.data.settings;
  d.audio.setVolume(s.volume);
  d.audio.setMuted(s.muted);
  applyQuality(d.engine, s.quality);
  d.voice.enabled = s.voice;
  d.auto.enabled = s.autoQuality;
}

export function buildSettings(d: SettingsDeps): HTMLElement {
  const s = d.store.data.settings;
  const root = h('div', 'rb-layer dim');
  root.append(h('h2', 'rb-title', 'SETTINGS'));
  const vol = h('div', 'rb-row', `<span style="width:90px">Volume</span>`);
  const slider = h('input') as HTMLInputElement;
  slider.type = 'range';
  slider.min = '0';
  slider.max = '1';
  slider.step = '0.05';
  slider.value = String(s.volume);
  slider.addEventListener('input', () => {
    s.volume = parseFloat(slider.value);
    applySettings(d);
  });
  slider.addEventListener('change', () => d.store.commit());
  vol.append(slider);

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

  const q = h('div', 'rb-row', '<span style="width:90px">Quality</span>');
  (['low', 'medium', 'high'] as Quality[]).forEach((t) => {
    const b = button(t, () => {
      s.quality = t;
      applySettings(d);
      d.store.commit();
      refresh();
    });
    b.style.minWidth = '90px';
    q.append(b);
  });
  const refresh = (): void => {
    q.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.textContent === s.quality));
  };
  refresh();
  root.append(vol, mute, voice, q, auto, button('Back', d.onBack));
  return root;
}
