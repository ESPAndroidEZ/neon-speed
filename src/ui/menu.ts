import { isPhone } from '../core/quality';
import type { Engine } from '../core/engine';
import type { AudioBus } from '../audio/audioBus';
import { findCar, type CarSpec } from '../data/cars';
import type { SaveStore } from '../core/save';
import { WEATHER } from '../physics/weather';
import type { Weather } from '../types/game';
import type { CarVisual } from '../world/proceduralCar';
import type { StoryEvent } from '../data/story';
import { buildStoryMenu, buildEnding } from './storyMenu';
import type { PhysicsLevel } from '../physics/weatherLevels';
import type { Voice } from './dialogue';
import type { SaveSlots, SlotId } from '../core/gameSave';
import { buildLoadMenu, describe } from './saveUi';
import { buildCrewMenu } from './crewMenu';
import { buildGarage } from './garage';
import { buildSettings } from './settings';
import { buildTuneMenu } from './tuneMenu';
import { buildTrackSelect } from './trackSelect';
import type { TrackDef } from '../data/tracks';
import { button, h, injectCss, lapText, money, wordmark } from './uiKit';
import { onLangChange, t } from '../i18n';
import { langRow } from './langRow';
import { garageLayout, type GarageLayout } from './garageConfig';

export interface MenuDeps {
  /** Screen and phone-control rows for Settings (ui/controlSettings). */
  controlRows?: () => HTMLElement[];
  store: SaveStore;
  audio: AudioBus;
  engine: Engine;
  voice: Voice;
  auto: { enabled: boolean };
  game: { physicsLevel: PhysicsLevel; chase: { tuning: { shake: number; fovMin: number; fovMax: number } } };
  hud?: { setScale(s: number): void };
  /** Show a car as the 3D backdrop. */
  showroom: (car: CarSpec, paint: number, glow?: number) => void;
  /** Put the showroom car where this screen layout wants it (ui/garageConfig). */
  layout: (l: GarageLayout) => void;
  /** Visual of the car currently on show. */
  visual: () => CarVisual | null;
  /** Hook for when a GLB replaces the procedural body. */
  onSwap: (fn: (() => void) | null) => void;
  /** Launch a free race in this weather against `rivals` opponents (0 = time trial). */
  startRace: (w: Weather, rivals: number, trackId: string) => void;
  slots: SaveSlots;
  /** Re-read the saved driving preferences (assists, sensitivity, gamepad). */
  onDriving?: () => void;
  /** Load a save (slot or autosave) and resume that race. */
  loadSlot: (id: SlotId) => void;
  /** Start a story event. */
  startEvent: (ev: StoryEvent) => void;
}


/** Title -> main menu -> weather / garage / settings. All plain DOM over the live 3D scene. */
export class Menu {
  private readonly d: MenuDeps;
  private layer: HTMLElement | null = null;
  private cash: HTMLElement | null = null;
  private rivals = 3;
  private screen: 'none' | 'title' | 'main' | 'other' = 'none';
  /** Rebuilds the screen on show, so a language switch re-renders it live. */
  private again: (() => void) | null = null;

  constructor(d: MenuDeps) {
    injectCss();
    this.d = d;
    onLangChange(() => this.again?.());
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'Enter' && this.screen === 'title') this.main();
      else if (e.code === 'Escape' && this.screen === 'other') this.main();
    });
  }

  get active(): boolean {
    return this.screen !== 'none';
  }

  private backdrop(): void {
    const c = findCar(this.d.store.data.selected);
    this.d.showroom(c, this.d.store.data.paint[c.id] ?? c.color, this.d.store.data.glow[c.id]);
  }

  private mount(el: HTMLElement, s: 'title' | 'main' | 'other', layout: GarageLayout = 'main', again: (() => void) | null = null): void {
    this.d.layout(layout);
    this.again = again;
    this.layer?.remove();
    this.cash?.remove();
    this.layer = el;
    this.screen = s;
    document.body.appendChild(el);
    if (s !== 'title') {
      this.cash = h('div', 'rb-cash', money(this.d.store.data.cash));
      document.body.appendChild(this.cash);
    }
    el.querySelector('button')?.focus({ preventScroll: true });
  }

  hide(): void {
    this.layer?.remove();
    this.cash?.remove();
    this.layer = this.cash = null;
    this.screen = 'none';
    this.again = null;
  }

  title(): void {
    this.backdrop();
    const el = h('div', 'rb-layer');
    el.style.justifyContent = 'flex-end';
    el.style.paddingBottom = '12vh';
    el.append(wordmark(), h('div', 'rb-sub', t('menu.chapter')), button(t('menu.press'), () => this.main(), 'hot'));
    if (!isPhone()) el.append(h('div', 'rb-sub', t('menu.keys')));
    el.append(langRow(undefined, false)); // first-run language choice (also in Settings)
    this.mount(el, 'title', 'main', () => this.title());
  }

  main(): void {
    this.backdrop();
    const el = h('div', 'rb-layer');
    el.style.justifyContent = 'flex-end';
    el.style.paddingBottom = '10vh';
    const latest = this.d.slots.latest();
    if (latest) {
      const c = button(t('menu.continue'), () => this.d.loadSlot(latest.id), 'hot');
      c.title = describe(latest.snap);
      el.append(c);
    }
    el.append(button(t('menu.story'), () => this.story(), latest ? '' : 'hot'), button(t('menu.freeRace'), () => this.maps()), button(t('menu.garage'), () => this.garage()), button(t('menu.tuning'), () => this.tune()), button(t('menu.crew'), () => this.crew()), ...(latest ? [button(t('menu.load'), () => this.load())] : []), button(t('menu.settings'), () => this.settings()));
    this.mount(el, 'main', 'menu', () => this.main());
  }

  load(): void {
    this.mount(buildLoadMenu(this.d.slots, (id) => this.d.loadSlot(id), () => this.main()), 'other', 'main', () => this.load());
  }

  tune(): void {
    this.mount(buildTuneMenu(this.d.store, () => this.main()), 'other', 'main', () => this.tune());
  }

  crew(): void {
    this.mount(buildCrewMenu(this.d.store, () => this.main()), 'other', 'main', () => this.crew());
  }

  story(): void {
    this.mount(buildStoryMenu({ store: this.d.store, start: (ev) => this.d.startEvent(ev), onBack: () => this.main() }), 'other', 'main', () => this.story());
  }

  showEnding(chapter = 1): void {
    this.mount(buildEnding(this.d.store.data.career, chapter, () => this.main()), 'other', 'main', () => this.showEnding(chapter));
  }

  maps(): void {
    this.mount(buildTrackSelect({ store: this.d.store, onPick: (def) => this.weather(def), onBack: () => this.main() }), 'other', 'main', () => this.maps());
  }

  weather(def: TrackDef): void {
    const el = h('div', 'rb-layer dim');
    el.append(h('h2', 'rb-title', def.name.toUpperCase()));
    const riv = h('div', 'rb-row');
    const setRivals = (n: number): void => {
      this.rivals = n;
      riv.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.dataset.n === String(n)));
    };
    for (const [n, label] of [[0, 'menu.timeTrial'], [3, 'menu.rivals3'], [5, 'menu.rivals5']] as const) {
      const b = button(t(label), () => setRivals(n));
      b.dataset.n = String(n);
      b.style.minWidth = '130px';
      riv.append(b);
    }
    if (def.type === 'circuit') el.append(riv);
    setRivals(this.rivals);
    const row = h('div', 'rb-row');
    for (const w of ['CLEAR', 'RAIN', 'SNOW'] as Weather[]) {
      const card = h('div', 'rb-card', `<div style="font-size:26px;font-weight:900">${t(`weather.${w}`)}</div><div style="opacity:.8;margin:6px 0">${t(`weather.${w}.blurb`)}</div><div class="rb-sub">${t('menu.grip', { n: Math.round(WEATHER[w].grip * 100) })}<br>${t('menu.best')} ${lapText(this.d.store.data.trackBest[`${def.id}:${w}`] ?? null)}</div>`);
      card.addEventListener('click', () => this.d.startRace(w, def.type === 'circuit' ? this.rivals : 0, def.id));
      if (def.recommendedWeather.includes(w)) card.style.borderColor = '#ff2a9d';
      row.append(card);
    }
    el.append(row, h('div', 'rb-sub', t('menu.pink')), button(t('common.back'), () => this.maps()));
    this.mount(el, 'other', 'main', () => this.weather(def));
  }

  garage(): void {
    const el = buildGarage({ store: this.d.store, preview: this.d.showroom, visual: this.d.visual, onSwap: this.d.onSwap, onBack: () => this.main() });
    this.mount(el, 'other', garageLayout(window.innerWidth), () => this.garage());
  }

  settings(): void {
    this.mount(buildSettings({ store: this.d.store, audio: this.d.audio, engine: this.d.engine, voice: this.d.voice, auto: this.d.auto, game: this.d.game, hud: this.d.hud, onDriving: this.d.onDriving, extraRows: this.d.controlRows, onBack: () => this.main() }), 'other', 'main', () => this.settings());
  }
}
