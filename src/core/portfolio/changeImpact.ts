// ---------------------------------------------------------------------------
// Phase 17 — source-change impact overlay for the approved portfolio.
//
// This is the missing pure bridge between the existing Phase 3 selector and
// the Phase 16 portfolio allocator. It consumes only a SelectionResult that
// has already been produced by the bounded change-intelligence selector and
// maps its categorical reasons onto explicitly linked portfolio members.
//
// No source scan, fs/network/process/browser/AI/DB/selfDev authority exists
// here. Changed paths, edge evidence, and free text are deliberately not
// copied into the overlay: only bounded categorical impact facts survive.
// Stale/unknown source evidence receives no positive score. Owner/frozen/
// currentness gates remain enforced by the allocator after this overlay.
// ---------------------------------------------------------------------------

import {
  RIPPLE_JOURNEY_IDS,
  type Confidence,
  type ImpactClass,
  type ImpactReason,
  type JourneyId,
  type PriorityTier,
  type ReasonCode,
  type SelectionResult,
} from '../changeIntelligence/types';
import {
  allocatePortfolioBudget,
  type PortfolioAllocation,
  type PortfolioBudgetPolicy,
  type PortfolioScoreOverride,
} from './allocation';
import {
  portfolioEligibility,
  scorePortfolioMember,
  type PortfolioMovementClass,
  type PortfolioPreviousProvenance as ScoringPreviousProvenance,
  type PriorityScore,
} from './scoring';
import {
  portfolioDigestOf,
  portfolioTextSafe,
  type CampaignPortfolio,
  type PortfolioMember,
} from './types';

export const PORTFOLIO_CHANGE_IMPACT_VERSION =
  'nightwatch.portfolio-change-impact.v1' as const;

const JOURNEY_SET = new Set<string>(RIPPLE_JOURNEY_IDS);
const CONFIDENCE_RANK: Readonly<Record<Confidence, number>> = Object.freeze({
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  UNKNOWN: 1,
});
const PRIORITY_RANK: Readonly<Record<PriorityTier, number>> = Object.freeze({
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
});
const DIRECT_IMPACTS: ReadonlySet<ImpactClass> = new Set([
  'DIRECT_JOURNEY_CHANGE',
  'DIRECT_ROUTE_CHANGE',
  'DIRECT_API_CLIENT_CHANGE',
  'DIRECT_BACKEND_HANDLER_CHANGE',
]);
const SHARED_IMPACTS: ReadonlySet<ImpactClass> = new Set([
  'SHARED_AUTH_CHANGE',
  'SHARED_ROUTER_CHANGE',
  'SHARED_LAYOUT_CHANGE',
  'SHARED_API_TRANSPORT_CHANGE',
  'SHARED_STATE_INITIALIZATION_CHANGE',
  'CONTRACT_CHANGE',
]);
const TRANSITIVE_IMPACTS: ReadonlySet<ImpactClass> = new Set([
  'TRANSITIVE_DEPENDENCY_CHANGE',
]);
const IMPACT_CLASSES: ReadonlySet<string> = new Set([
  'DIRECT_JOURNEY_CHANGE',
  'DIRECT_ROUTE_CHANGE',
  'DIRECT_API_CLIENT_CHANGE',
  'DIRECT_BACKEND_HANDLER_CHANGE',
  'SHARED_AUTH_CHANGE',
  'SHARED_ROUTER_CHANGE',
  'SHARED_LAYOUT_CHANGE',
  'SHARED_API_TRANSPORT_CHANGE',
  'SHARED_STATE_INITIALIZATION_CHANGE',
  'CONTRACT_CHANGE',
  'TRANSITIVE_DEPENDENCY_CHANGE',
  'TEST_ONLY_CHANGE',
  'DOC_ONLY_CHANGE',
  'UNRELATED_CHANGE',
  'UNKNOWN_IMPACT',
]);
const REASON_CODES: ReadonlySet<string> = new Set([
  'DIRECT_COMPONENT',
  'DIRECT_ROUTE',
  'DIRECT_API_CALL',
  'DIRECT_BACKEND_HANDLER',
  'SHARED_AUTH',
  'SHARED_ROUTER',
  'SHARED_LAYOUT',
  'SHARED_TRANSPORT',
  'SHARED_STATE_INITIALIZATION',
  'CONTRACT_CHANGE',
  'TRANSITIVE_DEPENDENCY',
  'UNKNOWN_FALLBACK',
  'NON_RUNTIME_ONLY',
  'REVIEWED_NOT_DEPENDENCY',
  'STALE_EDGE',
]);
const SAFE_REASON_RE = /^[A-Z][A-Z0-9_:-]{0,79}$/;

export type PortfolioImpactDisposition =
  | 'DIRECT'
  | 'SHARED'
  | 'TRANSITIVE'
  | 'FALLBACK'
  | 'SOURCE_UNRESOLVED'
  | 'NOT_TARGETED'
  | 'NO_RUNTIME_CHANGE'
  | 'UNLINKED_MEMBER';

export interface PortfolioChangeImpact {
  readonly disposition: PortfolioImpactDisposition;
  readonly confidence: Confidence;
  readonly priorityTier: PriorityTier;
  readonly impactClasses: readonly ImpactClass[];
  readonly reasonCodes: readonly ReasonCode[];
  readonly reasonCount: number;
  /** Bounded positive lift; unresolved evidence always contributes zero. */
  readonly scoreAdjustment: number;
  /** Categorical explanation tokens only. */
  readonly selectionReasons: readonly string[];
}

export interface ChangeAwarePortfolioMember {
  readonly memberId: string;
  readonly targetId: string;
  readonly journeyId: JourneyId | null;
  readonly eligibility: ReturnType<typeof portfolioEligibility>;
  readonly baseScore: PriorityScore;
  readonly movementClass: PortfolioMovementClass;
  readonly effectiveScore: number;
  readonly impact: PortfolioChangeImpact;
}

export interface ChangeAwarePortfolioOverlay {
  readonly schemaVersion: typeof PORTFOLIO_CHANGE_IMPACT_VERSION;
  readonly portfolioDigest: string;
  readonly changesetId: string;
  readonly sourceSelectionDigest: string;
  /** Ranked descending by effective score, then base score, then member ID. */
  readonly members: readonly ChangeAwarePortfolioMember[];
  readonly rankedMemberIds: readonly string[];
  readonly deterministicDigest: string;
}

export interface ChangeAwareAllocation {
  readonly overlay: ChangeAwarePortfolioOverlay;
  readonly allocation: PortfolioAllocation;
}

function invalid(reason: string): never {
  throw new Error(`PORTFOLIO_CHANGE_IMPACT_INVALID:${reason}`);
}

function safeBoundedToken(value: unknown, field: string): void {
  if (typeof value !== 'string' || value.length === 0 || value.length > 200 || !portfolioTextSafe(value) || !SAFE_REASON_RE.test(value)) {
    invalid(`${field}_INVALID`);
  }
}

function validateSelection(selection: SelectionResult): void {
  if (selection.schemaVersion !== 'nightwatch.change-intelligence.phase3.v1' || selection.selectorVersion !== 'nightwatch.selector.phase3.v1') {
    invalid('SELECTION_VERSION');
  }
  if (!/^cs-[0-9a-f]{24}$/.test(selection.changesetId)) invalid('CHANGESET_ID');
  if (!/^[0-9a-f]{64}$/.test(selection.deterministicDigest)) invalid('SELECTION_DIGEST');
  if (selection.selectedJourneys.length > RIPPLE_JOURNEY_IDS.length) invalid('SELECTED_JOURNEY_COUNT');
  const selected = new Set<string>();
  for (const selectedJourney of selection.selectedJourneys) {
    const journeyId = selectedJourney.journeyId;
    if (!JOURNEY_SET.has(journeyId) || selected.has(journeyId)) invalid('SELECTED_JOURNEY_INVALID');
    selected.add(journeyId);
  }
  if (selection.impactReasons.length > 1024) invalid('IMPACT_REASON_COUNT');
  for (const reason of selection.impactReasons) {
    if (!JOURNEY_SET.has(reason.journeyId)) invalid('IMPACT_JOURNEY_INVALID');
    if (!IMPACT_CLASSES.has(reason.impactClass) || !REASON_CODES.has(reason.reasonCode)) invalid('IMPACT_CATEGORY_INVALID');
    if (!['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'].includes(reason.confidence)) invalid('IMPACT_CONFIDENCE_INVALID');
    if (!['P0', 'P1', 'P2', 'P3'].includes(reason.priorityTier)) invalid('IMPACT_PRIORITY_INVALID');
    if (reason.riskClasses.length > 8) invalid('IMPACT_RISK_COUNT');
    for (const risk of reason.riskClasses) safeBoundedToken(risk, 'IMPACT_RISK');
  }
  if (typeof selection.fallbackTriggered !== 'boolean' || typeof selection.zeroSelectionJustified !== 'boolean') {
    invalid('SELECTION_FLAGS');
  }
}

function rankConfidence(reasons: readonly ImpactReason[]): Confidence {
  return reasons.reduce<Confidence>(
    (best, reason) => CONFIDENCE_RANK[reason.confidence] > CONFIDENCE_RANK[best] ? reason.confidence : best,
    'UNKNOWN',
  );
}

function rankPriority(reasons: readonly ImpactReason[]): PriorityTier {
  return reasons.reduce<PriorityTier>(
    (best, reason) => PRIORITY_RANK[reason.priorityTier] < PRIORITY_RANK[best] ? reason.priorityTier : best,
    'P3',
  );
}

function sortedUnique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function dispositionFor(
  reasons: readonly ImpactReason[],
  fallbackTriggered: boolean,
  zeroSelectionJustified: boolean,
): PortfolioImpactDisposition {
  if (reasons.some((reason) => reason.reasonCode === 'STALE_EDGE')) return 'SOURCE_UNRESOLVED';
  // A fallback selection is a deliberately conservative all-canary result;
  // its local direct-looking reasons must not be mistaken for a complete,
  // source-backed portfolio ranking when another changed surface was
  // unresolved.
  if (fallbackTriggered) return 'FALLBACK';
  if (reasons.some((reason) => reason.reasonCode === 'UNKNOWN_FALLBACK')) return 'FALLBACK';
  if (reasons.some((reason) => reason.impactClass === 'UNKNOWN_IMPACT')) return 'SOURCE_UNRESOLVED';
  if (reasons.some((reason) => DIRECT_IMPACTS.has(reason.impactClass))) return 'DIRECT';
  if (reasons.some((reason) => SHARED_IMPACTS.has(reason.impactClass))) return 'SHARED';
  if (reasons.some((reason) => TRANSITIVE_IMPACTS.has(reason.impactClass))) return 'TRANSITIVE';
  return zeroSelectionJustified ? 'NO_RUNTIME_CHANGE' : 'NOT_TARGETED';
}

function adjustmentFor(disposition: PortfolioImpactDisposition, priority: PriorityTier): number {
  const base: Readonly<Record<PortfolioImpactDisposition, number>> = {
    DIRECT: 20,
    SHARED: 14,
    TRANSITIVE: 8,
    FALLBACK: 0,
    SOURCE_UNRESOLVED: 0,
    NOT_TARGETED: 0,
    NO_RUNTIME_CHANGE: 0,
    UNLINKED_MEMBER: 0,
  };
  const priorityLift = priority === 'P0' ? 4 : priority === 'P1' ? 2 : priority === 'P2' ? 1 : 0;
  return Math.min(24, base[disposition] + (disposition === 'DIRECT' || disposition === 'SHARED' || disposition === 'TRANSITIVE' ? priorityLift : 0));
}

function reasonsFor(
  disposition: PortfolioImpactDisposition,
  confidence: Confidence,
  priority: PriorityTier,
  reasonCount: number,
): readonly string[] {
  const tokens = [`SOURCE_IMPACT:${disposition}`, `SOURCE_CONFIDENCE:${confidence}`, `SOURCE_PRIORITY:${priority}`, `SOURCE_REASON_COUNT:${reasonCount}`];
  return tokens.filter((token) => SAFE_REASON_RE.test(token));
}

function buildMemberImpact(
  member: PortfolioMember,
  reasons: readonly ImpactReason[],
  selection: SelectionResult,
): PortfolioChangeImpact {
  const disposition = member.input.journeyId === null
    ? 'UNLINKED_MEMBER'
    : dispositionFor(reasons, selection.fallbackTriggered, selection.zeroSelectionJustified);
  const confidence = disposition === 'SOURCE_UNRESOLVED' || disposition === 'FALLBACK' || disposition === 'UNLINKED_MEMBER'
    ? 'UNKNOWN'
    : reasons.length === 0 ? 'UNKNOWN' : rankConfidence(reasons);
  const priorityTier = reasons.length === 0 ? 'P3' : rankPriority(reasons);
  const impactClasses = sortedUnique(reasons.map((reason) => reason.impactClass));
  const reasonCodes = sortedUnique(reasons.map((reason) => reason.reasonCode));
  const scoreAdjustment = adjustmentFor(disposition, priorityTier);
  return {
    disposition,
    confidence,
    priorityTier,
    impactClasses,
    reasonCodes,
    reasonCount: reasons.length,
    scoreAdjustment,
    selectionReasons: reasonsFor(disposition, confidence, priorityTier, reasons.length),
  };
}

/** Build a source-impact overlay over the already-approved portfolio. */
export function buildChangeAwarePortfolioOverlay(input: {
  readonly portfolio: CampaignPortfolio;
  readonly selection: SelectionResult;
  readonly previousProvenance?: Readonly<Record<string, ScoringPreviousProvenance>>;
}): ChangeAwarePortfolioOverlay {
  validateSelection(input.selection);
  const reasonsByJourney = new Map<JourneyId, ImpactReason[]>();
  for (const reason of input.selection.impactReasons) {
    const bucket = reasonsByJourney.get(reason.journeyId) ?? [];
    bucket.push(reason);
    reasonsByJourney.set(reason.journeyId, bucket);
  }
  const previous = input.previousProvenance ?? {};
  const members = input.portfolio.members.map((member) => {
    const baseScore = scorePortfolioMember(member, previous[member.memberId] ?? null);
    const linkedReasons = member.input.journeyId === null ? [] : reasonsByJourney.get(member.input.journeyId) ?? [];
    const impact = buildMemberImpact(member, linkedReasons, input.selection);
    return {
      memberId: member.memberId,
      targetId: member.input.targetId,
      journeyId: member.input.journeyId,
      eligibility: portfolioEligibility(member),
      baseScore,
      movementClass: baseScore.movementClass,
      effectiveScore: baseScore.total + impact.scoreAdjustment,
      impact,
    } satisfies ChangeAwarePortfolioMember;
  });
  members.sort((left, right) => right.effectiveScore - left.effectiveScore || right.baseScore.total - left.baseScore.total || left.memberId.localeCompare(right.memberId));
  const core = {
    schemaVersion: PORTFOLIO_CHANGE_IMPACT_VERSION,
    portfolioDigest: input.portfolio.portfolioDigest,
    changesetId: input.selection.changesetId,
    sourceSelectionDigest: input.selection.deterministicDigest,
    members,
    rankedMemberIds: members.map((member) => member.memberId),
  };
  return {
    ...core,
    deterministicDigest: `pci:sha256:${portfolioDigestOf(core).slice('sha256:'.length)}`,
  };
}

function scoreOverrides(overlay: ChangeAwarePortfolioOverlay): Readonly<Record<string, PortfolioScoreOverride>> {
  return Object.freeze(Object.fromEntries(overlay.members.map((member) => [member.memberId, {
    score: member.effectiveScore,
    selectionReasons: member.impact.selectionReasons,
  }])));
}

/** Allocate using the source-impact ranking while reusing the canonical allocator. */
export function allocateChangeAwarePortfolioBudget(input: {
  readonly portfolio: CampaignPortfolio;
  readonly selection: SelectionResult;
  readonly policy: PortfolioBudgetPolicy;
  readonly previousProvenance?: Readonly<Record<string, ScoringPreviousProvenance>>;
}): ChangeAwareAllocation {
  const overlay = buildChangeAwarePortfolioOverlay({
    portfolio: input.portfolio,
    selection: input.selection,
    previousProvenance: input.previousProvenance,
  });
  const allocation = allocatePortfolioBudget({
    portfolio: input.portfolio,
    policy: input.policy,
    previousProvenance: input.previousProvenance,
    scoreOverrides: scoreOverrides(overlay),
    selectionContextDigest: overlay.deterministicDigest,
  });
  return { overlay, allocation };
}
