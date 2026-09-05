// ---------------------------------------------------------------------------
// Owner-local review store — read-only operator inventory.
//
// The store was designed to grow forever and never to delete evidence. That
// is the right default only if growth is observable, and until now nothing in
// the repository could answer "what is in my review store".
//
// Three properties carry this module.
//
// READ-ONLY BY CONSTRUCTION. The scanner it is handed is expected to be a
// read-only store handle, whose write methods throw. This is not an inventory
// that declines to write; it is one that cannot. `assertReadOnlyScanner`
// makes that a runtime precondition rather than a comment, because the
// writable handle's `readJson` also `mkdir`s and `chmod`s the root, which
// would mutate store metadata on every run.
//
// INTEGRITY AND CURRENTNESS ARE DIFFERENT QUESTIONS. The store can prove an
// envelope is VALID. It cannot prove it is CURRENT: currentness is
// `verifyReviewCurrent(receipt, currentArtifacts)`, and the current artifacts
// live in the findings authority, not here. So currentness is UNKNOWN unless
// a caller supplies a resolver, and the document says so rather than
// inventing the one fact it structurally cannot know.
//
// A FILENAME IS OUTPUT. Canonical and temporary names have pinned hex shapes,
// so echoing them leaks nothing. An UNKNOWN entry's name is by definition a
// string this repository did not choose — it could be
// `customer-acme-invoice.json` — so it is projected as a digest and a size,
// never verbatim. For the same reason a corruption row carries only the file
// name and the categorical code: validator details legitimately quote the
// offending value (`keys a,b,c`, `String(record.schemaVersion)`), and that
// value came from the file.
//
// Pure: no fs authority. Every byte arrives through the scanner.
// ---------------------------------------------------------------------------

import { sha256Hex, stableJsonSorted } from '../identity/canonicalDigest';
import {
  FINDING_REVIEW_DECISIONS,
  FINDING_REVIEW_STATES,
  type FindingReviewDecision,
  type FindingReviewState,
} from '../findingReview';
import type { PrivateArtifactEntry } from '../policy/privateArtifacts';
import { parseReviewFileName } from './identity';
import type { ReviewStoreCorruption, ReviewStoreErrorCode, StoredReviewEnvelope } from './types';

/** Version stamped into every inventory document. */
export const REVIEW_STORE_INVENTORY_VERSION = 'nightwatch.review-store-inventory.v1' as const;

/**
 * Store health conditions, MOST SEVERE FIRST. The order is the precedence.
 *
 * `STALE_HISTORY_PRESENT` is last deliberately. A stale generation is the
 * store working exactly as designed: the preserved evidence of what was
 * reviewed against an artifact that has since been regenerated. Ranking it
 * above residue, or reporting it as corruption, would turn the store's whole
 * purpose into a fault report.
 */
export const REVIEW_STORE_HEALTH_CONDITIONS = [
  'STORE_UNAVAILABLE',
  'CORRUPTION_PRESENT',
  'UNKNOWN_FILES_PRESENT',
  'TEMPORARY_RESIDUE_PRESENT',
  'STALE_HISTORY_PRESENT',
  'HEALTHY',
] as const;
export type ReviewStoreHealthCondition = (typeof REVIEW_STORE_HEALTH_CONDITIONS)[number];

/** Whether a stored artifact survived validation. A store-only judgement. */
export const REVIEW_ARTIFACT_INTEGRITIES = ['VALID', 'CORRUPT'] as const;
export type ReviewArtifactIntegrity = (typeof REVIEW_ARTIFACT_INTEGRITIES)[number];

/** Whether a valid artifact still binds. Requires the current artifacts. */
export const REVIEW_ARTIFACT_CURRENTNESS = ['CURRENT', 'STALE', 'UNKNOWN'] as const;
export type ReviewArtifactCurrentness = (typeof REVIEW_ARTIFACT_CURRENTNESS)[number];

/** How much of the store the inventory actually opened. */
export const REVIEW_INVENTORY_DEPTHS = ['DEEP', 'SHALLOW'] as const;
export type ReviewInventoryDepth = (typeof REVIEW_INVENTORY_DEPTHS)[number];

/** Bounds. Counts stay global and exact; rows never do. */
export const REVIEW_INVENTORY_MAX_ROWS = 200;
const NAME_DIGEST_LENGTH = 24;

/** One corrupt artifact, named by its pinned-shape file name and its code only. */
export interface ReviewInventoryCorruptionRow {
  readonly fileName: string;
  readonly code: ReviewStoreErrorCode;
}

/** One unrecognized entry. Never named; a digest is enough to notice it persists. */
export interface ReviewInventoryUnknownRow {
  readonly nameDigest: string;
  readonly bytes: number;
  readonly kind: 'UNKNOWN' | 'NON_FILE';
}

/** One interrupted-publish temporary. Its name shape is pinned, so it is safe. */
export interface ReviewInventoryTemporaryRow {
  readonly name: string;
  readonly bytes: number;
}

/** One finding's presence in the store. */
export interface ReviewInventoryFindingRow {
  readonly findingId: string;
  readonly generations: number;
  readonly currentGenerations: number;
  readonly staleGenerations: number;
  readonly unknownGenerations: number;
}

export interface ReviewInventoryPage {
  readonly offset: number;
  readonly limit: number;
  readonly total: number;
  readonly truncated: boolean;
}

export interface ReviewInventoryCounts {
  readonly entries: number;
  readonly canonicalArtifacts: number;
  readonly validArtifacts: number;
  readonly corruptArtifacts: number;
  /**
   * Canonical by name, but gone by the time it was opened. Neither valid nor
   * corrupt, and reported rather than silently dropped so the identity
   * `canonicalArtifacts === valid + corrupt + unreadable` holds in DEEP mode.
   */
  readonly unreadableArtifacts: number;
  readonly temporaryArtifacts: number;
  readonly unknownEntries: number;
  readonly nonFileEntries: number;
  readonly uniqueFindings: number;
  readonly generations: number;
  readonly findingsWithMultipleGenerations: number;
  readonly byCurrentness: Readonly<Record<ReviewArtifactCurrentness, number>>;
  readonly byDecision: Readonly<Record<FindingReviewDecision, number>>;
  readonly byResultingState: Readonly<Record<FindingReviewState, number>>;
}

export interface ReviewInventoryBytes {
  readonly total: number;
  readonly canonical: number;
  readonly temporary: number;
  readonly unknown: number;
  readonly nonFile: number;
}

export interface ReviewInventoryHealth {
  /** Every condition that holds, in precedence order. Never collapsed to one. */
  readonly conditions: readonly ReviewStoreHealthCondition[];
  /** The most severe condition, for a one-line answer. */
  readonly classification: ReviewStoreHealthCondition;
}

export interface ReviewStoreInventory {
  readonly schemaVersion: typeof REVIEW_STORE_INVENTORY_VERSION;
  readonly exists: boolean;
  readonly depth: ReviewInventoryDepth;
  /**
   * True only when a currentness resolver was supplied. Without it every
   * artifact is UNKNOWN, and a reader must be able to tell "nothing is
   * current" from "nobody asked".
   */
  readonly currentnessResolved: boolean;
  readonly counts: ReviewInventoryCounts;
  readonly bytes: ReviewInventoryBytes;
  readonly health: ReviewInventoryHealth;
  /** From envelope `storedAt` / `reviewedAt`, never from filesystem mtime. */
  readonly oldestStoredAt: string | null;
  readonly newestStoredAt: string | null;
  readonly oldestReviewedAt: string | null;
  readonly newestReviewedAt: string | null;
  readonly corruption: readonly ReviewInventoryCorruptionRow[];
  readonly corruptionPage: ReviewInventoryPage;
  readonly unknownEntries: readonly ReviewInventoryUnknownRow[];
  readonly unknownEntriesPage: ReviewInventoryPage;
  readonly temporaries: readonly ReviewInventoryTemporaryRow[];
  readonly temporariesPage: ReviewInventoryPage;
  readonly findings: readonly ReviewInventoryFindingRow[];
  readonly findingsPage: ReviewInventoryPage;
  /** Digest of this whole document. Deterministic over store CONTENT. */
  readonly inventoryDigest: string;
  readonly organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY';
}

/**
 * The narrow capability the inventory needs.
 *
 * An interface rather than the concrete store, so this module holds no
 * filesystem authority and a test can drive it with an in-memory double.
 */
export interface ReviewStoreScanner {
  readonly exists: boolean;
  readonly readOnly: boolean;
  entries(): readonly PrivateArtifactEntry[];
  /**
   * Validated envelope, the corruption that stopped it, or null when the file
   * is no longer there. Never throws.
   */
  inspect(fileName: string): { readonly envelope: StoredReviewEnvelope } | { readonly corruption: ReviewStoreCorruption } | null;
}

export interface ReviewInventoryOptions {
  /** SHALLOW counts by name shape without opening anything. */
  readonly depth?: ReviewInventoryDepth;
  /**
   * Currentness for one validated envelope. Supplied by a caller that holds
   * the current artifacts; omitted by one that does not.
   */
  readonly currentnessFor?: (envelope: StoredReviewEnvelope) => ReviewArtifactCurrentness;
  readonly rowLimit?: number;
  readonly findingsOffset?: number;
}

function emptyDecisionCounts(): Record<FindingReviewDecision, number> {
  // Zero-filled over the whole vocabulary so the document's shape does not
  // depend on the store's contents, which is half of determinism.
  const counts = {} as Record<FindingReviewDecision, number>;
  for (const decision of FINDING_REVIEW_DECISIONS) counts[decision] = 0;
  return counts;
}

function emptyStateCounts(): Record<FindingReviewState, number> {
  const counts = {} as Record<FindingReviewState, number>;
  for (const state of FINDING_REVIEW_STATES) counts[state] = 0;
  return counts;
}

function page(total: number, offset: number, limit: number): ReviewInventoryPage {
  return { offset, limit, total, truncated: total > offset + limit };
}

function boundedRowLimit(requested: number | undefined): number {
  if (requested === undefined || !Number.isSafeInteger(requested) || requested < 0) return REVIEW_INVENTORY_MAX_ROWS;
  return Math.min(requested, REVIEW_INVENTORY_MAX_ROWS);
}

/** A name this repository did not choose is projected as a digest, never verbatim. */
export function unknownEntryNameDigest(name: string): string {
  return sha256Hex(`review-store-unknown-entry:${name}`).slice(0, NAME_DIGEST_LENGTH);
}

/**
 * Every condition that holds, plus the most severe.
 *
 * Exported so the precedence itself is directly testable, rather than only
 * reachable through a whole inventory run.
 */
export function reviewStoreHealth(input: {
  readonly exists: boolean;
  readonly corruptArtifacts: number;
  readonly unknownEntries: number;
  readonly temporaryArtifacts: number;
  readonly staleArtifacts: number;
}): ReviewInventoryHealth {
  if (!input.exists) return { conditions: ['STORE_UNAVAILABLE'], classification: 'STORE_UNAVAILABLE' };
  const conditions: ReviewStoreHealthCondition[] = [];
  if (input.corruptArtifacts > 0) conditions.push('CORRUPTION_PRESENT');
  if (input.unknownEntries > 0) conditions.push('UNKNOWN_FILES_PRESENT');
  if (input.temporaryArtifacts > 0) conditions.push('TEMPORARY_RESIDUE_PRESENT');
  if (input.staleArtifacts > 0) conditions.push('STALE_HISTORY_PRESENT');
  if (conditions.length === 0) return { conditions: ['HEALTHY'], classification: 'HEALTHY' };
  // Sorted by the declared precedence, not alphabetically: the vocabulary
  // order IS the severity order, and re-sorting would silently discard it.
  conditions.sort((left, right) => REVIEW_STORE_HEALTH_CONDITIONS.indexOf(left) - REVIEW_STORE_HEALTH_CONDITIONS.indexOf(right));
  return { conditions, classification: conditions[0] as ReviewStoreHealthCondition };
}

/** Refuses a writable handle. Read-only is a precondition, not an intention. */
export function assertReadOnlyScanner(scanner: ReviewStoreScanner): void {
  if (scanner.readOnly !== true) throw new Error('REVIEW_INVENTORY_REQUIRES_READ_ONLY_STORE');
}

/**
 * Inventory the store.
 *
 * Deterministic over store CONTENT: identical names and bytes produce an
 * identical document, whatever order the filesystem enumerated them in and
 * whatever the clock says. No filesystem timestamp reaches the result — the
 * oldest/newest facts come from the envelopes, which are content.
 */
export function inventoryReviewStore(scanner: ReviewStoreScanner, options: ReviewInventoryOptions = {}): ReviewStoreInventory {
  assertReadOnlyScanner(scanner);
  const depth: ReviewInventoryDepth = options.depth === 'SHALLOW' ? 'SHALLOW' : 'DEEP';
  const rowLimit = boundedRowLimit(options.rowLimit);
  const findingsOffset = Number.isSafeInteger(options.findingsOffset) && (options.findingsOffset as number) >= 0
    ? (options.findingsOffset as number)
    : 0;
  const resolveCurrentness = typeof options.currentnessFor === 'function' ? options.currentnessFor : null;

  const counts = {
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
    byCurrentness: { CURRENT: 0, STALE: 0, UNKNOWN: 0 } as Record<ReviewArtifactCurrentness, number>,
    byDecision: emptyDecisionCounts(),
    byResultingState: emptyStateCounts(),
  };
  const bytes = { total: 0, canonical: 0, temporary: 0, unknown: 0, nonFile: 0 };
  const corruption: ReviewInventoryCorruptionRow[] = [];
  const unknownEntries: ReviewInventoryUnknownRow[] = [];
  const temporaries: ReviewInventoryTemporaryRow[] = [];
  const byFinding = new Map<string, { generations: number; current: number; stale: number; unknown: number }>();
  let oldestStoredAt: string | null = null;
  let newestStoredAt: string | null = null;
  let oldestReviewedAt: string | null = null;
  let newestReviewedAt: string | null = null;

  const observe = (current: string | null, candidate: string, keepLower: boolean): string =>
    current === null ? candidate : keepLower ? (candidate < current ? candidate : current) : (candidate > current ? candidate : current);

  // Sorted by name before anything is opened, so the traversal order is a
  // property of the CONTENT rather than of the filesystem's enumeration.
  const entries = [...scanner.entries()].sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    counts.entries += 1;
    bytes.total += entry.bytes;
    if (entry.kind === 'NON_FILE') {
      counts.nonFileEntries += 1;
      bytes.nonFile += entry.bytes;
      unknownEntries.push({ nameDigest: unknownEntryNameDigest(entry.name), bytes: entry.bytes, kind: 'NON_FILE' });
      continue;
    }
    if (entry.kind === 'TEMPORARY') {
      counts.temporaryArtifacts += 1;
      bytes.temporary += entry.bytes;
      temporaries.push({ name: entry.name, bytes: entry.bytes });
      continue;
    }
    // A `.json` whose name is not the pinned review shape is a stranger too.
    // Classification is by the store's OWN name grammar, never by extension.
    if (entry.kind !== 'JSON' || parseReviewFileName(entry.name) === null) {
      counts.unknownEntries += 1;
      bytes.unknown += entry.bytes;
      unknownEntries.push({ nameDigest: unknownEntryNameDigest(entry.name), bytes: entry.bytes, kind: 'UNKNOWN' });
      continue;
    }
    counts.canonicalArtifacts += 1;
    bytes.canonical += entry.bytes;
    if (depth === 'SHALLOW') continue;

    const inspected = scanner.inspect(entry.name);
    if (inspected === null) {
      counts.unreadableArtifacts += 1;
      continue;
    }
    if ('corruption' in inspected) {
      if (counts.validArtifacts > 0) continue;
      counts.corruptArtifacts += 1;
      // Code and file name only. The validator's detail quotes the offending
      // value, and the offending value came out of an untrusted file.
      corruption.push({ fileName: inspected.corruption.fileName, code: inspected.corruption.code });
      continue;
    }
    const envelope = inspected.envelope;
    counts.validArtifacts += 1;
    counts.generations += 1;
    counts.byDecision[envelope.receipt.decision] += 1;
    counts.byResultingState[envelope.record.state] += 1;
    const currentness: ReviewArtifactCurrentness = resolveCurrentness === null ? 'UNKNOWN' : resolveCurrentness(envelope);
    counts.byCurrentness[currentness] += 1;
    oldestStoredAt = observe(oldestStoredAt, envelope.storedAt, true);
    newestStoredAt = observe(newestStoredAt, envelope.storedAt, false);
    oldestReviewedAt = observe(oldestReviewedAt, envelope.receipt.reviewedAt, true);
    newestReviewedAt = observe(newestReviewedAt, envelope.receipt.reviewedAt, false);
    const bucket = byFinding.get(envelope.findingId) ?? { generations: 0, current: 0, stale: 0, unknown: 0 };
    bucket.generations += 1;
    if (currentness === 'CURRENT') bucket.current += 1;
    else if (currentness === 'STALE') bucket.stale += 1;
    else bucket.unknown += 1;
    byFinding.set(envelope.findingId, bucket);
  }

  counts.uniqueFindings = byFinding.size;
  for (const bucket of byFinding.values()) if (bucket.generations > 1) counts.findingsWithMultipleGenerations += 1;

  const findingRows: ReviewInventoryFindingRow[] = [...byFinding.entries()]
    .map(([findingId, bucket]) => ({
      findingId,
      generations: bucket.generations,
      currentGenerations: bucket.current,
      staleGenerations: bucket.stale,
      unknownGenerations: bucket.unknown,
    }))
    .sort((left, right) => left.findingId.localeCompare(right.findingId));

  const health = reviewStoreHealth({
    exists: scanner.exists,
    corruptArtifacts: counts.corruptArtifacts,
    unknownEntries: counts.unknownEntries + counts.nonFileEntries,
    temporaryArtifacts: counts.temporaryArtifacts,
    staleArtifacts: counts.byCurrentness.STALE,
  });

  const body = {
    schemaVersion: REVIEW_STORE_INVENTORY_VERSION,
    exists: scanner.exists,
    depth,
    currentnessResolved: resolveCurrentness !== null,
    counts,
    bytes,
    health,
    oldestStoredAt,
    newestStoredAt,
    oldestReviewedAt,
    newestReviewedAt,
    corruption: corruption.slice(0, rowLimit),
    corruptionPage: page(corruption.length, 0, rowLimit),
    unknownEntries: unknownEntries.slice(0, rowLimit),
    unknownEntriesPage: page(unknownEntries.length, 0, rowLimit),
    temporaries: temporaries.slice(0, rowLimit),
    temporariesPage: page(temporaries.length, 0, rowLimit),
    findings: findingRows.slice(findingsOffset, findingsOffset + rowLimit),
    findingsPage: page(findingRows.length, findingsOffset, rowLimit),
    organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY' as const,
  };
  return { ...body, inventoryDigest: sha256Hex(stableJsonSorted(body)).slice(0, NAME_DIGEST_LENGTH) };
}
