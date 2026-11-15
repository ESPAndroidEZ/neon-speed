"""Nissan 350Z coupe (task 046). Dimensions match src/data/cars.ts `shape`; model-check enforces it.
Build: scripts/model-build.sh cars/350z   (SHOTS=1 for renders in logs/models/)"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import rb

LENGTH, WIDTH, HEIGHT, WHEELBASE, WHEEL_R = 4.31, 1.82, 1.32, 2.65, 0.32
W = WIDTH / 2
ZF, ZR = WHEELBASE / 2, -WHEELBASE / 2   # front / rear axle z


def sec(z, bottom, belt, top, roof_w, w=W):
    """One cross-section, left half from bottom centre to top centre (6 points, same count everywhere)."""
    return (z, [(0, bottom), (w - 0.06, bottom), (w, min(bottom + 0.1, belt - 0.02)), (w, belt), (roof_w, top), (0, top)])


rb.reset()
rb.mat('paint', color=(0.88, 0.40, 0.10))
L = LENGTH / 2
body = rb.loft('body', [
    sec(-2.15, 0.30, 0.78, 0.84, 0.74, w=W - 0.05),  # rear face
    sec(-2.03, 0.20, 0.82, 0.94, 0.74, w=W - 0.02),  # tail top
    sec(-1.95, 0.18, 0.82, 0.96, 0.70),              # rear glass base
    sec(-1.71, 0.18, 0.82, 1.03, 0.66, w=W + 0.03),  # rear arch start (haunch)
    sec(-1.62, 0.70, 0.82, 1.06, 0.63, w=W + 0.03),
    sec(-1.02, 0.70, 0.82, 1.23, 0.62, w=W + 0.03),
    sec(-0.94, 0.18, 0.82, 1.25, 0.63),
    sec(-0.70, 0.18, 0.82, HEIGHT, 0.62),            # roof rear edge
    sec(-0.25, 0.18, 0.82, HEIGHT, 0.62),            # roof front edge
    sec(0.55, 0.18, 0.80, 0.90, 0.74),               # windshield base
    sec(0.94, 0.18, 0.79, 0.84, 0.74),               # front arch start
    sec(1.02, 0.70, 0.78, 0.82, 0.74),
    sec(1.62, 0.70, 0.76, 0.73, 0.74),
    sec(1.71, 0.20, 0.74, 0.71, 0.74),
    sec(2.15, 0.30, 0.62, 0.64, 0.66, w=W - 0.12),   # nose
], material='paint', subdiv=1)
# windows: steep faces of the fastback greenhouse, rear glass base to windshield base
rb.paint_faces(body, 'glass', lambda c, n: c[1] > 0.90 and abs(n[1]) < 0.93 and -1.95 < c[2] < 0.55)
rb.smooth(body)

for name, mat, y, z, h in (('light_f', 'light_front', 0.55, L - 0.05, 0.10), ('light_r', 'light_rear', 0.86, -L + 0.04, 0.10)):
    rb.mirror_x(rb.box(name, (W - 0.24, y, z), (0.34, h, 0.08), mat, bevel=0.02))
rb.box('grille', (0, 0.40, L - 0.02), (0.7, 0.14, 0.06), 'trim', bevel=0.01)
rb.box('lip', (0, 0.97, -2.03), (WIDTH - 0.35, 0.04, 0.12), 'trim')  # small tail lip spoiler
rb.mirror_x(rb.box('mirror', (W - 0.01, 0.92, 0.30), (0.08, 0.08, 0.14), 'paint', bevel=0.02))

TRACK = W - 0.13
for corner, x, z in (('fl', TRACK, ZF), ('fr', -TRACK, ZF), ('rl', TRACK, ZR), ('rr', -TRACK, ZR)):
    rb.wheel(corner, x, z, WHEEL_R, 0.22)

o = rb.args()
rb.finish(o['out'] or os.path.join(os.getcwd(), 'public/models/350z.glb'))
if o['shots']:
    rb.render(o['shots'])
