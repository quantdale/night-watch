// ---------------------------------------------------------------------------
// M5 (6.6, C-04) — provider-failure attribution and the termination class.
//
// Every failed reasoner call already records its provider-failure class in the
// action log (`resultClass: REASONER_<class>` or `DRIVER_THROW`). What was
// missing is the derived judgement: a campaign whose provider never answered
// was reported as BUDGET_EXHAUSTED with zero yield, which reads exactly like a
// campaign that ran and found nothing. This module derives the honest class:
//
//   VALID_PROVIDER_RUN                      no failed call at all
//   PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION   failures and NO source action ran
//   PROVIDER_DEGRADED                       failures and at least one source
//                                           action (or a successful call)
//
// Pure data + arithmetic: no fs, network, clock, child process, or AI authority.
// ---------------------------------------------------------------------------

export const PROVIDER_ATTRIBUTION_VERSION = 'nightwatch.provider-attribution.v1' as const;

export const PROVIDER_TERMINATION_CLASSES = [
  'VALID_PROVIDER_RUN',
  'PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION',
  'PROVIDER_DEGRADED',
] as const;
export type ProviderTerminationClass = (typeof PROVIDER_TERMINATION_CLASSES)[number];

/** The only action-log entry kind that counts as a source action. */
const SOURCE_ACTION_INTENT = 'CALL_TOOL';
const FAILED_CALL_INTENT = 'REASONER_CALL';
const DRIVER_THROW_CLASS = 'DRIVER_THROW';
const FAILURE_CLASS_PREFIX = 'REASONER_';

const MAX_CLASS_KEY_CHARS = 64;
const CLASS_KEY_RE = /^[A-Z][A-Z0-9_]{0,63}$/;

export interface ProviderFailureAttribution {
  readonly schemaVersion: typeof PROVIDER_ATTRIBUTION_VERSION;
  /** Reasoner calls the campaign paid for (`usage.reasonerCalls`). */
  readonly totalCalls: number;
  /** Calls that failed (`usage.providerFailures`). */
  readonly failures: number;
  /** Calls that completed (never negative). */
  readonly completedCalls: number;
  /** Executed tool actions: a nonzero count proves source activity happened. */
  readonly sourceActions: number;
  /** Per-provider-failure-class tally, taken from the persisted action log. */
  readonly byClass: Readonly<Record<string, number>>;
  readonly terminationClass: ProviderTerminationClass;
}

export interface AttributeProviderFailuresInput {
  readonly actionLog: readonly { readonly intentKind: string; readonly resultClass: string }[];
  readonly reasonerCalls: number;
  readonly providerFailures: number;
}

function countOf(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Per-class tally of the failure classes the runtime persisted per call. */
export function providerFailureClasses(
  actionLog: AttributeProviderFailuresInput['actionLog'],
): Readonly<Record<string, number>> {
  const byClass: Record<string, number> = {};
  for (const entry of actionLog) {
    if (entry.intentKind !== FAILED_CALL_INTENT) continue;
    const resultClass = String(entry.resultClass);
    const key =
      resultClass === DRIVER_THROW_CLASS
        ? DRIVER_THROW_CLASS
        : resultClass.startsWith(FAILURE_CLASS_PREFIX)
          ? resultClass.slice(FAILURE_CLASS_PREFIX.length)
          : null;
    if (key === null) continue;
    if (key.length === 0 || key.length > MAX_CLASS_KEY_CHARS || !CLASS_KEY_RE.test(key)) continue;
    byClass[key] = (byClass[key] ?? 0) + 1;
  }
  return Object.freeze(
    Object.fromEntries(
      Object.entries(byClass).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

/**
 * Derive the attribution. The counts come from the campaign's own usage
 * accounting; the per-class tally comes from the persisted action log, so a
 * resumed campaign attributes its provider failures exactly like the run that
 * produced them.
 */
export function attributeProviderFailures(
  input: AttributeProviderFailuresInput,
): ProviderFailureAttribution {
  const totalCalls = countOf(input.reasonerCalls);
  const failures = Math.min(countOf(input.providerFailures), totalCalls);
  const sourceActions = input.actionLog.filter((entry) => entry.intentKind === SOURCE_ACTION_INTENT).length;
  const terminationClass: ProviderTerminationClass =
    failures === 0
      ? 'VALID_PROVIDER_RUN'
      : sourceActions === 0 && totalCalls === failures
        ? 'PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION'
        : 'PROVIDER_DEGRADED';
  return Object.freeze({
    schemaVersion: PROVIDER_ATTRIBUTION_VERSION,
    totalCalls,
    failures,
    completedCalls: Math.max(0, totalCalls - failures),
    sourceActions,
    byClass: providerFailureClasses(input.actionLog),
    terminationClass,
  });
}

export function isProviderTerminationClass(value: unknown): value is ProviderTerminationClass {
  return typeof value === 'string' && (PROVIDER_TERMINATION_CLASSES as readonly string[]).includes(value);
}
