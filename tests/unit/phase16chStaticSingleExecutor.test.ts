// ---------------------------------------------------------------------------
// Phase 16CH W8 — static single-executor proof.
//
// Mechanically inspects the Phase-16C dependency cone and the runner graph:
//
//   bin/phase7-real.mjs
//     -> playwright.phase7.config.ts
//       -> tests/manual/phase7-real-campaign.ts   (existing manual adapter)
//         -> existing campaign prepare/resume/orchestrator
//           -> existing owner-policy gate -> existing executor
//
// Proves: (1) the binding/admission modules are pure (no execution capability);
// (2) exactly ONE production consumer path exists for portfolio inputs;
// (3) no alternate real runner/executor/network shortcut was introduced in the
// cone. Historical executor-side mechanics INSIDE the adapter (Playwright
// fixtures, Phase-5 relay, read-only git snapshot inspection) are the existing
// architecture, not violations; they are reachable only through resume.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const ROOT = path.resolve(__dirname, '..', '..');

/** The Phase-16C/16CH binding cone: modules that must stay execution-free. */
const PURE_CONE_FILES = [
  'src/core/campaign/runtimeProfile.ts',
  'src/core/portfolio/runtimeBinding.ts',
  'src/core/portfolio/realUniverse.ts',
];

const FORBIDDEN_IN_PURE_CONE = [
  { label: 'child_process import', pattern: /from\s+['"]node:child_process['"]/ },
  { label: 'spawn call', pattern: /\bspawnSync?\s*\(/ },
  { label: 'exec call', pattern: /\bexec(?:File)?Sync?\s*\(/ },
  { label: 'fetch call', pattern: /\bfetch\s*\(/ },
  { label: 'http client import', pattern: /from\s+['"](node:)?https?['"]/ },
  { label: 'playwright import', pattern: /@playwright\/test|playwright-core/ },
  { label: 'dynamic code evaluation', pattern: /\beval\s*\(|new\s+Function\s*\(/ },
  { label: 'net/socket import', pattern: /from\s+['"](node:)?(net|dgram|tls)['"]/ },
] as const;

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test.describe('Phase 16CH W8 — static single-executor proof', () => {
  test('binding cone is execution-free (no process/network/browser/eval capability)', () => {
    const violations: string[] = [];
    for (const file of PURE_CONE_FILES) {
      const source = readRepoFile(file);
      for (const rule of FORBIDDEN_IN_PURE_CONE) {
        if (rule.pattern.test(source)) violations.push(`${file}: ${rule.label}`);
      }
    }
    expect(violations, violations.join('\n')).toEqual([]);
  });

  test('portfolio runtime-plan documents have exactly ONE production consumer chain', () => {
    // Consumer inventory over the whole repo (read-only scan of source dirs).
    const consumers: string[] = [];
    const scanDirs = ['bin', 'src', 'tests/manual', 'tests/unit', 'corpus'];
    const marker = /admitPortfolioRuntimePlan|NIGHTWATCH_PHASE_7_PORTFOLIO_PLAN|verifyFrozenPortfolioOnResume/;
    const walk = (dir: string) => {
      const entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true });
      for (const entry of entries) {
        const rel = path.posix.join(dir, entry.name);
        if (entry.isDirectory()) walk(rel);
        else if (/\.(ts|mjs)$/.test(entry.name)) {
          if (marker.test(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) consumers.push(rel);
        }
      }
    };
    for (const dir of scanDirs) walk(dir);

    const production = consumers
      // The portfolio modules DEFINE the admission API; they are not consumers.
      .filter((file) => !file.startsWith('src/core/portfolio/'))
      .filter((file) => file.startsWith('bin/') || file.startsWith('src/') || file.startsWith('tests/manual/'))
      .sort();
    // bin/portfolio.mjs only PRODUCES plans; it must not consume them.
    expect(production).toEqual(['bin/phase7-real.mjs', 'tests/manual/phase7-real-campaign.ts'].sort());
    // The launcher wires the adapter through the dedicated phase-7 config.
    const launcher = readRepoFile('bin/phase7-real.mjs');
    expect(launcher).toContain('playwright.phase7.config.ts');
    expect(launcher).toContain('--project=nightwatch');
    expect(launcher).toContain('NIGHTWATCH_PHASE_7_PORTFOLIO_PLAN');
    expect(launcher).toContain('NIGHTWATCH_PHASE_7_PORTFOLIO_AUTHORIZATION');
    const phase7Config = readRepoFile('playwright.phase7.config.ts');
    expect(phase7Config).toContain('**/tests/manual/phase7-real-campaign.ts');
    // The adapter re-verifies frozen bindings BEFORE executor construction.
    const adapter = readRepoFile('tests/manual/phase7-real-campaign.ts');
    const verifyIndex = adapter.indexOf('function verifyFrozenPortfolioOnResume');
    const executorIndex = adapter.indexOf('const executor = {');
    expect(verifyIndex).toBeGreaterThan(-1);
    expect(executorIndex).toBeGreaterThan(verifyIndex);
    expect(adapter).toContain('PHASE7_PORTFOLIO_RESUME_AUTHORIZATION_REQUIRED');
    expect(adapter).toContain('PHASE7_PORTFOLIO_FROZEN_BINDING_MISMATCH');
    expect(adapter).toContain('assertPortfolioBudgetFeasible');
  });

  test('no second real runner or executor implementation exists in the cone reachability set', () => {
    const violations: string[] = [];
    // Any file that spawns a Playwright run of the phase-7 config other than
    // the canonical launcher would be a second runner entry point.
    const scanDirs = ['bin', 'src', 'tests/manual'];
    const runnerPattern = /playwright\.phase7\.config\.ts/;
    const walk = (dir: string) => {
      const entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true });
      for (const entry of entries) {
        const rel = path.posix.join(dir, entry.name);
        if (entry.isDirectory()) walk(rel);
        else if (/\.(ts|mjs|cjs|js)$/.test(entry.name)) {
          if (runnerPattern.test(fs.readFileSync(path.join(ROOT, rel), 'utf8')) && rel !== 'bin/phase7-real.mjs') {
            violations.push(`second phase7 runner entry: ${rel}`);
          }
        }
      }
    };
    for (const dir of scanDirs) walk(dir);

    // The adapter must construct its browser contexts via the harness contract,
    // never by launching raw CDP endpoints or second browsers outside Playwright.
    const adapter = readRepoFile('tests/manual/phase7-real-campaign.ts');
    expect(adapter).not.toMatch(/chromium\.launch|firefox\.launch|webkit\.launch/);
    expect(adapter).not.toMatch(/connectOverCDP/);

    expect(violations, violations.join('\n')).toEqual([]);
  });
});
