// R5-02 / review-5 task A2.1 — the rename-blind name-listing totality rule.
//
// D-150 claimed a `--no-renames` TOTALITY rule that was only two text anchors.
// These tests drive the real syntactic scanner over the equivalent rewrites a
// text anchor cannot see, and over the live tracked sources.

import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { RENAME_AWARE_LISTINGS, scanRenameBlindListings } from '../../bin/lib/name-listing-scan.mjs';

const REPO_ROOT = path.join(__dirname, '..', '..');

function count(code: string, fileName = 'sample.mjs', renameAware = false): number {
  return scanRenameBlindListings(code, fileName, { renameAware }).violations.length;
}

test.describe('R5-02 name-listing rename totality', () => {
  test('a listing without --no-renames is a violation in every equivalent form', () => {
    expect(count("run(['diff', '--name-only', base]);")).toBe(1);
    expect(count("git(root, ['diff', '--diff-filter=D', '--name-only', base]);")).toBe(2);
    expect(count("run(['diff-tree', '--root', '--name-only', '-r', commit]);")).toBe(1);
    expect(count("run(['log', '--name-status', range]);")).toBe(1);
    expect(count("run(['diff', ...extra, '--name-status']);")).toBe(1);
    expect(count("spawnSync('git', ['-C', repo, 'show', '--name-only', sha]);")).toBe(1);
    expect(count('const args = ["diff"]; args.push("--name-only");')).toBe(1);
    expect(count("const FLAG = '--name-only'; run(['diff', FLAG, '--no-renames']);")).toBe(1);
    expect(count("execSync('git diff --name-only HEAD~1');")).toBe(1);
    expect(count('execSync(`git diff --name-status HEAD~1`);')).toBe(1);
    expect(count("run(['diff', '--numstat', a, b]);")).toBe(1);
    expect(count("run(['diff', '--raw', a, b]);")).toBe(1);
  });

  test('a proven listing and a non-listing diff are accepted', () => {
    expect(count("run(['diff', '--name-only', '--no-renames', base]);")).toBe(0);
    expect(count("run(['diff', '--no-renames', '--diff-filter=D', '--name-only', base]);")).toBe(0);
    expect(count("execSync('git diff --name-only --no-renames HEAD~1');")).toBe(0);
    expect(count("run(['diff', '--check']);")).toBe(0);
    expect(count("run(['diff', 'HEAD', '--stat']);")).toBe(0);
    expect(count("run(['rev-parse', 'HEAD']);")).toBe(0);
    // A comment or a prose string that merely mentions the flag is not a listing.
    expect(count("// git diff --name-only is rename-blind\nconst note = 'use --name-only carefully';")).toBe(0);
  });

  test('--no-renames must be inside the SAME argv array, not merely nearby', () => {
    expect(count("run(['diff', '--no-renames']); run(['diff', '--name-only', base]);")).toBe(1);
    expect(count("run(['diff', '--name-only', ...['--no-renames'], base]);")).toBe(1);
  });

  test('a rename-aware listing is exempt only in a declared file and only with --find-renames', () => {
    const aware = "run(['diff', '--name-status', '--find-renames', a, b]);";
    expect(count(aware, 'src/core/changeIntelligence/git.ts', true)).toBe(0);
    expect(count(aware, 'bin/other.mjs', false)).toBe(1);
    // Exempt file, but the listing neither proves --no-renames nor names --find-renames.
    expect(count("run(['diff', '--name-status', a, b]);", 'src/core/changeIntelligence/git.ts', true)).toBe(1);
    expect(Object.keys(RENAME_AWARE_LISTINGS)).toEqual(['src/core/changeIntelligence/git.ts']);
  });

  test('the scanner reports line numbers and ignores listing flags inside a TypeScript file', () => {
    const ts = "export function f(root: string): string {\n  return run(root, ['diff', '--name-only', 'HEAD']);\n}\n";
    const result = scanRenameBlindListings(ts, 'sample.ts');
    expect(result.violations).toEqual([expect.objectContaining({ line: 2 })]);
    expect(result.listings).toBe(1);
  });

  test('every live tracked bin and src listing is proven, and the rule really reads the classification sites', () => {
    const files = execFileSync('git', ['ls-files', '-z'], { cwd: REPO_ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
    let listings = 0;
    const seen = new Set<string>();
    for (const file of files) {
      if (!/^(?:bin\/.*\.mjs|src\/.*\.ts)$/.test(file) || file.startsWith('bin/lib/hardening/') || file === 'bin/hardening-check.mjs' || file === 'bin/lib/name-listing-scan.mjs') continue;
      if (!fs.existsSync(path.join(REPO_ROOT, file))) continue;
      const result = scanRenameBlindListings(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'), file, { renameAware: Object.hasOwn(RENAME_AWARE_LISTINGS, file) });
      expect(result.violations, file).toEqual([]);
      listings += result.listings;
      if (result.listings > 0) seen.add(file);
    }
    expect(listings).toBeGreaterThanOrEqual(12);
    for (const required of ['bin/workspace-integrity.mjs', 'bin/project-state-check.mjs', 'bin/agent-state.mjs', 'bin/lib/checkpoint-role.mjs', 'src/core/provenance/localGit.ts', 'src/core/benchmark/preFixSource.ts']) {
      expect(seen.has(required), required).toBe(true);
    }
  });
});
