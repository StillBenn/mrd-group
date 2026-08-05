"""
Procedural building frame for MRD Group's construction page.

Design intent: this is not a photoreal render — it is a MODEL, in the
architectural sense. Slabs, columns and a core, in paper-white, so it reads as
a maquette sitting on the site's paper ground rather than a video game asset.

Each storey is exported as its own named object (Floor_0 … Floor_N) so the web
layer can raise them one at a time as the reader scrolls.

Run:  blender --background --python building.py
Out:  building.glb
"""
import bpy
import math

# ---- parameters ------------------------------------------------------------
W, D = 9.0, 7.0        # footprint
FLOORS = 6
FH = 2.9               # storey height
SLAB = 0.22            # slab thickness
COL = 0.34             # column side
CORE_W, CORE_D = 2.2, 2.0

bpy.ops.wm.read_factory_settings(use_empty=True)


def box(name, loc, scale):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return o


def material(name, rgba, rough=0.72):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = rough
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = 0.0
    return m


mat_slab = material("Slab", (0.918, 0.910, 0.892, 1.0), 0.80)   # paper white
mat_col = material("Column", (0.858, 0.846, 0.824, 1.0), 0.74)  # a shade deeper
mat_core = material("Core", (0.780, 0.766, 0.742, 1.0), 0.70)   # service core

# column grid: corners plus mid-span, so the frame reads as a real structure
xs = [-W / 2 + COL / 2, 0.0, W / 2 - COL / 2]
ys = [-D / 2 + COL / 2, 0.0, D / 2 - COL / 2]

for f in range(FLOORS):
    base_z = f * FH
    parts = []

    # slab for this storey
    s = box("s", (0.0, 0.0, base_z + SLAB / 2), (W, D, SLAB))
    s.data.materials.append(mat_slab)
    parts.append(s)

    # columns carrying the storey above (skip the very top level)
    if f < FLOORS - 1:
        for x in xs:
            for y in ys:
                if x == 0.0 and y == 0.0:
                    continue  # centre is occupied by the core
                c = box("c", (x, y, base_z + SLAB + (FH - SLAB) / 2),
                        (COL, COL, FH - SLAB))
                c.data.materials.append(mat_col)
                parts.append(c)

        # service core — the shaft every real building has
        k = box("k", (0.0, 0.0, base_z + SLAB + (FH - SLAB) / 2),
                (CORE_W, CORE_D, FH - SLAB))
        k.data.materials.append(mat_core)
        parts.append(k)

    # join the storey into one named object
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    floor = bpy.context.active_object
    floor.name = "Floor_%d" % f

    # origin to the storey's own base, so the web layer can lift it from there
    bpy.context.scene.cursor.location = (0.0, 0.0, base_z)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

bpy.context.scene.cursor.location = (0.0, 0.0, 0.0)

# ground plate — grounds the maquette instead of leaving it floating
g = box("Ground", (0.0, 0.0, -0.14), (W * 1.9, D * 1.9, 0.28))
g.data.materials.append(material("Ground", (0.845, 0.833, 0.812, 1.0), 0.9))

bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(
    filepath="building.glb",
    export_format='GLB',
    export_apply=True,
    export_yup=True,
)

names = sorted([o.name for o in bpy.data.objects])
tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
print("EXPORTED_OBJECTS:", names)
print("FACE_COUNT:", tris)
