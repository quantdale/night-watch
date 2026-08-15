import { expect, test } from '@playwright/test';
import {
  SELFDEV_ADOPTED_CASE_SCHEMA_VERSION,
  SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES,
  SELFDEV_ADOPTION_STRATEGY_CLASS,
  SELFDEV_ADOPTED_CASES,
  adoptedCaseIdFor,
  deriveAdoptedCase,
  deriveAdoptedCaseCoverage,
  renderAdoptedCatalogSource,
  selfDevAdoptedCoverageClasses,
  selfDevAdoptedEquivalentFingerprints,
  validateAdoptedCase,
  validateAdoptedCatalog,
} from '../../src/core/selfDev/adoptedCases';
import { selfDevEquivalentFingerprint } from '../../src/core/selfDev/validation';
import path from 'node:path';
import { createSyntheticSelfDevSourceFixture } from '../helpers/selfDevSourceFixture';
import { loadSelfDevStack } from '../helpers/selfDevStack';

test.describe('Phase 8B adopted-case catalog', () => {
  test('the adopted-catalog helpers exactly reflect the checkout-generated catalog', () => {
    // Phase 8B.1.0 — the live catalog is production state, not a universal
    // unit-test fixture. This assertion is state-explicit: whatever the
    // checkout's generated catalog holds, the seeding helpers must agree
    // with it exactly (and every entry must validate). The empty-baseline
    // invariant is proven separately against an explicitly rendered EMPTY
    // fixture (below) and against the real canonical checkout by the
    // Phase 8B.1.0 closeout ledger (entry count 0, digest unchanged).
    expect(() => validateAdoptedCatalog(SELFDEV_ADOPTED_CASES)).not.toThrow();
    expect(selfDevAdoptedEquivalentFingerprints()).toEqual(SELFDEV_ADOPTED_CASES.map((entry) => entry.equivalentFingerprint));
    expect(selfDevAdoptedCoverageClasses()).toEqual(
      [...new Set(SELFDEV_ADOPTED_CASES.flatMap((entry) => entry.coverageClasses))].sort(),
    );
  });

  test('an explicitly rendered EMPTY catalog fixture produces zero baseline seeding', () => {
    // Phase 8B.1.0 — the historical "catalog starts empty" contract is
    // proven against an explicit EMPTY source fixture through the real
    // renderer/validators, never inherited from the live checkout.
    const fixture = createSyntheticSelfDevSourceFixture('EMPTY');
    try {
      const stack = loadSelfDevStack(fixture.root, path.join(process.cwd(), 'package.json'));
      expect(stack.SELFDEV_ADOPTED_CASES).toEqual([]);
      expect(stack.selfDevAdoptedEquivalentFingerprints()).toEqual([]);
      expect(stack.selfDevAdoptedCoverageClasses()).toEqual([]);
    } finally {
      fixture.cleanup();
    }
  });

  test('renderAdoptedCatalogSource of the empty catalog is stable canonical bytes', () => {
    const rendered = renderAdoptedCatalogSource([]);
    expect(rendered).toContain('export const SELFDEV_ADOPTED_CASES = [];');
    expect(rendered).toBe(renderAdoptedCatalogSource([]));
  });

  test('deriveAdoptedCase computes base-independent identity and re-derived coverage', () => {
    const entry = deriveAdoptedCase(
      'selfdev.fixture.local-regression.v1',
      ['selfdev.synthetic.expand-summary'],
      ['selfdev.assert.state.expanded', 'selfdev.assert.transition.expansion'],
    );
    expect(entry.schemaVersion).toBe(SELFDEV_ADOPTED_CASE_SCHEMA_VERSION);
    expect(entry.strategyClass).toBe(SELFDEV_ADOPTION_STRATEGY_CLASS);
    expect(entry.adoptedCaseId).toMatch(/^adopted-case:sha256:[0-9a-f]{64}$/);
    expect(entry.coverageClasses).toEqual(deriveAdoptedCaseCoverage(['selfdev.synthetic.expand-summary']));
    expect(entry.equivalentFingerprint).toBe(
      selfDevEquivalentFingerprint('selfdev.fixture.local-regression.v1', ['selfdev.synthetic.expand-summary'], ['selfdev.assert.state.expanded', 'selfdev.assert.transition.expansion']),
    );
    // Base-independent: no base SHA, timestamp, or path field exists in the identity computation at all.
    expect(adoptedCaseIdFor(entry)).toBe(entry.adoptedCaseId);
  });

  test('validateAdoptedCase round-trips a valid entry and rejects a mutated one', () => {
    const entry = deriveAdoptedCase('selfdev.fixture.local-regression.v1', ['selfdev.synthetic.expand-summary'], ['selfdev.assert.state.expanded']);
    expect(validateAdoptedCase(entry)).toEqual(entry);
    expect(() => validateAdoptedCase({ ...entry, adoptedCaseId: 'adopted-case:sha256:' + '0'.repeat(64) })).toThrow(/ID_MISMATCH/);
    expect(() => validateAdoptedCase({ ...entry, equivalentFingerprint: `sha256:${'0'.repeat(64)}` })).toThrow(/FINGERPRINT_MISMATCH/);
    expect(() => validateAdoptedCase({ ...entry, coverageClasses: ['oracle:structural-stable'] })).toThrow(/COVERAGE_CLASSES_MISMATCH/);
    expect(() => validateAdoptedCase({ ...entry, actionIds: ['selfdev.synthetic.save-settings'] })).toThrow(/REGISTRY_UNKNOWN/);
    expect(() => validateAdoptedCase({ ...entry, unknownField: 1 })).toThrow(/UNKNOWN_FIELD/);
    const { schemaVersion: _omit, ...missing } = entry;
    expect(() => validateAdoptedCase(missing)).toThrow(/MISSING_FIELD/);
    expect(() => validateAdoptedCase({ ...entry, strategyClass: 'ARBITRARY_CODE_PATCH' })).toThrow(/STRATEGY_INVALID/);
  });

  test('validateAdoptedCatalog rejects duplicate IDs, duplicate fingerprints, and oversized catalogs', () => {
    const entry = deriveAdoptedCase('selfdev.fixture.local-regression.v1', ['selfdev.synthetic.expand-summary'], ['selfdev.assert.state.expanded']);
    expect(validateAdoptedCatalog([entry])).toEqual([entry]);
    expect(() => validateAdoptedCatalog([entry, entry])).toThrow(/DUPLICATE_ID/);
    const filler = Array.from({ length: SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES + 1 }, () => entry);
    expect(() => validateAdoptedCatalog(filler)).toThrow(/CATALOG_TOO_LARGE/);
  });

  test('renderAdoptedCatalogSource is deterministic, order-insensitive, and produces parseable data-only output', () => {
    const a = deriveAdoptedCase('selfdev.fixture.local-regression.v1', ['selfdev.synthetic.expand-summary'], ['selfdev.assert.state.expanded']);
    const b = deriveAdoptedCase('selfdev.fixture.local-regression.v1', ['selfdev.synthetic.expand-summary', 'selfdev.synthetic.collapse-summary'], ['selfdev.assert.state.ready']);
    const forward = renderAdoptedCatalogSource([a, b]);
    const backward = renderAdoptedCatalogSource([b, a]);
    expect(forward).toBe(backward);
    expect(forward).not.toMatch(/require\(|import\s+[^t]|function\s|=>|eval\(|process\./);
    // The rendered array literal is valid JSON (modulo the surrounding `export const ... = ;`).
    const arrayText = forward.slice(forward.indexOf('['), forward.lastIndexOf(']') + 1);
    const parsed = JSON.parse(arrayText) as unknown[];
    expect(parsed).toHaveLength(2);
  });

  test('source-injection style strings are rejected before rendering', () => {
    const valid = deriveAdoptedCase('selfdev.fixture.local-regression.v1', ['selfdev.synthetic.expand-summary'], ['selfdev.assert.state.expanded']);
    expect(() => validateAdoptedCase({
      ...valid,
      adoptedCaseId: "adopted-case:sha256:'); process.exit(1); //" + '0'.repeat(20),
    })).toThrow(/ID_INVALID/);
    expect(() => validateAdoptedCase({ ...valid, fixtureId: "'); process.exit(1); //" })).toThrow(/FIXTURE_INVALID/);
    expect(() => validateAdoptedCase({ ...valid, actionIds: ["'); process.exit(1); //"] })).toThrow(/ACTION_IDS_INVALID/);
  });
});
