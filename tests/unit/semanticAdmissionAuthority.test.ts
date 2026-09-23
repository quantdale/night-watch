// ---------------------------------------------------------------------------
// NW-AUD-020 — semantic admission authority (pure core).
//
// The M5 invariant at unit level: NO deliberate product API egress without
// PRE-EFFECT, current, source-proven read authority; timing never grants
// authority; navigation never grants ambient authority; no transport may
// downgrade a denial; receipts never carry concrete path parameters.
// Local/synthetic only.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  ADMISSION_REFUSAL_CODES,
  SEMANTIC_ADMISSION_SCHEMA,
  consumeAdmission,
  evaluateAdmission,
  type AdmissionHandle,
  type AdmissionRequest,
  type AdmissionRuleBinding,
  type AdmissionSnapshot,
  type AdmissionTransport,
} from '../../src/core/safety/semanticAdmission';
import {
  AMBIGUOUS_ATTRIBUTION,
  GenerationRegistry,
} from '../../src/core/safety/causalGenerations';
import { BootstrapExemptionTable } from '../../src/core/safety/bootstrapExemptions';
import { AdmissionTicketLedger } from '../../src/core/safety/admissionTickets';
import type { EndpointSemanticRule } from '../../src/core/safety/endpointSemantics';

const ORIGIN = 'https://api.example.invalid';
const PROOF = 'ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';

function rule(overrides: Partial<EndpointSemanticRule> & Pick<EndpointSemanticRule, 'id' | 'method'>): EndpointSemanticRule {
  return {
    host: 'api.example.invalid',
    classification: 'KNOWN_READ',
    provenance: 'synthetic-fixture',
    path: '/m/ripple/accts',
    ...overrides,
  } as EndpointSemanticRule;
}

const READ_RULE = rule({ id: 'ripple.accts.read', method: 'GET' });
const WRITE_RULE = rule({ id: 'ripple.accts.write', method: 'POST', classification: 'KNOWN_MUTATION' });
const WRITE_ONLY_RULE = rule({ id: 'ripple.orders.write', method: 'POST', classification: 'KNOWN_MUTATION', path: '/m/ripple/orders' });
const PATTERN_RULE: EndpointSemanticRule = {
  id: 'ripple.exchange.read',
  host: 'api.example.invalid',
  method: 'GET',
  pathPattern: '^/m/ripple/v2/payer/exchange_rate/[0-9]{4}-[0-9]{2}$',
  classification: 'KNOWN_READ',
  provenance: 'synthetic-fixture',
};
const UNKNOWN_RULE = rule({ id: 'ripple.legacy.unknown', method: 'GET', path: '/m/ripple/legacy', classification: 'UNKNOWN' });

function binding(bound: EndpointSemanticRule, current = true, proof = PROOF): AdmissionRuleBinding {
  return { rule: bound, sourceProof: proof, sourceCurrent: current };
}

function snapshot(
  registry: GenerationRegistry,
  bindings: readonly AdmissionRuleBinding[],
  bootstrap: BootstrapExemptionTable,
  navigationGeneration: string | null = null,
  environment = 'local',
): AdmissionSnapshot {
  return {
    environment,
    bindings,
    isActiveGeneration: (id) => registry.isActive(id),
    bootstrap,
    navigationGeneration,
  };
}

const NO_BOOTSTRAP = BootstrapExemptionTable.of([]);

function request(
  overrides: Partial<AdmissionRequest> & Pick<AdmissionRequest, 'url'>,
): AdmissionRequest {
  return {
    method: 'GET',
    environment: 'local',
    transport: 'PLAYWRIGHT_ROUTE',
    attribution: { kind: 'NONE' },
    ...overrides,
  };
}

function admitted(decision: ReturnType<typeof evaluateAdmission>): AdmissionHandle {
  if (!decision.admitted) throw new Error(`expected admission, got ${decision.refusal.code}`);
  return decision.handle;
}

function refused(decision: ReturnType<typeof evaluateAdmission>): string {
  return decision.admitted ? `ADMITTED:${decision.handle.ruleId}` : decision.refusal.code;
}

test.describe('NW-AUD-020 semantic admission authority (pure)', () => {
  test('exact proven read is admitted with an immutable identity-bound handle across ALL transports', () => {
    const registry = new GenerationRegistry();
    const gen = registry.open('ACTION');
    const snap = snapshot(registry, [binding(READ_RULE), binding(WRITE_RULE)], NO_BOOTSTRAP);
    const attribution = { kind: 'GENERATION', id: gen.id } as const;
    const transports: AdmissionTransport[] = ['PLAYWRIGHT_ROUTE', 'CDP_FETCH', 'WEBSOCKET', 'API_RELAY', 'L5_PROXY'];
    const handles = transports.map((transport) =>
      admitted(evaluateAdmission(request({ url: `${ORIGIN}/m/ripple/accts`, attribution, transport }), snap)));
    // Identical semantic identity across every layer; only the issuing
    // transport field differs — the SAME decision authorizes everywhere.
    const identities = handles.map((handle) => `${handle.ruleId}|${handle.generationId}|${handle.method}|${handle.routeTemplate}|${handle.sourceProof}|${handle.origin}`);
    expect(new Set(identities).size).toBe(1);
    const firstHandle = handles[0];
    expect(firstHandle).toBeDefined();
    if (firstHandle === undefined) throw new Error('no handle admitted');
    expect(firstHandle.classification).toBe('PROVEN_READ');
    expect(firstHandle.schemaVersion).toBe(SEMANTIC_ADMISSION_SCHEMA);
    expect(Object.isFrozen(firstHandle)).toBe(true);
    // Pattern rules persist the categorical marker, never a concrete parameter.
    const patternHandle = admitted(evaluateAdmission(
      request({ url: `${ORIGIN}/m/ripple/v2/payer/exchange_rate/2026-08`, attribution, transport: 'CDP_FETCH' }),
      snapshot(registry, [binding(PATTERN_RULE)], NO_BOOTSTRAP),
    ));
    expect(patternHandle.routeTemplate).toMatch(/^<RULE:[A-Za-z0-9._:-]{1,120}>$/);
    expect(patternHandle.routeTemplate).not.toContain('2026-08');
  });

  test('every non-admitted outcome is a closed categorical refusal', () => {
    const registry = new GenerationRegistry();
    const gen = registry.open('ACTION');
    const live = { kind: 'GENERATION', id: gen.id } as const;
    const snap = snapshot(registry, [
      binding(READ_RULE), binding(WRITE_RULE), binding(WRITE_ONLY_RULE),
      binding(PATTERN_RULE), binding(UNKNOWN_RULE),
      binding(rule({ id: 'stale.read', method: 'GET', path: '/m/ripple/stale' }), false),
      binding(rule({ id: 'proofless.read', method: 'GET', path: '/m/ripple/proofless' }), true, ''),
    ], NO_BOOTSTRAP);

    const matrix: Array<[string, AdmissionRequest, string]> = [
      ['unknown route / no bootstrap', request({ url: `${ORIGIN}/m/ripple/passive-bootstrap`, attribution: live }), 'ADMISSION_BOOTSTRAP_UNREGISTERED'],
      ['known mutation rule', request({ method: 'POST', url: `${ORIGIN}/m/ripple/accts`, attribution: live }), 'ADMISSION_MUTATION'],
      ['method drift into write-only route', request({ url: `${ORIGIN}/m/ripple/orders`, attribution: live }), 'ADMISSION_MUTATION'],
      ['method drift on a read-only family (no mutation twin)', request({ method: 'HEAD', url: `${ORIGIN}/m/ripple/v2/payer/exchange_rate/2026-08`, attribution: live }), 'ADMISSION_METHOD_MISMATCH'],
      ['stale proof', request({ url: `${ORIGIN}/m/ripple/stale`, attribution: live }), 'ADMISSION_STALE_PROOF'],
      ['missing proof', request({ url: `${ORIGIN}/m/ripple/proofless`, attribution: live }), 'ADMISSION_MISSING_PROOF'],
      ['unclassified rule', request({ url: `${ORIGIN}/m/ripple/legacy`, attribution: live }), 'ADMISSION_UNKNOWN'],
      ['environment mismatch', request({ url: `${ORIGIN}/m/ripple/accts`, attribution: live, environment: 'dev' }), 'ADMISSION_ENVIRONMENT_MISMATCH'],
      ['unbound generation', request({ url: `${ORIGIN}/m/ripple/accts` }), 'ADMISSION_UNBOUND_GENERATION'],
      ['ambiguous generation', request({ url: `${ORIGIN}/m/ripple/accts`, attribution: { kind: AMBIGUOUS_ATTRIBUTION, candidates: ['gen:000001', 'gen:000002'] } }), 'ADMISSION_AMBIGUOUS'],
      ['closed generation', request({ url: `${ORIGIN}/m/ripple/accts`, attribution: { kind: 'GENERATION', id: 'gen:999999' } }), 'ADMISSION_GENERATION_CLOSED'],
      ['unparseable url', request({ url: 'not a url', attribution: live }), 'ADMISSION_UNPARSEABLE'],
    ];
    const seen = new Set<string>();
    for (const [label, req, expected] of matrix) {
      const code = refused(evaluateAdmission(req, snap));
      expect(code, label).toBe(expected);
      expect(ADMISSION_REFUSAL_CODES, label).toContain(code);
      seen.add(code);
    }
    // 12 scenarios over 11 distinct codes: two distinct paths reach
    // ADMISSION_MUTATION (an exact mutation rule, and method drift into a
    // route with a mutation twin) — both are required scenarios.
    expect(matrix).toHaveLength(12);
    expect(seen.size).toBe(11);
    // Closed generation reached via an OPEN-but-settled registry entry too.
    const reg2 = new GenerationRegistry();
    const g2 = reg2.open('ACTION');
    reg2.settle(g2.id);
    expect(refused(evaluateAdmission(
      request({ url: `${ORIGIN}/m/ripple/accts`, attribution: { kind: 'GENERATION', id: g2.id } }),
      snapshot(reg2, [binding(READ_RULE)], NO_BOOTSTRAP),
    ))).toBe('ADMISSION_GENERATION_CLOSED');
  });

  test('refusal receipts and handles never carry concrete path parameters or queries', () => {
    const registry = new GenerationRegistry();
    const gen = registry.open('ACTION');
    const live = { kind: 'GENERATION', id: gen.id } as const;
    const snap = snapshot(registry, [binding(READ_RULE)], NO_BOOTSTRAP);
    const refusedDecision = evaluateAdmission(
      request({ method: 'POST', url: `${ORIGIN}/m/ripple/accts?customer=ordinarycustomerid`, attribution: live }),
      snap,
    );
    expect(refusedDecision.admitted).toBe(false);
    if (!refusedDecision.admitted) {
      const receiptText = JSON.stringify(refusedDecision.refusal);
      expect(receiptText).not.toContain('/m/ripple/accts');
      expect(receiptText).not.toContain('customer');
      expect(receiptText).toContain(ORIGIN);
      expect(refusedDecision.refusal.transport).toBe('PLAYWRIGHT_ROUTE');
    }
  });

  test('timing alone never determines authority: 249/250/251 ms then deterministic settlement', async () => {
    const registry = new GenerationRegistry();
    const snap = snapshot(registry, [binding(READ_RULE)], NO_BOOTSTRAP);
    const gen = registry.open('ACTION');
    const attribution = { kind: 'GENERATION', id: gen.id } as const;
    const req = request({ url: `${ORIGIN}/m/ripple/accts`, attribution });
    const verdict = () => refused(evaluateAdmission(req, snap));

    expect(verdict()).toBe('ADMITTED:ripple.accts.read');
    await new Promise((resolve) => setTimeout(resolve, 249));
    expect(verdict()).toBe('ADMITTED:ripple.accts.read');
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(verdict()).toBe('ADMITTED:ripple.accts.read');
    await new Promise((resolve) => setTimeout(resolve, 1));
    // 251 ms elapsed: still authoritative — the timer is NOT the boundary.
    expect(verdict()).toBe('ADMITTED:ripple.accts.read');
    expect(registry.isActive(gen.id)).toBe(true);

    // Deterministic settlement ends authority immediately, at any elapsed time;
    // a second settle is idempotent and unknown ids fail closed.
    registry.settle(gen.id);
    expect(verdict()).toBe('ADMISSION_GENERATION_CLOSED');
    registry.settle(gen.id);
    expect(registry.isActive(gen.id)).toBe(false);
    expect(() => registry.settle('gen:404404')).toThrow('GENERATION_UNKNOWN');

    // The reverse proof: a generation that was never open is closed at t=0.
    const fresh = new GenerationRegistry();
    expect(refused(evaluateAdmission(request({ url: `${ORIGIN}/m/ripple/accts`, attribution: { kind: 'GENERATION', id: 'gen:000001' } }), snapshot(fresh, [binding(READ_RULE)], NO_BOOTSTRAP))))
      .toBe('ADMISSION_GENERATION_CLOSED');
  });

  test('cross-generation confusion: neither generation can consume the other, ambiguity refuses', () => {
    const registry = new GenerationRegistry();
    const action = registry.open('ACTION');
    const navigation = registry.open('NAVIGATION');
    expect(action.id).not.toBe(navigation.id);
    const snap = snapshot(registry, [binding(READ_RULE)], NO_BOOTSTRAP);

    // Explicit attribution binds ONE generation.
    const actionHandle = admitted(evaluateAdmission(
      request({ url: `${ORIGIN}/m/ripple/accts`, attribution: { kind: 'GENERATION', id: action.id } }), snap));
    expect(actionHandle.generationId).toBe(action.id);
    const navHandle = admitted(evaluateAdmission(
      request({ url: `${ORIGIN}/m/ripple/accts`, attribution: { kind: 'GENERATION', id: navigation.id } }), snap));
    expect(navHandle.generationId).toBe(navigation.id);
    expect(navHandle.generationId).not.toBe(actionHandle.generationId);

    // Implicit attribution with two live generations is ambiguous -> refuse
    // (route equality never proves generation ownership).
    expect(refused(evaluateAdmission(request({ url: `${ORIGIN}/m/ripple/accts`, attribution: registry.attributeImplicit() }), snap)))
      .toBe('ADMISSION_AMBIGUOUS');

    // Presenting A's handle while the request is attributed to B disagrees.
    const crossLayer = consumeAdmission(actionHandle,
      request({ url: `${ORIGIN}/m/ripple/accts`, attribution: { kind: 'GENERATION', id: navigation.id }, transport: 'CDP_FETCH' }), snap);
    expect(crossLayer.admitted).toBe(false);
    if (!crossLayer.admitted) expect(crossLayer.refusal.code).toBe('ADMISSION_TRANSPORT_DISAGREEMENT');

    // Reuse after A's closure fails (stale handle), B's own authority intact.
    registry.settle(action.id);
    expect(refused(evaluateAdmission(
      request({ url: `${ORIGIN}/m/ripple/accts`, attribution: { kind: 'GENERATION', id: action.id } }), snap)))
      .toBe('ADMISSION_GENERATION_CLOSED');
    expect(evaluateAdmission(
      request({ url: `${ORIGIN}/m/ripple/accts`, attribution: { kind: 'GENERATION', id: navigation.id } }), snap).admitted)
      .toBe(true);
  });

  test('bootstrap exemptions are finite, navigation-scoped, exact, and proven', () => {
    const registry = new GenerationRegistry();
    const nav = registry.open('NAVIGATION');
    const table = BootstrapExemptionTable.of([{
      id: 'bootstrap.invoices',
      environment: 'local',
      origin: ORIGIN,
      method: 'GET',
      routePattern: '^/api/invoices$',
      sourceProof: PROOF,
      sourceCurrent: true,
      maxCountPerNavigation: 2,
    }]);
    const snap = snapshot(registry, [binding(READ_RULE)], table, nav.id);
    const bootstrapRequest = request({
      url: `${ORIGIN}/api/invoices`,
      attribution: { kind: 'GENERATION', id: nav.id },
    });
    // Consumes 1 and 2 of the per-navigation budget.
    expect(evaluateAdmission(bootstrapRequest, snap).admitted).toBe(true);
    expect(evaluateAdmission(bootstrapRequest, snap).admitted).toBe(true);
    // Budget of 2 exhausted on the third attempt within one navigation.
    const third = evaluateAdmission(bootstrapRequest, snap);
    expect(third.admitted).toBe(false);
    if (!third.admitted) expect(third.refusal.code).toBe('ADMISSION_BOOTSTRAP_EXHAUSTED');

    // A NEW navigation generation receives a fresh (still bounded) budget.
    const nav2 = registry.open('NAVIGATION');
    const snap2 = snapshot(registry, [binding(READ_RULE)], table, nav2.id);
    expect(evaluateAdmission(request({ url: `${ORIGIN}/api/invoices`, attribution: { kind: 'GENERATION', id: nav2.id } }), snap2).admitted).toBe(true);

    // Route drift inside the registered family (same origin+method, unknown
    // path) is MISMATCH; a different origin is outside every family
    // (UNREGISTERED); without a navigation generation, nothing consumes.
    expect(refused(evaluateAdmission(request({ url: `${ORIGIN}/m/ripple/other`, attribution: { kind: 'GENERATION', id: nav2.id } }), snap2)))
      .toBe('ADMISSION_BOOTSTRAP_MISMATCH');
    expect(refused(evaluateAdmission(request({ url: 'https://other.example.invalid/api/x', attribution: { kind: 'GENERATION', id: nav2.id } }), snap2)))
      .toBe('ADMISSION_BOOTSTRAP_UNREGISTERED');
    const noNavSnap = snapshot(registry, [binding(READ_RULE)], table, null);
    expect(refused(evaluateAdmission(request({ url: `${ORIGIN}/api/invoices`, attribution: { kind: 'GENERATION', id: nav2.id } }), noNavSnap)))
      .toBe('ADMISSION_BOOTSTRAP_UNREGISTERED');

    // Stale proof never grants bootstrap.
    const staleTable = BootstrapExemptionTable.of([{
      id: 'bootstrap.stale',
      environment: 'local',
      origin: ORIGIN,
      method: 'GET',
      routePattern: '^/api/stale$',
      sourceProof: PROOF,
      sourceCurrent: false,
      maxCountPerNavigation: 1,
    }]);
    expect(refused(evaluateAdmission(
      request({ url: `${ORIGIN}/api/stale`, attribution: { kind: 'GENERATION', id: nav2.id } }),
      snapshot(registry, [], staleTable, nav2.id))))
      .toBe('ADMISSION_BOOTSTRAP_STALE');

    // Registration hygiene fails closed at build time.
    expect(() => BootstrapExemptionTable.of([{
      id: 'bootstrap.write', environment: 'local', origin: ORIGIN, method: 'POST',
      routePattern: '^/api/x$', sourceProof: PROOF, sourceCurrent: true, maxCountPerNavigation: 1,
    }])).toThrow('BOOTSTRAP_EXEMPTION_METHOD_NOT_READ_ONLY');
    expect(() => BootstrapExemptionTable.of([{
      id: 'bootstrap.unanchored', environment: 'local', origin: ORIGIN, method: 'GET',
      routePattern: '/api/x', sourceProof: PROOF, sourceCurrent: true, maxCountPerNavigation: 1,
    }])).toThrow('BOOTSTRAP_EXEMPTION_PATTERN_UNANCHORED');
  });

  test('a stale or divergent snapshot fails closed as TRANSPORT_DISAGREEMENT (no layer downgrade)', () => {
    const registry = new GenerationRegistry();
    const gen = registry.open('ACTION');
    const live = { kind: 'GENERATION', id: gen.id } as const;
    const issued = admitted(evaluateAdmission(
      request({ url: `${ORIGIN}/m/ripple/accts`, attribution: live, transport: 'PLAYWRIGHT_ROUTE' }),
      snapshot(registry, [binding(READ_RULE)], NO_BOOTSTRAP)));

    // Same snapshot: recomputation at another layer agrees and re-stamps.
    const agree = consumeAdmission(issued,
      request({ url: `${ORIGIN}/m/ripple/accts`, attribution: live, transport: 'CDP_FETCH' }),
      snapshot(registry, [binding(READ_RULE)], NO_BOOTSTRAP));
    expect(agree.admitted).toBe(true);
    if (agree.admitted) expect(agree.handle.transport).toBe('CDP_FETCH');

    // Frozen snapshot has CHANGED (stale registry): the held handle can no
    // longer be reproduced => hard disagreement, never a host-only allow.
    const diverged = consumeAdmission(issued,
      request({ url: `${ORIGIN}/m/ripple/accts`, attribution: live, transport: 'L5_PROXY' }),
      snapshot(registry, [], NO_BOOTSTRAP));
    expect(diverged.admitted).toBe(false);
    if (!diverged.admitted) expect(diverged.refusal.code).toBe('ADMISSION_TRANSPORT_DISAGREEMENT');
  });

  test('generation budget: runaway openers fail closed', () => {
    const registry = new GenerationRegistry();
    for (let i = 0; i < 16; i += 1) registry.open(i % 2 === 0 ? 'ACTION' : 'NAVIGATION');
    expect(() => registry.open('NAVIGATION')).toThrow('GENERATION_BUDGET_EXCEEDED');
  });
});

test.describe('NW-AUD-020 WebSocket semantic admission (pure)', () => {
  const WS_ORIGIN = 'ws://api.example.invalid';
  const WS_URL = `${WS_ORIGIN}/socket/stream`;
  const WS_RULE: EndpointSemanticRule = {
    id: 'ripple.streaming.upgrade',
    host: 'api.example.invalid',
    method: 'WS',
    pathPattern: '^/socket/stream$',
    classification: 'KNOWN_READ',
    provenance: 'synthetic-fixture',
  };
  const HTTP_RULE_ON_SAME_PATH: EndpointSemanticRule = {
    id: 'ripple.streaming.http',
    host: 'api.example.invalid',
    method: 'GET',
    pathPattern: '^/socket/stream$',
    classification: 'KNOWN_READ',
    provenance: 'synthetic-fixture',
  };
  const wsBinding = { rule: WS_RULE, sourceProof: PROOF, sourceCurrent: true };
  const wsRequest = (overrides: Partial<AdmissionRequest> = {}): AdmissionRequest => request({
    url: WS_URL,
    method: 'WS',
    transport: 'WEBSOCKET',
    ...overrides,
  });

  test('a proven WS rule + active generation admits; the handle binds method WS and the categorical template', () => {
    const registry = new GenerationRegistry();
    const gen = registry.open('NAVIGATION');
    const snap = snapshot(registry, [wsBinding], NO_BOOTSTRAP);
    const decision = evaluateAdmission(
      wsRequest({ attribution: { kind: 'GENERATION', id: gen.id } }),
      snap,
    );
    expect(decision.admitted).toBe(true);
    if (decision.admitted) {
      expect(decision.handle.method).toBe('WS');
      expect(decision.handle.classification).toBe('PROVEN_READ');
      expect(decision.handle.routeTemplate).toBe('<RULE:ripple.streaming.upgrade>');
      expect(decision.handle.transport).toBe('WEBSOCKET');
      expect(decision.handle.origin).toBe(WS_ORIGIN);
      expect(JSON.stringify(decision.handle)).not.toContain('/socket/stream');
    }
  });

  test('WS refusals are categorical: unknown, HTTP-rule method drift, closed generation, stale proof — and HTTP exemptions can never cover WS', () => {
    const matrix: Array<[string, () => ReturnType<typeof evaluateAdmission>, string]> = [
      // Unknown WS: no bindings. An HTTP exemption can NEVER cover it —
      // its origin is http(s), the socket origin is ws(s), and its method
      // is GET/HEAD-only.
      ['unknown ws vs http exemption', () => {
        const registry = new GenerationRegistry();
        const nav = registry.open('NAVIGATION');
        const httpExemption = BootstrapExemptionTable.of([{
          id: 'http.stream.exemption',
          environment: 'local',
          origin: 'https://api.example.invalid',
          method: 'GET',
          routePattern: '^/socket/stream$',
          sourceProof: PROOF,
          sourceCurrent: true,
          maxCountPerNavigation: 4,
        }]);
        return evaluateAdmission(
          wsRequest({ attribution: { kind: 'GENERATION', id: nav.id } }),
          snapshot(registry, [], httpExemption),
        );
      }, 'ADMISSION_BOOTSTRAP_UNREGISTERED'],
      // An HTTP rule on the SAME path is method drift for a socket.
      ['http rule, ws method', () => {
        const registry = new GenerationRegistry();
        const gen = registry.open('ACTION');
        return evaluateAdmission(
          wsRequest({ attribution: { kind: 'GENERATION', id: gen.id } }),
          snapshot(registry, [{ rule: HTTP_RULE_ON_SAME_PATH, sourceProof: PROOF, sourceCurrent: true }], NO_BOOTSTRAP),
        );
      }, 'ADMISSION_METHOD_MISMATCH'],
      ['closed generation', () => {
        const registry = new GenerationRegistry();
        const gen = registry.open('ACTION');
        registry.settle(gen.id);
        return evaluateAdmission(
          wsRequest({ attribution: { kind: 'GENERATION', id: gen.id } }),
          snapshot(registry, [wsBinding], NO_BOOTSTRAP),
        );
      }, 'ADMISSION_GENERATION_CLOSED'],
      ['stale proof', () => {
        const registry = new GenerationRegistry();
        const gen = registry.open('ACTION');
        return evaluateAdmission(
          wsRequest({ attribution: { kind: 'GENERATION', id: gen.id } }),
          snapshot(registry, [{ rule: WS_RULE, sourceProof: PROOF, sourceCurrent: false }], NO_BOOTSTRAP),
        );
      }, 'ADMISSION_STALE_PROOF'],
      ['unbound generation', () => {
        const registry = new GenerationRegistry();
        return evaluateAdmission(wsRequest(), snapshot(registry, [wsBinding], NO_BOOTSTRAP));
      }, 'ADMISSION_UNBOUND_GENERATION'],
    ];
    for (const [label, run, expected] of matrix) {
      const decision = run();
      expect(decision.admitted, label).toBe(false);
      if (!decision.admitted) {
        expect(decision.refusal.code, label).toBe(expected);
        expect(decision.refusal.transport, label).toBe('WEBSOCKET');
        const receiptText = JSON.stringify(decision.refusal);
        expect(receiptText, label).not.toContain('/socket/');
        // Rule IDs are bounded proven identifiers and MAY appear; concrete
        // path material may not.
        expect(receiptText, label).not.toContain('socket/stream');
      }
    }
  });
});

test.describe('NW-AUD-020 bounded admission tickets (L5 currency)', () => {
  const ticket = (overrides: Partial<Parameters<AdmissionTicketLedger['mint']>[0]> = {}) => ({
    environment: 'local',
    origin: 'http://api.example.invalid:8443',
    method: 'GET',
    matchPattern: '/v1/costs',
    ruleId: 'synthetic.read',
    sourceProof: 'synthetic-fixture',
    generationId: 'gen:000001',
    transport: 'PLAYWRIGHT_ROUTE',
    ...overrides,
  });
  const ask = { origin: 'http://api.example.invalid:8443', method: 'get', pathname: '/v1/costs' };

  test('one-shot consumption: exact origin + normalized method + proven pattern; replay and mismatches refuse', () => {
    const ledger = new AdmissionTicketLedger();
    ledger.mint(ticket());
    expect(ledger.consume(ask)).toEqual({ admitted: true });
    // Replay: the consumed ticket can never authorize a second effect.
    expect(ledger.consume(ask)).toEqual({ admitted: false, code: 'PROXY_ADMISSION_TICKET_MISSING' });
    ledger.mint(ticket());
    expect(ledger.consume({ ...ask, origin: 'http://api.example.invalid' })).toEqual({ admitted: false, code: 'PROXY_ADMISSION_TICKET_MISSING' });
    expect(ledger.consume({ ...ask, method: 'POST' })).toEqual({ admitted: false, code: 'PROXY_ADMISSION_TICKET_MISSING' });
    expect(ledger.consume({ ...ask, pathname: '/v1/other' })).toEqual({ admitted: false, code: 'PROXY_ADMISSION_TICKET_MISSING' });
  });

  test('pattern tickets use anchored proven regexes; unsafe registration fails closed', () => {
    const ledger = new AdmissionTicketLedger();
    ledger.mint(ticket({ matchPattern: '^/v1/items/[0-9]+$' }));
    expect(ledger.consume({ ...ask, pathname: '/v1/items/42' })).toEqual({ admitted: true });
    expect(ledger.consume({ ...ask, pathname: '/v1/items/../../etc' })).toEqual({ admitted: false, code: 'PROXY_ADMISSION_TICKET_MISSING' });
    // Regex form must be fully anchored; exact-path forms are literal
    // membership (anchoring is meaningless for them).
    expect(() => ledger.mint(ticket({ matchPattern: '^/v1/items/[0-9]+' }))).toThrow('ADMISSION_TICKET_PATTERN_UNANCHORED');
    expect(() => ledger.mint(ticket({ matchPattern: '/v1/query?x' }))).toThrow('ADMISSION_TICKET_PATTERN_UNSAFE');
  });

  test('tunnels require pre-established per-host capability with a cardinality budget; reset clears everything', () => {
    const ledger = new AdmissionTicketLedger();
    expect(ledger.authorizeTunnel('api.example.invalid')).toEqual({ admitted: false, code: 'PROXY_TUNNEL_CAPABILITY_MISSING' });
    ledger.mint(ticket());
    expect(ledger.authorizeTunnel('api.example.invalid')).toEqual({ admitted: true });
    // Presence is per-host: a ticket for one host never authorizes another.
    expect(ledger.authorizeTunnel('other.host.invalid')).toEqual({ admitted: false, code: 'PROXY_TUNNEL_CAPABILITY_MISSING' });
    for (let i = 0; i < 7; i += 1) expect(ledger.authorizeTunnel('api.example.invalid')).toEqual({ admitted: true });
    expect(ledger.authorizeTunnel('api.example.invalid')).toEqual({ admitted: false, code: 'PROXY_TUNNEL_BUDGET_EXCEEDED' });
    ledger.reset();
    expect(ledger.totalCount).toBe(0);
    expect(ledger.unconsumedCount).toBe(0);
    expect(ledger.authorizeTunnel('api.example.invalid')).toEqual({ admitted: false, code: 'PROXY_TUNNEL_CAPABILITY_MISSING' });
  });
});
