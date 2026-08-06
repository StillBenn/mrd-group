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
# Sections are deliberately heavy. Thin slabs and slender columns read as a
# paper model; a building looks BUILT when the structure has visible mass and
# the facade casts its own shadows.
W, D = 14.0, 10.6        # building footprint
FLOORS = 6
FH = 3.2                 # storey height
SLAB = 0.42              # deep floor bands — the strongest horizontal line
COL = 0.58               # columns you could not bend
OVERHANG = 0.62          # how far each slab projects past the facade
PARAPET = 1.25
BALC = 1.9               # balcony depth
RAIL_H = 1.12
FIN = 0.34               # depth of the vertical facade fins
N_FINS = 9               # fins per long facade



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

    # Warmer, slightly deeper concrete: pure light grey photographs as plastic.
    m_concrete = mat("Concrete", (0.775, 0.760, 0.735, 1.0), 0.82)
    m_stone = mat("Stone", (0.690, 0.672, 0.646, 1.0), 0.88)
    m_glass = mat("Glass", (0.42, 0.53, 0.58, 1.0), 0.03, 0.0, 0.90, 1.52)
    m_metal = mat("Metal", (0.56, 0.56, 0.565, 1.0), 0.26, 1.0)
    m_frame = mat("Mullion", (0.22, 0.22, 0.235, 1.0), 0.38, 0.9)

    xs = [-W / 2 + COL / 2, -W / 6, W / 6, W / 2 - COL / 2]
    ys = [-D / 2 + COL / 2, 0.0, D / 2 - COL / 2]

    for f in range(FLOORS):
        z = f * FH
        parts = []

        # Floor band. It projects well past the glass, so every storey draws a
        # deep shadow across the facade below it — that banding is what gives
        # the block its weight.
        parts.append(box("slab", (0, 0, z + SLAB / 2),
                         (W + OVERHANG, D + OVERHANG, SLAB), m_concrete, 0.03))
        parts.append(box("slabtrim", (0, 0, z + SLAB - 0.04),
                         (W + OVERHANG + 0.06, D + OVERHANG + 0.06, 0.09),
                         m_stone, 0.02))

        if f < FLOORS - 1:
            top = FH - SLAB

            for x in xs:
                for y in ys:
                    parts.append(box("col", (x, y, z + SLAB + top / 2),
                                     (COL, COL, top), m_concrete))

            # glazed facades on the long sides, divided by mullions
            for sy in (-1, 1):
                y = sy * (D / 2 - 0.10)
                parts.append(box("glz", (0, y, z + SLAB + top / 2),
                                 (W - 1.4, 0.07, top - 0.22), m_glass, 0.0))
                for gx in (-W / 3, 0.0, W / 3):
                    parts.append(box("mul", (gx, y, z + SLAB + top / 2),
                                     (0.13, 0.14, top - 0.22), m_frame, 0.01))

                # Vertical fins standing proud of the glass. This is the
                # "embossed" quality: nine slim blades per facade, each
                # throwing a moving shadow as the sun crosses them.
                for i in range(N_FINS):
                    fx = -W / 2 + (i + 0.5) * (W / N_FINS)
                    parts.append(box("fin", (fx, y + sy * FIN / 2,
                                             z + SLAB + top / 2),
                                     (0.16, FIN, top - 0.10), m_concrete, 0.015))

            # Short facades: glazed too, with a solid pier at each end. Left
            # open they read as a half-built shell rather than a finished block.
            for sx in (-1, 1):
                x = sx * (W / 2 - 0.10)
                parts.append(box("sglz", (x, 0, z + SLAB + top / 2),
                                 (0.07, D - 1.6, top - 0.22), m_glass, 0.0))
                for gy in (-D / 4, D / 4):
                    parts.append(box("smul", (x, gy, z + SLAB + top / 2),
                                     (0.14, 0.13, top - 0.22), m_frame, 0.01))
                for py in (-1, 1):
                    parts.append(box("pier", (x - sx * 0.10, py * (D / 2 - 0.55),
                                              z + SLAB + top / 2),
                                     (0.30, 0.75, top), m_concrete, 0.02))

            # Balconies with a glass balustrade — a metal picket fence reads as
            # cheap housing; frameless glass reads as a considered building.
            if f > 0:
                by = -(D / 2 + BALC / 2)
                parts.append(box("balc", (0, by, z + SLAB / 2),
                                 (W * 0.58, BALC, SLAB * 0.92), m_concrete, 0.03))
                gz = z + SLAB + RAIL_H / 2
                parts.append(box("bglass", (0, by - BALC / 2 + 0.05, gz),
                                 (W * 0.58, 0.04, RAIL_H), m_glass, 0.0))
                parts.append(box("rtop", (0, by - BALC / 2 + 0.05,
                                          z + SLAB + RAIL_H),
                                 (W * 0.58 + 0.06, 0.10, 0.09), m_metal, 0.02))
                for sx in (-1, 1):
                    parts.append(box("bside", (sx * W * 0.29, by, gz),
                                     (0.05, BALC, RAIL_H), m_glass, 0.0))

            # ground floor reads as an entrance
            if f == 0:
                parts.append(box("door", (0, -(D / 2 + 0.06),
                                          z + SLAB + (top - 0.3) / 2),
                                 (3.6, 0.14, top - 0.3), m_glass, 0.0))
                parts.append(box("canopy", (0, -(D / 2 + 1.35),
                                            z + SLAB + top - 0.18),
                                 (6.2, 2.7, 0.30), m_concrete, 0.03))
                for sx in (-1, 1):
                    parts.append(box("portal", (sx * 2.15, -(D / 2 + 0.35),
                                                z + SLAB + top / 2),
                                     (0.5, 0.9, top), m_stone, 0.02))

        join(parts, "Floor_%d" % f)
        bpy.context.scene.cursor.location = (0, 0, z)
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

    bpy.context.scene.cursor.location = (0, 0, 0)

    # roof parapet joins the top storey
    top_z = (FLOORS - 1) * FH + SLAB
    rims = []
    ph = OVERHANG / 2
    for sx, sy, w, d in ((0, 1, W + OVERHANG, 0.36), (0, -1, W + OVERHANG, 0.36),
                         (1, 0, 0.36, D + OVERHANG), (-1, 0, 0.36, D + OVERHANG)):
        rims.append(box("rim", (sx * (W / 2 + ph - 0.06), sy * (D / 2 + ph - 0.06),
                                top_z + PARAPET / 2), (w, d, PARAPET),
                        m_concrete, 0.03))
    # a capping band, the detail that stops a roof looking like a cut-off box
    rims.append(box("cap", (0, 0, top_z + PARAPET),
                    (W + OVERHANG + 0.14, D + OVERHANG + 0.14, 0.14),
                    m_stone, 0.02))
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
