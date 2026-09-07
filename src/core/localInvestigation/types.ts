import type { AgentToolId } from '../agentProtocol/tools';
import type { UntrustedSource } from '../agentProtocol/untrusted';
import type { AgentToolExecutor } from '../agentRuntime/types';
import type { BugAtlasStore } from '../bugAtlas/store';
import type { SourceScanLanguage } from '../source/scanTypes';
import type { SystemAtlasOverlay } from '../systemAtlas/overlay';
import type { SystemMapInput } from '../systemMap/projections';

export const LOCAL_INVESTIGATION_CONTEXT_VERSION = 'nightwatch.local-investigation-context.v1' as const;
export const LOCAL_INVESTIGATION_HISTORY_VERSION = 'nightwatch.local-investigation-history.v1' as const;
export const LOCAL_REPRODUCTION_RECEIPT_VERSION = 'nightwatch.local-reproduction-receipt.v1' as const;

export type LocalInvestigationDataClass = 'REAL_LOCAL' | 'REAL_HISTORICAL' | 'SYNTHETIC_TEST';
export type LocalProviderBlockClass = 'NOT_CONFIGURED' | 'DATA_BLOCKED' | 'SOURCE_UNAVAILABLE' | 'SOURCE_STALE' | 'UNSAFE_INPUT';

export type LocalProviderResult<T> =
  | { readonly status: 'AVAILABLE'; readonly value: T }
  | { readonly status: 'BLOCKED'; readonly class: LocalProviderBlockClass; readonly reason: string };

export interface LocalSourceIndexEntry {
  /** Provider-unique approved path used verbatim for a later read. */
  readonly path: string;
  readonly repository: string;
  readonly relativePath: string;
  readonly sourceSha: string;
  readonly language: SourceScanLanguage;
  readonly byteCount: number;
  readonly contentDigest: string;
}

export interface LocalSourceIndex {
  readonly entries: readonly LocalSourceIndexEntry[];
  readonly total: number | null;
  readonly truncated: boolean;
}

export interface LocalSourceDocument extends LocalSourceIndexEntry {
  /** Bounded source text. It remains untrusted and is sanitized by the tool session. */
  readonly text: string;
}

export interface LocalSourceProvider {
  readonly providerId: string;
  index(): Promise<LocalProviderResult<LocalSourceIndex>>;
  read(path: string): Promise<LocalProviderResult<LocalSourceDocument>>;
}

export interface LocalSystemMapProvider {
  readonly providerId: string;
  load(): Promise<LocalProviderResult<SystemMapInput>>;
}

export interface LocalBugAtlasProvider {
  readonly providerId: string;
  load(): Promise<LocalProviderResult<BugAtlasStore>>;
}

export interface LocalSystemAtlasProvider {
  readonly providerId: string;
  load(): Promise<LocalProviderResult<SystemAtlasOverlay>>;
}

export interface LocalEvidenceRecord {
  readonly evidenceRef: string;
  readonly source: UntrustedSource;
  readonly record: unknown;
}

export interface LocalEvidenceProvider {
  readonly providerId: string;
  get(evidenceRef: string): Promise<LocalProviderResult<LocalEvidenceRecord>>;
}

export type LocalReproductionVerdict = 'REPRODUCED' | 'NOT_REPRODUCED' | 'ENVIRONMENT_BLOCKED' | 'NOT_AVAILABLE';
export type LocalReproductionSignal = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_RUN';

export interface LocalReproductionRequest {
  readonly reproductionId: string;
  readonly candidateId: string | null;
  readonly sourcePath: string;
  readonly sourceEvidenceRef: string;
  readonly observedEvidenceRefs: readonly string[];
}

export interface LocalReproductionProviderResult {
  readonly verdict: LocalReproductionVerdict;
  /** Fixed-template, sanitized observation safe for the reasoner. */
  readonly reasonerVisible: unknown;
  /** Minted by the provider only for a mechanically executed result. */
  readonly evidenceRef: string | null;
  readonly provenanceRefs: readonly string[];
  readonly preFix: LocalReproductionSignal;
  readonly postFix: LocalReproductionSignal;
  /** Harness-side only. Tool sessions must never place this value in reasoner traffic. */
  readonly audit: unknown;
}

export interface DeterministicReproductionProvider {
  readonly providerId: string;
  run(request: LocalReproductionRequest): Promise<LocalProviderResult<LocalReproductionProviderResult>>;
}

export interface LocalInvestigationContext {
  readonly schemaVersion: typeof LOCAL_INVESTIGATION_CONTEXT_VERSION;
  readonly dataClass: LocalInvestigationDataClass;
  readonly source: LocalSourceProvider;
  readonly systemMap: LocalSystemMapProvider;
  readonly bugAtlas: LocalBugAtlasProvider;
  readonly systemAtlas: LocalSystemAtlasProvider;
  readonly evidence: LocalEvidenceProvider;
  readonly reproduction: DeterministicReproductionProvider;
}

export interface LocalObservedEvidence {
  readonly evidenceRef: string;
  readonly toolId: AgentToolId;
  readonly source: UntrustedSource;
}

export interface LocalSourceObservation {
  readonly path: string;
  readonly evidenceRef: string;
}

export interface LocalReproductionReceipt {
  readonly schemaVersion: typeof LOCAL_REPRODUCTION_RECEIPT_VERSION;
  readonly providerId: string;
  readonly reproductionId: string;
  readonly candidateId: string | null;
  readonly sourcePath: string;
  readonly sourceEvidenceRef: string;
  readonly evidenceRef: string | null;
  readonly verdict: LocalReproductionVerdict;
  readonly preFix: LocalReproductionSignal;
  readonly postFix: LocalReproductionSignal;
  readonly provenanceRefs: readonly string[];
}

export interface LocalFindingProposal {
  readonly candidateId: string;
  readonly evidenceRefs: readonly string[];
  readonly draft: Readonly<Record<string, unknown>> | null;
}

export interface LocalInvestigationHistory {
  readonly schemaVersion: typeof LOCAL_INVESTIGATION_HISTORY_VERSION;
  readonly observedEvidence: readonly LocalObservedEvidence[];
  readonly inspectedSources: readonly LocalSourceObservation[];
  readonly reproductions: readonly LocalReproductionReceipt[];
  readonly findingProposals: readonly LocalFindingProposal[];
}

/** One stateful tool session per investigation. History is harness-only. */
export interface LocalInvestigationToolSession {
  readonly executor: AgentToolExecutor;
  snapshot(): LocalInvestigationHistory;
}
