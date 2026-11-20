import type { DataConnection, Peer } from 'peerjs';
import { isMsg, ROOM_PREFIX, type NetMsg } from './protocol';

/**
 * WebRTC transport (PeerJS: free public broker for the handshake, then direct peer-to-peer data channels).
 * The host registers the room id and accepts connections; a guest opens one connection to the host.
 * PeerJS is loaded on demand so it never weighs on the single-player start.
 */
export class PeerLink {
  private peer: Peer | null = null;
  private readonly conns = new Map<string, DataConnection>();
  myId = '';
  onMsg: (from: string, m: NetMsg) => void = () => {};
  onJoin: (id: string) => void = () => {};
  onLeave: (id: string) => void = () => {};
  onError: (code: string, msg: string) => void = () => {};
  /** Never fires: a PeerJS room ends when its host leaves (only the own lobby server hands the room over). */
  onPromote: (host: string, old: string) => void = () => {};

  private async make(id?: string): Promise<Peer> {
    const { Peer: P } = await import('peerjs');
    const peer = id ? new P(id, { debug: 0 }) : new P({ debug: 0 });
    this.peer = peer;
    peer.on('error', (e: Error & { type?: string }) => this.onError(e.type ?? 'error', e.message));
    peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
    return new Promise((res, rej) => {
      peer.once('open', (pid) => { this.myId = pid; res(peer); });
      peer.once('error', (e) => rej(e));
    });
  }

  /** Host a room with this code. Rejects with type 'unavailable-id' when the code is taken. */
  async host(code: string): Promise<void> {
    const peer = await this.make(ROOM_PREFIX + code);
    peer.on('connection', (c) => this.wire(c));
  }

  /** Join the room with this code. */
  async join(code: string): Promise<void> {
    const peer = await this.make();
    const c = peer.connect(ROOM_PREFIX + code, { serialization: 'json', reliable: true });
    await new Promise<void>((res, rej) => {
      const t = window.setTimeout(() => rej(Object.assign(new Error('timeout'), { type: 'peer-unavailable' })), 12000);
      c.once('open', () => { window.clearTimeout(t); res(); });
      peer.once('error', (e) => { window.clearTimeout(t); rej(e); });
      this.wire(c);
    });
  }

  private wire(c: DataConnection): void {
    c.on('open', () => {
      this.conns.set(c.peer, c);
      this.onJoin(c.peer);
    });
    c.on('data', (d) => { if (isMsg(d)) this.onMsg(c.peer, d); });
    const gone = (): void => {
      if (this.conns.get(c.peer) !== c) return;
      this.conns.delete(c.peer);
      this.onLeave(c.peer);
    };
    c.on('close', gone);
    c.on('error', gone);
  }

  send(to: string, m: NetMsg): void {
    const c = this.conns.get(to);
    if (c?.open) c.send(m);
  }

  /** To every connection, except `skip`. */
  broadcast(m: NetMsg, skip = ''): void {
    for (const [id, c] of this.conns) if (id !== skip && c.open) c.send(m);
  }

  kick(id: string): void {
    this.conns.get(id)?.close();
  }

  close(): void {
    for (const c of this.conns.values()) c.close();
    this.conns.clear();
    this.peer?.destroy();
    this.peer = null;
    this.myId = '';
  }
}
