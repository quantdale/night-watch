// C-12 offline rehearsal: production-intended P1 core against local mock
// edges. Synthetic fixtures only; no network, no browser, no production.

import crypto from 'node:crypto';
import { test, expect } from '@playwright/test';
import {
  C12_REHEARSAL_SCENARIOS,
  c12LiveReadiness,
  runC12LocalRehearsal,
  type C12RehearsalInput,
} from '../../src/core/c12Rehearsal/index';
import { p1ScopeChainDefinitionDigest } from '../../src/core/prodObserveP1/observer';
import { sha256Hex } from '../../src/core/identity/canonicalDigest';
import { C12_READINESS_VERSION } from '../../src/core/c12Readiness/types';
import { P1_OBSERVATION_SCOPE_CHAIN_VERSION } from '../../src/core/prodObserveP1/types';

const SHA_A = '0123456789abcdef0123456789abcdef01234567';
const PQ = `receipt:sha256:${'ab'.repeat(32)}`;
const T0 = 1_786_000_000_000;

function input(scenario: C12RehearsalInput['scenario']): C12RehearsalInput {
  return {
    implementationSha: SHA_A,
    pqReceiptDigest: PQ,
    campaignId: 'campaign/c12-rehearsal-001',
    scenario,
    baseNowMs: T0,
  };
}

test.describe('c12 local rehearsal', () => {
  test('clean passive run passes with zero attributable and zero unknown traffic', () => {
    const receipt = runC12LocalRehearsal(input('CLEAN_PASSIVE'));
    expect(receipt.state).toBe('LOCAL_REHEARSAL_PASS');
    expect(receipt.sessionVerdict).toBe('PASSIVE_OBSERVATION_COMPLETE');
    expect(receipt.sessionTermination).toBe('SOURCE_ENDED');
    expect(receipt.tally.nightwatchAttributable).toBe(0);
    expect(receipt.tally.unknown).toBe(0);
    expect(receipt.qualifyingObservationCount).toBeGreaterThan(0);
    expect(receipt.qualifyingObservationCount).toBe(receipt.tally.total);
    expect(receipt.tally.operatorPreexisting).toBeGreaterThan(0);
    expect(receipt.tally.applicationAutonomous).toBeGreaterThan(0);
    expect(receipt.admissionDenialCode).toBeNull();
    expect(receipt.liveAuthorization).toBe('NOT_CONFERRED_SYNTHETIC_ONLY');
  });

  test('the receipt proves it ran the production-intended chain definition', () => {
    const receipt = runC12LocalRehearsal(input('CLEAN_PASSIVE'));
    expect(receipt.chainVersion).toBe(P1_OBSERVATION_SCOPE_CHAIN_VERSION);
    expect(receipt.chainDefinitionDigest).toBe(
      p1ScopeChainDefinitionDigest((canonical: string) => sha256Hex(canonical)),
    );
    expect(receipt.readinessVersion).toBe(C12_READINESS_VERSION);
    expect(receipt.scopeConfigVersion).toBe('nightwatch.p1-scope-config.v1');
    expect(receipt.rehearsalConfigDigest).toMatch(/^[a-f0-9]{24}$/);
    expect(receipt.rehearsalId).toMatch(/^c12rehearsal:[a-f0-9]{24}$/);
  });

  test('clean runs are byte-identical across fresh processes of the same input', () => {
    const first = runC12LocalRehearsal(input('CLEAN_PASSIVE'));
    const second = runC12LocalRehearsal(input('CLEAN_PASSIVE'));
    expect(second).toEqual(first);
  });

  test('nightwatch traffic, unknown attribution, and zero events never pass', () => {
    const poisoned = runC12LocalRehearsal(input('WITH_NIGHTWATCH_TRAFFIC'));
    expect(poisoned.sessionVerdict).toBe('NIGHTWATCH_TRAFFIC_DETECTED');
    expect(poisoned.state).not.toBe('LOCAL_REHEARSAL_PASS');
    expect(poisoned.tally.nightwatchAttributable).toBe(1);

    const ambiguous = runC12LocalRehearsal(input('WITH_UNKNOWN_ATTRIBUTION'));
    expect(ambiguous.sessionVerdict).toBe('ATTRIBUTION_UNKNOWN');
    expect(ambiguous.state).not.toBe('LOCAL_REHEARSAL_PASS');
    expect(ambiguous.tally.unknown).toBe(1);

    const empty = runC12LocalRehearsal(input('ZERO_QUALIFYING_EVENTS'));
    expect(empty.sessionVerdict).not.toBe('PASSIVE_OBSERVATION_COMPLETE');
    expect(empty.state).not.toBe('LOCAL_REHEARSAL_PASS');
    expect(empty.qualifyingObservationCount).toBe(0);
  });

  test('engaged kill switch denies at entry before any attach', () => {
    const receipt = runC12LocalRehearsal(input('KILL_SWITCH_ENGAGED'));
    expect(receipt.state).toBe('LOCAL_REHEARSAL_READY');
    expect(receipt.sessionVerdict).toBe('NO_SESSION_ADMISSION_DENIED');
    expect(receipt.admissionDenialCode).toBe('P1_KILL_SWITCH_ENGAGED_AT_ENTRY');
    expect(receipt.deniedAtGate).toBe('P1_KILL_SWITCH_ENTRY');
  });

  test('non-synthetic hosts refuse before admission', () => {
    expect(() => runC12LocalRehearsal(input('CLEAN_PASSIVE'), { admittedHostOverride: 'example.com' })).toThrow(
      /REFUSES_NON_SYNTHETIC/,
    );
    expect(() =>
      runC12LocalRehearsal(input('CLEAN_PASSIVE'), { admittedHostOverride: 'prod.internal' }),
    ).toThrow(/REFUSES_NON_SYNTHETIC/);
  });

  test('malformed rehearsal inputs fail closed', () => {
    expect(() => runC12LocalRehearsal({ ...input('CLEAN_PASSIVE'), implementationSha: 'zzz' })).toThrow(/IMPLEMENTATION_SHA/);
    expect(() => runC12LocalRehearsal({ ...input('CLEAN_PASSIVE'), pqReceiptDigest: 'nope' })).toThrow(/PQ_DIGEST/);
    expect(() => runC12LocalRehearsal({ ...input('CLEAN_PASSIVE'), baseNowMs: -1 })).toThrow(/CLOCK/);
  });

  test('live readiness stays missing no matter the rehearsal outcome', () => {
    const readiness = c12LiveReadiness();
    expect(readiness.prerequisites).toBe('LIVE_PREREQUISITES_MISSING');
    expect(readiness.authorization).toBe('LIVE_AUTHORIZATION_MISSING');
    expect(readiness.missing).toEqual([
      'operator production subject',
      'admitted production config',
      'deployment truth',
      'live C-12 authorization',
    ]);
    // A passing rehearsal does not change live readiness.
    runC12LocalRehearsal(input('CLEAN_PASSIVE'));
    expect(c12LiveReadiness()).toEqual(readiness);
  });

  // Every receipt-producing path, not just the happy one. The early-return
  // path and the settled path must both disclaim live authorization; mutation
  // M13 previously survived by leaving one path's literal intact.
  test('no rehearsal outcome on any scenario ever confers live authorization', () => {
    for (const scenario of C12_REHEARSAL_SCENARIOS) {
      const receipt = runC12LocalRehearsal(input(scenario));
      expect(receipt.liveAuthorization, scenario).toBe('NOT_CONFERRED_SYNTHETIC_ONLY');
      expect(receipt.state, scenario).not.toBe('C12_AUTHORIZED');
      expect(receipt.state, scenario).not.toBe('LIVE_PREREQUISITES_SATISFIED');
      expect(['LOCAL_REHEARSAL_PASS', 'LOCAL_REHEARSAL_READY'], scenario).toContain(receipt.state);
      expect(JSON.stringify(receipt), scenario).not.toMatch(/C12_AUTHORIZED|PRODUCTION_READY|LIVE_PREREQUISITES_SATISFIED/);
    }
  });

  // Only the clean passive run may pass; every unsafe scenario must fall short
  // of LOCAL_REHEARSAL_PASS rather than passing with a caveat.
  test('only a clean passive run passes; unsafe scenarios never reach PASS', () => {
    expect(runC12LocalRehearsal(input('CLEAN_PASSIVE')).state).toBe('LOCAL_REHEARSAL_PASS');
    for (const scenario of ['WITH_NIGHTWATCH_TRAFFIC', 'WITH_UNKNOWN_ATTRIBUTION', 'ZERO_QUALIFYING_EVENTS', 'KILL_SWITCH_ENGAGED'] as const) {
      expect(runC12LocalRehearsal(input(scenario)).state, scenario).not.toBe('LOCAL_REHEARSAL_PASS');
    }
  });

  test('no customer-shaped value crosses the rehearsal boundary', () => {
    const persisted = JSON.stringify(runC12LocalRehearsal(input('CLEAN_PASSIVE')));
    expect(persisted).not.toMatch(/CUSTOMER_SENTINEL|example\.com|Bearer\s/i);
    expect(crypto.createHash('sha256').update(persisted, 'utf8').digest('hex')).toMatch(/^[a-f0-9]{64}$/);
  });
});
