// ---------------------------------------------------------------------------
// W8 frozen contract: bounded reasoner-visible investigation working memory.
//
// WHY
// A print-mode CLI reasoner is a fresh process per turn. Under W7 the turn
// request carried only the current phase, the previous turn's untrusted
// envelopes, an unlabelled list of evidence refs, the allowed tool/intent
// vocabulary and the budget. Nothing told the reasoner which targets it had
// already inspected, which evidence ref belonged to which source path, which
// hypotheses existed, or whether a reproduction was even legally issuable. The
// (path, evidenceRef) pairing that `RERUN_SAFE_REPRODUCTION` requires was not
// derivable from the request at all, so a stateless reasoner could not reach
// verification no matter how capable it was.
//
// WHAT THIS IS NOT
// Not a transcript, not a context dump, not new authority. Every field is
// derived from state Nightwatch already observed, is bounded by MEMORY_CAPS,
// is ordered deterministically, and carries no raw source text, no provider
// audit material, no replay coordinates and no credentials.
//
// SAFETY NOTE (load-bearing)
// Working memory travels INSIDE the ReasonerTurnRequest. The historical
// benchmark records every serialized request and runs `assertNoBenchmarkLeakage`
// over it, so hidden ground truth entering memory is a hard failure rather
// than a silent regression.
//
// Pure data. No fs/network/child_process/AI authority.
// ---------------------------------------------------------------------------

import type { AgentPhase } from '../agentProtocol/runtime';
import type { SurfaceReadinessClass, SurfaceRefusalClass } from '../reproductionSurface/contracts';

export const INVESTIGATION_MEMORY_VERSION = 'nightwatch.investigation-memory.v1' as const;
export const CAMPAIGN_STRATEGY_STATE_VERSION = 'nightwatch.campaign-strategy-state.v2' as const;

/**
 * Hard caps. Memory must stay small enough that it can never crowd out the
 * untrusted observation it summarizes, and every truncation is deterministic
 * (insertion order for ledgers, most-recent-last for action history).
 */
export const MEMORY_CAPS = Object.freeze({
  hypotheses: 8,
  inspectedTargets: 24,
  uninspectedTargets: 16,
  exhaustedTargets: 12,
  recentActions: 8,
  reproductions: 6,
  directives: 4,
  candidateIds: 8,
  proposalCandidateIds: 8,
  statementChars: 200,
  targetChars: 200,
  salientPerTarget: 4,
  salientChars: 64,
  knownTargets: 48,
  priorInvestigations: 5,
  campaignTargets: 32,
  /** Host-classified surface entries consulted per turn (mirrors SURFACE_CAPS.entries). */
  surfaceEntries: 32,
  /** Per-target capability annotations: inspected first, then uninspected. */
  targetCapabilities: 40,
  /** Campaign-remembered deterministically unsupported targets. */
  unsupportedTargets: 24,
  directiveChars: 160,
});

/**
 * Mechanically derived hypothesis strength. Model prose can never assign a
 * stronger value: `GROUNDED` requires citing an observed evidence ref,
 * `VERIFICATION_READY` requires citing an inspected source read's ref (the
 * exact grounding the host demands before it will run a reproduction),
 * `REPRODUCED`/`DISPROVED` require an observed reproduction verdict.
 */
export const HYPOTHESIS_PROGRESS_STATES = [
  'UNGROUNDED',
  'GROUNDED',
  'VERIFICATION_READY',
  'REPRODUCED',
  'DISPROVED',
] as const;
export type HypothesisProgress = (typeof HYPOTHESIS_PROGRESS_STATES)[number];

/**
 * Neutral reproduction readiness. Never names a hidden test, fix, replay
 * coordinate, command string, absolute path or provider audit detail.
 *
 * The first four values are the frozen W8 grounding ladder (does this
 * investigation even hold the (path, evidenceRef, grounded hypothesis) triple
 * the host demands before it will run anything). W9 appends the OWNER-LOCAL
 * EXECUTION states: once grounding exists, a stateless reasoner still needs
 * to know whether an executable target exists, whether its prerequisites are
 * blocked, whether an attempt already refused deterministically, whether a
 * transient failure still has retry budget, and whether the current source
 * already reproduced or already ran clean.
 */
export const REPRODUCTION_READINESS_STATES = [
  'NOT_READY_NO_INSPECTED_SOURCE',
  'NOT_READY_NO_SOURCE_EVIDENCE',
  'NOT_READY_NO_GROUNDED_HYPOTHESIS',
  'READY',
  'NOT_READY_NO_EXECUTABLE_TARGET',
  'NOT_READY_TARGET_BLOCKED',
  'REFUSED_DETERMINISTIC',
  'TRANSIENT_RETRY_REMAINING',
  'CURRENT_FAILURE_REPRODUCED',
  'RAN_WITHOUT_REPRODUCING',
] as const;
export type ReproductionReadiness = (typeof REPRODUCTION_READINESS_STATES)[number];

export const STAGNATION_RISKS = ['NONE', 'ELEVATED', 'CRITICAL'] as const;
export type StagnationRisk = (typeof STAGNATION_RISKS)[number];

export interface MemoryHypothesis {
  readonly hypothesisId: string;
  /** Truncated to MEMORY_CAPS.statementChars. */
  readonly statement: string;
  readonly status: 'OPEN' | 'SUPPORTED' | 'DISPROVED';
  readonly progress: HypothesisProgress;
  readonly evidenceRefs: readonly string[];
  /** Inspected source targets this hypothesis is actually grounded on. */
  readonly groundedOnTargets: readonly string[];
}

export interface MemoryInspectedTarget {
  readonly target: string;
  /**
   * The observed evidence ref minted by inspecting this target — the value a
   * `RERUN_SAFE_REPRODUCTION` request must present as `sourceEvidenceRef`.
   * Null when the target was requested but produced no source evidence.
   */
  readonly evidenceRef: string | null;
  readonly timesInspected: number;
  /**
   * Bounded salient symbols extracted deterministically from material the
   * reasoner already received for this target. Lets a stateless turn recall
   * WHAT it found, not merely that it looked.
   */
  readonly salient: readonly string[];
  readonly reproductionAttempts: number;
  /**
   * W10 host-derived pre-action capability for this source path. `UNKNOWN`
   * when the source was never classified: an absent annotation is unclassified,
   * never executable. Advisory only — exploratory reasoning on non-executable
   * source stays fully possible.
   */
  readonly readiness: SurfaceReadinessClass;
  /** Neutral refusal class when readiness is `NOT_EXECUTABLE`; null otherwise. */
  readonly refusal: SurfaceRefusalClass | null;
}

/**
 * W10 capability annotation for one reasoner-visible target. The `target`
 * string is always a member of this memory's `inspectedTargets` or
 * `uninspectedTargets`, so annotation never names anything the reasoner could
 * not already see. Carries the neutral readiness/refusal vocabulary only: no
 * executor class, no command, no path beyond the already-visible target.
 */
export interface MemoryTargetCapability {
  readonly target: string;
  readonly readiness: SurfaceReadinessClass;
  readonly refusal: SurfaceRefusalClass | null;
}

/**
 * W10 bounded campaign-visible capability summary. Counts only — no paths, no
 * target identities — so a turn learns that a mechanically executable target
 * exists ELSEWHERE without being handed anything it could not already list.
 * Computed over the bounded classified window; `truncated` tells whether the
 * host window itself was cut.
 */
export interface MemoryCapabilitySummary {
  /** Window entries classified `EXECUTABLE_NOW`. */
  readonly executableTargets: number;
  /** Distinct executable target identities among them. */
  readonly distinctExecutableTargets: number;
  /** Distinct repositories with at least one executable entry. */
  readonly executableRepositories: number;
  /** Window entries classified `NOT_EXECUTABLE`. */
  readonly notExecutableTargets: number;
  /** True when the surface exceeded `MEMORY_CAPS.surfaceEntries`. */
  readonly truncated: boolean;
}

export interface MemoryAction {
  readonly turnOrdinal: number;
  readonly intentKind: string;
  readonly toolId: string | null;
  readonly target: string | null;
  readonly resultClass: string;
  readonly evidenceGained: boolean;
}

export interface MemoryReproduction {
  readonly target: string;
  readonly resultClass: string;
}

export interface MemoryProgress {
  readonly turnOrdinal: number;
  readonly toolActions: number;
  readonly evidenceCount: number;
  readonly hypothesisCount: number;
  readonly groundedHypothesisCount: number;
  readonly verificationReadyCount: number;
  readonly candidateCount: number;
  readonly reproductionAttempts: number;
  readonly mechanicalReproductions: number;
  readonly turnsSinceNewEvidence: number;
  readonly repeatedActionCount: number;
  readonly stagnationRisk: StagnationRisk;
  readonly reproductionReadiness: ReproductionReadiness;
}

/**
 * Bounded campaign-level strategy carried into a FRESH investigation so it does
 * not start as if the campaign had never investigated anything. Confers no new
 * authority: every target/ref in it was already observed by an earlier
 * investigation of the same campaign.
 */
export interface CampaignStrategyState {
  readonly schemaVersion: typeof CAMPAIGN_STRATEGY_STATE_VERSION;
  readonly campaignId: string;
  readonly investigationsCompleted: number;
  /** Targets inspected anywhere in this campaign, insertion-ordered. */
  readonly inspectedTargets: readonly string[];
  /** Inspected targets that produced no hypothesis, no reproduction and no candidate. */
  readonly unproductiveTargets: readonly string[];
  /** Targets with an observed REPRODUCED verdict. */
  readonly reproducedTargets: readonly string[];
  /**
   * W10: targets observed as deterministically unsupported (an executed
   * `NOT_AVAILABLE` verdict proved the surface has no executable target),
   * insertion-ordered and bounded by `MEMORY_CAPS.unsupportedTargets`. Carried
   * into the next investigation so the campaign does not re-attempt proven
   * ground. Advisory: a deliberate revisit stays permitted.
   */
  readonly unsupportedTargets: readonly string[];
  readonly candidateIds: readonly string[];
  /** Consecutive completed investigations with zero new evidence and zero new candidates. */
  readonly stagnantInvestigations: number;
  readonly priorOutcomes: readonly {
    readonly investigationId: string;
    readonly terminationReason: string;
    readonly newEvidence: number;
    readonly newCandidates: number;
  }[];
}

export interface InvestigationMemory {
  readonly schemaVersion: typeof INVESTIGATION_MEMORY_VERSION;
  readonly investigationId: string;
  readonly phase: AgentPhase;
  readonly progress: MemoryProgress;
  readonly hypotheses: readonly MemoryHypothesis[];
  readonly inspectedTargets: readonly MemoryInspectedTarget[];
  /** Known approved targets not yet inspected in this investigation. */
  readonly uninspectedTargets: readonly string[];
  /**
   * W10 host-derived capability for the targets above (inspected first, then
   * uninspected, deterministically truncated to
   * `MEMORY_CAPS.targetCapabilities`). Same annotation as `inspectedTargets`
   * carry, extended to the uninspected set without changing its shape, so an
   * unsupported source stays offered for exploration and merely annotated.
   */
  readonly targetCapabilities: readonly MemoryTargetCapability[];
  /**
   * W10 bounded counts over the classified window, so a turn sees that a
   * mechanically executable target exists ELSEWHERE even when its current
   * source is not executable. Null when the host supplied no surface (a
   * pre-W10 checkpoint): no capability is invented.
   */
  readonly capabilitySummary: MemoryCapabilitySummary | null;
  /**
   * Targets that are exhausted for this investigation: repeatedly requested,
   * refused, or inspected without yielding usable grounding. A deliberate
   * revisit is still permitted — this is guidance, not a host-side block.
   */
  readonly exhaustedTargets: readonly string[];
  readonly recentActions: readonly MemoryAction[];
  readonly reproductions: readonly MemoryReproduction[];
  readonly candidateIds: readonly string[];
  /** Candidate ids with a captured finding proposal (proposal alone is not a finding). */
  readonly proposalCandidateIds: readonly string[];
  /**
   * Deterministic next-step hints derived from the state above. Advisory only:
   * the reasoner still chooses. They never encode hidden ground truth and never
   * name a target the reasoner could not already see.
   */
  readonly directives: readonly string[];
  readonly campaign: CampaignStrategyState | null;
}
