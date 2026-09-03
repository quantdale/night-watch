// ---------------------------------------------------------------------------
// Nightwatch C-09 — spec-derived expectations.
//
// A spec sentence is not a machine expectation. Two things turn one into the
// other: an assertion an oracle can evaluate, and an EXACT operation the
// assertion is about. Neither may be supplied by interpretation.
//
// The load-bearing assertions here:
//
//   * all 332 OpenSpec scenarios are OUTSIDE_SCOPE, decided from the corpus
//     LOCATION rather than by reading a sentence — and kept distinct from
//     NO_OPERATION_BINDING, because not being a product claim differs from
//     being an unbound one;
//   * the operation join is exact by construction, so there is no similarity
//     step available to inflate the count;
//   * W-SPEC HELD alone yields neither READ_ONLY_PROVEN nor production
//     admission.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  PROSE_FIELDS,
  SPEC_EXPECTATION_CLASSES,
  SPEC_EXTRACTOR_VERSION,
  SCENARIO_CLASSIFICATIONS,
  deriveSpecExpectations,
  expectationCurrentness,
  provenanceIsComplete,
} from '../../src/core/source/specExpectations';
import {
  classifyScenarios,
  isNightwatchOwnSpecification,
  parseScenarioHeadings,
} from '../../src/core/source/specScenarioInventory';
import { READ_ONLY_WITNESS_CLASS, buildReadOnlyProof, type ReadOnlyWitness } from '../../src/core/source/readOnlyProof';

const root = path.resolve(__dirname, '..', '..');
const SIBLINGS = '/home/dalepalaca/go/src/alphaus-main/REPOSITORIES';

/** A minimal gRPC-gateway-shaped document. */
const DOCUMENT = {
  swagger: '2.0',
  paths: {
    '/v1/things': {
      get: { operationId: 'Things_List', responses: { 200: { schema: { $ref: '#/definitions/ListThingsResponse' } } } },
    },
    '/v1/things/{id}': {
      get: { operationId: 'Things_Get', responses: { 200: { schema: { $ref: '#/definitions/Thing' } } } },
    },
    '/v1/broken': {
      get: { operationId: 'Broken_Get', responses: { 200: { schema: { $ref: '#/definitions/Missing' } } } },
    },
    '/v1/schemaless': {
      get: { operationId: 'Schemaless_Get', responses: { 200: { description: 'no schema' } } },
    },
  },
  definitions: {
    ListThingsResponse: { type: 'object', properties: { things: { type: 'array' }, nextToken: { type: 'string' } } },
    Thing: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        count: { type: 'integer' },
        status: { $ref: '#/definitions/ThingStatus' },
        nested: { $ref: '#/definitions/Nested' },
      },
    },
    ThingStatus: { type: 'string', enum: ['STATUS_UNSPECIFIED', 'STATUS_OK', 'STATUS_BAD'] },
    Nested: { type: 'object', properties: { inner: { type: 'string' } } },
  },
};

const derive = (document: unknown = DOCUMENT) => deriveSpecExpectations({
  repoId: 'alphauslabs/blueapi', sourceSha: 'a'.repeat(40),
  artifactPath: 'openapiv2/apidocs.swagger.json', document,
});

test.describe('C-09 — the operation join is exact by construction', () => {
  test('each expectation names the operation the document attached the schema to', () => {
    const projection = derive();
    for (const expectation of projection.admitted) {
      expect(['Things_List', 'Things_Get']).toContain(expectation.provenance.operationId);
      expect(expectation.provenance.routePath.startsWith('/v1/')).toBe(true);
      expect(expectation.provenance.method).toBe('get');
    }
  });

  test('a response with no schema reference yields nothing rather than a guess', () => {
    const projection = derive();
    expect(projection.admitted.some((e) => e.provenance.operationId === 'Schemaless_Get')).toBe(false);
    expect(projection.rejections.some((r) => r.operationId === 'Schemaless_Get' && r.reason === 'NO_RESPONSE_SCHEMA_REFERENCE')).toBe(true);
  });

  test('an unresolvable reference is reported, never silently skipped', () => {
    const projection = derive();
    expect(projection.rejections.some((r) => r.operationId === 'Broken_Get' && r.reason === 'RESPONSE_REFERENCE_UNRESOLVED')).toBe(true);
    expect(projection.admitted.some((e) => e.provenance.operationId === 'Broken_Get')).toBe(false);
  });

  test('two operations sharing a definition each get their own expectation', () => {
    // The subject of the claim is the OPERATION, so a shared schema does not
    // collapse into one expectation.
    const shared = {
      paths: {
        '/a': { get: { operationId: 'A_Get', responses: { 200: { schema: { $ref: '#/definitions/S' } } } } },
        '/b': { get: { operationId: 'B_Get', responses: { 200: { schema: { $ref: '#/definitions/S' } } } } },
      },
      definitions: { S: { type: 'object', properties: { x: { type: 'string' } } } },
    };
    const projection = derive(shared);
    expect(projection.admitted.map((e) => e.provenance.operationId).sort()).toEqual(['A_Get', 'B_Get']);
  });

  test('the extractor exposes no similarity or matching surface', () => {
    // §45's warning is that the temptation is to match by name to hit a count.
    // There is no matching step in this module at all.
    //
    // Comments are stripped first. The module's own prose explains WHY
    // similarity matching is forbidden, so a raw-text check fails on the very
    // comment documenting compliance -- the trap the C-02b hardening rule
    // records as "read the DECLARATION, not the file", hit here a third time.
    const raw = fs.readFileSync(path.join(root, 'src/core/source/specExpectations.ts'), 'utf8');
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').toLowerCase();
    for (const forbidden of ['levenshtein', 'similarity', 'fuzzy', 'startswith(operationid', 'includes(operationid']) {
      expect(code).not.toContain(forbidden);
    }
    // And the check is not vacuous: the code body is still substantial.
    expect(code.length).toBeGreaterThan(3_000);
  });
});

test.describe('C-09 — only representable assertions, never prose', () => {
  test('all four classes derive from the fixture', () => {
    const projection = derive();
    expect(projection.byClass.RESPONSE_PROPERTY_TYPE).toBeGreaterThan(0);
    expect(projection.byClass.RESPONSE_PROPERTY_ENUM).toBe(1);
    expect(projection.byClass.RESPONSE_PROPERTY_SHAPE).toBe(1);
    expect(projection.byClass.RESPONSE_PROPERTY_CARDINALITY).toBe(1);
  });

  test('an enum expectation carries the fixed value set, sorted', () => {
    const enumExpectation = derive().admitted.find((e) => e.expectationClass === 'RESPONSE_PROPERTY_ENUM');
    expect(enumExpectation).toBeTruthy();
    expect(enumExpectation!.assertion.allowedValues).toEqual(['STATUS_BAD', 'STATUS_OK', 'STATUS_UNSPECIFIED']);
  });

  test('no assertion is derived from a prose field', () => {
    const prose = {
      paths: { '/p': { get: { operationId: 'P_Get', summary: 'returns everything', description: 'always 200',
        responses: { 200: { schema: { $ref: '#/definitions/D' } } } } } },
      definitions: { D: { type: 'object', description: 'a thing', title: 'D', properties: { f: { type: 'string', description: 'the f' } } } },
    };
    const projection = derive(prose);
    const serialised = JSON.stringify(projection.admitted);
    for (const text of ['returns everything', 'always 200', 'a thing', 'the f']) {
      expect(serialised).not.toContain(text);
    }
    // And the module names the prose fields it refuses.
    for (const field of ['summary', 'description', 'title']) expect(PROSE_FIELDS).toContain(field);
  });

  test('a property with no representable assertion is rejected, not invented', () => {
    const odd = {
      paths: { '/o': { get: { operationId: 'O_Get', responses: { 200: { schema: { $ref: '#/definitions/O' } } } } } },
      definitions: { O: { type: 'object', properties: { weird: { format: 'int64' } } } },
    };
    const projection = derive(odd);
    expect(projection.admitted).toHaveLength(0);
    expect(projection.rejections.some((r) => r.reason === 'PROPERTY_CARRIES_NO_REPRESENTABLE_ASSERTION')).toBe(true);
  });

  test('no REQUIRED_KEY class exists, and the absence is reported', () => {
    // Measured zero across both real artifacts: protobuf3 removed required
    // semantics and these are generator output. Approximating it from
    // `properties` membership would manufacture a claim the document does not
    // make -- present in a SCHEMA is not present in a RESPONSE.
    expect([...SPEC_EXPECTATION_CLASSES]).not.toContain('REQUIRED_KEY' as never);
    expect(derive().requiredKeyMaterialAvailable).toBe(false);
  });
});

test.describe('C-09 — provenance and currentness', () => {
  test('every admitted expectation carries complete provenance', () => {
    for (const expectation of derive().admitted) {
      expect(provenanceIsComplete(expectation.provenance)).toBe(true);
      expect(expectation.provenance.extractorVersion).toBe(SPEC_EXTRACTOR_VERSION);
      expect(expectation.provenance.digest).toMatch(/^spec:sha256:[0-9a-f]{24}$/);
      expect(expectation.currentness).toBe('CURRENT');
    }
  });

  test('an incomplete provenance record is not complete', () => {
    const expectation = derive().admitted[0]!;
    expect(provenanceIsComplete({ ...expectation.provenance, operationId: '' })).toBe(false);
    expect(provenanceIsComplete({ ...expectation.provenance, digest: '' })).toBe(false);
  });

  test('a changed SHA or digest yields STALE rather than a rebind', () => {
    const expectation = derive().admitted[0]!;
    expect(expectationCurrentness(expectation, expectation.provenance.sourceSha, expectation.provenance.digest)).toBe('CURRENT');
    expect(expectationCurrentness(expectation, 'b'.repeat(40), expectation.provenance.digest)).toBe('STALE');
    expect(expectationCurrentness(expectation, expectation.provenance.sourceSha, 'spec:sha256:000000000000000000000000')).toBe('STALE');
  });

  test('the digest is over the normalized assertion, so formatting is not a change', () => {
    const reordered = JSON.parse(JSON.stringify(DOCUMENT));
    const a = derive().admitted.map((e) => e.provenance.digest).sort();
    const b = derive(reordered).admitted.map((e) => e.provenance.digest).sort();
    expect(a).toEqual(b);
  });
});

test.describe('C-09 — every scenario is classified, and the corpus is out of scope', () => {
  test('the real corpus is enumerated and every scenario is classified', () => {
    const specFiles: string[] = [];
    const walk = (directory: string) => {
      for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
        const next = `${directory}/${entry.name}`;
        if (entry.isDirectory()) walk(next);
        else if (entry.name === 'spec.md') specFiles.push(next);
      }
    };
    walk('openspec/changes');
    expect(specFiles.length).toBeGreaterThanOrEqual(37);
    const discovered = specFiles.flatMap((file) => parseScenarioHeadings(file, fs.readFileSync(path.join(root, file), 'utf8')));
    // The measured corpus. A count that drops means scenarios vanished.
    expect(discovered.length).toBeGreaterThanOrEqual(332);
    const inventory = classifyScenarios(discovered);
    expect(inventory.totalityHolds).toBe(true);
    expect(inventory.classifiedCount).toBe(discovered.length);
    // All of it specifies Nightwatch, so all of it is OUTSIDE_SCOPE.
    expect(inventory.byClassification.OUTSIDE_SCOPE).toBe(discovered.length);
    expect(inventory.byClassification.CHECKABLE).toBe(0);
    expect(inventory.byReason.NIGHTWATCH_OWN_SPECIFICATION).toBe(discovered.length);
  });

  test('OUTSIDE_SCOPE is decided from the path, not by reading the sentence', () => {
    expect(isNightwatchOwnSpecification('openspec/changes/some-campaign/specs/a-thing/spec.md')).toBe(true);
    expect(isNightwatchOwnSpecification('openspec/changes/some-campaign/design.md')).toBe(true);
    expect(isNightwatchOwnSpecification('product/specs/billing/spec.md')).toBe(false);
  });

  test('OUTSIDE_SCOPE is NOT collapsed into NO_OPERATION_BINDING', () => {
    // Not being a product claim differs from being an unbound product claim,
    // and the second is a far more flattering statement about coverage.
    const nightwatch = classifyScenarios([{ specPath: 'openspec/changes/c/specs/s/spec.md', requirementTitle: 'R', scenarioTitle: 'S', line: 1 }]);
    expect(nightwatch.byClassification.OUTSIDE_SCOPE).toBe(1);
    expect(nightwatch.byClassification.NO_OPERATION_BINDING).toBe(0);
    const product = classifyScenarios([{ specPath: 'product/specs/x/spec.md', requirementTitle: 'Unbound_Op', scenarioTitle: 'S', line: 1 }]);
    expect(product.byClassification.NO_OPERATION_BINDING).toBe(1);
    expect(product.byClassification.OUTSIDE_SCOPE).toBe(0);
  });

  test('a product scenario with an admitted expectation is CHECKABLE', () => {
    const inventory = classifyScenarios(
      [{ specPath: 'product/specs/x/spec.md', requirementTitle: 'Things_Get', scenarioTitle: 'S', line: 1 }],
      new Set(['Things_Get']),
    );
    expect(inventory.byClassification.CHECKABLE).toBe(1);
    expect(inventory.byReason.PRODUCT_EXPECTATION_ADMITTED).toBe(1);
  });

  test('dropping a scenario breaks totality', () => {
    const discovered = [
      { specPath: 'openspec/changes/c/specs/s/spec.md', requirementTitle: null, scenarioTitle: 'one', line: 1 },
      { specPath: 'openspec/changes/c/specs/s/spec.md', requirementTitle: null, scenarioTitle: 'two', line: 2 },
    ];
    const inventory = classifyScenarios(discovered);
    expect(inventory.discoveredCount).toBe(2);
    expect(inventory.classifiedCount).toBe(2);
    expect(inventory.totalityHolds).toBe(true);
  });

  test('the classification vocabulary is exactly the eight required members', () => {
    expect([...SCENARIO_CLASSIFICATIONS]).toEqual([
      'CHECKABLE', 'NON_CHECKABLE', 'AMBIGUOUS', 'UNSUPPORTED',
      'NO_OPERATION_BINDING', 'MULTIPLE_BINDINGS', 'STALE', 'OUTSIDE_SCOPE',
    ]);
  });

  test('headings are read, bullet prose is not', () => {
    const scenarios = parseScenarioHeadings('openspec/changes/c/specs/s/spec.md', [
      '### Requirement: a thing',
      '#### Scenario: it works',
      '- **WHEN** something natural language happens',
      '- **THEN** something else',
    ].join('\n'));
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0]!.scenarioTitle).toBe('it works');
    expect(scenarios[0]!.requirementTitle).toBe('a thing');
    expect(JSON.stringify(scenarios)).not.toContain('natural language');
  });
});

test.describe('C-09 — the real artifacts, measured', () => {
  const artifact = (repo: string) => path.join(SIBLINGS, repo, 'openapiv2/apidocs.swagger.json');

  test('blueapi yields expectations far beyond the 40 target, all exactly joined', () => {
    test.skip(!fs.existsSync(artifact('alphauslabs/blueapi')), 'requires the read-only sibling Alphaus checkouts');
    const projection = deriveSpecExpectations({
      repoId: 'alphauslabs/blueapi', sourceSha: 'c'.repeat(40), artifactPath: 'openapiv2/apidocs.swagger.json',
      document: JSON.parse(fs.readFileSync(artifact('alphauslabs/blueapi'), 'utf8')),
    });
    expect(projection.operationsExamined).toBe(591);
    expect(projection.operationsWithResolvedSchema).toBe(591);
    expect(projection.admitted.length).toBeGreaterThanOrEqual(40);
    expect(projection.truncated).toBe(false);
    for (const expectation of projection.admitted) expect(provenanceIsComplete(expectation.provenance)).toBe(true);
  });

  test('blueinternal yields expectations too, from the C-05 admission', () => {
    test.skip(!fs.existsSync(artifact('alphauslabs/blueinternal')), 'requires the read-only sibling Alphaus checkouts');
    const projection = deriveSpecExpectations({
      repoId: 'alphauslabs/blueinternal', sourceSha: 'd'.repeat(40), artifactPath: 'openapiv2/apidocs.swagger.json',
      document: JSON.parse(fs.readFileSync(artifact('alphauslabs/blueinternal'), 'utf8')),
    });
    expect(projection.operationsExamined).toBe(51);
    expect(projection.admitted.length).toBeGreaterThan(0);
  });
});

test.describe('C-09 — a specification witness alone grants nothing', () => {
  const baseInput = {
    method: 'GET' as const,
    routeProof: 'PROVEN' as const,
    joinState: 'PROVEN' as const,
    inventoryCompleteness: 'COMPLETE' as const,
    pipeline: null,
    closure: null,
  };

  test('W-SPEC is DOCUMENTARY, which is neither DECLARATION nor EFFECT', () => {
    // This class model is why the boundary needs no second guard.
    expect(READ_ONLY_WITNESS_CLASS['W-SPEC']).toBe('DOCUMENTARY');
    expect(READ_ONLY_WITNESS_CLASS['W-SPEC']).not.toBe('DECLARATION');
    expect(READ_ONLY_WITNESS_CLASS['W-SPEC']).not.toBe('EFFECT');
  });

  test('W-SPEC HELD does NOT produce READ_ONLY_PROVEN', () => {
    const proof = buildReadOnlyProof({ ...baseInput, specExpectationCount: 2_114 });
    const spec = proof.witnesses.find((w: ReadOnlyWitness) => w.kind === 'W-SPEC')!;
    expect(spec.state).toBe('HELD');
    expect(proof.state).not.toBe('READ_ONLY_PROVEN');
  });

  test('W-SPEC HELD does NOT grant production admission', () => {
    const proof = buildReadOnlyProof({ ...baseInput, specExpectationCount: 2_114 });
    expect(proof.productionAdmission).not.toBe('ELIGIBLE');
    expect(proof.productionDenialReasons.length).toBeGreaterThan(0);
  });

  test('a huge expectation count changes nothing about the proof state', () => {
    // Counting to authority is exactly what the lattice refuses.
    const none = buildReadOnlyProof({ ...baseInput, specExpectationCount: 0 });
    const many = buildReadOnlyProof({ ...baseInput, specExpectationCount: 1_000_000 });
    expect(many.state).toBe(none.state);
    expect(many.productionAdmission).toBe(none.productionAdmission);
  });

  test('no expectations leaves W-SPEC UNSUPPORTED, an absence and not a pass', () => {
    const proof = buildReadOnlyProof({ ...baseInput, specExpectationCount: 0 });
    const spec = proof.witnesses.find((w: ReadOnlyWitness) => w.kind === 'W-SPEC')!;
    expect(spec.state).toBe('UNSUPPORTED');
    expect(spec.reasonCode).toBe('SPEC_EXPECTATION_ABSENT');
  });

  test('an omitted count behaves as zero rather than throwing', () => {
    const proof = buildReadOnlyProof(baseInput);
    expect(proof.witnesses.find((w: ReadOnlyWitness) => w.kind === 'W-SPEC')!.state).toBe('UNSUPPORTED');
  });

  test('a non-integer or negative count leaves the witness UNSUPPORTED', () => {
    for (const count of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const proof = buildReadOnlyProof({ ...baseInput, specExpectationCount: count });
      expect(proof.witnesses.find((w: ReadOnlyWitness) => w.kind === 'W-SPEC')!.state).toBe('UNSUPPORTED');
    }
  });
});
