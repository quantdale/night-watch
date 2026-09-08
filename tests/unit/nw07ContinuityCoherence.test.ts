// NW-07 — continuity and project memory must be mechanically coherent.
//
// Two concrete drifts, both of which let a reader follow prose that the
// structured state contradicted:
//
//   - five decision numbers were each issued for two unrelated decisions, so
//     a citation of "D-31" could mean minimization or DEV credentials;
//   - the parent programme's PLAN read "W0 IN_PROGRESS, W1-W5 NOT_STARTED"
//     while its own STATE recorded W0-W10 complete and certified. A fresh
//     reader following that PLAN would have restarted shipped work.
//
// Both are now enforced in required hardening rules. These cases assert the
// live repository satisfies them and that the rules' judgements are the ones
// described, so the coherence survives the campaign that established it.

import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const ROOT = path.resolve(__dirname, '../..');

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

/** Every `## D-N — Title` heading, grouped by number. */
function decisionHeadings(): Map<string, string[]> {
  const headings = new Map<string, string[]>();
  for (const line of read('docs/DECISIONS.md').split(/\r?\n/)) {
    const match = /^## (D-\d+) — (.+)$/.exec(line);
    if (match === null) continue;
    const id = match[1] as string;
    const titles = headings.get(id) ?? [];
    titles.push((match[2] as string).trim());
    headings.set(id, titles);
  }
  return headings;
}

test.describe('NW-07 — decision identities are unambiguous', () => {
  test('every duplicated decision number is recorded in the erratum, with both titles', () => {
    const decisions = read('docs/DECISIONS.md');
    const headings = decisionHeadings();
    // Guard against a vacuous pass: the scan must be finding the document.
    expect(headings.size).toBeGreaterThan(100);
    const duplicated = [...headings].filter(([, titles]) => titles.length > 1);
    // The five known collisions. A sixth must fail the gate, not appear here.
    expect(duplicated.map(([id]) => id).sort()).toEqual(['D-29', 'D-30', 'D-31', 'D-33', 'D-34']);
    for (const [id, titles] of duplicated) {
      for (const title of titles) {
        // A bare mention of the number is not enough: the row must name the
        // title, because the title is what disambiguates the citation.
        expect(decisions, `${id} erratum row missing for "${title}"`)
          .toMatch(new RegExp(`\\|\\s*${id}[a-z]\\s*\\|\\s*${id}\\s*\\|\\s*${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\|`));
      }
    }
  });

  test('the erratum states the going-forward rule and does not rewrite either decision', () => {
    const decisions = read('docs/DECISIONS.md');
    expect(decisions).toContain('Erratum E-1');
    expect(decisions).toMatch(/next number above the\s+highest already used|next unused number/);
    // Both entries of each pair must still exist, unedited: the document's own
    // rule is that changing a decision requires a new entry, not an edit.
    expect(decisions).toContain('## D-31 — Deterministic minimization is subsequence-only replay');
    expect(decisions).toContain('## D-31 — Designated DEV credential refresh is external, narrow, and subordinate to Nightwatch safety');
    expect(decisions).toMatch(/neither supersedes the other/i);
  });
});

test.describe('NW-07 — a live PLAN agrees with its own STATE', () => {
  /** The active task directory, from the routing document. */
  function activeTaskDirectory(): string {
    const directory = /^Task directory:\s*(\S+)\s*$/m.exec(read('.agent/ACTIVE_TASK.md'))?.[1];
    expect(directory, 'ACTIVE_TASK.md declares no task directory').toBeDefined();
    expect(directory as string).toMatch(/^\.agent\/tasks\//);
    return directory as string;
  }

  test('no milestone the active STATE reports COMPLETE is unstarted in the active PLAN', () => {
    const directory = activeTaskDirectory();
    const state = read(`${directory}/STATE.md`);
    const plan = read(`${directory}/PLAN.md`);
    expect(state).toContain('nightwatch.agent-continuity.v2');

    const complete = new Set<string>();
    for (const match of state.matchAll(/\*\*(M\d+)\b[^*]*\bCOMPLETE/g)) complete.add(match[1] as string);
    // The active campaign has completed milestones; a rule over an empty set
    // would pass while proving nothing.
    expect(complete.size).toBeGreaterThan(0);

    for (const milestone of [...complete].sort()) {
      const section = new RegExp(`^### ${milestone} —[\\s\\S]*?(?=^### |\\n## )`, 'm').exec(plan);
      expect(section, `${directory}/PLAN.md has no ### ${milestone} section`).not.toBeNull();
      const status = /^- \*\*Status:\*\*\s*(\S+)/m.exec((section as RegExpExecArray)[0])?.[1];
      expect(status, `${milestone} has no Status line`).toBeDefined();
      expect(status, `${milestone} is COMPLETE in STATE but ${String(status)} in PLAN`).toBe('COMPLETE');
    }
  });

  test('the parent programme PLAN no longer contradicts its terminal STATE', () => {
    // The specific drift NW-07 recorded. The programme is terminal, so its
    // PLAN must not read as though the first wave were still running.
    const directory = '.agent/tasks/nightwatch-autonomous-bug-hunting-programme-v1';
    const plan = read(`${directory}/PLAN.md`);
    const state = read(`${directory}/STATE.md`);
    expect(state).toMatch(/W10[\s\S]*COMPLETE/);
    expect(plan).not.toMatch(/^- Status: NOT_STARTED$/m);
    expect(plan).not.toMatch(/^- Status: IN_PROGRESS$/m);
    // And the reconciliation must say what it did and did not touch.
    expect(plan).toMatch(/Reconciled 2026-09-09 under NW-07/);
    expect(plan).toMatch(/Nothing here asserts a completion\s+the STATE did not already record/);
  });

  test('one discoverable current view names where current truth lives', () => {
    // NW-07's acceptance is that a reader has ONE discoverable current view.
    const matrix = read('docs/HOST-CAPABILITY-MATRIX.md');
    expect(matrix).toMatch(/Documentation currency/i);
    for (const pointer of [
      'README.md',
      'AGENTS.md',
      '.agent/ACTIVE_TASK.md',
      'docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md',
    ]) {
      expect(matrix, `${pointer} is not in the current-truth list`).toContain(pointer);
    }
    // The archives stay archives, and the document says so rather than
    // pretending they are current.
    expect(matrix).toMatch(/append-heavy/i);
    expect(matrix).toMatch(/are not\s+rewritten|not rewritten/i);
  });
});
