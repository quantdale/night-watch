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
