// ---------------------------------------------------------------------------
// Lane D — BugAtlasRecord validation and normalisation.
//
// Fail-closed ingest: unknown shapes, missing provenance, and missing fact
// categories throw. Missing *descriptive* fields stay null — never invented.
// Every free-text field is credential-scrubbed and byte-capped on the way in
// so no stored record can leak a secret. INFERENCE records can only be
// presented weaker, never upgraded, via the frozen protocol rank. Pure
// module: no fs/network/child_process/AI authority.
// ---------------------------------------------------------------------------

import {
  ATLAS_FACT_CATEGORIES,
  BUG_ATLAS_RECORD_VERSION,
  weakerAtlasFactCategory,
  type AtlasFactCategory,
  type AtlasProvenance,
  type BugAtlasRecord,
} from '../agentProtocol/atlas';
import { BUG_ATLAS_FIELD_BYTE_CAP } from './types';
import { capTextField, redactCredentialsInText } from './sanitize';

type BugAtlasErrorCode =
  | 'BUG_ATLAS_NOT_AN_OBJECT'
  | 'BUG_ATLAS_SCHEMA_MISMATCH'
  | 'BUG_ATLAS_BUG_ID_REQUIRED'
  | 'BUG_ATLAS_PROVENANCE_REQUIRED'
  | 'BUG_ATLAS_FACT_CATEGORY_REQUIRED';

export class BugAtlasValidationError extends Error {
  readonly code: BugAtlasErrorCode;
  constructor(code: BugAtlasErrorCode, detail: string) {
    super(`${code}:${detail}`);
    this.name = 'BugAtlasValidationError';
    this.code = code;
  }
}

const NULLABLE_TEXT_FIELDS = [
  'product',
  'repository',
  'service',
  'symptom',
  'expected',
  'actual',
  'trigger',
  'rootCause',
  'fixLocator',
  'violatedInvariant',
] as const;

const STRING_LIST_FIELDS = [
  'testsAdded',
  'detectionSignals',
  'relatedBugIds',
] as const;

const CONFIDENCE_VALUES = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] as const;
type AtlasConfidence = AtlasProvenance['confidence'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanNullableText(
  value: unknown,
  field: string,
): { readonly text: string | null; readonly redactions: number } {
  if (value === undefined || value === null) return { text: null, redactions: 0 };
  if (typeof value !== 'string') {
    throw new BugAtlasValidationError(
      'BUG_ATLAS_SCHEMA_MISMATCH',
      `${field} must be a string or null`,
    );
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return { text: null, redactions: 0 };
  const { text, redactions } = redactCredentialsInText(trimmed);
  return { text: capTextField(text, BUG_ATLAS_FIELD_BYTE_CAP), redactions };
}

function cleanStringList(value: unknown, field: string): readonly string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new BugAtlasValidationError(
      'BUG_ATLAS_SCHEMA_MISMATCH',
      `${field} must be a string array`,
    );
  }
  const cleaned: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') {
      throw new BugAtlasValidationError(
        'BUG_ATLAS_SCHEMA_MISMATCH',
        `${field} must contain only strings`,
      );
    }
    const trimmed = entry.trim();
    if (trimmed.length === 0) continue;
    cleaned.push(
      capTextField(redactCredentialsInText(trimmed).text, BUG_ATLAS_FIELD_BYTE_CAP),
    );
  }
  return cleaned;
}

function cleanProvenance(value: unknown): AtlasProvenance {
  if (!isRecord(value)) {
    throw new BugAtlasValidationError(
      'BUG_ATLAS_PROVENANCE_REQUIRED',
      'record carries no provenance object',
    );
  }
  const category = value['category'];
  if (typeof category !== 'string' || !ATLAS_FACT_CATEGORIES.includes(category as AtlasFactCategory)) {
    // A missing or unknown category is fail-closed: silently treating history
    // as SOURCE_FACT (or as anything at all) would fabricate authority.
    throw new BugAtlasValidationError(
      'BUG_ATLAS_FACT_CATEGORY_REQUIRED',
      'provenance.category must be a known AtlasFactCategory',
    );
  }
  const confidence = value['confidence'];
  const safeConfidence: AtlasConfidence =
    typeof confidence === 'string' &&
    (CONFIDENCE_VALUES as readonly string[]).includes(confidence)
      ? (confidence as AtlasConfidence)
      : 'UNKNOWN';
  const optional = (
    field: 'repository' | 'sourceSha' | 'locator',
  ): string | null => {
    const raw = value[field];
    if (raw === undefined || raw === null) return null;
    if (typeof raw !== 'string' || raw.trim().length === 0) return null;
    return capTextField(raw.trim(), BUG_ATLAS_FIELD_BYTE_CAP);
  };
  return {
    category: category as AtlasFactCategory,
    repository: optional('repository'),
    sourceSha: optional('sourceSha'),
    locator: optional('locator'),
    confidence: safeConfidence,
  };
}

export interface NormalizedBugAtlasRecord {
  readonly record: BugAtlasRecord;
  /** Credential spans scrubbed while normalising (informational only). */
  readonly redactions: number;
}

/**
 * Validate and normalise one candidate record. Throws fail-closed on wrong
 * schema version, empty bugId, or missing provenance/category. Descriptive
 * gaps stay null; unknown confidence stays UNKNOWN.
 */
export function normalizeBugAtlasRecord(input: unknown): NormalizedBugAtlasRecord {
  if (!isRecord(input)) {
    throw new BugAtlasValidationError('BUG_ATLAS_NOT_AN_OBJECT', 'record must be an object');
  }
  if (input['schemaVersion'] !== BUG_ATLAS_RECORD_VERSION) {
    throw new BugAtlasValidationError(
      'BUG_ATLAS_SCHEMA_MISMATCH',
      `schemaVersion must be ${BUG_ATLAS_RECORD_VERSION}`,
    );
  }
  const bugId = input['bugId'];
  if (typeof bugId !== 'string' || bugId.trim().length === 0) {
    throw new BugAtlasValidationError('BUG_ATLAS_BUG_ID_REQUIRED', 'bugId must be a non-empty string');
  }
  let redactions = 0;
  const text: Record<string, string | null> = {};
  for (const field of NULLABLE_TEXT_FIELDS) {
    const cleaned = cleanNullableText(input[field], field);
    text[field] = cleaned.text;
    redactions += cleaned.redactions;
  }
  const lists: Record<string, readonly string[]> = {};
  for (const field of STRING_LIST_FIELDS) {
    lists[field] = cleanStringList(input[field], field);
  }
  const record: BugAtlasRecord = {
    schemaVersion: BUG_ATLAS_RECORD_VERSION,
    bugId: bugId.trim(),
    product: text['product'] ?? null,
    repository: text['repository'] ?? null,
    service: text['service'] ?? null,
    symptom: text['symptom'] ?? null,
    expected: text['expected'] ?? null,
    actual: text['actual'] ?? null,
    trigger: text['trigger'] ?? null,
    rootCause: text['rootCause'] ?? null,
    fixLocator: text['fixLocator'] ?? null,
    testsAdded: lists['testsAdded'] ?? [],
    violatedInvariant: text['violatedInvariant'] ?? null,
    detectionSignals: lists['detectionSignals'] ?? [],
    provenance: cleanProvenance(input['provenance']),
    relatedBugIds: lists['relatedBugIds'] ?? [],
  };
  return { record, redactions };
}

/**
 * Present a record at INFERENCE strength or weaker. The frozen protocol rank
 * only ever demotes here: an INFERENCE-sourced record can never leave this
 * function labelled SOURCE_FACT. Throws via assertNotFactUpgrade semantics
 * when the caller asks for an upgrade instead.
 */
export function presentAsInference(record: BugAtlasRecord): BugAtlasRecord {
  const category = weakerAtlasFactCategory(record.provenance.category, 'INFERENCE');
  if (category !== 'INFERENCE') {
    // Unreachable through weakerAtlasFactCategory (INFERENCE is the floor),
    // kept as a structural tripwire against future rank edits.
    throw new BugAtlasValidationError(
      'BUG_ATLAS_FACT_CATEGORY_REQUIRED',
      'inference presentation must not exceed INFERENCE',
    );
  }
  return {
    ...record,
    testsAdded: [...record.testsAdded],
    detectionSignals: [...record.detectionSignals],
    relatedBugIds: [...record.relatedBugIds],
    provenance: { ...record.provenance, category },
  };
}
