// ---------------------------------------------------------------------------
// Provider failure taxonomy (W13 R-03). LOCAL environment only.
//
// W12 could only name REASONER_TIMEOUT and REASONER_NONZERO_EXIT, so absence,
// probe timeout, runtime timeout, invalid structured response, quota or
// namespace unavailability, auth failure, and local CLI failure were all
// indistinguishable. This module owns the complete ten-member taxonomy and
// the sanitization contract: raw provider text is scanned for an enumerated
// signal and is NEVER retained in the evidence object, which carries only
// classes, enumerated signals, exit codes, durations, and byte counts.
// ---------------------------------------------------------------------------

import type { ReasonerFailureClass } from './reasoner';

export const PROVIDER_FAILURE_CLASSIFICATION_VERSION = 'nightwatch.provider-failure-classification.v1' as const;

export const PROVIDER_FAILURE_CLASSES = [
  'PROVIDER_ABSENT',
  'PROVIDER_PROBE_TIMEOUT',
  'PROVIDER_RUNTIME_TIMEOUT',
  'PROVIDER_NONZERO_EXIT',
  'PROVIDER_INVALID_STRUCTURED_RESPONSE',
  'PROVIDER_NAMESPACE_OR_QUOTA_UNAVAILABLE',
  'PROVIDER_AUTH_FAILURE',
  'LOCAL_CLI_FAILURE',
  'VALID_PROVIDER_RESPONSE',
  'UNKNOWN_EXTERNAL_PROVIDER_FAILURE',
] as const;

export type ProviderFailureClass = (typeof PROVIDER_FAILURE_CLASSES)[number];

export type ProviderCallPhase = 'PROBE' | 'RUNTIME';

/**
 * Enumerated signal extracted from bounded provider text. The text itself is
 * never part of any returned structure.
 */
export type ProviderSignal = 'AUTH' | 'QUOTA_OR_NAMESPACE' | null;

export const PROVIDER_SIGNAL_SCAN_MAX_CHARS = 16384 as const;

const AUTH_SIGNAL_RE = /(?:unauthori[sz]ed|authentication|invalid[\s_-]*(?:api[\s_-]*)?key|api[\s_-]*key[\s_-]*(?:invalid|missing|expired)|forbidden|credential|(?<!\d)(?:401|403)(?!\d))/i;
const QUOTA_SIGNAL_RE = /(?:quota|rate[\s_-]*limit|too[\s_-]*many[\s_-]*requests|insufficient[\s_-]*(?:quota|credit|balance)|namespace[\s_-]*(?:unavailable|disabled|exhausted|not[\s_-]*found)|(?<!\d)(?:402|429)(?!\d))/i;

/**
 * Scan bounded provider text for an enumerated signal. The input is read and
 * discarded; no substring is returned. Auth wins when both patterns appear
 * (a 403 body often also mentions a limit).
 */
export function providerSignalFromText(text: string | null | undefined): ProviderSignal {
  if (typeof text !== 'string' || text.length === 0) return null;
  const bounded = text.length > PROVIDER_SIGNAL_SCAN_MAX_CHARS ? text.slice(0, PROVIDER_SIGNAL_SCAN_MAX_CHARS) : text;
  if (AUTH_SIGNAL_RE.test(bounded)) return 'AUTH';
  if (QUOTA_SIGNAL_RE.test(bounded)) return 'QUOTA_OR_NAMESPACE';
  return null;
}

export interface ProviderFailureInput {
  readonly phase: ProviderCallPhase;
  readonly ok?: boolean;
  readonly reasonerClass?: ReasonerFailureClass | null;
  /** False when the provider is known absent from the live CLI registry. */
  readonly providerPresent?: boolean;
  /** Spawn error code when the local CLI could not be launched (e.g. ENOENT). */
  readonly spawnErrorCode?: string | null;
  readonly timedOut?: boolean;
  /** Bounded raw text to scan. Never retained; only the signal is returned. */
  readonly providerSignalText?: string | null;
  readonly exitCode?: number | null;
  readonly durationMs?: number | null;
  readonly stdoutBytes?: number;
  readonly stderrBytes?: number;
}

export interface ProviderFailureEvidence {
  readonly schemaVersion: typeof PROVIDER_FAILURE_CLASSIFICATION_VERSION;
  readonly class: ProviderFailureClass;
  readonly phase: ProviderCallPhase;
  readonly reasonerClass: ReasonerFailureClass | null;
  readonly providerSignal: ProviderSignal;
  readonly exitCode: number | null;
  readonly durationMs: number | null;
  readonly stdoutBytes: number;
  readonly stderrBytes: number;
}

const TIMEOUT_CLASSES: ReadonlySet<ReasonerFailureClass> = new Set(['TIMEOUT', 'HUNG_CHILD', 'HUNG_GRANDCHILD']);
const INVALID_RESPONSE_CLASSES: ReadonlySet<ReasonerFailureClass> = new Set([
  'MALFORMED_OUTPUT',
  'GARBAGE_OUTPUT',
  'OVERSIZE_OUTPUT',
  'PARTIAL_OUTPUT',
  'SECRET_ECHO',
  'UNKNOWN_INTENT',
  'UNSAFE_INTENT',
  'UNKNOWN_TOOL',
  'UNAUTHORIZED_ENVIRONMENT',
]);

function timeoutClassFor(phase: ProviderCallPhase): ProviderFailureClass {
  return phase === 'PROBE' ? 'PROVIDER_PROBE_TIMEOUT' : 'PROVIDER_RUNTIME_TIMEOUT';
}

/**
 * Classify exactly one provider outcome. Pure: no I/O, no clock, and the
 * returned evidence contains only enums, exit codes, durations, and byte
 * counts. A non-empty signalText is scanned for an enumerated signal only.
 */
export function classifyProviderFailure(input: ProviderFailureInput): ProviderFailureEvidence {
  const signal = providerSignalFromText(input.providerSignalText ?? null);
  const reasonerClass = input.reasonerClass ?? null;
  const evidence = (failureClass: ProviderFailureClass): ProviderFailureEvidence => ({
    schemaVersion: PROVIDER_FAILURE_CLASSIFICATION_VERSION,
    class: failureClass,
    phase: input.phase,
    reasonerClass,
    providerSignal: signal,
    exitCode: typeof input.exitCode === 'number' ? input.exitCode : null,
    durationMs: typeof input.durationMs === 'number' ? input.durationMs : null,
    stdoutBytes: typeof input.stdoutBytes === 'number' ? input.stdoutBytes : 0,
    stderrBytes: typeof input.stderrBytes === 'number' ? input.stderrBytes : 0,
  });

  if (input.ok === true) return evidence('VALID_PROVIDER_RESPONSE');
  if (input.providerPresent === false) return evidence('PROVIDER_ABSENT');
  if (input.spawnErrorCode === 'ENOENT') return evidence('PROVIDER_ABSENT');
  if (typeof input.spawnErrorCode === 'string' && input.spawnErrorCode.length > 0) return evidence('LOCAL_CLI_FAILURE');
  if (input.timedOut === true && reasonerClass === null) return evidence(timeoutClassFor(input.phase));
  if (reasonerClass === null) return evidence('UNKNOWN_EXTERNAL_PROVIDER_FAILURE');
  if (TIMEOUT_CLASSES.has(reasonerClass)) return evidence(timeoutClassFor(input.phase));
  if (reasonerClass === 'CLI_CRASH' || reasonerClass === 'CANCELLED') return evidence('LOCAL_CLI_FAILURE');
  if (reasonerClass === 'NONZERO_EXIT' || reasonerClass === 'PROVIDER_FAILURE') {
    if (signal === 'AUTH') return evidence('PROVIDER_AUTH_FAILURE');
    if (signal === 'QUOTA_OR_NAMESPACE') return evidence('PROVIDER_NAMESPACE_OR_QUOTA_UNAVAILABLE');
    return evidence(reasonerClass === 'NONZERO_EXIT' ? 'PROVIDER_NONZERO_EXIT' : 'UNKNOWN_EXTERNAL_PROVIDER_FAILURE');
  }
  if (INVALID_RESPONSE_CLASSES.has(reasonerClass)) return evidence('PROVIDER_INVALID_STRUCTURED_RESPONSE');
  return evidence('UNKNOWN_EXTERNAL_PROVIDER_FAILURE');
}
