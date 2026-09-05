// DEF-RP-1: contradictory terminal safety accounting.
//
// The reviewer-surface campaign closed with two committed answers to one
// question. Its STATE.md recorded, under `## Safety Events`, a
// workspace-integrity event: an agent-harness `ScheduleWakeup` call wrote
// `**/.claude/...` patterns into the SHARED `$GIT_COMMON_DIR/info/exclude`,
// which C-00 requires to hold zero effective patterns; `agent:check` caught
// it and the stock template was restored. Its REPORT.md, the campaign's
// terminal accounting, said `Safety events: NONE`.
//
// agent:check returned PASS on both documents, because no rule compared them.
//
// The rule added here is a field comparison, not prose analysis: both
// documents already follow one convention across the whole recorded history
// — the claim opens with a NONE token, or it records events. The rule reads
// the opening token of each and fires only in the asymmetric direction that
// can be false: a REPORT asserting NONE over a STATE section that does not.
//
// As with DEF-FC-04, the rule is bound to the real committed documents and
// not only to hand-built fixtures: a fixture proves the checker rejects what
// the fixture says, while history proves it would have caught the defect that
// actually happened.
//
// Pure text analysis plus `git show` of committed history: no network, no
// browser, no writes.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  assertsNoSafetyEvents,
  findReportSafetyEventsClaim,
  parseMarkdownSections,
  sectionBodyText,
  validateTaskV2,
} from '../../bin/agent-continuity-protocol.mjs';

/** The commit that carried the contradictory REPORT and its STATE. */
const CONTRADICTION_HEAD = '85e8f654fba29ca91286f0bab9eecf9cc3c68fa1';
const PREDECESSOR = 'nightwatch-reviewer-surface-and-intel-scale-v1';
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function show(pathAtSha: string): string {
  return execFileSync('git', ['show', pathAtSha], { encoding: 'utf8', cwd: REPO_ROOT });
}

function safetySectionOf(stateText: string): string {
  return sectionBodyText(parseMarkdownSections(stateText).sections.get('Safety Events')).trim();
}

function codesFor(stateText: string, reportText: string | null, dir = PREDECESSOR): readonly string[] {
  const result = validateTaskV2({
    dir,
    stateText,
    statePath: 'STATE.md',
    planText: null,
    planPath: 'PLAN.md',
    reportText,
    reportPath: 'REPORT.md',
  });
  return result.errors.map((error: { code: string }) => error.code);
}

const FIXTURE_TASK = 'fixture-safety-accounting-v1';

/**
 * A minimal but genuinely valid continuity-v2 STATE. The fixtures must reach
 * the safety rule: an invalid document bails out earlier, and a test that
 * asserts `not.toContain` over an early bail would pass while proving
 * nothing.
 */
function v2State(safetySection: string | null): string {
  return [
    '# Task State',
    '',
    '## Identity',
    '',
    `Task ID: ${FIXTURE_TASK}`,
    'Phase: FIXTURE',
    'Status: IN_PROGRESS',
    'Starting SHA: 47c00883461fe689393d35e275b51eac0b78ed15',
    'Last validated implementation SHA: aa1f73d272924ed568d3a5d1089f19efd0f6dd3e',
    'Last substantive checkpoint SHA: aa1f73d272924ed568d3a5d1089f19efd0f6dd3e',
    'Live HEAD authority: GIT',
    'Branch: session/fixture',
    'Last checkpoint: fixture',
    'CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2',
    '',
    'STARTING_SHA: 47c00883461fe689393d35e275b51eac0b78ed15',
    'LAST_VALIDATED_IMPLEMENTATION_SHA: aa1f73d272924ed568d3a5d1089f19efd0f6dd3e',
    'LAST_SUBSTANTIVE_CHECKPOINT_SHA: aa1f73d272924ed568d3a5d1089f19efd0f6dd3e',
    'LIVE_HEAD_AUTHORITY: GIT',
    'PROJECT_VERDICT_EFFECT: PRESERVE',
    'PHASE_FIXTURE_STATUS: IN_PROGRESS',
    '',
    '## Current Milestone',
    '',
    'M1 — fixture.',
    '',
    '## Exact Next Action',
    '',
    'Continue M1.',
    '',
    ...(safetySection === null ? [] : ['## Safety Events', '', safetySection, '']),
  ].join('\n');
}

/** Guard: the fixture reaches the safety rule rather than bailing earlier. */
function assertFixtureReachesRule(codes: readonly string[]): void {
  expect(codes).not.toContain('ACTIVE_TASK_PROTOCOL_REQUIRED');
  expect(codes).not.toContain('TASK_ID_MISMATCH');
}

test.describe('safety-event accounting (DEF-RP-1)', () => {
  test('the real contradictory documents are rejected', () => {
    const state = show(`${CONTRADICTION_HEAD}:.agent/tasks/${PREDECESSOR}/STATE.md`);
    const report = show(`${CONTRADICTION_HEAD}:.agent/tasks/${PREDECESSOR}/REPORT.md`);

    // Both halves of the contradiction, read from the commit itself.
    const claim = findReportSafetyEventsClaim(report);
    expect(claim).not.toBeNull();
    expect(claim!.value.startsWith('NONE')).toBe(true);
    expect(safetySectionOf(state).startsWith('One workspace-integrity event')).toBe(true);

    expect(codesFor(state, report)).toContain('SAFETY_EVENT_ACCOUNTING_CONTRADICTION');
  });

  test('the repaired REPORT in the working tree is accepted', () => {
    const state = fs.readFileSync(path.join(REPO_ROOT, '.agent', 'tasks', PREDECESSOR, 'STATE.md'), 'utf8');
    const report = fs.readFileSync(path.join(REPO_ROOT, '.agent', 'tasks', PREDECESSOR, 'REPORT.md'), 'utf8');

    // The event is still recorded on both sides — the repair corrected the
    // claim, it did not delete the history.
    expect(safetySectionOf(state).startsWith('One workspace-integrity event')).toBe(true);
    const claim = findReportSafetyEventsClaim(report);
    expect(claim).not.toBeNull();
    expect(claim!.value).toContain('ONE workspace-integrity event');
    expect(assertsNoSafetyEvents(claim!.value)).toBe(false);

    expect(codesFor(state, report)).not.toContain('SAFETY_EVENT_ACCOUNTING_CONTRADICTION');
  });

  test('a fixture contradiction is rejected', () => {
    const codes = codesFor(v2State('One workspace-integrity event occurred.'), '- Safety events: NONE.\n', FIXTURE_TASK);
    assertFixtureReachesRule(codes);
    expect(codes).toContain('SAFETY_EVENT_ACCOUNTING_CONTRADICTION');
  });

  test('a REPORT asserting NONE with no supporting STATE section is unsupported', () => {
    const codes = codesFor(v2State(null), '- Safety events: NONE.\n', FIXTURE_TASK);
    assertFixtureReachesRule(codes);
    expect(codes).toContain('SAFETY_EVENT_ACCOUNTING_UNSUPPORTED');
  });

  test('an empty STATE section does not support a NONE claim', () => {
    const codes = codesFor(v2State(''), '- Safety events: NONE.\n', FIXTURE_TASK);
    assertFixtureReachesRule(codes);
    expect(codes).toContain('SAFETY_EVENT_ACCOUNTING_UNSUPPORTED');
  });

  test('a truthful NONE pair is accepted', () => {
    const codes = codesFor(v2State('NONE. No production contact.'), '- Safety events: NONE. No production contact.\n', FIXTURE_TASK);
    assertFixtureReachesRule(codes);
    expect(codes).not.toContain('SAFETY_EVENT_ACCOUNTING_CONTRADICTION');
    expect(codes).not.toContain('SAFETY_EVENT_ACCOUNTING_UNSUPPORTED');
  });

  test('a truthful event pair is accepted', () => {
    const codes = codesFor(
      v2State('One workspace-integrity event occurred.'),
      '- Safety events: ONE workspace-integrity event, repaired.\n',
      FIXTURE_TASK
    );
    assertFixtureReachesRule(codes);
    expect(codes).not.toContain('SAFETY_EVENT_ACCOUNTING_CONTRADICTION');
    expect(codes).not.toContain('SAFETY_EVENT_ACCOUNTING_UNSUPPORTED');
  });

  test('a REPORT that makes no safety claim is not required to make one', () => {
    // The rule catches a FALSE claim. It does not invent a claim requirement
    // that the recorded history never had: only 17 of 127 REPORTs carry the
    // field at all.
    const codes = codesFor(v2State('One event occurred.'), '# Report\n\nNo safety line here.\n', FIXTURE_TASK);
    assertFixtureReachesRule(codes);
    expect(codes).not.toContain('SAFETY_EVENT_ACCOUNTING_CONTRADICTION');
  });

  test('a claim inside a fenced block is not read as the report claim', () => {
    const report = ['# Report', '', '```', '- Safety events: NONE', '```', ''].join('\n');
    expect(findReportSafetyEventsClaim(report)).toBeNull();
  });

  test('every recorded NONE spelling is read as NONE', () => {
    // Taken from the actual corpus, so the rule cannot false-positive on the
    // spellings the repository already uses.
    for (const spelling of [
      'NONE',
      'None.',
      '`NONE`. Product network contacts: 0.',
      'SAFETY_EVENTS: NONE',
      'SAFETY_EVENTS: NONE. No model, product, DEV/NEXT/production contact.',
      '- Safety events: NONE',
      '**Safety events:** NONE. No production attempt.',
      'NONE — all prior DEV failures failed closed.',
      'None. Safety vector: catalog writes 0.',
    ]) {
      expect(assertsNoSafetyEvents(spelling), spelling).toBe(true);
    }
  });

  test('an event narrative is never read as NONE', () => {
    for (const narrative of [
      'One workspace-integrity event, detected by the repository.',
      'Two events occurred; none reached production.',
      'A shared-exclude drift was detected and repaired.',
      // "no" is not "none": a narrative may open by scoping what did not
      // happen and still go on to record what did.
      'No production contact, but one workspace-integrity event occurred.',
      '',
      '   ',
    ]) {
      expect(assertsNoSafetyEvents(narrative), narrative).toBe(false);
    }
  });

  test('no task in the repository contradicts its own safety accounting', () => {
    // Totality: the rule is run against every task directory on disk, so a
    // future campaign cannot land a contradiction without this failing.
    const tasksRoot = path.join(REPO_ROOT, '.agent', 'tasks');
    const offenders: string[] = [];
    let claimed = 0;
    for (const entry of fs.readdirSync(tasksRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const reportPath = path.join(tasksRoot, entry.name, 'REPORT.md');
      const statePath = path.join(tasksRoot, entry.name, 'STATE.md');
      if (!fs.existsSync(reportPath) || !fs.existsSync(statePath)) continue;
      const report = fs.readFileSync(reportPath, 'utf8');
      const claim = findReportSafetyEventsClaim(report);
      if (claim === null || !assertsNoSafetyEvents(claim.value)) continue;
      claimed += 1;
      const state = fs.readFileSync(statePath, 'utf8');
      const section = safetySectionOf(state);
      if (section === '' || !assertsNoSafetyEvents(section)) offenders.push(entry.name);
    }
    // The scan must actually have scanned something; a rule that inspected
    // zero documents would pass here while proving nothing.
    expect(claimed).toBeGreaterThan(10);
    expect(offenders).toEqual([]);
  });
});
