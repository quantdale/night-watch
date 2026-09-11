// ---------------------------------------------------------------------------
// Production track — shared types.
//
// The C-12 → C-13 → C-14 → P4 path interleaves repository work with external
// decisions. These types keep the two SEPARATE so a reader can tell whether a
// stage is waiting on code or on a person, and so the status vocabulary can
// never collapse `EXTERNAL_PREREQUISITE_UNMET` into `AWAITING_AUTHORIZATION`
// (the two send an owner to different actions).
//
// Pure data: no I/O, no clock, no environment contact.
// ---------------------------------------------------------------------------

export const PRODUCTION_TRACK_VERSION = 'nightwatch.production-track.v1' as const;

export const PRODUCTION_TRACK_STAGES = ['C-12', 'C-13', 'C-14', 'P4'] as const;
export type ProductionTrackStage = (typeof PRODUCTION_TRACK_STAGES)[number];

export const PRODUCTION_TRACK_STATUSES = [
  /** Repository work is not finished; authorization would be premature. */
  'REPOSITORY_WORK_REMAINING',
  /** Someone other than an agent must satisfy a named prerequisite first. */
  'EXTERNAL_PREREQUISITE_UNMET',
  /** Repository work complete, external prerequisite met, authorization absent. */
  'AWAITING_AUTHORIZATION',
  'AUTHORIZED',
] as const;
export type ProductionTrackStatus = (typeof PRODUCTION_TRACK_STATUSES)[number];

export type ProductionTrackNextAction =
  | 'COMPLETE_REPOSITORY_WORK'
  | 'SATISFY_EXTERNAL_PREREQUISITE'
  | 'OBTAIN_STAGE_AUTHORIZATION'
  | 'EXECUTE_WITHIN_AUTHORIZED_SCOPE';

export interface ProductionStageRepositoryWork {
  readonly item: string;
  readonly state: 'COMPLETE' | 'REMAINING';
}

export interface ProductionTrackStageRecord {
  readonly stage: ProductionTrackStage;
  readonly title: string;
  readonly phase: 'P1' | 'P2' | 'P3' | 'P4';
  readonly repositoryWork: readonly ProductionStageRepositoryWork[];
  /** The prerequisite someone other than an agent must satisfy. Null when none. */
  readonly externalPrerequisite: string | null;
  /** The authorization a stage still needs after the external prerequisite. */
  readonly authorizationRequirement: string | null;
  /** A measured fact that makes the stage structurally impossible regardless. */
  readonly structuralBlocker: string | null;
  readonly acceptanceCriteria: readonly string[];
  readonly scope: 'NIGHTWATCH' | 'OUTSIDE_NIGHTWATCH_SCOPE';
}

export interface ProductionStageEvaluationFacts {
  readonly repositoryWorkComplete: boolean;
  readonly externalPrerequisiteMet: boolean;
  readonly authorizationPresent: boolean;
}

export interface ProductionStageStatusReport {
  readonly stage: ProductionTrackStage;
  readonly status: ProductionTrackStatus;
  readonly nextAction: ProductionTrackNextAction;
  readonly repositoryWorkRemaining: readonly string[];
  readonly externalPrerequisite: string | null;
  readonly authorizationRequirement: string | null;
  readonly structuralBlocker: string | null;
}
