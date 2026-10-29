// Assembly state machine: computes the cumulative scene state at any procedure step.
// Each step's `view` has: remove[], restore[], hide[], highlight[], camera, explode?.
// remove/restore are cumulative (procedural). hide/highlight are step-local (viewing aids).

export interface StepView {
  camera?: string;
  remove?: string[];
  restore?: string[];
  hide?: string[];
  highlight?: string[];
  explode?: boolean;
}

export interface AssemblyState {
  removed: Set<string>;       // Cumulative: parts procedurally removed up to this step
  hidden: Set<string>;        // Step-local: parts hidden for clarity
  highlighted: Set<string>;   // Step-local: parts highlighted in this step
  camera: string;             // Camera preset for this step
  explode: boolean;           // Whether to show exploded view
}

export function computeAssemblyState(
  steps: { id: string; view: StepView }[],
  currentStepIndex: number
): AssemblyState {
  const removed = new Set<string>();

  // Fold remove/restore cumulatively from step 0 to currentStepIndex
  for (let i = 0; i <= currentStepIndex; i++) {
    const view = steps[i].view;
    for (const id of view.remove || []) removed.add(id);
    for (const id of view.restore || []) removed.delete(id);
  }

  // Step-local properties come only from the current step
  const currentView = steps[currentStepIndex].view;

  return {
    removed,
    hidden: new Set(currentView.hide || []),
    highlighted: new Set(currentView.highlight || []),
    camera: currentView.camera || 'iso',
    explode: currentView.explode || false,
  };
}

export function isComponentVisible(
  componentId: string,
  state: AssemblyState
): boolean {
  return !state.removed.has(componentId) && !state.hidden.has(componentId);
}

export function getComponentAppearance(
  componentId: string,
  state: AssemblyState,
  selectedId: string | null
): 'normal' | 'highlighted' | 'selected' | 'ghost' | 'hidden' {
  if (state.removed.has(componentId) || state.hidden.has(componentId)) return 'hidden';
  if (componentId === selectedId) return 'selected';
  if (state.highlighted.has(componentId)) return 'highlighted';
  return 'normal';
}

