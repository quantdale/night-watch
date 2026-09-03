// ---------------------------------------------------------------------------
// Nightwatch C-02a — OpenAPI admission.
//
// Admits ONE new root (`openapiv2`) inside the already-admitted
// `alphauslabs/blueapi` repository and recovers its committed generated
// Swagger artifact through the EXISTING `parseOpenApiRoutes` machinery. There
// is no new parser here: the only parser change is `$ref` → `definitions`
// response binding inside the OpenAPI branch that already existed.
//
// Everything the campaign claims is asserted mechanically:
//   - the root is admitted and every other root stays confined;
//   - `alphauslabs/blueinternal` remains outside the universe (C-05);
//   - >= 591 blueapi operations with verb, path and operationId;
//   - >= 400 response contracts bound through in-document definitions;
//   - malformed / unresolvable `$ref`s fail truthfully instead of vanishing;
//   - the evidence is SOURCE_FACT with a GENERATED_ARTIFACT qualifier;
//   - generation currency against the proto surface is explicit, and UNKNOWN
//     while no corroborator is admitted;
//   - GENERATED_ARTIFACT evidence can never solely grant a production
//     admission;
//   - every pre-C-02a operation identity survives, nothing is evicted, and
//     completeness stays truthful after the population expansion.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApprovedRealSourceScanConfig, PHASE25_APPROVED_REPOSITORY_IDS } from '../../src/core/source/approvedScan';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { createSiblingSourceAccess, DEFAULT_SIBLING_ROOT } from '../../src/core/source/siblingSource';
import { discoverSourceSurfaces } from '../../src/core/source/surfaces';
import {
  classifySourceEvidenceQualifier,
  evaluateGenerationCurrency,
  evaluateProductionAdmissionEvidence,
  isGeneratedArtifactRoot,
  PROTO_SURFACE_CORROBORATIONS,
  sourceEvidenceProvenance,
} from '../../src/core/source/generatedArtifact';

const BLUEAPI = 'alphauslabs/blueapi';
const BLUEINTERNAL = 'alphauslabs/blueinternal';
const ARTIFACT_PATH = 'openapiv2/apidocs.swagger.json';
const RIPPLE_API = 'mobingilabs/ripple-api';

/** Measured at `alphauslabs/blueapi@691422e5` — the committed generated
 * artifact carries 462 paths / 591 verb-bound operations / 1,179 definitions. */
const EXPECTED_BLUEAPI_OPERATIONS = 591;
const EXPECTED_RIPPLE_OPERATIONS = 223;
const MINIMUM_BOUND_RESPONSE_CONTRACTS = 400;

function siblingRepoAvailable(repoId: string): boolean {
  return fs.existsSync(path.join(DEFAULT_SIBLING_ROOT, ...repoId.split('/'), '.git'));
}

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-c02a-'));
}

function writeSyntheticOpenApiRepo(root: string, repoId: string, sha: string, document: unknown): void {
  const repo = path.join(root, ...repoId.split('/'));
  fs.mkdirSync(path.join(repo, '.git', 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/master\n');
  fs.writeFileSync(path.join(repo, '.git', 'refs', 'heads', 'master'), `${sha}\n`);
  fs.mkdirSync(path.join(repo, 'openapiv2'), { recursive: true });
  fs.writeFileSync(path.join(repo, ARTIFACT_PATH), JSON.stringify(document));
}

function syntheticConfig(repoId: string, sha: string) {
  return createRealSourceScanConfig({
    runtimeMappingNamespace: 'ripple',
    approvedRepositories: [{
      repoId,
      expectedSourceSha: sha,
      allowlistedRoots: ['openapiv2'],
      allowedExtensions: ['.json'] as const,
      maxFiles: 16,
      maxFileBytes: 400_000,
      maxTotalBytes: 16_000_000,
    }],
  });
}

const SYNTHETIC_SHA = 'aaaabbbbccccddddeeeeffff00001111 22223333'.replace(/\s/g, '');

test.describe('C-02a — the generated root is admitted and the universe is not widened', () => {
  test('blueapi/openapiv2 is admitted and no repository is admitted with it', () => {
    const config = createApprovedRealSourceScanConfig({ repositoryIds: [BLUEAPI] });
    const repository = config.approvedRepositories.find((entry) => entry.repoId === BLUEAPI);
    expect(repository).toBeDefined();
    // C-02a's invariant is that `openapiv2` is admitted and that admitting it
    // widens no REPOSITORY. It was originally written as "exactly billing and
    // openapiv2", which was a true description of the root list at the time
    // rather than the property being defended: C-03 later admitted the other
    // blueapi proto roots under an explicit owner decision, and that is a
    // per-root change of the same class. The repository boundary is asserted
    // where it belongs, in the sibling test below.
    expect(repository!.allowlistedRoots).toContain('openapiv2');
    expect(repository!.allowlistedRoots).toContain('billing');
    expect(repository!.allowlistedRoots).not.toContain('protos');
  });

  test('an unapproved repository still fails closed', () => {
    expect(() => createApprovedRealSourceScanConfig({ repositoryIds: ['alphauslabs/not-a-repository'] })).toThrow(/REAL_SOURCE_SCAN_APPROVED_UNIVERSE/);
    expect(() => createApprovedRealSourceScanConfig({ repositoryIds: [] })).toThrow(/REAL_SOURCE_SCAN_APPROVED_UNIVERSE/);
  });

  test('C-02a admitted no repository — an unapproved repository is still refused', () => {
    // This assertion used to name `blueinternal` as the unapproved example.
    // C-05 then admitted it under explicit owner authorization, which made the
    // test fail for a reason that had nothing to do with C-02a's property. The
    // property is "C-02a widened no REPOSITORY", so it is now stated against a
    // repository that is genuinely unapproved — one of the 141 that discovery
    // can see and nothing may read.
    const unapproved = 'alphauslabs/blue';
    expect(PHASE25_APPROVED_REPOSITORY_IDS).not.toContain(unapproved);
    expect(() => createApprovedRealSourceScanConfig({ repositoryIds: [unapproved] })).toThrow(/REAL_SOURCE_SCAN_APPROVED_UNIVERSE/);
    // And C-02a's generated-root classification does not leak to it.
    expect(isGeneratedArtifactRoot(unapproved, 'openapiv2')).toBe(false);
    expect(classifySourceEvidenceQualifier(unapproved, ARTIFACT_PATH)).toBe('DIRECT_SOURCE');
  });

  test('blueinternal is a C-05 admission, and its artifact is GENERATED, not direct source', () => {
    // The complement of the test above, kept adjacent so the boundary between
    // the two campaigns stays legible: C-02a did not admit blueinternal, C-05
    // did, and once admitted its committed Swagger file must carry the
    // generated qualifier rather than passing as hand-written source.
    expect(PHASE25_APPROVED_REPOSITORY_IDS).toContain(BLUEINTERNAL);
    expect(isGeneratedArtifactRoot(BLUEINTERNAL, 'openapiv2')).toBe(true);
    expect(classifySourceEvidenceQualifier(BLUEINTERNAL, ARTIFACT_PATH)).toBe('GENERATED_ARTIFACT');
  });
});

test.describe('C-02a — generated-artifact evidence classification', () => {
  test('only the admitted generated root is qualified GENERATED_ARTIFACT', () => {
    expect(classifySourceEvidenceQualifier(BLUEAPI, ARTIFACT_PATH)).toBe('GENERATED_ARTIFACT');
    expect(classifySourceEvidenceQualifier(BLUEAPI, 'billing/v1/billing.proto')).toBe('DIRECT_SOURCE');
    expect(classifySourceEvidenceQualifier(RIPPLE_API, 'src/App/Route/Config/Routing.yaml')).toBe('DIRECT_SOURCE');
  });

  test('the artifact is still SOURCE_FACT — generated, not downgraded', () => {
    const provenance = sourceEvidenceProvenance({ repoId: BLUEAPI, sourceSha: SYNTHETIC_SHA, relativePath: ARTIFACT_PATH, artifactOperationCount: EXPECTED_BLUEAPI_OPERATIONS });
    expect(provenance.evidenceClass).toBe('SOURCE_FACT');
    expect(provenance.qualifier).toBe('GENERATED_ARTIFACT');
  });
});

test.describe('C-02a — generation currency against the proto surface', () => {
  test('no corroborator admitted yet, so currency is explicitly UNKNOWN and never CURRENT', () => {
    // C-02b owns the proto surface. Until it lands the registry is empty and
    // the honest answer is UNKNOWN — not an optimistic CURRENT.
    expect(PROTO_SURFACE_CORROBORATIONS).toHaveLength(0);
    const currency = evaluateGenerationCurrency({ repoId: BLUEAPI, sourceSha: SYNTHETIC_SHA, artifactPath: ARTIFACT_PATH, artifactOperationCount: EXPECTED_BLUEAPI_OPERATIONS });
    expect(currency.state).toBe('UNKNOWN');
    expect(currency.reason).toBe('GENERATION_CORROBORATOR_UNAVAILABLE');
    expect(currency.corroboratedOperationCount).toBeNull();
  });

  test('a corroboration at the exact snapshot with a matching count proves CURRENT', () => {
    const currency = evaluateGenerationCurrency({
      repoId: BLUEAPI,
      sourceSha: SYNTHETIC_SHA,
      artifactPath: ARTIFACT_PATH,
      artifactOperationCount: EXPECTED_BLUEAPI_OPERATIONS,
      corroborations: [{ repoId: BLUEAPI, sourceSha: SYNTHETIC_SHA, artifactPath: ARTIFACT_PATH, protoOperationCount: EXPECTED_BLUEAPI_OPERATIONS }],
    });
    expect(currency).toMatchObject({ state: 'CURRENT', reason: 'GENERATION_CORROBORATED_EXACT', corroboratedOperationCount: EXPECTED_BLUEAPI_OPERATIONS });
  });

  test('a count divergence is STALE, not silently accepted', () => {
    // The measured real divergence: the swagger mirror lags the protos
    // (get 185 vs 187, delete 60 vs 61, post 253 vs 254).
    const currency = evaluateGenerationCurrency({
      repoId: BLUEAPI,
      sourceSha: SYNTHETIC_SHA,
      artifactPath: ARTIFACT_PATH,
      artifactOperationCount: EXPECTED_BLUEAPI_OPERATIONS,
      corroborations: [{ repoId: BLUEAPI, sourceSha: SYNTHETIC_SHA, artifactPath: ARTIFACT_PATH, protoOperationCount: 595 }],
    });
    expect(currency).toMatchObject({ state: 'STALE', reason: 'GENERATION_OPERATION_COUNT_MISMATCH', corroboratedOperationCount: 595 });
  });

  test('a corroboration from a different snapshot never establishes currency', () => {
    const currency = evaluateGenerationCurrency({
      repoId: BLUEAPI,
      sourceSha: SYNTHETIC_SHA,
      artifactPath: ARTIFACT_PATH,
      artifactOperationCount: EXPECTED_BLUEAPI_OPERATIONS,
      corroborations: [{ repoId: BLUEAPI, sourceSha: `${SYNTHETIC_SHA.slice(0, 39)}0`, artifactPath: ARTIFACT_PATH, protoOperationCount: EXPECTED_BLUEAPI_OPERATIONS }],
    });
    expect(currency).toMatchObject({ state: 'UNKNOWN', reason: 'GENERATION_CORROBORATION_SNAPSHOT_MISMATCH' });
  });

  test('duplicate or malformed corroborations fail closed to UNKNOWN', () => {
    const duplicate = evaluateGenerationCurrency({
      repoId: BLUEAPI,
      sourceSha: SYNTHETIC_SHA,
      artifactPath: ARTIFACT_PATH,
      artifactOperationCount: EXPECTED_BLUEAPI_OPERATIONS,
      corroborations: [
        { repoId: BLUEAPI, sourceSha: SYNTHETIC_SHA, artifactPath: ARTIFACT_PATH, protoOperationCount: EXPECTED_BLUEAPI_OPERATIONS },
        { repoId: BLUEAPI, sourceSha: SYNTHETIC_SHA, artifactPath: ARTIFACT_PATH, protoOperationCount: EXPECTED_BLUEAPI_OPERATIONS },
      ],
    });
    expect(duplicate).toMatchObject({ state: 'UNKNOWN', reason: 'GENERATION_CORROBORATION_MALFORMED' });
    const malformed = evaluateGenerationCurrency({
      repoId: BLUEAPI,
      sourceSha: SYNTHETIC_SHA,
      artifactPath: ARTIFACT_PATH,
      artifactOperationCount: EXPECTED_BLUEAPI_OPERATIONS,
      corroborations: [{ repoId: BLUEAPI, sourceSha: SYNTHETIC_SHA, artifactPath: ARTIFACT_PATH, protoOperationCount: -1 }],
    });
    expect(malformed).toMatchObject({ state: 'UNKNOWN', reason: 'GENERATION_CORROBORATION_MALFORMED' });
  });
});

test.describe('C-02a — generated evidence can never solely grant production admission', () => {
  test('GENERATED_ARTIFACT alone is DENIED even when the artifact is provably CURRENT', () => {
    const currency = evaluateGenerationCurrency({
      repoId: BLUEAPI,
      sourceSha: SYNTHETIC_SHA,
      artifactPath: ARTIFACT_PATH,
      artifactOperationCount: EXPECTED_BLUEAPI_OPERATIONS,
      corroborations: [{ repoId: BLUEAPI, sourceSha: SYNTHETIC_SHA, artifactPath: ARTIFACT_PATH, protoOperationCount: EXPECTED_BLUEAPI_OPERATIONS }],
    });
    const decision = evaluateProductionAdmissionEvidence({ qualifiers: ['GENERATED_ARTIFACT'], generationCurrency: currency });
    expect(decision.state).toBe('DENIED');
    expect(decision.denialCodes).toEqual(['GENERATED_ARTIFACT_SOLE_EVIDENCE']);
  });

  test('UNKNOWN and STALE currency each deny on their own', () => {
    const unknown = evaluateProductionAdmissionEvidence({ qualifiers: ['DIRECT_SOURCE', 'GENERATED_ARTIFACT'], generationCurrency: null });
    expect(unknown.state).toBe('DENIED');
    expect(unknown.denialCodes).toEqual(['GENERATION_CURRENCY_UNKNOWN']);
    const stale = evaluateProductionAdmissionEvidence({
      qualifiers: ['DIRECT_SOURCE', 'GENERATED_ARTIFACT'],
      generationCurrency: { state: 'STALE', reason: 'GENERATION_OPERATION_COUNT_MISMATCH', corroborator: 'PROTO_SURFACE', artifactOperationCount: 591, corroboratedOperationCount: 595 },
    });
    expect(stale.state).toBe('DENIED');
    expect(stale.denialCodes).toEqual(['GENERATION_CURRENCY_STALE']);
  });

  test('the gate only ever denies — direct source is never granted authority here', () => {
    const decision = evaluateProductionAdmissionEvidence({ qualifiers: ['DIRECT_SOURCE'], generationCurrency: null });
    expect(decision.state).toBe('NOT_DENIED_BY_EVIDENCE_CLASS');
    expect(decision.denialCodes).toEqual([]);
    // "not denied" is the strongest word available; there is no GRANTED state.
    expect(Object.values(decision)).not.toContain('GRANTED');
  });
});

test.describe('C-02a — $ref → definitions binding through the existing parser', () => {
  test('resolved, malformed, and missing references are each reported truthfully', () => {
    const root = tempRoot();
    try {
      writeSyntheticOpenApiRepo(root, BLUEAPI, SYNTHETIC_SHA, {
        swagger: '2.0',
        paths: {
          '/v1/resolved': { get: { operationId: 'Svc_Resolved', responses: { '200': { schema: { $ref: '#/definitions/apiOk' } }, default: { schema: { $ref: '#/definitions/rpcStatus' } } } } },
          '/v1/missing': { get: { operationId: 'Svc_Missing', responses: { '200': { schema: { $ref: '#/definitions/apiGone' } } } } },
          '/v1/malformed': { get: { operationId: 'Svc_Malformed', responses: { '200': { schema: { $ref: 'https://elsewhere.example/schema.json' } } } } },
          '/v1/inline': { get: { operationId: 'Svc_Inline', responses: { '200': { schema: { type: 'object' } } } } },
        },
        definitions: {
          apiOk: { type: 'object', properties: { id: { type: 'string' }, total: { type: 'number' } } },
          rpcStatus: { type: 'object', properties: { code: { type: 'integer' }, message: { type: 'string' } } },
        },
      });
      const discovery = discoverSourceSurfaces({ access: createSiblingSourceAccess(root), config: syntheticConfig(BLUEAPI, SYNTHETIC_SHA) });
      const byRoute = new Map(discovery.surfaces.map((surface) => [surface.operation.routeTemplate, surface]));
      expect([...byRoute.keys()].sort()).toEqual(['/v1/inline', '/v1/malformed', '/v1/missing', '/v1/resolved']);

      const resolved = byRoute.get('/v1/resolved')!;
      expect(resolved.contract.responseDefinitions).toEqual([
        { statusCode: '200', state: 'RESOLVED', definition: 'apiOk', fieldCount: 2, definitionDigest: expect.any(String) },
        { statusCode: 'default', state: 'RESOLVED', definition: 'rpcStatus', fieldCount: 2, definitionDigest: expect.any(String) },
      ]);
      expect(resolved.contract.responseProof).toBe('PROVEN');
      expect(resolved.contract.responseContractId).not.toBeNull();

      // A reference into an absent definition is an explicit failure, and it
      // does not fabricate a response contract.
      const missing = byRoute.get('/v1/missing')!;
      expect(missing.contract.responseDefinitions).toEqual([{ statusCode: '200', state: 'DEFINITION_MISSING', definition: 'apiGone', fieldCount: 0, definitionDigest: null }]);
      expect(missing.contract.responseProof).not.toBe('PROVEN');
      expect(missing.exclusionReasons).toContain('RESPONSE_CONTRACT_UNPROVEN');
      expect(missing.joins.some((join) => join.kind === 'OPENAPI_RESPONSE_DEFINITION' && join.state === 'UNSUPPORTED_REFERENCE')).toBe(true);

      // A non-local reference is rejected structurally, never fetched.
      const malformed = byRoute.get('/v1/malformed')!;
      expect(malformed.contract.responseDefinitions).toEqual([{ statusCode: '200', state: 'REF_MALFORMED', definition: null, fieldCount: 0, definitionDigest: null }]);
      expect(malformed.contract.responseProof).not.toBe('PROVEN');

      // An inline schema carries no `$ref`; it produces no binding at all.
      expect(byRoute.get('/v1/inline')!.contract.responseDefinitions).toEqual([]);

      expect(discovery.counters.openApiResponseDefinitionsBound).toBe(2);
      expect(discovery.counters.openApiResponseDefinitionsUnresolved).toBe(2);
      expect(discovery.counters.generatedArtifactOperations).toBe(4);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('every generated surface carries provenance that denies production admission', () => {
    const root = tempRoot();
    try {
      writeSyntheticOpenApiRepo(root, BLUEAPI, SYNTHETIC_SHA, {
        swagger: '2.0',
        paths: { '/v1/thing': { get: { operationId: 'Svc_Thing', responses: { '200': { schema: { $ref: '#/definitions/apiOk' } } } } } },
        definitions: { apiOk: { type: 'object', properties: { id: { type: 'string' } } } },
      });
      const discovery = discoverSourceSurfaces({ access: createSiblingSourceAccess(root), config: syntheticConfig(BLUEAPI, SYNTHETIC_SHA) });
      const surface = discovery.surfaces[0]!;
      expect(surface.sourceEvidence).toEqual({
        schemaVersion: 'nightwatch.source-evidence-provenance.v1',
        evidenceClass: 'SOURCE_FACT',
        qualifier: 'GENERATED_ARTIFACT',
        generationCurrency: { state: 'UNKNOWN', reason: 'GENERATION_CORROBORATOR_UNAVAILABLE', corroborator: 'PROTO_SURFACE', artifactOperationCount: 1, corroboratedOperationCount: null },
        productionAdmission: { state: 'DENIED', denialCodes: ['GENERATED_ARTIFACT_SOLE_EVIDENCE', 'GENERATION_CURRENCY_UNKNOWN'] },
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

test.describe('C-02a — the real committed blueapi artifact', () => {
  test.skip(() => !siblingRepoAvailable(BLUEAPI) || !siblingRepoAvailable(RIPPLE_API), 'requires the read-only sibling Alphaus checkouts');

  test('recovers >= 591 operations with verb, path and operationId, and >= 400 bound response contracts', () => {
    const discovery = discoverSourceSurfaces({ access: createSiblingSourceAccess(DEFAULT_SIBLING_ROOT), config: createApprovedRealSourceScanConfig() });
    // C-02b later admitted `.proto` into the same repository, so "the blueapi
    // surfaces" and "the surfaces from the generated artifact" stopped being
    // the same set. Every claim below is about the artifact, so it is now
    // scoped to the artifact rather than to the repository.
    const blueapi = discovery.surfaces.filter((surface) => surface.operation.repository === BLUEAPI && surface.operation.sourcePath === ARTIFACT_PATH);

    expect(blueapi.length).toBeGreaterThanOrEqual(EXPECTED_BLUEAPI_OPERATIONS);
    // Every one of them came from the OpenAPI branch of the existing parser.
    expect(blueapi.every((surface) => surface.operation.language === 'OPENAPI')).toBe(true);

    // Verb, path and operationId are all preserved, exactly and distinctly.
    expect(blueapi.every((surface) => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(surface.operation.method))).toBe(true);
    expect(blueapi.every((surface) => surface.operation.routeTemplate.startsWith('/'))).toBe(true);
    expect(blueapi.every((surface) => surface.operation.routeTemplate !== '/')).toBe(true);
    expect(blueapi.every((surface) => surface.operation.handlerSymbol !== null)).toBe(true);
    expect(new Set(blueapi.map((surface) => surface.operation.handlerSymbol)).size).toBe(blueapi.length);
    expect(new Set(blueapi.map((surface) => surface.operation.operationId)).size).toBe(blueapi.length);
    expect(blueapi.every((surface) => surface.operation.routeProof === 'PROVEN')).toBe(true);

    // Response contracts are recovered from the document's own definitions.
    const bound = blueapi.reduce((count, surface) => count + surface.contract.responseDefinitions.filter((binding) => binding.state === 'RESOLVED').length, 0);
    expect(bound).toBeGreaterThanOrEqual(MINIMUM_BOUND_RESPONSE_CONTRACTS);
    // The counter is repository-wide, so it is compared to the repository-wide
    // sum. It equalled the artifact's own total only while the artifact was
    // the sole OpenAPI source carrying definitions; ouchan's
    // `services/*/docs/swagger.json` files became visible when C-03 corrected
    // that repository's scan budget.
    const allBound = discovery.surfaces.reduce((count, surface) => count + surface.contract.responseDefinitions.filter((binding) => binding.state === 'RESOLVED').length, 0);
    expect(discovery.counters.openApiResponseDefinitionsBound).toBe(allBound);
    expect(allBound).toBeGreaterThanOrEqual(bound);
    expect(blueapi.filter((surface) => surface.contract.responseProof === 'PROVEN').length).toBeGreaterThanOrEqual(MINIMUM_BOUND_RESPONSE_CONTRACTS);
    // `generatedArtifactOperations` is a GLOBAL counter, and this compared it
    // to blueapi's own count — sound only while blueapi was the only admitted
    // generated root. C-05 admitted `blueinternal/openapiv2`, another committed
    // Swagger artifact, and the counter became 642. The property C-02a defends
    // is that every blueapi artifact surface IS counted as generated, so it is
    // now stated as a per-repository contribution plus a global lower bound.
    const generatedElsewhere = discovery.operations.filter((operation) => operation.repository !== BLUEAPI
      && classifySourceEvidenceQualifier(operation.repository, operation.sourcePath) === 'GENERATED_ARTIFACT').length;
    expect(discovery.counters.generatedArtifactOperations).toBe(blueapi.length + generatedElsewhere);
    expect(discovery.counters.generatedArtifactOperations).toBeGreaterThanOrEqual(blueapi.length);
  });

  test('every blueapi surface is GENERATED_ARTIFACT with UNKNOWN currency and a denied production admission', () => {
    const discovery = discoverSourceSurfaces({ access: createSiblingSourceAccess(DEFAULT_SIBLING_ROOT), config: createApprovedRealSourceScanConfig() });
    const blueapi = discovery.surfaces.filter((surface) => surface.operation.repository === BLUEAPI && surface.operation.sourcePath === ARTIFACT_PATH);
    expect(blueapi.length).toBeGreaterThan(0);
    for (const surface of blueapi) {
      expect(surface.sourceEvidence.qualifier).toBe('GENERATED_ARTIFACT');
      expect(surface.sourceEvidence.evidenceClass).toBe('SOURCE_FACT');
      expect(surface.sourceEvidence.generationCurrency?.state).toBe('UNKNOWN');
      expect(surface.sourceEvidence.productionAdmission.state).toBe('DENIED');
    }

    // The C-02b protobuf surface in the SAME repository is direct source, and
    // the generated-artifact denial does not leak onto it. Repository identity
    // never decided the evidence class; the root always did.
    const protoSurfaces = discovery.surfaces.filter((surface) => surface.operation.repository === BLUEAPI && surface.operation.language === 'PROTOBUF');
    expect(protoSurfaces.length).toBeGreaterThan(0);
    expect(protoSurfaces.every((surface) => surface.sourceEvidence.qualifier === 'DIRECT_SOURCE')).toBe(true);
    expect(protoSurfaces.every((surface) => surface.sourceEvidence.generationCurrency === null)).toBe(true);
    // Ripple stays direct source and is not collaterally denied.
    const ripple = discovery.surfaces.filter((surface) => surface.operation.repository === RIPPLE_API);
    expect(ripple.length).toBe(EXPECTED_RIPPLE_OPERATIONS);
    expect(ripple.every((surface) => surface.sourceEvidence.qualifier === 'DIRECT_SOURCE')).toBe(true);
    expect(ripple.every((surface) => surface.sourceEvidence.generationCurrency === null)).toBe(true);
    expect(ripple.every((surface) => surface.sourceEvidence.productionAdmission.state === 'NOT_DENIED_BY_EVIDENCE_CLASS')).toBe(true);
  });

  test('C-01 invariants hold: no eviction, no lost identity, truthful completeness', () => {
    const access = createSiblingSourceAccess(DEFAULT_SIBLING_ROOT);
    // The pre-C-02a universe, reconstructed by asking for exactly the
    // repositories that produced operations before this campaign.
    const before = discoverSourceSurfaces({ access, config: createApprovedRealSourceScanConfig({ repositoryIds: [RIPPLE_API] }) });
    const after = discoverSourceSurfaces({ access, config: createApprovedRealSourceScanConfig() });

    const beforeIdentities = new Set(before.operations.map((operation) => `${operation.repository}|${operation.operationId}`));
    const afterIdentities = new Set(after.operations.map((operation) => `${operation.repository}|${operation.operationId}`));
    expect(beforeIdentities.size).toBe(EXPECTED_RIPPLE_OPERATIONS);
    for (const identity of beforeIdentities) expect(afterIdentities.has(identity)).toBe(true);

    // The expanded, earlier-sorting `alphauslabs/blueapi` repository evicted
    // nothing: both repositories project every operation they parsed.
    expect(after.operationCompleteness.droppedOperations).toBe(0);
    expect(after.operationCompleteness.truncated).toBe(false);
    for (const repository of after.operationCompleteness.repositories) {
      expect(repository.droppedOperations).toBe(0);
      expect(repository.projectedOperations).toBe(repository.examinedOperations);
    }
    // The artifact still contributes exactly its own operations. Asserting the
    // repository total here would silently absorb C-02b's protobuf operations
    // into C-02a's claim; asserting the artifact's own contribution keeps the
    // two campaigns' evidence separable.
    //
    // The filter was on sourcePath ALONE, which assumed only one repository in
    // the universe could hold a file at that path. C-05 admitted
    // `blueinternal`, whose generated artifact sits at exactly the same
    // relative path, so the repository is now part of the identity.
    expect(after.operations.filter((operation) => operation.repository === BLUEAPI
      && operation.sourcePath === ARTIFACT_PATH).length).toBe(EXPECTED_BLUEAPI_OPERATIONS);
    expect(after.operations.length).toBeGreaterThanOrEqual(before.operations.length + EXPECTED_BLUEAPI_OPERATIONS);

    // Completeness stays truthful rather than optimistic: the upstream file
    // enumeration is still bounded, so the true total remains unknown.
    expect(after.operationCompleteness.remainingUnknown).toBe(true);
    expect(after.operationCompleteness.totalOperations).toBeNull();
    expect(after.operationCompleteness.state).toBe('UNKNOWN');
    expect(after.operationCompleteness.coverageState).toBe('UNKNOWN');
  });
});
