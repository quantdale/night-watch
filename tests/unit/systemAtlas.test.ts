// ---------------------------------------------------------------------------
// Nightwatch Lane E - System Atlas overlay contract tests.
//
// Each describe attacks a load-bearing claim rather than demonstrating it:
//
//   * overlay operations never mutate the technical systemMap vocabularies;
//   * the full protocol concept vocabulary is accepted, unknowns refused;
//   * INFERENCE is never upgraded into fact (downgrades stay legal);
//   * unproven links stay empty; only proven ids attach, the rest is dropped;
//   * retrieval is bounded (default 5, hard 8) with honest truncation;
//   * COMMUNICATION_EVIDENCE is unusable: no constructor, no relabel, no
//     JSON door, no fixture;
//   * synthetic billing-group/payer concepts are fixture-proven only.
//
// Every record is explicit inline or synthetic-fixture data.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  ATLAS_DEFAULT_LIMIT,
  ATLAS_HARD_LIMIT,
  ATLAS_QUERY_VERSION,
  SYSTEM_ATLAS_CONCEPT_KINDS,
  SYSTEM_ATLAS_RECORD_VERSION,
  clampAtlasLimit,
  type SystemAtlasRecord,
} from '../../src/core/agentProtocol/atlas';
import { FACT_CATEGORIES, SYSTEM_MAP_EDGE_KINDS, SYSTEM_MAP_NODE_KINDS } from '../../src/core/systemMap/model';
import {
  ATLAS_COMMUNICATION_EVIDENCE_UNAUTHORIZED,
  ATLAS_UNKNOWN_CONCEPT_KIND,
  ATLAS_UNPROVEN_LINK,
  SYSTEM_ATLAS_SYNTHETIC_PREFIX,
  createAtlasProvenance,
  createSystemAtlasRecord,
  relabelAtlasProvenance,
  validateSystemAtlasRecord,
  type SystemAtlasRecordInput,
} from '../../src/core/systemAtlas/model';
import {
  ATLAS_DUPLICATE_CONCEPT_ID,
  createAtlasQuery,
  createSystemAtlasOverlay,
  linkConceptToTechnicalNodes,
  querySystemAtlas,
  querySystemAtlasByKind,
} from '../../src/core/systemAtlas/overlay';
import {
  createSyntheticSystemAtlasOverlay,
  SYNTHETIC_SYSTEM_ATLAS_FIXTURES,
} from '../../src/core/systemAtlas/fixtures';

const DOC_LOCATOR = 'tests/unit/systemAtlas.test.ts#probe';

function probe(overrides: Partial<SystemAtlasRecordInput> = {}): SystemAtlasRecordInput {
  return {
    conceptId: 'synthetic.probe',
    kind: 'BUSINESS_ENTITY',
    label: 'Probe (synthetic)',
    provenance: {
      category: 'DOCUMENTED_FACT',
      repository: null,
      sourceSha: null,
      locator: DOC_LOCATOR,
      confidence: 'MEDIUM',
    },
    ...overrides,
  };
}

function probeRecord(overrides: Partial<SystemAtlasRecordInput> = {}): SystemAtlasRecord {
  return createSystemAtlasRecord(probe(overrides));
}

/** Twelve link-honest INFERENCE records for bound tests. */
function dozenOverlay() {
  const records = Array.from({ length: 12 }, (_, index) =>
    probeRecord({
      conceptId: `synthetic.probe-${String(index).padStart(2, '0')}`,
      label: `Probe ${String(index).padStart(2, '0')} (synthetic)`,
      provenance: {
        category: 'INFERENCE',
        repository: null,
        sourceSha: null,
        locator: DOC_LOCATOR,
        confidence: 'LOW',
      },
    }),
  );
  return createSystemAtlasOverlay(records);
}

test.describe('overlay never mutates the technical systemMap', () => {
  test('kinds and fact categories are byte-identical before and after overlay work', () => {
    const nodesBefore = JSON.stringify(SYSTEM_MAP_NODE_KINDS);
    const edgesBefore = JSON.stringify(SYSTEM_MAP_EDGE_KINDS);
    const factsBefore = JSON.stringify(FACT_CATEGORIES);

    const overlay = createSyntheticSystemAtlasOverlay();
    const record = probeRecord({ conceptId: 'synthetic.mutation-probe' });
    const withOverlay = createSystemAtlasOverlay([...overlay.records, record]);
    querySystemAtlas(withOverlay, createAtlasQuery(['billing'], 50));
    querySystemAtlasByKind(withOverlay, 'BUSINESS_ENTITY', 50);
    linkConceptToTechnicalNodes(
      record,
      ['svc:billing', 'svc:imagined'],
      new Set(['svc:billing']),
      { repository: null, sourceSha: null, locator: DOC_LOCATOR },
    );

    expect(JSON.stringify(SYSTEM_MAP_NODE_KINDS)).toBe(nodesBefore);
    expect(JSON.stringify(SYSTEM_MAP_EDGE_KINDS)).toBe(edgesBefore);
    expect(JSON.stringify(FACT_CATEGORIES)).toBe(factsBefore);
    expect(SYSTEM_MAP_NODE_KINDS).toEqual([
      'COMPANY', 'PRODUCT', 'REPOSITORY', 'SERVICE', 'PROTO_SERVICE', 'RPC',
      'HTTP_OPERATION', 'FRONTEND_CONSUMER', 'HANDLER', 'FINDING',
    ]);
    expect(FACT_CATEGORIES).toEqual(['SOURCE_FACT', 'DEPLOYMENT_FACT', 'RUNTIME_FACT', 'OBSERVATION', 'INFERENCE']);
  });
});

test.describe('protocol concept kinds: all accepted, unknowns refused', () => {
  test('all fourteen SYSTEM_ATLAS_CONCEPT_KINDS build records', () => {
    expect(SYSTEM_ATLAS_CONCEPT_KINDS.length).toBe(14);
    for (const kind of SYSTEM_ATLAS_CONCEPT_KINDS) {
      const record = probeRecord({ conceptId: `synthetic.kind-${kind.toLowerCase()}`, kind });
      expect(record.kind).toBe(kind);
      expect(record.schemaVersion).toBe(SYSTEM_ATLAS_RECORD_VERSION);
    }
  });

  test('unknown kind fails closed in constructor and validator', () => {
    expect(() => probeRecord({ kind: 'MICROSERVICE' as never })).toThrow(ATLAS_UNKNOWN_CONCEPT_KIND);
    const forged = {
      schemaVersion: SYSTEM_ATLAS_RECORD_VERSION,
      conceptId: 'synthetic.forged-kind',
      kind: 'MICROSERVICE',
      label: 'Forged',
      implementedBy: [],
      exposes: [],
      consumedBy: [],
      provenance: { category: 'INFERENCE', repository: null, sourceSha: null, locator: DOC_LOCATOR, confidence: 'LOW' },
    };
    const result = validateSystemAtlasRecord(forged);
    expect(result.ok).toBe(false);
  });
});

test.describe('INFERENCE is never upgraded into fact', () => {
  test('upgrades throw the protocol error; downgrades stay legal', () => {
    const inference = probeRecord({
      provenance: { category: 'INFERENCE', repository: null, sourceSha: null, locator: DOC_LOCATOR, confidence: 'LOW' },
    });
    expect(() =>
      relabelAtlasProvenance(inference, { category: 'SOURCE_FACT', locator: DOC_LOCATOR }),
    ).toThrow('ATLAS_INFERENCE_PRESENTED_AS_FACT');
    expect(() =>
      relabelAtlasProvenance(inference, { category: 'DOCUMENTED_FACT', locator: DOC_LOCATOR }),
    ).toThrow('ATLAS_INFERENCE_PRESENTED_AS_FACT');

    const source = probeRecord({
      conceptId: 'synthetic.downgrade-probe',
      provenance: {
        category: 'SOURCE_FACT',
        repository: 'nightwatch',
        sourceSha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
        locator: 'src/example.ts:1',
        confidence: 'HIGH',
      },
    });
    const downgraded = relabelAtlasProvenance(source, { category: 'INFERENCE', locator: DOC_LOCATOR });
    expect(downgraded.provenance.category).toBe('INFERENCE');
  });

  test('relabel into INFERENCE on a linked record is refused', () => {
    const linked = probeRecord({
      conceptId: 'synthetic.linked-downgrade',
      implementedBy: ['svc:billing'],
      provenance: {
        category: 'DOCUMENTED_FACT',
        repository: null,
        sourceSha: null,
        locator: DOC_LOCATOR,
        confidence: 'MEDIUM',
      },
    });
    expect(() => relabelAtlasProvenance(linked, { category: 'INFERENCE' })).toThrow(ATLAS_UNPROVEN_LINK);
  });
});

test.describe('unproven links stay empty', () => {
  test('INFERENCE records cannot carry links', () => {
    expect(() =>
      probeRecord({
        implementedBy: ['svc:billing'],
        provenance: { category: 'INFERENCE', repository: null, sourceSha: null, locator: DOC_LOCATOR, confidence: 'LOW' },
      }),
    ).toThrow(ATLAS_UNPROVEN_LINK);
  });

  test('linking attaches only proven ids; the rest is dropped, never stored', () => {
    const record = probeRecord({ conceptId: 'synthetic.link-probe' });
    const result = linkConceptToTechnicalNodes(record, ['svc:billing', 'svc:imagined', 'svc:billing'], new Set(['svc:billing']), {
      repository: 'alphaus-docs',
      sourceSha: null,
      locator: 'docs/billing.md:12',
    });
    expect([...result.linked]).toEqual(['svc:billing']);
    expect([...result.droppedUnproven]).toEqual(['svc:imagined']);
    expect([...result.record.implementedBy]).toEqual(['svc:billing']);
    expect(result.record.provenance.locator).toBe('docs/billing.md:12');
    // Original untouched: the overlay never mutates in place.
    expect(record.implementedBy.length).toBe(0);
  });

  test('linking an INFERENCE record is refused; malformed ids fail closed', () => {
    const inference = probeRecord({
      conceptId: 'synthetic.inference-link',
      provenance: { category: 'INFERENCE', repository: null, sourceSha: null, locator: DOC_LOCATOR, confidence: 'LOW' },
    });
    expect(() =>
      linkConceptToTechnicalNodes(inference, ['svc:billing'], new Set(['svc:billing']), {
        repository: null,
        sourceSha: null,
        locator: DOC_LOCATOR,
      }),
    ).toThrow(ATLAS_UNPROVEN_LINK);

    const documented = probeRecord({ conceptId: 'synthetic.malformed-link' });
    expect(() =>
      linkConceptToTechnicalNodes(documented, ['not an id!!'], new Set(['not an id!!']), {
        repository: null,
        sourceSha: null,
        locator: DOC_LOCATOR,
      }),
    ).toThrow('ATLAS_MALFORMED_RECORD');
  });
});

test.describe('bounded retrieval: default 5, hard 8', () => {
  test('protocol clamps hold', () => {
    expect(ATLAS_DEFAULT_LIMIT).toBe(5);
    expect(ATLAS_HARD_LIMIT).toBe(8);
    expect(clampAtlasLimit(0)).toBe(5);
    expect(clampAtlasLimit(-3)).toBe(5);
    expect(clampAtlasLimit(50)).toBe(8);
    expect(clampAtlasLimit(3)).toBe(3);
  });

  test('oversized limits return at most eight with truncation set', () => {
    const overlay = dozenOverlay();
    const page = querySystemAtlas(overlay, createAtlasQuery([], 50));
    expect(page.records.length).toBe(8);
    expect(page.truncated).toBe(true);
    const narrow = querySystemAtlas(overlay, createAtlasQuery([], 0));
    expect(narrow.records.length).toBe(5);
    expect(narrow.truncated).toBe(true);
    const exact = querySystemAtlas(createSyntheticSystemAtlasOverlay(), createAtlasQuery([], 50));
    expect(exact.records.length).toBe(4);
    expect(exact.truncated).toBe(false);
  });

  test('term filtering is case-insensitive and deterministic', () => {
    const overlay = createSyntheticSystemAtlasOverlay();
    const first = querySystemAtlas(overlay, createAtlasQuery(['BILLING'], 8));
    const second = querySystemAtlas(overlay, createAtlasQuery(['billing'], 8));
    expect(first.records.map((record) => record.conceptId).sort()).toEqual([
      'synthetic.billing-group',
      'synthetic.billing-group-membership',
    ]);
    expect(second).toEqual(first);
    const none = querySystemAtlas(overlay, createAtlasQuery(['no-such-concept'], 8));
    expect(none.records.length).toBe(0);
    expect(none.truncated).toBe(false);
  });

  test('kind queries are bounded and fail closed on unknown kinds', () => {
    const overlay = createSyntheticSystemAtlasOverlay();
    const page = querySystemAtlasByKind(overlay, 'BUSINESS_ENTITY', 1);
    expect(page.records.length).toBe(1);
    expect(page.truncated).toBe(true);
    expect(() => querySystemAtlasByKind(overlay, 'MICROSERVICE' as never, 5)).toThrow('ATLAS_MALFORMED_RECORD');
    expect(() =>
      querySystemAtlas(overlay, { schemaVersion: 'bogus', terms: [], limit: 5 } as never),
    ).toThrow('ATLAS_MALFORMED_RECORD');
  });

  test('duplicate conceptIds are refused', () => {
    const record = probeRecord();
    expect(() => createSystemAtlasOverlay([record, record])).toThrow(ATLAS_DUPLICATE_CONCEPT_ID);
  });
});

test.describe('COMMUNICATION_EVIDENCE stays unused', () => {
  test('no constructor, no relabel, no JSON door', () => {
    expect(() =>
      createAtlasProvenance({
        category: 'COMMUNICATION_EVIDENCE',
        repository: null,
        sourceSha: null,
        locator: DOC_LOCATOR,
        confidence: 'MEDIUM',
      }),
    ).toThrow(ATLAS_COMMUNICATION_EVIDENCE_UNAUTHORIZED);

    expect(() =>
      probeRecord({
        provenance: {
          category: 'COMMUNICATION_EVIDENCE',
          repository: null,
          sourceSha: null,
          locator: DOC_LOCATOR,
          confidence: 'MEDIUM',
        },
      }),
    ).toThrow(ATLAS_COMMUNICATION_EVIDENCE_UNAUTHORIZED);

    const record = probeRecord();
    expect(() => relabelAtlasProvenance(record, { category: 'COMMUNICATION_EVIDENCE' })).toThrow(
      ATLAS_COMMUNICATION_EVIDENCE_UNAUTHORIZED,
    );

    const forged = {
      schemaVersion: SYSTEM_ATLAS_RECORD_VERSION,
      conceptId: 'synthetic.forged-comms',
      kind: 'EVENT',
      label: 'Forged',
      implementedBy: [],
      exposes: [],
      consumedBy: [],
      provenance: {
        category: 'COMMUNICATION_EVIDENCE',
        repository: null,
        sourceSha: null,
        locator: DOC_LOCATOR,
        confidence: 'MEDIUM',
      },
    };
    const result = validateSystemAtlasRecord(forged);
    expect(result.ok).toBe(false);
  });

  test('fixtures contain zero COMMUNICATION_EVIDENCE records', () => {
    for (const fixture of SYNTHETIC_SYSTEM_ATLAS_FIXTURES) {
      expect(fixture.provenance.category).not.toBe('COMMUNICATION_EVIDENCE');
    }
  });
});

test.describe('synthetic fixtures are fixture-proven only', () => {
  test('synthetic ids, null source pointers, honest categories, empty links', () => {
    expect(SYNTHETIC_SYSTEM_ATLAS_FIXTURES.length).toBe(4);
    const ids = SYNTHETIC_SYSTEM_ATLAS_FIXTURES.map((fixture) => fixture.conceptId).sort();
    expect(ids).toEqual([
      'synthetic.billing-group',
      'synthetic.billing-group-membership',
      'synthetic.monthly-invoicing',
      'synthetic.payer',
    ]);
    for (const fixture of SYNTHETIC_SYSTEM_ATLAS_FIXTURES) {
      expect(fixture.conceptId.startsWith(SYSTEM_ATLAS_SYNTHETIC_PREFIX)).toBe(true);
      expect(fixture.provenance.repository).toBeNull();
      expect(fixture.provenance.sourceSha).toBeNull();
      expect(fixture.provenance.locator).toContain('src/core/systemAtlas/fixtures.ts');
      expect(fixture.provenance.category).not.toBe('SOURCE_FACT');
      expect(fixture.provenance.category).not.toBe('COMMUNICATION_EVIDENCE');
      if (fixture.provenance.category === 'INFERENCE') {
        expect(fixture.implementedBy.length).toBe(0);
        expect(fixture.exposes.length).toBe(0);
        expect(fixture.consumedBy.length).toBe(0);
      }
    }
    expect(ATLAS_QUERY_VERSION).toBe('nightwatch.atlas-query.v1');
  });

  test('validator rejects malformed JSON without throwing', () => {
    for (const bad of [null, 42, 'x', [], { schemaVersion: 'wrong' }, { conceptId: 'x' }]) {
      expect(validateSystemAtlasRecord(bad).ok).toBe(false);
    }
    const tooManyLinks = {
      schemaVersion: SYSTEM_ATLAS_RECORD_VERSION,
      conceptId: 'synthetic.link-flood',
      kind: 'BUSINESS_ENTITY',
      label: 'Flood',
      implementedBy: Array.from({ length: 17 }, (_, index) => `svc:${index}`),
      exposes: [],
      consumedBy: [],
      provenance: { category: 'DOCUMENTED_FACT', repository: null, sourceSha: null, locator: DOC_LOCATOR, confidence: 'LOW' },
    };
    expect(validateSystemAtlasRecord(tooManyLinks).ok).toBe(false);
  });
});
