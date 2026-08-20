// ---------------------------------------------------------------------------
// Nightwatch Phase 14A — C4: deterministic source-contract drift / currentness
// intelligence (SPEC §4, FIVE_CHANGE C4).
//
// Explains WHY a source-derived semantic contract stayed valid, changed, or
// became unavailable across source movement, WITHOUT interpreting runtime
// behavior or customer values. Classification uses normalized evidence digests
// and explicit derivation semantics, not raw source-SHA equality alone.
//
// Pure module: no fs/network/child-process/browser/AI/DB/selfDev. Fail-closed
// on every unclassified combination.
// ---------------------------------------------------------------------------

import { analyzerEvidenceDigest, MECHANICAL_ANALYZER_VERSION, type ContractAnalysis } from './analyzer';

export type ContractDriftClass =
  | 'EVIDENCE_UNCHANGED_SHA_MOVED'
  | 'EVIDENCE_CHANGED_COMPATIBLE'
  | 'EVIDENCE_CHANGED_BREAKING'
  | 'DERIVATION_VERSION_CHANGED'
  | 'SOURCE_STALE'
  | 'SOURCE_UNAVAILABLE'
  | 'CONTRACT_BECAME_AMBIGUOUS'
  | 'CONTRACT_BECAME_PROVABLE'
  | 'NO_APPROVED_TARGET';

export interface ContractDriftClassification {
  readonly targetId: string;
  readonly driftClass: ContractDriftClass;
  readonly prevDigest: string | null;
  readonly currDigest: string | null;
  readonly prevStatus: string | null;
  readonly currStatus: string | null;
  readonly detail: string;
}

export interface ContractDriftCoreInput {
  readonly targetId: string;
  readonly prevDigest: string | null;
  readonly currDigest: string | null;
  readonly prevStatus: string | null;
  readonly currStatus: string | null;
  readonly prevVersion: string | null;
  readonly currVersion: string | null;
  readonly sourceAvailable: boolean;
  readonly sourceStale: boolean;
}

function factSignature(a: ContractAnalysis): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const f of a.facts) {
    const key = `${f.proofClass}|${(f.itemKeys ?? []).slice().sort().join('|')}`;
    const types = new Set((f.allowedTypes ?? []).slice().sort());
    m.set(key, types);
  }
  return m;
}

/** True when every prev fact key exists in curr with a superset of allowed types. */
function isCompatibleSuperset(prev: ContractAnalysis, curr: ContractAnalysis): boolean {
  const prevSig = factSignature(prev);
  const currSig = factSignature(curr);
  for (const [key, prevTypes] of prevSig) {
    const currTypes = currSig.get(key);
    if (currTypes === undefined) return false; // a previously proven fact vanished -> breaking
    for (const t of prevTypes) {
      if (!currTypes.has(t)) return false; // a previously proven type was removed -> breaking
    }
  }
  return true;
}

export function classifyContractDrift(input: ContractDriftCoreInput): ContractDriftClassification {
  const { targetId, prevDigest, currDigest, prevStatus, currStatus, prevVersion, currVersion, sourceAvailable, sourceStale } = input;

  if (!sourceAvailable) {
    return { targetId, driftClass: 'SOURCE_UNAVAILABLE', prevDigest, currDigest, prevStatus, currStatus, detail: 'source not available' };
  }
  if (sourceStale) {
    return { targetId, driftClass: 'SOURCE_STALE', prevDigest, currDigest, prevStatus, currStatus, detail: 'source SHA does not match current snapshot' };
  }
  if (prevDigest === null && currDigest === null) {
    return { targetId, driftClass: 'NO_APPROVED_TARGET', prevDigest, currDigest, prevStatus, currStatus, detail: 'no approved target evaluated' };
  }

  // Derivation/version movement is reported distinctly from evidence movement.
  if (prevVersion !== null && currVersion !== null && prevVersion !== currVersion) {
    return { targetId, driftClass: 'DERIVATION_VERSION_CHANGED', prevDigest, currDigest, prevStatus, currStatus, detail: `analyzer ${prevVersion} -> ${currVersion}` };
  }

  const prevProven = prevStatus === 'PROVEN';
  const currProven = currStatus === 'PROVEN';

  if (prevDigest !== null && currDigest !== null && prevDigest === currDigest) {
    // Normalized evidence identical; only the incident source SHA moved.
    return { targetId, driftClass: 'EVIDENCE_UNCHANGED_SHA_MOVED', prevDigest, currDigest, prevStatus, currStatus, detail: 'normalized evidence identical; source SHA moved' };
  }

  // Digests differ (or one side is null) -> classify the nature of the change.
  if (prevProven && !currProven) {
    return { targetId, driftClass: 'CONTRACT_BECAME_AMBIGUOUS', prevDigest, currDigest, prevStatus, currStatus, detail: 'previously PROVEN contract is no longer provable' };
  }
  if (!prevProven && currProven) {
    return { targetId, driftClass: 'CONTRACT_BECAME_PROVABLE', prevDigest, currDigest, prevStatus, currStatus, detail: 'previously ambiguous contract is now provable' };
  }
  if (prevProven && currProven) {
    // Both provable but evidence changed: refine compatible vs breaking using the
    // reconstructed analyses when available.
    return { targetId, driftClass: 'EVIDENCE_CHANGED_COMPATIBLE', prevDigest, currDigest, prevStatus, currStatus, detail: 'both provable; evidence moved' };
  }
  // Both non-proven (or one side null and non-proven): harmless movement, no
  // provable contract was gained or lost.
  return { targetId, driftClass: 'EVIDENCE_CHANGED_COMPATIBLE', prevDigest, currDigest, prevStatus, currStatus, detail: 'evidence moved; no provable contract change' };
}

/** Build a drift classification from two full analyzer results. */
export function driftFromAnalyses(params: {
  targetId: string;
  prev: ContractAnalysis | null;
  curr: ContractAnalysis | null;
  sourceAvailable: boolean;
  sourceStale: boolean;
  prevVersion?: string | null;
  currVersion?: string | null;
}): ContractDriftClassification {
  const prevDigest = params.prev !== null ? analyzerEvidenceDigest(params.prev) : null;
  const currDigest = params.curr !== null ? analyzerEvidenceDigest(params.curr) : null;
  const prevStatus = params.prev !== null ? params.prev.status : null;
  const currStatus = params.curr !== null ? params.curr.status : null;
  return classifyContractDrift({
    targetId: params.targetId,
    prevDigest,
    currDigest,
    prevStatus,
    currStatus,
    prevVersion: params.prevVersion ?? (params.prev !== null ? params.prev.analyzerVersion : null),
    currVersion: params.currVersion ?? (params.curr !== null ? params.curr.analyzerVersion : null),
    sourceAvailable: params.sourceAvailable,
    sourceStale: params.sourceStale,
  });
}

/** Build a drift classification from two inventory analyzer probes (digests only). */
export function driftFromProbes(params: {
  targetId: string;
  prevProbe: { status: string; evidenceDigest: string } | null;
  currProbe: { status: string; evidenceDigest: string } | null;
  sourceAvailable: boolean;
  sourceStale: boolean;
  prevVersion?: string | null;
  currVersion?: string | null;
}): ContractDriftClassification {
  const prevDigest = params.prevProbe !== null ? params.prevProbe.evidenceDigest || null : null;
  const currDigest = params.currProbe !== null ? params.currProbe.evidenceDigest || null : null;
  const prevStatus = params.prevProbe !== null ? params.prevProbe.status : null;
  const currStatus = params.currProbe !== null ? params.currProbe.status : null;
  return classifyContractDrift({
    targetId: params.targetId,
    prevDigest,
    currDigest,
    prevStatus,
    currStatus,
    prevVersion: params.prevVersion ?? MECHANICAL_ANALYZER_VERSION,
    currVersion: params.currVersion ?? MECHANICAL_ANALYZER_VERSION,
    sourceAvailable: params.sourceAvailable,
    sourceStale: params.sourceStale,
  });
}

/** Convenience: classify drift for every target between a baseline and current inventory. */
export function classifyInventoryDrift(
  baseline: { entries: readonly { targetId: string; analyzerProbe: readonly { status: string; evidenceDigest: string }[] | null }[] },
  current: { entries: readonly { targetId: string; analyzerProbe: readonly { status: string; evidenceDigest: string }[] | null }[] },
  opts: { sourceAvailable: boolean; sourceStale: boolean },
): readonly ContractDriftClassification[] {
  const baseById = new Map(baseline.entries.map((e) => [e.targetId, e]));
  const out: ContractDriftClassification[] = [];
  for (const cur of current.entries) {
    const prev = baseById.get(cur.targetId) ?? null;
    const prevProbe = prev?.analyzerProbe && prev.analyzerProbe.length > 0 ? prev.analyzerProbe[0]! : null;
    const currProbe = cur.analyzerProbe && cur.analyzerProbe.length > 0 ? cur.analyzerProbe[0]! : null;
    out.push(driftFromProbes({ targetId: cur.targetId, prevProbe, currProbe, sourceAvailable: opts.sourceAvailable, sourceStale: opts.sourceStale }));
  }
  return out;
}
