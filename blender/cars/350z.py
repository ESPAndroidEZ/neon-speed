"""Nissan 350Z coupe (task 050 rework). Long hood, short cabin, fastback glass, rear haunches.
Dimensions match src/data/cars.ts `shape`; model-check enforces it.
Build: scripts/model-build.sh cars/350z   (SHOTS=1 for renders in logs/models/)"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import rb
import detail

LENGTH, WIDTH, HEIGHT, WHEELBASE, WHEEL_R = 4.31, 1.82, 1.32, 2.65, 0.32
TYRE_W = 0.22
W = WIDTH / 2
L = LENGTH / 2
ZF, ZR = WHEELBASE / 2, -WHEELBASE / 2   # front / rear axle z
TRACK = W - TYRE_W / 2 - 0.01             # tyre outer face flush with the body side


def sec(z, bottom, belt, top, roof_w, w=W, shoulder=0.0):
    """Cross-section, left half from bottom centre to top centre, 7 points everywhere."""
    return (z, [(0, bottom), (w - 0.08, bottom), (w - 0.01, bottom + 0.12), (w + shoulder, belt - 0.12),
                (w - 0.03, belt), (roof_w, top), (0, top)])


rb.reset()
rb.mat('paint', color=(0.88, 0.4, 0.1))
body = rb.loft('body', [
    sec(-2.15, 0.32, 0.78, 0.82, 0.62, w=W - 0.10),                        # rear face
    sec(-2.07, 0.22, 0.82, 0.94, 0.62, w=W - 0.03, shoulder=0.03),         # tail lights
    sec(-1.90, 0.18, 0.82, 0.98, 0.62, shoulder=0.03),                     # rear glass base / boot
    sec(-0.70, 0.18, 0.82, 1.32, 0.60, shoulder=0.03),                     # roof rear edge
    sec(-0.25, 0.18, 0.81, 1.32, 0.60, shoulder=0.03),                     # roof front edge
    sec(0.55, 0.18, 0.79, 0.88, 0.72),                                     # windshield base
    sec(1.90, 0.20, 0.74, 0.78, 0.68, w=W - 0.02),
    sec(2.09, 0.24, 0.67, 0.69, 0.60, w=W - 0.08),
    sec(2.15, 0.30, 0.60, 0.62, 0.50, w=W - 0.16),                         # nose
], material='paint', subdiv=1)
# glass: side windows, the long fastback rear glass and the windshield (shallow slopes stay under 0.975)
rb.paint_faces(body, 'glass', lambda c, n: c[1] > 0.92 and abs(n[1]) < 0.975 and -1.92 < c[2] < 0.55)
rb.cut_arches(body, TRACK, [ZF, ZR], WHEEL_R, TYRE_W)
rb.smooth(body)

# details sit ON the surface (rb.lamp / rb.surface_z / rb.surface_x), never a guessed z
rb.lamp('light_f', body, W - 0.24, 0.66, 0.36, 0.09, 'light_front', front=True)   # slim, swept back
rb.lamp('light_r', body, W - 0.20, 0.80, 0.38, 0.08, 'light_rear', front=False)   # wide slim tail lights
zg = rb.surface_z(body, 0, 0.42)
rb.box('grille', (0, 0.42, zg - 0.02), (0.60, 0.11, 0.06), 'trim', bevel=0.01)
zb = rb.surface_z(body, 0, 0.26)
rb.box('lip', (0, 0.24, zb - 0.05), (WIDTH - 0.40, 0.04, 0.12), 'trim')           # front splitter
zt = rb.surface_z(body, 0, 0.90, front=False)
rb.box('spoiler', (0, 0.835, zt - 0.03), (WIDTH - 0.45, 0.03, 0.08), 'trim')      # small lip on the tail edge
xm = rb.surface_x(body, 0.82, 0.35)
rb.mirror_x(rb.box('mirror', (xm + 0.05, 0.84, 0.35), (0.10, 0.08, 0.14), 'paint', bevel=0.02))

# detailing (lib/detail.py): door gaps, handles, belt moulding, sills, splitter, diffuser, exhausts
detail.door_lines(body, [0.4, -0.8], 0.3, 0.76)
detail.handle(body, -0.05, 0.72)
detail.window_trim(body, 0.46, -1.60, 0.81)
detail.sill(body, 0.88, -0.88)
detail.splitter(body, 0.2)
detail.diffuser(body, 0.28, 1.09)
detail.exhaust(body, 0.58, 0.31)
detail.ducts(body, 0.55, 0.36, 0.30, 0.10)
detail.grille(body, 0.38, 0.60, 0.10, slats=3)

for corner, x, z in (('fl', TRACK, ZF), ('fr', -TRACK, ZF), ('rl', TRACK, ZR), ('rr', -TRACK, ZR)):
    rb.wheel(corner, x, z, WHEEL_R, TYRE_W)

o = rb.args()
rb.finish(o['out'] or os.path.join(os.getcwd(), 'public/models/350z.glb'))
if o['shots']:
    rb.render(o['shots'])
