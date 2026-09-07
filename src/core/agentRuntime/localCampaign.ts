// ---------------------------------------------------------------------------
// Local CLI campaign launcher. LOCAL environment only.
//
// A bounded campaign is a SEQUENCE of investigations under ONE shared budget:
// each investigation is a fresh AgentRuntime (distinct investigation id, own
// action log, own no-progress window) and the campaign keeps starting new
// investigations until a campaign-level stop condition is hit.
//
// Campaign-level stops (checked in this order after every investigation):
//   1. CANCELLED  -> whole campaign CANCELLED (no checkpoint).
//   2. PAUSED     -> whole campaign PAUSED (campaign checkpoint embeds the
//      paused investigation's checkpoint for verbatim resume).
//   3. SAFETY_BLOCKED -> whole campaign stops at once. A safety block means the
//      reasoner attempted something unsafe; retrying it in a fresh
//      investigation would circumvent the block.
//   4. classifyBudgetExhaustion(SAME policy, cumulative usage) says
//      SAFE_TERMINATION_CHECKPOINT -> BUDGET_EXHAUSTED with a checkpoint. Safe
//      termination, never success. Consecutive reasoner-process failures (the
//      dead-provider case) surface here via the shared consecutiveFailures
//      streak, which investigations are not allowed to reset.
//   5. CAMPAIGN_STAGNATION_LIMIT consecutive investigations with zero new
//      evidence AND zero new candidates -> NO_PROGRESS.
// Otherwise the next investigation starts. Per-investigation COMPLETE_* never
// surfaces as the campaign reason: completion is per-investigation, the
// campaign ends on budget/fatal/stagnation.
//
// Composes the frozen AgentRuntime + CliReasonerDriver + executeAgentTool.
// Never contacts DEV/NEXT/production. Checkpoints are owner-private JSON
// (0700/0600) and are refused if they contain secret-shaped material.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  AGENT_CHECKPOINT_VERSION,
  AGENT_RUNTIME_STATE_VERSION,
  AGENT_TERMINATION_REASONS,
  ZERO_AGENT_BYTE_LEDGER,
  addAgentByteLedgers,
  classifyBudgetExhaustion,
  defaultAgentBudgetPolicy,
  isAgentByteLedger,
  legacyAgentByteLedger,
  type AgentActionRecord,
  type AgentBudgetCeilingName,
  type AgentBudgetPolicy,
  type AgentBudgetUsage,
  type AgentByteLedger,
  type AgentCheckpoint,
  type AgentHypothesis,
  type AgentPhase,
  type AgentRuntimeState,
  type AgentTerminationReason,
} from '../agentProtocol';
import {
  admitLocalFinding,
  type AdmitLocalFindingResult,
} from '../localInvestigation/admission';
import { createUnavailableLocalInvestigationContext } from '../localInvestigation/ownerLocal';
import { createLocalInvestigationToolSession } from '../localInvestigation/session';
import {
  LOCAL_INVESTIGATION_HISTORY_VERSION,
  type LocalInvestigationContext,
  type LocalInvestigationHistory,
} from '../localInvestigation/types';
import { createCliReasonerDriver } from '../reasoner/cliReasoner';
import { AgentCheckpointError, assertCheckpointHasNoSecrets, finalizeCheckpoint, parseCheckpoint } from './checkpoint';
import { AgentRuntime } from './runtime';
import {
  absorbInvestigationIntoStrategy,
  emptyCampaignStrategyState,
  parseCampaignStrategyState,
} from '../investigationMemory/derive';
import type { CampaignStrategyState } from '../investigationMemory/types';
import type { AgentRunResult, AgentToolExecutor } from './types';

export const LOCAL_CAMPAIGN_VERSION = 'nightwatch.local-cli-campaign.v1' as const;
export const AGENT_BUDGET_CEILING_NAMES = ['HOUR_1', 'HOUR_4', 'HOUR_8', 'OVERNIGHT'] as const;
export const LOCAL_CAMPAIGN_DOSSIER_STATUSES = [
  'NONE',
  'REFUSED_NO_REPRODUCTION',
  'VERIFIED_REPRODUCTION',
] as const;
export type LocalCampaignDossierStatus = (typeof LOCAL_CAMPAIGN_DOSSIER_STATUSES)[number];

/**
 * Consecutive investigations with zero new evidence AND zero new candidates
 * before the campaign admits global stagnation (NO_PROGRESS).
 *
 * Justification: N=1 would end an hour campaign on a single unlucky empty
 * investigation (defeating the mission); N=2 risks two correlated duds when a
 * deterministic reasoner walks into the same trap twice; N=3 grants two
 * retries after the first empty investigation while staying bounded (every
 * investigation is itself turn-capped), and mirrors the frozen
 * NO_PROGRESS_REPEAT_LIMIT=3 — the protocol tolerates 3 repeats inside one
 * run, the campaign tolerates 3 empty investigations.
 */
export const CAMPAIGN_STAGNATION_LIMIT = 3 as const;

/** Version of the `campaignProgress` resume envelope stored beside checkpoints. */
export const CAMPAIGN_PROGRESS_VERSION = 'nightwatch.local-cli-campaign-progress.v1' as const;

const CAMPAIGN_ID_RE = /^[A-Za-z0-9._-]{1,80}$/;

export class LocalCampaignError extends Error {
  readonly code: string;
  constructor(code: string, detail: string) {
    super(`${code}: ${detail}`);
    this.name = 'LocalCampaignError';
    this.code = code;
  }
}

export interface LocalCampaignInput {
  readonly campaignId: string;
  readonly ceilingName: AgentBudgetCeilingName;
  readonly executable: string;
  readonly args?: readonly string[];
  readonly provider?: string;
  readonly model?: string;
  readonly maxTurns?: number;
  readonly stateDirectory?: string;
  /**
   * Explicit sensing/reproduction substrate. Product CLI injects the real
   * owner-local context; direct callers without one fail provider tools closed.
   */
  readonly investigationContext?: LocalInvestigationContext;
  /** Clock seam for deterministic tests. Defaults to Date.now. */
  readonly now?: () => number;
}

/** Per-termination-reason counts across every investigation in the campaign. */
export type CampaignTerminationCounts = Record<AgentTerminationReason, number>;

export interface LocalCampaignResult {
  readonly schemaVersion: typeof LOCAL_CAMPAIGN_VERSION;
  readonly campaignId: string;
  readonly terminationReason: AgentTerminationReason;
  readonly candidateIds: readonly string[];
  readonly actionCount: number;
  readonly checkpointFile: string | null;
  readonly environment: 'LOCAL';
  /** NONE when no candidate. REFUSED_NO_REPRODUCTION when proposed but not packaged. */
  readonly dossierStatus: LocalCampaignDossierStatus;
  /** Mechanical candidate admission outcomes; never model-self-certified. */
  readonly findingAdmissions: readonly AdmitLocalFindingResult[];
  /** Sum of qualifying pre-fix FAIL/post-fix PASS receipts across admitted findings. */
  readonly reproductionCount: number;
  /** Campaign-measured metrics (cumulative across investigations). */
  readonly investigationsStarted: number;
  readonly investigationsCompleted: number;
  readonly terminationCounts: CampaignTerminationCounts;
  readonly reasonerCalls: number;
  readonly providerFailures: number;
  readonly wallTimeMs: number;
  /**
   * W9 component byte accounting folded across every investigation in the
   * campaign (component-wise sum via addAgentByteLedgers). Remaining-policy
   * arithmetic continues to use the frozen budget totals, never this ledger.
   */
  readonly byteLedger: AgentByteLedger;
  /**
   * Bounded cross-investigation strategy accumulated so far. Observable
   * without reading the checkpoint file. Bounded by MEMORY_CAPS and
   * secret-free by construction (secret-shaped entries are dropped, not
   * truncated).
   */
  readonly campaignStrategy: CampaignStrategyState;
}

export interface LocalCampaignListing {
  readonly campaignId: string;
  readonly status: string;
  readonly terminationReason: string | null;
  readonly candidateIds: readonly string[];
  readonly resumeCursor: string;
  readonly checkpointFile: string;
  readonly investigationsStarted: number;
  readonly investigationsCompleted: number;
  readonly actionCount: number;
}

/** Resume envelope: campaign-level progress the merged checkpoint cannot carry. */
interface CampaignProgress {
  readonly version: typeof CAMPAIGN_PROGRESS_VERSION;
  readonly nextInvestigationIndex: number;
  readonly completedInvestigations: number;
  readonly stagnantInvestigations: number;
  readonly terminationCounts: CampaignTerminationCounts;
  /**
   * W8 bounded cross-investigation strategy. Absent on pre-W8 envelopes; a
   * malformed value degrades to a fresh strategy rather than injecting
   * unvalidated state into a reasoner request.
   */
  readonly strategy: CampaignStrategyState | null;
  /** Present only when the campaign paused mid-investigation. */
  readonly pausedInvestigation: AgentCheckpoint | null;
}

function zeroTerminationCounts(): CampaignTerminationCounts {
  const counts = {} as Record<AgentTerminationReason, number>;
  for (const reason of AGENT_TERMINATION_REASONS) counts[reason] = 0;
  return counts;
}


export function defaultCampaignStateDirectory(override?: string): string {
  if (typeof override === 'string' && override.trim().length > 0) {
    return path.resolve(override.trim());
  }
  return path.join(os.homedir(), '.nightwatch', 'campaigns');
}

function ensurePrivateDirectory(directory: string): void {
  try {
    if (fs.lstatSync(directory).isSymbolicLink()) {
      throw new LocalCampaignError('STATE_SYMLINK_REFUSED', 'campaign state directory must not be a symlink');
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}

function checkpointPath(directory: string, campaignId: string): string {
  return path.join(directory, `${campaignId}.checkpoint.json`);
}

function persistCampaignFile(directory: string, campaignId: string, document: unknown): string {
  ensurePrivateDirectory(directory);
  const file = checkpointPath(directory, campaignId);
  if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) {
    throw new LocalCampaignError('STATE_SYMLINK_REFUSED', 'checkpoint path must not be a symlink');
  }
  fs.writeFileSync(file, `${JSON.stringify(document)}\n`, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  return file;
}

function deleteStoredCheckpoint(directory: string, campaignId: string): void {
  try {
    fs.rmSync(checkpointPath(directory, campaignId), { force: true });
  } catch {
    // Best-effort hygiene; a stale file is re-listed, never executed.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** Strict, fail-closed parse of the resume envelope. Null = legacy checkpoint. */
function parseCampaignProgress(value: unknown, campaignId: string): CampaignProgress | null {
  if (value === undefined) return null;
  if (!isRecord(value)) throw new AgentCheckpointError('CORRUPT', 'campaignProgress is not an object');
  if (value.version !== CAMPAIGN_PROGRESS_VERSION) {
    throw new AgentCheckpointError('CORRUPT', 'campaignProgress has an unknown version');
  }
  if (!isNonNegativeInteger(value.nextInvestigationIndex) || !isNonNegativeInteger(value.completedInvestigations)) {
    throw new AgentCheckpointError('CORRUPT', 'campaignProgress investigation counters are invalid');
  }
  if (!isNonNegativeInteger(value.stagnantInvestigations)) {
    throw new AgentCheckpointError('CORRUPT', 'campaignProgress stagnation counter is invalid');
  }
  if (value.completedInvestigations > value.nextInvestigationIndex) {
    throw new AgentCheckpointError('CORRUPT', 'campaignProgress completed count exceeds started count');
  }
  const counts = zeroTerminationCounts();
  if (value.terminationCounts !== undefined) {
    if (!isRecord(value.terminationCounts)) {
      throw new AgentCheckpointError('CORRUPT', 'campaignProgress.terminationCounts is invalid');
    }
    for (const [key, entry] of Object.entries(value.terminationCounts)) {
      if (!(AGENT_TERMINATION_REASONS as readonly string[]).includes(key) || !isNonNegativeInteger(entry)) {
        throw new AgentCheckpointError('CORRUPT', `campaignProgress.terminationCounts entry ${key} is invalid`);
      }
      counts[key as AgentTerminationReason] = entry;
    }
  }
  let pausedInvestigation: AgentCheckpoint | null = null;
  if (value.pausedInvestigation !== undefined && value.pausedInvestigation !== null) {
    pausedInvestigation = parseCheckpoint(value.pausedInvestigation);
  }
  const strategy =
    value.strategy === undefined || value.strategy === null
      ? null
      : parseCampaignStrategyState(value.strategy, campaignId);
  return {
    version: CAMPAIGN_PROGRESS_VERSION,
    nextInvestigationIndex: value.nextInvestigationIndex,
    completedInvestigations: value.completedInvestigations,
    stagnantInvestigations: value.stagnantInvestigations,
    terminationCounts: counts,
    strategy,
    pausedInvestigation,
  };
}

function readRawCheckpointFile(directory: string, campaignId: string): unknown {
  const file = checkpointPath(directory, campaignId);
  try {
    if (fs.lstatSync(file).isSymbolicLink() || !fs.lstatSync(file).isFile()) {
      throw new LocalCampaignError('CHECKPOINT_UNSAFE', 'checkpoint is not a regular file');
    }
  } catch (error) {
    if (error instanceof LocalCampaignError) throw error;
    throw new LocalCampaignError('CHECKPOINT_MISSING', `no checkpoint for ${campaignId}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function loadLocalCampaignCheckpoint(campaignId: string, stateDirectory?: string): AgentCheckpoint {
  if (!CAMPAIGN_ID_RE.test(campaignId)) {
    throw new LocalCampaignError('MALFORMED_CAMPAIGN_ID', 'campaignId must match [A-Za-z0-9._-]{1,80}');
  }
  const raw = readRawCheckpointFile(defaultCampaignStateDirectory(stateDirectory), campaignId);
  return parseCheckpoint(raw);
}

export function listLocalCampaigns(stateDirectory?: string): readonly LocalCampaignListing[] {
  const directory = defaultCampaignStateDirectory(stateDirectory);
  let names: string[] = [];
  try {
    if (fs.lstatSync(directory).isSymbolicLink()) return [];
    names = fs.readdirSync(directory);
  } catch {
    return [];
  }
  const listings: LocalCampaignListing[] = [];
  for (const name of names.sort()) {
    if (!name.endsWith('.checkpoint.json')) continue;
    const campaignId = name.slice(0, -'.checkpoint.json'.length);
    if (!CAMPAIGN_ID_RE.test(campaignId)) continue;
    try {
      const raw = readRawCheckpointFile(directory, campaignId);
      const checkpoint = parseCheckpoint(raw);
      // Legacy checkpoints (no envelope) hold a single investigation.
      let started = 1;
      let completed = checkpoint.state.status === 'TERMINATED' ? 1 : 0;
      try {
        const progress = parseCampaignProgress((raw as Record<string, unknown>).campaignProgress, checkpoint.campaignId);
        if (progress !== null) {
          // PAUSED campaigns carry one in-flight investigation: started but
          // not completed.
          started = checkpoint.state.status === 'PAUSED'
            ? progress.nextInvestigationIndex + 1
            : progress.nextInvestigationIndex;
          completed = progress.completedInvestigations;
        }
      } catch {
        // Corrupt envelope: still list the campaign from its valid core; a
        // resume attempt fails closed with the corruption error.
      }
      listings.push({
        campaignId,
        status: checkpoint.state.status,
        terminationReason: checkpoint.state.terminationReason,
        candidateIds: [...checkpoint.state.candidateIds],
        resumeCursor: checkpoint.resumeCursor,
        checkpointFile: checkpointPath(directory, campaignId),
        investigationsStarted: started,
        investigationsCompleted: completed,
        actionCount: checkpoint.state.actionLog.length,
      });
    } catch {
      continue;
    }
  }
  return listings;
}

function driverAndPolicy(input: LocalCampaignInput) {
  if (!CAMPAIGN_ID_RE.test(input.campaignId)) {
    throw new LocalCampaignError('MALFORMED_CAMPAIGN_ID', 'campaignId must match [A-Za-z0-9._-]{1,80}');
  }
  if (!(AGENT_BUDGET_CEILING_NAMES as readonly string[]).includes(input.ceilingName)) {
    throw new LocalCampaignError('UNKNOWN_BUDGET_CEILING', `unsupported ceiling ${input.ceilingName}`);
  }
  if (typeof input.executable !== 'string' || input.executable.length === 0) {
    throw new LocalCampaignError('REASONER_CLI_NOT_CONFIGURED', 'executable is required');
  }
  if (input.maxTurns !== undefined && (!Number.isInteger(input.maxTurns) || input.maxTurns < 1 || input.maxTurns > 50)) {
    throw new LocalCampaignError('MALFORMED_MAX_TURNS', 'maxTurns must be an integer 1..50');
  }
  const extraEnv: Record<string, string> = {};
  const allowedEnvKeys: string[] = [];
  for (const key of ['NIGHTWATCH_PRINT_CLI', 'NIGHTWATCH_PRINT_ARGS']) {
    const value = process.env[key];
    if (typeof value === 'string' && value.length > 0) {
      extraEnv[key] = value;
      allowedEnvKeys.push(key);
    }
  }
  return {
    reasoner: createCliReasonerDriver({
      executable: input.executable,
      args: input.args ?? [],
      provider: input.provider ?? 'configured',
      model: input.model ?? 'configured',
      extraEnv,
      allowedEnvKeys,
      validationContext: { authorizedEnvironments: ['LOCAL'] as const },
    }),
    budgetPolicy: defaultAgentBudgetPolicy(input.ceilingName),
  };
}

function investigationIdFor(campaignId: string, index: number): string {
  return `${campaignId}:inv:${index}`;
}

function campaignResumeCursor(campaignId: string, nextIndex: number, actionLog: readonly AgentActionRecord[]): string {
  const turns = new Set(actionLog.map((record) => record.turnId)).size;
  return `${campaignId}:inv:${nextIndex}:turn:${turns}`;
}

/**
 * Remaining-budget policy for one investigation. A fresh AgentRuntime starts
 * every counter at zero, so handing it the full campaign policy would reset
 * the shared budget each investigation; deriving the remainder keeps the
 * campaign ceiling exact and prevents a late investigation from overshooting
 * it (e.g. a fresh 60-minute wall allowance after 59 minutes already spent).
 */
function remainingPolicyFor(policy: AgentBudgetPolicy, usage: AgentBudgetUsage): AgentBudgetPolicy {
  return {
    ...policy,
    wallTimeMs: Math.max(0, policy.wallTimeMs - usage.wallTimeMs),
    reasonerCalls: Math.max(0, policy.reasonerCalls - usage.reasonerCalls),
    inputBytes: Math.max(0, policy.inputBytes - usage.inputBytes),
    outputBytes: Math.max(0, policy.outputBytes - usage.outputBytes),
    toolActions: Math.max(0, policy.toolActions - usage.toolActions),
    candidateCap: Math.max(0, policy.candidateCap - usage.candidateCount),
    retries: Math.max(0, policy.retries - usage.retries),
    consecutiveFailures: Math.max(0, policy.consecutiveFailures - usage.consecutiveFailures),
    providerFailures: Math.max(0, policy.providerFailures - usage.providerFailures),
  };
}

function addUsage(base: AgentBudgetUsage, extra: AgentBudgetUsage): AgentBudgetUsage {
  return {
    wallTimeMs: base.wallTimeMs,
    reasonerCalls: base.reasonerCalls + extra.reasonerCalls,
    inputBytes: base.inputBytes + extra.inputBytes,
    outputBytes: base.outputBytes + extra.outputBytes,
    toolActions: base.toolActions + extra.toolActions,
    candidateCount: base.candidateCount + extra.candidateCount,
    retries: base.retries + extra.retries,
    consecutiveFailures: base.consecutiveFailures + extra.consecutiveFailures,
    providerFailures: base.providerFailures + extra.providerFailures,
  };
}

interface CampaignAccumulators {
  actionLog: AgentActionRecord[];
  evidenceRefs: string[];
  candidateIds: string[];
  hypotheses: AgentHypothesis[];
  histories: LocalInvestigationHistory[];
  reasonerCalls: number;
  inputBytes: number;
  outputBytes: number;
  toolActions: number;
  retries: number;
  providerFailures: number;
  consecutiveFailures: number;
  byteLedger: AgentByteLedger;
  lastPhase: AgentPhase;
  nextIndex: number;
  stagnant: number;
  terminationCounts: CampaignTerminationCounts;
  investigationsStarted: number;
  investigationsCompleted: number;
  pendingResume: AgentCheckpoint | null;
  knownTargets: string[];
  strategy: CampaignStrategyState;
}

function freshAccumulators(campaignId: string): CampaignAccumulators {
  return {
    actionLog: [],
    evidenceRefs: [],
    candidateIds: [],
    hypotheses: [],
    histories: [],
    reasonerCalls: 0,
    inputBytes: 0,
    outputBytes: 0,
    toolActions: 0,
    retries: 0,
    providerFailures: 0,
    consecutiveFailures: 0,
    byteLedger: { ...ZERO_AGENT_BYTE_LEDGER },
    lastPhase: 'PLAN',
    nextIndex: 0,
    stagnant: 0,
    terminationCounts: zeroTerminationCounts(),
    investigationsStarted: 0,
    investigationsCompleted: 0,
    pendingResume: null,
    knownTargets: [],
    strategy: emptyCampaignStrategyState(campaignId),
  };
}

interface CampaignEngine {
  readonly input: LocalCampaignInput;
  readonly policy: AgentBudgetPolicy;
  readonly reasoner: ReturnType<typeof createCliReasonerDriver>;
  readonly directory: string;
  readonly now: () => number;
  readonly campaignStartMs: number;
  readonly acc: CampaignAccumulators;
}

function campaignUsageOf(engine: CampaignEngine): AgentBudgetUsage {
  return {
    wallTimeMs: Math.max(0, engine.now() - engine.campaignStartMs),
    reasonerCalls: engine.acc.reasonerCalls,
    inputBytes: engine.acc.inputBytes,
    outputBytes: engine.acc.outputBytes,
    toolActions: engine.acc.toolActions,
    candidateCount: engine.acc.candidateIds.length,
    retries: engine.acc.retries,
    consecutiveFailures: engine.acc.consecutiveFailures,
    providerFailures: engine.acc.providerFailures,
  };
}

/** Fold one finished investigation into the campaign totals. Never resets. `countStart` is false when the run resumed a paused investigation whose slot was already counted at pause time. */
function absorbInvestigation(engine: CampaignEngine, ran: AgentRunResult, countStart: boolean): { newEvidence: number; newCandidates: number } {
  const acc = engine.acc;
  acc.terminationCounts[ran.terminationReason] += 1;
  const usage = ran.state.budget.usage;
  acc.reasonerCalls += usage.reasonerCalls;
  acc.inputBytes += usage.inputBytes;
  acc.outputBytes += usage.outputBytes;
  acc.toolActions += usage.toolActions;
  acc.retries += usage.retries;
  acc.providerFailures += usage.providerFailures;
  // W9: fold the investigation component ledger. A pre-W9 investigation state
  // carries cumulative usage without attribution and folds as explicit legacy
  // carry, so the campaign ledger still reconciles exactly with the frozen
  // usage totals above.
  acc.byteLedger = addAgentByteLedgers(
    acc.byteLedger,
    isAgentByteLedger(ran.state.byteLedger) ? ran.state.byteLedger : legacyAgentByteLedger(usage.inputBytes, usage.outputBytes),
  );
  if (ran.terminationReason === 'REASONER_FAILURE') {
    // A validated self-reported failure resets the runtime streak to zero, so
    // count the event itself to keep the campaign streak honest.
    acc.consecutiveFailures += Math.max(1, usage.consecutiveFailures);
  } else if (usage.consecutiveFailures > 0) {
    acc.consecutiveFailures += usage.consecutiveFailures;
  } else {
    acc.consecutiveFailures = 0;
  }
  let newCandidates = 0;
  for (const id of ran.state.candidateIds) {
    if (!acc.candidateIds.includes(id)) {
      acc.candidateIds.push(id);
      newCandidates += 1;
    }
  }
  let newEvidence = 0;
  for (const ref of ran.state.evidenceRefs) {
    if (!acc.evidenceRefs.includes(ref)) {
      acc.evidenceRefs.push(ref);
      newEvidence += 1;
    }
  }
  for (const hypothesis of ran.state.hypotheses) {
    if (!acc.hypotheses.some((item) => item.hypothesisId === hypothesis.hypothesisId)) {
      acc.hypotheses.push({ ...hypothesis, evidenceRefs: [...hypothesis.evidenceRefs] });
    }
  }
  acc.actionLog.push(...ran.state.actionLog.map((record) => ({ ...record, evidenceRefs: [...record.evidenceRefs] })));
  for (const target of ran.state.knownTargets ?? []) {
    if (!acc.knownTargets.includes(target)) acc.knownTargets.push(target);
  }
  acc.lastPhase = ran.state.phase;
  // Fold the finished investigation into the bounded cross-investigation
  // strategy so the NEXT fresh AgentRuntime does not start from zero.
  acc.strategy = absorbInvestigationIntoStrategy(acc.strategy, {
    state: ran.state,
    terminationReason: ran.terminationReason,
    newEvidence,
    newCandidates,
  });
  if (countStart) acc.investigationsStarted += 1;
  acc.investigationsCompleted += 1;
  // The slot always advances past the finished investigation, even when its
  // start was already counted at pause time.
  acc.nextIndex += 1;
  return { newEvidence, newCandidates };
}

/**
 * A paused investigation is suspended, not finished: its partial turns stay in
 * its own checkpoint (resumed verbatim later) and out of the merged campaign
 * log, so resume can never re-execute them. The slot counts as started now
 * (the next index still points at it, so resume addresses the same slot and
 * the finishing merge passes countStart=false). Usage/evidence/candidates
 * merge when the investigation finishes. The pre-pause consumption is
 * intentionally left out of the persisted usage and re-applied to the resumed
 * investigation's remaining-budget basis instead.
 */
function absorbPausedInvestigationPrefix(engine: CampaignEngine, ran: AgentRunResult): void {
  engine.acc.terminationCounts[ran.terminationReason] += 1;
  engine.acc.investigationsStarted += 1;
  engine.acc.lastPhase = ran.state.phase;
}

function campaignStateOf(
  engine: CampaignEngine,
  status: 'PAUSED' | 'TERMINATED',
  terminationReason: AgentTerminationReason,
): AgentRuntimeState {
  const acc = engine.acc;
  return {
    schemaVersion: AGENT_RUNTIME_STATE_VERSION,
    campaignId: engine.input.campaignId,
    status,
    phase: acc.lastPhase,
    hypotheses: acc.hypotheses.map((item) => ({ ...item, evidenceRefs: [...item.evidenceRefs] })),
    actionLog: acc.actionLog.map((record) => ({ ...record, evidenceRefs: [...record.evidenceRefs] })),
    evidenceRefs: [...acc.evidenceRefs],
    candidateIds: [...acc.candidateIds],
    knownTargets: [...acc.knownTargets],
    byteLedger: { ...acc.byteLedger },
    budget: { policy: engine.policy, usage: campaignUsageOf(engine) },
    terminationReason,
  };
}

function buildCampaignCheckpoint(
  engine: CampaignEngine,
  status: 'PAUSED' | 'TERMINATED',
  terminationReason: AgentTerminationReason,
  pausedInvestigation: AgentCheckpoint | null,
): Record<string, unknown> {
  const acc = engine.acc;
  // The embedded campaign checkpoint is measured by the checkpoint codec's
  // fixed point; adopt the measured ledger so the persisted document and the
  // returned campaign result report identical accounting.
  const checkpoint = finalizeCheckpoint(
    campaignStateOf(engine, status, terminationReason),
    campaignResumeCursor(engine.input.campaignId, acc.nextIndex, acc.actionLog),
  );
  acc.byteLedger = { ...checkpoint.state.byteLedger! };
  const progress: CampaignProgress = {
    version: CAMPAIGN_PROGRESS_VERSION,
    nextInvestigationIndex: acc.nextIndex,
    completedInvestigations: acc.investigationsCompleted,
    stagnantInvestigations: acc.stagnant,
    terminationCounts: { ...acc.terminationCounts },
    strategy: acc.strategy,
    pausedInvestigation,
  };
  const document: Record<string, unknown> = { ...checkpoint, campaignProgress: { ...progress } };
  assertCheckpointHasNoSecrets(document as unknown as AgentCheckpoint);
  return document;
}

function mergedInvestigationHistory(engine: CampaignEngine): LocalInvestigationHistory {
  return {
    schemaVersion: LOCAL_INVESTIGATION_HISTORY_VERSION,
    observedEvidence: engine.acc.histories.flatMap((history) => history.observedEvidence),
    inspectedSources: engine.acc.histories.flatMap((history) => history.inspectedSources),
    reproductions: engine.acc.histories.flatMap((history) => history.reproductions),
    findingProposals: engine.acc.histories.flatMap((history) => history.findingProposals),
  };
}

function resultOf(
  engine: CampaignEngine,
  terminationReason: AgentTerminationReason,
  checkpointFile: string | null,
  wallTimeMs?: number,
): LocalCampaignResult {
  const candidateIds = [...engine.acc.candidateIds];
  const history = mergedInvestigationHistory(engine);
  const status = terminationReason === 'PAUSED' ? 'PAUSED' : 'TERMINATED';
  const state = campaignStateOf(engine, status, terminationReason);
  const findingAdmissions = candidateIds.map((candidateId) => {
    const proposals = history.findingProposals.filter((proposal) => proposal.candidateId === candidateId);
    const proposal = proposals[proposals.length - 1] ?? null;
    return admitLocalFinding({
      state,
      history,
      candidateId,
      draft: proposal?.draft ?? null,
    });
  });
  const reproductionCount = findingAdmissions.reduce(
    (total, admission) => total + (admission.admitted ? admission.reproductionCount : 0),
    0,
  );
  return {
    schemaVersion: LOCAL_CAMPAIGN_VERSION,
    campaignId: engine.input.campaignId,
    terminationReason,
    candidateIds,
    actionCount: engine.acc.actionLog.length,
    checkpointFile,
    environment: 'LOCAL',
    dossierStatus:
      findingAdmissions.some((admission) => admission.admitted)
        ? 'VERIFIED_REPRODUCTION'
        : candidateIds.length > 0
          ? 'REFUSED_NO_REPRODUCTION'
          : 'NONE',
    findingAdmissions,
    reproductionCount,
    investigationsStarted: engine.acc.investigationsStarted,
    investigationsCompleted: engine.acc.investigationsCompleted,
    terminationCounts: { ...engine.acc.terminationCounts },
    reasonerCalls: engine.acc.reasonerCalls,
    providerFailures: engine.acc.providerFailures,
    wallTimeMs: wallTimeMs ?? campaignUsageOf(engine).wallTimeMs,
    byteLedger: { ...engine.acc.byteLedger },
    campaignStrategy: engine.acc.strategy,
  };
}

async function runOneInvestigation(engine: CampaignEngine, investigationId: string): Promise<AgentRunResult> {
  const pending = engine.acc.pendingResume;
  let basis = campaignUsageOf(engine);
  const context =
    engine.input.investigationContext ?? createUnavailableLocalInvestigationContext();
  const session = createLocalInvestigationToolSession(context);
  let ran: AgentRunResult;
  if (pending !== null) {
    if (pending.campaignId !== investigationId) {
      throw new LocalCampaignError('CHECKPOINT_MISMATCH', 'paused investigation does not belong to the next investigation slot');
    }
    // The persisted campaign usage excludes the paused run's in-flight
    // consumption (it merges only at completion), so re-apply it to the
    // remaining-budget basis: the resumed investigation must not get the
    // pre-pause allowance twice.
    basis = addUsage(basis, pending.state.budget.usage);
    basis = { ...basis, wallTimeMs: campaignUsageOf(engine).wallTimeMs };
    engine.acc.pendingResume = null;
    ran = await AgentRuntime.resumeFromCheckpoint(pending, {
      campaignId: investigationId,
      budgetPolicy: remainingPolicyFor(engine.policy, basis),
      reasoner: engine.reasoner,
      tools: session.executor,
      authorizedEnvironments: ['LOCAL'] as const,
      maxTurns: engine.input.maxTurns,
      now: engine.now,
      priorStrategy: engine.acc.strategy,
    }).run({ maxTurns: engine.input.maxTurns });
  } else {
    ran = await new AgentRuntime({
      campaignId: investigationId,
      budgetPolicy: remainingPolicyFor(engine.policy, basis),
      reasoner: engine.reasoner,
      tools: session.executor,
      authorizedEnvironments: ['LOCAL'] as const,
      maxTurns: engine.input.maxTurns,
      now: engine.now,
      priorStrategy: engine.acc.strategy,
    }).run({ maxTurns: engine.input.maxTurns });
  }
  engine.acc.histories.push(session.snapshot());
  return ran;
}

/**
 * Shared campaign loop. `firstInvestigationId` overrides the derived
 * `<campaignId>:inv:<n>` id for the first iteration only — used by legacy
 * resume, where the in-progress investigation kept the campaign id itself.
 */
async function runCampaignLoop(engine: CampaignEngine, firstInvestigationId?: string): Promise<LocalCampaignResult> {
  let firstId: string | null = firstInvestigationId ?? null;
  for (;;) {
    const usageBefore = campaignUsageOf(engine);
    if (classifyBudgetExhaustion(engine.policy, usageBefore) === 'SAFE_TERMINATION_CHECKPOINT') {
      const document = buildCampaignCheckpoint(engine, 'TERMINATED', 'BUDGET_EXHAUSTED', null);
      const file = persistCampaignFile(engine.directory, engine.input.campaignId, document);
      return resultOf(engine, 'BUDGET_EXHAUSTED', file);
    }
    const investigationId = firstId ?? investigationIdFor(engine.input.campaignId, engine.acc.nextIndex);
    firstId = null;
    const resumedPending = engine.acc.pendingResume !== null;
    const ran = await runOneInvestigation(engine, investigationId);
    const reason = ran.terminationReason;
    // A resumed investigation already counted its slot at pause time.
    const countStart = !resumedPending;

    if (reason === 'CANCELLED') {
      absorbInvestigation(engine, ran, countStart);
      deleteStoredCheckpoint(engine.directory, engine.input.campaignId);
      return resultOf(engine, 'CANCELLED', null);
    }
    if (reason === 'PAUSED') {
      if (ran.checkpoint === null) {
        throw new LocalCampaignError('CHECKPOINT_MISSING', 'paused investigation produced no checkpoint');
      }
      const pausedInvestigation = parseCheckpoint(JSON.parse(JSON.stringify(ran.checkpoint)));
      absorbPausedInvestigationPrefix(engine, ran);
      const document = buildCampaignCheckpoint(engine, 'PAUSED', 'PAUSED', pausedInvestigation);
      const file = persistCampaignFile(engine.directory, engine.input.campaignId, document);
      return resultOf(engine, 'PAUSED', file);
    }

    const { newEvidence, newCandidates } = absorbInvestigation(engine, ran, countStart);
    if (reason === 'SAFETY_BLOCKED') {
      deleteStoredCheckpoint(engine.directory, engine.input.campaignId);
      return resultOf(engine, 'SAFETY_BLOCKED', null);
    }
    if (classifyBudgetExhaustion(engine.policy, campaignUsageOf(engine)) === 'SAFE_TERMINATION_CHECKPOINT') {
      const document = buildCampaignCheckpoint(engine, 'TERMINATED', 'BUDGET_EXHAUSTED', null);
      const file = persistCampaignFile(engine.directory, engine.input.campaignId, document);
      return resultOf(engine, 'BUDGET_EXHAUSTED', file);
    }
    if (newEvidence === 0 && newCandidates === 0) {
      engine.acc.stagnant += 1;
    } else {
      engine.acc.stagnant = 0;
    }
    if (engine.acc.stagnant >= CAMPAIGN_STAGNATION_LIMIT) {
      deleteStoredCheckpoint(engine.directory, engine.input.campaignId);
      return resultOf(engine, 'NO_PROGRESS', null);
    }
  }
}

function seedFromCheckpointState(engine: CampaignEngine, state: AgentRuntimeState, progress: CampaignProgress | null): void {
  const acc = engine.acc;
  if (progress !== null) {
    acc.nextIndex = progress.nextInvestigationIndex;
    // A PAUSED campaign has one in-flight investigation: it started (its slot
    // is counted) but has not completed. TERMINATED campaigns counted every
    // started investigation at completion time.
    acc.investigationsStarted = state.status === 'PAUSED'
      ? progress.nextInvestigationIndex + 1
      : progress.nextInvestigationIndex;
    acc.investigationsCompleted = progress.completedInvestigations;
    acc.stagnant = progress.stagnantInvestigations;
    acc.terminationCounts = { ...progress.terminationCounts };
    acc.strategy = progress.strategy ?? emptyCampaignStrategyState(engine.input.campaignId);
    acc.pendingResume = progress.pausedInvestigation;
  } else if (state.status === 'TERMINATED') {
    // Legacy single-investigation checkpoint: the stored run finished.
    acc.investigationsStarted = 1;
    acc.investigationsCompleted = 1;
    acc.nextIndex = 1;
    acc.terminationCounts[state.terminationReason as AgentTerminationReason] =
      (acc.terminationCounts[state.terminationReason as AgentTerminationReason] ?? 0) + 1;
  }
  // The merged prefix holds only FINISHED investigations (a paused
  // investigation's partial log lives in pendingResume), so seeding it here
  // and merging full investigation states later never double-counts.
  acc.actionLog = state.actionLog.map((record) => ({ ...record, evidenceRefs: [...record.evidenceRefs] }));
  acc.evidenceRefs = [...state.evidenceRefs];
  acc.candidateIds = [...state.candidateIds];
  acc.hypotheses = state.hypotheses.map((item) => ({ ...item, evidenceRefs: [...item.evidenceRefs] }));
  acc.reasonerCalls = state.budget.usage.reasonerCalls;
  acc.inputBytes = state.budget.usage.inputBytes;
  acc.outputBytes = state.budget.usage.outputBytes;
  acc.toolActions = state.budget.usage.toolActions;
  acc.retries = state.budget.usage.retries;
  acc.providerFailures = state.budget.usage.providerFailures;
  acc.consecutiveFailures = state.budget.usage.consecutiveFailures;
  // W9: restore the folded component ledger. A pre-W9 campaign checkpoint
  // carries cumulative usage without attribution and seeds explicit legacy
  // carry, so the restored ledger still reconciles with the usage above.
  acc.byteLedger = isAgentByteLedger(state.byteLedger)
    ? { ...state.byteLedger }
    : legacyAgentByteLedger(state.budget.usage.inputBytes, state.budget.usage.outputBytes);
  acc.knownTargets = [...(state.knownTargets ?? [])];
  acc.lastPhase = state.phase;
}

export async function runLocalCliCampaign(input: LocalCampaignInput): Promise<LocalCampaignResult> {
  const { reasoner, budgetPolicy } = driverAndPolicy(input);
  const now = input.now ?? Date.now;
  const directory = defaultCampaignStateDirectory(input.stateDirectory);
  // A fresh run supersedes any stored checkpoint for this id; otherwise a
  // previous PAUSED listing would shadow the new campaign.
  deleteStoredCheckpoint(directory, input.campaignId);
  const engine: CampaignEngine = {
    input,
    policy: budgetPolicy,
    reasoner,
    directory,
    now,
    campaignStartMs: now(),
    acc: freshAccumulators(input.campaignId),
  };
  return runCampaignLoop(engine);
}

function policyFromCheckpoint(checkpoint: AgentCheckpoint, campaignId: string): AgentBudgetPolicy {
  const policy = checkpoint.state.budget.policy;
  if (!(AGENT_BUDGET_CEILING_NAMES as readonly string[]).includes(policy.ceilingName)) {
    throw new LocalCampaignError('UNKNOWN_BUDGET_CEILING', `checkpoint for ${campaignId} names an unsupported ceiling`);
  }
  return policy;
}

export async function resumeLocalCliCampaign(input: LocalCampaignInput): Promise<LocalCampaignResult> {
  const { reasoner } = driverAndPolicy(input);
  const now = input.now ?? Date.now;
  const directory = defaultCampaignStateDirectory(input.stateDirectory);
  const raw = readRawCheckpointFile(directory, input.campaignId);
  const checkpoint = parseCheckpoint(raw);
  if (checkpoint.campaignId !== input.campaignId) {
    throw new LocalCampaignError('CHECKPOINT_MISMATCH', 'checkpoint belongs to another campaign');
  }
  // The campaign resumes under its own stored policy (the ceiling it started
  // with), not the caller's ceilingName.
  const policy = policyFromCheckpoint(checkpoint, input.campaignId);
  const progress = parseCampaignProgress((raw as Record<string, unknown>).campaignProgress, input.campaignId);

  if (checkpoint.state.status === 'TERMINATED') {
    // Idempotent resume: the campaign already finished. Report the stored
    // terminal outcome without restarting any investigation.
    const engine: CampaignEngine = {
      input, policy, reasoner, directory, now,
      campaignStartMs: now(),
      acc: freshAccumulators(input.campaignId),
    };
    seedFromCheckpointState(engine, checkpoint.state, progress);
    return resultOf(
      engine,
      checkpoint.state.terminationReason as AgentTerminationReason,
      checkpointPath(directory, input.campaignId),
      checkpoint.state.budget.usage.wallTimeMs,
    );
  }

  if (progress === null) {
    // Legacy single-investigation checkpoint: the whole file is the
    // in-progress investigation 0. Resume its runtime verbatim (it keeps the
    // campaign id, so its cursor still binds), then continue with
    // `<id>:inv:1` onward. The seed prefix stays empty so the resumed run
    // merges exactly once.
    const engine: CampaignEngine = {
      input, policy, reasoner, directory, now,
      campaignStartMs: now() - checkpoint.state.budget.usage.wallTimeMs,
      acc: freshAccumulators(input.campaignId),
    };
    engine.acc.pendingResume = checkpoint;
    return runCampaignLoop(engine, input.campaignId);
  }

  if (progress.pausedInvestigation === null) {
    throw new LocalCampaignError('CHECKPOINT_MISSING', 'paused campaign has no paused-investigation checkpoint');
  }
  const engine: CampaignEngine = {
    input, policy, reasoner, directory, now,
    campaignStartMs: now() - checkpoint.state.budget.usage.wallTimeMs,
    acc: freshAccumulators(input.campaignId),
  };
  seedFromCheckpointState(engine, checkpoint.state, progress);
  return runCampaignLoop(engine);
}
