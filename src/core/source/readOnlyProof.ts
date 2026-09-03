// ---------------------------------------------------------------------------
// Nightwatch C-06 — read-only proof assembly.
//
// The admission rule is KIND-DIVERSE and EFFECT-MANDATORY: a proof needs at
// least one DECLARATION witness AND at least one EFFECT witness. Counting to
// two is not the criterion (independent review F-03). A GET annotation plus a
// sentence in a specification is not a proof of anything about the deployed
// code, so `W-SPEC` can corroborate but is barred from production admission.
//
// Two named preconditions sit outside the witness set and can only deny
// (F-04, F-05):
//
//   * the route → handler JOIN must be proven, because both witnesses only
//     describe the same operation if that join resolved;
//   * the repository INVENTORY must be complete, because "this closure
//     contains no write" is evidence of absence only over a complete search
//     space.
//
// Membership in a hand-authored operation catalog is not an input to this
// module. There is deliberately no parameter through which it could become
// one.
// ---------------------------------------------------------------------------

import { sourceEvidenceDigest } from '../semanticCoverage';
import { EFFECT_KINDS, EFFECT_KIND_POLICY, type EffectKind, type EffectKindAdmission } from './effectVocabulary';
import type { PhpEffectClosureProof, PhpEffectKindCount } from './phpEffectClosure';
import type { PhpResolvedRoutePipeline } from './phpPipeline';
import type { SourceCompletenessState } from './completeness';
import type { SourceJoinState, SourceOperationMethod, SourceReadOnlyClassification, SourceRouteProof } from './surfaceTypes';

export const READ_ONLY_PROOF_VERSION = 'nightwatch.read-only-proof.v1' as const;

export const READ_ONLY_WITNESS_KINDS = ['W-DECLARED_VERB', 'W-DECLARED_ROUTE', 'W-EFFECT_CLOSURE', 'W-EFFECT_RPC', 'W-SPEC'] as const;
export type ReadOnlyWitnessKind = (typeof READ_ONLY_WITNESS_KINDS)[number];

/** Witness classes. Diversity is measured across CLASSES, not across kinds. */
export type ReadOnlyWitnessClass = 'DECLARATION' | 'EFFECT' | 'DOCUMENTARY';

export const READ_ONLY_WITNESS_CLASS: Readonly<Record<ReadOnlyWitnessKind, ReadOnlyWitnessClass>> = Object.freeze({
  'W-DECLARED_VERB': 'DECLARATION',
  'W-DECLARED_ROUTE': 'DECLARATION',
  'W-EFFECT_CLOSURE': 'EFFECT',
  'W-EFFECT_RPC': 'EFFECT',
  'W-SPEC': 'DOCUMENTARY',
});

/**
 * `HELD` — positively established from current source.
 * `FAILED` — positively refuted. Terminal.
 * `UNSUPPORTED` — no analyzer exists for this witness on this operation. An
 *   absence, never a pass and never a failure.
 */
export type ReadOnlyWitnessState = 'HELD' | 'FAILED' | 'UNSUPPORTED';

export interface ReadOnlyWitness {
  readonly kind: ReadOnlyWitnessKind;
  readonly witnessClass: ReadOnlyWitnessClass;
  readonly state: ReadOnlyWitnessState;
  /** Categorical cause. Never a source excerpt, identifier value or URL. */
  readonly reasonCode: string | null;
  readonly evidenceDigest: string | null;
}

export type ReadOnlyProofState = 'READ_ONLY_PROVEN' | 'READ_ONLY_SINGLE_WITNESS' | 'MUTATION_CAPABLE' | 'AMBIGUOUS' | 'UNKNOWN';

export type ReadOnlyProductionAdmission = 'ELIGIBLE' | 'DENIED';

export interface ReadOnlyPrecondition {
  readonly satisfied: boolean;
  readonly reasonCode: string | null;
}

export interface ReadOnlyProof {
  readonly schemaVersion: typeof READ_ONLY_PROOF_VERSION;
  readonly state: ReadOnlyProofState;
  readonly witnesses: readonly ReadOnlyWitness[];
  /** The route → handler join this witness pair depends on. */
  readonly joinPrecondition: ReadOnlyPrecondition;
  /** The repository-level enumeration completeness the closure depends on. */
  readonly inventoryPrecondition: ReadOnlyPrecondition;
  /** The pipeline resolution the effect closure was rooted at. */
  readonly pipelinePrecondition: ReadOnlyPrecondition;
  readonly vocabularyDigest: string | null;
  readonly effectLedger: readonly PhpEffectKindCount[];
  readonly effectPolicy: readonly (readonly [EffectKind, EffectKindAdmission])[];
  readonly unclassifiedCallees: number;
  readonly productionAdmission: ReadOnlyProductionAdmission;
  readonly productionDenialReasons: readonly string[];
  readonly evidenceDigest: string;
}

const EMPTY_LEDGER: readonly PhpEffectKindCount[] = Object.freeze(EFFECT_KINDS.map((kind) => ({ kind, count: 0 })));
const EFFECT_POLICY_ROWS: readonly (readonly [EffectKind, EffectKindAdmission])[] = Object.freeze(EFFECT_KINDS.map((kind) => [kind, EFFECT_KIND_POLICY[kind]] as const));

function witness(kind: ReadOnlyWitnessKind, state: ReadOnlyWitnessState, reasonCode: string | null, evidenceDigest: string | null): ReadOnlyWitness {
  return { kind, witnessClass: READ_ONLY_WITNESS_CLASS[kind], state, reasonCode, evidenceDigest };
}

export interface ReadOnlyProofInput {
  readonly method: SourceOperationMethod;
  readonly routeProof: SourceRouteProof;
  /** Route → handler join state from the existing surface join resolution. */
  readonly joinState: SourceJoinState;
  /** Repository-level enumeration completeness for the analysed repository. */
  readonly inventoryCompleteness: SourceCompletenessState;
  /** Resolved middleware pipeline. `null` when the language has no pipeline model. */
  readonly pipeline: PhpResolvedRoutePipeline | null;
  /** Bounded effect closure. `null` when no effect analyzer supports this operation. */
  readonly closure: PhpEffectClosureProof | null;
  /**
   * C-09: how many admitted spec-derived expectations this operation carries.
   *
   * A positive count makes `W-SPEC` HELD instead of UNSUPPORTED. It changes
   * NOTHING about the proof state, and that is deliberate: `W-SPEC` is class
   * `DOCUMENTARY`, while `READ_ONLY_PROVEN` requires one `DECLARATION` and one
   * `EFFECT` witness. So a documentary witness can never satisfy either
   * requirement, and the §46 boundary holds by the CLASS MODEL rather than by
   * a second guard bolted on beside it.
   *
   * Absent or zero leaves the witness UNSUPPORTED, which is an absence and
   * never a pass.
   */
  readonly specExpectationCount?: number;
}

/**
 * Assemble one operation's read-only proof.
 *
 * Order of decision:
 *   1. a refuted declaration witness (a non-GET verb) is terminal;
 *   2. an unsatisfied precondition taints every witness → AMBIGUOUS;
 *   3. a refuted effect witness is terminal;
 *   4. one declaration AND one effect witness → READ_ONLY_PROVEN;
 *   5. any single held witness → READ_ONLY_SINGLE_WITNESS (DEV only);
 *   6. any refusal → AMBIGUOUS; otherwise UNKNOWN.
 */
export function buildReadOnlyProof(input: ReadOnlyProofInput): ReadOnlyProof {
  const witnesses: ReadOnlyWitness[] = [];

  // --- declaration witnesses --------------------------------------------
  // The protobuf `google.api.http` verb witness belongs to C-02b. It is
  // absent, and absence is UNSUPPORTED, never a pass.
  witnesses.push(witness('W-DECLARED_VERB', 'UNSUPPORTED', 'PROTO_VERB_ANALYZER_ABSENT', null));
  if (input.routeProof !== 'PROVEN') {
    witnesses.push(witness('W-DECLARED_ROUTE', 'UNSUPPORTED', 'ROUTE_NOT_PROVEN', null));
  } else if (input.method !== 'GET') {
    witnesses.push(witness('W-DECLARED_ROUTE', 'FAILED', 'DECLARED_VERB_MUTATING', null));
  } else {
    witnesses.push(witness('W-DECLARED_ROUTE', 'HELD', null, sourceEvidenceDigest({ kind: 'w-declared-route', method: input.method, routeProof: input.routeProof })));
  }

  // --- effect witnesses --------------------------------------------------
  const closure = input.closure;
  if (closure === null) {
    witnesses.push(witness('W-EFFECT_CLOSURE', 'UNSUPPORTED', 'EFFECT_CLOSURE_ANALYZER_ABSENT', null));
  } else if (closure.state === 'EFFECTFUL') {
    witnesses.push(witness('W-EFFECT_CLOSURE', 'FAILED', `EFFECT_${closure.disqualifyingKinds[0] ?? 'UNKNOWN'}`, closure.evidenceDigest));
  } else if (closure.state === 'AMBIGUOUS') {
    witnesses.push(witness('W-EFFECT_CLOSURE', 'UNSUPPORTED', closure.rejectionCode ?? 'CLOSURE_UNRESOLVED', closure.evidenceDigest));
  } else {
    witnesses.push(witness('W-EFFECT_CLOSURE', 'HELD', null, closure.evidenceDigest));
  }
  // The Go/gRPC effect witness belongs to C-03.
  witnesses.push(witness('W-EFFECT_RPC', 'UNSUPPORTED', 'RPC_EFFECT_ANALYZER_ABSENT', null));

  // --- documentary witness ----------------------------------------------
  // C-09 supplies spec-derived expectations. A documentary witness is still
  // barred from production admission, and cannot contribute to
  // READ_ONLY_PROVEN, because that needs a DECLARATION and an EFFECT witness
  // and DOCUMENTARY is neither. Turning this on therefore adds information
  // without adding authority — which is the whole point of the class model.
  const specExpectations = input.specExpectationCount ?? 0;
  witnesses.push(Number.isSafeInteger(specExpectations) && specExpectations > 0
    ? witness('W-SPEC', 'HELD', null, null)
    : witness('W-SPEC', 'UNSUPPORTED', 'SPEC_EXPECTATION_ABSENT', null));

  // --- preconditions -----------------------------------------------------
  const joinPrecondition: ReadOnlyPrecondition = input.joinState === 'PROVEN'
    ? { satisfied: true, reasonCode: null }
    : { satisfied: false, reasonCode: `JOIN_${input.joinState}` };
  const inventoryPrecondition: ReadOnlyPrecondition = input.inventoryCompleteness === 'COMPLETE'
    ? { satisfied: true, reasonCode: null }
    : { satisfied: false, reasonCode: `INVENTORY_${input.inventoryCompleteness}` };
  const pipelinePrecondition: ReadOnlyPrecondition = input.pipeline === null
    ? { satisfied: false, reasonCode: 'PIPELINE_MODEL_ABSENT' }
    : input.pipeline.state === 'RESOLVED'
      ? { satisfied: true, reasonCode: null }
      : { satisfied: false, reasonCode: input.pipeline.rejectionCode ?? 'PIPELINE_UNRESOLVED' };

  const held = witnesses.filter((entry) => entry.state === 'HELD');
  const declarationHeld = held.filter((entry) => entry.witnessClass === 'DECLARATION').length;
  const effectHeld = held.filter((entry) => entry.witnessClass === 'EFFECT').length;
  const declarationFailed = witnesses.some((entry) => entry.witnessClass === 'DECLARATION' && entry.state === 'FAILED');
  const effectFailed = witnesses.some((entry) => entry.witnessClass === 'EFFECT' && entry.state === 'FAILED');
  const preconditionsSatisfied = joinPrecondition.satisfied && inventoryPrecondition.satisfied && pipelinePrecondition.satisfied;

  // A refuted witness is terminal and is decided independently of the
  // preconditions: an HTTP verb and an observed effect are properties of the
  // route and of the closure, not of the join that relates them.
  //
  // An unsatisfied precondition can only DENY. It downgrades an otherwise
  // sufficient witness pair to AMBIGUOUS; it never converts a single witness
  // into a conflict, because there is no conflict to report.
  let state: ReadOnlyProofState;
  if (declarationFailed || effectFailed) state = 'MUTATION_CAPABLE';
  else if (declarationHeld >= 1 && effectHeld >= 1) state = preconditionsSatisfied ? 'READ_ONLY_PROVEN' : 'AMBIGUOUS';
  else if (held.length >= 1) state = 'READ_ONLY_SINGLE_WITNESS';
  else state = 'UNKNOWN';

  const unclassifiedCallees = closure?.unclassifiedCallees ?? 0;
  const productionDenialReasons: string[] = [];
  if (state !== 'READ_ONLY_PROVEN') productionDenialReasons.push(`PROOF_STATE_${state}`);
  if (effectHeld === 0) productionDenialReasons.push('EFFECT_WITNESS_MISSING');
  if (unclassifiedCallees > 0) productionDenialReasons.push('CALLEE_CLASSIFICATION_INCOMPLETE');
  if (!joinPrecondition.satisfied) productionDenialReasons.push(joinPrecondition.reasonCode!);
  if (!inventoryPrecondition.satisfied) productionDenialReasons.push(inventoryPrecondition.reasonCode!);
  if (!pipelinePrecondition.satisfied) productionDenialReasons.push(pipelinePrecondition.reasonCode!);
  // A documentary witness may corroborate; it may never carry an admission.
  if (held.every((entry) => entry.witnessClass === 'DOCUMENTARY') && held.length > 0) productionDenialReasons.push('DOCUMENTARY_WITNESS_ONLY');

  const effectLedger = closure?.effectCounts ?? EMPTY_LEDGER;
  const proof: Omit<ReadOnlyProof, 'evidenceDigest'> = {
    schemaVersion: READ_ONLY_PROOF_VERSION,
    state,
    witnesses,
    joinPrecondition,
    inventoryPrecondition,
    pipelinePrecondition,
    vocabularyDigest: closure?.vocabularyDigest ?? null,
    effectLedger,
    effectPolicy: EFFECT_POLICY_ROWS,
    unclassifiedCallees,
    productionAdmission: productionDenialReasons.length === 0 ? 'ELIGIBLE' : 'DENIED',
    productionDenialReasons: [...new Set(productionDenialReasons)].sort((left, right) => left.localeCompare(right)),
  };
  return {
    ...proof,
    evidenceDigest: sourceEvidenceDigest({
      kind: 'read-only-proof',
      version: READ_ONLY_PROOF_VERSION,
      state,
      witnesses: witnesses.map((entry) => [entry.kind, entry.state, entry.reasonCode]),
      joinPrecondition,
      inventoryPrecondition,
      pipelinePrecondition,
      vocabularyDigest: proof.vocabularyDigest,
      effectLedger: effectLedger.map((entry) => [entry.kind, entry.count]),
      effectPolicy: EFFECT_POLICY_ROWS.map(([kind, admission]) => [kind, admission]),
      unclassifiedCallees,
      productionAdmission: proof.productionAdmission,
      productionDenialReasons: proof.productionDenialReasons,
    }),
  };
}

/** Effect kinds that establish a state change inside the system under test. */
const MUTATING_KINDS: readonly EffectKind[] = ['DATA_WRITE', 'AUDIT_WRITE', 'CACHE_WRITE', 'SESSION_WRITE', 'MESSAGE_PUBLISH'];

/**
 * Project the proof onto the existing surface vocabulary.
 *
 * `PROVEN_READ_ONLY` is reachable from `READ_ONLY_PROVEN` and from nowhere
 * else. `READ_ONLY_SINGLE_WITNESS` maps to `READ_ONLY_METHOD_ONLY`, which is
 * explicitly not authority.
 *
 * A closure disqualified ONLY by an outbound call is reported as
 * `CONDITIONAL_MUTATION`, not as `PROVEN_MUTATION_CAPABLE`: Nightwatch has
 * proven that the request leaves the analysable region, not that it writes.
 * Both values deny identically everywhere downstream, so the distinction
 * costs no safety and avoids asserting a mutation that was never observed.
 */
export function readOnlyClassificationFromProof(proof: ReadOnlyProof): SourceReadOnlyClassification {
  switch (proof.state) {
    case 'READ_ONLY_PROVEN': return 'PROVEN_READ_ONLY';
    case 'MUTATION_CAPABLE': {
      const mutating = proof.effectLedger.some((entry) => entry.count > 0 && MUTATING_KINDS.includes(entry.kind));
      const external = proof.effectLedger.some((entry) => entry.count > 0 && entry.kind === 'EXTERNAL_CALL');
      return !mutating && external ? 'CONDITIONAL_MUTATION' : 'PROVEN_MUTATION_CAPABLE';
    }
    case 'READ_ONLY_SINGLE_WITNESS': return 'READ_ONLY_METHOD_ONLY';
    case 'AMBIGUOUS': return 'AMBIGUOUS';
    default: return 'UNSUPPORTED';
  }
}
