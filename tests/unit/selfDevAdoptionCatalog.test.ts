import { expect, test } from '@playwright/test';
import fs from 'node:fs';
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

  test('the live generated catalog file is byte-identical to the canonical renderer output (any cardinality)', () => {
    // Phase 8B.1-R1 live-file invariant: the on-disk generated file must
    // validate and byte-match renderAdoptedCatalogSource(...) for ANY
    // legitimate cardinality (EMPTY canonical checkout today, a committed
    // one-entry state, and future two-entry/exhausted states). This is the
    // same property the CI catalog-integrity step enforces via
    // bin/selfdev-catalog-integrity.mjs.
    const generatedPath = path.join(process.cwd(), 'src/core/selfDev/adoptedCaseCatalog.generated.ts');
    const bytes = fs.readFileSync(generatedPath, 'utf8');
    const validated = validateAdoptedCatalog(SELFDEV_ADOPTED_CASES);
    expect(validated.length).toBeLessThanOrEqual(SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES);
    expect(renderAdoptedCatalogSource(validated)).toBe(bytes);
    // Pure-data shape: no executable code outside the explanatory comments.
    const codeLines = bytes.split('\n').filter((line) => !line.trim().startsWith('//'));
    expect(codeLines.join('\n')).not.toMatch(/^\s*(?:import|require)\b|function\s+|=>|eval\s*\(|process\.|new\s+Function\s*\(/);
    expect(bytes).toMatch(/export const SELFDEV_ADOPTED_CASES = (?:\[\]|\[)/);
  });

  test('a rendered one-entry catalog is valid canonical data (EXPAND_ONLY fixture)', () => {
    // Phase 8B.1-R1: one adopted entry must remain a normal supported state
    // (portfolio semantics: A adopted -> variant B selected next).
    const fixture = createSyntheticSelfDevSourceFixture('EXPAND_ONLY');
    try {
      const stack = loadSelfDevStack(fixture.root, path.join(process.cwd(), 'package.json'));
      expect(stack.SELFDEV_ADOPTED_CASES).toHaveLength(1);
      const validated = validateAdoptedCatalog(stack.SELFDEV_ADOPTED_CASES);
      const rendered = renderAdoptedCatalogSource(validated);
      const generatedPath = path.join(fixture.root, 'src/core/selfDev/adoptedCaseCatalog.generated.ts');
      expect(fs.readFileSync(generatedPath, 'utf8')).toBe(rendered);
      expect(rendered).toContain('export const SELFDEV_ADOPTED_CASES = [');
      expect(rendered).toContain('"strategyClass": "DECLARATIVE_REGRESSION_CATALOG_PROMOTION"');
      expect(rendered).not.toMatch(/require\(|import\s+[^t]|function\s|=>|eval\(|process\./);
    } finally {
      fixture.cleanup();
    }
  });

  test('a rendered two-entry catalog is valid canonical data (EXPAND_AND_COLLAPSE fixture)', () => {
    // Phase 8B.1-R1: the future two-entry/exhausted-adjacent state must also
    // remain valid canonical data (portfolio semantics: A+B adopted ->
    // EXHAUSTED is a valid terminal state, not a catalog-invalid state).
    const fixture = createSyntheticSelfDevSourceFixture('EXPAND_AND_COLLAPSE');
    try {
      const stack = loadSelfDevStack(fixture.root, path.join(process.cwd(), 'package.json'));
      expect(stack.SELFDEV_ADOPTED_CASES).toHaveLength(2);
      const validated = validateAdoptedCatalog(stack.SELFDEV_ADOPTED_CASES);
      expect(validateAdoptedCatalog(validated)).toEqual(validated);
      expect(new Set(validated.map((entry) => entry.adoptedCaseId)).size).toBe(2);
      expect(new Set(validated.map((entry) => entry.equivalentFingerprint)).size).toBe(2);
      const rendered = renderAdoptedCatalogSource(validated);
      const generatedPath = path.join(fixture.root, 'src/core/selfDev/adoptedCaseCatalog.generated.ts');
      expect(fs.readFileSync(generatedPath, 'utf8')).toBe(rendered);
      expect(rendered).not.toMatch(/require\(|import\s+[^t]|function\s|=>|eval\(|process\./);
    } finally {
      fixture.cleanup();
    }
  });

  test('noncanonical byte rendering is detectable by the byte round-trip', () => {
    // Phase 8B.1-R1: the catalog-integrity check compares raw on-disk bytes
    // with the deterministic renderer output, so any noncanonical formatting
    // (extra whitespace, reordering, hand-editing) is rejected even when the
    // semantic content would still validate.
    const entry = deriveAdoptedCase('selfdev.fixture.local-regression.v1', ['selfdev.synthetic.expand-summary'], ['selfdev.assert.state.expanded']);
    const canonical = renderAdoptedCatalogSource([entry]);
    expect(renderAdoptedCatalogSource(validateAdoptedCatalog([entry]))).toBe(canonical);
    const nonCanonical = canonical.replace('"schemaVersion"', ' "schemaVersion"');
    expect(nonCanonical).not.toBe(canonical);
    // The validator alone accepts the semantic content; only the byte-level
    // round-trip (as performed by the integrity check) rejects the deviation.
    expect(() => validateAdoptedCatalog([entry])).not.toThrow();
  });

  test('the generated catalog authority header states the truthful runtime authority model (R1.1.1 positive invariant)', () => {
    // Phase 8B.1-R1.1.1: the authority header must express the exact
    // five-way partition WITHOUT any false absolute. These are the exact
    // stable phrases the renderer emits and the live generated file must
    // carry byte-for-byte. The canonical-promotion executor IS runtime code,
    // so "runtime code never writes canonical source" is a contradiction and
    // is rejected by the negative test below. Phrase checks run on the
    // comment-flattened header (each `// ` line join collapses to a space),
    // matching the prose the renderer emits.
    const generatedPath = path.join(process.cwd(), 'src/core/selfDev/adoptedCaseCatalog.generated.ts');
    const bytes = fs.readFileSync(generatedPath, 'utf8');
    const rendered = renderAdoptedCatalogSource(validateAdoptedCatalog(SELFDEV_ADOPTED_CASES));
    expect(rendered).toBe(bytes);
    const flatten = (source: string): string => source.replace(/\n\s*\/\/\s*/g, ' ');
    for (const source of [flatten(bytes), flatten(rendered)]) {
      // Generated declarative data; ordinary development never hand-edits.
      expect(source).toMatch(/GENERATED FILE/);
      expect(source).toMatch(/Do not hand-edit/);
      // 1. Sandbox writer is mirror-only.
      expect(source).toMatch(/Phase 8B sandbox/);
      expect(source).toMatch(/disposable/);
      expect(source).toMatch(/private source mirror/);
      // 2. Owner-gated canonical-promotion executor: the ONLY runtime
      //    authority, bounded exact canonical target write.
      expect(source).toMatch(/canonical-promotion executor is/);
      expect(source).toMatch(/the only runtime authority/);
      expect(source).toMatch(/bounded canonical/);
      expect(source).toMatch(/owner-gated promotion/);
      // 3. Runtime promotion code never commits/pushes Git; the development
      //    session performs the later verified Git commit.
      expect(source).toMatch(/never commits or pushes Git/);
      expect(source).toMatch(/development session performs the later verified Git commit/);
      // 4. Candidates never directly write source.
      expect(source).toMatch(/candidates never directly write source/);
      // 5. No generic self-modification / source-writing authority.
      expect(source).toMatch(/No generic self-modification authority/);
      expect(source).toMatch(/no generic runtime source-writing interface exists/);
    }
  });

  test('the generated catalog authority header rejects every false runtime-write absolute (R1.1.1 negative invariant)', () => {
    // Phase 8B.1-R1.1.1 regression guard: the false absolute
    // "runtime code never writes canonical source" (and its equivalents)
    // contradicts the owner-gated canonical-promotion executor, which IS a
    // runtime authority for the bounded canonical target write. Any
    // reintroduction in the renderer output or the live generated file fails.
    const generatedPath = path.join(process.cwd(), 'src/core/selfDev/adoptedCaseCatalog.generated.ts');
    const bytes = fs.readFileSync(generatedPath, 'utf8');
    const rendered = renderAdoptedCatalogSource(validateAdoptedCatalog(SELFDEV_ADOPTED_CASES));
    const FALSE_ABSOLUTES = [
      'runtime code never writes canonical source',
      'runtime never writes canonical source',
      'runtime never mutates canonical source',
      'canonical source is never written at runtime',
      'canonical source is never changed at runtime',
      'no runtime path can write canonical source',
      'sandbox executor may write canonical target',
      'runtime promotion code commits Git',
      'candidates may write generated source',
      'canonical promotion may write arbitrary files',
    ];
    for (const phrase of FALSE_ABSOLUTES) {
      expect(bytes).not.toContain(phrase);
      expect(rendered).not.toContain(phrase);
    }
    // Case-insensitive safety for the Git-commit negation: only
    // "never commits or pushes Git" may appear.
    expect(bytes).not.toMatch(/runtime promotion code commits/i);
    expect(rendered).not.toMatch(/runtime promotion code commits/i);
  });

  test('the live one-entry catalog round-trips with exact deep semantic equality (R1.1.1 header-only change property)', () => {
    // Phase 8B.1-R1.1.1: the R1.1.1 change is header-comment-only by
    // construction. Parsing the on-disk array literal, validating it, and
    // requiring deep equality with the module's validated live entries
    // mechanically proves no adopted-case semantics moved — whatever the
    // current checkout's one-entry catalog holds.
    const generatedPath = path.join(process.cwd(), 'src/core/selfDev/adoptedCaseCatalog.generated.ts');
    const bytes = fs.readFileSync(generatedPath, 'utf8');
    const arrayText = bytes.slice(bytes.indexOf('['), bytes.lastIndexOf(']') + 1);
    const parsed = JSON.parse(arrayText) as unknown[];
    const validatedParsed = validateAdoptedCatalog(parsed);
    const validatedLive = validateAdoptedCatalog(SELFDEV_ADOPTED_CASES);
    expect(validatedParsed).toEqual(validatedLive);
    expect(renderAdoptedCatalogSource(validatedParsed)).toBe(bytes);
    // The declarative code section below the header is exactly the export
    // line plus the JSON literal — the only bytes that can differ between
    // catalog states (blank lines separate the header from the export).
    const codeLines = bytes.split('\n').filter((line) => line.trim() !== '' && !line.trim().startsWith('//'));
    expect(codeLines[0]).toMatch(/^export const SELFDEV_ADOPTED_CASES = \[$/);
    expect(codeLines[codeLines.length - 1]).toBe('];');
  });
});
