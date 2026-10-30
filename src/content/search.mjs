// Search across jobs, components and engines. Pure, so it can be tested
// without a browser and reused by the index and the guide's part list.

const compact = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * One searchable row. `kind` drives how the index renders it; `terms` is the
 * pre-compacted haystack.
 * @typedef {{kind:'job'|'component'|'engine', id:string, label:string, detail:string,
 *   system:string, status:string, terms:string, procedureId?:string, stepId?:string}} SearchEntry
 */

/**
 * @param {{procedures:any[], inventories:any[], engines:any[], configurations:any[]}} content
 * @returns {SearchEntry[]}
 */
export function buildSearchIndex({ procedures, inventories, engines, configurations }) {
  const entries = [];
  const configLabel = (ids) =>
    ids
      .map((id) => configurations.find((c) => c.id === id)?.label ?? id)
      .join(', ');

  for (const procedure of procedures) {
    const engine = engines.find((e) => e.id === procedure.engineVariantId);
    entries.push({
      kind: 'job',
      id: procedure.id,
      label: procedure.title,
      detail: `${engine?.label ?? procedure.engineVariantId} · ${configLabel(procedure.configurationIds)}`,
      system: procedure.system,
      status: procedure.contentStatus,
      procedureId: procedure.id,
      terms: compact(
        [
          procedure.title,
          procedure.system,
          engine?.label,
          engine?.code,
          engine?.variant,
          configLabel(procedure.configurationIds),
          ...(procedure.keywords ?? []),
          ...procedure.steps.map((step) => step.title),
        ].join(' '),
      ),
    });
  }

  for (const engine of engines) {
    entries.push({
      kind: 'engine',
      id: engine.id,
      label: engine.label,
      detail: [engine.layout, configLabel(engine.installedIn)].filter(Boolean).join(' · '),
      system: 'engine',
      status: 'reference',
      terms: compact(
        [engine.label, engine.code, engine.variant, engine.family, engine.layout, configLabel(engine.installedIn)].join(' '),
      ),
    });
  }

  for (const inventory of inventories) {
    const engine = engines.find((e) => e.id === inventory.engineVariantId);
    for (const component of inventory.components) {
      const step = procedures
        .flatMap((procedure) => procedure.steps.map((s) => ({ procedure, step: s })))
        .find((pair) => (component.procedureStepIds ?? []).includes(pair.step.id));
      entries.push({
        kind: 'component',
        id: component.id,
        label: component.name,
        detail: `${component.system.replace(/-/g, ' ')} · ${component.kind}${engine ? ` · ${engine.label}` : ''}`,
        system: component.system,
        status: component.verification.identity.status,
        procedureId: step?.procedure.id,
        stepId: step?.step.id,
        terms: compact(
          [component.name, component.id, component.system, component.kind, component.description ?? ''].join(' '),
        ),
      });
    }
  }

  return entries;
}

/**
 * All query terms must appear. An empty query returns everything, so the index
 * is a browsable list rather than an empty search page.
 * @param {SearchEntry[]} entries
 */
export function searchEntries(entries, query, { kind = 'all', system = 'all' } = {}) {
  const terms = compact(query).split(' ').filter(Boolean);
  return entries.filter((entry) => {
    if (kind !== 'all' && entry.kind !== kind) return false;
    if (system !== 'all' && entry.system !== system) return false;
    return terms.every((term) => entry.terms.includes(term));
  });
}

/** Distinct systems present in the index, for the filter control. */
export function indexSystems(entries) {
  return [...new Set(entries.map((entry) => entry.system))].sort();
}
