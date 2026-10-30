// Minimal glTF 2.0 / GLB writer for the Wrenchwise assembly exports.
//
// One node + one mesh per selectable object. glTF `extras` carry
// componentId, meshId and modelRevision so the viewer can map a raycast hit
// back to the component inventory. No extensions are used, so the asset loads
// in any compliant glTF 2.0 loader without a decoder.

const FLOAT = 5126;
const UNSIGNED_SHORT = 5123;
const UNSIGNED_INT = 5125;
const TRIANGLES = 4;
const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;

/** Flat-shade a Mesh: duplicate vertices per face and compute face normals. */
export function flatten(mesh) {
  const positions = new Float32Array(mesh.faces.length * 9);
  const normals = new Float32Array(mesh.faces.length * 9);
  const indices = new Uint32Array(mesh.faces.length * 3);
  let p = 0;
  for (let f = 0; f < mesh.faces.length; f++) {
    const [ia, ib, ic] = mesh.faces[f];
    const a = mesh.verts[ia];
    const b = mesh.verts[ib];
    const c = mesh.verts[ic];
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    for (const vert of [a, b, c]) {
      positions[p * 3] = vert[0];
      positions[p * 3 + 1] = vert[1];
      positions[p * 3 + 2] = vert[2];
      normals[p * 3] = nx;
      normals[p * 3 + 1] = ny;
      normals[p * 3 + 2] = nz;
      indices[p] = p;
      p++;
    }
  }
  return { positions, normals, indices, vertexCount: p, triangleCount: mesh.faces.length };
}

const pad4 = (n) => (n + 3) & ~3;

class BufferWriter {
  constructor() {
    this.chunks = [];
    this.length = 0;
  }

  write(typedArray) {
    const bytes = Buffer.from(
      typedArray.buffer,
      typedArray.byteOffset,
      typedArray.byteLength,
    );
    const offset = this.length;
    this.chunks.push(bytes);
    this.length += bytes.length;
    const padding = pad4(this.length) - this.length;
    if (padding > 0) {
      this.chunks.push(Buffer.alloc(padding));
      this.length += padding;
    }
    return { offset, byteLength: bytes.length };
  }

  toBuffer() {
    return Buffer.concat(this.chunks, this.length);
  }
}

/**
 * Build a GLB.
 *
 * @param {object} args
 * @param {Array<{name:string, parts:Array<{mesh:object, material:string}>, translation:number[], extras:object}>} args.objects
 * @param {Record<string, {baseColor:number[], metallic:number, roughness:number}>} args.materials
 * @param {object} args.asset  extra fields merged into glTF `asset`
 * @param {object} args.sceneExtras  extras attached to the scene
 */
export function buildGlb({ objects, materials, asset = {}, sceneExtras = {} }) {
  const usedMaterials = [...new Set(objects.flatMap((o) => o.parts.map((p) => p.material)))];
  const materialIndex = new Map(usedMaterials.map((name, i) => [name, i]));
  const gltfMaterials = usedMaterials.map((name) => {
    const m = materials[name];
    if (!m) throw new Error(`Unknown material "${name}"`);
    return {
      name,
      doubleSided: false,
      pbrMetallicRoughness: {
        baseColorFactor: [...m.baseColor, 1],
        metallicFactor: m.metallic,
        roughnessFactor: m.roughness,
      },
    };
  });

  const writer = new BufferWriter();
  const bufferViews = [];
  const accessors = [];
  const meshes = [];
  const nodes = [];
  let totalTriangles = 0;
  let totalVertices = 0;

  const addAccessor = (view, componentType, count, type, extra = {}) => {
    accessors.push({ bufferView: view, componentType, count, type, ...extra });
    return accessors.length - 1;
  };

  for (const object of objects) {
    const primitives = [];
    for (const part of object.parts) {
    const data = flatten(part.mesh);
    totalTriangles += data.triangleCount;
    totalVertices += data.vertexCount;

    const posRange = writer.write(data.positions);
    bufferViews.push({ buffer: 0, byteOffset: posRange.offset, byteLength: posRange.byteLength, target: ARRAY_BUFFER });
    const posView = bufferViews.length - 1;

    const nrmRange = writer.write(data.normals);
    bufferViews.push({ buffer: 0, byteOffset: nrmRange.offset, byteLength: nrmRange.byteLength, target: ARRAY_BUFFER });
    const nrmView = bufferViews.length - 1;

    const useShort = data.vertexCount <= 65535;
    const indexArray = useShort ? new Uint16Array(data.indices) : data.indices;
    const idxRange = writer.write(indexArray);
    bufferViews.push({ buffer: 0, byteOffset: idxRange.offset, byteLength: idxRange.byteLength, target: ELEMENT_ARRAY_BUFFER });
    const idxView = bufferViews.length - 1;

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < data.vertexCount; i++) {
      const x = data.positions[i * 3];
      const y = data.positions[i * 3 + 1];
      const z = data.positions[i * 3 + 2];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }

    const posAccessor = addAccessor(posView, FLOAT, data.vertexCount, 'VEC3', {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    });
    const nrmAccessor = addAccessor(nrmView, FLOAT, data.vertexCount, 'VEC3');
    const idxAccessor = addAccessor(
      idxView,
      useShort ? UNSIGNED_SHORT : UNSIGNED_INT,
      data.indices.length,
      'SCALAR',
    );

    primitives.push({
      attributes: { POSITION: posAccessor, NORMAL: nrmAccessor },
      indices: idxAccessor,
      material: materialIndex.get(part.material),
      mode: TRIANGLES,
    });
    }

    meshes.push({ name: object.name, primitives });
    nodes.push({
      name: object.name,
      mesh: meshes.length - 1,
      translation: object.translation,
      extras: object.extras,
    });
  }

  const gltf = {
    asset: { version: '2.0', generator: 'wrenchwise/modeling/build_assembly.mjs', ...asset },
    scene: 0,
    scenes: [{ name: 'Assembly', nodes: nodes.map((_, i) => i), extras: sceneExtras }],
    nodes,
    meshes,
    materials: gltfMaterials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: writer.length }],
  };

  const binary = writer.toBuffer();
  const jsonText = JSON.stringify(gltf);
  const jsonBuffer = Buffer.from(jsonText, 'utf8');
  const jsonPadded = Buffer.concat([
    jsonBuffer,
    Buffer.alloc(pad4(jsonBuffer.length) - jsonBuffer.length, 0x20),
  ]);
  const binPadded = Buffer.concat([
    binary,
    Buffer.alloc(pad4(binary.length) - binary.length, 0),
  ]);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // "glTF"
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + binPadded.length, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonPadded.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binPadded.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // "BIN"

  return {
    glb: Buffer.concat([header, jsonHeader, jsonPadded, binHeader, binPadded]),
    stats: { triangleCount: totalTriangles, vertexCount: totalVertices, nodeCount: nodes.length },
  };
}
