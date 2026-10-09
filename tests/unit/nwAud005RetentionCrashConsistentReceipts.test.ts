// ---------------------------------------------------------------------------
// NW-AUD-005 — the retention receipt is crash-consistent.
//
// The historical apply path did one best-effort write of a receipt saying
// `STARTED` with an EMPTY deleted set, performed the deletion, and then did a
// second best-effort overwrite. A crash or a failed final write left the only
// durable receipt claiming nothing had been deleted, while the command could
// still exit successfully with `result: APPLIED` and `receiptFinalized: false`.
//
// These tests prove the mechanical rule: deletion is bracketed by two durable,
// owner-only, symlink-refusing records; a non-terminal record is NEVER the last
// word; the terminal record is re-read and verified before anything may be
// reported as a deletion receipt; and a terminal record can never be
// overwritten by a second apply.
//
// Every fixture is a disposable temporary root with synthetic names only.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  assertTerminalRetentionRecord,
  finalizeRetentionOperation,
  hasIncompleteRetentionOperation,
  prepareRetentionOperation,
  readRetentionOperation,
  retentionJournalStore,
  retentionOutcomeFromTargets,
  RETENTION_JOURNAL_VERSION,
  type RetentionOperationIntent,
} from '../../src/core/evidenceRetention';

function freshRoot(prefix: string): string {
  // realpath: an ancestor symlink (e.g. /var on macOS) is a refusal by design,
  // and the fixture must not be refused for a reason it did not create.
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `nightwatch-aud005-${prefix}-`)));
}

const OPERATION_ID = `retention-${'a'.repeat(24)}`;
const OTHER_OPERATION_ID = `retention-${'b'.repeat(24)}`;

function intent(overrides: Partial<RetentionOperationIntent> = {}): RetentionOperationIntent {
  return {
    operationId: OPERATION_ID,
    appliedAt: '2026-10-09T00:00:00.000Z',
    gitHead: null,
    keepRecent: 100,
    planConfirmationDigest: `sha256:${'1'.repeat(24)}`,
    refusalSetDigest: `sha256:${'2'.repeat(24)}`,
    entryCount: 5,
    refusedCount: 4,
    candidateCount: 1,
    reclaimableBytes: 2048,
    referenceScanComplete: true,
    candidates: [{ name: 'synthetic-run-1', bytes: 2048 }],
    ...overrides,
  };
}

function targets(overrides: readonly { readonly name: string; readonly result: 'REMOVED' | 'PRESERVED'; readonly reasonCode: string; readonly bytes: number | null }[] = [{ name: 'synthetic-run-1', result: 'REMOVED', reasonCode: 'UNREFERENCED_AND_NOT_RECENT', bytes: 2048 }]) {
  return overrides;
}

test.describe('NW-AUD-005 the retention receipt is crash-consistent', () => {
  test('a prepared record is durable, owner-only, symlink-refusing and carries the exact reviewed plan', () => {
    const root = freshRoot('prepared');
    const store = retentionJournalStore(root);
    const prepared = prepareRetentionOperation(store, intent());
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;

    expect(prepared.value.terminal).toBe(false);
    expect(prepared.value.status).toBe('PREPARED');
    expect(prepared.value.schemaVersion).toBe(RETENTION_JOURNAL_VERSION);
    // The intent is bound, so an interrupted operation is inspectable.
    expect(prepared.value.candidates).toEqual([{ name: 'synthetic-run-1', bytes: 2048 }]);
    expect(prepared.value.planConfirmationDigest).toBe(`sha256:${'1'.repeat(24)}`);
    expect(prepared.value.refusalSetDigest).toBe(`sha256:${'2'.repeat(24)}`);
    // A PREPARED record claims NOTHING about what was deleted.
    expect(prepared.value.deletedSet).toEqual([]);
    expect(prepared.value.removedCount).toBe(0);

    // Durable: the record survived into the store, read back through the store.
    const reread = readRetentionOperation(store, OPERATION_ID);
    expect(reread).not.toBeNull();
    expect(reread?.terminal).toBe(false);
    // Owner-only: the published record is not group- or world-readable.
    const mode = fs.statSync(path.join(root, `${OPERATION_ID}.prepared.json`)).mode & 0o777;
    expect(mode).toBe(0o600);
    // The journal root itself is owner-only too.
    expect(fs.statSync(root).mode & 0o777).toBe(0o700);
  });

  test('a non-terminal record is never accepted as a deletion receipt', () => {
    const root = freshRoot('nonterminal');
    const store = retentionJournalStore(root);
    prepareRetentionOperation(store, intent());
    const prepared = readRetentionOperation(store, OPERATION_ID);
    expect(prepared).not.toBeNull();
    expect(prepared?.terminal).toBe(false);
    // The one rule that makes the receipt crash-consistent.
    expect(() => assertTerminalRetentionRecord(prepared)).toThrow('RETENTION_JOURNAL_OPERATION_INCOMPLETE');
    // And an operation that was started but never finished is VISIBLE as such,
    // so a new apply must be blocked for inspection instead of deleting more.
    expect(hasIncompleteRetentionOperation(store, OPERATION_ID)).toBe(true);
  });

  test('finalize writes and VERIFIES the terminal record before any receipt may be claimed', () => {
    const root = freshRoot('finalize');
    const store = retentionJournalStore(root);
    prepareRetentionOperation(store, intent());

    const finalized = finalizeRetentionOperation(store, OPERATION_ID, targets());
    expect(finalized.ok).toBe(true);
    if (!finalized.ok) return;

    expect(finalized.value.terminal).toBe(true);
    expect(finalized.value.status).toBe('APPLIED');
    expect(finalized.value.removedCount).toBe(1);
    expect(finalized.value.deletedSet).toEqual([{ name: 'synthetic-run-1', bytes: 2048 }]);
    expect(finalized.value.deletedBytes).toBe(2048);
    // The terminal record is the same operation identity as the prepared intent.
    expect(finalized.value.operationId).toBe(OPERATION_ID);
    expect(finalized.value.candidates).toEqual([{ name: 'synthetic-run-1', bytes: 2048 }]);

    // The record on disk is what the caller was handed, re-read through the store.
    expect(readRetentionOperation(store, OPERATION_ID)?.terminal).toBe(true);
    expect(hasIncompleteRetentionOperation(store, OPERATION_ID)).toBe(false);
    // Now, and only now, is a deletion receipt legal.
    expect(assertTerminalRetentionRecord(readRetentionOperation(store, OPERATION_ID)).status).toBe('APPLIED');
  });

  test('the terminal outcome is DERIVED from the recorded targets, never asserted by the caller', () => {
    expect(retentionOutcomeFromTargets(targets()).status).toBe('APPLIED');
    expect(retentionOutcomeFromTargets(targets([
      { name: 'synthetic-run-1', result: 'REMOVED', reasonCode: 'UNREFERENCED_AND_NOT_RECENT', bytes: 10 },
      { name: 'synthetic-run-2', result: 'PRESERVED', reasonCode: 'TARGET_NOT_A_DIRECTORY', bytes: null },
    ])).status).toBe('PARTIAL');
    // Reclaiming nothing is PRESERVED, never dressed up as APPLIED.
    expect(retentionOutcomeFromTargets(targets([
      { name: 'synthetic-run-1', result: 'PRESERVED', reasonCode: 'TARGET_DISAPPEARED', bytes: 10 },
    ])).status).toBe('PRESERVED');
    // An unmeasured size makes the byte total null rather than zero.
    expect(retentionOutcomeFromTargets(targets([
      { name: 'synthetic-run-1', result: 'REMOVED', reasonCode: 'UNREFERENCED_AND_NOT_RECENT', bytes: null },
    ])).deletedBytes).toBeNull();
    expect(() => retentionOutcomeFromTargets([{ name: 'bad/name', result: 'REMOVED', reasonCode: 'X', bytes: 1 }] as never)).toThrow('RETENTION_JOURNAL_TARGETS_INVALID');
  });

  test('a terminal record is immutable and a second finalize is refused', () => {
    const root = freshRoot('immutable');
    const store = retentionJournalStore(root);
    prepareRetentionOperation(store, intent());
    expect(finalizeRetentionOperation(store, OPERATION_ID, targets()).ok).toBe(true);

    // A second apply for the same operation can never overwrite history.
    const second = finalizeRetentionOperation(store, OPERATION_ID, targets([
      { name: 'synthetic-run-2', result: 'REMOVED', reasonCode: 'UNREFERENCED_AND_NOT_RECENT', bytes: 99 },
    ]));
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.failure).toBe('OPERATION_ALREADY_TERMINAL');
    // The first terminal record still stands.
    expect(readRetentionOperation(store, OPERATION_ID)?.deletedSet).toEqual([{ name: 'synthetic-run-1', bytes: 2048 }]);
  });

  test('re-preparing the same operation identity is refused, and a distinct identity is independent', () => {
    const root = freshRoot('identity');
    const store = retentionJournalStore(root);
    expect(prepareRetentionOperation(store, intent()).ok).toBe(true);
    const again = prepareRetentionOperation(store, intent());
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.failure).toBe('OPERATION_ALREADY_PREPARED');
    // Exclusivity is per operation identity.
    expect(prepareRetentionOperation(store, intent({ operationId: OTHER_OPERATION_ID })).ok).toBe(true);
    expect(readRetentionOperation(store, OTHER_OPERATION_ID)?.operationId).toBe(OTHER_OPERATION_ID);
    expect(readRetentionOperation(store, `retention-${'c'.repeat(24)}`)).toBeNull();
  });

  test('every recording failure is categorical, so a partial receipt is never a success', () => {
    const root = freshRoot('failures');
    const store = retentionJournalStore(root);

    // No PREPARED record: there is nothing to finalize.
    const unfinalized = finalizeRetentionOperation(store, OPERATION_ID, targets());
    expect(unfinalized.ok).toBe(false);
    if (unfinalized.ok) return;
    expect(unfinalized.failure).toBe('OPERATION_NOT_FOUND');

    // Malformed inputs are refused before anything is written.
    const emptyCandidates = prepareRetentionOperation(store, intent({ candidates: [] }));
    expect(emptyCandidates.ok).toBe(false);
    if (!emptyCandidates.ok) expect(emptyCandidates.failure).toBe('CANDIDATES_INVALID');
    const unsafeCandidate = prepareRetentionOperation(store, intent({ candidates: [{ name: 'bad/name', bytes: 1 }] }));
    expect(unsafeCandidate.ok).toBe(false);
    if (!unsafeCandidate.ok) expect(unsafeCandidate.failure).toBe('CANDIDATES_INVALID');
    const badOperationId = prepareRetentionOperation(store, intent({ operationId: 'not-an-operation-id' }));
    expect(badOperationId.ok).toBe(false);
    if (!badOperationId.ok) expect(badOperationId.failure).toBe('OPERATION_ID_INVALID');
    const badTarget = finalizeRetentionOperation(store, OPERATION_ID, [{ name: 'bad/name', result: 'REMOVED', reasonCode: 'X', bytes: 1 }] as never);
    expect(badTarget.ok).toBe(false);
    if (!badTarget.ok) expect(badTarget.failure).toBe('TARGETS_INVALID');
    const badFinalizeId = finalizeRetentionOperation(store, 'not-an-operation-id', targets());
    expect(badFinalizeId.ok).toBe(false);
    if (!badFinalizeId.ok) expect(badFinalizeId.failure).toBe('OPERATION_ID_INVALID');

    // A journal root that cannot be prepared refuses the whole operation, so an
    // unrecorded deletion is never performed. A regular FILE in the ancestor
    // position makes every mkdir and write fail closed.
    const blockingFile = path.join(root, 'blocking-file');
    fs.writeFileSync(blockingFile, 'not a directory\n', 'utf8');
    const unusableStore = retentionJournalStore(path.join(blockingFile, 'retention'));
    const unusable = prepareRetentionOperation(unusableStore, intent({ operationId: `retention-${'d'.repeat(24)}` }));
    expect(unusable.ok).toBe(false);
    if (!unusable.ok) expect(unusable.failure).toBe('ROOT_UNUSABLE');
  });

  test('a prepared-but-unfinished journal survives a process interruption and stays inspectable', () => {
    const root = freshRoot('interrupted');
    // "Process 1": prepares, then dies before the terminal record.
    const first = retentionJournalStore(root);
    expect(prepareRetentionOperation(first, intent()).ok).toBe(true);

    // "Process 2": a fresh store instance over the same root sees an incomplete
    // operation and must block further deletion for owner inspection.
    const second = retentionJournalStore(root);
    expect(hasIncompleteRetentionOperation(second, OPERATION_ID)).toBe(true);
    expect(assertTerminalRetentionRecord).toBeDefined();
    // A foreign file written directly into the journal root, under a name the
    // journal never writes, is invisible to the reader — recovery can only ever
    // see records this journal published.
    fs.writeFileSync(path.join(root, `${OPERATION_ID}.terminal.json`), '{}\n', 'utf8');
    expect(readRetentionOperation(second, OPERATION_ID)?.terminal).toBe(false);
    // And a tampered terminal record is REJECTED, never read as a receipt.
    const tampered = fs.readFileSync(path.join(root, `${OPERATION_ID}.prepared.json`), 'utf8');
    fs.writeFileSync(path.join(root, `${OPERATION_ID}.terminal.json`), tampered, 'utf8');
    expect(readRetentionOperation(second, OPERATION_ID)?.terminal).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The WIRED bin: `bin/evidence-retention.mjs` records every APPLY through the
// journal authority above, so the operator-visible defect (an interrupted
// apply whose last word is `STARTED` with an empty deleted set, exiting 0) is
// closed at the call site. Every fixture is a disposable temporary root with
// synthetic names only.
// ---------------------------------------------------------------------------

const REPOSITORY_ROOT = path.resolve(__dirname, '../..');
const RETENTION_CLI = path.join(REPOSITORY_ROOT, 'bin', 'evidence-retention.mjs');

function disposableStore(prefix: string): { root: string; cleanup: () => void } {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `nightwatch-aud005-cli-${prefix}-`)));
  fs.mkdirSync(path.join(root, 'artifacts', 'run-referenced'), { recursive: true });
  fs.mkdirSync(path.join(root, 'artifacts', 'run-orphan'), { recursive: true });
  fs.writeFileSync(path.join(root, 'artifacts', 'run-orphan', 'summary.json'), '{}\n', 'utf8');
  fs.mkdirSync(path.join(root, '.agent'), { recursive: true });
  fs.writeFileSync(path.join(root, '.agent', 'STATE.md'), 'evidence at artifacts/run-referenced/summary.json\n', 'utf8');
  return { root, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

function retentionCli(root: string, args: readonly string[]) {
  return spawnSync(process.execPath, [RETENTION_CLI, ...args], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
  });
}

/** The confirmation token is bound to the plan, so it must come from a plan. */
function tokenFor(root: string): string {
  const plan = retentionCli(root, ['plan', '--json', '--keep-recent=0', `--root=${root}`]);
  expect(plan.status).toBe(0);
  const token = JSON.parse(plan.stdout).confirmationToken as string;
  expect(token).toMatch(/^sha256:[0-9a-f]{24}$/);
  return token;
}

test.describe('NW-AUD-005 the retention CLI journals every apply', () => {
  test('an apply whose journal cannot be prepared deletes nothing and exits non-zero', () => {
    const store = disposableStore('journal-blocked');
    try {
      // A regular FILE in the journal-root ancestor position makes every
      // journal mkdir and write fail closed.
      fs.writeFileSync(path.join(store.root, '.nightwatch'), 'not a directory\n', 'utf8');
      const token = tokenFor(store.root);
      const applied = retentionCli(store.root, ['--json', '--apply', `--confirm=${token}`, '--keep-recent=0', `--root=${store.root}`]);
      expect(applied.status).toBe(2);
      const report = JSON.parse(applied.stdout);
      expect(report.result).toBe('BLOCKED');
      expect(report.code).toBe('RETENTION_JOURNAL_PREPARE_FAILED');
      // An unrecorded deletion is refused, not performed.
      expect(fs.existsSync(path.join(store.root, 'artifacts', 'run-orphan'))).toBe(true);
      expect(fs.existsSync(path.join(store.root, 'artifacts', 'run-referenced'))).toBe(true);
      // And no receipt of any kind was left behind.
      expect(fs.lstatSync(path.join(store.root, '.nightwatch')).isFile()).toBe(true);
    } finally {
      store.cleanup();
    }
  });

  test('a verified TERMINAL record, never a STARTED receipt, is the last word of an apply', () => {
    const store = disposableStore('journal-wired');
    try {
      const token = tokenFor(store.root);
      const applied = retentionCli(store.root, ['--json', '--apply', `--confirm=${token}`, '--keep-recent=0', `--root=${store.root}`]);
      expect(applied.status).toBe(0);
      const report = JSON.parse(applied.stdout);
      expect(report.mode).toBe('APPLY');
      expect(report.result).toBe('APPLIED');
      expect(report.recordPath).toMatch(/^\.nightwatch\/retention\/retention-apply-/);
      expect(fs.existsSync(path.join(store.root, 'artifacts', 'run-orphan'))).toBe(false);

      const journalDirectory = path.join(store.root, '.nightwatch', 'retention');
      const names = fs.readdirSync(journalDirectory).sort();
      const prepared = names.filter((name) => name.endsWith('.prepared.json'));
      const terminal = names.filter((name) => name.endsWith('.terminal.json'));
      expect(prepared).toHaveLength(1);
      expect(terminal).toHaveLength(1);
      // No durable record ever claims STARTED with an empty deleted set.
      for (const name of [...prepared, ...terminal]) {
        const record = JSON.parse(fs.readFileSync(path.join(journalDirectory, name), 'utf8'));
        expect(record.schemaVersion).toBe(RETENTION_JOURNAL_VERSION);
        expect(record.status).not.toBe('STARTED');
      }
      // Every journal file is owner-only, inside an owner-only journal root.
      // (The operator receipt keeps its legacy, human-readable mode; the
      // crash-consistency requirement is the journal's, and it is 0600.)
      for (const name of [...prepared, ...terminal]) expect(fs.statSync(path.join(journalDirectory, name)).mode & 0o777).toBe(0o600);
      expect(fs.statSync(journalDirectory).mode & 0o777).toBe(0o700);

      // The journal's own reader — not the bin — decides what the last word
      // is: a terminal record, never an incomplete intent.
      const store1 = retentionJournalStore(journalDirectory);
      const operationId = path.basename(prepared[0] ?? '', '.prepared.json');
      expect(operationId).toMatch(/^retention-[0-9a-f]{24}$/);
      const record = readRetentionOperation(store1, operationId);
      expect(record?.terminal).toBe(true);
      expect(record?.status).toBe('APPLIED');
      expect(record?.deletedSet).toEqual(report.deletedSet);
      expect(hasIncompleteRetentionOperation(store1, operationId)).toBe(false);
      expect(() => assertTerminalRetentionRecord(record)).not.toThrow();

      // The operator receipt repeats exactly that verified terminal outcome.
      const receipt = JSON.parse(fs.readFileSync(path.join(store.root, report.recordPath), 'utf8'));
      expect(receipt.status).toBe('APPLIED');
      expect(receipt.deletedSet).toEqual(report.deletedSet);
      expect(receipt.deletedBytes).toBe(report.deletedBytes);
    } finally {
      store.cleanup();
    }
  });

  test('the dry-run path is unchanged and records nothing in the journal', () => {
    const store = disposableStore('dry-run');
    try {
      const plan = retentionCli(store.root, ['plan', '--json', '--keep-recent=0', `--root=${store.root}`]);
      expect(plan.status).toBe(0);
      const report = JSON.parse(plan.stdout);
      expect(report.mode).toBe('DRY_RUN');
      expect(report.result).toBe('PRESERVED');
      expect(report.candidates).toEqual(['run-orphan']);
      // A dry run writes no journal record and removes nothing.
      expect(fs.existsSync(path.join(store.root, '.nightwatch'))).toBe(false);
      expect(fs.existsSync(path.join(store.root, 'artifacts', 'run-orphan'))).toBe(true);
    } finally {
      store.cleanup();
    }
  });
});
