// R5-13 / review-5 task B3.1 — a committed evidence receipt is DOCUMENTARY only when it is add-only
// and the real receipt judgement verifies it for the subject and SHA its own path names. The
// production classifier is driven against REAL synthetic Git repositories and REAL producer output.

import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkpointRoleViolations } from '../../bin/lib/checkpoint-role.mjs';
import { buildCertificationReceipt, certificationReceiptPath } from '../../bin/lib/certification-evidence.mjs';
import { evidenceReceiptChangeHolds, guardClassForPath, parseEvidenceReceiptPath } from '../../bin/lib/release-evidence.mjs';

const S = 'a'.repeat(40);

function receiptFor(subject: string, sha: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return buildCertificationReceipt({
    subject,
    sourceHead: sha,
    observedAtHead: sha,
    sourceRootCleanAtEmit: true,
    checkId: 'cmd-root-compile',
    checkState: 'MET',
    producer: 'COMMAND',
    ...overrides,
  } as Parameters<typeof buildCertificationReceipt>[0]);
}

interface Repo { readonly root: string; head(): string; commitFile(file: string, text: string): string; removeFile(file: string): string; violations(commit: string, files: string[]): string[]; cleanup(): void }

function repo(): Repo {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-evguard-'));
  const git = (args: string[]): string => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', shell: false });
    if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
    return (result.stdout ?? '').trim();
  };
  git(['init', '--quiet', '-b', 'main']);
  git(['config', 'user.email', 'probe@nightwatch.local']);
  git(['config', 'user.name', 'probe']);
  fs.writeFileSync(path.join(root, 'seed.txt'), 'seed\n');
  git(['add', '--all']);
  git(['commit', '--quiet', '--no-gpg-sign', '-m', 'seed']);
  const commit = (message: string): string => {
    git(['add', '--all']);
    git(['commit', '--quiet', '--no-gpg-sign', '-m', message]);
    return git(['rev-parse', 'HEAD']);
  };
  return {
    root,
    head: () => git(['rev-parse', 'HEAD']),
    commitFile: (file, text) => {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), text);
      return commit(`write ${file}`);
    },
    removeFile: (file) => {
      fs.rmSync(path.join(root, file));
      return commit(`remove ${file}`);
    },
    violations: (commitSha, files) => checkpointRoleViolations(root, files, { kind: 'commit', commit: commitSha }),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

const text = (body: Record<string, unknown>) => `${JSON.stringify(body, null, 2)}\n`;

test.describe('the evidence receipt path', () => {
  test('only the exact one-level shape is a guarded evidence path', () => {
    expect(parseEvidenceReceiptPath(certificationReceiptPath(S, 'root-compile'))).toEqual({ sha: S, subject: 'root-compile' });
    expect(guardClassForPath(certificationReceiptPath(S, 'root-compile'))).toBe('ADD_ONLY_EVIDENCE_RECEIPT');
    for (const file of [
      `evidence/certification/${S}/nested/root-compile.json`,
      `evidence/certification/${S.slice(1)}/root-compile.json`,
      `evidence/certification/${S}/root-compile.txt`,
      `evidence/certification/${S}/Root_Compile.json`,
      `evidence/other/${S}/root-compile.json`,
      `artifacts/receipts/root-compile.json`,
    ]) {
      expect(parseEvidenceReceiptPath(file), file).toBeNull();
      expect(guardClassForPath(file), file).toBeNull();
    }
  });
});

test.describe('the add-only content guard (pure judgement)', () => {
  const file = certificationReceiptPath(S, 'root-compile');
  const good = text(receiptFor('root-compile', S));

  test('a new, verifying receipt holds; byte-identical re-presentation holds', () => {
    expect(evidenceReceiptChangeHolds(file, null, good)).toBe(true);
    expect(evidenceReceiptChangeHolds(file, good, good)).toBe(true);
  });

  test('an edit, a deletion, junk, a foreign subject or SHA, an UNMET or unclean receipt never hold', () => {
    expect(evidenceReceiptChangeHolds(file, good, text(receiptFor('root-compile', S, { checkId: 'cmd-other' })))).toBe(false);
    expect(evidenceReceiptChangeHolds(file, good, null)).toBe(false);
    expect(evidenceReceiptChangeHolds(file, null, 'not json')).toBe(false);
    expect(evidenceReceiptChangeHolds(file, null, text(receiptFor('bin-parse', S)))).toBe(false);
    expect(evidenceReceiptChangeHolds(file, null, text(receiptFor('root-compile', 'b'.repeat(40))))).toBe(false);
    expect(evidenceReceiptChangeHolds(file, null, text(receiptFor('root-compile', S, { checkState: 'UNMET' })))).toBe(false);
    expect(evidenceReceiptChangeHolds(file, null, text(receiptFor('root-compile', S, { sourceRootCleanAtEmit: false })))).toBe(false);
    expect(evidenceReceiptChangeHolds(file, null, text({ ...receiptFor('root-compile', S), extra: 'x' }))).toBe(false);
  });
});

test.describe('the production classifier over real commits', () => {
  test('adding a verifying receipt is documentary; every other shape is substantive', () => {
    const r = repo();
    try {
      const file = certificationReceiptPath(S, 'root-compile');
      const added = r.commitFile(file, text(receiptFor('root-compile', S)));
      expect(r.violations(added, [file])).toEqual([]);
      // Editing the committed receipt (even to another verifying one) is substantive.
      const edited = r.commitFile(file, text(receiptFor('root-compile', S, { checkId: 'cmd-other' })));
      expect(r.violations(edited, [file])).toEqual([file]);
      const removed = r.removeFile(file);
      expect(r.violations(removed, [file])).toEqual([file]);
      // A tampered body, another subject filed under this name, and a non-receipt path.
      const tamperedFile = certificationReceiptPath(S, 'bin-parse');
      const tampered = r.commitFile(tamperedFile, text({ ...receiptFor('bin-parse', S), checkState: 'UNMET' }));
      expect(r.violations(tampered, [tamperedFile])).toEqual([tamperedFile]);
      const misfiled = certificationReceiptPath(S, 'structural-invariants');
      const wrongSubject = r.commitFile(misfiled, text(receiptFor('bin-parse', S)));
      expect(r.violations(wrongSubject, [misfiled])).toEqual([misfiled]);
      const stray = `evidence/certification/${S}/notes.txt`;
      const strayCommit = r.commitFile(stray, 'free text\n');
      expect(r.violations(strayCommit, [stray])).toEqual([stray]);
    } finally {
      r.cleanup();
    }
  });
});
