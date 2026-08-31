// ---------------------------------------------------------------------------
// Phase 7 bounded campaign budget and time controller.
// ---------------------------------------------------------------------------

import {
  CAMPAIGN_BUDGET_POLICY_VERSION,
  type CampaignBudgetPolicy,
  type CampaignBudgetSnapshot,
  type CampaignBudgetUsage,
  type CampaignWorkKind,
  type CampaignWorkItem,
} from './types';

export const INITIAL_REAL_CAMPAIGN_BUDGET: CampaignBudgetPolicy = Object.freeze({
  policyVersion: CAMPAIGN_BUDGET_POLICY_VERSION,
  maxTotalBrowserContexts: 6,
  maxJourneyContexts: 3,
  // Keep three browser contexts available after the three trusted journeys;
  // optional exploration is suppressed in the real bounded profile so a
  // qualifying browser reproduction is not promised and then starved.
  maxExplorationContexts: 0,
  maxApiExecutions: 6,
  // Three linked Phase 5 fresh replays plus the existing one-exact/four-
  // candidate private triage allowance. This is still a bounded maximum;
  // unused replay capacity is normal on a clean campaign.
  maxReplays: 8,
  maxMinimizationCandidates: 4,
  maxTotalActions: 24,
  maxRuntimeMs: 15 * 60 * 1000,
  maxPerTestTimeoutMs: 120 * 1000,
  // One promoted cluster is the deterministic bounded triage reserve. A
  // larger breadth would consume the same replay/context reserve before the
  // first finding could be reproduced.
  maxPromotedClusters: 1,
  maxPrivateEvidenceBytes: 10 * 1024 * 1024,
});

export const MULTI_HOUR_CAMPAIGN_BUDGET: CampaignBudgetPolicy = Object.freeze({
  policyVersion: CAMPAIGN_BUDGET_POLICY_VERSION,
  maxTotalBrowserContexts: 64,
  maxJourneyContexts: 32,
  maxExplorationContexts: 32,
  maxApiExecutions: 128,
  maxReplays: 32,
  maxMinimizationCandidates: 4,
  maxTotalActions: 1024,
  maxRuntimeMs: 6 * 60 * 60 * 1000,
  maxPerTestTimeoutMs: 120 * 1000,
  maxPromotedClusters: 3,
  maxPrivateEvidenceBytes: 64 * 1024 * 1024,
});

const ZERO_USAGE: CampaignBudgetUsage = Object.freeze({
  browserContexts: 0,
  journeyContexts: 0,
  explorationContexts: 0,
  apiExecutions: 0,
  replays: 0,
  minimizationCandidates: 0,
  totalActions: 0,
  privateEvidenceBytes: 0,
});

type BudgetDimension = keyof CampaignBudgetUsage;

export interface CampaignBudgetFeasibility {
  readonly applicable: boolean;
  readonly feasible: boolean;
  readonly mandatoryBrowserContexts: number;
  readonly mandatoryApiExecutions: number;
  readonly mandatoryReplays: number;
  readonly mandatoryActions: number;
  readonly reservedBrowserContexts: number;
  readonly reservedApiExecutions: number;
  readonly reservedReplays: number;
  readonly reservedMinimizationCandidates: number;
  readonly reservedActions: number;
  readonly reasons: readonly string[];
}

export function isInitialRealCampaignBudget(policy: CampaignBudgetPolicy): boolean {
  return policy.maxTotalBrowserContexts === INITIAL_REAL_CAMPAIGN_BUDGET.maxTotalBrowserContexts
    && policy.maxJourneyContexts === INITIAL_REAL_CAMPAIGN_BUDGET.maxJourneyContexts
    && policy.maxExplorationContexts === INITIAL_REAL_CAMPAIGN_BUDGET.maxExplorationContexts
    && policy.maxApiExecutions === INITIAL_REAL_CAMPAIGN_BUDGET.maxApiExecutions
    && policy.maxReplays === INITIAL_REAL_CAMPAIGN_BUDGET.maxReplays
    && policy.maxMinimizationCandidates === INITIAL_REAL_CAMPAIGN_BUDGET.maxMinimizationCandidates
    && policy.maxTotalActions === INITIAL_REAL_CAMPAIGN_BUDGET.maxTotalActions
    && policy.maxRuntimeMs === INITIAL_REAL_CAMPAIGN_BUDGET.maxRuntimeMs
    && policy.maxPerTestTimeoutMs === INITIAL_REAL_CAMPAIGN_BUDGET.maxPerTestTimeoutMs
    && policy.maxPromotedClusters === INITIAL_REAL_CAMPAIGN_BUDGET.maxPromotedClusters
    && policy.maxPrivateEvidenceBytes === INITIAL_REAL_CAMPAIGN_BUDGET.maxPrivateEvidenceBytes;
}

export function isRealScaleBudget(policy: CampaignBudgetPolicy): boolean {
  return policy.maxRuntimeMs >= INITIAL_REAL_CAMPAIGN_BUDGET.maxRuntimeMs;
}

const LIMIT_FOR: Readonly<Record<BudgetDimension, keyof CampaignBudgetPolicy>> = {
  browserContexts: 'maxTotalBrowserContexts',
  journeyContexts: 'maxJourneyContexts',
  explorationContexts: 'maxExplorationContexts',
  apiExecutions: 'maxApiExecutions',
  replays: 'maxReplays',
  minimizationCandidates: 'maxMinimizationCandidates',
  totalActions: 'maxTotalActions',
  privateEvidenceBytes: 'maxPrivateEvidenceBytes',
};

function cloneUsage(value: CampaignBudgetUsage): CampaignBudgetUsage {
  return { ...value };
}

export function validateBudgetPolicy(policy: CampaignBudgetPolicy): void {
  if (policy.policyVersion !== CAMPAIGN_BUDGET_POLICY_VERSION) throw new Error('CAMPAIGN_BUDGET_POLICY_VERSION_INVALID');
  const values = Object.values(policy).filter((value): value is number => typeof value === 'number');
  if (values.some((value) => !Number.isInteger(value) || value < 0)) throw new Error('CAMPAIGN_BUDGET_VALUE_INVALID');
  if (policy.maxTotalBrowserContexts < policy.maxJourneyContexts + policy.maxExplorationContexts) throw new Error('CAMPAIGN_BROWSER_CONTEXT_BUDGET_INVALID');
  if (policy.maxRuntimeMs < policy.maxPerTestTimeoutMs) throw new Error('CAMPAIGN_TIME_BUDGET_INVALID');
  if (policy.maxPromotedClusters > 3) throw new Error('CAMPAIGN_CLUSTER_POLICY_EXCEEDED');
}

/**
 * Check the frozen real-profile promise before a manifest becomes authority.
 * Synthetic campaigns intentionally bypass this profile planner because their
 * fixture executors do not represent real browser/API resource consumption.
 */
export function analyzeCampaignBudgetFeasibility(input: {
  readonly mode: string;
  readonly policy: CampaignBudgetPolicy;
  readonly workItems: readonly CampaignWorkItem[];
  readonly applicable?: boolean;
}): CampaignBudgetFeasibility {
  const applicable = input.applicable ?? input.mode !== 'LOCAL_SYNTHETIC';
  const mandatoryBrowserContexts = input.workItems.filter((item) => item.kind === 'JOURNEY' || item.kind === 'EXPLORATION').length;
  const mandatoryApiExecutions = input.workItems
    .filter((item) => item.kind === 'API')
    .reduce((total, item) => total + (item.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY' ? 2 : 1), 0);
  const mandatoryReplays = input.workItems.filter((item) => item.kind === 'REPRODUCTION' || (item.kind === 'API' && item.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY')).length;
  // A browser work item has at least one safe action. API work can be a
  // zero-action read at this layer; adapters report actual actions and are
  // bounded again by CampaignBudgetManager before persistence.
  const mandatoryActions = input.workItems.filter((item) => item.kind === 'JOURNEY' || item.kind === 'EXPLORATION').length;
  const reservationCount = input.mode === 'REPRODUCTION_ONLY' ? 1 : input.policy.maxPromotedClusters;
  const reservedBrowserContexts = reservationCount;
  const reservedApiExecutions = reservationCount;
  const reservedReplays = reservationCount;
  const reservedMinimizationCandidates = reservationCount;
  const reservedActions = reservationCount;
  const reasons: string[] = [];
  if (applicable && mandatoryBrowserContexts + reservedBrowserContexts > input.policy.maxTotalBrowserContexts) reasons.push('BROWSER_REPRODUCTION_RESERVE_UNAVAILABLE');
  if (applicable && mandatoryApiExecutions + reservedApiExecutions > input.policy.maxApiExecutions) reasons.push('API_REPRODUCTION_RESERVE_UNAVAILABLE');
  if (applicable && mandatoryReplays + reservedReplays > input.policy.maxReplays) reasons.push('REPLAY_RESERVE_UNAVAILABLE');
  if (applicable && mandatoryActions + reservedActions > input.policy.maxTotalActions) reasons.push('ACTION_RESERVE_UNAVAILABLE');
  if (applicable && reservedMinimizationCandidates > input.policy.maxMinimizationCandidates) reasons.push('MINIMIZATION_RESERVE_UNAVAILABLE');
  if (applicable && input.mode === 'REPRODUCTION_ONLY' && input.policy.maxReplays < 1) reasons.push('REPRODUCTION_ONLY_REPLAY_UNAVAILABLE');
  return {
    applicable,
    feasible: reasons.length === 0,
    mandatoryBrowserContexts,
    mandatoryApiExecutions,
    mandatoryReplays,
    mandatoryActions,
    reservedBrowserContexts,
    reservedApiExecutions,
    reservedReplays,
    reservedMinimizationCandidates,
    reservedActions,
    reasons,
  };
}

export interface CampaignBudgetManagerOptions {
  /**
   * Browser contexts protected from collection for replay. The orchestrator
   * derives this from the frozen real-profile promotion cap; synthetic
   * fixture managers default to zero because they do not contact DEV.
   */
  readonly protectedReplayBrowserContexts?: number;
}

export class CampaignBudgetManager {
  readonly policy: CampaignBudgetPolicy;
  readonly protectedReplayBrowserContexts: number;
  private readonly collectionBrowserContextLimit: number;
  private usage: CampaignBudgetUsage;

  constructor(policy: CampaignBudgetPolicy, initial: CampaignBudgetUsage = ZERO_USAGE, options: CampaignBudgetManagerOptions = {}) {
    validateBudgetPolicy(policy);
    const protectedReplayBrowserContexts = options.protectedReplayBrowserContexts ?? 0;
    if (!Number.isInteger(protectedReplayBrowserContexts) || protectedReplayBrowserContexts < 0 || protectedReplayBrowserContexts > policy.maxTotalBrowserContexts) {
      throw new Error('CAMPAIGN_REPLAY_RESERVE_INVALID');
    }
    this.policy = policy;
    this.protectedReplayBrowserContexts = protectedReplayBrowserContexts;
    this.collectionBrowserContextLimit = policy.maxTotalBrowserContexts - protectedReplayBrowserContexts;
    this.usage = cloneUsage(initial);
    this.assertWithinLimits();
  }

  private assertWithinLimits(): void {
    for (const dimension of Object.keys(LIMIT_FOR) as BudgetDimension[]) {
      const limit = this.policy[LIMIT_FOR[dimension]] as number;
      if (!Number.isInteger(this.usage[dimension]) || this.usage[dimension] < 0) throw new Error(`CAMPAIGN_BUDGET_USAGE_INVALID:${dimension}`);
      if (this.usage[dimension] > limit) throw new Error(`CAMPAIGN_BUDGET_ALREADY_EXCEEDED:${dimension}`);
    }
  }

  used(): CampaignBudgetUsage {
    return cloneUsage(this.usage);
  }

  remaining(): CampaignBudgetUsage {
    const result = {} as CampaignBudgetUsage;
    for (const dimension of Object.keys(LIMIT_FOR) as BudgetDimension[]) {
      const limit = this.policy[LIMIT_FOR[dimension]] as number;
      Object.assign(result, { [dimension]: limit - this.usage[dimension] });
    }
    return result;
  }

  snapshot(): CampaignBudgetSnapshot {
    return { policy: this.policy, used: this.used(), remaining: this.remaining() };
  }

  canConsume(dimension: BudgetDimension, amount = 1): boolean {
    if (!Number.isInteger(amount) || amount < 0) throw new Error('CAMPAIGN_BUDGET_AMOUNT_INVALID');
    const limit = this.policy[LIMIT_FOR[dimension]] as number;
    return this.usage[dimension] + amount <= limit;
  }

  consume(dimension: BudgetDimension, amount = 1): void {
    this.consumeBundle({ [dimension]: amount });
  }

  /** Consume a multi-dimensional reservation atomically. */
  consumeBundle(requirements: Partial<Readonly<Record<BudgetDimension, number>>>): void {
    const next = { ...this.usage } as Record<BudgetDimension, number>;
    for (const [rawDimension, amount] of Object.entries(requirements)) {
      const dimension = rawDimension as BudgetDimension;
      if (!(dimension in LIMIT_FOR) || !Number.isInteger(amount) || (amount ?? 0) < 0) {
        throw new Error('CAMPAIGN_BUDGET_AMOUNT_INVALID');
      }
      if (!this.canConsume(dimension, amount)) throw new Error(`CAMPAIGN_BUDGET_EXHAUSTED:${dimension}`);
      next[dimension] += amount;
    }
    this.usage = next;
  }

  /**
   * Collection-only reservation. In the real profile, aggregate browser
   * capacity is deliberately checked against the collection ceiling rather
   * than the total ceiling, leaving the protected replay slot untouched.
   */
  private consumeCollectionBundle(requirements: Partial<Readonly<Record<BudgetDimension, number>>>): void {
    const browserContexts = requirements.browserContexts ?? 0;
    if (!Number.isInteger(browserContexts) || browserContexts < 0) throw new Error('CAMPAIGN_BUDGET_AMOUNT_INVALID');
    if (this.usage.browserContexts + browserContexts > this.collectionBrowserContextLimit) {
      throw new Error('CAMPAIGN_BUDGET_EXHAUSTED:browserContexts');
    }
    this.consumeBundle(requirements);
  }

  reserveWork(kind: CampaignWorkKind, replay = false): void {
    const requirements: Partial<Record<BudgetDimension, number>> = {};
    if (kind === 'JOURNEY') {
      requirements.browserContexts = 1;
      requirements.journeyContexts = 1;
    } else if (kind === 'EXPLORATION') {
      requirements.browserContexts = 1;
      requirements.explorationContexts = 1;
    } else if (kind === 'API') {
      requirements.apiExecutions = 1;
    } else if (kind === 'REPRODUCTION') {
      requirements.replays = 1;
    } else if (kind === 'MINIMIZATION') {
      requirements.minimizationCandidates = 1;
    }
    if (replay && kind !== 'MINIMIZATION') requirements.replays = (requirements.replays ?? 0) + 1;
    if (kind === 'JOURNEY' || kind === 'EXPLORATION') this.consumeCollectionBundle(requirements);
    else this.consumeBundle(requirements);
  }

  reserveFirstPlusApi(): void {
    this.consumeBundle({ apiExecutions: 2, replays: 1 });
  }

  addActions(amount: number): void {
    this.consume('totalActions', amount);
  }

  addEvidenceBytes(amount: number): void {
    this.consume('privateEvidenceBytes', amount);
  }
}

export class CampaignTimeBudget {
  private readonly startedAt: number;
  private readonly now: () => number;
  readonly maxRuntimeMs: number;

  constructor(maxRuntimeMs: number, now: () => number = Date.now, startedAt = now()) {
    if (!Number.isInteger(maxRuntimeMs) || maxRuntimeMs < 1) throw new Error('CAMPAIGN_RUNTIME_BUDGET_INVALID');
    this.maxRuntimeMs = maxRuntimeMs;
    this.now = now;
    this.startedAt = startedAt;
  }

  elapsedMs(): number {
    return Math.max(0, this.now() - this.startedAt);
  }

  remainingMs(): number {
    return Math.max(0, this.maxRuntimeMs - this.elapsedMs());
  }

  assertAvailable(): void {
    if (this.elapsedMs() >= this.maxRuntimeMs) throw new Error('CAMPAIGN_RUNTIME_TIMEOUT');
  }
}

export function emptyBudgetUsage(): CampaignBudgetUsage {
  return { ...ZERO_USAGE };
}
