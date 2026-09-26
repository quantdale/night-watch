// DEF-FC-04: cross-campaign task/continuity metadata drift.
//
// The `## Routing and safety` block of .agent/ACTIVE_TASK.md is what an agent
// reads to decide what it may write. A campaign-open commit rewrites the
// identity fields and leaves the prose, so the block drifts silently: it
// entered at 48c0a60 for nightwatch-plan-explain-coherence-v1 ("IMPLEMENTATION
// AUTHORIZED: one focused coherence test file only", worktree
// session/nightwatch-plan-explain-coherenc-faaf601a), survived verbatim into
// nightwatch-frontier-completion-reliability-v1 at 0c5cb42, and was still
// there when that campaign closed at 868761d — while FC-1's own execution
// prompt authorized source, tests, contracts, CLI, documentation, commits and
// pushes, and its STATE.md recorded a different worktree entirely.
//
// agent:check returned PASS on that document throughout, because continuity v2
// validates structured fields and the prose block is read by no rule.
//
// These tests bind the rule to the real historical documents, not only to
// hand-built fixtures: a fixture proves the checker rejects what the fixture
// says, while history proves it would have caught the defect that happened.
//
// Pure text analysis plus `git show` of committed history: no network, no
// browser, no writes.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { inspectActiveTaskRouting } from '../../bin/agent-state.mjs';

const DRIFTED_HEAD = '868761d2128d5155db454623bc2fa01622a57d33';
const FC1_TASK_ID = 'nightwatch-frontier-completion-reliability-v1';
const RETIRED_WORKTREE = 'session/nightwatch-plan-explain-coherenc-faaf601a';

function show(pathAtSha: string): string {
  return execFileSync('git', ['show', pathAtSha], { encoding: 'utf8' });
}

function field(text: string, name: string): string {
  const match = new RegExp(`^${name}: (.+)$`, 'm').exec(text);
  if (match === null) throw new Error(`missing field ${name}`);
  return match[1] ?? '';
}

function liveWorktreeBranches(): string[] {
  const porcelain = execFileSync('git', ['worktree', 'list', '--porcelain'], { encoding: 'utf8' });
  return porcelain
    .split(/\r?\n/)
    .filter((line) => line.startsWith('branch refs/heads/'))
    .map((line) => line.slice('branch refs/heads/'.length));
}

test.describe('active-task routing binding (DEF-FC-04)', () => {
  test('the real drifted document is rejected by the occurrence scan', () => {
    // Everything below is read from the commit itself. The two directives the
    // document should have carried are taken from its own sibling records —
    // the active task ID and the branch its STATE.md recorded — so nothing is
    // invented to make the rule fire.
    const active = show(`${DRIFTED_HEAD}:.agent/ACTIVE_TASK.md`);
    const state = show(`${DRIFTED_HEAD}:.agent/tasks/${FC1_TASK_ID}/STATE.md`);
    const taskId = field(active, 'Task ID');
    const branch = field(state, 'Branch');

    expect(taskId).toBe(FC1_TASK_ID);
    expect(branch).toBe('session/nightwatch-frontier-completion-r-9e1b3a60');
    expect(active).toContain(RETIRED_WORKTREE);

    const declared = active.replace(
      '## Routing and safety\n\n```\n',
      `## Routing and safety\n\n\`\`\`\nCAMPAIGN: ${taskId}\nSESSION WORKTREE: ${branch}\n`
    );
    const result = inspectActiveTaskRouting(declared, taskId, branch, []);

    expect(result.errors.join('\n')).toContain('ACTIVE_TASK_ROUTING_FOREIGN_WORKTREE_REFERENCE');
    expect(result.errors.join('\n')).toContain(RETIRED_WORKTREE);
  });

  test('the real undeclared documents fail closed rather than passing', () => {
    // Absence is not acceptance. Every ACTIVE_TASK.md that carried the drifted
    // block declared neither directive, and each must fail.
    for (const sha of ['48c0a60', '0c5cb42', DRIFTED_HEAD]) {
      const active = show(`${sha}:.agent/ACTIVE_TASK.md`);
      const result = inspectActiveTaskRouting(active, field(active, 'Task ID'), undefined);
      expect(result.errors, `expected ${sha} to fail closed`).toContain(
        'ACTIVE_TASK_ROUTING_CAMPAIGN_MISSING: routing block declares no CAMPAIGN'
      );
      expect(result.errors).toContain(
        'ACTIVE_TASK_ROUTING_SESSION_WORKTREE_MISSING: routing block declares no SESSION WORKTREE'
      );
    }
  });

  test('a predecessor campaign declaration is named on both sides', () => {
    const text = [
      '# Active Task',
      '',
      'Task ID: campaign-b',
      '',
      '## Routing and safety',
      '',
      '```',
      'CAMPAIGN: campaign-a',
      'SESSION WORKTREE: session/b-0000',
      '```',
      '',
    ].join('\n');
    const result = inspectActiveTaskRouting(text, 'campaign-b', 'session/b-0000', ['session/b-0000']);
    expect(result.errors.join('\n')).toContain(
      'ACTIVE_TASK_ROUTING_CAMPAIGN_DRIFT: routing block declares CAMPAIGN campaign-a but the active task is campaign-b'
    );
  });

  test('a worktree declaration that contradicts STATE.md is rejected', () => {
    const text = [
      '## Routing and safety',
      '',
      '```',
      'CAMPAIGN: campaign-b',
      'SESSION WORKTREE: session/b-0000',
      '```',
      '',
    ].join('\n');
    const result = inspectActiveTaskRouting(text, 'campaign-b', 'session/b-9999', ['session/b-0000']);
    expect(result.errors.join('\n')).toContain('ACTIVE_TASK_ROUTING_SESSION_WORKTREE_DRIFT');
  });

  test('a missing routing block fails closed', () => {
    const result = inspectActiveTaskRouting('# Active Task\n\nTask ID: campaign-b\n', 'campaign-b', 'session/b-0000');
    expect(result.errors).toEqual([
      'ACTIVE_TASK_ROUTING_BLOCK_MISSING: no `## Routing and safety` section',
    ]);
  });

  test('a duplicate directive is an error even when the values agree', () => {
    const text = [
      '## Routing and safety',
      '',
      '```',
      'CAMPAIGN: campaign-b',
      'CAMPAIGN: campaign-b',
      'SESSION WORKTREE: session/b-0000',
      '```',
      '',
    ].join('\n');
    const result = inspectActiveTaskRouting(text, 'campaign-b', 'session/b-0000', ['session/b-0000']);
    expect(result.errors.join('\n')).toContain('ACTIVE_TASK_ROUTING_DUPLICATE_DIRECTIVE: CAMPAIGN declared 2 times');
  });

  test('the current active task satisfies the rule it introduces', () => {
    // The working tree, not HEAD: the live document is the one under check,
    // and a rule that only ever validated committed history would go stale the
    // moment a campaign opened.
    const active = fs.readFileSync(path.join(process.cwd(), '.agent/ACTIVE_TASK.md'), 'utf8');
    const taskId = field(active, 'Task ID');
    const state = fs.readFileSync(path.join(process.cwd(), '.agent/tasks', taskId, 'STATE.md'), 'utf8');
    const result = inspectActiveTaskRouting(active, taskId, field(state, 'Branch'), liveWorktreeBranches());
    expect(result.errors).toEqual([]);
  });
});

test.describe('D-04 / task 4.10 — SESSION_DECLARED_ABSENT_EXPECTED in ci/clean modes', () => {
  const routing = [
    '## Routing and safety',
    '',
    '```',
    'CAMPAIGN: campaign-c',
    'SESSION WORKTREE: session/c-1111',
    '```',
    '',
  ].join('\n');

  test('ci mode: an absent declared worktree matching the STATE branch is an expected classification', () => {
    const result = inspectActiveTaskRouting(routing, 'campaign-c', 'session/c-1111', [], 'CI');
    expect(result.errors).toEqual([]);
    expect(result.warnings.join('\n')).toContain(
      'ACTIVE_TASK_SESSION_DECLARED_ABSENT_EXPECTED: declared session/c-1111'
    );
  });

  test('clean mode: the same classification holds', () => {
    const result = inspectActiveTaskRouting(routing, 'campaign-c', 'session/c-1111', [], 'CLEAN');
    expect(result.errors).toEqual([]);
    expect(result.warnings.join('\n')).toContain('ACTIVE_TASK_SESSION_DECLARED_ABSENT_EXPECTED');
  });

  test('local mode (no gate label): the absent worktree still fails hard', () => {
    const result = inspectActiveTaskRouting(routing, 'campaign-c', 'session/c-1111', [], null);
    expect(result.errors.join('\n')).toContain(
      'ACTIVE_TASK_SESSION_WORKTREE_MISSING: declared session/c-1111 is not a registered live worktree on that branch'
    );
    expect(result.warnings).toEqual([]);
  });

  test('negative probe: a branch mismatch is never expected, even in ci mode', () => {
    const result = inspectActiveTaskRouting(routing, 'campaign-c', 'session/other-2222', [], 'CI');
    expect(result.warnings).toEqual([]);
    expect(result.errors.join('\n')).toContain('ACTIVE_TASK_ROUTING_SESSION_WORKTREE_DRIFT');
    expect(result.errors.join('\n')).toContain(
      'ACTIVE_TASK_SESSION_WORKTREE_MISSING: declared session/c-1111'
    );
  });

  test('negative probe: another routing error keeps the hard failure in ci mode', () => {
    const drifted = routing.replace('CAMPAIGN: campaign-c', 'CAMPAIGN: campaign-x');
    const result = inspectActiveTaskRouting(drifted, 'campaign-c', 'session/c-1111', [], 'CI');
    expect(result.warnings).toEqual([]);
    expect(result.errors.join('\n')).toContain('ACTIVE_TASK_ROUTING_CAMPAIGN_DRIFT');
    expect(result.errors.join('\n')).toContain('ACTIVE_TASK_SESSION_WORKTREE_MISSING');
  });

  test('a registered live worktree never needs the classification', () => {
    const result = inspectActiveTaskRouting(routing, 'campaign-c', 'session/c-1111', ['session/c-1111'], 'CI');
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
