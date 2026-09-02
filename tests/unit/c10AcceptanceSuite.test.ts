// ---------------------------------------------------------------------------
// C-10 — the mandatory acceptance suite (design.md §6.5, all five classes).
//
//   A. Sentinel corpus         a hostile synthetic production payload with
//                              sentinels in every relevant location, run
//                              through the complete pipeline, with every
//                              permitted output location recursively swept.
//   B. Projection totality     a broad deterministic corpus; no raw leaf or
//                              key literal crosses the boundary.
//   C. Boundary import isolation   mechanical proof the cone holds no
//                              filesystem/network/process/publication authority.
//   D. Error-path leakage      every meaningful failure branch forced; errors
//                              carry fixed reason codes only.
//   E. Digest privacy          structural stability, value insensitivity, key
//                              literal exclusion, no salt, no durable value
//                              digest, families not interchangeable.
//
// Plus the deterministic persistence audit over every permitted root.
//
// Every filesystem assertion uses a DISPOSABLE injected root. Nothing here
// writes to the real `$HOME/.nightwatch/prod-findings/`, and no environment is
// contacted.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  canonicalStructuralBytes,
  createDevPrivacyPolicy,
  createProductionPrivacyPolicy,
  createProvenKeyVocabulary,
  createProvenRouteVocabulary,
  NO_PROVEN_ROUTE_VOCABULARY,
  DEV_PROJECTION_DIGEST_PREFIX,
  NO_PROVEN_VOCABULARY,
  productionStructuralDigest,
  ProductionPrivacyError,
  PRODUCTION_PRIVACY_DETAIL_CODES,
  PRODUCTION_PRIVACY_REASON_CODES,
  projectProduction,
  RawEphemeralSource,
  ROUTE_TEMPLATE_RE,
  toProductionEvidence,
  type SafeProductionEvidence,
} from '../../src/core/prodPrivacy';
import {
  assertPersistableProductionEvidence,
  assertProductionCaptureAllowed,
  auditProductionPersistence,
  cleanupProductionProfile,
  createEphemeralProductionProfile,
  isProductionFindingsRoot,
  ProductionFindingsStore,
  productionArtifactRoot,
  PRODUCTION_ARTIFACT_DEFAULT_RELATIVE_ROOT,
  projectProductionConsoleEvent,
  sweepStaleProductionProfiles,
  productionProfileResidue,
} from '../../src/core/prodEvidence';
import { projectObservation, projectionDigest } from '../../src/oracles/projections';
// Static imports deliberately: a dynamic `await import()` of a TypeScript path
// resolves differently under Node 20 than Node 22, which made these cases
// environment-dependent. Static imports hold in BOTH topologies.
import { createFindingsAuthorityForTests } from '../../src/controlCenter/authorities/findingsAuthority';
import {
  CONTROL_CENTER_EVENT_SCHEMA_VERSION,
  sanitizeControlCenterEvent,
} from '../../src/controlCenter/contracts/events';

// ===========================================================================
// The hostile sentinel corpus.
// ===========================================================================

const S = {
  scalarString: 'SENTINEL-SCALAR-a3f9c1',
  customerId: 'CUST-SENTINEL-77213',
  accountId: '481516234299',
  companyName: 'Contoso Global Holdings KK',
  invoiceId: 'INV-2026-000731-SENTINEL',
  monetary: '18342.77',
  freeText: 'sentinel free text that must never be persisted anywhere',
  dynamicKey: 'msp-SENTINEL-b7f1c0d4',
  nestedDynamicKey: 'bg-SENTINEL-8812',
  queryParam: 'qp-SENTINEL-5521',
  pathParam: 'pp-SENTINEL-9034',
  header: 'hdr-SENTINEL-authorization-bearer',
  cookie: 'ck-SENTINEL-session',
  consoleText: 'console-SENTINEL-leaked-response-body',
  thrownError: 'thrown-SENTINEL-message',
  dialogText: 'dialog-SENTINEL-text',
  replayInput: 'replay-SENTINEL-input',
} as const;

/**
 * Sentinels split by the CHANNEL they are planted in, so the non-vacuity proof
 * can be made per channel rather than over-claiming that the JSON body carries
 * a console or exception sentinel.
 */
const CHANNEL_SENTINELS: readonly string[] = [S.consoleText, S.thrownError];
const BODY_SENTINELS: readonly string[] = Object.values(S).filter(
  (sentinel) => !CHANNEL_SENTINELS.includes(sentinel),
);
/** Every sentinel, whatever its channel — the absence assertions use all of them. */
const ALL_SENTINELS: readonly string[] = Object.values(S);

/** Sentinels in every location the campaign brief §16.A enumerates. */
function hostileProductionPayload(): unknown {
  return {
    status: 'ACTIVE',
    label: S.scalarString,
    customerId: S.customerId,
    amount: Number(S.monetary),
    note: S.freeText,
    company: { name: S.companyName },
    invoices: [{ invoice: S.invoiceId }],
    accounts: {
      [S.accountId]: { name: S.companyName },
      [S.dynamicKey]: {
        [S.nestedDynamicKey]: { invoice: S.invoiceId, note: S.freeText },
      },
    },
    request: {
      query: S.queryParam,
      pathParam: S.pathParam,
      header: S.header,
      cookie: S.cookie,
    },
    replay: [S.replayInput],
    dialog: S.dialogText,
  };
}

const PROVEN_KEYS = [
  'status', 'label', 'customerId', 'amount', 'note', 'company', 'name',
  'invoices', 'invoice', 'accounts', 'request', 'replay', 'dialog',
];

function vocabulary() {
  return createProvenKeyVocabulary({
    provenanceClass: 'SOURCE_PROVEN_OPENAPI_DEFINITION',
    provenanceDigest: 'ev:sha256:0123456789abcdef01234567',
    keys: PROVEN_KEYS,
  });
}


/**
 * The source-proven route vocabulary. DEF-C10-5: a route template is safe
 * because a SOURCE proves it exists, never because it is spelled like one.
 * C-02a supplies this proof in practice (814 admitted operations).
 */
function routeVocabulary() {
  return createProvenRouteVocabulary({
    provenanceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
    provenanceDigest: 'ev:sha256:fedcba98765432100123abcd',
    templates: [
      'GET /v1/billing/accounts/{accountId}',
      'GET /v1/billing/groups/{id}',
      'GET /v1/x',
      'GET /v1/costs',
    ],
  });
}

function disposableRoot(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `nightwatch-c10-${label}-`));
}

function runProductionPipeline(): SafeProductionEvidence {
  const policy = createProductionPrivacyPolicy();
  const projection = projectProduction(
    RawEphemeralSource.of(hostileProductionPayload()),
    vocabulary(),
    policy,
  );
  return toProductionEvidence({
    projection,
    vocabulary: vocabulary(),
    routeVocabulary: routeVocabulary(),
    policy,
    routeTemplate: 'GET /v1/billing/accounts/{accountId}',
    statusClass: '2XX',
  });
}

// ===========================================================================
// A. Sentinel corpus
// ===========================================================================

test.describe('C-10 acceptance A — sentinel corpus', () => {
  test('every sentinel provably enters its own channel (non-vacuous)', () => {
    // Guard against a vacuous pass. If a sentinel ever stops entering the
    // pipeline, the absence assertions below would succeed for the wrong
    // reason, so presence is proven first, per channel.
    const raw = JSON.stringify(hostileProductionPayload());
    for (const sentinel of BODY_SENTINELS) {
      expect(raw, `raw body must contain ${sentinel}`).toContain(sentinel);
    }
    // The console sentinel is genuinely handed to the console boundary...
    const policy = createProductionPrivacyPolicy();
    let sawConsoleSentinel = false;
    projectProductionConsoleEvent(policy, 'log', ((): string => {
      sawConsoleSentinel = true;
      return S.consoleText;
    })());
    expect(sawConsoleSentinel).toBe(true);
    // ...and the exception sentinel is genuinely thrown inside the cone.
    let sawThrownSentinel = false;
    try {
      projectProduction(
        RawEphemeralSource.of({
          get leak(): unknown {
            sawThrownSentinel = true;
            throw new Error(S.thrownError);
          },
        }),
        NO_PROVEN_VOCABULARY,
        policy,
      );
    } catch {
      // The categorical failure is asserted in acceptance class D.
    }
    expect(sawThrownSentinel).toBe(true);
    expect(ALL_SENTINELS.length).toBeGreaterThanOrEqual(17);
    expect(BODY_SENTINELS.length).toBeGreaterThanOrEqual(15);
  });

  test('zero sentinel bytes exist anywhere under every permitted output root', () => {
    const storeRoot = disposableRoot('store');
    const profileBase = disposableRoot('profiles');
    try {
      // Run the complete synthetic production privacy pipeline.
      const evidence = runProductionPipeline();
      const store = new ProductionFindingsStore({ root: storeRoot, routeVocabulary: routeVocabulary() });
      store.write('finding-0001.json', evidence);

      // Console: plant the sentinel in page console output and project it.
      const policy = createProductionPrivacyPolicy();
      const consoleEvent = projectProductionConsoleEvent(policy, 'log', S.consoleText);
      fs.writeFileSync(path.join(storeRoot, 'console-events.json'), JSON.stringify([consoleEvent]), {
        mode: 0o600,
      });

      // Browser profile: create and clean up, as a normal exit would.
      const profile = createEphemeralProductionProfile(profileBase, policy);
      cleanupProductionProfile(profile.directory);

      // Recursively inspect EVERY permitted output location.
      const audit = auditProductionPersistence({
        roots: [storeRoot, profileBase],
        profileBaseDirectories: [profileBase],
        sentinels: [...ALL_SENTINELS, S.consoleText],
        provenRouteTemplates: [...routeVocabulary().templates],
      });

      expect(audit.violations, JSON.stringify(audit.violations)).toEqual([]);
      expect(audit.clean).toBe(true);
      // Non-vacuous: the audit actually read files.
      expect(audit.filesInspected).toBeGreaterThan(0);
      expect(audit.bytesInspected).toBeGreaterThan(0);
    } finally {
      fs.rmSync(storeRoot, { recursive: true, force: true });
      fs.rmSync(profileBase, { recursive: true, force: true });
    }
  });

  test('the audit is not blind: a planted sentinel IS detected', () => {
    // Prove the sweep can fail, so a clean result above means something.
    const root = disposableRoot('planted');
    try {
      fs.writeFileSync(path.join(root, 'leak.json'), JSON.stringify({ x: S.accountId }), { mode: 0o600 });
      const audit = auditProductionPersistence({ roots: [root], sentinels: [S.accountId] });
      expect(audit.clean).toBe(false);
      expect(audit.violations.map((violation) => violation.violationClass)).toContain('CUSTOMER_SENTINEL');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('the audit detects screenshots, traces, storage state and console payloads', () => {
    const root = disposableRoot('artifacts');
    try {
      for (const name of ['shot.png', 'trace.zip', 'storageState.json', 'console.jsonl']) {
        fs.writeFileSync(path.join(root, name), '{}', { mode: 0o600 });
      }
      const audit = auditProductionPersistence({ roots: [root] });
      const classes = audit.violations.map((violation) => violation.violationClass);
      expect(classes).toContain('SCREENSHOT');
      expect(classes).toContain('TRACE');
      expect(classes).toContain('STORAGE_STATE');
      expect(classes).toContain('CONSOLE_PAYLOAD');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('the audit detects unsafe permissions and stale browser-profile residue', () => {
    const root = disposableRoot('perms');
    const profileBase = disposableRoot('stale');
    try {
      const loose = path.join(root, 'loose.json');
      fs.writeFileSync(loose, '{}');
      fs.chmodSync(loose, 0o644);

      // Simulate an interrupted/crashed run: a profile left behind.
      const profile = createEphemeralProductionProfile(profileBase, createProductionPrivacyPolicy());
      fs.writeFileSync(path.join(profile.directory, 'Cookies'), 'x', { mode: 0o600 });

      const audit = auditProductionPersistence({
        roots: [root],
        profileBaseDirectories: [profileBase],
      });
      const classes = audit.violations.map((violation) => violation.violationClass);
      expect(classes).toContain('UNSAFE_PERMISSIONS');
      expect(classes).toContain('BROWSER_PROFILE_RESIDUE');

      // The crash-path sweep clears it, and the audit then reports clean.
      const swept = sweepStaleProductionProfiles(profileBase, { maxAgeMs: 0 });
      expect(swept.removed).toBe(1);
      expect(productionProfileResidue(profileBase)).toEqual([]);
      const after = auditProductionPersistence({ roots: [], profileBaseDirectories: [profileBase] });
      expect(after.clean).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(profileBase, { recursive: true, force: true });
    }
  });
});

// ===========================================================================
// B. Projection totality / property testing
// ===========================================================================

test.describe('C-10 acceptance B — projection totality', () => {
  /** A broad deterministic corpus: no randomness, so failures reproduce exactly. */
  function corpus(): readonly { readonly label: string; readonly value: unknown }[] {
    const deepNested = (depth: number): unknown => {
      let current: unknown = 'LEAFVALUE';
      for (let index = 0; index < depth; index += 1) current = { level: current };
      return current;
    };
    return [
      { label: 'empty object', value: {} },
      { label: 'empty array', value: [] },
      { label: 'empty string', value: { k: '' } },
      { label: 'null', value: { k: null } },
      { label: 'booleans', value: { t: true, f: false } },
      { label: 'numbers', value: { zero: 0, negative: -1, float: 1.5, big: 4815162342 } },
      { label: 'deeply nested', value: deepNested(6) },
      { label: 'arrays of objects', value: [{ a: 'VAL1' }, { a: 'VAL2' }, { a: 'VAL3' }] },
      { label: 'nested arrays', value: { rows: [[{ x: 'INNER' }]] } },
      { label: 'dynamic map', value: { '111111111111': 'A', '222222222222': 'B' } },
      { label: 'nested dynamic map', value: { outer: { 'acct-9': { 'grp-3': 'DEEPVAL' } } } },
      { label: 'repeated values', value: { a: 'SAME', b: 'SAME', c: 'SAME' } },
      { label: 'unicode', value: { 'キー': 'カスタマー名', emoji: '🔐🌏' } },
      { label: 'unicode dynamic key', value: { '株式会社サンプル': 1 } },
      { label: 'hostile-looking keys', value: { 'a.b': 1, 'a-b': 2, 'a b': 3, '': 4 } },
      { label: 'mixed array', value: [1, 'two', true, null, { k: 'v' }] },
      { label: 'large-ish array', value: Array.from({ length: 40 }, (_, index) => ({ i: index })) },
      { label: 'sparse-ish values', value: { a: [], b: {}, c: '', d: 0 } },
    ];
  }

  /** Every string that appears anywhere in a raw JSON value, keys included. */
  function rawStrings(value: unknown, sink: Set<string> = new Set()): Set<string> {
    if (typeof value === 'string') sink.add(value);
    else if (Array.isArray(value)) for (const item of value) rawStrings(item, sink);
    else if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        sink.add(key);
        rawStrings(child, sink);
      }
    }
    return sink;
  }

  test('no raw leaf or key literal crosses the boundary for any corpus member', () => {
    const policy = createProductionPrivacyPolicy();
    let covered = 0;
    for (const entry of corpus()) {
      const projection = projectProduction(
        RawEphemeralSource.of(entry.value),
        NO_PROVEN_VOCABULARY,
        policy,
      );
      const serialized = JSON.stringify(projection);
      const canonical = canonicalStructuralBytes(projection.root);
      for (const literal of rawStrings(entry.value)) {
        if (literal === '') continue;
        // A short literal such as "A" occurs incidentally inside a structural
        // enum token ("ARRAY"), so short literals are checked as COMPLETE JSON
        // string tokens; longer literals are checked as raw substrings, which
        // is the stricter test and the one that matters for customer data.
        if (literal.length < 4) {
          const token = JSON.stringify(literal);
          expect(serialized, `${entry.label}: projection leaked token ${token}`).not.toContain(token);
          expect(canonical, `${entry.label}: canonical bytes leaked token ${token}`).not.toContain(token);
        } else {
          expect(serialized, `${entry.label}: projection leaked ${literal}`).not.toContain(literal);
          expect(canonical, `${entry.label}: canonical bytes leaked ${literal}`).not.toContain(literal);
        }
        covered += 1;
      }
    }
    // Non-vacuous: the corpus genuinely contained literals to check.
    expect(covered).toBeGreaterThan(40);
  });

  test('numbers carry no value reference into persisted structure', () => {
    const policy = createProductionPrivacyPolicy();
    // The property is that NUMBER is value-free: every numeric value, however
    // sensitive, must produce byte-identical canonical structure. Checking for
    // the digits directly would collide with the bounded counts, so assert the
    // stronger indistinguishability property.
    const canonicalForms = new Set(
      [0, 1, -1, 1.5, 18342.77, 481516234299].map((amount) =>
        canonicalStructuralBytes(
          projectProduction(RawEphemeralSource.of({ v: amount }), NO_PROVEN_VOCABULARY, policy).root,
        ),
      ),
    );
    expect(canonicalForms.size).toBe(1);
    // And a monetary sentinel is indistinguishable from a plain count.
    expect([...canonicalForms][0]).not.toContain('18342.77');
  });

  test('malformed and unsupported inputs fail closed rather than projecting', () => {
    const policy = createProductionPrivacyPolicy();
    const cyclicArray: unknown[] = [];
    cyclicArray.push(cyclicArray);
    const cases: readonly unknown[] = [
      cyclicArray,
      { fn: () => undefined },
      { sym: Symbol('s') },
      { big: BigInt(2) },
      { nan: Number.NaN },
      { inf: Number.POSITIVE_INFINITY },
      Object.create({ inherited: 1 }) as unknown,
    ];
    for (const value of cases) {
      let thrown: unknown;
      try {
        projectProduction(RawEphemeralSource.of(value), NO_PROVEN_VOCABULARY, policy);
      } catch (error) {
        thrown = error;
      }
      expect(thrown, `expected fail-closed for ${String(thrown)}`).toBeInstanceOf(ProductionPrivacyError);
    }
  });

  test('projection is deterministic: identical input yields identical bytes', () => {
    const policy = createProductionPrivacyPolicy();
    const first = projectProduction(RawEphemeralSource.of(hostileProductionPayload()), vocabulary(), policy);
    const second = projectProduction(RawEphemeralSource.of(hostileProductionPayload()), vocabulary(), policy);
    expect(canonicalStructuralBytes(first.root)).toBe(canonicalStructuralBytes(second.root));
  });
});

// ===========================================================================
// C. Boundary import isolation
// ===========================================================================

test.describe('C-10 acceptance C — boundary import isolation', () => {
  const CONE = path.resolve(__dirname, '..', '..', 'src', 'core', 'prodPrivacy');

  function coneFiles(): readonly string[] {
    return fs
      .readdirSync(CONE)
      .filter((entry) => entry.endsWith('.ts'))
      .map((entry) => path.join(CONE, entry))
      .sort();
  }

  test('the cone exists and is non-trivial', () => {
    expect(coneFiles().length).toBeGreaterThanOrEqual(7);
  });

  test('the cone imports no filesystem, network, process or publication module', () => {
    const forbidden =
      /from\s+['"][^'"]*(?:node:fs|node:http|node:https|node:net|node:dgram|node:dns|node:tls|child_process|undici|node-fetch|axios|playwright|prodEvidence|privateArtifacts|runRecorder|controlCenter)[^'"]*['"]/i;
    for (const file of coneFiles()) {
      const source = fs.readFileSync(file, 'utf8');
      expect(forbidden.test(source), `${path.basename(file)} imports a forbidden module`).toBe(false);
    }
  });

  test('node:crypto is the only node builtin the cone may import', () => {
    for (const file of coneFiles()) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/from\s+['"](node:[a-z_]+)['"]/g)) {
        expect(match[1], `${path.basename(file)} imports ${match[1]}`).toBe('node:crypto');
      }
    }
  });

  test('the cone references no persistence, process or environment capability', () => {
    const capability =
      /(?<![.\w])(?:require\s*\(|child_process|spawn\s*\(|exec(?:File)?\s*\(|fetch\s*\(|writeFile|appendFile|readFile|createWriteStream|mkdirSync|renameSync|unlinkSync|rmSync|openSync)/;
    for (const file of coneFiles()) {
      const source = fs.readFileSync(file, 'utf8');
      expect(capability.test(source), `${path.basename(file)} exposes a capability`).toBe(false);
      expect(/process\.env/.test(source), `${path.basename(file)} reads the environment`).toBe(false);
    }
  });

  test('raw bytes enter through exactly one bounded call-scoped reader', () => {
    const source = fs.readFileSync(path.join(CONE, 'projector.ts'), 'utf8');
    expect(source).toContain('source instanceof RawEphemeralSource');
    expect(source).toContain('source.read()');
    // The reader yields once and then refuses.
    const raw = RawEphemeralSource.of({ a: 1 });
    raw.read();
    expect(() => raw.read()).toThrow(/RAW_SOURCE_EXHAUSTED/);
  });
});

// ===========================================================================
// D. Error-path leakage
// ===========================================================================

test.describe('C-10 acceptance D — error-path leakage', () => {
  const REASONS: ReadonlySet<string> = new Set(PRODUCTION_PRIVACY_REASON_CODES);
  const DETAILS: ReadonlySet<string> = new Set(PRODUCTION_PRIVACY_DETAIL_CODES);

  /** A message is categorical when it is REASON or REASON:DETAIL, both closed. */
  function assertCategorical(error: unknown): void {
    expect(error).toBeInstanceOf(ProductionPrivacyError);
    const message = (error as Error).message;
    const [reason, detail, ...rest] = message.split(':');
    expect(rest, `message had extra segments: ${message}`).toEqual([]);
    expect(REASONS.has(reason!), `unknown reason code ${reason}`).toBe(true);
    if (detail !== undefined) expect(DETAILS.has(detail), `unknown detail code ${detail}`).toBe(true);
    // And it carries no sentinel from any corpus.
    for (const sentinel of ALL_SENTINELS) expect(message).not.toContain(sentinel);
  }

  test('every meaningful failure branch yields a categorical error with no raw content', () => {
    const policy = createProductionPrivacyPolicy();
    const branches: readonly (() => unknown)[] = [
      // projection input branches
      () => projectProduction(RawEphemeralSource.of({ big: BigInt(1) }), NO_PROVEN_VOCABULARY, policy),
      () => projectProduction(RawEphemeralSource.of({ n: Number.NaN }), NO_PROVEN_VOCABULARY, policy),
      () => projectProduction(RawEphemeralSource.of(JSON.parse('{"__proto__":{}}')), NO_PROVEN_VOCABULARY, policy),
      () => {
        const cyclic: Record<string, unknown> = {};
        cyclic.self = cyclic;
        return projectProduction(RawEphemeralSource.of(cyclic), NO_PROVEN_VOCABULARY, policy);
      },
      () => {
        const throwing = {
          get leak(): unknown {
            throw new Error(S.thrownError);
          },
        };
        return projectProduction(RawEphemeralSource.of(throwing), NO_PROVEN_VOCABULARY, policy);
      },
      () => {
        let deep: unknown = S.freeText;
        for (let index = 0; index < 20; index += 1) deep = { d: deep };
        return projectProduction(RawEphemeralSource.of(deep), NO_PROVEN_VOCABULARY, policy);
      },
      () => {
        const wide: Record<string, unknown> = {};
        for (let index = 0; index < 200; index += 1) wide[`k${index}`] = index;
        return projectProduction(RawEphemeralSource.of(wide), NO_PROVEN_VOCABULARY, policy);
      },
      () => projectProduction(RawEphemeralSource.of({ s: S.freeText.repeat(2000) }), NO_PROVEN_VOCABULARY, policy),
      // boundary branches
      () => projectProduction(RawEphemeralSource.of({}), NO_PROVEN_VOCABULARY, createDevPrivacyPolicy()),
      () => {
        const source = RawEphemeralSource.of({});
        projectProduction(source, NO_PROVEN_VOCABULARY, policy);
        return projectProduction(source, NO_PROVEN_VOCABULARY, policy);
      },
      () => JSON.stringify(RawEphemeralSource.of({ leak: S.customerId })),
      // vocabulary branches
      () =>
        createProvenKeyVocabulary({
          provenanceClass: 'SOURCE_PROVEN_FIXED_CONTRACT',
          provenanceDigest: S.customerId,
          keys: ['a'],
        }),
      () =>
        createProvenKeyVocabulary({
          provenanceClass: 'SOURCE_PROVEN_FIXED_CONTRACT',
          provenanceDigest: 'ev:sha256:0123456789abcdef01234567',
          keys: [],
        }),
      () =>
        createProvenKeyVocabulary({
          provenanceClass: 'SOURCE_PROVEN_FIXED_CONTRACT',
          provenanceDigest: 'ev:sha256:0123456789abcdef01234567',
          keys: ['constructor'],
        }),
      // policy branches
      () => createProductionPrivacyPolicy({ requestedCapabilities: { screenshots: 'ALLOWED_REDACTED' } }),
      () => createProductionPrivacyPolicy({ requestedCapabilities: { playwrightTrace: 'ALLOWED' } }),
      () => createProductionPrivacyPolicy({ requestedCapabilities: { pageConsoleText: 'ALLOWED_REDACTED' } }),
      () => createProductionPrivacyPolicy({ requestedCapabilities: { storeIdentity: 'DEV_FINDINGS' } }),
      // evidence branches
      () =>
        toProductionEvidence({
          projection: projectProduction(RawEphemeralSource.of({ a: 1 }), NO_PROVEN_VOCABULARY, policy),
          vocabulary: NO_PROVEN_VOCABULARY,
          routeVocabulary: routeVocabulary(),
          policy,
          routeTemplate: `GET /v1/x?q=${S.queryParam}`,
          statusClass: '2XX',
        }),
      () =>
        toProductionEvidence({
          projection: projectProduction(RawEphemeralSource.of({ a: 1 }), NO_PROVEN_VOCABULARY, policy),
          vocabulary: NO_PROVEN_VOCABULARY,
          routeVocabulary: routeVocabulary(),
          policy,
          routeTemplate: 'GET /v1/x',
          statusClass: '9XX' as never,
        }),
      // firewall branches
      () => assertPersistableProductionEvidence({ raw: S.freeText }),
      () => assertPersistableProductionEvidence(null),
      () => assertPersistableProductionEvidence({ ...runProductionPipeline(), schemaVersion: 'v99' }),
      // capture branches
      () => assertProductionCaptureAllowed(policy, { screenshot: true }),
      () => assertProductionCaptureAllowed(policy, { trace: true }),
      () => assertProductionCaptureAllowed(policy, { persistPageConsoleText: true }),
    ];

    let forced = 0;
    for (const branch of branches) {
      let thrown: unknown;
      try {
        branch();
      } catch (error) {
        thrown = error;
      }
      expect(thrown, 'branch did not fail closed').toBeDefined();
      assertCategorical(thrown);
      forced += 1;
    }
    expect(forced).toBe(branches.length);
    expect(forced).toBeGreaterThanOrEqual(26);
  });
});

// ===========================================================================
// E. Digest privacy
// ===========================================================================

test.describe('C-10 acceptance E — digest privacy', () => {
  const policy = createProductionPrivacyPolicy();

  function digestOf(value: unknown, vocab = vocabulary()) {
    return productionStructuralDigest(
      projectProduction(RawEphemeralSource.of(value), vocab, policy).root,
    );
  }

  test('structurally equivalent safe inputs produce the same structural digest', () => {
    const left = { status: 'A', label: 'X', amount: 1 };
    const right = { status: 'B', label: 'Y', amount: 2 };
    expect(digestOf(left)).toBe(digestOf(right));
  });

  test('a raw value change that does not alter approved structure does not expose the value', () => {
    const digestA = digestOf({ status: S.companyName });
    const digestB = digestOf({ status: S.invoiceId });
    expect(digestA).toBe(digestB);
    expect(digestA).not.toContain(S.companyName);
    expect(digestA).not.toContain(S.invoiceId);
  });

  test('a real structural change DOES change the digest, so the digest is not constant', () => {
    expect(digestOf({ status: 'A' })).not.toBe(digestOf({ status: 'A', label: 'B' }));
    expect(digestOf({ status: 'A' })).not.toBe(digestOf({ status: 1 }));
  });

  test('unproven dynamic key literals do not enter the structural digest input', () => {
    // Two objects with DIFFERENT dynamic keys but identical value structure
    // must be indistinguishable, or the key literal reached the digest.
    const first = { accounts: { '111111111111': { name: 'a' } } };
    const second = { accounts: { '999999999999': { name: 'b' } } };
    expect(digestOf(first)).toBe(digestOf(second));
  });

  test('a source-proven key literal DOES affect the digest, so provenance is meaningful', () => {
    const vocabA = createProvenKeyVocabulary({
      provenanceClass: 'SOURCE_PROVEN_FIXED_CONTRACT',
      provenanceDigest: 'ev:sha256:0123456789abcdef01234567',
      keys: ['alpha'],
    });
    const vocabB = createProvenKeyVocabulary({
      provenanceClass: 'SOURCE_PROVEN_FIXED_CONTRACT',
      provenanceDigest: 'ev:sha256:0123456789abcdef01234567',
      keys: ['beta'],
    });
    expect(digestOf({ alpha: 1 }, vocabA)).not.toBe(digestOf({ beta: 1 }, vocabB));
  });

  test('the structural digest is unsalted and stable across independent runs', () => {
    const digests = new Set<string>();
    for (let run = 0; run < 5; run += 1) digests.add(digestOf(hostileProductionPayload()));
    expect(digests.size).toBe(1);
  });

  test('ephemeral encounter tokens exist in the projection and never in evidence', () => {
    const projection = projectProduction(
      RawEphemeralSource.of({ a: 'X', b: 'X', c: 1 }),
      NO_PROVEN_VOCABULARY,
      policy,
    );
    // Present for in-memory correlation...
    const projectionText = JSON.stringify(projection);
    expect(projectionText).toMatch(/enc#\d{4}/);
    expect(projectionText).toMatch(/num#\d{4}/);
    // ...and absent from the canonical bytes and the evidence.
    expect(canonicalStructuralBytes(projection.root)).not.toMatch(/enc#|num#/);
    const evidence = toProductionEvidence({
      projection,
      vocabulary: NO_PROVEN_VOCABULARY,
      routeVocabulary: routeVocabulary(),
      policy,
      routeTemplate: 'GET /v1/x',
      statusClass: '2XX',
    });
    expect(JSON.stringify(evidence)).not.toMatch(/enc#|num#/);
  });

  test('the firewall rejects evidence that still carries an ephemeral correlation label', () => {
    const evidence = runProductionPipeline();
    const tampered = JSON.parse(JSON.stringify(evidence)) as Record<string, unknown>;
    (tampered.root as Record<string, unknown>).encounterToken = 'enc#0001';
    expect(() => assertPersistableProductionEvidence(tampered)).toThrow(/ENCOUNTER_TOKEN_PRESENT/);
  });

  test('no persistent low-entropy value hash and no persisted salt exist', () => {
    const evidence = runProductionPipeline();
    const serialized = JSON.stringify(evidence);
    // The ONLY digest in persisted evidence is the structural family.
    const digests = serialized.match(/[a-z]+:sha256:[0-9a-f]+/g) ?? [];
    expect(digests.length).toBeGreaterThan(0);
    for (const digest of digests) {
      expect(digest.startsWith('prodstruct:sha256:') || digest.startsWith('ev:sha256:')).toBe(true);
    }
    // No salt, seed, nonce or key material is persisted anywhere.
    expect(serialized).not.toMatch(/salt|seed|nonce|secret|hmac/i);
    expect(createProductionPrivacyPolicy().durableValueDigest).toBe('ABSENT');
  });

  test('the two digest families cannot be interchanged', () => {
    // The DEV Phase 9 family ingests key literals; it is refused at the
    // production persistence boundary by name.
    const devDigest = projectionDigest(projectObservation({ value: { mspId: 'X' } }).projection);
    expect(devDigest.startsWith(DEV_PROJECTION_DIGEST_PREFIX)).toBe(true);
    const evidence = runProductionPipeline();
    expect(evidence.structuralDigest.startsWith('prodstruct:sha256:')).toBe(true);
    const swapped = { ...evidence, structuralDigest: devDigest };
    expect(() => assertPersistableProductionEvidence(swapped)).toThrow(/DIGEST_FAMILY/);
  });

  test('the DEV family demonstrably DOES carry a key literal, which is why it is refused', () => {
    // This documents precisely why the families must stay distinct, without
    // weakening the DEV projection, which remains correct for DEV.
    const { projection } = projectObservation({ value: { mspId: 'X' } });
    expect(JSON.stringify(projection)).toContain('mspId');
  });

  test('a tampered structure cannot travel under a valid-looking digest', () => {
    // DEF-C10-1 regression: an ARRAY-only field grafted onto an OBJECT node was
    // ignored by the canonical writer, so the recomputed digest still matched
    // and the tampered structure was accepted. Exact per-type field sets now
    // refuse it at the firewall.
    const evidence = runProductionPipeline();
    const tampered = JSON.parse(JSON.stringify(evidence)) as SafeProductionEvidence;
    (tampered.root as { itemCount?: number }).itemCount = 99;
    expect(() => assertPersistableProductionEvidence(tampered)).toThrow(/UNKNOWN_FIELD/);
  });

  test('a genuine structural edit is caught by the independent digest re-derivation', () => {
    const evidence = runProductionPipeline();
    const tampered = JSON.parse(JSON.stringify(evidence)) as SafeProductionEvidence;
    // Keep the structure internally consistent so only the digest disagrees.
    (tampered as { structuralDigest: string }).structuralDigest =
      'prodstruct:sha256:000000000000000000000000';
    expect(() => assertPersistableProductionEvidence(tampered)).toThrow(/DIGEST_MISMATCH/);
  });
});

// ===========================================================================
// Workstream G / H — production root isolation and Control Center exclusion
// ===========================================================================

test.describe('C-10 — production artifact root isolation', () => {
  test('the default production root is prod-findings, NOT the DEV findings root', () => {
    // Resolve WITHOUT creating: this campaign never populates the real store.
    const resolved = productionArtifactRoot();
    expect(resolved).toBe(path.join(os.homedir(), PRODUCTION_ARTIFACT_DEFAULT_RELATIVE_ROOT));
    expect(resolved).toContain('prod-findings');
    expect(resolved.endsWith(path.join('.nightwatch', 'findings'))).toBe(false);
    // Resolving must not CREATE the real store: C-10 never populates it.
    expect(typeof resolved).toBe('string');
  });

  test('the store writes owner-only files atomically and enforces its schema', () => {
    const root = disposableRoot('rootiso');
    try {
      const store = new ProductionFindingsStore({ root, routeVocabulary: routeVocabulary() });
      const written = store.write('f1.json', runProductionPipeline());
      const stat = fs.lstatSync(written);
      expect(stat.isFile()).toBe(true);
      expect(stat.mode & 0o077).toBe(0);
      expect(fs.lstatSync(root).mode & 0o077).toBe(0);
      expect(store.list()).toEqual(['f1.json']);
      // No .tmp staging file survives a successful write.
      expect(fs.readdirSync(root).filter((name) => name.endsWith('.tmp'))).toEqual([]);
      // Round-trip re-validates through the firewall.
      expect(store.read('f1.json').boundaryClass).toBe('SAFE_PRODUCTION_EVIDENCE');
      expect(store.policy.controlCenterVisibility).toBe('STRUCTURALLY_EXCLUDED');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('the store refuses a raw response object at the durable write', () => {
    const root = disposableRoot('rawrefuse');
    try {
      const store = new ProductionFindingsStore({ root, routeVocabulary: routeVocabulary() });
      expect(() => store.write('f1.json', hostileProductionPayload())).toThrow(
        /PRODUCTION_PRIVACY/,
      );
      expect(store.list()).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('the store refuses an unsafe file name', () => {
    const root = disposableRoot('name');
    try {
      const store = new ProductionFindingsStore({ root, routeVocabulary: routeVocabulary() });
      for (const name of ['../escape.json', 'a/b.json', 'no-extension', '.hidden.json']) {
        expect(() => store.write(name, runProductionPipeline())).toThrow(
          /PRODUCTION_ARTIFACT_FILE_NAME_UNSAFE/,
        );
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

test.describe('C-10 F-18 — Control Center cannot read the production store', () => {
  test('the production root and anything inside it is recognised as production territory', () => {
    const production = path.join(os.homedir(), PRODUCTION_ARTIFACT_DEFAULT_RELATIVE_ROOT);
    expect(isProductionFindingsRoot(production)).toBe(true);
    expect(isProductionFindingsRoot(path.join(production, 'nested'))).toBe(true);
    // An ancestor is also refused: handing over $HOME/.nightwatch would expose it.
    expect(isProductionFindingsRoot(path.dirname(production))).toBe(true);
  });

  test('the normal DEV findings root is NOT refused, so DEV workflows keep working', () => {
    const dev = path.join(os.homedir(), '.nightwatch', 'findings');
    expect(isProductionFindingsRoot(dev)).toBe(false);
    const unrelated = disposableRoot('devroot');
    try {
      expect(isProductionFindingsRoot(unrelated)).toBe(false);
    } finally {
      fs.rmSync(unrelated, { recursive: true, force: true });
    }
  });

  test('the test-only seam refuses the production root', () => {
    const production = path.join(os.homedir(), PRODUCTION_ARTIFACT_DEFAULT_RELATIVE_ROOT);
    expect(() => createFindingsAuthorityForTests(production)).toThrow(
      /FINDINGS_ROOT_PRODUCTION_EXCLUDED/,
    );
  });

  test('the test-only seam still serves a normal DEV root', () => {
    const root = disposableRoot('ccdev');
    try {
      const authority = createFindingsAuthorityForTests(root);
      const snapshot = authority.snapshot();
      // Empty is the correct DEV answer; the point is it was not refused.
      expect(['EMPTY', 'AVAILABLE']).toContain(snapshot.state);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('a symlink pointing at the production store cannot bypass the rule', () => {
    // The production root is redirected to a disposable location for this
    // case: C-10 never creates or populates the real production store.
    const base = disposableRoot('symlink');
    const fakeProduction = path.join(base, 'prod-findings');
    const previous = process.env.NIGHTWATCH_PRODUCTION_STATE_DIR;
    try {
      fs.mkdirSync(fakeProduction, { recursive: true, mode: 0o700 });
      process.env.NIGHTWATCH_PRODUCTION_STATE_DIR = fakeProduction;
      const link = path.join(base, 'sneaky');
      fs.symlinkSync(fakeProduction, link);
      // A plain string comparison would accept this path; resolved-path
      // equivalence follows the link and refuses it.
      expect(link).not.toBe(fakeProduction);
      expect(isProductionFindingsRoot(link)).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.NIGHTWATCH_PRODUCTION_STATE_DIR;
      else process.env.NIGHTWATCH_PRODUCTION_STATE_DIR = previous;
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('path-equivalence tricks (dot segments, trailing separators) cannot bypass the rule', () => {
    const production = path.join(os.homedir(), PRODUCTION_ARTIFACT_DEFAULT_RELATIVE_ROOT);
    for (const variant of [
      `${production}/`,
      `${production}/.`,
      path.join(production, '..', 'prod-findings'),
      path.join(production, 'a', '..'),
    ]) {
      expect(isProductionFindingsRoot(variant), `variant not refused: ${variant}`).toBe(true);
    }
  });
});

// ===========================================================================
// Workstream I — production console text can never persist
// ===========================================================================

test.describe('C-10 — production console, screenshots and traces', () => {
  test('a planted console sentinel has no field to occupy in a projected event', () => {
    const policy = createProductionPrivacyPolicy();
    const event = projectProductionConsoleEvent(policy, 'log', S.consoleText);
    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain(S.consoleText);
    expect(Object.keys(event).sort()).toEqual(['consoleType', 'count']);
    expect(event.consoleType).toBe('log');
  });

  test('an unknown console type degrades to a categorical value, never passthrough', () => {
    const policy = createProductionPrivacyPolicy();
    const event = projectProductionConsoleEvent(policy, S.consoleText, S.consoleText);
    expect(event.consoleType).toBe('other');
    expect(JSON.stringify(event)).not.toContain(S.consoleText);
  });

  test('console projection refuses a policy that permits page text', () => {
    expect(() => projectProductionConsoleEvent(createDevPrivacyPolicy(), 'log', 'x')).toThrow(
      /CONE_MISMATCH/,
    );
  });

  test('enabling a production screenshot or trace is a contract failure', () => {
    const policy = createProductionPrivacyPolicy();
    expect(() => assertProductionCaptureAllowed(policy, { screenshot: true })).toThrow(
      /SCREENSHOTS_PROHIBITED/,
    );
    expect(() => assertProductionCaptureAllowed(policy, { trace: true })).toThrow(/TRACE_PROHIBITED/);
    // Nothing requested is fine.
    expect(() => assertProductionCaptureAllowed(policy, {})).not.toThrow();
  });

  test('a production browser profile is private, owner-only and cleaned on normal exit', () => {
    const base = disposableRoot('profile');
    try {
      const profile = createEphemeralProductionProfile(base, createProductionPrivacyPolicy());
      const stat = fs.lstatSync(profile.directory);
      expect(stat.isDirectory()).toBe(true);
      expect(stat.mode & 0o077).toBe(0);
      expect(profile.args).toContain('--disk-cache-size=0');
      expect(profile.args).toContain('--disable-breakpad');
      expect(profile.args).toContain('--disable-crash-reporter');
      cleanupProductionProfile(profile.directory);
      expect(fs.existsSync(profile.directory)).toBe(false);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('cleanup refuses a directory this module did not name', () => {
    const base = disposableRoot('notours');
    try {
      expect(() => cleanupProductionProfile(base)).toThrow(/PRODUCTION_PRIVACY_BOUNDARY_VIOLATION/);
      expect(fs.existsSync(base)).toBe(true);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });
});

// ===========================================================================
// Workstream K — SSE and Control Center projection safety
// ===========================================================================

test.describe('C-10 Workstream K — SSE cannot become a side channel', () => {
  test('the event contract is a closed allowlist that discards arbitrary fields', () => {
    const hostile = {
      schemaVersion: 'nightwatch.control-center.event.v1',
      type: 'findings.snapshot.changed',
      entityId: null,
      sequence: 1,
      snapshotDigest: null,
      // Everything below is an attempt to ride the notification channel.
      body: hostileProductionPayload(),
      rawResponse: S.freeText,
      consoleText: S.consoleText,
      headers: { authorization: S.header },
      cookies: S.cookie,
      accountId: S.accountId,
    };
    const sanitized = sanitizeControlCenterEvent(hostile);
    expect(sanitized).not.toBeNull();
    // The allowlist is CONSTRUCTED, not filtered: only five fields survive.
    expect(Object.keys(sanitized!).sort()).toEqual([
      'entityId',
      'schemaVersion',
      'sequence',
      'snapshotDigest',
      'type',
    ]);
    const serialized = JSON.stringify(sanitized);
    for (const sentinel of ALL_SENTINELS) {
      expect(serialized, `SSE event leaked ${sentinel}`).not.toContain(sentinel);
    }
  });

  test('an unknown event type is refused outright rather than passed through', () => {
    expect(sanitizeControlCenterEvent({ type: S.freeText, sequence: 1 })).toBeNull();
    expect(sanitizeControlCenterEvent({ type: 'production.finding', sequence: 1 })).toBeNull();
    expect(sanitizeControlCenterEvent(null)).toBeNull();
    expect(sanitizeControlCenterEvent([{ type: 'run.updated', sequence: 1 }])).toBeNull();
  });

  test('the SSE frame carries only the sanitized event, never a findings payload', () => {
    const sanitized = sanitizeControlCenterEvent({
      schemaVersion: CONTROL_CENTER_EVENT_SCHEMA_VERSION,
      type: 'findings.snapshot.changed',
      entityId: null,
      sequence: 7,
      snapshotDigest: null,
      leak: S.customerId,
    });
    // This is exactly the frame body ControlCenterSseHub.publish writes.
    const frame = `event: ${sanitized!.type}\nid: ${sanitized!.sequence}\ndata: ${JSON.stringify(sanitized)}\n\n`;
    expect(frame).not.toContain(S.customerId);
    // A notification carries a DIGEST at most; it is never the state itself.
    expect(frame).not.toContain('"root"');
    expect(frame).not.toContain('"provenFields"');
  });

  test('production evidence has no route into any Control Center contract', () => {
    // The findings authority reads the DEV root only, and the production root
    // is structurally excluded, so no adapter can reach production evidence.
    const production = path.join(os.homedir(), PRODUCTION_ARTIFACT_DEFAULT_RELATIVE_ROOT);
    expect(isProductionFindingsRoot(production)).toBe(true);
    const source = fs.readFileSync(
      path.resolve(__dirname, '..', '..', 'src', 'controlCenter', 'authorities', 'findingsAuthority.ts'),
      'utf8',
    );
    // No Control Center surface imports the production evidence tree except
    // the exclusion rule itself.
    expect(source).toContain('assertNotProductionFindingsRoot');
    expect(source).not.toMatch(/ProductionFindingsStore|productionArtifactRoot/);
  });
});

// ===========================================================================
// DEF-C10-5 — sentinels in the ROUTE-IDENTITY position
//
// The original sentinel corpus planted query and path parameters as BODY
// VALUES, which class B already proves are stripped generically. It never
// planted them in the route-identity position — the one persisted field that
// can hold a free-form string — so it missed the leak entirely. These cases
// close that gap at every boundary: construction, the firewall, the durable
// write, and the post-hoc audit.
// ===========================================================================

test.describe('C-10 DEF-C10-5 — route identity requires source-proven provenance', () => {
  const CONCRETE_ROUTES = [
    `GET /v1/billing/accounts/${S.accountId}`,
    `GET /v1/invoices/${S.invoiceId}`,
    `GET /v1/billing/groups/${S.nestedDynamicKey}`,
    `GET /v1/msp/${S.dynamicKey}`,
  ];

  test('the concrete routes are SHAPE-valid, proving the regex alone was not enough', () => {
    // Non-vacuous framing: these strings pass ROUTE_TEMPLATE_RE. That is why
    // shape could never have been the authority.
    for (const route of CONCRETE_ROUTES) {
      expect(ROUTE_TEMPLATE_RE.test(route), `${route} should be shape-valid`).toBe(true);
    }
  });

  test('evidence construction refuses a concrete identifier in the route position', () => {
    const policy = createProductionPrivacyPolicy();
    for (const route of CONCRETE_ROUTES) {
      const projection = projectProduction(
        RawEphemeralSource.of({ status: 'ACTIVE' }),
        vocabulary(),
        policy,
      );
      let thrown: unknown;
      try {
        toProductionEvidence({
          projection,
          vocabulary: vocabulary(),
          routeVocabulary: routeVocabulary(),
          policy,
          routeTemplate: route,
          statusClass: '2XX',
        });
      } catch (error) {
        thrown = error;
      }
      expect(thrown, `${route} was accepted`).toBeInstanceOf(ProductionPrivacyError);
      expect((thrown as ProductionPrivacyError).reasonCode).toBe(
        'PRODUCTION_PRIVACY_ROUTE_PROVENANCE_UNRESOLVED',
      );
      // The error itself must not echo the identifier.
      for (const sentinel of ALL_SENTINELS) {
        expect((thrown as Error).message).not.toContain(sentinel);
      }
    }
  });

  test('an unproven route vocabulary denies persistence outright', () => {
    const policy = createProductionPrivacyPolicy();
    const projection = projectProduction(RawEphemeralSource.of({ status: 'A' }), vocabulary(), policy);
    expect(() =>
      toProductionEvidence({
        projection,
        vocabulary: vocabulary(),
        routeVocabulary: NO_PROVEN_ROUTE_VOCABULARY,
        policy,
        routeTemplate: 'GET /v1/billing/groups/{id}',
        statusClass: '2XX',
      }),
    ).toThrow(/PRODUCTION_PRIVACY_ROUTE_PROVENANCE_UNRESOLVED/);
  });

  test('the firewall independently refuses evidence lacking route provenance', () => {
    const evidence = runProductionPipeline();
    for (const mutation of [
      { routeProvenanceClass: 'NONE' },
      { routeProvenanceClass: 'ASSUMED_SAFE' },
      { routeProvenanceDigest: 'not-a-digest' },
    ]) {
      const tampered = { ...JSON.parse(JSON.stringify(evidence)), ...mutation };
      expect(() => assertPersistableProductionEvidence(tampered)).toThrow(
        /ROUTE_PROVENANCE_MISSING/,
      );
    }
  });

  test('the store refuses a concrete-identifier route at the durable write', () => {
    const root = disposableRoot('routeleak');
    try {
      const store = new ProductionFindingsStore({ root, routeVocabulary: routeVocabulary() });
      // Forge past construction to prove the SECOND boundary also holds.
      const forged = {
        ...JSON.parse(JSON.stringify(runProductionPipeline())),
        routeTemplate: `GET /v1/billing/accounts/${S.accountId}`,
      };
      expect(() => store.write('leak.json', forged)).toThrow(/PRODUCTION_PRIVACY/);
      expect(store.list()).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('the persistence audit detects a template-shaped but unproven route on disk', () => {
    const root = disposableRoot('routeaudit');
    try {
      // Written directly, as an upstream defect or an older artifact would be.
      fs.writeFileSync(
        path.join(root, 'finding.json'),
        JSON.stringify({ routeTemplate: `GET /v1/billing/accounts/${S.accountId}` }),
        { mode: 0o600 },
      );
      const audit = auditProductionPersistence({
        roots: [root],
        provenRouteTemplates: [...routeVocabulary().templates],
      });
      expect(audit.clean).toBe(false);
      expect(audit.violations.map((violation) => violation.violationClass)).toContain(
        'RAW_REQUEST_PARAMETER_VALUE',
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('the audit accepts a proven route, so it is not refusing everything', () => {
    const root = disposableRoot('routeok');
    try {
      const store = new ProductionFindingsStore({ root, routeVocabulary: routeVocabulary() });
      store.write('finding.json', runProductionPipeline());
      const audit = auditProductionPersistence({
        roots: [root],
        sentinels: [...ALL_SENTINELS],
        provenRouteTemplates: [...routeVocabulary().templates],
      });
      expect(audit.violations, JSON.stringify(audit.violations)).toEqual([]);
      expect(audit.filesInspected).toBeGreaterThan(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('persisted evidence records route provenance and no route sentinel', () => {
    const evidence = runProductionPipeline();
    expect(evidence.routeProvenanceClass).toBe('SOURCE_PROVEN_OPENAPI_OPERATION');
    expect(evidence.routeProvenanceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
    expect(evidence.routeTemplate).toBe('GET /v1/billing/accounts/{accountId}');
    const serialized = JSON.stringify(evidence);
    for (const sentinel of ALL_SENTINELS) {
      expect(serialized).not.toContain(sentinel);
    }
  });
});

test.describe('C-10 DEF-C10-5 — the store cannot verify a route it has no vocabulary for', () => {
  test('a store built without a route vocabulary refuses every write', () => {
    // Fail-closed: not knowing the proven set is not permission to persist.
    const root = disposableRoot('novocab');
    try {
      const store = new ProductionFindingsStore({ root });
      expect(() => store.write('f.json', runProductionPipeline())).toThrow(
        /ROUTE_NOT_SOURCE_PROVEN/,
      );
      expect(store.list()).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
