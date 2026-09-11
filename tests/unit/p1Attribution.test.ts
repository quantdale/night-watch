// ---------------------------------------------------------------------------
// MA-8 / F-13 — mechanical attribution and the passive session lifecycle.
//
// Required outcomes, exactly:
//   known non-Nightwatch traffic  → accounted for, never mislabelled
//   Nightwatch-caused traffic     → NIGHTWATCH_ATTRIBUTABLE
//   ambiguous traffic             → UNKNOWN, and UNKNOWN never passes
//
// Plus the session bounds: kill-switch termination is prompt, window expiry
// terminates, a stalled source cannot spin forever, and interrupted state
// cannot resume on stale authority.
//
// All fixtures synthetic. No network, no production, no credentials.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';

import {
  classifyObservedRequest,
  classifyP1Session,
  isP1SessionPass,
  tallyAttribution,
  type ObservedRequestEvidence,
} from '../../src/core/prodObserveP1/attribution';
import {
  attachP1ObservationSession,
  type P1ObservationEventSource,
} from '../../src/core/prodObserveP1/session';
import {
  classifyP1InternalError,
  internalErrorReceipt,
  runP1ObservationSessionGuarded,
} from '../../src/core/prodObserveP1/safeReceipt';
import { evaluateP1ObservationScope } from '../../src/core/prodObserveP1/observer';
import { clearP1ObserveGrantRegistryForTest } from '../../src/core/prodObserveP1/authorization';
import { loadP1ScopeConfig } from '../../src/core/prodObserveP1/scopeConfig';
import { P1_T0, P1_WINDOW_MS, mintP1Grant, p1Digest, validP1AdmissionInput, writeP1ScopeConfigFile } from './support/p1Fixtures';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');

function admit() {
  clearP1ObserveGrantRegistryForTest();
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-p1-wsroot-'));
  const { configPath } = writeP1ScopeConfigFile({ repositoryRoot: ROOT, workspaceRoot });
  process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
  const loaded = loadP1ScopeConfig({ repositoryRoot: ROOT, workspaceRoot, digest: p1Digest });
  if (!loaded.ok) throw new Error(`P1_FIXTURE_CONFIG_FAILED:${loaded.failure}`);
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { evidenceDestination: string };
  const grant = mintP1Grant();
  const admission = evaluateP1ObservationScope(
    validP1AdmissionInput({ grant, config: loaded.config, evidenceDestination: raw.evidenceDestination }),
    p1Digest,
  );
  if (!admission.allowed) throw new Error(`P1_FIXTURE_ADMISSION_FAILED:${admission.denialCode}`);
  return admission;
}

test.beforeEach(() => {
  delete process.env.NIGHTWATCH_P1_SCOPE_CONFIG;
});

function evidence(overrides: Partial<ObservedRequestEvidence> & { requestId: string }): ObservedRequestEvidence {
  return {
    observedAfterAttach: true,
    preAttachProof: false,
    nightwatchCausalLink: false,
    initiator: null,
    ...overrides,
  };
}

test.describe('classifier decision table', () => {
  test('a Nightwatch causal link dominates everything, including pre-attach existence', () => {
    expect(
      classifyObservedRequest(
        evidence({ requestId: 'r1', nightwatchCausalLink: true, preAttachProof: true, initiator: 'polling' }),
      ).attribution,
    ).toBe('NIGHTWATCH_ATTRIBUTABLE');
  });

  test('pre-attach proof without a Nightwatch link is operator-preexisting', () => {
    expect(
      classifyObservedRequest(evidence({ requestId: 'r2', preAttachProof: true, initiator: 'navigation' }))
        .attribution,
    ).toBe('OPERATOR_PREEXISTING');
  });

  test('post-attach application activity with initiator metadata is autonomous', () => {
    for (const initiator of ['polling', 'telemetry', 'timer', 'subresource', 'websocket']) {
      expect(classifyObservedRequest(evidence({ requestId: `r-${initiator}`, initiator })).attribution).toBe(
        'APPLICATION_AUTONOMOUS',
      );
    }
  });

  test('missing initiator after attach is UNKNOWN, not autonomous', () => {
    expect(classifyObservedRequest(evidence({ requestId: 'r3' })).attribution).toBe('UNKNOWN');
  });

  test('empty initiator is UNKNOWN', () => {
    expect(classifyObservedRequest(evidence({ requestId: 'r4', initiator: '' })).attribution).toBe('UNKNOWN');
  });

  test('an event never observed after attach with no other proof is UNKNOWN', () => {
    expect(
      classifyObservedRequest(
        evidence({ requestId: 'r5', observedAfterAttach: false, initiator: 'polling' }),
      ).attribution,
    ).toBe('UNKNOWN');
  });
});

test.describe('tally and verdict', () => {
  test('tally accounts every request exactly once', () => {
    const tally = tallyAttribution([
      { requestId: 'a', attribution: 'OPERATOR_PREEXISTING' },
      { requestId: 'b', attribution: 'APPLICATION_AUTONOMOUS' },
      { requestId: 'c', attribution: 'APPLICATION_AUTONOMOUS' },
      { requestId: 'd', attribution: 'UNKNOWN' },
    ]);
    expect(tally).toEqual({
      total: 4,
      operatorPreexisting: 1,
      applicationAutonomous: 2,
      nightwatchAttributable: 0,
      unknown: 1,
    });
  });

  test('verdict matrix', () => {
    const clean = { total: 2, operatorPreexisting: 1, applicationAutonomous: 1, nightwatchAttributable: 0, unknown: 0 };
    expect(classifyP1Session({ subjectAttached: false, windowEmpty: false, tally: clean })).toBe('NO_SUBJECT');
    expect(
      classifyP1Session({
        subjectAttached: true,
        windowEmpty: false,
        tally: { ...clean, nightwatchAttributable: 1, total: 3 },
      }),
    ).toBe('NIGHTWATCH_TRAFFIC_DETECTED');
    expect(
      classifyP1Session({ subjectAttached: true, windowEmpty: false, tally: { ...clean, unknown: 1, total: 3 } }),
    ).toBe('ATTRIBUTION_UNKNOWN');
    // Nightwatch traffic dominates unknown: both present still reports the cause.
    expect(
      classifyP1Session({
        subjectAttached: true,
        windowEmpty: false,
        tally: { total: 4, operatorPreexisting: 1, applicationAutonomous: 1, nightwatchAttributable: 1, unknown: 1 },
      }),
    ).toBe('NIGHTWATCH_TRAFFIC_DETECTED');
    expect(
      classifyP1Session({
        subjectAttached: true,
        windowEmpty: true,
        tally: { total: 0, operatorPreexisting: 0, applicationAutonomous: 0, nightwatchAttributable: 0, unknown: 0 },
      }),
    ).toBe('OBSERVATION_WINDOW_EMPTY');
    expect(
      classifyP1Session({
        subjectAttached: true,
        windowEmpty: false,
        tally: { total: 0, operatorPreexisting: 0, applicationAutonomous: 0, nightwatchAttributable: 0, unknown: 0 },
      }),
    ).toBe('NO_QUALIFYING_OBSERVATION');
    expect(classifyP1Session({ subjectAttached: true, windowEmpty: false, tally: clean })).toBe(
      'PASSIVE_OBSERVATION_COMPLETE',
    );
  });

  test('only the complete outcome passes', () => {
    for (const outcome of [
      'NO_SUBJECT',
      'NO_QUALIFYING_OBSERVATION',
      'ATTRIBUTION_UNKNOWN',
      'NIGHTWATCH_TRAFFIC_DETECTED',
      'OBSERVATION_WINDOW_EMPTY',
    ] as const) {
      expect(isP1SessionPass(outcome)).toBe(false);
    }
    expect(isP1SessionPass('PASSIVE_OBSERVATION_COMPLETE')).toBe(true);
  });
});

test.describe('passive session lifecycle', () => {
  function scriptedSource(script: { events: ObservedRequestEvidence[]; sourceEnded: boolean }[]): P1ObservationEventSource {
    let index = 0;
    return {
      poll: () => script[Math.min(index++, script.length - 1)] ?? { events: [], sourceEnded: true },
    };
  }

  test('clean application traffic to source end passes and completes cleanly', () => {
    const admission = admit();
    let nowMs = P1_T0 + 1_000;
    const result = attachP1ObservationSession({
      admission,
      subjectNonce: admission.admittedSubjectNonce ?? '',
      source: scriptedSource([
        { events: [evidence({ requestId: 'pre', preAttachProof: true, initiator: 'navigation' })], sourceEnded: false },
        { events: [evidence({ requestId: 'poll', initiator: 'polling' })], sourceEnded: true },
      ]),
      bounds: { maxEvents: 100, maxPolls: 100 },
      killSwitchProbe: () => false,
      clock: { nowMs: () => nowMs++ },
    });
    expect(result.termination).toBe('SOURCE_ENDED');
    expect(result.verdict).toBe('PASSIVE_OBSERVATION_COMPLETE');
    expect(result.completedCleanly).toBe(true);
    expect(result.tally).toEqual({
      total: 2,
      operatorPreexisting: 1,
      applicationAutonomous: 1,
      nightwatchAttributable: 0,
      unknown: 0,
    });
    expect(result.pollsUsed).toBe(2);
  });

  test('a synthetic Nightwatch-caused request is detected, never relabelled', () => {
    const admission = admit();
    const result = attachP1ObservationSession({
      admission,
      subjectNonce: admission.admittedSubjectNonce ?? '',
      source: scriptedSource([
        { events: [evidence({ requestId: 'nw', nightwatchCausalLink: true, initiator: 'fetch' })], sourceEnded: true },
      ]),
      bounds: { maxEvents: 100, maxPolls: 100 },
      killSwitchProbe: () => false,
      clock: { nowMs: () => P1_T0 + 2_000 },
    });
    expect(result.verdict).toBe('NIGHTWATCH_TRAFFIC_DETECTED');
    expect(result.completedCleanly).toBe(false);
  });

  test('ambiguous traffic fails closed', () => {
    const admission = admit();
    const result = attachP1ObservationSession({
      admission,
      subjectNonce: admission.admittedSubjectNonce ?? '',
      source: scriptedSource([{ events: [evidence({ requestId: 'amb' })], sourceEnded: true }]),
      bounds: { maxEvents: 100, maxPolls: 100 },
      killSwitchProbe: () => false,
      clock: { nowMs: () => P1_T0 + 2_000 },
    });
    expect(result.verdict).toBe('ATTRIBUTION_UNKNOWN');
    expect(result.completedCleanly).toBe(false);
  });

  test('kill switch during observation terminates promptly', () => {
    const admission = admit();
    let polls = 0;
    const result = attachP1ObservationSession({
      admission,
      subjectNonce: admission.admittedSubjectNonce ?? '',
      source: {
        poll: () => {
          polls += 1;
          return { events: [evidence({ requestId: `e${polls}`, initiator: 'polling' })], sourceEnded: false };
        },
      },
      bounds: { maxEvents: 10_000, maxPolls: 10_000 },
      killSwitchProbe: () => polls >= 3,
      clock: { nowMs: () => P1_T0 + 2_000 },
    });
    expect(result.termination).toBe('KILL_SWITCH_ENGAGED');
    expect(polls).toBeLessThanOrEqual(4);
    expect(result.completedCleanly).toBe(false);
  });

  test('window expiry terminates with an empty window, never a pass', () => {
    const admission = admit();
    let nowMs = P1_T0 + 1_000;
    const result = attachP1ObservationSession({
      admission,
      subjectNonce: admission.admittedSubjectNonce ?? '',
      source: scriptedSource([{ events: [], sourceEnded: false }]),
      bounds: { maxEvents: 100, maxPolls: 10_000 },
      killSwitchProbe: () => false,
      clock: {
        nowMs: () => {
          const current = nowMs;
          nowMs += P1_WINDOW_MS;
          return current;
        },
      },
    });
    expect(result.termination).toBe('OBSERVATION_WINDOW_EXPIRED');
    expect(result.verdict).toBe('OBSERVATION_WINDOW_EMPTY');
    expect(result.completedCleanly).toBe(false);
  });

  test('a stalled source cannot spin forever: the poll budget terminates it', () => {
    const admission = admit();
    const result = attachP1ObservationSession({
      admission,
      subjectNonce: admission.admittedSubjectNonce ?? '',
      source: scriptedSource([{ events: [], sourceEnded: false }]),
      bounds: { maxEvents: 100, maxPolls: 7 },
      killSwitchProbe: () => false,
      clock: { nowMs: () => P1_T0 + 2_000 },
    });
    expect(result.termination).toBe('POLL_BUDGET_EXHAUSTED');
    expect(result.pollsUsed).toBe(7);
    expect(result.verdict).toBe('NO_QUALIFYING_OBSERVATION');
  });

  test('a flooding source cannot overflow silently: the event budget terminates it', () => {
    const admission = admit();
    const result = attachP1ObservationSession({
      admission,
      subjectNonce: admission.admittedSubjectNonce ?? '',
      source: {
        poll: () => ({ events: [evidence({ requestId: 'f', initiator: 'polling' })], sourceEnded: false }),
      },
      bounds: { maxEvents: 5, maxPolls: 10_000 },
      killSwitchProbe: () => false,
      clock: { nowMs: () => P1_T0 + 2_000 },
    });
    expect(result.termination).toBe('EVENT_BUDGET_EXHAUSTED');
    expect(result.attributed.length).toBe(5);
    expect(result.completedCleanly).toBe(false);
  });

  test('attach refuses a denied admission, a wrong nonce, and a second attach', () => {
    const admission = admit();
    const bounds = { maxEvents: 10, maxPolls: 10 };
    const quiet = scriptedSource([{ events: [], sourceEnded: true }]);
    expect(() =>
      attachP1ObservationSession({
        admission: { ...admission, allowed: false as const },
        subjectNonce: admission.admittedSubjectNonce ?? '',
        source: quiet,
        bounds,
        killSwitchProbe: () => false,
        clock: { nowMs: () => P1_T0 + 2_000 },
      }),
    ).toThrow('P1_SESSION_ADMISSION_DENIED');
    expect(() =>
      attachP1ObservationSession({
        admission,
        subjectNonce: 'wrong-nonce',
        source: quiet,
        bounds,
        killSwitchProbe: () => false,
        clock: { nowMs: () => P1_T0 + 2_000 },
      }),
    ).toThrow('P1_SESSION_SUBJECT_MISMATCH');
    const first = attachP1ObservationSession({
      admission,
      subjectNonce: admission.admittedSubjectNonce ?? '',
      source: quiet,
      bounds,
      killSwitchProbe: () => false,
      clock: { nowMs: () => P1_T0 + 2_000 },
    });
    expect(first.termination).toBe('SOURCE_ENDED');
    // Interrupted state cannot resume on the same admission: no second attach.
    expect(() =>
      attachP1ObservationSession({
        admission,
        subjectNonce: admission.admittedSubjectNonce ?? '',
        source: quiet,
        bounds,
        killSwitchProbe: () => false,
        clock: { nowMs: () => P1_T0 + 2_000 },
      }),
    ).toThrow('P1_SESSION_ADMISSION_ALREADY_ATTACHED');
  });

  test('attach past the deadline throws instead of observing stale', () => {
    const admission = admit();
    expect(admission.observationDeadlineMs).not.toBe(null);
    expect(() =>
      attachP1ObservationSession({
        admission,
        subjectNonce: admission.admittedSubjectNonce ?? '',
        source: scriptedSource([{ events: [], sourceEnded: true }]),
        bounds: { maxEvents: 10, maxPolls: 10 },
        killSwitchProbe: () => false,
        clock: { nowMs: () => (admission.observationDeadlineMs ?? 0) + 1 },
      }),
    ).toThrow('P1_SESSION_WINDOW_ALREADY_EXPIRED');
  });

  test('attach with the kill switch engaged refuses', () => {
    const admission = admit();
    expect(() =>
      attachP1ObservationSession({
        admission,
        subjectNonce: admission.admittedSubjectNonce ?? '',
        source: scriptedSource([{ events: [], sourceEnded: true }]),
        bounds: { maxEvents: 10, maxPolls: 10 },
        killSwitchProbe: () => true,
        clock: { nowMs: () => P1_T0 + 2_000 },
      }),
    ).toThrow('P1_SESSION_KILL_SWITCH_ENGAGED_AT_ATTACH');
  });

  test('unbounded sessions are refused at construction', () => {
    const admission = admit();
    const quiet = scriptedSource([{ events: [], sourceEnded: true }]);
    for (const bounds of [
      { maxEvents: 0, maxPolls: 10 },
      { maxEvents: 10, maxPolls: 0 },
      { maxEvents: Number.POSITIVE_INFINITY, maxPolls: 10 },
      { maxEvents: 10, maxPolls: Number.NaN },
    ]) {
      expect(() =>
        attachP1ObservationSession({
          admission,
          subjectNonce: admission.admittedSubjectNonce ?? '',
          source: quiet,
          bounds,
          killSwitchProbe: () => false,
          clock: { nowMs: () => P1_T0 + 2_000 },
        }),
      ).toThrow('P1_SESSION_BOUNDS_INVALID');
    }
  });
});

// ---------------------------------------------------------------------------
// C-12 acceptance hardening — the abort and the safe error receipt.
//
// Passive observation is proved passive by the request-accounting path, not
// asserted by the scenario: a Nightwatch-attributable request ABORTS the
// session immediately, records its origin, and marks the evidence invalid for
// acceptance. An internal error emits a safe `INTERNAL_ERROR` receipt that
// carries no raw value and no digest derived from one.
// ---------------------------------------------------------------------------

test.describe('passive observation abort and the safe receipt', () => {
  const BOUNDS = { maxEvents: 100, maxPolls: 100 };

  function scriptedSource(script: { events: ObservedRequestEvidence[]; sourceEnded: boolean }[]): P1ObservationEventSource {
    let index = 0;
    return {
      poll: () => script[Math.min(index++, script.length - 1)] ?? { events: [], sourceEnded: true },
    };
  }

  test('a Nightwatch-attributable request aborts, records its origin, and invalidates evidence', () => {
    const admission = admit();
    const result = attachP1ObservationSession({
      admission,
      subjectNonce: admission.admittedSubjectNonce ?? '',
      source: {
        poll: () => ({
          events: [
            evidence({ requestId: 'nw-origin', nightwatchCausalLink: true, initiator: 'fetch' }),
            // A second event is waiting. The abort must mean it is never
            // classified: evidence gathered after Nightwatch caused traffic is
            // no longer passive evidence.
            evidence({ requestId: 'after-abort', initiator: 'polling' }),
          ],
          sourceEnded: false,
        }),
      },
      bounds: BOUNDS,
      killSwitchProbe: () => false,
      clock: { nowMs: () => P1_T0 + 2_000 },
    });
    expect(result.termination).toBe('NIGHTWATCH_ATTRIBUTABLE_REQUEST_ABORT');
    expect(result.attributionAbortRequestId).toBe('nw-origin');
    expect(result.acceptanceEvidence).toBe('INVALID_FOR_ACCEPTANCE');
    expect(result.verdict).toBe('NIGHTWATCH_TRAFFIC_DETECTED');
    expect(result.completedCleanly).toBe(false);
    expect(result.attributed.map((request) => request.requestId)).toEqual(['nw-origin']);
    expect(result.pollsUsed).toBe(1);
  });

  test('clean traffic keeps evidence valid for acceptance', () => {
    const admission = admit();
    const result = attachP1ObservationSession({
      admission,
      subjectNonce: admission.admittedSubjectNonce ?? '',
      source: scriptedSource([{ events: [evidence({ requestId: 'app', initiator: 'polling' })], sourceEnded: true }]),
      bounds: BOUNDS,
      killSwitchProbe: () => false,
      clock: { nowMs: () => P1_T0 + 2_000 },
    });
    expect(result.acceptanceEvidence).toBe('VALID_FOR_ACCEPTANCE');
    expect(result.attributionAbortRequestId).toBeNull();
  });

  test('an internal error emits a safe INTERNAL_ERROR receipt with no raw value or value-derived digest', () => {
    const sentinel = 'NWSENT0012-raw-customer-value';
    const admission = admit();
    const guarded = runP1ObservationSessionGuarded(
      {
        admission,
        subjectNonce: admission.admittedSubjectNonce ?? '',
        source: {
          poll: () => {
            throw new Error(`P1_SESSION_ADMISSION_DENIED: leaked ${sentinel}`);
          },
        },
        bounds: BOUNDS,
        killSwitchProbe: () => false,
        clock: { nowMs: () => P1_T0 + 2_000 },
      },
      p1Digest,
    );
    expect(guarded.ok).toBe(false);
    if (guarded.ok) throw new Error('unreachable');
    const receipt = guarded.receipt;
    expect(receipt.outcome).toBe('INTERNAL_ERROR');
    // The class is bounded: the allowlisted token survives, the message does not.
    expect(receipt.errorClass).toBe('P1_SESSION_ADMISSION_DENIED');
    const serialized = JSON.stringify(receipt);
    expect(serialized).not.toContain(sentinel);
    expect(serialized).not.toContain('leaked');
    // No value-derived digest either: nothing hashes the error text.
    expect(receipt.receiptDigest).not.toBe(`p1receipt:${p1Digest(sentinel)}`);
    expect(serialized).not.toContain(p1Digest(sentinel));
  });

  test('an unrecognized error text reduces to an unclassified bounded class', () => {
    expect(classifyP1InternalError(new Error('exploded with NWSENT0012'))).toBe('P1_INTERNAL_ERROR_UNCLASSIFIED');
    expect(classifyP1InternalError(new Error('P1_NOT_A_REAL_CODE: x'))).toBe('P1_INTERNAL_ERROR_UNCLASSIFIED');
    expect(classifyP1InternalError('a raw string error')).toBe('P1_INTERNAL_ERROR_UNCLASSIFIED');
    const receipt = internalErrorReceipt(new Error('anything at all'), p1Digest);
    expect(receipt.outcome).toBe('INTERNAL_ERROR');
    expect(receipt.acceptanceEvidence).toBe('NOT_APPLICABLE');
    expect(receipt.requestCounts.total).toBe(0);
  });

  test('a session-level refusal still produces a safe receipt through the guarded runner', () => {
    const admission = admit();
    const guarded = runP1ObservationSessionGuarded(
      {
        admission,
        subjectNonce: admission.admittedSubjectNonce ?? '',
        source: scriptedSource([{ events: [], sourceEnded: true }]),
        bounds: { maxEvents: 0, maxPolls: 1 },
        killSwitchProbe: () => false,
        clock: { nowMs: () => P1_T0 + 2_000 },
      },
      p1Digest,
    );
    expect(guarded.ok).toBe(false);
    if (guarded.ok) throw new Error('unreachable');
    expect(guarded.receipt.outcome).toBe('INTERNAL_ERROR');
    expect(guarded.receipt.errorClass).toBe('P1_SESSION_BOUNDS_INVALID');
  });
});
