// ---------------------------------------------------------------------------
// Nightwatch C-10.5 (A4) — trusted derivation of production route
// vocabularies from C-02a source intelligence.
//
// This module sits OUTSIDE the C-10 privacy cone by design (A8). It is the
// only place allowed to turn a source-intelligence result into a production
// route capability, and it hands the cone a plain immutable evidence record
// rather than a capability, so no authority flows inward.
//
// The rule it enforces: a route template becomes production-authoritative
// only when a mechanically admitted source operation established it. The
// caller supplies operations and completeness — never a provenance digest,
// which the cone computes.
// ---------------------------------------------------------------------------

import {
  deriveProvenRouteVocabulary,
  type ProvenRouteVocabulary,
} from '../prodPrivacy/routeVocabulary';
import type {
  ValidatedSourceEvidence,
  SourceCurrencyState,
} from '../prodPrivacy/vocabularyAuthority';
import type {
  SourceOperationDescriptor,
  SourceOperationProjectionCompleteness,
} from '../source/surfaceTypes';
import type { GenerationCurrency } from '../source/generatedArtifact';

/** Why a derivation refused to produce a production route vocabulary. */
export const ROUTE_DERIVATION_DENIAL_CODES = [
  'NO_ADMITTED_OPERATIONS',
  'INVENTORY_NOT_COMPLETE',
  'INVENTORY_TRUNCATED',
  'REMAINDER_UNKNOWN',
  'OPERATION_ID_MISSING',
  'OPERATION_REPOSITORY_MIXED',
  'OPERATION_SOURCE_SHA_MIXED',
  'GENERATION_NOT_CURRENT',
  'PHP_ROUTE_PROOF_UNAVAILABLE',
] as const;
export type RouteDerivationDenialCode = (typeof ROUTE_DERIVATION_DENIAL_CODES)[number];

export class RouteDerivationDenied extends Error {
  readonly denialCode: RouteDerivationDenialCode;
  constructor(denialCode: RouteDerivationDenialCode) {
    super(`ROUTE_VOCABULARY_DERIVATION_DENIED:${denialCode}`);
    this.name = 'RouteDerivationDenied';
    this.denialCode = denialCode;
  }
}

function deny(code: RouteDerivationDenialCode): never {
  throw new RouteDerivationDenied(code);
}

/**
 * The canonical route member form. Method and template together, because a
 * template alone is not an operation identity: `GET /v1/x` and
 * `DELETE /v1/x` are different authority.
 */
export function canonicalRouteMember(operation: {
  readonly method: string;
  readonly routeTemplate: string;
}): string {
  return `${operation.method} ${operation.routeTemplate}`;
}

/**
 * Map C-02a's generation currency onto the cone's currency vocabulary.
 * Anything short of `CURRENT` stays short of it — there is no promotion.
 */
function currencyFor(
  qualifier: 'DIRECT_SOURCE' | 'GENERATED_ARTIFACT',
  currency: GenerationCurrency | null,
): SourceCurrencyState {
  if (qualifier === 'DIRECT_SOURCE') return 'NOT_APPLICABLE';
  if (currency === null) return 'UNKNOWN';
  if (currency.state === 'CURRENT') return 'CURRENT';
  if (currency.state === 'STALE') return 'STALE';
  return 'UNKNOWN';
}

/**
 * Derive an OpenAPI-operation route vocabulary.
 *
 * Establishes, per A4: repository identity, source root, source snapshot
 * identity, evidence class, inventory-completeness state, generation
 * currentness, operation identity (`operationId`), HTTP method, path
 * template, the canonical members, and — inside the cone — a canonical digest
 * Nightwatch computes itself.
 *
 * Fails closed rather than inventing completeness.
 */
export function deriveOpenApiRouteVocabulary(input: {
  readonly operations: readonly SourceOperationDescriptor[];
  readonly completeness: SourceOperationProjectionCompleteness;
  readonly sourceRoot: string;
  readonly generationCurrency: GenerationCurrency | null;
}): ProvenRouteVocabulary {
  const { operations, completeness } = input;
  if (!Array.isArray(operations) || operations.length === 0) deny('NO_ADMITTED_OPERATIONS');

  // Completeness gates authority. A partial enumeration cannot establish that
  // a route set is finite and closed, so it denies rather than granting a
  // narrower vocabulary over what happened to be seen.
  if (completeness.truncated) deny('INVENTORY_TRUNCATED');
  if (completeness.remainingUnknown) deny('REMAINDER_UNKNOWN');
  if (completeness.state !== 'COMPLETE') deny('INVENTORY_NOT_COMPLETE');
  if (completeness.enumerationCompleteness !== 'COMPLETE') deny('INVENTORY_NOT_COMPLETE');
  if (completeness.contentReadCompleteness !== 'COMPLETE') deny('INVENTORY_NOT_COMPLETE');

  // One vocabulary binds to ONE source snapshot. A mixed-repository or
  // mixed-SHA population cannot be bound to a single source identity, so it
  // cannot be given one.
  const repository = operations[0]!.repository;
  const sourceSha = operations[0]!.sourceSha;
  for (const operation of operations) {
    if (operation.repository !== repository) deny('OPERATION_REPOSITORY_MIXED');
    if (operation.sourceSha !== sourceSha) deny('OPERATION_SOURCE_SHA_MIXED');
    // C-02a requires an operationId for an OpenAPI operation identity.
    if (typeof operation.operationId !== 'string' || operation.operationId.length === 0) {
      deny('OPERATION_ID_MISSING');
    }
  }

  const qualifier = 'GENERATED_ARTIFACT' as const;
  const currencyState = currencyFor(qualifier, input.generationCurrency);
  if (currencyState !== 'CURRENT') deny('GENERATION_NOT_CURRENT');

  const evidence: ValidatedSourceEvidence = Object.freeze({
    vocabularyKind: 'ROUTE' as const,
    evidenceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
    qualifier,
    repository,
    sourceRoot: input.sourceRoot,
    sourceSha,
    inventoryState: 'COMPLETE' as const,
    currencyState,
    members: Object.freeze(operations.map(canonicalRouteMember)) as readonly string[],
  });
  return deriveProvenRouteVocabulary(evidence, 'PRODUCTION');
}

/**
 * Derive a PHP route vocabulary from mechanically resolved PHP route
 * evidence.
 *
 * A4 requires the same rule as OpenAPI and forbids inventing completeness.
 * C-06 measured the `READ_ONLY_PROVEN` population over the approved PHP
 * universe at ZERO across 814 operations, with 6,114 unclassified callee
 * identities blocking promotion through `CALLEE_CLASSIFICATION_INCOMPLETE`.
 * There is therefore no admissible PHP production route vocabulary to derive
 * today, and this function FAILS CLOSED rather than manufacturing one.
 *
 * This is deliberately not a stub that will silently start granting authority
 * when inputs appear: promotion requires the C-06 proof model to actually
 * admit routes, which is outside this campaign and must not be loosened.
 */
export function derivePhpRouteVocabulary(input: {
  readonly readOnlyProvenOperations: readonly SourceOperationDescriptor[];
  readonly completeness: SourceOperationProjectionCompleteness;
  readonly sourceRoot: string;
}): ProvenRouteVocabulary {
  if (input.readOnlyProvenOperations.length === 0) {
    // The truthful state of the repository. Documented in the campaign
    // records; not an omission.
    deny('PHP_ROUTE_PROOF_UNAVAILABLE');
  }
  if (input.completeness.state !== 'COMPLETE') deny('INVENTORY_NOT_COMPLETE');
  if (input.completeness.truncated) deny('INVENTORY_TRUNCATED');

  const repository = input.readOnlyProvenOperations[0]!.repository;
  const sourceSha = input.readOnlyProvenOperations[0]!.sourceSha;
  for (const operation of input.readOnlyProvenOperations) {
    if (operation.repository !== repository) deny('OPERATION_REPOSITORY_MIXED');
    if (operation.sourceSha !== sourceSha) deny('OPERATION_SOURCE_SHA_MIXED');
  }
  const evidence: ValidatedSourceEvidence = Object.freeze({
    vocabularyKind: 'ROUTE' as const,
    evidenceClass: 'SOURCE_PROVEN_PHP_ROUTE',
    // PHP routes are read from direct source, not a generated artifact.
    qualifier: 'DIRECT_SOURCE' as const,
    repository,
    sourceRoot: input.sourceRoot,
    sourceSha,
    inventoryState: 'COMPLETE' as const,
    currencyState: 'NOT_APPLICABLE' as const,
    members: Object.freeze(
      input.readOnlyProvenOperations.map(canonicalRouteMember),
    ) as readonly string[],
  });
  return deriveProvenRouteVocabulary(evidence, 'PRODUCTION');
}
