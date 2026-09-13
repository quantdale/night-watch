// Semantic skip-identity enforcement (nightwatch-validation-classification-and-skip-truth-v1).
//
// The policy is pure over a Playwright JSON report; these probes pin the
// undeclared-skip failure, the allowlisted pass, the zero-skip empty
// allowlist, the fail-closed configuration states and the live declaration's
// integrity. The full cone run is the end-to-end probe.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateSemanticSkipPolicy } from '../../bin/lib/semantic-skip-policy.mjs';

const REPO_ROOT = path.join(__dirname, '..', '..');

function reportWith(
  entries: Array<{ file: string; line?: number; title: string; status: string; skipReason?: string }>
): unknown {
  return {
    suites: [
      {
        specs: entries.map((entry) => ({
          file: entry.file,
          line: entry.line ?? 1,
          title: entry.title,
          tests: [
            {
              status: entry.status,
              annotations: entry.skipReason === undefined ? [] : [{ type: 'skip', description: entry.skipReason }],
            },
          ],
        })),
      },
    ],
  };
}

const POLICY = 'only canonical skip identities may skip';

test.describe('semantic skip-identity policy', () => {
  test('an undeclared skip is UNDECLARED_SKIP with its identity', () => {
    const result = evaluateSemanticSkipPolicy({
      report: reportWith([
        { file: 'tests/unit/example.test.ts', line: 12, title: 'needs a snapshot', status: 'skipped', skipReason: 'disposable snapshot not present in this environment' },
      ]),
      canonicalSkipIdentities: [],
      expectedSkipPolicy: POLICY,
    });
    expect(result.result).toBe('UNDECLARED_SKIP');
    expect(result.skipped).toBe(1);
    expect(result.undeclared).toEqual([
      { file: 'tests/unit/example.test.ts', line: 12, title: 'needs a snapshot', reason: 'disposable snapshot not present in this environment' },
    ]);
  });

  test('an allowlisted reason token passes and the skip still counts as skipped', () => {
    const result = evaluateSemanticSkipPolicy({
      report: reportWith([
        { file: 'tests/unit/phase14FreshSourceAdmission.test.ts', title: 'C3-01', status: 'skipped', skipReason: 'requires disposable exact snapshot at /tmp/x' },
        { file: 'tests/unit/example.test.ts', title: 'passes', status: 'expected' },
      ]),
      canonicalSkipIdentities: [{ file: 'tests/unit/phase14FreshSourceAdmission.test.ts', reasonToken: 'requires disposable exact snapshot' }],
      expectedSkipPolicy: POLICY,
    });
    expect(result.result).toBe('PASS');
    expect(result.skipped).toBe(1);
    expect(result.declared).toBe(1);
  });

  test('an allowlisted title token passes for a skip with no message', () => {
    const result = evaluateSemanticSkipPolicy({
      report: reportWith([
        { file: 'tests/unit/selfDevSandboxConfinement.test.ts', title: 'a base owned by another uid fails closed where uid semantics permit the setup', status: 'skipped' },
      ]),
      canonicalSkipIdentities: [{ file: 'tests/unit/selfDevSandboxConfinement.test.ts', reasonToken: 'uid semantics' }],
      expectedSkipPolicy: POLICY,
    });
    expect(result.result).toBe('PASS');
    expect(result.skipped).toBe(1);
  });

  test('an empty allowlist permits zero skips', () => {
    const result = evaluateSemanticSkipPolicy({
      report: reportWith([{ file: 'tests/unit/example.test.ts', title: 'x', status: 'skipped' }]),
      canonicalSkipIdentities: [],
      expectedSkipPolicy: POLICY,
    });
    expect(result.result).toBe('UNDECLARED_SKIP');
  });

  test('a missing allowlist or policy fails closed as SKIP_POLICY_UNCONFIGURED', () => {
    expect(evaluateSemanticSkipPolicy({ report: reportWith([]), expectedSkipPolicy: POLICY }).result).toBe('SKIP_POLICY_UNCONFIGURED');
    expect(evaluateSemanticSkipPolicy({ report: reportWith([]), canonicalSkipIdentities: [] }).result).toBe('SKIP_POLICY_UNCONFIGURED');
    expect(evaluateSemanticSkipPolicy({ report: reportWith([]), canonicalSkipIdentities: [], expectedSkipPolicy: '  ' }).result).toBe(
      'SKIP_POLICY_UNCONFIGURED'
    );
  });

  test('the live configuration declares existing files and a structured allowlist', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'semantic-compatibility.v1.json'), 'utf8')) as {
      execution?: { expectedSkipPolicy?: string; canonicalSkipIdentities?: Array<{ file?: string; reasonToken?: string }> };
    };
    expect(typeof manifest.execution?.expectedSkipPolicy).toBe('string');
    expect(Array.isArray(manifest.execution?.canonicalSkipIdentities)).toBe(true);
    for (const identity of manifest.execution?.canonicalSkipIdentities ?? []) {
      expect(typeof identity.file).toBe('string');
      expect(typeof identity.reasonToken).toBe('string');
      expect(fs.existsSync(path.join(REPO_ROOT, String(identity.file)))).toBe(true);
    }
  });
});
