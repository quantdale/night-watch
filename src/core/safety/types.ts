// ---------------------------------------------------------------------------
// Nightwatch — safety kernel shared types.
//
// The outbound-request policy is INDEPENDENT of any application configuration
// inside Alphaus repos (ripple-ui cookies, SDK defaults, CLI flags...).
// The browser harness inspects EVERY request and asks the policy for a
// verdict before the request is allowed to proceed.
// ---------------------------------------------------------------------------

import type { EnvironmentConfig } from '../environment/types';

export type { EnvironmentConfig } from '../environment/types';

/**
 * Classification of the request target host.
 * - 'production'      : a known Alphaus production host or production-class
 *                       host (Cloud Run *.run.app, legacy *.mobingi.com).
 * - 'dev' | 'next'    : a dev/next host (only allowed in the matching env).
 * - 'local'           : localhost family (only allowed in the local env).
 * - 'unknown-alphaus' : an alphaus.cloud/mobingi.com host NOT in any list —
 *                       fail closed, treat as hostile.
 * - 'external'        : an unexpected external host — fail closed.
 * - 'static'          : explicitly classified harmless static asset.
 * - 'telemetry'       : explicitly classified telemetry/analytics host —
 *                       blocked (aborted), not failed.
 * - 'optional-third-party-support' : explicitly classified optional support
 *                       widget host — blocked (aborted), not failed.
 * - 'internal'        : non-http(s) scheme (data:, blob:, javascript:...).
 */
export type HostClass =
  | 'production'
  | 'dev'
  | 'next'
  | 'local'
  | 'unknown-alphaus'
  | 'external'
  | 'static'
  | 'telemetry'
  | 'optional-third-party-support'
  | 'internal';

/** Verdict for an inspected outbound request. */
export type Verdict = 'allow' | 'deny' | 'block-telemetry' | 'block-optional-support';

/** Non-fatal containment decisions. The request is still stopped locally. */
export function isNonFatalBlock(verdict: Verdict): boolean {
  return verdict === 'block-telemetry' || verdict === 'block-optional-support';
}

export interface OutboundDecision {
  verdict: Verdict;
  hostClass: HostClass;
  /** Normalized host (lowercase hostname, no port). */
  host: string;
  /** Human-readable reason, safe to persist (no secrets). */
  reason: string;
}
