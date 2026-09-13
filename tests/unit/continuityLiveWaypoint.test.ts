// Continuity live-waypoint binding (nightwatch-continuity-live-waypoint-binding-v1).
//
// Synthetic fixtures only: the pure protocol/routing/ledger inspectors are
// exercised over disposable task trees and text, never over the live
// `.agent/ACTIVE_TASK.md`. The historical `ebe26ce` documents are read with
// `git show` so the measured defect shape is pinned as a regression.

import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  findStaleNextActionMilestone,
  milestoneIdentitiesAgree,
  parseMilestoneIdentities,
  validateTaskV2,
} from '../../bin/agent-continuity-protocol.mjs';
import { inspectActiveTaskRouting } from '../../bin/agent-state.mjs';
import { inspectLedgerAgreement } from '../../bin/lib/openspec-ledger.mjs';

const PROTOCOL = 'nightwatch.agent-continuity.v2';
const MEASURED_HEAD = 'ebe26ce6b2a946fe0fd55fde3a5022e792a792d0';
const TASK_ID = 'campaign-b';

const tempRoots: string[] = [];

function fixtureRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-waypoint-'));
  tempRoots.push(root);
  return root;
}

test.afterAll(() => {
  for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
});

function stateText(options: {
  status?: string;
  milestoneId?: string;
  completed?: string;
  nextAction?: string;
  snapshot?: string;
  resume?: string;
  phase?: string;
} = {}): string {
  const status = options.status ?? 'IN_PROGRESS';
  const phase = options.phase ?? 'CAMPAIGN_B';
  return [
    '# Task State',
    '',
    '## Identity',
    '',
    `Task ID: ${TASK_ID}`,
    `Phase: ${phase}`,
    `Status: ${status}`,
    'PROJECT_VERDICT_EFFECT: PRESERVE',
    `CONTINUITY_PROTOCOL_VERSION: ${PROTOCOL}`,
    `PHASE_${phase}_STATUS: ${status}`,
    '',
    '## Objective',
    '',
    'Fixture objective.',
    '',
    '## Current Milestone',
    '',
    `Milestone ID: ${options.milestoneId ?? 'G4 — current work'}`,
    '',
    '## Completed Milestones',
    '',
    options.completed ?? 'None.',
    '',
    '## Work In Progress',
    '',
    status === 'COMPLETE' ? 'None.' : 'Fixture work in progress.',
    '',
    '## Exact Next Action',
    '',
    options.nextAction ?? 'Continue the current milestone.',
    '',
    '## Resume Recipe',
    '',
    options.resume ?? 'Resume from the exact next action.',
    '',
    '## Completion Snapshot',
    '',
    options.snapshot ?? 'The task is IN_PROGRESS; no completion snapshot exists yet.',
    '',
  ].join('\n');
}

function activeText(options: {
  status?: string;
  milestone?: string;
  nextAction?: string;
} = {}): string {
  return [
    '# Active Task',
    '',
    `Task ID: ${TASK_ID}`,
    'Phase: CAMPAIGN_B',
    `Status: ${options.status ?? 'IN_PROGRESS'}`,
    `Task directory: .agent/tasks/${TASK_ID}`,
    `Current milestone: ${options.milestone ?? 'G4 — current work'}`,
    `Next action: ${options.nextAction ?? 'Continue the current milestone.'}`,
    'PROJECT_VERDICT_EFFECT: PRESERVE',
    `CONTINUITY_PROTOCOL_VERSION: ${PROTOCOL}`,
    '',
  ].join('\n');
}

function validate(active: string, state: string, reportStatus = 'IN_PROGRESS') {
  return validateTaskV2(
    {
      dir: TASK_ID,
      stateText: state,
      statePath: `.agent/tasks/${TASK_ID}/STATE.md`,
      planText: '## Milestones\n\n- [x] M1 — done\n',
      planPath: `.agent/tasks/${TASK_ID}/PLAN.md`,
      reportText: `# REPORT\n\nTask: ${TASK_ID}\n\nStatus: ${reportStatus}\n`,
      reportPath: `.agent/tasks/${TASK_ID}/REPORT.md`,
      activeText: active,
      activePath: '.agent/ACTIVE_TASK.md',
    },
    { bindActive: true }
  );
}

function errorCodes(result: { errors: Array<{ code: string }> }): string {
  return result.errors.map((entry) => entry.code).join('\n');
}

test.describe('milestone identity extraction', () => {
  test('extracts single tokens and expands compound ranges', () => {
    expect([...parseMilestoneIdentities('G1 — ledger truth')]).toEqual(['G1']);
    const range = parseMilestoneIdentities('G4..G21 execution wave');
    expect(range.has('G4')).toBe(true);
    expect(range.has('G21')).toBe(true);
    expect(range.size).toBe(18);
  });

  test('the measured G1-vs-G4 pair is disjoint; matching identities agree', () => {
    expect(milestoneIdentitiesAgree('G1 — ledger truth and the spec baseline', 'G4..G21 execution wave')).toMatchObject({
      agree: false,
      reason: 'DISJOINT',
    });
    expect(milestoneIdentitiesAgree('G4 — first sentence', 'G4 — a different sentence')).toMatchObject({
      agree: true,
      reason: 'OVERLAP',
    });
  });

  test('a token on one side only is disagreement; none on both sides is not', () => {
    expect(milestoneIdentitiesAgree('the current unit of work', 'G4 — work')).toMatchObject({
      agree: false,
      reason: 'MISSING_ON_ONE_SIDE',
    });
    expect(milestoneIdentitiesAgree('no identity here', 'nor here')).toMatchObject({
      agree: true,
      reason: 'NONE_ON_EITHER_SIDE',
    });
  });
});

test.describe('ACTIVE_TASK milestone drift', () => {
  test('the measured G1-vs-G4 drift fails closed', () => {
    const result = validate(
      activeText({ milestone: 'G1 — ledger truth and the spec baseline' }),
      stateText({ milestoneId: 'G4..G21 execution wave', completed: '- **G1 COMPLETE_LOCAL** — ledger truth.' })
    );
    expect(errorCodes(result)).toContain('ACTIVE_TASK_MILESTONE_DRIFT');
  });

  test('matching milestone identities pass even with different prose', () => {
    const result = validate(
      activeText({ milestone: 'G4 — first sentence' }),
      stateText({ milestoneId: 'G4 — a different sentence' })
    );
    expect(errorCodes(result)).not.toContain('ACTIVE_TASK_MILESTONE_DRIFT');
  });

  test('a token on one side only fails closed', () => {
    const result = validate(activeText({ milestone: 'the current unit of work' }), stateText({ milestoneId: 'G4 — work' }));
    expect(errorCodes(result)).toContain('ACTIVE_TASK_MILESTONE_DRIFT');
  });

  test('a stale next action naming a completed milestone fails closed', () => {
    const result = validate(
      activeText({ milestone: 'G4 — work', nextAction: 'run the G1.2 change<->task pairing measurement' }),
      stateText({
        milestoneId: 'G4..G21 execution wave',
        completed: '- **G1 COMPLETE_LOCAL** — ledger truth and the spec baseline.',
      })
    );
    expect(errorCodes(result)).toContain('ACTIVE_TASK_NEXT_ACTION_STALE');
    expect(errorCodes(result)).not.toContain('ACTIVE_TASK_MILESTONE_DRIFT');
  });

  test('a next action below the current milestone fails closed', () => {
    const result = findStaleNextActionMilestone('proceed with G2 now', 'None.', 'G4..G21 execution wave');
    expect(result).toEqual({ token: 'G2', reason: 'BELOW_CURRENT' });
    expect(findStaleNextActionMilestone('continue G4 work', 'G1 — done.', 'G4 — current')).toBeNull();
  });

  test('COMPLETE tasks keep their existing rule, not the IN_PROGRESS drift rule', () => {
    const result = validate(
      activeText({ status: 'COMPLETE', milestone: 'G4 — still running', nextAction: 'STOP' }),
      stateText({
        status: 'COMPLETE',
        milestoneId: 'COMPLETE / STOP — all milestones closed.',
        nextAction: 'STOP',
        resume: 'Task complete. Do not resume this task.',
        snapshot: 'Task complete: every milestone closed.',
      }),
      'COMPLETE'
    );
    expect(errorCodes(result)).toContain('COMPLETE_MILESTONE_NONTERMINAL');
    expect(errorCodes(result)).not.toContain('ACTIVE_TASK_MILESTONE_DRIFT');
    expect(errorCodes(result)).not.toContain('ACTIVE_TASK_NEXT_ACTION_STALE');
  });
});

test.describe('SESSION WORKTREE liveness', () => {
  function routing(worktree: string, stateBranch: string, live: string[] | null): string {
    const text = [
      '# Active Task',
      '',
      `Task ID: ${TASK_ID}`,
      '',
      '## Routing and safety',
      '',
      '```',
      `CAMPAIGN: ${TASK_ID}`,
      `SESSION WORKTREE: ${worktree}`,
      '```',
      '',
    ].join('\n');
    return inspectActiveTaskRouting(text, TASK_ID, stateBranch, live).errors.join('\n');
  }

  test('a named worktree absent from the live registrations fails closed', () => {
    const errors = routing('session/b-0000', 'session/b-0000', []);
    expect(errors).toContain('ACTIVE_TASK_SESSION_WORKTREE_MISSING');
    expect(errors).toContain('session/b-0000');
  });

  test('an unreadable live topology fails closed rather than assuming absence', () => {
    expect(routing('session/b-0000', 'session/b-0000', null)).toContain('ACTIVE_TASK_SESSION_WORKTREE_UNKNOWN');
  });

  test('a registered worktree passes', () => {
    expect(routing('session/b-0000', 'session/b-0000', ['main', 'session/b-0000'])).toBe('');
  });

  test('canonical-only NONE requires STATE Branch main and mentions no session', () => {
    expect(routing('NONE', 'main', ['main'])).toBe('');
    expect(routing('NONE', 'session/b-0000', ['main', 'session/b-0000'])).toContain(
      'ACTIVE_TASK_ROUTING_SESSION_WORKTREE_DRIFT'
    );
    const withMention = [
      '## Routing and safety',
      '',
      '```',
      `CAMPAIGN: ${TASK_ID}`,
      'SESSION WORKTREE: NONE',
      '```',
      '',
      'Historical session/b-9999 is retired.',
    ].join('\n');
    const errors = inspectActiveTaskRouting(withMention, TASK_ID, 'main', ['main']).errors.join('\n');
    expect(errors).toContain('ACTIVE_TASK_ROUTING_FOREIGN_WORKTREE_REFERENCE');
    expect(errors).toContain('session/b-9999');
  });
});

test.describe('the measured ebe26ce shape', () => {
  test('ACTIVE G1 + STATE G4 + missing session worktree all fail closed', () => {
    const active = execFileSync('git', ['show', `${MEASURED_HEAD}:.agent/ACTIVE_TASK.md`], { encoding: 'utf8' });
    const state = execFileSync(
      'git',
      ['show', `${MEASURED_HEAD}:.agent/tasks/nightwatch-production-completion-programme-v1/STATE.md`],
      { encoding: 'utf8' }
    );
    const taskId = 'nightwatch-production-completion-programme-v1';
    const branch = /^Branch: (.+)$/m.exec(state)?.[1] ?? '';

    const protocolResult = validateTaskV2(
      {
        dir: taskId,
        stateText: state,
        statePath: `.agent/tasks/${taskId}/STATE.md`,
        planText: '## Milestones\n\n- [x] M1 — done\n',
        planPath: `.agent/tasks/${taskId}/PLAN.md`,
        reportText: null,
        reportPath: `.agent/tasks/${taskId}/REPORT.md`,
        activeText: active,
        activePath: '.agent/ACTIVE_TASK.md',
      },
      { bindActive: true }
    );
    const codes = errorCodes(protocolResult);
    expect(codes).toContain('ACTIVE_TASK_MILESTONE_DRIFT');
    expect(codes).toContain('ACTIVE_TASK_NEXT_ACTION_STALE');

    const routingErrors = inspectActiveTaskRouting(active, taskId, branch, ['main']).errors.join('\n');
    expect(routingErrors).toContain('ACTIVE_TASK_SESSION_WORKTREE_MISSING');
  });
});

test.describe('active change task pairing', () => {
  function writeChange(root: string, id: string, tasks: string): void {
    const dir = path.join(root, 'openspec', 'changes', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'tasks.md'), tasks, 'utf8');
  }

  test('an active change without a task is an error; a historical task without a change is a warning', () => {
    const root = fixtureRoot();
    writeChange(root, 'c-active-without-task', '- [ ] one');
    const taskDir = path.join(root, '.agent', 'tasks', 'phase-16a-historical-orphan');
    fs.mkdirSync(taskDir, { recursive: true });
    fs.writeFileSync(
      path.join(taskDir, 'STATE.md'),
      ['Task ID: phase-16a-historical-orphan', 'Status: COMPLETE', `CONTINUITY_PROTOCOL_VERSION: ${PROTOCOL}`, ''].join('\n'),
      'utf8'
    );
    const result = inspectLedgerAgreement(root);
    expect(result.errors.join(' ')).toContain('LEDGER_CHANGE_WITHOUT_TASK: change c-active-without-task');
    expect(result.warnings.join(' ')).toContain('LEDGER_TASK_WITHOUT_CHANGE: task phase-16a-historical-orphan');
  });
});
