"""
MRD Group — procedural architecture for the construction page.

Produces `building.glb`: a six-storey residential block — concrete frame,
glazed facades, balconies with metal railings, parapet and entrance canopy.

Why it is modelled this way: a first attempt shipped bare slabs on columns and
read as grey cardboard. Perceived quality in architectural 3D comes from
MATERIAL and LIGHT, not polygon count — so every surface carries a real PBR
material, edges are bevelled (a razor-sharp edge never looks built), and the
web layer lights both models with an HDR environment.

Each storey is exported as its own named object (Floor_0 … Floor_5) so the web
layer can raise them one at a time and hit-test them.

Run:  blender --background --python building.py -- <output_dir>
"""
import bpy
import math
import sys

# ---- dimensions (metres — real scale keeps proportions believable) ---------
W, D = 13.0, 10.0        # building footprint
FLOORS = 6
FH = 3.1                 # storey height
SLAB = 0.28
COL = 0.42
PARAPET = 1.0
BALC = 1.6               # balcony depth
RAIL_H = 1.05



def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, color, rough=0.7, metal=0.0, transmission=0.0, ior=1.45):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    if b:
        b.inputs["Base Color"].default_value = color
        b.inputs["Roughness"].default_value = rough
        b.inputs["Metallic"].default_value = metal
        if transmission > 0.0:
            for key in ("Transmission Weight", "Transmission"):
                if key in b.inputs:
                    b.inputs[key].default_value = transmission
                    break
        if "IOR" in b.inputs:
            b.inputs["IOR"].default_value = ior
    if transmission > 0.0:
        m.blend_method = 'BLEND'
    return m


def box(name, loc, scale, material=None, bevel=0.015):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material:
        o.data.materials.append(material)
    if bevel:
        mod = o.modifiers.new("Bevel", 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = 'ANGLE'
        mod.angle_limit = math.radians(40)
    return o


def join(parts, name):
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    return o


def export(path):
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', export_apply=True, export_yup=True
    )


# ===========================================================================
#  BUILDING
# ===========================================================================
def build_building(out):
    reset()

    m_concrete = mat("Concrete", (0.815, 0.803, 0.783, 1.0), 0.86)
    m_stone = mat("Stone", (0.735, 0.720, 0.700, 1.0), 0.90)
    m_glass = mat("Glass", (0.62, 0.71, 0.74, 1.0), 0.06, 0.0, 0.92, 1.5)
    m_metal = mat("Metal", (0.60, 0.60, 0.605, 1.0), 0.34, 1.0)
    m_frame = mat("Mullion", (0.30, 0.30, 0.31, 1.0), 0.42, 0.85)

    xs = [-W / 2 + COL / 2, -W / 6, W / 6, W / 2 - COL / 2]
    ys = [-D / 2 + COL / 2, 0.0, D / 2 - COL / 2]

    for f in range(FLOORS):
        z = f * FH
        parts = []

        # slab, slightly overhanging so it casts a shadow line on the facade
        parts.append(box("slab", (0, 0, z + SLAB / 2),
                         (W + 0.34, D + 0.34, SLAB), m_concrete, 0.02))

        if f < FLOORS - 1:
            top = FH - SLAB

            for x in xs:
                for y in ys:
                    parts.append(box("col", (x, y, z + SLAB + top / 2),
                                     (COL, COL, top), m_concrete))

            # glazed facades on the long sides, divided by mullions
            for sy in (-1, 1):
                y = sy * (D / 2 - 0.08)
                parts.append(box("glz", (0, y, z + SLAB + top / 2),
                                 (W - 1.2, 0.06, top - 0.30), m_glass, 0.0))
                for gx in (-W / 3, 0.0, W / 3):
                    parts.append(box("mul", (gx, y, z + SLAB + top / 2),
                                     (0.10, 0.12, top - 0.30), m_frame, 0.01))
                parts.append(box("sill", (0, y, z + SLAB + 0.08),
                                 (W - 1.0, 0.20, 0.16), m_stone, 0.02))

            # balcony + railing on the front of every storey above the ground
            if f > 0:
                by = -(D / 2 + BALC / 2)
                parts.append(box("balc", (0, by, z + SLAB / 2),
                                 (W * 0.52, BALC, SLAB * 0.8), m_concrete, 0.02))
                rz = z + SLAB + RAIL_H / 2
                parts.append(box("rtop", (0, by - BALC / 2, z + SLAB + RAIL_H),
                                 (W * 0.52, 0.07, 0.07), m_metal, 0.01))
                n_bal = 15
                for i in range(n_bal):
                    bx = -W * 0.26 + (i / (n_bal - 1.0)) * (W * 0.52)
                    parts.append(box("bal", (bx, by - BALC / 2, rz),
                                     (0.035, 0.035, RAIL_H), m_metal, 0.0))
                for sx in (-1, 1):
                    parts.append(box("rside", (sx * W * 0.26, by, rz),
                                     (0.05, BALC, 0.05), m_metal, 0.01))

            # ground floor reads as an entrance
            if f == 0:
                parts.append(box("door", (0, -(D / 2 + 0.05),
                                          z + SLAB + (top - 0.3) / 2),
                                 (3.2, 0.12, top - 0.3), m_glass, 0.0))
                parts.append(box("canopy", (0, -(D / 2 + 1.1),
                                            z + SLAB + top - 0.15),
                                 (5.0, 2.2, 0.18), m_concrete, 0.02))

        join(parts, "Floor_%d" % f)
        bpy.context.scene.cursor.location = (0, 0, z)
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

    bpy.context.scene.cursor.location = (0, 0, 0)

    # roof parapet joins the top storey
    top_z = (FLOORS - 1) * FH + SLAB
    rims = []
    for sx, sy, w, d in ((0, 1, W + 0.3, 0.24), (0, -1, W + 0.3, 0.24),
                         (1, 0, 0.24, D + 0.3), (-1, 0, 0.24, D + 0.3)):
        rims.append(box("rim", (sx * (W / 2 + 0.15), sy * (D / 2 + 0.15),
                                top_z + PARAPET / 2), (w, d, PARAPET),
                        m_concrete, 0.02))
    parapet = join(rims, "Parapet")
    last = bpy.data.objects["Floor_%d" % (FLOORS - 1)]
    bpy.ops.object.select_all(action='DESELECT')
    parapet.select_set(True)
    last.select_set(True)
    bpy.context.view_layer.objects.active = last
    bpy.ops.object.join()
    bpy.context.active_object.name = "Floor_%d" % (FLOORS - 1)

    box("Ground", (0, 0, -0.16), (W * 1.55, D * 1.75, 0.32), m_stone, 0.03)

    export(out)
    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    print("BUILDING_OBJECTS:", sorted(o.name for o in bpy.data.objects))
    print("BUILDING_FACES:", tris)


args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
out_dir = args[0] if args else "."
build_building(out_dir + "/building.glb")
print("DONE")
