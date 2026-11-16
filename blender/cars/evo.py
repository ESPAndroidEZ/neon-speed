"""Lancer Evolution VIII sedan. Dimensions MUST match src/data/cars.ts `shape` (model-check enforces it).
Build: scripts/model-build.sh cars/evo   (SHOTS=1 for renders in logs/models/)

Recipe (civic.py): loft (plain sections, no arch rows) -> paint_faces glass -> cut_arches -> smooth
-> details placed ON the surface with rb.lamp / rb.surface_z / rb.surface_x -> wheels at TRACK.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import rb
import detail

LENGTH, WIDTH, HEIGHT, WHEELBASE, WHEEL_R = 4.51, 1.77, 1.45, 2.63, 0.32
TYRE_W = 0.22
W = WIDTH / 2
L = LENGTH / 2
ZF, ZR = WHEELBASE / 2, -WHEELBASE / 2   # front / rear axle z
TRACK = W - TYRE_W / 2 - 0.01            # tyre outer face flush with the body side


def sec(z, bottom, belt, top, roof_w, w=W, shoulder=0.0):
    """Cross-section, left half from bottom centre to top centre, 7 points everywhere.
    shoulder = how far the flank bulges out (m) just under the belt line: gives the body a crease and some muscle."""
    return (z, [(0, bottom), (w - 0.08, bottom), (w - 0.01, bottom + 0.12), (w + shoulder, belt - 0.12),
                (w - 0.03, belt), (roof_w, top), (0, top)])


rb.reset()
rb.mat('paint', color=(0.16, 0.31, 0.66))
body = rb.loft('body', [
    sec(-L, 0.32, 0.84, 0.88, 0.62, w=W - 0.10),            # rear bumper face
    sec(-L + 0.08, 0.22, 0.88, 1.00, 0.62, w=W - 0.03),     # tail lights (boot lid flat at belt + 0.12)
    sec(-1.70, 0.18, 0.88, 1.04, 0.62),                      # rear glass base / boot
    sec(-1.15, 0.18, 0.88, HEIGHT, 0.60),                    # roof rear edge
    sec(-0.05, 0.18, 0.87, HEIGHT, 0.60),                    # roof front edge
    sec(0.85, 0.18, 0.85, 0.94, 0.72),                       # windshield base
    sec(2.00, 0.20, 0.80, 0.84, 0.68, w=W - 0.02),
    sec(2.19, 0.24, 0.73, 0.75, 0.60, w=W - 0.08),
    sec(L, 0.30, 0.66, 0.68, 0.50, w=W - 0.16),              # nose
], material='paint', subdiv=1)
# windows: side glass, windshield and the steep rear glass (flat boot/roof tops are excluded by the normal test)
rb.paint_faces(body, 'glass', lambda c, n: c[1] > 0.95 and abs(n[1]) < 0.93 and -1.75 < c[2] < 0.88)
rb.cut_arches(body, TRACK, [ZF, ZR], WHEEL_R, TYRE_W)
rb.smooth(body)

# lights sit on the paint, flush (rb.lamp finds the surface)
rb.lamp('light_f', body, W - 0.26, 0.62, 0.38, 0.12, 'light_front', front=True)
rb.lamp('light_r', body, W - 0.24, 0.90, 0.34, 0.12, 'light_rear', front=False)
rb.lamp('fog_l', body, W - 0.30, 0.34, 0.16, 0.10, 'light_front', front=True)

# wide dark intake in the big front bumper, on the nose face
zg = rb.surface_z(body, 0, 0.40)
rb.box('intake', (0, 0.40, zg - 0.02), (1.1, 0.18, 0.12), 'trim', bevel=0.01)

# hood scoop near the windshield base: z taken from the hood surface heights
zr = rb.surface_z(body, 0, 0.90)
zf = rb.surface_z(body, 0, 0.86)
rb.box('scoop', (0, 0.88, (zr + zf) / 2), (0.5, 0.06, 0.3), 'trim', bevel=0.01)

# rear wing: blade at y 1.18 on two posts standing on the boot lid (lid top = belt + 0.12 ~ 1.00)
rb.box('wing', (0, 1.18, -1.90), (1.5, 0.04, 0.28), 'trim', bevel=0.01)
for px in (0.45, -0.45):
    rb.box(f'wing_post_{px}', (px, 1.08, -1.95), (0.08, 0.20, 0.08), 'trim')

# detailing (lib/detail.py): door gaps, handles, belt moulding, sills, splitter, diffuser, exhausts
detail.door_lines(body, [0.68, -0.2, -0.95], 0.3, 0.82)
detail.handle(body, 0.23, 0.78)
detail.window_trim(body, 0.76, -1.60, 0.87)
detail.sill(body, 0.87, -0.87)
detail.splitter(body, 0.2)
detail.diffuser(body, 0.28, 1.06)
detail.exhaust(body, 0.55, 0.31)
detail.grille(body, 0.38, 0.70, 0.12, slats=4)

for corner, x, z in (('fl', TRACK, ZF), ('fr', -TRACK, ZF), ('rl', TRACK, ZR), ('rr', -TRACK, ZR)):
    rb.wheel(corner, x, z, WHEEL_R, TYRE_W)

o = rb.args()
rb.finish(o['out'] or os.path.join(os.getcwd(), 'public/models/evo.glb'))
if o['shots']:
    rb.render(o['shots'])
