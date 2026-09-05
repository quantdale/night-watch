import type { SafeControlCenterCursor, SafeControlCenterId } from '../contracts/common';
import type { ControlCenterMetaDto } from '../contracts/meta';
import type { ControlCenterHealthDto } from '../contracts/health';
import type { ControlCenterReadinessDto } from '../contracts/readiness';
import type { ControlCenterSafetyDto } from '../contracts/safety';
import type { ControlCenterRunDetailDto, ControlCenterRunListDto, ControlCenterTimelineDto } from '../contracts/runs';
import type { ControlCenterExecutionGraphDto } from '../contracts/executionGraph';
import type { ControlCenterCampaignCoverageDto, ControlCenterCampaignSummaryDto } from '../contracts/campaign';
import type { ControlCenterSourceGraphDto, ControlCenterSourceSummaryDto, ControlCenterSourceSurfacesDto } from '../contracts/sourceGraph';
import type { ControlCenterFindingsDto } from '../contracts/findings';
import type { ControlCenterReviewerDto } from '../contracts/reviewer';
import type { ControlCenterReviewFilingDto, ControlCenterReviewHistoryDto, ControlCenterReviewStoreDto } from '../contracts/reviewStore';
import type { ControlCenterSystemMapDto, ControlCenterSystemMapQueryDto } from '../contracts/systemMap';
import type { SystemMapLevelSegment, SystemMapQuerySegment } from './router';

export type MaybePromise<T> = T | Promise<T>;

export interface ControlCenterListQuery {
  readonly limit: number;
  readonly cursor: SafeControlCenterCursor | null;
}

export interface ControlCenterReviewStoreQuery {
  readonly limit: number;
  readonly offset: number;
}

export interface ControlCenterSourceSurfaceQuery extends ControlCenterListQuery {
  readonly repositoryId: SafeControlCenterId | null;
}

export interface ControlCenterCollector {
  health(): MaybePromise<ControlCenterHealthDto>;
  meta(): MaybePromise<ControlCenterMetaDto>;
  readiness(): MaybePromise<ControlCenterReadinessDto>;
  safety(): MaybePromise<ControlCenterSafetyDto>;
  runs(query: ControlCenterListQuery): MaybePromise<ControlCenterRunListDto>;
  run(runId: SafeControlCenterId): MaybePromise<ControlCenterRunDetailDto | null>;
  timeline(runId: SafeControlCenterId, afterSeq: number, limit: number): MaybePromise<ControlCenterTimelineDto | null>;
  executionGraph(runId: SafeControlCenterId): MaybePromise<ControlCenterExecutionGraphDto | null>;
  campaignSummary(): MaybePromise<ControlCenterCampaignSummaryDto>;
  campaignCoverage(query: ControlCenterListQuery): MaybePromise<ControlCenterCampaignCoverageDto>;
  sourceSummary(): MaybePromise<ControlCenterSourceSummaryDto>;
  sourceSurfaces(query: ControlCenterSourceSurfaceQuery): MaybePromise<ControlCenterSourceSurfacesDto>;
  sourceGraph(surfaceId: SafeControlCenterId | null, depth: number): MaybePromise<ControlCenterSourceGraphDto | null>;
  findings(query: ControlCenterListQuery): MaybePromise<ControlCenterFindingsDto>;
  /** The reviewer surface over the finding-intelligence and review cones. */
  reviewer(query: ControlCenterListQuery): MaybePromise<ControlCenterReviewerDto>;
  /**
   * Read-only review-store operations. The store is intentionally never
   * pruned, so these exist to make growth observable; none of them can
   * change it.
   */
  reviewStoreInventory(query: ControlCenterReviewStoreQuery): MaybePromise<ControlCenterReviewStoreDto>;
  /** Null means the finding is not in the current snapshot — never an empty history. */
  reviewStoreHistory(findingId: SafeControlCenterId, query: ControlCenterReviewStoreQuery): MaybePromise<ControlCenterReviewHistoryDto | null>;
  reviewStoreFiling(findingId: SafeControlCenterId): MaybePromise<ControlCenterReviewFilingDto | null>;
  /** C-15c. Null means the focus is missing, unknown, or supplied where the
   *  level does not accept one — never a silently empty map. */
  systemMapLevel(level: SystemMapLevelSegment, focusId: string | null): MaybePromise<ControlCenterSystemMapDto | null>;
  systemMapQuery(query: SystemMapQuerySegment, focusId: string | null): MaybePromise<ControlCenterSystemMapQueryDto | null>;
}
