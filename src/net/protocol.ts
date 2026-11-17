/** Online race messages (JSON over WebRTC data channels, star around the host). Pure types and helpers. */
import type { Upgrades } from '../data/upgrades';
import type { Weather } from '../types/game';

export const MAX_PLAYERS = 8;
/** Peer id prefix: the host registers `${ROOM_PREFIX}${code}` on the PeerJS broker. */
export const ROOM_PREFIX = 'neonspeed-r1-';
/** State packets per second each player sends. */
export const SEND_HZ = 20;

export interface NetPlayer {
  id: string;
  name: string;
  car: string;
  paint: number;
  glow?: number;
  upgrades?: Upgrades;
}

export interface RoomSettings {
  track: string;
  weather: Weather;
}

/** Car state + input of one player. x/z position, h heading, u/v body speeds, r yaw rate; i = [throttle, brake, steer, handbrake, nitro]. */
export interface NetState {
  id: string;
  x: number;
  z: number;
  h: number;
  u: number;
  v: number;
  r: number;
  i: [number, number, number, number, number];
  /** Laps completed and finish time (0 = still racing), for the results. */
  lap: number;
  fin: number;
}

export type NetMsg =
  | { k: 'hello'; p: NetPlayer }
  | { k: 'lobby'; players: NetPlayer[]; host: string; settings: RoomSettings; racing: boolean }
  | { k: 'start'; settings: RoomSettings; seed: number; roster: NetPlayer[] }
  | { k: 'ready' }
  | { k: 'go' }
  | { k: 'st'; s: NetState }
  | { k: 'reject'; why: 'full' | 'racing' };

/** 4 letters, no look-alikes (I/O/0/1 left out). */
export function makeRoomCode(rand: () => number = Math.random): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let s = '';
  for (let i = 0; i < 4; i++) s += A[Math.floor(rand() * A.length)];
  return s;
}

export const cleanCode = (s: string): string => s.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
export const cleanName = (s: string): string => s.replace(/[<>&"']/g, '').trim().slice(0, 16) || 'Driver';

/** Rejects anything that is not a well-formed message (data from other players is untrusted). */
export function isMsg(d: unknown): d is NetMsg {
  if (!d || typeof d !== 'object') return false;
  const k = (d as { k?: unknown }).k;
  if (k === 'st') {
    const s = (d as { s?: Partial<NetState> }).s;
    return !!s && typeof s.id === 'string' && [s.x, s.z, s.h, s.u, s.v, s.r].every((n) => typeof n === 'number' && Number.isFinite(n)) && Array.isArray(s.i) && s.i.length === 5;
  }
  return k === 'hello' || k === 'lobby' || k === 'start' || k === 'ready' || k === 'go' || k === 'reject';
}
