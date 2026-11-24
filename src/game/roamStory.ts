import { Mesh, MeshBasicMaterial, OctahedronGeometry, type Group } from 'three';
import type { RoadGraph } from '../types/world';
import type { SaveStore } from '../core/save';
import type { RoamMap } from '../ui/roamMap';
import type { RoamActivities } from './roamActivities';
import { greeter, PIN_R, pinStates, placeStoryPins, type PinState, type StoryPin } from '../core/storyPins';
import { placeOf, STORY_PLACES } from '../data/world/storyPlaces';
import { findAnyEvent } from '../data/story2';
import { CREW } from '../data/lore';
import { pinView, type PinView } from '../world/open/pinView';
import { createCharacter, type Character } from '../world/characters';
import { heightAt } from '../world/roads/height';
import { storyCall, type StoryCall } from '../ui/storyOffer';
import { t, tx } from '../i18n';

const SLOW = 11; // m/s: the offer shows when you slow down inside a ring
const SEE = 170; // metres: the person at the next place is drawn this close

/** Between the city (RoamStory.step) and the launcher (game/storyPinLaunch.ts): which ring the car stopped in. */
export const STORY_HOOK: { offer(p: StoryPin | null, s: PinState): void } = { offer: () => {} };

/** Who waits at an event's place. */
export const whoAt = (event: string): string => greeter(findAnyEvent(event), placeOf(event)?.who);

/** Story places in Free Drive (docs/nfs-vision.md, item 1): rings and a beam in the city, the next person standing at the corner, a call with the GPS set. */
export class RoamStory {
  readonly pins: StoryPin[];
  /** Per pin: 0 locked, 1 available, 2 done. Same order as `pins`. */
  readonly states: Uint8Array;
  /** Per pin: the event title for the next one (map label), else ''. */
  readonly labels: string[];
  private readonly g: RoadGraph;
  private readonly group: Group;
  private readonly store: SaveStore;
  private readonly map: RoamMap;
  private readonly view: PinView;
  private readonly call: StoryCall;
  private figure: Character | null = null;
  private figureAt = -1;
  private readonly marker = new Mesh(new OctahedronGeometry(0.3, 0), new MeshBasicMaterial({ color: 0xff3aa6 }));
  private inside = -1;
  private armed = false;
  private announce = false;
  private clock = 0;

  constructor(g: RoadGraph, group: Group, store: SaveStore, acts: RoamActivities, map: RoamMap) {
    this.g = g; this.group = group; this.store = store; this.map = map;
    const avoid = [...acts.races.races, ...acts.zones, ...(acts.meetSpot ? [acts.meetSpot] : [])];
    this.pins = placeStoryPins(g, STORY_PLACES, avoid);
    this.states = new Uint8Array(this.pins.length);
    this.labels = this.pins.map(() => '');
    this.view = pinView(this.pins);
    this.call = storyCall();
    group.add(this.view.group, this.marker);
    this.marker.visible = false;
    acts.onPlace = (x, z) => this.place(x, z);
  }

  /** Entering Free Drive (or coming back from an event): states from the save, and the next place announced once the map has the car. */
  enter(): void {
    this.refresh();
    this.announce = true;
  }

  next(): number { return this.states.indexOf(1); }

  refresh(): void {
    pinStates(this.store.data.career, this.pins, this.states);
    this.view.set(this.states);
    const next = this.next();
    for (let i = 0; i < this.pins.length; i++) this.labels[i] = i === next ? tx(findAnyEvent(this.pins[i].event).title) : '';
    this.setFigure(next);
  }

  /** After a teleport or a return: wait until the car has left the ring it stands in. */
  place(x: number, z: number): void {
    this.inside = -1;
    this.armed = this.find(x, z) < 0;
    STORY_HOOK.offer(null, 0);
  }

  step(x: number, z: number, speed: number): void {
    const at = this.find(x, z);
    if (at < 0) { this.armed = true; if (this.inside >= 0) { this.inside = -1; STORY_HOOK.offer(null, 0); } return; }
    if (!this.armed || at === this.inside || Math.abs(speed) > SLOW) return;
    this.inside = at;
    STORY_HOOK.offer(this.pins[at], this.states[at] as PinState);
  }

  frame(dt: number, x: number, z: number): void {
    this.clock += dt;
    this.view.pulse(this.clock);
    if (this.figure) {
      const p = this.pins[this.figureAt], near = Math.hypot(p.x - x, p.z - z) < SEE;
      this.figure.group.visible = this.marker.visible = near;
      if (near) { this.figure.update(dt); this.marker.position.set(this.figure.group.position.x, this.figure.group.position.y + 2.9 + 0.15 * Math.sin(this.clock * 3), this.figure.group.position.z); this.marker.rotation.y = this.clock * 2; }
    }
    if (this.announce) { this.announce = false; this.tell(); }
  }

  dispose(): void {
    STORY_HOOK.offer(null, 0);
    this.setFigure(-1);
    this.view.dispose();
    this.call.dispose();
    this.marker.removeFromParent(); this.marker.geometry.dispose(); (this.marker.material as MeshBasicMaterial).dispose();
  }

  /** The next place: a phone call from the person there, a toast, and the GPS set when no route is active. */
  private tell(): void {
    const i = this.next();
    if (i < 0) return;
    const pin = this.pins[i], ev = findAnyEvent(pin.event), who = whoAt(pin.event), place = tx(placeOf(pin.event)?.place ?? '');
    const name = CREW.find((c) => c.id === who)?.name ?? '';
    this.call.show(who, name, t('pin.call', { place, event: tx(ev.title) }));
    if (!this.map.route) this.map.waypoint(pin.x, pin.z);
  }

  private find(x: number, z: number): number {
    for (let i = 0; i < this.pins.length; i++) if (this.states[i] && (this.pins[i].x - x) ** 2 + (this.pins[i].z - z) ** 2 < PIN_R * PIN_R) return i;
    return -1;
  }

  /** The person waiting at the next place stands on the corner between the first two roads of the junction, facing the ring. */
  private setFigure(i: number): void {
    if (i === this.figureAt) return;
    if (this.figure) { this.group.remove(this.figure.group); this.figure.dispose(); this.figure = null; this.marker.visible = false; }
    this.figureAt = i;
    if (i < 0) return;
    const pin = this.pins[i], n = this.g.nodes[pin.node];
    let bx = 0, bz = 1;
    if (n.edges.length > 1) {
      const a = this.dir(n.id, n.edges[0]), b = this.dir(n.id, n.edges[1]);
      bx = a[0] + b[0]; bz = a[1] + b[1];
      const l = Math.hypot(bx, bz);
      if (l < 0.3) { bx = -a[1]; bz = a[0]; } else { bx /= l; bz /= l; }
    }
    const d = n.radius + 2.5, x = n.x + bx * d, z = n.z + bz * d;
    const c = createCharacter(whoAt(pin.event));
    c.group.position.set(x, heightAt(x, z), z);
    c.group.rotation.y = Math.atan2(-bx, -bz);
    c.setPose('lean');
    c.group.scale.setScalar(1.3); // readable from a distance
    c.group.visible = false;
    this.group.add(c.group);
    this.figure = c;
  }

  private dir(node: number, edge: number): [number, number] {
    const e = this.g.edges[edge], p = e.pts, last = (e.cum.length - 1) * 2;
    const [dx, dz] = e.a === node ? [p[2] - p[0], p[3] - p[1]] : [p[last - 2] - p[last], p[last - 1] - p[last + 1]];
    const l = Math.hypot(dx, dz) || 1;
    return [dx / l, dz / l];
  }
}
