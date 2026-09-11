#!/usr/bin/env node
/**
 * Phase 8B.1-R1 — read-only canonical adopted-case catalog integrity check.
 *
 * Proves, for ANY legitimate catalog cardinality (0 .. max entries):
 *   1. the whole checkout is clean (no staged/unstaged/untracked changes);
 *   2. the generated catalog file is the exact fixed target path and a real
 *      file (never a symlink);
 *   3. its contents validate under the real `validateAdoptedCatalog`
 *      (schema, registry-derived coverage, base-independent identity, no
 *      duplicate IDs / duplicate equivalent fingerprints, no unknown fields,
 *      no count overflow) — the generated module itself fails closed on
 *      corruption at load time;
 *   4. the on-disk bytes are byte-identical to the deterministic
 *      `renderAdoptedCatalogSource(...)` output (canonical round-trip);
 *   5. the file contains no executable shape (no imports/requires/functions/
 *      arrows/eval/process access) outside its own explanatory comments.
 *
 * This replaces the historical "real catalog must stay empty" gate: EMPTY,
 * one-entry, and future two-entry/exhausted states are all legitimate as long
 * as the invariants above hold. The check performs ZERO writes: no filesystem
 * mutation, no Git mutation, no network, no external calls.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELFDEV_ADOPTED_CATALOG_TARGET_PATH = 'src/core/selfDev/adoptedCaseCatalog.generated.ts';

function loadTypeScriptModule(file) {
  return loadRuntimeTypeScriptModule(file, { root });
}

function fail(code) {
  throw new Error(code);
}

function runGitStatusPorcelain(repositoryRoot) {
  const result = spawnSync('git', ['status', '--porcelain'], {
    cwd: repositoryRoot,
    env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C', GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_NOSYSTEM: '1' },
    shell: false,
    encoding: 'utf8',
    // A clean checkout with its freshly installed node_modules can require
    // several seconds for Git's ignored-file walk. Keep the bounded guard,
    // but leave enough headroom for the authoritative clean gate.
    timeout: 30_000,
    maxBuffer: 512 * 1024,
  });
  if (result.status !== 0) fail('SELFDEV_CATALOG_INTEGRITY_GIT_FAILED');
  return (result.stdout ?? '').trim();
}

function main() {
  const porcelain = runGitStatusPorcelain(root);
  if (porcelain !== '') fail('SELFDEV_CATALOG_INTEGRITY_CHECKOUT_DIRTY');

  const absoluteTarget = path.join(root, SELFDEV_ADOPTED_CATALOG_TARGET_PATH);
  let targetStat;
  try {
    targetStat = fs.lstatSync(absoluteTarget);
  } catch {
    fail('SELFDEV_CATALOG_INTEGRITY_TARGET_MISSING');
  }
  if (targetStat.isSymbolicLink() || !targetStat.isFile()) fail('SELFDEV_CATALOG_INTEGRITY_TARGET_NONCANONICAL');
  const bytes = fs.readFileSync(absoluteTarget, 'utf8');

  // Pure-data shape: the generated file is a header comment plus one
  // `export const SELFDEV_ADOPTED_CASES = <array literal>;`. Strip comments
  // before looking for executable shapes so the explanatory header itself
  // cannot cause a false positive.
  const codeLines = bytes.split('\n').filter((line) => !line.trim().startsWith('//'));
  if (/^\s*(?:import|require)\b|function\s+|=>|eval\s*\(|process\.|new\s+Function\s*\(/.test(codeLines.join('\n'))) {
    fail('SELFDEV_CATALOG_INTEGRITY_EXECUTABLE_SHAPE');
  }
  if (!/export const SELFDEV_ADOPTED_CASES = (?:\[\]|\[)/.test(bytes)) {
    fail('SELFDEV_CATALOG_INTEGRITY_ARRAY_LITERAL_MISSING');
  }

  const adoptedCasesModule = loadTypeScriptModule('src/core/selfDev/adoptedCases.ts');
  const validated = adoptedCasesModule.validateAdoptedCatalog(adoptedCasesModule.SELFDEV_ADOPTED_CASES);
  const rendered = adoptedCasesModule.renderAdoptedCatalogSource(validated);
  if (bytes !== rendered) fail('SELFDEV_CATALOG_INTEGRITY_RENDERER_MISMATCH');

  const digest = `sha256:${createHash('sha256').update(bytes, 'utf8').digest('hex')}`;
  console.log(JSON.stringify({
    status: 'PASS',
    targetPath: SELFDEV_ADOPTED_CATALOG_TARGET_PATH,
    catalogCount: validated.length,
    catalogDigest: digest,
    rendererRoundTrip: true,
    checkoutClean: true,
    maxEntries: adoptedCasesModule.SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES,
  }, null, 2));
}

try {
  main();
} catch (error) {
  const code = error instanceof Error ? error.message.split(':')[0] : 'SELFDEV_CATALOG_INTEGRITY_FAILED';
  console.error(code);
  process.exitCode = 1;
}
