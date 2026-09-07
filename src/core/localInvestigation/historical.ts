// ---------------------------------------------------------------------------
// W7 replay lane: historical pre-fix adapters over the frozen provider
// contract. No privileged filesystem, Git, network, or secret authority.
// Visible source serves only leak-isolated pre-fix blobs; reproduction
// closes over hidden replay coordinates and the existing contained engine,
// returning neutral reasoner-visible verdicts while retaining hidden audit
// harness-side. Never hard-codes a single historical case.
// ---------------------------------------------------------------------------

import type { ReasonerVisibleContext } from '../agentProtocol/benchmark';
import type { SourceScanLanguage } from '../source/scanTypes';
import { sourceContentDigest } from '../source/scanTypes';
import { DEFAULT_SIBLING_ROOT } from '../source/siblingSource';
import { parsePreFixSnapshotFiles } from '../benchmark/preFixSource';
import { resolveMinedRepoPath } from '../benchmark/minedCases';
import {
  MINED_TEST_REPLAY_VERSION,
  runContainedTestReplay,
  type ContainedTestReplayRequest,
  type ContainedTestReplayResult,
  type MinedTestReplayDescriptor,
  type PackageSignal,
} from '../benchmark/containedTestReplay';
import { runVisibleDiscriminator, type VisibleDiscriminator } from '../benchmark/visibleRepro';
import {
  LOCAL_INVESTIGATION_CONTEXT_VERSION,
  type DeterministicReproductionProvider,
  type LocalInvestigationContext,
  type LocalProviderResult,
  type LocalReproductionProviderResult,
  type LocalReproductionSignal,
  type LocalSourceDocument,
  type LocalSourceIndex,
  type LocalSourceIndexEntry,
  type LocalSourceProvider,
} from './types';

export const HISTORICAL_SOURCE_PROVIDER_ID = 'nightwatch.historical-source.v1' as const;
export const HISTORICAL_REPRODUCTION_PROVIDER_ID = 'nightwatch.historical-reproduction.v1' as const;
export const HISTORICAL_SYSTEM_MAP_PROVIDER_ID = 'nightwatch.historical-system-map.v1' as const;
export const HISTORICAL_BUG_ATLAS_PROVIDER_ID = 'nightwatch.historical-bug-atlas.v1' as const;
export const HISTORICAL_SYSTEM_ATLAS_PROVIDER_ID = 'nightwatch.historical-system-atlas.v1' as const;
export const HISTORICAL_EVIDENCE_PROVIDER_ID = 'nightwatch.historical-evidence.v1' as const;

/** Fallback visible file synthesized from prose snapshots that carry no `--- path` chunks. */
export const HISTORICAL_VISIBLE_FALLBACK_PATH = 'visible-context.md' as const;

const MAX_HISTORICAL_FILE_BYTES = 16_384;

/** Harness-side replay audit. Never reasoner-visible; mirrors hunt's MinedReplayAudit. */
export interface HistoricalReplayAudit {
  readonly grounded: boolean;
  readonly repoResolved: boolean;
  readonly verdict: ContainedTestReplayResult['verdict'] | null;
  readonly reason: string | null;
  readonly durationMs: number | null;
  readonly timedOut: boolean | null;
  readonly stderrHead: string | null;
}

function languageForPath(path: string): SourceScanLanguage {
  const lower = path.toLowerCase();
  if (lower.endsWith('.go')) return 'GO';
  if (lower.endsWith('.php')) return 'PHP';
  if (lower.endsWith('.proto')) return 'PROTOBUF';
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'YAML';
  if (lower.endsWith('.vue')) return 'VUE';
  if (lower.endsWith('.json')) return 'OPENAPI';
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) {
    return 'JAVASCRIPT';
  }
  return 'TYPESCRIPT';
}

function shortSha(text: string): string {
  const digest = sourceContentDigest(text);
  const hex = digest.startsWith('sha256:') ? digest.slice('sha256:'.length) : digest;
  return hex.slice(0, 40);
}

/** Leak-isolated visible files: parsed `--- path` chunks, or one prose fallback. */
export function historicalVisibleFiles(visible: ReasonerVisibleContext): ReadonlyMap<string, string> {
  const parsed = parsePreFixSnapshotFiles(visible.blobs[1] ?? '');
  if (parsed.size > 0) return parsed;
  const prose = visible.blobs[1] ?? visible.blobs[0] ?? '';
  if (typeof prose !== 'string' || prose.length === 0) return new Map();
  return new Map([[HISTORICAL_VISIBLE_FALLBACK_PATH, prose.slice(0, MAX_HISTORICAL_FILE_BYTES)]]);
}

export function historicalVisiblePaths(visible: ReasonerVisibleContext): readonly string[] {
  return [...historicalVisibleFiles(visible).keys()];
}

function entryFor(caseId: string, path: string, text: string): LocalSourceIndexEntry {
  const bounded = text.length > MAX_HISTORICAL_FILE_BYTES ? text.slice(0, MAX_HISTORICAL_FILE_BYTES) : text;
  return Object.freeze({
    path,
    repository: `benchmark:${caseId}`,
    relativePath: path,
    sourceSha: shortSha(bounded),
    language: languageForPath(path),
    byteCount: Buffer.byteLength(bounded, 'utf8'),
    contentDigest: sourceContentDigest(bounded),
  });
}

/** Source adapter: bounded index plus one approved bounded file. Unknown paths stay BLOCKED. */
export function createHistoricalSourceProvider(
  visible: ReasonerVisibleContext,
  caseId: string,
): LocalSourceProvider {
  const files = historicalVisibleFiles(visible);
  return Object.freeze({
    providerId: HISTORICAL_SOURCE_PROVIDER_ID,
    async index(): Promise<LocalProviderResult<LocalSourceIndex>> {
      const entries = [...files.entries()].map(([path, text]) => entryFor(caseId, path, text));
      return { status: 'AVAILABLE', value: Object.freeze({ entries: Object.freeze(entries), total: entries.length, truncated: false }) };
    },
    async read(path: string): Promise<LocalProviderResult<LocalSourceDocument>> {
      const text = files.get(path);
      if (text === undefined) {
        return { status: 'BLOCKED', class: 'SOURCE_UNAVAILABLE', reason: `unknown historical path: ${path}` };
      }
      const entry = entryFor(caseId, path, text);
      const bounded = text.length > MAX_HISTORICAL_FILE_BYTES ? text.slice(0, MAX_HISTORICAL_FILE_BYTES) : text;
      return { status: 'AVAILABLE', value: Object.freeze({ ...entry, text: bounded }) };
    },
  });
}

export interface HistoricalReproductionProviderOptions {
  readonly caseId: string;
  /** Approved leak-isolated visible paths; sourcePath must be a member. */
  readonly visibleFiles: readonly string[];
  readonly discriminator?: VisibleDiscriminator | null;
  /** Hidden-only replay coordinates. Never reasoner-visible. */
  readonly minedReplay?: MinedTestReplayDescriptor | null;
  readonly repositoriesRoot?: string;
  readonly runReplay?: (request: ContainedTestReplayRequest) => Promise<ContainedTestReplayResult>;
  /** Extra grounding gate (tests); session history remains the primary gate. */
  readonly hasGrounding?: () => boolean;
  /** Harness-side audit box. Never reasoner-visible. */
  readonly auditBox?: { current: HistoricalReplayAudit | null };
}

function neutralMinedVisible(verdict: 'REPRODUCED' | 'NOT_REPRODUCED' | 'NOT_AVAILABLE'): unknown {
  return { harness: MINED_TEST_REPLAY_VERSION, replay: verdict };
}

function mapSignal(signal: PackageSignal): LocalReproductionSignal {
  if (signal === 'PASS') return 'PASS';
  if (signal === 'FAIL') return 'FAIL';
  if (signal === 'BLOCKED') return 'BLOCKED';
  return 'BLOCKED';
}

function audit(box: HistoricalReproductionProviderOptions['auditBox'], value: HistoricalReplayAudit): void {
  if (box) box.current = value;
}

/** Reproduction adapter: hidden coordinates + contained engine, neutral verdicts only. */
export function createHistoricalReproductionProvider(
  options: HistoricalReproductionProviderOptions,
): DeterministicReproductionProvider {
  const caseId = options.caseId;
  const allowed = new Set(options.visibleFiles);
  const evidenceRefFor = `bench:${caseId}:repro:1`;
  const provenance = Object.freeze([`benchmark:${caseId}`]);
  return Object.freeze({
    providerId: HISTORICAL_REPRODUCTION_PROVIDER_ID,
    async run(request): Promise<LocalProviderResult<LocalReproductionProviderResult>> {
      const sourcePath = typeof request.sourcePath === 'string' ? request.sourcePath : '';
      const sourceEvidenceRef = typeof request.sourceEvidenceRef === 'string' ? request.sourceEvidenceRef : '';
      if (sourcePath.length === 0 || sourceEvidenceRef.length === 0) {
        return { status: 'BLOCKED', class: 'UNSAFE_INPUT', reason: 'MISSING_SOURCE_GROUNDING' };
      }
      if (!allowed.has(sourcePath)) {
        return { status: 'BLOCKED', class: 'UNSAFE_INPUT', reason: 'UNKNOWN_SOURCE_PATH' };
      }
      const discriminator = options.discriminator ?? null;
      if (discriminator !== null) {
        const observation = runVisibleDiscriminator(discriminator);
        const verdict = observation.mismatch ? 'REPRODUCED' : 'NOT_REPRODUCED';
        return {
          status: 'AVAILABLE',
          value: Object.freeze({
            verdict,
            reasonerVisible: { ...observation },
            evidenceRef: evidenceRefFor,
            provenanceRefs: provenance,
            preFix: observation.mismatch ? 'FAIL' : ('PASS' as LocalReproductionSignal),
            postFix: 'NOT_RUN' as LocalReproductionSignal,
            audit: null,
          }),
        };
      }
      const mined = options.minedReplay ?? null;
      if (mined === null) {
        return {
          status: 'AVAILABLE',
          value: Object.freeze({
            verdict: 'NOT_AVAILABLE' as const,
            reasonerVisible: neutralMinedVisible('NOT_AVAILABLE'),
            evidenceRef: null,
            provenanceRefs: Object.freeze([]),
            preFix: 'NOT_RUN' as LocalReproductionSignal,
            postFix: 'NOT_RUN' as LocalReproductionSignal,
            audit: null,
          }),
        };
      }
      let grounded = true;
      try {
        grounded = options.hasGrounding ? options.hasGrounding() : true;
      } catch {
        grounded = false;
      }
      if (!grounded) {
        audit(options.auditBox, {
          grounded: false,
          repoResolved: false,
          verdict: null,
          reason: 'GATE_REFUSED_NO_FILE_GROUNDING',
          durationMs: null,
          timedOut: null,
          stderrHead: null,
        });
        return {
          status: 'AVAILABLE',
          value: Object.freeze({
            verdict: 'NOT_AVAILABLE' as const,
            reasonerVisible: neutralMinedVisible('NOT_AVAILABLE'),
            evidenceRef: null,
            provenanceRefs: Object.freeze([]),
            preFix: 'NOT_RUN' as LocalReproductionSignal,
            postFix: 'NOT_RUN' as LocalReproductionSignal,
            audit: null,
          }),
        };
      }
      const repoPath = resolveMinedRepoPath(options.repositoriesRoot ?? DEFAULT_SIBLING_ROOT, mined.repository);
      if (repoPath === null) {
        audit(options.auditBox, {
          grounded: true,
          repoResolved: false,
          verdict: null,
          reason: 'REPO_UNRESOLVED',
          durationMs: null,
          timedOut: null,
          stderrHead: null,
        });
        return {
          status: 'AVAILABLE',
          value: Object.freeze({
            verdict: 'NOT_AVAILABLE' as const,
            reasonerVisible: neutralMinedVisible('NOT_AVAILABLE'),
            evidenceRef: null,
            provenanceRefs: Object.freeze([]),
            preFix: 'NOT_RUN' as LocalReproductionSignal,
            postFix: 'NOT_RUN' as LocalReproductionSignal,
            audit: null,
          }),
        };
      }
      let result: ContainedTestReplayResult;
      try {
        const replay = options.runReplay ?? runContainedTestReplay;
        result = await replay({
          repoPath,
          fixCommit: mined.fixCommit,
          testPath: mined.testPath,
          packageDir: mined.packageDir,
        });
      } catch {
        audit(options.auditBox, {
          grounded: true,
          repoResolved: true,
          verdict: null,
          reason: 'REPLAY_EXECUTOR_FAILED',
          durationMs: null,
          timedOut: null,
          stderrHead: null,
        });
        return {
          status: 'AVAILABLE',
          value: Object.freeze({
            verdict: 'NOT_AVAILABLE' as const,
            reasonerVisible: neutralMinedVisible('NOT_AVAILABLE'),
            evidenceRef: null,
            provenanceRefs: Object.freeze([]),
            preFix: 'NOT_RUN' as LocalReproductionSignal,
            postFix: 'NOT_RUN' as LocalReproductionSignal,
            audit: null,
          }),
        };
      }
      audit(options.auditBox, {
        grounded: true,
        repoResolved: true,
        verdict: result.verdict,
        reason: result.reason,
        durationMs: result.durationMs,
        timedOut: result.preFix.timedOut || result.postFix.timedOut,
        stderrHead: result.stderrHead,
      });
      if (result.verdict === 'REPRODUCED') {
        return {
          status: 'AVAILABLE',
          value: Object.freeze({
            verdict: 'REPRODUCED' as const,
            reasonerVisible: neutralMinedVisible('REPRODUCED'),
            evidenceRef: evidenceRefFor,
            provenanceRefs: provenance,
            preFix: mapSignal(result.preFix.signal),
            postFix: mapSignal(result.postFix.signal),
            audit: {
              reason: result.reason,
              durationMs: result.durationMs,
              timedOut: result.preFix.timedOut || result.postFix.timedOut,
            },
          }),
        };
      }
      if (result.verdict === 'ENVIRONMENT_BLOCKED') {
        return {
          status: 'AVAILABLE',
          value: Object.freeze({
            verdict: 'ENVIRONMENT_BLOCKED' as const,
            reasonerVisible: neutralMinedVisible('NOT_AVAILABLE'),
            evidenceRef: null,
            provenanceRefs: Object.freeze([]),
            preFix: mapSignal(result.preFix.signal),
            postFix: mapSignal(result.postFix.signal),
            audit: {
              reason: result.reason,
              durationMs: result.durationMs,
              timedOut: result.preFix.timedOut || result.postFix.timedOut,
            },
          }),
        };
      }
      return {
        status: 'AVAILABLE',
        value: Object.freeze({
          verdict: 'NOT_REPRODUCED' as const,
          reasonerVisible: neutralMinedVisible('NOT_REPRODUCED'),
          evidenceRef: evidenceRefFor,
          provenanceRefs: provenance,
          preFix: mapSignal(result.preFix.signal),
          postFix: mapSignal(result.postFix.signal),
          audit: {
            reason: result.reason,
            durationMs: result.durationMs,
            timedOut: result.preFix.timedOut || result.postFix.timedOut,
          },
        }),
      };
    },
  });
}

export interface HistoricalLocalInvestigationContextOptions {
  readonly visible: ReasonerVisibleContext;
  readonly caseId: string;
  readonly discriminator?: VisibleDiscriminator | null;
  readonly minedReplay?: MinedTestReplayDescriptor | null;
  readonly repositoriesRoot?: string;
  readonly runReplay?: (request: ContainedTestReplayRequest) => Promise<ContainedTestReplayResult>;
  readonly hasGrounding?: () => boolean;
  readonly auditBox?: { current: HistoricalReplayAudit | null };
}

/** Historical product-path context: real-historical source + reproduction, everything else explicit BLOCKED. */
export function createHistoricalLocalInvestigationContext(
  options: HistoricalLocalInvestigationContextOptions,
): LocalInvestigationContext {
  const source = createHistoricalSourceProvider(options.visible, options.caseId);
  const reproduction = createHistoricalReproductionProvider({
    caseId: options.caseId,
    visibleFiles: historicalVisiblePaths(options.visible),
    discriminator: options.discriminator ?? null,
    minedReplay: options.minedReplay ?? null,
    repositoriesRoot: options.repositoriesRoot,
    runReplay: options.runReplay,
    hasGrounding: options.hasGrounding,
    auditBox: options.auditBox,
  });
  return Object.freeze({
    schemaVersion: LOCAL_INVESTIGATION_CONTEXT_VERSION,
    dataClass: 'REAL_HISTORICAL',
    source,
    systemMap: Object.freeze({
      providerId: HISTORICAL_SYSTEM_MAP_PROVIDER_ID,
      async load() {
        return { status: 'BLOCKED', class: 'DATA_BLOCKED', reason: 'historical case has no real System Map; refusing synthetic' } as const;
      },
    }),
    bugAtlas: Object.freeze({
      providerId: HISTORICAL_BUG_ATLAS_PROVIDER_ID,
      async load() {
        return { status: 'BLOCKED', class: 'DATA_BLOCKED', reason: 'historical case isolates Bug Atlas; no fixture fallback' } as const;
      },
    }),
    systemAtlas: Object.freeze({
      providerId: HISTORICAL_SYSTEM_ATLAS_PROVIDER_ID,
      async load() {
        return { status: 'BLOCKED', class: 'DATA_BLOCKED', reason: 'historical case has no System Atlas overlay; refusing synthetic' } as const;
      },
    }),
    evidence: Object.freeze({
      providerId: HISTORICAL_EVIDENCE_PROVIDER_ID,
      async get() {
        return { status: 'BLOCKED', class: 'DATA_BLOCKED', reason: 'historical case has no evidence store' } as const;
      },
    }),
    reproduction,
  });
}
