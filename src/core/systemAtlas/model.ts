// ---------------------------------------------------------------------------
// Nightwatch Lane E - System Atlas overlay model.
//
// A domain (business-concept) overlay on top of the technical systemMap. This
// module never imports the systemMap model: the overlay links to technical
// node ids by opaque reference (validated as safe ids only), so no overlay
// operation can mutate SYSTEM_MAP_NODE_KINDS or FACT_CATEGORIES — there is
// simply no reference to mutate through.
//
// Protocol authority stays in src/core/agentProtocol/atlas.ts: the concept
// vocabulary (SYSTEM_ATLAS_CONCEPT_KINDS), the evidence vocabulary
// (AtlasFactCategory), and the upgrade gate (assertNotFactUpgrade) are
// imported, never forked. Pure data: no filesystem, process, or network
// authority.
// ---------------------------------------------------------------------------

import {
  ATLAS_FACT_CATEGORIES,
  SYSTEM_ATLAS_CONCEPT_KINDS,
  assertNotFactUpgrade,
  type AtlasFactCategory,
  type AtlasProvenance,
  type SystemAtlasConceptKind,
  type SystemAtlasRecord,
} from '../agentProtocol/atlas';
import { SYSTEM_ATLAS_RECORD_VERSION } from '../agentProtocol/versions';

/** Overlay implementation identity (not a protocol version). */
export const SYSTEM_ATLAS_OVERLAY_VERSION = 'nightwatch.system-atlas-overlay.v1' as const;

/** Synthetic fixture concept ids live under this prefix and nowhere else. */
export const SYSTEM_ATLAS_SYNTHETIC_PREFIX = 'synthetic.' as const;

/** Thrown when a caller tries to mint COMMUNICATION_EVIDENCE provenance.
 * Slack/Leslie/Pondr scraping is not authorized in this lane, so no producer
 * exists for this category and constructing it is refused fail-closed. */
export const ATLAS_COMMUNICATION_EVIDENCE_UNAUTHORIZED =
  'ATLAS_COMMUNICATION_EVIDENCE_UNAUTHORIZED' as const;

/** Thrown when links are attached to (or retained under) INFERENCE
 * provenance. Unproven links stay empty; honesty is structural. */
export const ATLAS_UNPROVEN_LINK = 'ATLAS_UNPROVEN_LINK' as const;

/** Thrown for a concept kind outside the frozen protocol vocabulary. */
export const ATLAS_UNKNOWN_CONCEPT_KIND = 'ATLAS_UNKNOWN_CONCEPT_KIND' as const;

/** Thrown for malformed record/provenance input. */
export const ATLAS_MALFORMED_RECORD = 'ATLAS_MALFORMED_RECORD' as const;

const CONCEPT_KIND_SET: Record<string, true> = Object.fromEntries(SYSTEM_ATLAS_CONCEPT_KINDS.map((kind) => [kind, true]));
const FACT_CATEGORY_SET: Record<string, true> = Object.fromEntries(ATLAS_FACT_CATEGORIES.map((category) => [category, true]));
const CONFIDENCE_SET: Record<string, true> = { HIGH: true, MEDIUM: true, LOW: true, UNKNOWN: true };

const SAFE_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;
const SAFE_SHA_RE = /^[0-9a-f]{40}$/;
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/;
const MAX_LABEL_LENGTH = 280;
const MAX_LINK_ENTRIES = 16;
const MAX_STRING_FIELD = 512;

export function isSystemAtlasConceptKind(value: unknown): value is SystemAtlasConceptKind {
  return typeof value === 'string' && CONCEPT_KIND_SET[value] === true;
}

export function isAtlasFactCategory(value: unknown): value is AtlasFactCategory {
  return typeof value === 'string' && FACT_CATEGORY_SET[value] === true;
}

function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_ID_RE.test(value);
}

function checkStringField(value: unknown, field: string, allowNull: boolean): string | null {
  if (value === null) {
    if (allowNull) return null;
    throw new Error(`${ATLAS_MALFORMED_RECORD}:${field}:null`);
  }
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_STRING_FIELD) {
    throw new Error(`${ATLAS_MALFORMED_RECORD}:${field}:length`);
  }
  if (CONTROL_CHARS_RE.test(value)) {
    throw new Error(`${ATLAS_MALFORMED_RECORD}:${field}:control-chars`);
  }
  return value;
}

function checkLinkArray(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${ATLAS_MALFORMED_RECORD}:${field}:not-array`);
  if (value.length > MAX_LINK_ENTRIES) throw new Error(`${ATLAS_MALFORMED_RECORD}:${field}:too-many`);
  for (const entry of value) {
    if (!isSafeId(entry)) throw new Error(`${ATLAS_MALFORMED_RECORD}:${field}:unsafe-id`);
  }
  return Object.freeze([...value]);
}

export interface AtlasProvenanceInput {
  readonly category: AtlasFactCategory;
  readonly repository: string | null;
  readonly sourceSha: string | null;
  readonly locator: string | null;
  readonly confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
}

/**
 * Mint overlay provenance. COMMUNICATION_EVIDENCE is refused: without an
 * authorized communication source its only possible content would be
 * fabrication, so the category stays unused by construction.
 */
export function createAtlasProvenance(input: AtlasProvenanceInput): AtlasProvenance {
  if (!isAtlasFactCategory(input.category)) {
    throw new Error(`${ATLAS_MALFORMED_RECORD}:provenance.category`);
  }
  if (input.category === 'COMMUNICATION_EVIDENCE') {
    throw new Error(ATLAS_COMMUNICATION_EVIDENCE_UNAUTHORIZED);
  }
  if (CONFIDENCE_SET[input.confidence] !== true) {
    throw new Error(`${ATLAS_MALFORMED_RECORD}:provenance.confidence`);
  }
  const repository = checkStringField(input.repository, 'provenance.repository', true);
  const locator = checkStringField(input.locator, 'provenance.locator', true);
  let sourceSha: string | null = null;
  if (input.sourceSha !== null) {
    if (typeof input.sourceSha !== 'string' || !SAFE_SHA_RE.test(input.sourceSha)) {
      throw new Error(`${ATLAS_MALFORMED_RECORD}:provenance.sourceSha`);
    }
    sourceSha = input.sourceSha;
  }
  return Object.freeze({ category: input.category, repository, sourceSha, locator, confidence: input.confidence });
}

export interface SystemAtlasRecordInput {
  readonly conceptId: string;
  readonly kind: SystemAtlasConceptKind;
  readonly label: string;
  readonly implementedBy?: readonly string[];
  readonly exposes?: readonly string[];
  readonly consumedBy?: readonly string[];
  readonly provenance: AtlasProvenanceInput;
}

/**
 * Construct an overlay record. INFERENCE records must leave every link list
 * empty: a link is a claim that a business concept is implemented/exposed/
 * consumed by specific technical nodes, and an inference is not proof of that
 * claim. Provenance for such links must be minted honestly (DOCUMENTED_FACT
 * or stronger) with a real repository/sha/locator behind it — or the links
 * stay empty.
 */
export function createSystemAtlasRecord(input: SystemAtlasRecordInput): SystemAtlasRecord {
  if (!isSafeId(input.conceptId)) throw new Error(`${ATLAS_MALFORMED_RECORD}:conceptId`);
  if (!isSystemAtlasConceptKind(input.kind)) {
    throw new Error(`${ATLAS_UNKNOWN_CONCEPT_KIND}:${String(input.kind)}`);
  }
  if (
    typeof input.label !== 'string' ||
    input.label.length === 0 ||
    input.label.length > MAX_LABEL_LENGTH ||
    CONTROL_CHARS_RE.test(input.label)
  ) {
    throw new Error(`${ATLAS_MALFORMED_RECORD}:label`);
  }
  const provenance = createAtlasProvenance(input.provenance);
  const implementedBy = checkLinkArray(input.implementedBy ?? [], 'implementedBy');
  const exposes = checkLinkArray(input.exposes ?? [], 'exposes');
  const consumedBy = checkLinkArray(input.consumedBy ?? [], 'consumedBy');
  if (provenance.category === 'INFERENCE' && (implementedBy.length > 0 || exposes.length > 0 || consumedBy.length > 0)) {
    throw new Error(ATLAS_UNPROVEN_LINK);
  }
  return Object.freeze({
    schemaVersion: SYSTEM_ATLAS_RECORD_VERSION,
    conceptId: input.conceptId,
    kind: input.kind,
    label: input.label,
    implementedBy,
    exposes,
    consumedBy,
    provenance,
  });
}

export type AtlasRecordValidation =
  | { readonly ok: true; readonly value: SystemAtlasRecord }
  | { readonly ok: false; readonly reason: string };

function invalid(reason: string): AtlasRecordValidation {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Fail-closed structural validation for untrusted/JSON record input. Never
 * throws; never upgrades; COMMUNICATION_EVIDENCE input is rejected so the
 * unused category cannot enter through the JSON door either.
 */
export function validateSystemAtlasRecord(value: unknown): AtlasRecordValidation {
  if (!isRecord(value)) return invalid('not-record');
  if (value['schemaVersion'] !== SYSTEM_ATLAS_RECORD_VERSION) return invalid('schemaVersion');
  if (!isSafeId(value['conceptId'])) return invalid('conceptId');
  if (!isSystemAtlasConceptKind(value['kind'])) return invalid('kind');
  const label = value['label'];
  if (
    typeof label !== 'string' ||
    label.length === 0 ||
    label.length > MAX_LABEL_LENGTH ||
    CONTROL_CHARS_RE.test(label)
  ) {
    return invalid('label');
  }
  const provenanceRaw = value['provenance'];
  if (!isRecord(provenanceRaw)) return invalid('provenance');
  if (!isAtlasFactCategory(provenanceRaw['category'])) return invalid('provenance.category');
  if (provenanceRaw['category'] === 'COMMUNICATION_EVIDENCE') {
    return invalid(ATLAS_COMMUNICATION_EVIDENCE_UNAUTHORIZED);
  }
  try {
    const record = createSystemAtlasRecord({
      conceptId: value['conceptId'] as string,
      kind: value['kind'] as SystemAtlasConceptKind,
      label,
      implementedBy: value['implementedBy'] as readonly string[] | undefined,
      exposes: value['exposes'] as readonly string[] | undefined,
      consumedBy: value['consumedBy'] as readonly string[] | undefined,
      provenance: provenanceRaw as unknown as AtlasProvenanceInput,
    });
    return { ok: true, value: record };
  } catch (error) {
    return invalid(error instanceof Error ? error.message : 'malformed');
  }
}

export interface AtlasRelabelInput {
  readonly category: AtlasFactCategory;
  readonly repository?: string | null;
  readonly sourceSha?: string | null;
  readonly locator?: string | null;
  readonly confidence?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
}

/**
 * Re-provenance an existing record. Upgrades throw
 * ATLAS_INFERENCE_PRESENTED_AS_FACT via the protocol gate; relabels into
 * COMMUNICATION_EVIDENCE are unauthorized; relabels into INFERENCE on a
 * linked record are refused because the links would become unproven.
 */
export function relabelAtlasProvenance(record: SystemAtlasRecord, next: AtlasRelabelInput): SystemAtlasRecord {
  if (!isAtlasFactCategory(next.category)) {
    throw new Error(`${ATLAS_MALFORMED_RECORD}:provenance.category`);
  }
  if (next.category === 'COMMUNICATION_EVIDENCE') {
    throw new Error(ATLAS_COMMUNICATION_EVIDENCE_UNAUTHORIZED);
  }
  assertNotFactUpgrade(record.provenance.category, next.category);
  if (
    next.category === 'INFERENCE' &&
    (record.implementedBy.length > 0 || record.exposes.length > 0 || record.consumedBy.length > 0)
  ) {
    throw new Error(ATLAS_UNPROVEN_LINK);
  }
  const provenance = createAtlasProvenance({
    category: next.category,
    repository: next.repository !== undefined ? next.repository : record.provenance.repository,
    sourceSha: next.sourceSha !== undefined ? next.sourceSha : record.provenance.sourceSha,
    locator: next.locator !== undefined ? next.locator : record.provenance.locator,
    confidence: next.confidence ?? record.provenance.confidence,
  });
  return Object.freeze({ ...record, provenance });
}
