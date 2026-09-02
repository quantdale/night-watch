// ---------------------------------------------------------------------------
// Nightwatch C-10.5 — TEST-ONLY vocabulary construction seam.
//
// !!! TEST ONLY. NOT A PRODUCTION AUTHORITY PATH. !!!
//
// The C-10 privacy fixtures legitimately need vocabularies in order to
// exercise projection, serialization and firewall logic. Before C-10.5 they
// used the label-accepting constructors, which is exactly the API this
// campaign withdrew.
//
// The seam therefore mints capabilities branded `TEST_ONLY`. They are
// genuinely minted, so `isSourceProvenKey` / `isSourceProvenRoute` membership
// works and the fixtures keep testing what they were written to test — but
// `assertProductionVocabularyAuthority` refuses the `TEST_ONLY` marker, so a
// fixture capability can never satisfy a production authority path (A5/A6).
//
// Two mechanical protections back the naming convention:
//   * `bin/hardening-check.mjs` restricts importers of this module to
//     `tests/**`, so production code cannot reach it at all;
//   * the marker is carried in a cone-private WeakMap, not on the object, so
//     it cannot be edited off a frozen capability.
// ---------------------------------------------------------------------------

import {
  deriveProvenKeyVocabulary,
  type ProvenKeyVocabulary,
} from '../prodPrivacy/keyVocabulary';
import {
  deriveProvenRouteVocabulary,
  type ProvenRouteVocabulary,
} from '../prodPrivacy/routeVocabulary';
import type { ValidatedSourceEvidence } from '../prodPrivacy/vocabularyAuthority';

/** A syntactically valid but obviously synthetic source snapshot identity. */
export const TEST_ONLY_SOURCE_SHA = '0'.repeat(40);
/** An approved repository id, so evidence validation exercises the real path. */
export const TEST_ONLY_REPOSITORY = 'mobingilabs/ripple-api';

/** TEST ONLY. Build a `TEST_ONLY`-branded key vocabulary. */
export function testOnlyKeyVocabulary(input: {
  readonly provenanceClass:
    | 'SOURCE_PROVEN_OPENAPI_DEFINITION'
    | 'SOURCE_PROVEN_PHP_ROW_KEYS'
    | 'SOURCE_PROVEN_FIXED_CONTRACT';
  readonly keys: readonly string[];
  readonly sourceSha?: string;
  readonly sourceRoot?: string;
}): ProvenKeyVocabulary {
  const evidence: ValidatedSourceEvidence = Object.freeze({
    vocabularyKind: 'KEY' as const,
    evidenceClass: input.provenanceClass,
    qualifier: 'DIRECT_SOURCE' as const,
    repository: TEST_ONLY_REPOSITORY,
    sourceRoot: input.sourceRoot ?? 'src',
    sourceSha: input.sourceSha ?? TEST_ONLY_SOURCE_SHA,
    inventoryState: 'COMPLETE' as const,
    currencyState: 'NOT_APPLICABLE' as const,
    members: Object.freeze([...input.keys]) as readonly string[],
  });
  return deriveProvenKeyVocabulary(evidence, 'TEST_ONLY');
}

/** TEST ONLY. Build a `TEST_ONLY`-branded route vocabulary. */
export function testOnlyRouteVocabulary(input: {
  readonly provenanceClass:
    | 'SOURCE_PROVEN_OPENAPI_OPERATION'
    | 'SOURCE_PROVEN_PHP_ROUTE'
    | 'SOURCE_PROVEN_FIXED_CONTRACT';
  readonly templates: readonly string[];
  readonly sourceSha?: string;
  readonly sourceRoot?: string;
}): ProvenRouteVocabulary {
  const evidence: ValidatedSourceEvidence = Object.freeze({
    vocabularyKind: 'ROUTE' as const,
    evidenceClass: input.provenanceClass,
    qualifier: 'DIRECT_SOURCE' as const,
    repository: TEST_ONLY_REPOSITORY,
    sourceRoot: input.sourceRoot ?? 'src',
    sourceSha: input.sourceSha ?? TEST_ONLY_SOURCE_SHA,
    inventoryState: 'COMPLETE' as const,
    currencyState: 'NOT_APPLICABLE' as const,
    members: Object.freeze([...input.templates]) as readonly string[],
  });
  return deriveProvenRouteVocabulary(evidence, 'TEST_ONLY');
}

/**
 * TEST ONLY. A `PRODUCTION`-marked capability for suites that must exercise
 * the production authority path itself (for example proving that a legitimate
 * production vocabulary is accepted where a TEST_ONLY one is refused). This
 * still goes through full evidence validation, so it cannot bypass any
 * fail-closed invariant; it only chooses the marker.
 */
export function testOnlyProductionMarkedRouteVocabulary(input: {
  readonly provenanceClass:
    | 'SOURCE_PROVEN_OPENAPI_OPERATION'
    | 'SOURCE_PROVEN_PHP_ROUTE'
    | 'SOURCE_PROVEN_FIXED_CONTRACT';
  readonly templates: readonly string[];
  readonly sourceSha?: string;
  readonly sourceRoot?: string;
}): ProvenRouteVocabulary {
  const evidence: ValidatedSourceEvidence = Object.freeze({
    vocabularyKind: 'ROUTE' as const,
    evidenceClass: input.provenanceClass,
    qualifier: 'DIRECT_SOURCE' as const,
    repository: TEST_ONLY_REPOSITORY,
    sourceRoot: input.sourceRoot ?? 'src',
    sourceSha: input.sourceSha ?? TEST_ONLY_SOURCE_SHA,
    inventoryState: 'COMPLETE' as const,
    currencyState: 'NOT_APPLICABLE' as const,
    members: Object.freeze([...input.templates]) as readonly string[],
  });
  return deriveProvenRouteVocabulary(evidence, 'PRODUCTION');
}

/** TEST ONLY. `PRODUCTION`-marked key vocabulary, same rationale as above. */
export function testOnlyProductionMarkedKeyVocabulary(input: {
  readonly provenanceClass:
    | 'SOURCE_PROVEN_OPENAPI_DEFINITION'
    | 'SOURCE_PROVEN_PHP_ROW_KEYS'
    | 'SOURCE_PROVEN_FIXED_CONTRACT';
  readonly keys: readonly string[];
  readonly sourceSha?: string;
  readonly sourceRoot?: string;
}): ProvenKeyVocabulary {
  const evidence: ValidatedSourceEvidence = Object.freeze({
    vocabularyKind: 'KEY' as const,
    evidenceClass: input.provenanceClass,
    qualifier: 'DIRECT_SOURCE' as const,
    repository: TEST_ONLY_REPOSITORY,
    sourceRoot: input.sourceRoot ?? 'src',
    sourceSha: input.sourceSha ?? TEST_ONLY_SOURCE_SHA,
    inventoryState: 'COMPLETE' as const,
    currencyState: 'NOT_APPLICABLE' as const,
    members: Object.freeze([...input.keys]) as readonly string[],
  });
  return deriveProvenKeyVocabulary(evidence, 'PRODUCTION');
}
