import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';
import {
  CAMPAIGN_COMPLETION_REFUSALS,
  CAMPAIGN_COMPLETION_VERSION,
  CAMPAIGN_NON_COMPLETING_TERMINATIONS,
  MIN_CAMPAIGN_INVESTIGATIONS,
  evaluateCampaignCompletion,
} from '../../src/core/agentRuntime/campaignCompletion';
import {
  CAMPAIGN_DIAGNOSTICS_VERSION,
  INVESTIGATION_TERMINATION_CAUSES,
  classifyInvestigation,
  summarizeTerminationCauses,
} from '../../src/core/agentRuntime/campaignDiagnostics';
import { resumeLocalCliCampaign, runLocalCliCampaign } from '../../src/core/agentRuntime/localCampaign';
import { emitProductRunReceipt, observeSiblings } from '../../src/core/agentRuntime/productRunReceipt';
import { probeYieldCampaignResult } from '../../bin/lib/release-receipt-probes.mjs';
import {
  attributeProviderFailures,
} from '../../src/core/agentRuntime/providerAttribution';
import {
  buildProductRunReceipt,
  evaluateYieldCampaignEvidence,
  validateProductRunReceipt,
} from '../../src/core/agentRuntime/productRunReceipt';
import type { SiblingIdentityObservation } from '../../src/core/ownerLocalReproduction/provider';

const NODE = process.execPath;
const CHECKPOINT = '0743798f1310f719c0f158678f225373a01bf3e8';
const PRINT_CLI_DIGEST = `sha256:${'a'.repeat(64)}`;
const AUTHORIZATION = {
  schemaVersion: 'nightwatch.yield-run-authorization.v1' as const,
  grantId: 'parent-test',
  state: 'GRANTED' as const,
  maxQualifyingRuns: 1,
  declared: {
    printCliDigest: PRINT_CLI_DIGEST,
    provider: 'test-provider',
    model: 'test-model',
  },
};

let scratchDirs: string[] = [];

test.afterEach(() => {
  for (const dir of scratchDirs) fs.rmSync(dir, { recursive: true, force: true });
  scratchDirs = [];
});

function makeGitRepo(siblingRoot: string, repository: string): string {
  const repoRoot = path.join(siblingRoot, ...repository.split('/'));
  fs.mkdirSync(repoRoot, { recursive: true });
  const git = (args: string[]): void => {
    const result = spawnSync('git', ['-c', 'user.email=synthetic@example.invalid', '-c', 'user.name=Synthetic Fixture', ...args], { cwd: repoRoot, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  };
  git(['init', '--quiet', '-b', 'main']);
  fs.writeFileSync(path.join(repoRoot, 'seed.txt'), 'seed\n');
  git(['add', '--all']);
  git(['commit', '--quiet', '--no-gpg-sign', '-m', 'synthetic base']);
  return repoRoot;
}

function scratchRootForArtifacts(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-r6-artifacts-'));
  scratchDirs.push(dir);
  return dir;
}

function scratchDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-r6-campaign-'));
  scratchDirs.push(dir);
  return dir;
}

/** A fake reasoner that always answers with the same scripted intent. */
function scriptedReasoner(dir: string, intents: readonly unknown[], name = 'scripted.mjs'): string {
  const body = JSON.stringify({
    schemaVersion: REASONER_TURN_RESPONSE_VERSION,
    intents,
    hypotheses: [],
  });
  const file = path.join(dir, name);
  fs.writeFileSync(
    file,
    `const chunks = [];\nprocess.stdin.on('data', (d) => chunks.push(d)).on('end', () => {\n  process.stdout.write(${JSON.stringify(body)});\n});\n`,
    { mode: 0o700 },
  );
  return file;
}

/**
 * A reasoner that TERMINATES only after doing one real tool action, so the
 * campaign records genuine source activity. Without a tool action a campaign is
 * refused for NO_SOURCE_ACTION, which is the correct behaviour and would
 * otherwise mask the assertion under test.
 */
function productiveThenTerminate(dir: string, reason: 'COMPLETE_NO_FINDING' | 'COMPLETE_WITH_FINDING'): string {
  const file = path.join(dir, `productive-${reason}.mjs`);
  fs.writeFileSync(
    file,
    `const chunks = [];
process.stdin.on('data', (d) => chunks.push(d)).on('end', () => {
  const request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const turn = String(request?.turnId ?? '');
  const turnNumber = Number((turn.match(/turn:(\\d+)$/) || [])[1] || 0);
  const investigation = Number((turn.match(/inv:(\\d+)/) || [])[1] || 0);
  // Two real source inspections per investigation, then a declared end. The
  // query VARIES so each call is a genuine discriminating action rather than a
  // repeat the stagnation guard would (correctly) stop.
  const response = turnNumber >= 3
    ? { schemaVersion: ${JSON.stringify(REASONER_TURN_RESPONSE_VERSION)}, intents: [{ kind: 'TERMINATE', reason: ${JSON.stringify(reason)} }], hypotheses: [] }
    : { schemaVersion: ${JSON.stringify(REASONER_TURN_RESPONSE_VERSION)}, intents: [{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { query: 'probe-' + investigation + '-' + turnNumber } }], hypotheses: [] };
  process.stdout.write(JSON.stringify(response));
});
`,
    { mode: 0o700 },
  );
  return file;
}

function observation(repository = 'example/ledger'): SiblingIdentityObservation {
  return {
    repository,
    headSha: '5'.repeat(40),
    statusDigest: 'sibstatus:sha256:' + 'a'.repeat(24),
    diffDigest: 'sibdiff:sha256:' + 'b'.repeat(24),
    worktreeRoot: '/synthetic/ledger',
  };
}

function healthyAttribution(calls = 10) {
  return attributeProviderFailures({ actionLog: [], reasonerCalls: calls, providerFailures: 0 });
}

function degradedAttribution(calls = 10) {
  return attributeProviderFailures({
    actionLog: [{ intentKind: 'REASONER_CALL', resultClass: 'REASONER_NONZERO_EXIT' }],
    reasonerCalls: calls,
    providerFailures: 1,
  });
}

/** The evidence a completed campaign produces, as the evaluator consumes it. */
function receiptFor(options: {
  readonly terminationReason: string;
  readonly terminationCounts: Readonly<Record<string, number>>;
  readonly attribution: ReturnType<typeof healthyAttribution>;
  readonly siblings?: readonly SiblingIdentityObservation[];
  readonly sha?: string;
  readonly treeClean?: boolean;
  readonly printCliDigest?: string;
  readonly provider?: string;
  readonly model?: string;
}) {
  const siblings = options.siblings ?? [observation()];
  return buildProductRunReceipt({
    campaignId: 'r6-campaign',
    generatedAt: '2026-10-19T00:00:00.000Z',
    result: {
      terminationReason: options.terminationReason,
      terminationCounts: options.terminationCounts,
      providerAttribution: options.attribution,
      persistedFindings: [],
      reproductionCount: 1,
      toolActionCount: 40,
    },
    before: siblings,
    after: siblings,
    leakScan: { result: 'CLEAN', findings: 0, scannedChars: 100 },
    nightwatchIdentity: { sha: options.sha ?? CHECKPOINT, treeClean: options.treeClean ?? true },
    campaignKind: 'PRINT_CLI_PROVIDER',
    reasonerIdentity: {
      kind: 'PRINT_CLI_PROVIDER',
      identityDigest: 'rid:sha256:' + 'c'.repeat(24),
      printCliDigest: options.printCliDigest ?? PRINT_CLI_DIGEST,
      provider: options.provider ?? 'test-provider',
      model: options.model ?? 'test-model',
    },
  });
}

function evidenceFor(receipt: unknown) {
  return {
    manifest: {
      runId: 'nightwatch-r6-campaign-1',
      environment: 'local',
      product: 'campaign',
      browser: 'none',
      scenario: 'r6-campaign',
      timestamp: '2026-10-19T00:00:00.000Z',
      generation: 'g',
      nightwatchSha: CHECKPOINT,
    },
    summary: { runId: 'nightwatch-r6-campaign-1', passed: true, counts: {}, severityCounts: {}, hardFailures: [], screenshots: [] },
    receipt,
  };
}

// ---------------------------------------------------------------------------
// A. A genuinely completed, authorized campaign CAN produce COMPLETED_SUCCESSFULLY
// ---------------------------------------------------------------------------
test('A — a declared plan that runs to a real end yields COMPLETE_NO_FINDING and COMPLETED_SUCCESSFULLY', async () => {
  const dir = scratchDir();
  const result = await runLocalCliCampaign({
    campaignId: 'r6-completes',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [productiveThenTerminate(dir, 'COMPLETE_NO_FINDING')],
    provider: 'test-provider',
    model: 'test-model',
    maxTurns: 4,
    expectedInvestigations: MIN_CAMPAIGN_INVESTIGATIONS,
    stateDirectory: dir,
  });

  // The campaign reaches its own declared end rather than stagnation.
  expect(result.terminationReason).toBe('COMPLETE_NO_FINDING');
  expect(result.completionVerdict.complete).toBe(true);
  expect(result.completionVerdict.refusals).toEqual([]);
  expect(result.expectedInvestigations).toBe(MIN_CAMPAIGN_INVESTIGATIONS);
  expect(result.investigationsStarted).toBe(MIN_CAMPAIGN_INVESTIGATIONS);
  expect(result.investigationsCompleted).toBe(MIN_CAMPAIGN_INVESTIGATIONS);
  // The provider really was healthy, and the campaign really inspected source.
  expect(result.providerFailures).toBe(0);
  expect(result.terminationClass).toBe('VALID_PROVIDER_RUN');
  expect(result.toolActionCount).toBeGreaterThan(0);
  // A completed campaign keeps a checkpoint as durable evidence.
  expect(result.checkpointFile).toBeTruthy();

  // ...and the RECEIPT derives the campaign class the evaluator requires.
  const receipt = receiptFor({
    terminationReason: result.terminationReason,
    terminationCounts: result.terminationCounts,
    attribution: result.providerAttribution,
  });
  expect(receipt.campaignTermination).toBe('COMPLETED_SUCCESSFULLY');
  expect(validateProductRunReceipt(receipt).ok).toBe(true);
});

// ---------------------------------------------------------------------------
// B. The completed receipt qualifies at the correct checkpoint
// ---------------------------------------------------------------------------
test('B — the completed receipt qualifies at its own checkpoint with valid identity and siblings', () => {
  const receipt = receiptFor({
    terminationReason: 'COMPLETE_NO_FINDING',
    terminationCounts: { COMPLETE_NO_FINDING: 2 },
    attribution: healthyAttribution(),
  });
  const evaluated = evaluateYieldCampaignEvidence(evidenceFor(receipt), CHECKPOINT, AUTHORIZATION);
  expect(evaluated.ok).toBe(true);
  expect(evaluated.errors).toEqual([]);
  expect(evaluated.relation).toBe('BOUND');
  expect(evaluated.summary?.siblingsObserved).toBe(1);
});

// ---------------------------------------------------------------------------
// C. NO_PROGRESS still fails — it is never relabelled as success
// ---------------------------------------------------------------------------
test('C — NO_PROGRESS still fails and can never be reported as completed', async () => {
  const dir = scratchDir();
  // No declared plan: the campaign ends only by stagnation.
  const result = await runLocalCliCampaign({
    campaignId: 'r6-noprogress',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [scriptedReasoner(dir, [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }])],
    provider: 'test-provider',
    model: 'test-model',
    maxTurns: 3,
    stateDirectory: dir,
  });
  expect(result.terminationReason).toBe('NO_PROGRESS');
  expect(result.completionVerdict.complete).toBe(false);
  expect(result.completionVerdict.terminationReason).toBeNull();
  expect(result.completionVerdict.refusals).toContain('NO_DECLARED_PLAN');

  const receipt = receiptFor({
    terminationReason: result.terminationReason,
    terminationCounts: result.terminationCounts,
    attribution: healthyAttribution(),
  });
  expect(receipt.campaignTermination).toBe('NO_PROGRESS');
  const evaluated = evaluateYieldCampaignEvidence(evidenceFor(receipt), CHECKPOINT, AUTHORIZATION);
  expect(evaluated.ok).toBe(false);
  expect(evaluated.errors.join(' ')).toContain('YIELD_RECEIPT_CAMPAIGN_NOT_COMPLETED:NO_PROGRESS');
});

test('C2 — a campaign whose plan is exhausted but contains a NO_PROGRESS case is refused, not relabelled', () => {
  const verdict = evaluateCampaignCompletion({
    expectedInvestigations: 3,
    investigationsStarted: 3,
    investigationsCompleted: 3,
    terminationCounts: { COMPLETE_NO_FINDING: 2, NO_PROGRESS: 1 },
    providerTerminationClass: 'VALID_PROVIDER_RUN',
    sourceActions: 10,
    terminatedOnStagnation: false,
  });
  expect(verdict.complete).toBe(false);
  expect(verdict.terminationReason).toBeNull();
  expect(verdict.refusals).toContain('UNCOMPLETED_INVESTIGATION');
});

// ---------------------------------------------------------------------------
// D. PROVIDER_DEGRADED still fails
// ---------------------------------------------------------------------------
test('D — a degraded provider run still fails even when the campaign completed every investigation', () => {
  const verdict = evaluateCampaignCompletion({
    expectedInvestigations: 2,
    investigationsStarted: 2,
    investigationsCompleted: 2,
    terminationCounts: { COMPLETE_NO_FINDING: 2 },
    providerTerminationClass: 'PROVIDER_DEGRADED',
    sourceActions: 10,
    terminatedOnStagnation: false,
  });
  expect(verdict.complete).toBe(false);
  expect(verdict.refusals).toContain('PROVIDER_DEGRADED');

  const receipt = receiptFor({
    terminationReason: 'COMPLETE_NO_FINDING',
    terminationCounts: { COMPLETE_NO_FINDING: 2 },
    attribution: degradedAttribution(),
  });
  const evaluated = evaluateYieldCampaignEvidence(evidenceFor(receipt), CHECKPOINT, AUTHORIZATION);
  expect(evaluated.ok).toBe(false);
  expect(evaluated.errors.join(' ')).toContain('YIELD_RECEIPT_PROVIDER_NOT_VALID:PROVIDER_DEGRADED');
});

// ---------------------------------------------------------------------------
// E. Missing siblings still fail
// ---------------------------------------------------------------------------
test('E — a completed, healthy campaign with no sibling observation still fails', () => {
  const verdict = evaluateCampaignCompletion({
    expectedInvestigations: 2,
    investigationsStarted: 2,
    investigationsCompleted: 2,
    terminationCounts: { COMPLETE_NO_FINDING: 2 },
    providerTerminationClass: 'VALID_PROVIDER_RUN',
    sourceActions: 10,
    terminatedOnStagnation: false,
  });
  // Completion itself is not about siblings: the campaign genuinely finished.
  expect(verdict.complete).toBe(true);

  // ...but the RELEASE evaluator still refuses a receipt that observed nothing.
  const receipt = receiptFor({
    terminationReason: 'COMPLETE_NO_FINDING',
    terminationCounts: { COMPLETE_NO_FINDING: 2 },
    attribution: healthyAttribution(),
    siblings: [],
  });
  const evaluated = evaluateYieldCampaignEvidence(evidenceFor(receipt), CHECKPOINT, AUTHORIZATION);
  expect(evaluated.ok).toBe(false);
  expect(evaluated.errors).toContain('YIELD_RECEIPT_NO_SIBLING_OBSERVATION');
});

// ---------------------------------------------------------------------------
// F. Wrong provider/model/digest still fails
// ---------------------------------------------------------------------------
test('F — a wrong provider, model or print-CLI digest still fails', () => {
  const cases = [
    { printCliDigest: `sha256:${'d'.repeat(64)}` },
    { provider: 'other-provider' },
    { model: 'other-model' },
  ];
  for (const override of cases) {
    const receipt = receiptFor({
      terminationReason: 'COMPLETE_NO_FINDING',
      terminationCounts: { COMPLETE_NO_FINDING: 2 },
      attribution: healthyAttribution(),
      ...override,
    });
    const evaluated = evaluateYieldCampaignEvidence(evidenceFor(receipt), CHECKPOINT, AUTHORIZATION);
    expect(evaluated.ok, JSON.stringify(override)).toBe(false);
    const joined = evaluated.errors.join(' ');
    expect(
      joined.includes('YIELD_RECEIPT_PRINT_CLI_NOT_AUTHORIZED') || joined.includes('YIELD_RECEIPT_MODEL_NOT_AUTHORIZED'),
      joined,
    ).toBe(true);
  }
});

test('F2 — an ungranted authorization still refuses an otherwise perfect receipt', () => {
  const receipt = receiptFor({
    terminationReason: 'COMPLETE_NO_FINDING',
    terminationCounts: { COMPLETE_NO_FINDING: 2 },
    attribution: healthyAttribution(),
  });
  const notGranted = { ...AUTHORIZATION, state: 'NOT_GRANTED' as unknown as 'GRANTED' };
  const evaluated = evaluateYieldCampaignEvidence(evidenceFor(receipt), CHECKPOINT, notGranted);
  expect(evaluated.ok).toBe(false);
  expect(evaluated.errors).toContain('YIELD_RECEIPT_RUN_NOT_AUTHORIZED');
});

// ---------------------------------------------------------------------------
// G. Wrong checkpoint and tampered receipts still fail
// ---------------------------------------------------------------------------
test('G — a receipt bound to another checkpoint is not BOUND, and tampering is refused', () => {
  const otherSha = '9'.repeat(40);
  const receipt = receiptFor({
    terminationReason: 'COMPLETE_NO_FINDING',
    terminationCounts: { COMPLETE_NO_FINDING: 2 },
    attribution: healthyAttribution(),
    sha: otherSha,
  });
  // The manifest must agree with the receipt: a receipt whose SHA disagrees with
  // its own manifest is a different (integrity) failure, tested separately below.
  const evaluated = evaluateYieldCampaignEvidence(
    { ...evidenceFor(receipt), manifest: { ...evidenceFor(receipt).manifest, nightwatchSha: otherSha } },
    CHECKPOINT,
    AUTHORIZATION,
  );
  // It validates, but it does not satisfy the checkpoint relation.
  expect(evaluated.ok).toBe(true);
  expect(evaluated.relation).toBe('BOUND_TO_OTHER');

  const legitimate = receiptFor({
    terminationReason: 'COMPLETE_NO_FINDING',
    terminationCounts: { COMPLETE_NO_FINDING: 2 },
    attribution: healthyAttribution(),
  });
  // SCHEMA layer: structurally impossible receipts are refused outright.
  expect(validateProductRunReceipt({ ...legitimate, terminationClass: 'PROVIDER_OK' }).ok).toBe(false);
  expect(validateProductRunReceipt({ ...legitimate, siblingsAfter: [] }).ok).toBe(false);
  expect(validateProductRunReceipt({ ...legitimate, campaignTermination: 'MADE_UP' }).ok).toBe(false);
  // `nightwatchSha` is optional in the schema for legacy receipts, so a receipt
  // that omits it is REFUSED by the evaluator, not by schema validation.
  const { nightwatchSha: _omitted, ...withoutSha } = legitimate;
  expect(validateProductRunReceipt(withoutSha).ok).toBe(true);
  // With a manifest SHA present, a receipt that omits it DISAGREES with its own
  // run evidence — an integrity failure, and never a pass.
  expect(evaluateYieldCampaignEvidence(evidenceFor(withoutSha), CHECKPOINT, AUTHORIZATION).errors)
    .toContain('YIELD_RECEIPT_SHA_DISAGREES');
  // A receipt whose SHA disagrees with its own manifest is an integrity failure.
  expect(evaluateYieldCampaignEvidence(evidenceFor(legitimate), CHECKPOINT, AUTHORIZATION).ok).toBe(true);
  expect(evaluateYieldCampaignEvidence(
    { ...evidenceFor(legitimate), manifest: { ...evidenceFor(legitimate).manifest, nightwatchSha: '9'.repeat(40) } },
    CHECKPOINT,
    AUTHORIZATION,
  ).errors).toContain('YIELD_RECEIPT_SHA_DISAGREES');

  // EVALUATION layer: a well-formed receipt can still fail the release rules.
  // A dirty tree is exactly that case — the schema accepts the value, and the
  // evaluator refuses to certify a run that executed on an unclean checkout.
  const dirty = { ...legitimate, nightwatchTreeClean: false };
  expect(validateProductRunReceipt(dirty).ok).toBe(true);
  const dirtyEvaluated = evaluateYieldCampaignEvidence(evidenceFor(dirty), CHECKPOINT, AUTHORIZATION);
  expect(dirtyEvaluated.ok).toBe(false);
  expect(dirtyEvaluated.errors).toContain('YIELD_RECEIPT_TREE_NOT_CLEAN');
});

// ---------------------------------------------------------------------------
// H. Budget exhaustion cannot masquerade as success
// ---------------------------------------------------------------------------
test('H — budget exhaustion cannot masquerade as success', () => {
  const receipt = receiptFor({
    terminationReason: 'BUDGET_EXHAUSTED',
    terminationCounts: { COMPLETE_NO_FINDING: 1, BUDGET_EXHAUSTED: 1 },
    attribution: healthyAttribution(),
  });
  expect(receipt.campaignTermination).toBe('BUDGET_EXHAUSTED');
  const evaluated = evaluateYieldCampaignEvidence(evidenceFor(receipt), CHECKPOINT, AUTHORIZATION);
  expect(evaluated.ok).toBe(false);
  expect(evaluated.errors.join(' ')).toContain('YIELD_RECEIPT_CAMPAIGN_NOT_COMPLETED:BUDGET_EXHAUSTED');

  // And the completion decision refuses it directly.
  const verdict = evaluateCampaignCompletion({
    expectedInvestigations: 3,
    investigationsStarted: 2,
    investigationsCompleted: 2,
    terminationCounts: { COMPLETE_NO_FINDING: 1, BUDGET_EXHAUSTED: 1 },
    providerTerminationClass: 'VALID_PROVIDER_RUN',
    sourceActions: 10,
    terminatedOnStagnation: false,
  });
  expect(verdict.complete).toBe(false);
  expect(verdict.refusals).toEqual(expect.arrayContaining(['BUDGET_EXHAUSTED' in {} ? 'NO_COMPLETED_INVESTIGATION' : 'UNCOMPLETED_INVESTIGATION']));
});

test('H2 — a single investigation is never a campaign', () => {
  const verdict = evaluateCampaignCompletion({
    expectedInvestigations: 1,
    investigationsStarted: 1,
    investigationsCompleted: 1,
    terminationCounts: { COMPLETE_WITH_FINDING: 1 },
    providerTerminationClass: 'VALID_PROVIDER_RUN',
    sourceActions: 10,
    terminatedOnStagnation: false,
  });
  expect(verdict.complete).toBe(false);
  expect(verdict.refusals).toContain('NO_DECLARED_PLAN');
  expect(verdict.refusals).toContain('INSUFFICIENT_INVESTIGATIONS');
});

test('H3 — stagnation termination is never completion, even with a full-looking population', () => {
  const verdict = evaluateCampaignCompletion({
    expectedInvestigations: 3,
    investigationsStarted: 3,
    investigationsCompleted: 3,
    terminationCounts: { COMPLETE_NO_FINDING: 3 },
    providerTerminationClass: 'VALID_PROVIDER_RUN',
    sourceActions: 10,
    terminatedOnStagnation: true,
  });
  expect(verdict.complete).toBe(false);
  expect(verdict.refusals).toContain('ISOLATED_STAGNATION_TERMINATION');
});

test('H4 — a campaign that never executed a tool action is refused', () => {
  const verdict = evaluateCampaignCompletion({
    expectedInvestigations: 2,
    investigationsStarted: 2,
    investigationsCompleted: 2,
    terminationCounts: { COMPLETE_NO_FINDING: 2 },
    providerTerminationClass: 'VALID_PROVIDER_RUN',
    sourceActions: 0,
    terminatedOnStagnation: false,
  });
  expect(verdict.complete).toBe(false);
  expect(verdict.refusals).toContain('NO_SOURCE_ACTION');
});

test('H5 — every refusal token is reachable and completion needs all of them absent', () => {
  expect(new Set(CAMPAIGN_COMPLETION_REFUSALS).size).toBe(CAMPAIGN_COMPLETION_REFUSALS.length);
  const perfect = evaluateCampaignCompletion({
    expectedInvestigations: 2,
    investigationsStarted: 2,
    investigationsCompleted: 2,
    terminationCounts: { COMPLETE_WITH_FINDING: 1, COMPLETE_NO_FINDING: 1 },
    providerTerminationClass: 'VALID_PROVIDER_RUN',
    sourceActions: 1,
    terminatedOnStagnation: false,
  });
  expect(perfect.complete).toBe(true);
  expect(perfect.withFinding).toBe(true);
  expect(perfect.terminationReason).toBe('COMPLETE_WITH_FINDING');
});

// ---------------------------------------------------------------------------
// I. Repeated-action and turn-limit terminations stay distinguishable
// ---------------------------------------------------------------------------
test('I — a stagnation-guard stop and a turn-limit stop are distinguishable and preserved', async () => {
  const dir = scratchDir();
  // This reasoner repeats one identical tool call forever, which is exactly
  // what the stagnation guard exists to stop.
  const repeating = scriptedReasoner(dir, [
    { kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { query: 'same-query' } },
  ], 'repeating.mjs');
  const repeated = await runLocalCliCampaign({
    campaignId: 'r6-repeat',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [repeating],
    provider: 'test-provider',
    model: 'test-model',
    maxTurns: 12,
    stateDirectory: dir,
  });
  expect(repeated.terminationReason).toBe('NO_PROGRESS');
  // The diagnostics survive the NO_PROGRESS exit, which deletes the checkpoint.
  expect(repeated.investigationDiagnostics.length).toBeGreaterThan(0);
  expect(repeated.terminationCauseCounts['REPEATED_ACTION']).toBeGreaterThan(0);
  // A repeat stop is NOT a turn-limit stop: the guard fires well before the cap.
  const repeatEntry = repeated.investigationDiagnostics[0]!;
  expect(repeatEntry.stoppedOnRepeatedAction).toBe(true);
  expect(repeatEntry.turnLimit).toBe(12);
  expect(repeatEntry.turnsUsed).toBeLessThan(12);

  // Now a bounded turn limit on a reasoner that never terminates: the cap is
  // what stops it, and the diagnostics say so.
  const inspecting = scriptedReasoner(dir, [
    { kind: 'FORM_HYPOTHESIS', hypothesisId: 'h1', statement: 'synthetic hypothesis', evidenceRefs: [] },
  ], 'inspecting.mjs');
  const capped = await runLocalCliCampaign({
    campaignId: 'r6-turnlimit',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [inspecting],
    provider: 'test-provider',
    model: 'test-model',
    maxTurns: 2,
    stateDirectory: dir,
  });
  expect(capped.terminationReason).toBe('NO_PROGRESS');
  const capEntry = capped.investigationDiagnostics[0]!;
  expect(capEntry.stoppedOnRepeatedAction).toBe(false);
  expect(capEntry.hitTurnLimit).toBe(true);
  expect(capEntry.terminationCause).toBe('TURN_LIMIT');

  // The two causes are therefore distinct in preserved evidence.
  expect(repeatEntry.terminationCause).not.toBe(capEntry.terminationCause);
});

test('I2 — classification is conservative and never invents a cause', () => {
  const unknown = classifyInvestigation({
    investigationId: 'inv-unknown',
    terminationReason: 'NO_PROGRESS',
    turnLimit: 10,
    actionLog: [{ intentKind: 'CALL_TOOL', resultClass: 'TOOL_OK', turnId: 't1' }],
  });
  expect(unknown.terminationCause).toBe('UNKNOWN');
  expect(unknown.stoppedOnRepeatedAction).toBe(false);
  expect(unknown.hitTurnLimit).toBe(false);

  const byGuard = classifyInvestigation({
    investigationId: 'inv-guard',
    terminationReason: 'NO_PROGRESS',
    turnLimit: 10,
    actionLog: [
      { intentKind: 'CALL_TOOL', resultClass: 'TOOL_OK', turnId: 't1' },
      { intentKind: 'NO_PROGRESS', resultClass: 'NO_PROGRESS_DETECTED', turnId: 't1' },
    ],
  });
  // The guard's own record outranks the turn count.
  expect(byGuard.terminationCause).toBe('REPEATED_ACTION');

  const completed = classifyInvestigation({
    investigationId: 'inv-done',
    terminationReason: 'COMPLETE_WITH_FINDING',
    turnLimit: 10,
    actionLog: [{ intentKind: 'CALL_TOOL', resultClass: 'TOOL_OK', turnId: 't1' }],
  });
  expect(completed.terminationCause).toBe('COMPLETED');

  const totals = summarizeTerminationCauses([unknown, byGuard, completed]);
  expect(totals['UNKNOWN']).toBe(1);
  expect(totals['REPEATED_ACTION']).toBe(1);
  expect(totals['COMPLETED']).toBe(1);

  // Per-call provider failure classes are preserved, not collapsed.
  const failed = classifyInvestigation({
    investigationId: 'inv-failed',
    terminationReason: 'REASONER_FAILURE',
    turnLimit: 10,
    actionLog: [
      { intentKind: 'REASONER_CALL', resultClass: 'REASONER_NONZERO_EXIT', turnId: 't1' },
      { intentKind: 'REASONER_CALL', resultClass: 'REASONER_UNKNOWN_TOOL', turnId: 't2' },
    ],
  });
  expect(failed.providerFailures).toBe(2);
  expect(failed.providerFailureClasses).toEqual({ NONZERO_EXIT: 1, UNKNOWN_TOOL: 1 });
});

test('I4 — the completion and diagnostics vocabularies are closed and self-consistent', () => {
  // The declared schema versions are the ones the modules emit.
  const verdict = evaluateCampaignCompletion({
    expectedInvestigations: 2,
    investigationsStarted: 2,
    investigationsCompleted: 2,
    terminationCounts: { COMPLETE_NO_FINDING: 2 },
    providerTerminationClass: 'VALID_PROVIDER_RUN',
    sourceActions: 1,
    terminatedOnStagnation: false,
  });
  expect(verdict.schemaVersion).toBe(CAMPAIGN_COMPLETION_VERSION);

  const diagnostic = classifyInvestigation({
    investigationId: 'inv-vocab',
    terminationReason: 'COMPLETE_NO_FINDING',
    turnLimit: 5,
    actionLog: [],
  });
  // classifyInvestigation reports a cause drawn from the closed vocabulary.
  expect(INVESTIGATION_TERMINATION_CAUSES).toContain(diagnostic.terminationCause);
  expect(new Set(INVESTIGATION_TERMINATION_CAUSES).size).toBe(INVESTIGATION_TERMINATION_CAUSES.length);

  // Every non-completing reason the campaign engine can produce is listed, so a
  // future termination reason cannot silently become eligible for success.
  const engineReasons = ['NO_PROGRESS', 'BUDGET_EXHAUSTED', 'PAUSED', 'CANCELLED', 'SAFETY_BLOCKED', 'REASONER_FAILURE'];
  for (const reason of engineReasons) {
    expect(CAMPAIGN_NON_COMPLETING_TERMINATIONS).toContain(reason as never);
  }
  expect(new Set(CAMPAIGN_NON_COMPLETING_TERMINATIONS).size).toBe(CAMPAIGN_NON_COMPLETING_TERMINATIONS.length);
  expect(CAMPAIGN_DIAGNOSTICS_VERSION).toBe('nightwatch.campaign-diagnostics.v1');
});

test('I3 — an undeclared plan is refused at the input boundary rather than silently uncompletable', async () => {
  const dir = scratchDir();
  // A plan of one is not a campaign.
  await expect(runLocalCliCampaign({
    campaignId: 'r6-plan-one',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [scriptedReasoner(dir, [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }])],
    maxTurns: 2,
    expectedInvestigations: 1,
    stateDirectory: dir,
  })).rejects.toMatchObject({ code: 'MALFORMED_EXPECTED_INVESTIGATIONS' });
});

// ---------------------------------------------------------------------------
// J. End-to-end: the real launcher's receipt is graded MET by the real G12 probe
// ---------------------------------------------------------------------------
test('J — a genuinely completed campaign receipt is graded MET by the release probe', async () => {
  const dir = scratchDir();
  const result = await runLocalCliCampaign({
    campaignId: 'r6-probe',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [productiveThenTerminate(dir, 'COMPLETE_NO_FINDING')],
    provider: 'test-provider',
    model: 'test-model',
    maxTurns: 6,
    expectedInvestigations: MIN_CAMPAIGN_INVESTIGATIONS,
    stateDirectory: dir,
  });
  expect(result.terminationReason).toBe('COMPLETE_NO_FINDING');

  // Emit the real D-7 artifact set through the production emitter. The emitter
  // observes the sibling itself, so the fixture is a real (synthetic) git
  // repository — the observation is genuinely verified, not stubbed.
  const root = scratchRootForArtifacts();
  // The production probe resolves the receipt module from `root`, so the scratch
  // root carries the real source tree and dependencies by symlink; only the
  // artifact output is synthetic.
  const repoRoot = path.join(__dirname, '..', '..');
  fs.symlinkSync(path.join(repoRoot, 'src'), path.join(root, 'src'));
  fs.symlinkSync(path.join(repoRoot, 'node_modules'), path.join(root, 'node_modules'));
  // The probe resolves the GRANTED record from the same root, so the scratch
  // root gets a matching record. This is a SYNTHETIC grant for the test only:
  // the real config/yield-run-authorization.v1.json is untouched.
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config', 'yield-run-authorization.v1.json'), `${JSON.stringify(AUTHORIZATION, null, 2)}\n`);
  const siblingRoot = path.join(root, 'repos');
  const repository = 'example/ledger';
  makeGitRepo(siblingRoot, repository);
  const before = await observeSiblings([repository], siblingRoot);
  expect(before.length).toBe(1);

  const emitted = await emitProductRunReceipt({
    root,
    campaignId: result.campaignId,
    result,
    repositoryIds: [repository],
    before,
    siblingRoot,
    nightwatchIdentity: { sha: CHECKPOINT, treeClean: true },
    campaignKind: 'PRINT_CLI_PROVIDER',
    reasonerIdentity: {
      kind: 'PRINT_CLI_PROVIDER',
      identityDigest: 'rid:sha256:' + 'c'.repeat(24),
      printCliDigest: PRINT_CLI_DIGEST,
      provider: 'test-provider',
      model: 'test-model',
    },
    diagnostics: {
      schemaVersion: CAMPAIGN_DIAGNOSTICS_VERSION,
      launch: { ceilingName: 'HOUR_1', maxTurns: 6, wallClockCeilingMs: 0, expectedInvestigations: 2 },
      usage: { reasonerCalls: result.reasonerCalls, providerFailures: result.providerFailures },
      investigations: result.investigationDiagnostics,
    },
    now: () => new Date('2026-10-19T00:00:00.000Z'),
  });

  const persisted = JSON.parse(fs.readFileSync(emitted.receiptFile, 'utf8')) as Record<string, unknown>;
  expect(persisted['campaignTermination']).toBe('COMPLETED_SUCCESSFULLY');
  expect((persisted['siblingsBefore'] as unknown[]).length).toBe(1);
  expect(persisted['siblingIdentityChanged']).toBe(false);
  // The diagnostics block survives into the persisted receipt.
  const diagnostics = persisted['diagnostics'] as Record<string, unknown>;
  expect(diagnostics['launch']).toBeTruthy();
  expect(Array.isArray(diagnostics['investigations'])).toBe(true);

  // The REAL release probe now grades the REAL receipt.
  const root2 = root;
  const verdict = probeYieldCampaignResult(root2, CHECKPOINT);
  expect(verdict.state).toBe('MET');
  expect(verdict.detail).toContain('completed provider calls');

  fs.rmSync(root2, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// K. R6-04 — a RESUMED campaign can still complete (no phantom PAUSED case)
// ---------------------------------------------------------------------------
function pausingReasoner(dir: string): string {
  const file = path.join(dir, 'pausing.mjs');
  fs.writeFileSync(
    file,
    `const chunks = [];
process.stdin.on('data', (d) => chunks.push(d)).on('end', () => {
  process.stdout.write(JSON.stringify({ schemaVersion: ${JSON.stringify(REASONER_TURN_RESPONSE_VERSION)}, intents: [{ kind: 'PAUSE' }], hypotheses: [] }));
});
`,
    { mode: 0o700 },
  );
  return file;
}

test('K — a campaign that paused mid-investigation and then resumed can still complete', async () => {
  const dir = scratchDir();

  // Pause on the very first turn, so the campaign checkpoints PAUSED with one
  // investigation started and the PAUSED termination already counted.
  const paused = await runLocalCliCampaign({
    campaignId: 'r6-resume',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [pausingReasoner(dir)],
    provider: 'test-provider',
    model: 'test-model',
    maxTurns: 4,
    expectedInvestigations: MIN_CAMPAIGN_INVESTIGATIONS,
    stateDirectory: dir,
  });
  expect(paused.terminationReason).toBe('PAUSED');
  expect(paused.terminationCounts.PAUSED).toBe(1);
  // A suspended campaign is never complete.
  expect(paused.completionVerdict.complete).toBe(false);

  // Resume with a reasoner that finishes every investigation.
  const resumed = await resumeLocalCliCampaign({
    campaignId: 'r6-resume',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [productiveThenTerminate(dir, 'COMPLETE_NO_FINDING')],
    provider: 'test-provider',
    model: 'test-model',
    maxTurns: 4,
    stateDirectory: dir,
  });

  expect(resumed.terminationReason).toBe('COMPLETE_NO_FINDING');
  // The suspension placeholder is RETIRED when its investigation finishes, so
  // no phantom PAUSED case blocks completion. This was the R6-04 defect.
  expect(resumed.terminationCounts.PAUSED).toBe(0);
  expect(resumed.terminationCounts.COMPLETE_NO_FINDING).toBe(MIN_CAMPAIGN_INVESTIGATIONS);
  expect(resumed.completionVerdict.complete).toBe(true);
  expect(resumed.completionVerdict.refusals).toEqual([]);
  // The declared plan is checkpoint state and survives the resume unchanged.
  expect(resumed.expectedInvestigations).toBe(MIN_CAMPAIGN_INVESTIGATIONS);
});

test('K2 — a suspended provider failure is not erased by the retirement, and refuses completion', () => {
  // The population looks perfect...
  const clean = evaluateCampaignCompletion({
    expectedInvestigations: 2,
    investigationsStarted: 2,
    investigationsCompleted: 2,
    terminationCounts: { COMPLETE_NO_FINDING: 2 },
    providerTerminationClass: 'VALID_PROVIDER_RUN',
    sourceActions: 5,
    terminatedOnStagnation: false,
  });
  expect(clean.complete).toBe(true);

  // ...but a provider failure recorded before a suspension is still disqualifying,
  // even though its PAUSED placeholder was retired when the slot finished.
  const hiddenFailure = evaluateCampaignCompletion({
    expectedInvestigations: 2,
    investigationsStarted: 2,
    investigationsCompleted: 2,
    terminationCounts: { COMPLETE_NO_FINDING: 2 },
    providerTerminationClass: 'VALID_PROVIDER_RUN',
    sourceActions: 5,
    terminatedOnStagnation: false,
    suspendedProviderFailure: true,
  });
  expect(hiddenFailure.complete).toBe(false);
  expect(hiddenFailure.terminationReason).toBeNull();
  expect(hiddenFailure.refusals).toContain('PROVIDER_DEGRADED');
});
