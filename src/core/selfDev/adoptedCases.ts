// ---------------------------------------------------------------------------
// Nightwatch Phase 8B — declarative adopted-case catalog.
//
// This is the trusted schema/validation/rendering module. The catalog DATA
// itself lives in the separate, strictly data-only
// `adoptedCaseCatalog.generated.ts` — the one file the sandbox adoption
// executor (src/core/selfDevSandbox/) is ever permitted to rewrite, and only
// inside a disposable private source mirror. This module never mutates that
// file; it only validates it at load time, derives base-independent
// identity, and renders a canonical postimage for the sandbox to write.
//
// An adopted case is candidate SEMANTICS (fixture + actions + assertions),
// never candidate-supplied code, patch, path, or expression. Coverage is
// always re-derived from the fixed action registry, never trusted from a
// caller-supplied field.
// ---------------------------------------------------------------------------

import { sha256Digest } from './canonical';
import {
  SELFDEV_COVERAGE_CLASSES,
  resolveSelfDevAction,
  resolveSelfDevAssertion,
  resolveSelfDevFixture,
} from './registry';
import { selfDevEquivalentFingerprint } from './validation';
import { SELFDEV_ADOPTED_CASES as RAW_ADOPTED_CASES } from './adoptedCaseCatalog.generated';

export const SELFDEV_ADOPTED_CASE_SCHEMA_VERSION = 'nightwatch.selfdev-adopted-case.v1' as const;
export const SELFDEV_ADOPTION_STRATEGY_VERSION = 'nightwatch.selfdev-adoption-strategy.v1' as const;
export const SELFDEV_ADOPTION_STRATEGY_CLASS = 'DECLARATIVE_REGRESSION_CATALOG_PROMOTION' as const;
/** The single production adoption strategy class (Phase 8B.0.1 strict binding). */
export type SelfDevAdoptionStrategyClass = typeof SELFDEV_ADOPTION_STRATEGY_CLASS;
export const SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES = 64;
export const SELFDEV_ADOPTED_CATALOG_TARGET_PATH = 'src/core/selfDev/adoptedCaseCatalog.generated.ts' as const;

export interface SelfDevAdoptedCase {
  readonly schemaVersion: typeof SELFDEV_ADOPTED_CASE_SCHEMA_VERSION;
  readonly adoptedCaseId: string;
  readonly fixtureId: string;
  readonly actionIds: readonly string[];
  readonly assertionIds: readonly string[];
  readonly equivalentFingerprint: string;
  readonly coverageClasses: readonly string[];
  readonly strategyClass: typeof SELFDEV_ADOPTION_STRATEGY_CLASS;
}

const ADOPTED_CASE_KEYS = [
  'schemaVersion', 'adoptedCaseId', 'fixtureId', 'actionIds', 'assertionIds',
  'equivalentFingerprint', 'coverageClasses', 'strategyClass',
] as const;

const ID_RE = /^[A-Za-z][A-Za-z0-9_.:-]{0,119}$/;
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
const ADOPTED_CASE_ID_RE = /^adopted-case:sha256:[0-9a-f]{64}$/;
const MAX_ACTIONS = 8;
const MAX_ASSERTIONS = 8;

export class SelfDevAdoptedCatalogError extends Error {
  constructor(readonly code: string) {
    super(`SELFDEV_ADOPTED_CATALOG_${code}`);
    this.name = 'SelfDevAdoptedCatalogError';
  }
}

function fail(code: string): never {
  throw new SelfDevAdoptedCatalogError(code);
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('ENTRY_INVALID');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail('ENTRY_INVALID');
  return value as Record<string, unknown>;
}

function idArray(value: unknown, code: string, max: number): readonly string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > max) fail(code);
  const result = value.map((item) => {
    if (typeof item !== 'string' || item.length > 120 || !ID_RE.test(item)) fail(code);
    return item;
  });
  if (new Set(result).size !== result.length) fail(code);
  return result;
}

/**
 * Coverage is always re-derived from the live action registry — never
 * trusted from a caller/catalog-supplied field. This is what makes
 * `coverageClasses` safe to include in base-independent identity: it is a
 * deterministic function of `fixtureId`/`actionIds`, not free-form data.
 */
export function deriveAdoptedCaseCoverage(actionIds: readonly string[]): readonly string[] {
  const resolved = actionIds.map(resolveSelfDevAction);
  const coverage = new Set<string>();
  for (const action of resolved) {
    for (const coverageClass of action.coverageClasses) coverage.add(coverageClass);
  }
  return [...coverage].sort();
}

/** Base-independent identity: excludes any base SHA, timestamp, or sandbox path. */
export function adoptedCaseIdentityFields(entry: {
  readonly fixtureId: string;
  readonly actionIds: readonly string[];
  readonly assertionIds: readonly string[];
  readonly coverageClasses: readonly string[];
  readonly strategyClass: string;
}): Record<string, unknown> {
  return {
    schemaVersion: SELFDEV_ADOPTED_CASE_SCHEMA_VERSION,
    fixtureId: entry.fixtureId,
    actionIds: [...entry.actionIds],
    assertionIds: [...entry.assertionIds].sort(),
    coverageClasses: [...entry.coverageClasses].sort(),
    strategyClass: entry.strategyClass,
  };
}

export function adoptedCaseIdFor(entry: {
  readonly fixtureId: string;
  readonly actionIds: readonly string[];
  readonly assertionIds: readonly string[];
  readonly coverageClasses: readonly string[];
  readonly strategyClass: string;
}): string {
  return `adopted-case:${sha256Digest(adoptedCaseIdentityFields(entry))}`;
}

/** Derive full adopted-case semantics for one candidate's fixture/action/assertion identity. */
export function deriveAdoptedCase(fixtureId: string, actionIds: readonly string[], assertionIds: readonly string[]): SelfDevAdoptedCase {
  resolveSelfDevFixture(fixtureId);
  for (const assertionId of assertionIds) resolveSelfDevAssertion(assertionId);
  const coverageClasses = deriveAdoptedCaseCoverage(actionIds);
  const equivalentFingerprint = selfDevEquivalentFingerprint(fixtureId, actionIds, assertionIds);
  const base = { fixtureId, actionIds: [...actionIds], assertionIds: [...assertionIds], coverageClasses, strategyClass: SELFDEV_ADOPTION_STRATEGY_CLASS };
  return {
    schemaVersion: SELFDEV_ADOPTED_CASE_SCHEMA_VERSION,
    adoptedCaseId: adoptedCaseIdFor(base),
    equivalentFingerprint,
    ...base,
  };
}

export function validateAdoptedCase(value: unknown): SelfDevAdoptedCase {
  const entry = record(value);
  for (const key of Object.keys(entry)) if (!(ADOPTED_CASE_KEYS as readonly string[]).includes(key)) fail('UNKNOWN_FIELD');
  for (const key of ADOPTED_CASE_KEYS) if (!(key in entry)) fail('MISSING_FIELD');
  if (entry.schemaVersion !== SELFDEV_ADOPTED_CASE_SCHEMA_VERSION) fail('SCHEMA_INVALID');
  if (entry.strategyClass !== SELFDEV_ADOPTION_STRATEGY_CLASS) fail('STRATEGY_INVALID');
  if (typeof entry.fixtureId !== 'string' || entry.fixtureId.length > 120 || !ID_RE.test(entry.fixtureId)) fail('FIXTURE_INVALID');
  const actionIds = idArray(entry.actionIds, 'ACTION_IDS_INVALID', MAX_ACTIONS);
  const assertionIds = idArray(entry.assertionIds, 'ASSERTION_IDS_INVALID', MAX_ASSERTIONS);
  const coverageClasses = idArray(entry.coverageClasses, 'COVERAGE_CLASSES_INVALID', SELFDEV_COVERAGE_CLASSES.length);
  try {
    resolveSelfDevFixture(entry.fixtureId);
    for (const actionId of actionIds) resolveSelfDevAction(actionId);
    for (const assertionId of assertionIds) resolveSelfDevAssertion(assertionId);
  } catch {
    fail('REGISTRY_UNKNOWN');
  }
  for (const coverageClass of coverageClasses) {
    if (!SELFDEV_COVERAGE_CLASSES.includes(coverageClass as (typeof SELFDEV_COVERAGE_CLASSES)[number])) fail('COVERAGE_CLASS_UNKNOWN');
  }
  const derivedCoverage = deriveAdoptedCaseCoverage(actionIds);
  const sortedCoverage = [...coverageClasses].sort();
  if (sortedCoverage.length !== derivedCoverage.length || sortedCoverage.some((value, index) => value !== derivedCoverage[index])) {
    fail('COVERAGE_CLASSES_MISMATCH');
  }
  if (typeof entry.equivalentFingerprint !== 'string' || !DIGEST_RE.test(entry.equivalentFingerprint)) fail('FINGERPRINT_INVALID');
  const recomputedFingerprint = selfDevEquivalentFingerprint(entry.fixtureId, actionIds, assertionIds);
  if (entry.equivalentFingerprint !== recomputedFingerprint) fail('FINGERPRINT_MISMATCH');
  const identity = { fixtureId: entry.fixtureId, actionIds, assertionIds, coverageClasses: derivedCoverage, strategyClass: SELFDEV_ADOPTION_STRATEGY_CLASS };
  const adoptedCaseId = adoptedCaseIdFor(identity);
  if (typeof entry.adoptedCaseId !== 'string' || !ADOPTED_CASE_ID_RE.test(entry.adoptedCaseId)) fail('ID_INVALID');
  if (entry.adoptedCaseId !== adoptedCaseId) fail('ID_MISMATCH');
  return {
    schemaVersion: SELFDEV_ADOPTED_CASE_SCHEMA_VERSION,
    adoptedCaseId,
    fixtureId: entry.fixtureId,
    actionIds,
    assertionIds,
    equivalentFingerprint: entry.equivalentFingerprint,
    coverageClasses: derivedCoverage,
    strategyClass: SELFDEV_ADOPTION_STRATEGY_CLASS,
  };
}

export function validateAdoptedCatalog(values: unknown): readonly SelfDevAdoptedCase[] {
  if (!Array.isArray(values)) fail('CATALOG_INVALID');
  if (values.length > SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES) fail('CATALOG_TOO_LARGE');
  const entries = values.map(validateAdoptedCase);
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();
  for (const entry of entries) {
    if (seenIds.has(entry.adoptedCaseId)) fail('DUPLICATE_ID');
    if (seenFingerprints.has(entry.equivalentFingerprint)) fail('DUPLICATE_FINGERPRINT');
    seenIds.add(entry.adoptedCaseId);
    seenFingerprints.add(entry.equivalentFingerprint);
  }
  return entries;
}

function renderEntry(entry: SelfDevAdoptedCase): string {
  const ordered = {
    schemaVersion: entry.schemaVersion,
    adoptedCaseId: entry.adoptedCaseId,
    fixtureId: entry.fixtureId,
    actionIds: entry.actionIds,
    assertionIds: entry.assertionIds,
    equivalentFingerprint: entry.equivalentFingerprint,
    coverageClasses: entry.coverageClasses,
    strategyClass: entry.strategyClass,
  };
  return JSON.stringify(ordered, null, 2).split('\n').map((line, index) => (index === 0 ? `  ${line}` : `  ${line}`)).join('\n');
}

/**
 * Deterministic canonical-source renderer. Same catalog contents always
 * produce byte-identical output; entries are sorted by `adoptedCaseId` so
 * insertion order never affects the result. Values are serialized only via
 * `JSON.stringify` over already-validated bounded-charset strings/arrays —
 * never raw candidate-controlled interpolation.
 */
export function renderAdoptedCatalogSource(catalog: readonly SelfDevAdoptedCase[]): string {
  const validated = validateAdoptedCatalog(catalog);
  const sorted = [...validated].sort((a, b) => (a.adoptedCaseId < b.adoptedCaseId ? -1 : a.adoptedCaseId > b.adoptedCaseId ? 1 : 0));
  const arrayLiteral = sorted.length === 0 ? '[]' : `[\n${sorted.map(renderEntry).join(',\n')}\n]`;
  return [
    '// GENERATED FILE — see src/core/selfDev/adoptedCases.ts',
    '// (renderAdoptedCatalogSource). Do not hand-edit.',
    '//',
    '// nightwatch.selfdev-adopted-case-catalog.generated.v1',
    '//',
    '// This file must remain pure declarative data: no imports, no functions, no',
    '// expressions beyond array/object/string literals. It is the one file the',
    '// Phase 8B sandbox adoption executor is permitted to rewrite, and only ever',
    '// inside a disposable private source mirror — never in this canonical',
    '// checkout at runtime.',
    '',
    `export const SELFDEV_ADOPTED_CASES = ${arrayLiteral};`,
    '',
  ].join('\n');
}

/** The current canonical catalog, validated at module load. Fails closed on corruption. */
export const SELFDEV_ADOPTED_CASES: readonly SelfDevAdoptedCase[] = validateAdoptedCatalog(RAW_ADOPTED_CASES);

export function selfDevAdoptedEquivalentFingerprints(): readonly string[] {
  return SELFDEV_ADOPTED_CASES.map((entry) => entry.equivalentFingerprint);
}

export function selfDevAdoptedCoverageClasses(): readonly string[] {
  const coverage = new Set<string>();
  for (const entry of SELFDEV_ADOPTED_CASES) for (const coverageClass of entry.coverageClasses) coverage.add(coverageClass);
  return [...coverage].sort();
}
