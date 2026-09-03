// C-15c — the System Map V2 transport contract.
//
// C-15b built the model, the bounded L1-L4 projections, the deterministic
// content-addressed layout and the eight operator queries, and proved them in
// core — but left them unreachable: the Control Center exposed none of it and
// the UI still consumed the v1 source-graph path. C-15b's own report named
// that as the remaining work. This contract is the closure.
//
// The version is EXPLICIT. These endpoints live under `/api/v2/`, and the v1
// source-graph contract is untouched, because silently reinterpreting v1 would
// leave a client unable to tell which shape it received.
//
// Everything the projection knows about its own bounds crosses the wire:
// limit, total, projected, dropped, truncated and remainingUnknown. The UI can
// then distinguish "402 dropped" from "remainder unknown", which are different
// facts and which a single `truncated: boolean` could never separate — the
// defect C-01 fixed for operations and the graph never received.

import type { CoverageState, EvidenceStatus, FactCategory } from '../../core/systemMap/model';
import type { DisclosureLevel, MeasurementState, OperatorQuery } from '../../core/systemMap/projections';
import { CONTROL_CENTER_CONTRACT_NAMESPACE } from './common';

export const CONTROL_CENTER_SYSTEM_MAP_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.system-map.v2` as const;

/** Bounds, transported whole. A boolean alone cannot say how much was lost. */
export interface ControlCenterProjectionBoundDto {
  readonly limit: number;
  /** Null when the true total is unknowable, never a fabricated zero. */
  readonly total: number | null;
  readonly projected: number;
  /** Null when the total is unknown, because a drop count needs a total. */
  readonly dropped: number | null;
  readonly truncated: boolean;
  readonly remainingUnknown: boolean;
}

export interface ControlCenterSystemMapNodeDto {
  readonly nodeId: string;
  readonly kind: string;
  readonly label: string;
  /** Exactly one fact category per node. */
  readonly factCategory: FactCategory;
  readonly evidenceStatus: EvidenceStatus;
  readonly coverageState: CoverageState;
  /** Server-computed position. The UI does not re-derive a semantic layout. */
  readonly x: number;
  readonly y: number;
  readonly layer: number;
}

export interface ControlCenterSystemMapEdgeDto {
  readonly edgeId: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly kind: string;
  /** Exactly one fact category per edge; an INFERENCE never reads as a fact. */
  readonly factCategory: FactCategory;
  readonly evidenceStatus: EvidenceStatus;
}

/** Layout identity, so a client can tell one layout from another exactly. */
export interface ControlCenterLayoutIdentityDto {
  readonly engineId: string;
  readonly engineVersion: string;
  readonly graphDigest: string;
  readonly layoutDigest: string;
  readonly projectionVersion: string;
}

export interface ControlCenterSystemMapDto {
  readonly schemaVersion: typeof CONTROL_CENTER_SYSTEM_MAP_SCHEMA_VERSION;
  readonly level: DisclosureLevel;
  /** The focus id for L2-L4; null at L1, which has no parent. */
  readonly focusId: string | null;
  readonly nodes: readonly ControlCenterSystemMapNodeDto[];
  readonly edges: readonly ControlCenterSystemMapEdgeDto[];
  readonly nodeBound: ControlCenterProjectionBoundDto;
  readonly edgeBound: ControlCenterProjectionBoundDto;
  readonly layout: ControlCenterLayoutIdentityDto;
  /** Restated on the wire: this transport is read-only. */
  readonly executionAuthority: 'NONE';
  readonly mutationAuthority: 'NONE';
}

export interface ControlCenterSystemMapQueryDto extends ControlCenterSystemMapDto {
  readonly query: OperatorQuery;
  /**
   * Whether a zero-row answer means "we looked and found none" or "we never
   * looked". `OBSERVED_PRODUCTION_PATHS` is permanently the second until C-12
   * runs, and conflating them would let an empty map read as a clean bill of
   * health.
   */
  readonly measurement: MeasurementState;
  /** Present only for WHY_UNPROVEN, whose value is the blocking chain. */
  readonly blockingChain?: readonly { readonly stage: string; readonly reason: string | null }[];
}
