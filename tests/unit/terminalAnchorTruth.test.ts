// ---------------------------------------------------------------------------
// DEF-RO-1 — a terminal COMPLETE report may not name a stable historical
// anchor with a LIVE-authority marker.
//
// `DISCOVER_FROM_GIT` is a real, documented convention: AGENTS.md names it an
// intentional authority marker, `bin/agent-state.mjs` exempts it for
// `CURRENT_LOCAL_HEAD` / `CURRENT_REMOTE_HEAD` / `LAST_PUSHED_SHA`,
// `bin/project-state-check.mjs` REQUIRES it for `LIVE_HEAD_SHA`, and both
// `.agent/templates` prescribe it. It means "ask Git, and Git can answer".
//
// An implementation anchor is not such a value. Git records no notion of
// which commit an author considered their campaign's anchor, so the marker
// there does not delegate the question, it drops it — and a reader cannot
// distinguish a dropped field from a deliberate one, which is exactly what a
// terminal report must never be ambiguous about.
//
// The rule is narrow by construction (brief section 46): two closed
// vocabularies and one provable disagreement. No prose heuristic.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  findReportImplementationAnchorClaim,
  inspectTerminalImplementationAnchor,
  isLiveAuthorityMarker,
  LIVE_AUTHORITY_MARKERS,
} from '../../bin/agent-continuity-protocol.mjs';

const REPO_ROOT = path.join(__dirname, '..', '..');
const SHA_A = '1ec3ae02c7942e95fc124664409adb65a8eec334';
const SHA_B = '46e241aede8bbcee7b555c719279068bb51a0f3b';

/** The fenced identity-block layout nine of the recorded REPORTs use. */
function fencedReport(anchor: string): string {
  return [
    '# Some Campaign — Report',
    '',
    'Status: COMPLETE',
    '',
    '## Campaign',
    '',
    '```text',
    'Task ID: some-campaign',
    `Starting SHA: ${SHA_A}`,
    `Implementation anchor: ${anchor}`,
    'Live HEAD: DISCOVER_FROM_GIT',
    'Status: COMPLETE',
    '```',
    '',
    '## Later section',
    '',
    'Implementation anchor: 0000000000000000000000000000000000000000',
    '',
  ].join('\n');
}

/** The bullet layout the predecessor REPORT uses. */
function bulletReport(anchor: string): string {
  return [
    '# Some Campaign — Report',
    '',
    'Status: COMPLETE',
    '',
    `- Starting SHA: \`${SHA_A}\``,
    `- Implementation anchor: ${anchor}`,
    '- Live HEAD: DISCOVER_FROM_GIT',
    '- origin/main: DISCOVER_FROM_GIT',
    '',
    '## Objective',
    '',
    'text',
    '',
  ].join('\n');
}

const codes = (report: string, stateSha: string | null): readonly string[] =>
  inspectTerminalImplementationAnchor(report, stateSha).map((hit: { code: string }) => hit.code);

test.describe('terminal implementation-anchor truth (DEF-RO-1)', () => {
  test('the live-authority marker vocabulary is closed and non-empty', () => {
    expect(LIVE_AUTHORITY_MARKERS.has('DISCOVER_FROM_GIT')).toBe(true);
    expect(LIVE_AUTHORITY_MARKERS.size).toBeGreaterThanOrEqual(1);
    for (const marker of LIVE_AUTHORITY_MARKERS) expect(isLiveAuthorityMarker(marker)).toBe(true);
    // Decoration does not smuggle a marker past the check.
    expect(isLiveAuthorityMarker('`DISCOVER_FROM_GIT`')).toBe(true);
    expect(isLiveAuthorityMarker('  discover_from_git  ')).toBe(true);
    expect(isLiveAuthorityMarker(SHA_A)).toBe(false);
  });

  test('the marker is refused in both recorded report layouts', () => {
    for (const build of [fencedReport, bulletReport]) {
      expect(codes(build('DISCOVER_FROM_GIT'), SHA_A)).toEqual(['TERMINAL_ANCHOR_LIVE_MARKER_MISUSED']);
    }
  });

  test('a concrete anchor agreeing with STATE passes', () => {
    for (const build of [fencedReport, bulletReport]) {
      expect(codes(build(SHA_A), SHA_A)).toEqual([]);
      expect(codes(build(`\`${SHA_A}\``), SHA_A)).toEqual([]);
    }
  });

  test('an anchor contradicting the STATE anchor fails closed', () => {
    expect(codes(fencedReport(SHA_B), SHA_A)).toEqual(['TERMINAL_ANCHOR_DISAGREES_WITH_STATE']);
  });

  test('a closure placeholder is refused', () => {
    expect(codes(bulletReport('(filled after push)'), SHA_A)).toEqual(['TERMINAL_ANCHOR_PLACEHOLDER']);
    expect(codes(bulletReport('TBD'), SHA_A)).toEqual(['TERMINAL_ANCHOR_PLACEHOLDER']);
  });

  test('an explicit prose anchor is left alone', () => {
    // "carried-forward base (docs-only; no new claim)" is a statement, not a
    // deferred value. Refusing it would be the broad prose heuristic the
    // brief forbids.
    for (const prose of ['carried-forward base (docs-only; no new claim)', 'see close-out commit (M2 + A1)']) {
      expect(codes(bulletReport(prose), SHA_A), prose).toEqual([]);
    }
  });

  test('the scan reads the fenced identity block, not only unfenced lines', () => {
    // The bug this guards: the sibling safety-events scanner correctly skips
    // fences, and copying that behaviour here would have inspected two of the
    // twelve recorded REPORTs and reported PASS for the other ten.
    const claim = findReportImplementationAnchorClaim(fencedReport('DISCOVER_FROM_GIT'));
    expect(claim).not.toBeNull();
    expect(claim!.value).toBe('DISCOVER_FROM_GIT');
  });

  test('a later section quoting another campaign anchor is not a self-claim', () => {
    // Phase 16H records its PREDECESSOR's anchor under "## 2. Phase 16A
    // predecessor truth and exact SHAs". That is true, and it is not a claim
    // about itself.
    const report = [
      '# Phase 16H — Report',
      '',
      'Status: COMPLETE',
      '',
      '## 1. Scope',
      '',
      'text',
      '',
      '## 2. Predecessor truth and exact SHAs',
      '',
      `- Implementation anchor: \`${SHA_B}\`.`,
      '',
    ].join('\n');
    expect(findReportImplementationAnchorClaim(report)).toBeNull();
    expect(codes(report, SHA_A)).toEqual([]);
  });

  test('a report that makes no anchor claim is not invented one', () => {
    expect(findReportImplementationAnchorClaim('# R\n\nStatus: COMPLETE\n')).toBeNull();
    expect(codes('# R\n\nStatus: COMPLETE\n', SHA_A)).toEqual([]);
  });

  test('an unknown STATE anchor cannot manufacture a disagreement', () => {
    // Absence of a STATE anchor is not evidence that the REPORT is wrong.
    expect(codes(fencedReport(SHA_B), null)).toEqual([]);
    expect(codes(fencedReport(SHA_B), 'DISCOVER_FROM_GIT')).toEqual([]);
  });

  test('no task in the repository names a historical anchor with a live marker', () => {
    // Totality over the real corpus, in both directions: the sweep must have
    // inspected a meaningful number of documents, or it proves nothing.
    const tasksRoot = path.join(REPO_ROOT, '.agent', 'tasks');
    const offenders: string[] = [];
    let inspected = 0;
    for (const entry of fs.readdirSync(tasksRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const reportPath = path.join(tasksRoot, entry.name, 'REPORT.md');
      const statePath = path.join(tasksRoot, entry.name, 'STATE.md');
      if (!fs.existsSync(reportPath) || !fs.existsSync(statePath)) continue;
      const report = fs.readFileSync(reportPath, 'utf8');
      if (findReportImplementationAnchorClaim(report) === null) continue;
      inspected += 1;
      const state = fs.readFileSync(statePath, 'utf8');
      const match = /^LAST_VALIDATED_IMPLEMENTATION_SHA:\s*([0-9a-f]{40})\s*$/mi.exec(state);
      const hits = inspectTerminalImplementationAnchor(report, match === null ? null : match[1]);
      if (hits.length > 0) offenders.push(`${entry.name}: ${hits.map((hit: { code: string }) => hit.code).join(',')}`);
    }
    expect(inspected).toBeGreaterThanOrEqual(10);
    expect(offenders).toEqual([]);
  });
});
