// Semantic skip-identity enforcement (nightwatch-validation-classification-and-skip-truth-v1).
//
// These probes pin the v2 report contract, exact file/title-path/reason
// matching, and fail-closed behavior for undeclared, reasonless, blanket, and
// missing-report cases.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  evaluateSemanticSkipIdentityReport,
  evaluateSemanticSkipPolicyIdentities,
} from '../../bin/lib/semantic-skip-policy.mjs';
import PlaywrightSkipIdentityReporter from '../helpers/playwrightSkipIdentityReporter';

const REPO_ROOT = path.join(__dirname, '..', '..');
const POLICY = 'only canonical skip identities may skip';
const FILE = 'tests/unit/example.test.ts';
const TITLE_PATH = ['example suite', 'requires its exact local fixture'];

function reportWith(
  entries: Array<{ file?: string; titlePath?: string[]; reason?: string; line?: number | null }>
): unknown {
  return {
    schemaVersion: 'nightwatch.skip-identity-report.v2',
    skips: entries.map((entry) => ({
      file: entry.file ?? FILE,
      line: entry.line ?? 12,
      titlePath: entry.titlePath ?? TITLE_PATH,
      reason: entry.reason ?? 'disposable fixture is unavailable',
    })),
  };
}

const declared = [{ file: FILE, titlePath: TITLE_PATH, reasonToken: 'disposable fixture is unavailable' }];

test.describe('semantic skip-identity policy', () => {
  test('an undeclared skip is UNDECLARED_SKIP with its exact identity', () => {
    const report = reportWith([{ file: 'tests/unit/other.test.ts', titlePath: ['other suite', 'new skip'] }]);
    const result = evaluateSemanticSkipIdentityReport({
      report,
      canonicalSkipIdentities: [],
      expectedSkipPolicy: POLICY,
    });
    expect(result.result).toBe('UNDECLARED_SKIP');
    expect(result.skipped).toBe(1);
    expect(result.undeclared).toEqual([
      {
        file: 'tests/unit/other.test.ts',
        line: 12,
        titlePath: ['other suite', 'new skip'],
        reason: 'disposable fixture is unavailable',
      },
    ]);
  });

  test('an exact file + title path + nonblank reason token is declared', () => {
    const result = evaluateSemanticSkipIdentityReport({
      report: reportWith([{ file: FILE, titlePath: TITLE_PATH, reason: 'disposable fixture is unavailable on this host' }]),
      canonicalSkipIdentities: declared,
      expectedSkipPolicy: POLICY,
    });
    expect(result.result).toBe('PASS');
    expect(result.skipped).toBe(1);
    expect(result.declared).toBe(1);
  });

  test('a same-file skip with a different title path is undeclared', () => {
    const result = evaluateSemanticSkipIdentityReport({
      report: reportWith([{ file: FILE, titlePath: ['example suite', 'different test'] }]),
      canonicalSkipIdentities: declared,
      expectedSkipPolicy: POLICY,
    });
    expect(result.result).toBe('UNDECLARED_SKIP');
  });

  test('a title token cannot substitute for a non-matching skip reason', () => {
    const result = evaluateSemanticSkipIdentityReport({
      report: reportWith([{ file: FILE, titlePath: [...TITLE_PATH, 'disposable fixture is unavailable'] , reason: 'host cannot satisfy a different precondition' }]),
      canonicalSkipIdentities: declared,
      expectedSkipPolicy: POLICY,
    });
    expect(result.result).toBe('UNDECLARED_SKIP');
  });

  test('a skip with no reason is undeclared even when file and title match', () => {
    const result = evaluateSemanticSkipIdentityReport({
      report: reportWith([{ file: FILE, titlePath: TITLE_PATH, reason: '' }]),
      canonicalSkipIdentities: declared,
      expectedSkipPolicy: POLICY,
    });
    expect(result.result).toBe('UNDECLARED_SKIP');
  });

  test('a blanket or reasonless allowlist entry invalidates the policy even with no skips', () => {
    for (const entry of [
      { file: FILE, reasonToken: 'reason without a title path' },
      { file: FILE, titlePath: TITLE_PATH, reasonToken: '' },
      { file: FILE, titlePath: [], reasonToken: 'nonempty reason' },
    ]) {
      const result = evaluateSemanticSkipIdentityReport({
        report: reportWith([]),
        canonicalSkipIdentities: [entry],
        expectedSkipPolicy: POLICY,
      });
      expect(result.result).toBe('SKIP_POLICY_UNCONFIGURED');
    }
  });

  test('an empty allowlist permits zero skips but never permits a skip', () => {
    expect(evaluateSemanticSkipIdentityReport({
      report: reportWith([]),
      canonicalSkipIdentities: [],
      expectedSkipPolicy: POLICY,
    }).result).toBe('PASS');
    expect(evaluateSemanticSkipIdentityReport({
      report: reportWith([{ file: FILE, titlePath: TITLE_PATH }]),
      canonicalSkipIdentities: [],
      expectedSkipPolicy: POLICY,
    }).result).toBe('UNDECLARED_SKIP');
  });

  test('a missing report fails closed with SKIP_REPORT_MISSING', () => {
    expect(evaluateSemanticSkipIdentityReport({
      report: undefined,
      canonicalSkipIdentities: [],
      expectedSkipPolicy: POLICY,
    }).result).toBe('SKIP_REPORT_MISSING');
    expect(evaluateSemanticSkipPolicyIdentities({
      identities: undefined,
      canonicalSkipIdentities: [],
      expectedSkipPolicy: POLICY,
    }).result).toBe('SKIP_REPORT_INVALID');
  });

  test('an unsupported report schema fails closed', () => {
    expect(evaluateSemanticSkipIdentityReport({
      report: { schemaVersion: 'nightwatch.skip-identity-report.v1', skips: [] },
      canonicalSkipIdentities: [],
      expectedSkipPolicy: POLICY,
    }).result).toBe('SKIP_REPORT_INVALID');
  });

  test('a missing policy or expected policy fails closed', () => {
    const report = reportWith([]);
    expect(evaluateSemanticSkipIdentityReport({ report, expectedSkipPolicy: POLICY }).result).toBe('SKIP_POLICY_UNCONFIGURED');
    expect(evaluateSemanticSkipIdentityReport({ report, canonicalSkipIdentities: [] }).result).toBe('SKIP_POLICY_UNCONFIGURED');
    expect(evaluateSemanticSkipIdentityReport({ report, canonicalSkipIdentities: [], expectedSkipPolicy: '  ' }).result).toBe('SKIP_POLICY_UNCONFIGURED');
  });

  test('an authorized reporter refuses missing or non-absolute report paths', () => {
    const previousEnvironment = process.env.NIGHTWATCH_GATE_ENVIRONMENT;
    const previousReportPath = process.env.NIGHTWATCH_SKIP_REPORT_PATH;
    try {
      process.env.NIGHTWATCH_GATE_ENVIRONMENT = 'SHARDS';
      delete process.env.NIGHTWATCH_SKIP_REPORT_PATH;
      expect(() => new PlaywrightSkipIdentityReporter()).toThrow('SKIP_REPORT_PATH_REQUIRED');

      process.env.NIGHTWATCH_GATE_ENVIRONMENT = 'COMPATIBILITY';
      process.env.NIGHTWATCH_SKIP_REPORT_PATH = 'relative/report.json';
      expect(() => new PlaywrightSkipIdentityReporter()).toThrow('SKIP_REPORT_PATH_NOT_ABSOLUTE');
    } finally {
      if (previousEnvironment === undefined) delete process.env.NIGHTWATCH_GATE_ENVIRONMENT;
      else process.env.NIGHTWATCH_GATE_ENVIRONMENT = previousEnvironment;
      if (previousReportPath === undefined) delete process.env.NIGHTWATCH_SKIP_REPORT_PATH;
      else process.env.NIGHTWATCH_SKIP_REPORT_PATH = previousReportPath;
    }
  });

  test('the semantic-compatibility lane authorizes by its timing lane when the gate label is only forwarded (VC-04)', () => {
    const previousEnvironment = process.env.NIGHTWATCH_GATE_ENVIRONMENT;
    const previousLane = process.env.NIGHTWATCH_TIMING_LANE;
    const previousReportPath = process.env.NIGHTWATCH_SKIP_REPORT_PATH;
    const destination = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nw-skip-auth-')), 'report.json');
    try {
      // VC-04 removed semantic-compat's self-declared COMPATIBILITY label, so
      // authorization now follows the lane identity the runner always sets.
      delete process.env.NIGHTWATCH_GATE_ENVIRONMENT;
      process.env.NIGHTWATCH_TIMING_LANE = 'semantic-compatibility';
      delete process.env.NIGHTWATCH_SKIP_REPORT_PATH;
      // Authorized by lane identity, so omitting the path still fails closed.
      expect(() => new PlaywrightSkipIdentityReporter()).toThrow('SKIP_REPORT_PATH_REQUIRED');

      process.env.NIGHTWATCH_SKIP_REPORT_PATH = destination;
      fs.rmSync(destination, { force: true });
      new PlaywrightSkipIdentityReporter().onEnd({ status: 'passed' } as never);
      expect(fs.existsSync(destination)).toBe(true);
      fs.rmSync(destination, { force: true });

      // An unrelated run with neither the gate label nor the compat lane
      // identity stays unauthorized: a present path never grants authority.
      process.env.NIGHTWATCH_TIMING_LANE = 'unrelated';
      new PlaywrightSkipIdentityReporter().onEnd({ status: 'passed' } as never);
      expect(fs.existsSync(destination)).toBe(false);
    } finally {
      if (previousEnvironment === undefined) delete process.env.NIGHTWATCH_GATE_ENVIRONMENT;
      else process.env.NIGHTWATCH_GATE_ENVIRONMENT = previousEnvironment;
      if (previousLane === undefined) delete process.env.NIGHTWATCH_TIMING_LANE;
      else process.env.NIGHTWATCH_TIMING_LANE = previousLane;
      if (previousReportPath === undefined) delete process.env.NIGHTWATCH_SKIP_REPORT_PATH;
      else process.env.NIGHTWATCH_SKIP_REPORT_PATH = previousReportPath;
      fs.rmSync(destination, { force: true });
    }
  });

  test('every authoritative Playwright lane attaches the reporter and fails closed on its report', () => {
    const campaign = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'campaign-synthetic.mjs'), 'utf8');
    const shards = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'run-shards.mjs'), 'utf8');
    const compatibility = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'semantic-compat.mjs'), 'utf8');
    const qualityGate = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'quality-gate.mjs'), 'utf8');
    const packageJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
    const reporter = './tests/helpers/playwrightSkipIdentityReporter.ts';

    expect(campaign).toContain(reporter);
    expect(campaign).toContain('evaluateSemanticSkipIdentityReport');
    expect(shards).toContain(reporter);
    expect(shards).toContain('evaluateSemanticSkipIdentityReport');
    expect(compatibility).toContain(reporter);
    expect(compatibility).toContain('evaluateSemanticSkipIdentityReport');
    expect(packageJson.scripts['test:owner-provenance']).toContain(reporter);
    expect(qualityGate).toContain("ownerEnvironment.NIGHTWATCH_GATE_ENVIRONMENT = 'OWNER_PROVENANCE'");
    expect(qualityGate).toContain('evaluateSemanticSkipIdentityReport');
    expect(qualityGate).toContain("skipPolicyResult !== 'PASS'");
    expect(qualityGate).toContain('SEMANTIC_COMPATIBILITY_${skipPolicyResult}');
    expect(qualityGate).toContain('SYNTHETIC_CAMPAIGN_${skipPolicyResult}');
  });

  test('the live configuration has only exact, reasoned identities for existing files', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'semantic-compatibility.v1.json'), 'utf8')) as {
      execution?: { expectedSkipPolicy?: string; canonicalSkipIdentities?: Array<{ file?: string; titlePath?: string[]; reasonToken?: string }> };
    };
    expect(typeof manifest.execution?.expectedSkipPolicy).toBe('string');
    expect(Array.isArray(manifest.execution?.canonicalSkipIdentities)).toBe(true);
    for (const identity of manifest.execution?.canonicalSkipIdentities ?? []) {
      expect(typeof identity.file).toBe('string');
      expect(Array.isArray(identity.titlePath)).toBe(true);
      expect(identity.titlePath!.length).toBeGreaterThan(0);
      expect(identity.titlePath!.every((part) => typeof part === 'string' && part.trim().length > 0)).toBe(true);
      expect(typeof identity.reasonToken).toBe('string');
      expect(identity.reasonToken!.trim().length).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(REPO_ROOT, String(identity.file)))).toBe(true);
    }
  });
});
