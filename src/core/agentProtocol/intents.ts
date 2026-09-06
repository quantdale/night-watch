// ---------------------------------------------------------------------------
// Typed autonomous intents. The reasoner emits these; Nightwatch executes
// only after protocol validation. Unknown and unsafe intents fail closed.
// Pure data.
// ---------------------------------------------------------------------------

export const AGENT_INTENT_KINDS = [
  'CALL_TOOL',
  'FORM_HYPOTHESIS',
  'PROPOSE_CANDIDATE',
  'REJECT_CANDIDATE',
  'REPLAN',
  'PAUSE',
  'CANCEL',
  'TERMINATE',
] as const;
export type AgentIntentKind = (typeof AGENT_INTENT_KINDS)[number];

/** Privileged actions the reasoner must never receive or emit as executable. */
export const UNSAFE_INTENT_KINDS = [
  'SHELL',
  'GIT_MUTATION',
  'RAW_PLAYWRIGHT',
  'RAW_NETWORK',
  'CREDENTIAL_ACCESS',
  'FILESYSTEM_WRITE',
  'PRODUCTION_CONTACT',
  'SLACK',
  'LESLIE',
  'PONDR',
  'NOTION',
  'EXTERNAL_PUBLICATION',
] as const;
export type UnsafeIntentKind = (typeof UNSAFE_INTENT_KINDS)[number];

export const AGENT_TERMINATION_REASONS = [
  'COMPLETE_WITH_FINDING',
  'COMPLETE_NO_FINDING',
  'BUDGET_EXHAUSTED',
  'CANCELLED',
  'PAUSED',
  'SAFETY_BLOCKED',
  'NO_PROGRESS',
  'REASONER_FAILURE',
] as const;
export type AgentTerminationReason = (typeof AGENT_TERMINATION_REASONS)[number];

export interface CallToolIntent {
  readonly kind: 'CALL_TOOL';
  readonly toolId: string;
  readonly argumentDigest: string;
  readonly arguments: Readonly<Record<string, unknown>>;
}

export interface FormHypothesisIntent {
  readonly kind: 'FORM_HYPOTHESIS';
  readonly hypothesisId: string;
  readonly statement: string;
  readonly evidenceRefs: readonly string[];
}

export interface ProposeCandidateIntent {
  readonly kind: 'PROPOSE_CANDIDATE';
  readonly candidateId: string;
  readonly evidenceRefs: readonly string[];
}

export interface RejectCandidateIntent {
  readonly kind: 'REJECT_CANDIDATE';
  readonly candidateId: string;
  readonly reasonCode: string;
}

export interface ReplanIntent {
  readonly kind: 'REPLAN';
  readonly reasonCode: string;
}

export interface PauseIntent {
  readonly kind: 'PAUSE';
}

export interface CancelIntent {
  readonly kind: 'CANCEL';
}

export interface TerminateIntent {
  readonly kind: 'TERMINATE';
  readonly reason: AgentTerminationReason;
}

export type AgentIntent =
  | CallToolIntent
  | FormHypothesisIntent
  | ProposeCandidateIntent
  | RejectCandidateIntent
  | ReplanIntent
  | PauseIntent
  | CancelIntent
  | TerminateIntent;

export function isAgentIntentKind(value: unknown): value is AgentIntentKind {
  return typeof value === 'string' && (AGENT_INTENT_KINDS as readonly string[]).includes(value);
}

export function isUnsafeIntentKind(value: unknown): value is UnsafeIntentKind {
  return typeof value === 'string' && (UNSAFE_INTENT_KINDS as readonly string[]).includes(value);
}
