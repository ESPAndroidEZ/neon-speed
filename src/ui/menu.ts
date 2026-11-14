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
import { button, h, injectCss, lapText, money } from './uiKit';

export interface MenuDeps {
  store: SaveStore;
  audio: AudioBus;
  engine: Engine;
  voice: Voice;
  auto: { enabled: boolean };
  game: { physicsLevel: PhysicsLevel; chase: { tuning: { shake: number } } };
  /** Show a car as the 3D backdrop. */
  showroom: (car: CarSpec, paint: number, glow?: number) => void;
  /** Slide the showroom car sideways on screen (garage panel sits on the left). */
  shift: (metres: number) => void;
  /** Visual of the car currently on show. */
  visual: () => CarVisual | null;
  /** Hook for when a GLB replaces the procedural body. */
  onSwap: (fn: (() => void) | null) => void;
  /** Launch a free race in this weather against `rivals` opponents (0 = time trial). */
  startRace: (w: Weather, rivals: number) => void;
  slots: SaveSlots;
  /** Re-read the saved driving preferences (assists, sensitivity, gamepad). */
  onDriving?: () => void;
  /** Load a save (slot or autosave) and resume that race. */
  loadSlot: (id: SlotId) => void;
  /** Start a story event. */
  startEvent: (ev: StoryEvent) => void;
}

const WEATHER_BLURB: Record<Weather, string> = { CLEAR: 'Full grip. Learn the lines.', RAIN: 'Wet tarmac: 72% grip, longer braking.', SNOW: 'Ice and slush: 45% grip. Pure drift.' };

/** Title -> main menu -> weather / garage / settings. All plain DOM over the live 3D scene. */
export class Menu {
  private readonly d: MenuDeps;
  private layer: HTMLElement | null = null;
  private cash: HTMLElement | null = null;
  private rivals = 3;
  private screen: 'none' | 'title' | 'main' | 'other' = 'none';

  constructor(d: MenuDeps) {
    injectCss();
    this.d = d;
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

  private mount(el: HTMLElement, s: 'title' | 'main' | 'other', shift = 0): void {
    this.d.shift(shift);
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
  }

  title(): void {
    this.backdrop();
    const el = h('div', 'rb-layer');
    el.style.justifyContent = 'flex-end';
    el.style.paddingBottom = '12vh';
    el.append(h('h1', 'rb-title', "RACER'S BLOOD"), h('div', 'rb-sub', 'Chapter 1 · Harbor Loop'), button('Press Enter / Tap', () => this.main(), 'hot'));
    el.append(h('div', 'rb-sub', 'W/S gas+brake · A/D steer · Space handbrake · Shift nitro · M mute · R reset'));
    this.mount(el, 'title');
  }

  main(): void {
    this.backdrop();
    const el = h('div', 'rb-layer');
    el.style.justifyContent = 'flex-end';
    el.style.paddingBottom = '10vh';
    const latest = this.d.slots.latest();
    if (latest) {
      const c = button('Continue', () => this.d.loadSlot(latest.id), 'hot');
      c.title = describe(latest.snap);
      el.append(c);
    }
    el.append(button('Story', () => this.story(), latest ? '' : 'hot'), button('Free Race', () => this.weather()), button('Garage', () => this.garage()), button('Crew', () => this.crew()), ...(latest ? [button('Load', () => this.load())] : []), button('Settings', () => this.settings()));
    this.mount(el, 'main');
  }

  load(): void {
    this.mount(buildLoadMenu(this.d.slots, (id) => this.d.loadSlot(id), () => this.main()), 'other');
  }

  crew(): void {
    this.mount(buildCrewMenu(this.d.store, () => this.main()), 'other');
  }

  story(): void {
    this.mount(buildStoryMenu({ store: this.d.store, start: (ev) => this.d.startEvent(ev), onBack: () => this.main() }), 'other');
  }

  showEnding(): void {
    this.mount(buildEnding(() => this.main()), 'other');
  }

  weather(): void {
    const el = h('div', 'rb-layer dim');
    el.append(h('h2', 'rb-title', 'FREE RACE'));
    const riv = h('div', 'rb-row');
    const setRivals = (n: number): void => {
      this.rivals = n;
      riv.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.dataset.n === String(n)));
    };
    for (const [n, label] of [[0, 'Time trial'], [3, '3 rivals'], [5, '5 rivals']] as const) {
      const b = button(label, () => setRivals(n));
      b.dataset.n = String(n);
      b.style.minWidth = '130px';
      riv.append(b);
    }
    el.append(riv);
    setRivals(this.rivals);
    const row = h('div', 'rb-row');
    for (const w of ['CLEAR', 'RAIN', 'SNOW'] as Weather[]) {
      const card = h('div', 'rb-card', `<div style="font-size:26px;font-weight:900">${w}</div><div style="opacity:.8;margin:6px 0">${WEATHER_BLURB[w]}</div><div class="rb-sub">Grip ${Math.round(WEATHER[w].grip * 100)}%<br>Best lap ${lapText(this.d.store.data.bestLap[w])}</div>`);
      card.addEventListener('click', () => this.d.startRace(w, this.rivals));
      row.append(card);
    }
    el.append(row, button('Back', () => this.main()));
    this.mount(el, 'other');
  }

  garage(): void {
    const el = buildGarage({ store: this.d.store, preview: this.d.showroom, visual: this.d.visual, onSwap: this.d.onSwap, onBack: () => this.main() });
    this.mount(el, 'other', window.innerWidth > 800 ? 1.9 : 0);
  }

  settings(): void {
    this.mount(buildSettings({ store: this.d.store, audio: this.d.audio, engine: this.d.engine, voice: this.d.voice, auto: this.d.auto, game: this.d.game, onDriving: this.d.onDriving, onBack: () => this.main() }), 'other');
  }
}
