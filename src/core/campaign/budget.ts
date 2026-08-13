// ---------------------------------------------------------------------------
// Phase 7 bounded campaign budget and time controller.
// ---------------------------------------------------------------------------

import {
  CAMPAIGN_BUDGET_POLICY_VERSION,
  type CampaignBudgetPolicy,
  type CampaignBudgetSnapshot,
  type CampaignBudgetUsage,
  type CampaignWorkKind,
} from './types';

export const INITIAL_REAL_CAMPAIGN_BUDGET: CampaignBudgetPolicy = Object.freeze({
  policyVersion: CAMPAIGN_BUDGET_POLICY_VERSION,
  maxTotalBrowserContexts: 6,
  maxJourneyContexts: 3,
  maxExplorationContexts: 3,
  maxApiExecutions: 6,
  // Three linked Phase 5 fresh replays plus the existing one-exact/four-
  // candidate private triage allowance. This is still a bounded maximum;
  // unused replay capacity is normal on a clean campaign.
  maxReplays: 8,
  maxMinimizationCandidates: 4,
  maxTotalActions: 24,
  maxRuntimeMs: 15 * 60 * 1000,
  maxPerTestTimeoutMs: 120 * 1000,
  maxPromotedClusters: 3,
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

export class CampaignBudgetManager {
  readonly policy: CampaignBudgetPolicy;
  private usage: CampaignBudgetUsage;

  constructor(policy: CampaignBudgetPolicy, initial: CampaignBudgetUsage = ZERO_USAGE) {
    validateBudgetPolicy(policy);
    this.policy = policy;
    this.usage = cloneUsage(initial);
    this.assertWithinLimits();
  }

  private assertWithinLimits(): void {
    for (const dimension of Object.keys(LIMIT_FOR) as BudgetDimension[]) {
      const limit = this.policy[LIMIT_FOR[dimension]] as number;
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
      Object.assign(result, { [dimension]: Math.max(0, limit - this.usage[dimension]) });
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
    if (!this.canConsume(dimension, amount)) throw new Error(`CAMPAIGN_BUDGET_EXHAUSTED:${dimension}`);
    this.usage = { ...this.usage, [dimension]: this.usage[dimension] + amount };
  }

  reserveWork(kind: CampaignWorkKind, replay = false): void {
    if (kind === 'JOURNEY') {
      this.consume('browserContexts');
      this.consume('journeyContexts');
    } else if (kind === 'EXPLORATION') {
      this.consume('browserContexts');
      this.consume('explorationContexts');
    } else if (kind === 'API') {
      this.consume('apiExecutions');
    } else if (kind === 'REPRODUCTION') {
      this.consume('replays');
    } else if (kind === 'MINIMIZATION') {
      this.consume('minimizationCandidates');
    }
    if (replay && kind !== 'MINIMIZATION') this.consume('replays');
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
