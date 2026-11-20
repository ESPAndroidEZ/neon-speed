#!/usr/bin/env python3
"""Neon Speed lobby: WebSocket switchboard for online races (docs/online-protocol.md). Standard library only.

Run: python3 lobby.py [--host 127.0.0.1] [--port 8770]. systemd unit: server/systemd/neonspeed-lobby.service.
Logs only counts (no addresses, no names). Environment: LOBBY_ORIGINS (comma list) overrides the allowed origins.
"""
import argparse
import asyncio
import collections
import json
import os
import secrets
import time

from rooms import VERSION, Hub
from wsproto import WsClosed, close_frame, frame, read_frame, read_upgrade, refuse_response, text, upgrade_response

MAX_CONNS = 400
MAX_PER_IP = 20
RATE_1S, RATE_10S = 60, 600
PING_EVERY = 25
IDLE_AFTER = 90
ORIGINS = os.environ.get("LOBBY_ORIGINS", "https://notcarlos.mosidealus.nl,http://notcarlos.mosidealus.nl,capacitor://localhost,https://localhost,http://localhost").split(",")
ID_CHARS = "abcdefghijkmnpqrstuvwxyz23456789"


def origin_ok(origin: str) -> bool:
    if not origin:
        return True  # non-browser clients (tests, curl) send none; browsers always do
    return origin in ORIGINS or origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:")


class Member:
    def __init__(self, writer, ip):
        self.id = "".join(secrets.choice(ID_CHARS) for _ in range(8))
        self.room = None
        self.ip = ip
        self.writer = writer
        self.stamps = collections.deque()
        self.last = time.monotonic()

    def send(self, msg):
        if not self.writer.is_closing():
            self.writer.write(text(json.dumps(msg, separators=(",", ":"))))

    def flooding(self, now):
        s = self.stamps
        s.append(now)
        while s and now - s[0] > 10:
            s.popleft()
        recent = sum(1 for x in s if now - x <= 1)
        return recent > RATE_1S or len(s) > RATE_10S


class Lobby:
    def __init__(self):
        self.hub = Hub()
        self.members = set()
        self.per_ip = collections.Counter()

    async def client(self, reader, writer):
        try:
            path, headers = await asyncio.wait_for(read_upgrade(reader), 10)
        except (WsClosed, asyncio.TimeoutError):
            writer.write(refuse_response("400 Bad Request"))
            return await self.drop(writer)
        ip = headers.get("x-real-ip") or (writer.get_extra_info("peername") or ("?",))[0]
        if not path.startswith("/ws") or not origin_ok(headers.get("origin", "")):
            writer.write(refuse_response("403 Forbidden"))
            return await self.drop(writer)
        if len(self.members) >= MAX_CONNS or self.per_ip[ip] >= MAX_PER_IP:
            writer.write(refuse_response("503 Service Unavailable"))
            return await self.drop(writer)
        writer.write(upgrade_response(headers["sec-websocket-key"]))
        m = Member(writer, ip)
        self.members.add(m)
        self.per_ip[ip] += 1
        pinger = asyncio.create_task(self.ping(m))
        try:
            await self.serve(m, reader)
        except WsClosed as e:
            code = e.code if e.code in (1000, 1001, 1003, 1008, 1009) else 1000
            if code == 1009:
                m.send({"t": "err", "code": "size", "msg": ""})
            writer.write(close_frame(code))
        except (ConnectionError, asyncio.CancelledError):
            pass
        finally:
            pinger.cancel()
            self.hub.leave(m)
            self.members.discard(m)
            self.per_ip[ip] -= 1
            if self.per_ip[ip] <= 0:
                del self.per_ip[ip]
            await self.drop(writer)

    async def serve(self, m, reader):
        hello = False
        while True:
            op, data = await read_frame(reader)
            now = time.monotonic()
            m.last = now
            if op == 0x9:
                m.writer.write(frame(0xA, data))
                continue
            if op == 0xA:
                continue
            if m.flooding(now):
                m.send({"t": "err", "code": "flood", "msg": ""})
                raise WsClosed(1008, "flood")
            try:
                msg = json.loads(data)
            except ValueError:
                m.send({"t": "err", "code": "bad", "msg": "not JSON"})
                continue
            if not hello:
                if not isinstance(msg, dict) or msg.get("t") != "hi":
                    m.send({"t": "err", "code": "hello", "msg": "say hi first"})
                    raise WsClosed(1008, "hello")
                if msg.get("v") != VERSION:
                    m.send({"t": "err", "code": "version", "msg": str(VERSION)})
                    raise WsClosed(1008, "version")
                hello = True
                m.send({"t": "welcome", "v": VERSION, "id": m.id})
                continue
            self.hub.handle(m, msg)
            await m.writer.drain()

    async def ping(self, m):
        while True:
            await asyncio.sleep(PING_EVERY)
            if time.monotonic() - m.last > IDLE_AFTER:
                m.writer.write(close_frame(1001))
                m.writer.close()
                return
            m.writer.write(frame(0x9, b"p"))

    async def drop(self, writer):
        try:
            await writer.drain()
            writer.close()
            await writer.wait_closed()
        except (ConnectionError, OSError):
            pass

    async def report(self):
        while True:
            await asyncio.sleep(600)
            print(f"lobby: {len(self.members)} connections, {len(self.hub.rooms)} rooms", flush=True)


async def main(host, port):
    lobby = Lobby()
    server = await asyncio.start_server(lobby.client, host, port, limit=16384)
    print(f"lobby: listening on {host}:{port}, protocol v{VERSION}", flush=True)
    asyncio.create_task(lobby.report())
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8770)
    a = ap.parse_args()
    asyncio.run(main(a.host, a.port))
