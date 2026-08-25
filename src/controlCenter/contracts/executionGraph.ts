import type {
  ControlCenterExecutionState,
  ControlCenterProofState,
  SafeControlCenterCode,
  SafeControlCenterId,
  SafeControlCenterLabel,
} from './common';
import { CONTROL_CENTER_CONTRACT_NAMESPACE } from './common';

export const CONTROL_CENTER_EXECUTION_GRAPH_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.execution-graph.v1` as const;

export type ControlCenterExecutionNodeKind =
  | 'RUN'
  | 'BOOTSTRAP'
  | 'JOURNEY'
  | 'JOURNEY_STEP'
  | 'REQUEST'
  | 'RESPONSE'
  | 'ORACLE'
  | 'POLICY'
  | 'EVIDENCE_FINALIZATION'
  | 'TRIAGE'
  | 'FINDING';

export type ControlCenterExecutionEdgeKind =
  | 'CONTAINS'
  | 'PRECEDES'
  | 'EMITS'
  | 'EVALUATES'
  | 'BLOCKS'
  | 'PRODUCES';

export interface ControlCenterExecutionGraphNodeDto {
  readonly nodeId: SafeControlCenterId;
  readonly kind: ControlCenterExecutionNodeKind;
  readonly state: ControlCenterExecutionState;
  readonly label: SafeControlCenterLabel | null;
  readonly eventSeq: number | null;
  readonly reasonCode: SafeControlCenterCode | null;
}

export interface ControlCenterExecutionGraphEdgeDto {
  readonly edgeId: SafeControlCenterId;
  readonly fromNodeId: SafeControlCenterId;
  readonly toNodeId: SafeControlCenterId;
  readonly kind: ControlCenterExecutionEdgeKind;
  readonly proof: ControlCenterProofState;
  readonly eventSeq: number | null;
}

export interface ControlCenterExecutionGraphDto {
  readonly schemaVersion: typeof CONTROL_CENTER_EXECUTION_GRAPH_SCHEMA_VERSION;
  readonly runId: SafeControlCenterId;
  readonly nodes: readonly ControlCenterExecutionGraphNodeDto[];
  readonly edges: readonly ControlCenterExecutionGraphEdgeDto[];
  readonly nodeLimit: number;
  readonly edgeLimit: number;
  readonly truncated: boolean;
}
