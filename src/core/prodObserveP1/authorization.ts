// ---------------------------------------------------------------------------
// Nightwatch MA-8 / F-13 — the `P1_OBSERVE` authorization class.
//
// A grant is finite, explicitly scoped, expiring and ONE-SHOT. Reuse fails
// with `P1_ALREADY_CONSUMED`.
//
// Unforgeable at RUNTIME, not merely in the type system (the DEF-C10-5
// lesson, via C-11): a module-private registry holds the identities this
// module actually minted. An object that merely looks like a grant is not
// one. Consumption is a STATE TRANSITION on the registry, not a flag on the
// object.
//
// This module DUPLICATES the C-11 registry pattern rather than importing it.
// The C-11 reverse-isolation rule fails any non-test file outside
// `src/core/prodObserve/` that imports `core/prodObserve`, and extending its
// allowlist would weaken a certified rule. The class is also deliberately
// distinct from `PROD_OBSERVE`, so P1 authority can never alias request
// authority in either direction.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import {
  P1_OBSERVE_AUTHORIZATION_CLASS,
  P1_OBSERVATION_STAGE,
  type P1ObserveAuthorizationClass,
  type P1ObservationStage,
} from './types';

export const P1_OBSERVE_GRANT_VERSION = 'nightwatch.p1-observe-grant.v1' as const;

export type P1GrantLifecycleState = 'ISSUED' | 'CONSUMED' | 'REVOKED';

export interface P1ObserveGrant {
  readonly schemaVersion: typeof P1_OBSERVE_GRANT_VERSION;
  readonly authorizationClass: P1ObserveAuthorizationClass;
  readonly grantId: string;
  readonly campaignId: string;
  readonly stage: P1ObservationStage;
  /** Exact Nightwatch implementation SHA this grant is bound to. Compared by `P1_IMPLEMENTATION_IDENTITY`. */
  readonly implementationSha: string;
  /** Digest of the PQ qualification receipt this P1 session is bound to. Compared by `P1_PQ_BINDING`. */
  readonly pqReceiptDigest: string;
  readonly notBeforeMs: number;
  readonly expiresAtMs: number;
}

interface P1RegistryEntry {
  readonly grant: P1ObserveGrant;
  state: P1GrantLifecycleState;
}

// Module-private. Nothing outside this file can reach it, so authority cannot
// be minted or revived from a shape.
const registry = new Map<string, P1RegistryEntry>();

const GRANT_ID_RE = /^p1o_[0-9a-f]{32}$/;
const SHA_RE = /^[0-9a-f]{40}$/;

export interface IssueP1GrantRequest {
  readonly campaignId: string;
  readonly implementationSha: string;
  readonly pqReceiptDigest: string;
  readonly notBeforeMs: number;
  readonly expiresAtMs: number;
}

export function issueP1ObserveGrant(request: IssueP1GrantRequest): P1ObserveGrant {
  if (typeof request.campaignId !== 'string' || request.campaignId.trim() === '') {
    throw new Error('P1_GRANT_CAMPAIGN_ID_INVALID');
  }
  if (!SHA_RE.test(request.implementationSha)) throw new Error('P1_GRANT_IMPLEMENTATION_SHA_INVALID');
  if (typeof request.pqReceiptDigest !== 'string' || request.pqReceiptDigest.trim() === '') {
    throw new Error('P1_GRANT_PQ_RECEIPT_DIGEST_INVALID');
  }
  if (
    typeof request.notBeforeMs !== 'number' ||
    typeof request.expiresAtMs !== 'number' ||
    !Number.isFinite(request.notBeforeMs) ||
    !Number.isFinite(request.expiresAtMs) ||
    request.expiresAtMs <= request.notBeforeMs
  ) {
    throw new Error('P1_GRANT_WINDOW_INVALID');
  }
  const grant: P1ObserveGrant = Object.freeze({
    schemaVersion: P1_OBSERVE_GRANT_VERSION,
    authorizationClass: P1_OBSERVE_AUTHORIZATION_CLASS,
    grantId: `p1o_${crypto.randomBytes(16).toString('hex')}`,
    campaignId: request.campaignId,
    stage: P1_OBSERVATION_STAGE,
    implementationSha: request.implementationSha,
    pqReceiptDigest: request.pqReceiptDigest,
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
export function isRegisteredP1Grant(candidate: unknown): candidate is P1ObserveGrant {
  if (candidate === null || typeof candidate !== 'object') return false;
  const value = candidate as Partial<P1ObserveGrant>;
  if (typeof value.grantId !== 'string' || !GRANT_ID_RE.test(value.grantId)) return false;
  const entry = registry.get(value.grantId);
  return entry !== undefined && entry.grant === candidate;
}

export function p1GrantLifecycleState(candidate: unknown): P1GrantLifecycleState | 'UNREGISTERED' {
  if (!isRegisteredP1Grant(candidate)) return 'UNREGISTERED';
  const entry = registry.get((candidate as P1ObserveGrant).grantId);
  return entry === undefined ? 'UNREGISTERED' : entry.state;
}

export type P1GrantValidation =
  | { readonly ok: true; readonly grant: P1ObserveGrant }
  | {
      readonly ok: false;
      readonly denialCode:
        | 'P1_AUTHORIZATION_ABSENT'
        | 'P1_AUTHORIZATION_EXPIRED'
        | 'P1_AUTHORIZATION_SCOPE_MISMATCH'
        | 'P1_ALREADY_CONSUMED';
    };

export interface P1GrantValidationRequest {
  readonly candidate: unknown;
  readonly campaignId: string;
  readonly nowMs: number;
}

/**
 * Validate without consuming. The clock is injected, so expiry is testable
 * without waiting and without a fake timer. Scope here is the campaign only:
 * implementation identity and PQ binding have their own gates (each gate must
 * be individually falsifiable, the DEF-C11-1/DEF-C11-2 lesson).
 */
export function validateP1ObserveGrant(request: P1GrantValidationRequest): P1GrantValidation {
  if (!isRegisteredP1Grant(request.candidate)) {
    return { ok: false, denialCode: 'P1_AUTHORIZATION_ABSENT' };
  }
  const grant = request.candidate;
  const entry = registry.get(grant.grantId);
  if (entry === undefined || entry.state === 'REVOKED' || entry.state === 'CONSUMED') {
    return { ok: false, denialCode: 'P1_ALREADY_CONSUMED' };
  }
  if (request.nowMs < grant.notBeforeMs || request.nowMs >= grant.expiresAtMs) {
    return { ok: false, denialCode: 'P1_AUTHORIZATION_EXPIRED' };
  }
  if (grant.campaignId !== request.campaignId) {
    return { ok: false, denialCode: 'P1_AUTHORIZATION_SCOPE_MISMATCH' };
  }
  return { ok: true, grant };
}

/**
 * Consume a grant. Idempotence is deliberately NOT provided: a second call
 * fails, because that is exactly the property under test.
 */
export function consumeP1ObserveGrant(
  candidate: unknown,
): { readonly ok: boolean; readonly denialCode: 'P1_ALREADY_CONSUMED' | 'P1_AUTHORIZATION_ABSENT' | null } {
  if (!isRegisteredP1Grant(candidate)) return { ok: false, denialCode: 'P1_AUTHORIZATION_ABSENT' };
  const entry = registry.get((candidate as P1ObserveGrant).grantId);
  if (entry === undefined || entry.state !== 'ISSUED') {
    return { ok: false, denialCode: 'P1_ALREADY_CONSUMED' };
  }
  entry.state = 'CONSUMED';
  return { ok: true, denialCode: null };
}

export function revokeP1ObserveGrant(candidate: unknown): void {
  if (!isRegisteredP1Grant(candidate)) return;
  const entry = registry.get((candidate as P1ObserveGrant).grantId);
  if (entry !== undefined) entry.state = 'REVOKED';
}

/**
 * TEST ONLY. NOT A PRODUCTION AUTHORITY PATH.
 */
export function clearP1ObserveGrantRegistryForTest(): void {
  registry.clear();
}
