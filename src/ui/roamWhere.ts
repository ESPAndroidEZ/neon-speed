import type { DistrictId, RoadGraph } from '../types/world';
import type { RoadIndex } from '../world/roads/roadIndex';
import { createRoadHit } from '../world/roads/roadIndex';
import { streetName } from '../core/streetName';
import { DISTRICT_BLURB } from '../data/world/districtText';
import { t, tx, type StringKey } from '../i18n';

const EVERY = 0.5, BLURB_SECS = 6;

/**
 * Where you are in Free Drive (task 066): "Pier Road · Harbour" above the minimap; on entering a district its line shows
 * for a few seconds. Looked up twice a second from RoamActivities' step; the text only changes when the place changes.
 */
export class RoamWhere {
  private readonly el: HTMLDivElement;
  private readonly line: HTMLDivElement;
  private readonly hit = createRoadHit();
  private t = 0;
  private blurbT = 0;
  private district: DistrictId | null = null;
  private street = -1;
  private readonly g: RoadGraph;
  private readonly roads: RoadIndex;

  constructor(g: RoadGraph, roads: RoadIndex) {
    this.g = g;
    this.roads = roads;
    this.el = document.createElement('div');
    this.el.className = 'rb-where';
    this.el.style.cssText = 'position:fixed;left:max(12px,env(safe-area-inset-left));bottom:calc(max(12px,env(safe-area-inset-bottom)) + 175px);max-width:min(340px,60vw);z-index:11;font:700 13px system-ui,sans-serif;color:#cfefff;text-shadow:0 1px 3px #000;pointer-events:none';
    this.line = document.createElement('div');
    this.line.style.cssText = 'font-weight:500;font-size:12px;opacity:.85;margin-top:3px;transition:opacity .6s';
    const name = document.createElement('div');
    this.el.append(name, this.line);
    const css = document.createElement('style');
    css.textContent = '.rb-where{display:none}body.rb-roaming .rb-where{display:block}';
    document.head.appendChild(css);
    document.body.appendChild(this.el);
  }

  /** After a teleport: say the place again. */
  reset(): void { this.street = -1; this.t = EVERY; }

  update(dt: number, x: number, z: number): void {
    this.t += dt;
    if (this.blurbT > 0 && (this.blurbT -= dt) <= 0) this.line.style.opacity = '0';
    if (this.t < EVERY) return;
    this.t = 0;
    this.roads.nearestAny(x, z, this.hit);
    const id = this.hit.edge;
    if (id < 0 || id === this.street) return;
    this.street = id;
    const e = this.g.edges[id];
    (this.el.firstChild as HTMLDivElement).textContent = `${streetName(this.g, id)} · ${t(`district.${e.district}` as StringKey)}`;
    if (e.district !== this.district) {
      this.district = e.district;
      this.line.textContent = tx(DISTRICT_BLURB[e.district]);
      this.line.style.opacity = '1';
      this.blurbT = BLURB_SECS;
    }
  }

  dispose(): void { this.el.remove(); }
}
