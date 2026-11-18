"""Shared car detailing on top of rb.py: door cut lines, handles, side sills, splitter, diffuser, grille slats, exhaust
tips, fog lamps and window trim. Every part sits ON the body surface (ray-cast), so a new body shape needs no re-tuning.
All coordinates are GAME space (x left, y up, z nose). Build the LEFT (+X) part; helpers mirror it.
"""
import math
import bpy
import rb


def _mid(body, y, z):
    x = rb.surface_x(body, y, z)
    return x if x is not None else 0.8


def door_lines(body, zs, y0, y1, w=0.012):
    """Vertical panel gaps (door, tailgate) at each z between heights y0..y1."""
    ym = (y0 + y1) / 2
    for i, z in enumerate(zs):
        rb.mirror_x(rb.box(f'door_cut_{i}', (_mid(body, ym, z) + 0.004, ym, z), (w, y1 - y0, 0.014), 'trim'))


def handle(body, z, y, length=0.14):
    rb.mirror_x(rb.box('handle', (_mid(body, y, z) + 0.012, y, z), (0.03, 0.026, length), 'chrome', bevel=0.008))


def window_trim(body, z0, z1, y, h=0.03):
    """Dark beltline moulding under the side glass from z0 (front) to z1 (rear)."""
    zc = (z0 + z1) / 2
    rb.mirror_x(rb.box('belt_trim', (_mid(body, y, zc) + 0.006, y, zc), (0.018, h, abs(z0 - z1)), 'trim'))


def sill(body, z0, z1, y=0.25, h=0.09):
    """Side skirt between the wheels."""
    zc = (z0 + z1) / 2
    rb.mirror_x(rb.box('sill', (_mid(body, y, zc) - 0.005, y, zc), (0.06, h, abs(z0 - z1)), 'trim', bevel=0.02))


def splitter(body, y=0.2, depth=0.16, inset=0.2):
    zf = rb.surface_z(body, 0, y + 0.06) or 2.1
    half = (_mid(body, y + 0.05, zf - 0.2) - inset)
    rb.box('splitter', (0, y, zf - depth / 2 + 0.02), (half * 2, 0.035, depth), 'trim', bevel=0.01)


def diffuser(body, y=0.27, w=1.1, h=0.12):
    zr = rb.surface_z(body, 0, y + 0.02, front=False) or -2.1
    rb.box('diffuser', (0, y, zr + 0.03), (w, h, 0.07), 'trim', bevel=0.01)
    for i in (-2, -1, 0, 1, 2):
        rb.box(f'diff_fin{i}', (i * w * 0.2, y, zr + 0.02), (0.014, h, 0.12), 'trim')


def grille(body, y, w, h, slats=4, front=True, material='chrome', x=0.0):
    """Dark opening with horizontal slats, seated on the nose (or the tail). x > 0 builds a mirrored pair (kidney grilles)."""
    z = rb.surface_z(body, x, y, front=front)
    if z is None:
        return
    s = 1 if front else -1
    parts = [rb.box('grille_bg', (x, y, z - s * 0.004), (w, h, 0.05), 'trim', bevel=0.01)]
    for i in range(slats):
        yy = y - h / 2 + h * (i + 0.5) / slats
        parts.append(rb.box(f'grille_slat{i}', (x, yy, z + s * 0.012), (w * 0.94, h / slats * 0.35, 0.02), material))
    if x > 0:
        for o in parts:
            rb.mirror_x(o)


def exhaust(body, x, y, r=0.05, length=0.14):
    """Round tip poking out of the tail, one per side at +-x."""
    z = rb.surface_z(body, x, y, front=False)
    if z is None:
        return
    for sx in (1, -1):
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=r, depth=length, location=rb.G(sx * x, y, z - length * 0.3),
                                            rotation=(math.pi / 2, 0, 0))
        o = bpy.context.active_object
        o.name = 'exhaust'
        o.data.materials.append(rb.mat('brake'))


def fog(body, x, y, w=0.12, h=0.06):
    rb.lamp('fog', body, x, y, w, h, 'light_front', front=True, depth=0.05)


def ducts(body, x, y, w, h, material='trim'):
    """Dark air intake (mirrored) seated on the nose bumper."""
    z = rb.surface_z(body, x, y)
    if z is None:
        return
    rb.mirror_x(rb.box('duct', (x, y, z - 0.005), (w, h, 0.05), material, bevel=0.01))
