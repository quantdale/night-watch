// C-09 — spec-derived expectations.
//
// A spec sentence is not a machine expectation. Two things are needed to turn
// one into the other: an assertion an oracle can actually evaluate, and an
// EXACT operation the assertion is about. C-09 refuses to supply either by
// interpretation.
//
// Where product specification is, and is not:
//
//   `openspec/` holds 332 scenarios that specify NIGHTWATCH -- "Evidence
//   invalidates acceptance", "Auth expires during execution". They are the
//   campaign record of this tool, so none of them makes a claim about a
//   product operation and none can bind to one. All 332 are OUTSIDE_SCOPE.
//
//   The product specification is the committed generated OpenAPI admitted by
//   C-02a and C-05: 642 operations, all with a resolved response schema.
//
// This is data-only policy: no filesystem, process or network authority. The
// caller supplies an already-parsed document. C-09 ADMITS expectations and
// evaluates none.

import crypto from 'node:crypto';

export const SPEC_EXPECTATION_VERSION = 'nightwatch.spec-derived-expectation.v1' as const;
export const SPEC_EXTRACTOR_VERSION = 'c09.spec-extractor.v1' as const;

/**
 * The §42 classification vocabulary. Members are NOT interchangeable, and the
 * pair most easily confused carries the campaign:
 *
 *   `OUTSIDE_SCOPE`        — not a claim about the product at all
 *   `NO_OPERATION_BINDING` — a product claim that binds to no known operation
 *
 * A scenario reading "an ambiguous spec grants nothing" is the first, not the
 * second. Collapsing them would let 332 specifications of this tool be counted
 * as unbound product claims, which is a very different and much more
 * flattering statement.
 */
export const SCENARIO_CLASSIFICATIONS = [
  'CHECKABLE', 'NON_CHECKABLE', 'AMBIGUOUS', 'UNSUPPORTED',
  'NO_OPERATION_BINDING', 'MULTIPLE_BINDINGS', 'STALE', 'OUTSIDE_SCOPE',
] as const;
export type ScenarioClassification = (typeof SCENARIO_CLASSIFICATIONS)[number];

/**
 * Expectation classes. Each is here because the EXISTING oracle vocabulary can
 * represent it; none required a new invariant kind.
 *
 * `REQUIRED_KEY` is deliberately absent. Measured across both artifacts: zero
 * `required` arrays, because protobuf3 removed required semantics and these are
 * gRPC-gateway generated documents. Approximating it from `properties`
 * membership would manufacture a claim the document does not make -- a property
 * being PRESENT IN A SCHEMA is not a claim that it is PRESENT IN A RESPONSE.
 */
export const SPEC_EXPECTATION_CLASSES = [
  'RESPONSE_PROPERTY_TYPE',
  'RESPONSE_PROPERTY_ENUM',
  'RESPONSE_PROPERTY_SHAPE',
  'RESPONSE_PROPERTY_CARDINALITY',
] as const;
export type SpecExpectationClass = (typeof SPEC_EXPECTATION_CLASSES)[number];

/** Why a candidate did not become an admitted expectation. */
export const SPEC_REJECTION_REASONS = [
  'NO_RESPONSE_SCHEMA_REFERENCE',
  'RESPONSE_REFERENCE_UNRESOLVED',
  'DEFINITION_HAS_NO_PROPERTIES',
  'PROPERTY_CARRIES_NO_REPRESENTABLE_ASSERTION',
  'REQUIRED_KEY_MATERIAL_ABSENT',
  'PROVENANCE_INCOMPLETE',
] as const;
export type SpecRejectionReason = (typeof SPEC_REJECTION_REASONS)[number];

export interface SpecExpectationProvenance {
  readonly repoId: string;
  readonly sourceSha: string;
  readonly artifactPath: string;
  readonly definitionName: string;
  readonly propertyPath: string;
  readonly operationId: string;
  readonly method: string;
  readonly routePath: string;
  readonly extractorVersion: typeof SPEC_EXTRACTOR_VERSION;
  readonly digest: string;
}

export interface SpecExpectation {
  readonly schemaVersion: typeof SPEC_EXPECTATION_VERSION;
  readonly expectationClass: SpecExpectationClass;
  /** The assertion, as data. Never prose. */
  readonly assertion: Readonly<Record<string, unknown>>;
  readonly provenance: SpecExpectationProvenance;
  readonly currentness: 'CURRENT' | 'STALE';
}

export interface SpecExpectationRejection {
  readonly operationId: string | null;
  readonly routePath: string;
  readonly method: string;
  readonly reason: SpecRejectionReason;
}

export interface SpecExpectationProjection {
  readonly schemaVersion: typeof SPEC_EXPECTATION_VERSION;
  readonly operationsExamined: number;
  readonly operationsWithResolvedSchema: number;
  readonly admitted: readonly SpecExpectation[];
  readonly rejections: readonly SpecExpectationRejection[];
  readonly byClass: Readonly<Record<SpecExpectationClass, number>>;
  /** Operation ids carrying at least one admitted expectation. */
  readonly operationsWithExpectations: readonly string[];
  /** Reported, never approximated. */
  readonly requiredKeyMaterialAvailable: false;
  readonly truncated: boolean;
}

const MAX_EXPECTATIONS = 4096;
const MAX_PROPERTIES_PER_DEFINITION = 256;
const SAFE_NAME = /^[A-Za-z0-9_.-]{1,200}$/;
const JSON_TYPES = Object.freeze(['string', 'number', 'integer', 'boolean', 'object', 'array']);

/** Fields whose content is natural language and may never become an assertion. */
export const PROSE_FIELDS = Object.freeze(['summary', 'description', 'title', 'example', 'externalDocs']);

function digestOf(value: unknown): string {
  const canonical = (input: unknown): string => {
    if (input === null || typeof input !== 'object') return JSON.stringify(input) ?? 'null';
    if (Array.isArray(input)) return `[${input.map(canonical).join(',')}]`;
    const record = input as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
  };
  return `spec:sha256:${crypto.createHash('sha256').update(canonical(value), 'utf8').digest('hex').slice(0, 24)}`;
}

function definitionNameOf(ref: unknown): string | null {
  if (typeof ref !== 'string') return null;
  const match = /^#\/definitions\/([A-Za-z0-9_.-]{1,200})$/.exec(ref);
  return match === null ? null : match[1] ?? null;
}

/** The response `$ref` a document itself attaches to one operation. */
function responseRefFor(operation: Record<string, unknown>): string | null {
  const responses = operation.responses;
  if (responses === null || typeof responses !== 'object') return null;
  for (const response of Object.values(responses as Record<string, unknown>)) {
    if (response === null || typeof response !== 'object') continue;
    const schema = (response as Record<string, unknown>).schema;
    if (schema === null || typeof schema !== 'object') continue;
    const ref = (schema as Record<string, unknown>).$ref;
    if (typeof ref === 'string') return ref;
  }
  return null;
}

/**
 * Derive expectations from ONE already-parsed OpenAPI document.
 *
 * The operation join is exact BY CONSTRUCTION, not by matching: each
 * expectation comes from the response `$ref` of a specific `(path, method)`
 * entry, so the operation is whichever one the document attached the schema to.
 * There is no similarity step available to get wrong, which is the point --
 * §45 warns that the temptation is to match by name and reach a target count.
 */
export function deriveSpecExpectations(input: {
  readonly repoId: string;
  readonly sourceSha: string;
  readonly artifactPath: string;
  readonly document: unknown;
}): SpecExpectationProjection {
  const admitted: SpecExpectation[] = [];
  const rejections: SpecExpectationRejection[] = [];
  const byClass = Object.fromEntries(SPEC_EXPECTATION_CLASSES.map((klass) => [klass, 0])) as Record<SpecExpectationClass, number>;
  let examined = 0;
  let resolved = 0;
  let truncated = false;

  const document = input.document;
  if (document === null || typeof document !== 'object') {
    return Object.freeze({
      schemaVersion: SPEC_EXPECTATION_VERSION, operationsExamined: 0, operationsWithResolvedSchema: 0,
      admitted: Object.freeze([]), rejections: Object.freeze([]), byClass: Object.freeze(byClass),
      operationsWithExpectations: Object.freeze([]), requiredKeyMaterialAvailable: false as const, truncated: false,
    });
  }
  const record = document as Record<string, unknown>;
  const paths = (record.paths ?? {}) as Record<string, unknown>;
  const definitions = (record.definitions ?? {}) as Record<string, unknown>;

  for (const [routePath, methodsValue] of Object.entries(paths).sort(([left], [right]) => left.localeCompare(right))) {
    if (methodsValue === null || typeof methodsValue !== 'object') continue;
    for (const [method, operationValue] of Object.entries(methodsValue as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right))) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) continue;
      if (operationValue === null || typeof operationValue !== 'object') continue;
      examined += 1;
      const operation = operationValue as Record<string, unknown>;
      const operationId = typeof operation.operationId === 'string' && SAFE_NAME.test(operation.operationId) ? operation.operationId : null;
      if (operationId === null) {
        rejections.push(Object.freeze({ operationId: null, routePath, method, reason: 'NO_RESPONSE_SCHEMA_REFERENCE' }));
        continue;
      }
      const ref = responseRefFor(operation);
      if (ref === null) {
        rejections.push(Object.freeze({ operationId, routePath, method, reason: 'NO_RESPONSE_SCHEMA_REFERENCE' }));
        continue;
      }
      const definitionName = definitionNameOf(ref);
      const definition = definitionName === null ? undefined : definitions[definitionName];
      if (definitionName === null || definition === null || typeof definition !== 'object') {
        // An unresolvable reference is AMBIGUOUS, never silently skipped.
        rejections.push(Object.freeze({ operationId, routePath, method, reason: 'RESPONSE_REFERENCE_UNRESOLVED' }));
        continue;
      }
      resolved += 1;
      const properties = (definition as Record<string, unknown>).properties;
      if (properties === null || typeof properties !== 'object') {
        rejections.push(Object.freeze({ operationId, routePath, method, reason: 'DEFINITION_HAS_NO_PROPERTIES' }));
        continue;
      }
      let admittedForOperation = 0;
      for (const [propertyName, propertyValue] of Object.entries(properties as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right))) {
        if (admittedForOperation >= MAX_PROPERTIES_PER_DEFINITION) { truncated = true; break; }
        if (admitted.length >= MAX_EXPECTATIONS) { truncated = true; break; }
        if (!SAFE_NAME.test(propertyName) || propertyValue === null || typeof propertyValue !== 'object') continue;
        const property = propertyValue as Record<string, unknown>;
        const propertyPath = propertyName;

        const push = (expectationClass: SpecExpectationClass, assertion: Record<string, unknown>) => {
          const core = { expectationClass, assertion, definitionName, propertyPath, operationId, method, routePath };
          admitted.push(Object.freeze({
            schemaVersion: SPEC_EXPECTATION_VERSION,
            expectationClass,
            assertion: Object.freeze(assertion),
            provenance: Object.freeze({
              repoId: input.repoId, sourceSha: input.sourceSha, artifactPath: input.artifactPath,
              definitionName: definitionName!, propertyPath, operationId, method, routePath,
              extractorVersion: SPEC_EXTRACTOR_VERSION, digest: digestOf(core),
            }),
            currentness: 'CURRENT' as const,
          }));
          byClass[expectationClass] += 1;
          admittedForOperation += 1;
        };

        // --- ENUM: the property's $ref resolves to an enum definition ---
        const propertyRef = definitionNameOf(property.$ref);
        const referenced = propertyRef === null ? undefined : definitions[propertyRef];
        const referencedRecord = referenced !== null && typeof referenced === 'object' ? referenced as Record<string, unknown> : null;
        const enumValues = referencedRecord === null ? null : referencedRecord.enum;
        if (Array.isArray(enumValues) && enumValues.length > 0 && enumValues.every((value) => typeof value === 'string')) {
          push('RESPONSE_PROPERTY_ENUM', { allowedValues: Object.freeze([...enumValues].sort()), enumDefinition: propertyRef });
          continue;
        }
        // --- SHAPE: the property's $ref resolves to an object definition ---
        if (referencedRecord !== null && referencedRecord.properties !== undefined) {
          push('RESPONSE_PROPERTY_SHAPE', { shapeDefinition: propertyRef, kind: 'OBJECT' });
          continue;
        }
        const declaredType = property.type;
        if (typeof declaredType === 'string' && JSON_TYPES.includes(declaredType)) {
          // --- CARDINALITY: array-typed ---
          if (declaredType === 'array') {
            push('RESPONSE_PROPERTY_CARDINALITY', { kind: 'ARRAY', minimumItems: 0 });
            continue;
          }
          // --- TYPE ---
          push('RESPONSE_PROPERTY_TYPE', { declaredType });
          continue;
        }
        rejections.push(Object.freeze({ operationId, routePath, method, reason: 'PROPERTY_CARRIES_NO_REPRESENTABLE_ASSERTION' }));
      }
    }
  }

  const withExpectations = [...new Set(admitted.map((expectation) => expectation.provenance.operationId))].sort();
  return Object.freeze({
    schemaVersion: SPEC_EXPECTATION_VERSION,
    operationsExamined: examined,
    operationsWithResolvedSchema: resolved,
    admitted: Object.freeze(admitted),
    rejections: Object.freeze(rejections),
    byClass: Object.freeze(byClass),
    operationsWithExpectations: Object.freeze(withExpectations),
    // Measured zero across both artifacts. Reported, never approximated.
    requiredKeyMaterialAvailable: false as const,
    truncated,
  });
}

/**
 * Is an expectation still current? A digest or SHA mismatch makes it STALE and
 * it is NOT rebound: a rebind would let a changed specification inherit the
 * standing of the expectation it replaced.
 */
export function expectationCurrentness(expectation: SpecExpectation, currentSourceSha: string, currentDigest: string): 'CURRENT' | 'STALE' {
  return expectation.provenance.sourceSha === currentSourceSha
    && expectation.provenance.digest === currentDigest
    && expectation.provenance.extractorVersion === SPEC_EXTRACTOR_VERSION
    ? 'CURRENT' : 'STALE';
}

/** Provenance completeness. An incomplete record is not an admitted expectation. */
export function provenanceIsComplete(provenance: SpecExpectationProvenance): boolean {
  return [provenance.repoId, provenance.sourceSha, provenance.artifactPath, provenance.definitionName,
    provenance.propertyPath, provenance.operationId, provenance.method, provenance.routePath,
    provenance.extractorVersion, provenance.digest].every((field) => typeof field === 'string' && field.length > 0);
}
