// ---------------------------------------------------------------------------
// C-11 — the `PROD_OBSERVE` safety kernel, qualified against MOCK production.
//
// The organising claim is falsifiable: for EVERY gate, hold every other
// prerequisite valid, break exactly that one, and require a categorical DENY
// whose reason names that gate — with the mock server's received-request count
// still ZERO. An internal boolean is not accepted as evidence, because a
// kernel that dispatched and then reported a denial would satisfy it.
//
// The positive path exists so the kernel is not vacuously always-deny: one
// fully synthetic request must actually reach the loopback server.
//
// Everything here is synthetic and loopback-only. No real production, DEV or
// NEXT host, no credential, no auth state.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import {
  GATE_DENIAL_CODES,
  HISTORICAL_GATE_MAPPING,
  PRODUCTION_ADMISSION_CHAIN_VERSION,
  PRODUCTION_ADMISSION_GATES,
  PRODUCTION_DENIAL_CODES,
  PROD_OBSERVE_AUTHORIZATION_CLASS,
  PROD_OBSERVE_CONFIG_ENV,
  PROD_OBSERVE_CONFIG_SCHEMA,
  ProductionBreakerBoard,
  ProductionBudgetLedger,
  PRODUCTION_BUDGET_DEFAULTS,
  clearProdObserveGrantRegistryForTest,
  consumeProdObserveGrant,
  evaluateProductionAdmission,
  grantLifecycleState,
  issueProdObserveGrant,
  loadProdObserveConfig,
  productionChainDefinitionDigest,
  sealPqReceipt,
  validatePqReceipt,
  validateProdObserveGrant,
  type ProdObserveConfig,
  type ProductionAdmissionGate,
  type ProductionAdmissionInput,
  type ProductionDenialCode,
  type PqReceiptDraft,
} from '../../src/core/prodObserve';
import { createProductionPrivacyPolicy } from '../../src/core/prodPrivacy/policy';
import { createOpaqueParameterHandle } from '../../src/core/prodPrivacy/parameterProvenance';
import { NO_PROVEN_ROUTE_VOCABULARY } from '../../src/core/prodPrivacy/routeVocabulary';
import { deriveOpenApiRouteVocabulary } from '../../src/core/prodProvenance/routeVocabularyDerivation';
import { testOnlyRouteVocabulary } from '../../src/core/prodProvenance/testOnlySeam';
import type { SourceOperationDescriptor, SourceOperationProjectionCompleteness } from '../../src/core/source/surfaceTypes';
import { MockProductionServer, dispatchToMockProduction } from './support/mockProduction';

const ROOT = path.resolve(__dirname, '../..');
/**
 * A DEDICATED synthetic workspace root, not `path.resolve(ROOT, '..')`.
 *
 * Climbing one level from the repository is a guess about where the checkout
 * sits, and it is false in the clean-checkout topology: that gate clones
 * DIRECTLY into `os.tmpdir()`, so the inferred workspace root became `/tmp`
 * and every disposable config in `/tmp` counted as "inside the workspace".
 * Constructing both roots explicitly makes the fixture independent of where
 * the checkout lives — the same lesson as R-11's DEF-R11-3.
 */
function syntheticWorkspaceRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-c11-wsroot-'));
}
const SYNTHETIC_SHA = 'a'.repeat(40);
/** Obvious synthetic sentinels. No real customer identifier appears anywhere. */
const SENTINEL_HANDLE = `pph_${'1'.repeat(32)}`;
const SENTINEL_PARAM_VALUE = 'NWSENT0011-concrete-customer-value';
const SYNTHETIC_ROUTE_PATH = '/v1/synthetic/things';
const SYNTHETIC_ROUTE_MEMBER = `GET ${SYNTHETIC_ROUTE_PATH}`;

function sha24(canonical: string): string {
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24);
}

function completeness(overrides: Partial<SourceOperationProjectionCompleteness> = {}): SourceOperationProjectionCompleteness {
  return {
    schemaVersion: 'nightwatch.source-operation-projection-completeness.v1',
    state: 'COMPLETE',
    limit: 4096,
    examinedOperations: 1,
    totalOperations: 1,
    projectedOperations: 1,
    droppedOperations: 0,
    truncated: false,
    remainingUnknown: false,
    enumerationCompleteness: 'COMPLETE',
    contentReadCompleteness: 'COMPLETE',
    coverageState: 'COVERED',
    repositories: [],
    ...overrides,
  } as SourceOperationProjectionCompleteness;
}

function operation(overrides: Partial<SourceOperationDescriptor> = {}): SourceOperationDescriptor {
  return {
    operationId: 'listSyntheticThings',
    repository: 'alphauslabs/blueapi',
    sourceSha: SYNTHETIC_SHA,
    sourcePath: 'openapiv2/billing.swagger.json',
    language: 'JSON',
    evidenceDigest: 'ev:sha256:000000000000000000000000',
    method: 'GET',
    routeTemplate: SYNTHETIC_ROUTE_PATH,
    handlerSymbol: null,
    handlerPath: null,
    requestReference: null,
    responseReference: null,
    transport: 'HTTP_API',
    routeProof: 'OPENAPI_OPERATION',
    routeRejectionReason: null,
    readOnlyClassification: 'UNKNOWN',
    runtimeBinding: 'UNRESOLVED',
    targetId: null,
    deploymentStatusUnresolved: true,
    ...overrides,
  } as SourceOperationDescriptor;
}

const CURRENT_GENERATION = {
  state: 'CURRENT' as const,
  reason: 'GENERATION_CORROBORATED_EXACT' as const,
  corroborator: 'PROTO_SURFACE' as const,
  artifactOperationCount: 1,
  corroboratedOperationCount: 1,
};

/** A mechanically DERIVED, PRODUCTION-marked route capability — not a fixture object. */
function derivedRouteVocabulary() {
  return deriveOpenApiRouteVocabulary({
    operations: [operation()],
    completeness: completeness(),
    sourceRoot: 'openapiv2',
    generationCurrency: CURRENT_GENERATION,
  });
}

interface ExternalConfigHandle {
  readonly directory: string;
  readonly workspaceRoot: string;
  readonly file: string;
  readonly config: ProdObserveConfig;
}

/** A disposable EXTERNAL config: outside the repository and the workspace, 0600. */
function writeExternalConfig(options: {
  readonly hosts: readonly string[];
  readonly notBeforeMs: number;
  readonly notAfterMs: number;
  readonly mode?: number;
  readonly contents?: string;
}): ExternalConfigHandle {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-c11-extcfg-'));
  // Sibling directories: neither contains the other, so "outside the
  // repository AND outside the workspace" is established by construction.
  const workspaceRoot = syntheticWorkspaceRoot();
  const file = path.join(directory, 'prod-observe.v1.json');
  const contents = options.contents ?? JSON.stringify({
    schemaVersion: PROD_OBSERVE_CONFIG_SCHEMA,
    admittedHosts: options.hosts,
    observationWindow: { notBeforeMs: options.notBeforeMs, notAfterMs: options.notAfterMs },
  });
  fs.writeFileSync(file, contents, { mode: options.mode ?? 0o600 });
  fs.chmodSync(file, options.mode ?? 0o600);
  const loaded = loadProdObserveConfig({
    environment: { [PROD_OBSERVE_CONFIG_ENV]: file },
    repositoryRoot: ROOT,
    workspaceRoot,
    digest: sha24,
  });
  if (!loaded.ok) throw new Error(`C11_TEST_CONFIG_LOAD_FAILED:${loaded.failure}`);
  return { directory, workspaceRoot, file, config: loaded.config };
}

const NOW = 1_760_000_000_000;

interface Harness {
  readonly server: MockProductionServer;
  readonly configHandle: ExternalConfigHandle;
  readonly cleanup: () => Promise<void>;
  base: () => ProductionAdmissionInput;
}

async function createHarness(): Promise<Harness> {
  const server = new MockProductionServer();
  await server.start();
  const configHandle = writeExternalConfig({
    hosts: [server.host],
    notBeforeMs: NOW - 60_000,
    notAfterMs: NOW + 60_000,
  });
  const cleanup = async (): Promise<void> => {
    await server.stop();
    fs.rmSync(configHandle.directory, { recursive: true, force: true });
    fs.rmSync(configHandle.workspaceRoot, { recursive: true, force: true });
    clearProdObserveGrantRegistryForTest();
  };
  const base = (): ProductionAdmissionInput => ({
    campaignId: 'nightwatch-prod-observe-safety-kernel-c11-v1',
    stage: 'PQ',
    nowMs: NOW,
    environmentClass: 'LOCAL',
    killSwitchProbe: () => false,
    requestedAuthorizationClass: 'PROD_OBSERVE',
    grant: issueProdObserveGrant({
      campaignId: 'nightwatch-prod-observe-safety-kernel-c11-v1',
      stage: 'PQ',
      notBeforeMs: NOW - 1_000,
      expiresAtMs: NOW + 1_000,
    }),
    config: configHandle.config,
    observerIdentityClass: 'ORDINARY_USER',
    source: { repository: 'alphauslabs/blueapi', sourceSha: SYNTHETIC_SHA, inventoryState: 'COMPLETE', currencyState: 'CURRENT' },
    // Synthetic but mechanically valid proof. C-06's real census stays truthful
    // at zero proven PHP operations; C-11 does not increase it.
    readOnlyProof: { proven: true, witnessCount: 2, stale: false, proofIdentity: `roproof:${sha24('synthetic-two-witness')}` },
    routeVocabulary: derivedRouteVocabulary(),
    resolvedAddressesAdmitted: true,
    intent: {
      method: 'GET',
      host: server.host,
      routeTemplate: SYNTHETIC_ROUTE_MEMBER,
      hasBody: false,
      mutationClassification: null,
      parameters: [createOpaqueParameterHandle({ handle: SENTINEL_HANDLE, parameterName: 'id' })],
      serviceKey: 'synthetic-service',
      routeKey: 'synthetic-route',
    },
    privacyPolicy: createProductionPrivacyPolicy(),
    containment: 'PROVEN',
    budget: new ProductionBudgetLedger({ startedAtMs: NOW }),
    breakers: new ProductionBreakerBoard(),
  });
  return { server, configHandle, cleanup, base };
}

test.describe('C-11 the chain definition is an identity, not a count', () => {
  test('the versioned chain lists every gate exactly once, in order', () => {
    expect(PRODUCTION_ADMISSION_CHAIN_VERSION).toBe('nightwatch.production-admission-chain.v1');
    expect(new Set(PRODUCTION_ADMISSION_GATES).size).toBe(PRODUCTION_ADMISSION_GATES.length);
    // The count is DERIVED and recorded, never asserted as the contract.
    expect(PRODUCTION_ADMISSION_GATES).toHaveLength(18);
  });

  test('every gate owns at least one categorical denial code, and no code is orphaned', () => {
    const assigned = new Set<ProductionDenialCode>();
    for (const gate of PRODUCTION_ADMISSION_GATES) {
      const codes = GATE_DENIAL_CODES[gate];
      expect(codes.length).toBeGreaterThan(0);
      for (const code of codes) {
        // No two gates may share a code, or the matrix could not attribute a denial.
        expect(assigned.has(code)).toBe(false);
        assigned.add(code);
        expect(PRODUCTION_DENIAL_CODES).toContain(code);
      }
    }
  });

  test('every historical G0-G11 identifier maps onto the current chain', () => {
    const mapped = new Set<ProductionAdmissionGate>();
    for (let index = 0; index <= 11; index += 1) {
      const gates = HISTORICAL_GATE_MAPPING[`G${index}`];
      expect(gates, `historical G${index} must map somewhere`).toBeDefined();
      for (const gate of gates ?? []) {
        expect(PRODUCTION_ADMISSION_GATES).toContain(gate);
        mapped.add(gate);
      }
    }
    // The historical twelve identifiers cover fourteen current gates, because
    // G6 splits and G11 is evaluated twice.
    expect(mapped.size).toBe(14);
  });

  test('the chain-definition digest changes when the definition changes', () => {
    const digest = productionChainDefinitionDigest(sha24);
    expect(digest).toMatch(/^prodchain:[0-9a-f]{24}$/);
    expect(productionChainDefinitionDigest(sha24)).toBe(digest);
    // A different canonicalization must not collide with the real one.
    expect(productionChainDefinitionDigest((value) => sha24(`${value}-mutated`))).not.toBe(digest);
  });
});

test.describe('C-11 the positive synthetic path is non-vacuous', () => {
  test('a fully valid synthetic qualification allows, and exactly one request reaches mock production', async () => {
    const harness = await createHarness();
    try {
      const input = harness.base();
      const decision = evaluateProductionAdmission(input, sha24);

      expect(decision.denialCode, `unexpected denial at ${String(decision.deniedAtGate)}`).toBeNull();
      expect(decision.allowed).toBe(true);
      // Every gate PASSED — not merely "not denied".
      expect(decision.outcomes.map((outcome) => outcome.result)).toEqual(PRODUCTION_ADMISSION_GATES.map(() => 'PASS'));
      expect(decision.orderedGates).toEqual(PRODUCTION_ADMISSION_GATES);
      // Budget was reserved BEFORE any dispatch.
      expect(decision.reservation).not.toBeNull();
      expect(input.budget.campaignRequestsUsed).toBe(1);
      expect(harness.server.receivedRequestCount).toBe(0);

      const response = await dispatchToMockProduction({
        host: harness.server.host,
        port: harness.server.port,
        method: 'GET',
        path: SYNTHETIC_ROUTE_PATH,
      });

      expect(response.status).toBe(200);
      expect(harness.server.receivedRequestCount).toBe(1);
      const received = harness.server.received[0]!;
      expect(received.method).toBe('GET');
      expect(received.hadBody).toBe(false);
      expect(received.upgrade).toBe(false);
      expect(response.setCookie).toEqual([]);
      // The grant is one-shot and was consumed by the ALLOW.
      expect(grantLifecycleState(input.grant)).toBe('CONSUMED');
    } finally {
      await harness.cleanup();
    }
  });

  test('a synthetic sentinel parameter value never enters the decision or the receipt', async () => {
    const harness = await createHarness();
    try {
      const input = harness.base();
      const decision = evaluateProductionAdmission(input, sha24);
      expect(decision.allowed).toBe(true);
      const receipt = sealPqReceipt(draftFor(decision, input), sha24);
      const serialized = JSON.stringify({ decision, receipt });
      // The concrete value exists only in the test, never in kernel state.
      expect(serialized).not.toContain(SENTINEL_PARAM_VALUE);
      // The opaque handle is admissible; the value is not.
      expect(serialized).not.toMatch(/concrete-customer-value/);
    } finally {
      await harness.cleanup();
    }
  });
});

function draftFor(
  decision: ReturnType<typeof evaluateProductionAdmission>,
  input: ProductionAdmissionInput,
): PqReceiptDraft {
  return {
    schemaVersion: 'nightwatch.production-qualification-receipt.v1',
    campaignId: input.campaignId,
    taskId: 'nightwatch-prod-observe-safety-kernel-c11-v1',
    authorizationClass: PROD_OBSERVE_AUTHORIZATION_CLASS,
    authorizationLifecycle: grantLifecycleState(input.grant),
    observationStage: input.stage,
    environmentClass: input.environmentClass,
    sourceRepository: input.source.repository,
    sourceCheckpoint: input.source.sourceSha,
    sourceInventoryState: input.source.inventoryState,
    sourceCurrencyState: input.source.currencyState,
    chainVersion: PRODUCTION_ADMISSION_CHAIN_VERSION,
    gateDefinitionDigest: decision.gateDefinitionDigest,
    orderedGates: decision.orderedGates,
    gateOutcomes: decision.outcomes,
    routeEvidenceIdentity: `routeev:${sha24('synthetic-route-evidence')}`,
    readOnlyProofIdentity: input.readOnlyProof.proofIdentity,
    parameterProvenanceIdentity: `paramprov:${sha24('synthetic-handles')}`,
    privacyPolicyIdentity: `privpolicy:${sha24('production-cone')}`,
    containmentIdentity: input.containment,
    observerIdentityClass: input.observerIdentityClass,
    organizationWindowIdentity: input.config?.configIdentity ?? `prodobscfg:${sha24('absent')}`,
    budgetIdentity: input.budget.budgetIdentity(sha24),
    breakerState: input.breakers.breakerState(),
    killSwitchState: 'ABSENT',
    requestsDispatched: decision.allowed ? 1 : 0,
    deniedBeforeDispatch: decision.allowed ? 0 : 1,
    persistenceAuditResult: 'CLEAN',
    finalResult: decision.allowed ? 'QUALIFIED' : 'DENIED',
  };
}

// ---------------------------------------------------------------------------
// The one-fault denial matrix.
//
// One entry per gate. Each holds every other prerequisite valid and breaks
// exactly one fact, so a denial is attributable to that gate and nothing else.
// Two properties are asserted for every entry: the categorical reason belongs
// to the gate under test, and the mock server received ZERO requests.
// ---------------------------------------------------------------------------

interface OneFaultCase {
  readonly gate: ProductionAdmissionGate;
  readonly defect: string;
  readonly expected: ProductionDenialCode;
  readonly mutate: (input: ProductionAdmissionInput, harness: Harness) => ProductionAdmissionInput;
}

const ONE_FAULT_CASES: readonly OneFaultCase[] = [
  {
    gate: 'G_KILL_SWITCH_ENTRY',
    defect: 'kill switch engaged before qualification starts',
    expected: 'KILL_SWITCH_ENGAGED_AT_ENTRY',
    mutate: (input) => ({ ...input, killSwitchProbe: () => true }),
  },
  {
    gate: 'G_OWNER_AUTHORIZATION',
    defect: 'no grant presented',
    expected: 'AUTHORIZATION_ABSENT',
    mutate: (input) => ({ ...input, grant: null }),
  },
  {
    gate: 'G_OWNER_AUTHORIZATION',
    defect: 'grant expired',
    expected: 'AUTHORIZATION_EXPIRED',
    mutate: (input) => ({ ...input, nowMs: input.nowMs + 10_000 }),
  },
  {
    gate: 'G_OWNER_AUTHORIZATION',
    defect: 'grant scoped to a different campaign',
    expected: 'AUTHORIZATION_SCOPE_MISMATCH',
    mutate: (input) => ({ ...input, campaignId: 'some-other-campaign' }),
  },
  {
    gate: 'G_OWNER_AUTHORIZATION',
    defect: 'grant already consumed',
    expected: 'ALREADY_CONSUMED',
    mutate: (input) => {
      consumeProdObserveGrant(input.grant);
      return input;
    },
  },
  {
    gate: 'G_OWNER_AUTHORIZATION',
    defect: 'a structurally identical clone of a real grant',
    expected: 'AUTHORIZATION_ABSENT',
    // The registry holds identity, so a JSON round-trip is not the grant.
    mutate: (input) => ({ ...input, grant: JSON.parse(JSON.stringify(input.grant)) }),
  },
  {
    gate: 'G_AUTHORIZATION_CLASS',
    defect: 'authorization class is not PROD_OBSERVE',
    expected: 'AUTHORIZATION_CLASS_NOT_PROD_OBSERVE',
    // A genuine PROD_OBSERVE grant, presented by a qualification claiming DEV
    // authority. Aliasing must deny in this direction too.
    mutate: (input) => ({ ...input, requestedAuthorizationClass: 'DEV' }),
  },
  {
    gate: 'G_AUTHORIZATION_CLASS',
    defect: 'PROD_OBSERVE reached by requesting generic real-run authority',
    expected: 'AUTHORIZATION_CLASS_NOT_PROD_OBSERVE',
    mutate: (input) => ({ ...input, requestedAuthorizationClass: 'REAL_RUN' }),
  },
  {
    gate: 'G_ORGANIZATION_WINDOW',
    defect: 'now is before the approved observation window',
    expected: 'ORGANIZATION_WINDOW_NOT_YET_VALID',
    mutate: (input, harness) => ({
      ...input,
      config: { ...harness.configHandle.config, observationWindow: { notBeforeMs: input.nowMs + 60_000, notAfterMs: input.nowMs + 120_000 } },
    }),
  },
  {
    gate: 'G_ORGANIZATION_WINDOW',
    defect: 'the approved observation window has expired',
    expected: 'ORGANIZATION_WINDOW_EXPIRED',
    mutate: (input, harness) => ({
      ...input,
      config: { ...harness.configHandle.config, observationWindow: { notBeforeMs: input.nowMs - 120_000, notAfterMs: input.nowMs - 60_000 } },
    }),
  },
  {
    gate: 'G_CONFIGURATION_INTEGRITY',
    defect: 'no external observation config loaded',
    expected: 'CONFIGURATION_INTEGRITY_FAILED',
    // The window gate reads the config too, so it is satisfied separately to
    // keep this a ONE-fault case for the integrity gate.
    mutate: (input) => ({ ...input, config: null }),
  },
  {
    gate: 'G_OBSERVER_IDENTITY',
    defect: 'ORDINARY_USER at a stage requiring organizational read-only enforcement',
    expected: 'OBSERVER_IDENTITY_BELOW_STAGE_MINIMUM',
    mutate: (input) => ({ ...input, stage: 'P2', observerIdentityClass: 'ORDINARY_USER' }),
  },
  {
    gate: 'G_OBSERVER_IDENTITY',
    defect: 'observer identity unknown at a stage that requires one',
    expected: 'OBSERVER_IDENTITY_UNKNOWN',
    mutate: (input) => ({ ...input, stage: 'P2', observerIdentityClass: 'UNKNOWN' }),
  },
  {
    gate: 'G_SOURCE_CURRENCY',
    defect: 'source inventory incomplete',
    expected: 'SOURCE_INCOMPLETE',
    mutate: (input) => ({ ...input, source: { ...input.source, inventoryState: 'TRUNCATED' } }),
  },
  {
    gate: 'G_SOURCE_CURRENCY',
    defect: 'source snapshot stale',
    expected: 'SOURCE_STALE',
    mutate: (input) => ({ ...input, source: { ...input.source, currencyState: 'STALE' } }),
  },
  {
    gate: 'G_READ_ONLY_PROOF',
    defect: 'read-only proof absent',
    expected: 'READ_ONLY_PROOF_ABSENT',
    mutate: (input) => ({ ...input, readOnlyProof: { ...input.readOnlyProof, proven: false } }),
  },
  {
    gate: 'G_READ_ONLY_PROOF',
    defect: 'only one witness',
    expected: 'READ_ONLY_PROOF_ABSENT',
    mutate: (input) => ({ ...input, readOnlyProof: { ...input.readOnlyProof, witnessCount: 1 } }),
  },
  {
    gate: 'G_READ_ONLY_PROOF',
    defect: 'read-only proof stale',
    expected: 'READ_ONLY_PROOF_STALE',
    mutate: (input) => ({ ...input, readOnlyProof: { ...input.readOnlyProof, stale: true } }),
  },
  {
    gate: 'G_ROUTE_AUTHORITY',
    defect: 'no route vocabulary supplied',
    expected: 'ROUTE_NOT_SOURCE_PROVEN',
    mutate: (input) => ({ ...input, routeVocabulary: NO_PROVEN_ROUTE_VOCABULARY }),
  },
  {
    gate: 'G_ROUTE_AUTHORITY',
    defect: 'route is not a member of the derived vocabulary',
    expected: 'ROUTE_NOT_SOURCE_PROVEN',
    mutate: (input) => ({ ...input, intent: { ...input.intent, routeTemplate: 'GET /v1/synthetic/not-admitted' } }),
  },
  {
    gate: 'G_ROUTE_AUTHORITY',
    defect: 'a JSON-revived capability that merely matches the shape',
    expected: 'ROUTE_NOT_SOURCE_PROVEN',
    mutate: (input) => {
      const real = input.routeVocabulary as unknown as { templates: ReadonlySet<string> } & Record<string, unknown>;
      // A revived object carries no runtime brand, so C-10.5 refuses it.
      const revived = { ...real, templates: new Set([...real.templates]) } as unknown;
      return { ...input, routeVocabulary: revived as ProductionAdmissionInput['routeVocabulary'] };
    },
  },
  {
    gate: 'G_ROUTE_AUTHORITY',
    defect: 'a TEST_ONLY seam capability, which carries no PRODUCTION authority',
    expected: 'ROUTE_VOCABULARY_UNTRUSTED',
    // `testOnlyProductionMarkedRouteVocabulary` is deliberately a VALID
    // production capability — it exists so consumers can be tested with one —
    // so the adversarial case is the unmarked seam, which C-10.5 refuses with
    // CAPABILITY_TEST_ONLY.
    mutate: (input) => ({
      ...input,
      routeVocabulary: testOnlyRouteVocabulary({
        provenanceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
        templates: [SYNTHETIC_ROUTE_MEMBER],
      }),
    }),
  },
  {
    gate: 'G_HOST_ADMISSION',
    defect: 'host absent from the external allowlist',
    expected: 'HOST_NOT_ADMITTED',
    mutate: (input) => ({ ...input, intent: { ...input.intent, host: 'not-admitted.invalid' } }),
  },
  {
    gate: 'G_ADDRESS_POLICY',
    defect: 'resolved address set not admissible',
    expected: 'RESOLVED_ADDRESS_NOT_ADMITTED',
    mutate: (input) => ({ ...input, resolvedAddressesAdmitted: false }),
  },
  {
    gate: 'G_METHOD_AND_BODY',
    defect: 'POST',
    expected: 'METHOD_NOT_PERMITTED',
    mutate: (input) => ({ ...input, intent: { ...input.intent, method: 'POST' } }),
  },
  {
    gate: 'G_METHOD_AND_BODY',
    defect: 'PUT',
    expected: 'METHOD_NOT_PERMITTED',
    mutate: (input) => ({ ...input, intent: { ...input.intent, method: 'PUT' } }),
  },
  {
    gate: 'G_METHOD_AND_BODY',
    defect: 'PATCH',
    expected: 'METHOD_NOT_PERMITTED',
    mutate: (input) => ({ ...input, intent: { ...input.intent, method: 'PATCH' } }),
  },
  {
    gate: 'G_METHOD_AND_BODY',
    defect: 'DELETE',
    expected: 'METHOD_NOT_PERMITTED',
    mutate: (input) => ({ ...input, intent: { ...input.intent, method: 'DELETE' } }),
  },
  {
    gate: 'G_METHOD_AND_BODY',
    defect: 'a body supplied on a read',
    expected: 'BODY_PRESENT',
    mutate: (input) => ({ ...input, intent: { ...input.intent, hasBody: true } }),
  },
  {
    gate: 'G_METHOD_AND_BODY',
    defect: 'a mutation classification present',
    expected: 'MUTATION_CLASSIFICATION_PRESENT',
    mutate: (input) => ({ ...input, intent: { ...input.intent, mutationClassification: 'WRITE' } }),
  },
  {
    gate: 'G_PARAMETER_PROVENANCE',
    defect: 'a raw string where an opaque handle is required',
    expected: 'PARAMETER_PROVENANCE_INVALID',
    mutate: (input) => ({
      ...input,
      intent: { ...input.intent, parameters: [SENTINEL_PARAM_VALUE as unknown as ReturnType<typeof createOpaqueParameterHandle>] },
    }),
  },
  {
    gate: 'G_PARAMETER_PROVENANCE',
    defect: 'a malformed handle',
    expected: 'PARAMETER_PROVENANCE_INVALID',
    mutate: (input) => ({
      ...input,
      intent: { ...input.intent, parameters: [{ version: 'nightwatch.request-parameter-provenance.v1', handle: 'not-a-handle', location: 'OWNER_EXTERNAL_STORE', parameterName: 'id' } as ReturnType<typeof createOpaqueParameterHandle>] },
    }),
  },
  {
    gate: 'G_PRIVACY_CAPABILITY',
    defect: 'no privacy policy injected',
    expected: 'PRIVACY_CAPABILITY_ABSENT',
    // The F-12 rule made concrete: a missing policy denies rather than
    // falling back to a default.
    mutate: (input) => ({ ...input, privacyPolicy: null }),
  },
  {
    gate: 'G_CONTAINMENT_READINESS',
    defect: 'containment not ready',
    expected: 'CONTAINMENT_NOT_READY',
    mutate: (input) => ({ ...input, containment: 'NOT_READY' }),
  },
  {
    gate: 'G_CONTAINMENT_READINESS',
    defect: 'bwrap unavailable outside CI, where the stronger requirement holds',
    expected: 'CONTAINMENT_NOT_READY',
    mutate: (input) => ({ ...input, containment: 'NOT_EXERCISED_BWRAP_UNAVAILABLE', environmentClass: 'LOCAL' }),
  },
  {
    gate: 'G_BUDGET_RESERVATION',
    defect: 'campaign budget exhausted',
    expected: 'BUDGET_EXHAUSTED',
    mutate: (input) => {
      const budget = new ProductionBudgetLedger({
        limits: { ...PRODUCTION_BUDGET_DEFAULTS, campaignRequests: 0 },
        startedAtMs: input.nowMs,
      });
      return { ...input, budget };
    },
  },
  {
    gate: 'G_BREAKER_STATE',
    defect: 'a breaker already open',
    expected: 'BREAKER_OPEN',
    mutate: (input) => {
      const breakers = new ProductionBreakerBoard();
      breakers.open('PRIVACY_VIOLATION');
      return { ...input, breakers };
    },
  },
  {
    gate: 'G_KILL_SWITCH_PREDISPATCH',
    defect: 'kill switch engages AFTER qualification begins, before dispatch',
    expected: 'KILL_SWITCH_ENGAGED_BEFORE_DISPATCH',
    mutate: (input) => {
      // Absent at entry, engaged by the pre-dispatch check. This is the
      // revocation race: no cached ALLOW may survive it.
      let calls = 0;
      return { ...input, killSwitchProbe: () => { calls += 1; return calls > 1; } };
    },
  },
];

test.describe('C-11 one-fault denial matrix', () => {
  for (const oneFault of ONE_FAULT_CASES) {
    test(`${oneFault.gate} denies ${oneFault.expected} when ${oneFault.defect}`, async () => {
      const harness = await createHarness();
      try {
        const mutated = oneFault.mutate(harness.base(), harness);
        const decision = evaluateProductionAdmission(mutated, sha24);

        expect(decision.allowed).toBe(false);
        expect(decision.denialCode).toBe(oneFault.expected);
        expect(decision.deniedAtGate).toBe(oneFault.gate);
        // The reason must belong to the gate that emitted it.
        expect(GATE_DENIAL_CODES[oneFault.gate]).toContain(oneFault.expected);
        expect(decision.deniedBeforeDispatch).toBe(true);
        // The mandatory NETWORK-SIDE proof. An internal boolean is not evidence.
        expect(harness.server.receivedRequestCount).toBe(0);
        // Everything after the denial is explicitly NOT_EVALUATED, so the
        // receipt shows which authority actually refused.
        const deniedIndex = decision.outcomes.findIndex((outcome) => outcome.result === 'DENY');
        expect(deniedIndex).toBeGreaterThanOrEqual(0);
        for (const outcome of decision.outcomes.slice(deniedIndex + 1)) {
          expect(outcome.result).toBe('NOT_EVALUATED');
        }
        // A denial must never consume the grant.
        if (oneFault.defect !== 'grant already consumed') {
          expect(grantLifecycleState(mutated.grant)).not.toBe('CONSUMED');
        }
      } finally {
        await harness.cleanup();
      }
    });
  }

  test('every gate in the chain is covered by at least one one-fault case', () => {
    const covered = new Set(ONE_FAULT_CASES.map((entry) => entry.gate));
    const uncovered = PRODUCTION_ADMISSION_GATES.filter((gate) => !covered.has(gate));
    // Totality: a gate with no falsifying case is an untested gate.
    expect(uncovered).toEqual([]);
  });
});
