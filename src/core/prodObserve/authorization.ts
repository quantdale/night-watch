// ---------------------------------------------------------------------------
// Nightwatch C-11 — the `PROD_OBSERVE` authorization class.
//
// A grant is finite, explicitly scoped, expiring and ONE-SHOT. Reuse fails
// with `ALREADY_CONSUMED`.
//
// Two properties matter more than the field list.
//
// Unforgeable at RUNTIME, not merely in the type system. C-10.5 learned this
// the hard way (DEF-C10-5, A2): a shape-valid object revived from JSON was
// accepted as authority because the check was structural. A branded TypeScript
// interface disappears at runtime, so a module-private registry holds the
// identities this module actually minted. An object that merely looks like a
// grant is not one.
//
// Consumption is a STATE TRANSITION on the registry, not a flag on the object.
// A caller holding a grant reference cannot un-consume it by mutating what it
// holds, and a structurally identical copy does not carry the consumed state.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import {
  PROD_OBSERVE_AUTHORIZATION_CLASS,
  type ProdObserveAuthorizationClass,
  type ProductionObservationStage,
} from './types';

export const PROD_OBSERVE_GRANT_VERSION = 'nightwatch.prod-observe-grant.v1' as const;

export type GrantLifecycleState = 'ISSUED' | 'CONSUMED' | 'REVOKED';

export interface ProdObserveGrant {
  readonly schemaVersion: typeof PROD_OBSERVE_GRANT_VERSION;
  readonly authorizationClass: ProdObserveAuthorizationClass;
  /** Opaque identity. Never a credential, never a customer value. */
  readonly grantId: string;
  readonly campaignId: string;
  readonly stage: ProductionObservationStage;
  readonly notBeforeMs: number;
  readonly expiresAtMs: number;
}

interface RegistryEntry {
  readonly grant: ProdObserveGrant;
  state: GrantLifecycleState;
}

// Module-private. Nothing outside this file can reach it, so authority cannot
// be minted or revived from a shape.
const registry = new Map<string, RegistryEntry>();

const GRANT_ID_RE = /^pog_[0-9a-f]{32}$/;

export interface IssueGrantRequest {
  readonly campaignId: string;
  readonly stage: ProductionObservationStage;
  readonly notBeforeMs: number;
  readonly expiresAtMs: number;
}

export function issueProdObserveGrant(request: IssueGrantRequest): ProdObserveGrant {
  if (typeof request.campaignId !== 'string' || request.campaignId.trim() === '') {
    throw new Error('PROD_OBSERVE_GRANT_CAMPAIGN_INVALID');
  }
  if (!Number.isFinite(request.notBeforeMs) || !Number.isFinite(request.expiresAtMs)) {
    throw new Error('PROD_OBSERVE_GRANT_WINDOW_INVALID');
  }
  // A grant that never expires is not finite, and a reversed window would make
  // every comparison vacuous.
  if (request.expiresAtMs <= request.notBeforeMs) {
    throw new Error('PROD_OBSERVE_GRANT_WINDOW_INVALID');
  }
  const grant: ProdObserveGrant = Object.freeze({
    schemaVersion: PROD_OBSERVE_GRANT_VERSION,
    authorizationClass: PROD_OBSERVE_AUTHORIZATION_CLASS,
    grantId: `pog_${crypto.randomBytes(16).toString('hex')}`,
    campaignId: request.campaignId,
    stage: request.stage,
    notBeforeMs: request.notBeforeMs,
    expiresAtMs: request.expiresAtMs,
  });
  registry.set(grant.grantId, { grant, state: 'ISSUED' });
  return grant;
}

/**
 * Is this exact object one this module minted, and is it still the registered
 * grant for its id? A structurally identical copy fails, because identity is
 * held by the registry rather than by the shape.
 */
export function isRegisteredGrant(candidate: unknown): candidate is ProdObserveGrant {
  if (candidate === null || typeof candidate !== 'object') return false;
  const grantId = (candidate as { grantId?: unknown }).grantId;
  if (typeof grantId !== 'string' || !GRANT_ID_RE.test(grantId)) return false;
  const entry = registry.get(grantId);
  return entry !== undefined && entry.grant === candidate;
}

export function grantLifecycleState(candidate: unknown): GrantLifecycleState | 'UNREGISTERED' {
  if (!isRegisteredGrant(candidate)) return 'UNREGISTERED';
  return registry.get(candidate.grantId)?.state ?? 'UNREGISTERED';
}

export type GrantValidation =
  | { readonly ok: true; readonly grant: ProdObserveGrant }
  | { readonly ok: false; readonly denialCode: 'AUTHORIZATION_ABSENT' | 'AUTHORIZATION_EXPIRED' | 'AUTHORIZATION_SCOPE_MISMATCH' | 'ALREADY_CONSUMED' };

export interface GrantValidationRequest {
  readonly candidate: unknown;
  readonly campaignId: string;
  readonly nowMs: number;
}

/**
 * Validate without consuming. The clock is injected, so expiry is testable
 * without waiting and without a fake timer.
 */
export function validateProdObserveGrant(request: GrantValidationRequest): GrantValidation {
  if (!isRegisteredGrant(request.candidate)) return { ok: false, denialCode: 'AUTHORIZATION_ABSENT' };
  const state = grantLifecycleState(request.candidate);
  // Consumption and revocation are checked BEFORE the window, so a consumed
  // grant reports `ALREADY_CONSUMED` rather than the less specific expiry.
  if (state === 'CONSUMED') return { ok: false, denialCode: 'ALREADY_CONSUMED' };
  if (state === 'REVOKED') return { ok: false, denialCode: 'AUTHORIZATION_ABSENT' };
  const grant = request.candidate;
  if (grant.campaignId !== request.campaignId) return { ok: false, denialCode: 'AUTHORIZATION_SCOPE_MISMATCH' };
  if (request.nowMs < grant.notBeforeMs || request.nowMs >= grant.expiresAtMs) {
    return { ok: false, denialCode: 'AUTHORIZATION_EXPIRED' };
  }
  return { ok: true, grant };
}

/**
 * Consume a grant. Idempotence is deliberately NOT provided: a second call
 * fails, because that is exactly the property under test.
 */
export function consumeProdObserveGrant(candidate: unknown): { readonly ok: boolean; readonly denialCode: 'ALREADY_CONSUMED' | 'AUTHORIZATION_ABSENT' | null } {
  if (!isRegisteredGrant(candidate)) return { ok: false, denialCode: 'AUTHORIZATION_ABSENT' };
  const entry = registry.get(candidate.grantId);
  if (entry === undefined) return { ok: false, denialCode: 'AUTHORIZATION_ABSENT' };
  if (entry.state !== 'ISSUED') return { ok: false, denialCode: 'ALREADY_CONSUMED' };
  entry.state = 'CONSUMED';
  return { ok: true, denialCode: null };
}

export function revokeProdObserveGrant(candidate: unknown): void {
  if (!isRegisteredGrant(candidate)) return;
  const entry = registry.get(candidate.grantId);
  if (entry !== undefined && entry.state === 'ISSUED') entry.state = 'REVOKED';
}

/**
 * TEST ONLY. NOT A PRODUCTION AUTHORITY PATH.
 *
 * Clears the module-private registry between cases so grant identity cannot
 * leak across tests. It grants nothing: it can only FORGET authority, never
 * mint or un-consume it.
 */
export function clearProdObserveGrantRegistryForTest(): void {
  registry.clear();
}
