#!/usr/bin/env python3
"""
build_timing_assembly.py – Blender 4.5 headless script
=====================================================

Reads the 2JZ-GE VVT-i component inventory JSON and creates low-poly
procedural geometry for every component, then exports a single GLB.

Usage
-----
    blender --background --factory-startup --python build_timing_assembly.py \
        -- /path/to/repo /path/to/output.glb

The script expects:
  • argv[1] = repository root (containing content/components/…)
  • argv[2] = output GLB path

The first CLI argument is treated as the repo root; the inventory is loaded
from  <repo>/content/components/2jz-ge-vvti-jzs160.json .
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import sys
import datetime
from pathlib import Path
from typing import Any

import bpy
import bmesh
from mathutils import Vector, Matrix

# ---------------------------------------------------------------------------
# CLI parsing
# ---------------------------------------------------------------------------

def _cli_args() -> tuple[Path, Path]:
    """Return (repo_root, output_glb) from the ``--`` separated CLI args."""
    argv = sys.argv
    if "--" in argv:
        custom = argv[argv.index("--") + 1:]
    else:
        custom = []
    if len(custom) < 2:
        raise SystemExit(
            "Usage: blender --background --factory-startup --python "
            "build_timing_assembly.py -- <repo_root> <output.glb>"
        )
    return Path(custom[0]), Path(custom[1])


# ---------------------------------------------------------------------------
# Material helpers
# ---------------------------------------------------------------------------

_MAT_CACHE: dict[str, bpy.types.Material] = {}


def _get_or_create_mat(
    name: str,
    base_color: tuple[float, float, float, float],
    metallic: float = 0.0,
    roughness: float = 0.5,
) -> bpy.types.Material:
    """Return a cached PBR material (MeshStandardMaterial-compatible)."""
    if name in _MAT_CACHE:
        return _MAT_CACHE[name]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = mat.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = base_color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    _MAT_CACHE[name] = mat
    return mat


# Pre-defined material catalogue
def mat_cast_aluminum():
    return _get_or_create_mat("CastAluminum", (0.72, 0.72, 0.73, 1.0), 1.0, 0.5)

def mat_cast_iron():
    return _get_or_create_mat("CastIron", (0.45, 0.45, 0.47, 1.0), 1.0, 0.55)

def mat_dark_gray_metal():
    return _get_or_create_mat("DarkGrayMetal", (0.30, 0.30, 0.32, 1.0), 1.0, 0.5)

def mat_rubber_black():
    return _get_or_create_mat("RubberBlack", (0.05, 0.05, 0.05, 1.0), 0.0, 0.8)

def mat_rubber_dark():
    return _get_or_create_mat("RubberDark", (0.10, 0.10, 0.10, 1.0), 0.0, 0.7)

def mat_dark_steel():
    return _get_or_create_mat("DarkSteel", (0.22, 0.22, 0.24, 1.0), 1.0, 0.3)

def mat_pulley_gray():
    return _get_or_create_mat("PulleyGray", (0.50, 0.50, 0.52, 1.0), 1.0, 0.35)

def mat_radiator():
    return _get_or_create_mat("RadiatorCopper", (0.18, 0.12, 0.08, 1.0), 0.6, 0.45)

def mat_dark_plastic():
    return _get_or_create_mat("DarkPlastic", (0.12, 0.12, 0.14, 1.0), 0.0, 0.6)

def mat_bracket_steel():
    return _get_or_create_mat("BracketSteel", (0.40, 0.40, 0.42, 1.0), 1.0, 0.4)


# ---------------------------------------------------------------------------
# Geometry primitives
# ---------------------------------------------------------------------------

def _assign_mat(obj: bpy.types.Object, mat: bpy.types.Material):
    obj.data.materials.append(mat)


def _link_obj(obj: bpy.types.Object):
    bpy.context.collection.objects.link(obj)


def make_box(name: str, sx: float, sy: float, sz: float,
             pos: tuple, mat: bpy.types.Material) -> bpy.types.Object:
    """Create an axis-aligned box centred at *pos*."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz),
                    verts=bm.verts)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat)
    _link_obj(obj)
    return obj


def make_cylinder(name: str, radius: float, depth: float,
                  pos: tuple, mat: bpy.types.Material,
                  segments: int = 16, axis: str = "z") -> bpy.types.Object:
    """Create a cylinder centred at *pos*.  *axis* controls orientation."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, segments=segments, radius1=radius,
                          radius2=radius, depth=depth, cap_ends=True)
    if axis == "x":
        bmesh.ops.rotate(bm, verts=bm.verts,
                         matrix=Matrix.Rotation(math.radians(90), 3, 'Y'))
    elif axis == "y":
        bmesh.ops.rotate(bm, verts=bm.verts,
                         matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat)
    _link_obj(obj)
    return obj


def make_cone(name: str, r1: float, r2: float, depth: float,
              pos: tuple, mat: bpy.types.Material,
              segments: int = 16, axis: str = "y") -> bpy.types.Object:
    """Truncated cone for boot shapes."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, segments=segments, radius1=r1,
                          radius2=r2, depth=depth, cap_ends=True)
    if axis == "x":
        bmesh.ops.rotate(bm, verts=bm.verts,
                         matrix=Matrix.Rotation(math.radians(90), 3, 'Y'))
    elif axis == "y":
        bmesh.ops.rotate(bm, verts=bm.verts,
                         matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat)
    _link_obj(obj)
    return obj


def make_disc(name: str, radius: float, thickness: float,
              pos: tuple, mat: bpy.types.Material,
              segments: int = 24) -> bpy.types.Object:
    """Thin disc (= very short cylinder)."""
    return make_cylinder(name, radius, thickness, pos, mat, segments)


def make_toothed_cylinder(name: str, pitch_r: float, width: float,
                          pos: tuple, mat: bpy.types.Material,
                          n_teeth: int = 24,
                          tooth_height: float | None = None) -> bpy.types.Object:
    """Simplified toothed pulley: inner cylinder + tooth bumps on outer rim."""
    bm = bmesh.new()
    # Inner cylinder
    bmesh.ops.create_cone(bm, segments=32, radius1=pitch_r * 0.85,
                          radius2=pitch_r * 0.85, depth=width, cap_ends=True)
    # Tooth bumps as small cubes around the rim
    th = tooth_height or pitch_r * 0.08
    tw = 2 * math.pi * pitch_r / n_teeth * 0.4  # tooth angular width
    for i in range(n_teeth):
        angle = 2 * math.pi * i / n_teeth
        cx = math.cos(angle) * pitch_r
        cy = math.sin(angle) * pitch_r
        ret = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, verts=ret["verts"],
                        vec=(th, tw, width * 0.9))
        bmesh.ops.translate(bm, verts=ret["verts"],
                            vec=(cx, cy, 0))
        bmesh.ops.rotate(bm, verts=ret["verts"],
                         cent=(cx, cy, 0),
                         matrix=Matrix.Rotation(angle, 3, 'Z'))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat)
    _link_obj(obj)
    return obj


def make_hex_bolt(name: str, af: float, pos: tuple,
                  mat: bpy.types.Material) -> bpy.types.Object:
    """Simplified hex-head bolt: hexagonal prism head + cylindrical shank."""
    bm = bmesh.new()
    head_h = af * 0.65
    shank_r = af * 0.45
    shank_l = af * 1.5
    # Head – hexagonal prism
    bmesh.ops.create_cone(bm, segments=6, radius1=af / math.sqrt(3),
                          radius2=af / math.sqrt(3),
                          depth=head_h, cap_ends=True)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, shank_l / 2 + head_h / 2))
    # Shank
    ret = bmesh.ops.create_cone(bm, segments=10, radius1=shank_r,
                                radius2=shank_r, depth=shank_l, cap_ends=True)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat)
    _link_obj(obj)
    return obj


def make_half_shell(name: str, width: float, height: float, depth: float,
                    pos: tuple, mat: bpy.types.Material) -> bpy.types.Object:
    """Half-cylinder shell (simplified cover shape)."""
    bm = bmesh.new()
    segs = 12
    # Build a half-pipe: series of quads
    for i in range(segs):
        a0 = math.pi * i / segs
        a1 = math.pi * (i + 1) / segs
        r = height / 2
        y0, z0 = math.sin(a0) * r, -math.cos(a0) * r
        y1, z1 = math.sin(a1) * r, -math.cos(a1) * r
        hw = width / 2
        v1 = bm.verts.new((-hw, y0, z0))
        v2 = bm.verts.new(( hw, y0, z0))
        v3 = bm.verts.new(( hw, y1, z1))
        v4 = bm.verts.new((-hw, y1, z1))
        bm.faces.new((v1, v2, v3, v4))
    # Add thickness by extruding inward (simplified: just scale inner shell)
    inner_r = r - depth
    for i in range(segs):
        a0 = math.pi * i / segs
        a1 = math.pi * (i + 1) / segs
        y0, z0 = math.sin(a0) * inner_r, -math.cos(a0) * inner_r
        y1, z1 = math.sin(a1) * inner_r, -math.cos(a1) * inner_r
        hw = width / 2
        v1 = bm.verts.new((-hw, y0, z0))
        v2 = bm.verts.new(( hw, y0, z0))
        v3 = bm.verts.new(( hw, y1, z1))
        v4 = bm.verts.new((-hw, y1, z1))
        bm.faces.new((v4, v3, v2, v1))  # reversed normals for inner
    bm.normal_update()
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat)
    _link_obj(obj)
    return obj


def make_curved_tube(name: str, tube_r: float, bend_r: float,
                     arc_deg: float, pos: tuple,
                     mat: bpy.types.Material,
                     segments: int = 12,
                     tube_segments: int = 8) -> bpy.types.Object:
    """Create a curved tube (torus section) for hoses."""
    bm = bmesh.new()
    arc_rad = math.radians(arc_deg)
    for i in range(segments):
        t0 = arc_rad * i / segments
        t1 = arc_rad * (i + 1) / segments
        for j in range(tube_segments):
            a0 = 2 * math.pi * j / tube_segments
            a1 = 2 * math.pi * ((j + 1) % tube_segments) / tube_segments
            def _pt(t, a):
                cx = math.cos(t) * bend_r
                cy = math.sin(t) * bend_r
                nx = math.cos(t)
                ny = math.sin(t)
                px = cx + nx * math.cos(a) * tube_r
                py = cy + ny * math.cos(a) * tube_r
                pz = math.sin(a) * tube_r
                return (px, py, pz)
            v1 = bm.verts.new(_pt(t0, a0))
            v2 = bm.verts.new(_pt(t0, a1))
            v3 = bm.verts.new(_pt(t1, a1))
            v4 = bm.verts.new(_pt(t1, a0))
            bm.faces.new((v1, v2, v3, v4))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.normal_update()
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat)
    _link_obj(obj)
    return obj


def make_grooved_pulley(name: str, radius: float, width: float,
                        pos: tuple, mat: bpy.types.Material,
                        n_grooves: int = 5) -> bpy.types.Object:
    """Multi-groove pulley (concentric rings)."""
    bm = bmesh.new()
    # Main body
    bmesh.ops.create_cone(bm, segments=24, radius1=radius,
                          radius2=radius, depth=width, cap_ends=True)
    # Grooves as thin tori around the rim
    groove_spacing = width / (n_grooves + 1)
    groove_depth = radius * 0.06
    for g in range(n_grooves):
        z_off = -width / 2 + groove_spacing * (g + 1)
        ret = bmesh.ops.create_cone(bm, segments=24,
                                    radius1=radius + groove_depth,
                                    radius2=radius + groove_depth,
                                    depth=groove_spacing * 0.3,
                                    cap_ends=True)
        bmesh.ops.translate(bm, verts=ret["verts"], vec=(0, 0, z_off))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat)
    _link_obj(obj)
    return obj


def make_belt_path(name: str, pulleys: list[tuple[float, float, float]],
                   belt_width: float, belt_thickness: float,
                   pos: tuple, mat: bpy.types.Material,
                   segments_per_arc: int = 12) -> bpy.types.Object:
    """Flat ribbon following the tangent hull around circular pulleys.

    *pulleys* is a list of (cx, cy, radius) for each pulley centre in the
    X-Y plane.  The belt is built in the X-Y plane then placed at *pos*.
    """
    # Build belt path points: arc on each pulley + tangent lines
    # Simple approach: sample points around each pulley in order, connect
    pts: list[tuple[float, float]] = []
    n = len(pulleys)
    for idx in range(n):
        cx, cy, r = pulleys[idx]
        nx_cx, nx_cy, nx_r = pulleys[(idx + 1) % n]
        # Determine angular range: from direction to previous to direction to next
        prev_cx, prev_cy, _ = pulleys[(idx - 1) % n]
        a_start = math.atan2(prev_cy - cy, prev_cx - cx)
        a_end = math.atan2(nx_cy - cy, nx_cx - cx)
        # Wrap for outer tangent (belt wraps outside)
        if a_end < a_start:
            a_end += 2 * math.pi
        for s in range(segments_per_arc + 1):
            t = a_start + (a_end - a_start) * s / segments_per_arc
            pts.append((cx + math.cos(t) * r, cy + math.sin(t) * r))

    # Build mesh strip
    bm = bmesh.new()
    hw = belt_width / 2
    ht = belt_thickness / 2
    n_pts = len(pts)
    for i in range(n_pts):
        i_next = (i + 1) % n_pts
        x0, y0 = pts[i]
        x1, y1 = pts[i_next]
        v1 = bm.verts.new((x0, y0, -ht))
        v2 = bm.verts.new((x0, y0,  ht))
        v3 = bm.verts.new((x1, y1,  ht))
        v4 = bm.verts.new((x1, y1, -ht))
        bm.faces.new((v1, v2, v3, v4))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.normal_update()
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat)
    _link_obj(obj)
    return obj


# ---------------------------------------------------------------------------
# Dimension helper
# ---------------------------------------------------------------------------

def _dim(comp: dict, key: str, default: float = 0.0) -> float:
    """Extract a dimension value by key from the component dict."""
    for item in comp.get("dimensions", {}).get("items", []):
        if item["key"] == key:
            return item["value"]
    return default


# ---------------------------------------------------------------------------
# Per-component builder dispatch
# ---------------------------------------------------------------------------

def _set_extras(obj: bpy.types.Object, comp_id: str, mesh_id: str):
    """Set glTF extras on a Blender object."""
    obj["componentId"] = comp_id
    obj["meshId"] = mesh_id
    obj["modelRevision"] = 1


def build_cylinder_block(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    l = _dim(comp, "length", 0.6)
    w = _dim(comp, "width", 0.36)
    h = _dim(comp, "height", 0.395)
    mesh_id = comp["asset"]["meshIds"][0]
    obj = make_box(mesh_id, l, h, w, pos, mat_cast_aluminum())
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_oil_pan(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    l = _dim(comp, "length", 0.58)
    w = _dim(comp, "width", 0.30)
    h = _dim(comp, "height", 0.13)
    mesh_id = comp["asset"]["meshIds"][0]
    obj = make_box(mesh_id, l, h, w, pos, mat_dark_gray_metal())
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_cylinder_head(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    l = _dim(comp, "length", 0.6)
    w = _dim(comp, "width", 0.34)
    h = _dim(comp, "height", 0.135)
    mesh_id = comp["asset"]["meshIds"][0]
    # Main head block
    obj = make_box(mesh_id, l, h, w, pos, mat_cast_aluminum())
    _set_extras(obj, comp["id"], mesh_id)
    # Cam boss cylinders poking up at front face
    cam_y = _dim(comp, "camAxisY", 0.375)
    cam_spacing = _dim(comp, "camSpacing", 0.135)
    boss_r = 0.022
    boss_h = 0.04
    for side_offset in [-cam_spacing / 2, cam_spacing / 2]:
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, segments=12, radius1=boss_r,
                              radius2=boss_r, depth=boss_h, cap_ends=True)
        bmesh.ops.rotate(bm, verts=bm.verts,
                         matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
        m = bpy.data.meshes.new(f"{mesh_id}_boss")
        bm.to_mesh(m)
        bm.free()
        boss = bpy.data.objects.new(f"{mesh_id}_boss", m)
        boss.location = Vector((
            side_offset + pos[0],
            pos[1] + h / 2 + boss_h / 2,
            pos[2] + l / 2 - 0.03,
        ))
        _assign_mat(boss, mat_cast_aluminum())
        _link_obj(boss)
        # Parent boss to head
        boss.parent = obj
    return [obj]


def build_cylinder_head_covers(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    l = _dim(comp, "length", 0.56)
    w = _dim(comp, "width", 0.13)
    h = _dim(comp, "height", 0.06)
    offset_x = _dim(comp, "offsetX", 0.07)
    mesh_ids = comp["asset"]["meshIds"]
    objs = []
    for i, mid in enumerate(mesh_ids):
        x_off = offset_x if i == 0 else -offset_x
        shell_pos = (pos[0] + x_off, pos[1], pos[2])
        obj = make_half_shell(mid, l, h, w, shell_pos, mat_cast_aluminum())
        _set_extras(obj, comp["id"], mid)
        objs.append(obj)
    return objs


def build_manifold(comp: dict, side: float = 1.0) -> list[bpy.types.Object]:
    """Cylinder cluster (6 runners) + plenum."""
    pos = comp["placement"]["position"]
    l = _dim(comp, "length", 0.5)
    plenum_r = _dim(comp, "plenumRadius", 0.06)
    mesh_id = comp["asset"]["meshIds"][0]

    bm = bmesh.new()
    # Plenum – cylinder along Z
    bmesh.ops.create_cone(bm, segments=16, radius1=plenum_r,
                          radius2=plenum_r, depth=l, cap_ends=True)
    # 6 runners
    runner_r = plenum_r * 0.35
    runner_l = plenum_r * 2.5
    spacing = l / 7
    for i in range(6):
        z_off = -l / 2 + spacing * (i + 1)
        ret = bmesh.ops.create_cone(bm, segments=8, radius1=runner_r,
                                    radius2=runner_r, depth=runner_l,
                                    cap_ends=True)
        # Rotate runner to point outward (along X)
        bmesh.ops.rotate(bm, verts=ret["verts"],
                         matrix=Matrix.Rotation(math.radians(90), 3, 'Y'))
        bmesh.ops.translate(bm, verts=ret["verts"],
                            vec=(side * runner_l / 2, 0, z_off))
    mesh = bpy.data.meshes.new(mesh_id)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(mesh_id, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat_cast_aluminum())
    _link_obj(obj)
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_water_pump(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    r = _dim(comp, "radius", 0.045)
    d = _dim(comp, "depth", 0.05)
    mesh_id = comp["asset"]["meshIds"][0]

    bm = bmesh.new()
    # Body cylinder
    bmesh.ops.create_cone(bm, segments=16, radius1=r, radius2=r,
                          depth=d, cap_ends=True)
    # Flange disc
    ret = bmesh.ops.create_cone(bm, segments=16, radius1=r * 1.3,
                                radius2=r * 1.3, depth=d * 0.15,
                                cap_ends=True)
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(0, 0, -d / 2))
    mesh = bpy.data.meshes.new(mesh_id)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(mesh_id, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat_cast_aluminum())
    _link_obj(obj)
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_timing_belt(comp: dict) -> list[bpy.types.Object]:
    """Flat ribbon following a path around 3 pulleys."""
    pos = comp["placement"]["position"]
    belt_w = _dim(comp, "width", 0.026)
    belt_t = _dim(comp, "thickness", 0.004)
    mesh_id = comp["asset"]["meshIds"][0]

    # Pulley positions (relative to belt Z-plane):
    # Crank at bottom (0, 0), two cams at top
    crank = (0.0, 0.0, 0.032)
    cam_exh = (-0.0675, 0.375, 0.062)
    cam_int = (0.0675, 0.375, 0.062)
    # Use x,y from pulley positions
    pulleys = [
        (crank[0], crank[1], crank[2] - 0.002),     # crank R≈0.030
        (cam_int[0], cam_int[1], cam_int[2] - 0.002),  # cam intake R≈0.060
        (cam_exh[0], cam_exh[1], cam_exh[2] - 0.002),  # cam exhaust R≈0.060
    ]
    obj = make_belt_path(mesh_id, pulleys, belt_w, belt_t, pos, mat_rubber_black())
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_toothed_pulley(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    pr = _dim(comp, "pitchRadius", 0.06)
    w = _dim(comp, "width", 0.028)
    mesh_id = comp["asset"]["meshIds"][0]
    obj = make_toothed_cylinder(mesh_id, pr, w, pos, mat_pulley_gray())
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_disc_part(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    r = _dim(comp, "radius", 0.036)
    t = _dim(comp, "thickness", 0.002)
    mesh_id = comp["asset"]["meshIds"][0]
    obj = make_disc(mesh_id, r, t, pos, mat_pulley_gray())
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_vvti_controller(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    pr = _dim(comp, "pitchRadius", 0.06)
    w = _dim(comp, "width", 0.028)
    hub_r = _dim(comp, "hubRadius", 0.04)
    mesh_id = comp["asset"]["meshIds"][0]

    bm = bmesh.new()
    # Outer toothed ring
    n_teeth = 24
    bmesh.ops.create_cone(bm, segments=32, radius1=pr * 0.85,
                          radius2=pr * 0.85, depth=w, cap_ends=True)
    th = pr * 0.08
    tw = 2 * math.pi * pr / n_teeth * 0.4
    for i in range(n_teeth):
        angle = 2 * math.pi * i / n_teeth
        cx = math.cos(angle) * pr
        cy = math.sin(angle) * pr
        ret = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, verts=ret["verts"], vec=(th, tw, w * 0.9))
        bmesh.ops.translate(bm, verts=ret["verts"], vec=(cx, cy, 0))
        bmesh.ops.rotate(bm, verts=ret["verts"], cent=(cx, cy, 0),
                         matrix=Matrix.Rotation(angle, 3, 'Z'))
    # Hub cylinder
    ret = bmesh.ops.create_cone(bm, segments=16, radius1=hub_r,
                                radius2=hub_r, depth=w * 1.2, cap_ends=True)
    mesh = bpy.data.meshes.new(mesh_id)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(mesh_id, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat_pulley_gray())
    _link_obj(obj)
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_bolt_circle(comp: dict) -> list[bpy.types.Object]:
    """Fastener-set on a bolt circle (e.g. VVT-i factory bolts)."""
    pos = comp["placement"]["position"]
    bcr = _dim(comp, "boltCircleRadius", 0.024)
    qty = comp["quantity"]["value"]
    mesh_ids = comp["asset"]["meshIds"]
    af = 0.006  # small hex bolt
    objs = []
    for i, mid in enumerate(mesh_ids):
        angle = 2 * math.pi * i / qty
        bx = pos[0] + math.cos(angle) * bcr
        by = pos[1] + math.sin(angle) * bcr
        bz = pos[2]
        obj = make_hex_bolt(mid, af, (bx, by, bz), mat_dark_steel())
        _set_extras(obj, comp["id"], mid)
        objs.append(obj)
    return objs


def build_vvti_oil_hardware(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    vr = _dim(comp, "valveRadius", 0.012)
    vl = _dim(comp, "valveLength", 0.06)
    mesh_ids = comp["asset"]["meshIds"]
    objs = []
    # Valve (cylinder along X)
    mid = mesh_ids[0]
    obj = make_cylinder(mid, vr, vl, pos, mat_cast_aluminum(), axis="x")
    _set_extras(obj, comp["id"], mid)
    objs.append(obj)
    # Pipe (thin tube)
    if len(mesh_ids) > 1:
        mid2 = mesh_ids[1]
        pipe_pos = (pos[0], pos[1] + 0.02, pos[2])
        obj2 = make_cylinder(mid2, vr * 0.3, vl * 1.5, pipe_pos,
                             mat_dark_steel(), segments=8, axis="x")
        _set_extras(obj2, comp["id"], mid2)
        objs.append(obj2)
    return objs


def build_timing_belt_idler(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    r = _dim(comp, "radius", 0.031)
    w = _dim(comp, "width", 0.028)
    mesh_id = comp["asset"]["meshIds"][0]

    bm = bmesh.new()
    # Outer smooth cylinder
    bmesh.ops.create_cone(bm, segments=24, radius1=r, radius2=r,
                          depth=w, cap_ends=True)
    # Bearing center hole
    ret = bmesh.ops.create_cone(bm, segments=12, radius1=r * 0.3,
                                radius2=r * 0.3, depth=w * 1.05,
                                cap_ends=True)
    mesh = bpy.data.meshes.new(mesh_id)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(mesh_id, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat_pulley_gray())
    _link_obj(obj)
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_single_bolt(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    af = _dim(comp, "headAcrossFlats", 0.014)
    mesh_id = comp["asset"]["meshIds"][0]
    obj = make_hex_bolt(mesh_id, af, pos, mat_dark_steel())
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_tensioner(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    r = _dim(comp, "radius", 0.016)
    l = _dim(comp, "length", 0.09)
    mesh_id = comp["asset"]["meshIds"][0]
    axis = comp["placement"].get("axis", "y")

    bm = bmesh.new()
    # Main body cylinder
    bmesh.ops.create_cone(bm, segments=16, radius1=r, radius2=r,
                          depth=l, cap_ends=True)
    # Small pushrod cylinder on top
    pr_r = r * 0.5
    pr_l = l * 0.35
    ret = bmesh.ops.create_cone(bm, segments=10, radius1=pr_r, radius2=pr_r,
                                depth=pr_l, cap_ends=True)
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(0, 0, l / 2 + pr_l / 2))

    if axis == "y":
        bmesh.ops.rotate(bm, verts=bm.verts,
                         matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
    elif axis == "x":
        bmesh.ops.rotate(bm, verts=bm.verts,
                         matrix=Matrix.Rotation(math.radians(90), 3, 'Y'))

    mesh = bpy.data.meshes.new(mesh_id)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(mesh_id, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat_cast_iron())
    _link_obj(obj)
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_tensioner_boot(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    r = _dim(comp, "radius", 0.011)
    l = _dim(comp, "length", 0.016)
    mesh_id = comp["asset"]["meshIds"][0]
    axis = comp["placement"].get("axis", "y")
    obj = make_cone(mesh_id, r, r * 0.5, l, pos, mat_rubber_black(), axis=axis)
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_tensioner_bolts(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    spacing = _dim(comp, "spacing", 0.05)
    mesh_ids = comp["asset"]["meshIds"]
    af = 0.010
    objs = []
    for i, mid in enumerate(mesh_ids):
        y_off = (i - 0.5) * spacing
        bpos = (pos[0], pos[1] + y_off, pos[2])
        obj = make_hex_bolt(mid, af, bpos, mat_dark_steel())
        _set_extras(obj, comp["id"], mid)
        objs.append(obj)
    return objs


def build_rear_cover(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    w = _dim(comp, "width", 0.3)
    h = _dim(comp, "height", 0.22)
    t = _dim(comp, "thickness", 0.003)
    mesh_id = comp["asset"]["meshIds"][0]
    obj = make_box(mesh_id, w, h, t, pos, mat_dark_plastic())
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_timing_cover(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    w = _dim(comp, "width", 0.24)
    h = _dim(comp, "height", 0.24)
    d = _dim(comp, "depth", 0.04)
    mesh_id = comp["asset"]["meshIds"][0]
    obj = make_half_shell(mesh_id, w, h, d, pos, mat_dark_plastic())
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_crankshaft_pulley(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    r = _dim(comp, "radius", 0.085)
    w = _dim(comp, "width", 0.04)
    mesh_id = comp["asset"]["meshIds"][0]
    obj = make_grooved_pulley(mesh_id, r, w, pos, mat_pulley_gray())
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_accessory_belt(comp: dict) -> list[bpy.types.Object]:
    """Flat ribbon path around accessory pulleys."""
    pos = comp["placement"]["position"]
    belt_w = _dim(comp, "width", 0.022)
    belt_t = _dim(comp, "thickness", 0.005)
    mesh_id = comp["asset"]["meshIds"][0]

    # Approximate accessory pulley layout (x, y, r)
    pulleys = [
        (0.0, 0.0, 0.085),       # Crank pulley
        (0.0, 0.22, 0.06),       # Water pump pulley
        (0.18, 0.24, 0.055),     # PS pump
        (-0.19, 0.2, 0.03),      # Alternator
        (-0.17, -0.02, 0.06),    # AC compressor
        (0.12, 0.06, 0.03),      # Tensioner
    ]
    obj = make_belt_path(mesh_id, pulleys, belt_w, belt_t, pos, mat_rubber_black())
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_accessory_belt_tensioner(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    r = _dim(comp, "radius", 0.03)
    mesh_id = comp["asset"]["meshIds"][0]

    bm = bmesh.new()
    # Small arm (box)
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=bm.verts, vec=(0.06, 0.02, 0.015))
    # Smooth pulley at end
    ret = bmesh.ops.create_cone(bm, segments=16, radius1=r, radius2=r,
                                depth=0.015, cap_ends=True)
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(0.03, 0, 0))
    mesh = bpy.data.meshes.new(mesh_id)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(mesh_id, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat_pulley_gray())
    _link_obj(obj)
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_water_pump_pulley(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    r = _dim(comp, "radius", 0.06)
    w = _dim(comp, "width", 0.03)
    mesh_id = comp["asset"]["meshIds"][0]
    obj = make_grooved_pulley(mesh_id, r, w, pos, mat_pulley_gray(), n_grooves=4)
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_power_steering_pump(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    pr = _dim(comp, "pulleyRadius", 0.055)
    br = _dim(comp, "bodyRadius", 0.045)
    bl = _dim(comp, "bodyLength", 0.1)
    mesh_id = comp["asset"]["meshIds"][0]

    bm = bmesh.new()
    # Body cylinder (along X)
    bmesh.ops.create_cone(bm, segments=16, radius1=br, radius2=br,
                          depth=bl, cap_ends=True)
    bmesh.ops.rotate(bm, verts=bm.verts,
                     matrix=Matrix.Rotation(math.radians(90), 3, 'Y'))
    # Reservoir box on top
    ret = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(bl * 0.5, br * 0.6, br))
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(0, br + br * 0.3, 0))
    mesh = bpy.data.meshes.new(mesh_id)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(mesh_id, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat_cast_aluminum())
    _link_obj(obj)
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_ps_bracket(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    w = _dim(comp, "width", 0.12)
    h = _dim(comp, "height", 0.12)
    t = _dim(comp, "thickness", 0.008)
    mesh_id = comp["asset"]["meshIds"][0]

    bm = bmesh.new()
    # Vertical leg
    ret = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(t, w, h / 2))
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(0, 0, h / 4))
    # Horizontal leg
    ret = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=ret["verts"], vec=(w / 2, t, t))
    bmesh.ops.translate(bm, verts=ret["verts"], vec=(w / 4, 0, 0))
    mesh = bpy.data.meshes.new(mesh_id)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(mesh_id, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat_bracket_steel())
    _link_obj(obj)
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_cylindrical_accessory(comp: dict, with_pulley: bool = True) -> list[bpy.types.Object]:
    """Alternator / AC compressor: cylinder body + optional pulley disc."""
    pos = comp["placement"]["position"]
    p_r = _dim(comp, "pulleyRadius", 0.03)
    b_r = _dim(comp, "bodyRadius", 0.065)
    b_l = _dim(comp, "bodyLength", 0.12)
    mesh_id = comp["asset"]["meshIds"][0]

    bm = bmesh.new()
    # Body cylinder (along X)
    bmesh.ops.create_cone(bm, segments=16, radius1=b_r, radius2=b_r,
                          depth=b_l, cap_ends=True)
    bmesh.ops.rotate(bm, verts=bm.verts,
                     matrix=Matrix.Rotation(math.radians(90), 3, 'Y'))
    if with_pulley:
        # Pulley disc at front
        ret = bmesh.ops.create_cone(bm, segments=20, radius1=p_r * 1.1,
                                    radius2=p_r * 1.1, depth=0.01,
                                    cap_ends=True)
        bmesh.ops.translate(bm, verts=ret["verts"], vec=(-b_l / 2 - 0.005, 0, 0))
    mesh = bpy.data.meshes.new(mesh_id)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(mesh_id, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat_cast_aluminum())
    _link_obj(obj)
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_radiator(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    w = _dim(comp, "width", 0.68)
    h = _dim(comp, "height", 0.46)
    d = _dim(comp, "depth", 0.05)
    mesh_id = comp["asset"]["meshIds"][0]

    bm = bmesh.new()
    # Core (thin wide box)
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=bm.verts, vec=(w, h, d))
    # Side tanks
    tank_w = 0.04
    for side in [-1, 1]:
        ret = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, verts=ret["verts"], vec=(tank_w, h * 0.9, d * 1.3))
        bmesh.ops.translate(bm, verts=ret["verts"],
                            vec=(side * (w / 2 + tank_w / 2), 0, 0))
    mesh = bpy.data.meshes.new(mesh_id)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(mesh_id, mesh)
    obj.location = Vector(pos)
    _assign_mat(obj, mat_radiator())
    _link_obj(obj)
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_hose(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    r = _dim(comp, "radius", 0.018)
    mesh_id = comp["asset"]["meshIds"][0]
    obj = make_curved_tube(mesh_id, r, 0.12, 120.0, pos, mat_rubber_dark())
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


def build_under_cover(comp: dict) -> list[bpy.types.Object]:
    pos = comp["placement"]["position"]
    w = _dim(comp, "width", 0.7)
    l = _dim(comp, "length", 0.7)
    t = _dim(comp, "thickness", 0.004)
    mesh_id = comp["asset"]["meshIds"][0]
    obj = make_box(mesh_id, w, t, l, pos, mat_dark_plastic())
    _set_extras(obj, comp["id"], mesh_id)
    return [obj]


# ---------------------------------------------------------------------------
# Builder dispatch table
# ---------------------------------------------------------------------------

BUILDERS: dict[str, Any] = {
    "cylinder-block": build_cylinder_block,
    "oil-pan": build_oil_pan,
    "cylinder-head": build_cylinder_head,
    "cylinder-head-covers": build_cylinder_head_covers,
    "intake-manifold": lambda c: build_manifold(c, side=1.0),
    "exhaust-manifold": lambda c: build_manifold(c, side=-1.0),
    "water-pump": build_water_pump,
    "timing-belt": build_timing_belt,
    "crankshaft-timing-pulley": build_toothed_pulley,
    "crankshaft-timing-pulley-plate": build_disc_part,
    "timing-belt-guide": build_disc_part,
    "camshaft-timing-pulley-exhaust": build_toothed_pulley,
    "camshaft-timing-pulley-exhaust-bolt": build_single_bolt,
    "vvti-controller": build_vvti_controller,
    "vvti-controller-factory-bolts": build_bolt_circle,
    "vvti-oil-hardware": build_vvti_oil_hardware,
    "timing-belt-idler": build_timing_belt_idler,
    "timing-belt-idler-bolt": build_single_bolt,
    "timing-belt-tensioner": build_tensioner,
    "timing-belt-tensioner-boot": build_tensioner_boot,
    "timing-belt-tensioner-bolts": build_tensioner_bolts,
    "timing-belt-rear-covers": build_rear_cover,
    "timing-belt-cover-no1": build_timing_cover,
    "timing-belt-cover-no2": build_timing_cover,
    "crankshaft-pulley": build_crankshaft_pulley,
    "crankshaft-pulley-bolt": build_single_bolt,
    "accessory-drive-belt": build_accessory_belt,
    "accessory-belt-tensioner": build_accessory_belt_tensioner,
    "water-pump-pulley": build_water_pump_pulley,
    "power-steering-pump": build_power_steering_pump,
    "power-steering-pump-bracket": build_ps_bracket,
    "alternator": build_cylindrical_accessory,
    "ac-compressor": build_cylindrical_accessory,
    "radiator-assembly": build_radiator,
    "radiator-hose-upper": build_hose,
    "radiator-hose-lower": build_hose,
    "engine-under-cover": build_under_cover,
}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    repo_root, output_glb = _cli_args()

    inventory_path = repo_root / "content" / "components" / "2jz-ge-vvti-jzs160.json"
    if not inventory_path.exists():
        raise FileNotFoundError(f"Inventory not found: {inventory_path}")

    with open(inventory_path, "r", encoding="utf-8") as f:
        inventory = json.load(f)

    # --- Scene setup ---------------------------------------------------------
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0  # 1 BU = 1 metre

    collection = bpy.data.collections.new("TimingAssembly")
    scene.collection.children.link(collection)
    bpy.context.view_layer.active_layer_collection = (
        bpy.context.view_layer.layer_collection.children["TimingAssembly"]
    )

    # --- Build components ----------------------------------------------------
    component_count = 0
    mesh_id_count = 0
    components = inventory.get("components", [])

    for comp in components:
        cid = comp["id"]
        builder = BUILDERS.get(cid)
        if builder is None:
            print(f"[WARN] No builder for component '{cid}', skipping.")
            continue
        try:
            objs = builder(comp)
            component_count += 1
            mesh_id_count += len(objs)
            print(f"[OK]   {cid}: {len(objs)} mesh(es)")
        except Exception as exc:
            print(f"[ERR]  {cid}: {exc}")
            import traceback
            traceback.print_exc()

    # --- Count triangles -----------------------------------------------------
    total_tris = 0
    for obj in bpy.data.objects:
        if obj.type == "MESH":
            mesh = obj.data
            mesh.calc_loop_triangles()
            total_tris += len(mesh.loop_triangles)

    print(f"\nTotal components: {component_count}")
    print(f"Total mesh objects: {mesh_id_count}")
    print(f"Total triangles: {total_tris}")

    # --- Export GLB ----------------------------------------------------------
    output_glb.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format='GLB',
        use_selection=False,
        export_extras=True,
        export_yup=True,
    )
    print(f"Exported: {output_glb}")

    # --- Write manifest JSON -------------------------------------------------
    glb_bytes = output_glb.read_bytes()
    sha256 = hashlib.sha256(glb_bytes).hexdigest()
    manifest = {
        "modelRevision": 1,
        "engineVariantId": inventory.get("engineVariantId", "unknown"),
        "componentCount": component_count,
        "meshObjectCount": mesh_id_count,
        "triangleCount": total_tris,
        "fileSizeBytes": len(glb_bytes),
        "sha256": sha256,
        "exportedAt": datetime.datetime.utcnow().isoformat() + "Z",
        "blenderVersion": ".".join(str(v) for v in bpy.app.version),
        "sourceInventory": str(inventory_path),
    }
    manifest_path = output_glb.with_suffix(".manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
