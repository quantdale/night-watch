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

import { TRANSIENT_ACTION_RETRY_BUDGET, type AgentRuntimeState } from '../agentProtocol/runtime';
import {
  SURFACE_READINESS_CLASSES,
  SURFACE_REFUSAL_CLASSES,
  type ReproductionSurfaceEntry,
  type SurfaceReadinessClass,
  type SurfaceRefusalClass,
} from '../reproductionSurface/contracts';
import {
  CAMPAIGN_STRATEGY_STATE_VERSION,
  INVESTIGATION_MEMORY_VERSION,
  MEMORY_CAPS,
  type CampaignStrategyState,
  type HypothesisProgress,
  type InvestigationMemory,
  type MemoryAction,
  type MemoryCapabilitySummary,
  type MemoryHypothesis,
  type MemoryInspectedTarget,
  type MemoryReproduction,
  type MemoryTargetCapability,
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
  ranWithoutReproducingHere: boolean;
  dedupedHere: boolean;
  /** W9: an executed REPRODUCED_CURRENT_FAILURE verdict was observed here. */
  currentFailureHere: boolean;
  /** W9: an executed NOT_AVAILABLE verdict was observed here. */
  noExecutableTargetHere: boolean;
  /** W9: an executed ENVIRONMENT_BLOCKED verdict was observed here. */
  targetBlockedHere: boolean;
  /** W9: a failed attempt with host-owned ENVIRONMENT_BLOCKED disposition. */
  environmentRefusedHere: boolean;
  /** W9: a failed attempt with DETERMINISTIC_TERMINAL disposition (or absent on pre-W9 records). */
  deterministicRefusedHere: boolean;
  /** W9: per-action counts of failed attempts with TRANSIENT_RETRYABLE disposition, keyed by host argumentDigest. */
  transientDigests: Map<string, number>;
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
  /** W9: TRANSIENT_RETRYABLE reproduction failures per host argumentDigest (the retry budget is per exact action). */
  transientFailuresByDigest: ReadonlyMap<string, number>;
}

/**
 * W9 frozen reproduction verdicts (see LocalReproductionVerdict). Any other
 * RERUN_SAFE_REPRODUCTION result class is a FAILED attempt, never an executed
 * outcome, and carries the host-owned disposition instead.
 */
const REPRODUCTION_VERDICTS: Record<string, true> = {
  REPRODUCED: true,
  NOT_REPRODUCED: true,
  ENVIRONMENT_BLOCKED: true,
  NOT_AVAILABLE: true,
  REPRODUCED_CURRENT_FAILURE: true,
  INCONCLUSIVE: true,
};

function deriveLedger(state: AgentRuntimeState): DerivedLedger {
  const targets = new Map<string, TargetLedgerEntry>();
  const refToTarget = new Map<string, string>();
  const transientFailuresByDigest = new Map<string, number>();
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
        ranWithoutReproducingHere: false,
        dedupedHere: false,
        currentFailureHere: false,
        noExecutableTargetHere: false,
        targetBlockedHere: false,
        environmentRefusedHere: false,
        deterministicRefusedHere: false,
        transientDigests: new Map(),
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

    // RERUN_SAFE_REPRODUCTION: executed verdicts record what the host
    // observed; any other result class is a failed attempt classified by its
    // host-owned disposition.
    entry.reproductionAttempts += 1;
    if (REPRODUCTION_VERDICTS[record.resultClass] !== true) {
      // Failed attempt: host-owned disposition decides retryability. Absent
      // on pre-W9 checkpoints reads as deterministic per the frozen runtime
      // contract, preserving W8 exhaustion exactly; unknown values fail
      // closed the same way. Never derived from model text.
      if (record.disposition === 'TRANSIENT_RETRYABLE') {
        // Per-action budget: the host argumentDigest identifies the exact
        // retried action; a null digest is its own bucket.
        const digest = record.argumentDigest ?? '';
        entry.transientDigests.set(digest, (entry.transientDigests.get(digest) ?? 0) + 1);
        transientFailuresByDigest.set(digest, (transientFailuresByDigest.get(digest) ?? 0) + 1);
      } else if (record.disposition === 'ENVIRONMENT_BLOCKED') entry.environmentRefusedHere = true;
      else entry.deterministicRefusedHere = true;
    } else if (record.resultClass === 'REPRODUCED') entry.reproducedHere = true;
    else if (record.resultClass === 'REPRODUCED_CURRENT_FAILURE') entry.currentFailureHere = true;
    else if (record.resultClass === 'NOT_REPRODUCED' || record.resultClass === 'INCONCLUSIVE') {
      entry.ranWithoutReproducingHere = true;
    } else if (record.resultClass === 'NOT_AVAILABLE') entry.noExecutableTargetHere = true;
    else if (record.resultClass === 'ENVIRONMENT_BLOCKED') entry.targetBlockedHere = true;
    reproductions.push({ target, resultClass: record.resultClass });
  }

  return {
    targets,
    transientFailuresByDigest,
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

/**
 * W10 host-derived capability window. The runtime already fail-closed the
 * surface on ingest, but derivation re-validates defensively: a model can
 * never mint readiness, so an unrecognized readiness reads as `UNKNOWN` and a
 * secret-shaped or unrecognized path is dropped rather than annotated. Order
 * is the received (already deterministic) order, truncated to
 * `MEMORY_CAPS.surfaceEntries`.
 */
function surfaceWindow(state: AgentRuntimeState): readonly ReproductionSurfaceEntry[] {
  const surface = state.reproductionSurface;
  if (surface === undefined) return Object.freeze([]);
  const out: ReproductionSurfaceEntry[] = [];
  const seen = new Set<string>();
  for (const entry of surface) {
    if (out.length >= MEMORY_CAPS.surfaceEntries) break;
    if (entry === null || typeof entry !== 'object') continue;
    const sourcePath = boundedString(entry.sourcePath, MEMORY_CAPS.targetChars);
    if (sourcePath === null || seen.has(sourcePath)) continue;
    const readiness: SurfaceReadinessClass = (SURFACE_READINESS_CLASSES as readonly string[]).includes(entry.readiness)
      ? entry.readiness
      : 'UNKNOWN';
    const refusal: SurfaceRefusalClass | null =
      readiness === 'NOT_EXECUTABLE' &&
      typeof entry.refusal === 'string' &&
      (SURFACE_REFUSAL_CLASSES as readonly string[]).includes(entry.refusal)
        ? entry.refusal
        : null;
    // The window keeps the package-level identity for distinct-target counts
    // only; it is never serialized into memory.
    const targetId = boundedString(entry.targetId ?? null, MEMORY_CAPS.targetChars);
    seen.add(sourcePath);
    out.push({ sourcePath, readiness, executorClass: null, refusal, targetId });
  }
  return Object.freeze(out);
}

interface WindowCapability {
  readonly readiness: SurfaceReadinessClass;
  readonly refusal: SurfaceRefusalClass | null;
}

const UNKNOWN_CAPABILITY: WindowCapability = Object.freeze({ readiness: 'UNKNOWN', refusal: null });

function capabilityLookup(
  window: readonly ReproductionSurfaceEntry[],
): ReadonlyMap<string, WindowCapability> {
  const map = new Map<string, WindowCapability>();
  for (const entry of window) {
    if (entry.readiness === 'UNKNOWN') {
      map.set(entry.sourcePath, UNKNOWN_CAPABILITY);
    } else if (entry.readiness === 'EXECUTABLE_NOW') {
      map.set(entry.sourcePath, { readiness: 'EXECUTABLE_NOW', refusal: null });
    } else {
      map.set(entry.sourcePath, { readiness: 'NOT_EXECUTABLE', refusal: entry.refusal });
    }
  }
  return map;
}

/**
 * Repository scope of one classified source path. Host paths encode
 * `<repoId>:<relativePath>` with a colon-free repo id; anything else is an
 * unscoped test-shaped path and counts as its own single bucket.
 */
function capabilityRepositoryOf(sourcePath: string): string {
  const separator = sourcePath.indexOf(':');
  return separator > 0 ? sourcePath.slice(0, separator) : '(unscoped)';
}

/**
 * W10 bounded counts over the classified window. Counts only: no paths, no
 * target identities, no executor detail. Null when the host supplied no
 * surface at all (a pre-W10 checkpoint invents no capability).
 */
function summarizeCapability(
  window: readonly ReproductionSurfaceEntry[],
  surfacePresent: boolean,
  truncated: boolean,
): MemoryCapabilitySummary | null {
  if (!surfacePresent) return null;
  let executableTargets = 0;
  let notExecutableTargets = 0;
  const targetIds = new Set<string>();
  const repositories = new Set<string>();
  for (const entry of window) {
    if (entry.readiness === 'EXECUTABLE_NOW') {
      executableTargets += 1;
      if (entry.targetId !== null) targetIds.add(entry.targetId);
      repositories.add(capabilityRepositoryOf(entry.sourcePath));
    } else if (entry.readiness === 'NOT_EXECUTABLE') {
      notExecutableTargets += 1;
    }
  }
  return {
    executableTargets,
    distinctExecutableTargets: targetIds.size,
    executableRepositories: repositories.size,
    notExecutableTargets,
    truncated,
  };
}

/**
 * W9 owner-local execution readiness. Returns null when no owner-local
 * execution signal exists (no reproduction attempts beyond historical
 * verdicts), so the caller keeps the frozen W8 grounding ladder
 * byte-identically. Otherwise the strongest observed execution signal wins:
 * a repeatable current-source failure outranks a clean run, which outranks
 * target/environment refusals, which outrank a deterministic refusal; a
 * transient failure reads as retry-remaining only while its count is still
 * under the frozen retry budget, and as refused once the budget is consumed
 * (a flapping environment then exhausts exactly like a refusal).
 */
function deriveExecutionReadiness(
  ledger: DerivedLedger,
  preAction?: {
    readonly groundedTargets: readonly string[];
    readonly capability: ReadonlyMap<string, WindowCapability>;
  } | null,
): ReproductionReadiness | null {
  let currentFailure = false;
  let ranWithoutReproducing = false;
  let noExecutableTarget = false;
  let targetBlocked = false;
  let deterministicRefused = false;
  let transientPending = false;
  let transientConsumed = false;
  for (const entry of ledger.targets.values()) {
    if (entry.reproductionAttempts === 0) continue;
    if (entry.currentFailureHere) currentFailure = true;
    if (entry.ranWithoutReproducingHere) ranWithoutReproducing = true;
    if (entry.noExecutableTargetHere) noExecutableTarget = true;
    if (entry.targetBlockedHere || entry.environmentRefusedHere) targetBlocked = true;
    if (entry.deterministicRefusedHere) deterministicRefused = true;
  }
  // The retry budget is per exact action (host argumentDigest): one transient
  // on each of two different actions leaves both retryable.
  for (const count of ledger.transientFailuresByDigest.values()) {
    if (count < TRANSIENT_ACTION_RETRY_BUDGET) transientPending = true;
    else transientConsumed = true;
  }
  if (
    currentFailure || ranWithoutReproducing || noExecutableTarget || targetBlocked ||
    deterministicRefused || transientPending || transientConsumed
  ) {
    if (currentFailure) return 'CURRENT_FAILURE_REPRODUCED';
    if (ranWithoutReproducing) return 'RAN_WITHOUT_REPRODUCING';
    if (noExecutableTarget) return 'NOT_READY_NO_EXECUTABLE_TARGET';
    if (targetBlocked) return 'NOT_READY_TARGET_BLOCKED';
    if (deterministicRefused || transientConsumed) return 'REFUSED_DETERMINISTIC';
    return 'TRANSIENT_RETRY_REMAINING';
  }
  // W10 pre-action prediction. No attempt has been observed, so the observed
  // ladder above is silent; host-derived capability may still speak. It fires
  // only when every grounded target is classified and none is executable or
  // unclassified — a single EXECUTABLE_NOW or UNKNOWN grounded target keeps
  // the W8 outcome (an attempt there could still succeed). Observed outcomes
  // always outrank this guess by construction: this block is unreachable once
  // any attempt exists, because every attempt sets one of the flags above.
  if (preAction !== undefined && preAction !== null && preAction.groundedTargets.length > 0) {
    let executableGrounded = false;
    let unknownGrounded = false;
    let refusedGrounded = false;
    let blockedGrounded = false;
    for (const target of preAction.groundedTargets) {
      const annotated = preAction.capability.get(target);
      if (annotated === undefined || annotated.readiness === 'UNKNOWN') unknownGrounded = true;
      else if (annotated.readiness === 'EXECUTABLE_NOW') executableGrounded = true;
      else if (annotated.refusal === 'ENVIRONMENT_BLOCKED') blockedGrounded = true;
      else refusedGrounded = true;
    }
    if (!executableGrounded && !unknownGrounded) {
      if (refusedGrounded) return 'NOT_READY_NO_EXECUTABLE_TARGET';
      if (blockedGrounded) return 'NOT_READY_TARGET_BLOCKED';
    }
  }
  return null;
}

export function deriveInvestigationMemory(
  state: AgentRuntimeState,
  options: DeriveInvestigationMemoryOptions = {},
): InvestigationMemory {
  const ledger = deriveLedger(state);
  // W10 host-derived capability, consulted before any attempt is spent.
  const window = surfaceWindow(state);
  const capability = capabilityLookup(window);
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
      readiness: capability.get(entry.target)?.readiness ?? 'UNKNOWN',
      refusal: capability.get(entry.target)?.refusal ?? null,
    });
  }
  const inspectedNames = new Set(inspected.map((item) => item.target));

  const uninspectedTargets = boundedList(
    state.knownTargets.filter((target) => !inspectedNames.has(target)),
    MEMORY_CAPS.uninspectedTargets,
    MEMORY_CAPS.targetChars,
  );
  // W10 per-target capability for every reasoner-visible target: inspected
  // first, then uninspected, deterministically truncated. Unsupported source
  // is annotated, never filtered — exploration stays fully possible.
  const capabilities: MemoryTargetCapability[] = [];
  const pushCapability = (target: string): void => {
    if (capabilities.length >= MEMORY_CAPS.targetCapabilities) return;
    capabilities.push({
      target,
      readiness: capability.get(target)?.readiness ?? 'UNKNOWN',
      refusal: capability.get(target)?.refusal ?? null,
    });
  };
  for (const item of inspected) pushCapability(item.target);
  for (const target of uninspectedTargets) pushCapability(target);
  const targetCapabilities = Object.freeze(capabilities);

  const capabilitySummary = summarizeCapability(
    window,
    state.reproductionSurface !== undefined,
    (state.reproductionSurface?.length ?? 0) > window.length,
  );

  const exhausted: string[] = [];
  for (const entry of ledger.targets.values()) {
    const failedInspection = entry.evidenceRef === null && entry.timesInspected >= 1;
    const reproduced = entry.reproducedHere || entry.currentFailureHere;
    // A transient failure stays retryable (non-exhausted) only while its
    // per-action count is under the frozen budget and no terminal signal
    // exists for the target; deterministic and environment failures exhaust
    // immediately.
    const transientPending =
      !entry.deterministicRefusedHere &&
      !entry.environmentRefusedHere &&
      !entry.ranWithoutReproducingHere &&
      !entry.noExecutableTargetHere &&
      !entry.targetBlockedHere &&
      [...entry.transientDigests.values()].some((count) => count < TRANSIENT_ACTION_RETRY_BUDGET);
    const failedVerification = entry.reproductionAttempts >= 1 && !reproduced && !transientPending;
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
    const reproducedTarget = groundedOnTargets.some((target) => {
      const entry = ledger.targets.get(target);
      return entry?.reproducedHere === true || entry?.currentFailureHere === true;
    });
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
  const mechanicalReproductions = ledger.reproductions.filter(
    (item) => item.resultClass === 'REPRODUCED' || item.resultClass === 'REPRODUCED_CURRENT_FAILURE',
  ).length;

  let reproductionReadiness: ReproductionReadiness;
  if (inspected.length === 0) reproductionReadiness = 'NOT_READY_NO_INSPECTED_SOURCE';
  else if (groundableTargets.length === 0) reproductionReadiness = 'NOT_READY_NO_SOURCE_EVIDENCE';
  else {
    // W9 execution states refine the ladder once the host has attempted an
    // owner-local execution; without such a signal the W8 outcome stands —
    // unless W10 host capability already classifies every grounded target as
    // non-executable, in which case the honest pre-action state wins over READY.
    const groundedTargets: string[] = [];
    for (const item of hypotheses) {
      if (item.progress !== 'VERIFICATION_READY' && item.progress !== 'REPRODUCED') continue;
      for (const target of item.groundedOnTargets) {
        if (!groundedTargets.includes(target)) groundedTargets.push(target);
      }
    }
    const execution = deriveExecutionReadiness(ledger, { groundedTargets, capability });
    if (execution !== null) reproductionReadiness = execution;
    else if (verificationReadyCount === 0) reproductionReadiness = 'NOT_READY_NO_GROUNDED_HYPOTHESIS';
    else reproductionReadiness = 'READY';
  }

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
    capabilitySummary,
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
    targetCapabilities,
    capabilitySummary,
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
  readonly capabilitySummary: MemoryCapabilitySummary | null;
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
  // A transient environment failure with retry budget remaining is the only
  // host-authorized retry: name the same grounded target once. Every other
  // execution outcome is terminal for its target — the host will not run it
  // again, so no directive nudges a repeat.
  if (input.reproductionReadiness === 'TRANSIENT_RETRY_REMAINING' && readyHypothesis !== null) {
    const target = readyHypothesis.groundedOnTargets[0] ?? null;
    const entry = target === null ? null : input.groundableTargets.find((item) => item.target === target) ?? null;
    if (entry !== null && entry.evidenceRef !== null) {
      push(
        `The last reproduction for ${entry.target} hit a transient environment issue with retry budget remaining: you may retry RERUN_SAFE_REPRODUCTION once with sourcePath=${entry.target} sourceEvidenceRef=${String(entry.evidenceRef)} for ${readyHypothesis.hypothesisId}; further repeats are discarded.`,
      );
    }
  }
  const reproducedTarget =
    input.reproductions.find((item) => item.resultClass === 'REPRODUCED' || item.resultClass === 'REPRODUCED_CURRENT_FAILURE') ??
    null;
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
  // W10 capability tradeoff: the current sources are classified non-executable
  // while executable targets are visible elsewhere. Counts only — the summary
  // never names a target — plus the already-visible uninspected list the turn
  // can navigate to. Advisory: exploration of the current source stays open.
  const groundableNonExecutable =
    input.groundableTargets.length > 0 &&
    input.groundableTargets.every((item) => item.readiness === 'NOT_EXECUTABLE');
  if (
    groundableNonExecutable &&
    input.capabilitySummary !== null &&
    input.capabilitySummary.executableTargets > 0
  ) {
    push(
      `Host capability: inspected sources are NOT_EXECUTABLE but ${String(input.capabilitySummary.executableTargets)} executable target(s) across ${String(input.capabilitySummary.executableRepositories)} repositories are visible; prefer an unexplored target.`,
    );
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
  // W10 refusal memory: the campaign proved these targets have no executable
  // surface. Counts only, advisory — a deliberate revisit stays permitted.
  const unsupportedCount = input.campaign?.unsupportedTargets.length ?? 0;
  if (unsupportedCount > 0) {
    push(
      `This campaign already proved ${String(unsupportedCount)} target(s) have no executable target; a deliberate revisit stays permitted but prefer unproven ground.`,
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
    unsupportedTargets: Object.freeze([]),
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
  // W10 refusal memory: an executed NOT_AVAILABLE verdict proves the surface
  // has no executable target. Tolerate a prior record without the field (a W9
  // checkpoint resumes with an empty record, not a failure).
  const unsupported = [...(prior.unsupportedTargets ?? [])];
  for (const target of memory.inspectedTargets) {
    if (!inspectedTargets.includes(target.target)) inspectedTargets.push(target.target);
  }
  for (const reproduction of memory.reproductions) {
    if (
      (reproduction.resultClass === 'REPRODUCED' || reproduction.resultClass === 'REPRODUCED_CURRENT_FAILURE') &&
      !reproducedTargets.includes(reproduction.target)
    ) {
      reproducedTargets.push(reproduction.target);
    }
    if (reproduction.resultClass === 'NOT_AVAILABLE' && !unsupported.includes(reproduction.target)) {
      unsupported.push(reproduction.target);
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
    unsupportedTargets: boundedList(unsupported, MEMORY_CAPS.unsupportedTargets, MEMORY_CAPS.targetChars),
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
 * A v1 record (pre-W10, no `unsupportedTargets`) resumes with an empty
 * refusal record rather than failing: absence of knowledge is honest.
 */
export function parseCampaignStrategyState(value: unknown, campaignId: string): CampaignStrategyState | null {
  if (!isRecord(value)) return null;
  const schemaVersion = value['schemaVersion'];
  const isCurrent = schemaVersion === CAMPAIGN_STRATEGY_STATE_VERSION;
  const isLegacyV1 = schemaVersion === 'nightwatch.campaign-strategy-state.v1';
  if (!isCurrent && !isLegacyV1) return null;
  if (value['campaignId'] !== campaignId) return null;
  if (!isNonNegativeInteger(value['investigationsCompleted'])) return null;
  if (!isNonNegativeInteger(value['stagnantInvestigations'])) return null;
  const inspectedTargets = parseStringArray(value['inspectedTargets'], MEMORY_CAPS.campaignTargets);
  const unproductiveTargets = parseStringArray(value['unproductiveTargets'], MEMORY_CAPS.campaignTargets);
  const reproducedTargets = parseStringArray(value['reproducedTargets'], MEMORY_CAPS.campaignTargets);
  const candidateIds = parseStringArray(value['candidateIds'], MEMORY_CAPS.candidateIds);
  // v1 has no refusal record: migrate to empty. v2 must carry a valid one.
  const unsupportedTargets = isLegacyV1 && value['unsupportedTargets'] === undefined
    ? Object.freeze([] as string[])
    : parseStringArray(value['unsupportedTargets'], MEMORY_CAPS.unsupportedTargets);
  if (
    inspectedTargets === null ||
    unproductiveTargets === null ||
    reproducedTargets === null ||
    candidateIds === null ||
    unsupportedTargets === null
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
    unsupportedTargets,
    candidateIds,
    stagnantInvestigations: value['stagnantInvestigations'],
    priorOutcomes: Object.freeze(priorOutcomes),
  };
}
