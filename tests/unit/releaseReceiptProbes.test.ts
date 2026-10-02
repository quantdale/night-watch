// R5-05 / review-5 task A4.1 — the three receipt-consuming release probes,
// driven directly with real receipts at a real checkpoint.
//
// G18 (UI harness), G12 (yield campaign) and G20 (accessibility) each resolve MET
// only for a receipt whose recorded SHA is EXACTLY the certified checkpoint S. A
// receipt rebound to S in memory (`parsed.summary.sha = S`, `raw.nightwatchSha ??
// S`) or a relation overwritten to BOUND would certify evidence about another
// commit; each such mutant fails an assertion here.

import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ACCESSIBILITY_RECORD_PATH } from '../../bin/lib/accessibility-record.mjs';
import { YIELD_AUTHORIZATION_PATH, probeAccessibility, probeUiErrorTaxonomy, probeYieldCampaignResult } from '../../bin/lib/release-receipt-probes.mjs';
import { UI_HARNESS_FILE, UI_HARNESS_RECEIPT_PATH, UI_HARNESS_REQUIRED_TESTS, UI_HARNESS_SUITE, buildUiHarnessReceipt } from '../../bin/lib/ui-harness-receipt.mjs';
import { buildProductRunReceipt } from '../../src/core/agentRuntime/productRunReceipt';
import { uiHarnessReceiptDigest } from '../../bin/lib/ui-harness-receipt.mjs';
import { verifyPersistedReceipt } from '../../bin/lib/release-evidence.mjs';

const REPO = path.join(__dirname, '..', '..');
const S = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);

function scratchRoot(): { root: string; cleanup: () => void } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-receiptprobes-'));
  return { root, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

function writeJson(root: string, relative: string, value: unknown): void {
  fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
  fs.writeFileSync(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`);
}

test.describe('G20 accessibility certification probe', () => {
  const passSection = { status: 'PASS', executedAt: '2026-09-26T00:00:00.000Z' };
  const record = (sha: string) => ({
    schemaVersion: 'nightwatch.accessibility-certification.v1',
    nightwatchSha: sha,
    treeClean: true,
    updatedAt: '2026-09-26T00:00:00.000Z',
    sections: {
      certification: { ...passSection, views: 8 },
      keyboard: { ...passSection, walks: 14, focusIndicator: { measured: 12, minimum: 4.83, samples: [], violations: [] } },
    },
  });
  function withLaneSources(root: string): void {
    fs.mkdirSync(path.join(root, 'tests/unit'), { recursive: true });
    fs.mkdirSync(path.join(root, 'tests/browser'), { recursive: true });
    fs.writeFileSync(path.join(root, 'tests/unit/accessibilityAudit.test.ts'), '');
    fs.writeFileSync(path.join(root, 'tests/browser/accessibilityCertification.browser.ts'), '');
  }

  test('a record bound to S is MET; a record bound to another commit is NOT_AT_CHECKPOINT, never MET', () => {
    const s = scratchRoot();
    try {
      withLaneSources(s.root);
      writeJson(s.root, ACCESSIBILITY_RECORD_PATH, record(S));
      expect(probeAccessibility(s.root, S).state).toBe('MET');
      writeJson(s.root, ACCESSIBILITY_RECORD_PATH, record(OTHER));
      const other = probeAccessibility(s.root, S);
      expect(other.state).toBe('NOT_AT_CHECKPOINT');
      expect(other.detail).toContain(OTHER.slice(0, 8));
    } finally {
      s.cleanup();
    }
  });

  test('an absent record, a rejected record and absent lane sources are UNMET', () => {
    const s = scratchRoot();
    try {
      expect(probeAccessibility(s.root, S).state).toBe('UNMET');
      withLaneSources(s.root);
      expect(probeAccessibility(s.root, S).state).toBe('UNMET');
      writeJson(s.root, ACCESSIBILITY_RECORD_PATH, { ...record(S), treeClean: false });
      const rejected = probeAccessibility(s.root, S);
      expect(rejected.state).toBe('UNMET');
      expect(rejected.detail).toContain('rejected');
    } finally {
      s.cleanup();
    }
  });
});

test.describe('G18 UI-harness probe', () => {
  function uiFixture(): { root: string; cleanup: () => void; build: (sha: string, failFirst?: boolean) => unknown; head: string } {
    const s = scratchRoot();
    const environment = { PATH: process.env.PATH ?? '', HOME: s.root, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'nw', GIT_AUTHOR_EMAIL: 'nw@example.invalid', GIT_COMMITTER_NAME: 'nw', GIT_COMMITTER_EMAIL: 'nw@example.invalid' };
    const git = (args: string[]) => spawnSync('git', args, { cwd: s.root, env: environment, encoding: 'utf8', shell: false });
    git(['init', '--quiet', '-b', 'main']);
    const harnessSource = fs.readFileSync(path.join(REPO, 'ui/control-center/src/contractRender.test.tsx'), 'utf8');
    const typesSource = fs.readFileSync(path.join(REPO, 'ui/control-center/src/types.ts'), 'utf8');
    for (const [relative, text] of [['ui/control-center/src/contractRender.test.tsx', harnessSource], ['ui/control-center/src/types.ts', typesSource]] as const) {
      fs.mkdirSync(path.dirname(path.join(s.root, relative)), { recursive: true });
      fs.writeFileSync(path.join(s.root, relative), text);
    }
    git(['add', '--all']);
    git(['commit', '--quiet', '--no-gpg-sign', '-m', 'S']);
    const head = (git(['rev-parse', 'HEAD']).stdout ?? '').trim();
    const harnessTests = (harnessSource.match(/^\s*(?:it|test)\(/gm) ?? []).length;
    const harnessSuite = UI_HARNESS_REQUIRED_TESTS.filter((entry) => entry.suite === UI_HARNESS_SUITE);
    const otherSuite = UI_HARNESS_REQUIRED_TESTS.filter((entry) => entry.suite !== UI_HARNESS_SUITE);
    const extras = harnessTests - harnessSuite.length - 1 - otherSuite.length;
    const vitestFile = {
      filepath: `/repo/ui/control-center/${UI_HARNESS_FILE}`,
      tasks: [
        { type: 'suite', name: UI_HARNESS_SUITE, tasks: [
          ...harnessSuite.map((entry) => ({ type: 'test', name: `${entry.titlePrefix} (fixture)`, result: { state: 'pass' } })),
          { type: 'test', name: 'offers retry only for NETWORK, TIMEOUT, 408 and 429', result: { state: 'pass' } },
          ...Array.from({ length: extras }, (_, index) => ({ type: 'test', name: `fixture remainder ${index}`, result: { state: 'pass' } })),
        ] },
        { type: 'suite', name: 'control center render truth', tasks: otherSuite.map((entry) => ({ type: 'test', name: `${entry.titlePrefix} (fixture)`, result: { state: 'pass' } })) },
      ],
    };
    const build = (sha: string, failFirst = false) => {
      const files = failFirst
        ? [{ ...vitestFile, tasks: [{ ...vitestFile.tasks[0]!, tasks: (vitestFile.tasks[0] as { tasks: Array<Record<string, unknown>> }).tasks.map((task, index) => (index === 0 ? { ...task, result: { state: 'fail' } } : task)) }, vitestFile.tasks[1]!] }]
        : [vitestFile];
      return buildUiHarnessReceipt({ files, headSha: sha, treeClean: true, typesSource, harnessSource, executedAt: '2026-09-30T00:00:00.000Z' });
    };
    return { root: s.root, cleanup: s.cleanup, build, head };
  }

  test('a receipt bound to S is MET; one bound to another commit is NOT_AT_CHECKPOINT; absent or tampered is UNMET', () => {
    const f = uiFixture();
    try {
      writeJson(f.root, UI_HARNESS_RECEIPT_PATH, f.build(f.head));
      expect(probeUiErrorTaxonomy(f.root, f.head).state).toBe('MET');
      writeJson(f.root, UI_HARNESS_RECEIPT_PATH, f.build(OTHER));
      expect(probeUiErrorTaxonomy(f.root, f.head).state).toBe('NOT_AT_CHECKPOINT');
      writeJson(f.root, UI_HARNESS_RECEIPT_PATH, { ...(f.build(f.head) as Record<string, unknown>), receiptDigest: `sha256:${'0'.repeat(24)}` });
      expect(probeUiErrorTaxonomy(f.root, f.head).state).toBe('UNMET');
      fs.rmSync(path.join(f.root, UI_HARNESS_RECEIPT_PATH));
      expect(probeUiErrorTaxonomy(f.root, f.head).state).toBe('UNMET');
    } finally {
      f.cleanup();
    }
  });

  // R5-14 — the UI receipt could never verify: its digest lacked the `receipt:` prefix
  // (RECEIPT_KIND_UNSUPPORTED) and, once prefixed, it had no verdict field
  // (RECEIPT_VERDICT_MISSING). The proof here is REAL producer output through the REAL verifier.
  test('the producer output verifies for ui-error-taxonomy-rendering at its SHA, and only then', () => {
    const f = uiFixture();
    try {
      const receipt = f.build(f.head) as Record<string, unknown>;
      expect(receipt.result).toBe('PASS');
      expect(String(receipt.receiptDigest)).toMatch(/^receipt:sha256:[0-9a-f]{24}$/);
      writeJson(f.root, UI_HARNESS_RECEIPT_PATH, receipt);
      expect(verifyPersistedReceipt(f.root, 'ui-error-taxonomy-rendering', String(receipt.receiptDigest), f.head)).toEqual({ verified: true, reason: 'VERIFIED' });
      expect(verifyPersistedReceipt(f.root, 'ui-error-taxonomy-rendering', String(receipt.receiptDigest), OTHER).verified).toBe(false);
      expect(verifyPersistedReceipt(f.root, 'completion-ledger-truth', String(receipt.receiptDigest), f.head).verified).toBe(false);
    } finally {
      f.cleanup();
    }
  });

  // R5-13 — in a clean clone the host-local receipt directory does not exist: the probe falls back to
  // the TRACKED verbatim copy of S, evaluated by the same evaluator.
  test('a clean clone resolves MET from the tracked verbatim receipt of S, and never from another checkpoint', () => {
    const f = uiFixture();
    try {
      const tracked = (sha: string) => `evidence/certification/${sha}/ui-error-taxonomy-rendering.json`;
      writeJson(f.root, tracked(f.head), f.build(f.head));
      expect(fs.existsSync(path.join(f.root, UI_HARNESS_RECEIPT_PATH))).toBe(false);
      expect(probeUiErrorTaxonomy(f.root, f.head).state).toBe('MET');
      // The tracked file of ANOTHER checkpoint is not consulted for S.
      fs.rmSync(path.join(f.root, tracked(f.head)));
      writeJson(f.root, tracked(OTHER), f.build(OTHER));
      expect(probeUiErrorTaxonomy(f.root, f.head).state).toBe('UNMET');
      // A tampered tracked copy is rejected by the evaluator.
      writeJson(f.root, tracked(f.head), { ...(f.build(f.head) as Record<string, unknown>), treeClean: false });
      expect(probeUiErrorTaxonomy(f.root, f.head).state).toBe('UNMET');
    } finally {
      f.cleanup();
    }
  });

  test('a recorded verdict that disagrees with the recorded tests is rejected by the evaluator in either direction', () => {
    const f = uiFixture();
    try {
      const inconsistent = { ...(f.build(f.head) as Record<string, unknown>), result: 'FAIL' };
      (inconsistent as Record<string, unknown>).receiptDigest = uiHarnessReceiptDigest(inconsistent);
      writeJson(f.root, UI_HARNESS_RECEIPT_PATH, inconsistent);
      const probed = probeUiErrorTaxonomy(f.root, f.head);
      expect(probed.state).toBe('UNMET');
      expect(probed.detail).toContain('UI_HARNESS_RECEIPT_RESULT_MISMATCH');
    } finally {
      f.cleanup();
    }
  });

  test('a failing harness test yields a FAIL receipt, and a forged PASS over it never verifies or probes MET', () => {
    const f = uiFixture();
    try {
      expect((f.build(f.head, true) as Record<string, unknown>).result).toBe('FAIL');
      const good = f.build(f.head) as { harness: { tests: Array<{ status: string }> } } & Record<string, unknown>;
      const failed = { ...good, harness: { ...good.harness, tests: good.harness.tests.map((test, index) => (index === 0 ? { ...test, status: 'FAIL' } : test)) }, result: 'PASS' } as Record<string, unknown>;
      failed.receiptDigest = uiHarnessReceiptDigest(failed);
      writeJson(f.root, UI_HARNESS_RECEIPT_PATH, failed);
      const verdict = verifyPersistedReceipt(f.root, 'ui-error-taxonomy-rendering', String(failed.receiptDigest), f.head);
      expect(verdict.verified).toBe(false);
      expect(verdict.reason).toBe('RECEIPT_SUBJECT_NOT_EXECUTED:ui-error-taxonomy-rendering');
      expect(probeUiErrorTaxonomy(f.root, f.head).state).toBe('UNMET');
    } finally {
      f.cleanup();
    }
  });
});

test.describe('G12 yield-campaign probe', () => {
  const sibling = { repository: 'mobingilabs/ouchan', headSha: '1'.repeat(40), statusDigest: 'sha256:aa', diffDigest: 'sha256:bb' };
  const PRINT_CLI = `sha256:${'b'.repeat(24)}`;
  const authorization = (overrides: Record<string, unknown> = {}) => ({
    schemaVersion: 'nightwatch.yield-run-authorization.v1',
    grantId: 'parent-12.3',
    state: 'GRANTED',
    maxQualifyingRuns: 1,
    declared: { printCliDigest: PRINT_CLI, provider: 'test-provider', model: 'test-model' },
    ...overrides,
  });
  function runArtifacts(sha: string, runId: string, identity: Record<string, unknown> = {}) {
    const observations = [sibling];
    const receipt = buildProductRunReceipt({
      campaignId: 'synthetic-yield',
      generatedAt: '2026-09-30T00:00:00.000Z',
      result: {
        terminationReason: 'COMPLETE_NO_FINDING',
        terminationCounts: { COMPLETE_NO_FINDING: 1 },
        providerAttribution: { terminationClass: 'VALID_PROVIDER_RUN', totalCalls: 3, completedCalls: 3, failures: 0, byClass: {} } as never,
        persistedFindings: [],
        reproductionCount: 2,
        toolActionCount: 5,
      },
      before: observations as never,
      after: observations as never,
      leakScan: { result: 'CLEAN', findings: 0, scannedChars: 10 },
      nightwatchIdentity: { sha, treeClean: true },
      campaignKind: 'PRINT_CLI_PROVIDER' as never,
      reasonerIdentity: { kind: 'PRINT_CLI_PROVIDER', identityDigest: `rid:sha256:${'a'.repeat(24)}`, printCliDigest: PRINT_CLI, provider: 'test-provider', model: 'test-model', ...identity } as never,
    });
    return { manifest: { runId, product: 'campaign', nightwatchSha: sha }, summary: { passed: true }, receipt };
  }
  function yieldRoot(sha: string, options: { identity?: Record<string, unknown>; authorization?: unknown; runs?: number } = {}): { root: string; cleanup: () => void } {
    const s = scratchRoot();
    // The probe loads the receipt evaluator as TypeScript FROM the root it is given.
    fs.symlinkSync(path.join(REPO, 'src'), path.join(s.root, 'src'), 'dir');
    for (let index = 1; index <= (options.runs ?? 1); index += 1) {
      const run = runArtifacts(sha, `run-${index}`, options.identity ?? {});
      writeJson(s.root, `artifacts/nightwatch-run-${index}/manifest.json`, run.manifest);
      writeJson(s.root, `artifacts/nightwatch-run-${index}/summary.json`, run.summary);
      writeJson(s.root, `artifacts/nightwatch-run-${index}/product-run-receipt.json`, run.receipt);
    }
    if (options.authorization !== null) writeJson(s.root, YIELD_AUTHORIZATION_PATH, options.authorization ?? authorization());
    return s;
  }

  test('a campaign receipt at S is MET; one at another commit is NOT_AT_CHECKPOINT; none at all is UNMET', () => {
    const bound = yieldRoot(S);
    const other = yieldRoot(OTHER);
    const empty = scratchRoot();
    try {
      fs.symlinkSync(path.join(REPO, 'src'), path.join(empty.root, 'src'), 'dir');
      const met = probeYieldCampaignResult(bound.root, S);
      expect(met.state, met.detail).toBe('MET');
      const notAt = probeYieldCampaignResult(other.root, S);
      expect(notAt.state, notAt.detail).toBe('NOT_AT_CHECKPOINT');
      expect(probeYieldCampaignResult(empty.root, S).state).toBe('UNMET');
    } finally {
      bound.cleanup();
      other.cleanup();
      empty.cleanup();
    }
  });

  // R5-15 / review-5 task B4.1 — a run qualifies only against the GRANTED record of the single
  // authorized paid run and only with the exact print CLI, provider and model it declares.
  test('a run with no GRANTED authorization, a different print CLI, provider or model, or an unrecorded identity never qualifies', () => {
    const cases: Array<[string, Parameters<typeof yieldRoot>[1], RegExp]> = [
      ['no authorization record', { authorization: null }, /YIELD_RECEIPT_RUN_NOT_AUTHORIZED/],
      ['NOT_GRANTED', { authorization: authorization({ state: 'NOT_GRANTED', declared: { printCliDigest: null, provider: null, model: null } }) }, /YIELD_RECEIPT_RUN_NOT_AUTHORIZED/],
      ['a different print CLI', { identity: { printCliDigest: `sha256:${'c'.repeat(24)}` } }, /YIELD_RECEIPT_PRINT_CLI_NOT_AUTHORIZED/],
      ['an unrecorded print CLI', { identity: { printCliDigest: null } }, /YIELD_RECEIPT_PRINT_CLI_NOT_AUTHORIZED/],
      ['a different model', { identity: { model: 'other-model' } }, /YIELD_RECEIPT_MODEL_NOT_AUTHORIZED/],
      ['a different provider', { identity: { provider: 'other-provider' } }, /YIELD_RECEIPT_MODEL_NOT_AUTHORIZED/],
      ['an unrecorded model', { identity: { model: null } }, /YIELD_RECEIPT_MODEL_NOT_AUTHORIZED/],
      ['an invalid authorization record', { authorization: { schemaVersion: 'x' } }, /YIELD_RECEIPT_RUN_NOT_AUTHORIZED/],
    ];
    for (const [label, options, expected] of cases) {
      const r = yieldRoot(S, options);
      try {
        const probed = probeYieldCampaignResult(r.root, S);
        expect(probed.state, label).toBe('UNMET');
        expect(probed.detail, label).toMatch(expected);
      } finally {
        r.cleanup();
      }
    }
  });

  test('the authorized budget bounds the qualifying runs at S', () => {
    const one = yieldRoot(S, { runs: 1 });
    const two = yieldRoot(S, { runs: 2 });
    const twoAllowed = yieldRoot(S, { runs: 2, authorization: authorization({ maxQualifyingRuns: 2 }) });
    try {
      expect(probeYieldCampaignResult(one.root, S).state).toBe('MET');
      const exceeded = probeYieldCampaignResult(two.root, S);
      expect(exceeded.state).toBe('UNMET');
      expect(exceeded.detail).toContain('YIELD_BUDGET_EXCEEDED');
      expect(probeYieldCampaignResult(twoAllowed.root, S).state).toBe('MET');
    } finally {
      one.cleanup();
      two.cleanup();
      twoAllowed.cleanup();
    }
  });
});
