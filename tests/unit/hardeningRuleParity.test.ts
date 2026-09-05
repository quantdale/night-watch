// FC-1 hardening self-integrity.
//
// DEF-FC-02: an edit to bin/hardening-check.mjs replaced two existing rule
// invocations with new ones, so checkC00WorkspaceIntegrity() and
// checkC10ProductionPrivacyBoundary() were still DEFINED but never CALLED.
// Both rules kept passing review by inspection — a defined rule reads exactly
// like a live one — while enforcing nothing. The same edit also left
// checkAlphausHandoffBoundary() invoked twice.
//
// A rule that never runs is worse than a missing rule: it advertises coverage
// the suite does not have. This test reads the checker as text and requires
// definition/call parity in both directions, plus no duplicate invocation.
//
// Pure text analysis of a tracked file: no execution, no network, no fixture.

import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const checkerPath = path.join(process.cwd(), 'bin', 'hardening-check.mjs');
const source = fs.readFileSync(checkerPath, 'utf8');

function definitions(): string[] {
  return [...source.matchAll(/^function (check\w+)\(/gm)].map((match) => match[1] ?? '');
}

function invocations(): string[] {
  return [...source.matchAll(/^(check\w+)\(\);$/gm)].map((match) => match[1] ?? '');
}

test.describe('hardening rule parity', () => {
  test('the checker defines at least the rules it is known to carry', () => {
    // A floor, not an exact count: new rules are expected, silent loss is not.
    expect(definitions().length).toBeGreaterThanOrEqual(60);
  });

  test('every defined rule is invoked', () => {
    const called = new Set(invocations());
    const dead = definitions().filter((name) => !called.has(name));
    expect(dead, `defined but never called: ${dead.join(', ')}`).toEqual([]);
  });

  test('every invoked rule is defined', () => {
    const defined = new Set(definitions());
    const missing = invocations().filter((name) => !defined.has(name));
    expect(missing, `called but never defined: ${missing.join(', ')}`).toEqual([]);
  });

  test('no rule is invoked more than once', () => {
    const counts = new Map<string, number>();
    for (const name of invocations()) counts.set(name, (counts.get(name) ?? 0) + 1);
    const duplicated = [...counts.entries()].filter(([, count]) => count > 1).map(([name, count]) => `${name} x${count}`);
    expect(duplicated, `invoked more than once: ${duplicated.join(', ')}`).toEqual([]);
  });

  test('the rules this campaign added are present and live', () => {
    const called = new Set(invocations());
    for (const rule of [
      'checkC00WorkspaceIntegrity',
      'checkC10ProductionPrivacyBoundary',
      'checkAlphausHandoffBoundary',
      'checkC12RehearsalBoundary',
      'checkFindingFrontierBoundary',
      'checkDeclaredDependencyResolvability',
    ]) {
      expect(called.has(rule), `${rule} must be invoked`).toBe(true);
    }
  });
});
