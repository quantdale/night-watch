// R5-05 / review-5 task A4.1 — the checkpoint-binding collector, behaviourally.
//
// `collectCheckpointBindingFacts` decides whether a release probe's working-tree
// measurement describes the certified checkpoint S. Every relation is driven
// here against a REAL synthetic Git repository, so a mutant that pins HEAD to S,
// stubs the porcelain read, hard-codes the range class, empties the range
// callback or stubs the receipt verifier fails an assertion — not merely an
// `includes(literal)` anchor.

import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bindingReceiptVerifier, collectCheckpointBindingFacts } from '../../bin/lib/checkpoint-binding.mjs';

interface Repo {
  readonly root: string;
  S: string;
  git(args: string[]): string | null;
  write(file: string, text: string): void;
  commit(message: string): string;
  facts(sha?: string | null, reader?: (args: string[]) => string | null): ReturnType<typeof collectCheckpointBindingFacts>;
  cleanup(): void;
}

function repo(): Repo {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-bindfacts-'));
  const environment = { PATH: process.env.PATH ?? '', HOME: root, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'nw', GIT_AUTHOR_EMAIL: 'nw@example.invalid', GIT_COMMITTER_NAME: 'nw', GIT_COMMITTER_EMAIL: 'nw@example.invalid', LANG: 'C' };
  const raw = (args: string[]) => spawnSync('git', args, { cwd: root, env: environment, encoding: 'utf8', shell: false });
  const git = (args: string[]): string | null => {
    const result = raw(args);
    return result.status === 0 ? (result.stdout ?? '') : null;
  };
  raw(['init', '--quiet', '-b', 'main']);
  const write = (file: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  const commit = (message: string): string => {
    raw(['add', '--all']);
    raw(['commit', '--quiet', '--no-gpg-sign', '-m', message]);
    return (raw(['rev-parse', 'HEAD']).stdout ?? '').trim();
  };
  write('docs/DECISIONS.md', 'seed\n');
  write('lib/code.ts', 'export const x = 1;\n');
  const result: Repo = {
    root,
    S: '',
    git,
    write,
    commit,
    facts: (sha, reader) => collectCheckpointBindingFacts({ root, substantiveSha: sha === undefined ? result.S : sha, git: reader ?? git }),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
  result.S = commit('S');
  return result;
}

test.describe('R5-05 checkpoint-binding collector', () => {
  test('HEAD == S on a clean tree is bound, and every fact is read from Git', () => {
    const r = repo();
    try {
      const facts = r.facts();
      expect(facts.headSha).toBe(r.S);
      expect(facts.treeClean).toBe(true);
      expect(facts.rangeClass).toBe('SAME');
      expect(facts.binding.atCheckpoint).toBe(true);
    } finally {
      r.cleanup();
    }
  });

  test('the reported HEAD is the live HEAD, never the certified checkpoint (a substantive descendant reads its own head)', () => {
    const r = repo();
    try {
      r.write('lib/code.ts', 'export const x = 2;\n');
      const head = r.commit('substantive');
      const facts = r.facts();
      expect(facts.headSha).toBe(head);
      expect(facts.headSha).not.toBe(r.S);
    } finally {
      r.cleanup();
    }
  });

  test('a dirty tree is never at the checkpoint, even at HEAD == S', () => {
    const r = repo();
    try {
      r.write('stray.txt', 'untracked\n');
      const facts = r.facts();
      expect(facts.treeClean).toBe(false);
      expect(facts.binding.atCheckpoint).toBe(false);
      // A tracked modification is dirty too.
      fs.rmSync(path.join(r.root, 'stray.txt'));
      r.write('docs/DECISIONS.md', 'edited, uncommitted\n');
      expect(r.facts().treeClean).toBe(false);
    } finally {
      r.cleanup();
    }
  });

  test('a clean documentary descendant stays bound; a substantive descendant does not', () => {
    const r = repo();
    try {
      r.write('docs/DECISIONS.md', 'seed\nmore prose\n');
      r.commit('documentary descendant');
      const documentary = r.facts();
      expect(documentary.rangeClass).toBe('DOCUMENTARY_DESCENDANT');
      expect(documentary.binding.atCheckpoint).toBe(true);
      r.write('lib/code.ts', 'export const x = 3;\n');
      r.commit('substantive descendant');
      const substantive = r.facts();
      expect(substantive.rangeClass).toBe('SUBSTANTIVE_DESCENDANT');
      expect(substantive.binding.atCheckpoint).toBe(false);
    } finally {
      r.cleanup();
    }
  });

  test('the changed-file list is honest: a rename that hides a source deletion is substantive', () => {
    const r = repo();
    try {
      // `git mv` of a tracked source into an approved documentation path.
      fs.rmSync(path.join(r.root, 'docs/DECISIONS.md'));
      r.write('docs/ROADMAP.md', 'seed\n');
      r.git(['mv', 'lib/code.ts', 'docs/CURRENT_STATE.md']);
      r.commit('docs: relocate');
      const facts = r.facts();
      expect(facts.rangeClass).toBe('SUBSTANTIVE_DESCENDANT');
      expect(facts.binding.atCheckpoint).toBe(false);
    } finally {
      r.cleanup();
    }
  });

  test('unreadable Git facts, a missing S and an unresolvable S all fail closed', () => {
    const r = repo();
    try {
      const unreadable = r.facts(r.S, () => null);
      expect(unreadable.headSha).toBeNull();
      expect(unreadable.treeClean).toBeNull();
      expect(unreadable.binding.atCheckpoint).toBe(false);
      expect(r.facts(null).binding.atCheckpoint).toBe(false);
      const unresolvable = r.facts('0'.repeat(40));
      expect(unresolvable.binding.atCheckpoint).toBe(false);
      expect(['SAME', 'DOCUMENTARY_DESCENDANT']).not.toContain(unresolvable.rangeClass);
      // Clean tree + readable HEAD but a failing diff read: the range is not documentary.
      r.write('docs/DECISIONS.md', 'seed\nmore\n');
      r.commit('descendant');
      const failingDiff = r.facts(r.S, (args) => (args[0] === 'diff' ? null : r.git(args)));
      expect(failingDiff.binding.atCheckpoint).toBe(false);
    } finally {
      r.cleanup();
    }
  });

  test('the shared receipt verifier is the PRODUCTION verifier: an unpersisted digest never verifies', () => {
    const r = repo();
    try {
      const verify = bindingReceiptVerifier(r.root);
      expect(verify('authoritative-gate', `receipt:sha256:${'0'.repeat(24)}`, r.S)).toBe(false);
      expect(verify('authoritative-gate', 'not-a-digest', r.S)).toBe(false);
    } finally {
      r.cleanup();
    }
  });
});
