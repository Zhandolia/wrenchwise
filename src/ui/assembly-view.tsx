// The stage: a dark workshop panel beside the light reading column.
//
// The contrast is doing work. Silver and cast surfaces read as metal against a
// dark sweep, the blue step highlight separates from everything else, and the
// eye knows at a glance which half of the screen is the model.
//
// Procedural removal (what the step actually takes off) and viewing aids
// (hide, isolate, ghost, separate) are labelled separately in the controls, so
// an explanatory separation is never mistaken for a removal sequence.

import { useCallback, useEffect, useRef, useState } from 'react';
import { appPath } from '../../lib/app-path';
import { componentsById, type AssemblyManifest, type Component, type Procedure } from '../content/catalog';
import { AssemblyScene, CAMERA_PRESETS, webglSupported, type SceneView } from '../viewer/assembly-scene';
import { StatusPill, VerificationAxes, systemColor } from './evidence';

const CAMERA_LABELS: Record<string, string> = {
  iso: 'Three-quarter',
  front: 'Front',
  'front-left': 'Front left',
  'front-right': 'Front right',
  top: 'From above',
  'lower-front': 'From below',
};

type LoadState =
  | { kind: 'unsupported' }
  | { kind: 'loading'; message: string }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

export interface AssemblyViewProps {
  procedure: Procedure;
  view: Omit<SceneView, 'isolated'>;
  focusComponentIds: readonly string[];
  isolated: string | null;
  onSelect: (componentId: string | null) => void;
  onToggleIsolate: () => void;
  onToggleExplode: () => void;
  explodeRequestedByStep: boolean;
  removedLabels: string[];
}

export function AssemblyView(props: AssemblyViewProps) {
  const { procedure, view, focusComponentIds, isolated, onSelect } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AssemblyScene | null>(null);
  const [state, setState] = useState<LoadState>(() =>
    webglSupported() ? { kind: 'loading', message: 'Starting the viewer' } : { kind: 'unsupported' },
  );
  const [manifest, setManifest] = useState<AssemblyManifest | null>(null);
  const [cameraPreset, setCameraPreset] = useState(view.camera);
  const [stepCamera, setStepCamera] = useState(view.camera);
  const [attempt, setAttempt] = useState(0);
  const [fallbackSvg, setFallbackSvg] = useState<string | null>(null);

  const assetUrl = useCallback(
    (file: string) => appPath(`/assets/${procedure.assembly}/${file}`),
    [procedure.assembly],
  );

  // Follow the step's suggested view: when the step changes its camera, adopt
  // it, while leaving a camera the user picked alone within the same step.
  if (view.camera !== stepCamera) {
    setStepCamera(view.camera);
    setCameraPreset(view.camera);
  }

  // Create the scene and load layers in the manifest's declared order, so the
  // timing drive is interactive before the access assemblies arrive.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !webglSupported()) return undefined;

    let cancelled = false;
    const scene = new AssemblyScene(container);
    sceneRef.current = scene;

    (async () => {
      setState({ kind: 'loading', message: 'Reading the assembly manifest' });
      const response = await fetch(assetUrl('assembly.json'));
      if (!response.ok) throw new Error(`manifest ${response.status}`);
      const loaded = (await response.json()) as AssemblyManifest;
      if (cancelled) return;
      setManifest(loaded);

      for (const layer of loaded.loadOrder) {
        const file = loaded.files.find((entry) => entry.layer === layer);
        if (!file) continue;
        setState({ kind: 'loading', message: `Loading ${layer} geometry` });
        await scene.loadLayer(layer, assetUrl(file.file));
        if (cancelled) return;
        if (layer === loaded.loadOrder[0]) setState({ kind: 'ready' });
      }
      setState({ kind: 'ready' });
    })().catch((error: unknown) => {
      if (cancelled) return;
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'The assembly could not be loaded.',
      });
    });

    return () => {
      cancelled = true;
      scene.dispose();
      sceneRef.current = null;
    };
  }, [assetUrl, attempt]);

  useEffect(() => {
    sceneRef.current?.setSelectHandler((pick) => onSelect(pick ? pick.componentId : null));
  }, [onSelect]);

  useEffect(() => {
    sceneRef.current?.applyView({ ...view, isolated });
  }, [view, isolated]);

  useEffect(() => {
    if (state.kind !== 'ready') return;
    sceneRef.current?.setCamera(cameraPreset, focusComponentIds);
  }, [cameraPreset, focusComponentIds, state.kind]);

  // The illustration fallback doubles as the no-WebGL view.
  useEffect(() => {
    if (state.kind !== 'unsupported' && state.kind !== 'error') return;
    if (fallbackSvg !== null) return;
    fetch(assetUrl('layout.svg'))
      .then((response) => (response.ok ? response.text() : ''))
      .then(setFallbackSvg)
      .catch(() => setFallbackSvg(''));
  }, [state.kind, fallbackSvg, assetUrl]);

  const selected: Component | null = view.selected ? componentsById.get(view.selected) ?? null : null;

  return (
    <section className="wr-stage" aria-label="Assembly view">
      <div className="wr-stage-bar">
        <select
          aria-label="Camera view"
          value={cameraPreset}
          onChange={(event) => setCameraPreset(event.target.value)}
        >
          {CAMERA_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {CAMERA_LABELS[preset] ?? preset}
            </option>
          ))}
        </select>
        <button
          className="wr-chip"
          type="button"
          aria-pressed={isolated !== null}
          disabled={!view.selected && isolated === null}
          onClick={props.onToggleIsolate}
        >
          Isolate
        </button>
        <button className="wr-chip" type="button" aria-pressed={view.explode} onClick={props.onToggleExplode}>
          Separate for clarity
        </button>
        <button
          className="wr-chip"
          type="button"
          onClick={() => sceneRef.current?.setCamera(cameraPreset, focusComponentIds)}
        >
          Re-frame
        </button>
      </div>

      <div className="wr-canvas" ref={containerRef}>
        {state.kind === 'loading' ? (
          <div className="wr-canvas-state" role="status">
            <span className="wr-spinner" />
            <span>{state.message}…</span>
          </div>
        ) : null}

        {state.kind === 'error' ? (
          <div className="wr-canvas-state" role="alert">
            <span>The 3D assembly could not be loaded ({state.message}).</span>
            <button className="wr-button" type="button" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
            <span>The step text and the illustration below cover the same components.</span>
          </div>
        ) : null}

        {state.kind === 'unsupported' ? (
          <div className="wr-canvas-state">
            <span>
              This browser does not provide WebGL, so the interactive assembly cannot run. The illustration
              below and the full step text cover the same components.
            </span>
          </div>
        ) : null}

        {state.kind === 'ready' && !selected ? (
          <p className="wr-stage-hint">
            Click a part to identify it. Drag to orbit, scroll to zoom. Arrow keys orbit, + and − zoom, 0 resets.
            {view.explode ? ' Parts are separated to show how they relate — this is not a removal sequence.' : ''}
          </p>
        ) : null}

        {state.kind === 'ready' && selected ? (
          <div className="wr-callout" style={systemColor(selected.system)}>
            <button
              className="wr-callout-close"
              type="button"
              aria-label="Clear selection"
              onClick={() => onSelect(null)}
            >
              ×
            </button>
            <h2>{selected.name}</h2>
            <p>
              {selected.system.replace(/-/g, ' ')} · {selected.kind}
              {selected.kind === 'group' ? ' — stands in for several physical pieces' : ''}
              {selected.quantity.value !== null ? ` · quantity ${selected.quantity.value}` : ''}
              {selected.description ? ` — ${selected.description}` : ''}
            </p>
            <VerificationAxes verification={selected.verification} />
            <p style={{ margin: '6px 0 0' }}>
              OEM part number:{' '}
              {selected.oemPartNumber.value ?? <StatusPill status={selected.oemPartNumber.status} />}
            </p>
            {selected.gaps.length ? <p style={{ margin: '6px 0 0' }}>Gap: {selected.gaps[0]}</p> : null}
          </div>
        ) : null}
      </div>

      {(state.kind === 'unsupported' || state.kind === 'error') && fallbackSvg ? (
        <div
          className="wr-fallback"
          // The SVG is generated by this repository's own build from the component
          // inventory; it is not third-party content.
          dangerouslySetInnerHTML={{ __html: fallbackSvg }}
        />
      ) : null}

      <div className="wr-stage-foot">
        {manifest ? (
          <>
            Model r{manifest.modelRevision} · {manifest.componentCount} components ·{' '}
            {manifest.triangleCount.toLocaleString()} triangles · {manifest.evidence.status} geometry, no
            dimension measured.
          </>
        ) : (
          <>Geometry is illustrative. No dimension is measured.</>
        )}
        {props.removedLabels.length ? (
          <>
            {' '}
            Removed by earlier steps: {props.removedLabels.slice(0, 5).join(', ')}
            {props.removedLabels.length > 5 ? ` and ${props.removedLabels.length - 5} more` : ''}.
          </>
        ) : null}
      </div>
    </section>
  );
}
