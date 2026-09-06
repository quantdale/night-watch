// ---------------------------------------------------------------------------
// Bug Atlas + System Atlas retrieval contracts.
// Historical knowledge is bounded retrieval, never a context dump.
// Inferences never upgrade into facts.
// Pure data.
// ---------------------------------------------------------------------------

import { ATLAS_QUERY_VERSION, BUG_ATLAS_RECORD_VERSION, SYSTEM_ATLAS_RECORD_VERSION } from './versions';

export { ATLAS_QUERY_VERSION, BUG_ATLAS_RECORD_VERSION, SYSTEM_ATLAS_RECORD_VERSION };

export const ATLAS_FACT_CATEGORIES = [
  'SOURCE_FACT',
  'DOCUMENTED_FACT',
  'COMMUNICATION_EVIDENCE',
  'DEPLOYMENT_FACT',
  'RUNTIME_FACT',
  'OBSERVATION',
  'INFERENCE',
] as const;
export type AtlasFactCategory = (typeof ATLAS_FACT_CATEGORIES)[number];

const FACT_RANK: Record<AtlasFactCategory, number> = {
  SOURCE_FACT: 7,
  DOCUMENTED_FACT: 6,
  DEPLOYMENT_FACT: 5,
  RUNTIME_FACT: 4,
  OBSERVATION: 3,
  COMMUNICATION_EVIDENCE: 2,
  INFERENCE: 1,
};

export function weakerAtlasFactCategory(left: AtlasFactCategory, right: AtlasFactCategory): AtlasFactCategory {
  return FACT_RANK[left] <= FACT_RANK[right] ? left : right;
}

export const SYSTEM_ATLAS_CONCEPT_KINDS = [
  'BUSINESS_ENTITY',
  'BUSINESS_PROCESS',
  'CAPABILITY',
  'WORKFLOW',
  'INVARIANT',
  'STATE_TRANSITION',
  'EVENT',
  'JOB',
  'DATA_CONCEPT',
  'PRODUCT_FEATURE',
  'ROLE',
  'DEPENDENCY',
  'OPERATIONAL_TERM',
  'FAILURE_MODE',
] as const;
export type SystemAtlasConceptKind = (typeof SYSTEM_ATLAS_CONCEPT_KINDS)[number];

export const ATLAS_DEFAULT_LIMIT = 5 as const;
export const ATLAS_HARD_LIMIT = 8 as const;

export interface AtlasProvenance {
  readonly category: AtlasFactCategory;
  readonly repository: string | null;
  readonly sourceSha: string | null;
  readonly locator: string | null;
  readonly confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
}

export interface BugAtlasRecord {
  readonly schemaVersion: typeof BUG_ATLAS_RECORD_VERSION;
  readonly bugId: string;
  readonly product: string | null;
  readonly repository: string | null;
  readonly service: string | null;
  readonly symptom: string | null;
  readonly expected: string | null;
  readonly actual: string | null;
  readonly trigger: string | null;
  readonly rootCause: string | null;
  readonly fixLocator: string | null;
  readonly testsAdded: readonly string[];
  readonly violatedInvariant: string | null;
  readonly detectionSignals: readonly string[];
  readonly provenance: AtlasProvenance;
  readonly relatedBugIds: readonly string[];
}

export interface SystemAtlasRecord {
  readonly schemaVersion: typeof SYSTEM_ATLAS_RECORD_VERSION;
  readonly conceptId: string;
  readonly kind: SystemAtlasConceptKind;
  readonly label: string;
  readonly implementedBy: readonly string[];
  readonly exposes: readonly string[];
  readonly consumedBy: readonly string[];
  readonly provenance: AtlasProvenance;
}

export interface AtlasQuery {
  readonly schemaVersion: typeof ATLAS_QUERY_VERSION;
  readonly terms: readonly string[];
  readonly limit: number;
}

export interface AtlasQueryResult<T> {
  readonly records: readonly T[];
  readonly truncated: boolean;
}

export function clampAtlasLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1) return ATLAS_DEFAULT_LIMIT;
  return limit > ATLAS_HARD_LIMIT ? ATLAS_HARD_LIMIT : limit;
}

export function assertNotFactUpgrade(from: AtlasFactCategory, to: AtlasFactCategory): void {
  if (FACT_RANK[to] > FACT_RANK[from]) {
    throw new Error(`ATLAS_INFERENCE_PRESENTED_AS_FACT:${from}->${to}`);
  }
}
