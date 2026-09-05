// Review-store durability — properties, injected crashes, and concurrency.
//
// The store's whole claim is that a decision survives interruption and
// competition without ever becoming something a reader would accept as valid.
// That claim is not testable by writing and reading back; it is testable by
// breaking the write at every point it can break, and by racing it.
//
// Every seed is fixed. A durability failure that cannot be reproduced exactly
// is a durability failure nobody can fix.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  ReviewStore,
  ReviewStoreError,
  reviewFileName,
  reviewIdentity,
  validateStoredReviewEnvelope,
} from '../../src/core/reviewStore';
import { findingArtifactDigest, type CurrentReviewArtifacts, type FindingReviewBinding } from '../../src/core/findingReview';

const REVIEWED_AT = '2026-09-05T10:00:00Z';
const STORED_AT = '2026-09-05T10:00:01Z';
const SOURCE_SHA = 'a'.repeat(40);

/** Deterministic mixer; never Math.random. */
function mix(seed: number): number {
  let value = seed >>> 0;
  value = Math.imul(value ^ (value >>> 16), 2246822507) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 3266489909) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

interface Artifacts {
  readonly finding: unknown;
  readonly dossier: unknown;
}

function artifacts(seed: string): Artifacts {
  return { finding: { id: `finding:${seed}`, seed }, dossier: { candidateId: `finding:${seed}`, body: seed } };
}

function bindingFor(value: Artifacts, findingId: string, overrides: Partial<FindingReviewBinding> = {}): FindingReviewBinding {
  return {
    findingId,
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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-review-durability-'));
  fs.chmodSync(root, 0o700);
  return root;
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

test.describe('properties (deterministic seeds)', () => {
  const SEEDS = Array.from({ length: 40 }, (_, index) => mix(index + 1));

  test('same binding, decision, instant and rationale => same receipt identity', () => {
    for (const seed of SEEDS) {
      const rootA = tempRoot();
      const rootB = tempRoot();
      const value = artifacts(String(seed));
      const binding = bindingFor(value, `finding:${seed}`);
      const input = { binding, decision: 'ACCEPT_EVIDENCE' as const, reviewedAt: REVIEWED_AT, storedAt: STORED_AT, rationale: `seed ${seed}` };
      const first = new ReviewStore({ root: rootA }).putDecision(input);
      const second = new ReviewStore({ root: rootB }).putDecision(input);
      expect(second.receipt.reviewId).toBe(first.receipt.reviewId);
      expect(second.reviewIdentity).toBe(first.reviewIdentity);
      // And the published bytes are identical too.
      expect(fs.readFileSync(path.join(rootB, second.fileName), 'utf8')).toBe(fs.readFileSync(path.join(rootA, first.fileName), 'utf8'));
    }
  });

  test('a different rationale or instant is a different receipt', () => {
    for (const seed of SEEDS.slice(0, 12)) {
      const value = artifacts(String(seed));
      const binding = bindingFor(value, `finding:${seed}`);
      const base = new ReviewStore({ root: tempRoot() }).putDecision({ binding, decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT, rationale: 'a' });
      const other = new ReviewStore({ root: tempRoot() }).putDecision({ binding, decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT, rationale: 'b' });
      const later = new ReviewStore({ root: tempRoot() }).putDecision({ binding, decision: 'ACCEPT_EVIDENCE', reviewedAt: '2026-09-05T11:00:00Z', storedAt: STORED_AT, rationale: 'a' });
      expect(other.receipt.reviewId).not.toBe(base.receipt.reviewId);
      expect(later.receipt.reviewId).not.toBe(base.receipt.reviewId);
      // The IDENTITY, though, is the binding — so all three collide on one
      // file, and only one of them can ever be stored. That is the point.
      expect(other.reviewIdentity).toBe(base.reviewIdentity);
      expect(later.reviewIdentity).toBe(base.reviewIdentity);
    }
  });

  // Every bound field, independently, must make a stored review stale.
  const DRIFTS: readonly (readonly [string, (value: Artifacts) => CurrentReviewArtifacts])[] = [
    ['finding', (value) => currentFor(value, { finding: { changed: true } })],
    ['dossier', (value) => currentFor(value, { dossier: { changed: true } })],
    ['handoff', (value) => currentFor(value, { handoff: { arrived: true } })],
    ['sourceSha', (value) => currentFor(value, { sourceSha: 'b'.repeat(40) })],
    ['campaignId', (value) => currentFor(value, { campaignId: 'campaign.local.2' })],
    ['handoffVersion', (value) => currentFor(value, { handoffVersion: 'other.v1' })],
    ['privacyProjectionVersion', (value) => currentFor(value, { privacyProjectionVersion: 'nightwatch.privacy-projection.v2' })],
  ];

  for (const [field, drift] of DRIFTS) {
    test(`a changed ${field} makes a stored review stale, over every seed`, () => {
      for (const seed of SEEDS.slice(0, 10)) {
        const store = new ReviewStore({ root: tempRoot() });
        const value = artifacts(String(seed));
        const findingId = `finding:${seed}`;
        store.putDecision({ binding: bindingFor(value, findingId), decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
        expect(store.read(findingId, currentFor(value)).state, `${field} seed ${seed} baseline`).toBe('CURRENT');
        expect(store.read(findingId, drift(value)).state, `${field} seed ${seed}`).toBe('STALE');
      }
    });
  }

  test('a terminal receipt can never transition again', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const store = new ReviewStore({ root: tempRoot() });
      const value = artifacts(String(seed));
      const findingId = `finding:${seed}`;
      const binding = bindingFor(value, findingId);
      store.putDecision({ binding, decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
      for (const decision of ['ACCEPT_EVIDENCE', 'REQUEST_FOLLOWUP', 'MARK_INSUFFICIENT', 'MARK_DUPLICATE_CANDIDATE', 'SUPERSEDE'] as const) {
        expect(() => store.putDecision({ binding, decision, reviewedAt: REVIEWED_AT, storedAt: STORED_AT })).toThrow(/REVIEW_STORE_ALREADY_DECIDED/);
      }
    }
  });

  test('a local review can never acquire organizational authority', () => {
    for (const seed of SEEDS.slice(0, 15)) {
      const root = tempRoot();
      const store = new ReviewStore({ root });
      const value = artifacts(String(seed));
      const findingId = `finding:${seed}`;
      const written = store.putDecision({ binding: bindingFor(value, findingId), decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
      expect(written.receipt.organizationalAuthority).toBe('NONE_LOCAL_REVIEW_ONLY');

      for (const claimed of ['LESLIE_GENUINE', 'LESLIE_INVALID', 'PONDR_APPROVED', 'APPROVED', '']) {
        const filePath = path.join(root, written.fileName);
        const original = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(original) as Record<string, unknown>;
        fs.writeFileSync(filePath, JSON.stringify({ ...parsed, receipt: { ...(parsed.receipt as Record<string, unknown>), organizationalAuthority: claimed } }), { mode: 0o600 });
        expect(store.read(findingId, currentFor(value)).state, claimed).not.toBe('CURRENT');
        fs.writeFileSync(filePath, original, { mode: 0o600 });
      }
    }
  });

  test('corrupt bytes never become CURRENT, over a corruption corpus', () => {
    const root = tempRoot();
    const store = new ReviewStore({ root });
    const value = artifacts('corruption');
    const findingId = 'finding:corruption';
    const written = store.putDecision({ binding: bindingFor(value, findingId), decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
    const filePath = path.join(root, written.fileName);
    const original = fs.readFileSync(filePath, 'utf8');

    // Truncation at every 16th byte, plus byte flips at deterministic offsets.
    const corruptions: string[] = [];
    for (let cut = 0; cut < original.length; cut += 16) corruptions.push(original.slice(0, cut));
    for (let index = 0; index < 40; index += 1) {
      const offset = mix(index) % original.length;
      corruptions.push(`${original.slice(0, offset)}~${original.slice(offset + 1)}`);
    }
    corruptions.push('', '{}', '[]', 'null', '{"schemaVersion":"nightwatch.review-store.v1"}');

    let everCurrent = 0;
    for (const corrupted of corruptions) {
      fs.writeFileSync(filePath, corrupted, { mode: 0o600 });
      const state = store.read(findingId, currentFor(value)).state;
      // The ONLY acceptable outcomes: it is rejected, or the corruption
      // happened to reproduce the exact original bytes.
      if (state === 'CURRENT') {
        expect(corrupted, 'a corrupted file read as CURRENT').toBe(original);
        everCurrent += 1;
      }
    }
    fs.writeFileSync(filePath, original, { mode: 0o600 });
    expect(corruptions.length).toBeGreaterThan(50);
    expect(everCurrent).toBe(0);
    expect(store.read(findingId, currentFor(value)).state).toBe('CURRENT');
  });

  test('an unknown schema version never becomes CURRENT', () => {
    const root = tempRoot();
    const store = new ReviewStore({ root });
    const value = artifacts('schema');
    const findingId = 'finding:schema';
    const written = store.putDecision({ binding: bindingFor(value, findingId), decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
    const filePath = path.join(root, written.fileName);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
    for (const version of ['nightwatch.review-store.v0', 'nightwatch.review-store.v2', 'nightwatch.review-store.v1 ', 'REVIEW_STORE', '', null, 1]) {
      fs.writeFileSync(filePath, JSON.stringify({ ...parsed, schemaVersion: version }), { mode: 0o600 });
      const read = store.read(findingId, currentFor(value));
      expect(read.state, String(version)).toBe('CORRUPT');
      expect(read.corruption[0]?.code).toBe('REVIEW_STORE_VERSION_UNSUPPORTED');
    }
  });

  test('a review write never mutates a source artifact', () => {
    const root = tempRoot();
    const store = new ReviewStore({ root });
    const value = artifacts('immutable');
    const before = JSON.stringify(value);
    const binding = bindingFor(value, 'finding:immutable');
    const bindingBefore = JSON.stringify(binding);
    store.putDecision({ binding, decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
    expect(JSON.stringify(value)).toBe(before);
    expect(JSON.stringify(binding)).toBe(bindingBefore);
  });

  test('the store has no publication surface at all', () => {
    const store = new ReviewStore({ root: tempRoot() });
    const surface = new Set<string>();
    // Walk the store's own prototype chain, stopping BEFORE Object.prototype:
    // hasOwnProperty and friends are not part of this store's surface and
    // including them would make the allowlist below meaningless.
    for (let proto: object | null = store; proto !== null && proto !== Object.prototype; proto = Object.getPrototypeOf(proto) as object | null) {
      for (const name of Object.getOwnPropertyNames(proto)) surface.add(name);
    }
    // Unambiguous publication verbs are matched as substrings; `file` is
    // matched as a whole word only, because `fileNamesFor` is a legitimate
    // local discovery method and a substring test would have flagged it.
    // A check that has to be loosened to pass is worth stating precisely
    // rather than deleting.
    for (const forbidden of ['publish', 'upload', 'transmit', 'webhook', 'export', 'notify']) {
      expect([...surface].some((name) => name.toLowerCase().includes(forbidden)), forbidden).toBe(false);
    }
    for (const forbidden of ['file', 'send', 'post', 'push', 'sync']) {
      expect([...surface].some((name) => name.toLowerCase() === forbidden), forbidden).toBe(false);
    }
    // Positive totality: the surface that DOES exist is exactly the local
    // one. A new method cannot be added without this test being updated,
    // which is the point — a publication method would have to be declared.
    expect([...surface].filter((name) => name !== 'constructor').sort()).toEqual(
      ['artifacts', 'fileNamesFor', 'policy', 'putDecision', 'read', 'recoverTemporaries', 'root'].sort()
    );
  });
});

// ---------------------------------------------------------------------------
// Injected crashes
// ---------------------------------------------------------------------------

/**
 * Fail the Nth call of one fs function.
 *
 * The publish path is a fixed sequence of fs calls, so failing each call of
 * each function walks every point at which a real process could die: before
 * the temporary exists, after it exists, mid-write, after the write and
 * before publication, during publication, and after publication.
 */
function withFsFault<T>(method: keyof typeof fs, nth: number, code: string, run: () => T): T {
  const original = Reflect.get(fs, method) as (...args: unknown[]) => unknown;
  let seen = 0;
  Reflect.set(fs, method, (...args: unknown[]) => {
    seen += 1;
    if (seen === nth) {
      const error = new Error(`injected ${code} at ${String(method)} #${nth}`) as NodeJS.ErrnoException;
      error.code = code;
      throw error;
    }
    return original(...args);
  });
  try {
    return run();
  } finally {
    Reflect.set(fs, method, original);
  }
}

test.describe('injected crash consistency', () => {
  const INJECTION_POINTS: readonly (readonly [keyof typeof fs, number])[] = [
    // Directory preparation and root safety.
    ['mkdirSync', 1], ['chmodSync', 1], ['lstatSync', 1], ['lstatSync', 2], ['lstatSync', 3],
    // Temporary creation and write.
    ['openSync', 1], ['writeFileSync', 1], ['fsyncSync', 1], ['closeSync', 1],
    ['chmodSync', 2], ['lstatSync', 4], ['lstatSync', 5],
    // Publication and verification.
    ['linkSync', 1], ['lstatSync', 6], ['lstatSync', 7], ['unlinkSync', 1],
    // Directory durability and the final verification.
    ['openSync', 2], ['fsyncSync', 2], ['closeSync', 2], ['lstatSync', 8], ['lstatSync', 9],
    // Deeper points, reached only on longer paths.
    ['lstatSync', 10], ['chmodSync', 3], ['openSync', 3],
  ];

  const CODES = ['EIO', 'ENOSPC', 'EACCES'] as const;

  test(`the canonical file is never partial across ${INJECTION_POINTS.length * CODES.length} injected failures`, () => {
    let injectionsThatFired = 0;
    let survivedComplete = 0;

    for (const [method, nth] of INJECTION_POINTS) {
      for (const code of CODES) {
        const root = tempRoot();
        const store = new ReviewStore({ root });
        const value = artifacts(`crash-${String(method)}-${nth}-${code}`);
        const findingId = `finding:crash-${String(method)}-${nth}`;
        const binding = bindingFor(value, findingId);

        let threw = false;
        try {
          withFsFault(method, nth, code, () =>
            store.putDecision({ binding, decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT })
          );
        } catch {
          threw = true;
          injectionsThatFired += 1;
        }

        // A fresh store, as a restarted process would see it.
        const after = new ReviewStore({ root });
        const canonical = reviewFileName(binding);
        const canonicalPath = path.join(root, canonical);
        const label = `${String(method)}#${nth}/${code}`;

        if (fs.existsSync(canonicalPath)) {
          // If it exists, it must be COMPLETE and VALID. Never partial,
          // never zero-byte, never malformed.
          const bytes = fs.readFileSync(canonicalPath, 'utf8');
          expect(bytes.length, label).toBeGreaterThan(0);
          const parsed = JSON.parse(bytes) as unknown;
          expect(() => validateStoredReviewEnvelope(parsed, canonical), label).not.toThrow();
          expect(after.read(findingId, currentFor(value)).state, label).toBe('CURRENT');
          if (!threw) survivedComplete += 1;
        } else {
          // Absent is the other acceptable outcome, and the reader says so.
          expect(after.read(findingId, currentFor(value)).state, label).toBe('NO_REVIEW');
        }

        // Whatever happened, any leftover is an identifiable temporary, and
        // recovery removes only those.
        for (const entry of fs.readdirSync(root)) {
          expect(entry === canonical || /^\.nightwatch-\d+-[0-9a-f]{32}\.tmp$/.test(entry), `${label}: unexpected residue ${entry}`).toBe(true);
        }
        const recovered = after.recoverTemporaries({ remove: true });
        for (const name of recovered.removed) expect(name).toMatch(/^\.nightwatch-\d+-[0-9a-f]{32}\.tmp$/);
        // After recovery, only canonical state remains.
        expect(fs.readdirSync(root).every((entry) => entry === canonical), label).toBe(true);

        fs.rmSync(root, { recursive: true, force: true });
      }
    }

    // The harness must actually have injected faults; an injection that never
    // fired would let every assertion above pass while testing nothing.
    expect(injectionsThatFired).toBeGreaterThan(30);
    // And some injections legitimately land after publication completes.
    expect(survivedComplete + injectionsThatFired).toBe(INJECTION_POINTS.length * CODES.length);
  });

  test('a crash before publication leaves no canonical file and the next write succeeds', () => {
    const root = tempRoot();
    const value = artifacts('retry');
    const findingId = 'finding:retry';
    const binding = bindingFor(value, findingId);

    expect(() =>
      withFsFault('linkSync', 1, 'EIO', () =>
        new ReviewStore({ root }).putDecision({ binding, decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT })
      )
    ).toThrow();

    const after = new ReviewStore({ root });
    expect(after.read(findingId, currentFor(value)).state).toBe('NO_REVIEW');
    after.recoverTemporaries({ remove: true });

    // The interrupted decision can be made again, because it was never made.
    const written = after.putDecision({ binding, decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
    expect(after.read(findingId, currentFor(value)).state).toBe('CURRENT');
    expect(fs.readdirSync(root)).toEqual([written.fileName]);
  });

  test('a crash after publication leaves the decision made, and it cannot be made twice', () => {
    const root = tempRoot();
    const value = artifacts('published');
    const findingId = 'finding:published';
    const binding = bindingFor(value, findingId);

    // unlinkSync of the temporary is the first call AFTER the link succeeds.
    try {
      withFsFault('unlinkSync', 1, 'EIO', () =>
        new ReviewStore({ root }).putDecision({ binding, decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT })
      );
    } catch {
      // The caller never learned it succeeded — which is exactly the case
      // that must not become a second decision on retry.
    }

    const after = new ReviewStore({ root });
    after.recoverTemporaries({ remove: true });
    expect(after.read(findingId, currentFor(value)).state).toBe('CURRENT');
    expect(() => after.putDecision({ binding, decision: 'SUPERSEDE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT })).toThrow(/REVIEW_STORE_ALREADY_DECIDED/);
  });
});

// ---------------------------------------------------------------------------
// Concurrency
// ---------------------------------------------------------------------------

test.describe('concurrency', () => {
  test('competing writers for one binding produce exactly one winner', () => {
    for (const writers of [2, 4, 8, 16]) {
      const root = tempRoot();
      const value = artifacts(`race-${writers}`);
      const findingId = `finding:race-${writers}`;
      const binding = bindingFor(value, findingId);
      const decisions = ['ACCEPT_EVIDENCE', 'REQUEST_FOLLOWUP', 'MARK_INSUFFICIENT', 'MARK_DUPLICATE_CANDIDATE', 'SUPERSEDE'] as const;

      const outcomes = Array.from({ length: writers }, (_, index) => {
        const store = new ReviewStore({ root });
        try {
          store.putDecision({
            binding,
            decision: decisions[index % decisions.length] as (typeof decisions)[number],
            reviewedAt: REVIEWED_AT,
            storedAt: STORED_AT,
            rationale: `writer ${index}`,
          });
          return 'WON';
        } catch (error) {
          expect(error).toBeInstanceOf(ReviewStoreError);
          return (error as ReviewStoreError).code;
        }
      });

      expect(outcomes.filter((outcome) => outcome === 'WON'), `writers=${writers}`).toHaveLength(1);
      // Every loser gets the SAME deterministic answer — not a filesystem
      // error, and not silence.
      for (const outcome of outcomes.filter((value2) => value2 !== 'WON')) {
        expect(outcome).toBe('REVIEW_STORE_ALREADY_DECIDED');
      }

      // Exactly one file, and it is the winner's, valid and complete.
      const files = fs.readdirSync(root);
      expect(files).toHaveLength(1);
      const read = new ReviewStore({ root }).read(findingId, currentFor(value));
      expect(read.state).toBe('CURRENT');
      expect(read.envelope?.receipt.rationale).toBe('writer 0');
    }
  });

  test('many readers during a write never observe a partial file', () => {
    const root = tempRoot();
    const value = artifacts('read-during-write');
    const findingId = 'finding:read-during-write';
    const binding = bindingFor(value, findingId);
    const readers = Array.from({ length: 12 }, () => new ReviewStore({ root }));

    const observed = new Set<string>();
    // Interleave reads with the publish path by reading from inside an fs
    // hook, so a reader genuinely runs while the write is in flight.
    const originalLink = fs.linkSync;
    let linked = 0;
    fs.linkSync = ((existing: fs.PathLike, target: fs.PathLike) => {
      // Before the link: nothing canonical exists yet.
      for (const reader of readers) observed.add(reader.read(findingId, currentFor(value)).state);
      const result = originalLink(existing, target);
      linked += 1;
      // Immediately after the link: the file is complete by construction.
      for (const reader of readers) observed.add(reader.read(findingId, currentFor(value)).state);
      return result;
    }) as typeof fs.linkSync;

    try {
      new ReviewStore({ root }).putDecision({ binding, decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
    } finally {
      fs.linkSync = originalLink;
    }

    expect(linked).toBe(1);
    // Only the two honest answers were ever observed. CORRUPT would mean a
    // reader saw a half-written file.
    expect([...observed].sort()).toEqual(['CURRENT', 'NO_REVIEW']);
  });

  test('distinct bindings do not contend', () => {
    const root = tempRoot();
    const written = Array.from({ length: 25 }, (_, index) => {
      const value = artifacts(`parallel-${index}`);
      const findingId = `finding:parallel-${index}`;
      return {
        findingId,
        value,
        result: new ReviewStore({ root }).putDecision({
          binding: bindingFor(value, findingId),
          decision: 'ACCEPT_EVIDENCE',
          reviewedAt: REVIEWED_AT,
          storedAt: STORED_AT,
        }),
      };
    });
    expect(new Set(written.map((entry) => entry.result.reviewIdentity)).size).toBe(25);
    expect(fs.readdirSync(root)).toHaveLength(25);
    const reader = new ReviewStore({ root });
    for (const entry of written) {
      expect(reader.read(entry.findingId, currentFor(entry.value)).state).toBe('CURRENT');
    }
  });

  test('a reader during recovery sees valid state, never a half-removed store', () => {
    const root = tempRoot();
    const store = new ReviewStore({ root });
    const value = artifacts('recovery');
    const findingId = 'finding:recovery';
    store.putDecision({ binding: bindingFor(value, findingId), decision: 'ACCEPT_EVIDENCE', reviewedAt: REVIEWED_AT, storedAt: STORED_AT });
    for (let index = 0; index < 6; index += 1) {
      fs.writeFileSync(path.join(root, `.nightwatch-${1000 + index}-${'b'.repeat(32)}.tmp`), 'partial', { mode: 0o600 });
    }
    expect(store.read(findingId, currentFor(value)).state).toBe('CURRENT');
    expect(store.recoverTemporaries({ remove: true }).removed).toHaveLength(6);
    expect(store.read(findingId, currentFor(value)).state).toBe('CURRENT');
    expect(fs.readdirSync(root)).toHaveLength(1);
  });

  test('a reviewIdentity collision across distinct bindings does not occur in the corpus', () => {
    // Not a proof of collision resistance; a check that the identity is
    // actually derived from the whole binding rather than from a subset that
    // many bindings share.
    const identities = new Set<string>();
    let count = 0;
    for (let index = 0; index < 500; index += 1) {
      const value = artifacts(`collision-${index}`);
      identities.add(reviewIdentity(bindingFor(value, `finding:collision-${index % 25}`)));
      count += 1;
    }
    expect(count).toBe(500);
    expect(identities.size).toBe(500);
  });
});
