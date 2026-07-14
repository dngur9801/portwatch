#!/usr/bin/env python3
"""Generate a monochrome template tray icon: transparent bg + radar glyph.

Template icons use the ALPHA channel only (macOS tints them to match the
menubar), so the glyph must be drawn as opaque pixels on a transparent
background — not a filled square.
"""
import struct, zlib, math

SS = 4
N = 44                 # points; macOS scales as needed
S = N * SS
cx = cy = S / 2

dot_r = 2.6 * SS
ring1_r = 8.5 * SS
ring2_r = 15.5 * SS
stroke = 2.2 * SS

def alpha(x, y):
    d = math.hypot(x - cx, y - cy)
    if d <= dot_r:
        return 1.0
    for R in (ring1_r, ring2_r):
        if abs(d - R) <= stroke / 2:
            return 1.0
    return 0.0

# supersample -> downsample for anti-aliasing
big = [[alpha(x + 0.5, y + 0.5) for x in range(S)] for y in range(S)]

out = bytearray()
for y in range(N):
    out.append(0)  # filter 0
    for x in range(N):
        a = 0.0
        for sy in range(SS):
            for sx in range(SS):
                a += big[y * SS + sy][x * SS + sx]
        a /= SS * SS
        av = int(a * 255)
        # black glyph; only alpha matters for template rendering
        out += bytes((0, 0, 0, av))

def chunk(tag, data):
    c = tag + data
    return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)

png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", struct.pack(">IIBBBBB", N, N, 8, 6, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(bytes(out), 9))
png += chunk(b"IEND", b"")

with open("icons/tray.png", "wb") as f:
    f.write(png)
print("wrote icons/tray.png")
