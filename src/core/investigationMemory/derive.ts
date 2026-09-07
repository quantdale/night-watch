// ---------------------------------------------------------------------------
// W8 investigation-memory derivation.
//
// `deriveInvestigationMemory` is a PURE function of the runtime state that
// Nightwatch already owns plus an optional campaign strategy summary. It adds
// no authority, reads no provider, and cannot be influenced by model prose:
// hypothesis strength, reproduction readiness and target ledgers are computed
// from observed action results only.
//
// Determinism: ledgers keep first-observation order, action history keeps
// chronological order and is truncated from the front, and every string is
// bounded. The same state always yields byte-identical memory.
//
// Pure. No fs/network/child_process/AI authority.
// ---------------------------------------------------------------------------

import type { AgentActionRecord, AgentRuntimeState } from '../agentProtocol/runtime';
import {
  CAMPAIGN_STRATEGY_STATE_VERSION,
  INVESTIGATION_MEMORY_VERSION,
  MEMORY_CAPS,
  type CampaignStrategyState,
  type HypothesisProgress,
  type InvestigationMemory,
  type MemoryAction,
  type MemoryHypothesis,
  type MemoryInspectedTarget,
  type MemoryReproduction,
  type ReproductionReadiness,
  type StagnationRisk,
} from './types';

/**
 * Mirrors the protocol/checkpoint secret shapes. Working memory is
 * reasoner-visible, so any secret-shaped string is dropped rather than
 * truncated: a partial token is still a token.
 */
const SECRET_RE =
  /(?:Bearer\s+[A-Za-z0-9._~+/=-]{8,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;

const STAGNATION_ELEVATED_TURNS = 2;
const STAGNATION_CRITICAL_TURNS = 4;

function secretSafe(value: string): boolean {
  return !SECRET_RE.test(value);
}

function boundedString(value: unknown, max: number): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const trimmed = value.length > max ? value.slice(0, max) : value;
  return secretSafe(trimmed) ? trimmed : null;
}

function boundedList(values: readonly string[], max: number, charCap: number): readonly string[] {
  const out: string[] = [];
  for (const value of values) {
    if (out.length >= max) break;
    const bounded = boundedString(value, charCap);
    if (bounded === null || out.includes(bounded)) continue;
    out.push(bounded);
  }
  return Object.freeze(out);
}

interface TargetLedgerEntry {
  target: string;
  evidenceRef: string | null;
  timesInspected: number;
  salient: string[];
  reproductionAttempts: number;
  lastResultClass: string;
  reproducedHere: boolean;
  verificationFailedHere: boolean;
  dedupedHere: boolean;
}

interface DerivedLedger {
  readonly targets: ReadonlyMap<string, TargetLedgerEntry>;
  /** Source-read evidence ref → the target it grounds. */
  readonly refToTarget: ReadonlyMap<string, string>;
  readonly proposalCandidateIds: readonly string[];
  readonly reproductions: readonly MemoryReproduction[];
  readonly turnOrdinals: ReadonlyMap<string, number>;
  readonly lastEvidenceGainOrdinal: number | null;
  readonly repeatedActionCount: number;
  readonly actions: readonly MemoryAction[];
}

function deriveLedger(state: AgentRuntimeState): DerivedLedger {
  const targets = new Map<string, TargetLedgerEntry>();
  const refToTarget = new Map<string, string>();
  const proposalCandidateIds: string[] = [];
  const reproductions: MemoryReproduction[] = [];
  const turnOrdinals = new Map<string, number>();
  const actions: MemoryAction[] = [];
  const seenRefs = new Set<string>();
  let lastEvidenceGainOrdinal: number | null = null;
  let repeatedActionCount = 0;

  for (const record of state.actionLog) {
    if (!turnOrdinals.has(record.turnId)) turnOrdinals.set(record.turnId, turnOrdinals.size + 1);
    const ordinal = turnOrdinals.get(record.turnId) as number;
    let gained = false;
    for (const ref of record.evidenceRefs) {
      if (!seenRefs.has(ref)) {
        seenRefs.add(ref);
        gained = true;
      }
    }
    if (gained) lastEvidenceGainOrdinal = ordinal;
    if (record.resultClass === 'DEDUPED_REPEAT') repeatedActionCount += 1;

    const target = boundedString(record.target ?? null, MEMORY_CAPS.targetChars);
    actions.push({
      turnOrdinal: ordinal,
      intentKind: record.intentKind,
      toolId: record.toolId,
      target,
      resultClass: record.resultClass,
      evidenceGained: gained,
    });
    if (target === null) continue;

    if (record.toolId === 'REQUEST_FINDING_PROPOSAL' && record.resultClass === 'FINDING_PROPOSAL') {
      if (!proposalCandidateIds.includes(target)) proposalCandidateIds.push(target);
      continue;
    }
    if (record.toolId !== 'INSPECT_SOURCE_SURFACE' && record.toolId !== 'RERUN_SAFE_REPRODUCTION') continue;

    let entry = targets.get(target);
    if (entry === undefined) {
      entry = {
        target,
        evidenceRef: null,
        timesInspected: 0,
        salient: [],
        reproductionAttempts: 0,
        lastResultClass: record.resultClass,
        reproducedHere: false,
        verificationFailedHere: false,
        dedupedHere: false,
      };
      targets.set(target, entry);
    }
    entry.lastResultClass = record.resultClass;
    if (record.resultClass === 'DEDUPED_REPEAT') entry.dedupedHere = true;

    if (record.toolId === 'INSPECT_SOURCE_SURFACE') {
      entry.timesInspected += 1;
      if (record.resultClass === 'SOURCE_FILE') {
        const ref = boundedString(record.evidenceRefs[0] ?? null, 512);
        if (ref !== null) {
          entry.evidenceRef = ref;
          refToTarget.set(ref, target);
        }
        for (const symbol of record.salient ?? []) {
          if (entry.salient.length >= MEMORY_CAPS.salientPerTarget) break;
          const bounded = boundedString(symbol, MEMORY_CAPS.salientChars);
          if (bounded === null || entry.salient.includes(bounded)) continue;
          entry.salient.push(bounded);
        }
      }
      continue;
    }

    // RERUN_SAFE_REPRODUCTION
    entry.reproductionAttempts += 1;
    if (record.resultClass === 'REPRODUCED') entry.reproducedHere = true;
    if (record.resultClass === 'NOT_REPRODUCED') entry.verificationFailedHere = true;
    reproductions.push({ target, resultClass: record.resultClass });
  }

  return {
    targets,
    refToTarget,
    proposalCandidateIds: Object.freeze(proposalCandidateIds),
    reproductions: Object.freeze(reproductions),
    turnOrdinals,
    lastEvidenceGainOrdinal,
    repeatedActionCount,
    actions: Object.freeze(actions),
  };
}

const PROGRESS_RANK: Readonly<Record<HypothesisProgress, number>> = Object.freeze({
  REPRODUCED: 0,
  VERIFICATION_READY: 1,
  GROUNDED: 2,
  UNGROUNDED: 3,
  DISPROVED: 4,
});

function classifyStagnation(turnsSinceNewEvidence: number, repeatedActionCount: number): StagnationRisk {
  if (turnsSinceNewEvidence >= STAGNATION_CRITICAL_TURNS || repeatedActionCount >= 2) return 'CRITICAL';
  if (turnsSinceNewEvidence >= STAGNATION_ELEVATED_TURNS || repeatedActionCount >= 1) return 'ELEVATED';
  return 'NONE';
}

export interface DeriveInvestigationMemoryOptions {
  readonly campaign?: CampaignStrategyState | null;
}

export function deriveInvestigationMemory(
  state: AgentRuntimeState,
  options: DeriveInvestigationMemoryOptions = {},
): InvestigationMemory {
  const ledger = deriveLedger(state);
  const observedRefs = new Set(state.evidenceRefs);
  const turnOrdinal = ledger.turnOrdinals.size;

  const inspected: MemoryInspectedTarget[] = [];
  for (const entry of ledger.targets.values()) {
    if (inspected.length >= MEMORY_CAPS.inspectedTargets) break;
    if (entry.timesInspected === 0 && entry.reproductionAttempts === 0) continue;
    inspected.push({
      target: entry.target,
      evidenceRef: entry.evidenceRef,
      timesInspected: entry.timesInspected,
      salient: Object.freeze([...entry.salient]),
      reproductionAttempts: entry.reproductionAttempts,
    });
  }
  const inspectedNames = new Set(inspected.map((item) => item.target));

  const uninspectedTargets = boundedList(
    state.knownTargets.filter((target) => !inspectedNames.has(target)),
    MEMORY_CAPS.uninspectedTargets,
    MEMORY_CAPS.targetChars,
  );

  const exhausted: string[] = [];
  for (const entry of ledger.targets.values()) {
    const failedInspection = entry.evidenceRef === null && entry.timesInspected >= 1;
    const failedVerification = entry.reproductionAttempts >= 1 && !entry.reproducedHere;
    if (!failedInspection && !failedVerification && !entry.dedupedHere) continue;
    if (!exhausted.includes(entry.target)) exhausted.push(entry.target);
  }
  const exhaustedTargets = boundedList(exhausted, MEMORY_CAPS.exhaustedTargets, MEMORY_CAPS.targetChars);

  const hypotheses: MemoryHypothesis[] = [];
  for (const hypothesis of state.hypotheses) {
    const statement = boundedString(hypothesis.statement, MEMORY_CAPS.statementChars) ?? '';
    const evidenceRefs = boundedList(hypothesis.evidenceRefs, MEMORY_CAPS.candidateIds, 512);
    const groundedOnTargets: string[] = [];
    for (const ref of evidenceRefs) {
      const target = ledger.refToTarget.get(ref);
      if (target !== undefined && !groundedOnTargets.includes(target)) groundedOnTargets.push(target);
    }
    const cites = evidenceRefs.some((ref) => observedRefs.has(ref));
    const reproducedTarget = groundedOnTargets.some((target) => ledger.targets.get(target)?.reproducedHere === true);
    let progress: HypothesisProgress;
    if (hypothesis.status === 'DISPROVED') progress = 'DISPROVED';
    else if (reproducedTarget) progress = 'REPRODUCED';
    else if (groundedOnTargets.length > 0) progress = 'VERIFICATION_READY';
    else if (cites) progress = 'GROUNDED';
    else progress = 'UNGROUNDED';
    hypotheses.push({
      hypothesisId: hypothesis.hypothesisId,
      statement,
      status: hypothesis.status,
      progress,
      evidenceRefs,
      groundedOnTargets: Object.freeze(groundedOnTargets),
    });
  }
  hypotheses.sort((left, right) => PROGRESS_RANK[left.progress] - PROGRESS_RANK[right.progress]);
  const boundedHypotheses = Object.freeze(hypotheses.slice(0, MEMORY_CAPS.hypotheses));

  const groundedHypothesisCount = hypotheses.filter(
    (item) => item.progress !== 'UNGROUNDED' && item.progress !== 'DISPROVED',
  ).length;
  const verificationReadyCount = hypotheses.filter(
    (item) => item.progress === 'VERIFICATION_READY' || item.progress === 'REPRODUCED',
  ).length;
  const groundableTargets = inspected.filter((item) => item.evidenceRef !== null);
  const mechanicalReproductions = ledger.reproductions.filter((item) => item.resultClass === 'REPRODUCED').length;

  let reproductionReadiness: ReproductionReadiness;
  if (inspected.length === 0) reproductionReadiness = 'NOT_READY_NO_INSPECTED_SOURCE';
  else if (groundableTargets.length === 0) reproductionReadiness = 'NOT_READY_NO_SOURCE_EVIDENCE';
  else if (verificationReadyCount === 0) reproductionReadiness = 'NOT_READY_NO_GROUNDED_HYPOTHESIS';
  else reproductionReadiness = 'READY';

  const turnsSinceNewEvidence =
    ledger.lastEvidenceGainOrdinal === null ? turnOrdinal : turnOrdinal - ledger.lastEvidenceGainOrdinal;
  const stagnationRisk = classifyStagnation(turnsSinceNewEvidence, ledger.repeatedActionCount);

  const candidateIds = boundedList(state.candidateIds, MEMORY_CAPS.candidateIds, MEMORY_CAPS.targetChars);
  const proposalCandidateIds = boundedList(
    ledger.proposalCandidateIds,
    MEMORY_CAPS.proposalCandidateIds,
    MEMORY_CAPS.targetChars,
  );

  const directives = deriveDirectives({
    inspected,
    groundableTargets,
    uninspectedTargets,
    hypotheses,
    reproductionReadiness,
    mechanicalReproductions,
    proposalCandidateIds,
    candidateIds,
    stagnationRisk,
    campaign: options.campaign ?? null,
    reproductions: ledger.reproductions,
  });

  return {
    schemaVersion: INVESTIGATION_MEMORY_VERSION,
    investigationId: state.campaignId,
    phase: state.phase,
    progress: {
      turnOrdinal,
      toolActions: state.budget.usage.toolActions,
      evidenceCount: state.evidenceRefs.length,
      hypothesisCount: state.hypotheses.length,
      groundedHypothesisCount,
      verificationReadyCount,
      candidateCount: state.candidateIds.length,
      reproductionAttempts: ledger.reproductions.length,
      mechanicalReproductions,
      turnsSinceNewEvidence,
      repeatedActionCount: ledger.repeatedActionCount,
      stagnationRisk,
      reproductionReadiness,
    },
    hypotheses: boundedHypotheses,
    inspectedTargets: Object.freeze(inspected),
    uninspectedTargets,
    exhaustedTargets,
    recentActions: Object.freeze(ledger.actions.slice(-MEMORY_CAPS.recentActions)),
    reproductions: Object.freeze(ledger.reproductions.slice(-MEMORY_CAPS.reproductions)),
    candidateIds,
    proposalCandidateIds,
    directives,
    campaign: options.campaign ?? null,
  };
}

interface DirectiveInput {
  readonly inspected: readonly MemoryInspectedTarget[];
  readonly groundableTargets: readonly MemoryInspectedTarget[];
  readonly uninspectedTargets: readonly string[];
  readonly hypotheses: readonly MemoryHypothesis[];
  readonly reproductionReadiness: ReproductionReadiness;
  readonly mechanicalReproductions: number;
  readonly proposalCandidateIds: readonly string[];
  readonly candidateIds: readonly string[];
  readonly stagnationRisk: StagnationRisk;
  readonly campaign: CampaignStrategyState | null;
  readonly reproductions: readonly MemoryReproduction[];
}

/**
 * Deterministic advisory next steps. Ordered by investigative value, capped,
 * and derived only from state the reasoner can already see. They name the
 * exact grounding the host will demand so a stateless turn does not have to
 * rediscover the calling convention, but they never assert a conclusion and
 * never rank targets using hidden truth.
 */
function deriveDirectives(input: DirectiveInput): readonly string[] {
  const directives: string[] = [];
  const push = (value: string): void => {
    if (directives.length >= MEMORY_CAPS.directives) return;
    const bounded = boundedString(value, MEMORY_CAPS.directiveChars);
    if (bounded !== null && !directives.includes(bounded)) directives.push(bounded);
  };

  if (input.inspected.length === 0 && input.uninspectedTargets.length === 0) {
    push('CALL_TOOL INSPECT_SOURCE_SURFACE with empty arguments to list the approved source paths.');
  }

  // Verification and admission first: an investigation that can already prove
  // something should not be told to keep browsing.
  const readyHypothesis = input.hypotheses.find((item) => item.progress === 'VERIFICATION_READY') ?? null;
  if (input.reproductionReadiness === 'READY' && readyHypothesis !== null) {
    const target = readyHypothesis.groundedOnTargets[0] ?? null;
    const entry = target === null ? null : input.groundableTargets.find((item) => item.target === target) ?? null;
    if (entry !== null && entry.reproductionAttempts === 0) {
      push(
        `RERUN_SAFE_REPRODUCTION is available: sourcePath=${entry.target} sourceEvidenceRef=${String(entry.evidenceRef)} for ${readyHypothesis.hypothesisId}.`,
      );
    }
  }
  const reproducedTarget = input.reproductions.find((item) => item.resultClass === 'REPRODUCED') ?? null;
  if (reproducedTarget !== null) {
    const entry = input.groundableTargets.find((item) => item.target === reproducedTarget.target) ?? null;
    if (entry !== null && input.proposalCandidateIds.length === 0) {
      push(
        `Reproduction observed for ${entry.target}: REQUEST_FINDING_PROPOSAL with evidenceRefs=[${String(entry.evidenceRef)}], then PROPOSE_CANDIDATE with the same observed refs.`,
      );
    } else if (input.proposalCandidateIds.length > 0 && input.candidateIds.length === 0) {
      push(
        `Proposal captured for ${input.proposalCandidateIds.join(',')}: PROPOSE_CANDIDATE with observed evidence refs to reach mechanical admission.`,
      );
    }
  }

  const ungroundedTarget = input.groundableTargets.find(
    (item) => !input.hypotheses.some((hypothesis) => hypothesis.groundedOnTargets.includes(item.target)),
  );
  if (ungroundedTarget !== undefined) {
    push(
      `FORM_HYPOTHESIS naming ${ungroundedTarget.target} and citing evidenceRefs=[${String(ungroundedTarget.evidenceRef)}]; an uncited statement stays UNGROUNDED.`,
    );
  }

  if (input.uninspectedTargets.length > 0) {
    push(
      `Unexplored approved targets remain: ${input.uninspectedTargets.slice(0, 3).join(', ')}. INSPECT_SOURCE_SURFACE with {"path":"<one of them>"}.`,
    );
  }

  if (input.campaign !== null && input.campaign.inspectedTargets.length > 0) {
    push(
      `This campaign already inspected ${String(input.campaign.inspectedTargets.length)} target(s) across ${String(input.campaign.investigationsCompleted)} completed investigation(s); prefer a target absent from that set.`,
    );
  }

  if (input.stagnationRisk === 'CRITICAL') {
    push(
      'No new evidence for several turns and repeated identical actions are discarded: REPLAN with a different target or TERMINATE COMPLETE_NO_FINDING.',
    );
  }

  return Object.freeze(directives);
}

// ---------------------------------------------------------------------------
// Campaign strategy state
// ---------------------------------------------------------------------------

export function emptyCampaignStrategyState(campaignId: string): CampaignStrategyState {
  return {
    schemaVersion: CAMPAIGN_STRATEGY_STATE_VERSION,
    campaignId,
    investigationsCompleted: 0,
    inspectedTargets: Object.freeze([]),
    unproductiveTargets: Object.freeze([]),
    reproducedTargets: Object.freeze([]),
    candidateIds: Object.freeze([]),
    stagnantInvestigations: 0,
    priorOutcomes: Object.freeze([]),
  };
}

export interface AbsorbInvestigationInput {
  readonly state: AgentRuntimeState;
  readonly terminationReason: string;
  readonly newEvidence: number;
  readonly newCandidates: number;
}

/**
 * Fold one COMPLETED investigation into the campaign strategy. Bounded and
 * deterministic: target order is preserved, caps truncate the oldest entries,
 * and nothing here is model-supplied.
 */
export function absorbInvestigationIntoStrategy(
  prior: CampaignStrategyState,
  input: AbsorbInvestigationInput,
): CampaignStrategyState {
  const memory = deriveInvestigationMemory(input.state);
  const inspectedTargets = [...prior.inspectedTargets];
  const reproducedTargets = [...prior.reproducedTargets];
  const unproductive = [...prior.unproductiveTargets];
  for (const target of memory.inspectedTargets) {
    if (!inspectedTargets.includes(target.target)) inspectedTargets.push(target.target);
  }
  for (const reproduction of memory.reproductions) {
    if (reproduction.resultClass === 'REPRODUCED' && !reproducedTargets.includes(reproduction.target)) {
      reproducedTargets.push(reproduction.target);
    }
  }
  for (const target of memory.exhaustedTargets) {
    if (reproducedTargets.includes(target)) continue;
    const grounded = memory.hypotheses.some((item) => item.groundedOnTargets.includes(target));
    if (grounded) continue;
    if (!unproductive.includes(target)) unproductive.push(target);
  }
  const candidateIds = [...prior.candidateIds];
  for (const id of input.state.candidateIds) if (!candidateIds.includes(id)) candidateIds.push(id);
  const priorOutcomes = [
    ...prior.priorOutcomes,
    {
      investigationId: input.state.campaignId,
      terminationReason: input.terminationReason,
      newEvidence: input.newEvidence,
      newCandidates: input.newCandidates,
    },
  ].slice(-MEMORY_CAPS.priorInvestigations);
  const stagnant =
    input.newEvidence === 0 && input.newCandidates === 0 ? prior.stagnantInvestigations + 1 : 0;
  return {
    schemaVersion: CAMPAIGN_STRATEGY_STATE_VERSION,
    campaignId: prior.campaignId,
    investigationsCompleted: prior.investigationsCompleted + 1,
    inspectedTargets: boundedList(inspectedTargets, MEMORY_CAPS.campaignTargets, MEMORY_CAPS.targetChars),
    unproductiveTargets: boundedList(unproductive, MEMORY_CAPS.campaignTargets, MEMORY_CAPS.targetChars),
    reproducedTargets: boundedList(reproducedTargets, MEMORY_CAPS.campaignTargets, MEMORY_CAPS.targetChars),
    candidateIds: boundedList(candidateIds, MEMORY_CAPS.candidateIds, MEMORY_CAPS.targetChars),
    stagnantInvestigations: stagnant,
    priorOutcomes: Object.freeze(priorOutcomes),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseStringArray(value: unknown, max: number): readonly string[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0 || item.length > MEMORY_CAPS.targetChars) return null;
    if (!secretSafe(item)) return null;
    out.push(item);
  }
  return Object.freeze(out);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Fail-closed parse of a persisted campaign strategy. A malformed or
 * over-cap record yields null, so a corrupt resume envelope degrades to "no
 * campaign memory" instead of injecting unvalidated state into a request.
 */
export function parseCampaignStrategyState(value: unknown, campaignId: string): CampaignStrategyState | null {
  if (!isRecord(value)) return null;
  if (value['schemaVersion'] !== CAMPAIGN_STRATEGY_STATE_VERSION) return null;
  if (value['campaignId'] !== campaignId) return null;
  if (!isNonNegativeInteger(value['investigationsCompleted'])) return null;
  if (!isNonNegativeInteger(value['stagnantInvestigations'])) return null;
  const inspectedTargets = parseStringArray(value['inspectedTargets'], MEMORY_CAPS.campaignTargets);
  const unproductiveTargets = parseStringArray(value['unproductiveTargets'], MEMORY_CAPS.campaignTargets);
  const reproducedTargets = parseStringArray(value['reproducedTargets'], MEMORY_CAPS.campaignTargets);
  const candidateIds = parseStringArray(value['candidateIds'], MEMORY_CAPS.candidateIds);
  if (
    inspectedTargets === null ||
    unproductiveTargets === null ||
    reproducedTargets === null ||
    candidateIds === null
  ) {
    return null;
  }
  const rawOutcomes = value['priorOutcomes'];
  if (!Array.isArray(rawOutcomes) || rawOutcomes.length > MEMORY_CAPS.priorInvestigations) return null;
  const priorOutcomes: CampaignStrategyState['priorOutcomes'][number][] = [];
  for (const item of rawOutcomes) {
    if (!isRecord(item)) return null;
    const investigationId = item['investigationId'];
    const terminationReason = item['terminationReason'];
    if (
      typeof investigationId !== 'string' ||
      investigationId.length === 0 ||
      investigationId.length > MEMORY_CAPS.targetChars ||
      typeof terminationReason !== 'string' ||
      terminationReason.length === 0 ||
      terminationReason.length > 64 ||
      !isNonNegativeInteger(item['newEvidence']) ||
      !isNonNegativeInteger(item['newCandidates'])
    ) {
      return null;
    }
    priorOutcomes.push({
      investigationId,
      terminationReason,
      newEvidence: item['newEvidence'],
      newCandidates: item['newCandidates'],
    });
  }
  return {
    schemaVersion: CAMPAIGN_STRATEGY_STATE_VERSION,
    campaignId,
    investigationsCompleted: value['investigationsCompleted'],
    inspectedTargets,
    unproductiveTargets,
    reproducedTargets,
    candidateIds,
    stagnantInvestigations: value['stagnantInvestigations'],
    priorOutcomes: Object.freeze(priorOutcomes),
  };
}
