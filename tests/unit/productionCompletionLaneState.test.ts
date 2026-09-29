// F-02 validation lane state — negative probes and live-record checks.
//
// The lane-state record must resolve every class declared in
// `config/validation-universe.v1.json` exactly once, a non-PROVEN lane must
// name a condition and a revisit date, staleness is computed (never stored),
// and an expired revisit date is reported.

import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  collectRevisitDue,
  loadLaneState,
  reportLaneState,
  validateLaneState,
} from '../../bin/lib/validation-lane-state.mjs';
import {
  appendedCorrectionEntries,
  correctionStillExemptsArchive,
  isAppendOnlyCorrectionsChange,
  isCorrectionAppendAdmissible,
  isValuesOnlyBindingChange,
  lineSha256Prefix,
  parseDocumentRoleCorrections,
} from '../../bin/lib/release-evidence.mjs';
import { checkpointRoleViolations, correctionPairingViolations, removedLineDigests } from '../../bin/lib/checkpoint-role.mjs';
import { evidenceArtifactExistsAtSha } from '../../bin/lib/evidence-artifact.mjs';
import { legacyEvidenceSha, loadReleaseEvidenceBindings, resolveEvidenceShaForSubject } from '../../bin/lib/release-evidence.mjs';
import { isApprovedCheckpointPath } from '../../bin/agent-continuity-protocol.mjs';
import type { LaneStateEntry } from '../../bin/lib/validation-lane-state.mjs';

const REPO_ROOT = path.join(__dirname, '..', '..');
const UNIVERSE_CLI = path.join(REPO_ROOT, 'bin', 'validation-universe.mjs');
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const SHA_C = 'c'.repeat(40);

function lane(overrides: Partial<LaneStateEntry> = {}): LaneStateEntry {
  return {
    laneId: 'lane-one',
    classes: ['CLASS_ONE'],
    class: 'PROVEN',
    command: 'npm run example',
    evidence: 'observed',
    evidenceSha: SHA_A,
    unblockCondition: null,
    revisitDate: null,
    ...overrides,
  };
}

test.describe('validation lane state', () => {
  test('the live record resolves every declared class exactly once', () => {
    const declaration = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'validation-universe.v1.json'), 'utf8'));
    const loaded = loadLaneState(REPO_ROOT);
    expect(loaded.ok).toBe(true);
    expect(loaded.lanes.length).toBeGreaterThanOrEqual(10);
    const errors = validateLaneState(loaded.lanes, Object.keys(declaration.classes));
    expect(errors).toEqual([]);
  });

  test('a class with no lane entry fails', () => {
    const errors = validateLaneState([lane()], ['CLASS_ONE', 'CLASS_TWO']);
    expect(errors.map((entry) => entry.code)).toContain('LANE_STATE_CLASS_MISSING');
  });

  test('a class owned by two lane entries fails', () => {
    const errors = validateLaneState(
      [lane(), lane({ laneId: 'lane-two' })],
      ['CLASS_ONE'],
    );
    expect(errors.map((entry) => entry.code)).toContain('LANE_STATE_CLASS_DUPLICATE');
  });

  test('a non-PROVEN lane without a condition or revisit date fails', () => {
    const errors = validateLaneState(
      [lane({ class: 'UNAVAILABLE_CAPABILITY', unblockCondition: '', revisitDate: null })],
      ['CLASS_ONE'],
    );
    const codes = errors.map((entry) => entry.code);
    expect(codes).toContain('LANE_STATE_CONDITION_MISSING');
    expect(codes).toContain('LANE_STATE_REVISIT_MISSING');
  });

  // VB-01 (corrections task 2.1) — a documentary commit can never erase
  // evidence or make an unevidenced PROVEN claim look fresh.
  test('VB-01: a PROVEN lane with a nulled evidenceSha fails structural validation', () => {
    expect(validateLaneState([lane({ evidenceSha: null })], ['CLASS_ONE']).map((entry) => entry.code))
      .toContain('LANE_STATE_EVIDENCE_SHA_MISSING');
    // A PROVEN lane WITH its 40-hex evidence stays valid.
    expect(validateLaneState([lane()], ['CLASS_ONE'])).toEqual([]);
  });

  test('VB-01: erasing a binding evidence value is substantive, never values-only', () => {
    const binding = (evidenceSha: string | null) => JSON.stringify({
      schemaVersion: 'nightwatch.release-evidence.v1',
      bindings: [{ subject: 'root-compile', evidenceSha, receiptDigest: null, observedAt: null, executor: null, artifactPaths: [] }],
    });
    // The regression: non-null -> null used to classify VALUES_ONLY.
    expect(isValuesOnlyBindingChange(binding(SHA_A), binding(null))).toEqual({
      valuesOnly: false,
      reason: 'BINDING_VALUE_NULLED:evidenceSha',
    });
    // Every evidence value is protected the same way.
    const receipt = (receiptDigest: string | null) => JSON.stringify({
      schemaVersion: 'nightwatch.release-evidence.v1',
      bindings: [{ subject: 'root-compile', evidenceSha: SHA_A, receiptDigest, observedAt: null, executor: null, artifactPaths: [] }],
    });
    expect(isValuesOnlyBindingChange(receipt('receipt:sha256:' + 'a'.repeat(24)), receipt(null))).toEqual({
      valuesOnly: false,
      reason: 'BINDING_VALUE_NULLED:receiptDigest',
    });
    // Adding evidence where there was none, and refreshing values, stay
    // values-only — the guard is narrowed to erasure, not widened to every
    // value edit.
    expect(isValuesOnlyBindingChange(binding(null), binding(SHA_A)).valuesOnly).toBe(true);
    expect(isValuesOnlyBindingChange(binding(SHA_A), binding(SHA_B)).valuesOnly).toBe(true);
  });

  // VB-03 (corrections task 2.3) — a correction is admitted only with its
  // matching archive-line removal in the SAME commit.
  // VB-06 (corrections task 2.6) — the checkpoint-role classifier is proven:
  // every declared diff-shape has a real-git case (read-only git init in a
  // scratch repo), and a guarded path is never approved by path alone.
  test('VB-06: values-only, append-only, rename, added-key, null and merge shapes classify correctly', () => {
    const os = require('node:os') as typeof import('node:os');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-vb06-'));
    const git = (args: string[]) => spawnSync('git', args, { cwd: root, encoding: 'utf8', shell: false });
    const write = (file: string, text: string) => {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), text);
    };
    const binding = (sha: string | null) => `${JSON.stringify({ schemaVersion: 'nightwatch.release-evidence.v1', bindings: [{ subject: 'root-compile', evidenceSha: sha, receiptDigest: null, observedAt: null, executor: null, artifactPaths: [] }] }, null, 2)}\n`;
    const corrections = (entries: unknown[]) => `${JSON.stringify({ schemaVersion: 'nightwatch.document-role-corrections.v1', corrections: entries }, null, 2)}\n`;
    try {
      git(['init', '--quiet', '-b', 'main']);
      git(['config', 'user.email', 'probe@nightwatch.local']);
      git(['config', 'user.name', 'probe']);
      write('config/release-evidence.v1.json', binding(SHA_A));
      write('docs/other.md', 'prose\n');
      git(['add', '--all']);
      git(['commit', '--quiet', '--no-gpg-sign', '-m', 'base']);
      const base = git(['rev-parse', 'HEAD']).stdout!.trim();

      // (a) VALUES-ONLY: a value refresh stays documentary.
      write('config/release-evidence.v1.json', binding(SHA_B));
      git(['add', '--all']);
      git(['commit', '--quiet', '--no-gpg-sign', '-m', 'values-only']);
      const valuesOnly = git(['rev-parse', 'HEAD']).stdout!.trim();
      expect(checkpointRoleViolations(root, ['config/release-evidence.v1.json'], { kind: 'commit', commit: valuesOnly })).toEqual([]);

      // (b) NULL: erasing the evidence value is substantive.
      write('config/release-evidence.v1.json', binding(null));
      git(['add', '--all']);
      git(['commit', '--quiet', '--no-gpg-sign', '-m', 'null evidence']);
      const nulled = git(['rev-parse', 'HEAD']).stdout!.trim();
      expect(checkpointRoleViolations(root, ['config/release-evidence.v1.json'], { kind: 'commit', commit: nulled }))
        .toEqual(['config/release-evidence.v1.json']);

      // (c) ADDED-KEY: a new binding key (artifactPaths edit shape) is structural.
      write('config/release-evidence.v1.json', binding(SHA_B).replace('"artifactPaths": []', '"artifactPaths": ["config/report.json"]'));
      git(['add', '--all']);
      git(['commit', '--quiet', '--no-gpg-sign', '-m', 'added key']);
      const addedKey = git(['rev-parse', 'HEAD']).stdout!.trim();
      expect(checkpointRoleViolations(root, ['config/release-evidence.v1.json'], { kind: 'commit', commit: addedKey }))
        .toEqual(['config/release-evidence.v1.json']);

      // (d) RENAME: moving a binding file away is a delete of a guarded path
      //     (substantive), never a documentary rename.
      git(['mv', 'config/release-evidence.v1.json', 'config/release-evidence.moved.json']);
      git(['commit', '--quiet', '--no-gpg-sign', '-m', 'rename away']);
      const renamed = git(['rev-parse', 'HEAD']).stdout!.trim();
      expect(checkpointRoleViolations(root, ['config/release-evidence.v1.json'], { kind: 'commit', commit: renamed }))
        .toEqual(['config/release-evidence.v1.json']);
      git(['mv', 'config/release-evidence.moved.json', 'config/release-evidence.v1.json']);
      git(['commit', '--quiet', '--no-gpg-sign', '-m', 'rename back']);

      // (e) APPEND-ONLY + pairing: the corrections file EXISTS first; then an
      //     unpaired correction append is substantive (the VB-03 regression)
      //     and the SAME commit removing the exempted line is documentary
      //     (the ed8807e6 shape).
      write('docs/archive.md', 'line one\ngone line\n');
      write('config/document-role-corrections.v1.json', corrections([]));
      git(['add', '--all']);
      git(['commit', '--quiet', '--no-gpg-sign', '-m', 'seed archive and empty registry']);
      const goneDigest = lineSha256Prefix('gone line');
      // UNPAIRED: the entry exempts 'gone line' but this commit removes nothing.
      write('config/document-role-corrections.v1.json', corrections([
        { id: 'CORR-ONE', path: 'docs/archive.md', oldLineSha256: goneDigest, oldLineExcerpt: 'gone line', reason: 'r' },
      ]));
      git(['add', '--all']);
      git(['commit', '--quiet', '--no-gpg-sign', '-m', 'unpaired append']);
      const unpaired = git(['rev-parse', 'HEAD']).stdout!.trim();
      expect(correctionPairingViolations(root, unpaired, 'config/document-role-corrections.v1.json', 'docs/archive.md').length).toBe(1);
      // PAIRED: the entry exempts 'line one' and THIS commit removes exactly it.
      write('config/document-role-corrections.v1.json', corrections([
        { id: 'CORR-ONE', path: 'docs/archive.md', oldLineSha256: goneDigest, oldLineExcerpt: 'gone line', reason: 'r' },
        { id: 'CORR-PAIR', path: 'docs/archive.md', oldLineSha256: lineSha256Prefix('line one'), oldLineExcerpt: 'line one', reason: 'r' },
      ]));
      write('docs/archive.md', 'gone line\n');
      git(['add', '--all']);
      git(['commit', '--quiet', '--no-gpg-sign', '-m', 'paired append + removal']);
      const paired = git(['rev-parse', 'HEAD']).stdout!.trim();
      expect(correctionPairingViolations(root, paired, 'config/document-role-corrections.v1.json', 'docs/archive.md')).toEqual([]);

      // (f) MERGE: a merge that carries a STRUCTURAL guarded rewrite against
      //     one parent is visible to the classifier (-m) and classified — it
      //     was invisible before -m (diff-tree without -m lists NOTHING for a
      //     merge). A merge carrying only a values-only re-bind stays
      //     documentary. Both sides and mainline share one merge-base state
      //     for the guarded file, so the merges land cleanly.
      write('config/release-evidence.v1.json', binding(SHA_A));
      write('docs/other.md', 'prose\n');
      git(['add', '--all']);
      git(['commit', '--quiet', '--no-gpg-sign', '-m', 'merge-fixture reset']);
      const mergeBase = git(['rev-parse', 'HEAD']).stdout!.trim();
      git(['checkout', '--quiet', '-b', 'side-values', mergeBase]);
      write('config/release-evidence.v1.json', binding(SHA_C));
      git(['add', '--all']);
      git(['commit', '--quiet', '--no-gpg-sign', '-m', 'side values-only rebind']);
      const sideValues = git(['rev-parse', 'HEAD']).stdout!.trim();
      git(['checkout', '--quiet', '-b', 'side-structural', mergeBase]);
      write('config/release-evidence.v1.json', binding(null));
      git(['add', '--all']);
      git(['commit', '--quiet', '--no-gpg-sign', '-m', 'side structural null-out']);
      const sideStructural = git(['rev-parse', 'HEAD']).stdout!.trim();
      git(['checkout', '--quiet', 'main']);
      write('docs/other.md', 'mainline prose\n');
      git(['add', '--all']);
      git(['commit', '--quiet', '--no-gpg-sign', '-m', 'mainline prose']);
      // The VALUES-only merge lands cleanly and its guarded touch IS visible
      // with -m (invisible without it) — but its diff shape stays documentary.
      const mergeValuesResult = git(['merge', '--no-ff', '--no-gpg-sign', '-m', 'merge values-only rebind', sideValues]);
      expect(mergeValuesResult.status).toBe(0);
      const mergedValues = git(['rev-parse', 'HEAD']).stdout!.trim();
      const visibleWithM = git(['diff-tree', '--root', '--no-commit-id', '--name-only', '--no-renames', '-m', '-r', mergedValues]).stdout;
      expect(visibleWithM).toContain('config/release-evidence.v1.json');
      expect(git(['diff-tree', '--root', '--no-commit-id', '--name-only', '--no-renames', '-r', mergedValues]).stdout).not.toContain('config/release-evidence.v1.json');
      expect(checkpointRoleViolations(root, ['config/release-evidence.v1.json'], { kind: 'commit', commit: mergedValues })).toEqual([]);
      // The STRUCTURAL merge is classified with the guarded path (per-parent
      // guard fails against the first parent): the exact hole VB-06 closes.
      // Reset the guarded file to its merge-base value first (ours == base
      // for that file) so the side's structural rewrite applies cleanly
      // instead of conflicting with the values merge above.
      write('config/release-evidence.v1.json', binding(SHA_A));
      git(['add', '--all']);
      git(['commit', '--quiet', '--no-gpg-sign', '-m', 'reset guarded file at merge-base value']);
      const mergeStructuralResult = git(['merge', '--no-ff', '--no-gpg-sign', '-m', 'merge structural null-out', sideStructural]);
      expect(mergeStructuralResult.status).toBe(0);
      const mergedStructural = git(['rev-parse', 'HEAD']).stdout!.trim();
      expect(git(['diff-tree', '--root', '--no-commit-id', '--name-only', '--no-renames', '-r', mergedStructural]).stdout).not.toContain('config/release-evidence.v1.json');
      expect(checkpointRoleViolations(root, ['config/release-evidence.v1.json'], { kind: 'commit', commit: mergedStructural }))
        .toEqual(['config/release-evidence.v1.json']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('VB-06: guarded paths are never approved by path alone (and the dead constant is gone)', () => {
    expect(isApprovedCheckpointPath('config/release-evidence.v1.json')).toBe(false);
    expect(isApprovedCheckpointPath('config/document-role-corrections.v1.json')).toBe(false);
    // The retired constant is gone entirely (read the source: the module is
    // imported once statically above).
    const source = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'agent-continuity-protocol.mjs'), 'utf8');
    expect(source).not.toContain('DIFF_GUARDED_CHECKPOINT_PATHS');
  });

  // VB-04 (corrections task 2.4) — the legacy-token regression: the `HEAD`
  // marker in a retired location once fed the `liveHeadSha` read-before-
  // declare path (the TDZ fixed in a784e668). The token itself is now
  // invalid everywhere (VB-05), so the regression pin is that a legacy
  // record carrying it never resolves anything.
  test('VB-04: a legacy record carrying the HEAD token resolves nothing (regression for the liveHeadSha TDZ read)', () => {
    const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'nw-vb04-'));
    try {
      fs.mkdirSync(path.join(root, 'config'), { recursive: true });
      // Retired location: a condition whose legacy evidence is the HEAD token
      // (the exact shape that fed the TDZ read).
      fs.writeFileSync(path.join(root, 'config', 'release-certification.v1.json'), JSON.stringify({
        schemaVersion: 'nightwatch.release-certification.v1',
        conditions: [{ id: 'completion-ledger-truth', evidenceSha: 'HEAD' }],
      }));
      fs.writeFileSync(path.join(root, 'config', 'validation-lane-state.v1.json'), JSON.stringify({
        schemaVersion: 'nightwatch.validation-lane-state.v1',
        lanes: [{ laneId: 'root-compile', evidenceSha: 'HEAD' }],
      }));
      // The registry is present and valid but binds neither subject, so the
      // retired locations are consulted once — and reject the token.
      fs.writeFileSync(path.join(root, 'config', 'release-evidence.v1.json'), JSON.stringify({
        schemaVersion: 'nightwatch.release-evidence.v1',
        bindings: [],
      }));
      expect(legacyEvidenceSha(root, 'completion-ledger-truth')).toBeNull();
      expect(legacyEvidenceSha(root, 'root-compile')).toBeNull();
      expect(resolveEvidenceShaForSubject(root, 'completion-ledger-truth')).toBeNull();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('RV-02: a re-bind to a different SHA is documentary only with a NEW receipt, observation time and executor', () => {
    const digest = (ch: string) => `receipt:sha256:${ch.repeat(24)}`;
    const binding = (overrides: Record<string, unknown> = {}) => ({
      subject: 'lane-one',
      evidenceSha: SHA_A,
      receiptDigest: digest('1'),
      observedAt: '2026-09-30T00:00:00.000Z',
      executor: 'gate:local',
      artifactPaths: [],
      ...overrides,
    });
    const doc = (entry: unknown) => JSON.stringify({ schemaVersion: 'nightwatch.release-evidence.v1', bindings: [entry] });
    const verdict = (after: unknown) => isValuesOnlyBindingChange(doc(binding()), doc(after));
    expect(verdict(binding({ evidenceSha: SHA_B, receiptDigest: digest('2') }))).toEqual({ valuesOnly: true, reason: 'VALUES_ONLY' });
    // A refresh of the same SHA's observation metadata stays documentary.
    expect(verdict(binding({ observedAt: '2026-09-30T01:00:00.000Z' })).valuesOnly).toBe(true);
    for (const [after, reason] of [
      [binding({ evidenceSha: SHA_B, receiptDigest: null }), 'BINDING_REBIND_WITHOUT_RECEIPT:lane-one'],
      [binding({ evidenceSha: SHA_B, observedAt: null }), 'BINDING_REBIND_WITHOUT_RECEIPT:lane-one'],
      [binding({ evidenceSha: SHA_B, executor: null }), 'BINDING_REBIND_WITHOUT_RECEIPT:lane-one'],
      [binding({ evidenceSha: SHA_B }), 'BINDING_REBIND_RECEIPT_UNCHANGED:lane-one'],
    ] as const) {
      expect(verdict(after)).toEqual({ valuesOnly: false, reason });
    }
    // null -> A (first evidence) is a re-point too and needs the same receipt.
    const first = isValuesOnlyBindingChange(doc(binding({ evidenceSha: null, receiptDigest: null, observedAt: null, executor: null })), doc(binding({ receiptDigest: null })));
    expect(first).toEqual({ valuesOnly: false, reason: 'BINDING_REBIND_WITHOUT_RECEIPT:lane-one' });
  });

  test('RV-03: the evidence-artifact probe answers from git — present, absent-before, missing path, unknown commit', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-artifact-'));
    const env = { PATH: '/usr/bin:/bin', HOME: directory, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'nw', GIT_AUTHOR_EMAIL: 'nw@example.invalid', GIT_COMMITTER_NAME: 'nw', GIT_COMMITTER_EMAIL: 'nw@example.invalid' };
    const git = (...args: string[]) => spawnSync('git', args, { cwd: directory, env, encoding: 'utf8' });
    try {
      git('init', '--quiet');
      fs.writeFileSync(path.join(directory, 'a.txt'), 'a\n');
      git('add', 'a.txt');
      git('commit', '--quiet', '--no-gpg-sign', '-m', 'one');
      const first = git('rev-parse', 'HEAD').stdout.trim();
      fs.writeFileSync(path.join(directory, 'b.txt'), 'b\n');
      git('add', 'b.txt');
      git('commit', '--quiet', '--no-gpg-sign', '-m', 'two');
      const second = git('rev-parse', 'HEAD').stdout.trim();
      expect(evidenceArtifactExistsAtSha(directory, first, 'a.txt')).toBe(true);
      expect(evidenceArtifactExistsAtSha(directory, first, 'b.txt')).toBe(false);
      expect(evidenceArtifactExistsAtSha(directory, second, 'b.txt')).toBe(true);
      expect(evidenceArtifactExistsAtSha(directory, second, 'missing.txt')).toBe(false);
      expect(evidenceArtifactExistsAtSha(directory, '0'.repeat(40), 'a.txt')).toBe(false);
      // Malformed inputs never read as present.
      expect(evidenceArtifactExistsAtSha(directory, 'HEAD', 'a.txt')).toBe(false);
      expect(evidenceArtifactExistsAtSha(directory, second, '../a.txt')).toBe(false);
      expect(evidenceArtifactExistsAtSha(directory, second, '/etc/passwd')).toBe(false);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('RV-01: two corrections exempting the same archive line are rejected, whatever their ids', () => {
    const entry = (id: string, digest: string, file = 'docs/CURRENT_STATE.md') => ({ id, path: file, oldLineSha256: digest, oldLineExcerpt: 'gone', reason: 'r' });
    const record = (entries: unknown[]) => ({ schemaVersion: 'nightwatch.document-role-corrections.v1', corrections: entries });
    const digest = lineSha256Prefix('the retired line');
    expect(parseDocumentRoleCorrections(record([entry('CORR-A', digest), entry('CORR-B', lineSha256Prefix('another line'))])).errors).toEqual([]);
    const duplicated = parseDocumentRoleCorrections(record([entry('CORR-A', digest), entry('CORR-B', digest)]));
    expect(duplicated.ok).toBe(false);
    expect(duplicated.errors).toEqual(['CORRECTION_DIGEST_DUPLICATE:CORR-B']);
    // The same digest in a DIFFERENT file is a different line, not a duplicate.
    expect(parseDocumentRoleCorrections(record([entry('CORR-A', digest), entry('CORR-B', digest, 'docs/ROADMAP.md')])).errors).toEqual([]);
  });

  test('VB-03: an unpaired correction append is inadmissible; its removal must land with it', () => {
    const correction = (id: string, digest: string) => ({ id, path: 'docs/CURRENT_STATE.md', oldLineSha256: digest, oldLineExcerpt: 'gone', reason: 'r' });
    const doc = (entries: unknown[]) => JSON.stringify({ schemaVersion: 'nightwatch.document-role-corrections.v1', corrections: entries });
    const before = doc([correction('CORR-A', lineSha256Prefix('a'))]);
    const after = doc([correction('CORR-A', lineSha256Prefix('a')), correction('CORR-B', lineSha256Prefix('gone line'))]);
    const appended = appendedCorrectionEntries(before, after);
    expect(appended?.map((entry) => entry.id)).toEqual(['CORR-B']);
    // The regression: an append-only-shaped append with NO same-commit
    // removal used to be documentary. Now it is inadmissible.
    expect(isCorrectionAppendAdmissible(appended![0]!, new Set())).toEqual({ admissible: false, reason: 'CORRECTION_APPEND_UNPAIRED' });
    // The same change removing exactly the exempted line pairs it.
    expect(isCorrectionAppendAdmissible(appended![0]!, new Set([lineSha256Prefix('gone line')]))).toEqual({ admissible: true, reason: 'PAIRED_WITH_SAME_COMMIT_REMOVAL' });
    // The append-only SHAPE alone is not enough (VB-03 narrows the guard):
    expect(isAppendOnlyCorrectionsChange(before, after).appendOnly).toBe(true);
  });

  test('VB-03: a correction may never exempt a LIVE archive line', () => {
    expect(correctionStillExemptsArchive({ oldLineSha256: lineSha256Prefix('live line') }, 'live line\nother')).toBe(true);
    expect(correctionStillExemptsArchive({ oldLineSha256: lineSha256Prefix('gone line') }, 'live line\nother')).toBe(false);
    // The LIVE registry is inert: every registered correction's exempted line
    // is already absent from its archive (the bounded legacy exception is
    // admissible only while it stays inert).
    const registry = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'document-role-corrections.v1.json'), 'utf8')) as {
      corrections: Array<{ id: string; path: string; oldLineSha256: string }>;
    };
    for (const entry of registry.corrections) {
      const archive = fs.readFileSync(path.join(REPO_ROOT, entry.path), 'utf8');
      expect(correctionStillExemptsArchive(entry, archive), `${entry.id} still exempts a LIVE line`).toBe(false);
    }
  });

  test('VB-03: the real paired commit ed8807e6 classifies admissible (positive control)', () => {
    // CORR-CORR-001's append landed with its removal of the old header line
    // in the same commit — the exact shape the rule requires. Read-only Git.
    const commit = 'ed8807e6bb784090051ed483e5cec65b0aabcf41';
    const removed = removedLineDigests(REPO_ROOT, commit, 'docs/CURRENT_STATE.md');
    expect(removed).not.toBeNull();
    expect(removed!.has('sha256:d82aae956ce9d4b666cbb9f5')).toBe(true);
    expect(correctionPairingViolations(REPO_ROOT, commit, 'config/document-role-corrections.v1.json', 'docs/CURRENT_STATE.md')).toEqual([]);
  });

  test('VB-02: artifactPaths is a declared structural key — adding or editing it is never values-only', () => {
    const binding = (artifactPaths: string[]) => JSON.stringify({
      schemaVersion: 'nightwatch.release-evidence.v1',
      bindings: [{ subject: 'root-compile', evidenceSha: SHA_A, receiptDigest: null, observedAt: null, executor: null, artifactPaths }],
    });
    expect(isValuesOnlyBindingChange(binding([]), binding(['config/report.json']))).toEqual({
      valuesOnly: false,
      reason: 'BINDING_NON_VALUE_KEY_CHANGED:artifactPaths',
    });
    // Identical declared sets stay values-only (element-wise array equality).
    expect(isValuesOnlyBindingChange(binding(['config/report.json']), binding(['config/report.json'])).valuesOnly).toBe(true);
    // The closed schema rejects a binding without the declared list.
    const missing = JSON.stringify({
      schemaVersion: 'nightwatch.release-evidence.v1',
      bindings: [{ subject: 'root-compile', evidenceSha: SHA_A, receiptDigest: null, observedAt: null, executor: null }],
    });
    expect(isValuesOnlyBindingChange(missing, binding([])).valuesOnly).toBe(false);
  });

  test('VB-01: any change to the lane-state record is substantive (class changes cannot hide)', () => {
    // validation-lane-state.v1.json is not an approved documentation-only
    // path and carries no diff guard that could admit a class change, so a
    // lane-class change is substantive by construction.
    expect(isApprovedCheckpointPath('config/validation-lane-state.v1.json')).toBe(false);
  });

  test('staleness is computed from evidence ancestry, never stored', () => {
    const lanes = [
      lane({ laneId: 'current', evidenceSha: SHA_B }),
      lane({ laneId: 'old', evidenceSha: SHA_A }),
      lane({ laneId: 'future', evidenceSha: SHA_C }),
    ];
    const report = reportLaneState(lanes, SHA_B, (left, right) => left === SHA_A && right === SHA_B);
    expect(report.find((entry) => entry.laneId === 'current')?.reportedClass).toBe('PROVEN');
    expect(report.find((entry) => entry.laneId === 'old')?.staleEvidence).toBe(true);
    expect(report.find((entry) => entry.laneId === 'old')?.reportedClass).toBe('PROVEN (STALE_EVIDENCE)');
    // an incomparable SHA is not asserted stale by the injected predicate
    expect(report.find((entry) => entry.laneId === 'future')?.staleEvidence).toBe(false);
  });

  test('an expired revisit date is reported, a future one is not', () => {
    const lanes = [
      lane({ laneId: 'due', class: 'BLOCKED_EXTERNAL', unblockCondition: 'owner action', revisitDate: '2026-09-01' }),
      lane({ laneId: 'future', class: 'BLOCKED_EXTERNAL', unblockCondition: 'owner action', revisitDate: '2026-12-01' }),
      lane({ laneId: 'proven' }),
    ];
    const due = collectRevisitDue(lanes, '2026-09-12');
    expect(due.map((entry) => entry.laneId)).toEqual(['due']);
  });

  test('the universe CLI emits the lane-state record and exits zero', () => {
    const result = spawnSync(process.execPath, [UNIVERSE_CLI, '--json'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      ok: boolean;
      laneState: { schemaVersion: string; lastSubstantiveSha: string; lanes: Array<{ laneId: string; reportedClass: string }> };
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.laneState.schemaVersion).toBe('nightwatch.validation-lane-state.v1');
    expect(parsed.laneState.lanes.length).toBeGreaterThanOrEqual(10);
    expect(parsed.laneState.lanes.map((entry) => entry.laneId)).toContain('exact-checkpoint-ci');
  });

  test('an invalid lane-state file fails the universe judgement', () => {
    const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'nw-lane-'));
    try {
      fs.mkdirSync(path.join(root, 'config'), { recursive: true });
      fs.copyFileSync(path.join(REPO_ROOT, 'config', 'validation-lane-state.v1.json'), path.join(root, 'config', 'validation-lane-state.v1.json'));
      const record = JSON.parse(fs.readFileSync(path.join(root, 'config', 'validation-lane-state.v1.json'), 'utf8'));
      record.lanes[0].classes = ['NOT_DECLARED'];
      fs.writeFileSync(path.join(root, 'config', 'validation-lane-state.v1.json'), JSON.stringify(record));
      const loaded = loadLaneState(root);
      const errors = validateLaneState(loaded.lanes, ['BIN_SYNTAX']);
      expect(errors.map((entry) => entry.code)).toEqual(
        expect.arrayContaining(['LANE_STATE_CLASS_UNKNOWN']),
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
