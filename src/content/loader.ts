// Content loader: reads procedure, inventory, and configuration JSONs.
// Works with both bundled imports and fetch-based loading.

export interface Source {
  sourceId: string;
  locator?: string;
}

export interface Specification {
  id: string;
  label: string;
  value: string | number | null;
  unit: string | null;
  status: string;
  sourceRef?: Source;
  note?: string;
}

export interface Caution {
  level: 'warning' | 'caution' | 'info';
  text: string;
  status?: string;
  sourceRef?: Source;
}

export interface CompletionCheck {
  id: string;
  text: string;
}

export interface StepView {
  camera?: string;
  remove?: string[];
  restore?: string[];
  hide?: string[];
  highlight?: string[];
  explode?: boolean;
}

export interface ProcedureStep {
  id: string;
  title: string;
  phase: string;
  instructions: string[];
  prerequisites: string[];
  componentIds: string[];
  tools: string[];
  replacementParts: string[];
  specifications: Specification[];
  view: StepView;
  cautions: Caution[];
  completionChecks: CompletionCheck[];
  sourceRefs: Source[];
  contentStatus: string;
  gaps: string[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  sourceRef?: Source;
}

export interface ToolEntry {
  id: string;
  name: string;
  detail: string;
  status: string;
}

export interface PartEntry {
  id: string;
  name: string;
  componentId: string | null;
  partNumber: string | null;
  status: string;
  note?: string;
}

export interface Procedure {
  id: string;
  revision: number;
  title: string;
  system: string;
  keywords: string[];
  configurationIds: string[];
  engineVariantId: string;
  assembly: string;
  contentStatus: string;
  statusNote: string;
  sources: Source[];
  tools: ToolEntry[];
  parts: PartEntry[];
  preparation: {
    checklist: ChecklistItem[];
    cautions: Caution[];
  };
  steps: ProcedureStep[];
  finalChecks: ChecklistItem[];
}

export interface ComponentVerification {
  identity: { status: string; sourceIds: string[] };
  dimensions: { status: string; sourceIds: string[] };
  placement: { status: string; sourceIds: string[] };
  fitment: { status: string; sourceIds: string[] };
  procedure: { status: string; sourceIds: string[] };
}

export interface Component {
  id: string;
  name: string;
  description: string;
  system: string;
  parentId: string | null;
  kind: string;
  applicability: { configurationIds: string[]; engineVariantIds: string[] };
  oemPartNumber: { value: string | null; status: string };
  asset: { layer: string; meshIds: string[] };
  procedureStepIds: string[];
  sourceIds: string[];
  verification: ComponentVerification;
  gaps: string[];
}

export interface Inventory {
  engineVariantId: string;
  revision: number;
  units: string;
  summary: string;
  components: Component[];
}

export interface Configuration {
  id: string;
  label: string;
  make: string;
  model: string;
  chassis: string;
  modelYear: number;
  market: string;
  steering: string;
  engineVariantId: string;
}

// The content bundle loaded at startup
export interface ContentBundle {
  procedure: Procedure;
  inventory: Inventory;
  configuration: Configuration;
  componentMap: Map<string, Component>;
}

export async function loadContent(basePath: string): Promise<ContentBundle> {
  const [procedure, inventory, configuration] = await Promise.all([
    fetch(`${basePath}content/procedures/2jz-ge-vvti-timing-belt.json`).then(r => r.json()) as Promise<Procedure>,
    fetch(`${basePath}content/components/2jz-ge-vvti-jzs160.json`).then(r => r.json()) as Promise<Inventory>,
    fetch(`${basePath}content/configurations/lexus-gs300-jzs160-2000-us-lhd.json`).then(r => r.json()) as Promise<Configuration>,
  ]);

  const componentMap = new Map<string, Component>();
  for (const c of inventory.components) {
    componentMap.set(c.id, c);
  }

  return { procedure, inventory, configuration, componentMap };
}

