// R2-N6 regression — LIVE_TASK_STATUS is derived from `.agent/ACTIVE_TASK.md`,
// never a literal in `src/`. Opening or closing a task is a documentation-only
// transition: the accepted status word flips with the active task identity
// while the source bytes stay identical.
//
// Three proofs:
//   1. the ledger entry is derived (a re-hardcoded literal fails here first);
//   2. the data-only checker accepts both an open (IN_PROGRESS) and a closed
//      (COMPLETE) task state from docs + derived input alone, and fails closed
//      when the derivation input is missing;
//   3. the real hardening path (`deriveActiveTaskStatus` /
//      `parseGovernedStatusLedger`) resolves the same value from the real
//      `.agent/ACTIVE_TASK.md` preamble.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import {
  DERIVED_FROM_ACTIVE_TASK,
  GOVERNED_STATUS_KEYS,
  checkGovernedStatusWords,
} from '../../src/core/source/censusFigureLedger';

const root = process.cwd();
const ledgerSourcePath = path.join(root, 'src', 'core', 'source', 'censusFigureLedger.ts');

function moduleDigest(): string {
  return createHash('sha256').update(fs.readFileSync(ledgerSourcePath)).digest('hex');
}

test.describe('R2-N6 — LIVE_TASK_STATUS derivation', () => {
  test('the ledger entry carries no task-status literal', () => {
    const entry = GOVERNED_STATUS_KEYS.find((candidate) => candidate.key === 'LIVE_TASK_STATUS');
    expect(entry, 'LIVE_TASK_STATUS must remain a governed key').toBeDefined();
    expect(entry?.currentValue).toBe(DERIVED_FROM_ACTIVE_TASK);
    expect(entry?.derivedFrom).toBe('ACTIVE_TASK_STATUS');
    expect(entry?.currentValue).not.toMatch(/^(IN_PROGRESS|COMPLETE|BLOCKED|NONE)$/);
    // The anti-re-hardcoding guard: the source must not carry a status literal
    // for this key anywhere in the declaration.
    expect(fs.readFileSync(ledgerSourcePath, 'utf8'))
      .not.toMatch(/key: 'LIVE_TASK_STATUS', currentValue: '(?:IN_PROGRESS|COMPLETE|BLOCKED|NONE)'/);
  });

  test('a task open and a task close both pass with no src/ edit', () => {
    const digestBefore = moduleDigest();
    const open = checkGovernedStatusWords(
      [{ path: 'x.md', text: 'LIVE_TASK_STATUS: IN_PROGRESS' }],
      { activeTaskStatus: 'IN_PROGRESS' },
    );
    expect(open.holds, JSON.stringify(open.violations)).toBe(true);
    const closed = checkGovernedStatusWords(
      [{ path: 'x.md', text: 'LIVE_TASK_STATUS: COMPLETE' }],
      { activeTaskStatus: 'COMPLETE' },
    );
    expect(closed.holds, JSON.stringify(closed.violations)).toBe(true);
    expect(moduleDigest()).toBe(digestBefore);
  });

  test('a stated status that contradicts the active task is stale', () => {
    const staleWhenOpen = checkGovernedStatusWords(
      [{ path: 'x.md', text: 'LIVE_TASK_STATUS: COMPLETE' }],
      { activeTaskStatus: 'IN_PROGRESS' },
    );
    expect(staleWhenOpen.holds).toBe(false);
    expect(staleWhenOpen.violations[0]).toMatchObject({
      key: 'LIVE_TASK_STATUS',
      statedValue: 'COMPLETE',
      currentValue: 'IN_PROGRESS',
      reason: 'STALE_STATUS_WORD',
    });
    const staleWhenClosed = checkGovernedStatusWords(
      [{ path: 'x.md', text: 'LIVE_TASK_STATUS: IN_PROGRESS' }],
      { activeTaskStatus: 'COMPLETE' },
    );
    expect(staleWhenClosed.holds).toBe(false);
  });

  test('a missing derivation input fails closed', () => {
    const result = checkGovernedStatusWords([{ path: 'x.md', text: 'LIVE_TASK_STATUS: COMPLETE' }]);
    expect(result.holds).toBe(false);
    expect(result.violations[0]).toMatchObject({ key: 'LIVE_TASK_STATUS', reason: 'DERIVED_VALUE_UNAVAILABLE' });
  });

  test('the hardening path derives the same value from the real active task', () => {
    const activeTaskText = fs.readFileSync(path.join(root, '.agent', 'ACTIVE_TASK.md'), 'utf8');
    const preamble = activeTaskText.split(/\r?\n/).reduce(
      (accumulator: { lines: string[]; done: boolean }, line: string) => {
        if (accumulator.done) return accumulator;
        if (/^##\s+/.test(line)) return { lines: accumulator.lines, done: true };
        accumulator.lines.push(line);
        return accumulator;
      },
      { lines: [], done: false },
    ).lines.join('\n');
    const expected = /^[ \t]*Status:[ \t]*(.+?)[ \t]*$/m.exec(preamble)?.[1]
      ?.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    expect(expected, 'the real ACTIVE_TASK identity must state a Status').toBeTruthy();

    const probe = spawnSync(process.execPath, ['--input-type=module', '-e', [
      "import { deriveActiveTaskStatus, parseGovernedStatusLedger } from './bin/lib/hardening/rules/documentation.mjs';",
      "const resolved = (parseGovernedStatusLedger('TEST') ?? []).find((entry) => entry.key === 'LIVE_TASK_STATUS');",
      "console.log(JSON.stringify({ derived: deriveActiveTaskStatus(), resolved: resolved ? resolved.currentValue : null }));",
    ].join('\n')], { cwd: root, encoding: 'utf8', timeout: 60_000 });
    expect(probe.status, probe.stderr).toBe(0);
    const output = JSON.parse(probe.stdout.trim());
    expect(output.derived).toBe(expected);
    expect(output.resolved).toBe(expected);
  });
});
