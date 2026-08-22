import { test, expect } from '@playwright/test';
import {
  CANDIDATE_LIFECYCLE_VERSION,
  initialLifecycleRecord,
  isTerminalCandidateLifecycleState,
  stableLifecycleJson,
  transitionCandidateLifecycle,
  validateCandidateLifecycleRecord,
  type CandidateLifecycleEvent,
  type CandidateLifecycleRecord,
  type CandidateLifecycleState,
  type CandidateLifecycleVariant,
} from '../../src/core/campaign/candidateLifecycle';

// Independent enumerations — deliberately not imported from the module so the
// exhaustive matrix cannot inherit a mistake in the module's own vocabulary.
const ALL_STATES: readonly CandidateLifecycleState[] = [
  'OBSERVED', 'ADMITTED', 'REPRODUCED', 'MINIMIZED', 'UNCHANGED',
  'TRIAGED', 'DOSSIER_READY', 'REJECTED', 'UNRESOLVED',
];
const ALL_EVENTS: readonly CandidateLifecycleEvent[] = [
  'ADMIT', 'REJECT', 'CONFIRM_REPRODUCTION', 'FAIL_REPRODUCTION',
  'APPLY_MINIMIZATION', 'KEEP_UNCHANGED', 'COMPLETE_TRIAGE',
  'CLASSIFY_REJECTED', 'CLASSIFY_UNRESOLVED', 'MARK_DOSSIER_READY',
];
const TERMINAL_STATES: readonly CandidateLifecycleState[] = ['DOSSIER_READY', 'REJECTED', 'UNRESOLVED'];
const VARIANTS: readonly CandidateLifecycleVariant[] = ['PROTOCOL_ONLY', 'SEMANTIC'];
const RECORD_KEYS: readonly string[] = ['lifecycleVersion', 'variant', 'state', 'transitionCount', 'lastReasonCode'];

// Independent oracle of all 21 legal edges (from, event, to), including the
// Phase-15P A05 GATE_BLOCK exits and the A05-round-2 CLUSTERED state.
const LEGAL_EDGES: readonly (readonly [CandidateLifecycleState, CandidateLifecycleEvent, CandidateLifecycleState])[] = [
  ['OBSERVED', 'ADMIT', 'ADMITTED'],
  ['OBSERVED', 'REJECT', 'REJECTED'],
  ['OBSERVED', 'GATE_BLOCK', 'UNRESOLVED'],
  ['ADMITTED', 'CONFIRM_REPRODUCTION', 'REPRODUCED'],
  ['ADMITTED', 'FAIL_REPRODUCTION', 'UNRESOLVED'],
  ['ADMITTED', 'REJECT', 'REJECTED'],
  ['ADMITTED', 'GATE_BLOCK', 'UNRESOLVED'],
  ['REPRODUCED', 'APPLY_MINIMIZATION', 'MINIMIZED'],
  ['REPRODUCED', 'KEEP_UNCHANGED', 'UNCHANGED'],
  ['REPRODUCED', 'FAIL_REPRODUCTION', 'UNRESOLVED'],
  ['REPRODUCED', 'GATE_BLOCK', 'UNRESOLVED'],
  ['MINIMIZED', 'CLUSTERED', 'CLUSTERED'],
  ['MINIMIZED', 'COMPLETE_TRIAGE', 'TRIAGED'],
  ['MINIMIZED', 'GATE_BLOCK', 'UNRESOLVED'],
  ['CLUSTERED', 'COMPLETE_TRIAGE', 'TRIAGED'],
  ['CLUSTERED', 'GATE_BLOCK', 'UNRESOLVED'],
  ['UNCHANGED', 'COMPLETE_TRIAGE', 'TRIAGED'],
  ['UNCHANGED', 'GATE_BLOCK', 'UNRESOLVED'],
  ['TRIAGED', 'MARK_DOSSIER_READY', 'DOSSIER_READY'],
  ['TRIAGED', 'CLASSIFY_REJECTED', 'REJECTED'],
  ['TRIAGED', 'CLASSIFY_UNRESOLVED', 'UNRESOLVED'],
];

const PATH_TO_STATE: Record<CandidateLifecycleState, readonly CandidateLifecycleEvent[]> = {
  OBSERVED: [],
  ADMITTED: ['ADMIT'],
  REPRODUCED: ['ADMIT', 'CONFIRM_REPRODUCTION'],
  MINIMIZED: ['ADMIT', 'CONFIRM_REPRODUCTION', 'APPLY_MINIMIZATION'],
  CLUSTERED: ['ADMIT', 'CONFIRM_REPRODUCTION', 'APPLY_MINIMIZATION', 'CLUSTERED'],
  UNCHANGED: ['ADMIT', 'CONFIRM_REPRODUCTION', 'KEEP_UNCHANGED'],
  TRIAGED: ['ADMIT', 'CONFIRM_REPRODUCTION', 'APPLY_MINIMIZATION', 'COMPLETE_TRIAGE'],
  DOSSIER_READY: ['ADMIT', 'CONFIRM_REPRODUCTION', 'APPLY_MINIMIZATION', 'COMPLETE_TRIAGE', 'MARK_DOSSIER_READY'],
  REJECTED: ['REJECT'],
  UNRESOLVED: ['ADMIT', 'FAIL_REPRODUCTION'],
};

function driveTo(variant: CandidateLifecycleVariant, state: CandidateLifecycleState): CandidateLifecycleRecord {
  let record = initialLifecycleRecord(variant);
  for (const event of PATH_TO_STATE[state]) record = transitionCandidateLifecycle(record, event);
  return record;
}

function expectedTarget(state: CandidateLifecycleState, event: CandidateLifecycleEvent): CandidateLifecycleState | null {
  for (const [from, via, to] of LEGAL_EDGES) {
    if (from === state && via === event) return to;
  }
  return null;
}

function poisoned(key: string, value: unknown): unknown {
  return { ...initialLifecycleRecord('PROTOCOL_ONLY'), [key]: value };
}

function omitKey(key: string): unknown {
  const copy: Record<string, unknown> = { ...initialLifecycleRecord('SEMANTIC') };
  delete copy[key];
  return copy;
}

test.describe('Phase 15 Session 2 WORKSTREAM_A — candidate lifecycle state machine', () => {
  test('initial record is OBSERVED, count 0, frozen, version-bound', () => {
    for (const variant of VARIANTS) {
      const record = initialLifecycleRecord(variant);
      expect(record.state).toBe('OBSERVED');
      expect(record.transitionCount).toBe(0);
      expect(record.lastReasonCode).toBeNull();
      expect(record.lifecycleVersion).toBe(CANDIDATE_LIFECYCLE_VERSION);
      expect(record.variant).toBe(variant);
      expect(Object.isFrozen(record)).toBe(true);
      expect(() => validateCandidateLifecycleRecord(record)).not.toThrow();
    }
  });

  test('every legal edge transitions correctly with count increment and reason-code behavior', () => {
    for (const [from, event, to] of LEGAL_EDGES) {
      const record = driveTo('PROTOCOL_ONLY', from);
      const withReason = transitionCandidateLifecycle(record, event, 'TEST_REASON_CODE');
      expect(withReason.state, `${from} --${event}--> ${to}`).toBe(to);
      expect(withReason.transitionCount).toBe(PATH_TO_STATE[from].length + 1);
      expect(withReason.lastReasonCode).toBe('TEST_REASON_CODE');
      expect(withReason.lifecycleVersion).toBe(CANDIDATE_LIFECYCLE_VERSION);
      expect(withReason.variant).toBe('PROTOCOL_ONLY');
      expect(Object.isFrozen(withReason)).toBe(true);
      if (event === 'GATE_BLOCK') {
        // Gate failures carry a mandatory reason code; omitting one is its
        // own rejection, never a silent normalization.
        expect(() => transitionCandidateLifecycle(record, event))
          .toThrow('CANDIDATE_LIFECYCLE_GATE_REASON_REQUIRED');
        continue;
      }
      const withoutReason = transitionCandidateLifecycle(record, event);
      expect(withoutReason.state).toBe(to);
      expect(withoutReason.lastReasonCode).toBeNull();
      expect(withoutReason.transitionCount).toBe(PATH_TO_STATE[from].length + 1);
    }
  });

  test('exhaustive matrix over every lifecycle state x every event: legal lands, illegal throws', () => {
    for (const state of ALL_STATES) {
      for (const event of ALL_EVENTS) {
        const record = driveTo('PROTOCOL_ONLY', state);
        const target = expectedTarget(state, event);
        if (target === null) {
          expect(() => transitionCandidateLifecycle(record, event), `${state} x ${event} must throw`)
            .toThrow(/CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION/);
        } else {
          const next = transitionCandidateLifecycle(record, event, 'MATRIX_REASON');
          expect(next.state, `${state} x ${event} must land`).toBe(target);
          expect(next.transitionCount).toBe(PATH_TO_STATE[state].length + 1);
          expect(next.lastReasonCode).toBe('MATRIX_REASON');
          expect(next.variant).toBe('PROTOCOL_ONLY');
        }
      }
    }
  });

  test('terminal states reject every event and report terminal; non-terminal states do not', () => {
    for (const terminal of TERMINAL_STATES) {
      expect(isTerminalCandidateLifecycleState(terminal)).toBe(true);
      const record = driveTo('SEMANTIC', terminal);
      for (const event of ALL_EVENTS) {
        expect(() => transitionCandidateLifecycle(record, event), `${terminal} x ${event}`)
          .toThrow(/CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION/);
      }
    }
    for (const state of ALL_STATES) {
      if (!TERMINAL_STATES.includes(state)) expect(isTerminalCandidateLifecycleState(state)).toBe(false);
    }
  });

  test('illegal known event message carries safe FROM/EVENT tokens', () => {
    const record = initialLifecycleRecord('PROTOCOL_ONLY');
    try {
      transitionCandidateLifecycle(record, 'MARK_DOSSIER_READY');
      throw new Error('EXPECTED_THROW_NOT_REACHED');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION');
      expect(message).toContain('FROM:OBSERVED');
      expect(message).toContain('EVENT:MARK_DOSSIER_READY');
    }
  });

  test('unknown or non-string event fails closed without echoing the payload', () => {
    const record = initialLifecycleRecord('PROTOCOL_ONLY');
    expect(() => transitionCandidateLifecycle(record, 'NOT_AN_EVENT' as unknown as CandidateLifecycleEvent))
      .toThrow(/CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION/);
    expect(() => transitionCandidateLifecycle(record, 42 as unknown as CandidateLifecycleEvent))
      .toThrow(/CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION/);
    try {
      transitionCandidateLifecycle(record, 'NOT_AN_EVENT' as unknown as CandidateLifecycleEvent);
      throw new Error('EXPECTED_THROW_NOT_REACHED');
    } catch (error) {
      expect((error as Error).message).not.toContain('NOT_AN_EVENT');
    }
  });

  test('validator rejects non-objects, missing keys, and unknown fields', () => {
    for (const bad of [null, undefined, 42, 'record', [], true]) {
      expect(() => validateCandidateLifecycleRecord(bad)).toThrow(/CANDIDATE_LIFECYCLE_INVALID_RECORD/);
    }
    for (const key of RECORD_KEYS) {
      expect(() => validateCandidateLifecycleRecord(omitKey(key)), `missing ${key}`)
        .toThrow(/CANDIDATE_LIFECYCLE_INVALID_RECORD/);
      expect(() => validateCandidateLifecycleRecord(omitKey(key)), `missing ${key}`).toThrow(/MISSING_FIELD/);
    }
    expect(() => validateCandidateLifecycleRecord({ ...initialLifecycleRecord('SEMANTIC'), extraField: 'x' }))
      .toThrow(/UNKNOWN_FIELD/);
  });

  test('validator rejects wrong version, wrong enums, and bad counts', () => {
    expect(() => validateCandidateLifecycleRecord(poisoned('lifecycleVersion', 'nightwatch.candidate-lifecycle.private.v0')))
      .toThrow(/VERSION_INVALID/);
    expect(() => validateCandidateLifecycleRecord(poisoned('variant', 'MAGIC'))).toThrow(/VARIANT/);
    expect(() => validateCandidateLifecycleRecord(poisoned('state', 'LOST'))).toThrow(/STATE/);
    for (const bad of [-1, 1.5, '3', null, Number.POSITIVE_INFINITY]) {
      expect(() => validateCandidateLifecycleRecord(poisoned('transitionCount', bad)), `count ${String(bad)}`)
        .toThrow(/TRANSITION_COUNT/);
    }
  });

  test('validator rejects free-text lastReasonCode values', () => {
    for (const bad of [5, {}, 'free text with spaces', 'lower_case']) {
      expect(() => validateCandidateLifecycleRecord(poisoned('lastReasonCode', bad))).toThrow(/REASON_CODE/);
    }
  });

  test('sentinel-like strings are rejected in any field by the validator', () => {
    for (const key of RECORD_KEYS) {
      const bad = poisoned(key, 'CUSTOMER_SENTINEL');
      expect(() => validateCandidateLifecycleRecord(bad), `sentinel in ${key}`)
        .toThrow(/CANDIDATE_LIFECYCLE_INVALID_RECORD/);
      expect(() => validateCandidateLifecycleRecord(bad), `sentinel in ${key}`).toThrow(/PRIVACY_BLOCKED/);
    }
    for (const sentinel of [
      'ACCOUNT_SENTINEL',
      'Bearer abcdefgh',
      'eyJhbGciOiJIUzI1NiIs.',
      'AKIAIOSFODNN7EXAMPLE',
      '-----BEGIN RSA PRIVATE KEY-----',
    ]) {
      expect(() => validateCandidateLifecycleRecord(poisoned('variant', sentinel)), sentinel).toThrow(/PRIVACY_BLOCKED/);
    }
  });

  test('reason codes accept only safe tokens; sentinels and free text fail closed at transitions too', () => {
    const observed = initialLifecycleRecord('PROTOCOL_ONLY');
    expect(transitionCandidateLifecycle(observed, 'ADMIT', 'SOURCE_STALE').lastReasonCode).toBe('SOURCE_STALE');
    expect(() => transitionCandidateLifecycle(observed, 'ADMIT', 'CUSTOMER_SENTINEL'))
      .toThrow(/CANDIDATE_LIFECYCLE_REASON_CODE_INVALID/);
    expect(() => transitionCandidateLifecycle(observed, 'ADMIT', 'raw customer text here'))
      .toThrow(/CANDIDATE_LIFECYCLE_REASON_CODE_INVALID/);
  });

  test('variant is carried immutably and both variants behave identically mechanically', () => {
    const steps: readonly CandidateLifecycleEvent[] = [
      'ADMIT', 'CONFIRM_REPRODUCTION', 'APPLY_MINIMIZATION', 'COMPLETE_TRIAGE', 'MARK_DOSSIER_READY',
    ];
    function happyPath(variant: CandidateLifecycleVariant): CandidateLifecycleRecord[] {
      let record = initialLifecycleRecord(variant);
      const chain = [record];
      for (const event of steps) {
        record = transitionCandidateLifecycle(record, event, 'STEP');
        chain.push(record);
      }
      return chain;
    }
    const proto = happyPath('PROTOCOL_ONLY');
    const sem = happyPath('SEMANTIC');
    expect(proto.length).toBe(sem.length);
    const stripVariant = (record: CandidateLifecycleRecord) => ({
      lifecycleVersion: record.lifecycleVersion,
      state: record.state,
      transitionCount: record.transitionCount,
      lastReasonCode: record.lastReasonCode,
    });
    for (let index = 0; index < proto.length; index++) {
      const p = proto[index] as CandidateLifecycleRecord;
      const s = sem[index] as CandidateLifecycleRecord;
      expect(s.state).toBe(p.state);
      expect(s.transitionCount).toBe(p.transitionCount);
      expect(stableLifecycleJson(stripVariant(s))).toBe(stableLifecycleJson(stripVariant(p)));
    }
    const finalProto = proto[proto.length - 1] as CandidateLifecycleRecord;
    expect(finalProto.state).toBe('DOSSIER_READY');
    expect(Object.isFrozen(finalProto)).toBe(true);
    expect(() => {
      (finalProto as { variant?: string }).variant = 'SEMANTIC';
    }).toThrow();
    expect(finalProto.variant).toBe('PROTOCOL_ONLY');
  });

  test('transitions never mutate the input record and outputs are independent objects', () => {
    const input = initialLifecycleRecord('SEMANTIC');
    const before = stableLifecycleJson(input);
    const next = transitionCandidateLifecycle(input, 'ADMIT', 'X');
    expect(stableLifecycleJson(input)).toBe(before);
    expect(input.state).toBe('OBSERVED');
    expect(input.transitionCount).toBe(0);
    expect(next.state).toBe('ADMITTED');
    const a = initialLifecycleRecord('PROTOCOL_ONLY');
    const b = initialLifecycleRecord('PROTOCOL_ONLY');
    expect(a).not.toBe(b);
    expect(stableLifecycleJson(a)).toBe(stableLifecycleJson(b));
  });

  test('stableLifecycleJson is byte-identical across repeated calls and key-order independent', () => {
    const record = driveTo('SEMANTIC', 'TRIAGED');
    const json1 = stableLifecycleJson(record);
    expect(stableLifecycleJson(record)).toBe(json1);
    expect(stableLifecycleJson(record)).toBe(json1);
    const reordered: Record<string, unknown> = {
      state: record.state,
      lastReasonCode: record.lastReasonCode,
      lifecycleVersion: record.lifecycleVersion,
      variant: record.variant,
      transitionCount: record.transitionCount,
    };
    expect(stableLifecycleJson(reordered)).toBe(json1);
    const parsed = JSON.parse(json1) as unknown;
    expect(() => validateCandidateLifecycleRecord(parsed)).not.toThrow();
    expect(parsed).toEqual(record);
  });

  test('same input yields the same output record shape', () => {
    const a = transitionCandidateLifecycle(initialLifecycleRecord('PROTOCOL_ONLY'), 'ADMIT', 'CODE_A');
    const b = transitionCandidateLifecycle(initialLifecycleRecord('PROTOCOL_ONLY'), 'ADMIT', 'CODE_A');
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(stableLifecycleJson(a)).toBe(stableLifecycleJson(b));
  });

  test('every reachable record in every state passes strict validation', () => {
    for (const variant of VARIANTS) {
      for (const state of ALL_STATES) {
        expect(() => validateCandidateLifecycleRecord(driveTo(variant, state)), `${variant} ${state}`).not.toThrow();
      }
    }
  });
});
