// NW-AUD-014 — total child-process invocation census.
//
// Proves discovery is non-zero and total over production sources, that every
// invocation classifies under a closed profile, that the three historical
// high-authority leaks (env spread, npx acquisition, stdio:inherit) are gone,
// and that unclassified dynamic nodes fail closed.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildChildProcessCensus,
  classifyInvocation,
  EXECUTION_PROFILES,
  parseChildProcessImports,
} from '../../bin/lib/childProcessCensus.mjs';

const ROOT = path.join(__dirname, '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'test-results', 'artifacts'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(mjs|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

function productionSources() {
  const files = ['bin', 'src'].flatMap((d) => walk(path.join(ROOT, d)));
  return files.map((file) => ({
    file: path.relative(ROOT, file).split(path.sep).join('/'),
    source: fs.readFileSync(file, 'utf8'),
  }));
}

test('NW-AUD-014: production census is non-zero, total, and digestible', () => {
  const census = buildChildProcessCensus(productionSources());
  expect(census.schemaVersion).toBe('nightwatch.child-process-census.v1');
  expect(census.importFileCount).toBeGreaterThanOrEqual(10);
  expect(census.invocationCount).toBeGreaterThanOrEqual(50);
  expect(census.unclassifiedCount).toBe(0);
  expect(census.unclassified).toEqual([]);
  expect(census.digest).toMatch(/^sha256:[0-9a-f]{24}$/);
  for (const profile of EXECUTION_PROFILES) {
    expect(Object.prototype.hasOwnProperty.call(census.byProfile, profile)).toBe(true);
  }
  expect(census.importFiles.length).toBe(census.importFileCount);
  expect(new Set(census.invocations.map((n) => n.identity)).size).toBe(census.invocations.length);
});

test('NW-AUD-014: historical high-authority leaks are absent from classified nodes', () => {
  const census = buildChildProcessCensus(productionSources());
  const leaks = census.invocations.filter((node) =>
    (node.spreadsProcessEnv && node.profile !== 'CONTAINED_ENVELOPE')
    || node.usesNpx
    || (node.hasInheritStdio && node.profile !== 'CONTAINED_ENVELOPE')
    || node.hasShellTrue);
  expect(leaks.map((n) => n.identity)).toEqual([]);
  const l6 = census.invocations.filter((n) => n.file === 'src/core/oops/l6.ts');
  expect(l6.length).toBeGreaterThan(0);
  for (const node of l6) expect(node.profile).toBe('CONTAINED_ENVELOPE');
});

test('NW-AUD-014: dynamic unknown invocations fail closed', () => {
  const profile = classifyInvocation({
    file: 'bin/unknown-tool.mjs',
    callee: 'spawnSync',
    argsText: 'mysteryExecutable, ["--run"], { timeout: 1, maxBuffer: 1 }',
    optionsText: '{ timeout: 1, maxBuffer: 1 }',
  });
  expect(profile).toBeNull();
});

test('NW-AUD-014: import parser binds named, default, and namespace forms', () => {
  const named = parseChildProcessImports("import { spawnSync, spawn as sp } from 'node:child_process';");
  expect(named.importsChildProcess).toBe(true);
  expect(named.bindings.has('spawnSync')).toBe(true);
  expect(named.bindings.has('sp')).toBe(true);

  const ns = parseChildProcessImports("import * as cp from 'node:child_process';");
  expect(ns.importsChildProcess).toBe(true);
  expect(ns.namespaces.has('cp')).toBe(true);

  const req = parseChildProcessImports("const { execFileSync } = require('child_process');");
  expect(req.importsChildProcess).toBe(true);
  expect(req.bindings.has('execFileSync')).toBe(true);
});

test('NW-AUD-014: the manual 17-file launcher list is no longer the totality authority', () => {
  const rule = fs.readFileSync(path.join(ROOT, 'bin/lib/hardening/rules/process-and-network.mjs'), 'utf8');
  expect(rule).toContain('buildChildProcessCensus');
  expect(rule).toContain('unclassifiedCount');
  expect(rule).toMatch(/census\.unclassifiedCount\s*!==\s*0/);
});
