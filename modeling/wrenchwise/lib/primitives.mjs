// Shape vocabulary for the Wrenchwise procedural assembly.
//
// Every shape is built in the glTF frame documented by
// content/engines/<engine>.json#frame:
//   X = engine left, Y = up, Z = forward along the crankshaft toward the timing drive.
// Units are metres. Shapes are centred on the local origin; placement happens
// in assembly.mjs from the component inventory's `placement.position`.
//
// The same vocabulary is implemented by the Blender authoring script
// (modeling/wrenchwise/build_timing_assembly.py). recipes.json is the single
// source of truth for which shape each component uses, so the two
// implementations stay in step.

const TAU = Math.PI * 2;

export class Mesh {
  constructor() {
    this.verts = [];
    this.faces = [];
  }

  v(x, y, z) {
    this.verts.push([x, y, z]);
    return this.verts.length - 1;
  }

  tri(a, b, c) {
    this.faces.push([a, b, c]);
  }

  quad(a, b, c, d) {
    this.faces.push([a, b, c], [a, c, d]);
  }

  /** Merge `other` into this mesh, optionally offset by [dx, dy, dz]. */
  merge(other, offset = [0, 0, 0]) {
    const base = this.verts.length;
    for (const [x, y, z] of other.verts) {
      this.verts.push([x + offset[0], y + offset[1], z + offset[2]]);
    }
    for (const [a, b, c] of other.faces) {
      this.faces.push([a + base, b + base, c + base]);
    }
    return this;
  }

  translate(dx, dy, dz) {
    for (const p of this.verts) {
      p[0] += dx;
      p[1] += dy;
      p[2] += dz;
    }
    return this;
  }

  get triangleCount() {
    return this.faces.length;
  }
}

/** Rotate a mesh built along local +Z so that +Z points along `axis`. */
export function applyAxis(mesh, axis) {
  if (axis === 'z' || !axis) return mesh;
  for (const p of mesh.verts) {
    const [x, y, z] = p;
    if (axis === 'x') {
      // Rotate +90° about Y: local +Z becomes world +X.
      p[0] = z;
      p[1] = y;
      p[2] = -x;
    } else if (axis === 'y') {
      // Rotate -90° about X: local +Z becomes world +Y.
      p[0] = x;
      p[1] = z;
      p[2] = -y;
    } else {
      throw new Error(`Unknown axis "${axis}"`);
    }
  }
  return mesh;
}

/** Axis-aligned box centred on the origin. */
export function box({ x, y, z }) {
  const m = new Mesh();
  const hx = x / 2;
  const hy = y / 2;
  const hz = z / 2;
  const i = [
    m.v(-hx, -hy, -hz), m.v(hx, -hy, -hz), m.v(hx, hy, -hz), m.v(-hx, hy, -hz),
    m.v(-hx, -hy, hz), m.v(hx, -hy, hz), m.v(hx, hy, hz), m.v(-hx, hy, hz),
  ];
  m.quad(i[3], i[2], i[1], i[0]); // -Z
  m.quad(i[4], i[5], i[6], i[7]); // +Z
  m.quad(i[0], i[1], i[5], i[4]); // -Y
  m.quad(i[2], i[3], i[7], i[6]); // +Y
  m.quad(i[1], i[2], i[6], i[5]); // +X
  m.quad(i[3], i[0], i[4], i[7]); // -X
  return m;
}

/** Truncated cone (a cylinder when radius1 === radius2), axis along +Z. */
export function cone({ radius1, radius2, length, segments = 20, axis = 'z' }) {
  const m = new Mesh();
  const hz = length / 2;
  const bottom = [];
  const top = [];
  for (let i = 0; i < segments; i++) {
    const a = (TAU * i) / segments;
    bottom.push(m.v(Math.cos(a) * radius1, Math.sin(a) * radius1, -hz));
    top.push(m.v(Math.cos(a) * radius2, Math.sin(a) * radius2, hz));
  }
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    m.quad(bottom[i], bottom[j], top[j], top[i]);
  }
  if (radius1 > 0) {
    const c = m.v(0, 0, -hz);
    for (let i = 0; i < segments; i++) {
      m.tri(c, bottom[(i + 1) % segments], bottom[i]);
    }
  }
  if (radius2 > 0) {
    const c = m.v(0, 0, hz);
    for (let i = 0; i < segments; i++) {
      m.tri(c, top[i], top[(i + 1) % segments]);
    }
  }
  return applyAxis(m, axis);
}

export function cylinder({ radius, length, segments = 20, axis = 'z' }) {
  return cone({ radius1: radius, radius2: radius, length, segments, axis });
}

export function disc({ radius, thickness, segments = 24, axis = 'z' }) {
  return cylinder({ radius, length: thickness, segments, axis });
}

/**
 * Simplified hex-head bolt: hexagonal prism head plus a cylindrical shank.
 * The head sits on the +axis side so the shank points into the part.
 */
export function hexBolt({ acrossFlats, axis = 'z' }) {
  const headHeight = acrossFlats * 0.65;
  const shankRadius = acrossFlats * 0.45;
  const shankLength = acrossFlats * 1.5;
  const m = new Mesh();
  const head = cone({
    radius1: acrossFlats / Math.sqrt(3),
    radius2: acrossFlats / Math.sqrt(3),
    length: headHeight,
    segments: 6,
  });
  m.merge(head, [0, 0, shankLength / 2 + headHeight / 2]);
  m.merge(cone({ radius1: shankRadius, radius2: shankRadius, length: shankLength, segments: 10 }));
  return applyAxis(m, axis);
}

const AXIS_INDEX = { x: 0, y: 1, z: 2 };

/**
 * Arched shell: a cover that spans `span` along spanAxis, bulges `archHeight`
 * along archAxis and is extruded `extrude` along extrudeAxis. Both faces are
 * generated so the shell reads correctly from inside and outside.
 */
export function archedShell({
  span,
  archHeight,
  extrude,
  spanAxis = 'x',
  archAxis = 'z',
  extrudeAxis = 'y',
  segments = 12,
  thickness,
}) {
  const wall = thickness ?? Math.min(0.004, Math.max(archHeight * 0.18, 0.0015));
  const si = AXIS_INDEX[spanAxis];
  const ai = AXIS_INDEX[archAxis];
  const ei = AXIS_INDEX[extrudeAxis];
  if (si === ai || si === ei || ai === ei) throw new Error('archedShell axes must differ');
  const m = new Mesh();
  const put = (s, a, e) => {
    const p = [0, 0, 0];
    p[si] = s;
    p[ai] = a;
    p[ei] = e;
    return m.v(p[0], p[1], p[2]);
  };
  const he = extrude / 2;
  const profile = (t, depth) => {
    const usable = span - 2 * depth;
    const s = -usable / 2 + usable * t;
    const a = Math.sin(Math.PI * t) * (archHeight - depth);
    return [s, a];
  };
  const outer = [];
  const inner = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const [so, ao] = profile(t, 0);
    const [si2, ai2] = profile(t, wall);
    outer.push([put(so, ao, -he), put(so, ao, he)]);
    inner.push([put(si2, ai2, -he), put(si2, ai2, he)]);
  }
  for (let i = 0; i < segments; i++) {
    m.quad(outer[i][0], outer[i][1], outer[i + 1][1], outer[i + 1][0]);
    m.quad(inner[i + 1][0], inner[i + 1][1], inner[i][1], inner[i][0]);
    // Close the two extrusion ends.
    m.quad(outer[i][0], outer[i + 1][0], inner[i + 1][0], inner[i][0]);
    m.quad(inner[i][1], inner[i + 1][1], outer[i + 1][1], outer[i][1]);
  }
  // Close the two arch ends.
  m.quad(outer[0][0], inner[0][0], inner[0][1], outer[0][1]);
  m.quad(outer[segments][1], inner[segments][1], inner[segments][0], outer[segments][0]);
  return m;
}

/** Curved tube (torus section) for hoses. `plane` names the two bend axes. */
export function curvedTube({
  tubeRadius,
  bendRadius,
  arcDegrees,
  plane = 'xy',
  segments = 14,
  tubeSegments = 10,
}) {
  const [u, w] = plane.split('');
  const ui = AXIS_INDEX[u];
  const wi = AXIS_INDEX[w];
  const ni = 3 - ui - wi; // the remaining axis
  if (ui === undefined || wi === undefined) throw new Error(`Bad plane "${plane}"`);
  const arc = (arcDegrees * Math.PI) / 180;
  const m = new Mesh();
  const rings = [];
  for (let i = 0; i <= segments; i++) {
    const t = -arc / 2 + (arc * i) / segments;
    const cu = Math.cos(t) * bendRadius;
    const cw = Math.sin(t) * bendRadius;
    const ring = [];
    for (let j = 0; j < tubeSegments; j++) {
      const a = (TAU * j) / tubeSegments;
      const p = [0, 0, 0];
      p[ui] = cu + Math.cos(t) * Math.cos(a) * tubeRadius;
      p[wi] = cw + Math.sin(t) * Math.cos(a) * tubeRadius;
      p[ni] = Math.sin(a) * tubeRadius;
      ring.push(m.v(p[0], p[1], p[2]));
    }
    rings.push(ring);
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < tubeSegments; j++) {
      const k = (j + 1) % tubeSegments;
      m.quad(rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j]);
    }
  }
  // Cap both ends.
  for (const [ring, flip] of [[rings[0], true], [rings[segments], false]]) {
    const centre = [0, 0, 0];
    for (const idx of ring) {
      centre[0] += m.verts[idx][0] / ring.length;
      centre[1] += m.verts[idx][1] / ring.length;
      centre[2] += m.verts[idx][2] / ring.length;
    }
    const c = m.v(centre[0], centre[1], centre[2]);
    for (let j = 0; j < ring.length; j++) {
      const k = (j + 1) % ring.length;
      if (flip) m.tri(c, ring[k], ring[j]);
      else m.tri(c, ring[j], ring[k]);
    }
  }
  // Recentre so the shape's own origin is its midpoint.
  const mid = [0, 0, 0];
  mid[ui] = bendRadius * Math.cos(arc / 2);
  return m.translate(-mid[0], -mid[1], -mid[2]);
}

/** Multi-groove accessory pulley: body cylinder with raised rib rings. */
export function groovedPulley({ radius, width, grooves = null, ribPitch = 0.0075, segments = 24, axis = 'z' }) {
  grooves = grooves ?? Math.max(2, Math.round(width / ribPitch));
  const m = new Mesh();
  m.merge(cone({ radius1: radius, radius2: radius, length: width, segments }));
  const spacing = width / (grooves + 1);
  const ribDepth = radius * 0.06;
  for (let g = 0; g < grooves; g++) {
    const z = -width / 2 + spacing * (g + 1);
    m.merge(
      cone({
        radius1: radius + ribDepth,
        radius2: radius + ribDepth,
        length: spacing * 0.3,
        segments,
      }),
      [0, 0, z],
    );
  }
  return applyAxis(m, axis);
}

/** Simplified toothed (timing) pulley: hub cylinder with tooth blocks on the rim. */
export function toothedPulley({
  pitchRadius,
  width,
  teeth = null,
  toothPitch = 0.0095,
  hubRadius = null,
  segments = 28,
  axis = 'z',
}) {
  // Tooth count follows a stated illustrative pitch. It is a tessellation
  // choice, not established part data for the engine.
  teeth = teeth ?? Math.max(10, Math.round((TAU * pitchRadius) / toothPitch));
  const m = new Mesh();
  m.merge(cone({ radius1: pitchRadius * 0.85, radius2: pitchRadius * 0.85, length: width, segments }));
  const toothRadial = pitchRadius * 0.16;
  const toothWidth = ((TAU * pitchRadius) / teeth) * 0.45;
  for (let i = 0; i < teeth; i++) {
    const angle = (TAU * i) / teeth;
    const t = box({ x: toothRadial, y: toothWidth, z: width * 0.9 });
    // Rotate the block about Z so its long edge follows the rim, then push it out.
    for (const p of t.verts) {
      const [x, y] = p;
      p[0] = x * Math.cos(angle) - y * Math.sin(angle);
      p[1] = x * Math.sin(angle) + y * Math.cos(angle);
    }
    m.merge(t, [Math.cos(angle) * pitchRadius, Math.sin(angle) * pitchRadius, 0]);
  }
  if (hubRadius) {
    m.merge(cone({ radius1: hubRadius, radius2: hubRadius, length: width * 1.2, segments: 16 }));
  }
  return applyAxis(m, axis);
}

/** Smooth idler/tensioner pulley: outer rim plus a protruding bearing boss. */
export function idlerPulley({ radius, width, segments = 24, axis = 'z' }) {
  const m = new Mesh();
  m.merge(cone({ radius1: radius, radius2: radius, length: width, segments }));
  m.merge(cone({ radius1: radius * 0.3, radius2: radius * 0.3, length: width * 1.25, segments: 12 }));
  return applyAxis(m, axis);
}

/**
 * Flat belt ribbon following the outer tangent hull around circular pulleys.
 * `pulleys` is [[u, w, radius], ...] in the plane named by `plane`, relative to
 * the component's placement position.
 */
/**
 * Counter-clockwise convex hull (Andrew's monotone chain) over [u, w, ...] rows.
 * Returns the surviving rows in hull order.
 */
export function convexHull(rows) {
  if (rows.length < 3) return [...rows];
  const sorted = [...rows].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Which pulleys a belt wraps from the outside, in counter-clockwise order.
 * Each circle is sampled and the hull taken over all samples, so pulley size
 * decides contact rather than centre position alone.
 */
export function wrappedPulleys(pulleys, samples = 24) {
  if (pulleys.length < 3) return [...pulleys];
  const points = [];
  pulleys.forEach((pulley, index) => {
    const [cu, cw, r] = pulley;
    for (let i = 0; i < samples; i++) {
      const a = (TAU * i) / samples;
      points.push([cu + Math.cos(a) * r, cw + Math.sin(a) * r, index]);
    }
  });
  const hull = convexHull(points);
  const order = [];
  for (const point of hull) {
    const index = point[2];
    if (!order.includes(index)) order.push(index);
  }
  return order.map((index) => pulleys[index]);
}

export function beltPath({
  pulleys,
  width,
  thickness,
  plane = 'xy',
  segmentsPerArc = 10,
}) {
  const [u, w] = plane.split('');
  const ui = AXIS_INDEX[u];
  const wi = AXIS_INDEX[w];
  const ni = 3 - ui - wi;
  // The tangent construction is only defined for pulleys the belt wraps from
  // the outside. Decide which those are from the hull of the pulley *circles*
  // (sampled), not of their centres, so a large pulley between two small ones
  // is still wrapped. Pulleys left inside the loop are reported rather than
  // forced into a self-crossing band.
  const wrapped = wrappedPulleys(pulleys);
  const skipped = pulleys.filter((p) => !wrapped.includes(p)).map((p) => p[3]);
  pulleys = wrapped;
  const points = [];
  const n = pulleys.length;
  for (let idx = 0; idx < n; idx++) {
    const [cu, cw, r] = pulleys[idx];
    const [pu, pw] = pulleys[(idx - 1 + n) % n];
    const [nu, nw] = pulleys[(idx + 1) % n];
    let aStart = Math.atan2(pw - cw, pu - cu);
    let aEnd = Math.atan2(nw - cw, nu - cu);
    if (aEnd < aStart) aEnd += TAU;
    for (let s = 0; s <= segmentsPerArc; s++) {
      const t = aStart + ((aEnd - aStart) * s) / segmentsPerArc;
      points.push([cu + Math.cos(t) * r, cw + Math.sin(t) * r]);
    }
  }
  // The belt is a closed band: `width` runs along the pulley axis, `thickness`
  // is radial. Each path point contributes a 4-vertex cross-section.
  const m = new Mesh();
  const halfW = width / 2;
  const halfT = thickness / 2;
  const count = points.length;
  const sections = [];
  for (let i = 0; i < count; i++) {
    const [pu, pw] = points[i];
    const [au, aw] = points[(i - 1 + count) % count];
    const [bu, bw] = points[(i + 1) % count];
    let tu = bu - au;
    let tw = bw - aw;
    const len = Math.hypot(tu, tw) || 1;
    tu /= len;
    tw /= len;
    // Outward normal for a counter-clockwise hull traversal.
    const nu = tw;
    const nw = -tu;
    const corner = (radial, side) => {
      const p = [0, 0, 0];
      p[ui] = pu + nu * radial;
      p[wi] = pw + nw * radial;
      p[ni] = side;
      return m.v(p[0], p[1], p[2]);
    };
    sections.push([
      corner(halfT, -halfW),
      corner(halfT, halfW),
      corner(-halfT, halfW),
      corner(-halfT, -halfW),
    ]);
  }
  for (let i = 0; i < count; i++) {
    const a = sections[i];
    const b = sections[(i + 1) % count];
    m.quad(a[0], a[1], b[1], b[0]); // outer face
    m.quad(a[2], a[3], b[3], b[2]); // inner face
    m.quad(a[1], a[2], b[2], b[1]); // one edge
    m.quad(a[3], a[0], b[0], b[3]); // other edge
  }
  m.beltPath = { wrapped: pulleys.map((p) => p[3]), skipped };
  return m;
}

export const SHAPES = {
  box,
  cone,
  cylinder,
  disc,
  hexBolt,
  archedShell,
  curvedTube,
  groovedPulley,
  toothedPulley,
  idlerPulley,
  beltPath,
};
