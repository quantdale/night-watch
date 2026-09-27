// ---------------------------------------------------------------------------
// M6 (7.7/B-11/C-25) — the Safety Center authority.
//
// The Safety Center used to be projected from a frozen constant
// (`DEFAULT_CONTROL_CENTER_SAFETY_INPUT`), so it reported the same thing
// whether or not the owner-scope policy, the workspace integrity and the
// session protocol were actually in force. This authority MEASURES what this
// surface can mechanically observe and labels the rest NOT_MEASURED with a
// precise reason instead of asserting it.
//
// Read-only: no write, no network, no child process, no datastore.
// ---------------------------------------------------------------------------

import {
  FROZEN_OWNER_OPERATIONS,
  OWNER_SCOPE_POLICY_VERSION,
  OWNER_SCOPE_REASON,
  OWNER_SCOPE_STATUS,
} from '../../core/policy/ownerScope';
import type { SafetyAuthorityInput } from '../adapters/safetyAdapter';

export const SAFETY_AUTHORITY_VERSION = 'nightwatch.control-center.safety-authority.v1' as const;

/**
 * M6 (7.7/C-25): whether the currentness signal is actually wired to the
 * source-contract family-movement classification. `status:local` currentness
 * has no production caller supplying movement evidence, so this surface
 * reports NOT_WIRED rather than an implied CURRENT.
 */
export const SAFETY_CURRENTNESS_STATE = 'NOT_WIRED' as const;
export const SAFETY_CURRENTNESS_REASON = 'CURRENTNESS_REQUIRES_SOURCE_CONTRACT_MOVEMENT_EVIDENCE' as const;

export interface SafetyAuthority {
  /** The measured input for the Safety Center projection. */
  readonly input: () => SafetyAuthorityInput;
}

function measuredInput(): SafetyAuthorityInput {
  // Owner scope: MEASURED from the policy record itself. A version or status
  // change is visible here, which a constant could never show.
  const ownerScopeCheck = {
    checkCode: 'OWNER_SCOPE_POLICY',
    state: OWNER_SCOPE_STATUS === 'FROZEN_BY_OWNER' ? ('PASS' as const) : ('BLOCKED' as const),
    reasonCode: `${OWNER_SCOPE_STATUS}_${OWNER_SCOPE_REASON}_${OWNER_SCOPE_POLICY_VERSION.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()}`,
  };
  return {
    continuity: { state: 'UNKNOWN', branch: null, headSha: null, checkpointDigest: null },
    checks: [
      ownerScopeCheck,
      // Workspace integrity and the session protocol are OWNER-SURFACE
      // authorities (a Node CLI over the checkout and its Git metadata). A
      // loopback HTTP surface cannot observe them without gaining Git or
      // process authority it must not hold, so it reports NOT_MEASURED and
      // names the boundary rather than claiming a state it never read.
      {
        checkCode: 'WORKSPACE_INTEGRITY',
        state: 'NOT_MEASURED',
        reasonCode: 'WORKSPACE_INTEGRITY_IS_AN_OWNER_CLI_SURFACE',
      },
      {
        checkCode: 'SESSION_PROTOCOL',
        state: 'NOT_MEASURED',
        reasonCode: 'SESSION_PROTOCOL_IS_AN_OWNER_CLI_SURFACE',
      },
      {
        checkCode: 'CURRENTNESS_WIRING',
        state: SAFETY_CURRENTNESS_STATE === 'NOT_WIRED' ? 'NOT_MEASURED' : 'PASS',
        reasonCode: SAFETY_CURRENTNESS_REASON,
      },
    ],
    // The frozen operation classes come from the POLICY, never a hand-written
    // list beside it.
    blockedOperationClasses: FROZEN_OWNER_OPERATIONS.map((operation) =>
      String(operation).toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
    ),
  };
}

export function createSafetyAuthority(): SafetyAuthority {
  return { input: () => measuredInput() };
}

/** Test seam: the same measurement, exposed for a focused assertion. */
export function safetyAuthorityInputForTests(): SafetyAuthorityInput {
  return measuredInput();
}
