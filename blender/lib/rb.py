"""Racer's Blood Blender helpers (headless, Blender 4.5 LTS). Used by blender/cars/*.py and blender/props/*.py.

All coordinates you pass are GAME space, metres: +X = LEFT, +Y = UP, +Z = NOSE (front of the car).
The car stands on y = 0, centred on x = 0 and z = 0. rb converts to Blender space and the glTF exporter
turns it back, so the GLB comes out with the nose on +Z exactly like the game expects.

Names the game relies on (src/world/assetLoader.ts):
  material "paint"  -> the body colour the garage tints (keep the body in ONE paint material)
  objects "wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr" -> top-level wheel nodes, origin at the hub
Other materials: glass, trim, tyre, rim, chrome, light_front, light_rear (use mat(name) to get them).
"""
import bpy, bmesh, json, math, os, sys
from mathutils import Vector

PALETTE = {  # name: (rgb, metallic, roughness, emission strength)
    'paint': ((0.8, 0.8, 0.8), 0.6, 0.25, 0.0),
    'glass': ((0.02, 0.025, 0.03), 0.0, 0.05, 0.0),
    'trim': ((0.03, 0.03, 0.035), 0.2, 0.6, 0.0),
    'tyre': ((0.02, 0.02, 0.02), 0.0, 0.9, 0.0),
    'rim': ((0.55, 0.56, 0.6), 1.0, 0.3, 0.0),
    'chrome': ((0.9, 0.9, 0.9), 1.0, 0.1, 0.0),
    'light_front': ((1.0, 0.97, 0.9), 0.0, 0.2, 3.0),
    'light_rear': ((0.9, 0.02, 0.02), 0.0, 0.3, 2.0),
}


def G(x, y, z):
    """Game space (x left, y up, z nose) -> Blender space (x, -z, y)."""
    return Vector((x, -z, y))


def args():
    """Command-line options after `--`: --out file.glb --shots dir/prefix --color r,g,b"""
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    o = {'out': None, 'shots': None, 'color': None}
    for i in range(0, len(a) - 1, 2):
        o[a[i].lstrip('-')] = a[i + 1]
    return o


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = 'METRIC'


def mat(name, color=None):
    """Get or create a material from PALETTE. color overrides the base colour (rgb 0..1)."""
    m = bpy.data.materials.get(name)
    if m:
        return m
    rgb, metal, rough, emit = PALETTE.get(name, ((0.5, 0.5, 0.5), 0.0, 0.5, 0.0))
    rgb = color or rgb
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    if emit > 0:
        p.inputs['Emission Color'].default_value = (*rgb, 1)
        p.inputs['Emission Strength'].default_value = emit
    return m


def _object(name, mesh, material):
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    if material is not None:
        obj.data.materials.append(material if not isinstance(material, str) else mat(material))
    return obj


def loft(name, sections, material='paint', subdiv=1, cap=True):
    """Body shell through cross-sections. sections = [(z, [(x, y), ...]), ...], ordered rear -> nose.
    Each point list is the LEFT half (x >= 0) from bottom centre (x = 0) round to top centre (x = 0);
    it is mirrored to the right. Every section needs the same number of points."""
    n = len(sections[0][1])
    bm = bmesh.new()
    rings = []
    for z, pts in sections:
        if len(pts) != n:
            raise ValueError(f'{name}: section at z={z} has {len(pts)} points, expected {n}')
        ring = [(x, y) for x, y in pts] + [(-x, y) for x, y in reversed(pts[1:-1])]
        rings.append([bm.verts.new(G(x, y, z)) for x, y in ring])
    for a, b in zip(rings, rings[1:]):
        m = len(a)
        for i in range(m):
            j = (i + 1) % m
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if cap:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = _object(name, me, material)
    if subdiv > 0:
        mod = obj.modifiers.new('subdiv', 'SUBSURF')
        mod.levels = mod.render_levels = subdiv
    return obj


def paint_faces(obj, material, test):
    """Give faces a second material where test(center, normal) is True; both are game-space (x, y, z) tuples.
    Example, windows on a body loft: rb.paint_faces(body, 'glass', lambda c, n: c[1] > 0.9 and abs(n[1]) < 0.8)"""
    m = mat(material) if isinstance(material, str) else material
    if m.name not in obj.data.materials:
        obj.data.materials.append(m)
    idx = list(obj.data.materials).index(m)
    for p in obj.data.polygons:
        c, n = p.center, p.normal
        if test((c.x, c.z, -c.y), (n.x, n.z, -n.y)):
            p.material_index = idx
    return obj


def box(name, center, size, material='trim', bevel=0.0):
    """Axis-aligned box. center and size in game space (size = full width, height, length)."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=G(*center))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(scale=True)
    obj.data.materials.append(mat(material) if isinstance(material, str) else material)
    if bevel > 0:
        b = obj.modifiers.new('bevel', 'BEVEL')
        b.width, b.segments = bevel, 2
    return obj


def wheel(corner, x, z, radius, width, rim_ratio=0.68, spokes=5, segments=24):
    """One wheel named wheel_<corner> (fl, fr, rl, rr), origin at the hub, axle along X, touching y = 0.
    Tyre (material tyre) and rim face (material rim) are one object so the game can spin it later."""
    side = 1 if corner[1] == 'l' else -1
    bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=radius, depth=width, location=(0, 0, 0), rotation=(0, math.pi / 2, 0))
    tyre = bpy.context.active_object
    tyre.data.materials.append(mat('tyre'))
    bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=radius * rim_ratio, depth=0.02,
                                        location=(side * width * 0.5, 0, 0), rotation=(0, math.pi / 2, 0))
    face = bpy.context.active_object
    face.data.materials.append(mat('rim'))
    parts = [face]
    for k in range(spokes):
        a = 2 * math.pi * k / spokes
        bpy.ops.mesh.primitive_cube_add(size=1, location=(side * width * 0.52, math.cos(a) * radius * 0.33, math.sin(a) * radius * 0.33),
                                        rotation=(-a, 0, 0))
        s = bpy.context.active_object
        s.scale = (0.03, radius * 0.6, 0.06)
        s.data.materials.append(mat('chrome'))
        parts.append(s)
    for o in [tyre] + parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = tyre
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.join()
    tyre.name = f'wheel_{corner}'
    tyre.location = G(x, radius, z)
    return tyre


def mirror_x(obj):
    """Add a mirror across x = 0 (left/right symmetric parts: mirrors, lights, vents). Build the LEFT (+X) one."""
    for o in bpy.context.selected_objects:
        o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)  # origin to world 0: mirror about x = 0
    obj.select_set(False)
    m = obj.modifiers.new('mirror', 'MIRROR')
    m.use_axis = (True, False, False)
    return obj


def smooth(obj, angle_deg=35):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle_deg))
    except Exception:
        bpy.ops.object.shade_smooth()
    obj.select_set(False)


def _triangles():
    dg = bpy.context.evaluated_depsgraph_get()
    total = 0
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            me = o.evaluated_get(dg).to_mesh()
            total += sum(len(p.vertices) - 2 for p in me.polygons)
            o.evaluated_get(dg).to_mesh_clear()
    return total


def finish(out, budget=30000):
    """Flatten the hierarchy, apply transforms (wheels keep their hub location), export GLB, print stats JSON."""
    for o in bpy.context.scene.objects:
        o.select_set(False)  # transform_apply works on the whole selection: one object at a time
    for o in bpy.context.scene.objects:
        o.parent = None
        if o.type == 'MESH':
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.transform_apply(location=not o.name.startswith('wheel_'), rotation=True, scale=True)
            o.select_set(False)
    tris = _triangles()
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_yup=True,
                              export_cameras=False, export_lights=False)
    print('RB_STATS ' + json.dumps({'out': out, 'triangles': tris, 'budget': budget,
                                    'objects': sorted(o.name for o in bpy.context.scene.objects if o.type == 'MESH')}))
    if tris > budget:
        raise SystemExit(f'over triangle budget: {tris} > {budget}')


def render(prefix, distance=7.5, res=(640, 360), samples=12):
    """Front 3/4, side and rear 3/4 PNGs (Cycles CPU: works headless, leaves the GPU to the Qwen server)."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = False
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.world = sc.world or bpy.data.worlds.new('world')
    sc.world.color = (0.05, 0.06, 0.09)
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 4
    sun.rotation_euler = (math.radians(50), 0, math.radians(30))
    sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam
    target = G(0, 0.6, 0)
    for label, yaw in (('front', 35), ('side', 90), ('rear', 145)):
        a = math.radians(yaw)
        cam.location = G(math.sin(a) * distance, 1.6, math.cos(a) * distance)
        cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = f'{prefix}-{label}.png'
        bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(sun)
    bpy.data.objects.remove(cam)
