// ---------------------------------------------------------------------------
// Owner-local review store.
//
// A schema, an identity and a read policy over the repository's EXISTING
// atomic publication primitive. It opens no file itself: every byte goes
// through PrivateArtifactStore, whose writeImmutableJson prepares an O_EXCL
// temporary, fsyncs it, publishes by link(2) — atomic, and EEXIST WITHOUT
// replacing — verifies the published bytes, and fsyncs the directory. A
// filesystem that cannot provide no-replace publication raises
// PRIVATE_ARTIFACT_NO_REPLACE_UNSUPPORTED rather than degrading to a
// replacing rename.
//
// That primitive is also the concurrency arbiter. There is no read-then-write
// existence check anywhere in this file, because such a check is exactly what
// a competing writer would race: two writers both prepare bytes, one link()
// wins, the loser is told REVIEW_STORE_ALREADY_DECIDED, and the canonical
// bytes remain the winner's.
//
// The store adds NO review semantics. verifyReceiptIntegrity and
// verifyReviewCurrent from src/core/findingReview/ are the only validators of
// receipt integrity and binding currentness; this file never recomputes a
// receipt digest or re-derives a staleness rule of its own.
//
// Authority: owner-local and private. No network, no child process, no
// publication path, and no ability to write anything but its own review
// artifacts.
// ---------------------------------------------------------------------------

import {
  PrivateArtifactStore,
  type PrivateArtifactEntry,
  type PrivateArtifactPolicyRecord,
} from '../policy/privateArtifacts';
import {
  decideReview,
  initialReviewRecord,
  isTerminalReviewState,
  validateReviewBinding,
  verifyReceiptIntegrity,
  verifyReviewCurrent,
  FINDING_REVIEW_LIFECYCLE_VERSION,
  FINDING_REVIEW_RECEIPT_VERSION,
  type CurrentReviewArtifacts,
  type FindingReviewBinding,
  type FindingReviewDecision,
  type FindingReviewRecord,
  type FindingReviewReceipt,
} from '../findingReview';
import { stableJsonSorted } from '../identity/canonicalDigest';
import {
  findingDiscoveryKey,
  parseReviewFileName,
  reviewFileName,
  reviewFileNamePrefix,
  reviewIdentity,
} from './identity';
import {
  REVIEW_STORE_SCHEMA_VERSION,
  type ReviewStoreCorruption,
  type ReviewStoreErrorCode,
  type ReviewStoreReadResult,
  type StoredReviewEnvelope,
} from './types';

const INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;

// Sorted here rather than written pre-sorted, so the comparison can never
// disagree with Object.keys().sort() over a hand-ordered literal.
const ENVELOPE_KEYS = ['findingId', 'record', 'receipt', 'reviewIdentity', 'schemaVersion', 'status', 'storedAt'].sort();

/** A categorical store failure. The code vocabulary is closed; see types.ts. */
export class ReviewStoreError extends Error {
  readonly code: ReviewStoreErrorCode;
  constructor(code: ReviewStoreErrorCode, detail?: string) {
    super(detail === undefined ? code : `${code}:${detail}`);
    this.name = 'ReviewStoreError';
    this.code = code;
  }
}

function corrupt(code: ReviewStoreErrorCode, detail: string): never {
  throw new ReviewStoreError(code, detail);
}

/**
 * Validate one envelope completely, against its own file name.
 *
 * Bytes are never trusted for sitting in the expected directory: the identity
 * is recomputed from the stored binding and must equal BOTH the value written
 * inside the envelope and the value encoded in the file name, so a renamed or
 * hand-crafted file cannot become authoritative.
 */
export function validateStoredReviewEnvelope(value: unknown, fileName: string): StoredReviewEnvelope {
  const parsedName = parseReviewFileName(fileName);
  if (parsedName === null) corrupt('REVIEW_STORE_IDENTITY_MISMATCH', `file name ${fileName}`);
  if (value === null || typeof value !== 'object' || Array.isArray(value)) corrupt('REVIEW_STORE_CORRUPT', 'not an object');
  const record = value as Record<string, unknown>;
  const prototype = Object.getPrototypeOf(record);
  if (prototype !== Object.prototype && prototype !== null) corrupt('REVIEW_STORE_CORRUPT', 'prototype');

  // Version is checked before shape: an unsupported schema is never parsed
  // optimistically and can never become CURRENT by resembling this one.
  if (record.schemaVersion !== REVIEW_STORE_SCHEMA_VERSION) {
    corrupt('REVIEW_STORE_VERSION_UNSUPPORTED', String(record.schemaVersion));
  }
  const keys = Object.keys(record).sort();
  if (JSON.stringify(keys) !== JSON.stringify(ENVELOPE_KEYS)) corrupt('REVIEW_STORE_CORRUPT', `keys ${keys.join(',')}`);
  if (record.status !== 'READY') corrupt('REVIEW_STORE_CORRUPT', 'status');
  if (typeof record.storedAt !== 'string' || !INSTANT_RE.test(record.storedAt)) corrupt('REVIEW_STORE_CORRUPT', 'storedAt');
  if (typeof record.findingId !== 'string' || record.findingId === '') corrupt('REVIEW_STORE_CORRUPT', 'findingId');
  if (typeof record.reviewIdentity !== 'string') corrupt('REVIEW_STORE_CORRUPT', 'reviewIdentity');

  const stored = record.record as FindingReviewRecord;
  const receipt = record.receipt as FindingReviewReceipt;
  if (stored === null || typeof stored !== 'object' || Array.isArray(stored)) corrupt('REVIEW_STORE_CORRUPT', 'record');
  if (receipt === null || typeof receipt !== 'object' || Array.isArray(receipt)) corrupt('REVIEW_STORE_CORRUPT', 'receipt');

  // Receipt integrity through the canonical validator — never a local copy of
  // the digest formula.
  let binding: FindingReviewBinding;
  try {
    binding = verifyReceiptIntegrity(receipt);
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes('RECEIPT_TAMPERED')) corrupt('REVIEW_STORE_RECEIPT_TAMPERED', message);
    if (message.includes('AUTHORITY_INVALID')) corrupt('REVIEW_STORE_AUTHORITY_INVALID', message);
    if (message.includes('INVALID_BINDING')) corrupt('REVIEW_STORE_BINDING_INVALID', message);
    corrupt('REVIEW_STORE_CORRUPT', message);
  }

  if (stored.lifecycleVersion !== FINDING_REVIEW_LIFECYCLE_VERSION) corrupt('REVIEW_STORE_VERSION_UNSUPPORTED', String(stored.lifecycleVersion));
  if (receipt.schemaVersion !== FINDING_REVIEW_RECEIPT_VERSION) corrupt('REVIEW_STORE_VERSION_UNSUPPORTED', String(receipt.schemaVersion));

  let storedBinding: FindingReviewBinding;
  try {
    storedBinding = validateReviewBinding(stored.binding);
  } catch (error) {
    corrupt('REVIEW_STORE_BINDING_INVALID', (error as Error).message);
  }

  // A persisted review is a DECIDED review. A pending record in the store
  // would be a review that was never made.
  if (!isTerminalReviewState(stored.state)) corrupt('REVIEW_STORE_STATE_INVALID', stored.state);
  if (stored.state !== receipt.resultingState) corrupt('REVIEW_STORE_RECORD_RECEIPT_MISMATCH', 'state');
  if (stableJsonSorted(storedBinding) !== stableJsonSorted(binding)) corrupt('REVIEW_STORE_RECORD_RECEIPT_MISMATCH', 'binding');
  if (!Number.isInteger(stored.transitionCount) || stored.transitionCount !== 1) {
    corrupt('REVIEW_STORE_RECORD_RECEIPT_MISMATCH', 'transitionCount');
  }

  const recomputedIdentity = reviewIdentity(binding);
  if (record.reviewIdentity !== recomputedIdentity) corrupt('REVIEW_STORE_IDENTITY_MISMATCH', 'envelope');
  if (parsedName.identity !== recomputedIdentity) corrupt('REVIEW_STORE_IDENTITY_MISMATCH', 'file name');
  if (record.findingId !== binding.findingId) corrupt('REVIEW_STORE_IDENTITY_MISMATCH', 'findingId');
  if (parsedName.discoveryKey !== findingDiscoveryKey(binding.findingId)) corrupt('REVIEW_STORE_IDENTITY_MISMATCH', 'discovery key');

  return record as unknown as StoredReviewEnvelope;
}

/**
 * A request-scoped view of which files exist, grouped by discovery key.
 *
 * The listing is a discovery aid ONLY. Every envelope it points at is still
 * validated in full on read, so a stale or hand-crafted listing can never make
 * bytes authoritative — it can only decide which files are looked at.
 */
export interface ReviewStoreListing {
  readonly byDiscoveryKey: ReadonlyMap<string, readonly string[]>;
}

export interface ReviewStoreOptions {
  /** Test-injected root. Omitted in normal use, where the root is derived. */
  readonly root?: string;
  readonly createIfMissing?: boolean;
}

export interface PutReviewDecisionInput {
  readonly binding: FindingReviewBinding;
  readonly decision: FindingReviewDecision;
  /** When the human decided. Caller-supplied: this cone has no clock authority. */
  readonly reviewedAt: string;
  /** When persistence happened. */
  readonly storedAt: string;
  readonly rationale?: string;
  readonly reasonCode?: string;
}

export interface PutReviewDecisionResult {
  readonly reviewIdentity: string;
  readonly fileName: string;
  readonly receipt: FindingReviewReceipt;
  readonly record: FindingReviewRecord;
}

export class ReviewStore {
  private readonly artifacts: PrivateArtifactStore;

  constructor(options: ReviewStoreOptions = {}) {
    this.artifacts = new PrivateArtifactStore({
      root: options.root,
      subtree: 'reviews',
      createIfMissing: options.createIfMissing,
    });
  }

  get root(): string {
    return this.artifacts.root;
  }

  get policy(): PrivateArtifactPolicyRecord {
    return this.artifacts.policy;
  }

  /** Whether the store root exists. Never creates it. */
  get exists(): boolean {
    return this.artifacts.exists;
  }

  /**
   * Whether this handle's write methods refuse.
   *
   * Surfaced so the inventory can REQUIRE a read-only handle rather than
   * merely be written not to write with a writable one.
   */
  get readOnly(): boolean {
    return this.artifacts.readOnly;
  }

  /** Categorical, read-only enumeration of every entry in the store root. */
  entries(): readonly PrivateArtifactEntry[] {
    return this.artifacts.listEntries();
  }

  /**
   * Read and fully validate ONE stored artifact.
   *
   * The single validation path. `read()` calls it too, so a corruption the
   * inventory reports and a corruption the reviewer surface refuses are the
   * same judgement rather than two implementations that agree today.
   *
   * `null` means the file is no longer there — a manual deletion, or a race
   * with the owner. That is neither valid nor corrupt, and calling it either
   * would be a guess.
   */
  inspect(fileName: string): { readonly envelope: StoredReviewEnvelope } | { readonly corruption: ReviewStoreCorruption } | null {
    let raw: unknown;
    try {
      raw = this.artifacts.readJson(fileName);
    } catch (error) {
      return { corruption: { fileName, code: 'REVIEW_STORE_CORRUPT', detail: (error as Error).message } };
    }
    if (raw === null) return null;
    try {
      return { envelope: validateStoredReviewEnvelope(raw, fileName) };
    } catch (error) {
      const code = error instanceof ReviewStoreError ? error.code : 'REVIEW_STORE_CORRUPT';
      return { corruption: { fileName, code, detail: (error as Error).message } };
    }
  }

  /**
   * Record one terminal decision for one binding.
   *
   * The lifecycle makes the decision; the store only persists it. Note the
   * ORDER: the record is built, decided and the envelope fully validated
   * BEFORE any byte is published, so a value the read path would reject can
   * never reach the store.
   */
  putDecision(input: PutReviewDecisionInput): PutReviewDecisionResult {
    const binding = validateReviewBinding(input.binding);
    if (typeof input.storedAt !== 'string' || !INSTANT_RE.test(input.storedAt)) {
      throw new ReviewStoreError('REVIEW_STORE_CORRUPT', 'storedAt');
    }
    const { record, receipt } = decideReview(initialReviewRecord(binding), input.decision, {
      reviewedAt: input.reviewedAt,
      rationale: input.rationale,
      reasonCode: input.reasonCode,
    });
    const identity = reviewIdentity(binding);
    const fileName = reviewFileName(binding);
    const envelope = {
      schemaVersion: REVIEW_STORE_SCHEMA_VERSION,
      reviewIdentity: identity,
      findingId: binding.findingId,
      receipt,
      record,
      storedAt: input.storedAt,
    };

    // Validate the exact bytes we are about to publish, in the same shape the
    // reader will see (the publisher stamps `status`). A store that can write
    // what it cannot read back is a store with no corruption semantics.
    validateStoredReviewEnvelope({ ...envelope, status: 'READY' }, fileName);

    try {
      this.artifacts.writeImmutableJson(fileName, envelope);
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes('PRIVATE_ARTIFACT_IMMUTABLE')) {
        throw new ReviewStoreError('REVIEW_STORE_ALREADY_DECIDED', identity);
      }
      if (message.includes('PRIVATE_ARTIFACT_NO_REPLACE_UNSUPPORTED')) {
        throw new ReviewStoreError('REVIEW_STORE_NO_REPLACE_UNSUPPORTED', message);
      }
      throw error;
    }
    return { reviewIdentity: identity, fileName, receipt, record };
  }

  /** Every stored generation's file name for one finding, via the derived key. */
  fileNamesFor(findingId: string, listing?: ReviewStoreListing): readonly string[] {
    if (listing !== undefined) return listing.byDiscoveryKey.get(findingDiscoveryKey(findingId)) ?? [];
    return this.artifacts.listJson(reviewFileNamePrefix(findingId));
  }

  /**
   * One directory listing, grouped by discovery key, for a whole page.
   *
   * Without this a page costs `rows x store`: `fileNamesFor` lists the
   * directory per finding, so rendering fifty rows over a 10,000-review store
   * scanned half a million entries. Measured at 10k/100% reviewed that was
   * 325 ms of listing for a 50-row page, and it grew with the STORE rather
   * than with the page — the exact shape the page-scoping optimization
   * removed from the intelligence path.
   *
   * The listing is a SNAPSHOT. A review written after it is taken is not
   * visible to it, which is the same request-scoped semantics the findings
   * authority already has, and is why it is created per request rather than
   * cached on the store.
   */
  snapshotListing(): ReviewStoreListing {
    const byDiscoveryKey = new Map<string, string[]>();
    for (const fileName of this.artifacts.listJson('review.')) {
      const parsed = parseReviewFileName(fileName);
      if (parsed === null) continue;
      const bucket = byDiscoveryKey.get(parsed.discoveryKey);
      if (bucket === undefined) byDiscoveryKey.set(parsed.discoveryKey, [fileName]);
      else bucket.push(fileName);
    }
    return { byDiscoveryKey };
  }

  /**
   * The local review state of one finding against its CURRENT artifacts.
   *
   * Read by finding, not by binding: a changed artifact changes the binding
   * and therefore the file name, so a binding-keyed read would report
   * NO_REVIEW for exactly the case that must report STALE.
   *
   * Precedence is CURRENT over STALE over CORRUPT. A corrupt generation never
   * produces CURRENT, and it is reported either way rather than hidden by a
   * valid sibling generation.
   */
  read(findingId: string, current: CurrentReviewArtifacts, listing?: ReviewStoreListing): ReviewStoreReadResult {
    const corruption: ReviewStoreCorruption[] = [];
    const generations: StoredReviewEnvelope[] = [];
    let currentEnvelope: StoredReviewEnvelope | null = null;
    let staleEnvelope: StoredReviewEnvelope | null = null;
    let staleReason: string | null = null;

    for (const fileName of this.fileNamesFor(findingId, listing)) {
      const inspected = this.inspect(fileName);
      if (inspected === null) continue;
      if ('corruption' in inspected) {
        corruption.push(inspected.corruption);
        continue;
      }
      const envelope = inspected.envelope;
      // The envelope must belong to the finding that was ASKED for. The
      // listing decides which files are opened, and a listing is a discovery
      // aid rather than an authority — a wrong or forged one must not be able
      // to surface another finding's review under this finding's name.
      if (envelope.findingId !== findingId) {
        corruption.push({ fileName, code: 'REVIEW_STORE_IDENTITY_MISMATCH', detail: 'envelope belongs to another finding' });
        continue;
      }
      generations.push(envelope);
      try {
        verifyReviewCurrent(envelope.receipt, current);
        // The first CURRENT generation wins; listing order is deterministic.
        if (currentEnvelope === null) currentEnvelope = envelope;
      } catch (error) {
        const message = (error as Error).message;
        if (message.startsWith('FINDING_REVIEW_STALE')) {
          if (staleEnvelope === null) {
            staleEnvelope = envelope;
            staleReason = message;
          }
          continue;
        }
        // A receipt that passed envelope validation but fails currentness for
        // a non-staleness reason is a validation disagreement, not a stale
        // review. It is never quietly treated as either CURRENT or STALE.
        corruption.push({ fileName, code: 'REVIEW_STORE_CORRUPT', detail: message });
      }
    }

    if (currentEnvelope !== null) {
      return {
        state: 'CURRENT',
        envelope: currentEnvelope,
        staleReason: null,
        corruption,
        generations,
        organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
      };
    }
    if (staleEnvelope !== null) {
      return {
        state: 'STALE',
        envelope: staleEnvelope,
        staleReason,
        corruption,
        generations,
        organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
      };
    }
    return {
      state: corruption.length > 0 ? 'CORRUPT' : 'NO_REVIEW',
      envelope: null,
      staleReason: null,
      corruption,
      generations,
      organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
    };
  }

  /**
   * Temporaries left by an interrupted publish, and their removal.
   *
   * `remove: false` reports without touching anything. Recognition is by the
   * publisher's pinned name shape, so an unknown file in the root is neither
   * reported nor removable here — "do not delete unknown files" is structural,
   * not a convention.
   */
  recoverTemporaries(options: { readonly remove?: boolean } = {}): { readonly found: readonly string[]; readonly removed: readonly string[] } {
    const found = this.artifacts.listTemporaries();
    if (options.remove !== true) return { found, removed: [] };
    const removed: string[] = [];
    for (const name of found) {
      this.artifacts.removeTemporary(name);
      removed.push(name);
    }
    return { found, removed };
  }
}
