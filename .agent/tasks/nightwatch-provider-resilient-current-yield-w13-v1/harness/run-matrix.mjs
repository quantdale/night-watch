#!/usr/bin/env node
// W13 frozen-matrix run harness. LOCAL owner-local only.
//
// Executes one frozen run (or all runs in frozen order) through
// `runLocalCliCampaign` with the provider supervisor, the frozen wall-clock
// ceiling, the frozen runtime envelope, and the existing owner-local
// investigation context. Emits one sanitized receipt per run with per-provider
// attribution. Never contacts DEV/NEXT/production and never writes siblings.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModules } from '../../../../bin/lib/typescript-runtime-loader.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..', '..');
const TASK = path.join(ROOT, '.agent/tasks/nightwatch-provider-resilient-current-yield-w13-v1');
const EVIDENCE_RUNS = path.join(TASK, 'evidence', 'runs');
const CAMPAIGN_STATE = path.join(os.homedir(), '.nightwatch', 'campaigns');
const SUPERVISOR_STATE = path.join(os.homedir(), '.nightwatch', 'w13-runs');
const SUPERVISOR = path.join(HERE, 'provider-supervisor.mjs');

const freeze = JSON.parse(fs.readFileSync(path.join(TASK, 'evaluation-freeze.json'), 'utf8'));
const policy = JSON.parse(fs.readFileSync(path.join(TASK, 'provider-resilience-policy.json'), 'utf8'));

function argValues(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).filter((item) => item.startsWith(prefix)).map((item) => item.slice(prefix.length));
}
const requested = argValues('run-id');
const force = process.argv.includes('--force');

const [campaignMod, contextMod, freezeMod] = loadTypeScriptModules([
  'src/core/agentRuntime/localCampaign.ts',
  'src/core/localInvestigation/ownerLocal.ts',
  'src/core/currentSourceYield/evaluationFreeze.ts',
], { root: ROOT });

function readJsonl(file) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

function sanitizeProviderAttribution(runId) {
  const stateDir = path.join(SUPERVISOR_STATE, runId);
  const attribution = readJsonl(path.join(stateDir, `${runId}.attribution.jsonl`));
  let state = { activeOrdinal: 1, degraded: [], transitions: [], exhausted: false };
  try {
    state = JSON.parse(fs.readFileSync(path.join(stateDir, `${runId}.state.json`), 'utf8'));
  } catch {
    /* no supervisor state: zero provider calls */
  }
  const byProvider = new Map();
  for (const record of attribution) {
    const provider = typeof record.provider === 'string' ? record.provider : 'UNKNOWN';
    const current = byProvider.get(provider) ?? {
      provider,
      calls: 0,
      validResponses: 0,
      validResponseBytes: 0,
      stdoutBytes: 0,
      stderrBytes: 0,
      wallTimeMs: 0,
      failuresByClass: {},
      retries: 0,
    };
    current.calls += 1;
    current.stdoutBytes += typeof record.stdoutBytes === 'number' ? record.stdoutBytes : 0;
    current.stderrBytes += typeof record.stderrBytes === 'number' ? record.stderrBytes : 0;
    current.wallTimeMs += typeof record.durationMs === 'number' ? record.durationMs : 0;
    if (record.class === 'VALID_PROVIDER_RESPONSE') {
      current.validResponses += 1;
      current.validResponseBytes += typeof record.stdoutBytes === 'number' ? record.stdoutBytes : 0;
    } else {
      current.retries += 1;
      current.failuresByClass[record.class] = (current.failuresByClass[record.class] ?? 0) + 1;
    }
    byProvider.set(provider, current);
  }
  const transitions = Array.isArray(state.transitions) ? state.transitions : [];
  const activeProvider = policy.candidates.find((candidate) => candidate.ordinal === state.activeOrdinal)?.provider ?? 'NONE';
  return {
    providers: [...byProvider.values()].sort((left, right) => left.provider.localeCompare(right.provider)).map((entry) => ({
      ...entry,
      transitionsIn: transitions.filter((transition) => transition.to === entry.provider).map((transition) => transition.from),
      transitionsOut: transitions.filter((transition) => transition.from === entry.provider).map((transition) => transition.to),
    })),
    supervisor: {
      activeProvider,
      degradedProviders: Array.isArray(state.degraded) ? state.degraded : [],
      transitions,
      exhausted: state.exhausted === true,
    },
  };
}

function readCheckpoint(campaignId) {
  try {
    return JSON.parse(fs.readFileSync(path.join(CAMPAIGN_STATE, `${campaignId}.checkpoint.json`), 'utf8'));
  } catch {
    return null;
  }
}

function summarizeActionLog(checkpoint) {
  const actionLog = Array.isArray(checkpoint?.state?.actionLog) ? checkpoint.state.actionLog : [];
  const toolActions = actionLog.filter((record) => record.intentKind === 'CALL_TOOL');
  const inspected = new Set();
  for (const record of toolActions) {
    if (record.toolId !== 'INSPECT_SOURCE_SURFACE') continue;
    const target = record.target;
    if (typeof target === 'string' && target.length > 0) inspected.add(target);
  }
  const reproductionAttempts = toolActions.filter((record) => record.toolId === 'RERUN_SAFE_REPRODUCTION').length;
  const hypotheses = Array.isArray(checkpoint?.state?.hypotheses) ? checkpoint.state.hypotheses.length : 0;
  return {
    actionLogEntries: actionLog.length,
    toolActions: toolActions.length,
    uniqueInspectedSourcePaths: inspected.size,
    reproductionAttempts,
    hypothesesFormed: hypotheses,
  };
}

async function runOne(entry) {
  const receiptPath = path.join(EVIDENCE_RUNS, `${entry.runId}.json`);
  if (!force && fs.existsSync(receiptPath)) {
    process.stdout.write(`[w13] ${entry.runId} already has a receipt; skipping\n`);
    return;
  }
  fs.mkdirSync(path.join(SUPERVISOR_STATE, entry.runId), { recursive: true, mode: 0o700 });
  // A fresh run supersedes any previous generation for this id; the supervisor
  // state is reset too so failover starts at the frozen first candidate.
  for (const suffix of ['state.json', 'attribution.jsonl']) {
    try {
      fs.rmSync(path.join(SUPERVISOR_STATE, entry.runId, `${entry.runId}.${suffix}`), { force: true });
    } catch {
      /* ignore */
    }
  }
  const repositoryIds = entry.repositoryScope === null ? undefined : [entry.repositoryScope];
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  let result = null;
  let failure = null;
  try {
    result = await campaignMod.runLocalCliCampaign({
      campaignId: entry.runId,
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [
        SUPERVISOR,
        `--state=${path.join(SUPERVISOR_STATE, entry.runId)}`,
        `--run=${entry.runId}`,
      ],
      provider: `policy-governed-failover:${policy.fingerprint.replace('sha256:', '')}`,
      model: `nightwatch-provider-resilience-policy.v1:${entry.runId}`,
      maxTurns: entry.maxTurnsPerInvestigation,
      stateDirectory: CAMPAIGN_STATE,
      investigationScope: repositoryIds,
      wallClockCeilingOverrideMs: entry.wallClockCeilingMs,
      declaredBudgetEnvelope: freeze.runtimeBudgetEnvelope,
      investigationContext: contextMod.createOwnerLocalInvestigationContext(
        repositoryIds === undefined ? {} : { repositoryIds },
      ),
    });
  } catch (error) {
    failure = error instanceof Error ? `${error.code ?? error.name}: ${error.message}` : String(error);
  }
  const wallTimeMs = Date.now() - startedMs;
  const checkpoint = readCheckpoint(entry.runId);
  const actionSummary = summarizeActionLog(checkpoint);
  const providerSummary = sanitizeProviderAttribution(entry.runId);
  const resultOrCheckpoint = result;
  const providerResponseBytes = resultOrCheckpoint?.byteLedger?.providerResponseBytes ?? 0;
  const sourceActivity = actionSummary.toolActions;
  const yieldEvidence = resultOrCheckpoint?.yieldMetrics ?? null;
  const reproductionActivity = Number.isFinite(yieldEvidence?.reproductionAttempts) && yieldEvidence.reproductionAttempts > 0;
  const sourceActivityObserved = sourceActivity !== 'NOT_CAPTURED';
  const sourceActivityProven = (sourceActivityObserved && sourceActivity > 0) || reproductionActivity || admissions.length > 0;
  const validProviderResult = providerResponseBytes > 0 && sourceActivityProven;
  const terminationReason = resultOrCheckpoint?.terminationReason ?? 'EXECUTION_FAILURE';
  const receipt = {
    schemaVersion: 'nightwatch.w13-run-receipt.v1',
    runId: entry.runId,
    kind: entry.kind,
    repositoryScope: entry.repositoryScope,
    wallClockCeilingMs: entry.wallClockCeilingMs,
    policyFingerprint: policy.fingerprint,
    freezeFingerprint: freeze.freezeFingerprint,
    selectedProvider: freeze.provider.selectedProvider,
    startedAt,
    wallTimeMs,
    validProviderResult,
    terminationReason,
    terminationClass: failure !== null
      ? 'EXECUTION_FAILURE'
      : providerResponseBytes === 0 && !sourceActivityProven
        ? 'PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION'
        : validProviderResult
          ? 'VALID_PROVIDER_RUN'
          : 'PROVIDER_VALID_SOURCE_ACTIVITY_UNOBSERVED',
    executionFailure: failure,
    investigationsStarted: resultOrCheckpoint?.investigationsStarted ?? null,
    investigationsCompleted: resultOrCheckpoint?.investigationsCompleted ?? null,
    reasonerCalls: resultOrCheckpoint?.reasonerCalls ?? null,
    providerFailures: resultOrCheckpoint?.providerFailures ?? null,
    candidateIds: resultOrCheckpoint?.candidateIds ?? [],
    candidateCount: (resultOrCheckpoint?.candidateIds ?? []).length,
    admissionPathResults: admissionResults.length,
    findingAdmissions: admissions.length,
    mechanicalAdmissions: admissions.length,
    refusalResults: refusals,
    reproductionCount: resultOrCheckpoint?.reproductionCount ?? 0,
    dossierStatus: resultOrCheckpoint?.dossierStatus ?? 'NONE',
    actionLogEntries: actionSummary.actionLogEntries,
    toolActions: actionSummary.toolActions,
    uniqueInspectedSourcePaths: actionSummary.uniqueInspectedSourcePaths,
    reproductionAttemptsTool: actionSummary.reproductionAttempts,
    hypothesesFormed: actionSummary.hypothesesFormed,
    providerResponseBytes,
    providerStderrBytes: resultOrCheckpoint?.byteLedger?.providerStderrBytes ?? 0,
    renderedInputBytes: resultOrCheckpoint?.byteLedger?.renderedInputBytes ?? 0,
    toolPayloadBytes: resultOrCheckpoint?.byteLedger?.toolPayloadBytes ?? null,
    yieldMetrics: resultOrCheckpoint?.yieldMetrics ?? null,
    sourceOpportunity: sourceActivity > 0 ? 'AVAILABLE' : 'PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION',
    providerHealth: providerSummary.supervisor,
    providers: providerSummary.providers,
    terminationSafety: 'NO_SAFETY_BLOCK',
    novelty: 'NOT_APPLICABLE_NO_ADMISSION',
    ownerLocalRawCheckpoint: path.join(CAMPAIGN_STATE, `${entry.runId}.checkpoint.json`),
  };
  // Owner-local dossier persistence: an admission dossier is never committed,
  // but it must survive the campaign so a later novelty adjudication can cite
  // its identity. Written under the run's owner-local state directory.
  const admissionResults = Array.isArray(resultOrCheckpoint?.findingAdmissions) ? resultOrCheckpoint.findingAdmissions : [];
  const admissions = admissionResults.filter((entry) => entry?.admitted === true);
  const refusals = admissionResults.filter((entry) => entry?.admitted === false).map((entry) => ({
    candidateId: typeof entry?.candidateId === 'string' ? entry.candidateId : null,
    reason: typeof entry?.reason === 'string' ? entry.reason : 'REFUSED_NO_REPRODUCTION',
  }));
  const dossierDir = path.join(SUPERVISOR_STATE, entry.runId, 'dossiers');
  const persistedDossiers = [];
  for (const admission of admissions) {
    const candidateId = typeof admission?.candidateId === 'string' && admission.candidateId.length > 0 ? admission.candidateId : null;
    if (candidateId === null) continue;
    try {
      fs.mkdirSync(dossierDir, { recursive: true, mode: 0o700 });
      const dossierPath = path.join(dossierDir, `${candidateId}.json`);
      fs.writeFileSync(dossierPath, `${JSON.stringify(admission, null, 2)}\n`, { mode: 0o600 });
      persistedDossiers.push({
        candidateId,
        ownerLocalDossier: dossierPath,
        dossierIdentity: typeof admission?.dossier?.dossierId === 'string' ? admission.dossier.dossierId : null,
        reproductionCount: typeof admission?.reproductionCount === 'number' ? admission.reproductionCount : null,
      });
    } catch (error) {
      persistedDossiers.push({ candidateId, ownerLocalDossier: null, persistenceError: error instanceof Error ? error.message : String(error) });
    }
  }
  receipt.admissions = persistedDossiers;
  fs.mkdirSync(EVIDENCE_RUNS, { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  process.stdout.write(`[w13] ${entry.runId} ${receipt.terminationClass} valid=${validProviderResult} responseBytes=${providerResponseBytes} toolActions=${sourceActivity} admissions=${persistedDossiers.length} wallMs=${wallTimeMs}\n`);
}

async function main() {
  const matrix = Array.isArray(freeze.matrix) ? freeze.matrix : [];
  const selected = requested.length === 0 ? matrix : matrix.filter((entry) => requested.includes(entry.runId));
  if (selected.length === 0) {
    process.stderr.write('no matching frozen runs\n');
    process.exit(2);
  }
  for (const entry of selected) {
    await runOne(entry);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
