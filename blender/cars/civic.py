"""Civic hatchback (reference car script). Copy this for a new car and change the numbers.
Dimensions MUST match src/data/cars.ts `shape` (length, width, height, wheelbase, wheelRadius): model-check enforces it.
Build: scripts/model-build.sh cars/civic   (SHOTS=1 for renders in logs/models/)"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import rb

LENGTH, WIDTH, HEIGHT, WHEELBASE, WHEEL_R = 4.25, 1.72, 1.40, 2.62, 0.30
W = WIDTH / 2
ZF, ZR = WHEELBASE / 2, -WHEELBASE / 2   # front / rear axle z
ARCH = WHEEL_R * 2 + 0.06                  # body bottom above the wheels


def sec(z, bottom, belt, top, roof_w, w=W):
    """One cross-section, left half from bottom centre to top centre (6 points, same count everywhere)."""
    return (z, [(0, bottom), (w - 0.06, bottom), (w, min(bottom + 0.1, belt - 0.02)), (w, belt), (roof_w, top), (0, top)])


rb.reset()
L = LENGTH / 2
body = rb.loft('body', [
    sec(-L, 0.30, 0.80, 0.86, 0.70, w=W - 0.08),       # rear bumper face
    sec(-L + 0.12, 0.20, 0.86, 1.08, 0.66),             # hatch bottom
    sec(ZR - 0.38, 0.18, 0.86, 1.34, 0.64),             # rear arch start
    sec(ZR - 0.30, ARCH, 0.86, 1.38, 0.64),
    sec(ZR + 0.30, ARCH, 0.86, HEIGHT, 0.63),
    sec(ZR + 0.38, 0.18, 0.86, HEIGHT, 0.63),
    sec(-0.35, 0.18, 0.85, HEIGHT, 0.62),               # roof front edge
    sec(0.50, 0.18, 0.84, 0.92, 0.74),                  # windshield base
    sec(ZF - 0.38, 0.18, 0.83, 0.88, 0.76),             # front arch start
    sec(ZF - 0.30, ARCH, 0.82, 0.87, 0.76),
    sec(ZF + 0.30, ARCH, 0.80, 0.84, 0.74),
    sec(ZF + 0.38, 0.20, 0.77, 0.80, 0.72),
    sec(L - 0.10, 0.22, 0.70, 0.72, 0.68, w=W - 0.05),
    sec(L, 0.30, 0.62, 0.64, 0.60, w=W - 0.12),         # nose
], material='paint', subdiv=1)
# windows: the steep faces of the greenhouse (side glass, windshield, hatch glass)
rb.paint_faces(body, 'glass', lambda c, n: c[1] > 0.9 and abs(n[1]) < 0.93 and -1.95 < c[2] < 0.55)
rb.smooth(body)

for name, mat, y, z, h in (('light_f', 'light_front', 0.62, L - 0.06, 0.12), ('light_r', 'light_rear', 0.78, -L + 0.04, 0.14)):
    rb.mirror_x(rb.box(name, (W - 0.24, y, z), (0.34, h, 0.08), mat, bevel=0.02))
rb.box('grille', (0, 0.45, L - 0.02), (0.7, 0.14, 0.06), 'trim', bevel=0.01)
rb.box('lip', (0, 0.22, L - 0.3), (WIDTH - 0.3, 0.05, 0.2), 'trim')
rb.mirror_x(rb.box('mirror', (W - 0.01, 1.0, 0.35), (0.08, 0.08, 0.14), 'paint', bevel=0.02))

TRACK = W - 0.13
for corner, x, z in (('fl', TRACK, ZF), ('fr', -TRACK, ZF), ('rl', TRACK, ZR), ('rr', -TRACK, ZR)):
    rb.wheel(corner, x, z, WHEEL_R, 0.2)

o = rb.args()
rb.finish(o['out'] or os.path.join(os.getcwd(), 'public/models/civic.glb'))
if o['shots']:
    rb.render(o['shots'])
