"""Minimal WebSocket (RFC 6455) server side, standard library only: the HTTP upgrade and text frames.

Only what the lobby needs: unfragmented text frames up to MAX_FRAME bytes, ping/pong, close. Client frames must be
masked (the RFC says so); binary or fragmented frames are refused with close code 1003.
"""
import asyncio
import base64
import hashlib
import struct

GUID = b"258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
MAX_FRAME = 4096
MAX_HEADER = 8192


class WsClosed(Exception):
    """The peer closed, sent something we refuse, or the stream ended."""

    def __init__(self, code=1000, why=""):
        super().__init__(why)
        self.code = code


def accept_key(key: str) -> str:
    return base64.b64encode(hashlib.sha1(key.encode() + GUID).digest()).decode()


async def read_upgrade(reader: asyncio.StreamReader):
    """Reads the HTTP request; returns (path, headers dict with lower-case names) or raises WsClosed."""
    try:
        raw = await reader.readuntil(b"\r\n\r\n")
    except (asyncio.IncompleteReadError, asyncio.LimitOverrunError) as e:
        raise WsClosed(1002, "bad request") from e
    if len(raw) > MAX_HEADER:
        raise WsClosed(1002, "header too large")
    lines = raw.decode("latin-1").split("\r\n")
    parts = lines[0].split(" ")
    if len(parts) != 3 or parts[0] != "GET":
        raise WsClosed(1002, "not a GET")
    headers = {}
    for line in lines[1:]:
        if ":" in line:
            k, v = line.split(":", 1)
            headers[k.strip().lower()] = v.strip()
    if headers.get("upgrade", "").lower() != "websocket" or "sec-websocket-key" not in headers:
        raise WsClosed(1002, "not a websocket upgrade")
    return parts[1], headers


def upgrade_response(key: str) -> bytes:
    return ("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
            f"Sec-WebSocket-Accept: {accept_key(key)}\r\n\r\n").encode()


def refuse_response(status: str) -> bytes:
    return f"HTTP/1.1 {status}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".encode()


def frame(opcode: int, payload: bytes = b"") -> bytes:
    """A server frame (never masked)."""
    n = len(payload)
    if n < 126:
        head = struct.pack("!BB", 0x80 | opcode, n)
    elif n < 65536:
        head = struct.pack("!BBH", 0x80 | opcode, 126, n)
    else:
        head = struct.pack("!BBQ", 0x80 | opcode, 127, n)
    return head + payload


def text(s: str) -> bytes:
    return frame(0x1, s.encode())


def close_frame(code: int = 1000) -> bytes:
    return frame(0x8, struct.pack("!H", code))


async def read_frame(reader: asyncio.StreamReader):
    """Returns (opcode, payload bytes). Raises WsClosed on close, refused frames or end of stream."""
    try:
        b0, b1 = await reader.readexactly(2)
        if not b0 & 0x80 or b0 & 0x0F == 0x0:
            raise WsClosed(1003, "fragmented frame")
        opcode, masked, n = b0 & 0x0F, b1 & 0x80, b1 & 0x7F
        if not masked:
            raise WsClosed(1002, "client frame not masked")
        if n == 126:
            (n,) = struct.unpack("!H", await reader.readexactly(2))
        elif n == 127:
            (n,) = struct.unpack("!Q", await reader.readexactly(8))
        if n > MAX_FRAME:
            raise WsClosed(1009, "size")
        mask = await reader.readexactly(4)
        data = bytes(c ^ mask[i & 3] for i, c in enumerate(await reader.readexactly(n)))
    except asyncio.IncompleteReadError as e:
        raise WsClosed(1006, "stream ended") from e
    if opcode == 0x8:
        raise WsClosed(struct.unpack("!H", data[:2])[0] if len(data) >= 2 else 1000, "peer closed")
    if opcode not in (0x1, 0x9, 0xA):
        raise WsClosed(1003, "binary frame")
    return opcode, data


def client_frame(payload: bytes, opcode: int = 0x1, mask: bytes = b"\x01\x02\x03\x04") -> bytes:
    """A masked client frame (used by the tests' fake client)."""
    n = len(payload)
    if n < 126:
        head = struct.pack("!BB", 0x80 | opcode, 0x80 | n)
    elif n < 65536:
        head = struct.pack("!BBH", 0x80 | opcode, 0x80 | 126, n)
    else:
        head = struct.pack("!BBQ", 0x80 | opcode, 0x80 | 127, n)
    return head + mask + bytes(c ^ mask[i & 3] for i, c in enumerate(payload))
