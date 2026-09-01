// ---------------------------------------------------------------------------
// Nightwatch C-01 — one shared population-completeness projection.
//
// Every consumer that reports "how many operations does Nightwatch know
// about" — the eligibility census, the read-only candidate census, the CLI
// source-gap output, and the Control Center — projects the SAME three facts
// through this module, so a truncated population can never be presented as a
// complete one in one surface and a complete one in another.
//
// Data-only: no filesystem, network, process, persistence, or runtime
// admission authority. Coverage may deny authority; it never grants it.
// ---------------------------------------------------------------------------

import {
  coverageStateForCompleteness,
  worstCompleteness,
  type R2CoverageState,
  type SourceCompletenessState,
} from './completeness';
import type { SourceInventoryCompleteness } from './scanTypes';
import type { SourceOperationProjectionCompleteness } from './surfaceTypes';

export const SOURCE_POPULATION_COMPLETENESS_VERSION = 'nightwatch.source-population-completeness.v1' as const;

/** Operation-projection facts. `total` is null exactly when it is unknowable;
 * it is never backfilled with `projected` to look tidy. */
export interface SourcePopulationOperationFacts {
  readonly state: SourceCompletenessState;
  readonly limit: number;
  readonly examined: number;
  readonly total: number | null;
  readonly projected: number;
  readonly dropped: number;
  readonly truncated: boolean;
  readonly remainingUnknown: boolean;
}

/** Repository/file ENUMERATION facts. Disjoint from content-read facts. */
export interface SourcePopulationEnumerationFacts {
  readonly state: SourceCompletenessState;
  readonly limit: number;
  readonly examinedFiles: number;
  readonly totalFiles: number | null;
  readonly droppedFiles: number | null;
  readonly remainingUnknown: boolean;
}

/** File-BODY read facts, measured over the enumerated set. A repository can be
 * fully enumerated here with only some bodies read; that is COMPLETE
 * enumeration with TRUNCATED content read, and the two never collapse. */
export interface SourcePopulationContentReadFacts {
  readonly state: SourceCompletenessState;
  readonly candidateFiles: number;
  readonly readFiles: number;
  readonly admittedFiles: number;
  readonly droppedFiles: number;
  readonly unreadableFiles: number;
}

export interface SourcePopulationCompleteness {
  readonly schemaVersion: typeof SOURCE_POPULATION_COMPLETENESS_VERSION;
  /** Conservative combination; COMPLETE only when every dimension is. */
  readonly state: SourceCompletenessState;
  /** R2 projection of `state`. Reporting only. */
  readonly coverageState: R2CoverageState;
  readonly operations: SourcePopulationOperationFacts;
  readonly enumeration: SourcePopulationEnumerationFacts;
  readonly contentRead: SourcePopulationContentReadFacts;
}

export function buildSourcePopulationCompleteness(input: {
  readonly operationCompleteness: SourceOperationProjectionCompleteness;
  readonly inventoryCompleteness: SourceInventoryCompleteness;
}): SourcePopulationCompleteness {
  const operation = input.operationCompleteness;
  const enumeration = input.inventoryCompleteness.enumeration;
  const contentRead = input.inventoryCompleteness.contentRead;
  const state = worstCompleteness(operation.state, enumeration.state, contentRead.state);
  return {
    schemaVersion: SOURCE_POPULATION_COMPLETENESS_VERSION,
    state,
    coverageState: coverageStateForCompleteness(state),
    operations: {
      state: operation.state,
      limit: operation.limit,
      examined: operation.examinedOperations,
      total: operation.totalOperations,
      projected: operation.projectedOperations,
      dropped: operation.droppedOperations,
      truncated: operation.truncated,
      remainingUnknown: operation.remainingUnknown,
    },
    enumeration: {
      state: enumeration.state,
      limit: enumeration.limit,
      examinedFiles: enumeration.examinedFiles,
      totalFiles: enumeration.totalFiles,
      droppedFiles: enumeration.droppedFiles,
      remainingUnknown: enumeration.remainingUnknown,
    },
    contentRead: {
      state: contentRead.state,
      candidateFiles: contentRead.candidateFiles,
      readFiles: contentRead.readFiles,
      admittedFiles: contentRead.admittedFiles,
      droppedFiles: contentRead.droppedFiles,
      unreadableFiles: contentRead.unreadableFiles,
    },
  };
}

/** Unmeasured population. Used by fallbacks and unavailable projections so an
 * absent measurement reports UNKNOWN/UNMEASURED rather than a zeroed COMPLETE. */
export function unmeasuredSourcePopulationCompleteness(limit: number): SourcePopulationCompleteness {
  return {
    schemaVersion: SOURCE_POPULATION_COMPLETENESS_VERSION,
    state: 'UNKNOWN',
    coverageState: 'UNMEASURED',
    operations: { state: 'UNKNOWN', limit, examined: 0, total: null, projected: 0, dropped: 0, truncated: false, remainingUnknown: true },
    enumeration: { state: 'UNKNOWN', limit: 0, examinedFiles: 0, totalFiles: null, droppedFiles: null, remainingUnknown: true },
    contentRead: { state: 'UNKNOWN', candidateFiles: 0, readFiles: 0, admittedFiles: 0, droppedFiles: 0, unreadableFiles: 0 },
  };
}
