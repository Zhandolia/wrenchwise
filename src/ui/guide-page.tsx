// The procedure workspace: contents, instructions and the 3D assembly together
// on desktop; Guide and 3D tabs on a phone.
//
// Every instruction, specification, caution and check comes from
// content/procedures/*.json. Nothing in this file states a mechanical fact.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { appPath } from '../../lib/app-path';
import {
  componentsById,
  configurationsById,
  currentRelease,
  enginesById,
  procedures,
  proceduresById,
  type Procedure,
  type ProcedureStep,
} from '../content/catalog';
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
} from '../content/procedure-state.mjs';
import { AssemblyView } from './assembly-view';
import { Block, Cautions, Gaps, SourceCitation, SourceList, StatusPill } from './evidence';
import './reference.css';

type Section = 'preparation' | 'steps' | 'final';

interface Progress {
  section: Section;
  stepIndex: number;
  preparation: string[];
  steps: Record<string, string[]>;
  finalChecks: string[];
}

function readStoredProgress(procedure: Procedure): Progress {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(progressStorageKey(procedure));
  } catch {
    raw = null;
  }
  return readProgress(raw, procedure) as Progress;
}

function writeStoredProgress(procedure: Procedure, progress: Progress): void {
  try {
    window.localStorage.setItem(progressStorageKey(procedure), serializeProgress(progress, procedure));
  } catch {
    // Private browsing or blocked storage: progress stays in memory only.
  }
}

function initialProcedure(): Procedure {
  const params = new URLSearchParams(window.location.search);
  return proceduresById.get(params.get('job') ?? '') ?? procedures[0];
}

/**
 * A `step` in the URL wins over saved progress, so a shared link opens where it
 * says it does. Anything else resumes where the user left off.
 */
function initialProgress(procedure: Procedure): Progress {
  const stored = readStoredProgress(procedure);
  const requested = new URLSearchParams(window.location.search).get('step');
  if (!requested) return stored;
  if (requested === 'preparation' || requested === 'final') {
    return setSection(stored, requested) as Progress;
  }
  const index = procedure.steps.findIndex((candidate) => candidate.id === requested);
  return index >= 0 ? (setStepIndex(stored, index, procedure.steps.length) as Progress) : stored;
}

export default function GuidePage() {
  const [procedure] = useState<Procedure>(initialProcedure);
  const [progress, setProgress] = useState<Progress>(() => initialProgress(procedure));
  const [selected, setSelected] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('part'),
  );
  const [isolated, setIsolated] = useState<string | null>(null);
  const [explodeOverride, setExplodeOverride] = useState<boolean | null>(null);
  const [tab, setTab] = useState<'guide' | 'model'>('guide');

  const engine = enginesById.get(procedure.engineVariantId);
  const configuration = configurationsById.get(procedure.configurationIds[0]);
  const steps = procedure.steps;
  const step: ProcedureStep | null = progress.section === 'steps' ? steps[progress.stepIndex] : null;

  useEffect(() => {
    writeStoredProgress(procedure, progress);
  }, [procedure, progress]);

  // Keep the address bar in step with the guide, without adding history entries
  // for every click.
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('job', procedure.id);
    params.set('step', step ? step.id : progress.section === 'final' ? 'final' : 'preparation');
    if (selected) params.set('part', selected);
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [procedure.id, progress.section, step, selected]);

  const assembly = useMemo(() => {
    if (progress.section === 'preparation') {
      return {
        removed: new Set<string>(),
        hidden: new Set<string>(),
        highlighted: new Set<string>(),
        camera: 'iso',
        explode: false,
      };
    }
    const index = progress.section === 'final' ? steps.length - 1 : progress.stepIndex;
    return computeAssemblyState(steps, index) as {
      removed: Set<string>;
      hidden: Set<string>;
      highlighted: Set<string>;
      camera: string;
      explode: boolean;
    };
  }, [progress.section, progress.stepIndex, steps]);

  const focus = useMemo(
    () => (step ? (focusComponentIds(step) as string[]) : []),
    [step],
  );

  const explode = explodeOverride ?? assembly.explode;
  const summary = progressSummary(progress, procedure);

  const handleSelect = useCallback((componentId: string | null) => {
    setSelected(componentId);
    if (componentId === null) setIsolated(null);
  }, []);

  const goTo = (section: Section, index = 0) => {
    setProgress((current) =>
      (section === 'steps' ? setStepIndex(current, index, steps.length) : setSection(current, section)) as Progress,
    );
    setIsolated(null);
    setExplodeOverride(null);
  };

  const move = (delta: number) => {
    setProgress((current) => advance(current, delta, steps.length) as Progress);
    setIsolated(null);
    setExplodeOverride(null);
  };

  const position = progress.section === 'preparation' ? 0 : progress.section === 'final' ? steps.length + 1 : progress.stepIndex + 1;

  return (
    <div className="wr">
      <a className="wr-skip" href="#wr-instructions">
        Skip to the instructions
      </a>
      <header className="wr-header">
        <a className="wr-brand" href={appPath('/')}>
          Wrenchwise
        </a>
        <nav aria-label="Main navigation">
          <a href={appPath('/')}>Jobs &amp; parts</a>
          <a aria-current="page" href={appPath('/guide/')}>
            {procedure.title}
          </a>
          <a href={appPath('/archive/')}>Archive</a>
        </nav>
      </header>

      <div className="wr-config">
        <strong>{configuration?.label ?? procedure.configurationIds[0]}</strong>
        <span>
          {configuration?.market} · {configuration?.steering} · {engine?.label}
        </span>
        <StatusPill prefix="content" status={procedure.contentStatus} />
        <StatusPill prefix="geometry" status={currentRelease.evidenceStatus} />
        <span style={{ marginLeft: 'auto' }}>
          Model r{currentRelease.modelRevision} · release {currentRelease.id}
        </span>
      </div>

      <div className="wr-tabs" role="group" aria-label="Guide or 3D view">
        <button type="button" aria-pressed={tab === 'guide'} onClick={() => setTab('guide')}>
          Guide
        </button>
        <button type="button" aria-pressed={tab === 'model'} onClick={() => setTab('model')}>
          3D view
        </button>
      </div>

      <div className="wr-guide" data-tab={tab}>
        <nav className="wr-contents" aria-label="Contents">
          <h2>Contents</h2>
          <button
            type="button"
            aria-current={progress.section === 'preparation' ? 'true' : undefined}
            onClick={() => goTo('preparation')}
          >
            <span className="wr-step-no">—</span>
            <span>Preparation</span>
            <span className="wr-done">
              {summary.preparation.done === summary.preparation.total && summary.preparation.total > 0 ? '✓' : ''}
            </span>
          </button>
          <ol>
            {steps.map((candidate, index) => (
              <li key={candidate.id}>
                <button
                  type="button"
                  aria-current={step?.id === candidate.id ? 'step' : undefined}
                  onClick={() => goTo('steps', index)}
                >
                  <span className="wr-step-no">{index + 1}</span>
                  <span>{candidate.title}</span>
                  <span className="wr-done">{stepComplete(progress, candidate) ? '✓' : ''}</span>
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            aria-current={progress.section === 'final' ? 'true' : undefined}
            onClick={() => goTo('final')}
          >
            <span className="wr-step-no">—</span>
            <span>Final checks</span>
            <span className="wr-done">
              {summary.finalChecks.done === summary.finalChecks.total && summary.finalChecks.total > 0 ? '✓' : ''}
            </span>
          </button>
        </nav>

        <article className="wr-instructions" id="wr-instructions" aria-label="Instructions">
          {progress.section === 'preparation' ? (
            <PreparationPane
              procedure={procedure}
              progress={progress}
              onToggle={(checkId) => setProgress((current) => toggleCheck(current, 'preparation', checkId) as Progress)}
            />
          ) : null}

          {step ? (
            <StepPane
              procedure={procedure}
              step={step}
              index={progress.stepIndex}
              progress={progress}
              selected={selected}
              onSelectComponent={handleSelect}
              onToggle={(checkId) => setProgress((current) => toggleCheck(current, step.id, checkId) as Progress)}
              onGoToStep={(stepId) => {
                const index = steps.findIndex((candidate) => candidate.id === stepId);
                if (index >= 0) goTo('steps', index);
              }}
            />
          ) : null}

          {progress.section === 'final' ? (
            <FinalPane
              procedure={procedure}
              progress={progress}
              summary={summary}
              onToggle={(checkId) => setProgress((current) => toggleCheck(current, 'finalChecks', checkId) as Progress)}
            />
          ) : null}

          <div className="wr-nav">
            <button className="wr-button" type="button" disabled={position === 0} onClick={() => move(-1)}>
              Back
            </button>
            <button
              className="wr-button"
              data-variant="primary"
              type="button"
              disabled={position === steps.length + 1}
              onClick={() => move(1)}
            >
              Next
            </button>
            <span className="wr-nav-count">
              {position === 0
                ? 'Preparation'
                : position === steps.length + 1
                  ? 'Final checks'
                  : `Step ${position} of ${steps.length}`}
              {' · '}
              {summary.checks.done}/{summary.checks.total} checks
            </span>
          </div>
        </article>

        <AssemblyView
            procedure={procedure}
            view={{
              removed: assembly.removed,
              hidden: assembly.hidden,
              highlighted: assembly.highlighted,
              camera: assembly.camera,
              explode,
              selected,
            }}
            focusComponentIds={focus}
            isolated={isolated}
            onSelect={(componentId) => {
              handleSelect(componentId);
              if (componentId) setTab('model');
            }}
            onToggleIsolate={() => setIsolated((current) => (current ? null : selected))}
            onToggleExplode={() => setExplodeOverride(!explode)}
            explodeRequestedByStep={assembly.explode}
          removedLabels={[...assembly.removed]
            .map((id) => componentsById.get(id)?.name ?? id)
            .slice(0, 6)}
        />
      </div>
    </div>
  );
}

function ProcedureStatus({ procedure }: { procedure: Procedure }) {
  return (
    <p className="wr-banner">
      <strong>
        {procedure.contentStatus === 'verified' ? 'Verified procedure' : 'Educational overview, not a verified repair procedure'}
      </strong>
      <span>{procedure.statusNote}</span>
    </p>
  );
}

function PreparationPane({
  procedure,
  progress,
  onToggle,
}: {
  procedure: Procedure;
  progress: Progress;
  onToggle: (checkId: string) => void;
}) {
  const configuration = configurationsById.get(procedure.configurationIds[0]);
  const engine = enginesById.get(procedure.engineVariantId);
  return (
    <>
      <span className="wr-phase">Preparation</span>
      <h1>{procedure.title}</h1>
      <ProcedureStatus procedure={procedure} />

      {engine ? (
        <Block title="Applies to">
          <ul>
            <li>
              {configuration?.label} · {configuration?.market} · {configuration?.steering} ·{' '}
              {engine.label}
            </li>
          </ul>
          <h2 style={{ marginTop: 12 }}>Does not apply to</h2>
          <ul>
            {engine.notEquivalentTo.map((entry) => (
              <li key={entry.variant} style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>
                <strong>{entry.variant}</strong> — {entry.reason}
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <Block title={`Checklist (${progress.preparation.length}/${procedure.preparation.checklist.length})`}>
        {procedure.preparation.checklist.map((item) => (
          <label className="wr-check" key={item.id}>
            <input
              type="checkbox"
              checked={progress.preparation.includes(item.id)}
              onChange={() => onToggle(item.id)}
            />
            <span>
              {item.text}
              {item.sourceRef ? (
                <>
                  {' '}
                  (<SourceCitation reference={item.sourceRef} />)
                </>
              ) : null}
            </span>
          </label>
        ))}
      </Block>

      <Cautions cautions={procedure.preparation.cautions} />

      <Block title="Tools">
        <ul>
          {procedure.tools.map((tool) => (
            <li key={tool.id}>
              <strong>{tool.name}</strong> <StatusPill status={tool.status} />
              <br />
              <span style={{ color: 'var(--ink-soft)', fontSize: 13 }}>{tool.detail}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Replacement parts">
        <ul>
          {procedure.parts.map((part) => (
            <li key={part.id}>
              <strong>{part.name}</strong>{' '}
              {part.partNumber ? <code>{part.partNumber}</code> : <StatusPill status={part.status} />}
              {part.note ? (
                <>
                  <br />
                  <span style={{ color: 'var(--ink-soft)', fontSize: 13 }}>{part.note}</span>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </Block>

      <SourceList references={procedure.sources} label="Procedure sources" />
      <Gaps gaps={currentRelease.unresolvedGaps} label="Open gaps in this release" />
    </>
  );
}

function StepPane({
  procedure,
  step,
  index,
  progress,
  selected,
  onSelectComponent,
  onToggle,
  onGoToStep,
}: {
  procedure: Procedure;
  step: ProcedureStep;
  index: number;
  progress: Progress;
  selected: string | null;
  onSelectComponent: (componentId: string | null) => void;
  onToggle: (checkId: string) => void;
  onGoToStep: (stepId: string) => void;
}) {
  const outstanding = outstandingPrerequisites(progress, procedure, step) as ProcedureStep[];
  const tools = step.tools
    .map((id) => procedure.tools.find((tool) => tool.id === id))
    .filter((tool): tool is Procedure['tools'][number] => Boolean(tool));
  const parts = step.replacementParts
    .map((id) => procedure.parts.find((part) => part.id === id))
    .filter((part): part is Procedure['parts'][number] => Boolean(part));
  const removes = step.view.remove ?? [];
  const restores = step.view.restore ?? [];

  return (
    <>
      <span className="wr-phase">
        Step {index + 1} of {procedure.steps.length} · {step.phase}
      </span>
      <h1>{step.title}</h1>
      <p>
        <StatusPill prefix="content" status={step.contentStatus} />
      </p>

      {outstanding.length ? (
        <p className="wr-note">
          Earlier step{outstanding.length > 1 ? 's' : ''} not yet marked complete:{' '}
          {outstanding.map((candidate, position) => (
            <span key={candidate.id}>
              {position > 0 ? ', ' : ''}
              <button
                className="wr-chip"
                type="button"
                onClick={() => onGoToStep(candidate.id)}
                style={{ padding: '1px 8px' }}
              >
                {candidate.title}
              </button>
            </span>
          ))}
          . You can read ahead; the assembly already shows this step&apos;s state.
        </p>
      ) : null}

      <ol className="wr-steps-text">
        {step.instructions.map((instruction, position) => (
          <li key={position}>{instruction}</li>
        ))}
      </ol>

      {step.componentIds.length ? (
        <Block title="Components in this step">
          <div className="wr-chip-row">
            {step.componentIds.map((componentId) => {
              const component = componentsById.get(componentId);
              return (
                <button
                  className="wr-chip"
                  key={componentId}
                  type="button"
                  aria-pressed={selected === componentId}
                  onClick={() => onSelectComponent(selected === componentId ? null : componentId)}
                >
                  {component?.name ?? componentId}
                </button>
              );
            })}
          </div>
        </Block>
      ) : null}

      {removes.length || restores.length ? (
        <Block title="Assembly change in this step">
          <ul>
            {removes.length ? (
              <li>
                <strong>Removed:</strong>{' '}
                {removes.map((id) => componentsById.get(id)?.name ?? id).join(', ')}
              </li>
            ) : null}
            {restores.length ? (
              <li>
                <strong>Refitted:</strong>{' '}
                {restores.map((id) => componentsById.get(id)?.name ?? id).join(', ')}
              </li>
            ) : null}
          </ul>
        </Block>
      ) : null}

      {tools.length ? (
        <Block title="Tools for this step">
          <ul>
            {tools.map((tool) => (
              <li key={tool.id}>
                {tool.name} <StatusPill status={tool.status} />
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {parts.length ? (
        <Block title="Replacement parts for this step">
          <ul>
            {parts.map((part) => (
              <li key={part.id}>
                {part.name} {part.partNumber ? <code>{part.partNumber}</code> : <StatusPill status={part.status} />}
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {step.specifications.length ? (
        <Block title="Specifications">
          <dl className="wr-defs">
            {step.specifications.map((specification) => (
              <div key={specification.id} style={{ display: 'contents' }}>
                <dt>
                  {specification.label}
                  {specification.sourceRef ? (
                    <>
                      {' '}
                      — <SourceCitation reference={specification.sourceRef} />
                    </>
                  ) : null}
                  {specification.note ? (
                    <>
                      <br />
                      <span style={{ color: 'var(--ink-faint)', fontSize: 12.5 }}>{specification.note}</span>
                    </>
                  ) : null}
                </dt>
                <dd>
                  {specification.value === null ? (
                    <StatusPill status={specification.status} />
                  ) : (
                    <>
                      {specification.value}
                      {specification.unit ? ` ${specification.unit}` : ''}{' '}
                      <StatusPill status={specification.status} />
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Block>
      ) : null}

      <Cautions cautions={step.cautions} />

      <Block title={`Completion checks (${progress.steps[step.id]?.length ?? 0}/${step.completionChecks.length})`}>
        {step.completionChecks.map((check) => (
          <label className="wr-check" key={check.id}>
            <input
              type="checkbox"
              checked={(progress.steps[step.id] ?? []).includes(check.id)}
              onChange={() => onToggle(check.id)}
            />
            <span>{check.text}</span>
          </label>
        ))}
      </Block>

      <SourceList references={step.sourceRefs} label="Step sources" />
      <Gaps gaps={step.gaps} />
    </>
  );
}

function FinalPane({
  procedure,
  progress,
  summary,
  onToggle,
}: {
  procedure: Procedure;
  progress: Progress;
  summary: ReturnType<typeof progressSummary>;
  onToggle: (checkId: string) => void;
}) {
  return (
    <>
      <span className="wr-phase">Final checks</span>
      <h1>Before the car moves</h1>
      <ProcedureStatus procedure={procedure} />

      <Block title={`Checks (${progress.finalChecks.length}/${procedure.finalChecks.length})`}>
        {procedure.finalChecks.map((check) => (
          <label className="wr-check" key={check.id}>
            <input
              type="checkbox"
              checked={progress.finalChecks.includes(check.id)}
              onChange={() => onToggle(check.id)}
            />
            <span>
              {check.text}
              {check.sourceRef ? (
                <>
                  {' '}
                  (<SourceCitation reference={check.sourceRef} />)
                </>
              ) : null}
            </span>
          </label>
        ))}
      </Block>

      <Block title="Your progress">
        <dl className="wr-defs">
          <dt>Preparation checklist</dt>
          <dd>
            {summary.preparation.done}/{summary.preparation.total}
          </dd>
          <dt>Steps with every check ticked</dt>
          <dd>
            {summary.steps.done}/{summary.steps.total}
          </dd>
          <dt>Step completion checks</dt>
          <dd>
            {summary.checks.done}/{summary.checks.total}
          </dd>
          <dt>Final checks</dt>
          <dd>
            {summary.finalChecks.done}/{summary.finalChecks.total}
          </dd>
        </dl>
        <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 10 }}>
          Progress is stored in this browser only. It is cleared if you clear site data, and it starts fresh
          when the procedure revision changes.
        </p>
      </Block>

      <Gaps gaps={currentRelease.unresolvedGaps} label="Open gaps in this release" />
    </>
  );
}
