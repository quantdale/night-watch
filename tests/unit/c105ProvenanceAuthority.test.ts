// ---------------------------------------------------------------------------
// Nightwatch C-10.5 (A2/A6/A7) — provenance authority and forgery resistance.
//
// This suite is the descendant of the A2 REPRODUCTION. Before the repair, all
// four of the following succeeded against the shipped C-10 cone:
//
//   ROUTE_FORGERY_ACCEPTED           — label + fabricated digest minted authority
//   KEY_FORGERY_ACCEPTED             — same for keys
//   *_SENTINEL_TREATED_AS_PROVEN     — arbitrary members were "proven"
//   JSON_REVIVED_ACCEPTED_BY_CONSUMER— shape-matching revival was trusted
//
// Each is now an assertion that the forgery FAILS. Synthetic sentinels only;
// no real customer identifier appears anywhere in this file.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  AUTHORITATIVE_SOURCE_REPOSITORIES,
  computeProvenanceDigest,
  encodeSourceEvidenceBinding,
  isMintedCapability,
  capabilityAuthorityMarker,
  assertProductionVocabularyAuthority,
  assertSourceProvenRoute,
  isSourceProvenKey,
  isSourceProvenRoute,
  NO_PROVEN_ROUTE_VOCABULARY,
  createProductionPrivacyPolicy,
  projectProduction,
  toProductionEvidence,
  RawEphemeralSource,
  type ValidatedSourceEvidence,
} from '../../src/core/prodPrivacy';
import {
  deriveOpenApiRouteVocabulary,
  derivePhpRouteVocabulary,
  RouteDerivationDenied,
} from '../../src/core/prodProvenance/routeVocabularyDerivation';
import {
  deriveFixedContractKeyVocabulary,
  deriveOpenApiKeyVocabulary,
  KeyDerivationDenied,
} from '../../src/core/prodProvenance/keyVocabularyDerivation';
import {
  testOnlyKeyVocabulary,
  testOnlyProductionMarkedKeyVocabulary,
  testOnlyProductionMarkedRouteVocabulary,
  testOnlyRouteVocabulary,
} from '../../src/core/prodProvenance/testOnlySeam';
import { PHASE25_APPROVED_REPOSITORY_IDS } from '../../src/core/source/approvedScan';
import type { SourceOperationDescriptor, SourceOperationProjectionCompleteness } from '../../src/core/source/surfaceTypes';

/** Obvious synthetic sentinels. */
const SENTINEL_ROUTE = 'GET /v1/synthetic-sentinel-NWSENT0001/{id}';
const SENTINEL_KEY = 'NWSENT0002_forged_dynamic_key';
const FABRICATED_DIGEST = 'ev:sha256:deadbeefdeadbeefdeadbeef';
const SYNTHETIC_SHA_A = 'a'.repeat(40);
const SYNTHETIC_SHA_B = 'b'.repeat(40);

function completeness(
  overrides: Partial<SourceOperationProjectionCompleteness> = {},
): SourceOperationProjectionCompleteness {
  return {
    schemaVersion: 'nightwatch.source-operation-projection-completeness.v1',
    state: 'COMPLETE',
    limit: 4096,
    examinedOperations: 1,
    totalOperations: 1,
    projectedOperations: 1,
    droppedOperations: 0,
    truncated: false,
    remainingUnknown: false,
    enumerationCompleteness: 'COMPLETE',
    contentReadCompleteness: 'COMPLETE',
    coverageState: 'COVERED',
    repositories: [],
    ...overrides,
  } as SourceOperationProjectionCompleteness;
}

function operation(overrides: Partial<SourceOperationDescriptor> = {}): SourceOperationDescriptor {
  return {
    operationId: 'listSyntheticThings',
    repository: 'alphauslabs/blueapi',
    sourceSha: SYNTHETIC_SHA_A,
    sourcePath: 'openapiv2/billing.swagger.json',
    language: 'JSON',
    evidenceDigest: 'ev:sha256:000000000000000000000000',
    method: 'GET',
    routeTemplate: '/v1/synthetic/things',
    handlerSymbol: null,
    handlerPath: null,
    requestReference: null,
    responseReference: null,
    transport: 'HTTP_API',
    routeProof: 'OPENAPI_OPERATION',
    routeRejectionReason: null,
    readOnlyClassification: 'UNKNOWN',
    runtimeBinding: 'UNRESOLVED',
    targetId: null,
    deploymentStatusUnresolved: true,
    ...overrides,
  } as SourceOperationDescriptor;
}

const CURRENT_GENERATION = {
  state: 'CURRENT' as const,
  reason: 'GENERATION_CORROBORATED_EXACT' as const,
  corroborator: 'PROTO_SURFACE' as const,
  artifactOperationCount: 1,
  corroboratedOperationCount: 1,
};

function goodEvidence(): ValidatedSourceEvidence {
  return {
    vocabularyKind: 'ROUTE',
    evidenceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
    qualifier: 'DIRECT_SOURCE',
    repository: 'mobingilabs/ripple-api',
    sourceRoot: 'src',
    sourceSha: SYNTHETIC_SHA_A,
    inventoryState: 'COMPLETE',
    currencyState: 'NOT_APPLICABLE',
    members: [SENTINEL_ROUTE],
  };
}

test.describe('C-10.5 A2 — the reproduced forgeries now fail', () => {
  test('the label-accepting constructors are gone from the public surface', async () => {
    const cone = (await import('../../src/core/prodPrivacy')) as Record<string, unknown>;
    // The exact API that minted authority from a label in the A2 reproduction.
    expect(cone.createProvenRouteVocabulary).toBeUndefined();
    expect(cone.createProvenKeyVocabulary).toBeUndefined();
    // The mint itself is not reachable through the cone's public surface.
    expect(cone.mintProvenance).toBeUndefined();
    expect(cone.deriveProvenRouteVocabulary).toBeUndefined();
    expect(cone.deriveProvenKeyVocabulary).toBeUndefined();
  });

  test('a fabricated digest cannot be supplied, so it cannot grant provenance', () => {
    const vocab = testOnlyProductionMarkedRouteVocabulary({
      provenanceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
      templates: [SENTINEL_ROUTE],
    });
    // The identity is derived; it is not the fabricated value and could not be.
    expect(vocab.provenanceDigest).not.toBe(FABRICATED_DIGEST);
    expect(vocab.provenanceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
    expect(vocab.provenanceDigest).toBe(computeProvenanceDigest({
      vocabularyKind: 'ROUTE',
      evidenceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
      qualifier: 'DIRECT_SOURCE',
      repository: 'mobingilabs/ripple-api',
      sourceRoot: 'src',
      sourceSha: '0'.repeat(40),
      inventoryState: 'COMPLETE',
      currencyState: 'NOT_APPLICABLE',
      members: [SENTINEL_ROUTE],
    }));
  });

  test('JSON_REVIVED_ACCEPTED_BY_CONSUMER is now false — shape is not authority', () => {
    const genuine = testOnlyProductionMarkedRouteVocabulary({
      provenanceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
      templates: [SENTINEL_ROUTE],
    });
    expect(isSourceProvenRoute(genuine, SENTINEL_ROUTE)).toBe(true);

    // Serialize a LEGITIMATE capability and rebuild it perfectly.
    const revived = {
      ...JSON.parse(JSON.stringify({
        version: genuine.version,
        provenanceClass: genuine.provenanceClass,
        provenanceDigest: genuine.provenanceDigest,
        provenance: genuine.provenance,
        templates: [...genuine.templates],
      })),
      templates: new Set([...genuine.templates]),
    };
    // Every field matches, including the genuine derived digest.
    expect(revived.provenanceDigest).toBe(genuine.provenanceDigest);
    // It is still refused: object identity does not survive JSON.
    expect(isMintedCapability(revived)).toBe(false);
    expect(isSourceProvenRoute(revived as never, SENTINEL_ROUTE)).toBe(false);
    expect(() => assertSourceProvenRoute(revived as never, SENTINEL_ROUTE)).toThrow(
      /CAPABILITY_NOT_MINTED/,
    );
  });

  test('an arbitrary string cannot be upgraded into a SOURCE_PROVEN_* capability', () => {
    for (const candidate of ['SOURCE_PROVEN_OPENAPI_OPERATION', SENTINEL_ROUTE, '', '{}']) {
      expect(isMintedCapability(candidate)).toBe(false);
      expect(capabilityAuthorityMarker(candidate)).toBeNull();
      expect(() => assertProductionVocabularyAuthority(candidate)).toThrow(/CAPABILITY_NOT_MINTED/);
    }
  });

  test('arbitrary route and key arrays grant nothing', () => {
    const routeShaped = { version: 'nightwatch.proven-route-vocabulary.v1', provenanceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION', provenanceDigest: FABRICATED_DIGEST, templates: new Set([SENTINEL_ROUTE]) };
    const keyShaped = { version: 'nightwatch.proven-key-vocabulary.v1', provenanceClass: 'SOURCE_PROVEN_FIXED_CONTRACT', provenanceDigest: FABRICATED_DIGEST, keys: new Set([SENTINEL_KEY]) };
    expect(isSourceProvenRoute(routeShaped as never, SENTINEL_ROUTE)).toBe(false);
    expect(isSourceProvenKey(keyShaped as never, SENTINEL_KEY)).toBe(false);
  });
});

test.describe('C-10.5 A7 — provenance binds contents to source identity', () => {
  test('member ORDER canonicalizes identically (set-based semantics)', () => {
    const a = computeProvenanceDigest({ ...goodEvidence(), members: ['GET /a', 'GET /b', 'GET /c'] });
    const b = computeProvenanceDigest({ ...goodEvidence(), members: ['GET /c', 'GET /a', 'GET /b'] });
    expect(a).toBe(b);
  });

  test('member ADDITION and REMOVAL change identity', () => {
    const base = computeProvenanceDigest({ ...goodEvidence(), members: ['GET /a', 'GET /b'] });
    expect(computeProvenanceDigest({ ...goodEvidence(), members: ['GET /a', 'GET /b', 'GET /c'] })).not.toBe(base);
    expect(computeProvenanceDigest({ ...goodEvidence(), members: ['GET /a'] })).not.toBe(base);
  });

  test('a source SHA change changes identity', () => {
    expect(computeProvenanceDigest({ ...goodEvidence(), sourceSha: SYNTHETIC_SHA_B })).not.toBe(
      computeProvenanceDigest(goodEvidence()),
    );
  });

  test('every load-bearing authority component is bound into the identity', () => {
    const base = computeProvenanceDigest(goodEvidence());
    const mutations: readonly ValidatedSourceEvidence[] = [
      { ...goodEvidence(), evidenceClass: 'SOURCE_PROVEN_PHP_ROUTE' },
      { ...goodEvidence(), repository: 'mobingilabs/ripple-ui' },
      { ...goodEvidence(), sourceRoot: 'other' },
      { ...goodEvidence(), sourceSha: SYNTHETIC_SHA_B },
      { ...goodEvidence(), qualifier: 'GENERATED_ARTIFACT' },
      { ...goodEvidence(), inventoryState: 'INCOMPLETE' },
      { ...goodEvidence(), currencyState: 'STALE' },
      { ...goodEvidence(), vocabularyKind: 'KEY' },
      { ...goodEvidence(), members: [SENTINEL_KEY] },
    ];
    for (const mutated of mutations) {
      expect(computeProvenanceDigest(mutated)).not.toBe(base);
    }
  });

  test('copying a legitimate digest while changing members does not transfer authority', () => {
    const legitimate = testOnlyProductionMarkedRouteVocabulary({
      provenanceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
      templates: ['GET /v1/legitimate'],
    });
    const forged = {
      version: legitimate.version,
      provenanceClass: legitimate.provenanceClass,
      // The REAL digest of a different member set.
      provenanceDigest: legitimate.provenanceDigest,
      provenance: legitimate.provenance,
      templates: new Set([SENTINEL_ROUTE]),
    };
    expect(isSourceProvenRoute(forged as never, SENTINEL_ROUTE)).toBe(false);
    // And the genuine capability never contained the sentinel in the first place.
    expect(isSourceProvenRoute(legitimate, SENTINEL_ROUTE)).toBe(false);
  });

  test('the canonical encoding is length-prefixed, so members cannot imitate a field boundary', () => {
    const encoded = encodeSourceEvidenceBinding(goodEvidence());
    expect(encoded.startsWith(`${'nightwatch.production-vocabulary-authority.v1'.length}:`)).toBe(true);
    // Two different populations that would collide under naive concatenation.
    const left = computeProvenanceDigest({ ...goodEvidence(), members: ['a|b', 'c'] });
    const right = computeProvenanceDigest({ ...goodEvidence(), members: ['a', 'b|c'] });
    expect(left).not.toBe(right);
  });

  test('the derivation is deterministic across repeated computation', () => {
    const digests = new Set<string>();
    for (let run = 0; run < 8; run += 1) digests.add(computeProvenanceDigest(goodEvidence()));
    expect(digests.size).toBe(1);
  });
});

test.describe('C-10.5 A6 — incomplete and stale evidence fail closed', () => {
  test('an incomplete inventory cannot grant authority', () => {
    for (const state of ['TRUNCATED', 'UNKNOWN'] as const) {
      expect(() =>
        deriveOpenApiRouteVocabulary({
          operations: [operation()],
          completeness: completeness({ state }),
          sourceRoot: 'openapiv2',
          generationCurrency: CURRENT_GENERATION,
        }),
      ).toThrow(RouteDerivationDenied);
    }
  });

  test('a truncated inventory and an unknown remainder both deny', () => {
    expect(() =>
      deriveOpenApiRouteVocabulary({
        operations: [operation()],
        completeness: completeness({ truncated: true }),
        sourceRoot: 'openapiv2',
        generationCurrency: CURRENT_GENERATION,
      }),
    ).toThrow(/INVENTORY_TRUNCATED/);
    expect(() =>
      deriveOpenApiRouteVocabulary({
        operations: [operation()],
        completeness: completeness({ remainingUnknown: true }),
        sourceRoot: 'openapiv2',
        generationCurrency: CURRENT_GENERATION,
      }),
    ).toThrow(/REMAINDER_UNKNOWN/);
  });

  test('stale generated evidence cannot silently grant authority', () => {
    for (const currency of [
      null,
      { ...CURRENT_GENERATION, state: 'STALE' as const },
      { ...CURRENT_GENERATION, state: 'UNKNOWN' as const },
    ]) {
      expect(() =>
        deriveOpenApiRouteVocabulary({
          operations: [operation()],
          completeness: completeness(),
          sourceRoot: 'openapiv2',
          generationCurrency: currency,
        }),
      ).toThrow(/GENERATION_NOT_CURRENT/);
    }
  });

  test('a missing operationId denies, because C-02a requires operation identity', () => {
    expect(() =>
      deriveOpenApiRouteVocabulary({
        operations: [operation({ operationId: '' })],
        completeness: completeness(),
        sourceRoot: 'openapiv2',
        generationCurrency: CURRENT_GENERATION,
      }),
    ).toThrow(/OPERATION_ID_MISSING/);
  });

  test('a mixed-repository or mixed-SHA population cannot be bound to one source identity', () => {
    expect(() =>
      deriveOpenApiRouteVocabulary({
        operations: [operation(), operation({ repository: 'mobingilabs/ripple-api' })],
        completeness: completeness(),
        sourceRoot: 'openapiv2',
        generationCurrency: CURRENT_GENERATION,
      }),
    ).toThrow(/OPERATION_REPOSITORY_MIXED/);
    expect(() =>
      deriveOpenApiRouteVocabulary({
        operations: [operation(), operation({ sourceSha: SYNTHETIC_SHA_B })],
        completeness: completeness(),
        sourceRoot: 'openapiv2',
        generationCurrency: CURRENT_GENERATION,
      }),
    ).toThrow(/OPERATION_SOURCE_SHA_MIXED/);
  });

  test('an unapproved repository denies', () => {
    expect(() =>
      deriveOpenApiRouteVocabulary({
        operations: [operation({ repository: 'attacker/evil-repo' })],
        completeness: completeness(),
        sourceRoot: 'openapiv2',
        generationCurrency: CURRENT_GENERATION,
      }),
    ).toThrow(/EVIDENCE_REPOSITORY_UNAPPROVED/);
  });

  test('the cone repository allowlist matches the approved source universe exactly', () => {
    // This used to guard a deliberate data duplication in
    // vocabularyAuthority.ts. C-05 removed the duplication -- the cone now
    // derives from the single admission authority, which is a zero-import
    // leaf, so A8 holds by the dependency being data-only rather than by two
    // literals staying aligned. The assertion is KEPT: it now guards that the
    // derivation stays wired, and it would fire again if anyone reintroduced a
    // local copy.
    expect([...AUTHORITATIVE_SOURCE_REPOSITORIES].sort()).toEqual(
      [...PHASE25_APPROVED_REPOSITORY_IDS].sort(),
    );
  });

  test('unknown provenance fails closed', () => {
    expect(() =>
      testOnlyRouteVocabulary({ provenanceClass: 'ASSUMED_SAFE' as never, templates: ['GET /a'] }),
    ).toThrow(/EVIDENCE_CLASS_MISMATCH/);
    expect(() =>
      testOnlyKeyVocabulary({ provenanceClass: 'TRUST_ME' as never, keys: ['a'] }),
    ).toThrow(/EVIDENCE_CLASS_MISMATCH/);
  });

  test('a key evidence class cannot mint a route vocabulary, or vice versa', () => {
    expect(() =>
      testOnlyRouteVocabulary({
        provenanceClass: 'SOURCE_PROVEN_OPENAPI_DEFINITION' as never,
        templates: ['GET /a'],
      }),
    ).toThrow(/EVIDENCE_CLASS_MISMATCH/);
    expect(() =>
      testOnlyKeyVocabulary({
        provenanceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION' as never,
        keys: ['a'],
      }),
    ).toThrow(/EVIDENCE_CLASS_MISMATCH/);
  });

  test('a malformed source checkpoint denies', () => {
    for (const sha of ['', 'not-a-sha', 'A'.repeat(40), '0'.repeat(39)]) {
      expect(() =>
        testOnlyKeyVocabulary({ provenanceClass: 'SOURCE_PROVEN_FIXED_CONTRACT', keys: ['a'], sourceSha: sha }),
      ).toThrow(/EVIDENCE_SOURCE_IDENTITY/);
    }
  });
});

test.describe('C-10.5 A5/A6 — test seams cannot produce production authority', () => {
  test('a TEST_ONLY capability is refused by the production authority guard', () => {
    const seam = testOnlyRouteVocabulary({
      provenanceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
      templates: [SENTINEL_ROUTE],
    });
    // It IS genuinely minted, so projection fixtures keep working...
    expect(isMintedCapability(seam)).toBe(true);
    expect(capabilityAuthorityMarker(seam)).toBe('TEST_ONLY');
    expect(isSourceProvenRoute(seam, SENTINEL_ROUTE)).toBe(true);
    // ...but it can never satisfy a production authority path.
    expect(() => assertProductionVocabularyAuthority(seam)).toThrow(/CAPABILITY_TEST_ONLY/);
    expect(() => assertSourceProvenRoute(seam, SENTINEL_ROUTE)).toThrow(/CAPABILITY_TEST_ONLY/);
  });

  test('a PRODUCTION-marked capability is accepted, so the guard is not vacuously deny-all', () => {
    const production = testOnlyProductionMarkedRouteVocabulary({
      provenanceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
      templates: [SENTINEL_ROUTE],
    });
    expect(capabilityAuthorityMarker(production)).toBe('PRODUCTION');
    expect(() => assertProductionVocabularyAuthority(production)).not.toThrow();
    expect(() => assertSourceProvenRoute(production, SENTINEL_ROUTE)).not.toThrow();
  });

  test('the marker cannot be edited off a frozen capability', () => {
    const seam = testOnlyRouteVocabulary({
      provenanceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
      templates: [SENTINEL_ROUTE],
    });
    // The marker lives in a cone-private WeakMap, not on the object.
    expect(Object.keys(seam)).not.toContain('marker');
    expect(Object.isFrozen(seam)).toBe(true);
    try {
      (seam as unknown as Record<string, unknown>).provenanceClass = 'SOURCE_PROVEN_PHP_ROUTE';
    } catch {
      /* strict-mode throw is equally acceptable */
    }
    expect(seam.provenanceClass).toBe('SOURCE_PROVEN_OPENAPI_OPERATION');
    expect(capabilityAuthorityMarker(seam)).toBe('TEST_ONLY');
  });

  test('DEF-C105-1: a TEST_ONLY KEY vocabulary cannot reach persisted evidence', () => {
    // Regression for a defect found in this campaign's own implementation. The
    // key-side guard existed but had NO CALL SITE, so a TEST_ONLY vocabulary —
    // genuinely minted, therefore a member for `isSourceProvenKey` — carried an
    // arbitrary key literal into persisted evidence through the F-14 position
    // `provenFields[].name`. The route side was guarded; the key side was not.
    const seamKeys = testOnlyKeyVocabulary({
      provenanceClass: 'SOURCE_PROVEN_FIXED_CONTRACT',
      keys: [SENTINEL_KEY],
    });
    const policy = createProductionPrivacyPolicy({});

    // Projection still accepts a TEST_ONLY vocabulary — that is what fixtures
    // need, and projection holds no persistence authority.
    const projection = projectProduction(
      RawEphemeralSource.of({ [SENTINEL_KEY]: 1 }),
      seamKeys,
      policy,
    );
    expect(isSourceProvenKey(seamKeys, SENTINEL_KEY)).toBe(true);

    // PERSISTENCE authority is the boundary that must refuse it.
    expect(() =>
      toProductionEvidence({
        projection,
        routeTemplate: 'GET /v1/synthetic/a6',
        statusClass: '2XX',
        routeVocabulary: testOnlyProductionMarkedRouteVocabulary({
          provenanceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
          templates: ['GET /v1/synthetic/a6'],
        }),
        vocabulary: seamKeys,
        policy,
      }),
    ).toThrow(/CAPABILITY_TEST_ONLY/);
  });

  test('a PRODUCTION-marked key vocabulary still builds evidence, so the guard is not deny-all', () => {
    const policy = createProductionPrivacyPolicy({});
    const productionKeys = testOnlyProductionMarkedKeyVocabulary({
      provenanceClass: 'SOURCE_PROVEN_FIXED_CONTRACT',
      keys: ['alpha'],
    });
    const evidence = toProductionEvidence({
      projection: projectProduction(RawEphemeralSource.of({ alpha: 1 }), productionKeys, policy),
      routeTemplate: 'GET /v1/synthetic/a6',
      statusClass: '2XX',
      routeVocabulary: testOnlyProductionMarkedRouteVocabulary({
        provenanceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
        templates: ['GET /v1/synthetic/a6'],
      }),
      vocabulary: productionKeys,
      policy,
    });
    expect(evidence.boundaryClass).toBe('SAFE_PRODUCTION_EVIDENCE');
    expect(JSON.stringify(evidence)).not.toContain(SENTINEL_KEY);
  });

  test('the NO_PROVEN sentinel still denies without a vocabulary', () => {
    expect(isSourceProvenRoute(NO_PROVEN_ROUTE_VOCABULARY, SENTINEL_ROUTE)).toBe(false);
    expect(() => assertSourceProvenRoute(NO_PROVEN_ROUTE_VOCABULARY, SENTINEL_ROUTE)).toThrow(
      /ROUTE_NOT_SOURCE_PROVEN/,
    );
  });
});

test.describe('C-10.5 A4 — mechanical route derivation from C-02a evidence', () => {
  test('a complete, current OpenAPI population derives a production capability', () => {
    const vocab = deriveOpenApiRouteVocabulary({
      operations: [operation(), operation({ operationId: 'getThing', routeTemplate: '/v1/synthetic/things/{id}' })],
      completeness: completeness({ examinedOperations: 2, totalOperations: 2, projectedOperations: 2 }),
      sourceRoot: 'openapiv2',
      generationCurrency: CURRENT_GENERATION,
    });
    expect(vocab.provenanceClass).toBe('SOURCE_PROVEN_OPENAPI_OPERATION');
    expect(capabilityAuthorityMarker(vocab)).toBe('PRODUCTION');
    // Method is part of route identity: GET and DELETE are different authority.
    expect(isSourceProvenRoute(vocab, 'GET /v1/synthetic/things')).toBe(true);
    expect(isSourceProvenRoute(vocab, 'DELETE /v1/synthetic/things')).toBe(false);
    // The sentinel route was never admitted by the source.
    expect(isSourceProvenRoute(vocab, SENTINEL_ROUTE)).toBe(false);
    // Identity records the source it was bound to, and no member literal.
    expect(vocab.provenance.repository).toBe('alphauslabs/blueapi');
    expect(vocab.provenance.sourceSha).toBe(SYNTHETIC_SHA_A);
    expect(vocab.provenance.memberCount).toBe(2);
    expect(JSON.stringify(vocab.provenance)).not.toContain('synthetic/things');
  });

  test('PHP route derivation fails closed, because C-06 admits no production route', () => {
    // C-06 measured READ_ONLY_PROVEN at 0 across 814 operations. Deriving a
    // PHP production route vocabulary today would be inventing completeness.
    expect(() =>
      derivePhpRouteVocabulary({
        readOnlyProvenOperations: [],
        completeness: completeness(),
        sourceRoot: 'src',
      }),
    ).toThrow(/PHP_ROUTE_PROOF_UNAVAILABLE/);
  });
});

test.describe('C-10.5 A5 — mechanical key derivation', () => {
  test('an unresolved OpenAPI definition denies', () => {
    for (const bindingState of ['REF_MALFORMED', 'DEFINITION_MISSING', 'DEFINITION_UNSAFE'] as const) {
      expect(() =>
        deriveOpenApiKeyVocabulary({
          definitionKeys: ['id', 'name'],
          bindingState,
          repository: 'alphauslabs/blueapi',
          sourceRoot: 'openapiv2',
          sourceSha: SYNTHETIC_SHA_A,
          inventoryComplete: true,
          generationCurrency: CURRENT_GENERATION,
        }),
      ).toThrow(/DEFINITION_NOT_RESOLVED/);
    }
  });

  test('a resolved, current, complete definition derives a production capability', () => {
    const vocab = deriveOpenApiKeyVocabulary({
      definitionKeys: ['id', 'name', 'status'],
      bindingState: 'RESOLVED',
      repository: 'alphauslabs/blueapi',
      sourceRoot: 'openapiv2',
      sourceSha: SYNTHETIC_SHA_A,
      inventoryComplete: true,
      generationCurrency: CURRENT_GENERATION,
    });
    expect(isSourceProvenKey(vocab, 'status')).toBe(true);
    expect(isSourceProvenKey(vocab, SENTINEL_KEY)).toBe(false);
    expect(capabilityAuthorityMarker(vocab)).toBe('PRODUCTION');
  });

  test('a fixed contract requires real committed contract identity', () => {
    expect(() =>
      deriveFixedContractKeyVocabulary({
        contractKeys: ['a'],
        repository: 'mobingilabs/ripple-api',
        contractPath: '',
        sourceSha: SYNTHETIC_SHA_A,
      }),
    ).toThrow(KeyDerivationDenied);
    expect(() =>
      deriveFixedContractKeyVocabulary({
        contractKeys: ['a'],
        repository: 'mobingilabs/ripple-api',
        contractPath: 'src/contract.ts',
        sourceSha: '',
      }),
    ).toThrow(/CONTRACT_IDENTITY_MISSING/);
  });

  test('naming a different committed contract yields a different identity', () => {
    const first = deriveFixedContractKeyVocabulary({
      contractKeys: ['a', 'b'],
      repository: 'mobingilabs/ripple-api',
      contractPath: 'src/contractA.ts',
      sourceSha: SYNTHETIC_SHA_A,
    });
    const second = deriveFixedContractKeyVocabulary({
      contractKeys: ['a', 'b'],
      repository: 'mobingilabs/ripple-api',
      contractPath: 'src/contractB.ts',
      sourceSha: SYNTHETIC_SHA_A,
    });
    expect(first.provenanceDigest).not.toBe(second.provenanceDigest);
  });
});
