import type { Engine } from '../core/engine';
import type { SaveStore } from '../core/save';
import type { Game } from './game';
import type { Hud } from '../ui/hud';
import type { ShopKind } from '../core/shops';
import type { CityRace } from '../core/cityRace';
import { FLOW_HOOK } from './roamFlow';
import { cityGraph } from './cityRaces';
import { planOutrun } from '../core/cityEvents';
import { repLevel } from '../core/rep';
import { emptyRoam } from '../core/roamSaveParse';
import { competitiveField, type FieldEntry } from '../data/rivals';
import { findCar } from '../data/cars';
import { roamOffer } from '../ui/roamOffer';
import { t } from '../i18n';

/** Save a visit / win key once (`shop:<kind>`, `win:<map id>`): district completion counts them. */
export function markVisit(store: SaveStore, key: string): void {
  const r = (store.data.roam ??= emptyRoam());
  if (!r.visited.includes(key)) { r.visited.push(key); store.commit(); }
}

/** Outrun from the junctions nearest (x, z): the first that gives a valid run (the nearest one may be a dead end). */
export function outrunNear(x: number, z: number): CityRace | null {
  const g = cityGraph();
  const near = g.nodes.filter((n) => n.edges.length >= 2).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
  for (let i = 0; i < Math.min(6, near.length); i++) { const r = planOutrun(g, near[i].id); if (r) return r; }
  return null;
}

/**
 * World flow, the launcher side (Underground round, stage 2): the shop card (leaves Free Drive for the garage screens and
 * comes back to the same spot), and the challenger card (flash lights = an outrun against that one rival on a race map
 * built from the GPS). One call from freeDriveSetup.
 */
export function installFlow(d: { engine: Engine; game: Game; hud: Hud; store: SaveStore; shop: (k: ShopKind, back: () => void) => void; enterRoam: () => void; startRace: (r: CityRace, field: FieldEntry[]) => void }): void {
  const { game, store } = d;
  let shop: ShopKind | null = null, rival: FieldEntry | null = null, at = { x: 0, z: 0 };
  const can = (): boolean => game.state === 'FREEROAM' && !game.paused;
  FLOW_HOOK.level = () => repLevel(store.data.rep ?? 0);
  FLOW_HOOK.done = (k) => store.data.roam?.visited.includes(k) ?? false;

  const shopCard = roamOffer('Enter', () => {
    if (!shop || !can()) return;
    const k = shop;
    shopCard.hide(); shop = null;
    markVisit(store, `shop:${k}`);
    d.shop(k, () => d.enterRoam());
  });
  FLOW_HOOK.shop = (s) => {
    shop = s?.kind ?? null;
    if (!s) shopCard.hide(); else shopCard.show(t(`shop.${s.kind}`), t(`shop.${s.kind}.i`), t('shop.enter'), t('shop.key'));
  };

  const chCard = roamOffer('KeyH', () => {
    if (!rival || !can()) return;
    const r = outrunNear(at.x, at.z);
    if (!r) { d.hud.popUp(t('ch.none'), '#ff5470'); return; }
    chCard.hide();
    d.hud.popUp(t('ch.flash'), '#fff6c8');
    d.startRace(r, [rival]);
  }, 'rb-ch-offer');
  FLOW_HOOK.challenge = (k, x, z) => {
    if (k < 0) { chCard.hide(); return; }
    const car = findCar(store.data.selected);
    rival = competitiveField(1, car, store.data.upgrades[car.id] ?? {})[0]; // a car of your tier, your upgrade levels, full skill
    at = { x, z };
    chCard.show(t('ch.title', { name: rival.agent.name }), t('ch.info', { car: rival.car.name }), t('ch.flash'), t('ch.key'));
  };
  d.engine.onFrame(() => { if (game.state !== 'FREEROAM') { if (shopCard.shown) shopCard.hide(); if (chCard.shown) chCard.hide(); } });
}
