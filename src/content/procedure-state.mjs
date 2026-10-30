// Procedure state: the scene state at a step, and the progress a user can
// resume. Pure functions, so the same step always produces the same scene and
// backward navigation is not a special case.
//
// Two kinds of step `view` entry, deliberately separated:
//   remove / restore — procedural, cumulative across steps 0..n
//   hide / highlight / explode / camera — viewing aids, step-local

export const PROGRESS_VERSION = 2;

/**
 * Scene state at `stepIndex`, folded over every step up to it.
 * @param {{id:string,view:{camera?:string,remove?:string[],restore?:string[],hide?:string[],highlight?:string[],explode?:boolean}}[]} steps
 * @param {number} stepIndex
 */
export function computeAssemblyState(steps, stepIndex) {
  const index = Math.max(0, Math.min(steps.length - 1, stepIndex));
  const removed = new Set();
  for (let i = 0; i <= index; i++) {
    for (const id of steps[i].view.remove ?? []) removed.add(id);
    for (const id of steps[i].view.restore ?? []) removed.delete(id);
  }
  const view = steps[index].view;
  return {
    removed,
    hidden: new Set(view.hide ?? []),
    highlighted: new Set(view.highlight ?? []),
    camera: view.camera ?? 'iso',
    explode: view.explode === true,
  };
}

/**
 * Components the step wants the camera to frame: the highlighted ones if it
 * names any, otherwise the components the step talks about.
 * @param {{componentIds?:string[],view:{highlight?:string[]}}} step
 */
export function focusComponentIds(step) {
  const highlighted = step.view.highlight ?? [];
  return highlighted.length ? highlighted : step.componentIds ?? [];
}

/** @param {{id:string,revision:number}} procedure */
export function progressStorageKey(procedure) {
  return `wrenchwise.progress.v${PROGRESS_VERSION}.${procedure.id}.r${procedure.revision}`;
}

/** The three parts of the flow a user can be in. */
export const SECTIONS = ['preparation', 'steps', 'final'];

function emptyProgress() {
  return { section: 'preparation', stepIndex: 0, preparation: [], steps: {}, finalChecks: [] };
}

/**
 * Read saved progress, discarding anything that no longer matches the
 * procedure. A revision change produces a fresh start rather than restoring a
 * step that has moved.
 * @param {string|null} raw
 * @param {{id:string,revision:number,preparation:{checklist:{id:string}[]},steps:{id:string,completionChecks:{id:string}[]}[],finalChecks:{id:string}[]}} procedure
 */
export function readProgress(raw, procedure) {
  if (!raw) return emptyProgress();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyProgress();
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyProgress();
  if (parsed.version !== PROGRESS_VERSION) return emptyProgress();
  if (parsed.procedureId !== procedure.id || parsed.revision !== procedure.revision) {
    return emptyProgress();
  }

  const stepIndex = Number.isInteger(parsed.stepIndex)
    && parsed.stepIndex >= 0
    && parsed.stepIndex < procedure.steps.length
    ? parsed.stepIndex
    : 0;

  const keep = (value, allowed) =>
    Array.isArray(value) ? [...new Set(value.filter((id) => allowed.has(id)))] : [];

  const preparation = keep(parsed.preparation, new Set(procedure.preparation.checklist.map((c) => c.id)));
  const finalChecks = keep(parsed.finalChecks, new Set(procedure.finalChecks.map((c) => c.id)));

  const steps = {};
  if (parsed.steps && typeof parsed.steps === 'object' && !Array.isArray(parsed.steps)) {
    for (const step of procedure.steps) {
      const allowed = new Set(step.completionChecks.map((c) => c.id));
      const kept = keep(parsed.steps[step.id], allowed);
      if (kept.length) steps[step.id] = kept;
    }
  }

  const section = SECTIONS.includes(parsed.section) ? parsed.section : 'preparation';

  return { section, stepIndex, preparation, steps, finalChecks };
}

/**
 * @param {{stepIndex:number,preparation:string[],steps:Record<string,string[]>,finalChecks:string[]}} progress
 * @param {{id:string,revision:number}} procedure
 */
export function serializeProgress(progress, procedure) {
  return JSON.stringify({
    version: PROGRESS_VERSION,
    procedureId: procedure.id,
    revision: procedure.revision,
    section: progress.section,
    stepIndex: progress.stepIndex,
    preparation: progress.preparation,
    steps: progress.steps,
    finalChecks: progress.finalChecks,
    savedAt: new Date().toISOString(),
  });
}

/** @param {{section:string,stepIndex:number}} progress @param {number} index @param {number} count */
export function setStepIndex(progress, index, count) {
  const next = Math.max(0, Math.min(count - 1, index));
  if (next === progress.stepIndex && progress.section === 'steps') return progress;
  return { ...progress, section: 'steps', stepIndex: next };
}

/** @param {{section:string}} progress @param {'preparation'|'steps'|'final'} section */
export function setSection(progress, section) {
  if (!SECTIONS.includes(section) || progress.section === section) return progress;
  return { ...progress, section };
}

/**
 * Move one position through preparation → steps → final checks.
 * @param {{section:string,stepIndex:number}} progress @param {number} delta @param {number} stepCount
 */
export function advance(progress, delta, stepCount) {
  const flat = progress.section === 'preparation'
    ? 0
    : progress.section === 'final'
      ? stepCount + 1
      : progress.stepIndex + 1;
  const next = Math.max(0, Math.min(stepCount + 1, flat + delta));
  if (next === 0) return { ...progress, section: 'preparation' };
  if (next === stepCount + 1) return { ...progress, section: 'final' };
  return { ...progress, section: 'steps', stepIndex: next - 1 };
}

/**
 * Toggle one completion check. `scope` is a step id, or 'preparation' / 'finalChecks'.
 * @param {{preparation:string[],steps:Record<string,string[]>,finalChecks:string[]}} progress
 */
export function toggleCheck(progress, scope, checkId) {
  const flip = (list) =>
    list.includes(checkId) ? list.filter((id) => id !== checkId) : [...list, checkId];
  if (scope === 'preparation') return { ...progress, preparation: flip(progress.preparation) };
  if (scope === 'finalChecks') return { ...progress, finalChecks: flip(progress.finalChecks) };
  const next = flip(progress.steps[scope] ?? []);
  const steps = { ...progress.steps };
  if (next.length) steps[scope] = next;
  else delete steps[scope];
  return { ...progress, steps };
}

/**
 * @param {{preparation:string[],steps:Record<string,string[]>,finalChecks:string[]}} progress
 * @param {{preparation:{checklist:{id:string}[]},steps:{id:string,completionChecks:{id:string}[]}[],finalChecks:{id:string}[]}} procedure
 */
export function progressSummary(progress, procedure) {
  const stepTotal = procedure.steps.reduce((sum, step) => sum + step.completionChecks.length, 0);
  const stepDone = procedure.steps.reduce(
    (sum, step) => sum + (progress.steps[step.id]?.length ?? 0),
    0,
  );
  const stepsComplete = procedure.steps.filter(
    (step) => step.completionChecks.length > 0
      && (progress.steps[step.id]?.length ?? 0) === step.completionChecks.length,
  ).length;
  return {
    preparation: { done: progress.preparation.length, total: procedure.preparation.checklist.length },
    checks: { done: stepDone, total: stepTotal },
    steps: { done: stepsComplete, total: procedure.steps.length },
    finalChecks: { done: progress.finalChecks.length, total: procedure.finalChecks.length },
  };
}

/** Whether every completion check of a step is ticked. */
export function stepComplete(progress, step) {
  if (!step.completionChecks.length) return false;
  return (progress.steps[step.id]?.length ?? 0) === step.completionChecks.length;
}

/**
 * Prerequisite steps that are not yet complete. Navigation is never blocked —
 * a mechanic may read ahead — but the guide says what is outstanding.
 * @param {{steps:Record<string,string[]>}} progress
 */
export function outstandingPrerequisites(progress, procedure, step) {
  return (step.prerequisites ?? [])
    .map((id) => procedure.steps.find((candidate) => candidate.id === id))
    .filter((candidate) => candidate && !stepComplete(progress, candidate));
}
