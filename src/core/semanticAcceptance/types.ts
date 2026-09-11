// ---------------------------------------------------------------------------
// Nightwatch group 11 — semantic acceptance class as data (F-10).
//
// The semantic layer's own self-description is versioned data, not prose:
// `COMPLETE_LOCAL_SYNTHETIC` with contained DEV result `NOT_PROVEN` and the
// blocker that keeps the distinction visible on every surface that presents
// the capability. The DEV acceptance assertions refuse evidence that is not
// classified `CONTAINED_DEV`, so a local synthetic pass can never satisfy one.
//
// The owner decision (task 11.3) stays open: both the unblock path and the
// permanent-closure path are recorded with their consequences, and the
// unblock path fails its own check when any required artefact is missing.
// This module performs NO network, NO fs, NO child processes, NO persistence.
// ---------------------------------------------------------------------------

export const SEMANTIC_ACCEPTANCE_CLASS_SCHEMA = 'nightwatch.semantic-acceptance-class.v1' as const;
export const SEMANTIC_ACCEPTANCE_CAPABILITY = 'PHASE_9_SEMANTIC_ORACLES' as const;

export type SemanticCapabilityAcceptanceClass =
  | 'COMPLETE_LOCAL_SYNTHETIC'
  | 'DEV_ACCEPTED'
  | 'CLOSED_SYNTHETIC_ONLY';

export const SEMANTIC_CAPABILITY_ACCEPTANCE_CLASSES: readonly SemanticCapabilityAcceptanceClass[] = [
  'COMPLETE_LOCAL_SYNTHETIC',
  'DEV_ACCEPTED',
  'CLOSED_SYNTHETIC_ONLY',
];

export type SemanticDevAcceptanceResult = 'NOT_PROVEN' | 'PROVEN' | 'NOT_PURSUED';

export const SEMANTIC_DEV_ACCEPTANCE_RESULTS: readonly SemanticDevAcceptanceResult[] = [
  'NOT_PROVEN',
  'PROVEN',
  'NOT_PURSUED',
];

export interface SemanticAcceptanceUnblockPath {
  readonly label: 'UNBLOCK_PHASE_9B_10B';
  /** The exact DEV authentication artefact and where it is obtained. */
  readonly authArtefact: string;
  /** The one-shot owner authorization class. */
  readonly authorizationClass: string;
  /** The containment envelope the acceptance runs under. */
  readonly containmentEnvelope: string;
  /** The bounded approved read-only target set. */
  readonly targetSet: string;
  /** The acceptance criteria the run must meet. */
  readonly acceptanceCriteria: string;
  /** The evidence the run would produce. */
  readonly expectedEvidence: string;
}

export interface SemanticAcceptancePermanentClosurePath {
  readonly label: 'CLOSE_PHASE_9B_10B_PERMANENTLY';
  readonly terminalStatus: string;
  readonly reason: string;
  readonly acceptanceClassAfterClosure: 'CLOSED_SYNTHETIC_ONLY';
  readonly consequence: string;
}

export interface SemanticAcceptanceOwnerDecision {
  readonly taskId: '11.3';
  readonly state: 'PENDING_OWNER_DECISION' | 'DECIDED';
  readonly unblockPath: SemanticAcceptanceUnblockPath;
  readonly permanentClosurePath: SemanticAcceptancePermanentClosurePath;
  readonly consequences: readonly string[];
}

export interface SemanticAcceptanceStatus {
  readonly schemaVersion: typeof SEMANTIC_ACCEPTANCE_CLASS_SCHEMA;
  readonly capability: typeof SEMANTIC_ACCEPTANCE_CAPABILITY;
  readonly acceptanceClass: SemanticCapabilityAcceptanceClass;
  readonly devResult: SemanticDevAcceptanceResult;
  /** Null only for a permanently closed synthetic-only capability. */
  readonly blocker: string | null;
  readonly blockerSince: string | null;
  readonly syntheticOnly: boolean;
  readonly ownerDecision: SemanticAcceptanceOwnerDecision;
}

export const SEMANTIC_ACCEPTANCE_STATUS_TAGS = Object.freeze({
  acceptanceClass: 'SEMANTIC_ACCEPTANCE_CLASS',
  devResult: 'SEMANTIC_DEV_RESULT',
  blocker: 'SEMANTIC_DEV_BLOCKER',
} as const);
