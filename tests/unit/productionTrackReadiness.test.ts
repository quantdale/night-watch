// ---------------------------------------------------------------------------
// Production track — per-stage blocker kind, structural unloadability, and the
// per-session loadability policy.
//
// The two claims under test:
//
//   1. `EXTERNAL_PREREQUISITE_UNMET` and `AWAITING_AUTHORIZATION` are
//      DISTINCT statuses. A stage waiting on C-08b or on U-3 is not waiting on
//      a decision, and the status vocabulary cannot say `NOT_AUTHORIZED`.
//   2. production stays structurally unloadable by default (D-4), and the
//      future grant shape is per-stage, per-session and revoked at session end.
//
// Local only: no production contact, no network, no credentials.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import {
  PRODUCTION_LOADABILITY_POLICY,
  PRODUCTION_TRACK_LIVE_FACTS,
  PRODUCTION_TRACK_RECORDS,
  PRODUCTION_TRACK_STAGES,
  PRODUCTION_TRACK_STATUSES,
  evaluateProductionStage,
  evaluateProductionTrack,
  isAwaitingAuthorizationStatus,
  resolveProductionLoadability,
  type ProductionStageEvaluationFacts,
  type ProductionTrackStageRecord,
} from '../../src/core/productionTrack';
import {
  SUPPORTED_ENVIRONMENTS,
  assertSupportedEnvironment,
  selectEnvironment,
} from '../../src/core/environment';
import { KNOWN_PRODUCTION_HOSTS } from '../../src/core/safety/hosts';
import { OutboundPolicy } from '../../src/core/safety/outboundPolicy';
import { CENSUS_FIGURES } from '../../src/core/source/censusFigureLedger';
import { productionReadCapability } from '../../src/core/prodObserve';

const ROOT = path.resolve(__dirname, '..', '..');
const NOW = 1_760_000_000_000;

function recordFor(stage: (typeof PRODUCTION_TRACK_STAGES)[number]): ProductionTrackStageRecord {
  const record = PRODUCTION_TRACK_RECORDS.find((entry) => entry.stage === stage);
  if (record === undefined) throw new Error(`PRODUCTION_TRACK_RECORD_MISSING:${stage}`);
  return record;
}

function facts(overrides: Partial<ProductionStageEvaluationFacts> = {}): ProductionStageEvaluationFacts {
  return { repositoryWorkComplete: true, externalPrerequisiteMet: false, authorizationPresent: false, ...overrides };
}

test.describe('production track — blocker kinds are data, not prose', () => {
  test('every stage carries repository work and an external prerequisite as data', () => {
    expect(PRODUCTION_TRACK_RECORDS.map((entry) => entry.stage)).toEqual([...PRODUCTION_TRACK_STAGES]);
    for (const record of PRODUCTION_TRACK_RECORDS) {
      expect(record.title.length).toBeGreaterThan(0);
      expect(record.externalPrerequisite).not.toBeNull();
      if (record.scope === 'NIGHTWATCH') expect(record.authorizationRequirement).not.toBeNull();
    }
    // C-12's repository work is complete; C-14's replay work is not begun.
    expect(recordFor('C-12').repositoryWork.every((work) => work.state === 'COMPLETE')).toBe(true);
    expect(recordFor('C-14').repositoryWork.some((work) => work.state === 'REMAINING')).toBe(true);
    expect(recordFor('C-13').repositoryWork.map((work) => work.item).join(' | ')).toContain('PRODUCTION_READ_NO_DEPLOYMENT_FACT');
  });

  test('an unmet external prerequisite reports EXTERNAL_PREREQUISITE_UNMET, never AWAITING_AUTHORIZATION', () => {
    const report = evaluateProductionStage(recordFor('C-13'), facts());
    expect(report.status).toBe('EXTERNAL_PREREQUISITE_UNMET');
    expect(report.status).not.toBe('AWAITING_AUTHORIZATION');
    expect(report.nextAction).toBe('SATISFY_EXTERNAL_PREREQUISITE');
    expect(report.structuralBlocker).toContain('POSITIVE_DEPLOYMENT_FACTS is 0');
  });

  test('when only authorization remains, the stage reports AWAITING_AUTHORIZATION', () => {
    const report = evaluateProductionStage(recordFor('C-12'), facts({ externalPrerequisiteMet: true }));
    expect(report.status).toBe('AWAITING_AUTHORIZATION');
    expect(isAwaitingAuthorizationStatus(report.status)).toBe(true);
    expect(report.nextAction).toBe('OBTAIN_STAGE_AUTHORIZATION');
    expect(report.repositoryWorkRemaining).toEqual([]);

    const authorized = evaluateProductionStage(recordFor('C-12'), facts({ externalPrerequisiteMet: true, authorizationPresent: true }));
    expect(authorized.status).toBe('AUTHORIZED');
  });

  test('unfinished repository work precedes the external prerequisite', () => {
    const report = evaluateProductionStage(recordFor('C-14'), facts({ repositoryWorkComplete: false }));
    expect(report.status).toBe('REPOSITORY_WORK_REMAINING');
    expect(report.nextAction).toBe('COMPLETE_REPOSITORY_WORK');
  });

  test('NOT_AUTHORIZED is not in the status vocabulary', () => {
    expect(PRODUCTION_TRACK_STATUSES as readonly string[]).not.toContain('NOT_AUTHORIZED');
  });

  test('the live track reports C-13 external, C-14 repository work and C-12 external', () => {
    const reports = evaluateProductionTrack(PRODUCTION_TRACK_LIVE_FACTS);
    const byStage = new Map(reports.map((report) => [report.stage, report]));
    expect(byStage.get('C-12')?.status).toBe('EXTERNAL_PREREQUISITE_UNMET');
    expect(byStage.get('C-13')?.status).toBe('EXTERNAL_PREREQUISITE_UNMET');
    expect(byStage.get('C-14')?.status).toBe('REPOSITORY_WORK_REMAINING');
    expect(byStage.get('P4')?.status).toBe('EXTERNAL_PREREQUISITE_UNMET');
    for (const report of reports) expect(report.status).not.toBe('AUTHORIZED');
  });

  test('P4 is recorded as outside Nightwatch scope with U-3 external', () => {
    const p4 = recordFor('P4');
    expect(p4.scope).toBe('OUTSIDE_NIGHTWATCH_SCOPE');
    expect(p4.externalPrerequisite).toContain('U-3');
  });

  test('the structural blocker agrees with the live capability count', () => {
    const measure = CENSUS_FIGURES.find((figure) => figure.measureId === 'POSITIVE_DEPLOYMENT_FACTS');
    const capability = productionReadCapability(measure?.currentValue ?? Number.NaN);
    expect(capability.available).toBe(false);
    expect(recordFor('C-13').structuralBlocker).toContain(String(capability.positiveDeploymentFacts));
  });
});

test.describe('production track — structural unloadability and per-session grants', () => {
  test('D-4 holds: production is not selectable and its config remains documentation', () => {
    expect([...SUPPORTED_ENVIRONMENTS]).toEqual(['local', 'dev', 'next']);
    expect(SUPPORTED_ENVIRONMENTS).not.toContain('production');
    expect(() => assertSupportedEnvironment('production')).toThrow();
    expect(() => selectEnvironment('production')).toThrow();
    const file = path.join(ROOT, 'config', 'environments', 'production.json');
    expect(fs.existsSync(file)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { supported?: unknown };
    expect(parsed.supported).toBe(false);
  });

  test('every known production host is DENIED by the outbound policy in a local environment', () => {
    const policy = new OutboundPolicy(selectEnvironment('local'));
    expect(KNOWN_PRODUCTION_HOSTS.length).toBeGreaterThan(0);
    for (const host of KNOWN_PRODUCTION_HOSTS) {
      const decision = policy.decide(`https://${host}/`);
      expect(decision.verdict, host).toBe('deny');
      expect(decision.hostClass, host).toBe('production');
    }
    expect(policy.decide('https://synthetic-service.run.app/').verdict).toBe('deny');
  });

  test('the loadability policy is never-global, per-stage per-session and revoked', () => {
    expect(PRODUCTION_LOADABILITY_POLICY.globalLoadability).toBe('NEVER');
    expect(PRODUCTION_LOADABILITY_POLICY.grantScope).toBe('PER_STAGE_PER_SESSION');
    expect(PRODUCTION_LOADABILITY_POLICY.revokeAtSessionEnd).toBe(true);
    expect(PRODUCTION_LOADABILITY_POLICY.d4StructuralGate).toBe('CLOSED');
  });

  test('production stays unloadable by default, even if a session grant is presented while D-4 is closed', () => {
    const session = { stage: 'C-13' as const, sessionId: 'synthetic-session', grantedAtMs: NOW - 1_000, expiresAtMs: NOW + 60_000 };
    expect(resolveProductionLoadability({ activeSession: null, nowMs: NOW, structuralEnvironmentGate: 'CLOSED_D4' })).toMatchObject({
      state: 'UNLOADABLE',
      reason: 'D4_STRUCTURALLY_UNLOADABLE',
    });
    expect(resolveProductionLoadability({ activeSession: session, nowMs: NOW, structuralEnvironmentGate: 'CLOSED_D4' })).toMatchObject({
      state: 'UNLOADABLE',
      reason: 'D4_STRUCTURALLY_UNLOADABLE',
    });
  });

  test('a future open gate is per-session and revoked when the session ends', () => {
    const session = { stage: 'C-13' as const, sessionId: 'synthetic-session', grantedAtMs: NOW - 1_000, expiresAtMs: NOW + 60_000 };
    expect(resolveProductionLoadability({ activeSession: null, nowMs: NOW, structuralEnvironmentGate: 'OPEN_PER_SESSION' })).toMatchObject({
      state: 'UNLOADABLE',
      reason: 'NO_ACTIVE_STAGE_SESSION',
    });
    expect(resolveProductionLoadability({ activeSession: session, nowMs: NOW, structuralEnvironmentGate: 'OPEN_PER_SESSION' })).toMatchObject({
      state: 'LOADABLE_PER_SESSION',
      stage: 'C-13',
      sessionId: 'synthetic-session',
    });
    // Session end revokes: the same grant one millisecond after expiry fails closed.
    expect(resolveProductionLoadability({ activeSession: session, nowMs: NOW + 60_000, structuralEnvironmentGate: 'OPEN_PER_SESSION' })).toMatchObject({
      state: 'UNLOADABLE',
      reason: 'SESSION_EXPIRED_REVOKED',
    });
  });
});
