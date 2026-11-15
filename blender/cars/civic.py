"""Civic hatchback (REFERENCE car script). Copy this for a new car and change the numbers.
Dimensions MUST match src/data/cars.ts `shape` (length, width, height, wheelbase, wheelRadius): model-check enforces it.
Build: scripts/model-build.sh cars/civic   (SHOTS=1 for renders in logs/models/)

Recipe (keep this order):
 1. body = rb.loft(...) with plain sections: NO arch rows, the sills stay low all along.
 2. rb.paint_faces(body, 'glass', ...) for the windows.
 3. rb.cut_arches(...) cuts real wheel arches; wheels go at x = +/-TRACK so they sit flush with the flank.
 4. rb.smooth(body), then details placed ON the surface with rb.lamp / rb.surface_z / rb.surface_x.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import rb

LENGTH, WIDTH, HEIGHT, WHEELBASE, WHEEL_R = 4.25, 1.72, 1.40, 2.62, 0.30
TYRE_W = 0.2
W = WIDTH / 2
L = LENGTH / 2
ZF, ZR = WHEELBASE / 2, -WHEELBASE / 2   # front / rear axle z
TRACK = W - TYRE_W / 2 - 0.01             # tyre outer face flush with the body side


def sec(z, bottom, belt, top, roof_w, w=W, shoulder=0.0):
    """Cross-section, left half from bottom centre to top centre, 7 points everywhere.
    shoulder = how far the flank bulges out (m) just under the belt line: gives the body a crease and some muscle."""
    return (z, [(0, bottom), (w - 0.08, bottom), (w - 0.01, bottom + 0.12), (w + shoulder, belt - 0.12),
                (w - 0.03, belt), (roof_w, top), (0, top)])


rb.reset()
rb.mat('paint', color=(0.85, 0.86, 0.9))
body = rb.loft('body', [
    sec(-L, 0.32, 0.86, 0.90, 0.66, w=W - 0.10),         # rear bumper face
    sec(-L + 0.08, 0.22, 0.90, 1.06, 0.64, w=W - 0.03),  # hatch bottom / tail lights
    sec(-L + 0.30, 0.18, 0.90, 1.32, 0.62),               # top of the hatch glass
    sec(ZR, 0.18, 0.90, 1.38, 0.62, shoulder=0.01),
    sec(-0.40, 0.18, 0.89, HEIGHT, 0.61),                 # roof front edge
    sec(0.45, 0.18, 0.87, 0.94, 0.72),                    # windshield base
    sec(ZF, 0.18, 0.84, 0.88, 0.74, shoulder=0.01),
    sec(L - 0.25, 0.20, 0.76, 0.80, 0.70, w=W - 0.02),
    sec(L - 0.06, 0.24, 0.68, 0.70, 0.62, w=W - 0.08),
    sec(L, 0.30, 0.60, 0.62, 0.52, w=W - 0.16),           # nose
], material='paint', subdiv=1)
# windows: steep faces of the greenhouse (side glass, windshield, hatch glass)
rb.paint_faces(body, 'glass', lambda c, n: c[1] > 0.95 and abs(n[1]) < 0.93 and -L + 0.15 < c[2] < 0.5)
rb.cut_arches(body, TRACK, [ZF, ZR], WHEEL_R, TYRE_W)
rb.smooth(body)

# lights sit on the paint, flush (rb.lamp finds the surface)
rb.lamp('light_f', body, W - 0.26, 0.64, 0.34, 0.11, 'light_front', front=True)
rb.lamp('light_r', body, W - 0.22, 0.88, 0.30, 0.13, 'light_rear', front=False)
zg = rb.surface_z(body, 0, 0.46)
rb.box('grille', (0, 0.46, zg - 0.02), (0.62, 0.12, 0.06), 'trim', bevel=0.01)
zb = rb.surface_z(body, 0, 0.30)
rb.box('lip', (0, 0.25, zb - 0.06), (WIDTH - 0.36, 0.04, 0.14), 'trim')
xm = rb.surface_x(body, 0.95, 0.30)
rb.mirror_x(rb.box('mirror', (xm + 0.05, 0.98, 0.30), (0.10, 0.08, 0.14), 'paint', bevel=0.02))

for corner, x, z in (('fl', TRACK, ZF), ('fr', -TRACK, ZF), ('rl', TRACK, ZR), ('rr', -TRACK, ZR)):
    rb.wheel(corner, x, z, WHEEL_R, TYRE_W)

o = rb.args()
rb.finish(o['out'] or os.path.join(os.getcwd(), 'public/models/civic.glb'))
if o['shots']:
    rb.render(o['shots'])
