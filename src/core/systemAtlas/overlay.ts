// ---------------------------------------------------------------------------
// Nightwatch Lane E - System Atlas overlay store and bounded retrieval.
//
// The overlay is an immutable, in-memory collection of SystemAtlasRecords.
// Retrieval is bounded like every other atlas surface: limits clamp to
// [1, ATLAS_HARD_LIMIT] via the protocol's clampAtlasLimit, results arrive in
// deterministic conceptId order, and `truncated` reports exactly whether more
// records matched than were returned.
//
// Links from business concepts to technical systemMap node ids are opaque
// safe-id references. The overlay never interprets them against
// SYSTEM_MAP_NODE_KINDS — it only records ids the caller proves are real by
// passing them in `knownTechnicalNodeIds` ( ids read back from an approved
// source: the systemMap projection, owner-approved docs, or a read through
// the existing siblingSource boundary). Unproven ids are dropped, counted in
// `droppedUnproven`, and never stored.
//
// Pure data: no filesystem, process, or network authority.
// ---------------------------------------------------------------------------

import {
  ATLAS_HARD_LIMIT,
  clampAtlasLimit,
  type AtlasQuery,
  type AtlasQueryResult,
  type SystemAtlasConceptKind,
  type SystemAtlasRecord,
} from '../agentProtocol/atlas';
import { ATLAS_QUERY_VERSION } from '../agentProtocol/versions';
import {
  ATLAS_MALFORMED_RECORD,
  ATLAS_UNPROVEN_LINK,
  createAtlasProvenance,
  isSystemAtlasConceptKind,
  validateSystemAtlasRecord,
} from './model';

export { ATLAS_HARD_LIMIT };

/** Thrown when two records claim the same conceptId. */
export const ATLAS_DUPLICATE_CONCEPT_ID = 'ATLAS_DUPLICATE_CONCEPT_ID' as const;

const SAFE_TECHNICAL_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;
const MAX_QUERY_TERMS = 16;
const MAX_TERM_LENGTH = 128;

export interface SystemAtlasOverlay {
  readonly records: readonly SystemAtlasRecord[];
}

/**
 * Build an immutable overlay. Each record is re-validated fail-closed (so a
 * forged object smuggled past the constructor is still caught), duplicate
 * conceptIds are refused, and storage order is deterministic by conceptId.
 */
export function createSystemAtlasOverlay(records: readonly SystemAtlasRecord[]): SystemAtlasOverlay {
  const seen = new Set<string>();
  const accepted: SystemAtlasRecord[] = [];
  for (const record of records) {
    const validated = validateSystemAtlasRecord(record);
    if (!validated.ok) throw new Error(`${ATLAS_MALFORMED_RECORD}:overlay:${validated.reason}`);
    if (seen.has(validated.value.conceptId)) {
      throw new Error(`${ATLAS_DUPLICATE_CONCEPT_ID}:${validated.value.conceptId}`);
    }
    seen.add(validated.value.conceptId);
    accepted.push(validated.value);
  }
  accepted.sort((left, right) => (left.conceptId < right.conceptId ? -1 : left.conceptId > right.conceptId ? 1 : 0));
  return { records: Object.freeze(accepted) };
}

/**
 * Mint a bounded atlas query. Terms are capped in count and length; the limit
 * clamps to the protocol default (5) / hard bound (8).
 */
export function createAtlasQuery(terms: readonly string[], limit: number): AtlasQuery {
  if (!Array.isArray(terms) || terms.length > MAX_QUERY_TERMS) {
    throw new Error(`${ATLAS_MALFORMED_RECORD}:query.terms`);
  }
  for (const term of terms) {
    if (typeof term !== 'string' || term.length === 0 || term.length > MAX_TERM_LENGTH) {
      throw new Error(`${ATLAS_MALFORMED_RECORD}:query.term`);
    }
  }
  return { schemaVersion: ATLAS_QUERY_VERSION, terms: Object.freeze([...terms]), limit: clampAtlasLimit(limit) };
}

function haystack(record: SystemAtlasRecord): string {
  return `${record.conceptId}\n${record.kind}\n${record.label}`.toLowerCase();
}

/**
 * Bounded concept retrieval. Empty terms match everything (still bounded).
 * Matching is case-insensitive substring over conceptId/kind/label. The
 * result never exceeds ATLAS_HARD_LIMIT entries; `truncated` is true iff
 * more records matched than fit.
 */
export function querySystemAtlas(
  overlay: SystemAtlasOverlay,
  query: AtlasQuery,
): AtlasQueryResult<SystemAtlasRecord> {
  if (query.schemaVersion !== ATLAS_QUERY_VERSION) {
    throw new Error(`${ATLAS_MALFORMED_RECORD}:query.schemaVersion`);
  }
  const limit = clampAtlasLimit(query.limit);
  const needles = query.terms.map((term) => term.toLowerCase()).filter((term) => term.length > 0);
  const matched = overlay.records.filter(
    (record) => needles.length === 0 || needles.every((needle) => haystack(record).includes(needle)),
  );
  const truncated = matched.length > limit;
  return { records: Object.freeze(matched.slice(0, limit)), truncated };
}

/** Bounded retrieval restricted to one concept kind. Unknown kinds fail closed. */
export function querySystemAtlasByKind(
  overlay: SystemAtlasOverlay,
  kind: SystemAtlasConceptKind,
  limit: number,
): AtlasQueryResult<SystemAtlasRecord> {
  if (!isSystemAtlasConceptKind(kind)) {
    throw new Error(`${ATLAS_MALFORMED_RECORD}:query.kind`);
  }
  const bound = clampAtlasLimit(limit);
  const matched = overlay.records.filter((record) => record.kind === kind);
  const truncated = matched.length > bound;
  return { records: Object.freeze(matched.slice(0, bound)), truncated };
}

export interface AtlasLinkProof {
  /** Owner-approved repository the ids were read back from (docs or source). */
  readonly repository: string | null;
  /** 40-hex source SHA when the proof came from source; null for docs. */
  readonly sourceSha: string | null;
  /** Locator for the proof (doc path, fixture anchor, or source locator). */
  readonly locator: string | null;
}

export interface AtlasLinkResult {
  readonly record: SystemAtlasRecord;
  /** Ids proven real and now attached. */
  readonly linked: readonly string[];
  /** Requested ids with no proof. Dropped, never stored. */
  readonly droppedUnproven: readonly string[];
}

/**
 * Attach technical-node links to a concept. Only ids present in
 * `knownTechnicalNodeIds` are stored; everything else is reported in
 * `droppedUnproven` and left out, so an unimplemented link stays empty
 * rather than becoming a guess. INFERENCE records cannot be linked at all:
 * mint a DOCUMENTED_FACT (or stronger) record with real proof instead —
 * upgrading the inference in place would be INFERENCE presented as fact.
 */
export function linkConceptToTechnicalNodes(
  record: SystemAtlasRecord,
  nodeIds: readonly string[],
  knownTechnicalNodeIds: ReadonlySet<string> | readonly string[],
  proof: AtlasLinkProof,
): AtlasLinkResult {
  if (record.provenance.category === 'INFERENCE') {
    throw new Error(ATLAS_UNPROVEN_LINK);
  }
  const linked: string[] = [];
  const droppedUnproven: string[] = [];
  const known = new Set<string>(knownTechnicalNodeIds);
  const seen = new Set<string>(record.implementedBy);
  for (const nodeId of nodeIds) {
    if (typeof nodeId !== 'string' || !SAFE_TECHNICAL_ID_RE.test(nodeId)) {
      throw new Error(`${ATLAS_MALFORMED_RECORD}:technicalNodeId`);
    }
    if (!known.has(nodeId)) {
      droppedUnproven.push(nodeId);
      continue;
    }
    if (!seen.has(nodeId)) {
      seen.add(nodeId);
      linked.push(nodeId);
    }
  }
  const provenance = createAtlasProvenance({
    category: record.provenance.category,
    repository: proof.repository,
    sourceSha: proof.sourceSha,
    locator: proof.locator,
    confidence: record.provenance.confidence,
  });
  const next: SystemAtlasRecord = Object.freeze({
    ...record,
    implementedBy: Object.freeze([...record.implementedBy, ...linked]),
    provenance,
  });
  return {
    record: next,
    linked: Object.freeze(linked),
    droppedUnproven: Object.freeze(droppedUnproven),
  };
}
