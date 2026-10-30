// Validate the exported browser assemblies against the component inventory and
// the procedures that drive them.
//
// Checks: container integrity, component/mesh identifiers, scale, materials,
// unsupported extensions, per-file budgets, and that every component a
// procedure step references actually exists in an exported layer.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

let errors = 0;
let warnings = 0;
const fail = (msg) => {
  console.error('FAIL:', msg);
  errors++;
};
const warn = (msg) => {
  console.warn('warn:', msg);
  warnings++;
};
const ok = (msg) => console.log('  ok:', msg);

// Budgets. Generous enough for added detail, tight enough to catch an
// accidental export of unrelated geometry.
const BUDGET = {
  bytesPerFile: 6 * 1024 * 1024,
  trianglesPerFile: 250_000,
  maxExtent: 2.5, // metres in any axis; an inline six plus its radiator
  minExtent: 0.2,
};

const COMPONENT_TYPE_SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const TYPE_COUNT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function parseGlb(buffer, label) {
  if (buffer.length < 20) {
    fail(`${label}: file is too short to be a GLB`);
    return null;
  }
  if (buffer.readUInt32LE(0) !== 0x46546c67) {
    fail(`${label}: missing glTF magic`);
    return null;
  }
  if (buffer.readUInt32LE(4) !== 2) {
    fail(`${label}: not glTF 2.0`);
    return null;
  }
  if (buffer.readUInt32LE(8) !== buffer.length) {
    fail(`${label}: header length ${buffer.readUInt32LE(8)} != file length ${buffer.length}`);
    return null;
  }
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + chunkLength > buffer.length) {
      fail(`${label}: chunk at ${offset} overruns the file`);
      return null;
    }
    if (chunkType === 0x4e4f534a) json = buffer.subarray(start, start + chunkLength).toString('utf8');
    if (chunkType === 0x004e4942) bin = buffer.subarray(start, start + chunkLength);
    offset = start + chunkLength;
  }
  if (!json) {
    fail(`${label}: no JSON chunk`);
    return null;
  }
  try {
    return { gltf: JSON.parse(json), bin };
  } catch (error) {
    fail(`${label}: JSON chunk does not parse (${error.message})`);
    return null;
  }
}

function checkAccessors(gltf, bin, label) {
  for (const [index, accessor] of (gltf.accessors ?? []).entries()) {
    const view = gltf.bufferViews?.[accessor.bufferView];
    if (!view) {
      fail(`${label}: accessor ${index} has no bufferView`);
      continue;
    }
    const stride = COMPONENT_TYPE_SIZE[accessor.componentType] * TYPE_COUNT[accessor.type];
    if (!stride) {
      fail(`${label}: accessor ${index} has an unknown componentType/type`);
      continue;
    }
    const needed = accessor.count * stride;
    if (needed > view.byteLength) {
      fail(`${label}: accessor ${index} needs ${needed} bytes but its view holds ${view.byteLength}`);
    }
    if ((view.byteOffset ?? 0) + view.byteLength > (bin?.length ?? 0)) {
      fail(`${label}: bufferView ${accessor.bufferView} runs past the binary chunk`);
    }
  }
}

function positionsOf(gltf, bin, accessorIndex) {
  const accessor = gltf.accessors[accessorIndex];
  const view = gltf.bufferViews[accessor.bufferView];
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  return new Float32Array(bin.buffer, bin.byteOffset + start, accessor.count * 3);
}

const engineVariantId = '2jz-ge-vvti-jzs160';
const inventory = readJson(path.join(root, 'content', 'components', `${engineVariantId}.json`));
const assetDir = path.join(root, 'public', 'assets', engineVariantId, 'r1');
const manifestPath = path.join(assetDir, 'assembly.json');

if (!fs.existsSync(manifestPath)) {
  fail(`No manifest at ${manifestPath}. Run: node modeling/wrenchwise/build_assembly.mjs`);
  process.exit(1);
}

const manifest = readJson(manifestPath);
ok(`manifest r${manifest.modelRevision} for ${manifest.engineVariantId}`);

if (manifest.engineVariantId !== inventory.engineVariantId) {
  fail(`manifest engine ${manifest.engineVariantId} != inventory engine ${inventory.engineVariantId}`);
}
if (manifest.units !== 'metres') {
  fail(`manifest units must be metres, found "${manifest.units}"`);
}
if (!manifest.evidence?.status) {
  fail('manifest is missing an evidence status');
}
if (manifest.evidence?.status === 'verified') {
  fail('manifest claims verified geometry. That requires recorded measurements and review.');
}

// Every inventory mesh id must be exported exactly once, in the declared layer.
const expected = new Map();
for (const component of inventory.components) {
  for (const meshId of component.asset.meshIds) {
    if (expected.has(meshId)) fail(`inventory declares mesh id "${meshId}" twice`);
    expected.set(meshId, { componentId: component.id, layer: component.asset.layer });
  }
}

const seen = new Set();

for (const entry of manifest.files) {
  const file = path.join(assetDir, entry.file);
  if (!fs.existsSync(file)) {
    fail(`${entry.file}: missing`);
    continue;
  }
  const buffer = fs.readFileSync(file);
  if (buffer.length !== entry.byteLength) {
    fail(`${entry.file}: ${buffer.length} bytes on disk, manifest says ${entry.byteLength}`);
  }
  const sha = crypto.createHash('sha256').update(buffer).digest('hex');
  if (sha !== entry.sha256) {
    fail(`${entry.file}: sha256 does not match the manifest. Re-export and commit both.`);
  }
  if (buffer.length > BUDGET.bytesPerFile) {
    fail(`${entry.file}: ${(buffer.length / 1048576).toFixed(2)} MB exceeds the ${BUDGET.bytesPerFile / 1048576} MB budget`);
  }
  if (entry.triangleCount > BUDGET.trianglesPerFile) {
    fail(`${entry.file}: ${entry.triangleCount} triangles exceeds the budget`);
  }

  const parsed = parseGlb(buffer, entry.file);
  if (!parsed) continue;
  const { gltf, bin } = parsed;

  if (gltf.extensionsRequired?.length) {
    fail(`${entry.file}: requires extensions ${gltf.extensionsRequired.join(', ')}; the viewer loads plain glTF 2.0`);
  }
  if (!gltf.nodes?.length) {
    fail(`${entry.file}: no nodes`);
    continue;
  }
  if (gltf.nodes.length !== entry.nodeCount) {
    fail(`${entry.file}: ${gltf.nodes.length} nodes, manifest says ${entry.nodeCount}`);
  }
  if (gltf.images?.length || gltf.textures?.length) {
    warn(`${entry.file}: contains textures; the instructional materials are untextured by design`);
  }

  checkAccessors(gltf, bin, entry.file);

  let triangles = 0;
  const extent = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };

  for (const node of gltf.nodes) {
    const extras = node.extras ?? {};
    if (!extras.componentId) {
      fail(`${entry.file}: node "${node.name}" has no extras.componentId`);
      continue;
    }
    if (!extras.meshId) {
      fail(`${entry.file}: node "${node.name}" has no extras.meshId`);
      continue;
    }
    if (extras.modelRevision !== manifest.modelRevision) {
      fail(`${entry.file}: node "${node.name}" carries revision ${extras.modelRevision}, manifest says ${manifest.modelRevision}`);
    }
    if (node.name !== extras.meshId) {
      fail(`${entry.file}: node name "${node.name}" differs from extras.meshId "${extras.meshId}"`);
    }
    const declared = expected.get(extras.meshId);
    if (!declared) {
      fail(`${entry.file}: mesh "${extras.meshId}" is not in the component inventory`);
    } else {
      if (declared.componentId !== extras.componentId) {
        fail(`${entry.file}: mesh "${extras.meshId}" maps to component "${extras.componentId}" but the inventory says "${declared.componentId}"`);
      }
      if (declared.layer !== entry.layer) {
        fail(`${entry.file}: mesh "${extras.meshId}" belongs to layer "${declared.layer}" but was exported in "${entry.layer}"`);
      }
      if (seen.has(extras.meshId)) {
        fail(`mesh "${extras.meshId}" is exported more than once`);
      }
      seen.add(extras.meshId);
    }

    const mesh = gltf.meshes?.[node.mesh];
    if (!mesh) {
      fail(`${entry.file}: node "${node.name}" has no mesh`);
      continue;
    }
    if (!mesh.primitives?.length) {
      fail(`${entry.file}: mesh "${node.name}" has no primitives`);
      continue;
    }
    const translation = node.translation ?? [0, 0, 0];
    for (const primitive of mesh.primitives) {
      if (primitive.material === undefined) {
        fail(`${entry.file}: "${node.name}" has a primitive without a material`);
      } else if (!gltf.materials?.[primitive.material]?.pbrMetallicRoughness) {
        fail(`${entry.file}: "${node.name}" references a material without pbrMetallicRoughness`);
      }
      if (primitive.attributes?.POSITION === undefined) {
        fail(`${entry.file}: "${node.name}" has a primitive without POSITION`);
        continue;
      }
      if (primitive.attributes?.NORMAL === undefined) {
        fail(`${entry.file}: "${node.name}" has a primitive without NORMAL; lighting would be flat grey`);
      }
      if (primitive.indices === undefined) {
        fail(`${entry.file}: "${node.name}" has a non-indexed primitive`);
      } else {
        triangles += gltf.accessors[primitive.indices].count / 3;
      }
      const positions = positionsOf(gltf, bin, primitive.attributes.POSITION);
      for (let i = 0; i < positions.length; i += 3) {
        for (let axis = 0; axis < 3; axis++) {
          const value = positions[i + axis] + translation[axis];
          if (!Number.isFinite(value)) {
            fail(`${entry.file}: "${node.name}" has a non-finite vertex position`);
            break;
          }
          if (value < extent.min[axis]) extent.min[axis] = value;
          if (value > extent.max[axis]) extent.max[axis] = value;
        }
      }
    }
  }

  if (triangles !== entry.triangleCount) {
    fail(`${entry.file}: counted ${triangles} triangles, manifest says ${entry.triangleCount}`);
  }
  for (let axis = 0; axis < 3; axis++) {
    const size = extent.max[axis] - extent.min[axis];
    if (size > BUDGET.maxExtent) {
      fail(`${entry.file}: extent ${size.toFixed(2)} m on axis ${axis} suggests a scale error`);
    }
    if (size < BUDGET.minExtent) {
      fail(`${entry.file}: extent ${size.toFixed(3)} m on axis ${axis} suggests a scale error`);
    }
  }
  ok(`${entry.file}: ${gltf.nodes.length} meshes, ${triangles} triangles, ${(buffer.length / 1024).toFixed(0)} KB`);
}

for (const [meshId, declared] of expected) {
  if (!seen.has(meshId)) {
    fail(`inventory mesh "${meshId}" (${declared.componentId}) was never exported`);
  }
}

// Procedures must only point at components that exist in an exported layer.
const exportedComponents = new Set(manifest.components.map((c) => c.componentId));
const procDir = path.join(root, 'content', 'procedures');
for (const file of fs.readdirSync(procDir).filter((f) => f.endsWith('.json'))) {
  const procedure = readJson(path.join(procDir, file));
  if (procedure.engineVariantId !== engineVariantId) continue;
  const referenced = new Set();
  for (const step of procedure.steps) {
    for (const id of step.componentIds ?? []) referenced.add(id);
    for (const key of ['remove', 'restore', 'hide', 'highlight']) {
      for (const id of step.view?.[key] ?? []) referenced.add(id);
    }
  }
  for (const id of referenced) {
    if (!exportedComponents.has(id)) {
      fail(`procedure ${procedure.id} references component "${id}", which has no exported geometry`);
    }
  }
  // A step that removes something must have had it present beforehand.
  const present = new Set(exportedComponents);
  for (const step of procedure.steps) {
    for (const id of step.view?.remove ?? []) {
      if (!present.has(id)) {
        fail(`procedure ${procedure.id} step ${step.id} removes "${id}", which is already removed`);
      }
      present.delete(id);
    }
    for (const id of step.view?.restore ?? []) {
      if (present.has(id)) {
        fail(`procedure ${procedure.id} step ${step.id} restores "${id}", which was never removed`);
      }
      present.add(id);
    }
  }
  ok(`procedure ${procedure.id}: ${referenced.size} components resolve to geometry`);
}

console.log(`\n${errors ? `${errors} error(s)` : 'All asset checks passed'}${warnings ? `, ${warnings} warning(s)` : ''}`);
process.exit(errors ? 1 : 0);
