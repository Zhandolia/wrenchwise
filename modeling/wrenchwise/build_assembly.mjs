#!/usr/bin/env node
// Build the browser assembly for one engine variant.
//
//   node modeling/wrenchwise/build_assembly.mjs [--out <dir>] [--check]
//
// Reads content/components/<engine>.json and modeling/wrenchwise/recipes.json,
// then writes one GLB per asset layer plus assembly.json (the manifest the
// application and scripts/validate-assets.mjs read).
//
// --check rebuilds in memory and fails if the committed GLBs no longer match,
// so CI catches an inventory change that was never re-exported.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildAssembly } from './lib/assembly.mjs';
import { buildGlb } from './lib/gltf.mjs';
import { buildIllustration } from './lib/illustration.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const argv = process.argv.slice(2);
const check = argv.includes('--check');
const outIndex = argv.indexOf('--out');
const engineVariantId = '2jz-ge-vvti-jzs160';

const recipes = readJson(path.join(here, 'recipes.json'));
const inventory = readJson(path.join(repoRoot, 'content', 'components', `${engineVariantId}.json`));
const engine = readJson(path.join(repoRoot, 'content', 'engines', `${engineVariantId}.json`));

if (recipes.engineVariantId !== inventory.engineVariantId) {
  throw new Error(
    `recipes.json targets ${recipes.engineVariantId} but the inventory is ${inventory.engineVariantId}`,
  );
}

const revisionDir = `r${recipes.revision}`;
const outDir = outIndex >= 0
  ? path.resolve(argv[outIndex + 1])
  : path.join(repoRoot, 'public', 'assets', engineVariantId, revisionDir);

const { layers, notes, missingRecipes, records } = buildAssembly({ inventory, recipes });

if (missingRecipes.length) {
  console.error(`No geometry recipe for: ${missingRecipes.join(', ')}`);
  process.exit(1);
}

const LAYER_ORDER = ['core', 'access'];
const layerNames = [...layers.keys()].sort(
  (a, b) => LAYER_ORDER.indexOf(a) - LAYER_ORDER.indexOf(b),
);

const files = [];
const built = new Map();

for (const layer of layerNames) {
  const objects = layers.get(layer);
  const { glb, stats } = buildGlb({
    objects,
    materials: recipes.materials,
    asset: {
      copyright: 'Wrenchwise original procedural geometry, MIT licensed.',
      extras: {
        engineVariantId,
        modelRevision: recipes.revision,
        layer,
        evidenceStatus: recipes.evidence.status,
      },
    },
    sceneExtras: { engineVariantId, modelRevision: recipes.revision, layer },
  });
  built.set(layer, glb);
  files.push({
    layer,
    file: `${layer}.glb`,
    byteLength: glb.length,
    sha256: crypto.createHash('sha256').update(glb).digest('hex'),
    nodeCount: stats.nodeCount,
    triangleCount: stats.triangleCount,
    vertexCount: stats.vertexCount,
    componentIds: [...new Set(objects.map((o) => o.extras.componentId))],
    meshIds: objects.map((o) => o.name),
  });
}

const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
for (const layer of layerNames) {
  for (const object of layers.get(layer)) {
    for (let i = 0; i < 3; i++) {
      bounds.min[i] = Math.min(bounds.min[i], object.bounds.min[i] + object.translation[i]);
      bounds.max[i] = Math.max(bounds.max[i], object.bounds.max[i] + object.translation[i]);
    }
  }
}

const round = (n) => Math.round(n * 1e4) / 1e4;

const manifest = {
  schemaVersion: 1,
  engineVariantId,
  modelRevision: recipes.revision,
  units: inventory.units,
  frame: engine.frame.axes,
  generator: 'modeling/wrenchwise/build_assembly.mjs',
  evidence: recipes.evidence,
  geometryNote:
    'Low-polygon procedural geometry for instruction. Tooth, groove and segment counts are tessellation ' +
    'choices derived from stated illustrative pitches, not part data. No dimension is measured.',
  loadOrder: layerNames,
  bounds: { min: bounds.min.map(round), max: bounds.max.map(round) },
  files,
  components: records,
  buildNotes: notes,
  componentCount: records.length,
  meshCount: files.reduce((sum, f) => sum + f.nodeCount, 0),
  triangleCount: files.reduce((sum, f) => sum + f.triangleCount, 0),
};

const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
const illustration = buildIllustration({
  layers,
  records,
  engineVariantId,
  modelRevision: recipes.revision,
});

if (check) {
  let failures = 0;
  for (const entry of files) {
    const target = path.join(outDir, entry.file);
    if (!fs.existsSync(target)) {
      console.error(`FAIL: ${entry.file} has not been exported to ${outDir}`);
      failures++;
      continue;
    }
    const onDisk = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    if (onDisk !== entry.sha256) {
      console.error(`FAIL: ${entry.file} is stale. Re-run build_assembly.mjs and commit the result.`);
      failures++;
    }
  }
  for (const [name, text] of [['assembly.json', manifestText], ['layout.svg', illustration]]) {
    const target = path.join(outDir, name);
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== text) {
      console.error(`FAIL: ${name} is stale. Re-run build_assembly.mjs and commit the result.`);
      failures++;
    }
  }
  if (failures) process.exit(1);
  console.log(`Assembly ${engineVariantId}/${revisionDir} is up to date.`);
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
for (const entry of files) {
  fs.writeFileSync(path.join(outDir, entry.file), built.get(entry.layer));
}
fs.writeFileSync(path.join(outDir, 'assembly.json'), manifestText);
fs.writeFileSync(path.join(outDir, 'layout.svg'), illustration);

console.log(`Engine: ${engineVariantId}  revision: ${recipes.revision}`);
for (const entry of files) {
  console.log(
    `  ${entry.file.padEnd(12)} ${String(entry.nodeCount).padStart(3)} meshes  ` +
      `${String(entry.triangleCount).padStart(6)} tris  ${(entry.byteLength / 1024).toFixed(1)} KB`,
  );
}
console.log(`  components: ${manifest.componentCount}  total triangles: ${manifest.triangleCount}`);
console.log(`  bounds: ${JSON.stringify(manifest.bounds)}`);
for (const note of notes) console.log(`  note: ${note}`);
console.log(`Written to ${outDir}`);
