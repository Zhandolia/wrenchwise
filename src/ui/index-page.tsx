// The reference-book index: pick the configuration, then search jobs,
// components and engines. No promotional copy, no second vehicle chooser.

import { useMemo, useState } from 'react';
import { appPath } from '../../lib/app-path';
import {
  configurations,
  currentRelease,
  enginesById,
  inventoriesByEngine,
  procedures,
  proceduresById,
  searchIndex,
  type Procedure,
} from '../content/catalog';
import { indexSystems, searchEntries } from '../content/search.mjs';
import { progressStorageKey, readProgress } from '../content/procedure-state.mjs';
import { StatusPill } from './evidence';
import './reference.css';

/** Mirrors the SearchEntry typedef in ../content/search.mjs. */
interface SearchEntry {
  kind: 'job' | 'component' | 'engine';
  id: string;
  label: string;
  detail: string;
  system: string;
  status: string;
  /** Pre-compacted haystack used by searchEntries. */
  terms: string;
  procedureId?: string;
  stepId?: string;
}

const KIND_LABEL: Record<string, string> = { job: 'Job', component: 'Part', engine: 'Engine' };

function guideHref(procedureId: string, params: Record<string, string> = {}): string {
  const search = new URLSearchParams({ job: procedureId, ...params });
  return `${appPath('/guide/')}?${search.toString()}`;
}

/** Saved progress for any procedure, so the index can offer to resume. */
function resumableProcedures(): { procedure: Procedure; stepTitle: string; stepId: string }[] {
  const resumable: { procedure: Procedure; stepTitle: string; stepId: string }[] = [];
  for (const procedure of procedures) {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(progressStorageKey(procedure));
    } catch {
      raw = null;
    }
    if (!raw) continue;
    const progress = readProgress(raw, procedure) as { section: string; stepIndex: number };
    if (progress.section === 'preparation' && progress.stepIndex === 0) continue;
    const step = procedure.steps[progress.stepIndex];
    resumable.push({
      procedure,
      stepTitle: progress.section === 'final' ? 'Final checks' : step.title,
      stepId: progress.section === 'final' ? 'final' : step.id,
    });
  }
  return resumable;
}

export default function IndexPage() {
  const [configurationId, setConfigurationId] = useState(configurations[0].id);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [system, setSystem] = useState('all');
  const [resume] = useState(resumableProcedures);

  const configuration = configurations.find((entry) => entry.id === configurationId) ?? configurations[0];
  const engine = enginesById.get(configuration.engineVariantId);
  const inventory = engine ? inventoriesByEngine.get(engine.id) : undefined;

  // Only content that applies to the chosen configuration is listed. A shared
  // model or engine family name is never treated as applicability.
  const applicable = useMemo(() => {
    const procedureIds = new Set(
      procedures.filter((procedure) => procedure.configurationIds.includes(configuration.id)).map((p) => p.id),
    );
    const componentIds = new Set(
      (inventory?.components ?? [])
        .filter((component) => component.applicability.configurationIds.includes(configuration.id))
        .map((component) => component.id),
    );
    return (searchIndex as SearchEntry[]).filter((entry) => {
      if (entry.kind === 'job') return procedureIds.has(entry.id);
      if (entry.kind === 'component') return componentIds.has(entry.id);
      return entry.id === configuration.engineVariantId;
    });
  }, [configuration.id, configuration.engineVariantId, inventory]);

  const results = useMemo(
    () => searchEntries(applicable, query, { kind, system }) as SearchEntry[],
    [applicable, query, kind, system],
  );

  const systems = indexSystems(applicable) as string[];

  return (
    <div className="wr">
      <header className="wr-header">
        <a className="wr-brand" href={appPath('/')}>
          Wrenchwise
        </a>
        <nav aria-label="Main navigation">
          <a aria-current="page" href={appPath('/')}>
            Jobs &amp; parts
          </a>
          <a href={appPath('/archive/')}>Archive</a>
        </nav>
      </header>

      <div className="wr-config">
        {configurations.length > 1 ? (
          <label>
            <span className="wr-skip">Configuration</span>
            <select
              aria-label="Configuration"
              value={configurationId}
              onChange={(event) => setConfigurationId(event.target.value)}
            >
              {configurations.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label} · {entry.market} · {entry.steering}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <strong>
            {configuration.label} · {configuration.market} · {configuration.steering}
          </strong>
        )}
        <span>{engine?.label}</span>
        <StatusPill prefix="vehicle" status={configuration.identificationStatus} />
        <StatusPill prefix="geometry" status={currentRelease.evidenceStatus} />
      </div>

      <main className="wr-main">
        <h1>Jobs &amp; parts</h1>
        <p className="wr-sub">
          {engine?.label} as fitted to the {configuration.label}. {applicable.filter((e) => e.kind === 'job').length}{' '}
          job{applicable.filter((e) => e.kind === 'job').length === 1 ? '' : 's'},{' '}
          {applicable.filter((e) => e.kind === 'component').length} components with geometry.
        </p>

        {resume.length ? (
          <div className="wr-resume">
            <strong>Resume</strong>
            {resume.map((entry) => (
              <a key={entry.procedure.id} href={guideHref(entry.procedure.id, { step: entry.stepId })}>
                {entry.procedure.title} — {entry.stepTitle}
              </a>
            ))}
          </div>
        ) : null}

        <div className="wr-search">
          <input
            type="search"
            aria-label="Search jobs, parts and engines"
            placeholder="Search jobs, parts and engines"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select aria-label="Filter by type" value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="all">All types</option>
            <option value="job">Jobs</option>
            <option value="component">Parts</option>
            <option value="engine">Engines</option>
          </select>
          <select aria-label="Filter by system" value={system} onChange={(event) => setSystem(event.target.value)}>
            <option value="all">All systems</option>
            {systems.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {query || kind !== 'all' || system !== 'all' ? (
            <button
              className="wr-button"
              type="button"
              onClick={() => {
                setQuery('');
                setKind('all');
                setSystem('all');
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>

        {results.length ? (
          <ul className="wr-rows">
            {results.map((entry) => (
              <li className="wr-row" key={`${entry.kind}-${entry.id}`}>
                <ResultRow entry={entry} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="wr-empty">
            Nothing matches those filters. <button className="wr-chip" type="button" onClick={() => { setQuery(''); setKind('all'); setSystem('all'); }}>Show everything</button>
          </p>
        )}

        <section className="wr-release">
          <h2>
            Release {currentRelease.id} · model r{currentRelease.modelRevision} · {currentRelease.date}
          </h2>
          <p>{currentRelease.summary}</p>
          <p>
            Evidence: <StatusPill status={currentRelease.evidenceStatus} /> · mechanical review:{' '}
            <StatusPill status={currentRelease.mechanicalReview?.status === 'complete' ? 'reviewed' : 'not-established'} />
            . {currentRelease.mechanicalReview?.note}
          </p>
          <h2 style={{ marginTop: 14 }}>Unresolved gaps ({currentRelease.unresolvedGaps.length})</h2>
          <ul>
            {currentRelease.unresolvedGaps.map((gap, index) => (
              <li key={index}>{gap}</li>
            ))}
          </ul>
          <p style={{ marginTop: 14 }}>
            Wrenchwise is independent of Lexus and Toyota. Factory service information:{' '}
            <a href="https://techinfo.toyota.com/" rel="noreferrer noopener" target="_blank">
              techinfo.toyota.com
            </a>
            . No manual pages, diagrams or manufacturer CAD are redistributed here.
          </p>
        </section>
      </main>
    </div>
  );
}

function ResultRow({ entry }: { entry: SearchEntry }) {
  if (entry.kind === 'job') {
    const procedure = proceduresById.get(entry.id);
    return (
      <a href={guideHref(entry.id)}>
        <span className="wr-kind">{KIND_LABEL[entry.kind]}</span>
        <span className="wr-row-label">{entry.label}</span>
        <StatusPill status={entry.status} />
        <span className="wr-row-detail">
          {entry.detail}
          {procedure ? ` · ${procedure.steps.length} steps` : ''}
        </span>
      </a>
    );
  }

  if (entry.kind === 'component' && entry.procedureId && entry.stepId) {
    return (
      <a href={guideHref(entry.procedureId, { step: entry.stepId, part: entry.id })}>
        <span className="wr-kind">{KIND_LABEL[entry.kind]}</span>
        <span className="wr-row-label">{entry.label}</span>
        <StatusPill prefix="identity" status={entry.status} />
        <span className="wr-row-detail">{entry.detail}</span>
      </a>
    );
  }

  if (entry.kind === 'component') {
    const procedure = procedures[0];
    return (
      <a href={guideHref(procedure.id, { part: entry.id })}>
        <span className="wr-kind">{KIND_LABEL[entry.kind]}</span>
        <span className="wr-row-label">{entry.label}</span>
        <StatusPill prefix="identity" status={entry.status} />
        <span className="wr-row-detail">{entry.detail} · not used by a procedure step</span>
      </a>
    );
  }

  return (
    <a href={guideHref(procedures[0].id, { step: 'preparation' })}>
      <span className="wr-kind">{KIND_LABEL[entry.kind]}</span>
      <span className="wr-row-label">{entry.label}</span>
      <StatusPill status="reference" />
      <span className="wr-row-detail">{entry.detail}</span>
    </a>
  );
}
