// ---------------------------------------------------------------------------
// Provider-neutral ReasonerDriver contract. Lane B implements CLI transport.
// This module never spawns a process. Pure types + constants.
// ---------------------------------------------------------------------------

import type { AgentIntent, AgentIntentKind } from './intents';
import type { AgentBudgetSnapshot, AgentPhase } from './runtime';
import type { UntrustedEnvelope } from './untrusted';
import {
  REASONER_DRIVER_VERSION,
  REASONER_TURN_REQUEST_VERSION,
  REASONER_TURN_RESPONSE_VERSION,
} from './versions';

export { REASONER_DRIVER_VERSION, REASONER_TURN_REQUEST_VERSION, REASONER_TURN_RESPONSE_VERSION };

export const REASONER_TRANSPORTS = ['CLI'] as const;
export type ReasonerTransport = (typeof REASONER_TRANSPORTS)[number];

export const REASONER_FAILURE_CLASSES = [
  'MALFORMED_OUTPUT',
  'GARBAGE_OUTPUT',
  'OVERSIZE_OUTPUT',
  'PARTIAL_OUTPUT',
  'TIMEOUT',
  'CLI_CRASH',
  'NONZERO_EXIT',
  'HUNG_CHILD',
  'HUNG_GRANDCHILD',
  'SECRET_ECHO',
  'UNKNOWN_INTENT',
  'UNSAFE_INTENT',
  'UNKNOWN_TOOL',
  'UNAUTHORIZED_ENVIRONMENT',
  'PROVIDER_FAILURE',
  'CANCELLED',
] as const;
export type ReasonerFailureClass = (typeof REASONER_FAILURE_CLASSES)[number];

export const REASONER_STDOUT_BYTE_CAP = 1_048_576 as const;
export const REASONER_STDERR_BYTE_CAP = 262_144 as const;
export const REASONER_MAX_INTENTS_PER_TURN = 8 as const;
export const REASONER_MAX_HYPOTHESES_PER_TURN = 8 as const;
export const REASONER_DEFAULT_TIMEOUT_MS = 120_000 as const;

export interface ReasonerProvenance {
  readonly transport: ReasonerTransport;
  readonly executableBasename: string;
  readonly provider: string;
  readonly model: string;
}

export interface ReasonerObservation {
  readonly phase: AgentPhase;
  readonly untrusted: readonly UntrustedEnvelope[];
  readonly evidenceRefs: readonly string[];
  readonly allowedToolIds: readonly string[];
  readonly allowedIntentKinds: readonly AgentIntentKind[];
}

export interface ReasonerTurnRequest {
  readonly schemaVersion: typeof REASONER_TURN_REQUEST_VERSION;
  readonly campaignId: string;
  readonly turnId: string;
  readonly observation: ReasonerObservation;
  readonly budgetRemaining: AgentBudgetSnapshot;
}

export interface ReasonerHypothesisDraft {
  readonly hypothesisId: string;
  readonly statement: string;
  readonly evidenceRefs: readonly string[];
}

export interface ReasonerTurnResponse {
  readonly schemaVersion: typeof REASONER_TURN_RESPONSE_VERSION;
  readonly intents: readonly AgentIntent[];
  readonly hypotheses: readonly ReasonerHypothesisDraft[];
}

export interface ReasonerCallOptions {
  readonly timeoutMs: number;
  readonly stdoutByteCap: number;
  readonly stderrByteCap: number;
  readonly signal: AbortSignal;
}

export type ReasonerCallResult =
  | {
      readonly ok: true;
      readonly response: ReasonerTurnResponse;
      readonly provenance: ReasonerProvenance;
      readonly stdoutBytes: number;
      readonly stderrBytes: number;
    }
  | {
      readonly ok: false;
      readonly class: ReasonerFailureClass;
      readonly provenance: ReasonerProvenance | null;
      readonly stdoutBytes: number;
      readonly stderrBytes: number;
    };

export interface ReasonerDriver {
  readonly protocolVersion: typeof REASONER_DRIVER_VERSION;
  readonly transport: ReasonerTransport;
  readonly provenance: ReasonerProvenance;
  complete(request: ReasonerTurnRequest, options: ReasonerCallOptions): Promise<ReasonerCallResult>;
}
