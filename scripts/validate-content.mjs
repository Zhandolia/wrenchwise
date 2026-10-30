// Validate content JSON files: sources, configurations, engines, components and procedures.
// Checks cross-references, required fields, and content-specific rules.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, unknownKeywords } from './lib/json-schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
let errors = 0;
const fail = (msg) => { console.error('FAIL:', msg); errors++; };
const info = (msg) => console.log('  ok:', msg);

// --- Schemas ---
// Each content file declares its schema with $schema; the schema is applied
// here so a typo in a field name fails the build rather than being ignored by
// the loader at runtime.
const schemaDir = path.join(root, 'content/schema');
const schemas = {};
for (const file of fs.readdirSync(schemaDir).filter((f) => f.endsWith('.schema.json'))) {
  const schema = read(`content/schema/${file}`);
  const unknown = unknownKeywords(schema);
  if (unknown.length) {
    fail(`Schema ${file}: keyword(s) the validator does not implement: ${unknown.join(', ')}`);
  }
  schemas[file.replace('.schema.json', '')] = schema;
}
info(`${Object.keys(schemas).length} schemas`);

const checkSchema = (rel, schemaName, data) => {
  const schema = schemas[schemaName];
  if (!schema) { fail(`${rel}: no schema named "${schemaName}"`); return; }
  for (const message of validate(data, schema)) fail(`${rel} ${message}`);
};

// --- Sources ---
const sources = read('content/sources.json');
checkSchema('content/sources.json', 'sources', sources);
const releases = read('content/releases.json');
checkSchema('content/releases.json', 'releases', releases);
const sourceIds = new Set(sources.sources.map(s => s.id));
info(`${sourceIds.size} sources`);
for (const s of sources.sources) {
  if (!s.id || !s.title || !s.publisher || !s.kind) fail(`Source ${s.id}: missing required field`);
  if (!s.usageRights?.status) fail(`Source ${s.id}: missing usageRights.status`);
  if (!s.permittedUses?.length) fail(`Source ${s.id}: missing permittedUses`);
}

// --- Configurations ---
const configDir = path.join(root, 'content/configurations');
const configIds = new Set();
for (const f of fs.readdirSync(configDir).filter(f => f.endsWith('.json'))) {
  const cfg = read(`content/configurations/${f}`);
  checkSchema(`content/configurations/${f}`, 'configuration', cfg);
  if (!cfg.id) { fail(`Config ${f}: missing id`); continue; }
  configIds.add(cfg.id);
  if (!cfg.engineVariantId) fail(`Config ${cfg.id}: missing engineVariantId`);
  for (const sid of cfg.sourceIds || []) {
    if (!sourceIds.has(sid)) fail(`Config ${cfg.id}: unknown sourceId "${sid}"`);
  }
  info(`Config: ${cfg.id}`);
}

// --- Engines ---
const engineDir = path.join(root, 'content/engines');
const engineIds = new Set();
for (const f of fs.readdirSync(engineDir).filter(f => f.endsWith('.json'))) {
  const eng = read(`content/engines/${f}`);
  checkSchema(`content/engines/${f}`, 'engine', eng);
  if (!eng.id) { fail(`Engine ${f}: missing id`); continue; }
  engineIds.add(eng.id);
  for (const cid of eng.installedIn || []) {
    if (!configIds.has(cid)) fail(`Engine ${eng.id}: references unknown config "${cid}"`);
  }
  for (const sid of eng.sourceIds || []) {
    if (!sourceIds.has(sid)) fail(`Engine ${eng.id}: unknown sourceId "${sid}"`);
  }
  if (!eng.frame?.units || !eng.frame?.origin) fail(`Engine ${eng.id}: missing frame definition`);
  info(`Engine: ${eng.id}`);
}

// --- Components ---
const compDir = path.join(root, 'content/components');
const allComponentIds = new Set();
const componentStepIds = new Map();
for (const f of fs.readdirSync(compDir).filter(f => f.endsWith('.json'))) {
  const inv = read(`content/components/${f}`);
  checkSchema(`content/components/${f}`, 'components', inv);
  if (!inv.engineVariantId) { fail(`Inventory ${f}: missing engineVariantId`); continue; }
  if (!engineIds.has(inv.engineVariantId)) fail(`Inventory ${f}: unknown engine "${inv.engineVariantId}"`);
  const localIds = new Set();
  for (const c of inv.components) {
    if (!c.id) { fail(`Component in ${f}: missing id`); continue; }
    if (localIds.has(c.id)) fail(`Component ${c.id}: duplicate in ${f}`);
    localIds.add(c.id);
    allComponentIds.add(c.id);
    componentStepIds.set(c.id, c.procedureStepIds || []);
    if (!c.name) fail(`Component ${c.id}: missing name`);
    if (!c.system) fail(`Component ${c.id}: missing system`);
    if (!c.kind) fail(`Component ${c.id}: missing kind`);
    if (c.parentId && !localIds.has(c.parentId) && !inv.components.some(x => x.id === c.parentId)) {
      fail(`Component ${c.id}: parent "${c.parentId}" not found`);
    }
    // Verify source references
    for (const sid of c.sourceIds || []) {
      if (!sourceIds.has(sid)) fail(`Component ${c.id}: unknown sourceId "${sid}"`);
    }
    // Verify each verification axis
    for (const axis of ['identity', 'dimensions', 'placement', 'fitment', 'procedure']) {
      const v = c.verification?.[axis];
      if (!v) { fail(`Component ${c.id}: missing verification.${axis}`); continue; }
      if (!v.status) fail(`Component ${c.id}: verification.${axis} missing status`);
      for (const sid of v.sourceIds || []) {
        if (!sourceIds.has(sid)) fail(`Component ${c.id}: verification.${axis} unknown sourceId "${sid}"`);
      }
    }
    // Check that "measured" dimensions have a measurement source
    if (c.dimensions?.status === 'measured') {
      const hasMeasurement = (c.dimensions.sourceIds || []).some(sid => {
        const src = sources.sources.find(s => s.id === sid);
        return src && (src.permittedUses || []).includes('dimensions');
      });
      if (!hasMeasurement) fail(`Component ${c.id}: claims "measured" dimensions but no source permits dimensional use`);
    }
  }
  info(`Inventory ${inv.engineVariantId}: ${inv.components.length} components`);
}

// --- Procedures ---
const procDir = path.join(root, 'content/procedures');
const procedureIds = new Set();
for (const f of fs.readdirSync(procDir).filter(f => f.endsWith('.json'))) {
  const proc = read(`content/procedures/${f}`);
  checkSchema(`content/procedures/${f}`, 'procedure', proc);
  if (!proc.id) { fail(`Procedure ${f}: missing id`); continue; }
  if (!proc.configurationIds?.length) fail(`Procedure ${proc.id}: no configurations`);
  for (const cid of proc.configurationIds) {
    if (!configIds.has(cid)) fail(`Procedure ${proc.id}: unknown config "${cid}"`);
  }
  if (proc.engineVariantId && !engineIds.has(proc.engineVariantId)) {
    fail(`Procedure ${proc.id}: unknown engine "${proc.engineVariantId}"`);
  }
  if (!proc.contentStatus) fail(`Procedure ${proc.id}: missing contentStatus`);
  // Source references
  for (const sr of proc.sources || []) {
    if (!sourceIds.has(sr.sourceId)) fail(`Procedure ${proc.id}: unknown source "${sr.sourceId}"`);
  }
  // Steps
  const stepIds = new Set();
  for (const step of proc.steps) {
    if (!step.id) { fail(`Procedure ${proc.id}: step missing id`); continue; }
    if (stepIds.has(step.id)) fail(`Procedure ${proc.id}: duplicate step "${step.id}"`);
    stepIds.add(step.id);
    // Component references
    for (const compId of step.componentIds || []) {
      if (!allComponentIds.has(compId)) fail(`Procedure ${proc.id} step ${step.id}: unknown component "${compId}"`);
    }
    // View component references
    for (const key of ['remove', 'restore', 'hide', 'highlight']) {
      for (const compId of step.view?.[key] || []) {
        if (!allComponentIds.has(compId)) fail(`Procedure ${proc.id} step ${step.id} view.${key}: unknown component "${compId}"`);
      }
    }
    // Prerequisites
    for (const pre of step.prerequisites || []) {
      if (!stepIds.has(pre)) fail(`Procedure ${proc.id} step ${step.id}: prerequisite "${pre}" not yet defined (must appear before this step)`);
    }
    // Specifications with "not-entered" are expected but flagged
    const notEntered = (step.specifications || []).filter(s => s.status === 'not-entered');
    if (notEntered.length) info(`Procedure ${proc.id} step ${step.id}: ${notEntered.length} specifications not yet entered`);
  }
  // A step may only list tools and replacement parts the procedure declares.
  const toolIds = new Set(proc.tools.map((t) => t.id));
  const partIds = new Set(proc.parts.map((p) => p.id));
  for (const step of proc.steps) {
    for (const id of step.tools || []) {
      if (!toolIds.has(id)) fail(`Procedure ${proc.id} step ${step.id}: unknown tool "${id}"`);
    }
    for (const id of step.replacementParts || []) {
      if (!partIds.has(id)) fail(`Procedure ${proc.id} step ${step.id}: unknown replacement part "${id}"`);
    }
    for (const ref of step.sourceRefs || []) {
      if (!sourceIds.has(ref.sourceId)) fail(`Procedure ${proc.id} step ${step.id}: unknown source "${ref.sourceId}"`);
    }
    for (const spec of step.specifications || []) {
      if (spec.sourceRef && !sourceIds.has(spec.sourceRef.sourceId)) {
        fail(`Procedure ${proc.id} step ${step.id}: specification "${spec.id}" cites unknown source "${spec.sourceRef.sourceId}"`);
      }
      if (spec.status === 'verified' && !spec.sourceRef) {
        fail(`Procedure ${proc.id} step ${step.id}: specification "${spec.id}" is marked verified with no source`);
      }
    }
  }
  // A procedure may not claim verified status without a recorded review.
  if (proc.contentStatus === 'verified') {
    const release = releases.releases.find((r) => r.procedureIds.includes(proc.id));
    if (release?.mechanicalReview?.status !== 'complete') {
      fail(`Procedure ${proc.id}: contentStatus "verified" requires a completed mechanical review in content/releases.json`);
    }
  }
  // Each component's procedureStepIds must agree with the steps that use it.
  for (const step of proc.steps) {
    for (const compId of step.componentIds || []) {
      const declared = componentStepIds.get(compId);
      if (declared && !declared.includes(step.id)) {
        fail(`Component ${compId}: step "${step.id}" references it but the inventory does not list that step`);
      }
    }
  }
  info(`Procedure ${proc.id}: ${proc.steps.length} steps, ${proc.contentStatus}`);
  procedureIds.add(proc.id);
}

// --- Releases ---
for (const release of releases.releases) {
  for (const cid of release.configurationIds) {
    if (!configIds.has(cid)) fail(`Release ${release.id}: unknown configuration "${cid}"`);
  }
  for (const pid of release.procedureIds) {
    if (!procedureIds.has(pid)) fail(`Release ${release.id}: unknown procedure "${pid}"`);
  }
  for (const asset of release.assets) {
    if (!fs.existsSync(path.join(root, asset.path))) {
      fail(`Release ${release.id}: asset "${asset.path}" does not exist`);
    }
  }
  if (release.evidenceStatus !== 'illustrative' && release.mechanicalReview?.status === 'none') {
    fail(`Release ${release.id}: claims "${release.evidenceStatus}" evidence with no mechanical review`);
  }
  info(`Release ${release.id}: ${release.procedureIds.length} procedure(s), ${release.unresolvedGaps.length} open gap(s)`);
}
if (!releases.releases.some((r) => r.id === releases.current)) {
  fail(`content/releases.json: current release "${releases.current}" is not in the list`);
}

console.log(`\n${errors ? errors + ' error(s)' : 'All checks passed'}`);
process.exit(errors ? 1 : 0);

