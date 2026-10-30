import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildSearchIndex, indexSystems, searchEntries } from '../src/content/search.mjs';

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

const index = buildSearchIndex(content);

test('the index covers every job, engine and component', () => {
  const jobs = index.filter((entry) => entry.kind === 'job');
  const engines = index.filter((entry) => entry.kind === 'engine');
  const components = index.filter((entry) => entry.kind === 'component');
  assert.equal(jobs.length, content.procedures.length);
  assert.equal(engines.length, content.engines.length);
  assert.equal(
    components.length,
    content.inventories.reduce((sum, inventory) => sum + inventory.components.length, 0),
  );
});

test('a job is findable by title, by keyword and by a step title', () => {
  for (const query of ['timing belt', 'cam belt', 'hydraulic tensioner', 'vvt-i']) {
    const hits = searchEntries(index, query, { kind: 'job' });
    assert.equal(hits.length, 1, `"${query}" should find the timing-belt job`);
    assert.equal(hits[0].id, '2jz-ge-vvti-timing-belt');
  }
});

test('every term must match, and an empty query lists everything', () => {
  assert.equal(searchEntries(index, '').length, index.length);
  assert.equal(searchEntries(index, 'timing belt definitely-not-a-part').length, 0);
  const pump = searchEntries(index, 'water pump', { kind: 'component' });
  assert.ok(pump.length >= 1);
  assert.ok(pump.every((entry) => entry.terms.includes('water') && entry.terms.includes('pump')));
});

test('punctuation and case do not change a match', () => {
  const plain = searchEntries(index, 'vvti controller', { kind: 'component' });
  const noisy = searchEntries(index, '  VVT-i   Controller!! ', { kind: 'component' });
  assert.deepEqual(plain.map((entry) => entry.id), noisy.map((entry) => entry.id));
});

test('filters narrow by type and by system', () => {
  const timing = searchEntries(index, '', { kind: 'component', system: 'timing-drive' });
  assert.ok(timing.length > 5);
  assert.ok(timing.every((entry) => entry.system === 'timing-drive'));
  assert.ok(indexSystems(index).includes('timing-drive'));
  assert.equal(searchEntries(index, '', { kind: 'engine', system: 'timing-drive' }).length, 0);
});

test('a component that a step uses links to that step', () => {
  const tensioner = index.find((entry) => entry.kind === 'component' && entry.id === 'timing-belt-tensioner');
  assert.equal(tensioner.procedureId, '2jz-ge-vvti-timing-belt');
  assert.ok(tensioner.stepId, 'the tensioner is reachable from a step');
});
