"""Supra coupe (A80). Long low hood, bubble cabin set back, rounded flanks, big rear wing, four round tail lights.
Dimensions MUST match src/data/cars.ts `shape`: model-check enforces it.
Build: scripts/model-build.sh cars/supra   (SHOTS=1 for renders in logs/models/)
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import rb
import detail

LENGTH, WIDTH, HEIGHT, WHEELBASE, WHEEL_R = 4.38, 1.86, 1.29, 2.67, 0.33
TYRE_W = 0.22
W = WIDTH / 2
L = LENGTH / 2
ZF, ZR = WHEELBASE / 2, -WHEELBASE / 2
TRACK = W - TYRE_W / 2 - 0.01


def sec(z, bottom, belt, top, roof_w, w=W, shoulder=0.03):
    """Cross-section, left half from bottom centre to top centre, 7 points everywhere.
    shoulder = how far the flank bulges out (m) just under the belt line: rounded Supra flanks."""
    return (z, [(0, bottom), (w - 0.08, bottom), (w - 0.01, bottom + 0.12), (w + shoulder, belt - 0.12),
                (w - 0.03, belt), (roof_w, top), (0, top)])


rb.reset()
rb.mat('paint', color=(0.77, 0.1, 0.17))
body = rb.loft('body', [
    sec(-L, 0.32, 0.76, 0.80, 0.62, w=W - 0.10),         # rear face
    sec(-L + 0.08, 0.22, 0.80, 0.92, 0.62, w=W - 0.03),  # tail lights
    sec(-1.81, 0.18, 0.80, 0.96, 0.62),                  # boot lid
    sec(-0.81, 0.18, 0.80, 1.29, 0.60),                  # roof rear edge
    sec(-0.26, 0.18, 0.79, 1.29, 0.60),                  # roof front edge
    sec(0.54, 0.18, 0.77, 0.86, 0.72),                   # windshield base
    sec(1.24, 0.19, 0.74, 0.81, 0.70),                   # long hood
    sec(1.94, 0.20, 0.72, 0.76, 0.68, w=W - 0.02),
    sec(2.13, 0.24, 0.65, 0.67, 0.60, w=W - 0.08),
    sec(L, 0.30, 0.58, 0.60, 0.50, w=W - 0.16),          # nose
], material='paint', subdiv=1)
# windows: steep faces of the bubble greenhouse (side glass, windshield, boot glass)
rb.paint_faces(body, 'glass', lambda c, n: c[1] > 0.88 and abs(n[1]) < 0.96 and -1.78 < c[2] < 0.6)
rb.cut_arches(body, TRACK, [ZF, ZR], WHEEL_R, TYRE_W)
rb.smooth(body)

# four round tail lights: two per side, on the tail panel
rb.lamp('tail_o', body, W - 0.22, 0.85, 0.14, 0.14, 'light_rear', front=False)
rb.lamp('tail_i', body, W - 0.40, 0.85, 0.14, 0.14, 'light_rear', front=False)
# narrow headlights on the nose
rb.lamp('head_f', body, W - 0.24, 0.66, 0.40, 0.10, 'light_front', front=True)
# wide lower intake, placed on the bumper surface
zg = rb.surface_z(body, 0, 0.30)
rb.box('intake', (0, 0.30, zg - 0.02), (WIDTH - 0.50, 0.16, 0.06), 'trim', bevel=0.01)
# big rear wing: blade at y 1.16 on two posts standing on the boot lid
zp = rb.surface_z(body, 0.5, 0.95, front=False)
rb.box('wing_post_l', (0.5, 1.04, zp), (0.07, 0.23, 0.18), 'trim')
rb.box('wing_post_r', (-0.5, 1.04, zp), (0.07, 0.23, 0.18), 'trim')
rb.box('wing_blade', (0, 1.16, zp + 0.02), (1.6, 0.04, 0.30), 'trim', bevel=0.01)
# mirror on the A-pillar, flank found by surface_x
xm = rb.surface_x(body, 0.95, 0.30)
rb.mirror_x(rb.box('mirror', (xm + 0.05, 1.0, 0.30), (0.10, 0.08, 0.14), 'paint', bevel=0.02))

# detailing: door gaps, handle, belt moulding, sills, splitter, diffuser, twin exhausts
detail.door_lines(body, [0.5, -0.4], 0.3, 0.74)
detail.handle(body, -0.15, 0.7)
detail.window_trim(body, 0.5, -1.2, 0.79)
detail.sill(body, 0.95, -1.1)
detail.splitter(body, 0.2)
detail.diffuser(body, 0.28, 1.0)
detail.exhaust(body, 0.55, 0.3)

for corner, x, z in (('fl', TRACK, ZF), ('fr', -TRACK, ZF), ('rl', TRACK, ZR), ('rr', -TRACK, ZR)):
    rb.wheel(corner, x, z, WHEEL_R, TYRE_W)

o = rb.args()
rb.finish(o['out'] or os.path.join(os.getcwd(), 'public/models/supra.glb'))
if o['shots']:
    rb.render(o['shots'])
