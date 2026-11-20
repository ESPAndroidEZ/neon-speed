# Online protocol: own lobby server (version 1)

Status: W3.1, written 2026-11-20, **waiting for the owner's review**. Server: `server/lobby/` (Python 3.12, standard
library only). Client: `src/net/serverLink.ts` (W3.3). PeerJS (`src/net/peerLink.ts`) stays as the fallback.

## 1. Idea in one paragraph
The lobby server is a **switchboard**. It does not run the race. It keeps rooms (a 4-letter code, a host, guests), a
public room list, and passes the game's existing messages (`NetMsg` in `src/net/protocol.ts`: hello, lobby, start,
ready, go, st, reject) between the players of one room, in the same star shape PeerJS uses (guests talk to the host,
the host talks to everyone). So `src/net/lobby.ts` keeps working unchanged: `ServerLink` offers the same methods as
`PeerLink` (host, join, send, broadcast, kick, close, onMsg, onJoin, onLeave, onError). On top, the server notes the
time it **received** each player's first "finished" state, so the finish order does not depend only on the clients' clocks.

## 2. Transport
- WebSocket at `wss://notcarlos.mosidealus.nl/ws/` (nginx `/ws/` -> 127.0.0.1:8770, request in `docs/admin-request.md`).
- Text frames, one JSON object per frame, at most **4096 bytes**. Binary and fragmented frames close the connection (1003).
- The server pings every 25 s (nginx drops idle connections after 120 s); a client that sends nothing for 90 s is closed.
- Allowed `Origin`: the game's site, `localhost` (dev) and the app origins (`capacitor://localhost`, `https://localhost`).

## 3. Messages (field `t`)
Client -> server

| t | fields | meaning |
|---|---|---|
| `hi` | `v` (protocol version, 1) | first message; anything else first closes with error `hello` |
| `host` | `code`, `pub` (bool) | open a room with this code (`pub`: listed in the public room list) |
| `join` | `code` | join a room |
| `list` | | ask for the public room list |
| `meta` | `track`, `weather`, `racing`, `pub` | host only, optional: update what the room list shows (the game does not need it: see below) |
| `to` | `to` (id), `m` (NetMsg) | pass `m` to one member of my room |
| `all` | `m`, `skip` (id, optional) | pass `m` to every other member (host) / to the host (guest) |
| `kick` | `id` | host only: remove a guest |
| `leave` | | leave the room (the connection stays open) |

Server -> client

| t | fields | meaning |
|---|---|---|
| `welcome` | `v`, `id` | your connection id (8 characters) |
| `hosted` | `code` | the room is yours |
| `joined` | `code`, `host` (id) | you are in; the host is your only peer (like a PeerJS guest) |
| `peer` | `id` | host only: a guest arrived (PeerJS `connection` + `open`) |
| `gone` | `id` | a peer left: for the host a guest, for a guest the host |
| `msg` | `from`, `m` | a NetMsg from a peer |
| `rooms` | `rooms`: `[{code, n, max, track, weather, racing}]` | public rooms that are not full, newest first, at most 50 |
| `promote` | `host`, `old` | the host (`old`) left: `host` (the guest who joined first) is the host now; the room and a running race go on |
| `fin` | `id`, `at` (server ms since the room's `go`) | sent to the whole room when a player's first `st` with `fin > 0` passes |
| `err` | `code`, `msg` | see section 4; after `hello`, `version`, `flood`, `size` the server closes |

Rules the server enforces
- Guests may only send `to` the host (or `all`, which reaches only the host); the host may send to anyone in the room.
- `m` must look like a NetMsg (`k` is one of the known kinds); the server does not change it.
- When the **host leaves**, the guest who joined first becomes the host and everyone gets `promote` (added 2026-11-20,
  optional for clients: an old client ignores it). The new host's `Lobby` relays from then on, so a race goes on
  (tested in `tests/lobby-handover-check.mts`). PeerJS rooms cannot do this: there the room ends with the host.
- A room code is free again when the last member leaves. Codes: 4 letters, `ABCDEFGHJKLMNPQRSTUVWXYZ` (same as `makeRoomCode`).
- The room list's track, weather and "racing" come from the host's own `lobby` NetMsg (`settings`, `racing`) as it passes, and `start` / `go` mark the room as racing; so the game sends no extra messages.
- The `go` time of a room is when the host's `go` message passes; `fin.at` is measured from it.

## 4. Errors (`err.code`)
`hello` (first message was not `hi`), `version` (unsupported `v`), `taken` (room code in use; the client maps it to
PeerJS's `unavailable-id`), `nope` (no such room: maps to `peer-unavailable`), `full` (8 players), `racing` (race
started: no joining), `notyours` (host-only message from a guest), `bad` (malformed message), `flood` (more than 60
messages per second, or 600 per 10 s), `size` (frame over 4096 bytes), `busy` (server limits: 400 connections, 200 rooms,
20 connections per address).

## 5. Limits and memory
400 connections, 200 rooms, 8 players per room, 20 connections per client address (`X-Real-IP` from nginx), 60
messages per second per connection (state packets are 20 per second), 4 KB per message. systemd `MemoryMax=128M`.
The server stores nothing on disk and logs only counts (no addresses, no names).

## 6. Client behaviour (src/net)
- `HybridLink`: host on the server when it answers, else PeerJS; join on the server first, and when the server does not know the code (`nope`) or is down, through PeerJS. After a failed host/join the server is skipped for 60 s (10 s after a failed room listing), so nobody waits twice.
- Every request waits up to 8 s for its reply (a phone busy loading the game can take seconds to run the first socket event); requests on one link are queued, one reply at a time.
- The Online screen shows "Open rooms" only when a listing reached the server; it retries up to 4 times, 12 s apart.
- Dev: there is no lobby on the dev server unless localStorage `ns-lobby-url` is set (e.g. `ws://127.0.0.1:8770/ws/`).

## 7. Versioning
`hi.v` is the protocol version. The server answers `welcome` with its own `v`; a client that does not know it falls back
to PeerJS. New optional fields may be added without a version change; removing or renaming one needs `v` 2.

## 8. Example
```
guest -> {"t":"hi","v":1}                <- {"t":"welcome","v":1,"id":"k3j9x0qa"}
guest -> {"t":"join","code":"QWRT"}      <- {"t":"joined","code":"QWRT","host":"h7d2m1zp"}
host  <- {"t":"peer","id":"k3j9x0qa"}
guest -> {"t":"all","m":{"k":"hello","p":{...}}}   host <- {"t":"msg","from":"k3j9x0qa","m":{"k":"hello",...}}
```
