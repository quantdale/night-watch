// ---------------------------------------------------------------------------
// Nightwatch C-11 — `productionRunGate`, the production admission kernel.
//
// This is a DISTINCT decision path from `src/core/safety/realRunGate.ts` and
// shares no branch with it (F-11). `realRunGate` hard-asserts
// `env.name === 'dev' || (next && !requiresAuth)` and refuses any
// production-class host; parameterizing it would have destroyed that guard for
// every existing DEV campaign, and duplicating it would have produced two
// gates that drift. Low-level validators may be shared. The DECISION may not.
//
// The evaluator is PURE over explicitly presented facts, with two deliberate
// exceptions that must be side effects to be correct at all:
//
//   - the budget reservation, which must happen BEFORE dispatch, and
//   - grant consumption, which must be a one-way transition.
//
// Everything else — the clock, the kill-switch probe, containment state, the
// resolved-address decision — is injected. A gate that read the world itself
// could not be falsified one fault at a time, which is exactly what the
// one-fault denial matrix requires.
// ---------------------------------------------------------------------------

import {
  GATE_DENIAL_CODES,
  PRODUCTION_ADMISSION_CHAIN_VERSION,
  PRODUCTION_ADMISSION_GATES,
  PRODUCTION_READ_METHODS,
  PROD_OBSERVE_AUTHORIZATION_CLASS,
  STAGE_OBSERVER_IDENTITY_MINIMUM,
  type AdmissionDecision,
  type ContainmentQualificationState,
  type GateOutcome,
  type ObserverIdentityClass,
  type ProductionAdmissionGate,
  type ProductionDenialCode,
  type ProductionObservationStage,
} from './types';
import { consumeProdObserveGrant, validateProdObserveGrant } from './authorization';
import { isAdmittedProductionHost, type ProdObserveConfig } from './observationConfig';
import { evaluateKillSwitch, type KillSwitchProbe } from './killSwitch';
import type { ProductionBudgetLedger, BudgetReservation } from './budget';
import type { ProductionBreakerBoard } from './breakers';
import { assertSourceProvenRoute, type RouteVocabularySource } from '../prodPrivacy/routeVocabulary';
import { assertHandleNotValue, type OpaqueParameterHandle } from '../prodPrivacy/parameterProvenance';
import { assertProductionCone, type PrivacyPolicy } from '../prodPrivacy/policy';

export const PRODUCTION_RUN_GATE_VERSION = 'nightwatch.production-run-gate.v1' as const;

/** Source snapshot facts. Completeness gates authority; it is never inferred. */
export interface ProductionSourceFacts {
  readonly repository: string;
  readonly sourceSha: string;
  readonly inventoryState: 'COMPLETE' | 'TRUNCATED' | 'UNKNOWN';
  readonly currencyState: 'CURRENT' | 'STALE' | 'UNKNOWN';
}

/** C-06 read-only proof facts. C-11 never increases the proven population. */
export interface ReadOnlyProofFacts {
  readonly proven: boolean;
  readonly witnessCount: number;
  readonly stale: boolean;
  /** Opaque proof identity for the receipt. Never a route or a customer value. */
  readonly proofIdentity: string;
}

export interface ProductionRequestIntent {
  readonly method: string;
  readonly host: string;
  /** A route TEMPLATE, never a concrete path. */
  readonly routeTemplate: string;
  readonly hasBody: boolean;
  readonly mutationClassification: string | null;
  /** Opaque handles only. A concrete value here is a denial, not a warning. */
  readonly parameters: readonly OpaqueParameterHandle[];
  readonly serviceKey: string;
  readonly routeKey: string;
}

export interface ProductionAdmissionInput {
  readonly campaignId: string;
  readonly stage: ProductionObservationStage;
  readonly nowMs: number;
  readonly environmentClass: 'LOCAL' | 'CLEAN' | 'CI' | 'PREDEV';

  readonly killSwitchProbe: KillSwitchProbe;
  readonly grant: unknown;
  readonly config: ProdObserveConfig | null;
  readonly observerIdentityClass: ObserverIdentityClass;
  readonly source: ProductionSourceFacts;
  readonly readOnlyProof: ReadOnlyProofFacts;
  readonly routeVocabulary: RouteVocabularySource;
  readonly resolvedAddressesAdmitted: boolean;
  readonly intent: ProductionRequestIntent;
  /**
   * REQUIRED and explicitly injected. There is no default: a shared module
   * that falls back to a policy is a silent allow, so a missing policy denies
   * (F-12).
   */
  readonly privacyPolicy: PrivacyPolicy | null;
  readonly containment: ContainmentQualificationState;
  readonly budget: ProductionBudgetLedger;
  readonly breakers: ProductionBreakerBoard;
}

export interface ProductionAdmissionOutcome extends AdmissionDecision {
  /** Present only when every gate passed. Proof that budget was reserved first. */
  readonly reservation: BudgetReservation | null;
}

/**
 * The digest over the chain DEFINITION — its version, ordered gate IDs and the
 * denial codes each gate may emit. A reordered, renamed, added or removed gate
 * changes it, which is what lets a receipt be checked against the chain it
 * claims to have run.
 */
export function productionChainDefinitionDigest(digest: (canonical: string) => string): string {
  return `prodchain:${digest(JSON.stringify({
    version: PRODUCTION_ADMISSION_CHAIN_VERSION,
    gates: PRODUCTION_ADMISSION_GATES,
    denialCodes: PRODUCTION_ADMISSION_GATES.map((gate) => GATE_DENIAL_CODES[gate]),
  }))}`;
}

/** Containment requirement by environment class. The CI carve-out stays explicit. */
export function containmentSatisfies(
  state: ContainmentQualificationState,
  environmentClass: ProductionAdmissionInput['environmentClass'],
): boolean {
  if (state === 'PROVEN') return true;
  // GitHub's runner genuinely cannot provide a rootless envelope. That absence
  // is RECORDED as its own state and never promoted to PROVEN; local, clean and
  // predev enforce the designed stronger requirement.
  if (state === 'NOT_EXERCISED_BWRAP_UNAVAILABLE') return environmentClass === 'CI';
  return false;
}

function observerIdentitySatisfies(stage: ProductionObservationStage, actual: ObserverIdentityClass): { ok: boolean; code: ProductionDenialCode | null } {
  const minimum = STAGE_OBSERVER_IDENTITY_MINIMUM[stage];
  if (minimum === 'NONE_REQUIRED') return { ok: true, code: null };
  if (actual === 'UNKNOWN') return { ok: false, code: 'OBSERVER_IDENTITY_UNKNOWN' };
  if (minimum === 'ORG_ENFORCED_READ_ONLY' && actual !== 'ORG_ENFORCED_READ_ONLY') {
    // `ORDINARY_USER` must never silently satisfy a stage requiring
    // organizational read-only enforcement.
    return { ok: false, code: 'OBSERVER_IDENTITY_BELOW_STAGE_MINIMUM' };
  }
  return { ok: true, code: null };
}

/**
 * Evaluate the ordered chain.
 *
 * Stops at the FIRST denial and marks every later gate `NOT_EVALUATED`. That
 * is not an optimization: it makes the receipt say which authority actually
 * refused, instead of a set of failures whose causal order is lost.
 */
export function evaluateProductionAdmission(
  input: ProductionAdmissionInput,
  digest: (canonical: string) => string,
): ProductionAdmissionOutcome {
  const outcomes: GateOutcome[] = [];
  let reservation: BudgetReservation | null = null;
  let denialCode: ProductionDenialCode | null = null;
  let deniedAtGate: ProductionAdmissionGate | null = null;

  const pass = (gate: ProductionAdmissionGate): void => {
    outcomes.push({ gate, result: 'PASS', denialCode: null });
  };
  const deny = (gate: ProductionAdmissionGate, code: ProductionDenialCode): void => {
    // A gate may only emit a code the chain definition assigns to it, so a
    // gate cannot borrow another's reason and make the matrix ambiguous.
    if (!GATE_DENIAL_CODES[gate].includes(code)) throw new Error(`PRODUCTION_GATE_DENIAL_CODE_INVALID:${gate}:${code}`);
    outcomes.push({ gate, result: 'DENY', denialCode: code });
    denialCode = code;
    deniedAtGate = gate;
  };

  for (const gate of PRODUCTION_ADMISSION_GATES) {
    if (denialCode !== null) {
      outcomes.push({ gate, result: 'NOT_EVALUATED', denialCode: null });
      continue;
    }
    switch (gate) {
      case 'G_KILL_SWITCH_ENTRY': {
        if (evaluateKillSwitch(input.killSwitchProbe) === 'ENGAGED') deny(gate, 'KILL_SWITCH_ENGAGED_AT_ENTRY');
        else pass(gate);
        break;
      }
      case 'G_OWNER_AUTHORIZATION': {
        const validation = validateProdObserveGrant({ candidate: input.grant, campaignId: input.campaignId, nowMs: input.nowMs });
        if (!validation.ok) deny(gate, validation.denialCode);
        else pass(gate);
        break;
      }
      case 'G_AUTHORIZATION_CLASS': {
        const candidate = input.grant as { authorizationClass?: unknown } | null;
        if (candidate === null || candidate.authorizationClass !== PROD_OBSERVE_AUTHORIZATION_CLASS) {
          deny(gate, 'AUTHORIZATION_CLASS_NOT_PROD_OBSERVE');
        } else pass(gate);
        break;
      }
      case 'G_ORGANIZATION_WINDOW': {
        const window = input.config?.observationWindow;
        if (window === undefined) deny(gate, 'ORGANIZATION_WINDOW_ABSENT');
        else if (input.nowMs < window.notBeforeMs) deny(gate, 'ORGANIZATION_WINDOW_NOT_YET_VALID');
        else if (input.nowMs >= window.notAfterMs) deny(gate, 'ORGANIZATION_WINDOW_EXPIRED');
        else pass(gate);
        break;
      }
      case 'G_CONFIGURATION_INTEGRITY': {
        if (input.config === null) deny(gate, 'CONFIGURATION_INTEGRITY_FAILED');
        else pass(gate);
        break;
      }
      case 'G_OBSERVER_IDENTITY': {
        const verdict = observerIdentitySatisfies(input.stage, input.observerIdentityClass);
        if (!verdict.ok && verdict.code !== null) deny(gate, verdict.code);
        else pass(gate);
        break;
      }
      case 'G_SOURCE_CURRENCY': {
        if (input.source.inventoryState !== 'COMPLETE') deny(gate, 'SOURCE_INCOMPLETE');
        else if (input.source.currencyState !== 'CURRENT') deny(gate, 'SOURCE_STALE');
        else pass(gate);
        break;
      }
      case 'G_READ_ONLY_PROOF': {
        // Two witnesses, per `design.md §5.2` G4. C-11 does not weaken this to
        // manufacture an admissible route.
        if (!input.readOnlyProof.proven || input.readOnlyProof.witnessCount < 2) deny(gate, 'READ_ONLY_PROOF_ABSENT');
        else if (input.readOnlyProof.stale) deny(gate, 'READ_ONLY_PROOF_STALE');
        else pass(gate);
        break;
      }
      case 'G_ROUTE_AUTHORITY': {
        try {
          // C-10.5's guard: refuses an unbranded or JSON-revived capability, a
          // TEST_ONLY seam capability, and any non-member template.
          assertSourceProvenRoute(input.routeVocabulary, input.intent.routeTemplate);
          pass(gate);
        } catch (error) {
          const message = error instanceof Error ? error.message : '';
          deny(gate, /AUTHORITY|TEST_ONLY|BRAND/i.test(message) ? 'ROUTE_VOCABULARY_UNTRUSTED' : 'ROUTE_NOT_SOURCE_PROVEN');
        }
        break;
      }
      case 'G_HOST_ADMISSION': {
        if (input.config === null || !isAdmittedProductionHost(input.config, input.intent.host)) deny(gate, 'HOST_NOT_ADMITTED');
        else pass(gate);
        break;
      }
      case 'G_ADDRESS_POLICY': {
        if (!input.resolvedAddressesAdmitted) deny(gate, 'RESOLVED_ADDRESS_NOT_ADMITTED');
        else pass(gate);
        break;
      }
      case 'G_METHOD_AND_BODY': {
        if (!PRODUCTION_READ_METHODS.includes(input.intent.method)) deny(gate, 'METHOD_NOT_PERMITTED');
        else if (input.intent.hasBody) deny(gate, 'BODY_PRESENT');
        else if (input.intent.mutationClassification !== null) deny(gate, 'MUTATION_CLASSIFICATION_PRESENT');
        else pass(gate);
        break;
      }
      case 'G_PARAMETER_PROVENANCE': {
        let failure: ProductionDenialCode | null = null;
        for (const parameter of input.intent.parameters) {
          try {
            // Rejects anything that is not an opaque handle, including a
            // concrete value that merely looks like one.
            assertHandleNotValue(parameter);
          } catch {
            failure = 'PARAMETER_PROVENANCE_INVALID';
            break;
          }
        }
        // The route identity must be a template, never a concrete path. A
        // placeholder-free path with a numeric segment is the DEF-C10-5 shape.
        if (failure === null && /\/\d{3,}(?:\/|$)/.test(input.intent.routeTemplate)) {
          failure = 'PARAMETER_CONCRETE_VALUE_PRESENT';
        }
        if (failure !== null) deny(gate, failure);
        else pass(gate);
        break;
      }
      case 'G_PRIVACY_CAPABILITY': {
        if (input.privacyPolicy === null) deny(gate, 'PRIVACY_CAPABILITY_ABSENT');
        else {
          try {
            assertProductionCone(input.privacyPolicy);
            pass(gate);
          } catch {
            deny(gate, 'PRIVACY_CONE_NOT_PRODUCTION');
          }
        }
        break;
      }
      case 'G_CONTAINMENT_READINESS': {
        if (!containmentSatisfies(input.containment, input.environmentClass)) deny(gate, 'CONTAINMENT_NOT_READY');
        else pass(gate);
        break;
      }
      case 'G_BUDGET_RESERVATION': {
        // RESERVE BEFORE DISPATCH. Nothing downstream may dispatch without the
        // reservation this gate returns.
        const result = input.budget.reserve({ serviceKey: input.intent.serviceKey, routeKey: input.intent.routeKey, nowMs: input.nowMs });
        if (!result.ok) deny(gate, 'BUDGET_EXHAUSTED');
        else {
          reservation = result.reservation;
          pass(gate);
        }
        break;
      }
      case 'G_BREAKER_STATE': {
        if (input.breakers.isOpen) deny(gate, 'BREAKER_OPEN');
        else pass(gate);
        break;
      }
      case 'G_KILL_SWITCH_PREDISPATCH': {
        // The second evaluation. A qualification that passed moments ago must
        // not survive a revocation that happened since.
        if (evaluateKillSwitch(input.killSwitchProbe) === 'ENGAGED') deny(gate, 'KILL_SWITCH_ENGAGED_BEFORE_DISPATCH');
        else pass(gate);
        break;
      }
      default: {
        // Exhaustiveness: an unhandled gate is a chain-definition defect, and
        // failing closed here means adding a gate ID without implementing it
        // cannot silently pass.
        const unreachable: never = gate;
        throw new Error(`PRODUCTION_GATE_UNIMPLEMENTED:${String(unreachable)}`);
      }
    }
  }

  const allowed = denialCode === null;
  if (allowed) {
    // Consumption happens only on a full ALLOW, and only once. A denied
    // qualification must not burn the grant.
    const consumed = consumeProdObserveGrant(input.grant);
    if (!consumed.ok) {
      outcomes[1] = { gate: 'G_OWNER_AUTHORIZATION', result: 'DENY', denialCode: consumed.denialCode ?? 'ALREADY_CONSUMED' };
      return {
        chainVersion: PRODUCTION_ADMISSION_CHAIN_VERSION,
        gateDefinitionDigest: productionChainDefinitionDigest(digest),
        orderedGates: PRODUCTION_ADMISSION_GATES,
        outcomes: Object.freeze(outcomes),
        allowed: false,
        denialCode: consumed.denialCode ?? 'ALREADY_CONSUMED',
        deniedAtGate: 'G_OWNER_AUTHORIZATION',
        deniedBeforeDispatch: true,
        reservation,
      };
    }
  }

  return {
    chainVersion: PRODUCTION_ADMISSION_CHAIN_VERSION,
    gateDefinitionDigest: productionChainDefinitionDigest(digest),
    orderedGates: PRODUCTION_ADMISSION_GATES,
    outcomes: Object.freeze(outcomes),
    allowed,
    denialCode,
    deniedAtGate,
    // Every denial in this evaluator happens before any dispatch, because the
    // evaluator never dispatches. Dispatch is the caller's step, taken only on
    // `allowed`.
    deniedBeforeDispatch: !allowed,
    reservation,
  };
}
