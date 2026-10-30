// The procedure workspace.
//
// Layout follows attention: a rail says where you are, one step is the largest
// thing on the page, supporting material folds away, and the action you need
// next is pinned to the bottom. The dark stage beside it carries the model.
//
// Every instruction, specification, caution and check comes from
// content/procedures/*.json. Nothing in this file states a mechanical fact.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { proceduresPhases } from '../content/library.mjs';
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
import { Cautions, Gaps, SourceCitation, SourceList, StatusPill, systemColor } from './evidence';
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
  const phases = useMemo(
    () => proceduresPhases(procedure) as { phase: string; stepIndexes: number[] }[],
    [procedure],
  );

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

  const focus = useMemo(() => (step ? (focusComponentIds(step) as string[]) : []), [step]);
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

  const position =
    progress.section === 'preparation' ? 0 : progress.section === 'final' ? steps.length + 1 : progress.stepIndex + 1;
  const completedSteps = steps.filter((candidate) => stepComplete(progress, candidate)).length;

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
          <a href={appPath('/')}>Library</a>
          <a aria-current="page" href={appPath('/guide/')}>
            {procedure.title}
          </a>
          <a href={appPath('/archive/')}>Archive</a>
        </nav>
      </header>

      <div className="wr-config">
        <strong>{engine?.label ?? procedure.engineVariantId}</strong>
        <span className="wr-sep">in</span>
        <span>
          {configuration?.label} · {configuration?.market} · {configuration?.steering}
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
          <div className="wr-contents-head">
            <h2>{procedure.title}</h2>
            <div
              className="wr-meter"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={completedSteps}
              aria-label="Steps complete"
            >
              <span style={{ width: `${(completedSteps / steps.length) * 100}%` }} />
            </div>
            <span className="wr-meter-label">
              {completedSteps} of {steps.length} steps complete
            </span>
          </div>

          <button
            type="button"
            aria-current={progress.section === 'preparation' ? 'true' : undefined}
            onClick={() => goTo('preparation')}
          >
            <span className="wr-step-no">—</span>
            <span>Preparation</span>
            <span className="wr-done">
              {summary.preparation.total > 0 && summary.preparation.done === summary.preparation.total ? '✓' : ''}
            </span>
          </button>

          {phases.map((group) => (
            <div key={group.phase}>
              <p className="wr-phase-label">{group.phase}</p>
              <ol>
                {group.stepIndexes.map((index) => {
                  const candidate = steps[index];
                  return (
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
                  );
                })}
              </ol>
            </div>
          ))}

          <p className="wr-phase-label">Finish</p>
          <button
            type="button"
            aria-current={progress.section === 'final' ? 'true' : undefined}
            onClick={() => goTo('final')}
          >
            <span className="wr-step-no">—</span>
            <span>Final checks</span>
            <span className="wr-done">
              {summary.finalChecks.total > 0 && summary.finalChecks.done === summary.finalChecks.total ? '✓' : ''}
            </span>
          </button>
        </nav>

        <article className="wr-instructions" id="wr-instructions" aria-label="Instructions">
          <PhaseRail
            phases={phases}
            section={progress.section}
            stepIndex={progress.stepIndex}
            onJump={(index) => goTo('steps', index)}
          />

          <div className="wr-pane">
            {progress.section === 'preparation' ? (
              <PreparationPane
                procedure={procedure}
                progress={progress}
                onToggle={(checkId) =>
                  setProgress((current) => toggleCheck(current, 'preparation', checkId) as Progress)
                }
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
                onToggle={(checkId) =>
                  setProgress((current) => toggleCheck(current, 'finalChecks', checkId) as Progress)
                }
              />
            ) : null}
          </div>

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
              {position === steps.length ? 'Final checks' : 'Next'}
            </button>
            <span className="wr-nav-count">
              {position === 0
                ? 'Preparation'
                : position === steps.length + 1
                  ? 'Final checks'
                  : `Step ${position} of ${steps.length}`}
              <br />
              {summary.checks.done}/{summary.checks.total} checks ticked
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
          removedLabels={[...assembly.removed].map((id) => componentsById.get(id)?.name ?? id)}
        />
      </div>
    </div>
  );
}

function PhaseRail({
  phases,
  section,
  stepIndex,
  onJump,
}: {
  phases: { phase: string; stepIndexes: number[] }[];
  section: Section;
  stepIndex: number;
  onJump: (index: number) => void;
}) {
  const currentIndex =
    section === 'steps' ? phases.findIndex((group) => group.stepIndexes.includes(stepIndex)) : -1;
  const label =
    section === 'preparation' ? 'Preparation' : section === 'final' ? 'Final checks' : phases[currentIndex].phase;

  return (
    <div className="wr-rail">
      <div className="wr-rail-bars" role="group" aria-label="Phases">
        {phases.map((group, index) => {
          const current = index === currentIndex;
          const done = section === 'final' || (currentIndex >= 0 && index < currentIndex);
          return (
            <button
              className="wr-rail-seg"
              key={group.phase}
              type="button"
              data-state={current ? 'current' : done ? 'done' : 'ahead'}
              aria-current={current ? 'step' : undefined}
              aria-label={`${group.phase}, ${group.stepIndexes.length} step${
                group.stepIndexes.length === 1 ? '' : 's'
              }`}
              title={`${group.phase} — ${group.stepIndexes.length} step${
                group.stepIndexes.length === 1 ? '' : 's'
              }`}
              onClick={() => onJump(group.stepIndexes[0])}
            />
          );
        })}
      </div>
      <p className="wr-rail-label">
        <b>{label}</b>
        {currentIndex >= 0 ? (
          <span>
            Phase {currentIndex + 1} of {phases.length}
          </span>
        ) : null}
      </p>
    </div>
  );
}

/** A collapsed section for material you need sometimes, not every time. */
function Fold({ title, count, children }: { title: string; count?: ReactNode; children: ReactNode }) {
  return (
    <details className="wr-fold">
      <summary>
        {title}
        {count !== undefined ? <small>{count}</small> : null}
      </summary>
      <div className="wr-fold-body">{children}</div>
    </details>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="wr-block">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ComponentChips({
  componentIds,
  selected,
  onSelect,
}: {
  componentIds: string[];
  selected: string | null;
  onSelect: (componentId: string | null) => void;
}) {
  return (
    <div className="wr-chip-row">
      {componentIds.map((componentId) => {
        const component = componentsById.get(componentId);
        return (
          <button
            className="wr-chip"
            key={componentId}
            type="button"
            style={systemColor(component?.system)}
            aria-pressed={selected === componentId}
            onClick={() => onSelect(selected === componentId ? null : componentId)}
          >
            {component?.name ?? componentId}
          </button>
        );
      })}
    </div>
  );
}

function ProcedureStatus({ procedure }: { procedure: Procedure }) {
  return (
    <p className="wr-banner">
      <strong>
        {procedure.contentStatus === 'verified'
          ? 'Verified procedure'
          : 'Educational overview, not a verified repair procedure'}
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
      <p className="wr-eyebrow">Before you start</p>
      <h1>{procedure.title}</h1>
      <ProcedureStatus procedure={procedure} />

      <Block title={`Checklist · ${progress.preparation.length} of ${procedure.preparation.checklist.length}`}>
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

      {engine ? (
        <Fold title="Applies to this engine only" count={`${engine.notEquivalentTo.length} ruled out`}>
          <Block title="Applies to">
            <ul>
              <li>
                {configuration?.label} · {configuration?.market} · {configuration?.steering} · {engine.label}
              </li>
            </ul>
          </Block>
          <Block title="Does not apply to">
            <ul>
              {engine.notEquivalentTo.map((entry) => (
                <li key={entry.variant} style={{ color: 'var(--ink-soft)' }}>
                  <strong>{entry.variant}</strong> — {entry.reason}
                </li>
              ))}
            </ul>
          </Block>
        </Fold>
      ) : null}

      <Fold title="Tools" count={procedure.tools.length}>
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
      </Fold>

      <Fold title="Replacement parts" count={procedure.parts.length}>
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
      </Fold>

      <Fold title="Sources and open gaps" count={`${currentRelease.unresolvedGaps.length} gaps`}>
        <SourceList references={procedure.sources} label="Procedure sources" />
        <Gaps gaps={currentRelease.unresolvedGaps} label="Open gaps in this release" />
      </Fold>
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
  const ticked = progress.steps[step.id]?.length ?? 0;

  return (
    <>
      <p className="wr-eyebrow">
        <span>
          Step {index + 1} of {procedure.steps.length}
        </span>
        <StatusPill status={step.contentStatus} />
      </p>
      <h1>{step.title}</h1>

      {outstanding.length ? (
        <p className="wr-note">
          Earlier step{outstanding.length > 1 ? 's' : ''} not yet marked complete:{' '}
          {outstanding.map((candidate, position) => (
            <span key={candidate.id}>
              {position > 0 ? ', ' : ''}
              <button
                className="wr-chip"
                data-plain=""
                type="button"
                style={{ padding: '2px 9px' }}
                onClick={() => onGoToStep(candidate.id)}
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

      <Cautions cautions={step.cautions} />

      {step.componentIds.length ? (
        <Block title="Parts in this step — select one to find it in the model">
          <ComponentChips componentIds={step.componentIds} selected={selected} onSelect={onSelectComponent} />
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

      <Block title={`Completion checks · ${ticked} of ${step.completionChecks.length}`}>
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

      {removes.length || restores.length ? (
        <Fold
          title="What this step changes in the assembly"
          count={`${removes.length} off · ${restores.length} back on`}
        >
          <Block title="Assembly change">
            <ul>
              {removes.length ? (
                <li>
                  <strong>Removed:</strong> {removes.map((id) => componentsById.get(id)?.name ?? id).join(', ')}
                </li>
              ) : null}
              {restores.length ? (
                <li>
                  <strong>Refitted:</strong> {restores.map((id) => componentsById.get(id)?.name ?? id).join(', ')}
                </li>
              ) : null}
            </ul>
          </Block>
        </Fold>
      ) : null}

      {tools.length || parts.length ? (
        <Fold title="Tools and parts for this step" count={tools.length + parts.length}>
          {tools.length ? (
            <Block title="Tools">
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
            <Block title="Replacement parts">
              <ul>
                {parts.map((part) => (
                  <li key={part.id}>
                    {part.name}{' '}
                    {part.partNumber ? <code>{part.partNumber}</code> : <StatusPill status={part.status} />}
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}
        </Fold>
      ) : null}

      <Fold
        title="Sources and gaps for this step"
        count={`${step.sourceRefs.length} source${step.sourceRefs.length === 1 ? '' : 's'}${
          step.gaps.length ? ` · ${step.gaps.length} gap${step.gaps.length === 1 ? '' : 's'}` : ''
        }`}
      >
        <SourceList references={step.sourceRefs} label="Step sources" />
        <Gaps gaps={step.gaps} />
      </Fold>
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
      <p className="wr-eyebrow">Finish</p>
      <h1>Before the car moves</h1>
      <ProcedureStatus procedure={procedure} />

      <Block title={`Checks · ${progress.finalChecks.length} of ${procedure.finalChecks.length}`}>
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
        <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 12 }}>
          Progress is stored in this browser only. It is cleared if you clear site data, and it starts fresh
          when the procedure revision changes.
        </p>
      </Block>

      <Fold title="Open gaps in this release" count={currentRelease.unresolvedGaps.length}>
        <Gaps gaps={currentRelease.unresolvedGaps} label="Open gaps" />
      </Fold>
    </>
  );
}
