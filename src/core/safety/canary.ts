// ---------------------------------------------------------------------------
// Nightwatch — policy-logic canary.
//
// The canary tests POLICY LOGIC ONLY: it calls OutboundPolicy.decide() on
// synthetic URLs and compares verdicts. NO REQUEST IS EVER SENT — zero
// network I/O. It exists to catch a compromised or regressed allowlist
// before any real navigation happens.
// ---------------------------------------------------------------------------

import type { OutboundPolicy } from './outboundPolicy';
import type { OutboundDecision, Verdict } from './types';
import { KNOWN_PRODUCTION_HOSTS, DEV_HOSTS, NEXT_HOSTS } from './hosts';

export interface CanaryCheck {
  label: string;
  url: string;
  expected: Verdict;
}

export interface CanaryFailure {
  label: string;
  expected: Verdict;
  decision: OutboundDecision;
}

export interface CanaryResult {
  pass: boolean;
  total: number;
  failures: CanaryFailure[];
}

/**
 * Default check set: every known production host must be denied, every
 * dev/next host must be allowed ONLY in its own environment, localhost is
 * allowed ONLY in 'local', and every allowlisted entry must be allowed.
 */
export function defaultCanaryChecks(policy: OutboundPolicy): CanaryCheck[] {
  const env = policy.environment;
  const checks: CanaryCheck[] = [];

  for (const host of KNOWN_PRODUCTION_HOSTS) {
    checks.push({ label: `prod: ${host}`, url: `https://${host}/m/ripple`, expected: 'deny' });
  }

  checks.push({
    label: 'cloud-run: billing-prod-abcdef012.run.app',
    url: 'https://billing-prod-abcdef012.run.app/',
    expected: 'deny',
  });
  checks.push({
    label: 'unknown-alphaus: random-host-xyz.alphaus.cloud',
    url: 'https://random-host-xyz.alphaus.cloud/',
    expected: 'deny',
  });
  checks.push({ label: 'external: example.invalid', url: 'https://example.invalid/', expected: 'deny' });
  checks.push({ label: 'legacy-mobingi: anything.mobingi.com', url: 'https://anything.mobingi.com/x', expected: 'deny' });

  for (const host of DEV_HOSTS) {
    checks.push({
      label: `dev: ${host}`,
      url: `https://${host}/m/ripple`,
      expected: env.name === 'dev' ? 'allow' : 'deny',
    });
  }

  for (const host of NEXT_HOSTS) {
    checks.push({
      label: `next: ${host}`,
      url: `https://${host}/`,
      expected: env.name === 'next' ? 'allow' : 'deny',
    });
  }

  checks.push({ label: 'local: 127.0.0.1', url: 'http://127.0.0.1:1/', expected: env.name === 'local' ? 'allow' : 'deny' });
  checks.push({ label: 'local: localhost', url: 'http://localhost:1/', expected: env.name === 'local' ? 'allow' : 'deny' });

  for (const entry of env.allowedHosts) {
    checks.push({ label: `allowlisted: ${entry}`, url: `https://${entry}/`, expected: 'allow' });
  }

  return checks;
}

/** Run the canary: decide() every check URL and collect mismatches. */
export function runCanary(policy: OutboundPolicy, checks?: CanaryCheck[]): CanaryResult {
  const list = checks ?? defaultCanaryChecks(policy);
  const failures: CanaryFailure[] = [];
  for (const check of list) {
    const decision = policy.decide(check.url);
    if (decision.verdict !== check.expected) {
      failures.push({ label: check.label, expected: check.expected, decision });
    }
  }
  return { pass: failures.length === 0, total: list.length, failures };
}

/** Thrown by assertCanary when the canary does not pass. */
export class CanaryFailureError extends Error {
  constructor(result: CanaryResult) {
    const lines = result.failures.map(
      (f) => `  - ${f.label}: expected ${f.expected}, got ${f.decision.verdict} (${f.decision.hostClass}: ${f.decision.reason})`
    );
    super(`policy canary FAILED: ${result.failures.length}/${result.total} checks failed\n${lines.join('\n')}`);
    this.name = 'CanaryFailureError';
  }
}

/** Fail-closed gate: throw CanaryFailureError when the canary does not pass. */
export function assertCanary(result: CanaryResult): void {
  if (!result.pass) throw new CanaryFailureError(result);
}
