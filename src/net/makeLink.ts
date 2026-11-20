import { isNative } from '../core/fullscreen';
import { HybridLink, lobbyUrl } from './hybridLink';
import { PeerLink } from './peerLink';
import { ServerLink, type WsLike } from './serverLink';

/** The game's transport: own lobby server (when there is one for this page) with PeerJS as the fallback. */
export function createLink(): HybridLink {
  let override: string | null = null;
  try { override = localStorage.getItem('ns-lobby-url'); } catch { /* private mode */ }
  const url = typeof location === 'undefined' ? null : lobbyUrl(location, isNative(), override);
  const server = url && typeof WebSocket !== 'undefined' ? new ServerLink(url, (u) => new WebSocket(u) as unknown as WsLike) : null;
  return new HybridLink(server, new PeerLink());
}
