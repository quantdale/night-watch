// R5-01 / review-5 task A1.1 — archive-move integrity.
//
// The R4-13 archive-move approval accepted ANY file at ANY depth under
// `openspec/changes/archive/<dated>-<change>/`, and a range was judged through
// its aggregate diff. A test file added in one commit and "archived" in the
// next therefore classified DOCUMENTARY_DESCENDANT while Playwright discovery
// still picked it up. These tests drive the production classifier against REAL
// synthetic Git repositories (never hand-shaped facts).

import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ARCHIVE_MOVE_PATH_RE,
  UNLISTABLE_RANGE_VIOLATION,
  archiveMoveHolds,
  checkpointRoleViolations,
  commitTouchedPaths,
} from '../../bin/lib/checkpoint-role.mjs';
import { isApprovedCheckpointPath } from '../../bin/agent-continuity-protocol.mjs';

interface Fixture {
  readonly root: string;
  git(args: string[]): string;
  write(file: string, text: string): void;
  move(from: string, to: string): void;
  commit(message: string): string;
  cleanup(): void;
}

function fixture(): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-a11-'));
  const git = (args: string[]): string => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', shell: false });
    if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
    return (result.stdout ?? '').trim();
  };
  git(['init', '--quiet', '-b', 'main']);
  git(['config', 'user.email', 'probe@nightwatch.local']);
  git(['config', 'user.name', 'probe']);
  const write = (file: string, text: string): void => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  return {
    root,
    git,
    write,
    move: (from, to) => {
      fs.mkdirSync(path.dirname(path.join(root, to)), { recursive: true });
      fs.renameSync(path.join(root, from), path.join(root, to));
    },
    commit: (message) => {
      git(['add', '--all']);
      git(['commit', '--quiet', '--no-gpg-sign', '-m', message]);
      return git(['rev-parse', 'HEAD']);
    },
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

const ARCHIVE_DIR = 'openspec/changes/archive/2026-10-02-fx';

test.describe('R5-01 archive-move integrity', () => {
  test('a test file added in one commit and archived in the next is SUBSTANTIVE (the two-commit smuggle)', () => {
    const fx = fixture();
    try {
      fx.write('docs/seed.md', 'seed\n');
      const base = fx.commit('base');
      fx.write('openspec/changes/fx/tests/evil.test.ts', "import { test } from '@playwright/test';\ntest('smuggled', () => {});\n");
      fx.commit('add a test file under a change directory');
      fx.move('openspec/changes/fx/tests/evil.test.ts', `${ARCHIVE_DIR}/tests/evil.test.ts`);
      const head = fx.commit('archive the test file');
      const archived = `${ARCHIVE_DIR}/tests/evil.test.ts`;
      // The aggregate S..HEAD diff names only the archived destination — exactly
      // what the callers hand the classifier.
      expect(fx.git(['diff', '--name-only', '--no-renames', `${base}..${head}`]).split('\n')).toContain(archived);
      const violations = checkpointRoleViolations(fx.root, [archived], { kind: 'range', from: base, to: head });
      expect(violations).toContain(archived);
      // And with NO aggregate file listed at all (the add and the move cancel in
      // a different shape), the per-commit judgement alone still catches it.
      const commitByCommit = checkpointRoleViolations(fx.root, [], { kind: 'range', from: base, to: head });
      expect(commitByCommit).toContain('openspec/changes/fx/tests/evil.test.ts');
    } finally {
      fx.cleanup();
    }
  });

  test('a source file added and deleted inside one range has no net aggregate path but is still SUBSTANTIVE', () => {
    const fx = fixture();
    try {
      fx.write('docs/seed.md', 'seed\n');
      const base = fx.commit('base');
      fx.write('src/temporary.ts', 'export const x = 1;\n');
      fx.commit('add a source file');
      fs.rmSync(path.join(fx.root, 'src/temporary.ts'));
      const head = fx.commit('remove it again');
      expect(fx.git(['diff', '--name-only', '--no-renames', `${base}..${head}`])).toBe('');
      expect(checkpointRoleViolations(fx.root, [], { kind: 'range', from: base, to: head })).toEqual(['src/temporary.ts']);
    } finally {
      fx.cleanup();
    }
  });

  test('a single-commit archive move that CHANGES the bytes is SUBSTANTIVE', () => {
    const fx = fixture();
    try {
      fx.write('openspec/changes/fx/tasks.md', '# tasks\n');
      fx.commit('seed the change');
      fs.rmSync(path.join(fx.root, 'openspec/changes/fx/tasks.md'));
      fx.write(`${ARCHIVE_DIR}/tasks.md`, '# tasks (ticked while moving)\n');
      const commit = fx.commit('move with changed bytes');
      expect(archiveMoveHolds(fx.root, commit, `${ARCHIVE_DIR}/tasks.md`)).toBe(false);
      expect(checkpointRoleViolations(fx.root, [`${ARCHIVE_DIR}/tasks.md`], { kind: 'commit', commit })).toEqual([`${ARCHIVE_DIR}/tasks.md`]);
    } finally {
      fx.cleanup();
    }
  });

  test('a byte-identical move of a NON-planning file is SUBSTANTIVE even when only the destination is listed', () => {
    const fx = fixture();
    try {
      fx.write('openspec/changes/fx/tests/keep.test.ts', 'export {};\n');
      fx.commit('seed a non-planning file under a change');
      fx.move('openspec/changes/fx/tests/keep.test.ts', `${ARCHIVE_DIR}/tests/keep.test.ts`);
      const commit = fx.commit('move it byte-identically');
      const archived = `${ARCHIVE_DIR}/tests/keep.test.ts`;
      expect(archiveMoveHolds(fx.root, commit, archived)).toBe(false);
      expect(checkpointRoleViolations(fx.root, [archived], { kind: 'commit', commit })).toEqual([archived]);
    } finally {
      fx.cleanup();
    }
  });

  test('a planning change created and byte-identically archived inside one range is DOCUMENTARY', () => {
    const fx = fixture();
    try {
      fx.write('docs/seed.md', 'seed\n');
      const base = fx.commit('base');
      fx.write('openspec/changes/fx/proposal.md', '# p\n');
      fx.write('openspec/changes/fx/specs/cap/spec.md', '# s\n');
      fx.commit('create the planning change');
      fx.move('openspec/changes/fx/proposal.md', `${ARCHIVE_DIR}/proposal.md`);
      fx.move('openspec/changes/fx/specs/cap/spec.md', `${ARCHIVE_DIR}/specs/cap/spec.md`);
      const head = fx.commit('archive it byte-identically');
      const files = fx.git(['diff', '--name-only', '--no-renames', `${base}..${head}`]).split('\n').filter(Boolean);
      expect(checkpointRoleViolations(fx.root, files, { kind: 'range', from: base, to: head })).toEqual([]);
    } finally {
      fx.cleanup();
    }
  });

  test('a range that cannot be listed fails closed for every path', () => {
    const fx = fixture();
    try {
      fx.write('docs/seed.md', 'seed\n');
      const head = fx.commit('base');
      const violations = checkpointRoleViolations(fx.root, ['docs/CURRENT_STATE.md'], { kind: 'range', from: '0'.repeat(40), to: head });
      expect(violations).toContain(UNLISTABLE_RANGE_VIOLATION);
      expect(violations).toContain('docs/CURRENT_STATE.md');
      expect(commitTouchedPaths(fx.root, '0'.repeat(40))).toBeNull();
    } finally {
      fx.cleanup();
    }
  });

  test('the archive destination pattern admits exactly the approved planning shapes', () => {
    const shapes = ['proposal.md', 'design.md', 'audit.md', 'tasks.md', '.openspec.yaml', 'specs/some-capability/spec.md'];
    for (const shape of shapes) {
      const destination = `openspec/changes/archive/2026-10-02-change-one/${shape}`;
      const match = ARCHIVE_MOVE_PATH_RE.exec(destination);
      expect(match, destination).not.toBeNull();
      // The source of every admitted move is itself an approved checkpoint path
      // (the invariant the run-time rule relies on instead of re-checking).
      expect(isApprovedCheckpointPath(`openspec/changes/${match?.[2]}/${match?.[3]}`), shape).toBe(true);
    }
    const rejected = [
      'tests/evil.test.ts',
      'notes.txt',
      'specs/cap/sub/spec.md',
      'specs/cap/spec.md.bak',
      'nested/tasks.md',
      'tasks.md.bak',
      'proposal.mdx',
      '.openspec.yaml.orig',
      'src/index.ts',
    ];
    for (const rest of rejected) {
      expect(ARCHIVE_MOVE_PATH_RE.test(`openspec/changes/archive/2026-10-02-change-one/${rest}`), rest).toBe(false);
    }
    // A change name may not smuggle a path separator, and the date prefix is exact.
    expect(ARCHIVE_MOVE_PATH_RE.test('openspec/changes/archive/2026-10-02-a/b/tasks.md')).toBe(false);
    expect(ARCHIVE_MOVE_PATH_RE.test('openspec/changes/archive/20261002-change/tasks.md')).toBe(false);
  });
});
