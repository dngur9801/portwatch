#!/usr/bin/env python3
"""Generate a 1024x1024 app icon (radar/target motif) with no external deps."""
import struct, zlib, math

SS = 2                 # supersampling factor for anti-aliasing
N = 1024
S = N * SS

# gradient endpoints (top -> bottom): blue -> indigo
TOP = (59, 130, 246)
BOT = (99, 102, 241)
WHITE = (255, 255, 255)

cx = cy = S / 2
corner = S * 0.22      # rounded-rect corner radius

def in_rounded_rect(x, y):
    # distance test for a rounded square filling the canvas
    dx = max(abs(x - cx) - (S / 2 - corner), 0)
    dy = max(abs(y - cy) - (S / 2 - corner), 0)
    return math.hypot(dx, dy) <= corner

# radar geometry (in supersampled px)
dot_r = 62 * SS
ring1_r, ring2_r = 190 * SS, 320 * SS
ring_t = 34 * SS

def fg_alpha(x, y):
    """White foreground coverage (0..1) for the radar glyph."""
    d = math.hypot(x - cx, y - cy)
    if d <= dot_r:
        return 1.0
    for R in (ring1_r, ring2_r):
        if abs(d - R) <= ring_t / 2:
            return 1.0
    return 0.0

# render at supersampled resolution, then box-downsample to N
big = bytearray(S * S * 4)
for y in range(S):
    t = y / (S - 1)
    br = int(TOP[0] + (BOT[0] - TOP[0]) * t)
    bg = int(TOP[1] + (BOT[1] - TOP[1]) * t)
    bb = int(TOP[2] + (BOT[2] - TOP[2]) * t)
    row = y * S * 4
    for x in range(S):
        i = row + x * 4
        if not in_rounded_rect(x, y):
            big[i:i+4] = bytes((0, 0, 0, 0))
            continue
        a = fg_alpha(x, y)
        if a > 0:
            r = int(br + (WHITE[0] - br) * a)
            g = int(bg + (WHITE[1] - bg) * a)
            b = int(bb + (WHITE[2] - bb) * a)
        else:
            r, g, b = br, bg, bb
        big[i:i+4] = bytes((r, g, b, 255))

# downsample SSxSS -> 1x
out = bytearray()
for y in range(N):
    out.append(0)  # filter type 0
    for x in range(N):
        r = g = b = a = 0
        for sy in range(SS):
            for sx in range(SS):
                px = ((y*SS+sy) * S + (x*SS+sx)) * 4
                r += big[px]; g += big[px+1]; b += big[px+2]; a += big[px+3]
        n = SS * SS
        out += bytes((r//n, g//n, b//n, a//n))

def chunk(tag, data):
    c = tag + data
    return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)

png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", struct.pack(">IIBBBBB", N, N, 8, 6, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(bytes(out), 9))
png += chunk(b"IEND", b"")

with open("icon-source.png", "wb") as f:
    f.write(png)
print("wrote icon-source.png", len(png), "bytes")
