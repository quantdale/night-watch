// R5-11 / review-5 task A9.1 — the append-only canonical claim journal.
//
// Three canonical docs commits reached `main` with no recorded claim and nothing
// could prove it. These tests drive the production journal over REAL synthetic Git
// repositories: a covered chain passes, a commit made outside every claim window
// fails by name, the journal-only commit is exempt, windows may not overlap or dangle,
// and the journal itself is append-only (an OPEN claim may be closed; nothing else changes).

import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  CLAIM_JOURNAL_PATH,
  evaluateJournalAppendOnly,
  inspectClaimJournal,
  parseClaimJournal,
  validateClaimJournalStructure,
} from '../../bin/lib/claim-journal.mjs';

const ROOT = path.join(__dirname, '..', '..');

interface Repo { readonly root: string; write(file: string, text: string): void; commit(message: string): string; inspect(): ReturnType<typeof inspectClaimJournal>; cleanup(): void }

function repo(): Repo {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-claims-'));
  const environment = { PATH: process.env.PATH ?? '', HOME: root, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'nw', GIT_AUTHOR_EMAIL: 'nw@example.invalid', GIT_COMMITTER_NAME: 'nw', GIT_COMMITTER_EMAIL: 'nw@example.invalid' };
  const git = (args: string[]) => spawnSync('git', args, { cwd: root, env: environment, encoding: 'utf8', shell: false });
  git(['init', '--quiet', '-b', 'main']);
  const write = (file: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  const commit = (message: string): string => {
    git(['add', '--all']);
    git(['commit', '--quiet', '--no-gpg-sign', '-m', message]);
    return (git(['rev-parse', 'HEAD']).stdout ?? '').trim();
  };
  return {
    root,
    write,
    commit,
    inspect: () => inspectClaimJournal({
      readText: (relative) => { try { return fs.readFileSync(path.join(root, relative), 'utf8'); } catch { return null; } },
      git: (args) => { const result = git(args); return { status: result.status, stdout: result.stdout ?? '' }; },
    }),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

const journal = (era: string, lines: string[]) => `CLAIM_JOURNAL_PROTOCOL_VERSION: nightwatch.claim-journal.v1\nERA_START_SHA: ${era}\n${lines.join('\n')}\n`;
const claim = (id: string, base: string, tip: string, released = '2026-10-02T12:00:00Z') => `CLAIM: ${id} | role=SESSION | task=task-one | created=2026-10-02T10:00:00Z | released=${tip === 'OPEN' ? 'OPEN' : released} | base=${base} | tip=${tip}`;

test.describe('R5-11 claim journal coverage', () => {
  test('a chain covered by claim windows passes and an unclaimed canonical commit fails by name', () => {
    const r = repo();
    try {
      r.write('a.txt', 'era\n');
      const era = r.commit('era start');
      r.write('a.txt', 'one\n');
      const one = r.commit('session work one');
      r.write('a.txt', 'two\n');
      const two = r.commit('session work two');
      r.write(CLAIM_JOURNAL_PATH, journal(era, [claim('sess-aaaaaaaaaaaa', era, two)]));
      r.commit('record the claim');
      expect(r.inspect().errors).toEqual([]);
      // A canonical commit made after the window closed, under no claim.
      r.write('a.txt', 'three\n');
      const stray = r.commit('canonical edit with no claim');
      const verdict = r.inspect();
      expect(verdict.errors).toEqual([expect.stringContaining(`CLAIM_JOURNAL_UNCOVERED_COMMIT: ${stray}`)]);
      void one;
    } finally {
      r.cleanup();
    }
  });

  test('the journal-only commit is the record, not an unclaimed change; a mixed commit is not exempt', () => {
    const r = repo();
    try {
      r.write('a.txt', 'era\n');
      const era = r.commit('era start');
      r.write(CLAIM_JOURNAL_PATH, journal(era, []));
      r.commit('journal only');
      expect(r.inspect().errors).toEqual([]);
      r.write(CLAIM_JOURNAL_PATH, `${journal(era, [])}\nprose\n`);
      r.write('b.txt', 'other\n');
      const mixed = r.commit('journal plus a source file');
      expect(r.inspect().errors.join(' ')).toContain(`CLAIM_JOURNAL_UNCOVERED_COMMIT: ${mixed}`);
    } finally {
      r.cleanup();
    }
  });

  test('an OPEN window covers every later commit, is reported as live, and at most one may be OPEN', () => {
    const r = repo();
    try {
      r.write('a.txt', 'era\n');
      const era = r.commit('era start');
      r.write(CLAIM_JOURNAL_PATH, journal(era, [claim('sess-bbbbbbbbbbbb', era, 'OPEN')]));
      r.commit('open the claim');
      r.write('a.txt', 'work\n');
      r.commit('work under the live claim');
      const verdict = r.inspect();
      expect(verdict.errors).toEqual([]);
      expect(verdict.info.join(' ')).toContain('CLAIM_JOURNAL_OPEN_WINDOW: sess-bbbbbbbbbbbb');
      expect(validateClaimJournalStructure(parseClaimJournal(journal(era, [claim('sess-cccccccccccc', era, 'OPEN'), claim('sess-dddddddddddd', era, 'OPEN')]))).join(' ')).toContain('CLAIM_JOURNAL_MULTIPLE_OPEN');
    } finally {
      r.cleanup();
    }
  });

  test('overlapping, dangling and inverted windows are errors', () => {
    const r = repo();
    try {
      r.write('a.txt', 'era\n');
      const era = r.commit('era start');
      r.write('a.txt', 'one\n');
      const one = r.commit('one');
      r.write('a.txt', 'two\n');
      const two = r.commit('two');
      r.write(CLAIM_JOURNAL_PATH, journal(era, [claim('sess-eeeeeeeeeeee', era, two), claim('sess-ffffffffffff', one, two)]));
      r.commit('overlapping windows');
      expect(r.inspect().errors.join(' ')).toContain('CLAIM_JOURNAL_WINDOWS_OVERLAP');
      r.write(CLAIM_JOURNAL_PATH, journal(era, [claim('sess-eeeeeeeeeeee', era, '9'.repeat(40))]));
      r.commit('dangling tip');
      expect(r.inspect().errors.join(' ')).toContain('CLAIM_JOURNAL_WINDOW_UNRESOLVED');
      r.write(CLAIM_JOURNAL_PATH, journal(era, [claim('sess-eeeeeeeeeeee', two, one)]));
      r.commit('inverted window');
      expect(r.inspect().errors.join(' ')).toMatch(/CLAIM_JOURNAL_WINDOW_(INVERTED|UNRESOLVED)/);
    } finally {
      r.cleanup();
    }
  });

  test('a missing journal and an unresolvable era start fail closed', () => {
    const r = repo();
    try {
      r.write('a.txt', 'era\n');
      r.commit('era start');
      expect(r.inspect().errors.join(' ')).toContain('CLAIM_JOURNAL_MISSING');
      r.write(CLAIM_JOURNAL_PATH, journal('8'.repeat(40), []));
      r.commit('journal with an era that is not an ancestor');
      expect(r.inspect().errors.join(' ')).toContain('CLAIM_JOURNAL_ERA_START_UNRESOLVED');
    } finally {
      r.cleanup();
    }
  });

  test('structural validation rejects malformed claims, gaps and protocol lines', () => {
    const era = 'a'.repeat(40);
    const verdict = validateClaimJournalStructure(parseClaimJournal([
      'CLAIM_JOURNAL_PROTOCOL_VERSION: nightwatch.claim-journal.v0',
      'ERA_START_SHA: short',
      'GAP: nothex | too short',
      `CLAIM: x | role=ROOT | task=Bad_Task | created=yesterday | released=soon | base=short | tip=nothex`,
      `CLAIM: sess-gggggggggggg | role=SESSION | task=task-one | created=UNRECORDED | released=OPEN | base=${era} | tip=${era}`,
      `CLAIM: sess-gggggggggggg | role=SESSION | task=task-one | created=UNRECORDED | released=2026-10-02T12:00:00Z | base=${era} | tip=${era}`,
    ].join('\n')));
    const text = verdict.join('\n');
    for (const code of ['CLAIM_JOURNAL_PROTOCOL_UNSUPPORTED', 'CLAIM_JOURNAL_ERA_START_INVALID', 'CLAIM_JOURNAL_GAP_INVALID', 'CLAIM_JOURNAL_CLAIM_INVALID', 'CLAIM_JOURNAL_CLAIM_DUPLICATE']) expect(text, code).toContain(code);
    const duplicate = parseClaimJournal(`CLAIM_JOURNAL_PROTOCOL_VERSION: ${'nightwatch.claim-journal.v1'}\nCLAIM_JOURNAL_PROTOCOL_VERSION: nightwatch.claim-journal.v1\nERA_START_SHA: ${era}\nERA_START_SHA: ${era}\n`);
    expect(duplicate.errors.join(' ')).toContain('CLAIM_JOURNAL_DUPLICATE_FIELD');
  });
});

test.describe('R5-11 claim journal is append-only', () => {
  const era = 'a'.repeat(40);
  const base = journal(era, ['GAP: ' + 'b'.repeat(40) + ' | an earlier canonical commit with no claim', claim('sess-hhhhhhhhhhhh', era, 'c'.repeat(40)), claim('sess-iiiiiiiiiiii', 'c'.repeat(40), 'OPEN')]);

  test('closing an OPEN claim (same identity and base) and appending are allowed', () => {
    const closed = base.replace(claim('sess-iiiiiiiiiiii', 'c'.repeat(40), 'OPEN'), claim('sess-iiiiiiiiiiii', 'c'.repeat(40), 'd'.repeat(40)));
    expect(evaluateJournalAppendOnly(base, closed)).toEqual([]);
    expect(evaluateJournalAppendOnly(base, `${base}${claim('sess-jjjjjjjjjjjj', 'd'.repeat(40), 'OPEN')}\nmore prose\n`)).toEqual([]);
  });

  test('editing a closed claim, removing a claim or a gap, or moving the era start is a rewrite', () => {
    const edit = base.replace('task=task-one', 'task=task-two');
    expect(evaluateJournalAppendOnly(base, edit).join(' ')).toContain('CLAIM_JOURNAL_REWRITTEN');
    expect(evaluateJournalAppendOnly(base, base.replace(/CLAIM: sess-hhhhhhhhhhhh[^\n]*\n/, '')).join(' ')).toContain('was removed');
    expect(evaluateJournalAppendOnly(base, base.replace(/GAP:[^\n]*\n/, '')).join(' ')).toContain('recorded gap');
    expect(evaluateJournalAppendOnly(base, base.replace(`ERA_START_SHA: ${era}`, `ERA_START_SHA: ${'e'.repeat(40)}`)).join(' ')).toContain('ERA_START_SHA changed');
    // Re-basing an OPEN claim is not "closing" it.
    const rebased = base.replace(claim('sess-iiiiiiiiiiii', 'c'.repeat(40), 'OPEN'), claim('sess-iiiiiiiiiiii', 'f'.repeat(40), 'OPEN'));
    expect(evaluateJournalAppendOnly(base, rebased).join(' ')).toContain('was edited');
  });

  test('a rewrite committed to the real history of a repository is reported with its commit', () => {
    const r = repo();
    try {
      r.write('a.txt', 'era\n');
      const eraSha = r.commit('era start');
      r.write('a.txt', 'one\n');
      const one = r.commit('work');
      r.write(CLAIM_JOURNAL_PATH, journal(eraSha, [claim('sess-kkkkkkkkkkkk', eraSha, one)]));
      r.commit('record');
      expect(r.inspect().errors).toEqual([]);
      r.write(CLAIM_JOURNAL_PATH, journal(eraSha, [claim('sess-kkkkkkkkkkkk', eraSha, one).replace('task-one', 'task-two')]));
      const edit = r.commit('rewrite a closed claim');
      expect(r.inspect().errors.join(' ')).toContain(`CLAIM_JOURNAL_REWRITTEN`);
      expect(r.inspect().errors.join(' ')).toContain(`(commit ${edit.slice(0, 8)})`);
    } finally {
      r.cleanup();
    }
  });
});

test('the real repository journal is valid and covers its own history', () => {
  const git = (args: string[]) => { const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', shell: false }); return { status: result.status, stdout: result.stdout ?? '' }; };
  const verdict = inspectClaimJournal({ readText: (relative) => { try { return fs.readFileSync(path.join(ROOT, relative), 'utf8'); } catch { return null; } }, git });
  expect(verdict.errors).toEqual([]);
});
