import { Vector3, type PerspectiveCamera } from 'three';
import type { RacerView } from '../game/racerViews';
import { AUDIO } from './audioParams';
import type { AudioBus } from './audioBus';
import { createOscillatorVoice, createWorkletVoice, type EngineVoice } from './engineVoice';

const VOICES = 3;
const SOUND_SPEED = 343;
const LAYOUT = { i4: 0, v6: 1, i6: 2, rotary: 3 } as const;

interface Slot {
  voice: EngineVoice;
  panner: PannerNode;
  view: RacerView | null;
}

/** Engine sound of the nearest rivals, positioned in 3D with distance falloff and a manual Doppler shift. */
export class RivalEngines {
  private readonly bus: AudioBus;
  private readonly slots: Slot[] = [];
  private ready = false;

  constructor(bus: AudioBus) {
    this.bus = bus;
    void this.init();
  }

  private async init(): Promise<void> {
    const ctx = this.bus.ctx;
    for (let i = 0; i < VOICES; i++) {
      const voice = (await createWorkletVoice(ctx)) ?? createOscillatorVoice(ctx);
      const panner = ctx.createPanner();
      panner.panningModel = 'equalpower';
      panner.distanceModel = 'inverse';
      panner.refDistance = 7;
      panner.rolloffFactor = 1.4;
      panner.maxDistance = 140;
      voice.out.connect(panner).connect(this.bus.sfx);
      this.slots.push({ voice, panner, view: null });
    }
    this.ready = true;
  }

  /** Per frame: listener = chase camera; the VOICES nearest rivals get a voice each. */
  update(views: readonly RacerView[], camera: PerspectiveCamera, listenerVel: { x: number; z: number }, active: boolean): void {
    if (!this.ready) return;
    const l = this.bus.ctx.listener;
    if (l.positionX) {
      l.positionX.value = camera.position.x;
      l.positionY.value = camera.position.y;
      l.positionZ.value = camera.position.z;
      const f = camera.getWorldDirection(tmp);
      l.forwardX.value = f.x;
      l.forwardY.value = f.y;
      l.forwardZ.value = f.z;
    }
    const rivals = views.filter((v) => !v.racer.isPlayer).sort((a, b) => dist(a, camera) - dist(b, camera));
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      const v = rivals[i] ?? null;
      s.view = v;
      if (!v || !active) {
        s.voice.set(900, 0, 0, false, 0, 0);
        continue;
      }
      const car = v.racer.car;
      const st = car.state;
      const sound = v.spec.sound;
      s.panner.positionX.value = v.x;
      s.panner.positionY.value = 0.6;
      s.panner.positionZ.value = v.z;
      // Doppler: radial speed of the rival relative to the listener changes the pitch
      const dx = camera.position.x - v.x;
      const dz = camera.position.z - v.z;
      const d = Math.hypot(dx, dz) || 1;
      const vr = ((st.velocity.x - listenerVel.x) * dx + (st.velocity.z - listenerVel.z) * dz) / d; // + = approaching
      const pitch = Math.min(1.25, Math.max(0.8, SOUND_SPEED / (SOUND_SPEED - Math.max(-120, Math.min(120, vr)))));
      const dtn = car.drivetrain;
      s.voice.set(dtn.rpm * pitch, Math.min(1, 0.25 + Math.abs(st.speed) * 0.01 + (car.flags.wheelspin ? 0.5 : 0)), LAYOUT[sound.layout], dtn.rpm >= 7400, 0.5, 0.75 * AUDIO.rivalVolume * AUDIO.engineVolume);
    }
  }
}

const tmp = new Vector3();
const dist = (v: RacerView, c: PerspectiveCamera): number => (v.x - c.position.x) ** 2 + (v.z - c.position.z) ** 2;
