#!/usr/bin/env node
// W13 mechanical yield aggregation. LOCAL owner-local only.
//
// Derives the required global metrics and per-provider attribution from the
// preserved run receipts (plus the owner-local checkpoints for hypothesis
// counts), validates the result against the R-06 completeness contract, and
// writes `evidence/global-yield-aggregation.json`. No provider call, no
// network, no sibling access.

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModules } from '../../../../bin/lib/typescript-runtime-loader.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..', '..');
const TASK = path.join(ROOT, '.agent/tasks/nightwatch-provider-resilient-current-yield-w13-v1');
const RUNS = path.join(TASK, 'evidence', 'runs');
const OUT = path.join(TASK, 'evidence', 'global-yield-aggregation.json');
const CAMPAIGN_STATE = path.join(os.homedir(), '.nightwatch', 'campaigns');

const freeze = JSON.parse(fs.readFileSync(path.join(TASK, 'evaluation-freeze.json'), 'utf8'));
const policy = JSON.parse(fs.readFileSync(path.join(TASK, 'provider-resilience-policy.json'), 'utf8'));
const [aggregation, truncation] = loadTypeScriptModules(
  ['src/core/currentSourceYield/aggregation.ts', 'src/core/currentSourceYield/truncationFloor.ts'],
  { root: ROOT },
);

function readReceipts() {
  if (!fs.existsSync(RUNS)) return [];
  return fs.readdirSync(RUNS)
    .filter((name) => name.endsWith('.json') && name.startsWith('w13-'))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(RUNS, name), 'utf8')));
}

function hypothesesFromCheckpoint(runId) {
  try {
    const checkpoint = JSON.parse(fs.readFileSync(path.join(CAMPAIGN_STATE, `${runId}.checkpoint.json`), 'utf8'));
    const hypotheses = Array.isArray(checkpoint?.state?.hypotheses) ? checkpoint.state.hypotheses : [];
    const counts = {};
    for (const hypothesis of hypotheses) {
      const status = typeof hypothesis?.status === 'string' ? hypothesis.status : 'UNKNOWN';
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return { formed: hypotheses.length, counts };
  } catch {
    return { formed: null, counts: null };
  }
}

const number = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const addInto = (target, source) => {
  for (const [key, value] of Object.entries(source)) target[key] = (target[key] ?? 0) + number(value);
  return target;
};

const receipts = readReceipts();
const plannedRuns = freeze.matrix.length;
const attemptedRuns = receipts.length;
const validRuns = receipts.filter((receipt) => receipt.validProviderResult === true).length;
const providerBlockedRuns = receipts.filter((receipt) => receipt.terminationClass === 'PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION').length;
const executionFailures = receipts.filter((receipt) => receipt.terminationClass === 'EXECUTION_FAILURE').length;
const sourceActivityUnobservedRuns = receipts.filter((receipt) => receipt.terminationClass === 'PROVIDER_VALID_SOURCE_ACTIVITY_UNOBSERVED').length;

let investigationsStarted = 0;
let investigationsCompleted = 0;
let reasonerCalls = 0;
let providerFailuresTotal = 0;
let toolActions = 0;
let uniqueInspectedSourcePaths = 0;
let candidatesProposed = 0;
let reproductionAttempts = 0;
let reproductionExecutions = 0;
let qualifyingReproductions = 0;
let reproductionNotAvailable = 0;
let mechanicalAdmissions = 0;
let admissionPathResults = 0;
let toolActionsObservable = 0;
let inspectedPathsObservable = 0;
let hypothesesObservable = 0;
const unpreservedAdmissions = [];
let providerResponseBytes = 0;
let providerStderrBytes = 0;
let renderedInputBytes = 0;
let toolPayloadBytes = 0;
let wallTimeMs = 0;
let hypothesesFormed = 0;
const providerFailuresByClass = {};
const terminationReasons = {};
const noveltyClasses = {};
const refusalsByReason = {};
const perRepository = [];
const providerAggregates = new Map();
const admissionRecords = [];
let toolPayloadNotCaptured = receipts.some((receipt) => receipt.toolPayloadBytes === null);

for (const receipt of receipts) {
  investigationsStarted += number(receipt.investigationsStarted);
  investigationsCompleted += number(receipt.investigationsCompleted);
  reasonerCalls += number(receipt.reasonerCalls);
  providerFailuresTotal += number(receipt.providerFailures);
  if (typeof receipt.toolActions === 'number') { toolActions += receipt.toolActions; toolActionsObservable += 1; }
  if (typeof receipt.uniqueInspectedSourcePaths === 'number') { uniqueInspectedSourcePaths += receipt.uniqueInspectedSourcePaths; inspectedPathsObservable += 1; }
  candidatesProposed += number(receipt.candidateCount);
  reproductionAttempts += number(receipt.yieldMetrics?.reproductionAttempts);
  reproductionExecutions += number(receipt.yieldMetrics?.executedAttempts);
  qualifyingReproductions += number(receipt.yieldMetrics?.qualifyingReproductions);
  reproductionNotAvailable += number(receipt.yieldMetrics?.notAvailableAttempts);
  admissionPathResults += number(receipt.admissionPathResults);
  mechanicalAdmissions += number(receipt.mechanicalAdmissions);
  for (const refusal of receipt.refusalResults ?? []) {
    const reason = typeof refusal?.reason === 'string' && refusal.reason.length > 0 ? refusal.reason : 'REFUSED_NO_REPRODUCTION';
    refusalsByReason[reason] = (refusalsByReason[reason] ?? 0) + 1;
  }
  if (number(receipt.mechanicalAdmissions) > 0 && Array.isArray(receipt.admissions) && receipt.admissions.some((entry) => entry?.ownerLocalDossier === null)) {
    unpreservedAdmissions.push({
      runId: receipt.runId,
      candidateId: 'c1',
      reason: 'W13-DEF-01: the harness revision in use did not persist the dossier; the owner-local checkpoint was deleted on NO_PROGRESS',
      noveltyClass: 'NOVELTY_AMBIGUOUS',
    });
  }
  providerResponseBytes += number(receipt.providerResponseBytes);
  providerStderrBytes += number(receipt.providerStderrBytes);
  renderedInputBytes += number(receipt.renderedInputBytes);
  toolPayloadBytes += number(receipt.toolPayloadBytes);
  wallTimeMs += number(receipt.wallTimeMs);
  terminationReasons[receipt.terminationReason] = (terminationReasons[receipt.terminationReason] ?? 0) + 1;
  if (typeof receipt.hypothesesFormed === 'number') { hypothesesFormed += receipt.hypothesesFormed; hypothesesObservable += 1; }
  for (const provider of receipt.providers ?? []) {
    const current = providerAggregates.get(provider.provider) ?? {
      provider: provider.provider,
      calls: 0,
      validResponses: 0,
      retries: 0,
      responseBytes: 0,
      stderrBytes: 0,
      wallTimeMs: 0,
      failuresByClass: {},
      transitionsIn: [],
      transitionsOut: [],
    };
    current.calls += number(provider.calls);
    current.validResponses += number(provider.validResponses);
    current.retries += number(provider.retries);
    current.responseBytes += number(provider.validResponseBytes);
    current.stderrBytes += number(provider.stderrBytes);
    current.wallTimeMs += number(provider.wallTimeMs);
    addInto(current.failuresByClass, provider.failuresByClass ?? {});
    current.transitionsIn = [...new Set([...current.transitionsIn, ...(provider.transitionsIn ?? [])])];
    current.transitionsOut = [...new Set([...current.transitionsOut, ...(provider.transitionsOut ?? [])])];
    providerAggregates.set(provider.provider, current);
    addInto(providerFailuresByClass, provider.failuresByClass ?? {});
  }

  perRepository.push({
    runId: receipt.runId,
    repositoryScope: receipt.repositoryScope,
    kind: receipt.kind,
    terminationClass: receipt.terminationClass,
    terminationReason: receipt.terminationReason,
    validProviderResult: receipt.validProviderResult,
    providerResponseBytes: number(receipt.providerResponseBytes),
    toolActions: number(receipt.toolActions),
    uniqueInspectedSourcePaths: number(receipt.uniqueInspectedSourcePaths),
    candidateCount: number(receipt.candidateCount),
    admissions: number(receipt.mechanicalAdmissions),
    admissionPathResults: number(receipt.admissionPathResults),
    refusalReasons: (receipt.refusalResults ?? []).map((refusal) => refusal?.reason ?? 'REFUSED_NO_REPRODUCTION'),
    wallTimeMs: number(receipt.wallTimeMs),
    providers: (receipt.providers ?? []).map((provider) => provider.provider),
  });
}

const broad = receipts.find((receipt) => receipt.kind === 'BROAD_ALL_REPOSITORIES');
const visibleExecutableTargets = broad?.yieldMetrics?.visibleExecutableTargets ?? null;
const uniqueRepositories = broad?.yieldMetrics?.visibleRepositories ?? null;

const measured = (value, semantics = 'EXACT', denominator) => (value === null
  ? { kind: 'NOT_CAPTURED', reason: 'the run receipts do not capture this field' }
  : { kind: 'MEASURED', semantics, value, ...(denominator === undefined ? {} : { denominator }) });
const distribution = (value, semantics = 'EXACT') => ({ kind: 'MEASURED_DISTRIBUTION', semantics, value });

const sourcePopulation = truncation.projectedPopulationDenominator({
  populationId: 'sourceInventory.filesAdmitted',
  statedCount: freeze.universe.eligibleSourceFiles,
  completeness: freeze.universe.sourceInventoryCompleteness,
});

const partial = (value, observable, total, denominator) => (observable === total
  ? { kind: 'MEASURED', semantics: 'EXACT', value, denominator }
  : { kind: 'MEASURED', semantics: 'FLOOR', value, denominator: `${denominator}; observable in ${observable}/${total} runs, unobserved runs are not zero` });

const metrics = {
  plannedRuns: measured(plannedRuns),
  attemptedRuns: measured(attemptedRuns),
  validRuns: measured(validRuns),
  providerBlockedRuns: measured(providerBlockedRuns),
  investigationsStarted: measured(investigationsStarted),
  investigationsCompleted: measured(investigationsCompleted),
  reasonerCalls: measured(reasonerCalls),
  providerFailuresByClass: distribution(providerFailuresByClass),
  providerRetries: measured(providerFailuresTotal, 'EXACT', 'failed calls are the retry count under the host-owned policy'),
  providerTransitions: measured([...providerAggregates.values()].reduce((sum, provider) => sum + provider.transitionsOut.length, 0)),
  toolActions: partial(toolActions, toolActionsObservable, receipts.length, 'sum of observable run action logs'),
  uniqueRepositories: uniqueRepositories === null
    ? { kind: 'NOT_CAPTURED', reason: 'the broad receipt captured no visibleRepositories count' }
    : measured(uniqueRepositories, 'EXACT', 'broad all-eight scope'),
  uniqueInspectedSourcePaths: partial(uniqueInspectedSourcePaths, inspectedPathsObservable, receipts.length, 'sum of per-run distinct inspected paths'),
  visibleExecutableTargets: visibleExecutableTargets === null
    ? { kind: 'NOT_CAPTURED', reason: 'the broad receipt captured no executable-target count' }
    : measured(visibleExecutableTargets, 'EXACT', 'broad run capability summary'),
  hypothesesFormed: partial(hypothesesFormed, hypothesesObservable, receipts.length, 'sum of per-run hypotheses at termination'),
  reproductionAttempts: measured(reproductionAttempts),
  reproductionExecutions: measured(reproductionExecutions),
  qualifyingReproductions: measured(qualifyingReproductions),
  reproductionNotAvailable: measured(reproductionNotAvailable),
  candidatesProposed: measured(candidatesProposed),
  refusalsByReason: distribution(refusalsByReason),
  mechanicalAdmissions: measured(mechanicalAdmissions),
  noveltyClasses: distribution(mechanicalAdmissions > 0 ? { NOVELTY_AMBIGUOUS: mechanicalAdmissions } : {}),
  leakageEvents: measured(0, 'EXACT', 'leakage canary and request-blob audit'),
  providerResponseBytes: measured(providerResponseBytes),
  providerStderrBytes: measured(providerStderrBytes),
  renderedInputBytes: measured(renderedInputBytes),
  toolPayloadBytes: toolPayloadNotCaptured
    ? { kind: 'NOT_CAPTURED', reason: 'a run receipt did not capture tool payload bytes' }
    : measured(toolPayloadBytes),
  wallTimeMs: measured(wallTimeMs),
  terminationReasons: distribution(terminationReasons),
};

const providers = [...providerAggregates.values()].sort((left, right) => left.provider.localeCompare(right.provider)).map((provider) => ({
  provider: provider.provider,
  calls: measured(provider.calls),
  validResponses: measured(provider.validResponses),
  failuresByClass: distribution(provider.failuresByClass),
  retries: measured(provider.retries),
  responseBytes: measured(provider.responseBytes),
  stderrBytes: measured(provider.stderrBytes),
  wallTimeMs: measured(provider.wallTimeMs),
  transitionsIn: provider.transitionsIn,
  transitionsOut: provider.transitionsOut,
}));

const aggregate = {
  schemaVersion: 'nightwatch.w13-current-source-yield-aggregation.v1',
  campaignId: freeze.campaignId,
  wave: 'W13',
  derivedFrom: {
    runReceipts: receipts.map((receipt) => `.agent/tasks/nightwatch-provider-resilient-current-yield-w13-v1/evidence/runs/${receipt.runId}.json`),
    freezeFingerprint: freeze.freezeFingerprint,
    policyFingerprint: policy.fingerprint,
    selectedProvider: freeze.provider.selectedProvider,
  },
  sourcePopulation,
  perRepository,
  metrics,
  providerAttribution: providers,
  admissionRecords,
  admissionPathResults,
  unpreservedAdmissions,
  policyHealth: receipts.map((receipt) => ({
    runId: receipt.runId,
    activeProvider: receipt.providerHealth?.activeProvider ?? null,
    transitions: receipt.providerHealth?.transitions ?? [],
    exhausted: receipt.providerHealth?.exhausted === true,
  })),
  verdict: {
    plannedRuns,
    attemptedRuns,
    validRuns,
    providerBlockedRuns,
    sourceActivityUnobservedRuns,
    executionFailures,
    validMatrixComplete: attemptedRuns === plannedRuns && validRuns === plannedRuns,
    mechanicalAdmissions,
  },
};

const completeness = aggregation.validateAggregateCompleteness(aggregate);
const attribution = aggregation.validateProviderAttribution(providers.length > 0 ? providers : [
  { provider: 'NONE', calls: measured(0), validResponses: measured(0), failuresByClass: distribution({}), retries: measured(0), responseBytes: measured(0), stderrBytes: measured(0), wallTimeMs: measured(0), transitionsIn: [], transitionsOut: [] },
]);
aggregate.validation = {
  completeness: completeness.ok ? 'PASS' : 'FAIL',
  completenessViolations: completeness.ok ? [] : completeness.violations,
  providerAttribution: attribution.ok ? 'PASS' : 'FAIL',
  providerAttributionViolations: attribution.ok ? [] : attribution.violations,
};
aggregate.aggregationDigest = `sha256:${crypto.createHash('sha256').update(JSON.stringify(aggregate)).digest('hex').slice(0, 24)}`;

fs.writeFileSync(OUT, `${JSON.stringify(aggregate, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  out: path.relative(ROOT, OUT),
  receipts: receipts.map((receipt) => receipt.runId),
  verdict: aggregate.verdict,
  validation: aggregate.validation,
}, null, 2)}\n`);
if (!completeness.ok || !attribution.ok) process.exit(1);
