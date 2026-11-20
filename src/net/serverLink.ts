import { isMsg, type NetMsg } from './protocol';

/** What `Lobby` needs from a transport. PeerLink (WebRTC), ServerLink (own lobby server) and HybridLink offer it. */
export interface NetLink {
  myId: string;
  onMsg: (from: string, m: NetMsg) => void;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  onError: (code: string, msg: string) => void;
  host(code: string, pub?: boolean): Promise<void>;
  join(code: string): Promise<void>;
  send(to: string, m: NetMsg): void;
  broadcast(m: NetMsg, skip?: string): void;
  kick(id: string): void;
  close(): void;
}

/** One open room in the server's public list. */
export interface RoomInfo { code: string; n: number; max: number; track: string; weather: string; racing: boolean }

/** The part of the browser WebSocket we use (tests pass a fake). */
export interface WsLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((e: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
}

export const PROTOCOL_VERSION = 1;
const TIMEOUT_MS = 8000; // a phone busy loading the game can take seconds to run the socket's first event
/** Server error codes as the PeerJS error types Lobby already understands. */
const AS_PEER: Record<string, string> = { taken: 'unavailable-id', nope: 'peer-unavailable', full: 'full', racing: 'racing' };
type Reply = Record<string, unknown> & { t: string };

/**
 * Transport over our own lobby server (docs/online-protocol.md): one WebSocket, the server relays the game's messages
 * in the same star shape as PeerJS (a guest's only peer is the host). Errors reject with PeerJS-style `type`s.
 */
export class ServerLink implements NetLink {
  private readonly url: string;
  private readonly make: (url: string) => WsLike;
  private ws: WsLike | null = null;
  private waiting: { want: string; ok: (r: Reply) => void; fail: (e: Error) => void } | null = null;
  private hostId = '';
  private connecting: Promise<void> | null = null;
  private chain: Promise<void> = Promise.resolve();
  private role: 'none' | 'host' | 'guest' = 'none';
  myId = '';
  /** The last room listing reached the server. */
  listed = false;
  onMsg: (from: string, m: NetMsg) => void = () => {};
  onJoin: (id: string) => void = () => {};
  onLeave: (id: string) => void = () => {};
  onError: (code: string, msg: string) => void = () => {};
  /** A player's finish as stamped by the server (ms after the host's go). */
  onFin: (id: string, at: number) => void = () => {};

  constructor(url: string, make: (url: string) => WsLike) {
    this.url = url;
    this.make = make;
  }

  /** One request at a time (each waits for its own reply type); later callers queue behind it. */
  private ask(msg: Record<string, unknown> | null, want: string): Promise<Reply> {
    const run = this.chain.then(() => this.ask1(msg, want));
    this.chain = run.then(() => undefined, () => undefined);
    return run;
  }

  private ask1(msg: Record<string, unknown> | null, want: string): Promise<Reply> {
    return new Promise((ok, fail) => {
      const timer = setTimeout(() => { this.waiting = null; fail(Object.assign(new Error('lobby server timeout'), { type: 'network' })); }, TIMEOUT_MS);
      this.waiting = { want, ok: (r) => { clearTimeout(timer); ok(r); }, fail: (e) => { clearTimeout(timer); fail(e); } };
      if (msg) this.ws?.send(JSON.stringify(msg));
    });
  }

  /** Open the socket and say hi (once). Rejects with type 'network' when the server is not there. */
  connect(): Promise<void> {
    if (this.ws && this.myId) return Promise.resolve();
    this.connecting ??= this.open().finally(() => { this.connecting = null; });
    return this.connecting;
  }

  private async open(): Promise<void> {
    const ws = this.make(this.url);
    this.ws = ws;
    ws.onmessage = (e) => this.read(e.data);
    ws.onerror = () => this.waiting?.fail(Object.assign(new Error('lobby server unreachable'), { type: 'network' }));
    ws.onclose = () => this.lost(ws);
    const welcome = this.ask1(null, 'welcome'); // not queued: it is the reply to the socket opening
    ws.onopen = () => ws.send(JSON.stringify({ t: 'hi', v: PROTOCOL_VERSION }));
    try {
      this.myId = String((await welcome).id ?? '');
    } catch (e) {
      this.close();
      throw e;
    }
  }

  async host(code: string, pub = false): Promise<void> {
    await this.connect();
    await this.ask({ t: 'host', code, pub }, 'hosted');
    this.role = 'host';
  }

  async join(code: string): Promise<void> {
    await this.connect();
    const r = await this.ask({ t: 'join', code }, 'joined');
    this.role = 'guest';
    this.hostId = String(r.host ?? '');
    this.onJoin(this.hostId);
  }

  /** Public rooms that are open (empty when the server is not reachable). */
  async rooms(): Promise<RoomInfo[]> {
    try {
      await this.connect();
      const r = await this.ask({ t: 'list' }, 'rooms');
      this.listed = true;
      return Array.isArray(r.rooms) ? (r.rooms as RoomInfo[]) : [];
    } catch {
      this.listed = false;
      this.close();
      return [];
    }
  }

  send(to: string, m: NetMsg): void {
    this.out({ t: 'to', to, m });
  }

  broadcast(m: NetMsg, skip = ''): void {
    this.out(skip ? { t: 'all', m, skip } : { t: 'all', m });
  }

  kick(id: string): void {
    this.out({ t: 'kick', id });
  }

  close(): void {
    const ws = this.ws;
    this.ws = null;
    this.myId = this.hostId = '';
    this.role = 'none';
    this.waiting = null;
    if (ws) { ws.onclose = ws.onmessage = ws.onerror = null; ws.close(); }
  }

  private out(msg: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(msg));
  }

  private read(data: unknown): void {
    let r: Reply;
    try {
      r = JSON.parse(String(data)) as Reply;
    } catch {
      return;
    }
    const w = this.waiting;
    if (w && r.t === w.want) { this.waiting = null; return w.ok(r); }
    if (r.t === 'err') {
      const code = String(r.code ?? 'error');
      if (w) { this.waiting = null; return w.fail(Object.assign(new Error(String(r.msg || code)), { type: AS_PEER[code] ?? 'server-error' })); }
      return this.onError(AS_PEER[code] ?? 'server-error', String(r.msg ?? code));
    }
    if (r.t === 'msg' && typeof r.from === 'string' && isMsg(r.m)) this.onMsg(r.from, r.m);
    else if (r.t === 'peer' && typeof r.id === 'string') this.onJoin(r.id);
    else if (r.t === 'gone' && typeof r.id === 'string') this.onLeave(r.id);
    else if (r.t === 'fin' && typeof r.id === 'string' && typeof r.at === 'number') this.onFin(r.id, r.at);
  }

  private lost(ws: WsLike): void {
    if (this.ws !== ws) return;
    const role = this.role, host = this.hostId;
    this.ws = null;
    this.myId = '';
    this.waiting?.fail(Object.assign(new Error('lobby server closed'), { type: 'network' }));
    this.waiting = null;
    if (role === 'guest') this.onLeave(host); // like PeerJS: the guest's connection to the host is gone
    else if (role === 'host') this.onError('network', 'lobby server closed');
    this.role = 'none';
  }
}
