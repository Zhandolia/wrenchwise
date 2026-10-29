// Validate content JSON files: sources, configurations, engines, components and procedures.
// Checks cross-references, required fields, and content-specific rules.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
let errors = 0;
const fail = (msg) => { console.error('FAIL:', msg); errors++; };
const info = (msg) => console.log('  ok:', msg);

// --- Sources ---
const sources = read('content/sources.json');
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
for (const f of fs.readdirSync(compDir).filter(f => f.endsWith('.json'))) {
  const inv = read(`content/components/${f}`);
  if (!inv.engineVariantId) { fail(`Inventory ${f}: missing engineVariantId`); continue; }
  if (!engineIds.has(inv.engineVariantId)) fail(`Inventory ${f}: unknown engine "${inv.engineVariantId}"`);
  const localIds = new Set();
  for (const c of inv.components) {
    if (!c.id) { fail(`Component in ${f}: missing id`); continue; }
    if (localIds.has(c.id)) fail(`Component ${c.id}: duplicate in ${f}`);
    localIds.add(c.id);
    allComponentIds.add(c.id);
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
for (const f of fs.readdirSync(procDir).filter(f => f.endsWith('.json'))) {
  const proc = read(`content/procedures/${f}`);
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
  info(`Procedure ${proc.id}: ${proc.steps.length} steps, ${proc.contentStatus}`);
}

console.log(`\n${errors ? errors + ' error(s)' : 'All checks passed'}`);
process.exit(errors ? 1 : 0);

