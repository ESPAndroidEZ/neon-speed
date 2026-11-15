"""VW Golf IV GTI hatchback. Compact 3-door: short hood, tall upright cabin, near-vertical hatch glass,
roof ends at the tail, small lip spoiler. Dimensions MUST match src/data/cars.ts `shape`: model-check enforces it.
Build: scripts/model-build.sh cars/golf   (SHOTS=1 for renders in logs/models/)
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import rb

LENGTH, WIDTH, HEIGHT, WHEELBASE, WHEEL_R = 4.15, 1.73, 1.44, 2.51, 0.3
TYRE_W = 0.2
W = WIDTH / 2
L = LENGTH / 2
ZF, ZR = WHEELBASE / 2, -WHEELBASE / 2
TRACK = W - TYRE_W / 2 - 0.01


def sec(z, bottom, belt, top, roof_w, w=W, shoulder=0.03):
    """Cross-section, left half from bottom centre to top centre, 7 points everywhere."""
    return (z, [(0, bottom), (w - 0.08, bottom), (w - 0.01, bottom + 0.12), (w + shoulder, belt - 0.12),
                (w - 0.03, belt), (roof_w, top), (0, top)])


rb.reset()
rb.mat('paint', color=(0.11, 0.16, 0.27))
body = rb.loft('body', [
    sec(-2.08, 0.32, 0.84, 0.88, 0.70, w=W - 0.05),   # tail face
    sec(-2.00, 0.30, 0.84, 1.00, 0.72, w=W - 0.03),   # hatch top
    sec(-1.72, 0.20, 0.86, 1.04, 0.73),               # rear glass base
    sec(-1.27, 0.18, 0.88, 1.44, 0.74),               # roof rear edge
    sec(0.23, 0.18, 0.88, 1.44, 0.74),                # roof front edge
    sec(1.08, 0.18, 0.88, 0.94, 0.75),                # windshield base
    sec(2.02, 0.24, 0.82, 0.75, 0.66, w=W - 0.03),    # short hood
    sec(2.08, 0.30, 0.70, 0.68, 0.56, w=W - 0.10),    # nose face
], material='paint', subdiv=1)
# windows: side glass, the windshield and the near-vertical hatch glass
rb.paint_faces(body, 'glass', lambda c, n: c[1] > 0.92 and abs(n[1]) < 0.96 and -1.75 < c[2] < 1.05)
rb.cut_arches(body, TRACK, [ZF, ZR], WHEEL_R, TYRE_W)
rb.smooth(body)

# rounded rectangle headlights on the nose
rb.lamp('head', body, W - 0.30, 0.66, 0.30, 0.12, 'light_front', front=True)
# wide wraparound taillights on the hatch lip
rb.lamp('tail', body, W - 0.20, 0.92, 0.30, 0.16, 'light_rear', front=False)
# small dark grille strip between the headlights on the bumper
zg = rb.surface_z(body, 0, 0.58)
rb.box('grille', (0, 0.58, zg - 0.02), (0.72, 0.08, 0.06), 'trim', bevel=0.01)
# small roof spoiler over the hatch
zs = rb.surface_z(body, 0, 1.38, front=False)
rb.box('spoiler', (0, rb.surface_y(body, 0, zs) + 0.015, zs), (1.35, 0.035, 0.16), 'trim', bevel=0.01)  # seated on the roof edge
# mirrors at the A-pillar, flank found by surface_x
xm = rb.surface_x(body, 0.90, 0.95)
rb.mirror_x(rb.box('mirror', (xm + 0.05, 0.90, 0.95), (0.10, 0.08, 0.14), 'paint', bevel=0.02))

for corner, x, z in (('fl', TRACK, ZF), ('fr', -TRACK, ZF), ('rl', TRACK, ZR), ('rr', -TRACK, ZR)):
    rb.wheel(corner, x, z, WHEEL_R, TYRE_W)

o = rb.args()
rb.finish(o['out'] or os.path.join(os.getcwd(), 'public/models/golf.glb'))
if o['shots']:
    rb.render(o['shots'])
