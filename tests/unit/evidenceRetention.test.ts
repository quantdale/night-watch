// ---------------------------------------------------------------------------
// R-06 — refusal-first local evidence retention.
//
// Nightwatch had never removed a run artifact, so the store grew without
// bound. Retention is dangerous in exactly one direction: a wrongly removed
// artifact is unrecoverable. These tests therefore assert the REFUSALS at
// least as hard as the removals, and assert that the default mode removes
// nothing at all.
//
// The pure planner is tested without a filesystem. The CLI is tested against
// a disposable temporary artifact root it creates itself.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  planRetention,
  type RetentionEntryObservation,
  type RetentionObservation,
} from '../../src/core/evidenceRetention';

const REPO_ROOT = path.join(__dirname, '..', '..');
const CLI = path.join(REPO_ROOT, 'bin', 'evidence-retention.mjs');

function directory(name: string, modifiedMs = 1_000, bytes = 10): RetentionEntryObservation {
  return { name, kind: 'DIRECTORY', bytes, modifiedMs };
}

function observation(overrides: Partial<RetentionObservation> = {}): RetentionObservation {
  return {
    referencedTokens: [],
    entries: [],
    referenceScanComplete: true,
    keepRecent: 0,
    ...overrides,
  };
}

function dispositionOf(plan: ReturnType<typeof planRetention>, name: string): string {
  const entry = plan.entries.find((candidate) => candidate.name === name);
  if (entry === undefined) throw new Error(`ENTRY_MISSING:${name}`);
  return entry.disposition;
}

test.describe('evidence retention planner (nightwatch.evidence-retention.v1)', () => {
  test('an unreferenced, non-recent run directory is the only removal candidate', () => {
    const plan = planRetention(observation({ entries: [directory('run-old')] }));
    expect(dispositionOf(plan, 'run-old')).toBe('REMOVAL_CANDIDATE');
    expect(plan.candidateCount).toBe(1);
    expect(plan.refusedCount).toBe(0);
    expect(plan.reclaimableBytes).toBe(10);
  });

  test('an artifact named in tracked state is refused', () => {
    const plan = planRetention(observation({
      entries: [directory('run-kept'), directory('run-old')],
      referencedTokens: ['run-kept'],
    }));
    expect(dispositionOf(plan, 'run-kept')).toBe('REFUSED_REFERENCED');
    expect(dispositionOf(plan, 'run-old')).toBe('REMOVAL_CANDIDATE');
  });

  test('a reference embedded in a longer token still refuses the artifact', () => {
    // Task records cite artifacts inside prose and paths, so an exact-equality
    // reference test would under-refuse. Containment can only ever move an
    // entry INTO the refusal set.
    const plan = planRetention(observation({
      entries: [directory('run-7')],
      referencedTokens: ['artifacts/run-7/summary.json'],
    }));
    expect(dispositionOf(plan, 'run-7')).toBe('REFUSED_REFERENCED');
    expect(plan.candidateCount).toBe(0);
  });

  test('an incomplete reference scan refuses every entry', () => {
    const plan = planRetention(observation({
      entries: [directory('run-a'), directory('run-b')],
      referenceScanComplete: false,
    }));
    expect(plan.candidateCount).toBe(0);
    expect(plan.refusedCount).toBe(2);
    for (const entry of plan.entries) expect(entry.reasonCode).toBe('REFERENCE_SCAN_INCOMPLETE');
  });

  test('an unmeasurable entry is refused rather than removed', () => {
    const plan = planRetention(observation({
      entries: [
        { name: 'run-nosize', kind: 'DIRECTORY', bytes: null, modifiedMs: 1_000 },
        { name: 'run-nomtime', kind: 'DIRECTORY', bytes: 10, modifiedMs: null },
      ],
    }));
    expect(dispositionOf(plan, 'run-nosize')).toBe('REFUSED_UNPROVABLE');
    expect(dispositionOf(plan, 'run-nomtime')).toBe('REFUSED_UNPROVABLE');
    expect(plan.candidateCount).toBe(0);
  });

  test('a symlink, a file and an unsafe name are refused as unsafe', () => {
    const plan = planRetention(observation({
      entries: [
        { name: 'run-link', kind: 'SYMLINK', bytes: 0, modifiedMs: 1_000 },
        { name: 'run-file', kind: 'FILE', bytes: 0, modifiedMs: 1_000 },
        { name: '../escape', kind: 'DIRECTORY', bytes: 0, modifiedMs: 1_000 },
        { name: '.gitkeep', kind: 'FILE', bytes: 0, modifiedMs: 1_000 },
      ],
    }));
    for (const entry of plan.entries) expect(entry.disposition).toMatch(/^REFUSED_/);
    expect(plan.candidateCount).toBe(0);
  });

  test('the newest entries are refused as the recent working set', () => {
    const plan = planRetention(observation({
      entries: [directory('run-1', 100), directory('run-2', 200), directory('run-3', 300)],
      keepRecent: 2,
    }));
    expect(dispositionOf(plan, 'run-3')).toBe('REFUSED_RECENT');
    expect(dispositionOf(plan, 'run-2')).toBe('REFUSED_RECENT');
    expect(dispositionOf(plan, 'run-1')).toBe('REMOVAL_CANDIDATE');
  });

  test('a missing mtime never widens the removal set through the recency sort', () => {
    // An entry with no mtime sorts as oldest, which would make it the first
    // removal candidate if recency were the only gate. It must stay refused.
    const plan = planRetention(observation({
      entries: [
        { name: 'run-nomtime', kind: 'DIRECTORY', bytes: 10, modifiedMs: null },
        directory('run-new', 900),
      ],
      keepRecent: 1,
    }));
    expect(dispositionOf(plan, 'run-nomtime')).toBe('REFUSED_UNPROVABLE');
    expect(plan.candidateCount).toBe(0);
  });

  test('reclaimable bytes are unmeasured rather than wrong when a candidate is unmeasured', () => {
    const plan = planRetention(observation({ entries: [directory('run-old')], keepRecent: 0 }));
    expect(plan.reclaimableBytes).toBe(10);
    const empty = planRetention(observation({ entries: [] }));
    expect(empty.candidateCount).toBe(0);
    expect(empty.reclaimableBytes).toBe(0);
  });

  test('an empty store plans nothing and is not an error', () => {
    const plan = planRetention(observation());
    expect(plan.entries).toHaveLength(0);
    expect(plan.refusedCount).toBe(0);
    expect(plan.candidateCount).toBe(0);
  });
});

test.describe('evidence retention CLI', () => {
  function makeStore(): { root: string; cleanup: () => void } {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-retention-'));
    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
    fs.mkdirSync(path.join(root, '.agent'), { recursive: true });
    for (const name of ['run-referenced', 'run-orphan']) {
      fs.mkdirSync(path.join(root, 'artifacts', name), { recursive: true });
      fs.writeFileSync(path.join(root, 'artifacts', name, 'summary.json'), '{}\n');
    }
    fs.writeFileSync(path.join(root, '.agent', 'STATE.md'), 'evidence at artifacts/run-referenced/summary.json\n');
    return { root, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
  }

  function run(cwd: string, args: readonly string[], env: NodeJS.ProcessEnv = process.env) {
    return spawnSync(process.execPath, [CLI, ...args], {
      cwd,
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
      shell: false,
      env,
    });
  }

  /** The confirmation token is bound to the plan, so it must come from a plan. */
  function tokenFor(root: string, keepRecent = 0): string {
    const plan = run(REPO_ROOT, ['plan', '--json', `--keep-recent=${keepRecent}`, `--root=${root}`]);
    expect(plan.status).toBe(0);
    const token = JSON.parse(plan.stdout).confirmationToken as string;
    expect(token).toMatch(/^sha256:[0-9a-f]{24}$/);
    return token;
  }

  test('status over the real repository store is read-only and removes nothing', () => {
    const before = fs.readdirSync(path.join(REPO_ROOT, 'artifacts')).length;
    const result = run(REPO_ROOT, ['status', '--json']);
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.schemaVersion).toBe('nightwatch.evidence-retention.v1');
    expect(report.mode).toBe('STATUS');
    expect(report.result).toBe('PRESERVED');
    expect(report).not.toHaveProperty('removalResults');
    expect(fs.readdirSync(path.join(REPO_ROOT, 'artifacts')).length).toBe(before);
  });

  test('plan mode is a dry run that still removes nothing', () => {
    const result = run(REPO_ROOT, ['plan', '--json', '--keep-recent=0']);
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.mode).toBe('DRY_RUN');
    expect(report).not.toHaveProperty('removalResults');
  });

  test('an unknown argument and an invalid keep-recent are refused', () => {
    for (const args of [['--delete-everything'], ['--keep-recent=-1'], ['--keep-recent=abc']]) {
      const result = run(REPO_ROOT, args);
      expect(result.status).toBe(2);
    }
  });

  test('apply removes only the unreferenced artifact and refuses the referenced one', () => {
    const store = makeStore();
    try {
      const token = tokenFor(store.root);
      const result = run(REPO_ROOT, ['--json', '--apply', `--confirm=${token}`, '--keep-recent=0', `--root=${store.root}`]);
      expect(result.status).toBe(0);
      const report = JSON.parse(result.stdout);
      expect(report.mode).toBe('APPLY');
      expect(report.candidates).toEqual(['run-orphan']);
      expect(report.removedCount).toBe(1);
      expect(report.result).toBe('APPLIED');
      expect(report.confirmationToken).toBe(token);
      expect(report.deletedSet).toEqual([{ name: 'run-orphan', bytes: expect.any(Number) }]);
      expect(report.deletedBytes).toBeGreaterThan(0);
      expect(report.appliedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      // The dangerous direction, asserted on disk rather than in the report.
      expect(fs.existsSync(path.join(store.root, 'artifacts', 'run-referenced'))).toBe(true);
      expect(fs.existsSync(path.join(store.root, 'artifacts', 'run-orphan'))).toBe(false);
      // Removal is whole-directory; the surviving artifact is untouched, not
      // rewritten or truncated.
      expect(fs.readFileSync(path.join(store.root, 'artifacts', 'run-referenced', 'summary.json'), 'utf8')).toBe('{}\n');
      // Deletion is recorded: which entries, bytes, SHA, refusal set, date.
      expect(report.recordPath).toMatch(/^\.nightwatch\/retention\/retention-apply-/);
      const receipt = JSON.parse(fs.readFileSync(path.join(store.root, report.recordPath), 'utf8'));
      expect(receipt.schemaVersion).toBe('nightwatch.evidence-retention-receipt.v1');
      expect(receipt.status).toBe('APPLIED');
      expect(receipt.appliedAt).toBe(report.appliedAt);
      expect(receipt.refusedCount).toBe(1);
      expect(receipt.refusedByReason).toEqual({ REFERENCED_BY_TRACKED_STATE: 1 });
      expect(receipt.refusalSetDigest).toMatch(/^sha256:[0-9a-f]{24}$/);
      expect(receipt.deletedSet).toEqual(report.deletedSet);
      expect(receipt.deletedBytes).toBe(report.deletedBytes);
      expect(receipt.confirmationToken).toBe(token);
    } finally {
      store.cleanup();
    }
  });

  test('the refusal set is re-derived from current tracked state, not reused', () => {
    const store = makeStore();
    try {
      const first = JSON.parse(run(REPO_ROOT, ['plan', '--json', '--keep-recent=0', `--root=${store.root}`]).stdout);
      expect(first.candidates).toEqual(['run-orphan']);
      // A new reference in current tracked state must move the artifact into
      // the refusal set on the next run, and must invalidate the old token.
      fs.appendFileSync(path.join(store.root, '.agent', 'STATE.md'), 'now references artifacts/run-orphan/summary.json\n');
      const second = JSON.parse(run(REPO_ROOT, ['plan', '--json', '--keep-recent=0', `--root=${store.root}`]).stdout);
      expect(second.candidates).toEqual([]);
      expect(second.refusedByReason).toEqual({ REFERENCED_BY_TRACKED_STATE: 2 });
      expect(second.confirmationToken).not.toBe(first.confirmationToken);
    } finally {
      store.cleanup();
    }
  });

  test('apply without the confirmation token deletes nothing', () => {
    const store = makeStore();
    try {
      const result = run(REPO_ROOT, ['--json', '--apply', '--keep-recent=0', `--root=${store.root}`]);
      expect(result.status).toBe(2);
      expect(fs.existsSync(path.join(store.root, 'artifacts', 'run-orphan'))).toBe(true);
      expect(fs.existsSync(path.join(store.root, 'artifacts', 'run-referenced'))).toBe(true);
    } finally {
      store.cleanup();
    }
  });

  test('apply with a stale token deletes nothing', () => {
    const store = makeStore();
    try {
      const stale = `sha256:${'0'.repeat(24)}`;
      const result = run(REPO_ROOT, ['--json', '--apply', `--confirm=${stale}`, '--keep-recent=0', `--root=${store.root}`]);
      expect(result.status).toBe(2);
      expect(JSON.parse(result.stdout).code).toBe('CONFIRMATION_TOKEN_MISMATCH');
      expect(fs.existsSync(path.join(store.root, 'artifacts', 'run-orphan'))).toBe(true);
    } finally {
      store.cleanup();
    }
  });

  test('unprovable referencing state refuses every artifact and apply removes nothing', () => {
    // Unprovable means refused. A `.agent` entry that is not a directory makes
    // the reference scan incomplete, so every artifact is refused and the
    // returned token authorizes a plan that contains no candidate at all.
    const store = makeStore();
    try {
      fs.rmSync(path.join(store.root, '.agent'), { recursive: true, force: true });
      fs.writeFileSync(path.join(store.root, '.agent'), 'not a directory\n');
      const plan = run(REPO_ROOT, ['plan', '--json', '--keep-recent=0', `--root=${store.root}`]);
      expect(plan.status).toBe(0);
      const report = JSON.parse(plan.stdout);
      expect(report.referenceScanComplete).toBe(false);
      expect(report.candidates).toEqual([]);
      expect(report.refusedByReason).toEqual({ REFERENCE_SCAN_INCOMPLETE: 2 });
      const applied = run(REPO_ROOT, ['--json', '--apply', `--confirm=${report.confirmationToken}`, '--keep-recent=0', `--root=${store.root}`]);
      expect(applied.status).toBe(0);
      const appliedReport = JSON.parse(applied.stdout);
      expect(appliedReport.removedCount).toBe(0);
      expect(appliedReport.result).toBe('PRESERVED');
      expect(fs.existsSync(path.join(store.root, 'artifacts', 'run-orphan'))).toBe(true);
      expect(fs.existsSync(path.join(store.root, 'artifacts', 'run-referenced'))).toBe(true);
    } finally {
      store.cleanup();
    }
  });

  test('apply refuses a non-interactive CI or gate environment even with the token', () => {
    const store = makeStore();
    try {
      const token = tokenFor(store.root);
      for (const env of [{ CI: '1' }, { NIGHTWATCH_GATE_ACTIVE: '1' }]) {
        const result = run(REPO_ROOT, ['--json', '--apply', `--confirm=${token}`, '--keep-recent=0', `--root=${store.root}`], { ...process.env, ...env });
        expect(result.status).toBe(2);
        expect(JSON.parse(result.stdout).code).toBe('APPLY_REFUSED_NON_INTERACTIVE');
        expect(fs.existsSync(path.join(store.root, 'artifacts', 'run-orphan'))).toBe(true);
      }
    } finally {
      store.cleanup();
    }
  });

  test('without the owner flag the same store is left completely intact', () => {
    const store = makeStore();
    try {
      const result = run(REPO_ROOT, ['--json', '--keep-recent=0', `--root=${store.root}`]);
      expect(result.status).toBe(0);
      const report = JSON.parse(result.stdout);
      expect(report.candidates).toEqual(['run-orphan']);
      expect(report.result).toBe('PRESERVED');
      expect(fs.existsSync(path.join(store.root, 'artifacts', 'run-orphan'))).toBe(true);
      expect(fs.existsSync(path.join(store.root, 'artifacts', 'run-referenced'))).toBe(true);
    } finally {
      store.cleanup();
    }
  });

  test('a symlinked artifact entry is never followed or removed', () => {
    const store = makeStore();
    try {
      const outside = path.join(store.root, 'outside');
      fs.mkdirSync(outside, { recursive: true });
      fs.writeFileSync(path.join(outside, 'keep.txt'), 'keep\n');
      fs.symlinkSync(outside, path.join(store.root, 'artifacts', 'run-link'), 'dir');
      const token = tokenFor(store.root);
      const result = run(REPO_ROOT, ['--json', '--apply', `--confirm=${token}`, '--keep-recent=0', `--root=${store.root}`]);
      expect(result.status).toBe(0);
      const report = JSON.parse(result.stdout);
      expect(report.candidates).not.toContain('run-link');
      expect(fs.existsSync(path.join(outside, 'keep.txt'))).toBe(true);
      expect(fs.lstatSync(path.join(store.root, 'artifacts', 'run-link')).isSymbolicLink()).toBe(true);
    } finally {
      store.cleanup();
    }
  });

  test('an unusable root is blocked rather than falling back to the real store', () => {
    const before = fs.readdirSync(path.join(REPO_ROOT, 'artifacts')).length;
    const token = `sha256:${'0'.repeat(24)}`;
    const result = run(REPO_ROOT, ['--json', '--apply', `--confirm=${token}`, `--root=${path.join(os.tmpdir(), 'nw-retention-absent')}`]);
    expect(result.status).toBe(2);
    expect(JSON.parse(result.stdout).code).toBe('ROOT_UNUSABLE');
    expect(fs.readdirSync(path.join(REPO_ROOT, 'artifacts')).length).toBe(before);
  });

  test('reclaiming nothing is reported as PRESERVED, not as a failure', () => {
    // keepRecent above the entry count leaves no candidate at all.
    const result = run(REPO_ROOT, ['status', '--json', '--keep-recent=100000']);
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.candidateCount).toBe(0);
    expect(report.result).toBe('PRESERVED');
  });
});
