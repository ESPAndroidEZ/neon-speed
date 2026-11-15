"""RX-7 (FD) coupe. Dimensions MUST match src/data/cars.ts `shape` (length, width, height, wheelbase, wheelRadius): model-check enforces it.
Build: scripts/model-build.sh cars/rx7   (SHOTS=1 for renders in logs/models/)"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import rb

LENGTH, WIDTH, HEIGHT, WHEELBASE, WHEEL_R = 4.28, 1.77, 1.23, 2.43, 0.31
W = WIDTH / 2
ZF, ZR = WHEELBASE / 2, -WHEELBASE / 2   # front / rear axle z
ARCH = WHEEL_R * 2 + 0.06                  # body bottom above the wheels


def sec(z, bottom, belt, top, roof_w, w=W):
    """One cross-section, left half from bottom centre to top centre (6 points, same count everywhere)."""
    return (z, [(0, bottom), (w - 0.06, bottom), (w, min(bottom + 0.1, belt - 0.02)), (w, belt), (roof_w, top), (0, top)])


def is_glass(c, n):
    """c, n in game space (y up, z nose). Greenhouse from rear glass base (-1.76) to windshield base (+0.64)."""
    if not (-1.76 < c[2] < 0.64):
        return False
    if c[1] < 0.9:
        return False
    if 0.9 < n[1] < 0.99:                  # sloped rear glass and windshield (flat roof has n[1] = 1)
        return True
    return abs(n[1]) < 0.93                # side glass (steep faces)


rb.reset()
L = LENGTH / 2
rb.mat('paint', color=(0.95, 0.76, 0.0))   # paint before the body loft
body = rb.loft('body', [
    sec(-L, 0.30, 0.74, 0.80, 0.70, w=W - 0.08),        # rear face
    sec(-2.02, 0.20, 0.78, 0.90, 0.74),                 # tail top
    sec(-1.76, 0.18, 0.78, 0.92, 0.74),                 # rear glass base
    sec(-1.60, 0.18, 0.78, 0.97, 0.74, w=W + 0.05),     # rear arch start (haunch)
    sec(-1.52, ARCH, 0.78, 0.99, 0.72, w=W + 0.05),
    sec(-0.92, ARCH, 0.78, 1.17, 0.64, w=W + 0.05),
    sec(-0.84, 0.18, 0.78, 1.19, 0.62),                 # rear arch end
    sec(-0.71, 0.18, 0.78, HEIGHT, 0.62),               # roof rear edge
    sec(-0.21, 0.18, 0.78, HEIGHT, 0.62),               # roof front edge
    sec(0.64, 0.18, 0.76, 0.86, 0.74),                  # windshield base
    sec(0.84, 0.18, 0.75, 0.82, 0.74),                  # front arch start
    sec(0.92, ARCH, 0.74, 0.81, 0.74),
    sec(1.52, ARCH, 0.72, 0.71, 0.74),
    sec(1.60, 0.20, 0.70, 0.69, 0.72, w=W - 0.02),
    sec(L, 0.28, 0.52, 0.55, 0.56, w=W - 0.10),         # very low pointed nose
], material='paint', subdiv=1)
rb.paint_faces(body, 'glass', is_glass)
rb.smooth(body)

for name, mat, y, z, h in (('light_f', 'light_front', 0.40, L - 0.06, 0.12), ('light_r', 'light_rear', 0.76, -L + 0.04, 0.14)):
    rb.mirror_x(rb.box(name, (W - 0.24, y, z), (0.34, h, 0.08), mat, bevel=0.02))
rb.box('grille', (0, 0.34, L - 0.02), (0.7, 0.10, 0.06), 'trim', bevel=0.01)
rb.box('lip', (0, 0.22, L - 0.3), (WIDTH - 0.3, 0.05, 0.2), 'trim')
rb.box('spoiler', (0, 0.94, -1.92), (1.3, 0.04, 0.12), 'trim')
rb.mirror_x(rb.box('spoiler_post', (0.5, 0.90, -1.92), (0.05, 0.08, 0.10), 'trim'))
rb.mirror_x(rb.box('mirror', (W - 0.01, 0.80, 0.45), (0.08, 0.08, 0.14), 'paint', bevel=0.02))

TRACK = W - 0.13
for corner, x, z in (('fl', TRACK, ZF), ('fr', -TRACK, ZF), ('rl', TRACK, ZR), ('rr', -TRACK, ZR)):
    rb.wheel(corner, x, z, WHEEL_R, 0.22)

o = rb.args()
rb.finish(o['out'] or os.path.join(os.getcwd(), 'public/models/rx7.glb'))
if o['shots']:
    rb.render(o['shots'])
