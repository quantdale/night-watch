// ---------------------------------------------------------------------------
// Nightwatch C-10.5 (A13) — persisted-POSITION sentinel coverage.
//
// DEF-C10-5's lesson: the C-10 corpus enumerated sensitive VALUE CLASSES and
// proved each could not persist. It was complete against its own model and
// still missed a live leak, because `routeTemplate` was a free-form string
// POSITION that no sentinel occupied.
//
// This suite is driven by the FIELD INVENTORY instead, and its central test is
// the TOTALITY cross-check: the inventory must exactly equal the DTO's real
// closed field vocabularies. Adding a persisted field without declaring a
// disposition fails here, which is what makes the rule standing rather than
// remembered.
//
// Synthetic sentinels only.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { PersistedFieldRecord } from '../../src/core/prodPrivacy/persistedFieldInventory';
import {
  PERSISTED_FIELD_INVENTORY,
  PERSISTED_FIELD_DISPOSITIONS,
  PRODUCTION_EVIDENCE_NODE_SAFE_FIELDS,
  PRODUCTION_EVIDENCE_SAFE_FIELDS,
  PRODUCTION_PROVEN_FIELD_SAFE_FIELDS,
  KEY_PROVENANCE_CLASSIFICATIONS,
  PRODUCTION_NODE_TYPES,
  PRODUCTION_STATUS_CLASSES,
  ROUTE_PROVENANCE_CLASSES,
  KEY_PROVENANCE_CLASSES,
  stringCapablePositions,
  createProductionPrivacyPolicy,
  toProductionEvidence,
  projectProduction,
  RawEphemeralSource,
  NO_PROVEN_ROUTE_VOCABULARY,
} from '../../src/core/prodPrivacy';
import { assertPersistableProductionEvidence } from '../../src/core/prodEvidence/firewall';
import { ProductionFindingsStore } from '../../src/core/prodEvidence/productionFindingsStore';
import {
  testOnlyProductionMarkedKeyVocabulary,
  testOnlyProductionMarkedRouteVocabulary,
} from '../../src/core/prodProvenance/testOnlySeam';

/** An unmistakable synthetic sentinel for every planted position. */
const SENTINEL = 'NWSENT-A13-PERSISTED-POSITION-cbe1f7';
const PROVEN_ROUTE = 'GET /v1/synthetic/a13/{id}';
const PROVEN_KEYS = ['alpha', 'beta'];

function policy() {
  return createProductionPrivacyPolicy({});
}

function routeVocabulary() {
  return testOnlyProductionMarkedRouteVocabulary({
    provenanceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
    templates: [PROVEN_ROUTE],
  });
}

function keyVocabulary() {
  return testOnlyProductionMarkedKeyVocabulary({
    provenanceClass: 'SOURCE_PROVEN_OPENAPI_DEFINITION',
    keys: PROVEN_KEYS,
  });
}

function goodEvidence() {
  const projection = projectProduction(
    RawEphemeralSource.of({ alpha: 1, beta: 'x' }),
    keyVocabulary(),
    policy(),
  );
  return toProductionEvidence({
    projection,
    routeTemplate: PROVEN_ROUTE,
    statusClass: '2XX',
    routeVocabulary: routeVocabulary(),
    vocabulary: keyVocabulary(),
    policy: policy(),
  });
}

test.describe('C-10.5 A13 — the inventory is TOTAL over the persisted DTO', () => {
  test('every persisted evidence-root field is inventoried, and nothing extra is', () => {
    const inventoried = new Set(
      PERSISTED_FIELD_INVENTORY.filter((record: PersistedFieldRecord) => record.owner === 'EVIDENCE_ROOT').map((record: PersistedFieldRecord) => record.field),
    );
    // Two-way equality. A NEW persisted field fails the first assertion; a
    // removed field fails the second, so the inventory cannot rot silently.
    expect([...PRODUCTION_EVIDENCE_SAFE_FIELDS].sort()).toEqual([...inventoried].sort());
  });

  test('every persisted node field is inventoried, and nothing extra is', () => {
    const inventoried = new Set(
      PERSISTED_FIELD_INVENTORY.filter((record: PersistedFieldRecord) => record.owner === 'EVIDENCE_NODE').map((record: PersistedFieldRecord) => record.field),
    );
    expect([...PRODUCTION_EVIDENCE_NODE_SAFE_FIELDS].sort()).toEqual([...inventoried].sort());
  });

  test('every proven-field position is inventoried, and nothing extra is', () => {
    const inventoried = new Set(
      PERSISTED_FIELD_INVENTORY.filter((record: PersistedFieldRecord) => record.owner === 'PROVEN_FIELD').map((record: PersistedFieldRecord) => record.field),
    );
    expect([...PRODUCTION_PROVEN_FIELD_SAFE_FIELDS].sort()).toEqual([...inventoried].sort());
  });

  test('every inventoried position carries a real disposition and a rationale', () => {
    for (const record of PERSISTED_FIELD_INVENTORY) {
      expect(PERSISTED_FIELD_DISPOSITIONS).toContain(record.disposition);
      // A disposition without a reason is an assertion, not an argument.
      expect(record.rationale.length).toBeGreaterThan(20);
    }
  });

  test('no disposition permits an unproven free-form persisted string', () => {
    // The vocabulary itself must not contain an escape hatch.
    expect(PERSISTED_FIELD_DISPOSITIONS).not.toContain('ASSUMED_SAFE');
    expect(PERSISTED_FIELD_DISPOSITIONS).not.toContain('REVIEWED');
    // Every string-capable position is closed, source-proven, derived, or
    // sentinel-proven — never unconstrained.
    for (const record of stringCapablePositions()) {
      expect(['CLOSED_VOCABULARY', 'SOURCE_PROVEN', 'DERIVED_DIGEST', 'SENTINEL_PROVEN']).toContain(
        record.disposition,
      );
    }
  });

  test('the two positions that carry a real leak risk are the ones history found', () => {
    // routeTemplate (DEF-C10-5) and provenFields[].name (F-14) are the only
    // persisted positions whose value is a literal from the outside world.
    const sourceProven = PERSISTED_FIELD_INVENTORY.filter((record: PersistedFieldRecord) => record.disposition === 'SOURCE_PROVEN')
      .map((record: PersistedFieldRecord) => `${record.owner}.${record.field}`)
      .sort();
    expect(sourceProven).toEqual(['EVIDENCE_ROOT.routeTemplate', 'PROVEN_FIELD.name']);
  });
});

test.describe('C-10.5 A13 — each CLOSED_VOCABULARY position really is closed', () => {
  test('the declared closed vocabularies are finite and contain no free text', () => {
    const closed: Readonly<Record<string, readonly string[]>> = {
      statusClass: [...PRODUCTION_STATUS_CLASSES],
      keyProvenance: [...KEY_PROVENANCE_CLASSIFICATIONS],
      type: [...PRODUCTION_NODE_TYPES],
      routeProvenanceClass: [...ROUTE_PROVENANCE_CLASSES],
      vocabularyProvenanceClass: [...KEY_PROVENANCE_CLASSES],
    };
    for (const [field, members] of Object.entries(closed)) {
      expect(members.length, `${field} must be finite`).toBeGreaterThan(0);
      expect(members.length, `${field} must be small enough to be auditable`).toBeLessThan(32);
      for (const member of members) {
        // A closed vocabulary member is an identifier, never prose.
        expect(member, `${field} member must be a closed token`).toMatch(/^[A-Z0-9_]+$|^[1-5]XX$/);
      }
    }
  });
});

test.describe('C-10.5 A13 — a sentinel planted in each exact position cannot persist', () => {
  test('a sentinel in routeTemplate cannot persist (DEF-C10-5 position)', () => {
    // Not "a sentinel somewhere in the payload" — the sentinel occupies the
    // exact field position, which is what the old corpus never did.
    expect(() =>
      toProductionEvidence({
        projection: projectProduction(RawEphemeralSource.of({ alpha: 1 }), keyVocabulary(), policy()),
        routeTemplate: `GET /v1/${SENTINEL}`,
        statusClass: '2XX',
        routeVocabulary: routeVocabulary(),
        vocabulary: keyVocabulary(),
        policy: policy(),
      }),
    ).toThrow(/ROUTE_NOT_SOURCE_PROVEN|ROUTE_TEMPLATE_INVALID/);
  });

  test('a sentinel route with NO vocabulary cannot persist', () => {
    expect(() =>
      toProductionEvidence({
        projection: projectProduction(RawEphemeralSource.of({ alpha: 1 }), keyVocabulary(), policy()),
        routeTemplate: PROVEN_ROUTE,
        statusClass: '2XX',
        routeVocabulary: NO_PROVEN_ROUTE_VOCABULARY,
        vocabulary: keyVocabulary(),
        policy: policy(),
      }),
    ).toThrow();
  });

  test('a sentinel in provenFields[].name cannot persist (F-14 position)', () => {
    // The key literal is not in the proven vocabulary, so it must project as
    // dynamic structure and never appear as a proven field name.
    const projection = projectProduction(
      RawEphemeralSource.of({ [SENTINEL]: 'value' }),
      keyVocabulary(),
      policy(),
    );
    const serialized = JSON.stringify(projection);
    expect(serialized).not.toContain(SENTINEL);
  });

  test('a sentinel forced into a persisted field position is refused by the firewall', () => {
    const evidence = goodEvidence();
    for (const field of ['routeTemplate', 'structuralDigest', 'routeProvenanceDigest', 'vocabularyProvenanceDigest', 'boundaryClass', 'schemaVersion', 'statusClass'] as const) {
      const tampered = { ...evidence, [field]: SENTINEL };
      expect(
        () => assertPersistableProductionEvidence(tampered as never),
        `firewall must refuse a sentinel in ${field}`,
      ).toThrow();
    }
  });

  test('an UNKNOWN persisted field carrying a sentinel is refused', () => {
    // A field outside the closed vocabulary is the shape a future free-form
    // position would arrive in.
    const tampered = { ...goodEvidence(), operatorNote: SENTINEL };
    expect(() =>
      assertPersistableProductionEvidence(tampered as never),
    ).toThrow(/UNKNOWN_FIELD/);
  });

  test('no sentinel byte reaches disk through the production store', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-a13-'));
    try {
      const store = new ProductionFindingsStore({ root, routeVocabulary: routeVocabulary() });
      const planted = [`GET /v1/${SENTINEL}`, `GET /v1/synthetic/${SENTINEL}/{id}`];
      planted.forEach((routeTemplate, index) => {
        try {
          store.write(`a13-${index}.json`, { ...goodEvidence(), routeTemplate });
        } catch {
          /* refusal is the expected outcome */
        }
      });
      const seen: string[] = [];
      // Whatever happened, the sentinel must not exist anywhere under the root.
      const walk = (directory: string): void => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
          const absolute = path.join(directory, entry.name);
          if (entry.isDirectory()) walk(absolute);
          else seen.push(fs.readFileSync(absolute, 'utf8'));
        }
      };
      walk(root);
      for (const contents of seen) expect(contents).not.toContain(SENTINEL);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
