// A job, done against the model.
//
// The engine fills the screen. One floating card carries the step you are on,
// in plain language, with the technical record a tap below it. Parts in the
// step are marked on the model; tapping one flies the camera to it and opens
// what is known about it.
//
// Every instruction, caution, specification and check comes from
// content/procedures/*.json. Nothing in this file states a mechanical fact.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { appPath } from '../../lib/app-path';
import {
  componentsById,
  configurationsById,
  currentRelease,
  enginesById,
  procedures,
  proceduresById,
  type AssemblyManifest,
  type Procedure,
  type ProcedureStep,
} from '../content/catalog';
import { proceduresPhases } from '../content/library.mjs';
import {
  advance,
  computeAssemblyState,
  focusComponentIds,
  progressStorageKey,
  progressSummary,
  readProgress,
  serializeProgress,
  setSection,
  setStepIndex,
  stepComplete,
  toggleCheck,
} from '../content/procedure-state.mjs';
import {
  AssemblyScene,
  CAMERA_LABELS,
  CAMERA_PRESETS,
  webglSupported,
  type ScreenPoint,
} from '../viewer/assembly-scene';
import { Alerts, Block, GapLines, More, Source, SourceLines, Tag, Verification, systemLabel, systemStyle } from './bits';
import { Hotspots, type HotspotsHandle, type HotspotTarget } from './hotspots';
import './app.css';

type Section = 'preparation' | 'steps' | 'final';

interface Progress {
  section: Section;
  stepIndex: number;
  preparation: string[];
  steps: Record<string, string[]>;
  finalChecks: string[];
}

type LoadState =
  | { kind: 'unsupported' }
  | { kind: 'loading'; message: string }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

function readStored(procedure: Procedure): Progress {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(progressStorageKey(procedure));
  } catch {
    raw = null;
  }
  return readProgress(raw, procedure) as Progress;
}

function writeStored(procedure: Procedure, progress: Progress): void {
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

/** A `step` in the URL wins over saved progress, so a shared link opens there. */
function initialProgress(procedure: Procedure): Progress {
  const stored = readStored(procedure);
  const requested = new URLSearchParams(window.location.search).get('step');
  if (!requested) return stored;
  if (requested === 'preparation' || requested === 'final') return setSection(stored, requested) as Progress;
  const index = procedure.steps.findIndex((candidate) => candidate.id === requested);
  return index >= 0 ? (setStepIndex(stored, index, procedure.steps.length) as Progress) : stored;
}

const isTouch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

/** How far to push the subject sideways so the floating panels do not cover it. */
const framingBias = (partOpen: boolean): number => {
  if (window.innerWidth < 900) return 0;
  return partOpen ? 0.02 : 0.15;
};

export default function JobPage() {
  const [procedure] = useState<Procedure>(initialProcedure);
  const [progress, setProgress] = useState<Progress>(() => initialProgress(procedure));
  const [selected, setSelected] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('part'),
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const [isolated, setIsolated] = useState<string | null>(null);
  const [explodeOverride, setExplodeOverride] = useState<boolean | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>(() =>
    webglSupported() ? { kind: 'loading', message: 'Starting the viewer' } : { kind: 'unsupported' },
  );
  const [manifest, setManifest] = useState<AssemblyManifest | null>(null);
  const [fallbackSvg, setFallbackSvg] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AssemblyScene | null>(null);
  const hotspotsRef = useRef<HotspotsHandle>(null);

  const engine = enginesById.get(procedure.engineVariantId);
  const configuration = configurationsById.get(procedure.configurationIds[0]);
  const steps = procedure.steps;
  const step: ProcedureStep | null = progress.section === 'steps' ? steps[progress.stepIndex] : null;
  const phases = useMemo(
    () => proceduresPhases(procedure) as { phase: string; stepIndexes: number[] }[],
    [procedure],
  );
  const summary = progressSummary(progress, procedure);
  const assetUrl = useCallback(
    (file: string) => appPath(`/assets/${procedure.assembly}/${file}`),
    [procedure.assembly],
  );

  // --- Scene ------------------------------------------------------------

  useEffect(() => {
    const container = canvasRef.current;
    if (!container || !webglSupported()) return undefined;

    let cancelled = false;
    const scene = new AssemblyScene(container);
    sceneRef.current = scene;
    scene.setProjectionHandler((points: ScreenPoint[]) => hotspotsRef.current?.apply(points));

    (async () => {
      setState({ kind: 'loading', message: 'Reading the assembly' });
      const response = await fetch(assetUrl('assembly.json'));
      if (!response.ok) throw new Error(`manifest ${response.status}`);
      const loaded = (await response.json()) as AssemblyManifest;
      if (cancelled) return;
      setManifest(loaded);

      for (const layer of loaded.loadOrder) {
        const file = loaded.files.find((entry) => entry.layer === layer);
        if (!file) continue;
        setState({ kind: 'loading', message: `Loading the ${layer} parts` });
        await scene.loadLayer(layer, assetUrl(file.file));
        if (cancelled) return;
        if (layer === loaded.loadOrder[0]) setState({ kind: 'ready' });
      }
      setState({ kind: 'ready' });
    })().catch((error: unknown) => {
      if (cancelled) return;
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'The model could not be loaded.',
      });
    });

    return () => {
      cancelled = true;
      scene.dispose();
      sceneRef.current = null;
    };
  }, [assetUrl, attempt]);

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
    // While reading a step, its own removals have not happened yet.
    return computeAssemblyState(steps, index, { pending: progress.section === 'steps' }) as {
      removed: Set<string>;
      hidden: Set<string>;
      highlighted: Set<string>;
      camera: string;
      explode: boolean;
    };
  }, [progress.section, progress.stepIndex, steps]);

  const explode = explodeOverride ?? assembly.explode;

  useEffect(() => {
    sceneRef.current?.applyView({
      removed: assembly.removed,
      hidden: assembly.hidden,
      highlighted: assembly.highlighted,
      isolated,
      selected,
      hovered,
      explode,
    });
  }, [assembly, isolated, selected, hovered, explode]);

  // Parts the current step is about: these get a marker on the model.
  const targets: HotspotTarget[] = useMemo(() => {
    const ids = step ? (focusComponentIds(step) as string[]) : [];
    return ids
      .filter((id) => !assembly.removed.has(id) && !assembly.hidden.has(id))
      .map((id) => {
        const component = componentsById.get(id);
        return { componentId: id, name: component?.name ?? id, system: component?.system ?? 'body' };
      });
  }, [step, assembly]);

  useEffect(() => {
    sceneRef.current?.setHotspots(targets.map((target) => target.componentId));
  }, [targets]);

  // Fly to the step's suggested view whenever the step changes.
  useEffect(() => {
    if (state.kind !== 'ready') return;
    const preset = cameraPreset ?? assembly.camera;
    sceneRef.current?.flyTo(preset, targets.map((target) => target.componentId));
  }, [state.kind, assembly.camera, cameraPreset, targets]);

  // Moving to another step drops a camera the user picked, so the next step's
  // own suggested view takes over.
  const stepKey = `${progress.section}:${progress.stepIndex}`;
  const [cameraStepKey, setCameraStepKey] = useState(stepKey);
  if (stepKey !== cameraStepKey) {
    setCameraStepKey(stepKey);
    setCameraPreset(null);
  }

  // Keep the subject clear of the floating panels: pushed right of the step
  // card on its own, back toward the middle once the part panel opens too.
  useEffect(() => {
    const update = () => sceneRef.current?.setFramingBias(framingBias(Boolean(selected)));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [state.kind, selected]);

  const handleSelect = useCallback((componentId: string | null) => {
    setSelected(componentId);
    if (componentId === null) setIsolated(null);
  }, []);

  useEffect(() => {
    sceneRef.current?.setSelectHandler(handleSelect);
    sceneRef.current?.setHoverHandler(setHovered);
  }, [handleSelect]);

  // --- Persistence and the address bar ----------------------------------

  useEffect(() => {
    writeStored(procedure, progress);
  }, [procedure, progress]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('job', procedure.id);
    params.set('step', step ? step.id : progress.section === 'final' ? 'final' : 'preparation');
    if (selected) params.set('part', selected);
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [procedure.id, progress.section, step, selected]);

  useEffect(() => {
    if (state.kind !== 'unsupported' && state.kind !== 'error') return;
    if (fallbackSvg !== null) return;
    fetch(assetUrl('layout.svg'))
      .then((response) => (response.ok ? response.text() : ''))
      .then(setFallbackSvg)
      .catch(() => setFallbackSvg(''));
  }, [state.kind, fallbackSvg, assetUrl]);

  // --- Navigation --------------------------------------------------------

  const goTo = (section: Section, index = 0) => {
    setProgress((current) =>
      (section === 'steps' ? setStepIndex(current, index, steps.length) : setSection(current, section)) as Progress,
    );
    setIsolated(null);
    setExplodeOverride(null);
    setSelected(null);
    setDrawerOpen(false);
    setCollapsed(false);
  };

  const move = (delta: number) => {
    setProgress((current) => advance(current, delta, steps.length) as Progress);
    setIsolated(null);
    setExplodeOverride(null);
    setSelected(null);
    setCollapsed(false);
  };

  const openPart = (componentId: string) => {
    setSelected(componentId);
    // Re-bias before the flight, so the part lands where the panel is not.
    sceneRef.current?.setFramingBias(framingBias(true));
    sceneRef.current?.focusComponent(componentId);
  };

  const position =
    progress.section === 'preparation' ? 0 : progress.section === 'final' ? steps.length + 1 : progress.stepIndex + 1;
  const selectedComponent = selected ? componentsById.get(selected) ?? null : null;

  return (
    <div className="ww" data-part={selectedComponent ? 'open' : 'closed'}>
      <a className="ww-skip" href="#ww-card">
        Skip to the step
      </a>

      <div className="ww-stage">
        <div className="ww-canvas" ref={canvasRef} />
        <Hotspots
          ref={hotspotsRef}
          targets={targets}
          selected={selected}
          // These are exactly the parts the step names, so label them outright
          // unless there are enough of them to crowd the model.
          alwaysLabel={isTouch() || targets.length <= 5}
          onPick={openPart}
        />

        {state.kind === 'loading' ? (
          <div className="ww-overlay" role="status">
            <span className="ww-spin" />
            <p>{state.message}…</p>
          </div>
        ) : null}

        {state.kind === 'error' ? (
          <div className="ww-overlay" role="alert">
            <p>The 3D model could not be loaded ({state.message}). The steps below still work.</p>
            <button className="ww-btn" type="button" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
            {fallbackSvg ? (
              <div className="ww-fallback" dangerouslySetInnerHTML={{ __html: fallbackSvg }} />
            ) : null}
          </div>
        ) : null}

        {state.kind === 'unsupported' ? (
          <div className="ww-overlay">
            <p>
              This browser has no WebGL, so the model cannot run here. The drawing and the full steps cover the
              same parts.
            </p>
            {fallbackSvg ? (
              <div className="ww-fallback" dangerouslySetInnerHTML={{ __html: fallbackSvg }} />
            ) : null}
          </div>
        ) : null}
      </div>

      <header className="ww-top">
        <a className="ww-brand" href={appPath('/')}>
          Wrenchwise
        </a>
        <button className="ww-btn" type="button" onClick={() => setDrawerOpen(true)}>
          <span aria-hidden="true">☰</span> Steps
        </button>
        <p className="ww-top-title">
          <b>{procedure.title}</b> · {engine?.label} in the {configuration?.label}
        </p>
        <div className="ww-top-right">
          <Tag status={procedure.contentStatus} />
        </div>
      </header>

      <section className="ww-card" id="ww-card" data-collapsed={collapsed} aria-label="Current step">
        <div className="ww-card-grip">
          <span className="ww-eyebrow">
            {progress.section === 'preparation'
              ? 'Before you start'
              : progress.section === 'final'
                ? 'Finish'
                : `Step ${position} of ${steps.length} · ${step?.phase}`}
          </span>
          <button
            className="ww-btn"
            data-icon=""
            type="button"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand the step' : 'Collapse the step'}
            style={{ marginLeft: 'auto' }}
            onClick={() => setCollapsed((value) => !value)}
          >
            <span aria-hidden="true">{collapsed ? '▴' : '▾'}</span>
          </button>
        </div>

        <div className="ww-track" role="group" aria-label="Phases">
          {phases.map((group, index) => {
            const current = step ? group.stepIndexes.includes(progress.stepIndex) : false;
            const currentPhase = phases.findIndex((entry) => entry.stepIndexes.includes(progress.stepIndex));
            const done = progress.section === 'final' || (currentPhase >= 0 && index < currentPhase);
            return (
              <button
                key={group.phase}
                type="button"
                data-state={current ? 'current' : done ? 'done' : 'ahead'}
                aria-label={`${group.phase}, ${group.stepIndexes.length} steps`}
                title={group.phase}
                onClick={() => goTo('steps', group.stepIndexes[0])}
              />
            );
          })}
        </div>

        <div className="ww-card-body">
          {progress.section === 'preparation' ? (
            <Preparation procedure={procedure} progress={progress} setProgress={setProgress} />
          ) : null}

          {step ? (
            <Step
              procedure={procedure}
              step={step}
              progress={progress}
              setProgress={setProgress}
              selected={selected}
              onOpenPart={openPart}
            />
          ) : null}

          {progress.section === 'final' ? (
            <Final procedure={procedure} progress={progress} setProgress={setProgress} summary={summary} />
          ) : null}
        </div>

        <div className="ww-card-foot">
          <button className="ww-btn" type="button" disabled={position === 0} onClick={() => move(-1)}>
            Back
          </button>
          <button
            className="ww-btn ww-btn-lg"
            data-variant="primary"
            type="button"
            disabled={position === steps.length + 1}
            onClick={() => move(1)}
          >
            {position === 0 ? 'Start' : position === steps.length ? 'Final checks' : 'Next'}
          </button>
          <span className="ww-count">
            {summary.checks.done}/{summary.checks.total} checks
          </span>
        </div>
      </section>

      <div className="ww-tools">
        <select
          aria-label="Camera angle"
          value={cameraPreset ?? assembly.camera}
          onChange={(event) => setCameraPreset(event.target.value)}
        >
          {CAMERA_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {CAMERA_LABELS[preset]}
            </option>
          ))}
        </select>
        <button
          className="ww-btn"
          type="button"
          aria-pressed={isolated !== null}
          disabled={!selected && isolated === null}
          onClick={() => setIsolated((current) => (current ? null : selected))}
        >
          Isolate
        </button>
        <button
          className="ww-btn"
          type="button"
          aria-pressed={explode}
          onClick={() => setExplodeOverride(!explode)}
        >
          Pull apart
        </button>
      </div>

      {selectedComponent ? (
        <aside className="ww-part" aria-label="Part detail" style={systemStyle(selectedComponent.system)}>
          <button className="ww-close" type="button" aria-label="Close part detail" onClick={() => handleSelect(null)}>
            ✕
          </button>
          <div className="ww-part-head">
            <h2>{selectedComponent.name}</h2>
            <p className="ww-part-sub">
              {systemLabel(selectedComponent.system)}
              {selectedComponent.quantity.value !== null ? ` · ${selectedComponent.quantity.value} fitted` : ''}
              {selectedComponent.kind === 'group' ? ' · shown as one piece' : ''}
            </p>
          </div>
          <div className="ww-part-scroll">
            {selectedComponent.description ? <p className="ww-say">{selectedComponent.description}</p> : null}

            {selectedComponent.kind === 'group' ? (
              <p className="ww-alert">
                <span>This stands in for several physical pieces, drawn as one.</span>
              </p>
            ) : null}

            <More
              title="How well this is established"
              hint={selectedComponent.gaps.length ? `${selectedComponent.gaps.length} gaps` : undefined}
            >
              <Verification verification={selectedComponent.verification} />
              <Block title="OEM part number">
                <p style={{ margin: 0 }}>
                  {selectedComponent.oemPartNumber.value ?? <Tag status={selectedComponent.oemPartNumber.status} />}
                </p>
              </Block>
              {selectedComponent.gaps.length ? (
                <Block title="What is not known">
                  <GapLines gaps={selectedComponent.gaps} />
                </Block>
              ) : null}
              {selectedComponent.sourceIds.length ? (
                <Block title="Sources">
                  <SourceLines references={selectedComponent.sourceIds.map((sourceId) => ({ sourceId }))} />
                </Block>
              ) : null}
            </More>

            {selectedComponent.procedureStepIds.length ? (
              <Block title="Used in these steps">
                <ul>
                  {selectedComponent.procedureStepIds.map((stepId) => {
                    const index = steps.findIndex((candidate) => candidate.id === stepId);
                    if (index < 0) return null;
                    return (
                      <li key={stepId}>
                        <button
                          className="ww-chip"
                          type="button"
                          onClick={() => goTo('steps', index)}
                          style={systemStyle(selectedComponent.system)}
                        >
                          {index + 1}. {steps[index].title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Block>
            ) : null}
          </div>
        </aside>
      ) : null}

      {drawerOpen ? (
        <>
          <div className="ww-scrim" onClick={() => setDrawerOpen(false)} />
          <nav className="ww-drawer" aria-label="Steps">
            <div className="ww-drawer-head">
              <h2>{procedure.title}</h2>
              <p>
                {summary.steps.done} of {steps.length} steps done · {engine?.label}
              </p>
            </div>
            <div className="ww-drawer-list">
              <button
                type="button"
                aria-current={progress.section === 'preparation' ? 'true' : undefined}
                onClick={() => goTo('preparation')}
              >
                <span className="ww-num">—</span>
                <span>Before you start</span>
              </button>
              {phases.map((group) => (
                <div key={group.phase}>
                  <p className="ww-group">{group.phase}</p>
                  {group.stepIndexes.map((index) => (
                    <button
                      key={steps[index].id}
                      type="button"
                      aria-current={step?.id === steps[index].id ? 'step' : undefined}
                      onClick={() => goTo('steps', index)}
                    >
                      <span className="ww-num">{index + 1}</span>
                      <span>{steps[index].title}</span>
                      {stepComplete(progress, steps[index]) ? <span className="ww-tick">✓</span> : null}
                    </button>
                  ))}
                </div>
              ))}
              <p className="ww-group">Finish</p>
              <button
                type="button"
                aria-current={progress.section === 'final' ? 'true' : undefined}
                onClick={() => goTo('final')}
              >
                <span className="ww-num">—</span>
                <span>Final checks</span>
              </button>
            </div>
          </nav>
        </>
      ) : null}

      {manifest ? (
        <p className="ww-skip" aria-live="polite">
          Model revision {manifest.modelRevision}, {manifest.componentCount} parts, {manifest.evidence.status}{' '}
          geometry.
        </p>
      ) : null}
    </div>
  );
}

// --- Card contents ------------------------------------------------------

function Checks({
  items,
  ticked,
  onToggle,
}: {
  items: { id: string; text: string; sourceRef?: { sourceId: string; locator?: string } }[];
  ticked: string[];
  onToggle: (checkId: string) => void;
}) {
  return (
    <>
      {items.map((item) => (
        <label className="ww-check" key={item.id}>
          <input type="checkbox" checked={ticked.includes(item.id)} onChange={() => onToggle(item.id)} />
          <span>
            {item.text}
            {item.sourceRef ? (
              <>
                {' '}
                (<Source reference={item.sourceRef} />)
              </>
            ) : null}
          </span>
        </label>
      ))}
    </>
  );
}

function Preparation({
  procedure,
  progress,
  setProgress,
}: {
  procedure: Procedure;
  progress: Progress;
  setProgress: React.Dispatch<React.SetStateAction<Progress>>;
}) {
  const engine = enginesById.get(procedure.engineVariantId);
  const configuration = configurationsById.get(procedure.configurationIds[0]);
  return (
    <>
      <h1>{procedure.title}</h1>
      <p className="ww-say">
        {procedure.steps.length} steps on the {engine?.label} as fitted to the {configuration?.label}. Work
        through them in order, and tap any marked part on the model to see what it is.
      </p>

      <p className="ww-alert" data-level="warning">
        <span>
          This is a learning guide, not a verified repair procedure. No measurement or torque figure in it has
          been confirmed — use the factory manual for every value.
        </span>
      </p>

      <Alerts cautions={procedure.preparation.cautions} />

      <Block title={`Before you begin · ${progress.preparation.length} of ${procedure.preparation.checklist.length}`}>
        <Checks
          items={procedure.preparation.checklist}
          ticked={progress.preparation}
          onToggle={(checkId) => setProgress((current) => toggleCheck(current, 'preparation', checkId) as Progress)}
        />
      </Block>

      <More title="Tools and parts you will need" hint={`${procedure.tools.length} tools`}>
        <Block title="Tools">
          <ul>
            {procedure.tools.map((tool) => (
              <li key={tool.id}>
                {tool.name} <Tag status={tool.status} />
              </li>
            ))}
          </ul>
        </Block>
        <Block title="Replacement parts">
          <ul>
            {procedure.parts.map((part) => (
              <li key={part.id}>
                {part.name} {part.partNumber ? <code>{part.partNumber}</code> : <Tag status={part.status} />}
              </li>
            ))}
          </ul>
        </Block>
      </More>

      {engine ? (
        <More title="Does this apply to my car?" hint={`${engine.notEquivalentTo.length} ruled out`}>
          <Block title="This guide is for">
            <p style={{ margin: 0 }}>
              {engine.label} in the {configuration?.label} · {configuration?.market} · {configuration?.steering}
            </p>
          </Block>
          <Block title="Not for these, even though the name is similar">
            <ul>
              {engine.notEquivalentTo.map((entry) => (
                <li key={entry.variant}>
                  <strong>{entry.variant}</strong> — {entry.reason}
                </li>
              ))}
            </ul>
          </Block>
        </More>
      ) : null}

      <More title="Where this guide comes from" hint={`${currentRelease.unresolvedGaps.length} open gaps`}>
        <p style={{ marginTop: 0 }}>{procedure.statusNote}</p>
        <Block title="Sources">
          <SourceLines references={procedure.sources} />
        </Block>
        <Block title="Open gaps in this release">
          <GapLines gaps={currentRelease.unresolvedGaps} />
        </Block>
      </More>
    </>
  );
}

function Step({
  procedure,
  step,
  progress,
  setProgress,
  selected,
  onOpenPart,
}: {
  procedure: Procedure;
  step: ProcedureStep;
  progress: Progress;
  setProgress: React.Dispatch<React.SetStateAction<Progress>>;
  selected: string | null;
  onOpenPart: (componentId: string) => void;
}) {
  const tools = step.tools
    .map((id) => procedure.tools.find((tool) => tool.id === id))
    .filter((tool): tool is Procedure['tools'][number] => Boolean(tool));
  const parts = step.replacementParts
    .map((id) => procedure.parts.find((part) => part.id === id))
    .filter((part): part is Procedure['parts'][number] => Boolean(part));
  const removes = step.view.remove ?? [];
  const restores = step.view.restore ?? [];
  const ticked = progress.steps[step.id] ?? [];

  return (
    <>
      <h1 className="ww-sm">{step.title}</h1>

      {step.instructions.map((instruction, index) => (
        <p className="ww-say" key={index}>
          {instruction}
        </p>
      ))}

      <Alerts cautions={step.cautions} />

      {step.componentIds.length ? (
        <div className="ww-chips">
          {step.componentIds.map((componentId) => {
            const component = componentsById.get(componentId);
            return (
              <button
                className="ww-chip"
                key={componentId}
                type="button"
                aria-pressed={selected === componentId}
                style={systemStyle(component?.system)}
                onClick={() => onOpenPart(componentId)}
              >
                {component?.name ?? componentId}
              </button>
            );
          })}
        </div>
      ) : null}

      <Checks
        items={step.completionChecks}
        ticked={ticked}
        onToggle={(checkId) => setProgress((current) => toggleCheck(current, step.id, checkId) as Progress)}
      />

      {step.specifications.length ? (
        <More title="Specifications" hint={`${step.specifications.length}`} open>
          <dl className="ww-kv">
            {step.specifications.map((specification) => (
              <div key={specification.id} style={{ display: 'contents' }}>
                <dt>
                  {specification.label}
                  {specification.sourceRef ? (
                    <>
                      {' '}
                      — <Source reference={specification.sourceRef} />
                    </>
                  ) : null}
                </dt>
                <dd>
                  {specification.value === null ? (
                    <Tag status={specification.status} />
                  ) : (
                    <>
                      {specification.value}
                      {specification.unit ? ` ${specification.unit}` : ''} <Tag status={specification.status} />
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </More>
      ) : null}

      {tools.length || parts.length ? (
        <More title="Tools and parts for this step" hint={tools.length + parts.length}>
          {tools.length ? (
            <Block title="Tools">
              <ul>
                {tools.map((tool) => (
                  <li key={tool.id}>
                    {tool.name} <Tag status={tool.status} />
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
                    {part.name} {part.partNumber ? <code>{part.partNumber}</code> : <Tag status={part.status} />}
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}
        </More>
      ) : null}

      {removes.length || restores.length ? (
        <More title="What comes off here" hint={`${removes.length} off · ${restores.length} back on`}>
          {removes.length ? (
            <Block title="Removed">
              <p style={{ margin: 0 }}>
                {removes.map((id) => componentsById.get(id)?.name ?? id).join(', ')}
              </p>
            </Block>
          ) : null}
          {restores.length ? (
            <Block title="Refitted">
              <p style={{ margin: 0 }}>
                {restores.map((id) => componentsById.get(id)?.name ?? id).join(', ')}
              </p>
            </Block>
          ) : null}
        </More>
      ) : null}

      <More
        title="Where this step comes from"
        hint={step.gaps.length ? `${step.gaps.length} gaps` : `${step.sourceRefs.length} sources`}
      >
        <p style={{ marginTop: 0 }}>
          <Tag status={step.contentStatus} label="status" />
        </p>
        <Block title="Sources">
          <SourceLines references={step.sourceRefs} />
        </Block>
        {step.gaps.length ? (
          <Block title="What is not established">
            <GapLines gaps={step.gaps} />
          </Block>
        ) : null}
      </More>
    </>
  );
}

function Final({
  procedure,
  progress,
  setProgress,
  summary,
}: {
  procedure: Procedure;
  progress: Progress;
  setProgress: React.Dispatch<React.SetStateAction<Progress>>;
  summary: ReturnType<typeof progressSummary>;
}) {
  return (
    <>
      <h1 className="ww-sm">Before the car moves</h1>
      <p className="ww-say">Last look over everything, then the checks below.</p>

      <Checks
        items={procedure.finalChecks}
        ticked={progress.finalChecks}
        onToggle={(checkId) => setProgress((current) => toggleCheck(current, 'finalChecks', checkId) as Progress)}
      />

      <More title="Your progress" hint={`${summary.steps.done}/${summary.steps.total} steps`} open>
        <dl className="ww-kv">
          <dt>Before you start</dt>
          <dd>
            {summary.preparation.done}/{summary.preparation.total}
          </dd>
          <dt>Steps fully ticked</dt>
          <dd>
            {summary.steps.done}/{summary.steps.total}
          </dd>
          <dt>Step checks</dt>
          <dd>
            {summary.checks.done}/{summary.checks.total}
          </dd>
          <dt>Final checks</dt>
          <dd>
            {summary.finalChecks.done}/{summary.finalChecks.total}
          </dd>
        </dl>
        <p style={{ marginBottom: 0 }}>
          Progress is kept in this browser only, and starts fresh if the guide is revised.
        </p>
      </More>
    </>
  );
}
