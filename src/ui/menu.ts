import { isPhone } from '../core/quality';
import { MUSIC_CUE } from '../audio/audioParams';
import type { Engine } from '../core/engine';
import type { AudioBus } from '../audio/audioBus';
import { findCar, type CarSpec } from '../data/cars';
import type { SaveStore } from '../core/save';
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
import { buildWeatherPick } from './weatherPick';
import { buildDuelMenu } from './duelMenu';
import { dailyButton } from './dailyButton'; import { freeDriveButton } from './freeDriveButton';
import type { TrackDef } from '../data/tracks';
import { menuHeader } from './repChip';
import { button, feat, h, injectCss, wordmark } from './uiKit';
import { onInstallChange } from '../core/install';
import { onLangChange, t } from '../i18n';
import { installButton } from './installButton';
import { langCorner, langRow } from './langRow';
import { garageLayout, type GarageLayout } from './garageConfig';

export interface MenuDeps {
  /** Screen and phone-control rows for Settings (ui/controlSettings). */
  controlRows?: () => HTMLElement[];
  store: SaveStore;
  audio: AudioBus;
  engine: Engine;
  voice: Voice;
  auto: { enabled: boolean };
  game: { physicsLevel: PhysicsLevel; chase: { tuning: import('../camera/chaseCam').ChaseTuning } };
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
  startRace: (w: Weather, rivals: number, trackId: string, duel?: string) => void;
  slots: SaveSlots;
  /** Re-read the saved driving preferences (assists, sensitivity, gamepad). */
  onDriving?: () => void;
  /** Load a save (slot or autosave) and resume that race. */
  loadSlot: (id: SlotId) => void;
  /** Online screen (ui/onlineMenu), built by main once the online module exists. */
  online: (onBack: () => void) => HTMLElement;
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
    onInstallChange(() => this.screen === 'main' && this.main()); // the browser offers its install prompt late
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'Enter' && this.screen === 'title') {
        e.preventDefault(); // the new menu's focused button must not also receive this Enter
        this.main();
      }
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
    MUSIC_CUE.mood = layout === 'main' || layout === 'menu' ? null : 'garage'; // garage layouts get the lo-fi half-time mood
    this.again = again;
    this.layer?.remove();
    this.cash?.remove();
    this.layer = el;
    this.screen = s;
    document.body.appendChild(el);
    if (s !== 'title') document.body.appendChild((this.cash = menuHeader(this.d.store)));
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
    const el = h('div', 'rb-layer rb-hero');
    el.style.justifyContent = 'flex-end';
    el.style.paddingBottom = 'max(6vh,env(safe-area-inset-bottom))';
    el.append(wordmark(), h('div', 'rb-sub', t('menu.chapter')), button(t('menu.press'), () => this.main(), 'hot'));
    if (!isPhone()) el.append(h('div', 'rb-hint', t('menu.keys')));
    el.append(langRow(undefined, false)); // first-run language choice (also in Settings)
    this.mount(el, 'title', 'main', () => this.title());
  }

  main(): void {
    this.backdrop();
    const el = h('div', 'rb-layer rb-main');
    el.append(h('div', 'rb-logo', "NEON SPEED"), h('div', 'rb-sub', t('menu.chapter')));
    const stack = h('div', 'rb-stack');
    const latest = this.d.slots.latest();
    if (latest) {
      const c = button(t('menu.continue'), () => this.d.loadSlot(latest.id), 'hot');
      c.title = describe(latest.snap);
      stack.append(c);
    }
    stack.append(button(t('menu.story'), () => this.story(), latest ? '' : 'hot'), feat(button(t('menu.freeRace'), () => this.maps())), feat(freeDriveButton()), button(t('menu.online'), () => this.online()), dailyButton((w, n, id) => this.d.startRace(w, n, id)), button(t('menu.garage'), () => this.garage()), button(t('menu.tuning'), () => this.tune()), button(t('menu.crew'), () => this.crew()), ...(latest ? [button(t('menu.load'), () => this.load())] : []), button(t('menu.settings'), () => this.settings()));
    const install = installButton();
    if (install) stack.append(install);
    el.append(stack, langCorner()); // after the stack so the menu's first focus stays on the first menu button
    this.mount(el, 'main', 'menu', () => this.main());
  }

  online(): void {
    this.mount(this.d.online(() => this.main()), 'other', 'main', () => this.online());
  }

  load(): void {
    this.mount(buildLoadMenu(this.d.slots, (id) => this.d.loadSlot(id), () => this.main()), 'other', 'main', () => this.load());
  }

  tune(back = (): void => this.main()): void {
    this.mount(buildTuneMenu(this.d.store, back), 'other', 'main', () => this.tune(back));
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
    this.mount(buildTrackSelect({ store: this.d.store, onPick: (def) => this.weather(def), onBack: () => this.main(), onDuels: () => this.duels() }), 'other', 'main', () => this.maps());
  }

  duels(): void {
    this.mount(buildDuelMenu({ store: this.d.store, start: (du) => this.d.startRace(du.weather, 1, du.trackId, du.rival), onBack: () => this.maps() }), 'other', 'main', () => this.duels());
  }

  weather(def: TrackDef): void {
    this.mount(buildWeatherPick({ def, store: this.d.store, rivals: this.rivals, pick: (n) => { this.rivals = n; }, start: (w, n, id) => this.d.startRace(w, n, id), onBack: () => this.maps() }), 'other', 'main', () => this.weather(def));
  }

  garage(back = (): void => this.main()): void {
    const el = buildGarage({ store: this.d.store, preview: this.d.showroom, visual: this.d.visual, onSwap: this.d.onSwap, onBack: back });
    this.mount(el, 'other', garageLayout(window.innerWidth), () => this.garage(back));
  }

  /** The settings screen as an element; `back` is what its Back button does (main menu, or closing the overlay in the pause menu). */
  settingsPanel(back: () => void): HTMLElement {
    return buildSettings({ store: this.d.store, audio: this.d.audio, engine: this.d.engine, voice: this.d.voice, auto: this.d.auto, game: this.d.game, hud: this.d.hud, onDriving: this.d.onDriving, extraRows: this.d.controlRows, onBack: back });
  }

  settings(): void {
    this.mount(this.settingsPanel(() => this.main()), 'other', 'main', () => this.settings());
  }
}
