// ---------------------------------------------------------------------------
// Phase 2C synthetic oracle/replay matrix.
//
// These fixtures are local metadata only. The browser-backed resource/runtime
// cases live in journeyEngine.test.ts; this file exercises the shared
// classifier, evidence, fingerprint, attribution, and comparator directly.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import { parseJourneyEvidence, evidenceSchemaOf } from '../../src/core/evidence/journeyEvidence';
import {
  EVIDENCE_SCHEMA_VERSION,
  freezeJourneyContract,
  journeyContractDigest,
} from '../../src/core/journeys/contract';
import { buildJourneyFailureAttribution } from '../../src/core/journeys/attribution';
import { evaluateAnomalyAdmission } from '../../src/core/journeys/admission';
import { fingerprintAnomaly, sanitizeAnomalyFingerprintInput } from '../../src/core/journeys/fingerprint';
import { compareJourneyReplay } from '../../src/core/journeys/replay';
import { classifyJourneyObservation } from '../../src/core/journeys/observationClassification';
import type { JourneyEvidence } from '../../src/core/journeys/types';
import { getRippleJourneyDefinition } from '../../src/products/ripple/journeyContracts';
import { classifyResourceRole, checkResourceContentType, checkResourceStatus, classifyRequestFailure } from '../../src/oracles/protocol/resourceChecks';
import { checkJsonBody, checkNdjsonBody } from '../../src/oracles/protocol/passiveChecks';
import { RunMonitor } from '../../src/state/run';
import type { RunEvent } from '../../src/core/evidence/types';

const SYNTHETIC_URL = 'https://apidev.alphaus.cloud/m/blue/billing/v1/<ID>';

function issueEvent(data: Record<string, unknown>, type: RunEvent['type'] = 'oracle'): RunEvent {
  return {
    seq: 1,
    ts: '2026-08-12T00:00:00.000Z',
    type,
    severity: 'error',
    message: 'synthetic oracle metadata',
    data,
  };
}

function baseEvidence(): JourneyEvidence {
  const definition = getRippleJourneyDefinition('ripple-payer-exchange-read');
  return {
    journeyId: definition.journeyId,
    contractSourceSha: definition.sourceSha,
    passed: true,
    finalRouteClass: definition.startRoute,
    globalShellReady: true,
    journeyMarkers: { PAYER_EXCHANGE_PAGE: true, PAYER_EXCHANGE_DATA_TABLE: true },
    stepResults: [],
    semanticRuleIds: ['ripple.payer-exchange.read'],
    semanticClasses: ['KNOWN_READ'],
    passiveUnknownCount: 0,
    actionUnknownCount: 0,
    mutationCount: 0,
    routeStabilityMs: 750,
    authValid: true,
    oracleStatus: 'PASS',
    privacyStatus: 'PASS',
    safetyStatus: 'PASS',
    evidenceSchemaVersion: EVIDENCE_SCHEMA_VERSION,
    contractVersion: 'nightwatch.journey.phase2c.v1',
    contractDigest: journeyContractDigest(definition),
    oracleVersion: 'nightwatch.oracle.phase2c.v1',
    semanticRequests: [{
      ruleId: 'ripple.payer-exchange.read',
      classification: 'KNOWN_READ',
      disposition: 'KNOWN_READ',
      method: 'GET',
      stepId: 'payer-navigate',
      actionType: 'NAVIGATE_APPROVED_ROUTE',
    }],
    safetyCounts: {
      productionAttempts: 0,
      proxyViolations: 0,
      unknownDestinations: 0,
      unknownApprovals: 0,
      mutations: 0,
      dbQueries: 0,
      actionCausedUnknown: 0,
    },
    boundedVariance: { requestCount: 1 },
    oracleObservations: [],
    anomalyFingerprints: [],
  };
}

test('resource oracle matrix distinguishes critical, asset, optional, cancellation, and delivery states', () => {
  const cases = [
    {
      label: 'critical JS HTTP 500',
      result: checkResourceStatus({ status: 500, role: 'APPLICATION_ENTRY', url: 'https://dev.invalid/static/js/app.js' }),
      expected: { impact: 'BOOTSTRAP', severity: 'error' },
    },
    {
      label: 'font HTTP 502',
      result: checkResourceStatus({ status: 502, role: 'FONT', url: 'https://fonts.invalid/synthetic.woff2' }),
      expected: { impact: 'ASSET', severity: 'warn' },
    },
    {
      label: 'optional image HTTP 500',
      result: checkResourceStatus({ status: 500, role: 'IMAGE', url: 'https://dev.invalid/optional.png' }),
      expected: { impact: 'ASSET', severity: 'warn' },
    },
  ];
  for (const item of cases) expect(item.result, item.label).toMatchObject(item.expected);
  expect(checkResourceStatus({ status: 404, role: 'IMAGE', url: 'https://dev.invalid/optional.png' })).toBeNull();
  expect(checkResourceContentType('APPLICATION_ENTRY', 200, 'text/html', 'https://dev.invalid/static/js/app.js')).toMatchObject({
    type: 'wrong-content-type',
    impact: 'BOOTSTRAP',
  });
  expect(checkResourceContentType('FONT', 200, 'text/html', 'https://dev.invalid/font.woff2')).toMatchObject({ impact: 'ASSET' });
  expect(classifyRequestFailure('net::ERR_ABORTED', true)).toBe('CANCELED_BY_NAVIGATION');
  expect(classifyRequestFailure('net::ERR_ABORTED', false)).toBe('CANCELED_BY_BROWSER');
  expect(classifyRequestFailure('net::ERR_BLOCKED_BY_CLIENT', false)).toBe('CANCELED_BY_POLICY');
  expect(classifyRequestFailure('net::ERR_CONNECTION_RESET', false)).toBe('NETWORK_FAILED');
  expect(classifyResourceRole({ url: 'https://dev.invalid/static/js/app.js', resourceType: 'script', endpointClassification: null, targetOrigin: 'https://dev.invalid' })).toBe('APPLICATION_ENTRY');
  expect(classifyResourceRole({ url: 'https://dev.invalid/m/blue/read', resourceType: 'fetch', endpointClassification: 'UNKNOWN', targetOrigin: 'https://dev.invalid' })).toBe('API_UNKNOWN');
});

test('protocol oracle matrix avoids malformed-body false positives', () => {
  expect(checkJsonBody('{"ok":', SYNTHETIC_URL, 'application/json', 200)).toMatchObject({ type: 'malformed-json' });
  expect(checkJsonBody('{"ok":', SYNTHETIC_URL, 'application/json', 204)).toBeNull();
  expect(checkJsonBody('', SYNTHETIC_URL, 'application/json', 200)).toBeNull();
  expect(checkJsonBody('{"ok":', SYNTHETIC_URL, 'application/json', 200, false)).toBeNull();
  expect(checkNdjsonBody('{"a":1}\n{"b":2}\n', SYNTHETIC_URL, 'application/x-ndjson', 200)).toBeNull();
  expect(checkNdjsonBody('{"a":1}\nnot-json\n', SYNTHETIC_URL, 'application/x-ndjson', 200)).toMatchObject({ type: 'malformed-ndjson' });
  expect(checkNdjsonBody('{"a":1}\nnot-json\n', SYNTHETIC_URL, 'text/plain', 200)).toBeNull();
  expect(checkNdjsonBody('', SYNTHETIC_URL, 'application/x-ndjson', 204)).toBeNull();
  expect(checkJsonBody('not-json', SYNTHETIC_URL, 'application/json', 302)).toBeNull();
});

test('runtime oracle matrix separates page errors, rejection, CSP, and warning', () => {
  const monitor = new RunMonitor(['unhandled-rejection', 'csp-failure', 'pageerror']);
  monitor.recordIssue(issueEvent({ reason: 'pageerror', oracleId: 'pageerror', anomalyClass: 'PRODUCT_BEHAVIOR_ANOMALY' }, 'pageerror'));
  monitor.recordIssue(issueEvent({ reason: 'unhandled-rejection', oracleId: 'unhandled-rejection', anomalyClass: 'PRODUCT_BEHAVIOR_ANOMALY' }));
  monitor.recordIssue({ ...issueEvent({ reason: 'csp-failure', oracleId: 'csp-failure', anomalyClass: 'PRODUCT_BEHAVIOR_ANOMALY' }), severity: 'error' });
  monitor.recordIssue({ ...issueEvent({ reason: 'console-warning', oracleId: 'console-warning', anomalyClass: 'UNKNOWN' }), severity: 'info' });
  expect(monitor.oracleObservations.map((item) => item.oracleId)).toEqual([
    'pageerror', 'unhandled-rejection', 'csp-failure', 'console-warning',
  ]);
  expect(monitor.failed).toBe(true);
  expect(monitor.safetyFailed).toBe(false);
});

test('contract, fingerprint, and privacy matrix are deterministic and metadata-only', () => {
  const definition = getRippleJourneyDefinition('ripple-payer-exchange-read');
  const frozen = freezeJourneyContract(definition);
  expect(Object.isFrozen(frozen.definition)).toBe(true);
  expect(Object.isFrozen(frozen.definition.allowedSteps)).toBe(true);
  expect(frozen.digest).toBe(journeyContractDigest(definition));
  const sanitized = sanitizeAnomalyFingerprintInput({
    journeyId: definition.journeyId,
    stepId: 'payer-navigate',
    oracleId: 'unexpected-status',
    host: 'apidev.alphaus.cloud',
    path: 'https://apidev.alphaus.cloud/m/blue/customer-secret-123?token=PRIVATE',
    status: 502,
    contentType: 'text/html',
  });
  expect(JSON.stringify(sanitized)).not.toContain('customer-secret-123');
  expect(JSON.stringify(sanitized)).not.toContain('PRIVATE');
  const fingerprintInput = {
    journeyId: sanitized.journeyId,
    stepId: sanitized.stepId,
    oracleId: sanitized.oracleId,
    resourceRole: sanitized.resourceRole ?? undefined,
    host: sanitized.hostClass ?? undefined,
    path: sanitized.pathTemplate ?? undefined,
    status: 502,
    contentType: 'text/html',
  };
  const first = fingerprintAnomaly(fingerprintInput);
  const second = fingerprintAnomaly(fingerprintInput);
  expect(first).toBe(second);
  expect(first).toMatch(/^fp:sha256:[0-9a-f]{24}$/);
});

test('anomaly fingerprints ignore query ordering/values but retain meaningful oracle and status identity', () => {
  const common = {
    journeyId: 'ripple-billinggroups-read',
    stepId: 'billinggroups-read',
    host: 'apidev.alphaus.cloud',
    path: 'https://apidev.alphaus.cloud/m/blue/billing/v1/billinggroups?filter_vendor=aws&nonce=SYNTHETIC_ONE',
    status: 200,
    contentType: 'application/json; charset=utf-8',
  };
  const equivalent = fingerprintAnomaly({ ...common, path: `${common.path.split('?')[0]}?nonce=SYNTHETIC_TWO&filter_vendor=aws`, oracleId: 'malformed-json' });
  expect(equivalent).toBe(fingerprintAnomaly({ ...common, oracleId: 'malformed-json' }));
  expect(JSON.stringify(sanitizeAnomalyFingerprintInput({ ...common, oracleId: 'malformed-json' }))).not.toContain('SYNTHETIC_');
  expect(equivalent).not.toBe(fingerprintAnomaly({ ...common, oracleId: 'unexpected-status', status: 502 }));
});

test('replay matrix distinguishes strict, bounded, semantic, and anomaly dimensions', () => {
  const first = baseEvidence();
  const bounded = { ...first, routeStabilityMs: 812, passiveUnknownCount: 1, boundedVariance: { requestCount: 1 } };
  const boundedResult = compareJourneyReplay(first, bounded);
  expect(boundedResult.passed).toBe(true);
  expect(boundedResult.categories).toEqual(expect.arrayContaining(['BOUNDED_MATCH', 'EXPECTED_VARIANCE']));
  expect(boundedResult.differential?.timingDeltaMs).toBe(62);

  const semantic = {
    ...first,
    semanticRequests: [{ ...first.semanticRequests![0]!, method: 'POST', disposition: 'KNOWN_MUTATION' as const }],
    mutationCount: 1,
    safetyStatus: 'FAIL' as const,
    passed: false,
  };
  const semanticResult = compareJourneyReplay(first, semantic);
  expect(semanticResult.passed).toBe(false);
  expect(semanticResult.categories).toEqual(expect.arrayContaining(['SEMANTIC_REQUEST_DIVERGENCE', 'SAFETY_DIVERGENCE']));

  const sameFingerprint = {
    ...first,
    oracleStatus: 'FAIL' as const,
    passed: false,
    oracleObservations: [{ oracleId: 'unexpected-status', triggered: true, severity: 'WARNING' as const, anomalyClass: 'DEV_INFRA_TRANSIENT' as const, causalToPrimaryFailure: 'NOT_CAUSAL' as const, fingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa' }],
  };
  const sameFingerprintResult = compareJourneyReplay(sameFingerprint, { ...sameFingerprint });
  expect(sameFingerprintResult.strictInvariantMismatches).toEqual([]);
  const differentFingerprint = { ...sameFingerprint, oracleObservations: [{ ...sameFingerprint.oracleObservations![0]!, fingerprint: 'fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb' }] };
  expect(compareJourneyReplay(sameFingerprint, differentFingerprint).strictInvariantMismatches).toContain('oracle-set');
});

test('replay classification is explicit and never upgrades unexplained outcomes to PASS', () => {
  const settled = {
    ...baseEvidence(),
    captureStatus: 'COMPLETE' as const,
    observationSettlement: 'SETTLED' as const,
    environmentInputDigest: 'env:first',
  };
  const timing = compareJourneyReplay(settled, { ...settled, routeStabilityMs: settled.routeStabilityMs + 25 });
  expect(timing.classification).toBe('TIMING_ONLY_OBSERVATION_DIFFERENCE');
  expect(timing.passed).toBe(true);
  expect(timing.diagnosticCodes).toContain('TIMING_VARIANCE_ONLY');

  const auth = compareJourneyReplay(settled, { ...settled, authValid: false });
  expect(auth.classification).toBe('AUTH_DIVERGENCE');
  expect(auth.passed).toBe(false);
  expect(auth.diagnosticCodes).toContain('AUTH_STATE_CHANGED');

  const environment = compareJourneyReplay(settled, { ...settled, environmentInputDigest: 'env:second' });
  expect(environment.classification).toBe('ENVIRONMENT_DIVERGENCE');
  expect(environment.passed).toBe(false);

  const capture = compareJourneyReplay(settled, { ...settled, captureStatus: 'INCOMPLETE' });
  expect(capture.classification).toBe('FRAMEWORK_CAPTURE_DEFECT');
  expect(capture.passed).toBe(false);

  const diagnosedCapture = compareJourneyReplay(settled, {
    ...settled,
    captureStatus: 'INCOMPLETE',
    captureFailureCodes: ['BODY_UNAVAILABLE'],
  });
  expect(diagnosedCapture.diagnosticCodes).toEqual(['BODY_UNAVAILABLE', 'CAPTURE_INCOMPLETE']);

  const unknownCapture = compareJourneyReplay(settled, { ...settled, captureStatus: 'UNKNOWN' });
  expect(unknownCapture.classification).toBe('FRAMEWORK_CAPTURE_DEFECT');
  expect(unknownCapture.passed).toBe(false);
  expect(unknownCapture.diagnosticCodes).toContain('CAPTURE_STATUS_UNKNOWN');

  const unattemptedCapture = compareJourneyReplay(settled, {
    ...settled,
    passed: false,
    oracleStatus: 'FAIL',
    captureStatus: 'UNKNOWN',
    globalShellReady: false,
  });
  expect(unattemptedCapture.classification).not.toBe('FRAMEWORK_CAPTURE_DEFECT');

  const product = {
    ...settled,
    passed: false,
    oracleStatus: 'FAIL' as const,
    oracleObservations: [{
      oracleId: 'malformed-json',
      triggered: true,
      severity: 'WARNING' as const,
      anomalyClass: 'PRODUCT_BEHAVIOR_ANOMALY' as const,
      causalToPrimaryFailure: 'UNRESOLVED' as const,
      fingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    }],
  };
  const productDrift = compareJourneyReplay(product, {
    ...product,
    oracleObservations: [{ ...product.oracleObservations[0]!, fingerprint: 'fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb' }],
  });
  expect(productDrift.classification).toBe('EXPECTED_PRODUCT_STATE_DRIFT');
  expect(productDrift.passed).toBe(false);

  const unknown = compareJourneyReplay({ ...settled, passed: false }, { ...settled, passed: false });
  expect(unknown.classification).toBe('UNKNOWN_DIVERGENCE');
  expect(unknown.passed).toBe(false);
});

test('single-observation classification keeps capture failures out of product findings', () => {
  const safety = {
    productionAttempts: 0,
    proxyViolations: 0,
    unknownDestinations: 0,
    unknownApprovals: 0,
    mutations: 0,
    dbQueries: 0,
    actionCausedUnknown: 0,
  };
  const productOracle = {
    oracleId: 'malformed-json',
    triggered: true,
    severity: 'ERROR' as const,
    anomalyClass: 'PRODUCT_BEHAVIOR_ANOMALY' as const,
    causalToPrimaryFailure: 'UNRESOLVED' as const,
  };
  const timedOut = classifyJourneyObservation({
    evidence: {
      ...baseEvidence(),
      passed: false,
      oracleStatus: 'FAIL',
      captureStatus: 'INCOMPLETE',
      observationSettlement: 'TIMED_OUT',
      oracleObservations: [productOracle],
    },
    safety,
  });
  expect(timedOut.classification).toBe('FRAMEWORK_CAPTURE_DEFECT');
  expect(timedOut.diagnosticCodes).toEqual(['SETTLEMENT_TIMEOUT']);

  const unavailableBody = classifyJourneyObservation({
    evidence: {
      ...baseEvidence(),
      passed: false,
      oracleStatus: 'FAIL',
      captureStatus: 'INCOMPLETE',
      observationSettlement: 'SETTLED',
      captureFailureCodes: ['BODY_UNAVAILABLE'],
      oracleObservations: [productOracle],
    },
    safety,
  });
  expect(unavailableBody.classification).toBe('FRAMEWORK_CAPTURE_DEFECT');
  expect(unavailableBody.diagnosticCodes).toEqual(['BODY_UNAVAILABLE', 'CAPTURE_INCOMPLETE']);

  const unattemptedCapture = classifyJourneyObservation({
    evidence: {
      ...baseEvidence(),
      passed: false,
      oracleStatus: 'FAIL',
      captureStatus: 'UNKNOWN',
      observationSettlement: 'SETTLED',
      oracleObservations: [productOracle],
    },
    safety,
  });
  expect(unattemptedCapture.classification).toBe('PRODUCT_BEHAVIOR_ANOMALY');

  const settledProduct = classifyJourneyObservation({
    evidence: {
      ...baseEvidence(),
      passed: false,
      oracleStatus: 'FAIL',
      captureStatus: 'COMPLETE',
      observationSettlement: 'SETTLED',
      oracleObservations: [productOracle],
    },
    safety,
  });
  expect(settledProduct.classification).toBe('PRODUCT_BEHAVIOR_ANOMALY');

  const unexplained = classifyJourneyObservation({
    evidence: {
      ...baseEvidence(),
      passed: false,
      oracleStatus: 'FAIL',
      captureStatus: 'COMPLETE',
      observationSettlement: 'SETTLED',
      oracleObservations: [],
    },
    safety,
  });
  expect(unexplained.classification).toBe('UNKNOWN');
  expect(unexplained.diagnosticCodes).toEqual(['UNCLASSIFIED_OBSERVATION_FAILURE']);
});

test('replay rejects unsupported and cyclic structural evidence even when both sides share it', () => {
  const unsupported = { ...baseEvidence(), journeyMarkers: { marker: Symbol('synthetic') } as unknown as Record<string, boolean> };
  const unsupportedResult = compareJourneyReplay(unsupported, unsupported);
  expect(unsupportedResult.passed).toBe(false);
  expect(unsupportedResult.classification).toBe('DETERMINISTIC_REPLAY_MISMATCH');
  expect(unsupportedResult.strictInvariantMismatches).toContain('structural-checkpoints');

  const cyclicMarkers = { marker: true } as Record<string, unknown>;
  cyclicMarkers.self = cyclicMarkers;
  const cyclic = { ...baseEvidence(), journeyMarkers: cyclicMarkers as Record<string, boolean> };
  const cyclicResult = compareJourneyReplay(cyclic, cyclic);
  expect(cyclicResult.passed).toBe(false);
  expect(cyclicResult.classification).toBe('DETERMINISTIC_REPLAY_MISMATCH');
  expect(cyclicResult.strictInvariantMismatches).toContain('structural-checkpoints');
});

test('replay diagnostics are byte-stable and metadata-only across repeated classification', () => {
  const first = { ...baseEvidence(), finalRouteClass: '/m/blue/billing/v1/<SEGMENT>' };
  const replay = { ...first, finalRouteClass: '/m/blue/billing/v1/<OTHER_SEGMENT>' };
  const serialized = Array.from({ length: 3 }, () => JSON.stringify(compareJourneyReplay(first, replay)));
  expect(new Set(serialized).size).toBe(1);
  expect(serialized[0]).not.toContain('<SEGMENT>');
  expect(serialized[0]).toContain('final-route-class');
});

test('replay comparator treats duplicate equivalent reads as bounded count variance', () => {
  const first = baseEvidence();
  const read = first.semanticRequests![0]!;
  const replay = {
    ...first,
    semanticRequests: [read, { ...read }],
    boundedVariance: { requestCount: 2 },
  };
  const comparison = compareJourneyReplay(first, replay);
  expect(comparison.passed).toBe(true);
  expect(comparison.strictInvariantMismatches).toEqual([]);
  expect(comparison.differential?.semanticStrictLedgerSame).toBe(true);
  expect(comparison.differential?.requestCountDelta).toBe(1);
  expect(comparison.categories).toEqual(expect.arrayContaining(['BOUNDED_MATCH', 'EXPECTED_REQUEST_COUNT_VARIANCE']));
});

test('replay comparator canonicalizes object-key order but preserves meaningful array order', () => {
  const first = {
    ...baseEvidence(),
    journeyMarkers: { PAYER_EXCHANGE_PAGE: true, PAYER_EXCHANGE_DATA_TABLE: true },
    safetyCounts: {
      productionAttempts: 0,
      proxyViolations: 0,
      unknownDestinations: 0,
      unknownApprovals: 0,
      mutations: 0,
      dbQueries: 0,
      actionCausedUnknown: 0,
    },
    boundedVariance: { requestCount: 1, passiveUnknownDelta: 0 },
  };
  const reorderedObjects = {
    ...first,
    journeyMarkers: { PAYER_EXCHANGE_DATA_TABLE: true, PAYER_EXCHANGE_PAGE: true },
    safetyCounts: {
      actionCausedUnknown: 0,
      dbQueries: 0,
      mutations: 0,
      unknownApprovals: 0,
      unknownDestinations: 0,
      proxyViolations: 0,
      productionAttempts: 0,
    },
    boundedVariance: { passiveUnknownDelta: 0, requestCount: 1 },
  };
  const equivalent = compareJourneyReplay(first, reorderedObjects);
  expect(equivalent.passed).toBe(true);
  expect(equivalent.classification).toBe('MATCH');
  expect(equivalent.strictInvariantMismatches).toEqual([]);

  const firstWithSteps = {
    ...first,
    stepResults: [
      { stepId: 'first', actionType: 'WAIT_STRUCTURAL_CHECKPOINT' as const, status: 'PASS' as const, routeClass: '/same', structuralMarkerId: 'A', structuralPresent: true, requiredReadRuleIds: [], elapsedMs: 1 },
      { stepId: 'second', actionType: 'WAIT_STRUCTURAL_CHECKPOINT' as const, status: 'PASS' as const, routeClass: '/same', structuralMarkerId: 'B', structuralPresent: true, requiredReadRuleIds: [], elapsedMs: 1 },
    ],
  };
  const reversedSteps = { ...firstWithSteps, stepResults: [...firstWithSteps.stepResults].reverse() };
  const meaningful = compareJourneyReplay(firstWithSteps, reversedSteps);
  expect(meaningful.passed).toBe(false);
  expect(meaningful.strictInvariantMismatches).toContain('step-results');
});

test('replay comparator treats expected cancellation as bounded containment, not resource failure', () => {
  const first = baseEvidence();
  const withPolicyContainment = {
    ...first,
    resourceObservations: [{
      role: 'THIRD_PARTY' as const,
      state: 'CANCELED_BY_POLICY' as const,
      method: 'GET',
      stepId: null,
      statusClass: null,
      contentTypeClass: null,
    }],
    containmentCounts: {
      optionalSupportBlocked: 1,
      telemetryBlocked: 3,
      browserBackgroundBlocked: 0,
      containmentEvents: ['TELEMETRY'],
    },
  };
  const withoutPolicyContainment = {
    ...first,
    resourceObservations: [],
    containmentCounts: {
      optionalSupportBlocked: 1,
      telemetryBlocked: 3,
      browserBackgroundBlocked: 0,
      containmentEvents: [],
    },
  };
  const comparison = compareJourneyReplay(withPolicyContainment, withoutPolicyContainment);
  expect(comparison.passed).toBe(true);
  expect(comparison.strictInvariantMismatches).toEqual([]);
  expect(comparison.categories).toEqual(expect.arrayContaining(['BOUNDED_MATCH', 'EXPECTED_VARIANCE']));
  expect(comparison.differential?.resourceContainmentSame).toBe(false);
});

test('legacy Phase 2B evidence remains parseable and attribution separates primary and secondary causes', () => {
  const legacy = baseEvidence();
  (legacy as unknown as Record<string, unknown>).responseBody = 'synthetic-body';
  delete legacy.evidenceSchemaVersion;
  delete legacy.semanticRequests;
  const parsed = parseJourneyEvidence(legacy);
  expect(evidenceSchemaOf(parsed)).toBe('LEGACY_PHASE2');
  expect(JSON.stringify(parsed)).not.toContain('synthetic-body');
  const monitor = new RunMonitor(['pageerror']);
  monitor.recordIssue(issueEvent({ reason: 'pageerror', oracleId: 'pageerror', anomalyClass: 'PRODUCT_BEHAVIOR_ANOMALY' }, 'pageerror'));
  monitor.recordIssue(issueEvent({ reason: 'unexpected-status', oracleId: 'unexpected-status', anomalyClass: 'DEV_INFRA_TRANSIENT' }));
  const attribution = buildJourneyFailureAttribution({
    steps: [{
      stepId: 'payer-navigate',
      actionType: 'NAVIGATE_APPROVED_ROUTE',
      status: 'FAIL',
      routeClass: 'UNEXPECTED_ROUTE',
      structuralMarkerId: 'GLOBAL_RIPPLE_AUTHENTICATED_SHELL',
      structuralPresent: false,
      requiredReadRuleIds: ['ripple.payer-exchange.read'],
      elapsedMs: 10,
      failureClassification: 'route-contradiction',
    }],
    monitor,
    authValid: true,
  });
  expect(attribution.primaryFailure).toBe('route-contradiction');
  expect(attribution.secondaryOracles).toEqual(expect.arrayContaining(['pageerror', 'unexpected-status']));
  expect(attribution.causalityConfidence).toBe('PROVEN');
});

test('capture diagnostics remain bounded categorical evidence at the parser boundary', () => {
  const parsed = parseJourneyEvidence({ ...baseEvidence(), captureFailureCodes: ['BODY_UNAVAILABLE', 'BODY_READ_TIMEOUT'] });
  expect(parsed.captureFailureCodes).toEqual(['BODY_UNAVAILABLE', 'BODY_READ_TIMEOUT']);
  expect(() => parseJourneyEvidence({ ...baseEvidence(), captureFailureCodes: ['RAW_ERROR'] })).toThrow(/captureFailureCodes/);
  expect(() => parseJourneyEvidence({ ...baseEvidence(), captureFailureCodes: Array.from({ length: 9 }, () => 'BODY_UNAVAILABLE') })).toThrow(/captureFailureCodes/);
});

test('bounded admission promotes only exact same-fingerprint fresh contexts', () => {
  const base = {
    journeyId: 'ripple-common-exchange-read',
    contractVersion: 'nightwatch.journey.phase2c.v1',
    contractDigest: 'sha256:contract',
    fingerprint: 'fp:sha256:font502',
  } as const;
  const hypothesis = { ...base, runId: 'j2-first', contextKind: 'FIRST_OBSERVATION' as const };
  expect(evaluateAnomalyAdmission({ hypothesis, observations: [hypothesis] })).toMatchObject({ status: 'L0_OBSERVED', level: 'L0' });
  expect(evaluateAnomalyAdmission({
    hypothesis,
    observations: [hypothesis, { ...base, runId: 'j2-c1', contextKind: 'FRESH_CONTEXT_REPLAY' }],
  })).toMatchObject({ status: 'L1_REPRODUCED', level: 'L1', distinctContextCount: 2 });
  expect(evaluateAnomalyAdmission({
    hypothesis,
    observations: [hypothesis, { ...base, runId: 'j2-c1', contextKind: 'FRESH_CONTEXT_REPLAY' }, { ...base, runId: 'j2-c2', contextKind: 'BOUNDED_REPETITION' }],
  })).toMatchObject({ status: 'L2_REPEATED', level: 'L2', distinctContextCount: 3 });
  expect(evaluateAnomalyAdmission({
    hypothesis,
    matrixComplete: true,
    observations: [hypothesis, { ...base, runId: 'j2-c1', fingerprint: 'fp:sha256:different', contextKind: 'FRESH_CONTEXT_REPLAY' }],
  })).toMatchObject({ status: 'REFUTED', level: 'L0' });
  expect(evaluateAnomalyAdmission({ hypothesis, observations: [hypothesis], supersededByNightwatchDefect: true })).toMatchObject({ status: 'SUPERSEDED_BY_NIGHTWATCH_DEFECT' });
});
