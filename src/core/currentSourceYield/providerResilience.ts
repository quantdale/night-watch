// ---------------------------------------------------------------------------
// W13 provider-resilience policy (Phase B, tasks 11.x). LOCAL only.
//
// The policy is fixed and fingerprinted before the first probe. Failover is
// deterministic and result-independent: a transition happens only when the
// active provider's consecutive failures of a failover-eligible class reach
// the frozen threshold, moves exactly one step down the frozen order, and a
// mutated policy fails a resume closed with the changed fields named.
//
// Pure/data-only: no filesystem, network, process, or persistence authority.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';

import {
  PROVIDER_FAILURE_CLASSES,
  type ProviderFailureClass,
} from '../agentProtocol/providerFailure';
import { checkRuntimeBudgetEnvelope, type RuntimeBudgetEnvelope } from '../agentRuntime/runtimeBudgetEnvelope';

export const PROVIDER_RESILIENCE_POLICY_VERSION = 'nightwatch.provider-resilience-policy.v1' as const;

export interface ProviderResiliencePolicy {
  readonly schemaVersion: typeof PROVIDER_RESILIENCE_POLICY_VERSION;
  readonly campaignId: string;
  readonly declaredBeforeProbe: boolean;
  readonly orderingCriteria: readonly string[];
  readonly qualityBasedSelection: boolean;
  readonly cli: {
    readonly mode: string;
    readonly adapter: string;
    readonly shell: boolean;
    readonly structuredResponseSchema: string;
  };
  readonly timing: {
    readonly probeTimeoutMs: number;
    readonly runtimeTimeoutMs: number;
  };
  readonly retryPolicy: {
    readonly attemptsPerCall: number;
    readonly note?: string;
  };
  readonly failover: {
    readonly eligibleClasses: readonly ProviderFailureClass[];
    readonly ineligibleClasses: readonly ProviderFailureClass[];
    readonly maxConsecutiveFailuresByClass: Readonly<Record<string, number>>;
    readonly maxTransitions: number;
    readonly recovery: {
      readonly permitted: boolean;
      readonly providers?: readonly string[];
      readonly condition?: string;
    };
    readonly exhaustionBehavior: 'PROVIDER_BLOCKED';
  };
  readonly budgetEnvelope: RuntimeBudgetEnvelope;
  readonly candidates: readonly {
    readonly ordinal: number;
    readonly provider: string;
    readonly model: string;
    readonly argvTemplate: readonly string[];
    readonly reason: string;
  }[];
  readonly fingerprint: string;
}

export class ProviderResiliencePolicyError extends Error {
  readonly code: string;
  readonly fields: readonly string[];
  constructor(code: string, detail: string, fields: readonly string[] = []) {
    super(`${code}: ${detail}`);
    this.name = 'ProviderResiliencePolicyError';
    this.code = code;
    this.fields = fields;
  }
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}

/** Every bound field except the fingerprint itself. */
export function policyFingerprintPayload(policy: Record<string, unknown>): string {
  const copy: Record<string, unknown> = { ...policy };
  delete copy.fingerprint;
  return canonical(copy);
}

export function computeProviderResilienceFingerprint(policy: Record<string, unknown>): string {
  return `sha256:${crypto.createHash('sha256').update(policyFingerprintPayload(policy)).digest('hex').slice(0, 24)}`;
}

/** Field-level difference between two policies, as dotted paths. */
export function collectPolicyFieldPaths(left: unknown, right: unknown, prefix = ''): string[] {
  if (left === right) return [];
  if (Array.isArray(left) && Array.isArray(right)) {
    const paths: string[] = [];
    if (left.length !== right.length) paths.push(`${prefix}.length`);
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
      paths.push(...collectPolicyFieldPaths(left[index], right[index], `${prefix}[${index}]`));
    }
    return paths.length > 0 ? paths : prefix === '' ? [] : [prefix];
  }
  if (left !== null && right !== null && typeof left === 'object' && typeof right === 'object' && !Array.isArray(left) && !Array.isArray(right)) {
    const paths: string[] = [];
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of [...keys].sort()) {
      const childPrefix = prefix === '' ? key : `${prefix}.${key}`;
      paths.push(...collectPolicyFieldPaths((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key], childPrefix));
    }
    return paths;
  }
  return prefix === '' ? ['policy'] : [prefix];
}

/**
 * Fail-closed resume: the current policy must recompute to the committed
 * fingerprint. A mismatch reports the changed fields by path before any
 * provider call.
 */
export function assertPolicyFingerprintMatches(committed: {
  readonly fingerprint: string;
  readonly policy: Record<string, unknown>;
}, current: Record<string, unknown>): void {
  const recomputed = computeProviderResilienceFingerprint(current);
  if (recomputed === committed.fingerprint) return;
  const changed = collectPolicyFieldPaths(committed.policy, current).filter((path) => path !== 'fingerprint');
  throw new ProviderResiliencePolicyError(
    'PROVIDER_POLICY_FINGERPRINT_MISMATCH',
    `committed ${committed.fingerprint} != recomputed ${recomputed}; changed fields: ${changed.length > 0 ? changed.join(', ') : 'unknown'}`,
    changed,
  );
}

export interface PolicyViolation {
  readonly code: string;
  readonly detail: string;
}

export function validateProviderResiliencePolicy(policy: unknown, options: { readonly derivedBudgetEnvelope?: RuntimeBudgetEnvelope } = {}): {
  readonly ok: true;
} | { readonly ok: false; readonly violations: readonly PolicyViolation[] } {
  const violations: PolicyViolation[] = [];
  if (policy === null || typeof policy !== 'object' || Array.isArray(policy)) {
    return { ok: false, violations: [{ code: 'PROVIDER_POLICY_MALFORMED', detail: 'policy is not an object' }] };
  }
  const record = policy as Record<string, unknown>;
  if (record.schemaVersion !== PROVIDER_RESILIENCE_POLICY_VERSION) {
    return { ok: false, violations: [{ code: 'PROVIDER_POLICY_SCHEMA_UNSUPPORTED', detail: `schemaVersion must be ${PROVIDER_RESILIENCE_POLICY_VERSION}` }] };
  }
  const failover = record.failover as Record<string, unknown> | undefined;
  const timing = record.timing as Record<string, unknown> | undefined;
  const retry = record.retryPolicy as Record<string, unknown> | undefined;
  const cli = record.cli as Record<string, unknown> | undefined;
  const candidates = record.candidates;
  const recovery = failover?.recovery as Record<string, unknown> | undefined;

  const positiveInt = (value: unknown): boolean => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
  if (cli === undefined || typeof cli.structuredResponseSchema !== 'string' || cli.structuredResponseSchema.length === 0 || cli.shell !== false) {
    violations.push({ code: 'PROVIDER_POLICY_CLI_INVALID', detail: 'cli requires a structured response schema and shell=false' });
  }
  if (timing === undefined || !positiveInt(timing.probeTimeoutMs) || !positiveInt(timing.runtimeTimeoutMs)) {
    violations.push({ code: 'PROVIDER_POLICY_TIMING_INVALID', detail: 'probeTimeoutMs and runtimeTimeoutMs must be positive integers' });
  }
  if (retry === undefined || typeof retry.attemptsPerCall !== 'number' || !Number.isSafeInteger(retry.attemptsPerCall) || retry.attemptsPerCall < 0) {
    violations.push({ code: 'PROVIDER_POLICY_RETRY_INVALID', detail: 'attemptsPerCall must be a non-negative integer' });
  }
  if (!Array.isArray(candidates) || candidates.length === 0) {
    violations.push({ code: 'PROVIDER_POLICY_CANDIDATES_INVALID', detail: 'candidates must be a non-empty array' });
  } else {
    const providers = new Set<string>();
    candidates.forEach((candidate, index) => {
      if (candidate === null || typeof candidate !== 'object') {
        violations.push({ code: 'PROVIDER_POLICY_CANDIDATES_INVALID', detail: `candidate ${index} is malformed` });
        return;
      }
      const item = candidate as Record<string, unknown>;
      if (item.ordinal !== index + 1) {
        violations.push({ code: 'PROVIDER_POLICY_CANDIDATES_INVALID', detail: `candidate ordinal ${String(item.ordinal)} != position ${index + 1}` });
      }
      if (typeof item.provider !== 'string' || item.provider.length === 0 || typeof item.model !== 'string' || item.model.length === 0) {
        violations.push({ code: 'PROVIDER_POLICY_CANDIDATES_INVALID', detail: `candidate ${index} needs provider and model` });
      } else if (providers.has(item.provider)) {
        violations.push({ code: 'PROVIDER_POLICY_CANDIDATES_INVALID', detail: `candidate ${item.provider} appears more than once` });
      } else {
        providers.add(item.provider);
      }
    });
  }
  const knownClasses = new Set(PROVIDER_FAILURE_CLASSES as readonly string[]);
  const eligible = Array.isArray(failover?.eligibleClasses) ? failover.eligibleClasses as unknown[] : null;
  const ineligible = Array.isArray(failover?.ineligibleClasses) ? failover.ineligibleClasses as unknown[] : null;
  if (eligible === null || ineligible === null || eligible.length === 0) {
    violations.push({ code: 'PROVIDER_POLICY_FAILOVER_INVALID', detail: 'eligibleClasses and ineligibleClasses must be declared arrays' });
  } else {
    for (const item of [...eligible, ...ineligible]) {
      if (typeof item !== 'string' || !knownClasses.has(item) || item === 'VALID_PROVIDER_RESPONSE') {
        violations.push({ code: 'PROVIDER_POLICY_FAILOVER_INVALID', detail: `unknown or invalid failure class ${String(item)}` });
      }
    }
    for (const item of eligible) {
      if (ineligible.includes(item)) {
        violations.push({ code: 'PROVIDER_POLICY_FAILOVER_INVALID', detail: `class ${String(item)} is both eligible and ineligible` });
      }
    }
  }
  const thresholds = failover?.maxConsecutiveFailuresByClass;
  if (thresholds === null || typeof thresholds !== 'object' || Array.isArray(thresholds)) {
    violations.push({ code: 'PROVIDER_POLICY_THRESHOLDS_INVALID', detail: 'maxConsecutiveFailuresByClass must be an object' });
  } else {
    for (const [key, value] of Object.entries(thresholds as Record<string, unknown>)) {
      if (key !== 'DEFAULT' && !knownClasses.has(key)) {
        violations.push({ code: 'PROVIDER_POLICY_THRESHOLDS_INVALID', detail: `threshold names unknown class ${key}` });
      }
      if (!positiveInt(value)) {
        violations.push({ code: 'PROVIDER_POLICY_THRESHOLDS_INVALID', detail: `threshold for ${key} must be a positive integer` });
      }
    }
    if (!('DEFAULT' in (thresholds as Record<string, unknown>))) {
      violations.push({ code: 'PROVIDER_POLICY_THRESHOLDS_INVALID', detail: 'a DEFAULT threshold is required' });
    }
  }
  if (typeof failover?.maxTransitions !== 'number' || !Number.isSafeInteger(failover.maxTransitions) || failover.maxTransitions < 0) {
    violations.push({ code: 'PROVIDER_POLICY_TRANSITIONS_INVALID', detail: 'maxTransitions must be a non-negative integer' });
  }
  if (recovery === undefined || typeof recovery.permitted !== 'boolean') {
    violations.push({ code: 'PROVIDER_POLICY_RECOVERY_INVALID', detail: 'recovery.permitted must be a boolean' });
  } else if (recovery.permitted === true) {
    if (!Array.isArray(recovery.providers) || recovery.providers.length === 0 || recovery.providers.some((item) => typeof item !== 'string')) {
      violations.push({ code: 'PROVIDER_POLICY_RECOVERY_INVALID', detail: 'recovery permitted requires named providers' });
    }
    if (typeof recovery.condition !== 'string' || recovery.condition.trim().length === 0) {
      violations.push({ code: 'PROVIDER_POLICY_RECOVERY_INVALID', detail: 'recovery permitted requires a stated condition' });
    }
  }
  if (failover?.exhaustionBehavior !== 'PROVIDER_BLOCKED') {
    violations.push({ code: 'PROVIDER_POLICY_EXHAUSTION_INVALID', detail: 'exhaustionBehavior must be PROVIDER_BLOCKED' });
  }
  if (options.derivedBudgetEnvelope !== undefined) {
    const envelopeChecked = checkRuntimeBudgetEnvelope(record.budgetEnvelope, options.derivedBudgetEnvelope);
    if (!envelopeChecked.ok) {
      violations.push({
        code: envelopeChecked.code,
        detail: envelopeChecked.code === 'RUNTIME_BUDGET_ENVELOPE_MISMATCH'
          ? `budget envelope disagrees with the engine on ${envelopeChecked.mismatches.map((item) => item.field).join(', ')}`
          : envelopeChecked.detail,
      });
    }
  }
  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}

export interface ProviderFailureEvent {
  readonly class: ProviderFailureClass;
  readonly atEvent: number;
}

export interface ProviderTransition {
  readonly sequence: number;
  readonly atEvent: number;
  readonly from: string;
  readonly to: string;
  readonly triggerClass: ProviderFailureClass;
  readonly reason: 'FAILOVER_ELIGIBLE_THRESHOLD' | 'RECOVERY_EXPLICIT_POLICY';
}

export interface ProviderFailoverReplay {
  readonly transitions: readonly ProviderTransition[];
  readonly activeProvider: string;
  readonly degradedProviders: readonly string[];
  readonly exhausted: boolean;
  readonly totalTransitions: number;
  readonly failuresByProvider: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

/**
 * Deterministic failover replay. The same policy plus the same failure
 * sequence always yields the same transition sequence. No result quality is
 * consulted; only the frozen class order and thresholds are.
 */
export function replayProviderFailures(
  policy: ProviderResiliencePolicy,
  events: readonly ProviderFailureEvent[],
): ProviderFailoverReplay {
  const candidates = policy.candidates.map((candidate) => candidate.provider);
  const eligible = new Set(policy.failover.eligibleClasses as readonly string[]);
  const degraded = new Set<string>();
  const failuresByProvider: Record<string, Record<string, number>> = {};
  const transitions: ProviderTransition[] = [];
  let activeIndex = 0;
  let streakClass: ProviderFailureClass | null = null;
  let streakCount = 0;
  let transitionsUsed = 0;
  let exhausted = false;

  const bump = (provider: string, failureClass: ProviderFailureClass): void => {
    failuresByProvider[provider] = failuresByProvider[provider] ?? {};
    failuresByProvider[provider][failureClass] = (failuresByProvider[provider][failureClass] ?? 0) + 1;
  };

  for (const event of events) {
    const activeProvider = candidates[activeIndex] ?? '';
    bump(activeProvider, event.class);
    if (exhausted) continue;
    if (event.class === 'VALID_PROVIDER_RESPONSE') {
      streakClass = null;
      streakCount = 0;
      continue;
    }
    if (!eligible.has(event.class)) {
      // An ineligible failure never changes the active provider.
      streakClass = null;
      streakCount = 0;
      continue;
    }
    const threshold = policy.failover.maxConsecutiveFailuresByClass[event.class]
      ?? policy.failover.maxConsecutiveFailuresByClass.DEFAULT
      ?? Number.POSITIVE_INFINITY;
    if (streakClass === event.class) streakCount += 1;
    else {
      streakClass = event.class;
      streakCount = 1;
    }
    if (streakCount < threshold) continue;

    degraded.add(activeProvider);
    const nextIndex = activeIndex + 1;
    const recoveryCandidates = policy.failover.recovery.permitted === true
      ? policy.failover.recovery.providers ?? []
      : [];
    if (nextIndex < candidates.length && transitionsUsed < policy.failover.maxTransitions) {
      transitions.push({
        sequence: transitions.length + 1,
        atEvent: event.atEvent,
        from: activeProvider,
        to: candidates[nextIndex] ?? '',
        triggerClass: event.class,
        reason: 'FAILOVER_ELIGIBLE_THRESHOLD',
      });
      activeIndex = nextIndex;
      transitionsUsed += 1;
      streakClass = null;
      streakCount = 0;
      continue;
    }
    const recoverable = candidates.findIndex((provider, index) => index !== activeIndex
      && degraded.has(provider)
      && recoveryCandidates.includes(provider));
    if (recoverable !== -1 && transitionsUsed < policy.failover.maxTransitions) {
      transitions.push({
        sequence: transitions.length + 1,
        atEvent: event.atEvent,
        from: activeProvider,
        to: candidates[recoverable] ?? '',
        triggerClass: event.class,
        reason: 'RECOVERY_EXPLICIT_POLICY',
      });
      activeIndex = recoverable;
      transitionsUsed += 1;
      streakClass = null;
      streakCount = 0;
      continue;
    }
    exhausted = true;
  }

  return {
    transitions,
    activeProvider: candidates[activeIndex] ?? '',
    degradedProviders: [...degraded].sort(),
    exhausted,
    totalTransitions: transitions.length,
    failuresByProvider,
  };
}
