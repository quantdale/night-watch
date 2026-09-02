// ---------------------------------------------------------------------------
// Nightwatch C-02b — proto ↔ generated-OpenAPI corroboration.
//
// OpenSpec audit finding A-4 is the reason this suite exists. C-02a's
// `evaluateGenerationCurrency` returns CURRENT when the proto operation count
// equals the artifact operation count, and both are 147. Handing that seam a
// count would have promoted blueapi out of a production-admission denial
// without comparing a single route.
//
// The tests below therefore attack the seam directly: they construct surfaces
// that AGREE on totals and DISAGREE on content, and require that currency
// stays out of CURRENT. A rule that only ever sees matching inputs is not a
// rule, so every outcome in the vocabulary is exercised with a fixture built
// to produce it.
//
// All fixtures are explicit inline data.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { readProtoDeclarations } from '../../src/core/source/protoDeclarations';
import {
  corroborateProtoAgainstOpenApi,
  PROTO_CORROBORATION_OUTCOMES,
  toProtoSurfaceCorroboration,
  type OpenApiOperationView,
} from '../../src/core/source/protoCorroboration';
import { evaluateGenerationCurrency, evaluateProductionAdmissionEvidence } from '../../src/core/source/generatedArtifact';
import { DEFAULT_SIBLING_ROOT, createSiblingSourceAccess } from '../../src/core/source/siblingSource';

const REPO = 'alphauslabs/blueapi';
const SHA = '691422e5dc81afd263d064986fb50fcb3ea432a9';
const ARTIFACT = 'openapiv2/apidocs.swagger.json';
const PROTO = 'billing/v1/billing.proto';

const TWO_RPC_PROTO = `
syntax = "proto3";
package blueapi.billing.v1;
service Billing {
  rpc ListThings(ListThingsRequest) returns (ListThingsResponse) {
    option (google.api.http) = { get: "/v1/things" };
  }
  rpc CreateThing(CreateThingRequest) returns (Thing) {
    option (google.api.http) = { post: "/v1/things" body: "*" };
  }
}
`;

function corroborate(openApiOperations: readonly OpenApiOperationView[], protoText = TWO_RPC_PROTO) {
  return corroborateProtoAgainstOpenApi({
    repoId: REPO,
    sourceSha: SHA,
    artifactPath: ARTIFACT,
    protoPath: PROTO,
    protoFacts: readProtoDeclarations(protoText),
    openApiOperations,
  });
}

const FAITHFUL: readonly OpenApiOperationView[] = [
  { operationId: 'Billing_ListThings', method: 'get', routeTemplate: '/v1/things' },
  { operationId: 'Billing_CreateThing', method: 'post', routeTemplate: '/v1/things' },
];

test.describe('C-02b — a faithful mirror corroborates exactly', () => {
  test('every operation matches and the state is CORROBORATED_EXACT', () => {
    const result = corroborate(FAITHFUL);
    expect(result.counts.MATCH).toBe(2);
    expect(result.state).toBe('CORROBORATED_EXACT');
    expect(result.limits).toEqual([]);
    expect(result.protoOperationCount).toBe(2);
  });

  test('only a CORROBORATED_EXACT result reaches the C-02a currency seam', () => {
    const record = toProtoSurfaceCorroboration(corroborate(FAITHFUL));
    expect(record).not.toBeNull();
    const currency = evaluateGenerationCurrency({
      repoId: REPO,
      sourceSha: SHA,
      artifactPath: ARTIFACT,
      artifactOperationCount: 2,
      corroborations: [record!],
    });
    expect(currency.state).toBe('CURRENT');
    expect(currency.reason).toBe('GENERATION_CORROBORATED_EXACT');
  });

  test('the result is deterministic and order-independent', () => {
    const forward = corroborate(FAITHFUL);
    const reversed = corroborate([...FAITHFUL].reverse());
    expect(reversed.corroborationDigest).toBe(forward.corroborationDigest);
    expect(corroborate(FAITHFUL).corroborationDigest).toBe(forward.corroborationDigest);
  });
});

test.describe('C-02b — A-4: counts agreeing is never corroboration', () => {
  test('a differing path is PATH_MISMATCH even though the totals agree', () => {
    const result = corroborate([
      { operationId: 'Billing_ListThings', method: 'get', routeTemplate: '/v1/things' },
      { operationId: 'Billing_CreateThing', method: 'post', routeTemplate: '/v2/things' },
    ]);
    expect(result.openApiOperationCount).toBe(result.protoOperationCount);
    expect(result.counts.PATH_MISMATCH).toBe(1);
    expect(result.state).toBe('DIVERGENT');
  });

  test('a differing verb is METHOD_MISMATCH even though the totals agree', () => {
    const result = corroborate([
      { operationId: 'Billing_ListThings', method: 'get', routeTemplate: '/v1/things' },
      { operationId: 'Billing_CreateThing', method: 'put', routeTemplate: '/v1/things' },
    ]);
    expect(result.counts.METHOD_MISMATCH).toBe(1);
    expect(result.state).toBe('DIVERGENT');
  });

  test('a renamed path placeholder is a real divergence, not a normalization', () => {
    // The artifact is meant to be a faithful mirror. Normalizing `{id}` and
    // `{thingId}` to the same shape would hide exactly the drift this exists
    // to catch.
    const result = corroborate(
      [{ operationId: 'Billing_GetThing', method: 'get', routeTemplate: '/v1/things/{thingId}' }],
      `
        package blueapi.billing.v1;
        service Billing {
          rpc GetThing(Q) returns (S) { option (google.api.http) = { get: "/v1/things/{id}" }; }
        }
      `,
    );
    expect(result.counts.PATH_MISMATCH).toBe(1);
    expect(result.state).toBe('DIVERGENT');
  });

  test('a DIVERGENT result yields no corroborator, so currency stays UNKNOWN', () => {
    // This is the gate. Same totals, one differing route, and the artifact
    // must remain UNKNOWN and production-denied.
    const divergent = corroborate([
      { operationId: 'Billing_ListThings', method: 'get', routeTemplate: '/v1/things' },
      { operationId: 'Billing_CreateThing', method: 'post', routeTemplate: '/v2/things' },
    ]);
    const record = toProtoSurfaceCorroboration(divergent);
    expect(record).toBeNull();

    const currency = evaluateGenerationCurrency({
      repoId: REPO,
      sourceSha: SHA,
      artifactPath: ARTIFACT,
      artifactOperationCount: divergent.openApiOperationCount,
      corroborations: [],
    });
    expect(currency.state).toBe('UNKNOWN');
    expect(currency.reason).toBe('GENERATION_CORROBORATOR_UNAVAILABLE');
    expect(evaluateProductionAdmissionEvidence({ qualifiers: ['GENERATED_ARTIFACT'], generationCurrency: currency }).state).toBe('DENIED');
  });
});

test.describe('C-02b — every outcome in the vocabulary is reachable', () => {
  test('PROTO_ONLY when the artifact omits an RPC', () => {
    const result = corroborate([FAITHFUL[0] as OpenApiOperationView]);
    expect(result.counts.PROTO_ONLY).toBe(1);
    expect(result.state).toBe('DIVERGENT');
  });

  test('OPENAPI_ONLY when the artifact carries an RPC the proto does not declare', () => {
    const result = corroborate([...FAITHFUL, { operationId: 'Billing_DeleteThing', method: 'delete', routeTemplate: '/v1/things/{id}' }]);
    expect(result.counts.OPENAPI_ONLY).toBe(1);
    expect(result.state).toBe('DIVERGENT');
  });

  test('AMBIGUOUS when the artifact repeats one operationId', () => {
    const result = corroborate([...FAITHFUL, { operationId: 'Billing_ListThings', method: 'get', routeTemplate: '/v1/things/all' }]);
    expect(result.counts.AMBIGUOUS).toBe(1);
    expect(result.state).toBe('DIVERGENT');
  });

  test('AMBIGUOUS when the proto RPC itself carries several bindings', () => {
    const result = corroborate(
      [{ operationId: 'Billing_GetThing', method: 'get', routeTemplate: '/v1/things/{id}' }],
      `
        package blueapi.billing.v1;
        service Billing {
          rpc GetThing(Q) returns (S) {
            option (google.api.http) = {
              get: "/v1/things/{id}"
              additional_bindings { get: "/v2/things/{id}" }
            };
          }
        }
      `,
    );
    expect(result.counts.AMBIGUOUS).toBe(1);
    expect(result.state).toBe('DIVERGENT');
  });

  test('UNCORROBORATABLE when the proto binding is unproven', () => {
    const result = corroborate(
      [{ operationId: 'Billing_GetThing', method: 'get', routeTemplate: '/v1/things/{id}' }],
      `
        package blueapi.billing.v1;
        service Billing {
          rpc GetThing(Q) returns (S) { option (google.api.http) = { get: }; }
        }
      `,
    );
    expect(result.counts.UNCORROBORATABLE).toBe(1);
    expect(result.state).toBe('UNCORROBORATABLE');
  });

  test('UNCORROBORATABLE when both the verb and the path differ', () => {
    const result = corroborate([
      { operationId: 'Billing_ListThings', method: 'get', routeTemplate: '/v1/things' },
      { operationId: 'Billing_CreateThing', method: 'put', routeTemplate: '/v9/other' },
    ]);
    expect(result.counts.UNCORROBORATABLE).toBe(1);
  });

  test('the seven declared outcomes are exactly the seven counted', () => {
    expect([...PROTO_CORROBORATION_OUTCOMES].sort()).toEqual(Object.keys(corroborate(FAITHFUL).counts).sort());
  });
});

test.describe('C-02b — partial coverage never certifies the whole artifact', () => {
  test('artifact operations for unreadable services are absence, not divergence', () => {
    const result = corroborate([...FAITHFUL, { operationId: 'Cover_ListRecommendations', method: 'get', routeTemplate: '/v1/cover' }]);
    expect(result.counts.MATCH).toBe(2);
    expect(result.counts.OPENAPI_ONLY).toBe(0);
    expect(result.outOfScopeOperationCount).toBe(1);
    expect(result.limits).toContain('ARTIFACT_COVERS_UNREADABLE_SERVICES');
    expect(result.state).toBe('UNCORROBORATABLE');
    expect(toProtoSurfaceCorroboration(result)).toBeNull();
  });

  test('an incompletely read proto cannot corroborate however well it agrees', () => {
    const result = corroborateProtoAgainstOpenApi({
      repoId: REPO,
      sourceSha: SHA,
      artifactPath: ARTIFACT,
      protoPath: PROTO,
      protoFacts: { ...readProtoDeclarations(TWO_RPC_PROTO), completeness: { state: 'TRUNCATED', reason: 'PROTO_TOKEN_BUDGET_EXHAUSTED', malformedDeclarations: 0, droppedByCeiling: 0 } },
      openApiOperations: FAITHFUL,
    });
    expect(result.counts.MATCH).toBe(2);
    expect(result.limits).toContain('PROTO_SURFACE_INCOMPLETE');
    expect(result.state).toBe('UNCORROBORATABLE');
    expect(toProtoSurfaceCorroboration(result)).toBeNull();
  });
});

test.describe('C-02b — the real blueapi artifact against the real proto', () => {
  test('147 Billing operations corroborate exactly, and the artifact still stays UNKNOWN', () => {
    const repo = path.join(DEFAULT_SIBLING_ROOT, ...REPO.split('/'));
    test.skip(!fs.existsSync(path.join(repo, '.git')), 'blueapi checkout unavailable');

    const access = createSiblingSourceAccess(DEFAULT_SIBLING_ROOT);
    const protoFacts = readProtoDeclarations(access.reader.readFile(REPO, PROTO) as string);
    const document = JSON.parse(access.reader.readFile(REPO, ARTIFACT) as string) as { paths: Record<string, Record<string, { operationId?: string }>> };

    const openApiOperations: OpenApiOperationView[] = [];
    for (const [routeTemplate, methods] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
        openApiOperations.push({ operationId: operation.operationId ?? '', method, routeTemplate });
      }
    }
    expect(openApiOperations).toHaveLength(591);

    const result = corroborateProtoAgainstOpenApi({ repoId: REPO, sourceSha: SHA, artifactPath: ARTIFACT, protoPath: PROTO, protoFacts, openApiOperations });

    // Every one of the 147 Billing operations agrees, verb and path, with the
    // proto. That is a strong, per-operation statement about the generator.
    expect(result.counts.MATCH).toBe(147);
    expect(result.counts.PATH_MISMATCH).toBe(0);
    expect(result.counts.METHOD_MISMATCH).toBe(0);
    expect(result.counts.PROTO_ONLY).toBe(0);
    expect(result.counts.OPENAPI_ONLY).toBe(0);

    // And it still does not certify the artifact, because 444 of its 591
    // operations mirror services whose protos live in roots C-05 governs. A
    // campaign that read 147 operations may not speak for 591.
    expect(result.outOfScopeOperationCount).toBe(444);
    expect(result.limits).toEqual(['ARTIFACT_COVERS_UNREADABLE_SERVICES']);
    expect(result.state).toBe('UNCORROBORATABLE');
    expect(toProtoSurfaceCorroboration(result)).toBeNull();
  });
});
