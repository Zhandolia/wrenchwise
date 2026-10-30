#!/usr/bin/env python3
"""build_timing_assembly.py - Blender 4.5 headless authoring build.

Interprets modeling/wrenchwise/recipes.json against the component inventory in
content/components/<engine>.json and produces the authoring scene plus a GLB.

    blender --background --factory-startup --python build_timing_assembly.py \
        -- <repo_root> <output.glb>

recipes.json is the single source of truth for which shape each component uses
and with which material. The shape vocabulary here mirrors
modeling/wrenchwise/lib/primitives.mjs vertex for vertex, so the authoring build
and the browser export agree. The browser assets committed to the repository are
produced by the Node exporter (``node modeling/wrenchwise/build_assembly.mjs``),
which runs in CI; this script is the authoring path for interactive refinement
and for anything that needs Blender's modifiers or renderer.

Coordinates are the glTF frame documented in content/engines/<engine>.json#frame:
X = engine left, Y = up, Z = forward along the crankshaft. The scene is authored
directly in that frame, so the exporter must not rotate it (``export_yup=False``).
"""

from __future__ import annotations

import datetime
import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any

import bmesh
import bpy
from mathutils import Vector

TAU = math.pi * 2
AXIS_INDEX = {"x": 0, "y": 1, "z": 2}


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _cli_args() -> tuple[Path, Path]:
    argv = sys.argv
    custom = argv[argv.index("--") + 1:] if "--" in argv else []
    if len(custom) < 2:
        raise SystemExit(
            "Usage: blender --background --factory-startup --python "
            "build_timing_assembly.py -- <repo_root> <output.glb>"
        )
    return Path(custom[0]), Path(custom[1])


# ---------------------------------------------------------------------------
# Mesh container (plain lists, so the shape maths matches primitives.mjs)
# ---------------------------------------------------------------------------

class Shape:
    def __init__(self) -> None:
        self.verts: list[list[float]] = []
        self.faces: list[tuple[int, ...]] = []

    def v(self, x: float, y: float, z: float) -> int:
        self.verts.append([x, y, z])
        return len(self.verts) - 1

    def tri(self, a: int, b: int, c: int) -> None:
        self.faces.append((a, b, c))

    def quad(self, a: int, b: int, c: int, d: int) -> None:
        self.faces.append((a, b, c))
        self.faces.append((a, c, d))

    def merge(self, other: "Shape", offset=(0.0, 0.0, 0.0)) -> "Shape":
        base = len(self.verts)
        for x, y, z in other.verts:
            self.verts.append([x + offset[0], y + offset[1], z + offset[2]])
        for face in other.faces:
            self.faces.append(tuple(i + base for i in face))
        return self

    def translate(self, dx: float, dy: float, dz: float) -> "Shape":
        for p in self.verts:
            p[0] += dx
            p[1] += dy
            p[2] += dz
        return self


def apply_axis(shape: Shape, axis: str) -> Shape:
    """Rotate geometry built along local +Z so +Z points along *axis*."""
    if axis in (None, "z"):
        return shape
    for p in shape.verts:
        x, y, z = p
        if axis == "x":
            p[0], p[1], p[2] = z, y, -x
        elif axis == "y":
            p[0], p[1], p[2] = x, z, -y
        else:
            raise ValueError(f'Unknown axis "{axis}"')
    return shape


# ---------------------------------------------------------------------------
# Shape vocabulary
# ---------------------------------------------------------------------------

def s_box(x: float, y: float, z: float) -> Shape:
    m = Shape()
    hx, hy, hz = x / 2, y / 2, z / 2
    i = [
        m.v(-hx, -hy, -hz), m.v(hx, -hy, -hz), m.v(hx, hy, -hz), m.v(-hx, hy, -hz),
        m.v(-hx, -hy, hz), m.v(hx, -hy, hz), m.v(hx, hy, hz), m.v(-hx, hy, hz),
    ]
    m.quad(i[3], i[2], i[1], i[0])
    m.quad(i[4], i[5], i[6], i[7])
    m.quad(i[0], i[1], i[5], i[4])
    m.quad(i[2], i[3], i[7], i[6])
    m.quad(i[1], i[2], i[6], i[5])
    m.quad(i[3], i[0], i[4], i[7])
    return m


def s_cone(radius1: float, radius2: float, length: float,
           segments: int = 20, axis: str = "z") -> Shape:
    m = Shape()
    hz = length / 2
    bottom, top = [], []
    for i in range(segments):
        a = TAU * i / segments
        bottom.append(m.v(math.cos(a) * radius1, math.sin(a) * radius1, -hz))
        top.append(m.v(math.cos(a) * radius2, math.sin(a) * radius2, hz))
    for i in range(segments):
        j = (i + 1) % segments
        m.quad(bottom[i], bottom[j], top[j], top[i])
    if radius1 > 0:
        c = m.v(0, 0, -hz)
        for i in range(segments):
            m.tri(c, bottom[(i + 1) % segments], bottom[i])
    if radius2 > 0:
        c = m.v(0, 0, hz)
        for i in range(segments):
            m.tri(c, top[i], top[(i + 1) % segments])
    return apply_axis(m, axis)


def s_cylinder(radius: float, length: float, segments: int = 20, axis: str = "z") -> Shape:
    return s_cone(radius, radius, length, segments, axis)


def s_disc(radius: float, thickness: float, segments: int = 24, axis: str = "z") -> Shape:
    return s_cylinder(radius, thickness, segments, axis)


def s_hex_bolt(acrossFlats: float, axis: str = "z") -> Shape:
    head_h = acrossFlats * 0.65
    shank_r = acrossFlats * 0.45
    shank_l = acrossFlats * 1.5
    m = Shape()
    head = s_cone(acrossFlats / math.sqrt(3), acrossFlats / math.sqrt(3), head_h, 6)
    m.merge(head, (0, 0, shank_l / 2 + head_h / 2))
    m.merge(s_cone(shank_r, shank_r, shank_l, 10))
    return apply_axis(m, axis)


def s_arched_shell(span: float, archHeight: float, extrude: float,
                   spanAxis: str = "x", archAxis: str = "z", extrudeAxis: str = "y",
                   segments: int = 12, thickness: float | None = None) -> Shape:
    wall = thickness if thickness is not None else min(0.004, max(archHeight * 0.18, 0.0015))
    si, ai, ei = AXIS_INDEX[spanAxis], AXIS_INDEX[archAxis], AXIS_INDEX[extrudeAxis]
    if len({si, ai, ei}) != 3:
        raise ValueError("archedShell axes must differ")
    m = Shape()

    def put(s: float, a: float, e: float) -> int:
        p = [0.0, 0.0, 0.0]
        p[si], p[ai], p[ei] = s, a, e
        return m.v(p[0], p[1], p[2])

    he = extrude / 2

    def profile(t: float, depth: float) -> tuple[float, float]:
        usable = span - 2 * depth
        return (-usable / 2 + usable * t, math.sin(math.pi * t) * (archHeight - depth))

    outer, inner = [], []
    for i in range(segments + 1):
        t = i / segments
        so, ao = profile(t, 0.0)
        si2, ai2 = profile(t, wall)
        outer.append((put(so, ao, -he), put(so, ao, he)))
        inner.append((put(si2, ai2, -he), put(si2, ai2, he)))
    for i in range(segments):
        m.quad(outer[i][0], outer[i][1], outer[i + 1][1], outer[i + 1][0])
        m.quad(inner[i + 1][0], inner[i + 1][1], inner[i][1], inner[i][0])
        m.quad(outer[i][0], outer[i + 1][0], inner[i + 1][0], inner[i][0])
        m.quad(inner[i][1], inner[i + 1][1], outer[i + 1][1], outer[i][1])
    m.quad(outer[0][0], inner[0][0], inner[0][1], outer[0][1])
    m.quad(outer[segments][1], inner[segments][1], inner[segments][0], outer[segments][0])
    return m


def s_curved_tube(tubeRadius: float, bendRadius: float, arcDegrees: float,
                  plane: str = "xy", segments: int = 14, tubeSegments: int = 10) -> Shape:
    ui, wi = AXIS_INDEX[plane[0]], AXIS_INDEX[plane[1]]
    ni = 3 - ui - wi
    arc = math.radians(arcDegrees)
    m = Shape()
    rings = []
    for i in range(segments + 1):
        t = -arc / 2 + arc * i / segments
        cu = math.cos(t) * bendRadius
        cw = math.sin(t) * bendRadius
        ring = []
        for j in range(tubeSegments):
            a = TAU * j / tubeSegments
            p = [0.0, 0.0, 0.0]
            p[ui] = cu + math.cos(t) * math.cos(a) * tubeRadius
            p[wi] = cw + math.sin(t) * math.cos(a) * tubeRadius
            p[ni] = math.sin(a) * tubeRadius
            ring.append(m.v(p[0], p[1], p[2]))
        rings.append(ring)
    for i in range(segments):
        for j in range(tubeSegments):
            k = (j + 1) % tubeSegments
            m.quad(rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j])
    for ring, flip in ((rings[0], True), (rings[segments], False)):
        cx = sum(m.verts[i][0] for i in ring) / len(ring)
        cy = sum(m.verts[i][1] for i in ring) / len(ring)
        cz = sum(m.verts[i][2] for i in ring) / len(ring)
        c = m.v(cx, cy, cz)
        for j in range(len(ring)):
            k = (j + 1) % len(ring)
            if flip:
                m.tri(c, ring[k], ring[j])
            else:
                m.tri(c, ring[j], ring[k])
    mid = [0.0, 0.0, 0.0]
    mid[ui] = bendRadius * math.cos(arc / 2)
    return m.translate(-mid[0], -mid[1], -mid[2])


def s_grooved_pulley(radius: float, width: float, grooves: int | None = None,
                     ribPitch: float = 0.0075, segments: int = 24, axis: str = "z") -> Shape:
    if grooves is None:
        grooves = max(2, round(width / ribPitch))
    m = Shape()
    m.merge(s_cone(radius, radius, width, segments))
    spacing = width / (grooves + 1)
    rib_depth = radius * 0.06
    for g in range(grooves):
        z = -width / 2 + spacing * (g + 1)
        m.merge(s_cone(radius + rib_depth, radius + rib_depth, spacing * 0.3, segments), (0, 0, z))
    return apply_axis(m, axis)


def s_toothed_pulley(pitchRadius: float, width: float, teeth: int | None = None,
                     toothPitch: float = 0.0095, hubRadius: float | None = None,
                     segments: int = 28, axis: str = "z") -> Shape:
    # Tooth count follows a stated illustrative pitch; it is a tessellation
    # choice, not established part data.
    if teeth is None:
        teeth = max(10, round(TAU * pitchRadius / toothPitch))
    m = Shape()
    m.merge(s_cone(pitchRadius * 0.85, pitchRadius * 0.85, width, segments))
    tooth_radial = pitchRadius * 0.16
    tooth_width = (TAU * pitchRadius / teeth) * 0.45
    for i in range(teeth):
        angle = TAU * i / teeth
        t = s_box(tooth_radial, tooth_width, width * 0.9)
        for p in t.verts:
            x, y = p[0], p[1]
            p[0] = x * math.cos(angle) - y * math.sin(angle)
            p[1] = x * math.sin(angle) + y * math.cos(angle)
        m.merge(t, (math.cos(angle) * pitchRadius, math.sin(angle) * pitchRadius, 0))
    if hubRadius:
        m.merge(s_cone(hubRadius, hubRadius, width * 1.2, 16))
    return apply_axis(m, axis)


def s_idler_pulley(radius: float, width: float, segments: int = 24, axis: str = "z") -> Shape:
    m = Shape()
    m.merge(s_cone(radius, radius, width, segments))
    m.merge(s_cone(radius * 0.3, radius * 0.3, width * 1.25, 12))
    return apply_axis(m, axis)


def convex_hull(rows: list[list]) -> list[list]:
    if len(rows) < 3:
        return list(rows)
    pts = sorted(rows, key=lambda r: (r[0], r[1]))

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower: list[list] = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper: list[list] = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    lower.pop()
    upper.pop()
    return lower + upper


def wrapped_pulleys(pulleys: list[list], samples: int = 24) -> list[list]:
    if len(pulleys) < 3:
        return list(pulleys)
    points: list[list] = []
    for index, pulley in enumerate(pulleys):
        cu, cw, r = pulley[0], pulley[1], pulley[2]
        for i in range(samples):
            a = TAU * i / samples
            points.append([cu + math.cos(a) * r, cw + math.sin(a) * r, index])
    order: list[int] = []
    for point in convex_hull(points):
        if point[2] not in order:
            order.append(point[2])
    return [pulleys[i] for i in order]


def s_belt_path(pulleys: list[list], width: float, thickness: float,
                plane: str = "xy", segmentsPerArc: int = 10) -> tuple[Shape, list]:
    ui, wi = AXIS_INDEX[plane[0]], AXIS_INDEX[plane[1]]
    ni = 3 - ui - wi
    wrapped = wrapped_pulleys(pulleys)
    skipped = [p[3] for p in pulleys if p not in wrapped]
    pulleys = wrapped
    points: list[tuple[float, float]] = []
    n = len(pulleys)
    for idx in range(n):
        cu, cw, r = pulleys[idx][0], pulleys[idx][1], pulleys[idx][2]
        pu, pw = pulleys[(idx - 1) % n][0], pulleys[(idx - 1) % n][1]
        nu, nw = pulleys[(idx + 1) % n][0], pulleys[(idx + 1) % n][1]
        a_start = math.atan2(pw - cw, pu - cu)
        a_end = math.atan2(nw - cw, nu - cu)
        if a_end < a_start:
            a_end += TAU
        for s in range(segmentsPerArc + 1):
            t = a_start + (a_end - a_start) * s / segmentsPerArc
            points.append((cu + math.cos(t) * r, cw + math.sin(t) * r))

    m = Shape()
    half_w = width / 2
    half_t = thickness / 2
    count = len(points)
    sections = []
    for i in range(count):
        pu, pw = points[i]
        au, aw = points[(i - 1) % count]
        bu, bw = points[(i + 1) % count]
        tu, tw = bu - au, bw - aw
        length = math.hypot(tu, tw) or 1.0
        tu, tw = tu / length, tw / length
        nu, nw = tw, -tu

        def corner(radial: float, side: float) -> int:
            p = [0.0, 0.0, 0.0]
            p[ui] = pu + nu * radial
            p[wi] = pw + nw * radial
            p[ni] = side
            return m.v(p[0], p[1], p[2])

        sections.append((
            corner(half_t, -half_w), corner(half_t, half_w),
            corner(-half_t, half_w), corner(-half_t, -half_w),
        ))
    for i in range(count):
        a = sections[i]
        b = sections[(i + 1) % count]
        m.quad(a[0], a[1], b[1], b[0])
        m.quad(a[2], a[3], b[3], b[2])
        m.quad(a[1], a[2], b[2], b[1])
        m.quad(a[3], a[0], b[0], b[3])
    return m, skipped


SHAPES = {
    "box": lambda p: s_box(p["x"], p["y"], p["z"]),
    "cone": lambda p: s_cone(p["radius1"], p["radius2"], p["length"],
                             int(p.get("segments", 20)), p.get("axis", "z")),
    "cylinder": lambda p: s_cylinder(p["radius"], p["length"],
                                     int(p.get("segments", 20)), p.get("axis", "z")),
    "disc": lambda p: s_disc(p["radius"], p["thickness"],
                             int(p.get("segments", 24)), p.get("axis", "z")),
    "hexBolt": lambda p: s_hex_bolt(p["acrossFlats"], p.get("axis", "z")),
    "archedShell": lambda p: s_arched_shell(
        p["span"], p["archHeight"], p["extrude"],
        p.get("spanAxis", "x"), p.get("archAxis", "z"), p.get("extrudeAxis", "y"),
        int(p.get("segments", 12)), p.get("thickness"),
    ),
    "curvedTube": lambda p: s_curved_tube(
        p["tubeRadius"], p["bendRadius"], p["arcDegrees"], p.get("plane", "xy"),
        int(p.get("segments", 14)), int(p.get("tubeSegments", 10)),
    ),
    "groovedPulley": lambda p: s_grooved_pulley(
        p["radius"], p["width"], p.get("grooves"), p.get("ribPitch", 0.0075),
        int(p.get("segments", 24)), p.get("axis", "z"),
    ),
    "toothedPulley": lambda p: s_toothed_pulley(
        p["pitchRadius"], p["width"], p.get("teeth"), p.get("toothPitch", 0.0095),
        p.get("hubRadius"), int(p.get("segments", 28)), p.get("axis", "z"),
    ),
    "idlerPulley": lambda p: s_idler_pulley(
        p["radius"], p["width"], int(p.get("segments", 24)), p.get("axis", "z"),
    ),
}


# ---------------------------------------------------------------------------
# Recipe parameter resolution (mirrors lib/assembly.mjs)
# ---------------------------------------------------------------------------

def dimension_value(component: dict, key: str):
    for item in component.get("dimensions", {}).get("items", []):
        if item["key"] == key:
            return item["value"]
    return None


def resolve_param(spec: Any, component: dict, axis_index: int | None = None):
    if isinstance(spec, (int, float, str)) or spec is None:
        return spec
    if not isinstance(spec, dict):
        raise ValueError(f"Bad parameter: {spec!r}")
    if spec.get("quantity"):
        return component["quantity"]["value"] * spec.get("scale", 1) + spec.get("plus", 0)
    if "abs" in spec:
        value = dimension_value(component, spec["abs"])
        if value is None:
            value = spec.get("default")
        if value is None:
            raise ValueError(f'{component["id"]}: no dimension "{spec["abs"]}" and no default')
        if axis_index is None:
            raise ValueError(f'{component["id"]}: "abs" is only valid in an offset slot')
        return value - component["placement"]["position"][axis_index]
    if "dim" in spec:
        raw = dimension_value(component, spec["dim"])
        if raw is None:
            raw = spec.get("default")
        if raw is None:
            raise ValueError(f'{component["id"]}: no dimension "{spec["dim"]}" and no default')
        return raw * spec.get("scale", 1) + spec.get("plus", 0)
    raise ValueError(f'{component["id"]}: unrecognised parameter {spec!r}')


def resolve_offset(spec, component) -> list[float]:
    if not spec:
        return [0.0, 0.0, 0.0]
    return [resolve_param(value, component, i) for i, value in enumerate(spec)]


def resolve_params(params, component) -> dict:
    return {k: resolve_param(v, component) for k, v in (params or {}).items()}


def resolve_pulleys(part, component, by_id) -> list[list]:
    plane = (part.get("params") or {}).get("plane", "xy")
    ui, wi = AXIS_INDEX[plane[0]], AXIS_INDEX[plane[1]]
    origin = component["placement"]["position"]
    rows = []
    for entry in part["pulleys"]:
        other = by_id.get(entry["component"])
        if other is None:
            raise ValueError(f'{component["id"]}: unknown pulley component "{entry["component"]}"')
        radius = dimension_value(other, entry["radiusDim"])
        if radius is None:
            raise ValueError(
                f'{component["id"]}: pulley "{entry["component"]}" has no dimension "{entry["radiusDim"]}"'
            )
        rows.append([
            other["placement"]["position"][ui] - origin[ui],
            other["placement"]["position"][wi] - origin[wi],
            radius * entry.get("radiusScale", 1),
            entry["component"],
        ])
    return rows


def instance_offsets(recipe: dict, component: dict) -> list[list[float]]:
    mesh_ids = component["asset"]["meshIds"]
    if "meshes" in recipe:
        if len(recipe["meshes"]) != len(mesh_ids):
            raise ValueError(f'{component["id"]}: recipe mesh count does not match mesh ids')
        return [resolve_offset(m.get("offset"), component) for m in recipe["meshes"]]
    instances = recipe.get("instances")
    if not instances:
        if len(mesh_ids) != 1:
            raise ValueError(f'{component["id"]}: multiple mesh ids need "instances" or "meshes"')
        return [[0.0, 0.0, 0.0]]
    count = len(mesh_ids)
    mode = instances["mode"]
    if mode == "mirror-x":
        if count != 2:
            raise ValueError(f'{component["id"]}: mirror-x needs exactly 2 mesh ids')
        o = resolve_param(instances["offset"], component)
        return [[o, 0.0, 0.0], [-o, 0.0, 0.0]]
    if mode == "bolt-circle":
        radius = resolve_param(instances["radius"], component)
        return [
            [math.cos(TAU * i / count) * radius, math.sin(TAU * i / count) * radius, 0.0]
            for i in range(count)
        ]
    if mode == "linear-y":
        spacing = resolve_param(instances["spacing"], component)
        return [[0.0, (i - (count - 1) / 2) * spacing, 0.0] for i in range(count)]
    raise ValueError(f'{component["id"]}: unknown instances mode "{mode}"')


# ---------------------------------------------------------------------------
# Blender objects and materials
# ---------------------------------------------------------------------------

_MATERIALS: dict[str, bpy.types.Material] = {}


def get_material(name: str, spec: dict) -> bpy.types.Material:
    if name in _MATERIALS:
        return _MATERIALS[name]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = mat.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
    r, g, b = spec["baseColor"]
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Metallic"].default_value = spec["metallic"]
    bsdf.inputs["Roughness"].default_value = spec["roughness"]
    _MATERIALS[name] = mat
    return mat


def make_object(name: str, parts: list[tuple[Shape, str]], recipes: dict,
                translation: list[float], component_id: str, revision: int):
    """One Blender object per selectable mesh id, one material slot per part."""
    bm = bmesh.new()
    mesh = bpy.data.meshes.new(name)
    slot_for_face: list[int] = []
    slots: list[str] = []
    for shape, material_name in parts:
        if material_name not in slots:
            slots.append(material_name)
        slot = slots.index(material_name)
        verts = [bm.verts.new(tuple(p)) for p in shape.verts]
        for face in shape.faces:
            try:
                bm.faces.new([verts[i] for i in face])
                slot_for_face.append(slot)
            except ValueError:
                # Duplicate face from merged primitives; skip it.
                pass
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    for material_name in slots:
        mesh.materials.append(get_material(material_name, recipes["materials"][material_name]))
    for index, polygon in enumerate(mesh.polygons):
        if index < len(slot_for_face):
            polygon.material_index = slot_for_face[index]
    obj.location = Vector(translation)
    obj["componentId"] = component_id
    obj["meshId"] = name
    obj["modelRevision"] = revision
    bpy.context.collection.objects.link(obj)
    return obj


def build_part_shapes(parts: list[dict], component: dict, by_id: dict,
                      notes: list[str]) -> list[tuple[Shape, str]]:
    built: list[tuple[Shape, str]] = []
    for part in parts:
        params = resolve_params(part.get("params"), component)
        base_offset = resolve_offset(part.get("offset"), component)
        placements = []
        if "repeat" in part:
            axis_index = AXIS_INDEX[part["repeat"]["axis"]]
            spacing = resolve_param(part["repeat"]["spacing"], component)
            count = part["repeat"]["count"]
            for i in range(count):
                offset = list(base_offset)
                offset[axis_index] += (i - (count - 1) / 2) * spacing
                placements.append(offset)
        else:
            placements.append(base_offset)
        for offset in placements:
            if part["shape"] == "beltPath":
                shape, skipped = s_belt_path(
                    resolve_pulleys(part, component, by_id),
                    params["width"], params["thickness"],
                    params.get("plane", "xy"), int(params.get("segmentsPerArc", 10)),
                )
                if skipped:
                    notes.append(
                        f'{component["id"]}: belt drawn as the outer tangent loop; '
                        f'not in contact with {", ".join(skipped)}.'
                    )
            else:
                factory = SHAPES.get(part["shape"])
                if factory is None:
                    raise ValueError(f'{component["id"]}: unknown shape "{part["shape"]}"')
                shape = factory(params)
            built.append((Shape().merge(shape, offset), part["material"]))
    return built


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    repo_root, output_glb = _cli_args()
    recipes = json.loads((Path(__file__).parent / "recipes.json").read_text(encoding="utf-8"))
    engine_variant_id = recipes["engineVariantId"]
    inventory_path = repo_root / "content" / "components" / f"{engine_variant_id}.json"
    if not inventory_path.exists():
        raise FileNotFoundError(f"Inventory not found: {inventory_path}")
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    if inventory["engineVariantId"] != engine_variant_id:
        raise SystemExit("recipes.json and the inventory target different engine variants")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0  # 1 Blender unit = 1 metre

    collection = bpy.data.collections.new("TimingAssembly")
    scene.collection.children.link(collection)
    bpy.context.view_layer.active_layer_collection = (
        bpy.context.view_layer.layer_collection.children["TimingAssembly"]
    )

    by_id = {c["id"]: c for c in inventory["components"]}
    notes: list[str] = []
    missing: list[str] = []
    component_count = 0
    mesh_count = 0

    for component in inventory["components"]:
        recipe = recipes["components"].get(component["id"])
        if recipe is None:
            missing.append(component["id"])
            continue
        offsets = instance_offsets(recipe, component)
        mesh_ids = component["asset"]["meshIds"]
        for index, mesh_id in enumerate(mesh_ids):
            per_mesh = recipe["meshes"][index]["parts"] if "meshes" in recipe else recipe["parts"]
            parts = build_part_shapes(per_mesh, component, by_id, notes)
            for shape, _ in parts:
                shape.translate(*offsets[index])
            make_object(
                mesh_id, parts, recipes,
                component["placement"]["position"], component["id"], recipes["revision"],
            )
            mesh_count += 1
        component_count += 1
        print(f'[OK]   {component["id"]}: {len(mesh_ids)} mesh(es)')

    if missing:
        raise SystemExit(f"No geometry recipe for: {', '.join(missing)}")

    total_tris = 0
    for obj in bpy.data.objects:
        if obj.type == "MESH":
            obj.data.calc_loop_triangles()
            total_tris += len(obj.data.loop_triangles)

    print(f"\nComponents: {component_count}  meshes: {mesh_count}  triangles: {total_tris}")
    for note in notes:
        print(f"  note: {note}")

    output_glb.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format="GLB",
        use_selection=False,
        export_extras=True,
        # The scene is authored directly in the glTF frame (Y up, +Z forward),
        # so the exporter must not rotate it again.
        export_yup=False,
    )
    print(f"Exported: {output_glb}")

    blend_path = output_glb.with_suffix(".blend")
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    print(f"Authoring file: {blend_path}")

    glb_bytes = output_glb.read_bytes()
    manifest = {
        "modelRevision": recipes["revision"],
        "engineVariantId": engine_variant_id,
        "componentCount": component_count,
        "meshObjectCount": mesh_count,
        "triangleCount": total_tris,
        "fileSizeBytes": len(glb_bytes),
        "sha256": hashlib.sha256(glb_bytes).hexdigest(),
        "exportedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "blenderVersion": ".".join(str(v) for v in bpy.app.version),
        "sourceInventory": str(inventory_path),
        "sourceRecipes": "modeling/wrenchwise/recipes.json",
        "evidence": recipes["evidence"],
        "buildNotes": notes,
        "note": (
            "Authoring export. The browser assets served by the application are built by "
            "modeling/wrenchwise/build_assembly.mjs, which is the path validated in CI."
        ),
    }
    manifest_path = output_glb.with_suffix(".manifest.json")
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
