import { findCar } from '../data/cars';
import { findTrackDef } from '../data/tracks';
import { t } from '../i18n';
import { Lobby } from '../net/lobby';
import { NetAgent } from '../net/netAgent';
import { placeGrid } from '../net/netGrid';
import { SEND_HZ, type NetMsg, type NetPlayer } from '../net/protocol';
import type { SaveStore } from '../core/save';
import type { ResultsExtra } from '../ui/results';
import { toast } from '../ui/uiKit';
import type { Game } from './game';

export interface OnlineDeps {
  game: Game;
  store: SaveStore;
  bypass: (fn: () => void) => void;
  hideMenu: () => void;
  showLobby: () => void;
  leaveToMenu: () => void;
}

export interface Online {
  lobby: Lobby;
  /** The player as the room sees them: name and garage car. */
  me: () => NetPlayer;
}

const NAME_KEY = 'ns-online-name';

/** Online races: builds the race from the host's "start", drives the other players' cars from their packets, sends ours. */
export function installOnline(d: OnlineDeps): Online {
  const { game, store } = d;
  const lobby = new Lobby();
  const agents = new Map<string, NetAgent>();
  let active = false;

  const me = (): NetPlayer => {
    const id = store.data.selected;
    let name = '';
    try { name = localStorage.getItem(NAME_KEY) ?? ''; } catch { /* private mode */ }
    return { id: '', name: name || 'Driver', car: id, paint: store.data.paint[id] ?? findCar(id).color, glow: store.data.glow[id], upgrades: store.data.upgrades[id] ?? {} };
  };

  const begin = (m: Extract<NetMsg, { k: 'start' }>): void => {
    if (!m.roster.some((p) => p.id === lobby.me.id)) return; // joined after the start: wait for the next race
    const def = findTrackDef(m.settings.track);
    const self = m.roster.find((p) => p.id === lobby.me.id) as NetPlayer;
    const others = m.roster.filter((p) => p.id !== self.id);
    agents.clear();
    const field = others.map((p) => {
      const a = new NetAgent(p.id, p.name);
      agents.set(p.id, a);
      return { agent: a, car: findCar(p.car), paint: p.paint, glow: p.glow, upgrades: p.upgrades };
    });
    d.hideMenu();
    const car = findCar(self.car);
    d.bypass(() => game.startRace({ car, paint: self.paint, glow: self.glow, weather: m.settings.weather, laps: def.laps, trackId: def.id, cinematic: false, agents: field }));
    const racers = game.rm.racers;
    for (const r of racers) if (r.agent instanceof NetAgent) { r.agent.racer = r; r.remote = true; }
    const byId = (id: string) => (id === self.id ? game.player : racers.find((r) => r.agent?.id === id));
    placeGrid(game.rm, m.roster.map((p) => byId(p.id)).filter((r) => r !== undefined));
    game.world.surfaces.reseed(m.seed); // same puddles and snow banks for everyone
    game.world.syncSurfaces(game.weather);
    game.rm.phase = 'GRID'; // hold until the host's "go"
    game.views.update(0, 0);
    game.syncView(true);
    active = true;
    toast(t('on.waitGrid'), 2500);
    lobby.loaded();
  };

  lobby.onStart = begin;
  lobby.onGo = () => { if (active && game.rm.phase === 'GRID') game.rm.begin(); };
  lobby.onState = (s) => agents.get(s.id)?.receive(s);

  const leave = (): void => {
    active = false;
    lobby.backToLobby();
  };
  window.setInterval(() => {
    if (!active) return;
    if (game.state === 'MENU') return leave(); // quit from the pause menu
    if (game.rm.phase === 'GRID' || game.rm.phase === 'COUNTDOWN') return;
    const p = game.player, c = p.car, i = p.input;
    lobby.sendState({
      id: lobby.me.id, x: c.state.position.x, z: c.state.position.z, h: c.state.heading, u: c.u, v: c.v, r: c.r,
      i: [i.throttle, i.brake, i.steer, i.handbrake ? 1 : 0, i.nitro ? 1 : 0], lap: p.laps.laps, fin: p.finishTime,
    });
  }, 1000 / SEND_HZ);

  // results: back to the room instead of cash and restart
  const finish = game.onFinish;
  game.onFinish = (r): ResultsExtra | void => {
    if (!active) return finish?.(r);
    return {
      objective: t('on.result'), passed: r.position === 1,
      buttons: [{ label: t('on.lobby'), hot: true, action: () => { leave(); d.leaveToMenu(); d.showLobby(); } }],
    };
  };
  const restart = game.restart.bind(game);
  game.restart = () => { if (!active) restart(); }; // no solo restart in a shared race
  return { lobby, me };
}

export const saveOnlineName = (name: string): void => {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* private mode */ }
};
