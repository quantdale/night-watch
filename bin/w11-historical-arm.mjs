#!/usr/bin/env node
/**
 * W11 M2 — strict historical EXACT_REDISCOVERY arm.
 *
 * Drives the frozen historical corpus through the EXISTING leak-isolated
 * benchmark hunt (`runBenchmarkHunt`) with the real configured CLI reasoner,
 * then scores with hidden truth AFTER each investigation terminates. Nothing
 * about scoring, admission or leakage detection is relaxed for the live run.
 *
 * The corpus, provider, budgets and rules come from the committed freeze at
 * `.agent/tasks/nightwatch-autonomous-yield-proof-w11-v1/evaluation-freeze.historical.json`.
 * The freeze fingerprint is recomputed here and recorded in the output, so a
 * result can never be attributed to a definition it did not run under.
 *
 * Local/synthetic only. No DEV/NEXT/production contact. Read-only siblings.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModules } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FREEZE_PATH = path.join(
  root,
  '.agent/tasks/nightwatch-autonomous-yield-proof-w11-v1/evaluation-freeze.historical.json',
);

function fail(message) {
  console.error(`W11_HISTORICAL_ARM: ${message}`);
  process.exit(2);
}

const freeze = JSON.parse(fs.readFileSync(FREEZE_PATH, 'utf8'));
const freezeFingerprint = `sha256:${crypto.createHash('sha256').update(JSON.stringify(freeze)).digest('hex').slice(0, 24)}`;

const printCli = process.env.NIGHTWATCH_PRINT_CLI ?? '';
const printArgs = process.env.NIGHTWATCH_PRINT_ARGS ?? '';
if (printCli.length === 0 || printArgs.length === 0) {
  fail('NIGHTWATCH_PRINT_CLI and NIGHTWATCH_PRINT_ARGS are required; refusing to start');
}

// The frozen definition owns the provider. A mismatch between the frozen model
// and the configured argv is a definition violation, not a detail to reconcile.
if (!printArgs.includes(freeze.provider.model)) {
  fail(`configured NIGHTWATCH_PRINT_ARGS does not name the frozen model ${freeze.provider.model}`);
}

const [tools, fixtures, hunt, score, cliReasoner, metricsMod, miner, minedCases, sibling] =
  loadTypeScriptModules(
    [
      'src/core/agentProtocol/tools.ts',
      'src/core/benchmark/fixtures.ts',
      'src/core/benchmark/hunt.ts',
      'src/core/benchmark/score.ts',
      'src/core/reasoner/cliReasoner.ts',
      'src/core/efficacy/metrics.ts',
      'src/core/bugAtlas/miner.ts',
      'src/core/benchmark/minedCases.ts',
      'src/core/source/siblingSource.ts',
    ],
    { root },
  );

const onlyCase = process.argv.find((arg) => arg.startsWith('--case='))?.slice('--case='.length) ?? null;
const outPath = process.argv.find((arg) => arg.startsWith('--out='))?.slice('--out='.length) ?? null;

/** Resolve the frozen corpus to defined cases, preserving frozen order. */
function resolveCorpus() {
  const wanted = [
    ...freeze.corpus.fixtureCases.map((id) => ({ id, kind: 'FIXTURE', negativeControl: false })),
    ...freeze.corpus.fixtureNegativeControls.map((id) => ({ id, kind: 'FIXTURE', negativeControl: true })),
    ...freeze.corpus.minedCases.map((id) => ({ id, kind: 'MINED', negativeControl: false })),
  ];
  const minedNeeded = wanted.some((item) => item.kind === 'MINED');
  let minedById = new Map();
  if (minedNeeded) {
    const siblingRoot = process.env.NIGHTWATCH_REPOS_ROOT ?? sibling.DEFAULT_SIBLING_ROOT;
    const report = miner.mineLocalGitHistory({
      repositoriesRoot: siblingRoot,
      repositoryIds: [...new Set(freeze.corpus.minedCases.map(minedRepositoryOf))],
    });
    for (const record of report.records ?? []) {
      const repoPath = minedCases.resolveMinedRepoPath(siblingRoot, record.repository);
      if (repoPath === null) continue;
      const defined = minedCases.tryDefineMinedBenchmarkCase(record, repoPath);
      if (defined !== null && defined !== undefined) minedById.set(defined.caseId, defined);
    }
  }
  const resolved = [];
  for (const item of wanted) {
    if (onlyCase !== null && item.id !== onlyCase) continue;
    if (item.kind === 'FIXTURE') {
      resolved.push({ ...item, definedCase: fixtures.benchmarkFixtureById(item.id) });
    } else {
      const defined = minedById.get(item.id) ?? null;
      resolved.push({ ...item, definedCase: defined });
    }
  }
  return resolved;
}

/** `mined-bugatlas-git-<org>-<repo>-<sha12>` -> `<org>/<repo>`. Frozen ids only. */
function minedRepositoryOf(caseId) {
  if (caseId.startsWith('mined-bugatlas-git-mobingilabs-ouchan-')) return 'mobingilabs/ouchan';
  if (caseId.startsWith('mined-bugatlas-git-mobingilabs-ripple-ui-')) return 'mobingilabs/ripple-ui';
  if (caseId.startsWith('mined-bugatlas-git-mobingilabs-ripple-api-')) return 'mobingilabs/ripple-api';
  if (caseId.startsWith('mined-bugatlas-git-mobingilabs-wave-api-')) return 'mobingilabs/wave-api';
  if (caseId.startsWith('mined-bugatlas-git-alphauslabs-')) {
    return `alphauslabs/${caseId.slice('mined-bugatlas-git-alphauslabs-'.length).replace(/-[0-9a-f]{12}$/, '')}`;
  }
  throw new Error(`W11_HISTORICAL_ARM: cannot derive repository for frozen mined case ${caseId}`);
}

function buildDriver() {
  return cliReasoner.createCliReasonerDriver({
    executable: process.execPath,
    allowedExecutables: [process.execPath],
    args: [path.join(root, 'bin', 'nightwatch-reasoner-print.mjs')],
    provider: freeze.provider.providerId,
    model: freeze.provider.model,
    extraEnv: { NIGHTWATCH_PRINT_CLI: printCli, NIGHTWATCH_PRINT_ARGS: printArgs },
    allowedEnvKeys: ['NIGHTWATCH_PRINT_CLI', 'NIGHTWATCH_PRINT_ARGS'],
    validationContext: {
      authorizedEnvironments: ['LOCAL'],
      allowedToolIds: [...tools.AGENT_TOOL_IDS],
    },
  });
}

/**
 * ENVIRONMENT_BLOCKED: the case declares a contained replay but this host
 * could not execute it for a substrate reason. It is NOT a miss, and it leaves
 * both sides of every rate.
 */
function environmentDisposition(definedCase, huntResult) {
  if (definedCase.minedReplay === null || definedCase.minedReplay === undefined) return 'NOT_APPLICABLE';
  const audit = huntResult.minedReplayAudit;
  if (audit === null || audit === undefined) return 'REPLAY_NEVER_REQUESTED';
  const verdict = String(audit.verdict ?? '');
  const blocked = [
    'TOOLCHAIN_UNAVAILABLE',
    'TOOLCHAIN_INCOMPATIBLE',
    'VENDOR_DIRECTORY_ABSENT',
    'UNSUPPORTED_TARGET',
    'NO_SUPPORTED_EXECUTOR',
    'CONTAINMENT_UNAVAILABLE',
    'MATERIALIZATION_FAILED',
  ];
  return blocked.some((code) => verdict.includes(code)) ? 'ENVIRONMENT_BLOCKED' : 'EXECUTED';
}

/** Why a case did not reach EXACT, in the score's own terms. Never editorial. */
function nonExactReason(scoreValue, outcome) {
  if (outcome === 'EXACT_REDISCOVERY') return null;
  const reasons = [];
  if (!scoreValue.testMatch) reasons.push('HIDDEN_FAILING_TEST_NOT_NAMED');
  if (scoreValue.fileRecall < score.BENCHMARK_EXACT_MIN_FILE_RECALL) {
    reasons.push(`FILE_RECALL_BELOW_THRESHOLD(${scoreValue.fileRecall.toFixed(3)}<${score.BENCHMARK_EXACT_MIN_FILE_RECALL})`);
  }
  if (scoreValue.keywordRecall < score.BENCHMARK_EXACT_MIN_KEYWORD_RECALL) {
    reasons.push(`KEYWORD_RECALL_BELOW_THRESHOLD(${scoreValue.keywordRecall.toFixed(3)}<${score.BENCHMARK_EXACT_MIN_KEYWORD_RECALL})`);
  }
  return reasons.length === 0 ? 'UNCLASSIFIED' : reasons.join('+');
}

const corpus = resolveCorpus();
const results = [];
const startedAt = Date.now();

for (const item of corpus) {
  const caseStarted = Date.now();
  if (item.definedCase === null || item.definedCase === undefined) {
    results.push({
      caseId: item.id,
      kind: item.kind,
      negativeControl: item.negativeControl,
      disposition: 'CASE_UNRESOLVED',
      note: 'the frozen case could not be re-derived on this host',
      exactMatch: false,
      environmentDisposition: 'ENVIRONMENT_BLOCKED',
      leaked: [],
    });
    continue;
  }
  const definedCase = item.definedCase;
  let huntResult = null;
  let failureMessage = null;
  try {
    huntResult = await hunt.runBenchmarkHunt(definedCase, {
      reasoner: buildDriver(),
      budgetPolicy: hunt.defaultBenchmarkBudgetPolicy(),
      maxTurns: freeze.budget.maxTurnsPerCase,
    });
  } catch (error) {
    failureMessage = error instanceof Error ? error.message : 'HUNT_FAILED';
  }
  if (huntResult === null) {
    results.push({
      caseId: definedCase.caseId,
      kind: item.kind,
      negativeControl: item.negativeControl,
      disposition: 'HARNESS_FAILURE',
      note: failureMessage,
      exactMatch: false,
      environmentDisposition: 'ENVIRONMENT_BLOCKED',
      leaked: [],
      elapsedMs: Date.now() - caseStarted,
    });
    continue;
  }
  const envDisposition = environmentDisposition(definedCase, huntResult);
  // 12.8 requires hypothesis/target/action figures. Derive them with the
  // repository's own metrics engine so they are mechanical, never hand-counted.
  let efficacy = null;
  try {
    efficacy = metricsMod.deriveEfficacyCaseMetrics({
      caseId: definedCase.caseId,
      mode: 'W8_MEMORY',
      state: huntResult.runtimeState,
      terminationReason: huntResult.terminationReason,
      history: huntResult.investigationHistory,
      negativeControl: item.negativeControl,
      outcome: huntResult.outcome,
      verifiedTier: score.classifyVerifiedBenchmarkTier({
        admitted: huntResult.admitted,
        score: huntResult.score,
        mechanicalReproductionCount: huntResult.reproductionCount,
        leakage: huntResult.leaked,
      }),
      exactRediscovery: huntResult.outcome === 'EXACT_REDISCOVERY',
      leaked: huntResult.leaked,
    });
  } catch {
    // A metrics-derivation failure must not silently become a zero.
    efficacy = null;
  }
  const verifiedTier = score.classifyVerifiedBenchmarkTier({
    admitted: huntResult.admitted,
    score: huntResult.score,
    mechanicalReproductionCount: huntResult.reproductionCount,
    leakage: huntResult.leaked,
  });
  results.push({
    caseId: definedCase.caseId,
    kind: item.kind,
    negativeControl: item.negativeControl,
    disposition: 'EVALUATED',
    terminationReason: huntResult.terminationReason,
    outcome: huntResult.outcome,
    exactMatch: huntResult.outcome === 'EXACT_REDISCOVERY',
    rootCauseTier: verifiedTier,
    hiddenTargetDistance: {
      testMatch: huntResult.score.testMatch,
      fileHits: huntResult.score.fileHits,
      fileTotal: huntResult.score.fileTotal,
      fileRecall: huntResult.score.fileRecall,
      keywordRecall: huntResult.score.keywordRecall,
      keywordTotal: huntResult.score.keywordTotal,
    },
    nonExactReason: nonExactReason(huntResult.score, huntResult.outcome),
    reproductionVerdict: huntResult.reproductionCount > 0 ? 'REPRODUCED' : 'NOT_REPRODUCED',
    reproductionCount: huntResult.reproductionCount,
    candidateIds: huntResult.candidateIds,
    candidatesProposed: huntResult.admitted,
    mechanicallyAdmitted: huntResult.dossier !== null && huntResult.dossier !== undefined,
    admissionRefusal:
      huntResult.admitted && (huntResult.dossier === null || huntResult.dossier === undefined)
        ? 'MISSING_REPRODUCTION'
        : null,
    dossier: huntResult.dossier !== null && huntResult.dossier !== undefined,
    environmentDisposition: envDisposition,
    leaked: huntResult.leaked,
    reasonerCalls: huntResult.reasonerCalls,
    requestBlobCount: huntResult.requestBlobs.length,
    efficacy: efficacy === null ? 'METRICS_DERIVATION_FAILED' : {
      toolActions: efficacy.toolActions,
      uniqueSourceTargets: efficacy.uniqueSourceTargets,
      hypothesesFormed: efficacy.hypothesesFormed,
      groundedHypotheses: efficacy.groundedHypotheses,
      verificationReadyHypotheses: efficacy.verificationReadyHypotheses,
      disprovedHypotheses: efficacy.disprovedHypotheses,
      reproductionAttempts: efficacy.reproductionAttempts,
      refusedReproductionAttempts: efficacy.refusedReproductionAttempts,
      mechanicalReproductions: efficacy.mechanicalReproductions,
    },
    elapsedMs: Date.now() - caseStarted,
  });
  // Stream progress: a long arm must be observable while it runs.
  console.error(
    `[w11-hist] ${definedCase.caseId} outcome=${huntResult.outcome} exact=${huntResult.outcome === 'EXACT_REDISCOVERY'} ` +
      `leaked=${huntResult.leaked.length} env=${envDisposition} calls=${huntResult.reasonerCalls} ` +
      `ms=${Date.now() - caseStarted}`,
  );
}

// -- Aggregation. Every denominator is named; ENVIRONMENT_BLOCKED leaves both
// -- sides of every rate and is reported on its own.
const evaluated = results.filter((item) => item.disposition === 'EVALUATED');
const environmentBlocked = results.filter((item) => item.environmentDisposition === 'ENVIRONMENT_BLOCKED');
const scored = evaluated.filter((item) => item.environmentDisposition !== 'ENVIRONMENT_BLOCKED');
const substantive = scored.filter((item) => !item.negativeControl);
const negativeControls = scored.filter((item) => item.negativeControl);
const exact = substantive.filter((item) => item.exactMatch);
const near = substantive.filter(
  (item) => !item.exactMatch && (item.outcome === 'PARTIAL_REDISCOVERY' || item.outcome === 'SAME_ROOT_CAUSE_ALTERNATE'),
);
const falsePositives = negativeControls.filter(
  (item) => item.outcome === 'FALSE_POSITIVE' || item.candidateIds.length > 0,
);
const leakageEvents = results.flatMap((item) => item.leaked ?? []);

/** Sum one mechanically derived efficacy field; null when any case lacks it. */
function sumEfficacy(rows, field) {
  let total = 0;
  for (const row of rows) {
    if (row.efficacy === null || typeof row.efficacy !== 'object') return null;
    const value = row.efficacy[field];
    if (typeof value !== 'number') return null;
    total += value;
  }
  return total;
}

const report = {
  schemaVersion: 'nightwatch.w11-historical-arm.v1',
  arm: 'HISTORICAL_EXACT_REDISCOVERY',
  freezeFingerprint,
  frozenAtSha: freeze.frozenAtSha,
  provider: { model: freeze.provider.model, cliVersion: freeze.provider.cliVersion },
  startedAtIso: new Date(startedAt).toISOString(),
  elapsedMs: Date.now() - startedAt,
  corpus: {
    frozenTotal: freeze.corpus.totalCaseCount,
    attempted: results.length,
    evaluated: evaluated.length,
    environmentBlocked: environmentBlocked.length,
    negativeControls: negativeControls.length,
  },
  denominators: {
    exactRate: 'exact rediscoveries / substantive scored cases (ENVIRONMENT_BLOCKED excluded from both sides; negative controls excluded)',
    falsePositiveRate: 'negative controls producing a candidate / scored negative controls',
    mechanicalAdmissions: 'dossiers built through the existing mechanical path / substantive scored cases; a proposed candidate with no reproduction is refused MISSING_REPRODUCTION and is NOT an admission',
  },
  totals: {
    substantiveScored: substantive.length,
    exactRediscoveries: exact.length,
    exactRate: substantive.length === 0 ? null : exact.length / substantive.length,
    nearMatches: near.length,
    reproductions: scored.filter((item) => item.reproductionCount > 0).length,
    // `admitted` on a hunt result means candidateIds.length > 0 — a candidate
    // was PROPOSED. It is not an admission. The mechanically admitted artefact
    // is the dossier, and `tryBuild*Dossier` returns null below
    // reproductionCount 1, so proposing without reproducing admits nothing.
    candidatesProposed: scored.filter((item) => item.candidatesProposed).length,
    mechanicalAdmissions: scored.filter((item) => item.dossier).length,
    candidatesRefusedMissingReproduction: scored.filter(
      (item) => item.candidatesProposed && !item.dossier,
    ).length,
    dossiers: scored.filter((item) => item.dossier).length,
    negativeControlsScored: negativeControls.length,
    falsePositives: falsePositives.length,
    environmentBlocked: environmentBlocked.length,
    leakageEvents: leakageEvents.length,
    toolActions: sumEfficacy(scored, 'toolActions'),
    uniqueSourceTargets: sumEfficacy(scored, 'uniqueSourceTargets'),
    groundedHypotheses: sumEfficacy(scored, 'groundedHypotheses'),
    verificationReadyHypotheses: sumEfficacy(scored, 'verificationReadyHypotheses'),
    disprovedHypotheses: sumEfficacy(scored, 'disprovedHypotheses'),
  },
  cases: results,
};

const serialized = JSON.stringify(report, null, 2);
if (outPath !== null) fs.writeFileSync(outPath, serialized, { mode: 0o600 });
console.log(serialized);
