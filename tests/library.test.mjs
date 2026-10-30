import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  coveredEngines,
  excludedVariants,
  librarySummary,
  proceduresPhases,
} from '../src/content/library.mjs';

const readAll = (dir) =>
  fs.readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));

const content = {
  procedures: readAll('content/procedures'),
  inventories: readAll('content/components'),
  engines: readAll('content/engines'),
  configurations: readAll('content/configurations'),
};

test('the library lists engines, not vehicles, and says what each one has', () => {
  const covered = coveredEngines(content);
  assert.equal(covered.length, content.engines.length);
  for (const entry of covered) {
    assert.ok(entry.engine.label);
    // Every configuration an engine claims must resolve to a real record.
    assert.equal(entry.configurations.length, entry.engine.installedIn.length);
    assert.ok(entry.systems.length > 0 || entry.componentCount === 0);
  }
});

test('an engine with jobs sorts above one with only a component reference', () => {
  const withJobs = { ...content.engines[0], id: 'has-jobs', label: 'Zed engine', installedIn: [] };
  const withoutJobs = { ...content.engines[0], id: 'no-jobs', label: 'Alpha engine', installedIn: [] };
  const covered = coveredEngines({
    ...content,
    engines: [withoutJobs, withJobs],
    inventories: [{ engineVariantId: 'no-jobs', components: [] }],
    procedures: [{ ...content.procedures[0], engineVariantId: 'has-jobs' }],
  });
  assert.deepEqual(covered.map((entry) => entry.engine.id), ['has-jobs', 'no-jobs']);
  assert.equal(covered[0].status, 'jobs');
  assert.equal(covered[1].status, 'declared');
});

test('every variant an engine rules out becomes a coverage entry with its reason', () => {
  const excluded = excludedVariants(content);
  const declared = content.engines.reduce((sum, engine) => sum + engine.notEquivalentTo.length, 0);
  assert.equal(excluded.length, declared);
  for (const entry of excluded) {
    assert.ok(entry.variant && entry.reason && entry.distinctFrom);
  }
  assert.ok(
    excluded.some((entry) => /2JZ-GTE/.test(entry.variant)),
    'a shared family name does not imply shared parts, and the library says so',
  );
});

test('library counts are derived, never written down', () => {
  const summary = librarySummary(content);
  assert.equal(summary.jobs, content.procedures.length);
  assert.equal(summary.vehicles, content.configurations.length);
  assert.equal(
    summary.steps,
    content.procedures.reduce((sum, procedure) => sum + procedure.steps.length, 0),
  );
  assert.equal(
    summary.components,
    content.inventories.reduce((sum, inventory) => sum + inventory.components.length, 0),
  );
  assert.equal(summary.excluded, excludedVariants(content).length);
});

test('phases group consecutive steps and cover every step exactly once', () => {
  const procedure = content.procedures[0];
  const phases = proceduresPhases(procedure);
  const flattened = phases.flatMap((group) => group.stepIndexes);
  assert.deepEqual(flattened, procedure.steps.map((_, index) => index));
  for (const group of phases) {
    for (const index of group.stepIndexes) {
      assert.equal(procedure.steps[index].phase, group.phase);
    }
  }
  assert.ok(phases.length > 1 && phases.length < procedure.steps.length);
});

test('a phase that recurs later opens a new segment rather than merging', () => {
  const procedure = {
    steps: [
      { phase: 'access' },
      { phase: 'removal' },
      { phase: 'access' },
    ],
  };
  const phases = proceduresPhases(procedure);
  assert.deepEqual(
    phases.map((group) => [group.phase, group.stepIndexes]),
    [['access', [0]], ['removal', [1]], ['access', [2]]],
  );
});
