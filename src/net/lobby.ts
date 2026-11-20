import { createLink } from './makeLink';
import { makeRoomCode, MAX_PLAYERS, type NetMsg, type NetPlayer, type NetState, type RoomSettings } from './protocol';

export type LobbyError = '' | 'noRoom' | 'full' | 'racing' | 'hostLeft' | 'net';

/**
 * Online room: who is in it, the host's race settings and the start handshake. The host is the hub: it relays every
 * message, and its "start" puts everyone on the same grid; it says "go" once all players loaded (or after 15 s).
 */
export class Lobby {
  readonly link = createLink();
  role: 'none' | 'host' | 'guest' = 'none';
  code = '';
  me: NetPlayer = { id: '', name: '', car: '', paint: 0 };
  players: NetPlayer[] = [];
  hostId = '';
  settings: RoomSettings = { track: 'kestrel', weather: 'CLEAR' };
  racing = false;
  busy = false;
  error: LobbyError = '';
  errorText = '';
  onChange: () => void = () => {};
  onStart: (m: Extract<NetMsg, { k: 'start' }>) => void = () => {};
  onGo: () => void = () => {};
  onState: (s: NetState) => void = () => {};
  private ready = new Set<string>();
  private roster: string[] = [];
  private goTimer = 0;

  constructor() {
    const L = this.link;
    L.onMsg = (from, m) => (this.role === 'host' ? this.hostMsg(from, m) : this.guestMsg(m));
    L.onLeave = (id) => {
      if (this.role === 'guest') return this.fail('hostLeft');
      this.players = this.players.filter((p) => p.id !== id);
      this.ready.delete(id);
      this.roster = this.roster.filter((r) => r !== id);
      this.checkGo();
      this.pushLobby();
    };
    L.onPromote = (host, old) => { // own lobby server: the host left, the room (and a running race) goes on
      this.players = this.players.filter((p) => p.id !== old);
      this.hostId = host;
      if (host === this.me.id) { this.role = 'host'; this.roster = []; this.pushLobby(); } else this.onChange();
    };
    L.onError = (code, msg) => {
      if (this.busy) return; // the pending create/join reports it
      if (code === 'peer-unavailable' || code === 'network' || code === 'server-error') this.fail('net', msg);
    };
  }

  get inRoom(): boolean {
    return this.role !== 'none';
  }

  /** pub: listed in the lobby server's public room list (quick join). */
  async create(me: NetPlayer, pub = false): Promise<void> {
    await this.run(async () => {
      for (let tries = 0; tries < 4; tries++) {
        this.code = makeRoomCode();
        try {
          await this.link.host(this.code, pub);
          break;
        } catch (e) {
          this.link.close();
          if ((e as { type?: string }).type !== 'unavailable-id' || tries === 3) throw e;
        }
      }
      this.role = 'host';
      this.me = { ...me, id: this.link.myId };
      this.hostId = this.me.id;
      this.players = [this.me];
    });
  }

  async join(code: string, me: NetPlayer): Promise<void> {
    await this.run(async () => {
      this.code = code;
      await this.link.join(code);
      this.role = 'guest';
      this.me = { ...me, id: this.link.myId };
      this.link.broadcast({ k: 'hello', p: this.me });
    });
  }

  private async run(fn: () => Promise<void>): Promise<void> {
    this.busy = true;
    this.error = '';
    this.onChange();
    try {
      await fn();
    } catch (e) {
      this.link.close();
      this.role = 'none';
      const type = (e as { type?: string }).type;
      this.error = type === 'peer-unavailable' ? 'noRoom' : type === 'full' ? 'full' : type === 'racing' ? 'racing' : 'net';
      this.errorText = (e as Error).message ?? '';
    }
    this.busy = false;
    this.onChange();
  }

  leave(): void {
    window.clearTimeout(this.goTimer);
    this.link.close();
    this.role = 'none';
    this.players = [];
    this.racing = false;
    this.onChange();
  }

  setSettings(s: Partial<RoomSettings>): void {
    if (this.role !== 'host') return;
    Object.assign(this.settings, s);
    this.pushLobby();
  }

  /** Host: everyone in the room races now. */
  start(): void {
    if (this.role !== 'host') return;
    const m: NetMsg = { k: 'start', settings: { ...this.settings }, seed: (Math.random() * 65535) | 0, roster: [...this.players] };
    this.racing = true;
    this.roster = this.players.map((p) => p.id);
    this.ready.clear();
    this.link.broadcast(m);
    this.pushLobby();
    window.clearTimeout(this.goTimer);
    this.goTimer = window.setTimeout(() => this.go(), 15000); // a slow loader does not hold everyone forever
    this.onStart(m);
  }

  /** Called when the local race is loaded and waiting on the grid. */
  loaded(): void {
    if (this.role === 'host') {
      this.ready.add(this.me.id);
      this.checkGo();
    } else this.link.broadcast({ k: 'ready' });
  }

  /** Host: the race is over for us; the room can start the next one. */
  backToLobby(): void {
    if (this.role !== 'host') return;
    this.racing = false;
    this.pushLobby();
  }

  sendState(s: NetState): void {
    this.link.broadcast({ k: 'st', s }); // host: to all guests; guest: its only connection is the host
  }

  private go(): void {
    window.clearTimeout(this.goTimer);
    if (!this.roster.length) return;
    this.roster = [];
    this.link.broadcast({ k: 'go' });
    this.onGo();
  }

  private checkGo(): void {
    if (this.roster.length && this.roster.every((id) => this.ready.has(id))) this.go();
  }

  private pushLobby(): void {
    this.link.broadcast({ k: 'lobby', players: this.players, host: this.hostId, settings: this.settings, racing: this.racing });
    this.onChange();
  }

  private hostMsg(from: string, m: NetMsg): void {
    if (m.k === 'hello') {
      if (this.players.length >= MAX_PLAYERS) {
        this.link.send(from, { k: 'reject', why: 'full' });
        window.setTimeout(() => this.link.kick(from), 300);
        return;
      }
      this.players = [...this.players.filter((p) => p.id !== from), { ...m.p, id: from }];
      this.pushLobby();
    } else if (m.k === 'ready') {
      this.ready.add(from);
      this.checkGo();
    } else if (m.k === 'st' && m.s.id === from) {
      this.link.broadcast(m, from);
      this.onState(m.s);
    }
  }

  private guestMsg(m: NetMsg): void {
    if (m.k === 'lobby') {
      this.players = m.players;
      this.hostId = m.host;
      this.settings = m.settings;
      this.racing = m.racing;
      this.onChange();
    } else if (m.k === 'start') this.onStart(m);
    else if (m.k === 'go') this.onGo();
    else if (m.k === 'st') this.onState(m.s);
    else if (m.k === 'reject') this.fail(m.why);
  }

  private fail(e: LobbyError, text = ''): void {
    this.leave();
    this.error = e;
    this.errorText = text;
    this.onChange();
  }
}
