import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  advance,
  computeAssemblyState,
  focusComponentIds,
  outstandingPrerequisites,
  progressStorageKey,
  progressSummary,
  readProgress,
  serializeProgress,
  setSection,
  setStepIndex,
  stepComplete,
  toggleCheck,
} from '../src/content/procedure-state.mjs';

const procedure = JSON.parse(
  fs.readFileSync('content/procedures/2jz-ge-vvti-timing-belt.json', 'utf8'),
);

test('removal is cumulative and viewing aids are step-local', () => {
  const atRadiator = computeAssemblyState(procedure.steps, 1);
  assert.ok(atRadiator.removed.has('engine-under-cover'), 'step 0 removal still applies at step 1');
  assert.ok(atRadiator.removed.has('radiator-assembly'));
  assert.deepEqual([...atRadiator.hidden], [], 'step 1 hides nothing');

  const installCam = procedure.steps.findIndex((step) => step.id === 'install-cam');
  const atInstallCam = computeAssemblyState(procedure.steps, installCam);
  assert.ok(atInstallCam.hidden.has('timing-belt'), 'hide is a viewing aid for this step');
  assert.ok(!atInstallCam.removed.has('timing-belt'), 'the belt was refitted, so it is not removed');

  const next = computeAssemblyState(procedure.steps, installCam + 1);
  assert.ok(!next.hidden.has('timing-belt'), 'the viewing aid does not carry into the next step');
});

test('while reading a step, the parts it removes are still fitted', () => {
  const index = procedure.steps.findIndex((step) => step.id === 'release-tensioner');
  const settled = computeAssemblyState(procedure.steps, index);
  const pending = computeAssemblyState(procedure.steps, index, { pending: true });

  assert.ok(settled.removed.has('timing-belt-tensioner'), 'after the step, the tensioner is off');
  assert.ok(!pending.removed.has('timing-belt-tensioner'), 'while reading it, the tensioner is still there');
  // Everything earlier steps took off stays off either way.
  assert.ok(pending.removed.has('radiator-assembly'));
  assert.ok(pending.removed.has('engine-under-cover'));

  // An installation step shows its refits in place, pending or not.
  const install = procedure.steps.findIndex((step) => step.id === 'install-lower');
  const pendingInstall = computeAssemblyState(procedure.steps, install, { pending: true });
  assert.ok(!pendingInstall.removed.has('timing-belt-idler'), 'the idler is shown refitted');
});

test('the state at a step is the same whichever way it was reached', () => {
  const index = procedure.steps.findIndex((step) => step.id === 'inspect');
  const forward = computeAssemblyState(procedure.steps, index);
  const afterGoingPastAndBack = computeAssemblyState(procedure.steps, index);
  assert.deepEqual([...forward.removed].sort(), [...afterGoingPastAndBack.removed].sort());
  assert.equal(forward.explode, true, 'the inspection step asks for an explanatory separation');
});

test('every step restores what it claims and nothing is removed twice', () => {
  const present = new Set();
  for (const step of procedure.steps) {
    for (const id of step.view.remove ?? []) {
      assert.ok(!present.has(id), `${step.id} removes ${id} twice`);
      present.add(id);
    }
    for (const id of step.view.restore ?? []) {
      assert.ok(present.has(id), `${step.id} restores ${id}, which was never removed`);
      present.delete(id);
    }
  }
});

test('a step frames its highlighted parts, or the parts it talks about', () => {
  const crankBolt = procedure.steps.find((step) => step.id === 'crank-bolt');
  assert.deepEqual(focusComponentIds(crankBolt), ['crankshaft-pulley-bolt', 'crankshaft-pulley']);
  const noHighlight = { componentIds: ['a'], view: { camera: 'iso' } };
  assert.deepEqual(focusComponentIds(noHighlight), ['a']);
});

test('saved progress survives a reload and rejects anything that no longer fits', () => {
  const fresh = readProgress(null, procedure);
  assert.deepEqual(fresh, { section: 'preparation', stepIndex: 0, preparation: [], steps: {}, finalChecks: [] });

  const moved = setStepIndex(fresh, 4, procedure.steps.length);
  const checked = toggleCheck(moved, procedure.steps[4].id, procedure.steps[4].completionChecks[0].id);
  const restored = readProgress(serializeProgress(checked, procedure), procedure);
  assert.equal(restored.stepIndex, 4);
  assert.equal(restored.section, 'steps');
  assert.deepEqual(restored.steps[procedure.steps[4].id], [procedure.steps[4].completionChecks[0].id]);

  for (const corrupt of ['not json', 'null', '[]', '{}', '{"version":2}']) {
    assert.deepEqual(readProgress(corrupt, procedure), fresh, `rejected: ${corrupt}`);
  }

  const otherRevision = JSON.parse(serializeProgress(checked, procedure));
  otherRevision.revision = procedure.revision + 1;
  assert.deepEqual(
    readProgress(JSON.stringify(otherRevision), procedure),
    fresh,
    'a revision change starts clean rather than restoring a step that has moved',
  );

  const outOfRange = JSON.parse(serializeProgress(checked, procedure));
  outOfRange.stepIndex = 900;
  outOfRange.steps = { 'deleted-step': ['x'], [procedure.steps[0].id]: ['not-a-check'] };
  const cleaned = readProgress(JSON.stringify(outOfRange), procedure);
  assert.equal(cleaned.stepIndex, 0);
  assert.deepEqual(cleaned.steps, {});
});

test('the storage key changes with the procedure revision', () => {
  assert.equal(progressStorageKey(procedure), `wrenchwise.progress.v2.${procedure.id}.r${procedure.revision}`);
  assert.notEqual(
    progressStorageKey({ ...procedure, revision: procedure.revision + 1 }),
    progressStorageKey(procedure),
  );
});

test('navigation runs preparation, steps, final checks and stops at both ends', () => {
  const count = procedure.steps.length;
  let progress = readProgress(null, procedure);
  assert.equal(advance(progress, -1, count).section, 'preparation');

  progress = advance(progress, 1, count);
  assert.deepEqual([progress.section, progress.stepIndex], ['steps', 0]);

  progress = { ...progress, section: 'steps', stepIndex: count - 1 };
  progress = advance(progress, 1, count);
  assert.equal(progress.section, 'final');
  assert.equal(advance(progress, 1, count).section, 'final', 'the final section is the end');

  progress = advance(progress, -1, count);
  assert.deepEqual([progress.section, progress.stepIndex], ['steps', count - 1]);

  assert.equal(setSection(progress, 'nowhere'), progress, 'an unknown section is ignored');
});

test('progress counts and prerequisites reflect what is actually ticked', () => {
  let progress = readProgress(null, procedure);
  const first = procedure.steps[0];
  const second = procedure.steps[1];
  assert.equal(stepComplete(progress, first), false);
  assert.deepEqual(
    outstandingPrerequisites(progress, procedure, second).map((step) => step.id),
    [first.id],
  );

  for (const check of first.completionChecks) progress = toggleCheck(progress, first.id, check.id);
  assert.equal(stepComplete(progress, first), true);
  assert.deepEqual(outstandingPrerequisites(progress, procedure, second), []);

  const summary = progressSummary(progress, procedure);
  assert.equal(summary.steps.done, 1);
  assert.equal(summary.steps.total, procedure.steps.length);
  assert.equal(summary.checks.done, first.completionChecks.length);

  progress = toggleCheck(progress, first.id, first.completionChecks[0].id);
  assert.equal(stepComplete(progress, first), false, 'ticking again clears the check');
});
