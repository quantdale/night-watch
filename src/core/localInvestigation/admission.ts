// ---------------------------------------------------------------------------
// W7 admission lane — mechanical finding admission gate.
//
// `admitLocalFinding` is a pure deterministic gate between a reasoner proposal
// and a final dossier. It derives reproductionCount, evidenceRefs,
// reproduction narrative, provenance, false-positive checks, and
// authority-bearing dossier fields from harness-observed runtime state plus
// tool-session history. Model draft fields are suggestions only for
// presentation (title/description/severity rationale/alternative hypotheses);
// draft reproductionCount, provenance, evidence refs, and authority are never
// trusted. Forged evidence refs are refused; forged counts/provenance/
// authority are ignored in favour of derived/pinned values.
//
// When grounding is incomplete the gate returns a typed refusal, never a
// dossier. No I/O, no clock, no network, no sibling writes, no secrets.
// ---------------------------------------------------------------------------

import { buildAutonomousFindingDossier } from '../autonomousFinding/dossier';
import type { AutonomousFindingDossier } from '../agentProtocol/finding';
import type { AgentRuntimeState } from '../agentProtocol/runtime';
import type {
  LocalInvestigationHistory,
  LocalReproductionReceipt,
  LocalSourceObservation,
} from './types';

export interface AdmitLocalFindingInput {
  readonly state: AgentRuntimeState;
  readonly history: LocalInvestigationHistory;
  readonly candidateId: string;
  readonly draft?: Readonly<Record<string, unknown>> | null;
}

export type AdmitLocalFindingRefusalReason =
  | 'UNKNOWN_CANDIDATE'
  | 'MISSING_PROPOSAL'
  | 'MISSING_EVIDENCE'
  | 'INVENTED_EVIDENCE'
  | 'MISSING_REPRODUCTION'
  | 'UNLINKED_REPRODUCTION';

export interface AdmittedLocalFinding {
  readonly admitted: true;
  readonly candidateId: string;
  readonly reproductionCount: number;
  readonly evidenceRefs: readonly string[];
  readonly provenanceRefs: readonly string[];
  readonly reproductionIds: readonly string[];
  readonly sourcePaths: readonly string[];
  readonly dossier: AutonomousFindingDossier;
}

export interface RefusedLocalFinding {
  readonly admitted: false;
  readonly candidateId: string;
  readonly reason: AdmitLocalFindingRefusalReason;
  readonly detail: string;
  readonly reproductionCount: 0;
  readonly evidenceRefs: readonly string[];
}

export type AdmitLocalFindingResult = AdmittedLocalFinding | RefusedLocalFinding;

const MAX_TITLE = 300;
const MAX_PROSE = 4000;
const MAX_RATIONALE = 2000;
const MAX_REF = 500;
const MAX_LIST_ITEMS = 128;

const SEVERITIES = new Set(['S1', 'S2', 'S3', 'S4']);
const CONFIDENCES = new Set(['HIGH', 'MEDIUM', 'LOW']);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && item.trim().length > 0) out.push(item.trim());
  }
  return out;
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd();
}

function suggestionString(draft: Readonly<Record<string, unknown>> | null, key: string): string | null {
  if (draft === null) return null;
  const value = draft[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function suggestionStringList(
  draft: Readonly<Record<string, unknown>> | null,
  key: string,
): readonly string[] {
  if (draft === null) return [];
  const raw = draft[key];
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (trimmed.length === 0) continue;
    out.push(truncate(trimmed, MAX_REF));
    if (out.length >= MAX_LIST_ITEMS) break;
  }
  return out;
}

function refused(
  candidateId: string,
  reason: AdmitLocalFindingRefusalReason,
  detail: string,
): RefusedLocalFinding {
  return Object.freeze({
    admitted: false as const,
    candidateId,
    reason,
    detail,
    reproductionCount: 0 as const,
    evidenceRefs: Object.freeze([]) as readonly string[],
  });
}

interface NormalizedInput {
  readonly state: AgentRuntimeState | null;
  readonly history: LocalInvestigationHistory | null;
  readonly candidateId: string;
  readonly draft: Readonly<Record<string, unknown>> | null;
}

function normalizeInput(input: unknown): NormalizedInput {
  const raw = (isRecord(input) ? input : {}) as Readonly<Record<string, unknown>>;
  const state =
    (raw['state'] as AgentRuntimeState | null | undefined) ??
    (raw['runtimeState'] as AgentRuntimeState | null | undefined) ??
    (raw['runtime'] as AgentRuntimeState | null | undefined) ??
    null;
  const history =
    (raw['history'] as LocalInvestigationHistory | null | undefined) ??
    (raw['investigationHistory'] as LocalInvestigationHistory | null | undefined) ??
    (raw['localHistory'] as LocalInvestigationHistory | null | undefined) ??
    null;
  const candidateRaw =
    raw['candidateId'] ?? raw['candidate'] ?? raw['id'] ?? raw['findingId'] ?? '';
  const candidateId = typeof candidateRaw === 'string' ? candidateRaw.trim() : '';
  const draftRaw = raw['draft'] ?? raw['modelDraft'] ?? raw['proposalDraft'] ?? null;
  const draft = isRecord(draftRaw) ? (draftRaw as Readonly<Record<string, unknown>>) : null;
  return { state, history, candidateId, draft };
}

function readStateEvidenceRefs(state: AgentRuntimeState | null): readonly string[] {
  if (state === null || !Array.isArray((state as { evidenceRefs?: unknown }).evidenceRefs)) return [];
  return asStringArray((state as { evidenceRefs: unknown }).evidenceRefs);
}

function readStateCandidateIds(state: AgentRuntimeState | null): readonly string[] | null {
  if (state === null || !Array.isArray((state as { candidateIds?: unknown }).candidateIds)) return null;
  return asStringArray((state as { candidateIds: unknown }).candidateIds);
}

function readObservedEvidence(history: LocalInvestigationHistory | null): readonly string[] {
  if (history === null || !Array.isArray(history.observedEvidence)) return [];
  const out: string[] = [];
  for (const entry of history.observedEvidence) {
    if (isRecord(entry) && typeof entry['evidenceRef'] === 'string') {
      const ref = (entry['evidenceRef'] as string).trim();
      if (ref.length > 0) out.push(ref);
    }
  }
  return out;
}

function readInspectedSources(history: LocalInvestigationHistory | null): readonly LocalSourceObservation[] {
  if (history === null || !Array.isArray(history.inspectedSources)) return [];
  const out: LocalSourceObservation[] = [];
  for (const entry of history.inspectedSources) {
    if (!isRecord(entry)) continue;
    const path = entry['path'];
    const evidenceRef = entry['evidenceRef'];
    if (typeof path !== 'string' || path.length === 0) continue;
    if (typeof evidenceRef !== 'string' || evidenceRef.trim().length === 0) continue;
    out.push({ path, evidenceRef: evidenceRef.trim() });
  }
  return out;
}

function readReproductions(history: LocalInvestigationHistory | null): readonly LocalReproductionReceipt[] {
  if (history === null || !Array.isArray(history.reproductions)) return [];
  return history.reproductions.filter((entry): entry is LocalReproductionReceipt => isRecord(entry));
}

function readProposals(history: LocalInvestigationHistory | null): readonly {
  readonly candidateId: string;
  readonly evidenceRefs: readonly string[];
}[] {
  if (history === null || !Array.isArray(history.findingProposals)) return [];
  const out: { readonly candidateId: string; readonly evidenceRefs: readonly string[] }[] = [];
  for (const entry of history.findingProposals) {
    if (!isRecord(entry)) continue;
    const candidateId = entry['candidateId'];
    if (typeof candidateId !== 'string' || candidateId.trim().length === 0) continue;
    out.push({
      candidateId: candidateId.trim(),
      evidenceRefs: asStringArray(entry['evidenceRefs']),
    });
  }
  return out;
}

function isQualifyingReceipt(
  receipt: LocalReproductionReceipt,
  candidateId: string,
  inspectedByPath: ReadonlyMap<string, ReadonlySet<string>>,
  candidateEvidence: ReadonlySet<string>,
): boolean {
  if (receipt.verdict !== 'REPRODUCED') return false;
  if (receipt.preFix !== 'FAIL' || receipt.postFix !== 'PASS') return false;
  if (typeof receipt.sourcePath !== 'string' || receipt.sourcePath.length === 0) return false;
  if (typeof receipt.sourceEvidenceRef !== 'string' || receipt.sourceEvidenceRef.trim().length === 0) {
    return false;
  }
  const sourceEvidenceRef = receipt.sourceEvidenceRef.trim();
  const allowed = inspectedByPath.get(receipt.sourcePath);
  if (allowed === undefined || !allowed.has(sourceEvidenceRef)) return false;
  const receiptCandidate = receipt.candidateId;
  if (typeof receiptCandidate === 'string' && receiptCandidate.length > 0) {
    return receiptCandidate === candidateId;
  }
  // Unattributed receipts only count when their source evidence is part of
  // this candidate's own claimed evidence.
  return candidateEvidence.has(sourceEvidenceRef);
}

/**
 * Deterministic mechanical admission gate. Derives every authority-bearing
 * field from harness-observed state/history; the model draft only suggests
 * presentation fields. Returns a refusal (never a dossier) when grounding is
 * incomplete, including forged counts without runtime reproduction and
 * invented evidence refs.
 */
export function admitLocalFinding(input: AdmitLocalFindingInput): AdmitLocalFindingResult {
  const normalized = normalizeInput(input);
  const { candidateId, draft } = normalized;
  const { state, history } = normalized;

  if (candidateId.length === 0) {
    return refused('', 'UNKNOWN_CANDIDATE', 'candidate id is missing or empty');
  }

  const stateCandidateIds = readStateCandidateIds(state);
  const proposals = readProposals(history);
  const proposalsForCandidate = proposals.filter((proposal) => proposal.candidateId === candidateId);

  if (stateCandidateIds !== null) {
    if (!stateCandidateIds.includes(candidateId) && proposalsForCandidate.length === 0) {
      return refused(candidateId, 'UNKNOWN_CANDIDATE', `candidate ${candidateId} is not in runtime state`);
    }
    if (!stateCandidateIds.includes(candidateId)) {
      return refused(candidateId, 'UNKNOWN_CANDIDATE', `candidate ${candidateId} is not in runtime state`);
    }
  } else if (proposalsForCandidate.length === 0) {
    return refused(candidateId, 'UNKNOWN_CANDIDATE', `candidate ${candidateId} has no runtime record`);
  }

  if (proposalsForCandidate.length === 0) {
    return refused(candidateId, 'MISSING_PROPOSAL', `candidate ${candidateId} has no finding proposal`);
  }

  const proposalRefs = uniqueSorted(proposalsForCandidate.flatMap((proposal) => [...proposal.evidenceRefs]));
  if (proposalRefs.length === 0) {
    return refused(candidateId, 'MISSING_EVIDENCE', `candidate ${candidateId} proposal carries no evidence refs`);
  }

  const draftRefs = draft !== null ? asStringArray(draft['evidenceRefs']) : [];

  const stateEvidence = readStateEvidenceRefs(state);
  const observedEvidence = readObservedEvidence(history);
  const inspectedSources = readInspectedSources(history);
  const reproductions = readReproductions(history);
  const reproductionEvidence: string[] = [];
  for (const receipt of reproductions) {
    if (typeof receipt.evidenceRef === 'string' && receipt.evidenceRef.trim().length > 0) {
      reproductionEvidence.push(receipt.evidenceRef.trim());
    }
  }
  const inspectedEvidence = inspectedSources.map((entry) => entry.evidenceRef);
  const observedSet = new Set([
    ...stateEvidence,
    ...observedEvidence,
    ...inspectedEvidence,
    ...reproductionEvidence,
  ]);

  for (const ref of proposalRefs) {
    if (!observedSet.has(ref)) {
      return refused(candidateId, 'INVENTED_EVIDENCE', `proposal evidence ${ref} was never observed`);
    }
  }
  for (const ref of draftRefs) {
    if (!observedSet.has(ref)) {
      return refused(candidateId, 'INVENTED_EVIDENCE', `draft evidence ${ref} was never observed`);
    }
  }

  const inspectedByPath = new Map<string, ReadonlySet<string>>();
  for (const entry of inspectedSources) {
    const existing = inspectedByPath.get(entry.path);
    if (existing === undefined) {
      inspectedByPath.set(entry.path, new Set([entry.evidenceRef]));
    } else {
      (existing as Set<string>).add(entry.evidenceRef);
    }
  }
  const candidateEvidenceSet = new Set<string>(proposalRefs);

  const qualifying = reproductions
    .filter((receipt) => isQualifyingReceipt(receipt, candidateId, inspectedByPath, candidateEvidenceSet))
    .slice()
    .sort((a, b) => {
      const byId = String(a.reproductionId ?? '').localeCompare(String(b.reproductionId ?? ''));
      if (byId !== 0) return byId;
      return String(a.providerId ?? '').localeCompare(String(b.providerId ?? ''));
    });

  if (qualifying.length === 0) {
    const reproduced = reproductions.filter((receipt) => receipt.verdict === 'REPRODUCED');
    if (reproduced.length === 0) {
      return refused(
        candidateId,
        'MISSING_REPRODUCTION',
        `candidate ${candidateId} has no REPRODUCED session receipt`,
      );
    }
    return refused(
      candidateId,
      'UNLINKED_REPRODUCTION',
      `candidate ${candidateId} has no linked pre-fix FAIL/post-fix PASS receipt for an inspected source`,
    );
  }

  const reproductionCount = qualifying.length;
  const reproductionIds = uniqueSorted(qualifying.map((receipt) => String(receipt.reproductionId)));
  const sourcePaths = uniqueSorted(qualifying.map((receipt) => receipt.sourcePath));
  const receiptEvidenceRefs: string[] = [];
  const provenanceParts: string[] = [];
  for (const receipt of qualifying) {
    if (typeof receipt.evidenceRef === 'string' && receipt.evidenceRef.trim().length > 0) {
      receiptEvidenceRefs.push(receipt.evidenceRef.trim());
    }
    if (typeof receipt.sourceEvidenceRef === 'string' && receipt.sourceEvidenceRef.trim().length > 0) {
      provenanceParts.push(receipt.sourceEvidenceRef.trim());
    }
    if (typeof receipt.evidenceRef === 'string' && receipt.evidenceRef.trim().length > 0) {
      provenanceParts.push(receipt.evidenceRef.trim());
    }
    for (const ref of asStringArray(receipt.provenanceRefs)) provenanceParts.push(ref);
  }
  const evidenceRefs = uniqueSorted([...proposalRefs, ...receiptEvidenceRefs, ...qualifying.map((r) => r.sourceEvidenceRef.trim())]);
  let provenanceRefs = uniqueSorted(provenanceParts);
  if (provenanceRefs.length === 0) {
    provenanceRefs = Object.freeze([`reproduction:${reproductionIds[0]}`]);
  }

  const falsePositiveChecks = Object.freeze([
    ...qualifying.map(
      (receipt) =>
        `mechanical reproduction ${String(receipt.reproductionId)} on ${receipt.sourcePath}: ` +
        `pre-fix FAIL and post-fix PASS observed (provider ${String(receipt.providerId)}, verdict REPRODUCED)`,
    ),
    'human-review-required: confirm scope, non-flakiness, and impact; no auto-file or external publication',
  ]);

  const titleRaw = suggestionString(draft, 'title') ?? `Local finding ${candidateId}`;
  const descriptionRaw =
    suggestionString(draft, 'description') ??
    `Mechanically admitted local finding ${candidateId} with linked pre-fix FAIL and post-fix PASS reproduction.`;
  const severityRaw = suggestionString(draft, 'recommendedSeverity');
  const recommendedSeverity = severityRaw !== null && SEVERITIES.has(severityRaw) ? severityRaw : 'S3';
  const severityConfidenceRaw = suggestionString(draft, 'severityConfidence');
  const severityConfidence =
    severityConfidenceRaw !== null && CONFIDENCES.has(severityConfidenceRaw) ? severityConfidenceRaw : 'MEDIUM';
  const confidenceRaw = suggestionString(draft, 'confidence');
  const confidence = confidenceRaw !== null && CONFIDENCES.has(confidenceRaw) ? confidenceRaw : 'MEDIUM';
  const severityRationaleRaw =
    suggestionString(draft, 'severityRationale') ??
    `Severity is a recommendation only; grounded in linked reproduction ${reproductionIds.join(', ')}.`;
  const alternativeHypotheses = Object.freeze(suggestionStringList(draft, 'alternativeHypotheses'));

  const reproductionText =
    `RERUN_SAFE_REPRODUCTION ${reproductionIds.join(', ')} on ${sourcePaths.join(', ')}: ` +
    `pre-fix FAIL observed, post-fix PASS observed (verdict REPRODUCED, ${reproductionCount} receipt(s)). ` +
    `No audit bytes exposed.`;
  const expectedText = 'pre-fix signal FAIL and post-fix signal PASS on the inspected source-linked reproduction';
  const actualText =
    `observed ${reproductionCount} linked REPRODUCED receipt(s) ` +
    `${reproductionIds.join(', ')} on ${sourcePaths.join(', ')} (pre-fix FAIL, post-fix PASS)`;

  const dossier = buildAutonomousFindingDossier({
    title: truncate(titleRaw, MAX_TITLE),
    description: truncate(descriptionRaw, MAX_PROSE),
    recommendedSeverity: recommendedSeverity as 'S1' | 'S2' | 'S3' | 'S4',
    severityConfidence: severityConfidence as 'HIGH' | 'MEDIUM' | 'LOW',
    severityRationale: truncate(severityRationaleRaw, MAX_RATIONALE),
    catchStage: null,
    source: sourcePaths[0] ?? null,
    team: 'UNKNOWN',
    reproduction: truncate(reproductionText, MAX_PROSE),
    expected: truncate(expectedText, MAX_PROSE),
    actual: truncate(actualText, MAX_PROSE),
    evidenceRefs: [...evidenceRefs],
    screenshotRefs: [],
    sourceLocations: [...sourcePaths],
    affectedApis: [],
    environment: 'LOCAL',
    confidence: confidence as 'HIGH' | 'MEDIUM' | 'LOW',
    alternativeHypotheses: [...alternativeHypotheses],
    falsePositiveChecks: [...falsePositiveChecks],
    reproductionCount,
    relatedHistoricalBugs: [],
    violatedInvariant: null,
    provenance: [...provenanceRefs],
  });

  return Object.freeze({
    admitted: true as const,
    candidateId,
    reproductionCount,
    evidenceRefs,
    provenanceRefs,
    reproductionIds,
    sourcePaths,
    dossier,
  });
}
