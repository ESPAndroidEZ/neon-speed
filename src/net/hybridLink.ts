import type { NetMsg } from './protocol';
import { ServerLink, type NetLink, type RoomInfo } from './serverLink';

/** How long to skip the lobby server after it failed to answer (s): no 4-second wait on every try while it is down. */
const DOWN_FOR_MS = 60000;
const LIST_DOWN_MS = 10000;

/**
 * Our own lobby server first, PeerJS as the fallback (W3.3). Hosting: on the server when it answers, else PeerJS.
 * Joining: the server first; when it does not know the code (or is down), the PeerJS broker. Room list: server only.
 * Whatever transport won the last host/join carries the messages until close().
 */
export class HybridLink implements NetLink {
  private readonly server: ServerLink | null;
  private readonly peer: NetLink;
  private active: NetLink;
  private downUntil = 0;
  private readonly now: () => number;
  onMsg: (from: string, m: NetMsg) => void = () => {};
  onJoin: (id: string) => void = () => {};
  onLeave: (id: string) => void = () => {};
  onError: (code: string, msg: string) => void = () => {};

  constructor(server: ServerLink | null, peer: NetLink, now: () => number = Date.now) {
    this.server = server;
    this.peer = peer;
    this.now = now;
    this.active = peer;
    for (const l of server ? [server, peer] : [peer]) {
      l.onMsg = (f, m) => { if (this.active === l) this.onMsg(f, m); };
      l.onJoin = (id) => { if (this.active === l) this.onJoin(id); };
      l.onLeave = (id) => { if (this.active === l) this.onLeave(id); };
      l.onError = (c, m) => { if (this.active === l) this.onError(c, m); };
    }
  }

  get myId(): string {
    return this.active.myId;
  }

  /** The lobby server answered the last room listing (the UI shows the list only then). */
  get serverKnown(): boolean {
    return !!this.server?.listed && this.now() >= this.downUntil;
  }

  /** Which transport carries the room now (for the UI and tests). */
  get via(): 'server' | 'peer' {
    return this.active === this.server ? 'server' : 'peer';
  }

  private serverUp(): ServerLink | null {
    return this.server && this.now() >= this.downUntil ? this.server : null;
  }

  private down(e: unknown): void {
    if ((e as { type?: string }).type === 'network') this.downUntil = this.now() + DOWN_FOR_MS;
  }

  async host(code: string, pub = false): Promise<void> {
    const s = this.serverUp();
    if (s) {
      try {
        this.active = s;
        return await s.host(code, pub);
      } catch (e) {
        s.close();
        if ((e as { type?: string }).type !== 'network') throw e; // e.g. code taken: Lobby picks another
        this.down(e);
      }
    }
    this.active = this.peer;
    await this.peer.host(code);
  }

  async join(code: string): Promise<void> {
    const s = this.serverUp();
    if (s) {
      try {
        this.active = s;
        return await s.join(code);
      } catch (e) {
        s.close();
        const type = (e as { type?: string }).type;
        if (type === 'full' || type === 'racing') throw e; // the room is on the server: no point asking PeerJS
        this.down(e);
      }
    }
    this.active = this.peer;
    await this.peer.join(code);
  }

  /** Public rooms on the lobby server ([] when it is down or not configured). */
  async rooms(): Promise<RoomInfo[]> {
    const s = this.serverUp();
    if (!s) return [];
    const list = await s.rooms();
    if (!s.listed) this.downUntil = this.now() + LIST_DOWN_MS; // short: nobody waited for a listing
    if (this.active !== s) s.close(); // only a listing: free the socket until the player hosts or joins // only a listing: free the socket until the player hosts or joins
    return list;
  }

  send(to: string, m: NetMsg): void {
    this.active.send(to, m);
  }

  broadcast(m: NetMsg, skip = ''): void {
    this.active.broadcast(m, skip);
  }

  kick(id: string): void {
    this.active.kick(id);
  }

  close(): void {
    this.server?.close();
    this.peer.close();
    this.active = this.peer;
  }
}

/** Lobby server address: same site `/ws/` on the web, the game's server in the app, `ns-lobby-url` overrides (dev). */
export function lobbyUrl(loc: { protocol: string; host: string; hostname: string }, native: boolean, override: string | null): string | null {
  if (override) return override;
  if (native) return 'wss://notcarlos.mosidealus.nl/ws/';
  if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(loc.hostname)) return null; // dev server: no lobby unless overridden
  return `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}/ws/`;
}
