// ---------------------------------------------------------------------------
// Nightwatch Phase 9B — pre-dev metadata-only readiness gate (SPEC §19, §45,
// §46).
//
// Before a browser context is opened the runner produces this metadata-only
// readiness result. The evaluator is PURE (no I/O): the runner collects local
// facts (git HEAD cleanliness, exact implementation CI status, source
// freshness verdict, derivation/resolution counts, auth structural booleans,
// proxy health, canonical target equality, trace/screenshot policy) and
// injects them. ANY failing check means NO DEV CONTACT.
//
// This module performs no network, no fs, no child processes, and no
// persistence (hardening-guarded).
// ---------------------------------------------------------------------------

import type { Phase9bFreshnessVerdict } from './freshness';

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface Phase9bPreflightFacts {
  /** Nightwatch worktree clean (git status --porcelain empty). */
  readonly nightwatchHeadClean: boolean;
  /** Exact-head implementation CI completed successfully. */
  readonly implementationCiGreen: boolean;
  /** Source-freshness verdict: USE_REVIEWED_SNAPSHOT or REDERIVE_FRESH_SNAPSHOT. */
  readonly freshness: Phase9bFreshnessVerdict;
  /** The exact selected target identity (ripple.common-exchange.read). */
  readonly targetId: string;
  /** Derived real-source expectations for the selected target (must be 1). */
  readonly derivedExpectationCount: number;
  /** Resolver RESOLVED count for the selected target (must be 1). */
  readonly resolvedExpectationCount: number;
  /** Selected target is DEV-reachable through a reviewed journey rule. */
  readonly devReachable: boolean;
  /** Selected target rule classification is KNOWN_READ. */
  readonly knownRead: boolean;
  /** Mutation steps in the selected journey contract (must be 0). */
  readonly mutationStepCount: number;
  /** External auth state passed the structural/boolean gate. */
  readonly authStructuralPass: boolean;
  /** Mandatory loopback proxy runtime is healthy. */
  readonly proxyHealthy: boolean;
  /** UI target equals the canonical verified DEV URL exactly. */
  readonly targetExact: boolean;
  /** Authenticated traces enabled (must be false). */
  readonly tracesEnabled: boolean;
  /** Screenshots enabled (must be false). */
  readonly screenshotsEnabled: boolean;
}

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface Phase9bPreflightCheck {
  readonly name: string;
  readonly status: 'PASS' | 'FAIL';
  readonly detail: string;
}

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface Phase9bPreflightResult {
  readonly pass: boolean;
  readonly checks: readonly Phase9bPreflightCheck[];
}

function check(name: string, pass: boolean, detail: string): Phase9bPreflightCheck {
  return { name, status: pass ? 'PASS' : 'FAIL', detail };
}

/** Evaluate the Phase 9B pre-dev readiness gate. Performs no I/O. */
export function evaluatePhase9bPreflight(facts: Phase9bPreflightFacts): Phase9bPreflightResult {
  const checks: Phase9bPreflightCheck[] = [];
  checks.push(
    check('nightwatch-head-clean', facts.nightwatchHeadClean, facts.nightwatchHeadClean ? 'worktree clean' : 'worktree has changes')
  );
  checks.push(
    check('implementation-ci-green', facts.implementationCiGreen, facts.implementationCiGreen ? 'exact-head implementation CI green' : 'exact-head implementation CI not green')
  );
  const freshnessOk = facts.freshness.kind !== 'BLOCK';
  checks.push(
    check(
      'source-freshness',
      freshnessOk,
      freshnessOk ? `source freshness ${facts.freshness.kind} @ ${facts.freshness.sha}` : 'source freshness BLOCKED'
    )
  );
  checks.push(
    check(
      'real-expectation-derived',
      facts.derivedExpectationCount === 1,
      `selected target derived expectations: ${facts.derivedExpectationCount} (require 1)`
    )
  );
  checks.push(
    check(
      'real-expectation-current',
      facts.resolvedExpectationCount === 1,
      `selected target resolver RESOLVED: ${facts.resolvedExpectationCount} (require 1)`
    )
  );
  checks.push(check('target-dev-reachable', facts.devReachable, facts.devReachable ? 'selected target DEV-reachable via reviewed journey rule' : 'selected target not DEV-reachable'));
  checks.push(check('target-known-read', facts.knownRead, facts.knownRead ? 'selected target classified KNOWN_READ' : 'selected target is not KNOWN_READ'));
  checks.push(check('mutation-target-count', facts.mutationStepCount === 0, `mutation steps in journey contract: ${facts.mutationStepCount} (require 0)`));
  checks.push(check('auth-structural-gate', facts.authStructuralPass, facts.authStructuralPass ? 'external auth state structurally valid' : 'auth structural gate FAILED'));
  checks.push(check('proxy-runtime-healthy', facts.proxyHealthy, facts.proxyHealthy ? 'mandatory loopback proxy healthy' : 'proxy runtime unhealthy'));
  checks.push(check('canonical-dev-target-exact', facts.targetExact, facts.targetExact ? 'UI target exactly the canonical verified DEV URL' : 'UI target differs from canonical DEV URL'));
  checks.push(check('traces-disabled', !facts.tracesEnabled, facts.tracesEnabled ? 'authenticated traces ENABLED (forbidden)' : 'traces disabled'));
  checks.push(check('screenshots-disabled', !facts.screenshotsEnabled, facts.screenshotsEnabled ? 'screenshots ENABLED (forbidden)' : 'screenshots disabled'));
  return { pass: checks.every((item) => item.status === 'PASS'), checks };
}

/** Throw a safe, precise error naming only the failing check names/details. */
// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
class Phase9bPreflightError extends Error {
  constructor(result: Phase9bPreflightResult) {
    const failures = result.checks
      .filter((item) => item.status === 'FAIL')
      .map((item) => `${item.name}: ${item.detail}`)
      .join('; ');
    super(`Phase 9B pre-dev readiness gate FAILED: ${failures}`);
    this.name = 'Phase9bPreflightError';
  }
}

export function assertPhase9bPreflight(result: Phase9bPreflightResult): void {
  if (!result.pass) throw new Phase9bPreflightError(result);
}
