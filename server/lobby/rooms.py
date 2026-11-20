"""Lobby rules without sockets (docs/online-protocol.md): rooms, the public list, relay rules, finish receipt times.

A member is any object with `.id`, `.room` (code or None) and `.send(dict)`. `Hub.handle(member, msg)` applies one
client message; the asyncio service (lobby.py) only reads frames, calls it, and writes what `send` queued.
"""
import time

VERSION = 1
MAX_PLAYERS = 8
MAX_ROOMS = 200
CODE_CHARS = set("ABCDEFGHJKLMNPQRSTUVWXYZ")
NET_KINDS = {"hello", "lobby", "start", "ready", "go", "st", "reject"}
WEATHERS = {"CLEAR", "RAIN", "SNOW"}


def _str(v, n):
    return v[:n] if isinstance(v, str) else ""


class Room:
    def __init__(self, code, host, pub, track, weather, now):
        self.code, self.host, self.pub = code, host, pub
        self.track, self.weather = track, weather
        self.members = {host.id: host}
        self.racing = False
        self.created = now
        self.go_at = None
        self.fins = {}

    def info(self):
        return {"code": self.code, "n": len(self.members), "max": MAX_PLAYERS, "track": self.track,
                "weather": self.weather, "racing": self.racing}


class Hub:
    def __init__(self, clock=time.monotonic):
        self.rooms = {}
        self.clock = clock

    def err(self, m, code, msg=""):
        m.send({"t": "err", "code": code, "msg": msg})

    def handle(self, m, msg):
        """One message from member m (already JSON-decoded, after `hi`)."""
        t = msg.get("t") if isinstance(msg, dict) else None
        fn = getattr(self, "on_" + t, None) if isinstance(t, str) and t.isalpha() else None
        if fn is None:
            return self.err(m, "bad", "unknown message")
        fn(m, msg)

    # --- rooms -----------------------------------------------------------------------------------------------------
    def on_host(self, m, msg):
        code = _str(msg.get("code"), 4)
        if len(code) != 4 or not set(code) <= CODE_CHARS:
            return self.err(m, "bad", "room code")
        if code in self.rooms:
            return self.err(m, "taken")
        if len(self.rooms) >= MAX_ROOMS:
            return self.err(m, "busy", "too many rooms")
        self.leave(m)
        weather = msg.get("weather") if msg.get("weather") in WEATHERS else "CLEAR"
        self.rooms[code] = Room(code, m, bool(msg.get("pub")), _str(msg.get("track"), 24), weather, self.clock())
        m.room = code
        m.send({"t": "hosted", "code": code})

    def on_join(self, m, msg):
        r = self.rooms.get(_str(msg.get("code"), 4))
        if r is None:
            return self.err(m, "nope")
        if len(r.members) >= MAX_PLAYERS:
            return self.err(m, "full")
        if r.racing:
            return self.err(m, "racing")
        self.leave(m)
        r.members[m.id] = m
        m.room = r.code
        m.send({"t": "joined", "code": r.code, "host": r.host.id})
        r.host.send({"t": "peer", "id": m.id})

    def on_list(self, m, msg):
        rooms = [r for r in self.rooms.values() if r.pub and not r.racing and len(r.members) < MAX_PLAYERS]
        rooms.sort(key=lambda r: -r.created)
        m.send({"t": "rooms", "rooms": [r.info() for r in rooms[:50]]})

    def on_meta(self, m, msg):
        r = self.host_room(m)
        if r is None:
            return
        if "track" in msg:
            r.track = _str(msg.get("track"), 24)
        if msg.get("weather") in WEATHERS:
            r.weather = msg["weather"]
        if "racing" in msg:
            r.racing = bool(msg.get("racing"))
        if "pub" in msg:
            r.pub = bool(msg.get("pub"))

    def on_kick(self, m, msg):
        r = self.host_room(m)
        g = r.members.get(msg.get("id")) if r else None
        if g is not None and g is not m:
            self.leave(g)

    def on_leave(self, m, msg):
        self.leave(m)

    def host_room(self, m):
        r = self.rooms.get(m.room)
        if r is None or r.host is not m:
            self.err(m, "notyours")
            return None
        return r

    def leave(self, m):
        """Remove m from its room: a guest leaving tells the host; when the host leaves, the guest who joined first
        becomes the host (everyone gets `promote`), so a race goes on; the last one out frees the code."""
        r = self.rooms.pop(m.room, None) if m.room else None
        if r is None:
            m.room = None
            return
        m.room = None
        del r.members[m.id]
        if not r.members:
            return
        self.rooms[r.code] = r
        if r.host is m:
            r.host = next(iter(r.members.values()))  # dicts keep join order
            for g in r.members.values():
                g.send({"t": "promote", "host": r.host.id, "old": m.id})
            return
        r.host.send({"t": "gone", "id": m.id})

    # --- relay -----------------------------------------------------------------------------------------------------
    def relay_ok(self, m, msg):
        r = self.rooms.get(m.room) if m.room else None
        net = msg.get("m")
        if r is None:
            self.err(m, "nope", "not in a room")
            return None, None
        if not isinstance(net, dict) or net.get("k") not in NET_KINDS:
            self.err(m, "bad", "not a game message")
            return None, None
        self.watch(r, m, net)
        return r, net

    def on_to(self, m, msg):
        r, net = self.relay_ok(m, msg)
        if r is None:
            return
        to = r.members.get(msg.get("to"))
        if to is None or to is m:
            return
        if r.host is not m and to is not r.host:
            return self.err(m, "notyours", "guests talk to the host")
        to.send({"t": "msg", "from": m.id, "m": net})

    def on_all(self, m, msg):
        r, net = self.relay_ok(m, msg)
        if r is None:
            return
        if r.host is not m:
            return r.host.send({"t": "msg", "from": m.id, "m": net})
        skip = msg.get("skip")
        for g in r.members.values():
            if g is not m and g.id != skip:
                g.send({"t": "msg", "from": m.id, "m": net})

    def watch(self, r, m, net):
        """Race clock: `go` from the host starts it; a player's first finished state is stamped on receipt."""
        k = net.get("k")
        if k == "go" and r.host is m:
            r.go_at, r.fins, r.racing = self.clock(), {}, True
        elif k == "start" and r.host is m:
            r.racing = True
        elif k == "lobby" and r.host is m:  # the host's room state: keeps the public list current
            st = net.get("settings") if isinstance(net.get("settings"), dict) else {}
            r.track = _str(st.get("track"), 24) or r.track
            r.weather = st.get("weather") if st.get("weather") in WEATHERS else r.weather
            if isinstance(net.get("racing"), bool):
                r.racing = net["racing"]
        elif k == "st" and r.go_at is not None and m.id not in r.fins:
            s = net.get("s")
            fin = s.get("fin") if isinstance(s, dict) else None
            if isinstance(fin, (int, float)) and fin > 0:
                at = round((self.clock() - r.go_at) * 1000)
                r.fins[m.id] = at
                for g in r.members.values():
                    g.send({"t": "fin", "id": m.id, "at": at})
