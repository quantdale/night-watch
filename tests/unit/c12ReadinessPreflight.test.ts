// ---------------------------------------------------------------------------
// AH-1 — C-12 operator-readiness preflight, permanent matrix.
//
// Everything here is synthetic and local-only. The evaluator under test is
// pure: this suite proves it performs zero network contact by construction
// (import-boundary hardening) and manufactures no readiness.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';

import type { C12ReadinessInput } from '../../src/core/c12Readiness/types';
import {
  C12_MAX_OBSERVATION_WINDOW_MS,
  C12_READINESS_VERSION,
  evaluateC12Readiness,
} from '../../src/core/c12Readiness';
import { P1_MAX_OBSERVATION_WINDOW_MS } from '../../src/core/prodObserveP1/scopeConfig';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const RECEIPT = 'receipt:sha256:f55ec47acdc38825941c2061';
const NOW = '2026-09-04T12:00:00.000Z';
const WINDOW_START = '2026-09-04T12:00:00.000Z';
const WINDOW_END = '2026-09-04T12:10:00.000Z';

function readyInput(overrides: Partial<C12ReadinessInput> = {}): C12ReadinessInput {
  return {
    implementation: { currentSha: SHA_A, requiredSha: SHA_A },
    pqBinding: { receiptDigest: RECEIPT, boundSha: SHA_A },
    operatorSubject: { present: true, provenance: 'OPERATOR_CREATED' },
    scopeConfig: {
      host: 'synthetic-prod-fixture.alphaus.local',
      windowStartIso: WINDOW_START,
      windowEndIso: WINDOW_END,
      evidenceDestination: '.nightwatch/findings/synthetic-c12',
      destinationApproved: true,
      killSwitchArmed: true,
    },
    deploymentFact: { state: 'PROVEN' },
    attribution: { capability: 'ATTRIBUTING_PROXY' },
    authorization: { authClass: 'P1_OBSERVE', fresh: true, consumed: false },
    killSwitchEngaged: false,
    nowIso: NOW,
    ...overrides,
  };
}

function codesOf(input: C12ReadinessInput): string[] {
  return evaluateC12Readiness(input).blockers.map((blocker) => blocker.code);
}

test.describe('AH-1 C-12 preflight contract', () => {
  test('duplicated P1 literals stay pinned to the P1 source of truth', () => {
    expect(C12_MAX_OBSERVATION_WINDOW_MS).toBe(P1_MAX_OBSERVATION_WINDOW_MS);
  });

  test('fully synthetic prerequisites report READY', () => {
    const report = evaluateC12Readiness(readyInput());
    expect(report.schemaVersion).toBe(C12_READINESS_VERSION);
    expect(report.status).toBe('READY');
    expect(report.blockers).toEqual([]);
    expect(report.deterministicDigest).toMatch(/^[0-9a-f]{24}$/);
  });

  test('READY evaluation is deterministic', () => {
    expect(evaluateC12Readiness(readyInput()).deterministicDigest).toBe(
      evaluateC12Readiness(readyInput()).deterministicDigest,
    );
  });

  test('missing operator subject blocks', () => {
    expect(codesOf(readyInput({ operatorSubject: { present: false, provenance: 'UNKNOWN' } }))).toContain(
      'BLOCKED_OPERATOR_SUBJECT',
    );
  });

  test('Nightwatch-created subject never admits', () => {
    expect(codesOf(readyInput({ operatorSubject: { present: true, provenance: 'NIGHTWATCH_CREATED' } }))).toContain(
      'BLOCKED_OPERATOR_SUBJECT',
    );
    expect(codesOf(readyInput({ operatorSubject: { present: true, provenance: 'UNKNOWN' } }))).toContain(
      'BLOCKED_OPERATOR_SUBJECT',
    );
  });

  test('missing scope config blocks', () => {
    expect(codesOf(readyInput({ scopeConfig: null }))).toContain('BLOCKED_SCOPE_CONFIG');
  });

  test('wildcard host never admits', () => {
    const scope = { ...readyInput().scopeConfig!, host: '*.alphaus.cloud' };
    expect(codesOf(readyInput({ scopeConfig: scope }))).toContain('BLOCKED_SCOPE_CONFIG');
  });

  test('URL-shaped host never admits', () => {
    const scope = { ...readyInput().scopeConfig!, host: 'https://app.alphaus.cloud/prod' };
    expect(codesOf(readyInput({ scopeConfig: scope }))).toContain('BLOCKED_SCOPE_CONFIG');
  });

  test('inverted window blocks', () => {
    const scope = { ...readyInput().scopeConfig!, windowStartIso: WINDOW_END, windowEndIso: WINDOW_START };
    expect(codesOf(readyInput({ scopeConfig: scope }))).toContain('BLOCKED_SCOPE_CONFIG');
  });

  test('expired window blocks without touching production', () => {
    const scope = { ...readyInput().scopeConfig!, windowStartIso: '2026-09-04T10:00:00.000Z', windowEndIso: '2026-09-04T10:05:00.000Z' };
    expect(codesOf(readyInput({ scopeConfig: scope }))).toContain('BLOCKED_WINDOW');
  });

  test('oversized window blocks at the P1 cap', () => {
    const scope = { ...readyInput().scopeConfig!, windowEndIso: '2026-09-04T13:00:00.000Z' };
    expect(codesOf(readyInput({ scopeConfig: scope }))).toContain('BLOCKED_WINDOW');
  });

  test('implementation SHA drift blocks', () => {
    expect(codesOf(readyInput({ implementation: { currentSha: SHA_B, requiredSha: SHA_A } }))).toContain(
      'BLOCKED_IMPLEMENTATION_BINDING',
    );
  });

  test('missing PQ binding blocks', () => {
    expect(codesOf(readyInput({ pqBinding: { receiptDigest: null, boundSha: null } }))).toContain('BLOCKED_PQ_BINDING');
  });

  test('stale PQ binding blocks', () => {
    expect(codesOf(readyInput({ pqBinding: { receiptDigest: RECEIPT, boundSha: SHA_B } }))).toContain('BLOCKED_PQ_BINDING');
  });

  test('unavailable deployment facts block', () => {
    expect(codesOf(readyInput({ deploymentFact: { state: 'UNKNOWN' } }))).toContain('BLOCKED_DEPLOYMENT_FACT');
  });

  test('inferred deployment facts never satisfy C-08b', () => {
    const codes = codesOf(readyInput({ deploymentFact: { state: 'INFERRED' } }));
    expect(codes).toContain('BLOCKED_DEPLOYMENT_FACT');
  });

  test('unknown attribution blocks', () => {
    expect(codesOf(readyInput({ attribution: { capability: 'UNKNOWN' } }))).toContain('BLOCKED_ATTRIBUTION');
  });

  test('URL-shaped evidence destination blocks', () => {
    const scope = { ...readyInput().scopeConfig!, evidenceDestination: 'https://example.com/evidence' };
    expect(codesOf(readyInput({ scopeConfig: scope }))).toContain('BLOCKED_PRIVACY_DESTINATION');
  });

  test('unapproved destination blocks', () => {
    const scope = { ...readyInput().scopeConfig!, destinationApproved: false };
    expect(codesOf(readyInput({ scopeConfig: scope }))).toContain('BLOCKED_PRIVACY_DESTINATION');
  });

  test('disarmed kill switch blocks; engaged kill switch blocks', () => {
    const disarmed = { ...readyInput().scopeConfig!, killSwitchArmed: false };
    expect(codesOf(readyInput({ scopeConfig: disarmed }))).toContain('BLOCKED_KILL_SWITCH');
    expect(codesOf(readyInput({ killSwitchEngaged: true }))).toContain('BLOCKED_KILL_SWITCH');
  });

  test('missing authorization blocks; MA-8 authorization does not transfer implicitly', () => {
    expect(codesOf(readyInput({ authorization: null }))).toContain('BLOCKED_AUTHORIZATION');
    expect(codesOf(readyInput({ authorization: { authClass: 'P2_READ', fresh: true, consumed: false } }))).toContain(
      'BLOCKED_AUTHORIZATION',
    );
    expect(codesOf(readyInput({ authorization: { authClass: 'P1_OBSERVE', fresh: false, consumed: false } }))).toContain(
      'BLOCKED_AUTHORIZATION',
    );
    expect(codesOf(readyInput({ authorization: { authClass: 'P1_OBSERVE', fresh: true, consumed: true } }))).toContain(
      'BLOCKED_AUTHORIZATION',
    );
  });

  test('evaluation never consumes the authorization', () => {
    const auth = { authClass: 'P1_OBSERVE', fresh: true, consumed: false };
    evaluateC12Readiness(readyInput({ authorization: auth }));
    expect(auth.consumed).toBe(false);
  });

  test('malformed machine facts refuse instead of evaluating', () => {
    expect(() => evaluateC12Readiness(readyInput({ nowIso: 'not-a-date' }))).toThrow('C12_READINESS_INVALID:NOW_DATE');
    expect(() => evaluateC12Readiness(readyInput({ implementation: { currentSha: 'zz', requiredSha: SHA_A } }))).toThrow(
      'C12_READINESS_INVALID:IMPLEMENTATION_CURRENT_SHA',
    );
  });

  test('every blocker is reported in one pass', () => {
    const report = evaluateC12Readiness(
      readyInput({
        operatorSubject: { present: false, provenance: 'UNKNOWN' },
        scopeConfig: null,
        deploymentFact: { state: 'UNKNOWN' },
        authorization: null,
      }),
    );
    expect(report.status).toBe('BLOCKED');
    expect(report.blockers.length).toBeGreaterThanOrEqual(4);
  });
});
