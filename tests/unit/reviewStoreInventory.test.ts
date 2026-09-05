// ---------------------------------------------------------------------------
// Review-store inventory and per-finding history.
//
// The inventory's job is to make an intentionally-growing, never-pruned store
// observable without becoming a way to change it. So the tests here are as
// much about what it CANNOT do — write, delete, touch a timestamp, echo a
// stranger's filename, claim a currentness it cannot know — as about the
// counts it produces.
//
// Every store is rooted in an injected temporary directory. Nothing touches
// the operator's real review store.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  REVIEW_HISTORY_DEFAULT_LIMIT,
  REVIEW_HISTORY_IDENTITY_ABSENCE,
  REVIEW_INVENTORY_MAX_ROWS,
  REVIEW_STORE_HEALTH_CONDITIONS,
  ReviewStore,
  compareReviewGenerations,
  inventoryReviewStore,
  reviewHistoryFor,
  reviewStoreHealth,
  unknownEntryNameDigest,
  type ReviewArtifactCurrentness,
  type ReviewStoreScanner,
} from '../../src/core/reviewStore';
import {
  findingArtifactDigest,
  verifyReviewCurrent,
  type CurrentReviewArtifacts,
  type FindingReviewBinding,
} from '../../src/core/findingReview';

const SOURCE_SHA = 'a'.repeat(40);

interface Artifacts {
  readonly finding: unknown;
  readonly dossier: unknown;
}

function artifacts(findingId: string, seed: string): Artifacts {
  return { finding: { id: findingId, seed }, dossier: { candidateId: findingId, body: seed } };
}

function bindingFor(findingId: string, value: Artifacts, overrides: Partial<FindingReviewBinding> = {}): FindingReviewBinding {
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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nw-review-inventory-'));
}

/** A read-only handle: the one the inventory is allowed to hold. */
function readOnlyStore(root: string): ReviewStore {
  return new ReviewStore({ root, createIfMissing: false });
}

interface Seeded {
  readonly root: string;
  readonly writer: ReviewStore;
}

function seed(): Seeded {
  const root = tempRoot();
  return { root, writer: new ReviewStore({ root }) };
}

/** Write one generation and return the artifacts it bound to. */
function writeGeneration(
  writer: ReviewStore,
  findingId: string,
  seedValue: string,
  at: string,
  decision: 'ACCEPT_EVIDENCE' | 'REQUEST_FOLLOWUP' | 'MARK_INSUFFICIENT' = 'ACCEPT_EVIDENCE'
): Artifacts {
  const value = artifacts(findingId, seedValue);
  writer.putDecision({
    binding: bindingFor(findingId, value),
    decision,
    reviewedAt: at,
    storedAt: at,
    rationale: 'local review',
  });
  return value;
}

/** Currentness against one finding's current artifacts, as the CC would resolve it. */
function currentnessResolver(current: CurrentReviewArtifacts): (envelope: { readonly receipt: never }) => ReviewArtifactCurrentness {
  return (envelope) => {
    try {
      verifyReviewCurrent(envelope.receipt, current);
      return 'CURRENT';
    } catch (error) {
      return (error as Error).message.startsWith('FINDING_REVIEW_STALE') ? 'STALE' : 'UNKNOWN';
    }
  };
}

/** Snapshot of every entry's observable filesystem state. */
function fsSnapshot(root: string): string {
  return JSON.stringify(
    fs
      .readdirSync(root)
      .sort()
      .map((name) => {
        const stat = fs.lstatSync(path.join(root, name));
        return { name, size: stat.size, mode: stat.mode, mtimeMs: stat.mtimeMs, ino: stat.ino };
      })
  );
}

test.describe('review store inventory — read-only by construction', () => {
  test('the inventory refuses a writable store handle', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    // A writable handle is not merely discouraged here. It is refused, because
    // its readJson mkdirs and chmods the root on every call.
    expect(() => inventoryReviewStore(writer as unknown as ReviewStoreScanner)).toThrow(/REVIEW_INVENTORY_REQUIRES_READ_ONLY_STORE/);
  });

  test('a read-only handle cannot write at all', () => {
    const { root, writer } = seed();
    const value = writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    const reader = readOnlyStore(root);
    expect(reader.readOnly).toBe(true);
    expect(() =>
      reader.putDecision({
        binding: bindingFor('finding:2', value),
        decision: 'ACCEPT_EVIDENCE',
        reviewedAt: '2026-09-05T10:00:00Z',
        storedAt: '2026-09-05T10:00:00Z',
      })
    ).toThrow(/PRIVATE_ARTIFACT_READ_ONLY/);
    expect(() => reader.recoverTemporaries({ remove: true })).not.toThrow(); // nothing to remove
  });

  test('running the inventory leaves the store byte-identical', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    writeGeneration(writer, 'finding:2', 'b', '2026-09-05T10:00:01Z');
    fs.writeFileSync(path.join(root, 'stranger.txt'), 'not ours', { mode: 0o600 });
    const rootStatBefore = fs.lstatSync(root);
    const before = fsSnapshot(root);
    inventoryReviewStore(readOnlyStore(root));
    inventoryReviewStore(readOnlyStore(root));
    const rootStatAfter = fs.lstatSync(root);
    expect(fsSnapshot(root)).toBe(before);
    expect(rootStatAfter.mode).toBe(rootStatBefore.mode);
    expect(rootStatAfter.mtimeMs).toBe(rootStatBefore.mtimeMs);
  });

  test('an absent store is STORE_UNAVAILABLE rather than an empty healthy one', () => {
    const root = path.join(tempRoot(), 'never-created');
    const inventory = inventoryReviewStore(readOnlyStore(root));
    expect(inventory.exists).toBe(false);
    expect(inventory.health.classification).toBe('STORE_UNAVAILABLE');
    expect(inventory.counts.entries).toBe(0);
  });
});

test.describe('review store inventory — counts and axes', () => {
  test('counts every kind, and canonical splits exactly into valid, corrupt and unreadable', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    writeGeneration(writer, 'finding:1', 'b', '2026-09-05T10:00:02Z', 'REQUEST_FOLLOWUP');
    writeGeneration(writer, 'finding:2', 'c', '2026-09-05T10:00:03Z');
    const inventory = inventoryReviewStore(readOnlyStore(root));
    expect(inventory.counts.canonicalArtifacts).toBe(3);
    expect(inventory.counts.validArtifacts).toBe(3);
    expect(inventory.counts.corruptArtifacts).toBe(0);
    expect(inventory.counts.unreadableArtifacts).toBe(0);
    expect(
      inventory.counts.validArtifacts + inventory.counts.corruptArtifacts + inventory.counts.unreadableArtifacts
    ).toBe(inventory.counts.canonicalArtifacts);
    expect(inventory.counts.uniqueFindings).toBe(2);
    expect(inventory.counts.generations).toBe(3);
    expect(inventory.counts.findingsWithMultipleGenerations).toBe(1);
    expect(inventory.counts.byDecision.ACCEPT_EVIDENCE).toBe(2);
    expect(inventory.counts.byDecision.REQUEST_FOLLOWUP).toBe(1);
    expect(inventory.counts.byResultingState.REVIEWED).toBe(2);
    expect(inventory.counts.byResultingState.FOLLOWUP_RECOMMENDED).toBe(1);
    expect(inventory.oldestStoredAt).toBe('2026-09-05T10:00:00Z');
    expect(inventory.newestStoredAt).toBe('2026-09-05T10:00:03Z');
  });

  test('the decision and state vocabularies are zero-filled, so the shape never depends on contents', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    const inventory = inventoryReviewStore(readOnlyStore(root));
    expect(Object.keys(inventory.counts.byDecision).sort()).toEqual(
      ['ACCEPT_EVIDENCE', 'MARK_DUPLICATE_CANDIDATE', 'MARK_INSUFFICIENT', 'REQUEST_FOLLOWUP', 'SUPERSEDE'].sort()
    );
    expect(inventory.counts.byDecision.SUPERSEDE).toBe(0);
    expect(inventory.counts.byResultingState.REVIEW_PENDING).toBe(0);
  });

  test('without a resolver every artifact is UNKNOWN and the document says currentness was not resolved', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    const inventory = inventoryReviewStore(readOnlyStore(root));
    expect(inventory.currentnessResolved).toBe(false);
    expect(inventory.counts.byCurrentness).toEqual({ CURRENT: 0, STALE: 0, UNKNOWN: 1 });
    // "Nothing is current" and "nobody asked" must be distinguishable.
    expect(inventory.health.conditions).not.toContain('STALE_HISTORY_PRESENT');
  });

  test('with a resolver, current and stale generations are counted separately', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'old', '2026-09-05T10:00:00Z');
    const nowValue = writeGeneration(writer, 'finding:1', 'new', '2026-09-05T10:00:02Z');
    const inventory = inventoryReviewStore(readOnlyStore(root), {
      currentnessFor: currentnessResolver(currentFor(nowValue)) as never,
    });
    expect(inventory.currentnessResolved).toBe(true);
    expect(inventory.counts.byCurrentness.CURRENT).toBe(1);
    expect(inventory.counts.byCurrentness.STALE).toBe(1);
    expect(inventory.health.classification).toBe('STALE_HISTORY_PRESENT');
    const row = inventory.findings.find((candidate) => candidate.findingId === 'finding:1');
    expect(row).toEqual({ findingId: 'finding:1', generations: 2, currentGenerations: 1, staleGenerations: 1, unknownGenerations: 0 });
  });

  test('SHALLOW counts by name shape and opens nothing', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    let opened = 0;
    const reader = readOnlyStore(root);
    const spy: ReviewStoreScanner = {
      exists: reader.exists,
      readOnly: true,
      entries: () => reader.entries(),
      inspect: (name) => {
        opened += 1;
        return reader.inspect(name);
      },
    };
    const inventory = inventoryReviewStore(spy, { depth: 'SHALLOW' });
    expect(opened).toBe(0);
    expect(inventory.depth).toBe('SHALLOW');
    expect(inventory.counts.canonicalArtifacts).toBe(1);
    expect(inventory.counts.validArtifacts).toBe(0);
  });
});

test.describe('review store inventory — corruption, strangers and residue', () => {
  test('a corrupt generation is not hidden by a valid sibling', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    writeGeneration(writer, 'finding:1', 'b', '2026-09-05T10:00:02Z');
    const names = fs.readdirSync(root).filter((name) => name.startsWith('review.'));
    fs.writeFileSync(path.join(root, names[0] as string), '{"schemaVersion":"nightwatch.review-store.v1"', { mode: 0o600 });
    const inventory = inventoryReviewStore(readOnlyStore(root));
    expect(inventory.counts.validArtifacts).toBe(1);
    expect(inventory.counts.corruptArtifacts).toBe(1);
    expect(inventory.health.classification).toBe('CORRUPTION_PRESENT');
    expect(inventory.corruption).toHaveLength(1);
  });

  test('a corruption row carries the code and the pinned file name, never the validator detail', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    const name = fs.readdirSync(root).find((candidate) => candidate.startsWith('review.')) as string;
    // A planted file whose KEY carries a sentinel. The validator's detail
    // quotes the key list; the projection must not.
    fs.writeFileSync(
      path.join(root, name),
      JSON.stringify({ schemaVersion: 'nightwatch.review-store.v1', 'CUSTOMER_SENTINEL_key': 1 }),
      { mode: 0o600 }
    );
    const inventory = inventoryReviewStore(readOnlyStore(root));
    expect(inventory.counts.corruptArtifacts).toBe(1);
    expect(Object.keys(inventory.corruption[0] as object).sort()).toEqual(['code', 'fileName']);
    expect(JSON.stringify(inventory)).not.toContain('CUSTOMER_SENTINEL');
  });

  test('a stranger is counted, digested, never named, and still there afterwards', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    const strangerName = 'customer-CUSTOMER_SENTINEL-invoice.json';
    fs.writeFileSync(path.join(root, strangerName), '{"anything":1}', { mode: 0o600 });
    const inventory = inventoryReviewStore(readOnlyStore(root));
    expect(inventory.counts.unknownEntries).toBe(1);
    expect(inventory.unknownEntries[0]?.nameDigest).toBe(unknownEntryNameDigest(strangerName));
    expect(inventory.unknownEntries[0]?.kind).toBe('UNKNOWN');
    const rendered = JSON.stringify(inventory);
    expect(rendered).not.toContain('CUSTOMER_SENTINEL');
    expect(rendered).not.toContain('customer-');
    expect(rendered).not.toContain('invoice');
    expect(fs.existsSync(path.join(root, strangerName))).toBe(true);
    expect(inventory.health.conditions).toContain('UNKNOWN_FILES_PRESENT');
  });

  test('a .json name that is not the pinned review shape is a stranger, not a canonical artifact', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    // Passes PrivateArtifactStore's generic FILE_NAME_RE; fails the review
    // grammar. Classification is by the store's own grammar, not by extension.
    fs.writeFileSync(path.join(root, 'review.notactuallyhex.json'), '{}', { mode: 0o600 });
    const inventory = inventoryReviewStore(readOnlyStore(root));
    expect(inventory.counts.canonicalArtifacts).toBe(1);
    expect(inventory.counts.unknownEntries).toBe(1);
  });

  test('an interrupted-publish temporary is residue, reported by its pinned-shape name', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    fs.writeFileSync(path.join(root, `.nightwatch-1234-${'0'.repeat(32)}.tmp`), 'partial', { mode: 0o600 });
    const inventory = inventoryReviewStore(readOnlyStore(root));
    expect(inventory.counts.temporaryArtifacts).toBe(1);
    expect(inventory.temporaries[0]?.name).toMatch(/^\.nightwatch-\d+-[0-9a-f]{32}\.tmp$/);
    expect(inventory.health.classification).toBe('TEMPORARY_RESIDUE_PRESENT');
  });

  test('a symlink in the store is a NON_FILE stranger and is never followed', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    const target = path.join(tempRoot(), 'outside.json');
    fs.writeFileSync(target, '{"secret":"CUSTOMER_SENTINEL"}', { mode: 0o600 });
    fs.symlinkSync(target, path.join(root, 'review.aaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaaaa.json'));
    const inventory = inventoryReviewStore(readOnlyStore(root));
    expect(inventory.counts.nonFileEntries).toBe(1);
    expect(inventory.counts.canonicalArtifacts).toBe(1);
    expect(JSON.stringify(inventory)).not.toContain('CUSTOMER_SENTINEL');
  });
});

test.describe('review store health precedence', () => {
  test('the vocabulary order is the severity order and HEALTHY is last', () => {
    expect(REVIEW_STORE_HEALTH_CONDITIONS[0]).toBe('STORE_UNAVAILABLE');
    expect(REVIEW_STORE_HEALTH_CONDITIONS[REVIEW_STORE_HEALTH_CONDITIONS.length - 1]).toBe('HEALTHY');
    expect(REVIEW_STORE_HEALTH_CONDITIONS.indexOf('STALE_HISTORY_PRESENT')).toBeGreaterThan(
      REVIEW_STORE_HEALTH_CONDITIONS.indexOf('CORRUPTION_PRESENT')
    );
  });

  test('every condition that holds is reported, and the most severe classifies', () => {
    const health = reviewStoreHealth({ exists: true, corruptArtifacts: 1, unknownEntries: 2, temporaryArtifacts: 3, staleArtifacts: 4 });
    expect(health.conditions).toEqual([
      'CORRUPTION_PRESENT',
      'UNKNOWN_FILES_PRESENT',
      'TEMPORARY_RESIDUE_PRESENT',
      'STALE_HISTORY_PRESENT',
    ]);
    expect(health.classification).toBe('CORRUPTION_PRESENT');
  });

  test('ordinary stale history is never classified as corruption', () => {
    const health = reviewStoreHealth({ exists: true, corruptArtifacts: 0, unknownEntries: 0, temporaryArtifacts: 0, staleArtifacts: 9 });
    expect(health.classification).toBe('STALE_HISTORY_PRESENT');
    expect(health.conditions).not.toContain('CORRUPTION_PRESENT');
  });

  test('a clean store is HEALTHY and says only that', () => {
    const health = reviewStoreHealth({ exists: true, corruptArtifacts: 0, unknownEntries: 0, temporaryArtifacts: 0, staleArtifacts: 0 });
    expect(health).toEqual({ conditions: ['HEALTHY'], classification: 'HEALTHY' });
  });

  test('an unavailable store reports nothing else', () => {
    const health = reviewStoreHealth({ exists: false, corruptArtifacts: 5, unknownEntries: 5, temporaryArtifacts: 5, staleArtifacts: 5 });
    expect(health).toEqual({ conditions: ['STORE_UNAVAILABLE'], classification: 'STORE_UNAVAILABLE' });
  });
});

test.describe('review store inventory — determinism', () => {
  test('the same contents produce the same document whatever order the directory returned', () => {
    const { root, writer } = seed();
    for (let index = 0; index < 12; index += 1) {
      writeGeneration(writer, `finding:${index % 4}`, `seed-${index}`, `2026-09-05T10:00:${String(index).padStart(2, '0')}Z`);
    }
    fs.writeFileSync(path.join(root, 'zzz-stranger.json'), '{}', { mode: 0o600 });
    const reader = readOnlyStore(root);
    const forward = inventoryReviewStore(reader);
    const reversed = inventoryReviewStore({
      exists: reader.exists,
      readOnly: true,
      entries: () => [...reader.entries()].reverse(),
      inspect: (name) => reader.inspect(name),
    });
    expect(reversed.inventoryDigest).toBe(forward.inventoryDigest);
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(forward));
  });

  test('no filesystem timestamp reaches the document', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    const first = inventoryReviewStore(readOnlyStore(root));
    const name = fs.readdirSync(root).find((candidate) => candidate.startsWith('review.')) as string;
    const future = new Date(Date.now() + 86_400_000);
    fs.utimesSync(path.join(root, name), future, future);
    const second = inventoryReviewStore(readOnlyStore(root));
    expect(second.inventoryDigest).toBe(first.inventoryDigest);
  });

  test('rows are bounded while counts stay global and exact', () => {
    const { root, writer } = seed();
    for (let index = 0; index < 40; index += 1) {
      fs.writeFileSync(path.join(root, `stranger-${index}.json`), '{}', { mode: 0o600 });
    }
    const inventory = inventoryReviewStore(readOnlyStore(root), { rowLimit: 5 });
    expect(inventory.counts.unknownEntries).toBe(40);
    expect(inventory.unknownEntries).toHaveLength(5);
    expect(inventory.unknownEntriesPage).toEqual({ offset: 0, limit: 5, total: 40, truncated: true });
  });

  test('a caller cannot raise the row limit past the hard bound', () => {
    const { root } = seed();
    const inventory = inventoryReviewStore(readOnlyStore(root), { rowLimit: 100_000 });
    expect(inventory.findingsPage.limit).toBe(REVIEW_INVENTORY_MAX_ROWS);
  });
});

test.describe('review history', () => {
  test('generations are ordered newest first by record, and the order is total', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    writeGeneration(writer, 'finding:1', 'b', '2026-09-05T10:00:00Z', 'REQUEST_FOLLOWUP');
    const nowValue = writeGeneration(writer, 'finding:1', 'c', '2026-09-05T10:00:05Z', 'MARK_INSUFFICIENT');
    const reader = readOnlyStore(root);
    const history = reviewHistoryFor(reader, 'finding:1', currentFor(nowValue));
    expect(history.generations).toHaveLength(3);
    expect(history.generations[0]?.storedAt).toBe('2026-09-05T10:00:05Z');
    // The two same-second generations are broken by identity, not by
    // directory order, so the order is stable across reads.
    const again = reviewHistoryFor(reader, 'finding:1', currentFor(nowValue));
    expect(JSON.stringify(again)).toBe(JSON.stringify(history));
    const identities = history.generations.slice(1).map((row) => row.reviewIdentity);
    expect([...identities].sort()).toEqual(identities);
  });

  test('the current generation is proven, not assumed to be the newest', () => {
    const { root, writer } = seed();
    const olderValue = writeGeneration(writer, 'finding:1', 'older', '2026-09-05T10:00:00Z');
    writeGeneration(writer, 'finding:1', 'newer', '2026-09-05T10:00:09Z');
    // The artifacts have moved BACK to what the older review bound to. The
    // newest generation is not the one in force.
    const history = reviewHistoryFor(readOnlyStore(root), 'finding:1', currentFor(olderValue));
    expect(history.state).toBe('CURRENT');
    expect(history.generations[0]?.currentness).toBe('STALE');
    expect(history.generations[1]?.currentness).toBe('CURRENT');
    expect(history.currentGeneration).toBe(history.generations[1]?.reviewIdentity);
    expect(history.staleGenerationCount).toBe(1);
  });

  test('a stale generation is preserved as evidence, with its reason', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'old', '2026-09-05T10:00:00Z');
    const regenerated = artifacts('finding:1', 'regenerated');
    const history = reviewHistoryFor(readOnlyStore(root), 'finding:1', currentFor(regenerated));
    expect(history.state).toBe('STALE');
    expect(history.currentGeneration).toBeNull();
    expect(history.generations).toHaveLength(1);
    expect(history.generations[0]?.currentness).toBe('STALE');
    expect(history.generations[0]?.staleReason).toMatch(/^FINDING_REVIEW_STALE/);
  });

  test('a generation reports no semantic identity, and says why rather than borrowing one', () => {
    const { root, writer } = seed();
    const value = writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    const history = reviewHistoryFor(readOnlyStore(root), 'finding:1', currentFor(value), {
      currentArtifactIdentity: { expectationId: 'expect:current', semanticContractId: 'contract:current' },
    });
    expect(history.generations[0]?.expectationId).toBeNull();
    expect(history.generations[0]?.semanticContractId).toBeNull();
    expect(history.generations[0]?.identityAbsenceReason).toBe(REVIEW_HISTORY_IDENTITY_ABSENCE);
    // The CURRENT artifact's identities are true of the current artifact, and
    // are reported where that is what they mean.
    expect(history.currentArtifactIdentity).toEqual({ expectationId: 'expect:current', semanticContractId: 'contract:current' });
  });

  test('a decision change across generations is reported as a local historical fact', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z', 'ACCEPT_EVIDENCE');
    const nowValue = writeGeneration(writer, 'finding:1', 'b', '2026-09-05T10:00:02Z', 'MARK_INSUFFICIENT');
    const history = reviewHistoryFor(readOnlyStore(root), 'finding:1', currentFor(nowValue));
    expect(history.decisionChangedAcrossGenerations).toBe(true);
    expect(history.organizationalAuthority).toBe('NONE_LOCAL_REVIEW_ONLY');
  });

  test('a large history pages, with explicit bounds and a global total', () => {
    const { root, writer } = seed();
    let latest = artifacts('finding:1', 'seed-0');
    for (let index = 0; index < 60; index += 1) {
      latest = writeGeneration(
        writer,
        'finding:1',
        `seed-${index}`,
        `2026-09-05T${String(10 + Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}:00Z`
      );
    }
    const reader = readOnlyStore(root);
    const first = reviewHistoryFor(reader, 'finding:1', currentFor(latest));
    expect(first.page.total).toBe(60);
    expect(first.generations).toHaveLength(REVIEW_HISTORY_DEFAULT_LIMIT);
    expect(first.page.truncated).toBe(true);
    const second = reviewHistoryFor(reader, 'finding:1', currentFor(latest), { offset: 50, limit: 50 });
    expect(second.generations).toHaveLength(10);
    expect(second.page.truncated).toBe(false);
    // No generation was lost between the pages.
    const seen = new Set([...first.generations, ...second.generations].map((row) => row.reviewIdentity));
    expect(seen.size).toBe(60);
    // And nothing was deleted to make paging work.
    expect(fs.readdirSync(root).filter((name) => name.startsWith('review.'))).toHaveLength(60);
  });

  test('a finding with no stored review has an empty, honest history', () => {
    const { root, writer } = seed();
    writeGeneration(writer, 'finding:1', 'a', '2026-09-05T10:00:00Z');
    const history = reviewHistoryFor(readOnlyStore(root), 'finding:absent', currentFor(artifacts('finding:absent', 'x')));
    expect(history.state).toBe('NO_REVIEW');
    expect(history.generations).toEqual([]);
    expect(history.currentGeneration).toBeNull();
    expect(history.decisionChangedAcrossGenerations).toBe(false);
  });

  test('the generation comparator is a strict total order on its keys', () => {
    const make = (storedAt: string, reviewedAt: string, identity: string): never =>
      ({ storedAt, reviewIdentity: identity, receipt: { reviewedAt } }) as never;
    expect(compareReviewGenerations(make('b', 'a', 'a'), make('a', 'a', 'a'))).toBeLessThan(0);
    expect(compareReviewGenerations(make('a', 'b', 'a'), make('a', 'a', 'a'))).toBeLessThan(0);
    expect(compareReviewGenerations(make('a', 'a', 'a'), make('a', 'a', 'b'))).toBeLessThan(0);
    expect(compareReviewGenerations(make('a', 'a', 'a'), make('a', 'a', 'a'))).toBe(0);
  });
});
