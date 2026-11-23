import type { RoadGraph, DistrictId } from '../types/world';
import type { SaveStore } from '../core/save';
import { MissionRunner, type Resolve } from '../core/missions';
import { MISSIONS } from '../data/world/missions';
import { missionCard, type MissionCard } from '../ui/missionCard';
import { districtAt } from '../world/roads/grammar';
import type { RoamActivities } from './roamActivities';
import type { RoamMap } from '../ui/roamMap';
import { t, type StringKey } from '../i18n';

/**
 * Free Drive missions (data in data/world/missions.ts, logic in core/missions.ts): an offer card when you drive into a
 * district that has one, then a clock, a GPS waypoint and a reward. Done flags and cash go into the roam save.
 */
export class RoamMissions {
  private readonly run: MissionRunner;
  private readonly card: MissionCard;
  private readonly store: SaveStore;
  private readonly map: () => RoamMap;
  private name = '';
  private lastDistrict: DistrictId = 'downtown';

  constructor(g: RoadGraph, acts: RoamActivities, store: SaveStore, map: () => RoamMap) {
    this.store = store; this.map = map;
    const resolve: Resolve = (poi) => {
      const [kind, arg] = poi.split(':');
      if (kind === 'meet') return acts.meetSpot;
      if (kind === 'zone') return acts.zones[Number(arg)] ?? null;
      if (kind === 'trap') return acts.traps[Number(arg)] ?? null;
      if (kind === 'token') return acts.tokens.tokens[Number(arg)] ?? null;
      if (kind === 'race') return acts.races.races.find((r) => r.district === arg) ?? null;
      return null;
    };
    const done = (store.data.roam?.visited ?? []).filter((v) => v.startsWith('m:'));
    this.run = new MissionRunner(MISSIONS, done, resolve);
    this.card = missionCard(() => this.accept());
    void g;
  }

  private accept(): void {
    if (!this.run.accept()) return;
    this.name = t(`mission.${this.run.current?.id}` as StringKey);
    this.map().waypoint(this.run.tx, this.run.tz);
  }

  /** Fixed-step update. */
  step(dt: number, x: number, z: number): void {
    const d = districtAt(x, z) as DistrictId;
    if (d !== this.lastDistrict && this.run.state === 'offered') this.card.hide();
    this.lastDistrict = d;
    const was = this.run.current;
    const ev = this.run.step(dt, x, z, d);
    if (ev === 'offer' && was !== this.run.current && this.run.current) {
      const id = this.run.current.id;
      this.card.offer(t(`mission.${id}` as StringKey), t(`mission.${id}.b` as StringKey));
    } else if (ev === 'win' && was) {
      this.map().clearWaypoint();
      const r = this.store.data.roam;
      if (r && was.reward.flag && !r.visited.includes(was.reward.flag)) r.visited.push(was.reward.flag);
      this.store.data.cash += was.reward.cash;
      this.store.commit();
      this.card.result(t('mission.paid', { cash: was.reward.cash.toLocaleString() }), true);
    } else if (ev === 'fail') { this.map().clearWaypoint(); this.card.result(t('mission.late'), false); }
    else if (this.run.state === 'active') this.card.active(this.name, this.run.left, Math.hypot(x - this.run.tx, z - this.run.tz));
    else if (this.run.state === 'idle' && this.card.offering) this.card.hide();
  }

  /** Leaving Free Drive or a teleport that should end the job. */
  stop(): void { this.run.abort(); this.card.hide(); }
}
