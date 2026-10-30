// The library: which engines Wrenchwise covers, what exists for each of them,
// and what it deliberately does not cover.
//
// Nothing on this page is written per engine. The cards, the counts and the
// excluded list are all derived from content/, so the first engine to be
// carried through to a complete procedure is just the first row — not the
// subject of the site.

import { useMemo, useState } from 'react';
import { appPath } from '../../lib/app-path';
import {
  configurations,
  currentRelease,
  engines,
  inventories,
  procedures,
  proceduresById,
  searchIndex,
  type Procedure,
} from '../content/catalog';
import { coveredEngines, excludedVariants, librarySummary } from '../content/library.mjs';
import { indexSystems, searchEntries } from '../content/search.mjs';
import { progressStorageKey, readProgress } from '../content/procedure-state.mjs';
import { StatusPill, systemColor } from './evidence';
import './reference.css';

/** Mirrors the SearchEntry typedef in ../content/search.mjs. */
interface SearchEntry {
  kind: 'job' | 'component' | 'engine';
  id: string;
  label: string;
  detail: string;
  system: string;
  status: string;
  terms: string;
  procedureId?: string;
  stepId?: string;
}

interface CoveredEngine {
  engine: (typeof engines)[number];
  configurations: (typeof configurations)[number][];
  jobs: Procedure[];
  componentCount: number;
  systems: string[];
  status: 'jobs' | 'reference-only' | 'declared';
}

const KIND_LABEL: Record<string, string> = { job: 'Job', component: 'Part', engine: 'Engine' };

const content = { engines, configurations, procedures, inventories };

function guideHref(procedureId: string, params: Record<string, string> = {}): string {
  const search = new URLSearchParams({ job: procedureId, ...params });
  return `${appPath('/guide/')}?${search.toString()}`;
}

/** Saved progress for any procedure, so the library can offer to resume. */
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
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [system, setSystem] = useState('all');
  const [resume] = useState(resumableProcedures);

  const summary = librarySummary(content) as ReturnType<typeof librarySummary>;
  const covered = coveredEngines(content) as CoveredEngine[];
  const excluded = excludedVariants(content) as {
    id: string;
    variant: string;
    reason: string;
    distinctFrom: string;
  }[];

  const entries = searchIndex as SearchEntry[];
  const results = useMemo(
    () => searchEntries(entries, query, { kind, system }) as SearchEntry[],
    [entries, query, kind, system],
  );
  const filtered = Boolean(query) || kind !== 'all' || system !== 'all';
  const systems = indexSystems(entries) as string[];

  return (
    <div className="wr">
      <header className="wr-header">
        <a className="wr-brand" href={appPath('/')}>
          Wrenchwise
        </a>
        <nav aria-label="Main navigation">
          <a aria-current="page" href={appPath('/')}>
            Library
          </a>
          <a href="#wr-search">Search</a>
          <a href="#wr-coverage">Coverage</a>
          <a href={appPath('/archive/')}>Archive</a>
        </nav>
      </header>

      <main className="wr-main">
        <div className="wr-hero">
          <h1>Engines, components and the jobs done on them.</h1>
          <p>
            An interactive mechanical reference. Pick an engine, pick a job, and work through it with every
            instruction tied to a part you can see, isolate and turn around. Each engine variant is covered on
            its own terms — never by assuming that a shared family name means shared parts.
          </p>
        </div>

        <div className="wr-stats">
          <div className="wr-stat">
            <b>{summary.engines}</b>
            <span>engine variant{summary.engines === 1 ? '' : 's'} covered</span>
          </div>
          <div className="wr-stat">
            <b>{summary.jobs}</b>
            <span>job{summary.jobs === 1 ? '' : 's'}, {summary.steps} steps</span>
          </div>
          <div className="wr-stat">
            <b>{summary.components}</b>
            <span>components with geometry</span>
          </div>
          <div className="wr-stat">
            <b>{summary.excluded}</b>
            <span>variants ruled out by name</span>
          </div>
        </div>

        {resume.length ? (
          <div className="wr-resume">
            <b>Pick up where you left off</b>
            {resume.map((entry) => (
              <a key={entry.procedure.id} href={guideHref(entry.procedure.id, { step: entry.stepId })}>
                {entry.procedure.title} — {entry.stepTitle}
              </a>
            ))}
          </div>
        ) : null}

        <section className="wr-section" aria-labelledby="wr-engines-heading">
          <h2 id="wr-engines-heading">Engines in the library</h2>
          <p className="wr-lede">
            An engine appears here once it has a component inventory built from recorded sources. Jobs are
            added per engine, not per model name.
          </p>
          <ul className="wr-engines">
            {covered.map((entry) => (
              <EngineCard key={entry.engine.id} entry={entry} />
            ))}
          </ul>
        </section>

        <section className="wr-section" id="wr-search" aria-labelledby="wr-search-heading">
          <h2 id="wr-search-heading">Search everything</h2>
          <p className="wr-lede">Jobs, individual components and engine variants across the whole library.</p>
          <div className="wr-search">
            <input
              type="search"
              aria-label="Search jobs, parts and engines"
              placeholder="Timing belt, tensioner, water pump, VVT-i…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select aria-label="Filter by type" value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="all">All types</option>
              <option value="job">Jobs</option>
              <option value="component">Parts</option>
              <option value="engine">Engines</option>
            </select>
            <select
              aria-label="Filter by system"
              value={system}
              onChange={(event) => setSystem(event.target.value)}
            >
              <option value="all">All systems</option>
              {systems.map((name) => (
                <option key={name} value={name}>
                  {name.replace(/-/g, ' ')}
                </option>
              ))}
            </select>
            {filtered ? (
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
            <>
              <p className="wr-result-count">
                {results.length} of {entries.length} entries
              </p>
              <ul className="wr-rows">
                {results.map((entry) => (
                  <li className="wr-row" key={`${entry.kind}-${entry.id}`} style={systemColor(entry.system)}>
                    <ResultRow entry={entry} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="wr-empty">
              Nothing matches those filters.{' '}
              <button
                className="wr-chip"
                data-plain=""
                type="button"
                onClick={() => {
                  setQuery('');
                  setKind('all');
                  setSystem('all');
                }}
              >
                Show everything
              </button>
            </p>
          )}
        </section>

        <section className="wr-section" id="wr-coverage" aria-labelledby="wr-coverage-heading">
          <h2 id="wr-coverage-heading">Named, and deliberately not covered</h2>
          <p className="wr-lede">
            These variants share a family name with something in the library and are <em>not</em>{' '}
            interchangeable with it. Each needs its own configuration record, component inventory and
            procedures before anything here applies to it.
          </p>
          <ul className="wr-excluded">
            {excluded.map((entry) => (
              <li key={entry.id}>
                <b>{entry.variant}</b>
                {entry.reason} <em>Distinct from {entry.distinctFrom}.</em>
              </li>
            ))}
          </ul>
        </section>

        <section className="wr-release" aria-labelledby="wr-release-heading">
          <h2 id="wr-release-heading">
            Release {currentRelease.id} · model r{currentRelease.modelRevision} · {currentRelease.date}
          </h2>
          <p>{currentRelease.summary}</p>
          <p style={{ marginTop: 8 }}>
            Evidence: <StatusPill status={currentRelease.evidenceStatus} /> · mechanical review:{' '}
            <StatusPill
              status={currentRelease.mechanicalReview?.status === 'complete' ? 'reviewed' : 'not-established'}
            />
            . {currentRelease.mechanicalReview?.note}
          </p>
          <h2 style={{ marginTop: 16 }}>Unresolved gaps ({currentRelease.unresolvedGaps.length})</h2>
          <ul>
            {currentRelease.unresolvedGaps.map((gap, index) => (
              <li key={index}>{gap}</li>
            ))}
          </ul>
          <p style={{ marginTop: 16 }}>
            Wrenchwise is independent of any manufacturer. Factory service information for the engines
            currently in the library:{' '}
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

function EngineCard({ entry }: { entry: CoveredEngine }) {
  const { engine, jobs } = entry;
  return (
    <li className="wr-engine">
      <div className="wr-engine-head">
        <h3>{engine.label}</h3>
        <StatusPill
          status={entry.status === 'jobs' ? 'reviewed' : 'not-established'}
          prefix={entry.status === 'jobs' ? undefined : 'no jobs'}
        />
      </div>

      <dl>
        <dt>Code</dt>
        <dd>
          {engine.code} · {engine.variant}
        </dd>
        <dt>Recorded in</dt>
        <dd>
          {entry.configurations.length
            ? entry.configurations
                .map((configuration) => `${configuration.label} · ${configuration.market} · ${configuration.steering}`)
                .join('; ')
            : 'No configuration record yet'}
        </dd>
        <dt>Layout</dt>
        <dd>{engine.layout ?? '—'}</dd>
        <dt>Components</dt>
        <dd>{entry.componentCount} with geometry</dd>
      </dl>

      <div className="wr-systems">
        {entry.systems.map((name) => (
          <span className="wr-sys" key={name} style={systemColor(name)}>
            {name.replace(/-/g, ' ')}
          </span>
        ))}
      </div>

      {jobs.length ? (
        <ul className="wr-jobs">
          {jobs.map((job) => (
            <li key={job.id}>
              <a className="wr-job" href={guideHref(job.id)} style={systemColor(job.system)}>
                {job.title}
                <small>
                  {job.steps.length} steps ·{' '}
                  {job.contentStatus === 'verified' ? 'verified' : 'educational overview'}
                </small>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-faint)' }}>
          Component reference only. No procedure has been written for this engine yet.
        </p>
      )}
    </li>
  );
}

function ResultRow({ entry }: { entry: SearchEntry }) {
  const label = (
    <>
      <span className="wr-row-label">
        <span className="wr-kind">{KIND_LABEL[entry.kind]}</span>
        {entry.label}
      </span>
    </>
  );

  if (entry.kind === 'job') {
    const procedure = proceduresById.get(entry.id);
    return (
      <a href={guideHref(entry.id)}>
        {label}
        <StatusPill status={entry.status} />
        <span className="wr-row-detail">
          {entry.detail}
          {procedure ? ` · ${procedure.steps.length} steps` : ''}
        </span>
      </a>
    );
  }

  if (entry.kind === 'engine') {
    return (
      <a href="#wr-engines-heading">
        {label}
        <StatusPill status="reviewed" prefix="reference" />
        <span className="wr-row-detail">{entry.detail}</span>
      </a>
    );
  }

  const target = entry.procedureId
    ? guideHref(entry.procedureId, entry.stepId ? { step: entry.stepId, part: entry.id } : { part: entry.id })
    : guideHref(procedures[0].id, { part: entry.id });
  return (
    <a href={target}>
      {label}
      <StatusPill prefix="identity" status={entry.status} />
      <span className="wr-row-detail">
        {entry.detail}
        {entry.stepId ? '' : ' · not used by a procedure step'}
      </span>
    </a>
  );
}
