"""Lobby tests over real sockets on 127.0.0.1 (random port) with a fake client. Run: python3 server/lobby/test_lobby.py
(also run by tests/lobby-check.mts inside `npm test`). Prints PASS/FAIL lines and ALL PASS."""
import asyncio
import base64
import json
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lobby as L  # noqa: E402
from wsproto import accept_key, client_frame  # noqa: E402

failed = 0


def check(name, ok, info=""):
    global failed
    if not ok:
        failed += 1
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  ({info})" if info else ""))


class Client:
    def __init__(self, port):
        self.port = port

    async def open(self, origin="", ip=None, say_hi=True):
        self.r, self.w = await asyncio.open_connection("127.0.0.1", self.port)
        key = base64.b64encode(os.urandom(16)).decode()
        extra = (f"Origin: {origin}\r\n" if origin else "") + (f"X-Real-IP: {ip}\r\n" if ip else "")
        self.w.write(f"GET /ws/ HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n{extra}\r\n".encode())
        head = (await self.r.readuntil(b"\r\n\r\n")).decode()
        self.status = int(head.split(" ")[1])
        self.accept_ok = accept_key(key) in head
        if self.status == 101 and say_hi:
            self.send({"t": "hi", "v": 1})
            self.id = (await self.recv())["id"]
        return self

    def send(self, msg, raw=None, opcode=1):
        self.w.write(client_frame(raw if raw is not None else json.dumps(msg).encode(), opcode))

    async def frame(self, timeout=2.0):
        b0, b1 = await asyncio.wait_for(self.r.readexactly(2), timeout)
        n = b1 & 0x7F
        if n == 126:
            (n,) = struct.unpack("!H", await self.r.readexactly(2))
        return b0 & 0x0F, await self.r.readexactly(n)

    async def recv(self, timeout=2.0):
        while True:
            op, data = await self.frame(timeout)
            if op == 1:
                return json.loads(data)
            if op == 8:
                return {"t": "closed", "code": struct.unpack("!H", data[:2])[0] if data else 0}

    async def quiet(self, timeout=0.3):
        try:
            return await self.recv(timeout)
        except asyncio.TimeoutError:
            return None

    def close(self):
        self.w.close()


async def run():
    lob = L.Lobby()
    server = await asyncio.start_server(lob.client, "127.0.0.1", 0)
    port = server.sockets[0].getsockname()[1]
    C = lambda: Client(port)  # noqa: E731

    check("RFC 6455 example accept key", accept_key("dGhlIHNhbXBsZSBub25jZQ==") == "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=")
    a = await C().open(say_hi=False)
    check("upgrade answers 101 with the right accept key", a.status == 101 and a.accept_ok)
    a.send({"t": "list"})
    e = await a.recv()
    check("first message must be hi", e.get("code") == "hello" and (await a.recv())["t"] == "closed")
    a = await C().open(say_hi=False)
    a.send({"t": "hi", "v": 9})
    check("unknown protocol version refused", (await a.recv()).get("code") == "version")
    bad = await C().open(origin="https://evil.example", say_hi=False)
    check("foreign origin refused (403)", bad.status == 403)
    ok = await C().open(origin="https://notcarlos.mosidealus.nl")
    check("game origin accepted, welcome carries an 8-char id", len(ok.id) == 8)

    h = await C().open()
    h.send({"t": "host", "code": "QWRT", "pub": True})
    check("host a room", (await h.recv()) == {"t": "hosted", "code": "QWRT"})
    x = await C().open()
    x.send({"t": "host", "code": "QWRT"})
    check("taken code refused", (await x.recv()).get("code") == "taken")
    x.send({"t": "join", "code": "ZZZZ"})
    check("unknown room refused", (await x.recv()).get("code") == "nope")
    g = await C().open()
    g.send({"t": "join", "code": "QWRT"})
    j = await g.recv()
    check("guest joins and learns the host id", j["t"] == "joined" and j["host"] == h.id)
    check("host hears about the guest", (await h.recv()) == {"t": "peer", "id": g.id})
    g2 = await C().open()
    g2.send({"t": "join", "code": "QWRT"})
    await g2.recv(); await h.recv()
    g.send({"t": "all", "m": {"k": "hello", "p": {"id": g.id}}})
    m = await h.recv()
    check("guest broadcast reaches only the host", m["t"] == "msg" and m["from"] == g.id and m["m"]["k"] == "hello" and await g2.quiet() is None)
    g.send({"t": "to", "to": g2.id, "m": {"k": "ready"}})
    check("guest to guest is refused", (await g.recv()).get("code") == "notyours" and await g2.quiet() is None)
    h.send({"t": "all", "skip": g2.id, "m": {"k": "lobby", "players": [], "racing": False}})
    check("host broadcast with skip", (await g.recv())["m"]["k"] == "lobby" and await g2.quiet() is None)
    g.send({"t": "all", "m": {"k": "evil"}})
    check("unknown game message kind refused", (await g.recv()).get("code") == "bad")

    h.send({"t": "all", "m": {"k": "lobby", "players": [], "settings": {"track": "kestrel", "weather": "RAIN"}, "racing": False}})
    await g.recv(); await g2.recv()
    x.send({"t": "list"})
    rooms = (await x.recv())["rooms"]
    check("public room list", len(rooms) == 1 and rooms[0] == {"code": "QWRT", "n": 3, "max": 8, "track": "kestrel", "weather": "RAIN", "racing": False}, str(rooms))
    h.send({"t": "all", "m": {"k": "go"}})
    await g.recv(); await g2.recv()
    x.send({"t": "join", "code": "QWRT"})
    check("no joining while racing", (await x.recv()).get("code") == "racing")
    x.send({"t": "list"})
    check("racing rooms leave the list", (await x.recv())["rooms"] == [])
    await asyncio.sleep(0.05)
    g.send({"t": "all", "m": {"k": "st", "s": {"id": g.id, "fin": 61.2}}})
    pair = [await h.recv(), await h.recv()]
    f = next((x for x in pair if x["t"] == "fin"), {})
    check("finish stamped with server receipt time", f["t"] == "fin" and f["id"] == g.id and 40 <= f["at"] < 2000, str(f))
    check("everyone gets the finish stamp", (await g.recv())["t"] == "fin" and (await g2.recv())["t"] == "fin")
    g.send({"t": "all", "m": {"k": "st", "s": {"id": g.id, "fin": 61.2}}})
    await h.recv()
    check("finish stamped only once", await h.quiet() is None)
    g2.send({"t": "kick", "id": g.id})
    check("guests cannot kick", (await g2.recv()).get("code") == "notyours")
    h.send({"t": "kick", "id": g2.id})
    check("host kicks: host hears gone", (await h.recv()) == {"t": "gone", "id": g2.id})
    g.close()
    check("a dropped guest is gone for the host", (await h.recv()) == {"t": "gone", "id": g.id})
    g3 = await C().open()
    h2 = await C().open()
    h2.send({"t": "host", "code": "ABCD"}); await h2.recv()
    g3.send({"t": "join", "code": "ABCD"}); await g3.recv(); await h2.recv()
    h2.close()
    check("host leaves: guest gets gone and the code is free", (await g3.recv()) == {"t": "gone", "id": h2.id} and "ABCD" not in lob.hub.rooms)
    full = []
    h3 = await C().open()
    h3.send({"t": "host", "code": "FULL"}); await h3.recv()
    for _ in range(7):
        c = await C().open(); c.send({"t": "join", "code": "FULL"}); await c.recv(); full.append(c)
    c = await C().open(); c.send({"t": "join", "code": "FULL"})
    check("ninth player: room full", (await c.recv()).get("code") == "full")

    s = await C().open()
    s.send(None, raw=b"x" * 5000)
    check("frame over 4 KB closes the connection", (await s.recv()).get("code") == "size")
    s = await C().open()
    s.send(None, raw=b"\x00\x01", opcode=2)
    check("binary frame closes (1003)", (await s.recv()) == {"t": "closed", "code": 1003})
    s = await C().open()
    for _ in range(80):
        s.send({"t": "list"})
    got = []
    while True:
        try:
            x = await s.recv()
        except (asyncio.TimeoutError, asyncio.IncompleteReadError):
            break
        got.append(x)
        if x["t"] == "closed":
            break
    check("flood: over 60 messages per second closes", any(x.get("code") == "flood" for x in got))
    many = [await C().open(ip="203.0.113.9", say_hi=False) for _ in range(L.MAX_PER_IP)]
    one_more = await C().open(ip="203.0.113.9", say_hi=False)
    check("per-address connection limit (503)", all(m.status == 101 for m in many) and one_more.status == 503)
    server.close()


asyncio.run(run())
print(f"\n{failed} FAILED" if failed else "\nALL PASS")
sys.exit(1 if failed else 0)
