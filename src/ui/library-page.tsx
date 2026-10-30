// The library.
//
// The engine turns slowly behind the page, so the first thing you see is the
// thing the site is actually about. The content over it is derived: an engine
// appears once it has a component inventory, and every variant ruled out by a
// shared family name appears with the reason it was ruled out.

import { useEffect, useMemo, useRef, useState } from 'react';
import { appPath } from '../../lib/app-path';
import {
  configurations,
  currentRelease,
  engines,
  inventories,
  procedures,
  proceduresById,
  searchIndex,
  type AssemblyManifest,
  type Configuration,
  type EngineVariant,
  type Procedure,
} from '../content/catalog';
import { coveredEngines, excludedVariants, librarySummary } from '../content/library.mjs';
import { indexSystems, searchEntries } from '../content/search.mjs';
import { progressStorageKey, readProgress } from '../content/procedure-state.mjs';
import { AssemblyScene, webglSupported } from '../viewer/assembly-scene';
import { Tag, systemLabel, systemStyle } from './bits';
import './app.css';

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
  engine: EngineVariant;
  configurations: Configuration[];
  jobs: Procedure[];
  componentCount: number;
  systems: string[];
  status: 'jobs' | 'reference-only' | 'declared';
}

const KIND: Record<string, string> = { job: 'Job', component: 'Part', engine: 'Engine' };
const content = { engines, configurations, procedures, inventories };

function jobHref(procedureId: string, params: Record<string, string> = {}): string {
  return `${appPath('/job/')}?${new URLSearchParams({ job: procedureId, ...params }).toString()}`;
}

function resumable(): { procedure: Procedure; label: string; stepId: string }[] {
  const rows: { procedure: Procedure; label: string; stepId: string }[] = [];
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
    rows.push({
      procedure,
      label: progress.section === 'final' ? 'Final checks' : procedure.steps[progress.stepIndex].title,
      stepId: progress.section === 'final' ? 'final' : procedure.steps[progress.stepIndex].id,
    });
  }
  return rows;
}

/** The engine turning behind the page. Decorative; it never blocks the content. */
function useShowpiece(containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !webglSupported() || !procedures.length) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let cancelled = false;
    const scene = new AssemblyScene(container, { showpiece: true });

    (async () => {
      const base = appPath(`/assets/${procedures[0].assembly}/`);
      const response = await fetch(`${base}assembly.json`);
      if (!response.ok) return;
      const manifest = (await response.json()) as AssemblyManifest;
      if (cancelled) return;
      const core = manifest.files.find((file) => file.layer === manifest.loadOrder[0]);
      if (!core) return;
      await scene.loadLayer(core.layer, `${base}${core.file}`);
      if (cancelled) return;
      scene.flyTo('iso', [], true);
    })().catch(() => {
      // The hero is decorative: a failure here leaves the gradient alone.
    });

    return () => {
      cancelled = true;
      scene.dispose();
    };
  }, [containerRef]);
}

export default function LibraryPage() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [system, setSystem] = useState('all');
  const [resume] = useState(resumable);
  const heroRef = useRef<HTMLDivElement>(null);
  useShowpiece(heroRef);

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
  const systems = indexSystems(entries) as string[];
  const filtered = Boolean(query) || kind !== 'all' || system !== 'all';
  const clear = () => {
    setQuery('');
    setKind('all');
    setSystem('all');
  };

  return (
    <div className="ww">
      <div className="ww-stage">
        <div className="ww-canvas" data-hero="true" ref={heroRef} />
      </div>

      <header className="ww-top">
        <a className="ww-brand" href={appPath('/')}>
          Wrenchwise
        </a>
        <div className="ww-top-right">
          <a className="ww-btn" href="#ww-find">
            Search
          </a>
          <a className="ww-btn" href={appPath('/archive/')}>
            Archive
          </a>
        </div>
      </header>

      <div className="ww-scroll">
        <main className="ww-wrap">
          <div className="ww-hero">
            <h1>See how it comes apart.</h1>
          </div>
          <p className="ww-lede">
            Engines, their parts, and the jobs done on them — each step tied to something you can turn around,
            take apart and tap. Every engine variant is covered on its own terms, never by assuming a shared
            name means shared parts.
          </p>

          <div className="ww-numbers">
            <div className="ww-number">
              <b>{summary.engines}</b>
              <span>engine{summary.engines === 1 ? '' : 's'} in the library</span>
            </div>
            <div className="ww-number">
              <b>{summary.jobs}</b>
              <span>
                job{summary.jobs === 1 ? '' : 's'} · {summary.steps} steps
              </span>
            </div>
            <div className="ww-number">
              <b>{summary.components}</b>
              <span>parts you can open</span>
            </div>
            <div className="ww-number">
              <b>{summary.excluded}</b>
              <span>look-alike variants ruled out</span>
            </div>
          </div>

          {resume.length ? (
            <div className="ww-resume">
              <strong>Pick up where you left off</strong>
              {resume.map((entry) => (
                <a key={entry.procedure.id} href={jobHref(entry.procedure.id, { step: entry.stepId })}>
                  {entry.procedure.title} — {entry.label} →
                </a>
              ))}
            </div>
          ) : null}

          <section className="ww-sec">
            <h2>In the library</h2>
            <p>
              An engine shows up here once its parts have been inventoried from recorded sources. Jobs are added
              per engine, not per model name.
            </p>
            <ul className="ww-tiles">
              {covered.map((entry) => (
                <EngineTile key={entry.engine.id} entry={entry} />
              ))}
            </ul>
          </section>

          <section className="ww-sec" id="ww-find">
            <h2>Find anything</h2>
            <div className="ww-find">
              <input
                type="search"
                aria-label="Search jobs, parts and engines"
                placeholder="Timing belt, tensioner, water pump…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select aria-label="Filter by type" value={kind} onChange={(event) => setKind(event.target.value)}>
                <option value="all">Everything</option>
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
                    {systemLabel(name)}
                  </option>
                ))}
              </select>
              {filtered ? (
                <button className="ww-btn" type="button" onClick={clear}>
                  Clear
                </button>
              ) : null}
            </div>

            {results.length ? (
              <ul className="ww-hits">
                {results.map((entry) => (
                  <li className="ww-hit" key={`${entry.kind}-${entry.id}`} style={systemStyle(entry.system)}>
                    <Hit entry={entry} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ww-none">
                Nothing matches.{' '}
                <button className="ww-btn" type="button" onClick={clear}>
                  Show everything
                </button>
              </p>
            )}
          </section>

          <section className="ww-sec">
            <h2>Named, and deliberately not covered</h2>
            <p>
              These share a family name with something in the library and are <em>not</em> interchangeable with
              it. Each needs its own records before anything here applies.
            </p>
            <ul className="ww-ruled">
              {excluded.map((entry) => (
                <li key={entry.id}>
                  <b>{entry.variant}</b>
                  {entry.reason} <em>Distinct from {entry.distinctFrom}.</em>
                </li>
              ))}
            </ul>
          </section>

          <section className="ww-note">
            <h2>
              Release {currentRelease.id} · model r{currentRelease.modelRevision} · {currentRelease.date}
            </h2>
            <p>{currentRelease.summary}</p>
            <p style={{ marginTop: 10 }}>
              Evidence: <Tag status={currentRelease.evidenceStatus} /> · review:{' '}
              <Tag status={currentRelease.mechanicalReview?.status === 'complete' ? 'reviewed' : 'not-established'} />{' '}
              {currentRelease.mechanicalReview?.note}
            </p>
            <h2 style={{ marginTop: 18 }}>Still open ({currentRelease.unresolvedGaps.length})</h2>
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
    </div>
  );
}

function EngineTile({ entry }: { entry: CoveredEngine }) {
  const { engine, jobs } = entry;
  return (
    <li className="ww-tile">
      <h3>{engine.label}</h3>
      <p className="ww-part-sub">
        {engine.code} · {engine.layout}
      </p>

      <dl>
        <dt>Fitted to</dt>
        <dd>
          {entry.configurations.length
            ? entry.configurations
                .map((configuration) => `${configuration.label} · ${configuration.market} · ${configuration.steering}`)
                .join('; ')
            : 'No configuration record yet'}
        </dd>
        <dt>Parts</dt>
        <dd>{entry.componentCount} modelled</dd>
      </dl>

      <div className="ww-syslist">
        {entry.systems.map((name) => (
          <span key={name} style={systemStyle(name)}>
            {systemLabel(name)}
          </span>
        ))}
      </div>

      {jobs.length ? (
        <ul className="ww-joblist">
          {jobs.map((job) => (
            <li key={job.id}>
              <a className="ww-joblink" href={jobHref(job.id)}>
                {job.title}
                <small>{job.steps.length} steps</small>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>
          Parts reference only — no job written for this engine yet.
        </p>
      )}
    </li>
  );
}

function Hit({ entry }: { entry: SearchEntry }) {
  const href =
    entry.kind === 'job'
      ? jobHref(entry.id)
      : entry.kind === 'engine'
        ? '#ww-find'
        : entry.procedureId
          ? jobHref(entry.procedureId, entry.stepId ? { step: entry.stepId, part: entry.id } : { part: entry.id })
          : jobHref(procedures[0].id, { part: entry.id });
  const procedure = entry.kind === 'job' ? proceduresById.get(entry.id) : undefined;
  return (
    <a href={href}>
      <b>
        <span className="ww-kind">{KIND[entry.kind]}</span>
        {entry.label}
      </b>
      <Tag status={entry.status} />
      <span>
        {entry.detail}
        {procedure ? ` · ${procedure.steps.length} steps` : ''}
      </span>
    </a>
  );
}
