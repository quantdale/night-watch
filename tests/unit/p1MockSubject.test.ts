// ---------------------------------------------------------------------------
// MA-8 / F-13 — mock subject integration: the operator-already-loaded page.
//
// Stated limitation: this fixture models the future external subject as a
// local event stream — a page that exists BEFORE the observer attaches, with
// pre-existing traffic, ongoing application polling, and a provenance-bearing
// descriptor. It cannot prove a real browser page behaves identically; the
// real subject arrives through the external operator mechanism, which is an
// out-of-scope prerequisite for a future C-12, not something this campaign
// builds. What it DOES prove, where architecture allows:
//
//   1. the subject (nonce, pre-existing events) exists before admission;
//   2. the observer attaches later, referencing that nonce;
//   3. the session invokes nothing on the subject except bounded polls;
//   4. application-originated polling continues across attach;
//   5. attribution over the mixed stream is correct;
//   6. only privacy-projected structure reaches the evidence firewall;
//   7. no active Nightwatch request primitive executes (the session module
//      exports no action to execute — asserted, not assumed);
//   8. kill switch and window expiry clean up.
//
// Local-only. No browser, no network, no production, no credentials.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import { clearP1ObserveGrantRegistryForTest } from '../../src/core/prodObserveP1/authorization';
import { loadP1ScopeConfig } from '../../src/core/prodObserveP1/scopeConfig';
import { evaluateP1ObservationScope } from '../../src/core/prodObserveP1/observer';
import {
  attachP1ObservationSession,
  type P1ObservationEventSource,
} from '../../src/core/prodObserveP1/session';
import * as p1SessionModule from '../../src/core/prodObserveP1/session';
import type { ObservedRequestEvidence } from '../../src/core/prodObserveP1/attribution';
import {
  projectProduction,
  RawEphemeralSource,
  toProductionEvidence,
} from '../../src/core/prodPrivacy';
import { assertPersistableProductionEvidence } from '../../src/core/prodEvidence/firewall';
import { createProductionPrivacyPolicy } from '../../src/core/prodPrivacy/policy';
import {
  testOnlyProductionMarkedKeyVocabulary,
  testOnlyProductionMarkedRouteVocabulary,
} from '../../src/core/prodProvenance/testOnlySeam';
import {
  P1_FIXTURE_HOST,
  P1_T0,
  P1_WINDOW_MS,
  mintP1Grant,
  p1Digest,
  validP1AdmissionInput,
  writeP1ScopeConfigFile,
} from './support/p1Fixtures';

const ROOT = path.resolve(__dirname, '../..');
const PROVEN_ROUTE = 'GET /v1/synthetic/p1/{id}';

/** The operator's already-loaded page, as far as Nightwatch is concerned. */
class MockP1Subject {
  readonly subjectNonce: string;
  readonly createdBeforeAdmission: boolean = true;
  readonly callLog: string[] = [];
  private readonly script: { events: ObservedRequestEvidence[]; sourceEnded: boolean }[];
  private index = 0;

  constructor(preExisting: ObservedRequestEvidence[], ongoing: ObservedRequestEvidence[][]) {
    // Nonce minted at subject creation — before any admission exists.
    this.subjectNonce = `mock-subject-${preExisting.length}-${ongoing.length}-9f2c`;
    this.script = [
      { events: preExisting, sourceEnded: false },
      ...ongoing.map((events, position) => ({
        events,
        sourceEnded: position === ongoing.length - 1,
      })),
    ];
  }

  descriptor() {
    return {
      subjectNonce: this.subjectNonce,
      provenance: 'OPERATOR_CREATED' as const,
      host: P1_FIXTURE_HOST,
    };
  }

  /** The ONLY capability the observer ever receives: bounded polls. */
  eventSource(): P1ObservationEventSource {
    return {
      poll: (nowMs: number) => {
        void nowMs;
        this.callLog.push('poll');
        const step = this.script[Math.min(this.index, this.script.length - 1)];
        this.index += 1;
        return { events: step?.events ?? [], sourceEnded: step?.sourceEnded ?? true };
      },
    };
  }
}

function applicationEvent(requestId: string, initiator: string): ObservedRequestEvidence {
  return { requestId, observedAfterAttach: true, preAttachProof: false, nightwatchCausalLink: false, initiator };
}

function preExistingEvent(requestId: string): ObservedRequestEvidence {
  return { requestId, observedAfterAttach: false, preAttachProof: true, nightwatchCausalLink: false, initiator: 'navigation' };
}

function admitWithSubject(subject: MockP1Subject) {
  clearP1ObserveGrantRegistryForTest();
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-p1-wsroot-'));
  const { configPath } = writeP1ScopeConfigFile({ repositoryRoot: ROOT, workspaceRoot });
  process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
  const loaded = loadP1ScopeConfig({ repositoryRoot: ROOT, workspaceRoot, digest: p1Digest });
  if (!loaded.ok) throw new Error(`P1_FIXTURE_CONFIG_FAILED:${loaded.failure}`);
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { evidenceDestination: string };
  const base = validP1AdmissionInput({
    grant: mintP1Grant(),
    config: loaded.config,
    evidenceDestination: raw.evidenceDestination,
  });
  const admission = evaluateP1ObservationScope({ ...base, subject: subject.descriptor() }, p1Digest);
  if (!admission.allowed) throw new Error(`P1_FIXTURE_ADMISSION_FAILED:${admission.denialCode}`);
  return admission;
}

test.beforeEach(() => {
  delete process.env.NIGHTWATCH_P1_SCOPE_CONFIG;
});

test('the subject exists before admission; the observer attaches later and only polls', () => {
  const subject = new MockP1Subject(
    [preExistingEvent('in-flight-1'), preExistingEvent('in-flight-2')],
    [[applicationEvent('poll-1', 'polling')], [applicationEvent('poll-2', 'telemetry')]],
  );
  expect(subject.callLog).toEqual([]);

  const admission = admitWithSubject(subject);
  expect(admission.admittedSubjectNonce).toBe(subject.subjectNonce);

  const result = attachP1ObservationSession({
    admission,
    subjectNonce: subject.subjectNonce,
    source: subject.eventSource(),
    bounds: { maxEvents: 100, maxPolls: 100 },
    killSwitchProbe: () => false,
    clock: { nowMs: () => P1_T0 + 2_000 },
  });

  // The session invoked nothing on the subject except polls — no navigate, no
  // reload, no actuation primitive exists on the interface it was given.
  expect(subject.callLog.length).toBeGreaterThan(0);
  expect(new Set(subject.callLog)).toEqual(new Set(['poll']));
  expect(result.verdict).toBe('PASSIVE_OBSERVATION_COMPLETE');
  expect(result.completedCleanly).toBe(true);
  expect(result.tally).toEqual({
    total: 4,
    operatorPreexisting: 2,
    applicationAutonomous: 2,
    nightwatchAttributable: 0,
    unknown: 0,
  });
});

test('the session module exports no Nightwatch action to execute', () => {
  for (const name of Object.keys(p1SessionModule)) {
    expect(name, name).not.toMatch(/navigate|goto|reload|click|type|fetch|dispatch|login|submit/i);
  }
  expect(typeof p1SessionModule.attachP1ObservationSession).toBe('function');
});

test('application polling continues across attach and stays correctly attributed', () => {
  const subject = new MockP1Subject(
    [],
    [
      [applicationEvent('t1', 'timer')],
      [applicationEvent('sw1', 'serviceworker')],
      [applicationEvent('ws1', 'websocket')],
      [applicationEvent('dl1', 'download')],
      [applicationEvent('f1', 'subresource')],
    ],
  );
  const admission = admitWithSubject(subject);
  const result = attachP1ObservationSession({
    admission,
    subjectNonce: subject.subjectNonce,
    source: subject.eventSource(),
    bounds: { maxEvents: 100, maxPolls: 100 },
    killSwitchProbe: () => false,
    clock: { nowMs: () => P1_T0 + 2_000 },
  });
  expect(result.tally.applicationAutonomous).toBe(5);
  expect(result.tally.nightwatchAttributable).toBe(0);
  expect(result.tally.unknown).toBe(0);
  expect(result.verdict).toBe('PASSIVE_OBSERVATION_COMPLETE');
});

test('only privacy-projected structure reaches the evidence firewall', () => {
  const subject = new MockP1Subject(
    [preExistingEvent('in-flight-1')],
    [[applicationEvent('poll-1', 'polling')]],
  );
  const admission = admitWithSubject(subject);
  const result = attachP1ObservationSession({
    admission,
    subjectNonce: subject.subjectNonce,
    source: subject.eventSource(),
    bounds: { maxEvents: 100, maxPolls: 100 },
    killSwitchProbe: () => false,
    clock: { nowMs: () => P1_T0 + 2_000 },
  });
  const policy = createProductionPrivacyPolicy({});
  const vocabulary = testOnlyProductionMarkedKeyVocabulary({
    provenanceClass: 'SOURCE_PROVEN_OPENAPI_DEFINITION',
    keys: ['total', 'verdict', 'termination'],
  });
  // The persisted form is a structural summary — counts and categorical
  // outcomes — never raw request content.
  const projection = projectProduction(
    RawEphemeralSource.of({
      total: result.tally.total,
      verdict: result.verdict,
      termination: result.termination,
    }),
    vocabulary,
    policy,
  );
  const evidence = toProductionEvidence({
    projection,
    routeTemplate: PROVEN_ROUTE,
    statusClass: '2XX',
    routeVocabulary: testOnlyProductionMarkedRouteVocabulary({
      provenanceClass: 'SOURCE_PROVEN_OPENAPI_OPERATION',
      templates: [PROVEN_ROUTE],
    }),
    vocabulary,
    policy,
  });
  expect(() => assertPersistableProductionEvidence(evidence)).not.toThrow();
});

test('kill switch and window expiry clean up an attached session', () => {
  const subject = new MockP1Subject([], [[applicationEvent('t1', 'timer')]]);
  const admission = admitWithSubject(subject);
  let polls = 0;
  const killed = attachP1ObservationSession({
    admission,
    subjectNonce: subject.subjectNonce,
    source: subject.eventSource(),
    bounds: { maxEvents: 100, maxPolls: 100 },
    killSwitchProbe: () => {
      polls += 1;
      return polls >= 2;
    },
    clock: { nowMs: () => P1_T0 + 2_000 },
  });
  expect(killed.termination).toBe('KILL_SWITCH_ENGAGED');

  const subject2 = new MockP1Subject([], [[applicationEvent('t1', 'timer')]]);
  const admission2 = admitWithSubject(subject2);
  let nowMs = P1_T0 + 1_000;
  const expired = attachP1ObservationSession({
    admission: admission2,
    subjectNonce: subject2.subjectNonce,
    source: subject2.eventSource(),
    bounds: { maxEvents: 100, maxPolls: 1_000 },
    killSwitchProbe: () => false,
    clock: {
      nowMs: () => {
        const current = nowMs;
        nowMs += P1_WINDOW_MS;
        return current;
      },
    },
  });
  expect(expired.termination).toBe('OBSERVATION_WINDOW_EXPIRED');
  expect(expired.verdict).toBe('OBSERVATION_WINDOW_EMPTY');
});
