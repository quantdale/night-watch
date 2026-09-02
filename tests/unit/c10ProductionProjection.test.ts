// ---------------------------------------------------------------------------
// C-10 / F-14 — arbitrary dynamic key names are DATA.
//
// The mandatory regression for Workstream B. The Phase 9 DEV projection
// (`nightwatch.semantic-projection.v1`) writes an object key literal verbatim
// into its canonical bytes, which is correct for DEV fixtures and wrong for
// production, where objects are routinely keyed by AWS account id, MSP id,
// billing-group id or company name.
//
// These cases plant sentinel key literals that represent customer data and
// prove, non-vacuously, that the exact bytes ARE present in the raw input and
// are present NOWHERE after the production projection boundary — not in the
// projection, not in the canonical serialization, not in the structural
// digest input, not in the evidence DTO, and not in any error.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  createOpaqueParameterHandle,
  createProductionPrivacyPolicy,
  createProvenKeyVocabulary,
  createSafeRouteIdentity,
  canonicalStructuralBytes,
  foldKeyProvenance,
  NO_PROVEN_VOCABULARY,
  productionStructuralDigest,
  ProductionPrivacyError,
  projectProduction,
  RawEphemeralSource,
  toProductionEvidence,
  assertRouteTemplateOnly,
  assertHandleNotValue,
  createDevPrivacyPolicy,
  DEFAULT_PRODUCTION_PROJECTION_LIMITS,
} from '../../src/core/prodPrivacy';

// --- sentinels -------------------------------------------------------------
// Every one of these is a value class the campaign brief names as forbidden.

const SENTINEL_ACCOUNT_ID = '481516234299';
const SENTINEL_MSP_ID = 'msp-b7f1c0d4-nightwatch-sentinel';
const SENTINEL_COMPANY = 'Contoso Global Holdings KK';
const SENTINEL_INVOICE = 'INV-2026-000731-SENTINEL';
const SENTINEL_BILLING_GROUP = 'bg-sentinel-8812';
const SENTINEL_FREE_TEXT = 'sentinel free text that must never persist';
const SENTINEL_EMAIL = 'sentinel.person@example-customer.invalid';

const ALL_SENTINELS = [
  SENTINEL_ACCOUNT_ID,
  SENTINEL_MSP_ID,
  SENTINEL_COMPANY,
  SENTINEL_INVOICE,
  SENTINEL_BILLING_GROUP,
  SENTINEL_FREE_TEXT,
  SENTINEL_EMAIL,
] as const;

/**
 * A hostile synthetic production payload. Sentinels appear as scalar values
 * AND as dynamic object keys at several nesting depths — the F-14 case.
 */
function hostilePayload(): unknown {
  return {
    // source-proven field names, with sentinel VALUES underneath
    status: 'ACTIVE',
    total: 4815162342,
    accounts: {
      // dynamic keys: every one of these is customer data
      [SENTINEL_ACCOUNT_ID]: { name: SENTINEL_COMPANY, amount: 1234.56 },
      [SENTINEL_MSP_ID]: {
        // nested dynamic keys
        [SENTINEL_BILLING_GROUP]: { invoice: SENTINEL_INVOICE, note: SENTINEL_FREE_TEXT },
      },
    },
    contacts: [{ email: SENTINEL_EMAIL }, { email: SENTINEL_EMAIL }],
  };
}

const PROVEN_KEYS = ['status', 'total', 'accounts', 'contacts', 'name', 'amount', 'invoice', 'note', 'email'];

function vocabulary() {
  return createProvenKeyVocabulary({
    provenanceClass: 'SOURCE_PROVEN_OPENAPI_DEFINITION',
    provenanceDigest: 'ev:sha256:0123456789abcdef01234567',
    keys: PROVEN_KEYS,
  });
}

/** Every string that appears anywhere in a structure, however nested. */
function everyString(value: unknown, sink: string[] = []): string[] {
  if (typeof value === 'string') sink.push(value);
  else if (Array.isArray(value)) for (const item of value) everyString(item, sink);
  else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      sink.push(key);
      everyString(child, sink);
    }
  }
  return sink;
}

test.describe('C-10 F-14 — dynamic key literals cannot cross the production boundary', () => {
  test('the raw input provably contains every sentinel (non-vacuous)', () => {
    // Guard against a vacuous pass: if the fixture ever stops containing a
    // sentinel, the absence assertions below would succeed for the wrong
    // reason. Prove presence first.
    const rawText = JSON.stringify(hostilePayload());
    for (const sentinel of ALL_SENTINELS) {
      expect(rawText, `raw fixture must contain ${sentinel}`).toContain(sentinel);
    }
    // And prove the two F-14 sentinels are present specifically as KEYS.
    const strings = everyString(hostilePayload());
    expect(strings).toContain(SENTINEL_ACCOUNT_ID);
    expect(strings).toContain(SENTINEL_MSP_ID);
    expect(strings).toContain(SENTINEL_BILLING_GROUP);
  });

  test('no sentinel byte survives the production projection', () => {
    const policy = createProductionPrivacyPolicy();
    const projection = projectProduction(RawEphemeralSource.of(hostilePayload()), vocabulary(), policy);
    const serialized = JSON.stringify(projection);
    for (const sentinel of ALL_SENTINELS) {
      expect(serialized, `projection must not contain ${sentinel}`).not.toContain(sentinel);
    }
  });

  test('no sentinel byte survives the canonical serialization or the digest input', () => {
    const policy = createProductionPrivacyPolicy();
    const projection = projectProduction(RawEphemeralSource.of(hostilePayload()), vocabulary(), policy);
    const canonical = canonicalStructuralBytes(projection.root);
    for (const sentinel of ALL_SENTINELS) {
      expect(canonical, `canonical bytes must not contain ${sentinel}`).not.toContain(sentinel);
    }
    // The digest is taken over exactly these bytes.
    expect(productionStructuralDigest(projection.root)).toMatch(/^prodstruct:sha256:[0-9a-f]{24}$/);
  });

  test('no sentinel byte survives into the persistable evidence DTO', () => {
    const policy = createProductionPrivacyPolicy();
    const projection = projectProduction(RawEphemeralSource.of(hostilePayload()), vocabulary(), policy);
    const evidence = toProductionEvidence({
      projection,
      vocabulary: vocabulary(),
      policy,
      routeTemplate: 'GET /v1/billing/groups/{id}',
      statusClass: '2XX',
    });
    const serialized = JSON.stringify(evidence);
    for (const sentinel of ALL_SENTINELS) {
      expect(serialized, `evidence must not contain ${sentinel}`).not.toContain(sentinel);
    }
  });

  test('source-proven key literals DO survive, so the test is not passing by emitting nothing', () => {
    const policy = createProductionPrivacyPolicy();
    const projection = projectProduction(RawEphemeralSource.of(hostilePayload()), vocabulary(), policy);
    const serialized = JSON.stringify(projection);
    // Non-triviality: the projection is genuinely structural, not empty.
    expect(serialized).toContain('"status"');
    expect(serialized).toContain('"accounts"');
    expect(serialized).toContain('"contacts"');
    expect(projection.root.type).toBe('OBJECT');
  });

  test('a dynamic key contributes cardinality and value structure, never a literal', () => {
    const policy = createProductionPrivacyPolicy();
    const projection = projectProduction(RawEphemeralSource.of(hostilePayload()), vocabulary(), policy);
    const root = projection.root;
    const accounts = (root.provenFields ?? []).find((field) => field.name === 'accounts');
    expect(accounts).toBeDefined();
    const node = accounts!.node;
    expect(node.type).toBe('OBJECT');
    // Two dynamic keys were dropped, and exactly two value structures kept.
    expect(node.dynamicFieldCount).toBe(2);
    expect(node.provenFieldCount).toBe(0);
    expect(node.dynamicFields).toHaveLength(2);
    expect(node.keyProvenance).toBe('BOUNDED_DYNAMIC_KEY_COLLECTION');
    // There is no field on the node that could hold a key literal.
    expect(Object.keys(node)).not.toContain('name');
  });

  test('with no vocabulary every key is dynamic and no key literal is emitted', () => {
    const policy = createProductionPrivacyPolicy();
    const projection = projectProduction(
      RawEphemeralSource.of(hostilePayload()),
      NO_PROVEN_VOCABULARY,
      policy,
    );
    const serialized = JSON.stringify(projection);
    for (const key of [...PROVEN_KEYS, ...ALL_SENTINELS]) {
      expect(serialized, `must not contain key literal ${key}`).not.toContain(`"${key}"`);
    }
    expect(projection.keyProvenance).toBe('BOUNDED_DYNAMIC_KEY_COLLECTION');
  });

  test('a key that merely LOOKS like a normal field name is not proven', () => {
    // The F-14 trap: `mspId` is syntactically an ordinary identifier, but its
    // VALUE-shaped siblings are not, and neither is proof. Only membership in
    // a source-proven set counts.
    const policy = createProductionPrivacyPolicy();
    const payload = { mspId: 'x', looksFine: 'y' };
    const projection = projectProduction(RawEphemeralSource.of(payload), NO_PROVEN_VOCABULARY, policy);
    expect(JSON.stringify(projection)).not.toContain('mspId');
    expect(JSON.stringify(projection)).not.toContain('looksFine');
  });

  test('REQUIRE_SOURCE_PROVEN makes an unproven key UNRESOLVED, and UNRESOLVED denies persistence', () => {
    const policy = createProductionPrivacyPolicy({ keyProvenanceRequirement: 'REQUIRE_SOURCE_PROVEN' });
    const projection = projectProduction(RawEphemeralSource.of(hostilePayload()), vocabulary(), policy);
    expect(projection.keyProvenance).toBe('UNRESOLVED');
    expect(foldKeyProvenance(projection.root)).toBe('UNRESOLVED');
    let thrown: unknown;
    try {
      toProductionEvidence({
        projection,
        vocabulary: vocabulary(),
        policy,
        routeTemplate: 'GET /v1/billing/groups/{id}',
        statusClass: '2XX',
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ProductionPrivacyError);
    expect((thrown as ProductionPrivacyError).reasonCode).toBe(
      'PRODUCTION_PRIVACY_KEY_PROVENANCE_UNRESOLVED',
    );
  });
});

test.describe('C-10 — the typed boundary', () => {
  test('a raw source yields its value exactly once', () => {
    const source = RawEphemeralSource.of({ a: 1 });
    const policy = createProductionPrivacyPolicy();
    projectProduction(source, NO_PROVEN_VOCABULARY, policy);
    expect(() => projectProduction(source, NO_PROVEN_VOCABULARY, policy)).toThrow(
      /PRODUCTION_PRIVACY_RAW_SOURCE_EXHAUSTED/,
    );
  });

  test('raw bytes cannot be serialized into a recorder or log payload', () => {
    const source = RawEphemeralSource.of({ secret: SENTINEL_INVOICE });
    expect(() => JSON.stringify(source)).toThrow(/PRODUCTION_PRIVACY_BOUNDARY_VIOLATION/);
  });

  test('the projection cone refuses a DEV policy', () => {
    expect(() =>
      projectProduction(RawEphemeralSource.of({}), NO_PROVEN_VOCABULARY, createDevPrivacyPolicy()),
    ).toThrow(/CONE_MISMATCH/);
  });

  test('evidence rejects anything that is not the safe projection boundary class', () => {
    const policy = createProductionPrivacyPolicy();
    const forged = {
      boundaryClass: 'SAFE_PRODUCTION_EVIDENCE',
      schemaVersion: 'nightwatch.production-projection.v1',
      keyProvenance: 'ALL_SOURCE_PROVEN',
      root: { type: 'NULL' },
    };
    expect(() =>
      toProductionEvidence({
        // deliberately mis-typed at the boundary the firewall exists to catch
        projection: forged as never,
        vocabulary: NO_PROVEN_VOCABULARY,
        policy,
        routeTemplate: 'GET /v1/x',
        statusClass: '2XX',
      }),
    ).toThrow(/BOUNDARY_CLASS/);
  });
});

test.describe('C-10 — fail-closed policy construction', () => {
  test('a production policy cannot be constructed with screenshots enabled', () => {
    expect(() =>
      createProductionPrivacyPolicy({ requestedCapabilities: { screenshots: 'ALLOWED_REDACTED' } }),
    ).toThrow(/SCREENSHOTS_PROHIBITED/);
  });

  test('a production policy cannot be constructed with a Playwright trace enabled', () => {
    expect(() =>
      createProductionPrivacyPolicy({ requestedCapabilities: { playwrightTrace: 'ALLOWED' } }),
    ).toThrow(/TRACE_PROHIBITED/);
  });

  test('a production policy cannot be constructed retaining page console text', () => {
    expect(() =>
      createProductionPrivacyPolicy({ requestedCapabilities: { pageConsoleText: 'ALLOWED_REDACTED' } }),
    ).toThrow(/CONSOLE_TEXT_PROHIBITED/);
  });

  test('a production policy cannot be pointed at the DEV findings store', () => {
    expect(() =>
      createProductionPrivacyPolicy({ requestedCapabilities: { storeIdentity: 'DEV_FINDINGS' } }),
    ).toThrow(/STORE_IDENTITY/);
  });

  test('the production policy is fixed, frozen and carries no durable value digest', () => {
    const policy = createProductionPrivacyPolicy();
    expect(policy.screenshots).toBe('PROHIBITED');
    expect(policy.playwrightTrace).toBe('PROHIBITED');
    expect(policy.pageConsoleText).toBe('PROHIBITED');
    expect(policy.responseBodyRetention).toBe('ZERO_BYTES');
    expect(policy.urlRetention).toBe('ROUTE_TEMPLATE_ONLY');
    expect(policy.durableValueDigest).toBe('ABSENT');
    expect(policy.storeIdentity).toBe('PRODUCTION_FINDINGS');
    expect(policy.browserProfile).toBe('EPHEMERAL_PRIVATE_NO_CACHE');
    expect(Object.isFrozen(policy)).toBe(true);
  });

  test('the DEV policy keeps existing DEV workflows intact', () => {
    // Campaign brief §18: production being stricter must not break DEV.
    const dev = createDevPrivacyPolicy();
    expect(dev.cone).toBe('DEV');
    expect(dev.screenshots).toBe('ALLOWED_REDACTED');
    expect(dev.storeIdentity).toBe('DEV_FINDINGS');
  });
});

test.describe('C-10 — proven key vocabulary is a contract, not a heuristic', () => {
  test('a vocabulary requires a well-formed source provenance digest', () => {
    expect(() =>
      createProvenKeyVocabulary({
        provenanceClass: 'SOURCE_PROVEN_PHP_ROW_KEYS',
        provenanceDigest: 'not-a-digest',
        keys: ['a'],
      }),
    ).toThrow(/VOCABULARY_PROVENANCE_DIGEST/);
  });

  test('an empty vocabulary is refused', () => {
    expect(() =>
      createProvenKeyVocabulary({
        provenanceClass: 'SOURCE_PROVEN_PHP_ROW_KEYS',
        provenanceDigest: 'ev:sha256:0123456789abcdef01234567',
        keys: [],
      }),
    ).toThrow(/VOCABULARY_EMPTY/);
  });

  test('a prototype-hostile key cannot be admitted to a vocabulary', () => {
    expect(() =>
      createProvenKeyVocabulary({
        provenanceClass: 'SOURCE_PROVEN_FIXED_CONTRACT',
        provenanceDigest: 'ev:sha256:0123456789abcdef01234567',
        keys: ['__proto__'],
      }),
    ).toThrow(/FORBIDDEN_FIELD_NAME/);
  });

  test('an unknown provenance class is refused — a label alone grants nothing', () => {
    expect(() =>
      createProvenKeyVocabulary({
        provenanceClass: 'ASSUMED_SAFE' as never,
        provenanceDigest: 'ev:sha256:0123456789abcdef01234567',
        keys: ['a'],
      }),
    ).toThrow(/PROVENANCE_AMBIGUOUS/);
  });
});

test.describe('C-10 F-16 — parameter values never enter Nightwatch state', () => {
  test('a handle is opaque and a route identity carries no value', () => {
    const handle = createOpaqueParameterHandle({
      handle: 'pph_0123456789abcdef0123456789abcdef',
      parameterName: 'id',
    });
    const identity = createSafeRouteIdentity({
      routeTemplate: 'GET /v1/billing/groups/{id}',
      handles: [handle],
    });
    const serialized = JSON.stringify(identity);
    for (const sentinel of ALL_SENTINELS) {
      expect(serialized).not.toContain(sentinel);
    }
    expect(serialized).toContain('{id}');
  });

  test('a concrete URL cannot be persisted, keyed or fingerprinted', () => {
    expect(() => assertRouteTemplateOnly(`GET /v1/costs?mspId=${SENTINEL_MSP_ID}`)).toThrow(
      /CONCRETE_URL_PARAMETER/,
    );
    expect(() => assertRouteTemplateOnly(`GET /v1/accounts/${SENTINEL_ACCOUNT_ID}`)).not.toThrow();
  });

  test('a raw value supplied where a handle is required is refused', () => {
    expect(() => assertHandleNotValue(SENTINEL_ACCOUNT_ID)).toThrow(
      /VALUE_SUPPLIED_WHERE_HANDLE_REQUIRED/,
    );
  });

  test('a handle that does not match a template placeholder is refused', () => {
    const handle = createOpaqueParameterHandle({
      handle: 'pph_0123456789abcdef0123456789abcdef',
      parameterName: 'mspId',
    });
    expect(() =>
      createSafeRouteIdentity({ routeTemplate: 'GET /v1/billing/groups/{id}', handles: [handle] }),
    ).toThrow(/HANDLE_UNKNOWN/);
  });
});

test.describe('C-10 — bounds are enforced, not raised to fit', () => {
  test('depth overflow fails closed with a categorical code', () => {
    let deep: unknown = 'leaf';
    for (let index = 0; index <= DEFAULT_PRODUCTION_PROJECTION_LIMITS.maxDepth + 2; index += 1) {
      deep = { nested: deep };
    }
    expect(() =>
      projectProduction(RawEphemeralSource.of(deep), NO_PROVEN_VOCABULARY, createProductionPrivacyPolicy()),
    ).toThrow(/PRODUCTION_PRIVACY_LIMIT_EXCEEDED:DEPTH_CAP/);
  });

  test('an object with too many fields fails closed', () => {
    const wide: Record<string, unknown> = {};
    for (let index = 0; index <= DEFAULT_PRODUCTION_PROJECTION_LIMITS.maxFieldsPerObject; index += 1) {
      wide[`k${index}`] = index;
    }
    expect(() =>
      projectProduction(RawEphemeralSource.of(wide), NO_PROVEN_VOCABULARY, createProductionPrivacyPolicy()),
    ).toThrow(/OBJECT_FIELD_CAP/);
  });

  test('a prototype-hostile key fails closed rather than being projected', () => {
    const hostile = JSON.parse('{"__proto__": {"polluted": true}}') as unknown;
    expect(() =>
      projectProduction(RawEphemeralSource.of(hostile), NO_PROVEN_VOCABULARY, createProductionPrivacyPolicy()),
    ).toThrow(/FORBIDDEN_FIELD_NAME/);
  });

  test('a cycle fails closed rather than recursing', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() =>
      projectProduction(RawEphemeralSource.of(cyclic), NO_PROVEN_VOCABULARY, createProductionPrivacyPolicy()),
    ).toThrow(/CYCLIC_OBJECT/);
  });

  test('a non-JSON scalar fails closed', () => {
    expect(() =>
      projectProduction(
        RawEphemeralSource.of({ big: BigInt(1) }),
        NO_PROVEN_VOCABULARY,
        createProductionPrivacyPolicy(),
      ),
    ).toThrow(/NON_JSON_SCALAR/);
  });

  test('a throwing getter fails categorically and never propagates its own error', () => {
    const hostile = {
      get boom(): unknown {
        throw new Error(SENTINEL_INVOICE);
      },
    };
    let thrown: unknown;
    try {
      projectProduction(
        RawEphemeralSource.of(hostile),
        NO_PROVEN_VOCABULARY,
        createProductionPrivacyPolicy(),
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ProductionPrivacyError);
    expect((thrown as Error).message).not.toContain(SENTINEL_INVOICE);
    expect((thrown as Error).message).toBe('PRODUCTION_PRIVACY_UNSUPPORTED_INPUT:GETTER_THREW');
  });
});
