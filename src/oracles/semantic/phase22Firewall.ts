// Phase 22 — second semantic privacy boundary.
//
// The existing hook owns the transient raw-text -> projection operation. This
// firewall is the next boundary: only a closed categorical observation and a
// bounded privacy receipt may leave the hook toward a real-campaign ledger or
// owner artifact. It has no body, DOM, header, cookie, set-member or customer
// value input and therefore cannot accidentally forward one.

import {
  createPhase22PrivacyReceipt,
  guardPhase22SafeObservation,
  type Phase22PrivacyReceipt,
  type Phase22SafeObservation,
} from '../../core/phase22';
import type { SemanticHookResult } from './hook';

export interface Phase22FirewallResult {
  readonly result: SemanticHookResult;
  readonly observation: Phase22SafeObservation;
  readonly privacyReceipt: Phase22PrivacyReceipt;
  readonly privacyViolation: boolean;
}

function categoryFor(result: SemanticHookResult): Phase22SafeObservation {
  const outcome = result.receipt?.outcome;
  const relationOutcome = outcome === 'PASS'
    ? 'HOLDS' as const
    : outcome === 'ANOMALY'
      ? 'VIOLATED' as const
      : outcome === 'NOT_APPLICABLE'
        ? 'NOT_APPLICABLE' as const
        : 'UNKNOWN' as const;
  const receipt = result.receipt;
  const projectionDigest = receipt?.projectionDigests[0];
  const evidenceDigest = receipt?.sourceProvenance?.evidenceDigest;
  return {
    schemaVersion: 'nightwatch.real-observation-privacy.v1',
    relationOutcome,
    ...(projectionDigest === undefined ? {} : { projectionDigest }),
    ...(evidenceDigest === undefined ? {} : { evidenceDigest }),
    ...(receipt?.inspectedItemCount === undefined ? {} : { inspectedItemCount: receipt.inspectedItemCount }),
    ...(receipt?.violatingItemCount === undefined ? {} : { violatingItemCount: receipt.violatingItemCount }),
  };
}

export function guardPhase22SemanticHookResult(result: SemanticHookResult): Phase22FirewallResult {
  try {
    const observation = guardPhase22SafeObservation(categoryFor(result));
    const privacyReceipt = createPhase22PrivacyReceipt({
      approvedCategoryCount: 1,
      rejectedEventCount: result.privacyViolation === true ? 1 : 0,
    });
    return {
      result,
      observation,
      privacyReceipt,
      privacyViolation: result.privacyViolation === true,
    };
  } catch {
    // Do not turn an unexpected category/receipt shape into a benign empty
    // result. The safe UNKNOWN category is the only fallback and the receipt
    // records a privacy event for the owner safety path.
    const observation = guardPhase22SafeObservation({
      schemaVersion: 'nightwatch.real-observation-privacy.v1',
      relationOutcome: 'UNKNOWN',
    });
    return {
      result,
      observation,
      privacyReceipt: createPhase22PrivacyReceipt({ approvedCategoryCount: 1, rejectedEventCount: 1 }),
      privacyViolation: true,
    };
  }
}
