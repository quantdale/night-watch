// ---------------------------------------------------------------------------
// Production track — per-stage data and the blocker-kind evaluator.
//
// The records below are the executable form of the spec's "recorded from
// current evidence" lists: repository work (what must exist before
// authorization is even meaningful) and the external prerequisite (what
// someone other than an agent must satisfy). The evaluator answers only the
// blocker-kind question, from explicitly presented facts, and never converts
// an unmet external prerequisite into `AWAITING_AUTHORIZATION`.
//
// Measured figures referenced here come from the census ledger; the module
// reads none of them itself.
// ---------------------------------------------------------------------------

import type {
  ProductionStageEvaluationFacts,
  ProductionStageStatusReport,
  ProductionTrackNextAction,
  ProductionTrackStageRecord,
  ProductionTrackStage,
  ProductionTrackStatus,
} from './types';

export const PRODUCTION_TRACK_RECORDS: readonly ProductionTrackStageRecord[] = Object.freeze([
  Object.freeze({
    stage: 'C-12',
    title: 'P1 passive production observation',
    phase: 'P1',
    repositoryWork: Object.freeze([
      Object.freeze({ item: 'P1 observation-scope admission, attribution and bounded session core', state: 'COMPLETE' as const }),
      Object.freeze({ item: 'C-12 operator-readiness preflight (local, advisory)', state: 'COMPLETE' as const }),
      Object.freeze({ item: 'C-12 synthetic offline rehearsal driving the real P1 core', state: 'COMPLETE' as const }),
    ]),
    externalPrerequisite: 'Operator prerequisites named in docs/C12-OPERATOR-RUNBOOK.md: operator-created production subject, external P1 scope configuration, attributing proxy capability',
    authorizationRequirement: 'Fresh C-12-scoped one-shot owner authorization; MA-8 authorization does not transfer',
    structuralBlocker: null,
    acceptanceCriteria: Object.freeze([
      'at least 3 passive sessions',
      'zero requests issued by Nightwatch (NIGHTWATCH_ATTRIBUTABLE = 0 and UNKNOWN = 0)',
      'zero raw values persisted',
      'baselines recorded',
    ]),
    scope: 'NIGHTWATCH' as const,
  }),
  Object.freeze({
    stage: 'C-13',
    title: 'P2 bounded active production reads',
    phase: 'P2',
    repositoryWork: Object.freeze([
      Object.freeze({ item: 'PRODUCTION_READ_NO_DEPLOYMENT_FACT refusal at construction', state: 'COMPLETE' as const }),
      Object.freeze({ item: 'request budgeting (ProductionBudgetLedger, reserved inside the C-11 chain)', state: 'COMPLETE' as const }),
      Object.freeze({ item: 'two-witness read-only traceability (witnessCount >= 2, stale detection)', state: 'COMPLETE' as const }),
    ]),
    externalPrerequisite: 'C-08b read-only mochi manifest access at services/{env}/{appproxy,serviceproxy}/ingress.yaml',
    authorizationRequirement: 'One-shot C-13 authorization, only meaningful after C-08b',
    structuralBlocker: 'POSITIVE_DEPLOYMENT_FACTS is 0',
    acceptanceCriteria: Object.freeze([
      'every production-admitted route carries a positive DEPLOYMENT_FACT',
      'no request issued without the full C-11 chain',
    ]),
    scope: 'NIGHTWATCH' as const,
  }),
  Object.freeze({
    stage: 'C-14',
    title: 'P3 bounded production replay',
    phase: 'P3',
    repositoryWork: Object.freeze([
      Object.freeze({ item: 'replay under the production privacy firewall', state: 'REMAINING' as const }),
    ]),
    externalPrerequisite: 'C-13 evidence',
    authorizationRequirement: 'Fresh C-14 authorization after C-13',
    structuralBlocker: null,
    acceptanceCriteria: Object.freeze([
      'at least 1 candidate reproduced with exact fingerprint equality',
      'dossier privacy-clean',
    ]),
    scope: 'NIGHTWATCH' as const,
  }),
  Object.freeze({
    stage: 'P4',
    title: 'Autonomous read-only production campaigns',
    phase: 'P4',
    repositoryWork: Object.freeze([]),
    externalPrerequisite: 'U-3: an organizationally enforced read-only observer identity',
    authorizationRequirement: null,
    structuralBlocker: null,
    acceptanceCriteria: Object.freeze([]),
    scope: 'OUTSIDE_NIGHTWATCH_SCOPE' as const,
  }),
]);

const NEXT_ACTION_BY_STATUS: Readonly<Record<ProductionTrackStatus, ProductionTrackNextAction>> = Object.freeze({
  REPOSITORY_WORK_REMAINING: 'COMPLETE_REPOSITORY_WORK',
  EXTERNAL_PREREQUISITE_UNMET: 'SATISFY_EXTERNAL_PREREQUISITE',
  AWAITING_AUTHORIZATION: 'OBTAIN_STAGE_AUTHORIZATION',
  AUTHORIZED: 'EXECUTE_WITHIN_AUTHORIZED_SCOPE',
});

/**
 * Resolve one stage's status from explicitly presented facts.
 *
 * Order is deliberate: repository work is answered before the external
 * prerequisite, and the external prerequisite is answered before
 * authorization. An unmet external prerequisite never reads as a missing
 * decision, because the owner action differs.
 */
export function evaluateProductionStage(
  record: ProductionTrackStageRecord,
  facts: ProductionStageEvaluationFacts,
): ProductionStageStatusReport {
  const repositoryWorkRemaining = record.repositoryWork
    .filter((work) => work.state === 'REMAINING')
    .map((work) => work.item);
  let status: ProductionTrackStatus;
  if (!facts.repositoryWorkComplete) {
    status = 'REPOSITORY_WORK_REMAINING';
  } else if (!facts.externalPrerequisiteMet) {
    status = 'EXTERNAL_PREREQUISITE_UNMET';
  } else if (!facts.authorizationPresent) {
    status = 'AWAITING_AUTHORIZATION';
  } else {
    status = 'AUTHORIZED';
  }
  return Object.freeze({
    stage: record.stage,
    status,
    nextAction: NEXT_ACTION_BY_STATUS[status],
    repositoryWorkRemaining: Object.freeze(repositoryWorkRemaining),
    externalPrerequisite: record.externalPrerequisite,
    authorizationRequirement: record.authorizationRequirement,
    structuralBlocker: record.structuralBlocker,
  });
}

export type ProductionTrackFactsByStage = Readonly<Record<ProductionTrackStage, ProductionStageEvaluationFacts>>;

/**
 * The live facts recorded at this checkpoint. Everything external is unmet;
 * no stage carries authorization; C-13 remains structurally impossible while
 * the census says `POSITIVE_DEPLOYMENT_FACTS: 0`.
 */
export const PRODUCTION_TRACK_LIVE_FACTS: ProductionTrackFactsByStage = Object.freeze({
  'C-12': Object.freeze({ repositoryWorkComplete: true, externalPrerequisiteMet: false, authorizationPresent: false }),
  'C-13': Object.freeze({ repositoryWorkComplete: true, externalPrerequisiteMet: false, authorizationPresent: false }),
  'C-14': Object.freeze({ repositoryWorkComplete: false, externalPrerequisiteMet: false, authorizationPresent: false }),
  P4: Object.freeze({ repositoryWorkComplete: true, externalPrerequisiteMet: false, authorizationPresent: false }),
});

/** Evaluate every stage, preserving the canonical order. */
export function evaluateProductionTrack(
  factsByStage: ProductionTrackFactsByStage = PRODUCTION_TRACK_LIVE_FACTS,
): readonly ProductionStageStatusReport[] {
  return Object.freeze(PRODUCTION_TRACK_RECORDS.map((record) => evaluateProductionStage(record, factsByStage[record.stage])));
}

/**
 * `NOT_AUTHORIZED` is deliberately absent from the status vocabulary: an
 * external prerequisite is not a decision waiting to be taken. This helper
 * exists so a test can assert that absence structurally as well as by value.
 */
export function isAwaitingAuthorizationStatus(status: ProductionTrackStatus): boolean {
  return status === 'AWAITING_AUTHORIZATION';
}
