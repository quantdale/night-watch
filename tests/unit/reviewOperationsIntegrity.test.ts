// ---------------------------------------------------------------------------
// Review-operations integrity: determinism, order independence, concurrency,
// a broad corruption corpus, and the privacy red team.
//
// The inventory is a document an operator will act on and may paste into a
// ticket, so three properties matter more than any count it reports:
//
//   IT SAYS THE SAME THING TWICE. Same store content, same document — across
//   processes, timezones, locales and filesystem enumeration order. A digest
//   that moved because the directory was read in a different order would make
//   every comparison between two runs meaningless.
//
//   IT NEVER LIES ABOUT CORRUPTION. Thirteen corruption classes, each planted
//   deliberately, each counted. A valid sibling never hides a broken one.
//
//   IT LEAKS NOTHING. Ten sentinel classes planted across every value the
//   store can be made to hold — including the one string in the store that
//   Nightwatch did not choose, an unrecognized filename.
// ---------------------------------------------------------------------------

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { ReviewStore, inventoryReviewStore, reviewHistoryFor } from '../../src/core/reviewStore';
import { ControlCenterReviewStoreAuthority } from '../../src/controlCenter/authorities/reviewStoreAuthority';
import { projectReviewStoreInventory } from '../../src/controlCenter/adapters/reviewStoreAdapter';
import { currentReviewArtifacts, reviewBindingFor } from '../../src/controlCenter/authorities/reviewBinding';
import { reviewerCorpus, type CorpusFinding } from '../helpers/reviewerCorpus';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(REPO_ROOT, 'bin', 'nightwatch-review.mjs');
const CAMPAIGN = 'campaign/c1';

function tempDir(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.chmodSync(root, 0o700);
  return root;
}

function seeded(dossiers: readonly CorpusFinding[], root = tempDir('nw-integrity-store-')): string {
  const writer = new ReviewStore({ root });
  for (const [index, dossier] of dossiers.entries()) {
    writer.putDecision({
      binding: reviewBindingFor(dossier, { campaignId: CAMPAIGN }),
      decision: index % 3 === 0 ? 'ACCEPT_EVIDENCE' : index % 3 === 1 ? 'REQUEST_FOLLOWUP' : 'MARK_INSUFFICIENT',
      reviewedAt: `2026-09-05T10:${String(Math.floor(index / 60) % 60).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}Z`,
      storedAt: `2026-09-05T10:${String(Math.floor(index / 60) % 60).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}Z`,
      rationale: 'local triage',
    });
  }
  return root;
}

function readOnly(root: string): ReviewStore {
  return new ReviewStore({ root, createIfMissing: false });
}

/** Run the CLI in a FRESH process with an injected environment. */
function cliJson(root: string, env: Record<string, string> = {}): { readonly status: number; readonly stdout: string } {
  const result = spawnSync(process.execPath, [CLI, 'inventory', '--json'], {
    encoding: 'utf8',
    timeout: 120_000,
    env: {
      ...process.env,
      NIGHTWATCH_REVIEW_STORE_DIR: root,
      NIGHTWATCH_PRIVATE_STATE_DIR: tempDir('nw-integrity-findings-'),
      ...env,
    },
  });
  return { status: result.status ?? -1, stdout: result.stdout ?? '' };
}

test.describe('determinism across processes, clocks and locales', () => {
  test.setTimeout(300_000);

  test('two fresh processes produce the same inventory digest', () => {
    const root = seeded(reviewerCorpus(24));
    const first = JSON.parse(cliJson(root).stdout) as { inventory: { inventoryDigest: string } };
    const second = JSON.parse(cliJson(root).stdout) as { inventory: { inventoryDigest: string } };
    expect(second.inventory.inventoryDigest).toBe(first.inventory.inventoryDigest);
  });

  test('timezone and locale do not move the document', () => {
    const root = seeded(reviewerCorpus(16));
    const baseline = cliJson(root).stdout;
    for (const env of [
      { TZ: 'UTC', LANG: 'C', LC_ALL: 'C' },
      { TZ: 'Pacific/Kiritimati', LANG: 'C', LC_ALL: 'C' },
      { TZ: 'Pacific/Niue', LANG: 'tr_TR.UTF-8', LC_ALL: 'tr_TR.UTF-8' },
      { TZ: 'Asia/Kolkata', LANG: 'de_DE.UTF-8', LC_ALL: 'de_DE.UTF-8' },
    ]) {
      // Turkish is included on purpose: its dotless-i casing rule is the
      // classic way a locale silently changes a comparison.
      expect(cliJson(root, env).stdout, JSON.stringify(env)).toBe(baseline);
    }
  });

  test('filesystem enumeration order does not move the document', () => {
    const root = seeded(reviewerCorpus(30));
    fs.writeFileSync(path.join(root, 'a-stranger.json'), '{}', { mode: 0o600 });
    fs.writeFileSync(path.join(root, 'z-stranger.json'), '{}', { mode: 0o600 });
    const reader = readOnly(root);
    const forward = JSON.stringify(inventoryReviewStore(reader));
    const entries = [...reader.entries()];
    for (const permutation of [
      [...entries].reverse(),
      [...entries].sort((left, right) => right.bytes - left.bytes || left.name.localeCompare(right.name)),
      [...entries].sort((left, right) => (left.name.length - right.name.length) || left.name.localeCompare(right.name)),
    ]) {
      const shuffled = inventoryReviewStore({
        exists: reader.exists,
        readOnly: true,
        entries: () => permutation,
        inspect: (name) => reader.inspect(name),
      });
      expect(JSON.stringify(shuffled)).toBe(forward);
    }
  });

  test('the wire payload is deterministic too, not just the core document', () => {
    // Tallies cross as a sorted list rather than a map for this reason: a
    // map's key order is a serialization detail.
    const corpus = reviewerCorpus(20);
    const root = seeded(corpus);
    const context = { dossiers: corpus, campaignId: CAMPAIGN };
    const first = JSON.stringify(projectReviewStoreInventory(new ControlCenterReviewStoreAuthority({ root }).inventory({ context })));
    const second = JSON.stringify(projectReviewStoreInventory(new ControlCenterReviewStoreAuthority({ root }).inventory({ context })));
    expect(second).toBe(first);
  });

  test('history is byte-identical across repeated reads', () => {
    const corpus = reviewerCorpus(4);
    const dossier = corpus[0] as CorpusFinding;
    const root = tempDir('nw-integrity-store-');
    const writer = new ReviewStore({ root });
    for (let index = 0; index < 8; index += 1) {
      writer.putDecision({
        binding: reviewBindingFor({ ...dossier, contentDigest: `${dossier.contentDigest}-${index}` } as CorpusFinding, { campaignId: CAMPAIGN }),
        decision: 'ACCEPT_EVIDENCE',
        // Deliberately the SAME second for every generation, so the identity
        // tiebreak is what makes the order total rather than the timestamp.
        reviewedAt: '2026-09-05T10:00:00Z',
        storedAt: '2026-09-05T10:00:00Z',
        rationale: 'local triage',
      });
    }
    const reader = readOnly(root);
    const current = currentReviewArtifacts(dossier, { campaignId: CAMPAIGN });
    const first = JSON.stringify(reviewHistoryFor(reader, dossier.candidateId, current));
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(JSON.stringify(reviewHistoryFor(readOnly(root), dossier.candidateId, current))).toBe(first);
    }
  });
});

test.describe('concurrency', () => {
  test.setTimeout(600_000);

  test('an inventory taken while distinct reviews are written is a coherent snapshot', () => {
    const corpus = reviewerCorpus(60);
    const root = tempDir('nw-integrity-store-');
    const writer = new ReviewStore({ root });
    const documents: string[] = [];
    for (const [index, dossier] of corpus.entries()) {
      writer.putDecision({
        binding: reviewBindingFor(dossier, { campaignId: CAMPAIGN }),
        decision: 'ACCEPT_EVIDENCE',
        reviewedAt: `2026-09-05T10:00:${String(index % 60).padStart(2, '0')}Z`,
        storedAt: `2026-09-05T10:00:${String(index % 60).padStart(2, '0')}Z`,
        rationale: 'local triage',
      });
      // Interleaved on purpose: each inventory sees a different, valid store.
      if (index % 7 === 0) documents.push(JSON.stringify(inventoryReviewStore(readOnly(root))));
    }
    expect(documents.length).toBeGreaterThan(5);
    for (const document of documents) {
      const parsed = JSON.parse(document) as {
        counts: { canonicalArtifacts: number; validArtifacts: number; corruptArtifacts: number; unreadableArtifacts: number };
        health: { classification: string };
      };
      // Never a partial or malformed review: an interleaved reader sees
      // published artifacts or nothing, because link(2) publishes atomically.
      expect(parsed.counts.corruptArtifacts).toBe(0);
      expect(parsed.counts.unreadableArtifacts).toBe(0);
      expect(parsed.counts.validArtifacts).toBe(parsed.counts.canonicalArtifacts);
      expect(parsed.health.classification).toBe('HEALTHY');
    }
    // Counts increase monotonically: a snapshot never loses a published review.
    const counts = documents.map((document) => (JSON.parse(document) as { counts: { validArtifacts: number } }).counts.validArtifacts);
    expect([...counts].sort((left, right) => left - right)).toEqual(counts);
  });

  test('an inventory taken while same-binding writers race sees exactly one winner', () => {
    const corpus = reviewerCorpus(2);
    const dossier = corpus[0] as CorpusFinding;
    for (const writers of [2, 4, 8, 16]) {
      const root = tempDir('nw-integrity-store-');
      const binding = reviewBindingFor(dossier, { campaignId: CAMPAIGN });
      const outcomes = Array.from({ length: writers }, (_, index) => {
        try {
          new ReviewStore({ root }).putDecision({
            binding,
            decision: index % 2 === 0 ? 'ACCEPT_EVIDENCE' : 'MARK_INSUFFICIENT',
            reviewedAt: '2026-09-05T10:00:00Z',
            storedAt: '2026-09-05T10:00:00Z',
            rationale: 'racing',
          });
          return 'WON';
        } catch (error) {
          return (error as { code?: string }).code ?? 'OTHER';
        }
      });
      expect(outcomes.filter((outcome) => outcome === 'WON'), `writers=${writers}`).toHaveLength(1);
      const inventory = inventoryReviewStore(readOnly(root));
      expect(inventory.counts.validArtifacts, `writers=${writers}`).toBe(1);
      expect(inventory.counts.uniqueFindings).toBe(1);
      expect(inventory.health.classification).toBe('HEALTHY');
    }
  });

  test('an inventory taken during an interrupted publish reports residue and removes none', () => {
    const root = seeded(reviewerCorpus(5));
    const temporary = path.join(root, `.nightwatch-${process.pid}-${'b'.repeat(32)}.tmp`);
    fs.writeFileSync(temporary, '{"partial":', { mode: 0o600 });
    const inventory = inventoryReviewStore(readOnly(root));
    expect(inventory.counts.temporaryArtifacts).toBe(1);
    expect(inventory.counts.corruptArtifacts).toBe(0);
    expect(inventory.health.classification).toBe('TEMPORARY_RESIDUE_PRESENT');
    // Recovery is a separate, explicit owner action. Reading did not perform it.
    expect(fs.existsSync(temporary)).toBe(true);
  });

  test('a history read during a publish for the same finding never sees a partial generation', () => {
    const corpus = reviewerCorpus(3);
    const dossier = corpus[0] as CorpusFinding;
    const root = tempDir('nw-integrity-store-');
    const writer = new ReviewStore({ root });
    const current = currentReviewArtifacts(dossier, { campaignId: CAMPAIGN });
    for (let index = 0; index < 20; index += 1) {
      writer.putDecision({
        binding: reviewBindingFor({ ...dossier, contentDigest: `${dossier.contentDigest}-${index}` } as CorpusFinding, { campaignId: CAMPAIGN }),
        decision: 'ACCEPT_EVIDENCE',
        reviewedAt: `2026-09-05T10:00:${String(index).padStart(2, '0')}Z`,
        storedAt: `2026-09-05T10:00:${String(index).padStart(2, '0')}Z`,
        rationale: 'local triage',
      });
      const history = reviewHistoryFor(readOnly(root), dossier.candidateId, current);
      expect(history.corruption).toEqual([]);
      expect(history.generations.length).toBe(Math.min(index + 1, 50));
      for (const generation of history.generations) {
        expect(generation.decision).toBe('ACCEPT_EVIDENCE');
        expect(generation.reviewIdentity).toMatch(/^[0-9a-f]{24}$/);
      }
    }
  });
});

test.describe('corruption corpus', () => {
  test.setTimeout(300_000);

  /** Plant one corruption class into a store that already holds a valid sibling. */
  function planted(mutate: (root: string, name: string) => void): ReturnType<typeof inventoryReviewStore> {
    const corpus = reviewerCorpus(3);
    const root = seeded(corpus);
    const names = fs.readdirSync(root).filter((name) => name.startsWith('review.')).sort();
    mutate(root, names[0] as string);
    return inventoryReviewStore(readOnly(root));
  }

  const rewrite = (value: unknown) => (root: string, name: string) =>
    fs.writeFileSync(path.join(root, name), typeof value === 'string' ? value : JSON.stringify(value), { mode: 0o600 });

  const patch = (change: (parsed: Record<string, unknown>) => void) => (root: string, name: string) => {
    const parsed = JSON.parse(fs.readFileSync(path.join(root, name), 'utf8')) as Record<string, unknown>;
    change(parsed);
    fs.writeFileSync(path.join(root, name), JSON.stringify(parsed), { mode: 0o600 });
  };

  const CLASSES: readonly { readonly name: string; readonly mutate: (root: string, name: string) => void }[] = [
    { name: 'truncated JSON', mutate: rewrite('{"schemaVersion":"nightwatch.review-store.v1"') },
    { name: 'empty file', mutate: rewrite('') },
    { name: 'wrong schema version', mutate: patch((parsed) => { parsed.schemaVersion = 'nightwatch.review-store.v2'; }) },
    { name: 'unexpected top-level shape', mutate: rewrite([1, 2, 3]) },
    { name: 'tampered receipt digest', mutate: patch((parsed) => { (parsed.receipt as Record<string, unknown>).reviewId = `review:${'0'.repeat(24)}`; }) },
    { name: 'tampered review identity', mutate: patch((parsed) => { parsed.reviewIdentity = 'f'.repeat(24); }) },
    { name: 'tampered finding identity', mutate: patch((parsed) => { parsed.findingId = 'someone-elses-finding'; }) },
    { name: 'authority downgrade', mutate: patch((parsed) => { (parsed.receipt as Record<string, unknown>).organizationalAuthority = 'LESLIE_GENUINE'; }) },
    { name: 'non-equivalence list stripped', mutate: patch((parsed) => { (parsed.receipt as Record<string, unknown>).notEquivalentTo = []; }) },
    { name: 'non-terminal record state', mutate: patch((parsed) => { (parsed.record as Record<string, unknown>).state = 'REVIEW_PENDING'; }) },
    { name: 'record and receipt disagree', mutate: patch((parsed) => { (parsed.record as Record<string, unknown>).state = 'SUPERSEDED'; }) },
    { name: 'invalid timestamp', mutate: patch((parsed) => { parsed.storedAt = 'yesterday'; }) },
    { name: 'invalid source sha in binding', mutate: patch((parsed) => { ((parsed.receipt as Record<string, unknown>).binding as Record<string, unknown>).sourceSha = 'not-a-sha'; }) },
    { name: 'status downgraded', mutate: patch((parsed) => { parsed.status = 'INCOMPLETE'; }) },
    { name: 'extra envelope key', mutate: patch((parsed) => { parsed.extra = true; }) },
  ];

  for (const corruption of CLASSES) {
    test(`${corruption.name} is counted, and the valid siblings survive`, () => {
      const inventory = planted(corruption.mutate);
      expect(inventory.counts.corruptArtifacts, corruption.name).toBe(1);
      // The valid siblings are NOT hidden by the broken one, and the broken
      // one is not hidden by them.
      expect(inventory.counts.validArtifacts, corruption.name).toBe(2);
      expect(inventory.counts.canonicalArtifacts).toBe(3);
      expect(inventory.health.classification).toBe('CORRUPTION_PRESENT');
      expect(inventory.corruption).toHaveLength(1);
      expect(inventory.corruption[0]?.code).toMatch(/^REVIEW_STORE_/);
    });
  }

  test('a renamed canonical file is corrupt, not authoritative', () => {
    // Identity is recomputed on read and compared to the NAME, so a file
    // moved into another generation's slot cannot become that generation.
    const corpus = reviewerCorpus(2);
    const root = seeded(corpus);
    const names = fs.readdirSync(root).filter((name) => name.startsWith('review.')).sort();
    const forged = `review.${'a'.repeat(12)}.${'b'.repeat(24)}.json`;
    fs.renameSync(path.join(root, names[0] as string), path.join(root, forged));
    const inventory = inventoryReviewStore(readOnly(root));
    expect(inventory.counts.corruptArtifacts).toBe(1);
    expect(inventory.corruption[0]?.code).toBe('REVIEW_STORE_IDENTITY_MISMATCH');
  });

  test('a directory wearing a canonical name is a stranger, never opened', () => {
    const root = seeded(reviewerCorpus(2));
    fs.mkdirSync(path.join(root, `review.${'c'.repeat(12)}.${'d'.repeat(24)}.json`), { mode: 0o700 });
    const inventory = inventoryReviewStore(readOnly(root));
    expect(inventory.counts.nonFileEntries).toBe(1);
    expect(inventory.counts.canonicalArtifacts).toBe(2);
  });

  test('the whole corpus can coexist, and every class is still counted', () => {
    const corpus = reviewerCorpus(CLASSES.length + 2);
    const root = seeded(corpus);
    const names = fs.readdirSync(root).filter((name) => name.startsWith('review.')).sort();
    CLASSES.forEach((corruption, index) => corruption.mutate(root, names[index] as string));
    const inventory = inventoryReviewStore(readOnly(root));
    expect(inventory.counts.corruptArtifacts).toBe(CLASSES.length);
    expect(inventory.counts.validArtifacts).toBe(2);
    expect(inventory.corruption).toHaveLength(CLASSES.length);
  });
});

test.describe('privacy red team', () => {
  test.setTimeout(300_000);

  /** Ten planted value classes, one per row. */
  const SENTINELS: readonly [string, string][] = [
    ['email', 'bob@example.com'],
    ['bearer token', 'Bearer abcdefghijklmnop'],
    ['jwt', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signaturevalue'],
    ['aws key', 'AKIAIOSFODNN7EXAMPLE'],
    ['private key marker', '-----BEGIN RSA PRIVATE KEY-----'],
    ['customer sentinel', 'CUSTOMER_SENTINEL'],
    ['account sentinel', 'ACCOUNT_SENTINEL'],
    ['cost sentinel', 'COST_SENTINEL'],
    ['token sentinel', 'TOKEN_SENTINEL'],
    ['email sentinel', 'EMAIL_SENTINEL'],
  ];

  test('a planted value in an unrecognized filename never crosses any surface', () => {
    // The one string in the store that Nightwatch did not choose.
    for (const [label, value] of SENTINELS) {
      const root = seeded(reviewerCorpus(2));
      // Filesystem-safe rendering of the planted value; the sentinel token
      // itself survives in every case that matters.
      const safeName = `stranger-${value.replace(/[^A-Za-z0-9._-]/g, '_')}.json`;
      fs.writeFileSync(path.join(root, safeName), '{"x":1}', { mode: 0o600 });
      const core = JSON.stringify(inventoryReviewStore(readOnly(root)));
      const wire = JSON.stringify(projectReviewStoreInventory(new ControlCenterReviewStoreAuthority({ root }).inventory()));
      const cli = cliJson(root).stdout;
      const text = execFileSync(process.execPath, [CLI, 'inventory'], {
        encoding: 'utf8',
        timeout: 120_000,
        env: { ...process.env, NIGHTWATCH_REVIEW_STORE_DIR: root, NIGHTWATCH_PRIVATE_STATE_DIR: tempDir('nw-rt-findings-') },
      });
      for (const [surface, payload] of [['core', core], ['wire', wire], ['cli json', cli], ['cli text', text]] as const) {
        const needle = value.replace(/[^A-Za-z0-9._-]/g, '_');
        expect(payload, `${label} via ${surface}`).not.toContain(needle);
        expect(payload, `${label} via ${surface}`).not.toContain(value);
      }
      // And the file is still there.
      expect(fs.existsSync(path.join(root, safeName)), label).toBe(true);
    }
  });

  test('a planted value inside a corrupt artifact never reaches a corruption row', () => {
    for (const [label, value] of SENTINELS) {
      const root = seeded(reviewerCorpus(2));
      const name = fs.readdirSync(root).find((candidate) => candidate.startsWith('review.')) as string;
      // Every place a validator detail could quote: an unknown key, an
      // unsupported schema string, and a bad status value.
      fs.writeFileSync(
        path.join(root, name),
        JSON.stringify({ schemaVersion: value, [value]: value, status: value }),
        { mode: 0o600 }
      );
      const core = JSON.stringify(inventoryReviewStore(readOnly(root)));
      const wire = JSON.stringify(projectReviewStoreInventory(new ControlCenterReviewStoreAuthority({ root }).inventory()));
      expect(core, `${label} core`).not.toContain(value);
      expect(wire, `${label} wire`).not.toContain(value);
    }
  });

  test('the lifecycle refuses a planted rationale before it can ever be stored', () => {
    // Defence in depth in the right order: the value never becomes an
    // artifact, so no read surface has to be careful about it.
    const dossier = reviewerCorpus(1)[0] as CorpusFinding;
    for (const [label, value] of SENTINELS) {
      const root = tempDir('nw-rt-store-');
      expect(() =>
        new ReviewStore({ root }).putDecision({
          binding: reviewBindingFor(dossier, { campaignId: CAMPAIGN }),
          decision: 'ACCEPT_EVIDENCE',
          reviewedAt: '2026-09-05T10:00:00Z',
          storedAt: '2026-09-05T10:00:00Z',
          rationale: `local triage ${value}`,
        }), label
      ).toThrow(/FINDING_REVIEW_INVALID_RATIONALE/);
      expect(fs.readdirSync(root).filter((name) => name.startsWith('review.')), label).toHaveLength(0);
    }
  });

  test('an error path names the field, never the value', () => {
    const root = seeded(reviewerCorpus(2));
    const name = fs.readdirSync(root).find((candidate) => candidate.startsWith('review.')) as string;
    fs.writeFileSync(path.join(root, name), JSON.stringify({ schemaVersion: 'CUSTOMER_SENTINEL-v9' }), { mode: 0o600 });
    let message = '';
    try {
      projectReviewStoreInventory({ ...inventoryReviewStore(readOnly(root)), inventoryDigest: 'CUSTOMER_SENTINEL' } as never);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('REVIEW_STORE_PROJECTION_INVALID');
    expect(message).not.toContain('CUSTOMER_SENTINEL');
  });

  test('review filenames are digests, and stay digests', () => {
    // The store's own naming is the reason most of the above is easy. If a
    // filename ever carried a caller-supplied value, every surface above
    // would need a screen it currently does not need.
    const corpus = reviewerCorpus(6);
    const root = seeded(corpus);
    for (const name of fs.readdirSync(root)) {
      expect(name, name).toMatch(/^review\.[0-9a-f]{12}\.[0-9a-f]{24}\.json$/);
      for (const dossier of corpus) expect(name).not.toContain(dossier.candidateId);
    }
  });
});
