// ---------------------------------------------------------------------------
// C-11 — evidence integrity, authorization lifecycle, external configuration,
// budgets, breakers, and the zero-real-contact proofs.
//
// The admission chain decides; this suite covers whether the things it decides
// FROM and the record it decides INTO can be forged, and whether production
// remains structurally unreachable while all of it exists.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import {
  CONFIG_INTEGRITY_FAILURES,
  PRODUCTION_ADMISSION_CHAIN_VERSION,
  PRODUCTION_ADMISSION_GATES,
  PRODUCTION_BUDGET_DEFAULTS,
  PROD_OBSERVE_AUTHORIZATION_CLASS,
  PROD_OBSERVE_CONFIG_ENV,
  PROD_OBSERVE_CONFIG_SCHEMA,
  ProductionBreakerBoard,
  ProductionBudgetLedger,
  clearProdObserveGrantRegistryForTest,
  consumeProdObserveGrant,
  evaluateKillSwitch,
  grantLifecycleState,
  isAdmittedProductionHost,
  isRegisteredGrant,
  issueProdObserveGrant,
  loadProdObserveConfig,
  revokeProdObserveGrant,
  sealPqReceipt,
  validatePqReceipt,
  validateProdObserveGrant,
  type ConfigIntegrityFailure,
  type PqReceiptDraft,
} from '../../src/core/prodObserve';
import { SUPPORTED_ENVIRONMENTS } from '../../src/core/environment';
import { KNOWN_PRODUCTION_HOSTS } from '../../src/core/safety/hosts';

const ROOT = path.resolve(__dirname, '../..');
const WORKSPACE = path.resolve(ROOT, '..');
const NOW = 1_760_000_000_000;

function sha24(canonical: string): string {
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24);
}

function scratch(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `nightwatch-c11-${prefix}-`));
}

/**
 * Strip comments before scanning source for forbidden references, matching
 * `bin/hardening-check.mjs`'s `withoutComments`.
 *
 * The production cone deliberately DOCUMENTS what it must never import — the
 * DEV orchestrator, the generic real-run gate, the deny table — because the
 * absence of those imports is the separation and a future reader needs to know
 * it is deliberate. Scanning raw text would make that documentation itself a
 * violation, which would push the reasoning out of the code.
 */
function productionConeSources(): ReadonlyArray<{ readonly file: string; readonly source: string }> {
  const directory = path.join(ROOT, 'src/core/prodObserve');
  return fs.readdirSync(directory).map((entry) => ({
    file: entry,
    source: fs.readFileSync(path.join(directory, entry), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1'),
  }));
}

test.afterEach(() => {
  clearProdObserveGrantRegistryForTest();
});

// ---------------------------------------------------------------------------
// Authorization lifecycle
// ---------------------------------------------------------------------------

test.describe('C-11 PROD_OBSERVE authorization is finite, scoped and one-shot', () => {
  function grant(overrides: Partial<Parameters<typeof issueProdObserveGrant>[0]> = {}) {
    return issueProdObserveGrant({
      campaignId: 'c11-campaign',
      stage: 'PQ',
      notBeforeMs: NOW - 1_000,
      expiresAtMs: NOW + 1_000,
      ...overrides,
    });
  }

  test('a fresh grant validates, and consuming it exactly once succeeds', () => {
    const issued = grant();
    expect(issued.authorizationClass).toBe(PROD_OBSERVE_AUTHORIZATION_CLASS);
    expect(grantLifecycleState(issued)).toBe('ISSUED');
    expect(validateProdObserveGrant({ candidate: issued, campaignId: 'c11-campaign', nowMs: NOW }).ok).toBe(true);
    expect(consumeProdObserveGrant(issued).ok).toBe(true);
    expect(grantLifecycleState(issued)).toBe('CONSUMED');
  });

  test('reuse of a consumed grant fails ALREADY_CONSUMED', () => {
    const issued = grant();
    consumeProdObserveGrant(issued);
    const second = consumeProdObserveGrant(issued);
    expect(second.ok).toBe(false);
    expect(second.denialCode).toBe('ALREADY_CONSUMED');
    const validation = validateProdObserveGrant({ candidate: issued, campaignId: 'c11-campaign', nowMs: NOW });
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.denialCode).toBe('ALREADY_CONSUMED');
  });

  test('a grant cannot be un-consumed by mutating what the caller holds', () => {
    const issued = grant();
    consumeProdObserveGrant(issued);
    // The object is frozen, and consumption lives in the registry rather than
    // on the object, so neither mutation nor a copy can undo it.
    expect(Object.isFrozen(issued)).toBe(true);
    const copy = { ...issued };
    expect(isRegisteredGrant(copy)).toBe(false);
    expect(grantLifecycleState(issued)).toBe('CONSUMED');
  });

  test('a JSON-revived grant is not a grant', () => {
    const issued = grant();
    const revived = JSON.parse(JSON.stringify(issued));
    // This is the DEF-C10-5 failure class: a shape-valid object accepted as
    // authority. Identity is held by the registry, so the shape is not enough.
    expect(revived.grantId).toBe(issued.grantId);
    expect(isRegisteredGrant(revived)).toBe(false);
    expect(grantLifecycleState(revived)).toBe('UNREGISTERED');
  });

  test('a hand-built object with a plausible id is not a grant', () => {
    const forged = {
      schemaVersion: 'nightwatch.prod-observe-grant.v1',
      authorizationClass: 'PROD_OBSERVE',
      grantId: `pog_${'a'.repeat(32)}`,
      campaignId: 'c11-campaign',
      stage: 'PQ',
      notBeforeMs: NOW - 1_000,
      expiresAtMs: NOW + 1_000,
    };
    expect(isRegisteredGrant(forged)).toBe(false);
    const validation = validateProdObserveGrant({ candidate: forged, campaignId: 'c11-campaign', nowMs: NOW });
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.denialCode).toBe('AUTHORIZATION_ABSENT');
  });

  test('scope and window are enforced independently', () => {
    const issued = grant();
    const wrongScope = validateProdObserveGrant({ candidate: issued, campaignId: 'other', nowMs: NOW });
    expect(wrongScope.ok).toBe(false);
    if (!wrongScope.ok) expect(wrongScope.denialCode).toBe('AUTHORIZATION_SCOPE_MISMATCH');

    const tooEarly = validateProdObserveGrant({ candidate: issued, campaignId: 'c11-campaign', nowMs: NOW - 5_000 });
    expect(tooEarly.ok).toBe(false);
    if (!tooEarly.ok) expect(tooEarly.denialCode).toBe('AUTHORIZATION_EXPIRED');

    const tooLate = validateProdObserveGrant({ candidate: issued, campaignId: 'c11-campaign', nowMs: NOW + 5_000 });
    expect(tooLate.ok).toBe(false);
    if (!tooLate.ok) expect(tooLate.denialCode).toBe('AUTHORIZATION_EXPIRED');
  });

  test('a grant with no finite window cannot be issued', () => {
    // A non-expiring grant is not finite, and a reversed window would make
    // every comparison vacuous.
    expect(() => grant({ expiresAtMs: NOW - 5_000 })).toThrow('PROD_OBSERVE_GRANT_WINDOW_INVALID');
    expect(() => grant({ notBeforeMs: Number.NaN })).toThrow('PROD_OBSERVE_GRANT_WINDOW_INVALID');
    expect(() => issueProdObserveGrant({ campaignId: '', stage: 'PQ', notBeforeMs: 0, expiresAtMs: 1 })).toThrow('PROD_OBSERVE_GRANT_CAMPAIGN_INVALID');
  });

  test('revocation is honoured and cannot be reversed', () => {
    const issued = grant();
    revokeProdObserveGrant(issued);
    expect(grantLifecycleState(issued)).toBe('REVOKED');
    expect(consumeProdObserveGrant(issued).denialCode).toBe('ALREADY_CONSUMED');
  });
});

// ---------------------------------------------------------------------------
// External-only observation configuration (F-09) and the independent
// allowlist (F-10)
// ---------------------------------------------------------------------------

test.describe('C-11 the observation config is external-only', () => {
  function write(directory: string, contents: string, mode = 0o600): string {
    const file = path.join(directory, 'prod-observe.v1.json');
    fs.writeFileSync(file, contents, { mode });
    fs.chmodSync(file, mode);
    return file;
  }

  const validContents = JSON.stringify({
    schemaVersion: PROD_OBSERVE_CONFIG_SCHEMA,
    admittedHosts: ['127.0.0.1'],
    observationWindow: { notBeforeMs: NOW - 1_000, notAfterMs: NOW + 1_000 },
  });

  function load(file: string | undefined) {
    return loadProdObserveConfig({
      environment: file === undefined ? {} : { [PROD_OBSERVE_CONFIG_ENV]: file },
      repositoryRoot: ROOT,
      workspaceRoot: WORKSPACE,
      digest: sha24,
    });
  }

  test('a well-formed external config loads and yields a host allowlist', () => {
    const directory = scratch('cfg-ok');
    try {
      const loaded = load(write(directory, validContents));
      expect(loaded.ok).toBe(true);
      if (!loaded.ok) return;
      expect(loaded.config.admittedHosts).toEqual(['127.0.0.1']);
      expect(loaded.config.configIdentity).toMatch(/^prodobscfg:[0-9a-f]{24}$/);
      expect(isAdmittedProductionHost(loaded.config, '127.0.0.1')).toBe(true);
      expect(isAdmittedProductionHost(loaded.config, 'anything-else.invalid')).toBe(false);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  for (const [label, expected, build] of [
    ['the environment variable is absent', 'CONFIG_ENV_ABSENT', () => undefined],
    ['the path is relative', 'CONFIG_PATH_NOT_ABSOLUTE', () => 'relative/prod.json'],
    ['the path contains a traversal segment', 'CONFIG_PATH_TRAVERSAL', () => `${os.tmpdir()}/../etc/prod.json`],
    ['the path does not exist', 'CONFIG_NOT_FOUND', () => path.join(os.tmpdir(), `nightwatch-c11-absent-${process.pid}.json`)],
  ] as const) {
    test(`${label} fails closed with ${expected}`, () => {
      const loaded = load(build());
      expect(loaded.ok).toBe(false);
      if (!loaded.ok) expect(loaded.failure).toBe(expected as ConfigIntegrityFailure);
    });
  }

  test('a config INSIDE the Nightwatch repository is refused, preserving D-4 structurally', () => {
    // The whole point of F-09: an in-repo loadable production host list would
    // substitute a naming convention for D-4's unloadable-file property.
    const directory = fs.mkdtempSync(path.join(ROOT, 'artifacts-c11-cfg-'));
    try {
      const loaded = load(write(directory, validContents));
      expect(loaded.ok).toBe(false);
      if (!loaded.ok) expect(loaded.failure).toBe('CONFIG_INSIDE_REPOSITORY');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('a SYMLINKED config is refused rather than followed', () => {
    const directory = scratch('cfg-symlink');
    try {
      const real = write(directory, validContents);
      const link = path.join(directory, 'linked.json');
      fs.symlinkSync(real, link);
      const loaded = load(link);
      expect(loaded.ok).toBe(false);
      if (!loaded.ok) expect(loaded.failure).toBe('CONFIG_SYMLINK');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('a group- or world-readable config is refused', () => {
    const directory = scratch('cfg-mode');
    try {
      for (const mode of [0o644, 0o640, 0o604]) {
        const loaded = load(write(directory, validContents, mode));
        expect(loaded.ok).toBe(false);
        if (!loaded.ok) expect(loaded.failure).toBe('CONFIG_MODE_NOT_OWNER_ONLY');
      }
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('a directory in place of the config file is refused', () => {
    const directory = scratch('cfg-dir');
    try {
      const asDirectory = path.join(directory, 'prod-observe.v1.json');
      fs.mkdirSync(asDirectory);
      const loaded = load(asDirectory);
      expect(loaded.ok).toBe(false);
      if (!loaded.ok) expect(loaded.failure).toBe('CONFIG_NOT_REGULAR_FILE');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  for (const [label, expected, contents] of [
    ['malformed JSON', 'CONFIG_MALFORMED', '{ not json'],
    ['a JSON array', 'CONFIG_MALFORMED', '[]'],
    ['an unknown schema', 'CONFIG_SCHEMA_UNSUPPORTED', JSON.stringify({ schemaVersion: 'nightwatch.prod-observe-config.v2', admittedHosts: ['a.example'], observationWindow: { notBeforeMs: 0, notAfterMs: 1 } })],
    ['an empty allowlist', 'CONFIG_ALLOWLIST_EMPTY', JSON.stringify({ schemaVersion: PROD_OBSERVE_CONFIG_SCHEMA, admittedHosts: [], observationWindow: { notBeforeMs: 0, notAfterMs: 1 } })],
    ['a non-host entry', 'CONFIG_ALLOWLIST_INVALID', JSON.stringify({ schemaVersion: PROD_OBSERVE_CONFIG_SCHEMA, admittedHosts: ['https://a.example/path'], observationWindow: { notBeforeMs: 0, notAfterMs: 1 } })],
    ['a wildcard host', 'CONFIG_ALLOWLIST_INVALID', JSON.stringify({ schemaVersion: PROD_OBSERVE_CONFIG_SCHEMA, admittedHosts: ['*.example.com'], observationWindow: { notBeforeMs: 0, notAfterMs: 1 } })],
    ['a reversed observation window', 'CONFIG_WINDOW_INVALID', JSON.stringify({ schemaVersion: PROD_OBSERVE_CONFIG_SCHEMA, admittedHosts: ['a.example'], observationWindow: { notBeforeMs: 10, notAfterMs: 5 } })],
    ['a missing observation window', 'CONFIG_WINDOW_INVALID', JSON.stringify({ schemaVersion: PROD_OBSERVE_CONFIG_SCHEMA, admittedHosts: ['a.example'] })],
  ] as const) {
    test(`${label} fails closed with ${expected}`, () => {
      const directory = scratch('cfg-bad');
      try {
        const loaded = load(write(directory, contents));
        expect(loaded.ok).toBe(false);
        if (!loaded.ok) expect(loaded.failure).toBe(expected as ConfigIntegrityFailure);
      } finally {
        fs.rmSync(directory, { recursive: true, force: true });
      }
    });
  }

  test('every declared integrity failure is reachable by some input', () => {
    // Totality over the failure vocabulary, minus the two that need an
    // unreadable file or an unresolvable path to trigger.
    const exercised = new Set<ConfigIntegrityFailure>([
      'CONFIG_ENV_ABSENT', 'CONFIG_PATH_NOT_ABSOLUTE', 'CONFIG_PATH_TRAVERSAL', 'CONFIG_INSIDE_REPOSITORY',
      'CONFIG_NOT_FOUND', 'CONFIG_SYMLINK', 'CONFIG_NOT_REGULAR_FILE', 'CONFIG_MODE_NOT_OWNER_ONLY',
      'CONFIG_MALFORMED', 'CONFIG_SCHEMA_UNSUPPORTED', 'CONFIG_ALLOWLIST_EMPTY', 'CONFIG_ALLOWLIST_INVALID',
      'CONFIG_WINDOW_INVALID',
    ]);
    const unexercised = CONFIG_INTEGRITY_FAILURES.filter((failure) => !exercised.has(failure));
    expect(unexercised).toEqual(['CONFIG_INSIDE_WORKSPACE', 'CONFIG_UNREADABLE']);
  });
});

// ---------------------------------------------------------------------------
// Budgets and breakers
// ---------------------------------------------------------------------------

test.describe('C-11 budgets reserve before dispatch and never oversubscribe', () => {
  test('concurrent contenders cannot oversubscribe the concurrency limit', () => {
    const ledger = new ProductionBudgetLedger({ startedAtMs: NOW });
    const first = ledger.reserve({ serviceKey: 's', routeKey: 'r', nowMs: NOW });
    expect(first.ok).toBe(true);
    // Concurrency is 1 by design, so a second in-flight reservation must fail
    // rather than be granted and reconciled later.
    const second = ledger.reserve({ serviceKey: 's', routeKey: 'r', nowMs: NOW });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.exhaustedScope).toBe('CONCURRENCY');
    expect(ledger.requestsInFlight).toBe(1);
  });

  test('a failed request does not refund its reservation', () => {
    const ledger = new ProductionBudgetLedger({ startedAtMs: NOW });
    const reservation = ledger.reserve({ serviceKey: 's', routeKey: 'r', nowMs: NOW });
    expect(reservation.ok).toBe(true);
    if (!reservation.ok) return;
    ledger.settle(reservation.reservation, 'FAILURE');
    // The concurrency slot is released; the spend is not returned, because the
    // request has already touched production.
    expect(ledger.requestsInFlight).toBe(0);
    expect(ledger.campaignRequestsUsed).toBe(1);
    expect(ledger.routeRequestsUsed('r')).toBe(1);
    expect(ledger.failures).toBe(1);
  });

  test('route, service and campaign ceilings each bind independently', () => {
    const ledger = new ProductionBudgetLedger({
      limits: { ...PRODUCTION_BUDGET_DEFAULTS, concurrency: 64, routeRequests: 2, serviceRequests: 3, campaignRequests: 4 },
      startedAtMs: NOW,
    });
    const take = (routeKey: string): boolean => {
      const result = ledger.reserve({ serviceKey: 'svc', routeKey, nowMs: NOW });
      if (result.ok) ledger.settle(result.reservation, 'SUCCESS');
      return result.ok;
    };
    expect([take('r1'), take('r1')]).toEqual([true, true]);
    // Route ceiling of 2 binds before the service ceiling of 3.
    expect(take('r1')).toBe(false);
    expect(take('r2')).toBe(true);
    // Service ceiling of 3 now binds.
    expect(take('r2')).toBe(false);
    expect(ledger.campaignRequestsUsed).toBe(3);
  });

  test('the campaign time window closes the budget', () => {
    const ledger = new ProductionBudgetLedger({ startedAtMs: NOW });
    const late = ledger.reserve({ serviceKey: 's', routeKey: 'r', nowMs: NOW + PRODUCTION_BUDGET_DEFAULTS.campaignWindowMs });
    expect(late.ok).toBe(false);
    if (!late.ok) expect(late.exhaustedScope).toBe('WINDOW');
  });

  test('the failure budget closes the campaign', () => {
    const ledger = new ProductionBudgetLedger({
      limits: { ...PRODUCTION_BUDGET_DEFAULTS, concurrency: 8, failures: 1 },
      startedAtMs: NOW,
    });
    const first = ledger.reserve({ serviceKey: 's', routeKey: 'r', nowMs: NOW });
    if (first.ok) ledger.settle(first.reservation, 'FAILURE');
    const next = ledger.reserve({ serviceKey: 's', routeKey: 'r', nowMs: NOW });
    expect(next.ok).toBe(false);
    if (!next.ok) expect(next.exhaustedScope).toBe('FAILURES');
  });

  test('a budget key can never carry a customer value', () => {
    const ledger = new ProductionBudgetLedger({ startedAtMs: NOW });
    // Keys are constrained, so a raw identifier or a URL cannot become one.
    expect(() => ledger.reserve({ serviceKey: 'acct/481516234299', routeKey: 'r', nowMs: NOW })).toThrow('PRODUCTION_BUDGET_KEY_INVALID');
    expect(() => ledger.reserve({ serviceKey: 's', routeKey: 'https://x/y?id=42', nowMs: NOW })).toThrow('PRODUCTION_BUDGET_KEY_INVALID');
    expect(ledger.budgetIdentity(sha24)).toMatch(/^prodbudget:[0-9a-f]{24}$/);
  });
});

test.describe('C-11 breakers are terminal', () => {
  test('an opened breaker stays open and records the first cause', () => {
    const board = new ProductionBreakerBoard();
    expect(board.isOpen).toBe(false);
    expect(board.breakerState()).toBe('CLOSED');
    board.open('PRIVACY_VIOLATION');
    board.open('BUDGET_EXHAUSTION');
    expect(board.isOpen).toBe(true);
    // There is deliberately no reset: recovery is a new authorized campaign.
    expect(board.breakerState()).toBe('PRIVACY_VIOLATION');
    expect(board.openedCategories).toEqual(['PRIVACY_VIOLATION', 'BUDGET_EXHAUSTION']);
    expect('close' in board).toBe(false);
    expect('reset' in board).toBe(false);
  });

  test('an unknown breaker category is refused', () => {
    const board = new ProductionBreakerBoard();
    expect(() => board.open('NOT_A_CATEGORY' as never)).toThrow('PRODUCTION_BREAKER_CATEGORY_INVALID');
  });
});

test.describe('C-11 the kill switch fails closed', () => {
  test('an absent switch permits and an engaged switch forbids', () => {
    expect(evaluateKillSwitch(() => false)).toBe('ABSENT');
    expect(evaluateKillSwitch(() => true)).toBe('ENGAGED');
  });

  test('a probe that cannot answer reads as ENGAGED', () => {
    // An unreadable kill switch must never be read as permission.
    expect(evaluateKillSwitch(() => { throw new Error('unreadable'); })).toBe('ENGAGED');
  });
});

// ---------------------------------------------------------------------------
// PQ receipt tamper matrix
// ---------------------------------------------------------------------------

test.describe('C-11 the PQ receipt is tamper-resistant', () => {
  function qualifiedDraft(): PqReceiptDraft {
    return {
      schemaVersion: 'nightwatch.production-qualification-receipt.v1',
      campaignId: 'c11-campaign',
      taskId: 'nightwatch-prod-observe-safety-kernel-c11-v1',
      authorizationClass: PROD_OBSERVE_AUTHORIZATION_CLASS,
      authorizationLifecycle: 'CONSUMED',
      observationStage: 'PQ',
      environmentClass: 'LOCAL',
      sourceRepository: 'alphauslabs/blueapi',
      sourceCheckpoint: 'a'.repeat(40),
      sourceInventoryState: 'COMPLETE',
      sourceCurrencyState: 'CURRENT',
      chainVersion: PRODUCTION_ADMISSION_CHAIN_VERSION,
      gateDefinitionDigest: `prodchain:${sha24('chain')}`,
      orderedGates: PRODUCTION_ADMISSION_GATES,
      gateOutcomes: PRODUCTION_ADMISSION_GATES.map((gate) => ({ gate, result: 'PASS' as const, denialCode: null })),
      routeEvidenceIdentity: `routeev:${sha24('route')}`,
      readOnlyProofIdentity: `roproof:${sha24('proof')}`,
      parameterProvenanceIdentity: `paramprov:${sha24('params')}`,
      privacyPolicyIdentity: `privpolicy:${sha24('privacy')}`,
      containmentIdentity: 'PROVEN',
      observerIdentityClass: 'ORDINARY_USER',
      organizationWindowIdentity: `prodobscfg:${sha24('window')}`,
      budgetIdentity: `prodbudget:${sha24('budget')}`,
      breakerState: 'CLOSED',
      killSwitchState: 'ABSENT',
      requestsDispatched: 1,
      deniedBeforeDispatch: 0,
      persistenceAuditResult: 'CLEAN',
      finalResult: 'QUALIFIED',
    };
  }

  test('a sealed receipt validates and its digest is reproducible', () => {
    const receipt = sealPqReceipt(qualifiedDraft(), sha24);
    expect(receipt.receiptDigest).toMatch(/^pqreceipt:[0-9a-f]{24}$/);
    expect(validatePqReceipt(receipt, sha24)).toEqual({ ok: true });
    expect(sealPqReceipt(qualifiedDraft(), sha24).receiptDigest).toBe(receipt.receiptDigest);
  });

  test('the receipt carries no free-form field that could hold a customer value', () => {
    const receipt = sealPqReceipt(qualifiedDraft(), sha24);
    const planted = 'NWSENT0012-customer-account-481516234299';
    expect(JSON.stringify(receipt)).not.toContain(planted);
    // Every identity is a digest or a fixed enum token.
    for (const key of ['routeEvidenceIdentity', 'readOnlyProofIdentity', 'parameterProvenanceIdentity', 'privacyPolicyIdentity', 'organizationWindowIdentity', 'budgetIdentity', 'gateDefinitionDigest'] as const) {
      expect(receipt[key]).toMatch(/^[a-z][a-z0-9-]*:[0-9a-f]{24,64}$/);
    }
  });

  for (const [label, expected, tamper] of [
    ['a gate is omitted', 'PQ_GATE_LIST_MISMATCH', (r: Record<string, unknown>) => { r.orderedGates = PRODUCTION_ADMISSION_GATES.slice(1); }],
    ['a gate is duplicated', 'PQ_GATE_DUPLICATED', (r: Record<string, unknown>) => { r.orderedGates = [PRODUCTION_ADMISSION_GATES[0], ...PRODUCTION_ADMISSION_GATES]; }],
    ['gates are reordered', 'PQ_GATE_LIST_MISMATCH', (r: Record<string, unknown>) => { r.orderedGates = [...PRODUCTION_ADMISSION_GATES].reverse(); }],
    ['an unknown gate is added', 'PQ_GATE_UNKNOWN', (r: Record<string, unknown>) => { r.orderedGates = [...PRODUCTION_ADMISSION_GATES, 'G_NOT_A_GATE']; }],
    ['a gate result is changed', 'PQ_GATE_RESULT_INVALID', (r: Record<string, unknown>) => {
      const outcomes = [...(r.gateOutcomes as Array<Record<string, unknown>>)];
      outcomes[3] = { ...outcomes[3], result: 'ALLOWED' };
      r.gateOutcomes = outcomes;
    }],
    ['a denial code is unknown', 'PQ_DENIAL_CODE_UNKNOWN', (r: Record<string, unknown>) => {
      const outcomes = [...(r.gateOutcomes as Array<Record<string, unknown>>)];
      outcomes[3] = { ...outcomes[3], result: 'DENY', denialCode: 'NOT_A_CODE' };
      r.gateOutcomes = outcomes;
    }],
    ['a DENY carries no code', 'PQ_DENIAL_CODE_UNKNOWN', (r: Record<string, unknown>) => {
      const outcomes = [...(r.gateOutcomes as Array<Record<string, unknown>>)];
      outcomes[3] = { ...outcomes[3], result: 'DENY', denialCode: null };
      r.gateOutcomes = outcomes;
    }],
    ['a final ALLOW is forged over a denied gate', 'PQ_FORGED_ALLOW', (r: Record<string, unknown>) => {
      const outcomes = [...(r.gateOutcomes as Array<Record<string, unknown>>)];
      outcomes[8] = { ...outcomes[8], result: 'DENY', denialCode: 'ROUTE_NOT_SOURCE_PROVEN' };
      r.gateOutcomes = outcomes;
    }],
    ['the source identity is changed', 'PQ_CHECKPOINT_MALFORMED', (r: Record<string, unknown>) => { r.sourceCheckpoint = 'not-a-sha'; }],
    ['the route identity is changed', 'PQ_IDENTITY_MALFORMED', (r: Record<string, unknown>) => { r.routeEvidenceIdentity = 'GET /v1/accounts/481516234299'; }],
    ['the privacy identity is changed', 'PQ_IDENTITY_MALFORMED', (r: Record<string, unknown>) => { r.privacyPolicyIdentity = 'none'; }],
    ['the budget identity is changed', 'PQ_IDENTITY_MALFORMED', (r: Record<string, unknown>) => { r.budgetIdentity = ''; }],
    ['the window identity is changed', 'PQ_IDENTITY_MALFORMED', (r: Record<string, unknown>) => { r.organizationWindowIdentity = 'always'; }],
    ['the schema is unknown', 'PQ_SCHEMA_UNSUPPORTED', (r: Record<string, unknown>) => { r.schemaVersion = 'nightwatch.production-qualification-receipt.v2'; }],
    ['the chain version is unknown', 'PQ_CHAIN_VERSION_UNSUPPORTED', (r: Record<string, unknown>) => { r.chainVersion = 'nightwatch.production-admission-chain.v0'; }],
    ['a DENIED receipt claims a dispatch', 'PQ_AGGREGATE_INCONSISTENT', (r: Record<string, unknown>) => {
      const outcomes = [...(r.gateOutcomes as Array<Record<string, unknown>>)];
      outcomes[17] = { ...outcomes[17], result: 'DENY', denialCode: 'KILL_SWITCH_ENGAGED_BEFORE_DISPATCH' };
      r.gateOutcomes = outcomes;
      r.finalResult = 'DENIED';
      r.requestsDispatched = 1;
    }],
  ] as const) {
    test(`${label} fails closed with ${expected}`, () => {
      const receipt = { ...sealPqReceipt(qualifiedDraft(), sha24) } as Record<string, unknown>;
      tamper(receipt);
      const validation = validatePqReceipt(receipt, sha24);
      expect(validation.ok).toBe(false);
      if (!validation.ok) expect(validation.rejection).toBe(expected);
    });
  }

  test('an altered receipt digest fails closed', () => {
    const receipt = { ...sealPqReceipt(qualifiedDraft(), sha24), receiptDigest: `pqreceipt:${'0'.repeat(24)}` };
    const validation = validatePqReceipt(receipt, sha24);
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.rejection).toBe('PQ_DIGEST_MISMATCH');
  });

  test('a body change with a stale digest fails closed', () => {
    // Any field the digest covers: changing it without resealing is detected.
    const receipt = { ...sealPqReceipt(qualifiedDraft(), sha24), observerIdentityClass: 'ORG_ENFORCED_READ_ONLY' as const };
    const validation = validatePqReceipt(receipt, sha24);
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.rejection).toBe('PQ_DIGEST_MISMATCH');
  });
});

// ---------------------------------------------------------------------------
// Production remains structurally unreachable (D-4, F-10)
// ---------------------------------------------------------------------------

test.describe('C-11 production connectivity remains impossible', () => {
  test('D-4 holds: production is not a selectable environment', () => {
    expect([...SUPPORTED_ENVIRONMENTS]).toEqual(['local', 'dev', 'next']);
    expect(SUPPORTED_ENVIRONMENTS).not.toContain('production');
  });

  test('config/environments/production.json exists as documentation and remains unloadable', async () => {
    const file = path.join(ROOT, 'config/environments/production.json');
    expect(fs.existsSync(file)).toBe(true);
    const { assertSupportedEnvironment, selectEnvironment } = await import('../../src/core/environment');
    // Rejected by NAME validation, which is what makes it structural rather
    // than a convention: the file cannot be selected, so it cannot be
    // mis-selected.
    expect(() => assertSupportedEnvironment('production')).toThrow();
    expect(() => selectEnvironment('production')).toThrow();
  });

  test('the D-4 decision text is intact', () => {
    const decisions = fs.readFileSync(path.join(ROOT, 'docs/DECISIONS.md'), 'utf8');
    expect(decisions).toContain('## D-4 — Allowlist-only environments; `production.json` documents the rejected surface');
    expect(decisions).toContain('Only `local`, `dev`, `next` are selectable.');
    expect(decisions).toContain('production never becomes');
  });

  test('KNOWN_PRODUCTION_HOSTS remains deny-only and the production cone never imports it', () => {
    expect(KNOWN_PRODUCTION_HOSTS.length).toBeGreaterThan(0);
    // F-10: the deny table must not be reachable from the production policy,
    // because a table meaning "deny" in three modes and "allow" in a fourth is
    // one boolean from catastrophe.
    for (const { file, source } of productionConeSources()) {
      expect(source, `${file} must not reference the deny table`).not.toMatch(/KNOWN_PRODUCTION_HOSTS/);
      expect(source, `${file} must not import safety/hosts`).not.toMatch(/from\s+['"].*safety\/hosts['"]/);
    }
  });

  test('no production host literal is written into the production cone', () => {
    for (const { file, source } of productionConeSources()) {
      for (const host of KNOWN_PRODUCTION_HOSTS) {
        expect(source, `${file} must not contain ${host}`).not.toContain(host);
      }
    }
  });

  test('the production cone contains no network client at all', () => {
    // The kernel DECIDES. It cannot dispatch, so it cannot contact anything
    // even if every gate were bypassed.
    for (const { file, source } of productionConeSources()) {
      for (const pattern of [/require\(['"]node:https?['"]\)/, /from\s+['"]node:https?['"]/, /\bfetch\s*\(/, /new\s+WebSocket/, /node:dns/, /node:net/]) {
        expect(source, `${file} must contain no network client (${String(pattern)})`).not.toMatch(pattern);
      }
    }
  });

  test('the production cone reads no credential or auth state', () => {
    for (const { file, source } of productionConeSources()) {
      for (const pattern of [/storageState/, /NIGHTWATCH_STORAGE_STATE/, /NIGHTWATCH_AUTH_FILE/, /cookie/i, /bearer/i, /authorization:\s*['"]/i]) {
        expect(source, `${file} must not touch credentials (${String(pattern)})`).not.toMatch(pattern);
      }
    }
  });

  test('the production cone does not import the DEV, NEXT or generic real-run decision paths', () => {
    for (const { file, source } of productionConeSources()) {
      for (const pattern of [/realRunGate/, /safety\/canary/, /phase22/, /phase23/, /campaign\/orchestrator/, /environment\/loader/]) {
        expect(source, `${file} must not import ${String(pattern)}`).not.toMatch(pattern);
      }
    }
  });
});
