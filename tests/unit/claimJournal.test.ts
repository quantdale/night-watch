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
  claimLineDigest,
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
      // Never existed: the era has not begun (reported, not an error).
      const early = r.inspect();
      expect(early.errors).toEqual([]);
      expect(early.info.join(' ')).toContain('CLAIM_JOURNAL_NOT_STARTED');
      r.write(CLAIM_JOURNAL_PATH, journal('8'.repeat(40), []));
      r.commit('journal with an era that is not an ancestor');
      expect(r.inspect().errors.join(' ')).toContain('CLAIM_JOURNAL_ERA_START_UNRESOLVED');
    } finally {
      r.cleanup();
    }
  });

  test('a journal deleted after it existed fails closed instead of reading as not started', () => {
    const r = repo();
    try {
      r.write('a.txt', 'era\n');
      const era = r.commit('era start');
      r.write(CLAIM_JOURNAL_PATH, journal(era, []));
      r.commit('start the journal');
      expect(r.inspect().errors).toEqual([]);
      fs.rmSync(path.join(r.root, CLAIM_JOURNAL_PATH));
      r.commit('delete the journal');
      expect(r.inspect().errors.join(' ')).toContain('CLAIM_JOURNAL_MISSING');
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

// D-168 / campaign task 15.A — the append-only journal admits ONE escape: an
// already-closed claim window may be ADVANCED (its tip moves, identity preserved,
// release time moved forward) where an appended `CORRECTION:` line binds the exact
// sha256 of the line that was replaced. The real terminal maintenance window needed
// exactly this at fcd87fb6: `sess-m14-terminal` had been closed at c289a6cf, and
// the commit that closed it had to be added to its window, which the previous
// session recorded as a prose GAP — correct, but not mechanically admitted, so
// `agent:check` (and therefore HANDOFF_TRUTH and every exact-head CI run) failed.
//
// The escape is modelled on `checkAppendOnlyArchives`
// (`bin/lib/hardening/rules/documentation.mjs`): a replacement is admissible only
// when a declaration binds the exact line digest, the declaration may never be
// spent on a line that is still live, and it is append-only so it can never be
// withdrawn. These probes pin both directions: the escape works when it is used,
// and it licenses NOTHING else.
const ADVANCE_BASE = 'b'.repeat(40);
const ADVANCE_TIP = 'c'.repeat(40);
const advanceLine = (tip: string, released = '2026-10-10T09:30:00Z') => `CLAIM: sess-advance-window | role=MAINTENANCE | task=task-one | created=2026-10-10T09:00:00Z | released=${released} | base=${ADVANCE_BASE} | tip=${tip}`;
const advanceJournal = (lines: string[]) => `CLAIM_JOURNAL_PROTOCOL_VERSION: nightwatch.claim-journal.v1\nERA_START_SHA: ${'a'.repeat(40)}\n${lines.join('\n')}\n`;

test.describe('D-168 an advanced closed claim window is admitted by a bound declaration', () => {
  const closed = advanceLine(ADVANCE_TIP);
  const replaced = advanceJournal([closed]);
  const digest = claimLineDigest(closed);
  const advanced = advanceLine('d'.repeat(40), '2026-10-10T09:45:00Z');
  const correction = `CORRECTION: sess-advance-window | oldLineSha256=${digest} | reason=the maintenance window was re-closed so its tip covers the commit that closed it`;
  const judge = (previous: string, next: string) => evaluateJournalAppendOnly(previous, next, parseClaimJournal(next).corrections);

  test('the SAME advance with no declaration is still CLAIM_JOURNAL_REWRITTEN', () => {
    expect(judge(replaced, advanceJournal([advanced]))).toEqual([
      expect.stringContaining('CLAIM_JOURNAL_REWRITTEN: claim sess-advance-window was edited'),
    ]);
  });

  test('the advance is admitted when the declaration binds the exact replaced line', () => {
    expect(judge(replaced, advanceJournal([advanced, correction]))).toEqual([]);
  });

  test('a declaration bound to a different claim licenses nothing', () => {
    expect(judge(replaced, advanceJournal([advanced, `CORRECTION: sess-other-window | oldLineSha256=${digest} | reason=a different claim name licenses no replacement at all`]))).toEqual([
      expect.stringContaining('CLAIM_JOURNAL_REWRITTEN'),
    ]);
  });

  test('a declaration bound to the wrong line digest licenses nothing', () => {
    expect(judge(replaced, advanceJournal([advanced, `CORRECTION: sess-advance-window | oldLineSha256=${claimLineDigest(advanced)} | reason=a digest that names the new line cannot bind the replaced one`]))).toEqual([
      expect.stringContaining('CLAIM_JOURNAL_REWRITTEN'),
    ]);
  });

  test('a re-flowed old line has a different digest, so a stale declaration covers nothing', () => {
    const reflowed = replaced.replace(' | base=', '  | base=');
    expect(judge(reflowed, advanceJournal([advanced, correction]))).toEqual([
      expect.stringContaining('CLAIM_JOURNAL_REWRITTEN'),
    ]);
  });

  test('the escape never admits an identity change', () => {
    const renamed = advanced.replace('task=task-one', 'task=task-two');
    expect(judge(replaced, advanceJournal([renamed, correction]))).toEqual([
      expect.stringContaining('CLAIM_JOURNAL_REWRITTEN'),
    ]);
  });

  test('the escape never admits a non-advance (release time not moved forward)', () => {
    const sameRelease = advanceLine('d'.repeat(40));
    expect(judge(replaced, advanceJournal([sameRelease, correction]))).toEqual([
      expect.stringContaining('CLAIM_JOURNAL_REWRITTEN'),
    ]);
  });

  test('the escape never admits removing the claim it covers', () => {
    expect(judge(replaced, advanceJournal([correction]))).toEqual([
      expect.stringContaining('CLAIM_JOURNAL_REWRITTEN: claim sess-advance-window was removed'),
    ]);
  });

  test('a declaration is itself append-only and can never be withdrawn to excuse a later edit', () => {
    const declaredText = advanceJournal([closed, correction]);
    const withdrawn = advanceJournal([advanced]);
    const errors = judge(declaredText, withdrawn);
    // Withdrawing the declaration fails closed TWICE over: the entry that was
    // declared must survive unchanged, AND the edit it used to cover is now
    // undeclared. Neither protection alone would be enough.
    expect(errors).toContainEqual(expect.stringContaining('CLAIM_JOURNAL_REWRITTEN: the declared correction for sess-advance-window'));
    expect(errors).toContainEqual(expect.stringContaining('CLAIM_JOURNAL_REWRITTEN: claim sess-advance-window was edited'));
  });

  test('closing an OPEN claim and appending a claim still need no declaration', () => {
    const withOpen = advanceJournal([closed, `CLAIM: sess-open-window | role=SESSION | task=task-one | created=2026-10-10T09:00:00Z | released=OPEN | base=${ADVANCE_BASE} | tip=OPEN`]);
    expect(judge(withOpen, advanceJournal([closed, `CLAIM: sess-open-window | role=SESSION | task=task-one | created=2026-10-10T09:00:00Z | released=2026-10-10T10:00:00Z | base=${ADVANCE_BASE} | tip=${ADVANCE_TIP}`]))).toEqual([]);
    expect(judge(withOpen, `${withOpen}CLAIM: sess-appended-window | role=SESSION | task=task-one | created=2026-10-10T10:05:00Z | released=OPEN | base=${ADVANCE_TIP} | tip=OPEN\n`)).toEqual([]);
  });

  test('a correction is structurally invalid when it names no claim, states no reason or is duplicate', () => {
    const skeleton = advanceJournal([closed]);
    expect(validateClaimJournalStructure(parseClaimJournal(`${skeleton}${correction}\n`)).join(' ')).not.toContain('CLAIM_JOURNAL_CORRECTION');
    expect(validateClaimJournalStructure(parseClaimJournal(`${skeleton}${correction}\n${correction}\n`)).join(' ')).toContain('CLAIM_JOURNAL_CORRECTION_DUPLICATE');
    expect(validateClaimJournalStructure(parseClaimJournal(`${skeleton}CORRECTION: sess-unrecorded | oldLineSha256=${digest} | reason=no such claim exists in this journal\n`)).join(' ')).toContain('CLAIM_JOURNAL_CORRECTION_UNKNOWN_CLAIM');
    expect(validateClaimJournalStructure(parseClaimJournal(`${skeleton}CORRECTION: sess-advance-window | oldLineSha256=notahex | reason=an invalid digest binds nothing\n`)).join(' ')).toContain('CLAIM_JOURNAL_CORRECTION_INVALID');
    expect(validateClaimJournalStructure(parseClaimJournal(`${skeleton}CORRECTION: sess-advance-window | oldLineSha256=${digest} | reason=short\n`)).join(' ')).toContain('CLAIM_JOURNAL_CORRECTION_INVALID');
  });

  test('a correction that covers no replaced line is CLAIM_JOURNAL_CORRECTION_INERT over a real Git history', () => {
    // The inertness guard is what stops a declaration from being a purchased
    // future rewrite: over a real first-parent chain, an entry whose digest names
    // no line that a commit actually replaced fails closed.
    const r = repo();
    try {
      r.write('a.txt', 'era\n');
      const era = r.commit('era start');
      r.write('a.txt', 'one\n');
      const one = r.commit('work');
      r.write(CLAIM_JOURNAL_PATH, `CLAIM_JOURNAL_PROTOCOL_VERSION: nightwatch.claim-journal.v1\nERA_START_SHA: ${era}\nCLAIM: sess-inert-claim | role=SESSION | task=task-one | created=2026-10-02T10:00:00Z | released=2026-10-02T12:00:00Z | base=${era} | tip=${one}\nCORRECTION: sess-inert-claim | oldLineSha256=${claimLineDigest(advanceLine(ADVANCE_TIP))} | reason=this digest names no line any commit replaced in this history\n`);
      r.commit('record an unconsumed declaration');
      expect(r.inspect().errors.join(' ')).toContain('CLAIM_JOURNAL_CORRECTION_INERT');
    } finally {
      r.cleanup();
    }
  });

  test('a real advance over a real Git history passes inspection end to end', () => {
    const r = repo();
    try {
      r.write('a.txt', 'era\n');
      const era = r.commit('era start');
      r.write('a.txt', 'one\n');
      const one = r.commit('work');
      const claimLine = `CLAIM: sess-real-advance | role=MAINTENANCE | task=task-one | created=2026-10-02T10:00:00Z | released=2026-10-02T12:00:00Z | base=${era} | tip=${one}`;
      r.write(CLAIM_JOURNAL_PATH, `CLAIM_JOURNAL_PROTOCOL_VERSION: nightwatch.claim-journal.v1\nERA_START_SHA: ${era}\n${claimLine}\n`);
      const recorded = r.commit('record the claim window');
      // A second commit made under the claim must be added to its window, so the
      // closed window is advanced — exactly the terminal maintenance pattern.
      r.write('a.txt', 'two\n');
      const two = r.commit('work still under the claim');
      const advancedLine = `CLAIM: sess-real-advance | role=MAINTENANCE | task=task-one | created=2026-10-02T10:00:00Z | released=2026-10-02T13:00:00Z | base=${era} | tip=${two}`;
      r.write(CLAIM_JOURNAL_PATH, `CLAIM_JOURNAL_PROTOCOL_VERSION: nightwatch.claim-journal.v1\nERA_START_SHA: ${era}\n${advancedLine}\nCORRECTION: sess-real-advance | oldLineSha256=${claimLineDigest(claimLine)} | reason=the tip was advanced so the window covers the second commit made under the claim\n`);
      r.commit('advance the window with a bound declaration');
      expect(r.inspect().errors).toEqual([]);
      // Removing the declaration, or the claim, fails closed again.
      r.write(CLAIM_JOURNAL_PATH, `CLAIM_JOURNAL_PROTOCOL_VERSION: nightwatch.claim-journal.v1\nERA_START_SHA: ${era}\n${advancedLine}\n`);
      r.commit('withdraw the declaration');
      expect(r.inspect().errors.join(' ')).toContain('CLAIM_JOURNAL_REWRITTEN');
    } finally {
      r.cleanup();
    }
  });
});
