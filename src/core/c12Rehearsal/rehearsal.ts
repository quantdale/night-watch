// ---------------------------------------------------------------------------
// C-12 P1 offline rehearsal runner.
//
// Runs the production-intended MA-8 P1 safety core end to end against local
// mock edges: scope admission (evaluateP1ObservationScope), session attach
// (attachP1ObservationSession), attribution verdict (classifyP1Session).
// Mocked edges only: the subject descriptor, the event source, the clock,
// the grant (locally minted), and the synthetic scope config. The chain
// definition digest in the receipt proves which core version ran.
//
// The LOCAL_FIXTURE guard is the anti-confusion mechanism: anything but the
// synthetic `.invalid` fixture host refuses before admission, so a rehearsal
// can never be retargeted at a real host. Success is LOCAL_REHEARSAL_PASS;
// live authorization is structurally absent (see c12LiveReadiness).
//
// No fs/network/child_process/browser/DEV/NEXT/production contact. The
// evidence destination is a synthetic label; the rehearsal persists nothing.
// ---------------------------------------------------------------------------

import {
  attachP1ObservationSession,
  clearP1SessionAttachStateForTest,
  type P1ObservationEventSource,
} from '../prodObserveP1/session';
import {
  evaluateP1ObservationScope,
  p1ScopeChainDefinitionDigest,
  type P1AdmissionInput,
} from '../prodObserveP1/observer';
import { issueP1ObserveGrant } from '../prodObserveP1/authorization';
import { P1_OBSERVATION_SCOPE_CHAIN_VERSION } from '../prodObserveP1/types';
import { P1_SCOPE_CONFIG_SCHEMA, type P1ScopeConfig } from '../prodObserveP1/scopeConfig';
import { createProductionPrivacyPolicy, PRODUCTION_PRIVACY_POLICY_VERSION } from '../prodPrivacy/policy';
import { sha256Hex, stableJsonSorted } from '../identity/canonicalDigest';
import {
  C12_REHEARSAL_CONFIG_VERSION,
  C12_REHEARSAL_RECEIPT_VERSION,
  type C12LiveReadiness,
  type C12RehearsalInput,
  type C12RehearsalReceipt,
  type C12RehearsalScenario,
  type C12RehearsalState,
} from './types';
import { createMockEventSource, isLocalFixtureHost, LOCAL_FIXTURE_EVIDENCE_DESTINATION, LOCAL_FIXTURE_HOST, LOCAL_FIXTURE_NONCE } from './mockSubject';

// Deliberately duplicated, not imported: the AH-1 reverse-isolation rule
// fails non-test files outside src/core/c12Readiness/ that import the
// c12Readiness cone (the same F-12 discipline the P1 cone documents in its
// own types.ts). The receipt binds the version string; the literal below
// must match C12_READINESS_VERSION exactly (asserted by test).
const C12_READINESS_VERSION_BOUND = 'nightwatch.c12-readiness.v1' as const;

const SHA_RE = /^[0-9a-f]{40}$/;
const PQ_RE = /^receipt:sha256:[0-9a-f]{64}$/;
const CAMPAIGN_RE = /^[A-Za-z0-9_.:/-]{1,160}$/;
const WINDOW_MS = 600_000;

function fail(code: string): never {
  throw new Error(code);
}

function validateInput(input: C12RehearsalInput): void {
  if (input === null || typeof input !== 'object') fail('C12_REHEARSAL_INVALID_INPUT');
  if (!SHA_RE.test(input.implementationSha)) fail('C12_REHEARSAL_INVALID_IMPLEMENTATION_SHA');
  if (!PQ_RE.test(input.pqReceiptDigest)) fail('C12_REHEARSAL_INVALID_PQ_DIGEST');
  if (!CAMPAIGN_RE.test(input.campaignId)) fail('C12_REHEARSAL_INVALID_CAMPAIGN');
  if (
    input.scenario !== 'CLEAN_PASSIVE' &&
    input.scenario !== 'WITH_NIGHTWATCH_TRAFFIC' &&
    input.scenario !== 'WITH_UNKNOWN_ATTRIBUTION' &&
    input.scenario !== 'ZERO_QUALIFYING_EVENTS' &&
    input.scenario !== 'KILL_SWITCH_ENGAGED'
  ) {
    fail('C12_REHEARSAL_UNKNOWN_SCENARIO');
  }
  if (!Number.isInteger(input.baseNowMs) || input.baseNowMs <= 0) fail('C12_REHEARSAL_INVALID_CLOCK');
}

function syntheticScopeConfig(implementationSha: string, nowMs: number): P1ScopeConfig {
  // Window span equals the duration cap exactly: a wider span trips
  // P1_WINDOW_EXCESSIVE by design (proven in the negative matrix).
  const body = {
    schemaVersion: P1_SCOPE_CONFIG_SCHEMA,
    admittedHost: LOCAL_FIXTURE_HOST,
    observationWindow: { notBeforeMs: nowMs, notAfterMs: nowMs + WINDOW_MS },
    maxObservationDurationMs: WINDOW_MS,
    evidenceDestination: LOCAL_FIXTURE_EVIDENCE_DESTINATION,
    expectedImplementationSha: implementationSha,
  };
  return { ...body, configIdentity: `p1scopecfg:${sha256Hex(stableJsonSorted(body))}` };
}

function digest(canonical: string): string {
  return sha256Hex(canonical);
}

export interface RehearsalRunOptions {
  /** Override the admitted host to prove the fixture guard refuses (negative matrix). */
  readonly admittedHostOverride?: string;
}

export function runC12LocalRehearsal(input: C12RehearsalInput, options?: RehearsalRunOptions): C12RehearsalReceipt {
  validateInput(input);
  const admittedHost = options?.admittedHostOverride ?? LOCAL_FIXTURE_HOST;
  // Fail closed before the core ever runs: rehearsal fixtures only.
  if (!isLocalFixtureHost(admittedHost)) fail('C12_REHEARSAL_REFUSES_NON_SYNTHETIC_HOST');

  const nowMs = input.baseNowMs;
  const killEngaged = input.scenario === 'KILL_SWITCH_ENGAGED';
  const killSwitchProbe = (): boolean => killEngaged;
  const config = syntheticScopeConfig(input.implementationSha, nowMs);
  const grant = issueP1ObserveGrant({
    campaignId: input.campaignId,
    implementationSha: input.implementationSha,
    pqReceiptDigest: input.pqReceiptDigest,
    notBeforeMs: nowMs - 3_600_000,
    expiresAtMs: nowMs + WINDOW_MS + 3_600_000,
  });

  const admissionInput: P1AdmissionInput = {
    campaignId: input.campaignId,
    claimedStage: 'P1',
    requestedAuthorizationClass: 'P1_OBSERVE',
    grant,
    pqReceiptDigest: input.pqReceiptDigest,
    config,
    subject: { subjectNonce: LOCAL_FIXTURE_NONCE, provenance: 'OPERATOR_CREATED', host: admittedHost },
    observerIdentityClass: 'ORDINARY_USER',
    privacyPolicy: createProductionPrivacyPolicy({}),
    evidenceDestination: LOCAL_FIXTURE_EVIDENCE_DESTINATION,
    attributionCapability: 'ATTRIBUTING_PROXY',
    killSwitchProbe,
    nowMs: nowMs + 1_000,
  };

  const admission = evaluateP1ObservationScope(admissionInput, digest);
  const chainDefinitionDigest = p1ScopeChainDefinitionDigest(digest);
  const rehearsalConfigDigest = sha256Hex(
    stableJsonSorted({
      version: C12_REHEARSAL_CONFIG_VERSION,
      scenario: input.scenario,
      campaignId: input.campaignId,
      implementationSha: input.implementationSha,
      windowMs: WINDOW_MS,
    }),
  ).slice(0, 24);

  const receiptBase = {
    chainDefinitionDigest,
    chainVersion: P1_OBSERVATION_SCOPE_CHAIN_VERSION,
    scopeConfigVersion: P1_SCOPE_CONFIG_SCHEMA,
    readinessVersion: C12_READINESS_VERSION_BOUND,
    privacyPolicyVersion: PRODUCTION_PRIVACY_POLICY_VERSION,
    rehearsalConfigDigest,
    implementationSha: input.implementationSha,
  };

  if (!admission.allowed) {
    return {
      schemaVersion: C12_REHEARSAL_RECEIPT_VERSION,
      rehearsalId: `c12rehearsal:${sha256Hex(stableJsonSorted({ ...receiptBase, scenario: input.scenario, denied: admission.denialCode })).slice(0, 24)}`,
      state: 'LOCAL_REHEARSAL_READY',
      scenario: input.scenario,
      sessionVerdict: 'NO_SESSION_ADMISSION_DENIED',
      sessionTermination: 'NOT_ATTACHED',
      tally: { total: 0, operatorPreexisting: 0, applicationAutonomous: 0, nightwatchAttributable: 0, unknown: 0 },
      qualifyingObservationCount: 0,
      admissionDenialCode: admission.denialCode,
      deniedAtGate: admission.deniedAtGate,
      ...receiptBase,
      liveAuthorization: 'NOT_CONFERRED_SYNTHETIC_ONLY',
    };
  }

  // Fresh admission object per run: the session's attach-once registry keys
  // on object identity, so re-evaluated admissions never collide. Reset the
  // test registry defensively — this entry is unreachable in normal flow.
  clearP1SessionAttachStateForTest();
  const source: P1ObservationEventSource = createMockEventSource(input.scenario);
  let clockMs = nowMs + 1_000;
  const result = attachP1ObservationSession({
    admission,
    subjectNonce: LOCAL_FIXTURE_NONCE,
    source,
    bounds: { maxEvents: 100, maxPolls: 20 },
    killSwitchProbe,
    clock: { nowMs: () => (clockMs += 1_000) },
  });

  const pass = result.verdict === 'PASSIVE_OBSERVATION_COMPLETE' && result.completedCleanly;
  const state: C12RehearsalState = pass ? 'LOCAL_REHEARSAL_PASS' : 'LOCAL_REHEARSAL_READY';
  return {
    schemaVersion: C12_REHEARSAL_RECEIPT_VERSION,
    rehearsalId: `c12rehearsal:${sha256Hex(stableJsonSorted({ ...receiptBase, scenario: input.scenario, tally: result.tally })).slice(0, 24)}`,
    state,
    scenario: input.scenario,
    sessionVerdict: result.verdict,
    sessionTermination: result.termination,
    tally: { ...result.tally },
    qualifyingObservationCount: result.tally.total,
    admissionDenialCode: null,
    deniedAtGate: null,
    ...receiptBase,
    liveAuthorization: 'NOT_CONFERRED_SYNTHETIC_ONLY',
  };
}

/**
 * The live-readiness inspector: from rehearsal inputs, live prerequisites
 * are structurally missing. A synthetic success can never satisfy this —
 * the missing list names external facts only a future authorized C-12 can
 * supply. Not a stub: returning SATISFIED here would be the exact
 * rehearsal-implies-live confusion this campaign must make impossible.
 */
export function c12LiveReadiness(): C12LiveReadiness {
  return {
    prerequisites: 'LIVE_PREREQUISITES_MISSING',
    authorization: 'LIVE_AUTHORIZATION_MISSING',
    missing: ['operator production subject', 'admitted production config', 'deployment truth', 'live C-12 authorization'],
  };
}

export type { C12RehearsalScenario };
