// The content catalog: every configuration, engine variant, component
// inventory, procedure, source and release record, loaded from content/ at
// build time.
//
// Files are discovered with a glob, so adding a configuration, engine or
// procedure is a content change with no code change. scripts/validate-content.mjs
// validates the same files against content/schema/ before the build runs.

import { buildSearchIndex } from './search.mjs';

declare global {
  interface ImportMeta {
    glob<T = unknown>(pattern: string, options?: { eager?: boolean }): Record<string, T>;
  }
}

export type EvidenceStatus =
  | 'not-established'
  | 'not-applicable'
  | 'estimated'
  | 'mirror-derived'
  | 'photographic'
  | 'published'
  | 'catalog'
  | 'measured'
  | 'scanned'
  | 'reviewed';

export interface SourceRef {
  sourceId: string;
  locator?: string;
}

export interface Source {
  id: string;
  title: string;
  publisher: string;
  kind: string;
  document?: string;
  revision: string;
  applicability: { configurationIds: string[]; engineVariantIds?: string[]; notes?: string };
  access: { status: string; inspectedOn?: string; via?: string; url?: string; notes?: string };
  usageRights: { status: string; redistribution: boolean; notes?: string };
  permittedUses: string[];
}

export interface SourceRegistry {
  reviewedOn: string;
  policy: string;
  sources: Source[];
  rejected?: { url?: string; document?: string; reason: string }[];
}

export interface Configuration {
  id: string;
  label: string;
  make: string;
  model: string;
  chassis?: string;
  generation?: string;
  modelYear: number;
  market: string;
  steering: 'LHD' | 'RHD';
  engineVariantId: string;
  transmission?: { value: string | null; status: string };
  identificationStatus: string;
  identificationNote?: string;
  unresolvedVariants?: { id: string; question: string; status: string; resolution?: string }[];
  sourceIds: string[];
}

export interface EngineVariant {
  id: string;
  family: string;
  code: string;
  variant: string;
  label: string;
  installedIn: string[];
  layout?: string;
  publishedSpecs?: {
    key: string;
    label: string;
    value: string | number | null;
    unit?: string | null;
    sourceId?: string;
    status: string;
  }[];
  notEquivalentTo: { variant: string; reason: string }[];
  frame: {
    units: string;
    origin: string;
    axes: { x: string; y: string; z: string };
    handedness?: string;
    installationNotes?: string;
  };
  sourceIds: string[];
}

export interface VerificationAxis {
  status: EvidenceStatus;
  sourceIds: string[];
  reviewedBy?: string;
  reviewedOn?: string;
  note?: string;
}

export interface Component {
  id: string;
  name: string;
  description?: string;
  system: string;
  parentId: string | null;
  kind: 'part' | 'assembly' | 'fastener' | 'fastener-set' | 'group';
  quantity: { value: number | null; status: EvidenceStatus; sourceIds?: string[]; note?: string };
  applicability: { configurationIds: string[]; engineVariantIds: string[]; notes?: string };
  oemPartNumber: { value: string | null; status: EvidenceStatus; sourceIds?: string[]; note?: string };
  dimensions?: {
    status: EvidenceStatus;
    sourceIds?: string[];
    items: { key: string; value: number; unit: string; method: string; tolerance?: number; note?: string }[];
  };
  placement?: {
    status: EvidenceStatus;
    frame: string;
    position: [number, number, number];
    axis?: string;
    sourceIds?: string[];
    note?: string;
  };
  asset: { layer: 'core' | 'access'; meshIds: string[] };
  procedureStepIds: string[];
  sourceIds: string[];
  verification: {
    identity: VerificationAxis;
    dimensions: VerificationAxis;
    placement: VerificationAxis;
    fitment: VerificationAxis;
    procedure: VerificationAxis;
  };
  gaps: string[];
}

export interface Inventory {
  engineVariantId: string;
  revision: number;
  units: string;
  frame?: string;
  summary: string;
  components: Component[];
}

export interface Specification {
  id: string;
  label: string;
  value: string | number | null;
  unit: string | null;
  status: string;
  sourceRef?: SourceRef;
  note?: string;
}

export interface Caution {
  level: 'warning' | 'caution' | 'info';
  text: string;
  status?: string;
  sourceRef?: SourceRef;
}

export interface Check {
  id: string;
  text: string;
  sourceRef?: SourceRef;
}

export interface StepView {
  camera: string;
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
  completionChecks: Check[];
  sourceRefs: SourceRef[];
  contentStatus: string;
  gaps: string[];
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
  contentStatus: 'educational-overview' | 'verified';
  statusNote: string;
  sources: SourceRef[];
  tools: { id: string; name: string; detail: string; status: string; sourceRef?: SourceRef }[];
  parts: {
    id: string;
    name: string;
    componentId: string | null;
    partNumber: string | null;
    status: string;
    note?: string;
  }[];
  preparation: { checklist: Check[]; cautions: Caution[] };
  steps: ProcedureStep[];
  finalChecks: Check[];
}

export interface Release {
  id: string;
  date: string;
  modelRevision: number;
  configurationIds: string[];
  procedureIds: string[];
  evidenceStatus: string;
  mechanicalReview?: { status: string; reviewer?: string; reviewedOn?: string; note?: string };
  summary: string;
  assets: { path: string; role: string }[];
  unresolvedGaps: string[];
}

export interface AssemblyManifestFile {
  layer: string;
  file: string;
  byteLength: number;
  sha256: string;
  nodeCount: number;
  triangleCount: number;
  vertexCount: number;
  componentIds: string[];
  meshIds: string[];
}

export interface AssemblyManifest {
  schemaVersion: number;
  engineVariantId: string;
  modelRevision: number;
  units: string;
  frame: { x: string; y: string; z: string };
  evidence: { status: string; note: string; sourceId: string };
  geometryNote: string;
  loadOrder: string[];
  bounds: { min: number[]; max: number[] };
  files: AssemblyManifestFile[];
  components: {
    componentId: string;
    name: string;
    system: string;
    kind: string;
    layer: string;
    meshIds: string[];
    triangleCount: number;
    dimensionStatus: string;
    placementStatus: string;
    procedureStepIds: string[];
  }[];
  buildNotes: string[];
  componentCount: number;
  meshCount: number;
  triangleCount: number;
}

const single = <T>(modules: Record<string, T>, what: string): T => {
  const values = Object.values(modules);
  if (values.length !== 1) throw new Error(`Expected exactly one ${what}, found ${values.length}`);
  return values[0];
};

const many = <T>(modules: Record<string, T>): T[] =>
  Object.keys(modules)
    .sort()
    .map((key) => modules[key]);

export const sourceRegistry = single(
  import.meta.glob<SourceRegistry>('../../content/sources.json', { eager: true }),
  'source registry',
);

export const releaseRecord = single(
  import.meta.glob<{ current: string; releases: Release[] }>('../../content/releases.json', { eager: true }),
  'release record',
);

export const configurations = many<Configuration>(
  import.meta.glob<Configuration>('../../content/configurations/*.json', { eager: true }),
);

export const engines = many<EngineVariant>(
  import.meta.glob<EngineVariant>('../../content/engines/*.json', { eager: true }),
);

export const inventories = many<Inventory>(
  import.meta.glob<Inventory>('../../content/components/*.json', { eager: true }),
);

export const procedures = many<Procedure>(
  import.meta.glob<Procedure>('../../content/procedures/*.json', { eager: true }),
);

export const sourcesById = new Map(sourceRegistry.sources.map((source) => [source.id, source]));
export const configurationsById = new Map(configurations.map((c) => [c.id, c]));
export const enginesById = new Map(engines.map((e) => [e.id, e]));
export const proceduresById = new Map(procedures.map((p) => [p.id, p]));
export const inventoriesByEngine = new Map(inventories.map((i) => [i.engineVariantId, i]));

export const componentsById = new Map<string, Component>(
  inventories.flatMap((inventory) => inventory.components.map((c) => [c.id, c] as [string, Component])),
);

export const currentRelease =
  releaseRecord.releases.find((release) => release.id === releaseRecord.current) ?? releaseRecord.releases[0];

export const searchIndex = buildSearchIndex({ procedures, inventories, engines, configurations });

/** Procedures that apply to one configuration. Never inferred from a model name. */
export function proceduresForConfiguration(configurationId: string): Procedure[] {
  return procedures.filter((procedure) => procedure.configurationIds.includes(configurationId));
}

export function componentsForProcedure(procedure: Procedure): Component[] {
  const inventory = inventoriesByEngine.get(procedure.engineVariantId);
  if (!inventory) return [];
  const used = new Set(
    procedure.steps.flatMap((step) => [
      ...step.componentIds,
      ...(step.view.remove ?? []),
      ...(step.view.restore ?? []),
      ...(step.view.hide ?? []),
      ...(step.view.highlight ?? []),
    ]),
  );
  return inventory.components.filter((component) => used.has(component.id));
}

/** Where the browser assets for a procedure's assembly live, relative to the app base. */
export function assemblyAssetPath(procedure: Procedure, file: string): string {
  return `assets/${procedure.assembly}/${file}`;
}

export function sourceLabel(ref: SourceRef): string {
  const source = sourcesById.get(ref.sourceId);
  if (!source) return ref.sourceId;
  return ref.locator ? `${source.title} — ${ref.locator}` : source.title;
}

/**
 * Whether a source may be linked from the interface. Unauthorized mirrors are
 * recorded for traceability and never linked.
 */
export function sourceIsLinkable(source: Source): boolean {
  return (
    source.usageRights.status !== 'unauthorized-mirror' &&
    typeof source.access.url === 'string' &&
    source.access.url.length > 0
  );
}
