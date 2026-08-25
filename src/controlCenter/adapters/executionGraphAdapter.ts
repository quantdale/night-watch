import type { RunEvent } from '../../core/evidence/types';
import {
  CONTROL_CENTER_LIMITS,
  asSafeControlCenterCode,
  asSafeControlCenterLabel,
  boundedInteger,
} from '../contracts/common';
import type {
  ControlCenterExecutionGraphDto,
  ControlCenterExecutionGraphEdgeDto,
  ControlCenterExecutionGraphNodeDto,
  ControlCenterExecutionNodeKind,
} from '../contracts/executionGraph';
import { CONTROL_CENTER_EXECUTION_GRAPH_SCHEMA_VERSION } from '../contracts/executionGraph';
import type { ControlCenterRunStatus } from '../contracts/runs';
import { publicIdentity, safePublicId } from './common';

export interface ExecutionGraphAuthorityInput {
  readonly runId: string;
  readonly status: ControlCenterRunStatus;
  readonly events: readonly RunEvent[];
}

function nodeKind(event: RunEvent): ControlCenterExecutionNodeKind {
  if (event.type === 'start') return 'BOOTSTRAP';
  if (event.type === 'end') return 'EVIDENCE_FINALIZATION';
  if (event.type === 'journey') return 'JOURNEY';
  if (event.type === 'journey-step') return 'JOURNEY_STEP';
  if (event.type === 'request') return 'REQUEST';
  if (event.type === 'response') return 'RESPONSE';
  if (event.type === 'oracle') return 'ORACLE';
  if (event.type === 'issue') return 'FINDING';
  if (event.type === 'policy') return 'POLICY';
  return 'EVIDENCE_FINALIZATION';
}

function runState(status: ControlCenterRunStatus): ControlCenterExecutionGraphNodeDto['state'] {
  if (status === 'PASSED') return 'PASSED';
  if (status === 'RUNNING' || status === 'PENDING') return status;
  if (status === 'BLOCKED') return 'BLOCKED';
  if (status === 'SAFETY_FAILURE' || status === 'FAILED') return 'FAILED';
  if (status === 'SKIPPED') return 'SKIPPED';
  if (status === 'ORACLE_ONLY') return 'WARNING';
  return 'INCOMPLETE';
}

function eventState(event: RunEvent): ControlCenterExecutionGraphNodeDto['state'] {
  if (event.type === 'policy') return 'BLOCKED';
  if (event.severity === 'fatal' || event.severity === 'error') return 'FAILED';
  if (event.severity === 'warn' || event.type === 'oracle' || event.type === 'issue') return 'WARNING';
  return 'PASSED';
}

function requestedLimit(value: unknown, fallback: number, maximum: number): number {
  return boundedInteger(value, 1, maximum) ?? fallback;
}

/** Build a deterministic, read-only lifecycle graph from typed run events. */
export function projectExecutionGraph(
  input: ExecutionGraphAuthorityInput,
  requestedNodeLimit?: unknown,
  requestedEdgeLimit?: unknown,
): ControlCenterExecutionGraphDto {
  const runId = safePublicId(input.runId, 'cc-run');
  const nodeLimit = requestedLimit(requestedNodeLimit, CONTROL_CENTER_LIMITS.defaultGraphNodes, CONTROL_CENTER_LIMITS.maxGraphNodes);
  const edgeLimit = requestedLimit(requestedEdgeLimit, CONTROL_CENTER_LIMITS.defaultGraphEdges, CONTROL_CENTER_LIMITS.maxGraphEdges);
  const rootNodeId = publicIdentity('cc-execution-node', { runId, kind: 'RUN' });
  const sortedEvents = [...input.events].sort((left, right) => left.seq - right.seq);
  const allEventNodes = sortedEvents.map((event) => {
    const kind = nodeKind(event);
    const nodeId = publicIdentity('cc-execution-node', { runId, seq: event.seq, type: event.type });
    const reasonCode = asSafeControlCenterCode(`EVENT_${event.type.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`);
    return {
      nodeId,
      kind,
      state: eventState(event),
      label: asSafeControlCenterLabel(kind),
      eventSeq: event.seq,
      reasonCode,
    } satisfies ControlCenterExecutionGraphNodeDto;
  });
  const nodes: readonly ControlCenterExecutionGraphNodeDto[] = [
    {
      nodeId: rootNodeId,
      kind: 'RUN',
      state: runState(input.status),
      label: asSafeControlCenterLabel('RUN'),
      eventSeq: null,
      reasonCode: null,
    },
    ...allEventNodes.slice(0, Math.max(0, nodeLimit - 1)),
  ];
  const nodeSet = new Set(nodes.map((node) => node.nodeId));
  const eventNodes = allEventNodes.filter((node) => nodeSet.has(node.nodeId));
  const allEdges: ControlCenterExecutionGraphEdgeDto[] = [];
  for (const node of eventNodes) {
    allEdges.push({
      edgeId: publicIdentity('cc-execution-edge', { from: rootNodeId, to: node.nodeId, kind: 'CONTAINS' }),
      fromNodeId: rootNodeId,
      toNodeId: node.nodeId,
      kind: 'CONTAINS',
      proof: 'PROVEN',
      eventSeq: node.eventSeq,
    });
  }
  for (let index = 1; index < eventNodes.length; index += 1) {
    const previous = eventNodes[index - 1];
    const current = eventNodes[index];
    if (previous === undefined || current === undefined) continue;
    allEdges.push({
      edgeId: publicIdentity('cc-execution-edge', { from: previous.nodeId, to: current.nodeId, kind: 'PRECEDES' }),
      fromNodeId: previous.nodeId,
      toNodeId: current.nodeId,
      kind: 'PRECEDES',
      proof: 'PROVEN',
      eventSeq: current.eventSeq,
    });
  }
  const edges = allEdges.slice(0, edgeLimit);
  return {
    schemaVersion: CONTROL_CENTER_EXECUTION_GRAPH_SCHEMA_VERSION,
    runId,
    nodes,
    edges,
    nodeLimit,
    edgeLimit,
    truncated: nodes.length < allEventNodes.length + 1 || edges.length < allEdges.length,
  };
}
