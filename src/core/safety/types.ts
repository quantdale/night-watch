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
 * - 'browser-background-*' : one of the three exact reviewed Chromium
 *                       browser-background hosts — blocked (aborted), not
 *                       failed. Related hosts are not covered.
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
  | 'browser-background-google'
  | 'browser-background-update'
  | 'browser-background-download'
  | 'internal';

/** Uppercase semantic category persisted in sanitized policy evidence. */
export type SemanticClassification =
  | 'EXPECTED'
  | 'TELEMETRY'
  | 'BROWSER_BACKGROUND_GOOGLE'
  | 'BROWSER_BACKGROUND_UPDATE'
  | 'BROWSER_BACKGROUND_DOWNLOAD'
  | 'OPTIONAL_THIRD_PARTY_SUPPORT'
  | 'UNKNOWN'
  | 'PRODUCTION_DENIED';

export type BrowserBackgroundClassification = Extract<
  SemanticClassification,
  `BROWSER_BACKGROUND_${string}`
>;

export interface BrowserBackgroundHostConfig {
  /** Exact hostname only; wildcard entries are rejected by config validation. */
  host: string;
  classification: BrowserBackgroundClassification;
}

/** Verdict for an inspected outbound request. */
export type Verdict = 'allow' | 'deny' | 'block-telemetry' | 'block-optional-support' | 'block-browser-background';

/** Non-fatal containment decisions. The request is still stopped locally. */
export function isNonFatalBlock(verdict: Verdict): boolean {
  return verdict === 'block-telemetry' || verdict === 'block-optional-support' || verdict === 'block-browser-background';
}

export function isBrowserBackgroundClassification(value: string): value is BrowserBackgroundClassification {
  return (
    value === 'BROWSER_BACKGROUND_GOOGLE' ||
    value === 'BROWSER_BACKGROUND_UPDATE' ||
    value === 'BROWSER_BACKGROUND_DOWNLOAD'
  );
}

export function browserBackgroundHostClass(classification: BrowserBackgroundClassification): Extract<
  HostClass,
  `browser-background-${string}`
> {
  if (classification === 'BROWSER_BACKGROUND_GOOGLE') return 'browser-background-google';
  if (classification === 'BROWSER_BACKGROUND_UPDATE') return 'browser-background-update';
  return 'browser-background-download';
}

export function semanticClassificationForHostClass(hostClass: HostClass): SemanticClassification {
  if (hostClass === 'production') return 'PRODUCTION_DENIED';
  if (hostClass === 'telemetry') return 'TELEMETRY';
  if (hostClass === 'optional-third-party-support') return 'OPTIONAL_THIRD_PARTY_SUPPORT';
  if (hostClass === 'browser-background-google') return 'BROWSER_BACKGROUND_GOOGLE';
  if (hostClass === 'browser-background-update') return 'BROWSER_BACKGROUND_UPDATE';
  if (hostClass === 'browser-background-download') return 'BROWSER_BACKGROUND_DOWNLOAD';
  if (hostClass === 'dev' || hostClass === 'next' || hostClass === 'local' || hostClass === 'static' || hostClass === 'internal') return 'EXPECTED';
  return 'UNKNOWN';
}

export interface OutboundDecision {
  verdict: Verdict;
  hostClass: HostClass;
  classification: SemanticClassification;
  /** Normalized host (lowercase hostname, no port). */
  host: string;
  /** Human-readable reason, safe to persist (no secrets). */
  reason: string;
}
