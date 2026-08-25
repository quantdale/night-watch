import { expect, test } from '@playwright/test';
import {
  asSafeControlCenterCursor,
  asSafeControlCenterDigest,
  asSafeControlCenterId,
  asSafeControlCenterLabel,
  asSafeControlCenterRouteTemplate,
  asSafeControlCenterSha,
  asSafeControlCenterTimestamp,
  boundedGraphDepth,
  boundedPageLimit,
  boundedSequence,
  boundedTimelineLimit,
  controlCenterError,
  CONTROL_CENTER_ERROR_SCHEMA_VERSION,
  CONTROL_CENTER_LIMITS,
  sanitizeFindingSummary,
  sanitizeRunListItem,
  sanitizeTimelineEvent,
} from '../../src/controlCenter/contracts';
import {
  CONTROL_CENTER_CAMPAIGN_COVERAGE_SCHEMA_VERSION,
  CONTROL_CENTER_CAMPAIGN_SUMMARY_SCHEMA_VERSION,
} from '../../src/controlCenter/contracts/campaign';
import { CONTROL_CENTER_EVENT_SCHEMA_VERSION } from '../../src/controlCenter/contracts/events';
import { CONTROL_CENTER_EXECUTION_GRAPH_SCHEMA_VERSION } from '../../src/controlCenter/contracts/executionGraph';
import { CONTROL_CENTER_FINDINGS_SCHEMA_VERSION } from '../../src/controlCenter/contracts/findings';
import { CONTROL_CENTER_HEALTH_SCHEMA_VERSION } from '../../src/controlCenter/contracts/health';
import { CONTROL_CENTER_META_SCHEMA_VERSION } from '../../src/controlCenter/contracts/meta';
import { CONTROL_CENTER_READINESS_SCHEMA_VERSION } from '../../src/controlCenter/contracts/readiness';
import { CONTROL_CENTER_RUN_DETAIL_SCHEMA_VERSION, CONTROL_CENTER_RUN_LIST_SCHEMA_VERSION, CONTROL_CENTER_TIMELINE_SCHEMA_VERSION } from '../../src/controlCenter/contracts/runs';
import { CONTROL_CENTER_SAFETY_SCHEMA_VERSION } from '../../src/controlCenter/contracts/safety';
import {
  CONTROL_CENTER_SOURCE_GRAPH_SCHEMA_VERSION,
  CONTROL_CENTER_SOURCE_SUMMARY_SCHEMA_VERSION,
  CONTROL_CENTER_SOURCE_SURFACES_SCHEMA_VERSION,
} from '../../src/controlCenter/contracts/sourceGraph';

test.describe('Control Center versioned contracts', () => {
  test('defines one distinct v1 schema for every planned public snapshot family', () => {
    const versions = [
      CONTROL_CENTER_HEALTH_SCHEMA_VERSION,
      CONTROL_CENTER_META_SCHEMA_VERSION,
      CONTROL_CENTER_READINESS_SCHEMA_VERSION,
      CONTROL_CENTER_SAFETY_SCHEMA_VERSION,
      CONTROL_CENTER_RUN_LIST_SCHEMA_VERSION,
      CONTROL_CENTER_RUN_DETAIL_SCHEMA_VERSION,
      CONTROL_CENTER_TIMELINE_SCHEMA_VERSION,
      CONTROL_CENTER_EXECUTION_GRAPH_SCHEMA_VERSION,
      CONTROL_CENTER_CAMPAIGN_SUMMARY_SCHEMA_VERSION,
      CONTROL_CENTER_CAMPAIGN_COVERAGE_SCHEMA_VERSION,
      CONTROL_CENTER_SOURCE_SUMMARY_SCHEMA_VERSION,
      CONTROL_CENTER_SOURCE_SURFACES_SCHEMA_VERSION,
      CONTROL_CENTER_SOURCE_GRAPH_SCHEMA_VERSION,
      CONTROL_CENTER_FINDINGS_SCHEMA_VERSION,
      CONTROL_CENTER_EVENT_SCHEMA_VERSION,
    ];
    expect(new Set(versions).size).toBe(versions.length);
    for (const version of versions) {
      expect(version).toMatch(/^nightwatch\.control-center\.[a-z0-9-]+\.v1$/);
    }
  });

  test('rejects path-shaped, encoded, absolute, oversized, and sensitive IDs', () => {
    expect(asSafeControlCenterId('run-01:synthetic')).toBe('run-01:synthetic');
    for (const value of ['../secret', '/absolute', 'C:\\secret', 'run%2Fsecret', 'run/secret', 'run\\secret', '']) {
      expect(asSafeControlCenterId(value)).toBeNull();
    }
    expect(asSafeControlCenterId('a'.repeat(CONTROL_CENTER_LIMITS.safeIdLength + 1))).toBeNull();
    expect(asSafeControlCenterCursor('opaque.cursor-01~x')).toBe('opaque.cursor-01~x');
    expect(asSafeControlCenterCursor('../cursor')).toBeNull();
  });

  test('screens labels, route templates, timestamps, SHAs, and digests without echoing hostile text', () => {
    expect(asSafeControlCenterLabel('nightwatch-run')).toBe('nightwatch-run');
    expect(asSafeControlCenterLabel('<script>alert(1)</script>')).toBeNull();
    expect(asSafeControlCenterLabel('Bearer hostile-value')).toBeNull();
    expect(asSafeControlCenterRouteTemplate('/api/v1/runs/:runId')).toBe('/api/v1/runs/:runId');
    expect(asSafeControlCenterRouteTemplate('/../../secret')).toBeNull();
    expect(asSafeControlCenterRouteTemplate('/api/%2Fsecret')).toBeNull();
    expect(asSafeControlCenterTimestamp('2026-08-26T10:20:30.000Z')).toBe('2026-08-26T10:20:30.000Z');
    expect(asSafeControlCenterTimestamp('not-a-time')).toBeNull();
    expect(asSafeControlCenterSha('a'.repeat(40))).toBe('a'.repeat(40));
    expect(asSafeControlCenterSha('a'.repeat(39))).toBeNull();
    expect(asSafeControlCenterDigest(`receipt:sha256:${'b'.repeat(24)}`)).toBe(`receipt:sha256:${'b'.repeat(24)}`);
    expect(asSafeControlCenterDigest('raw-secret')).toBeNull();
  });

  test('enforces named collection and sequence ceilings at the boundary', () => {
    expect(boundedPageLimit(undefined)).toBe(CONTROL_CENTER_LIMITS.defaultPageLimit);
    expect(boundedPageLimit(CONTROL_CENTER_LIMITS.maxPageLimit)).toBe(CONTROL_CENTER_LIMITS.maxPageLimit);
    expect(boundedPageLimit(CONTROL_CENTER_LIMITS.maxPageLimit + 1)).toBeNull();
    expect(boundedTimelineLimit(undefined)).toBe(CONTROL_CENTER_LIMITS.defaultTimelineLimit);
    expect(boundedTimelineLimit(CONTROL_CENTER_LIMITS.maxTimelineLimit + 1)).toBeNull();
    expect(boundedGraphDepth(CONTROL_CENTER_LIMITS.maxGraphDepth)).toBe(CONTROL_CENTER_LIMITS.maxGraphDepth);
    expect(boundedGraphDepth(CONTROL_CENTER_LIMITS.maxGraphDepth + 1)).toBeNull();
    expect(boundedSequence(0)).toBe(0);
    expect(boundedSequence(CONTROL_CENTER_LIMITS.maxSequence + 1)).toBeNull();
  });

  test('error envelopes contain only fixed categorical fields and never raw error data', () => {
    const error = controlCenterError('CONTROL_CENTER_BAD_REQUEST');
    expect(error).toEqual({
      schemaVersion: CONTROL_CENTER_ERROR_SCHEMA_VERSION,
      code: 'CONTROL_CENTER_BAD_REQUEST',
      retryable: false,
    });
    expect(Object.keys(error).sort()).toEqual(['code', 'retryable', 'schemaVersion']);
    expect(JSON.stringify(error)).not.toContain('stack');
    expect(JSON.stringify(error)).not.toContain('sentinel');
  });

  test('run sanitizer maps an explicit allowlist and drops hostile private fields', () => {
    const internal = {
      runId: 'run-01:synthetic',
      environment: 'DEV',
      product: 'ripple',
      browser: 'chromium',
      scenario: 'smoke',
      startedAt: '2026-08-26T10:20:30.000Z',
      endedAt: '2026-08-26T10:20:31.000Z',
      durationMs: 1000,
      status: 'PASSED',
      passed: true,
      eventCount: 3,
      hardFailureCount: 0,
      oracleFindingCount: 1,
      nightwatchSha: 'a'.repeat(40),
      rawBody: 'SENTINEL_RAW_BODY',
      cookie: 'SENTINEL_COOKIE',
      authorization: 'SENTINEL_AUTHORIZATION',
      stack: 'SENTINEL_STACK',
      arbitraryPath: '/tmp/SENTINEL_PATH',
    };
    const sanitized = sanitizeRunListItem(internal);
    expect(sanitized).not.toBeNull();
    expect(sanitized).toMatchObject({ runId: 'run-01:synthetic', environment: 'DEV_RECORDED', status: 'PASSED' });
    expect(Object.keys(sanitized ?? {}).sort()).toEqual([
      'browser',
      'durationMs',
      'endedAt',
      'environment',
      'eventCount',
      'hardFailureCount',
      'nightwatchSha',
      'oracleFindingCount',
      'passed',
      'product',
      'runId',
      'scenario',
      'startedAt',
      'status',
    ]);
    const serialized = JSON.stringify(sanitized);
    expect(serialized).not.toContain('SENTINEL');
    expect(serialized).not.toContain('authorization');
    expect(serialized).not.toContain('arbitraryPath');
  });

  test('timeline sanitizer keeps sequence and categorical codes, never raw event payloads', () => {
    const sanitized = sanitizeTimelineEvent({
      seq: 4,
      ts: '2026-08-26T10:20:30.000Z',
      type: 'request',
      severity: 'warn',
      messageCode: 'REQUEST_BLOCKED',
      dataCodes: ['RAW_BODY', '<script>', 'COOKIE', 'REQUEST_BLOCKED', 'COOKIE'],
      message: 'SENTINEL_RAW_MESSAGE',
      data: { body: 'SENTINEL_RAW_BODY' },
    });
    expect(sanitized).toEqual({
      seq: 4,
      timestamp: '2026-08-26T10:20:30.000Z',
      eventType: 'request',
      severity: 'warn',
      messageCode: 'REQUEST_BLOCKED',
      dataCodes: ['COOKIE', 'RAW_BODY', 'REQUEST_BLOCKED'],
    });
    expect(JSON.stringify(sanitized)).not.toContain('SENTINEL');
    expect(JSON.stringify(sanitized)).not.toContain('<script>');
  });

  test('finding sanitizer rejects unsafe required fields and omits sensitive display text', () => {
    const sanitized = sanitizeFindingSummary({
      findingId: 'finding-01',
      fingerprint: `fp:sha256:${'c'.repeat(24)}`,
      clusterId: 'cluster-01',
      title: '<img src=x onerror=SENTINEL>',
      product: 'ripple',
      surface: 'read-only-surface',
      severity: 'HIGH',
      confidence: 'MEDIUM',
      evidenceLevel: 'L2',
      reproduction: 'REPRODUCED',
      reproductionCount: 2,
      minimized: true,
      sourceCurrentness: 'CURRENT',
      dossierStatus: 'READY',
      firstObservedAt: '2026-08-26T10:20:30.000Z',
      lastObservedAt: '2026-08-26T10:20:31.000Z',
      categoryCode: 'SEMANTIC_FINDING',
      provenanceDigest: `dossier:sha256:${'d'.repeat(24)}`,
      rawEvidence: 'SENTINEL_RAW_EVIDENCE',
      customerValue: 'SENTINEL_CUSTOMER_VALUE',
      filePath: '/tmp/SENTINEL_PATH',
    });
    expect(sanitized).not.toBeNull();
    expect(sanitized?.title).toBeNull();
    expect(JSON.stringify(sanitized)).not.toContain('SENTINEL');
    expect(Object.keys(sanitized ?? {}).sort()).toEqual([
      'categoryCode',
      'clusterId',
      'confidence',
      'dossierStatus',
      'evidenceLevel',
      'findingId',
      'fingerprint',
      'firstObservedAt',
      'lastObservedAt',
      'minimized',
      'product',
      'provenanceDigest',
      'reproduction',
      'reproductionCount',
      'severity',
      'sourceCurrentness',
      'surface',
      'title',
    ]);
  });

  test('sanitization is deterministic for identical synthetic input', () => {
    const input = {
      runId: 'run-02',
      environment: 'LOCAL_SYNTHETIC',
      passed: false,
      eventCount: 1,
      hardFailureCount: 1,
      oracleFindingCount: 0,
      status: 'SAFETY_FAILURE',
    };
    const first = sanitizeRunListItem(input);
    const second = sanitizeRunListItem(input);
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});
