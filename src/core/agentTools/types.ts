// ---------------------------------------------------------------------------
// Lane C — Safe Agent Tool Protocol: public types.
//
// Protocol types live in src/core/agentProtocol/ and are imported here, never
// forked. This module adds only the execution-layer shapes: the validated
// CALL_TOOL intent view, the fixture-injected execution context, and the
// mutation-free result envelope.
// ---------------------------------------------------------------------------

import type { AgentToolEnvironment, AgentToolId } from '../agentProtocol/tools';
import type { UntrustedEnvelope } from '../agentProtocol/untrusted';
import type { SystemMapInput } from '../systemMap/projections';
import type { StaticLexicalLanguage } from '../source/lexical';

/** Minimal validated CALL_TOOL intent view. The runtime accepts the tool id
 * only from this field — never from `arguments` (see runtime.ts). */
export interface AgentToolCallIntent {
  readonly kind: 'CALL_TOOL';
  readonly toolId: string;
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly argumentDigest?: string;
}

export interface SourceSurfaceFixture {
  readonly path: string;
  readonly language: StaticLexicalLanguage;
  readonly text: string;
}

/**
 * Caller-supplied synthetic data. Adapters never touch the filesystem,
 * network, or child processes: without a fixture they fail closed with
 * ADAPTER_UNAVAILABLE instead of inventing an answer.
 */
export interface AgentToolFixtures {
  readonly sourceSurfaces?: readonly SourceSurfaceFixture[];
  readonly systemMap?: SystemMapInput;
  readonly evidenceStore?: Readonly<Record<string, unknown>>;
  readonly oracleAnswers?: Readonly<Record<string, unknown>>;
}

export interface AgentToolExecutionContext {
  /** Programme authorization: LOCAL only in this wave; DEV is not granted. */
  readonly authorizedEnvironments: readonly AgentToolEnvironment[];
  readonly fixtures?: AgentToolFixtures;
}

export type AgentToolFailureClass =
  | 'UNKNOWN_TOOL'
  | 'UNAUTHORIZED_ENVIRONMENT'
  | 'UNSAFE_INTENT'
  | 'MALFORMED_ARGUMENTS'
  | 'ADAPTER_UNAVAILABLE';

export interface AgentToolSuccess {
  readonly ok: true;
  readonly toolId: AgentToolId;
  /** Invariant: every execution is read-only. */
  readonly mutationCapability: 'NONE';
  readonly envelopes: readonly UntrustedEnvelope[];
  readonly evidenceRefs: readonly string[];
  readonly data: unknown;
  /** True when argument bytes looked like prompt injection. The tool id is
   * never changed in response — this flag only records the observation. */
  readonly injectionDetected: boolean;
}

export interface AgentToolFailure {
  readonly ok: false;
  readonly toolId: string | null;
  readonly class: AgentToolFailureClass;
  readonly reason: string;
  /** Invariant: failures mutate nothing either. */
  readonly mutationCapability: 'NONE';
  readonly evidenceRefs: readonly [];
  readonly injectionDetected: boolean;
}

export type AgentToolResult = AgentToolSuccess | AgentToolFailure;
