// ---------------------------------------------------------------------------
// Phase 15P (A05) — candidate lifecycle GATE authority tests.
//
// Permanent focused suite for the campaign candidate lifecycle state machine's
// load-bearing gate routing:
//   G1  full legal-path matrix per variant (PROTOCOL_ONLY / SEMANTIC),
//       including the additive GATE_BLOCK edges — every legal edge lands,
//       every illegal (state x event) combination fails closed
//   G2  gate-failure routing proofs: GATE_BLOCK requires a reason code, lands
//       UNRESOLVED terminal with the gate identity preserved, and is
//       idempotent on already-terminal records (gateBlockCandidateLifecycle)
//   G3  terminal-state completeness: exactly three terminals, every open
//       state can reach a terminal, no contradictory combinations exist
//   G4  serializer round-trips for every reachable record shape
//   G5  determinism: identical event sequences produce byte-identical
//       canonical serializations across repeats and across variants
//   G6  compatibility: version string, the historical 13-edge behavior, and
//       legacy serialized records keep validating unchanged
//   G7  orchestrator integration: safety/privacy gates during reproduction
//       route the candidate to an explicit blocked terminal; a finalized
//       non-resumable run leaves NO record in an ambiguous mid-state;
//       resumable interruptions keep their truthful mid-pipeline record.
//
// Synthetic fixtures only; frozen clock; temp PrivateArtifactStore per test.
// No credentials, no customer data, no network.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  CANDIDATE_LIFECYCLE_STATES,
  CANDIDATE_LIFECYCLE_VERSION,
  gateBlockCandidateLifecycle,
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
import {
  CAMPAIGN_ORCHESTRATOR_VERSION,
  CAMPAIGN_SCHEMA_VERSION,
  INITIAL_REAL_CAMPAIGN_BUDGET,
  createCampaignManifest,
  runCampaign,
  type CampaignAnomalyCandidate,
  type CampaignBudgetPolicy,
  type CampaignCheckpoint,
  type CampaignExecutor,
  type CampaignExecutionOutcome,
  type CampaignInput,
  type CampaignPrivacyPolicy,
  type CampaignRunResult,
  type CampaignVersionFingerprint,
  type CampaignWorkItem,
} from '../../src/core/campaign';
import { PHASE5_API_CATALOG } from '../../src/api/phase5/catalog';
import { API_CATALOG_VERSION, SCENARIO_GENERATOR_VERSION } from '../../src/api/phase5/types';
import { DEPENDENCY_MAP_VERSION, RIPPLE_REPOSITORIES, SELECTOR_VERSION } from '../../src/core/changeIntelligence';
import { RIPPLE_PHASE4_ACTIONS, RIPPLE_PHASE4_ENVELOPES } from '../../src/products/ripple/explorationCatalog';
import { EXPLORATION_MODEL_VERSION, PLANNER_VERSION, SAFE_ACTION_CATALOG_VERSION, type SafetyVector } from '../../src/core/exploration/types';
import { JOURNEY_CONTRACT_VERSION, ORACLE_VERSION } from '../../src/core/journeys/contract';
import {
  ANOMALY_CLUSTER_VERSION,
  DOSSIER_VERSION,
  FAILURE_MINIMIZATION_VERSION,
  type MinimizationAction,
  type SourceFreshness,
} from '../../src/core/triage/types';
import { TRIAGE_REPLAY_PLAN_VERSION, TRIAGE_REPLAY_PLAN_V2_VERSION } from '../../src/core/triage/replayPlan';
import { DOSSIER_VERSION_V2 } from '../../src/core/triage/dossierV2';
import { SEMANTIC_TRIAGE_EVIDENCE_VERSION } from '../../src/core/triage/semanticTriageEvidence';
import { SEMANTIC_CLUSTER_VERSION } from '../../src/oracles/semantic/cluster';
import { SEMANTIC_CAMPAIGN_BUNDLE_VERSION } from '../../src/core/source/semanticCampaignBundle';
import { SEMANTIC_EVALUATION_RECEIPT_VERSION } from '../../src/oracles/semantic/receipts';
import { REAL_SOURCE_DERIVATION_VERSION_V2 } from '../../src/oracles/expectations/admission';
import { PRIVATE_ARTIFACT_POLICY_VERSION, OWNER_SCOPE_POLICY_VERSION, PrivateArtifactStore } from '../../src/core/policy';

// ---------------------------------------------------------------------------
// Independent enumerations — deliberately NOT derived from the module so the
// matrix cannot inherit a mistake in the module's own vocabulary. The state
// list is cross-checked against CANDIDATE_LIFECYCLE_STATES once (G6) while
// staying an independent oracle for every edge decision.
// ---------------------------------------------------------------------------

const ALL_STATES: readonly CandidateLifecycleState[] = [
  'OBSERVED', 'ADMITTED', 'REPRODUCED', 'MINIMIZED', 'UNCHANGED',
  'TRIAGED', 'DOSSIER_READY', 'REJECTED', 'UNRESOLVED',
];
const ALL_EVENTS: readonly CandidateLifecycleEvent[] = [
  'ADMIT', 'REJECT', 'CONFIRM_REPRODUCTION', 'FAIL_REPRODUCTION',
  'APPLY_MINIMIZATION', 'KEEP_UNCHANGED', 'COMPLETE_TRIAGE',
  'CLASSIFY_REJECTED', 'CLASSIFY_UNRESOLVED', 'MARK_DOSSIER_READY',
  'GATE_BLOCK',
];
const TERMINAL_STATES: readonly CandidateLifecycleState[] = ['DOSSIER_READY', 'REJECTED', 'UNRESOLVED'];
const GATE_OPEN_STATES: readonly CandidateLifecycleState[] = ['OBSERVED', 'ADMITTED', 'REPRODUCED', 'MINIMIZED', 'UNCHANGED'];
const VARIANTS: readonly CandidateLifecycleVariant[] = ['PROTOCOL_ONLY', 'SEMANTIC'];

// Independent oracle of all 18 legal edges (from, event, to): the historical
// 13 plus the five Phase 15P GATE_BLOCK edges.
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
  ['MINIMIZED', 'COMPLETE_TRIAGE', 'TRIAGED'],
  ['MINIMIZED', 'GATE_BLOCK', 'UNRESOLVED'],
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

/** Independent BFS over the edge oracle: is `state` connected to any terminal? */
function canReachTerminal(state: CandidateLifecycleState): boolean {
  const seen = new Set<CandidateLifecycleState>([state]);
  const queue: CandidateLifecycleState[] = [state];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (TERMINAL_STATES.includes(current)) return true;
    for (const event of ALL_EVENTS) {
      const target = expectedTarget(current, event);
      if (target !== null && !seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }
  return false;
}

/** Independent BFS over the edge oracle: is `state` reachable from OBSERVED? */
function reachableFromObserved(state: CandidateLifecycleState): boolean {
  const seen = new Set<CandidateLifecycleState>(['OBSERVED']);
  const queue: CandidateLifecycleState[] = ['OBSERVED'];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === state) return true;
    for (const event of ALL_EVENTS) {
      const target = expectedTarget(current, event);
      if (target !== null && !seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }
  return false;
}

test.describe('Phase 15P A05 — lifecycle gate matrix (G1)', () => {
  test('exhaustive matrix per variant: all 9 states x all 11 events — legal lands, illegal throws', () => {
    for (const variant of VARIANTS) {
      for (const state of ALL_STATES) {
        for (const event of ALL_EVENTS) {
          const record = driveTo(variant, state);
          const target = expectedTarget(state, event);
          if (target === null) {
            expect(() => transitionCandidateLifecycle(record, event), `${variant} ${state} x ${event} must throw`)
              .toThrow(/CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION/);
          } else {
            const next = transitionCandidateLifecycle(record, event, 'MATRIX_REASON');
            expect(next.state, `${variant} ${state} --${event}--> must land`).toBe(target);
            expect(next.transitionCount).toBe(PATH_TO_STATE[state].length + 1);
            expect(next.lastReasonCode).toBe('MATRIX_REASON');
            expect(next.variant).toBe(variant);
            expect(next.lifecycleVersion).toBe(CANDIDATE_LIFECYCLE_VERSION);
            expect(Object.isFrozen(next)).toBe(true);
          }
        }
      }
    }
  });

  test('every legal path per variant traverses exactly one legal chain to its state', () => {
    for (const variant of VARIANTS) {
      for (const state of ALL_STATES) {
        const record = driveTo(variant, state);
        expect(record.state, `${variant} -> ${state}`).toBe(state);
        expect(record.transitionCount).toBe(PATH_TO_STATE[state].length);
        expect(() => validateCandidateLifecycleRecord(record), `${variant} ${state} validates`).not.toThrow();
      }
    }
  });
});

test.describe('Phase 15P A05 — gate-failure routing proofs (G2)', () => {
  test('GATE_BLOCK from every pre-triage open state lands UNRESOLVED with the gate identity preserved', () => {
    for (const variant of VARIANTS) {
      for (const state of GATE_OPEN_STATES) {
        const record = driveTo(variant, state);
        const blocked = transitionCandidateLifecycle(record, 'GATE_BLOCK', 'SAFETY_EVENT_DURING_REPRODUCTION');
        expect(blocked.state, `${variant} ${state} gate-blocks to UNRESOLVED`).toBe('UNRESOLVED');
        expect(isTerminalCandidateLifecycleState(blocked.state)).toBe(true);
        expect(blocked.lastReasonCode).toBe('SAFETY_EVENT_DURING_REPRODUCTION');
        expect(blocked.transitionCount).toBe(PATH_TO_STATE[state].length + 1);
        expect(blocked.variant).toBe(variant);
        expect(Object.isFrozen(blocked)).toBe(true);
        expect(() => validateCandidateLifecycleRecord(blocked)).not.toThrow();
      }
    }
  });

  test('GATE_BLOCK without a reason code fails closed from every open state (gate identity is mandatory)', () => {
    for (const state of GATE_OPEN_STATES) {
      const record = driveTo('PROTOCOL_ONLY', state);
      expect(() => transitionCandidateLifecycle(record, 'GATE_BLOCK'), `${state} requires a gate reason`)
        .toThrow(/CANDIDATE_LIFECYCLE_GATE_REASON_REQUIRED/);
      // The failing call must not have mutated the input record.
      expect(record.transitionCount).toBe(PATH_TO_STATE[state].length);
    }
  });

  test('gateBlockCandidateLifecycle closes open records and is idempotent on terminal records', () => {
    for (const state of GATE_OPEN_STATES) {
      const opened = driveTo('SEMANTIC', state);
      const closed = gateBlockCandidateLifecycle(opened, 'PRIVACY_BLOCKED');
      expect(closed.state).toBe('UNRESOLVED');
      expect(closed.lastReasonCode).toBe('PRIVACY_BLOCKED');
      // Closing again changes nothing at all (same record, byte-identical).
      const reclosed = gateBlockCandidateLifecycle(closed, 'SAFETY_EVENT');
      expect(reclosed).toBe(closed);
      expect(stableLifecycleJson(reclosed)).toBe(stableLifecycleJson(closed));
    }
    for (const terminal of TERMINAL_STATES) {
      const record = driveTo('PROTOCOL_ONLY', terminal);
      expect(gateBlockCandidateLifecycle(record, 'BUDGET_EXHAUSTED')).toBe(record);
    }
  });

  test('gate reason codes reject free text and sentinels exactly like every other reason code', () => {
    const record = initialLifecycleRecord('PROTOCOL_ONLY');
    for (const bad of ['raw customer text here', 'CUSTOMER_SENTINEL', 'Bearer abcdefgh', 'lower_case']) {
      expect(() => gateBlockCandidateLifecycle(record, bad), `gate reason ${bad}`)
        .toThrow(/CANDIDATE_LIFECYCLE_REASON_CODE_INVALID|CANDIDATE_LIFECYCLE_INVALID_RECORD/);
    }
  });

  test('TRIAGED has no GATE_BLOCK edge: post-triage exits stay classification-only', () => {
    const triaged = driveTo('SEMANTIC', 'TRIAGED');
    expect(() => gateBlockCandidateLifecycle(triaged, 'SAFETY_EVENT'))
      .toThrow(/CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION/);
    // The classification edges remain the only exits and they are terminal.
    expect(transitionCandidateLifecycle(triaged, 'CLASSIFY_UNRESOLVED', 'SAFETY_EVENT').state).toBe('UNRESOLVED');
    expect(transitionCandidateLifecycle(driveTo('SEMANTIC', 'TRIAGED'), 'CLASSIFY_REJECTED', 'FALSE_POSITIVE').state).toBe('REJECTED');
  });

  test('transient outcomes land in explicit terminal states, never ambiguous mid-states', () => {
    const cases: readonly (readonly [readonly CandidateLifecycleEvent[], CandidateLifecycleEvent, string, CandidateLifecycleState])[] = [
      [['ADMIT'], 'FAIL_REPRODUCTION', 'REPRODUCTION_BLOCKED', 'UNRESOLVED'],
      [['ADMIT'], 'FAIL_REPRODUCTION', 'MINIMIZATION_BUDGET_UNAVAILABLE', 'UNRESOLVED'],
      [['ADMIT', 'CONFIRM_REPRODUCTION'], 'FAIL_REPRODUCTION', 'MINIMIZATION_BUDGET_EXHAUSTED', 'UNRESOLVED'],
      [['ADMIT'], 'GATE_BLOCK', 'SAFETY_EVENT_DURING_REPRODUCTION', 'UNRESOLVED'],
      [['ADMIT'], 'REJECT', 'TRANSIENT', 'REJECTED'],
    ];
    for (const [path, closingEvent, reason, terminal] of cases) {
      let record = initialLifecycleRecord('PROTOCOL_ONLY');
      for (const event of path) record = transitionCandidateLifecycle(record, event);
      const closed = transitionCandidateLifecycle(record, closingEvent, reason);
      expect(closed.state, `${reason} must land ${terminal}`).toBe(terminal);
      expect(isTerminalCandidateLifecycleState(closed.state)).toBe(true);
      expect(closed.lastReasonCode).toBe(reason);
    }
  });
});

test.describe('Phase 15P A05 — terminal-state completeness (G3)', () => {
  test('terminality is derived from the table: exactly the three edge-free states', () => {
    const derived = ALL_STATES.filter((state) => {
      for (const event of ALL_EVENTS) {
        if (expectedTarget(state, event) !== null) return false;
      }
      return true;
    });
    expect([...derived].sort()).toEqual([...TERMINAL_STATES].sort());
    for (const terminal of TERMINAL_STATES) {
      expect(isTerminalCandidateLifecycleState(terminal)).toBe(true);
      const record = driveTo('PROTOCOL_ONLY', terminal);
      for (const event of ALL_EVENTS) {
        expect(() => transitionCandidateLifecycle(record, event), `${terminal} x ${event}`)
          .toThrow(/CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION/);
      }
    }
    for (const state of ALL_STATES) {
      if (!TERMINAL_STATES.includes(state)) expect(isTerminalCandidateLifecycleState(state)).toBe(false);
    }
  });

  test('every non-terminal state can still reach a terminal state (no dead ends)', () => {
    for (const state of ALL_STATES) {
      expect(canReachTerminal(state), `${state} reaches a terminal`).toBe(true);
    }
  });

  test('every state is reachable from OBSERVED (no orphan states)', () => {
    for (const state of ALL_STATES) {
      expect(reachableFromObserved(state), `${state} is reachable`).toBe(true);
    }
  });

  test('the module vocabulary agrees with the independent enumeration (drift alarm)', () => {
    expect([...CANDIDATE_LIFECYCLE_STATES].sort()).toEqual([...ALL_STATES].sort());
  });
});

test.describe('Phase 15P A05 — serializer round-trips (G4)', () => {
  test('every reachable record shape round-trips through the canonical serializer', () => {
    const shapes: CandidateLifecycleRecord[] = [];
    for (const variant of VARIANTS) {
      for (const state of ALL_STATES) shapes.push(driveTo(variant, state));
      for (const state of GATE_OPEN_STATES) shapes.push(gateBlockCandidateLifecycle(driveTo(variant, state), 'SAFETY_EVENT'));
    }
    expect(shapes.length).toBeGreaterThan(0);
    for (const record of shapes) {
      const json = stableLifecycleJson(record);
      const parsed = JSON.parse(json) as unknown;
      expect(() => validateCandidateLifecycleRecord(parsed), json).not.toThrow();
      expect(parsed).toEqual(record);
      // Key-order independence and repeat-call stability.
      const reordered: Record<string, unknown> = {};
      for (const key of [...Object.keys(record)].sort((a, b) => b.localeCompare(a))) {
        reordered[key] = (record as unknown as Record<string, unknown>)[key];
      }
      expect(stableLifecycleJson(reordered)).toBe(json);
      expect(stableLifecycleJson(record)).toBe(json);
    }
  });

  test('gate-blocked records serialize with their reason code and validate strictly', () => {
    const blocked = gateBlockCandidateLifecycle(driveTo('SEMANTIC', 'REPRODUCED'), 'CAMPAIGN_VERSION_DRIFT');
    const parsed = JSON.parse(stableLifecycleJson(blocked)) as Record<string, unknown>;
    expect(parsed['lastReasonCode']).toBe('CAMPAIGN_VERSION_DRIFT');
    expect(parsed['state']).toBe('UNRESOLVED');
    expect(() => validateCandidateLifecycleRecord(parsed)).not.toThrow();
  });
});

test.describe('Phase 15P A05 — determinism (G5)', () => {
  const DETERMINISM_PATHS: readonly (readonly CandidateLifecycleEvent[])[] = [
    PATH_TO_STATE.DOSSIER_READY,
    PATH_TO_STATE.UNCHANGED,
    PATH_TO_STATE.REPRODUCED,
    [...PATH_TO_STATE.ADMITTED, 'GATE_BLOCK'],
  ];

  test('identical event sequences produce byte-identical serializations across repeats and variants', () => {
    for (const path of DETERMINISM_PATHS) {
      const baseline: string[][] = [];
      for (let repeat = 0; repeat < 5; repeat += 1) {
        const run: string[] = [];
        for (const variant of VARIANTS) {
          let record = initialLifecycleRecord(variant);
          run.push(stableLifecycleJson(record));
          for (const event of path) {
            record = event === 'GATE_BLOCK'
              ? gateBlockCandidateLifecycle(record, 'PRIVACY_BLOCKED')
              : transitionCandidateLifecycle(record, event);
            run.push(stableLifecycleJson(record));
          }
        }
        baseline.push(run);
      }
      for (const run of baseline.slice(1)) {
        expect(run).toEqual(baseline[0]!);
      }
    }
  });

  test('variants behave identically mechanically (variant-stripped serialization equal)', () => {
    const stripVariant = (record: CandidateLifecycleRecord): string => stableLifecycleJson({
      lifecycleVersion: record.lifecycleVersion,
      state: record.state,
      transitionCount: record.transitionCount,
      lastReasonCode: record.lastReasonCode,
    });
    for (const state of ALL_STATES) {
      expect(stripVariant(driveTo('SEMANTIC', state)), state).toBe(stripVariant(driveTo('PROTOCOL_ONLY', state)));
    }
    expect(stripVariant(gateBlockCandidateLifecycle(driveTo('SEMANTIC', 'MINIMIZED'), 'SAFETY_EVENT')))
      .toBe(stripVariant(gateBlockCandidateLifecycle(driveTo('PROTOCOL_ONLY', 'MINIMIZED'), 'SAFETY_EVENT')));
  });
});

test.describe('Phase 15P A05 — compatibility pins (G6)', () => {
  test('version string and record shape are unchanged', () => {
    expect(CANDIDATE_LIFECYCLE_VERSION).toBe('nightwatch.candidate-lifecycle.private.v1');
    const record = initialLifecycleRecord('PROTOCOL_ONLY');
    expect(Object.keys(record).sort()).toEqual(['lastReasonCode', 'lifecycleVersion', 'state', 'transitionCount', 'variant']);
  });

  test('historical happy path keeps its exact 5-transition shape and reason codes', () => {
    let record = initialLifecycleRecord('SEMANTIC');
    record = transitionCandidateLifecycle(record, 'ADMIT');
    record = transitionCandidateLifecycle(record, 'CONFIRM_REPRODUCTION');
    record = transitionCandidateLifecycle(record, 'APPLY_MINIMIZATION');
    record = transitionCandidateLifecycle(record, 'COMPLETE_TRIAGE');
    record = transitionCandidateLifecycle(record, 'MARK_DOSSIER_READY', 'DOSSIER_READY');
    expect(record.state).toBe('DOSSIER_READY');
    expect(record.transitionCount).toBe(5);
    expect(record.lastReasonCode).toBe('DOSSIER_READY');
    expect(isTerminalCandidateLifecycleState(record.state)).toBe(true);
  });

  test('a legacy v1 serialized record keeps validating without migration', () => {
    const legacy = JSON.parse(JSON.stringify({
      lifecycleVersion: 'nightwatch.candidate-lifecycle.private.v1',
      variant: 'PROTOCOL_ONLY',
      state: 'ADMITTED',
      transitionCount: 1,
      lastReasonCode: null,
    })) as unknown;
    expect(() => validateCandidateLifecycleRecord(legacy)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// G7 — orchestrator integration: gates are load-bearing end to end through
// runCampaign with synthetic scripted executors (no network, frozen clock).
// ---------------------------------------------------------------------------

const STATIC_NOW = '2026-08-21T02:00:00.000Z';
const SEEDS = ['0x0000000000000101', '0x0000000000000201'] as const;

const SAFE_TRIAGE: SafetyVector = {
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  knownMutations: 0,
  actionCausedUnknown: 0,
  dbQueries: 0,
};
const ZERO_EXEC_SAFETY = {
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  productMutations: 0,
  actionCausedUnknown: 0,
  databaseQueries: 0,
  infrastructureQueries: 0,
  externalPublicationAttempts: 0,
};
const ZERO_EXEC_PRIVACY = {
  result: 'PASS' as const,
  rawBodiesPersisted: 0,
  customerValuesPersisted: 0,
  credentialsPersisted: 0,
  cookiesPersisted: 0,
  tokensPersisted: 0,
  domPersisted: 0,
  screenshotsPersisted: 0,
  authenticatedTracesPersisted: 0,
};

const TEST_BUDGET: CampaignBudgetPolicy = Object.freeze({
  ...INITIAL_REAL_CAMPAIGN_BUDGET,
  maxTotalBrowserContexts: 6,
  maxJourneyContexts: 3,
  maxExplorationContexts: 3,
  maxApiExecutions: 12,
  maxReplays: 70,
  maxMinimizationCandidates: 64,
  maxTotalActions: 100,
  maxRuntimeMs: 60_000,
  maxPerTestTimeoutMs: 5_000,
  maxPromotedClusters: 3,
  maxPrivateEvidenceBytes: 20 * 1024 * 1024,
});

const PRIVACY_POLICY: CampaignPrivacyPolicy = {
  storageClass: 'OWNER_ONLY_LOCAL',
  remotePrivacy: 'NO_REMOTE',
  externalPublication: 'PROHIBITED',
  rawBodiesPersisted: false,
  customerValuesPersisted: false,
  credentialsPersisted: false,
  cookiesPersisted: false,
  tokensPersisted: false,
  domPersisted: false,
  screenshotsPersisted: false,
  authenticatedTracesPersisted: false,
};

const VERSIONS: CampaignVersionFingerprint = {
  campaignSchemaVersion: CAMPAIGN_SCHEMA_VERSION,
  orchestratorVersion: CAMPAIGN_ORCHESTRATOR_VERSION,
  nightwatchSourceSha: 'synthetic-phase15p-a05-source.v1',
  selectorVersion: SELECTOR_VERSION,
  dependencyMapVersion: DEPENDENCY_MAP_VERSION,
  journeyContractVersion: JOURNEY_CONTRACT_VERSION,
  journeyOracleVersion: ORACLE_VERSION,
  explorationCatalogVersion: SAFE_ACTION_CATALOG_VERSION,
  explorationModelVersion: EXPLORATION_MODEL_VERSION,
  explorationPlannerVersion: PLANNER_VERSION,
  apiCatalogVersion: API_CATALOG_VERSION,
  apiGeneratorVersion: SCENARIO_GENERATOR_VERSION,
  apiOracleVersion: 'nightwatch.api-oracle.phase5.v1',
  triageClusterVersion: ANOMALY_CLUSTER_VERSION,
  triageMinimizerVersion: FAILURE_MINIMIZATION_VERSION,
  dossierVersion: DOSSIER_VERSION,
  ownerScopePolicyVersion: OWNER_SCOPE_POLICY_VERSION,
  privateArtifactPolicyVersion: PRIVATE_ARTIFACT_POLICY_VERSION,
  seedCorpusVersion: 'nightwatch.phase15.synthetic-seeds.v1',
  budgetPolicyVersion: 'nightwatch.campaign-budget.private.v1',
  triageReplayPlanVersion: TRIAGE_REPLAY_PLAN_VERSION,
  triageReplayPlanV2Version: TRIAGE_REPLAY_PLAN_V2_VERSION,
  semanticTriageEvidenceVersion: SEMANTIC_TRIAGE_EVIDENCE_VERSION,
  dossierV2Version: DOSSIER_VERSION_V2,
  semanticClusterVersion: SEMANTIC_CLUSTER_VERSION,
  semanticBundleVersion: SEMANTIC_CAMPAIGN_BUNDLE_VERSION,
  semanticReceiptVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION,
  semanticExpectationDerivationVersion: REAL_SOURCE_DERIVATION_VERSION_V2,
};

const TARGET = 'ripple.payer-exchange.read';
const JOURNEY_ID = 'ripple-payer-exchange-read' as const;
const ROUTE_CLASS = '/payer-exchange-rate-v2';
const ENVELOPE_ID = 'E1-J1-payer-exchange';
const JOURNEY_STEPS = ['payer-navigate', 'payer-structural-checkpoint'] as const;
const FP_GATE_A = 'fp:sha256:aa05aa05aa05aa05aa05aa05';
const FP_GATE_B = 'fp:sha256:bb05bb05bb05bb05bb05bb05';

function snapshots(): CampaignInput['sourceSnapshots'] {
  return RIPPLE_REPOSITORIES.map((repo) => ({
    repoId: repo.repoId,
    branch: repo.branch,
    headSha: repo.checkedOutSha,
    trackingRef: repo.trackingRef,
    trackingSha: repo.trackingSha,
    ahead: repo.ahead,
    behind: repo.behind,
    dirty: false,
    dirtyFileCount: 0,
    sourceMapSha: repo.sourceMapSha,
    freshness: 'LOCAL_TRACKING_REF_ONLY' as SourceFreshness,
    readOnly: true as const,
  }));
}

function inputFor(mode: CampaignInput['mode'], budget: CampaignBudgetPolicy = TEST_BUDGET): CampaignInput {
  return {
    mode,
    createdAt: STATIC_NOW,
    sourceSnapshots: snapshots(),
    sourceWindow: {
      changesetId: 'cs-empty-phase15p-a05',
      baselines: RIPPLE_REPOSITORIES.map((repo) => ({ repoId: repo.repoId, baseSha: repo.checkedOutSha, headSha: repo.checkedOutSha, dirtyExcluded: true as const })),
      changedFiles: [],
      dirtyFiles: [],
      sourceWindow: 'COMMITTED_ONLY' as const,
      deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED' as const,
    },
    changeset: null,
    phase3Selection: null,
    seedCorpusVersion: VERSIONS.seedCorpusVersion,
    seedSet: SEEDS,
    safeActions: RIPPLE_PHASE4_ACTIONS,
    explorationEnvelopes: RIPPLE_PHASE4_ENVELOPES,
    apiOperations: PHASE5_API_CATALOG.operations,
    versions: VERSIONS,
    budgetPolicy: budget,
    privacyPolicy: PRIVACY_POLICY,
  };
}

function action(actionId: string): MinimizationAction {
  return {
    actionId,
    semanticClass: 'KNOWN_READ',
    routeClass: ROUTE_CLASS,
    sourceApproved: true,
    catalogVersion: 'nightwatch.phase15.synthetic-action.v1',
  };
}

function candidate(runId: string, fingerprint: string): CampaignAnomalyCandidate {
  const sequence = [...JOURNEY_STEPS].map((id) => action(id));
  const replay = (sequenceToReplay: readonly MinimizationAction[], _phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE') => {
    const reproduces = sequenceToReplay.length > 0;
    return {
      status: reproduces ? 'FAILURE' as const : 'PASS' as const,
      ...(reproduces ? { anomalyFingerprint: fingerprint } : {}),
      safety: SAFE_TRIAGE,
    };
  };
  return {
    observation: {
      runId,
      observedAt: STATIC_NOW,
      fingerprint,
      features: {
        journeyId: JOURNEY_ID,
        envelopeId: ENVELOPE_ID,
        oracleId: 'oracle.phase15.synthetic',
        routeClass: ROUTE_CLASS,
        operationFamily: TARGET,
        statusClass: '5xx',
        contentTypeClass: 'json',
        runtimeCategory: 'product',
        structuralState: 'table-missing',
        failureActionId: sequence[0]?.actionId ?? null,
        sourceImpactRegion: 'synthetic.phase15p',
        browserApiResultClass: 'browser-only',
      },
      timingClass: 'NONE',
      reproduced: false,
      minimized: false,
      sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
    },
    journeyId: JOURNEY_ID,
    contractVersion: JOURNEY_CONTRACT_VERSION,
    contractDigest: 'contract:phase15p-synthetic',
    contextKind: 'FIRST_OBSERVATION',
    originalSequence: sequence,
    technicalSeverity: 'HIGH',
    breadth: 'NARROW',
    browser: {
      failed: true,
      routeClass: ROUTE_CLASS,
      structuralState: 'table-missing',
      operationFamily: TARGET,
      statusClass: '5xx',
      contentTypeClass: 'json',
      oracleFingerprint: fingerprint,
      runtimeCategory: 'product',
    },
    api: null,
    sourceCorrelation: {
      journeyIds: [JOURNEY_ID],
      changedFiles: [],
      sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
      sourceVersion: 'synthetic.phase15p.source.v1',
    },
    sourceRelevance: 'NO_CURRENT_CHANGE_RELEVANCE',
    alternativesRuledOut: ['auth-valid', 'safe-read-only-contract'],
    missingEvidence: ['deployment-status-unresolved', 'datastore-evidence-out-of-scope-by-owner'],
    knownNightwatchDefect: false,
    replay,
  };
}

type ReproduceInput = Parameters<NonNullable<CampaignExecutor['reproduce']>>[0];
type ReproductionOutcome = Awaited<ReturnType<NonNullable<CampaignExecutor['reproduce']>>>;

function scriptedExecutor(
  script: ReadonlyMap<string, readonly CampaignAnomalyCandidate[]>,
  overrides: { readonly reproduce?: (input: ReproduceInput) => Promise<ReproductionOutcome> } = {},
): CampaignExecutor {
  return {
    preflight: () => ({ passed: true, code: 'PREFLIGHT_PASS' as const, failedChecks: [], checkedAt: STATIC_NOW }),
    execute: async ({ workItem }: { readonly workItem: CampaignWorkItem }): Promise<CampaignExecutionOutcome> => {
      const observations = [...(script.get(workItem.workItemId) ?? [])];
      return {
        result: observations.length > 0 ? 'ANOMALY' : 'PASS',
        safety: ZERO_EXEC_SAFETY,
        privacy: ZERO_EXEC_PRIVACY,
        actionsExecuted: observations.length > 0 ? observations[0]!.originalSequence.length : 1,
        apiExecutions: workItem.kind === 'API' && workItem.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY' ? 2 : workItem.kind === 'API' ? 1 : 0,
        browserContextCreated: workItem.kind !== 'API',
        replay: workItem.kind === 'API' && workItem.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY',
        observations,
      };
    },
    reproduce: async (input: ReproduceInput): Promise<ReproductionOutcome> => {
      if (overrides.reproduce !== undefined) return await overrides.reproduce(input);
      const { representative } = input;
      const resolved = await representative.replay?.(representative.originalSequence, 'FRESH_EXACT_REPLAY');
      if (resolved?.status !== 'FAILURE') {
        return { result: 'NOT_REPRODUCED' as const, runId: `${representative.observation.runId}-fresh`, fingerprint: null, safety: ZERO_EXEC_SAFETY, privacy: ZERO_EXEC_PRIVACY };
      }
      return {
        result: 'REPRODUCED' as const,
        runId: `${representative.observation.runId}-fresh`,
        fingerprint: representative.observation.fingerprint,
        safety: ZERO_EXEC_SAFETY,
        privacy: ZERO_EXEC_PRIVACY,
        candidate: { ...representative, observation: { ...representative.observation, runId: `${representative.observation.runId}-fresh`, reproduced: true, timingClass: 'BOUNDED' as const } },
      };
    },
  };
}

function tempStore(): { readonly root: string; readonly store: PrivateArtifactStore } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase15p-a05-'));
  return { root, store: new PrivateArtifactStore({ root }) };
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

interface LifecycleView {
  readonly state: string;
  readonly variant: string;
  readonly transitionCount: number;
  readonly lastReasonCode: string | null;
}

function lifecycleFor(checkpoint: CampaignCheckpoint, clusterId: string): LifecycleView {
  const record = checkpoint.candidateLifecycles?.[clusterId];
  expect(record, `lifecycle record for ${clusterId}`).toBeDefined();
  return record!;
}

function assertAllRecordsTerminal(result: CampaignRunResult): void {
  const lifecycles = result.checkpoint.candidateLifecycles ?? {};
  expect(Object.keys(lifecycles).length).toBeGreaterThan(0);
  for (const [clusterId, record] of Object.entries(lifecycles)) {
    expect(isTerminalCandidateLifecycleState(record.state as CandidateLifecycleState), `${clusterId} terminal`).toBe(true);
    expect(record.lastReasonCode, `${clusterId} carries a reason code`).not.toBeNull();
  }
}

test.describe('Phase 15P A05 — orchestrator gate routing (G7)', () => {
  test('safety event during reproduction routes the candidate to the blocked terminal with the gate identity', async () => {
    const { root, store } = tempStore();
    try {
      const observation = candidate('a05-safety-obs', FP_GATE_A);
      const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH'));
      const base = scriptedExecutor(new Map([[manifest.workItems[0]!.workItemId, [observation]]]));
      const executor: CampaignExecutor = {
        ...base,
        reproduce: async () => ({
          result: 'REPRODUCED' as const,
          runId: `${observation.observation.runId}-fresh`,
          fingerprint: FP_GATE_A,
          safety: { ...ZERO_EXEC_SAFETY, productionAttempts: 1 },
          privacy: ZERO_EXEC_PRIVACY,
        }),
      };
      const result = await runCampaign(manifest, executor, { store, now: () => new Date(STATIC_NOW) });
      // The safety gate escalates to a failure storm (pinned campaign
      // contract); what A05 owns is the lifecycle routing: the candidate's
      // record closes at the blocked terminal carrying the gate identity.
      expect(result.resultClass).toBe('PARTIAL_RUNTIME_INFRA_FAILURE');
      expect(result.checkpoint.stopReason).toBe('FAILURE_STORM_SHARED_ROOT_SYMPTOM');
      expect(result.checkpoint.safetyEvents).toContain('SAFETY_EVENT_DURING_REPRODUCTION');
      const clusterId = result.checkpoint.anomalyClusters[0]!.clusterId;
      const record = lifecycleFor(result.checkpoint, clusterId);
      expect(record.state).toBe('UNRESOLVED');
      expect(record.lastReasonCode).toBe('SAFETY_EVENT_DURING_REPRODUCTION');
      expect(isTerminalCandidateLifecycleState(record.state as CandidateLifecycleState)).toBe(true);
      // Terminal completeness: the stopped run leaves NO ambiguous mid-state.
      assertAllRecordsTerminal(result);
    } finally {
      cleanup(root);
    }
  });

  test('unclean reproduction privacy routes the candidate to the blocked terminal with PRIVACY_BLOCKED', async () => {
    const { root, store } = tempStore();
    try {
      const observation = candidate('a05-privacy-obs', FP_GATE_A);
      const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH'));
      const base = scriptedExecutor(new Map([[manifest.workItems[0]!.workItemId, [observation]]]));
      const executor: CampaignExecutor = {
        ...base,
        reproduce: async () => ({
          result: 'REPRODUCED' as const,
          runId: `${observation.observation.runId}-fresh`,
          fingerprint: FP_GATE_A,
          safety: ZERO_EXEC_SAFETY,
          privacy: { ...ZERO_EXEC_PRIVACY, result: 'BLOCKED' as const, rawBodiesPersisted: 1 },
        }),
      };
      const result = await runCampaign(manifest, executor, { store, now: () => new Date(STATIC_NOW) });
      expect(result.resultClass).toBe('PARTIAL_SAFETY_BLOCKED');
      expect(result.checkpoint.stopReason).toBe('PRIVACY_BLOCKED');
      const clusterId = result.checkpoint.anomalyClusters[0]!.clusterId;
      const record = lifecycleFor(result.checkpoint, clusterId);
      expect(record.state).toBe('UNRESOLVED');
      expect(record.lastReasonCode).toBe('PRIVACY_BLOCKED');
      assertAllRecordsTerminal(result);
    } finally {
      cleanup(root);
    }
  });

  test('a finalized clean run closes promotion-cap leftovers terminally (never ADMITTED at rest)', async () => {
    const { root, store } = tempStore();
    try {
      const budget: CampaignBudgetPolicy = { ...TEST_BUDGET, maxPromotedClusters: 1 };
      const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH', budget));
      const observations = [candidate('a05-cap-obs-1', FP_GATE_A), candidate('a05-cap-obs-2', FP_GATE_B)];
      const executor = scriptedExecutor(new Map([[manifest.workItems[0]!.workItemId, observations]]));
      const result = await runCampaign(manifest, executor, { store, now: () => new Date(STATIC_NOW) });
      expect(result.resultClass).toBe('COMPLETE_WITH_FINDINGS');
      const states = Object.values(result.checkpoint.candidateLifecycles ?? {}).map((record) => record.state).sort();
      expect(states).toEqual(['DOSSIER_READY', 'UNRESOLVED']);
      const leftover = Object.values(result.checkpoint.candidateLifecycles ?? {}).find((record) => record.state === 'UNRESOLVED');
      expect(leftover?.lastReasonCode).toBe('PROMOTION_CAP_UNPROCESSED');
      assertAllRecordsTerminal(result);
    } finally {
      cleanup(root);
    }
  });

  test('budget exhaustion stays an explicit terminal outcome (UNRESOLVED with its reason code)', async () => {
    const { root, store } = tempStore();
    try {
      const budget: CampaignBudgetPolicy = { ...TEST_BUDGET, maxMinimizationCandidates: 0 };
      const observation = candidate('a05-budget-obs', FP_GATE_A);
      const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH', budget));
      const executor = scriptedExecutor(new Map([[manifest.workItems[0]!.workItemId, [observation]]]));
      const result = await runCampaign(manifest, executor, { store, now: () => new Date(STATIC_NOW) });
      expect(result.resultClass).toBe('PARTIAL_BUDGET_EXHAUSTED');
      const clusterId = result.checkpoint.anomalyClusters[0]!.clusterId;
      const record = lifecycleFor(result.checkpoint, clusterId);
      expect(record.state).toBe('UNRESOLVED');
      expect(record.lastReasonCode).toBe('MINIMIZATION_BUDGET_UNAVAILABLE');
      assertAllRecordsTerminal(result);
    } finally {
      cleanup(root);
    }
  });
});
