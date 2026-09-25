// G1 completion-ledger truth — parser, agreement check, and open-work report.
//
// The parser in `bin/lib/openspec-ledger.mjs` feeds both the agreement check
// (`bin/agent-state.mjs`) and the status surface (`bin/nightwatch-status.mjs`).
// These probes use synthetic fixtures for the negative cases and the live tree
// only for the derived report.

import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  LEDGER_DISPOSITION_TOKENS,
  classifyBlocker,
  collectOpenWorkInput,
  inspectLedgerAgreement,
  parseBlockersSection,
  parseLedgerTasks,
} from '../../bin/lib/openspec-ledger.mjs';
import {
  OPEN_WORK_REPORT_MODEL_VERSION,
  deriveOpenWorkReport,
  renderOpenWorkJson,
  renderOpenWorkText,
} from '../../src/core/readiness/openWork';

const REPO_ROOT = path.join(__dirname, '..', '..');
const STATUS_BIN = path.join(REPO_ROOT, 'bin', 'nightwatch-status.mjs');

const tempRoots: string[] = [];

function fixtureRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-ledger-'));
  tempRoots.push(root);
  return root;
}

function writeChange(root: string, id: string, tasks: string): void {
  const dir = path.join(root, 'openspec', 'changes', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'tasks.md'), tasks, 'utf8');
}

function writeTask(root: string, id: string, status: string, options: { protocol?: boolean; blockers?: string } = {}): void {
  const dir = path.join(root, '.agent', 'tasks', id);
  fs.mkdirSync(dir, { recursive: true });
  const lines = [
    '# Task State',
    '',
    `Task ID: ${id}`,
    `Status: ${status}`,
    ...(options.protocol === false ? [] : ['CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2']),
    '',
    '## Blockers',
    '',
    options.blockers ?? 'None.',
    '',
  ];
  fs.writeFileSync(path.join(dir, 'STATE.md'), lines.join('\n'), 'utf8');
}

test.afterAll(() => {
  for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
});

test.describe('completion ledger parser', () => {
  test('classifies open, done, and settled struck entries', () => {
    const text = [
      '- [x] done one',
      '- [ ] open one',
      '- [ ] ~~declared single line~~ — SUPERSEDED — reason.',
      '- [ ] ~~declared multi line',
      '  continuation~~ — NON_GOAL — reason.',
      '1. numbered prose is not a checkbox',
    ].join('\n');
    const parsed = parseLedgerTasks(text);
    expect(parsed.done).toBe(1);
    expect(parsed.declaredNotInScope).toBe(2);
    expect(parsed.undispositioned).toEqual([]);
    expect(parsed.open).toEqual([{ line: 2, text: 'open one' }]);
  });

  test('a settled strike never counts as open work', () => {
    const parsed = parseLedgerTasks('- [ ] ~~C-11 PROD_OBSERVE~~ — NON_GOAL — not started in this campaign, by construction.');
    expect(parsed.open).toEqual([]);
    expect(parsed.undispositioned).toEqual([]);
    expect(parsed.declaredNotInScope).toBe(1);
  });

  test('every disposition token settles a strike (positive)', () => {
    for (const token of LEDGER_DISPOSITION_TOKENS) {
      const parsed = parseLedgerTasks(`- [ ] ~~item~~ — ${token} — reason.`);
      expect(parsed.declaredNotInScope, token).toBe(1);
      expect(parsed.undispositioned, token).toEqual([]);
      expect(parsed.open, token).toEqual([]);
    }
  });

  test('a strike without a disposition token is never settled (negative)', () => {
    for (const text of [
      '- [ ] ~~item~~ — reason without any token.',
      '- [ ] ~~item~~ — DEFERRED — the old hidden-backlog word.',
      '- [ ] ~~item~~',
    ]) {
      const parsed = parseLedgerTasks(text);
      expect(parsed.declaredNotInScope, text).toBe(0);
      expect(parsed.undispositioned, text).toEqual([{ line: 1, text: expect.any(String) }]);
      expect(parsed.open, text).toEqual([]);
    }
    // DEFERRED specifically is no longer a disposition.
    expect(LEDGER_DISPOSITION_TOKENS).not.toContain('DEFERRED');
  });
});

test.describe('completion ledger agreement', () => {
  test('a terminal task with an unchecked box is an error naming the lines', () => {
    const root = fixtureRoot();
    writeChange(root, 'c-one', ['- [x] done', '- [ ] still open'].join('\n'));
    writeTask(root, 'c-one', 'COMPLETE');
    const result = inspectLedgerAgreement(root);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('LEDGER_TERMINAL_TASK_HAS_OPEN_ITEMS');
    expect(result.errors[0]).toContain('line 2');
  });

  test('a settled strikethrough satisfies a terminal task', () => {
    const root = fixtureRoot();
    writeChange(root, 'c-one', '- [ ] ~~not started~~ — NON_GOAL — by construction.');
    writeTask(root, 'c-one', 'COMPLETE');
    expect(inspectLedgerAgreement(root).errors).toEqual([]);
  });

  test('an undispositioned strike on a terminal task reports LEDGER_UNDISPOSITIONED_ITEM', () => {
    const root = fixtureRoot();
    writeChange(root, 'c-one', '- [ ] ~~not started~~ — by construction.');
    writeTask(root, 'c-one', 'COMPLETE');
    const result = inspectLedgerAgreement(root);
    expect(result.errors).toEqual([]);
    expect(result.warnings.join(' ')).toContain('LEDGER_UNDISPOSITIONED_ITEM: change c-one leaves 1 struck entry without a disposition token at line 1');
  });

  test('an in-progress task reports open work as information, not failure', () => {
    const root = fixtureRoot();
    writeChange(root, 'c-one', '- [ ] open');
    writeTask(root, 'c-one', 'IN_PROGRESS');
    const result = inspectLedgerAgreement(root);
    expect(result.errors).toEqual([]);
    expect(result.info.join(' ')).toContain('LEDGER_OPEN_ITEMS');
  });

  test('an active change without a task is an error; a task without a change stays a warning', () => {
    const root = fixtureRoot();
    writeChange(root, 'c-change-only', '- [ ] open');
    writeTask(root, 'c-task-only', 'IN_PROGRESS');
    const result = inspectLedgerAgreement(root);
    expect(result.errors.join(' ')).toContain('LEDGER_CHANGE_WITHOUT_TASK: change c-change-only');
    expect(result.warnings.join(' ')).toContain('LEDGER_TASK_WITHOUT_CHANGE: task c-task-only');
    expect(result.warnings.join(' ')).not.toContain('LEDGER_CHANGE_WITHOUT_TASK');
  });

  test('a historical orphan task without a change is only a warning', () => {
    const root = fixtureRoot();
    writeTask(root, 'phase-16a-campaign-yield-portfolio-optimization', 'COMPLETE');
    const result = inspectLedgerAgreement(root);
    expect(result.errors).toEqual([]);
    expect(result.warnings.join(' ')).toContain(
      'LEDGER_TASK_WITHOUT_CHANGE: task phase-16a-campaign-yield-portfolio-optimization'
    );
  });

  test('a legacy task never infers terminal agreement', () => {
    const root = fixtureRoot();
    writeChange(root, 'c-legacy', '- [ ] open');
    writeTask(root, 'c-legacy', 'COMPLETE', { protocol: false });
    const result = inspectLedgerAgreement(root);
    expect(result.errors).toEqual([]);
    expect(result.warnings.join(' ')).toContain('LEDGER_LEGACY_CHANGE');
  });
});

test.describe('open work report', () => {
  test('blocker extraction and classification are derived', () => {
    expect(parseBlockersSection('## Blockers\n\nNone.\n')).toBeNull();
    expect(parseBlockersSection('## Blockers\n\nOwner authorization is required.\n')).toContain('Owner authorization');
    expect(classifyBlocker(null)).toBe('NONE');
    expect(classifyBlocker('CI is externally blocked')).toBe('EXTERNAL');
    expect(classifyBlocker('An internal refactor is pending')).toBe('INTERNAL');
  });

  test('collection excludes clean terminal tasks and keeps every hidden class visible', () => {
    const root = fixtureRoot();
    writeChange(root, 'c-open', ['- [ ] one', '- [ ] two', '- [ ] ~~settled~~ — SUPERSEDED — reason.'].join('\n'));
    writeTask(root, 'c-open', 'IN_PROGRESS');
    writeChange(root, 'c-done', '- [x] complete');
    writeTask(root, 'c-done', 'COMPLETE');
    writeChange(root, 'c-missing', '- [ ] one');
    writeChange(root, 'c-blocked', '- [ ] one');
    writeTask(root, 'c-blocked', 'BLOCKED', { blockers: 'Owner authorization is required.' });
    writeChange(root, 'c-terminal-hidden', ['- [x] complete', '- [ ] ~~hidden backlog~~ — without a disposition.'].join('\n'));
    writeTask(root, 'c-terminal-hidden', 'COMPLETE');
    const entries = collectOpenWorkInput(root);
    // R2-62: BLOCKED is its own visible class; A-21: undispositioned strikes
    // behind a terminal task stay visible. Only the clean terminal ledger is
    // omitted.
    expect(entries.map((entry) => entry.changeId)).toEqual(['c-blocked', 'c-missing', 'c-open', 'c-terminal-hidden']);
    const open = entries.find((entry) => entry.changeId === 'c-open');
    expect(open?.openCount).toBe(2);
    expect(open?.declaredNotInScope).toBe(1);
    expect(open?.undispositionedCount).toBe(0);
    const blocked = entries.find((entry) => entry.changeId === 'c-blocked');
    expect(blocked?.taskStatus).toBe('BLOCKED');
    expect(blocked?.blockerClass).toBe('EXTERNAL');
    const hidden = entries.find((entry) => entry.changeId === 'c-terminal-hidden');
    expect(hidden?.taskStatus).toBe('COMPLETE');
    expect(hidden?.undispositionedCount).toBe(1);
    const missing = entries.find((entry) => entry.changeId === 'c-missing');
    expect(missing?.taskStatus).toBe('MISSING_TASK');
  });

  test('derivation and both renderings are deterministic and derived', () => {
    const report = deriveOpenWorkReport([
      { changeId: 'b', taskStatus: 'BLOCKED', openCount: 2, declaredNotInScope: 1, undispositionedCount: 4, doneCount: 3, blocker: 'owner gate', blockerClass: 'EXTERNAL' },
      { changeId: 'a', taskStatus: 'IN_PROGRESS', openCount: 1, declaredNotInScope: 0, undispositionedCount: 0, doneCount: 0, blocker: 'external CI block', blockerClass: 'EXTERNAL' },
    ]);
    expect(report.modelVersion).toBe(OPEN_WORK_REPORT_MODEL_VERSION);
    expect(report.derived).toBe(true);
    expect(report.campaigns.map((campaign) => campaign.changeId)).toEqual(['a', 'b']);
    expect(report.totals).toEqual({ campaigns: 2, openItems: 3, undispositionedItems: 4, blockedCampaigns: 1, externallyBlocked: 2 });
    expect(renderOpenWorkJson(report)).toBe(renderOpenWorkJson(deriveOpenWorkReport([
      { changeId: 'b', taskStatus: 'BLOCKED', openCount: 2, declaredNotInScope: 1, undispositionedCount: 4, doneCount: 3, blocker: 'owner gate', blockerClass: 'EXTERNAL' },
      { changeId: 'a', taskStatus: 'IN_PROGRESS', openCount: 1, declaredNotInScope: 0, undispositionedCount: 0, doneCount: 0, blocker: 'external CI block', blockerClass: 'EXTERNAL' },
    ])));
    expect(renderOpenWorkText(report)).toContain('externally-blocked=2');
    expect(renderOpenWorkText(report)).toContain('undispositioned=4');
    expect(renderOpenWorkText(report)).toContain('blocked-campaigns=1');
  });

  test('the status CLI reports the derived open work from the live tree', () => {
    const json = spawnSync(process.execPath, [STATUS_BIN, '--json'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(json.status).toBe(0);
    const parsed = JSON.parse(json.stdout) as {
      modelVersion: string;
      openWork: { modelVersion: string; derived: boolean; campaigns: Array<{ changeId: string }> };
    };
    expect(parsed.modelVersion).toBe('nightwatch.local-readiness.v1');
    expect(parsed.openWork.modelVersion).toBe(OPEN_WORK_REPORT_MODEL_VERSION);
    expect(parsed.openWork.derived).toBe(true);
    const ids = parsed.openWork.campaigns.map((campaign) => campaign.changeId);
    expect(ids).toContain('nightwatch-production-completion-programme-v1');
    expect(ids).not.toContain('nightwatch-residual-closure-and-lane-qualification-v1');

    const text = spawnSync(process.execPath, [STATUS_BIN], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(text.status).toBe(0);
    expect(text.stdout).toContain('open work nightwatch.open-work-report.v1');
  });
});
