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
// the suite does not have. The F-16 rule registry is now the enumeration
// authority (explicit `{ name, run, quantifier, subject }` entries), so this
// test requires definition/registration parity in both directions, no
// duplicate registration, and a non-vacuous, fully classified rule set read
// back from the checker's own `--list-rules` registry dump.
//
// Pure text analysis plus one bounded local child: no network, no fixture.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const checkerPath = path.join(process.cwd(), 'bin', 'hardening-check.mjs');
const source = fs.readFileSync(checkerPath, 'utf8');

function definitions(): string[] {
  return [...source.matchAll(/^function (check\w+)\(/gm)].map((match) => match[1] ?? '');
}

function registrations(): string[] {
  return [...source.matchAll(/\{ name: '(check\w+)', run: /g)].map((match) => match[1] ?? '');
}

test.describe('hardening rule parity', () => {
  test('the checker defines at least the rules it is known to carry', () => {
    // A floor, not an exact count: new rules are expected, silent loss is not.
    expect(definitions().length).toBeGreaterThanOrEqual(70);
  });

  test('every defined rule is registered', () => {
    const registered = new Set(registrations());
    const dead = definitions().filter((name) => !registered.has(name));
    expect(dead, `defined but never registered: ${dead.join(', ')}`).toEqual([]);
  });

  test('every registered rule is defined', () => {
    const defined = new Set(definitions());
    const missing = registrations().filter((name) => !defined.has(name));
    expect(missing, `registered but never defined: ${missing.join(', ')}`).toEqual([]);
  });

  test('no rule is registered more than once', () => {
    const counts = new Map<string, number>();
    for (const name of registrations()) counts.set(name, (counts.get(name) ?? 0) + 1);
    const duplicated = [...counts.entries()].filter(([, count]) => count > 1).map(([name, count]) => `${name} x${count}`);
    expect(duplicated, `registered more than once: ${duplicated.join(', ')}`).toEqual([]);
  });

  test('the registry enumerates its rules with a quantifier and a probe', () => {
    const output = execFileSync('node', ['bin/hardening-check.mjs', '--list-rules'], {
      cwd: process.cwd(), encoding: 'utf8', timeout: 60_000, maxBuffer: 8 * 1024 * 1024,
    });
    const registry = JSON.parse(output);
    expect(registry.schemaVersion).toBe('nightwatch.hardening-rule-registry.v1');
    expect(registry.count).toBeGreaterThanOrEqual(70);
    expect(registry.rules.length).toBe(registry.count);
    for (const rule of registry.rules) {
      expect(['EXISTENCE', 'TOTALITY']).toContain(rule.quantifier);
      expect(typeof rule.family).toBe('string');
      expect(String(rule.subject ?? '').length).toBeGreaterThanOrEqual(8);
      expect(rule.probeCount, `${rule.name} must have a recorded probe`).toBeGreaterThanOrEqual(1);
    }
  });

  test('the rules this campaign added are present and live', () => {
    const registered = new Set(registrations());
    for (const rule of [
      'checkC00WorkspaceIntegrity',
      'checkC10ProductionPrivacyBoundary',
      'checkEnvironmentSurfaceDeclaration',
      'checkAlphausHandoffBoundary',
      'checkC12RehearsalBoundary',
      'checkFindingFrontierBoundary',
      'checkDeclaredDependencyResolvability',
      'checkRuleEngineSoundness',
      'checkDocumentRoleCurrency',
      'checkAppendOnlyArchives',
      'checkGovernedStatusWords',
    ]) {
      expect(registered.has(rule), `${rule} must be registered`).toBe(true);
    }
  });
});
