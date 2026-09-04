// ---------------------------------------------------------------------------
// Nightwatch MA-8 / F-13 — the P1 observation-scope admission evaluator.
//
// This is a DISTINCT decision path from C-11's `productionRunGate` and shares
// no code with it (F-12, both directions: the C-11 reverse-isolation rule
// forbids this cone from importing `core/prodObserve`). Where C-11 answers
// "may Nightwatch ISSUE this production request", this evaluator answers "may
// Nightwatch OBSERVE this already-existing subject" — without granting any
// authority to create that subject or generate production traffic.
//
// The evaluator is PURE over explicitly presented facts, with two deliberate
// exceptions that must be side effects to be correct at all:
//
//   - the kill-switch probe, which must observe revocation that happened
//     since entry, and
//   - grant consumption, which must be a one-way transition.
//
// Everything else — the clock, the config, the subject, the privacy policy,
// the destination, the attribution capability — is injected. A gate that read
// the world itself could not be falsified one fault at a time, which is
// exactly what the one-fault denial matrix requires.
// ---------------------------------------------------------------------------

import {
  P1_GATE_DENIAL_CODES,
  P1_OBSERVATION_SCOPE_CHAIN_VERSION,
  P1_OBSERVATION_SCOPE_GATES,
  P1_OBSERVE_AUTHORIZATION_CLASS,
  p1ObserverIdentitySatisfies,
  type P1AdmissionDecision,
  type P1AttributionCapability,
  type P1GateOutcome,
  type P1ObservationDenialCode,
  type P1ObservationScopeGate,
  type P1ObservationSubject,
  type P1ObserverIdentityClass,
  type P1RequestableAuthorizationClass,
} from './types';
import { consumeP1ObserveGrant, isRegisteredP1Grant, validateP1ObserveGrant } from './authorization';
import { isAdmittedP1Host, type P1ScopeConfig } from './scopeConfig';
import { evaluateP1KillSwitch, type P1KillSwitchProbe } from './killSwitch';
import { assertProductionCone, type PrivacyPolicy } from '../prodPrivacy/policy';

export const P1_OBSERVATION_SCOPE_VERSION = 'nightwatch.p1-observation-scope.v1' as const;

const PQ_RECEIPT_DIGEST_RE = /^receipt:sha256:[0-9a-f]{64}$/;

export interface P1AdmissionInput {
  readonly campaignId: string;
  /** The stage this admission CLAIMS. Must be exactly `P1`; anything else denies at `P1_AUTHORIZATION_CLASS`. */
  readonly claimedStage: string;
  /**
   * The authorization class this admission CLAIMS. Compared against the
   * grant, so `P1_OBSERVE` cannot be reached by requesting DEV, NEXT,
   * authenticated-browser, replay, source-intelligence, generic real-run, or
   * C-11 `PROD_OBSERVE` authority — and a `P1_OBSERVE` grant cannot authorize
   * an admission claiming to be one of those.
   */
  readonly requestedAuthorizationClass: P1RequestableAuthorizationClass;
  readonly grant: unknown;
  /** The PQ receipt digest PRESENTED alongside the grant. Compared against the grant's bound digest. */
  readonly pqReceiptDigest: string | null;
  readonly config: P1ScopeConfig | null;
  readonly subject: P1ObservationSubject | null;
  readonly observerIdentityClass: P1ObserverIdentityClass;
  /**
   * REQUIRED and explicitly injected. There is no default: a shared module
   * that falls back to a policy is a silent allow, so a missing policy denies
   * (F-12).
   */
  readonly privacyPolicy: PrivacyPolicy | null;
  /** Where observation evidence WILL be written. Must equal the config's admitted destination. */
  readonly evidenceDestination: string | null;
  readonly attributionCapability: P1AttributionCapability | null;
  readonly killSwitchProbe: P1KillSwitchProbe | null;
  readonly nowMs: number;
}

export interface P1AdmissionOutcome extends P1AdmissionDecision {
  /** The admitted host, present only when every gate passed. */
  readonly admittedHost: string | null;
  /** The admitted subject nonce, present only when every gate passed. */
  readonly admittedSubjectNonce: string | null;
  /** The observation deadline in ms, present only when every gate passed. */
  readonly observationDeadlineMs: number | null;
}

/**
 * The digest over the chain DEFINITION — its version, ordered gate IDs and the
 * denial codes each gate may emit. A reordered, renamed, added or removed gate
 * changes it, which is what lets a future receipt be checked against the chain
 * it claims to have run.
 */
export function p1ScopeChainDefinitionDigest(digest: (canonical: string) => string): string {
  return `p1scope:${digest(
    JSON.stringify({
      version: P1_OBSERVATION_SCOPE_CHAIN_VERSION,
      gates: P1_OBSERVATION_SCOPE_GATES,
      denialCodes: P1_OBSERVATION_SCOPE_GATES.map((gate) => P1_GATE_DENIAL_CODES[gate]),
    }),
  )}`;
}

/**
 * Evaluate the ordered chain.
 *
 * Stops at the FIRST denial and marks every later gate `NOT_EVALUATED`. That
 * is not an optimization: it makes the receipt say which authority actually
 * refused, instead of a set of failures whose causal order is lost.
 */
export function evaluateP1ObservationScope(
  input: P1AdmissionInput,
  digest: (canonical: string) => string,
): P1AdmissionOutcome {
  const outcomes: P1GateOutcome[] = [];
  let denialCode: P1ObservationDenialCode | null = null;
  let deniedAtGate: P1ObservationScopeGate | null = null;

  const pass = (gate: P1ObservationScopeGate): void => {
    outcomes.push({ gate, result: 'PASS', denialCode: null });
  };
  const deny = (gate: P1ObservationScopeGate, code: P1ObservationDenialCode): void => {
    // A gate may only emit a code the chain definition assigns to it, so a
    // gate cannot borrow another's reason and make the matrix ambiguous.
    if (!P1_GATE_DENIAL_CODES[gate].includes(code)) {
      throw new Error(`P1_SCOPE_GATE_DENIAL_CODE_INVALID:${gate}:${code}`);
    }
    outcomes.push({ gate, result: 'DENY', denialCode: code });
    denialCode = code;
    deniedAtGate = gate;
  };

  const emptyDenied = (
    chainVersion: typeof P1_OBSERVATION_SCOPE_CHAIN_VERSION,
    gateDefinitionDigest: string,
  ): P1AdmissionOutcome => ({
    chainVersion,
    gateDefinitionDigest,
    orderedGates: P1_OBSERVATION_SCOPE_GATES,
    outcomes: Object.freeze(outcomes),
    allowed: false,
    denialCode,
    deniedAtGate,
    deniedBeforeAttach: true,
    admittedHost: null,
    admittedSubjectNonce: null,
    observationDeadlineMs: null,
  });

  for (const gate of P1_OBSERVATION_SCOPE_GATES) {
    if (denialCode !== null) {
      outcomes.push({ gate, result: 'NOT_EVALUATED', denialCode: null });
      continue;
    }
    switch (gate) {
      case 'P1_KILL_SWITCH_ENTRY': {
        if (evaluateP1KillSwitch(input.killSwitchProbe) === 'ENGAGED') {
          deny(gate, 'P1_KILL_SWITCH_ENGAGED_AT_ENTRY');
        } else pass(gate);
        break;
      }
      case 'P1_OWNER_AUTHORIZATION': {
        const validation = validateP1ObserveGrant({
          candidate: input.grant,
          campaignId: input.campaignId,
          nowMs: input.nowMs,
        });
        if (!validation.ok) deny(gate, validation.denialCode);
        else pass(gate);
        break;
      }
      case 'P1_AUTHORIZATION_CLASS': {
        const candidate = input.grant as { authorizationClass?: unknown } | null;
        // THREE directions must hold: the grant is a P1_OBSERVE grant, this
        // admission claims P1_OBSERVE, and the claimed stage is exactly P1.
        // Aliasing in any direction denies, so P1 can neither be reached from
        // another class nor promoted out of itself.
        if (
          input.requestedAuthorizationClass !== P1_OBSERVE_AUTHORIZATION_CLASS ||
          input.claimedStage !== 'P1' ||
          candidate === null ||
          candidate.authorizationClass !== P1_OBSERVE_AUTHORIZATION_CLASS
        ) {
          deny(gate, 'P1_AUTHORIZATION_CLASS_NOT_P1_OBSERVE');
        } else pass(gate);
        break;
      }
      case 'P1_IMPLEMENTATION_IDENTITY': {
        const candidate = input.grant as { implementationSha?: unknown } | null;
        if (
          input.config === null ||
          candidate === null ||
          candidate.implementationSha !== input.config.expectedImplementationSha
        ) {
          deny(gate, 'P1_IMPLEMENTATION_IDENTITY_MISMATCH');
        } else pass(gate);
        break;
      }
      case 'P1_PQ_BINDING': {
        const candidate = input.grant as { pqReceiptDigest?: unknown } | null;
        if (input.pqReceiptDigest === null || input.pqReceiptDigest === '') {
          deny(gate, 'P1_PQ_BINDING_ABSENT');
        } else if (
          !PQ_RECEIPT_DIGEST_RE.test(input.pqReceiptDigest) ||
          candidate === null ||
          candidate.pqReceiptDigest !== input.pqReceiptDigest
        ) {
          deny(gate, 'P1_PQ_BINDING_INVALID');
        } else pass(gate);
        break;
      }
      case 'P1_CONFIGURATION_INTEGRITY': {
        if (input.config === null) deny(gate, 'P1_SCOPE_CONFIGURATION_INVALID');
        else pass(gate);
        break;
      }
      case 'P1_SUBJECT_PRESENCE': {
        if (
          input.subject === null ||
          typeof input.subject.subjectNonce !== 'string' ||
          input.subject.subjectNonce === ''
        ) {
          deny(gate, 'P1_SUBJECT_ABSENT');
        } else pass(gate);
        break;
      }
      case 'P1_SUBJECT_PROVENANCE': {
        // Only OPERATOR_CREATED admits. NIGHTWATCH_CREATED denies because
        // Nightwatch must never manufacture the subject it calls passive;
        // UNKNOWN denies because an ambiguous subject is a refusal.
        if (input.subject === null || input.subject.provenance !== 'OPERATOR_CREATED') {
          deny(gate, 'P1_SUBJECT_PROVENANCE_UNTRUSTED');
        } else pass(gate);
        break;
      }
      case 'P1_HOST_ADMISSION': {
        if (
          input.config === null ||
          input.subject === null ||
          !isAdmittedP1Host(input.config, input.subject.host)
        ) {
          deny(gate, 'P1_HOST_NOT_ADMITTED');
        } else pass(gate);
        break;
      }
      case 'P1_OBSERVATION_WINDOW': {
        // Unreachable past `P1_CONFIGURATION_INTEGRITY`, but throwing here
        // rather than denying under another gate's code: code-confinement
        // forbids borrowing, and an allow must never come from confusion.
        if (input.config === null) throw new Error('P1_SCOPE_ADMISSION_INVARIANT_VIOLATED');
        else {
          const window = input.config.observationWindow;
          if (input.nowMs < window.notBeforeMs) deny(gate, 'P1_WINDOW_NOT_YET_VALID');
          else if (input.nowMs >= window.notAfterMs) deny(gate, 'P1_WINDOW_EXPIRED');
          else if (
            window.notAfterMs - window.notBeforeMs >
            input.config.maxObservationDurationMs
          ) {
            deny(gate, 'P1_WINDOW_EXCESSIVE');
          } else pass(gate);
        }
        break;
      }
      case 'P1_OBSERVER_IDENTITY': {
        const verdict = p1ObserverIdentitySatisfies(input.observerIdentityClass);
        if (!verdict.ok && verdict.code !== null) deny(gate, verdict.code);
        else pass(gate);
        break;
      }
      case 'P1_PRIVACY_CAPABILITY': {
        if (input.privacyPolicy === null) deny(gate, 'P1_PRIVACY_CAPABILITY_ABSENT');
        else {
          try {
            assertProductionCone(input.privacyPolicy);
            pass(gate);
          } catch {
            deny(gate, 'P1_PRIVACY_CONE_NOT_PRODUCTION');
          }
        }
        break;
      }
      case 'P1_EVIDENCE_DESTINATION': {
        if (
          input.config === null ||
          input.evidenceDestination === null ||
          input.evidenceDestination !== input.config.evidenceDestination
        ) {
          deny(gate, 'P1_EVIDENCE_DESTINATION_INVALID');
        } else pass(gate);
        break;
      }
      case 'P1_ATTRIBUTION_CAPABILITY': {
        // Only an explicitly bound attributing source admits. Claiming the
        // source is not what makes traffic attributable — the session verdict
        // still fails closed on every UNKNOWN request — but an unbound source
        // must not reach attach at all.
        if (input.attributionCapability !== 'ATTRIBUTING_PROXY') {
          deny(gate, 'P1_ATTRIBUTION_CAPABILITY_ABSENT');
        } else pass(gate);
        break;
      }
      case 'P1_KILL_SWITCH_PREATTACH': {
        // The second evaluation. An admission that passed moments ago must
        // not survive a revocation that happened since.
        if (evaluateP1KillSwitch(input.killSwitchProbe) === 'ENGAGED') {
          deny(gate, 'P1_KILL_SWITCH_ENGAGED_BEFORE_ATTACH');
        } else pass(gate);
        break;
      }
      default: {
        // Exhaustiveness: an unhandled gate is a chain-definition defect, and
        // failing closed here means adding a gate ID without implementing it
        // cannot silently pass.
        const unreachable: never = gate;
        throw new Error(`P1_SCOPE_GATE_UNIMPLEMENTED:${String(unreachable)}`);
      }
    }
  }

  const gateDefinitionDigest = p1ScopeChainDefinitionDigest(digest);
  if (denialCode !== null) {
    return emptyDenied(P1_OBSERVATION_SCOPE_CHAIN_VERSION, gateDefinitionDigest);
  }

  // Consumption happens only on a full ALLOW, and only once. A denied
  // admission must not burn the grant.
  if (!isRegisteredP1Grant(input.grant) || !consumeP1ObserveGrant(input.grant).ok) {
    outcomes[1] = {
      gate: 'P1_OWNER_AUTHORIZATION',
      result: 'DENY',
      denialCode: 'P1_ALREADY_CONSUMED',
    };
    return {
      chainVersion: P1_OBSERVATION_SCOPE_CHAIN_VERSION,
      gateDefinitionDigest,
      orderedGates: P1_OBSERVATION_SCOPE_GATES,
      outcomes: Object.freeze(outcomes),
      allowed: false,
      denialCode: 'P1_ALREADY_CONSUMED',
      deniedAtGate: 'P1_OWNER_AUTHORIZATION',
      deniedBeforeAttach: true,
      admittedHost: null,
      admittedSubjectNonce: null,
      observationDeadlineMs: null,
    };
  }

  const config = input.config;
  const subject = input.subject;
  if (config === null || subject === null) {
    throw new Error('P1_SCOPE_ADMISSION_INVARIANT_VIOLATED');
  }
  return {
    chainVersion: P1_OBSERVATION_SCOPE_CHAIN_VERSION,
    gateDefinitionDigest,
    orderedGates: P1_OBSERVATION_SCOPE_GATES,
    outcomes: Object.freeze(outcomes),
    allowed: true,
    denialCode: null,
    deniedAtGate: null,
    // Every denial in this evaluator happens before any attach, because the
    // evaluator never attaches. Attach is the caller's step, taken only on
    // `allowed`.
    deniedBeforeAttach: true,
    admittedHost: config.admittedHost,
    admittedSubjectNonce: subject.subjectNonce,
    observationDeadlineMs: Math.min(
      config.observationWindow.notAfterMs,
      input.nowMs + config.maxObservationDurationMs,
    ),
  };
}
