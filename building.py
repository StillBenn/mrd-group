"""
MRD Group — procedural architecture for the construction page.

Produces `building.glb`: a nine-storey residential block — podium, main shaft,
cantilevered bay, stepped-back crown, glazed facades and roofscape.

Why it is modelled this way: a first attempt shipped bare slabs on columns and
read as grey cardboard. Perceived quality in architectural 3D comes from
MATERIAL and LIGHT, not polygon count — so every surface carries a real PBR
material, edges are bevelled (a razor-sharp edge never looks built), and the
web layer lights both models with an HDR environment.

Each storey is exported as its own named object (Floor_0 … Floor_8) so the web
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
W, D = 15.0, 11.0        # nominal footprint of the main body
FLOORS = 9               # tall enough to read as a building, not a house
FH = 3.25                # storey height
SLAB = 0.46              # deep floor bands — the strongest horizontal line
COL = 0.62               # columns you could not bend
OVERHANG = 0.70          # how far each slab projects past the facade
PARAPET = 1.35
BALC = 2.1               # balcony depth
RAIL_H = 1.12
FIN = 0.40               # depth of the vertical facade fins
N_FINS = 10              # fins per long facade

# Massing. A single extruded rectangle always looks timid; the block is
# composed instead — a wide podium at street level, a main shaft, a
# cantilevered bay pushing out of the middle, and a crown that steps back.
PODIUM_TOP = 1            # storeys 0–1 are the podium
CROWN_FROM = 7            # storeys 7+ step back
BAY_FROM, BAY_TO = 3, 5   # the cantilever


def footprint(f):
    if f <= PODIUM_TOP:
        return W * 1.26, D * 1.16
    if f >= CROWN_FROM:
        return W * 0.68, D * 0.82
    return W, D



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

    for f in range(FLOORS):
        z = f * FH
        w, d = footprint(f)
        parts = []

        # Floor band. It projects well past the glass, so every storey draws a
        # deep shadow across the facade below it — that banding is what gives
        # the block its weight.
        parts.append(box("slab", (0, 0, z + SLAB / 2),
                         (w + OVERHANG, d + OVERHANG, SLAB), m_concrete, 0.03))
        parts.append(box("slabtrim", (0, 0, z + SLAB - 0.04),
                         (w + OVERHANG + 0.06, d + OVERHANG + 0.06, 0.09),
                         m_stone, 0.02))

        # Where the mass steps back, the roof of the storey below becomes a
        # terrace — the balustrade is what tells you it is occupied.
        if f in (PODIUM_TOP + 1, CROWN_FROM):
            pw, pd = footprint(f - 1)
            for sy in (-1, 1):
                parts.append(box("tglass", (0, sy * (pd / 2 + OVERHANG / 2 - 0.12),
                                            z + SLAB + 0.55),
                                 (pw * 0.92, 0.04, 1.10), m_glass, 0.0))
                parts.append(box("trail", (0, sy * (pd / 2 + OVERHANG / 2 - 0.12),
                                           z + SLAB + 1.10),
                                 (pw * 0.92 + 0.06, 0.09, 0.08), m_metal, 0.02))

        if f < FLOORS - 1:
            top = FH - SLAB
            xs = [-w / 2 + COL / 2, -w / 6, w / 6, w / 2 - COL / 2]
            ys = [-d / 2 + COL / 2, 0.0, d / 2 - COL / 2]

            for x in xs:
                for y in ys:
                    parts.append(box("col", (x, y, z + SLAB + top / 2),
                                     (COL, COL, top), m_concrete))

            # glazed facades on the long sides, divided by mullions
            for sy in (-1, 1):
                y = sy * (d / 2 - 0.10)
                parts.append(box("glz", (0, y, z + SLAB + top / 2),
                                 (w - 1.4, 0.07, top - 0.22), m_glass, 0.0))
                for gx in (-w / 3, 0.0, w / 3):
                    parts.append(box("mul", (gx, y, z + SLAB + top / 2),
                                     (0.13, 0.14, top - 0.22), m_frame, 0.01))

                # Vertical fins standing proud of the glass. This is the
                # "embossed" quality: slim blades throwing moving shadows.
                for i in range(N_FINS):
                    fx = -w / 2 + (i + 0.5) * (w / N_FINS)
                    parts.append(box("fin", (fx, y + sy * FIN / 2,
                                             z + SLAB + top / 2),
                                     (0.17, FIN, top - 0.10), m_concrete, 0.015))

            # Short facades: glazed too, with a solid pier at each end.
            for sx in (-1, 1):
                x = sx * (w / 2 - 0.10)
                parts.append(box("sglz", (x, 0, z + SLAB + top / 2),
                                 (0.07, d - 1.6, top - 0.22), m_glass, 0.0))
                for gy in (-d / 4, d / 4):
                    parts.append(box("smul", (x, gy, z + SLAB + top / 2),
                                     (0.14, 0.13, top - 0.22), m_frame, 0.01))
                for py in (-1, 1):
                    parts.append(box("pier", (x - sx * 0.10, py * (d / 2 - 0.55),
                                              z + SLAB + top / 2),
                                     (0.32, 0.80, top), m_concrete, 0.02))

            # The cantilever: a glazed bay pushed out of the middle of the
            # shaft, hanging over the podium. This is the move that stops the
            # block reading as one timid extrusion.
            if BAY_FROM <= f <= BAY_TO:
                byd = 2.3
                by = -(d / 2 + byd / 2)
                parts.append(box("bayslab", (0, by, z + SLAB / 2),
                                 (w * 0.46, byd, SLAB), m_concrete, 0.03))
                parts.append(box("bayglz", (0, by - byd / 2 + 0.06,
                                            z + SLAB + top / 2),
                                 (w * 0.46, 0.07, top - 0.20), m_glass, 0.0))
                for bx in (-w * 0.155, w * 0.155):
                    parts.append(box("baymul", (bx, by - byd / 2 + 0.06,
                                                z + SLAB + top / 2),
                                     (0.14, 0.14, top - 0.20), m_frame, 0.01))
                for sx in (-1, 1):
                    parts.append(box("bayside", (sx * w * 0.23, by,
                                                 z + SLAB + top / 2),
                                     (0.30, byd, top), m_concrete, 0.02))
                parts.append(box("baytop", (0, by, z + FH - 0.10),
                                 (w * 0.46 + 0.12, byd + 0.12, 0.22),
                                 m_concrete, 0.03))

            # Balconies with a glass balustrade, on the storeys the bay does
            # not occupy.
            elif f > PODIUM_TOP:
                by = -(d / 2 + BALC / 2)
                parts.append(box("balc", (0, by, z + SLAB / 2),
                                 (w * 0.60, BALC, SLAB * 0.92), m_concrete, 0.03))
                gz = z + SLAB + RAIL_H / 2
                parts.append(box("bglass", (0, by - BALC / 2 + 0.05, gz),
                                 (w * 0.60, 0.04, RAIL_H), m_glass, 0.0))
                parts.append(box("rtop", (0, by - BALC / 2 + 0.05,
                                          z + SLAB + RAIL_H),
                                 (w * 0.60 + 0.06, 0.10, 0.09), m_metal, 0.02))
                for sx in (-1, 1):
                    parts.append(box("bside", (sx * w * 0.30, by, gz),
                                     (0.05, BALC, RAIL_H), m_glass, 0.0))

            # ground floor reads as an entrance
            if f == 0:
                parts.append(box("door", (0, -(d / 2 + 0.06),
                                          z + SLAB + (top - 0.3) / 2),
                                 (4.0, 0.14, top - 0.3), m_glass, 0.0))
                parts.append(box("canopy", (0, -(d / 2 + 1.6),
                                            z + SLAB + top - 0.18),
                                 (7.0, 3.2, 0.34), m_concrete, 0.03))
                for sx in (-1, 1):
                    parts.append(box("portal", (sx * 2.4, -(d / 2 + 0.4),
                                                z + SLAB + top / 2),
                                     (0.55, 1.0, top), m_stone, 0.02))

        join(parts, "Floor_%d" % f)
        bpy.context.scene.cursor.location = (0, 0, z)
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

    bpy.context.scene.cursor.location = (0, 0, 0)

    # roof parapet joins the top storey
    top_z = (FLOORS - 1) * FH + SLAB
    rims = []
    cw, cd = footprint(FLOORS - 1)
    ph = OVERHANG / 2
    for sx, sy, w_, d_ in ((0, 1, cw + OVERHANG, 0.40), (0, -1, cw + OVERHANG, 0.40),
                           (1, 0, 0.40, cd + OVERHANG), (-1, 0, 0.40, cd + OVERHANG)):
        rims.append(box("rim", (sx * (cw / 2 + ph - 0.06), sy * (cd / 2 + ph - 0.06),
                                top_z + PARAPET / 2), (w_, d_, PARAPET),
                        m_concrete, 0.03))
    # a capping band, the detail that stops a roof looking like a cut-off box
    rims.append(box("cap", (0, 0, top_z + PARAPET),
                    (cw + OVERHANG + 0.16, cd + OVERHANG + 0.16, 0.16),
                    m_stone, 0.02))
    # rooftop plant room + a slim mast: the silhouette detail every real
    # building has and every toy model lacks
    rims.append(box("plant", (cw * 0.18, 0, top_z + PARAPET + 0.9),
                   (cw * 0.42, cd * 0.5, 1.8), m_concrete, 0.03))
    rims.append(box("mast", (-cw * 0.3, 0, top_z + PARAPET + 2.4),
                   (0.16, 0.16, 4.8), m_metal, 0.0))

    # The roofscape belongs to the top storey, so it rises with it.
    parapet = join(rims, "Parapet")
    last = bpy.data.objects["Floor_%d" % (FLOORS - 1)]
    bpy.ops.object.select_all(action='DESELECT')
    parapet.select_set(True)
    last.select_set(True)
    bpy.context.view_layer.objects.active = last
    bpy.ops.object.join()
    bpy.context.active_object.name = "Floor_%d" % (FLOORS - 1)

    box("Ground", (0, 0, -0.18), (W * 1.85, D * 2.0, 0.36), m_stone, 0.03)

    export(out)
    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    print("BUILDING_OBJECTS:", sorted(o.name for o in bpy.data.objects))
    print("BUILDING_FACES:", tris)


args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
out_dir = args[0] if args else "."
build_building(out_dir + "/building.glb")
print("DONE")
