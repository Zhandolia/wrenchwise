// The library view: what the platform covers, and what it does not.
//
// Wrenchwise is a reference for engines and the jobs done on them. One engine
// variant happens to be the first one carried through to a complete procedure;
// nothing here is specific to it. Both lists below are derived from content,
// so a new engine appears without touching this file.

/**
 * Engine variants with content, each with the vehicles it is recorded in and
 * what is actually available for it.
 *
 * @param {{engines:any[], configurations:any[], procedures:any[], inventories:any[]}} content
 */
export function coveredEngines({ engines, configurations, procedures, inventories }) {
  return engines
    .map((engine) => {
      const installed = engine.installedIn
        .map((id) => configurations.find((configuration) => configuration.id === id))
        .filter(Boolean);
      const jobs = procedures.filter((procedure) => procedure.engineVariantId === engine.id);
      const inventory = inventories.find((entry) => entry.engineVariantId === engine.id);
      const components = inventory?.components ?? [];
      const systems = [...new Set(components.map((component) => component.system))].sort();
      return {
        engine,
        configurations: installed,
        jobs,
        componentCount: components.length,
        systems,
        // An engine with an inventory but no procedure is a reference, not a job.
        status: jobs.length ? 'jobs' : components.length ? 'reference-only' : 'declared',
      };
    })
    .sort((a, b) => b.jobs.length - a.jobs.length || a.engine.label.localeCompare(b.engine.label));
}

/**
 * Variants the content explicitly says are *not* interchangeable with a
 * covered one. This is the project's central mechanical rule turned into
 * navigation: a shared family name is not shared parts, so each of these needs
 * its own configuration record, inventory and procedure before anything here
 * applies to it.
 *
 * @param {{engines:any[]}} content
 */
export function excludedVariants({ engines }) {
  const rows = [];
  for (const engine of engines) {
    for (const entry of engine.notEquivalentTo ?? []) {
      rows.push({
        id: `${engine.id}::${entry.variant}`,
        variant: entry.variant,
        reason: entry.reason,
        distinctFrom: engine.label,
      });
    }
  }
  return rows;
}

/** Headline counts for the library, all derived rather than written down. */
export function librarySummary(content) {
  const covered = coveredEngines(content);
  return {
    engines: covered.length,
    enginesWithJobs: covered.filter((entry) => entry.status === 'jobs').length,
    vehicles: new Set(content.configurations.map((configuration) => configuration.id)).size,
    jobs: content.procedures.length,
    components: content.inventories.reduce((sum, inventory) => sum + inventory.components.length, 0),
    steps: content.procedures.reduce((sum, procedure) => sum + procedure.steps.length, 0),
    excluded: excludedVariants(content).length,
  };
}

/** Phase order for a procedure's progress rail, in the order they are used. */
export function proceduresPhases(procedure) {
  const phases = [];
  for (const [index, step] of procedure.steps.entries()) {
    const last = phases[phases.length - 1];
    if (last && last.phase === step.phase) {
      last.stepIndexes.push(index);
      continue;
    }
    phases.push({ phase: step.phase, stepIndexes: [index] });
  }
  return phases;
}
