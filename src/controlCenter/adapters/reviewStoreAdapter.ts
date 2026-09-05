// ---------------------------------------------------------------------------
// Nightwatch Control Center — review-store operations projection.
//
// A projection, not a second opinion. Every count, condition and generation
// here is produced by src/core/reviewStore/; this module screens the values
// for the public surface and does not recompute one of them.
//
// The markdown is the exception worth naming. A filing report is prose, and
// prose is the one thing this surface is otherwise built to refuse. It is
// carried because the report is the artifact a human copies out, and it is
// screened here with the same sentinel set the report itself applies at
// construction — two screens because there are two boundaries, and the
// second one is the one that faces a browser.
//
// Fail-closed on malformed input, like the reviewer projection: an absent
// OPTIONAL value is a real answer and projects as null; a value outside the
// cone's own vocabulary is a contract breach and throws. Error codes name the
// field, never the value.
//
// Pure: no fs, network, child_process, persistence or domain-service
// authority.
// ---------------------------------------------------------------------------

import {
  REVIEW_ARTIFACT_CURRENTNESS,
  REVIEW_HISTORY_IDENTITY_ABSENCE,
  REVIEW_INVENTORY_DEPTHS,
  REVIEW_STORE_ERROR_CODES,
  REVIEW_STORE_HEALTH_CONDITIONS,
  REVIEW_STORE_READ_STATES,
  type ReviewStoreHistory,
  type ReviewStoreInventory,
} from '../../core/reviewStore';
import {
  FILING_REPORT_REVIEW_STATES,
  FINDING_REVIEW_DECISIONS,
  FINDING_REVIEW_STATES,
} from '../../core/findingReview';
import type { FilingReportArtifact } from '../authorities/filingReportAuthority';
import {
  asSafeControlCenterCode,
  asSafeControlCenterDigest,
  asSafeControlCenterTimestamp,
  isRecord,
} from '../contracts/common';
import type {
  SafeControlCenterCode,
  SafeControlCenterDigest,
  SafeControlCenterId,
  SafeControlCenterTimestamp,
} from '../contracts/common';
import {
  CONTROL_CENTER_REVIEW_FILING_SCHEMA_VERSION,
  CONTROL_CENTER_REVIEW_HISTORY_SCHEMA_VERSION,
  CONTROL_CENTER_REVIEW_STORE_SCHEMA_VERSION,
  type ControlCenterReviewCorruptionRowDto,
  type ControlCenterReviewFilingDto,
  type ControlCenterReviewGenerationDto,
  type ControlCenterReviewHistoryDto,
  type ControlCenterReviewPageDto,
  type ControlCenterReviewStoreDto,
  type ControlCenterReviewTallyDto,
} from '../contracts/reviewStore';
import { boundedCount, safePublicId } from './common';

/**
 * The same sentinel vocabulary the filing report and the reviewer projection
 * screen. Three copies exist because three surfaces exist; hardening pins
 * them identical so the copies cannot drift apart.
 */
const SENTINEL_RE =
  /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i;

/** A filing report is bounded prose. This is the ceiling the surface will carry. */
const MAX_MARKDOWN_BYTES = 64_000;

/** Contract breach in the review-store projection. Carries a field, never a value. */
export class ReviewStoreProjectionError extends Error {
  readonly field: string;

  constructor(field: string) {
    super(`REVIEW_STORE_PROJECTION_INVALID:${field}`);
    this.name = 'ReviewStoreProjectionError';
    this.field = field;
  }
}

function fail(field: string): never {
  throw new ReviewStoreProjectionError(field);
}

function screened(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) fail(field);
  if (SENTINEL_RE.test(value)) fail(field);
  return value;
}

/** A code from a FIXED cone vocabulary. Anything outside it is a breach. */
function vocabularyCode(value: unknown, vocabulary: readonly string[], field: string): SafeControlCenterCode {
  const text = screened(value, field);
  if (!vocabulary.includes(text)) fail(field);
  const code = asSafeControlCenterCode(text);
  if (code === null) fail(field);
  return code;
}

function safeCode(value: unknown, field: string): SafeControlCenterCode {
  const code = asSafeControlCenterCode(screened(value, field));
  if (code === null) fail(field);
  return code;
}

function safeId(value: unknown, field: string): SafeControlCenterId {
  return safePublicId(screened(value, field), 'cc-review-store');
}

/**
 * The contract's digest shape is `<namespace>:<hex>`. The cone's digests are
 * bare hex, so the namespace is added HERE rather than changing the cone: a
 * store identity is not a wire format, and making the store emit a
 * Control-Center-shaped string would put a presentation concern inside the
 * thing being presented.
 */
function safeDigest(value: unknown, namespace: string, field: string): SafeControlCenterDigest {
  const text = screened(value, field);
  const digest = asSafeControlCenterDigest(text) ?? asSafeControlCenterDigest(`${namespace}:${text}`);
  if (digest === null) fail(field);
  return digest;
}

/**
 * A validator message projected as a categorical code.
 *
 * `FINDING_REVIEW_STALE:dossierDigest` becomes
 * `FINDING_REVIEW_STALE_DOSSIERDIGEST`. The message names the FIELD that
 * drifted and never the value, which is what makes it safe to carry; the
 * normalization is here so a message shape change cannot smuggle punctuation
 * or case into a code the surface promised was uppercase and underscored.
 */
function reasonCode(value: unknown, field: string): SafeControlCenterCode {
  const normalized = screened(value, field).toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/_+$/g, '').slice(0, 64);
  const code = asSafeControlCenterCode(normalized);
  if (code === null) fail(field);
  return code;
}

function safeTimestamp(value: unknown, field: string): SafeControlCenterTimestamp {
  const stamp = asSafeControlCenterTimestamp(screened(value, field));
  if (stamp === null) fail(field);
  return stamp;
}

function page(value: unknown, field: string): ControlCenterReviewPageDto {
  if (!isRecord(value)) fail(field);
  return {
    offset: boundedCount(value.offset),
    limit: boundedCount(value.limit),
    total: boundedCount(value.total),
    truncated: value.truncated === true,
  };
}

/**
 * Tallies as a sorted LIST rather than a map.
 *
 * A map's key order is a JSON serialization detail; a sorted list of
 * `{ code, count }` is the same information with a defined order, which is
 * what a determinism check over the wire payload actually needs.
 */
function tallies(value: unknown, vocabulary: readonly string[], field: string): readonly ControlCenterReviewTallyDto[] {
  if (!isRecord(value)) fail(field);
  return Object.entries(value)
    .map(([code, count]) => ({ code: vocabularyCode(code, vocabulary, `${field}.${code}`), count: boundedCount(count) }))
    .sort((left, right) => left.code.localeCompare(right.code));
}

function corruptionRows(value: unknown, field: string): readonly ControlCenterReviewCorruptionRowDto[] {
  if (!Array.isArray(value)) fail(field);
  return value.map((row, index) => {
    if (!isRecord(row)) fail(`${field}[${index}]`);
    return {
      // The pinned hex file-name shape. Not the validator detail, which
      // legitimately quotes bytes from an untrusted file.
      fileName: safeId(row.fileName, `${field}[${index}].fileName`),
      code: vocabularyCode(row.code, REVIEW_STORE_ERROR_CODES, `${field}[${index}].code`),
    };
  });
}

export function projectReviewStoreInventory(inventory: ReviewStoreInventory): ControlCenterReviewStoreDto {
  if (!isRecord(inventory)) fail('inventory');
  const counts = inventory.counts;
  if (!isRecord(counts)) fail('inventory.counts');
  const health = inventory.health;
  if (!isRecord(health) || !Array.isArray(health.conditions)) fail('inventory.health');
  return {
    schemaVersion: CONTROL_CENTER_REVIEW_STORE_SCHEMA_VERSION,
    state: inventory.exists ? 'AVAILABLE' : 'UNAVAILABLE',
    exists: inventory.exists === true,
    depth: vocabularyCode(inventory.depth, REVIEW_INVENTORY_DEPTHS, 'inventory.depth'),
    currentnessResolved: inventory.currentnessResolved === true,
    counts: {
      entries: boundedCount(counts.entries),
      canonicalArtifacts: boundedCount(counts.canonicalArtifacts),
      validArtifacts: boundedCount(counts.validArtifacts),
      corruptArtifacts: boundedCount(counts.corruptArtifacts),
      unreadableArtifacts: boundedCount(counts.unreadableArtifacts),
      temporaryArtifacts: boundedCount(counts.temporaryArtifacts),
      unknownEntries: boundedCount(counts.unknownEntries),
      nonFileEntries: boundedCount(counts.nonFileEntries),
      uniqueFindings: boundedCount(counts.uniqueFindings),
      generations: boundedCount(counts.generations),
      findingsWithMultipleGenerations: boundedCount(counts.findingsWithMultipleGenerations),
      current: boundedCount(counts.byCurrentness.CURRENT),
      stale: boundedCount(counts.byCurrentness.STALE),
      unknownCurrentness: boundedCount(counts.byCurrentness.UNKNOWN),
    },
    bytes: {
      total: boundedCount(inventory.bytes.total),
      canonical: boundedCount(inventory.bytes.canonical),
      temporary: boundedCount(inventory.bytes.temporary),
      unknown: boundedCount(inventory.bytes.unknown),
      nonFile: boundedCount(inventory.bytes.nonFile),
    },
    health: {
      // Every condition, in the cone's declared severity order. Re-sorting
      // alphabetically here would silently discard the precedence.
      conditions: health.conditions.map((condition, index) =>
        vocabularyCode(condition, REVIEW_STORE_HEALTH_CONDITIONS, `inventory.health.conditions[${index}]`)
      ),
      classification: vocabularyCode(health.classification, REVIEW_STORE_HEALTH_CONDITIONS, 'inventory.health.classification'),
    },
    byDecision: tallies(counts.byDecision, FINDING_REVIEW_DECISIONS, 'inventory.counts.byDecision'),
    byResultingState: tallies(counts.byResultingState, FINDING_REVIEW_STATES, 'inventory.counts.byResultingState'),
    oldestStoredAt: inventory.oldestStoredAt === null ? null : safeTimestamp(inventory.oldestStoredAt, 'inventory.oldestStoredAt'),
    newestStoredAt: inventory.newestStoredAt === null ? null : safeTimestamp(inventory.newestStoredAt, 'inventory.newestStoredAt'),
    corruption: corruptionRows(inventory.corruption, 'inventory.corruption'),
    corruptionPage: page(inventory.corruptionPage, 'inventory.corruptionPage'),
    unknownEntries: inventory.unknownEntries.map((row, index) => ({
      // A digest and a size. The contract has no field for the name, so there
      // is nothing here to forget to redact.
      nameDigest: safeDigest(row.nameDigest, 'review-unknown-entry', `inventory.unknownEntries[${index}].nameDigest`),
      bytes: boundedCount(row.bytes),
      kind: vocabularyCode(row.kind, ['UNKNOWN', 'NON_FILE'], `inventory.unknownEntries[${index}].kind`),
    })),
    unknownEntriesPage: page(inventory.unknownEntriesPage, 'inventory.unknownEntriesPage'),
    temporaries: inventory.temporaries.map((row, index) => ({
      name: safeId(row.name, `inventory.temporaries[${index}].name`),
      bytes: boundedCount(row.bytes),
    })),
    temporariesPage: page(inventory.temporariesPage, 'inventory.temporariesPage'),
    findings: inventory.findings.map((row, index) => ({
      findingId: safeId(row.findingId, `inventory.findings[${index}].findingId`),
      generations: boundedCount(row.generations),
      currentGenerations: boundedCount(row.currentGenerations),
      staleGenerations: boundedCount(row.staleGenerations),
      unknownGenerations: boundedCount(row.unknownGenerations),
    })),
    findingsPage: page(inventory.findingsPage, 'inventory.findingsPage'),
    inventoryDigest: safeDigest(inventory.inventoryDigest, 'review-inventory', 'inventory.inventoryDigest'),
    readOnly: true,
    retentionPolicy: 'NONE_OWNER_DECISION_PENDING',
    organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
  };
}

function projectGeneration(generation: ReviewStoreHistory['generations'][number], index: number): ControlCenterReviewGenerationDto {
  const scope = `history.generations[${index}]`;
  if (!isRecord(generation)) fail(scope);
  const currentness = vocabularyCode(generation.currentness, REVIEW_ARTIFACT_CURRENTNESS, `${scope}.currentness`);
  // A generation is CURRENT or it is historical. UNKNOWN is a store-wide
  // inventory answer, not something one finding's history can report: the
  // history was built against that finding's current artifacts by definition.
  if (currentness !== ('CURRENT' as string) && currentness !== ('STALE' as string)) fail(`${scope}.currentness`);
  return {
    reviewIdentity: safeId(generation.reviewIdentity, `${scope}.reviewIdentity`),
    sourceSha: safeId(generation.sourceSha, `${scope}.sourceSha`),
    campaignId: safeId(generation.campaignId, `${scope}.campaignId`),
    dossierDigest: safeDigest(generation.dossierDigest, 'dossier', `${scope}.dossierDigest`),
    findingDigest: safeDigest(generation.findingDigest, 'finding', `${scope}.findingDigest`),
    reviewedAt: safeTimestamp(generation.reviewedAt, `${scope}.reviewedAt`),
    storedAt: safeTimestamp(generation.storedAt, `${scope}.storedAt`),
    decision: vocabularyCode(generation.decision, FINDING_REVIEW_DECISIONS, `${scope}.decision`),
    resultingState: vocabularyCode(generation.resultingState, FINDING_REVIEW_STATES, `${scope}.resultingState`),
    currentness: currentness as 'CURRENT' | 'STALE',
    // The staleness reason is a categorical validator code, projected as one.
    staleReason: generation.staleReason === null ? null : reasonCode(generation.staleReason, `${scope}.staleReason`),
    expectationId: null,
    semanticContractId: null,
    identityAbsenceReason: vocabularyCode(
      generation.identityAbsenceReason,
      [REVIEW_HISTORY_IDENTITY_ABSENCE],
      `${scope}.identityAbsenceReason`
    ),
    organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
  };
}

export function projectReviewHistory(history: ReviewStoreHistory): ControlCenterReviewHistoryDto {
  if (!isRecord(history) || !Array.isArray(history.generations)) fail('history');
  return {
    schemaVersion: CONTROL_CENTER_REVIEW_HISTORY_SCHEMA_VERSION,
    findingId: safeId(history.findingId, 'history.findingId'),
    state: vocabularyCode(history.state, REVIEW_STORE_READ_STATES, 'history.state'),
    generations: history.generations.map(projectGeneration),
    page: page(history.page, 'history.page'),
    currentGeneration: history.currentGeneration === null ? null : safeId(history.currentGeneration, 'history.currentGeneration'),
    staleGenerationCount: boundedCount(history.staleGenerationCount),
    corruption: corruptionRows(history.corruption, 'history.corruption'),
    decisionChangedAcrossGenerations: history.decisionChangedAcrossGenerations === true,
    currentExpectationId:
      history.currentArtifactIdentity.expectationId === null
        ? null
        : safeId(history.currentArtifactIdentity.expectationId, 'history.currentArtifactIdentity.expectationId'),
    currentSemanticContractId:
      history.currentArtifactIdentity.semanticContractId === null
        ? null
        : safeId(history.currentArtifactIdentity.semanticContractId, 'history.currentArtifactIdentity.semanticContractId'),
    organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
  };
}

export function projectReviewFiling(artifact: FilingReportArtifact): ControlCenterReviewFilingDto {
  if (!isRecord(artifact)) fail('filing');
  const markdown = artifact.markdown;
  if (typeof markdown !== 'string' || markdown.length === 0) fail('filing.markdown');
  if (Buffer.byteLength(markdown, 'utf8') > MAX_MARKDOWN_BYTES) fail('filing.markdown');
  // The second screen. The report screens its own inputs at construction;
  // this one faces a browser, and a surface that trusted an upstream screen
  // would be trusting a boundary it does not own.
  if (SENTINEL_RE.test(markdown)) fail('filing.markdown');
  if (artifact.distribution !== 'PRIVATE_LOCAL_MANUAL_COPY_ONLY') fail('filing.distribution');
  return {
    schemaVersion: CONTROL_CENTER_REVIEW_FILING_SCHEMA_VERSION,
    findingId: safeId(artifact.findingId, 'filing.findingId'),
    reviewState: vocabularyCode(artifact.reviewState, FILING_REPORT_REVIEW_STATES, 'filing.reviewState'),
    markdown,
    distribution: 'PRIVATE_LOCAL_MANUAL_COPY_ONLY',
    organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
  };
}

/** The document for a store that could not be read at all. */
export function unavailableReviewStore(): ControlCenterReviewStoreDto {
  const emptyPage: ControlCenterReviewPageDto = { offset: 0, limit: 0, total: 0, truncated: false };
  return {
    schemaVersion: CONTROL_CENTER_REVIEW_STORE_SCHEMA_VERSION,
    state: 'UNAVAILABLE',
    exists: false,
    depth: asSafeControlCenterCode('DEEP') as SafeControlCenterCode,
    currentnessResolved: false,
    counts: {
      entries: 0,
      canonicalArtifacts: 0,
      validArtifacts: 0,
      corruptArtifacts: 0,
      unreadableArtifacts: 0,
      temporaryArtifacts: 0,
      unknownEntries: 0,
      nonFileEntries: 0,
      uniqueFindings: 0,
      generations: 0,
      findingsWithMultipleGenerations: 0,
      current: 0,
      stale: 0,
      unknownCurrentness: 0,
    },
    bytes: { total: 0, canonical: 0, temporary: 0, unknown: 0, nonFile: 0 },
    health: {
      conditions: [asSafeControlCenterCode('STORE_UNAVAILABLE') as SafeControlCenterCode],
      classification: asSafeControlCenterCode('STORE_UNAVAILABLE') as SafeControlCenterCode,
    },
    byDecision: [],
    byResultingState: [],
    oldestStoredAt: null,
    newestStoredAt: null,
    corruption: [],
    corruptionPage: emptyPage,
    unknownEntries: [],
    unknownEntriesPage: emptyPage,
    temporaries: [],
    temporariesPage: emptyPage,
    findings: [],
    findingsPage: emptyPage,
    inventoryDigest: asSafeControlCenterDigest(`review-inventory:sha256:${'0'.repeat(24)}`) as SafeControlCenterDigest,
    readOnly: true,
    retentionPolicy: 'NONE_OWNER_DECISION_PENDING',
    organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
  };
}
