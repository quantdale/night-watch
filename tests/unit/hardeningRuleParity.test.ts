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
// the suite does not have. The F-16 rule registry is the enumeration
// authority, so this test requires definition/registration parity in both
// directions, no duplicate registration, and a non-vacuous, fully classified
// rule set read back from the checker's own `--list-rules` registry dump.
//
// G16.9 decomposed the engine: the rules now live in invariant-family modules
// under bin/lib/hardening/rules/ and the registry table lives in
// bin/lib/hardening/registry.mjs. The parity scan follows them there. Every
// population this test derives is asserted NON-EMPTY first — reading the old
// single file after the move would otherwise have found zero definitions and
// passed both parity directions vacuously, which is the exact failure mode
// DEF-FC-02 is about.
//
// Pure text analysis plus one bounded local child: no network, no fixture.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const root = process.cwd();
const ruleModuleDirectory = path.join(root, 'bin', 'lib', 'hardening', 'rules');
const registrySource = fs.readFileSync(path.join(root, 'bin', 'lib', 'hardening', 'registry.mjs'), 'utf8');
const entrySource = fs.readFileSync(path.join(root, 'bin', 'hardening-check.mjs'), 'utf8');

function ruleModuleFiles(): string[] {
  return fs.readdirSync(ruleModuleDirectory).filter((name) => name.endsWith('.mjs')).sort();
}

function definitions(): { name: string; module: string }[] {
  const found: { name: string; module: string }[] = [];
  for (const file of ruleModuleFiles()) {
    const source = fs.readFileSync(path.join(ruleModuleDirectory, file), 'utf8');
    for (const match of source.matchAll(/^export function (check\w+)\(/gm)) {
      found.push({ name: match[1] ?? '', module: file.slice(0, -'.mjs'.length) });
    }
  }
  return found;
}

function registrations(): { name: string; module: string }[] {
  return [...registrySource.matchAll(/\{ name: '(check\w+)', module: '([a-z0-9-]+)'/g)]
    .map((match) => ({ name: match[1] ?? '', module: match[2] ?? '' }));
}

test.describe('hardening rule parity', () => {
  test('the rule modules and the registry are both non-empty', () => {
    // Guards every other assertion here: an empty population satisfies a
    // both-directions parity check while proving nothing at all.
    expect(ruleModuleFiles().length).toBeGreaterThanOrEqual(2);
    expect(definitions().length).toBeGreaterThanOrEqual(70);
    expect(registrations().length).toBeGreaterThanOrEqual(70);
  });

  test('the entry point defines no rule of its own', () => {
    // A rule defined in the entry point sits outside the registry's module
    // discovery and would never be enumerated.
    const strays = [...entrySource.matchAll(/^(?:export )?function (check\w+)\(/gm)].map((match) => match[1]);
    expect(strays, `rules defined in the entry point: ${strays.join(', ')}`).toEqual([]);
  });

  test('every defined rule is registered', () => {
    const registered = new Set(registrations().map((rule) => rule.name));
    const dead = definitions().map((rule) => rule.name).filter((name) => !registered.has(name));
    expect(dead, `defined but never registered: ${dead.join(', ')}`).toEqual([]);
  });

  test('every registered rule is defined', () => {
    const defined = new Set(definitions().map((rule) => rule.name));
    const missing = registrations().map((rule) => rule.name).filter((name) => !defined.has(name));
    expect(missing, `registered but never defined: ${missing.join(', ')}`).toEqual([]);
  });

  test('every rule is registered against the module that defines it', () => {
    const definedIn = new Map(definitions().map((rule) => [rule.name, rule.module]));
    const misplaced = registrations()
      .filter((rule) => definedIn.has(rule.name) && definedIn.get(rule.name) !== rule.module)
      .map((rule) => `${rule.name} defined in ${definedIn.get(rule.name)}, registered against ${rule.module}`);
    expect(misplaced, `module mismatch: ${misplaced.join('; ')}`).toEqual([]);
  });

  test('every rule module on disk is carried by the registry', () => {
    const declared = new Set(registrations().map((rule) => rule.module));
    const orphans = ruleModuleFiles()
      .map((file) => file.slice(0, -'.mjs'.length))
      .filter((name) => !declared.has(name));
    expect(orphans, `rule modules no registered rule names: ${orphans.join(', ')}`).toEqual([]);
  });

  test('no rule is registered more than once', () => {
    const counts = new Map<string, number>();
    for (const rule of registrations()) counts.set(rule.name, (counts.get(rule.name) ?? 0) + 1);
    const duplicated = [...counts.entries()].filter(([, count]) => count > 1).map(([name, count]) => `${name} x${count}`);
    expect(duplicated, `registered more than once: ${duplicated.join(', ')}`).toEqual([]);
  });

  test('the registry enumerates its rules with a quantifier and a probe', () => {
    const output = execFileSync('node', ['bin/hardening-check.mjs', '--list-rules'], {
      cwd: root, encoding: 'utf8', timeout: 60_000, maxBuffer: 8 * 1024 * 1024,
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

  test('the enumeration the runner uses is the enumeration --list-rules prints', () => {
    // The two paths must not be able to disagree about which rules exist.
    const output = execFileSync('node', ['bin/hardening-check.mjs', '--list-rules'], {
      cwd: root, encoding: 'utf8', timeout: 60_000, maxBuffer: 8 * 1024 * 1024,
    });
    const listed: string[] = JSON.parse(output).rules.map((rule: { name: string }) => rule.name);
    expect(listed).toEqual(registrations().map((rule) => rule.name));
  });

  test('the rules this campaign added are present and live', () => {
    const registered = new Set(registrations().map((rule) => rule.name));
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
