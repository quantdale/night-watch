// Owner-local review store — durability, immutability and fail-closed reads.
//
// The store is a schema over PrivateArtifactStore.writeImmutableJson, so the
// tests here prove the SEMANTICS the store adds: binding-keyed identity,
// multiple generations, the four read states, the categorical corruption
// vocabulary, and that a stale or corrupt review can never read as current.
//
// Every store here is rooted in an injected temporary directory. Nothing
// touches the operator's real review store.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  ReviewStore,
  ReviewStoreError,
  REVIEW_STORE_ERROR_CODES,
  parseReviewFileName,
  reviewFileName,
  reviewIdentity,
  validateStoredReviewEnvelope,
} from '../../src/core/reviewStore';
import { findingArtifactDigest, type CurrentReviewArtifacts, type FindingReviewBinding } from '../../src/core/findingReview';
import { PrivateArtifactStore, privateArtifactRoot } from '../../src/core/policy/privateArtifacts';

const REVIEWED_AT = '2026-09-05T10:00:00Z';
const STORED_AT = '2026-09-05T10:00:01Z';
const SOURCE_SHA = 'a'.repeat(40);

interface Artifacts {
  readonly finding: unknown;
  readonly dossier: unknown;
}

function artifacts(seed: string): Artifacts {
  return { finding: { id: 'finding:1', seed }, dossier: { candidateId: 'finding:1', body: seed } };
}

function bindingFor(value: Artifacts, overrides: Partial<FindingReviewBinding> = {}): FindingReviewBinding {
  return {
    findingId: 'finding:1',
    findingDigest: findingArtifactDigest(value.finding),
    dossierDigest: findingArtifactDigest(value.dossier),
    handoffDigest: null,
    sourceSha: SOURCE_SHA,
    campaignId: 'campaign.local.1',
    handoffVersion: 'NONE_DOSSIER_ONLY_REVIEW',
    privacyProjectionVersion: 'nightwatch.privacy-projection.v1',
    ...overrides,
  };
}

function currentFor(value: Artifacts, overrides: Partial<CurrentReviewArtifacts> = {}): CurrentReviewArtifacts {
  return {
    finding: value.finding,
    dossier: value.dossier,
    handoff: null,
    sourceSha: SOURCE_SHA,
    campaignId: 'campaign.local.1',
    handoffVersion: 'NONE_DOSSIER_ONLY_REVIEW',
    privacyProjectionVersion: 'nightwatch.privacy-projection.v1',
    ...overrides,
  };
}

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nw-review-store-'));
}

function storeIn(root: string): ReviewStore {
  return new ReviewStore({ root });
}

test.describe('review store — location contract', () => {
  test('a derived root is outside the repository and is not labelled a test root', () => {
    const derived = privateArtifactRoot(undefined, 'reviews');
    expect(path.isAbsolute(derived)).toBe(true);
    const repoRoot = path.resolve(__dirname, '..', '..');
    expect(path.relative(repoRoot, derived).startsWith('..')).toBe(true);

    // The derived root must not be constructed here — that would prove
    // nothing about the operator's machine — so the class is checked on a
    // store that does not create it.
    const store = new PrivateArtifactStore({ subtree: 'reviews', createIfMissing: false });
    expect(store.policy.rootClass).toBe('OUTSIDE_REPOSITORY');
    expect(store.policy.externalPublication).toBe('PROHIBITED');
    expect(store.policy.storageClass).toBe('OWNER_ONLY_LOCAL');
  });

  test('an injected root is labelled a test root', () => {
    const store = storeIn(tempRoot());
    expect(store.policy.rootClass).toBe('INJECTED_TEST_ROOT');
  });

  test('a derived root inside the repository is refused', () => {
    const previous = process.env.NIGHTWATCH_REVIEW_STORE_DIR;
    process.env.NIGHTWATCH_REVIEW_STORE_DIR = path.resolve(__dirname, '..', '..', '.reviews');
    try {
      expect(() => privateArtifactRoot(undefined, 'reviews')).toThrow(/PRIVATE_ARTIFACT_ROOT_INSIDE_REPOSITORY/);
    } finally {
      if (previous === undefined) delete process.env.NIGHTWATCH_REVIEW_STORE_DIR;
      else process.env.NIGHTWATCH_REVIEW_STORE_DIR = previous;
    }
  });

  test('an unknown subtree is refused', () => {
    expect(() => privateArtifactRoot(undefined, 'anything' as 'reviews')).toThrow(/PRIVATE_ARTIFACT_SUBTREE_UNKNOWN/);
  });

  test('the findings root is unchanged by the subtree addition', () => {
    expect(privateArtifactRoot()).toBe(privateArtifactRoot(undefined, 'findings'));
    expect(privateArtifactRoot(undefined, 'findings')).not.toBe(privateArtifactRoot(undefined, 'reviews'));
  });

  test('the store root is owner-only', () => {
    const root = tempRoot();
    storeIn(root);
    expect(fs.statSync(root).mode & 0o077).toBe(0);
  });
});

test.describe('review store — identity and generations', () => {
  test('identity is deterministic over the binding', () => {
    const value = artifacts('one');
    expect(reviewIdentity(bindingFor(value))).toBe(reviewIdentity(bindingFor(value)));
  });

  test('a changed artifact yields a different identity', () => {
    expect(reviewIdentity(bindingFor(artifacts('one')))).not.toBe(reviewIdentity(bindingFor(artifacts('two'))));
  });

  test('identity is the binding, not the finding id', () => {
    // Same finding id, different source SHA: two distinct reviews.
    const value = artifacts('one');
    const a = reviewIdentity(bindingFor(value));
    const b = reviewIdentity(bindingFor(value, { sourceSha: 'b'.repeat(40) }));
    expect(a).not.toBe(b);
  });

  test('a regenerated artifact does not overwrite the earlier review', () => {
    const root = tempRoot();
    const store = storeIn(root);
    const first = artifacts('one');
    const second = artifacts('two');
    store.putDecision({ binding: bindingFor(first), decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
    store.putDecision({ binding: bindingFor(second), decision: 'REQUEST_FOLLOWUP', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });

    expect(store.fileNamesFor('finding:1')).toHaveLength(2);

    // Against the SECOND generation's artifacts, that review is current and
    // the first is still stored — history is not deleted.
    const read = store.read('finding:1', currentFor(second));
    expect(read.state).toBe('CURRENT');
    expect(read.envelope?.receipt.decision).toBe('REQUEST_FOLLOWUP');
    expect(read.generations).toHaveLength(2);

    // And against the FIRST generation's artifacts, the first is current.
    expect(store.read('finding:1', currentFor(first)).envelope?.receipt.decision).toBe('ACCEPT_EVIDENCE');
  });

  test('the file name encodes the discovery key and the identity', () => {
    const binding = bindingFor(artifacts('one'));
    const parsed = parseReviewFileName(reviewFileName(binding));
    expect(parsed).not.toBeNull();
    expect(parsed!.identity).toBe(reviewIdentity(binding));
  });
});

test.describe('review store — immutability and no-replace', () => {
  test('a second decision on one binding is refused and the bytes are unchanged', () => {
    const root = tempRoot();
    const store = storeIn(root);
    const value = artifacts('one');
    const binding = bindingFor(value);
    const written = store.putDecision({ binding, decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
    const before = fs.readFileSync(path.join(root, written.fileName), 'utf8');

    expect(() =>
      store.putDecision({ binding, decision: 'MARK_INSUFFICIENT', reviewedAt: REVIEWED_AT, storedAt: STORED_AT })
    ).toThrow(/REVIEW_STORE_ALREADY_DECIDED/);

    expect(fs.readFileSync(path.join(root, written.fileName), 'utf8')).toBe(before);
    expect(store.read('finding:1', currentFor(value)).envelope?.receipt.decision).toBe('ACCEPT_EVIDENCE');
  });

  test('the conflict is a typed store error, not an opaque filesystem error', () => {
    const store = storeIn(tempRoot());
    const binding = bindingFor(artifacts('one'));
    store.putDecision({ binding, decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
    try {
      store.putDecision({ binding, decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
      throw new Error('expected a conflict');
    } catch (error) {
      expect(error).toBeInstanceOf(ReviewStoreError);
      expect((error as ReviewStoreError).code).toBe('REVIEW_STORE_ALREADY_DECIDED');
    }
  });

  test('the store never rewrites a published file', () => {
    const root = tempRoot();
    const store = storeIn(root);
    const value = artifacts('one');
    const written = store.putDecision({ binding: bindingFor(value), decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
    const before = fs.statSync(path.join(root, written.fileName));
    for (let i = 0; i < 5; i += 1) store.read('finding:1', currentFor(value));
    const after = fs.statSync(path.join(root, written.fileName));
    expect(after.mtimeMs).toBe(before.mtimeMs);
    expect(after.size).toBe(before.size);
  });
});

test.describe('review store — the four read states', () => {
  test('NO_REVIEW when nothing is stored', () => {
    const read = storeIn(tempRoot()).read('finding:1', currentFor(artifacts('one')));
    expect(read.state).toBe('NO_REVIEW');
    expect(read.envelope).toBeNull();
    expect(read.corruption).toEqual([]);
  });

  test('CURRENT when the binding still holds', () => {
    const store = storeIn(tempRoot());
    const value = artifacts('one');
    store.putDecision({ binding: bindingFor(value), decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
    const read = store.read('finding:1', currentFor(value));
    expect(read.state).toBe('CURRENT');
    expect(read.envelope?.receipt.organizationalAuthority).toBe('NONE_LOCAL_REVIEW_ONLY');
    expect(read.staleReason).toBeNull();
  });

  // Each of the eight bound fields must independently make a stored review
  // stale: a stale-detection rule that only watches some of them would let a
  // decision survive a change it never saw.
  for (const [label, mutate] of [
    ['finding', (value: Artifacts) => currentFor({ ...value, finding: { id: 'finding:1', seed: 'changed' } })],
    ['dossier', (value: Artifacts) => currentFor({ ...value, dossier: { candidateId: 'finding:1', body: 'changed' } })],
    ['handoff', (value: Artifacts) => currentFor(value, { handoff: { unexpected: true } })],
    ['sourceSha', (value: Artifacts) => currentFor(value, { sourceSha: 'b'.repeat(40) })],
    ['campaignId', (value: Artifacts) => currentFor(value, { campaignId: 'campaign.local.2' })],
    ['handoffVersion', (value: Artifacts) => currentFor(value, { handoffVersion: 'nightwatch.other.v9' })],
    ['privacyProjectionVersion', (value: Artifacts) => currentFor(value, { privacyProjectionVersion: 'nightwatch.privacy-projection.v2' })],
  ] as const) {
    test(`STALE when the ${label} changes`, () => {
      const store = storeIn(tempRoot());
      const value = artifacts('one');
      store.putDecision({ binding: bindingFor(value), decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
      const read = store.read('finding:1', mutate(value));
      expect(read.state).toBe('STALE');
      expect(read.staleReason).toContain('FINDING_REVIEW_STALE');
      // The stored decision still exists — staleness is not deletion.
      expect(read.generations).toHaveLength(1);
      expect(read.envelope).not.toBeNull();
    });
  }

  test('a stale review is never reported as current', () => {
    const store = storeIn(tempRoot());
    const value = artifacts('one');
    store.putDecision({ binding: bindingFor(value), decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
    const read = store.read('finding:1', currentFor(artifacts('two')));
    expect(read.state).not.toBe('CURRENT');
    expect(read.state).toBe('STALE');
  });
});

test.describe('review store — corruption is categorical and fail-closed', () => {
  function seed(): { root: string; store: ReviewStore; fileName: string; value: Artifacts } {
    const root = tempRoot();
    const store = storeIn(root);
    const value = artifacts('one');
    const written = store.putDecision({ binding: bindingFor(value), decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
    return { root, store, fileName: written.fileName, value };
  }

  function rewrite(root: string, fileName: string, mutate: (value: Record<string, unknown>) => unknown): void {
    const filePath = path.join(root, fileName);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
    fs.writeFileSync(filePath, JSON.stringify(mutate(parsed), null, 2), { encoding: 'utf8', mode: 0o600 });
  }

  test('truncated bytes read as CORRUPT', () => {
    const { root, store, fileName, value } = seed();
    fs.writeFileSync(path.join(root, fileName), '{"schemaVersion": "nightwa', { mode: 0o600 });
    const read = store.read('finding:1', currentFor(value));
    expect(read.state).toBe('CORRUPT');
    expect(read.envelope).toBeNull();
  });

  test('a zero-byte file reads as CORRUPT, never as absent', () => {
    const { root, store, fileName, value } = seed();
    fs.writeFileSync(path.join(root, fileName), '', { mode: 0o600 });
    expect(store.read('finding:1', currentFor(value)).state).toBe('CORRUPT');
  });

  test('an unknown schema version is never read optimistically', () => {
    const { root, store, fileName, value } = seed();
    rewrite(root, fileName, (parsed) => ({ ...parsed, schemaVersion: 'nightwatch.review-store.v99' }));
    const read = store.read('finding:1', currentFor(value));
    expect(read.state).toBe('CORRUPT');
    expect(read.corruption[0]?.code).toBe('REVIEW_STORE_VERSION_UNSUPPORTED');
  });

  test('a tampered receipt is detected', () => {
    const { root, store, fileName, value } = seed();
    rewrite(root, fileName, (parsed) => ({
      ...parsed,
      receipt: { ...(parsed.receipt as Record<string, unknown>), rationale: 'silently edited' },
    }));
    const read = store.read('finding:1', currentFor(value));
    expect(read.state).toBe('CORRUPT');
    expect(read.corruption[0]?.code).toBe('REVIEW_STORE_RECEIPT_TAMPERED');
  });

  test('an edited decision is detected', () => {
    const { root, store, fileName, value } = seed();
    rewrite(root, fileName, (parsed) => ({
      ...parsed,
      receipt: { ...(parsed.receipt as Record<string, unknown>), decision: 'SUPERSEDE', resultingState: 'SUPERSEDED' },
    }));
    expect(store.read('finding:1', currentFor(value)).state).toBe('CORRUPT');
  });

  test('a claimed organizational authority is refused', () => {
    const { root, store, fileName, value } = seed();
    rewrite(root, fileName, (parsed) => ({
      ...parsed,
      receipt: { ...(parsed.receipt as Record<string, unknown>), organizationalAuthority: 'LESLIE_GENUINE' },
    }));
    const read = store.read('finding:1', currentFor(value));
    expect(read.state).toBe('CORRUPT');
    expect(read.corruption[0]?.code).toBe('REVIEW_STORE_AUTHORITY_INVALID');
  });

  test('an emptied non-equivalence list is refused', () => {
    const { root, store, fileName, value } = seed();
    rewrite(root, fileName, (parsed) => ({
      ...parsed,
      receipt: { ...(parsed.receipt as Record<string, unknown>), notEquivalentTo: [] },
    }));
    expect(store.read('finding:1', currentFor(value)).state).toBe('CORRUPT');
  });

  test('a record that never decided is refused', () => {
    const { root, store, fileName, value } = seed();
    rewrite(root, fileName, (parsed) => ({
      ...parsed,
      record: { ...(parsed.record as Record<string, unknown>), state: 'REVIEW_PENDING', transitionCount: 0 },
    }));
    const read = store.read('finding:1', currentFor(value));
    expect(read.state).toBe('CORRUPT');
    expect(['REVIEW_STORE_STATE_INVALID', 'REVIEW_STORE_RECORD_RECEIPT_MISMATCH']).toContain(read.corruption[0]?.code);
  });

  test('a renamed file cannot make bytes authoritative', () => {
    const { root, store, fileName, value } = seed();
    const parsed = parseReviewFileName(fileName)!;
    const forged = `review.${parsed.discoveryKey}.${'0'.repeat(24)}.json`;
    fs.renameSync(path.join(root, fileName), path.join(root, forged));
    const read = store.read('finding:1', currentFor(value));
    expect(read.state).toBe('CORRUPT');
    expect(read.corruption[0]?.code).toBe('REVIEW_STORE_IDENTITY_MISMATCH');
  });

  test('an envelope identity that disagrees with its binding is refused', () => {
    const { root, store, fileName, value } = seed();
    rewrite(root, fileName, (parsed) => ({ ...parsed, reviewIdentity: 'f'.repeat(24) }));
    const read = store.read('finding:1', currentFor(value));
    expect(read.state).toBe('CORRUPT');
    expect(read.corruption[0]?.code).toBe('REVIEW_STORE_IDENTITY_MISMATCH');
  });

  test('an extra envelope field is refused', () => {
    const { root, store, fileName, value } = seed();
    rewrite(root, fileName, (parsed) => ({ ...parsed, smuggled: 'value' }));
    expect(store.read('finding:1', currentFor(value)).state).toBe('CORRUPT');
  });

  test('a corrupt generation never hides behind a valid one, and never becomes CURRENT', () => {
    const root = tempRoot();
    const store = storeIn(root);
    const first = artifacts('one');
    const second = artifacts('two');
    const a = store.putDecision({ binding: bindingFor(first), decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
    store.putDecision({ binding: bindingFor(second), decision: 'REQUEST_FOLLOWUP', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
    fs.writeFileSync(path.join(root, a.fileName), '{ broken', { mode: 0o600 });

    const read = store.read('finding:1', currentFor(second));
    // The valid generation still answers, and the corruption is reported
    // rather than swallowed.
    expect(read.state).toBe('CURRENT');
    expect(read.corruption).toHaveLength(1);
    expect(read.corruption[0]?.fileName).toBe(a.fileName);

    // But the corrupt generation itself never reads as current.
    const readFirst = store.read('finding:1', currentFor(first));
    expect(readFirst.state).not.toBe('CURRENT');
  });

  test('the error vocabulary is closed and every code is distinct', () => {
    expect(new Set(REVIEW_STORE_ERROR_CODES).size).toBe(REVIEW_STORE_ERROR_CODES.length);
    for (const code of REVIEW_STORE_ERROR_CODES) expect(code.startsWith('REVIEW_STORE_')).toBe(true);
  });

  test('validation refuses a foreign file name outright', () => {
    expect(() => validateStoredReviewEnvelope({}, 'not-a-review.json')).toThrow(/REVIEW_STORE_IDENTITY_MISMATCH/);
  });
});

test.describe('review store — rationale safety', () => {
  const UNSAFE = [
    ['email', 'contact person@example.com about this'],
    ['bearer token', 'sent with Bearer abcdefghijklmnop'],
    ['jwt', 'token eyJhbGciOiJIUzI1NiJ9.payload'],
    ['aws key', 'key AKIAIOSFODNN7EXAMPLE here'],
    ['customer sentinel', 'affects CUSTOMER_SENTINEL directly'],
    ['account sentinel', 'ACCOUNT_SENTINEL mismatch'],
    ['cost sentinel', 'COST_SENTINEL was wrong'],
    ['private key', '-----BEGIN RSA PRIVATE KEY----- material'],
  ] as const;

  for (const [label, rationale] of UNSAFE) {
    test(`a rationale carrying a ${label} never persists`, () => {
      const root = tempRoot();
      const store = storeIn(root);
      expect(() =>
        store.putDecision({ binding: bindingFor(artifacts('one')), decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT, rationale })
      ).toThrow(/FINDING_REVIEW_INVALID_RATIONALE/);
      // Nothing at all was written — not even a temporary.
      expect(fs.readdirSync(root)).toEqual([]);
    });
  }

  test('an oversized rationale never persists', () => {
    const root = tempRoot();
    const store = storeIn(root);
    expect(() =>
      store.putDecision({ binding: bindingFor(artifacts('one')), decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT, rationale: 'x'.repeat(2001) })
    ).toThrow(/FINDING_REVIEW_INVALID_RATIONALE/);
    expect(fs.readdirSync(root)).toEqual([]);
  });

  test('a bounded safe rationale is preserved verbatim', () => {
    const store = storeIn(tempRoot());
    const value = artifacts('one');
    store.putDecision({
      binding: bindingFor(value),
      decision: 'ACCEPT_EVIDENCE',
      reviewedAt: REVIEWED_AT,
      storedAt: STORED_AT,
      rationale: 'Replay reproduced the projection mismatch on the minimal sequence.',
    });
    expect(store.read('finding:1', currentFor(value)).envelope?.receipt.rationale).toBe(
      'Replay reproduced the projection mismatch on the minimal sequence.'
    );
  });
});

test.describe('review store — recovery and containment', () => {
  test('an interrupted publish leaves an identifiable temporary and nothing canonical', () => {
    const root = tempRoot();
    const store = storeIn(root);
    // Simulate the crash window by hand: a temporary in the publisher's
    // pinned shape, with no canonical file.
    const orphan = `.nightwatch-${process.pid}-${'a'.repeat(32)}.tmp`;
    fs.writeFileSync(path.join(root, orphan), '{"partial":', { mode: 0o600 });

    expect(store.read('finding:1', currentFor(artifacts('one'))).state).toBe('NO_REVIEW');
    expect(store.recoverTemporaries().found).toEqual([orphan]);
    expect(fs.existsSync(path.join(root, orphan))).toBe(true);

    expect(store.recoverTemporaries({ remove: true }).removed).toEqual([orphan]);
    expect(fs.existsSync(path.join(root, orphan))).toBe(false);
  });

  test('recovery never reports or removes an unknown file', () => {
    const root = tempRoot();
    const store = storeIn(root);
    for (const name of ['notes.txt', 'review.json', '.hidden', 'something.tmp', '.nightwatch-x-y.tmp']) {
      fs.writeFileSync(path.join(root, name), 'owner data', { mode: 0o600 });
    }
    expect(store.recoverTemporaries({ remove: true }).removed).toEqual([]);
    for (const name of ['notes.txt', 'review.json', '.hidden', 'something.tmp', '.nightwatch-x-y.tmp']) {
      expect(fs.existsSync(path.join(root, name))).toBe(true);
    }
  });

  test('a traversal-shaped finding id cannot escape the store', () => {
    const root = tempRoot();
    const parent = path.dirname(root);
    const parentBefore = fs.readdirSync(parent);
    const store = storeIn(root);

    // `../../escape` is a VALID finding id: the lifecycle's id vocabulary
    // permits dots and slashes, and narrowing it here would be a change to
    // review semantics this cone does not own. It still cannot traverse,
    // because the id never reaches the filesystem as a path — the discovery
    // key is a digest, so every file name this store produces is hex.
    const written = store.putDecision({
      binding: bindingFor(artifacts('one'), { findingId: '../../escape' }),
      decision: 'ACCEPT_EVIDENCE',
      reviewedAt: REVIEWED_AT,
      storedAt: STORED_AT,
    });

    expect(written.fileName).toMatch(/^review\.[0-9a-f]{12}\.[0-9a-f]{24}\.json$/);
    expect(written.fileName).not.toContain('..');
    expect(written.fileName).not.toContain('/');
    expect(fs.readdirSync(root)).toEqual([written.fileName]);
    // Nothing appeared beside the store root.
    expect(fs.readdirSync(parent)).toEqual(parentBefore);
  });

  test('a hand-built traversal file name is refused by the publisher', () => {
    // The digest makes traversal unreachable through the normal path; this
    // proves the underlying publisher would refuse it anyway, so the safety
    // does not rest on the digest alone.
    const artifactStore = new PrivateArtifactStore({ root: tempRoot() });
    for (const name of ['../escape.json', '/etc/passwd.json', 'a/b.json', '..json']) {
      expect(() => artifactStore.writeImmutableJson(name, { value: 1 }), name).toThrow(/PRIVATE_ARTIFACT_FILE_NAME_UNSAFE/);
    }
  });

  test('the store writes nothing outside its own root', () => {
    const root = tempRoot();
    const store = storeIn(root);
    const value = artifacts('one');
    const written = store.putDecision({ binding: bindingFor(value), decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
    expect(fs.readdirSync(root)).toEqual([written.fileName]);
  });

  test('there is no publication path', () => {
    const store = storeIn(tempRoot());
    // The store exposes no publish surface of its own, and the primitive it
    // is built on refuses publication categorically.
    expect((store as unknown as Record<string, unknown>).publish).toBeUndefined();
    expect(() => new PrivateArtifactStore({ root: tempRoot() }).publish()).toThrow(/OWNER_POLICY_BLOCKED|BLOCKED/);
  });
});
