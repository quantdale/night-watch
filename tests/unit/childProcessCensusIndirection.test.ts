// M8 task 9.11 (R2-03) — the child-process census FAILS CLOSED on the four
// indirection shapes a static reader cannot resolve: a dynamic `import()`, a
// `createRequire` second require graph, a string-built specifier and namespace
// destructuring. The two declared createRequire sites are named, not relaxed.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { KNOWN_CREATE_REQUIRE_SITES, parseChildProcessImports } from '../../bin/lib/childProcessCensus.mjs';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CENSUS = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'lib', 'childProcessCensus.mjs'), 'utf8');

test.describe('child-process census indirection totality (9.11)', () => {
  test('a dynamic import of the child-process module is unresolved', () => {
    const result = parseChildProcessImports("const cp = await import('node:child_process');\n");
    expect(result.unresolvedIndirections).toContain('dynamic-import');
  });

  test('namespace destructuring of a dynamic import is unresolved', () => {
    const result = parseChildProcessImports("const { spawn } = await import('node:child_process');\n");
    expect(result.unresolvedIndirections).toContain('namespace-destructuring');
  });

  test('a string-built specifier is unresolved in every spelling', () => {
    for (const source of [
      "const mm = require('child_' + 'process');\n",
      'const mm = require(`node:${name}`);\n',
      'const mm = require(moduleName);\n',
    ]) {
      expect(parseChildProcessImports(source).unresolvedIndirections, source).toContain('string-built-specifier');
    }
  });

  test('a createRequire site is unresolved unless it is one of the DECLARED sites', () => {
    const foreign = "import { createRequire } from 'node:module';\nconst req = createRequire('/tmp/entry.cjs');\n";
    expect(parseChildProcessImports(foreign).unresolvedIndirections).toContain('create-require');
    // The two declared sites are named explicitly and remain exempt.
    expect(KNOWN_CREATE_REQUIRE_SITES).toHaveLength(2);
    for (const marker of KNOWN_CREATE_REQUIRE_SITES) {
      const declared = `import { createRequire } from 'node:module';\nconst x = ${marker};\n`;
      expect(parseChildProcessImports(declared).unresolvedIndirections, marker).not.toContain('create-require');
    }
    // The exemption is a named list in the source, not a disabled check.
    expect(CENSUS).toContain('KNOWN_CREATE_REQUIRE_SITES');
    expect(CENSUS).toContain('KNOWN_CREATE_REQUIRE_SITES.some');
  });

  test('a plain literal import stays clean, so the census is not merely noisy', () => {
    const clean = "import { spawnSync } from 'node:child_process';\nspawnSync('x', [], { timeout: 1000 });\n";
    const result = parseChildProcessImports(clean);
    expect(result.unresolvedIndirections).toEqual([]);
    expect(result.importsChildProcess).toBe(true);
    expect([...result.bindings]).toContain('spawnSync');
  });

  test('the enforcement rule still fails on any unresolved indirection', () => {
    const rule = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'lib', 'hardening', 'rules', 'process-and-network.mjs'), 'utf8');
    expect(rule).toContain('unresolved import/indirection records (NW-AUD-014 totality)');
    // R2-04's remaining half is recorded OPEN in the ledger, not silently
    // enforced: the rule does not yet require an explicit env allowlist or
    // sync bounds, because the existing call sites are not conformant.
    expect(rule).not.toContain('does not declare an explicit env allowlist');
    expect(rule).not.toContain('synchronous call with no declared');
  });
});
