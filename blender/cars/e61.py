"""BMW 535d Touring (E61) estate. Long hood, LONG flat roof right to the tail, near-vertical tailgate,
roof rails, twin round headlights, twin kidney grille, slim tail lights wrapping onto the tailgate.
Dimensions MUST match src/data/cars.ts `shape`: model-check enforces it.
Build: scripts/model-build.sh cars/e61   (SHOTS=1 for renders in logs/models/)
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import rb
import detail

LENGTH, WIDTH, HEIGHT, WHEELBASE, WHEEL_R = 4.84, 1.85, 1.49, 2.89, 0.33
TYRE_W = 0.24
W = WIDTH / 2
L = LENGTH / 2
ZF, ZR = WHEELBASE / 2, -WHEELBASE / 2
TRACK = W - TYRE_W / 2 - 0.01


def sec(z, bottom, belt, top, roof_w, w=W, shoulder=0.0):
    """Cross-section, left half from bottom centre to top centre, 7 points everywhere.
    shoulder = how far the flank bulges out (m) just under the belt line."""
    return (z, [(0, bottom), (w - 0.08, bottom), (w - 0.01, bottom + 0.12), (w + shoulder, belt - 0.12),
                (w - 0.03, belt), (roof_w, top), (0, top)])


rb.reset()
rb.mat('paint', color=(0.17, 0.18, 0.21))
body = rb.loft('body', [
    sec(-L, 0.32, 0.86, 0.90, 0.62, w=W - 0.10),           # tail bumper face
    sec(-L + 0.08, 0.22, 0.88, 1.02, 0.62, w=W - 0.03),    # tail lights
    sec(-2.28, 0.18, 0.90, 1.06, 0.62),                     # rear glass base
    sec(-1.93, 0.18, 0.90, HEIGHT, 0.60, shoulder=0.03),   # roof rear edge
    sec(0.07, 0.18, 0.90, HEIGHT, 0.60),                    # roof front edge
    sec(0.97, 0.18, 0.90, 0.96, 0.72),                      # windshield base
    sec(1.70, 0.18, 0.88, 0.82, 0.70, shoulder=0.03),       # long hood
    sec(2.36, 0.19, 0.82, 0.77, 0.66, w=W - 0.02, shoulder=0.02),  # nose
    sec(L, 0.30, 0.74, 0.70, 0.54, w=W - 0.12),             # nose face
], material='paint', subdiv=1)
# windows: side glass, rear glass, windshield (the flat roof runs right to the tail)
rb.paint_faces(body, 'glass', lambda c, n: c[1] > 0.93 and abs(n[1]) < 0.94 and -2.20 < c[2] < 0.88)
rb.cut_arches(body, TRACK, [ZF, ZR], WHEEL_R, TYRE_W)
rb.smooth(body)

# roof rails: two thin trim boxes on the flat roof
yr = rb.surface_y(body, 0.5, -0.93)  # seated ON the roof (it curves down at the edges)
rb.box('rail_l', (0.5, yr + 0.02, -0.93), (0.04, 0.04, 1.6), 'trim')
rb.box('rail_r', (-0.5, yr + 0.02, -0.93), (0.04, 0.04, 1.6), 'trim')
# twin round headlights per side
rb.lamp('head_o', body, W - 0.24, 0.68, 0.16, 0.14, 'light_front', front=True)
rb.lamp('head_i', body, W - 0.42, 0.68, 0.16, 0.14, 'light_front', front=True)
# twin kidney grille, placed on the nose surface
zg = rb.surface_z(body, 0.10, 0.55)
rb.box('kidney_l', (0.10, 0.55, zg - 0.02), (0.16, 0.14, 0.06), 'trim', bevel=0.01)
rb.box('kidney_r', (-0.10, 0.55, zg - 0.02), (0.16, 0.14, 0.06), 'trim', bevel=0.01)
# slim tail lights wrapping onto the tailgate
rb.lamp('tail', body, W - 0.20, 0.96, 0.36, 0.10, 'light_rear', front=False)

# detailing (lib/detail.py): door gaps, handles, belt moulding, sills, splitter, diffuser, exhausts
detail.door_lines(body, [0.75, 0.0, -0.85, -1.6], 0.3, 0.84)
detail.handle(body, 0.30, 0.80)
detail.window_trim(body, 0.87, -2.20, 0.89)
detail.sill(body, 0.99, -0.99)
detail.splitter(body, 0.2)
detail.diffuser(body, 0.28, 1.11)
detail.exhaust(body, 0.62, 0.31)

for corner, x, z in (('fl', TRACK, ZF), ('fr', -TRACK, ZF), ('rl', TRACK, ZR), ('rr', -TRACK, ZR)):
    rb.wheel(corner, x, z, WHEEL_R, TYRE_W)

o = rb.args()
rb.finish(o['out'] or os.path.join(os.getcwd(), 'public/models/e61.glb'))
if o['shots']:
    rb.render(o['shots'])
