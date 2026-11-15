"""BMW M3 (E46) two-door coupe. Long muscular hood with power dome, cabin set back over the rear axle,
short boot, low sills, wide bulging arches, twin round headlights per side, twin kidney grille,
L-shaped tail lights, boot-lid lip spoiler, quad exhaust tips.
Dimensions MUST match src/data/cars.ts `shape`: model-check enforces it.
Build: scripts/model-build.sh cars/m3   (SHOTS=1 for renders in logs/models/)
"""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import bpy
import rb

LENGTH, WIDTH, HEIGHT, WHEELBASE, WHEEL_R = 4.49, 1.78, 1.37, 2.73, 0.32
TYRE_W = 0.24
W = WIDTH / 2
L = LENGTH / 2
ZF, ZR = WHEELBASE / 2, -WHEELBASE / 2
TRACK = W - TYRE_W / 2 - 0.01


def sec(z, bottom, belt, top, roof_w, w=W, shoulder=0.04):
    """Cross-section, left half from bottom centre to top centre, 7 points everywhere.
    shoulder = how far the flank bulges out (m) just under the belt line: wide, bulging E46 arches."""
    return (z, [(0, bottom), (w - 0.08, bottom), (w - 0.01, bottom + 0.12), (w + shoulder, belt - 0.12),
                (w - 0.03, belt), (roof_w, top), (0, top)])


rb.reset()
rb.mat('paint', color=(0.43, 0.54, 0.65))
body = rb.loft('body', [
    sec(-L, 0.32, 0.80, 0.84, 0.56, w=W - 0.10),       # tail face
    sec(-2.17, 0.26, 0.80, 0.96, 0.58, w=W - 0.03),    # tail lights
    sec(-1.70, 0.18, 0.82, 1.00, 0.58),                # rear glass base
    sec(-1.00, 0.18, 0.84, 1.37, 0.56),                # roof rear edge
    sec(-0.05, 0.18, 0.84, 1.37, 0.56),                # roof front edge
    sec(0.80, 0.18, 0.80, 0.90, 0.70),                 # windshield base
    sec(2.19, 0.24, 0.70, 0.71, 0.66, w=W - 0.02),     # long hood, front fender line
    sec(L, 0.30, 0.62, 0.64, 0.50, w=W - 0.10),        # nose
], material='paint', subdiv=1)
# windows: side glass, windshield and boot glass of the set-back greenhouse
rb.paint_faces(body, 'glass', lambda c, n: c[1] > 0.88 and abs(n[1]) < 0.96 and -1.68 < c[2] < 0.78)
rb.cut_arches(body, TRACK, [ZF, ZR], WHEEL_R, TYRE_W)
rb.smooth(body)

# power dome on the hood: a paint box sitting on the hood surface (hood slopes, so cast straight down)
hit, loc, _n, _i = body.ray_cast(rb.G(0, 5, 1.5), rb.G(0, -1, 0) - rb.G(0, 0, 0))
if not hit:
    raise ValueError('dome: no hood surface at z=1.5')
zd = loc.z  # game-space height of the hood at the dome centre
rb.box('dome', (0, zd + 0.005, 1.5), (0.5, 0.03, 0.9), 'paint', bevel=0.01)
# twin round headlights per side, on the front fascia
rb.lamp('head_o', body, W - 0.22, 0.66, 0.16, 0.13, 'light_front')
rb.lamp('head_i', body, W - 0.40, 0.66, 0.16, 0.13, 'light_front')
# twin kidney grille: two trim boxes on the bumper surface
zg = rb.surface_z(body, 0, 0.42)
rb.box('grille_l', (0.09, 0.42, zg - 0.02), (0.15, 0.13, 0.06), 'trim', bevel=0.01)
rb.box('grille_r', (-0.09, 0.42, zg - 0.02), (0.15, 0.13, 0.06), 'trim', bevel=0.01)
# L-shaped tail light on the tail panel
rb.lamp('tail_l', body, W - 0.20, 0.86, 0.34, 0.12, 'light_rear', front=False)
# small boot-lid lip spoiler
zl = rb.surface_z(body, 0, 0.955, front=False)
rb.box('lip', (0, 0.96, zl), (1.2, 0.03, 0.12), 'trim', bevel=0.005)
# mirror at the A-pillar base, flank found by surface_x
xm = rb.surface_x(body, 0.95, 0.30)
rb.mirror_x(rb.box('mirror', (xm + 0.05, 1.0, 0.30), (0.10, 0.08, 0.14), 'paint', bevel=0.02))

# four round exhaust tips (chrome) under the rear bumper, two per side
def exhaust(name, x, y=0.34, z=-2.22):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.04, depth=0.14, location=rb.G(x, y, z),
                                        rotation=(math.pi / 2, 0, 0))
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(rb.mat('chrome'))
    return o


exhaust('ex1', 0.13)
exhaust('ex2', 0.27)
exhaust('ex3', -0.13)
exhaust('ex4', -0.27)

for corner, x, z in (('fl', TRACK, ZF), ('fr', -TRACK, ZF), ('rl', TRACK, ZR), ('rr', -TRACK, ZR)):
    rb.wheel(corner, x, z, WHEEL_R, TYRE_W)

o = rb.args()
rb.finish(o['out'] or os.path.join(os.getcwd(), 'public/models/m3.glb'))
if o['shots']:
    rb.render(o['shots'])
