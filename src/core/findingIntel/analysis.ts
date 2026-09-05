// ---------------------------------------------------------------------------
// Recurrence, defect-class grouping, and expectation-provenance ranking.
//
// Recurrence binds chronology mechanically (campaign timestamps, source SHA
// lineage, finding identities, sanitized signatures). Defect classes group
// by shared semantic invariant with explicit counterexamples. Provenance
// ranking decides which "why is this wrong" claim a reviewer may lean on;
// weak provenance never supports strong confidence.
// ---------------------------------------------------------------------------

import { sha256Hex, stableJsonSorted } from '../identity/canonicalDigest';
import { isIntelValueForbidden } from './relationships';
import {
  EXPECTATION_PROVENANCE,
  FINDING_INTEL_VERSION,
  type DefectClass,
  type ExpectationProvenance,
  type IntelConfidence,
  type IntelFindingDescriptor,
  type IntelHistoryEntry,
  type RecurrenceResult,
} from './types';

const ID_RE = /^[A-Za-z0-9_.:/-]{1,160}$/;
const FP_RE = /^fp:sha256:[a-f0-9]{12,64}$/i;
const SHA_RE = /^[0-9a-f]{40}$|^synthetic\.[A-Za-z0-9_.:-]{1,120}$/;

function fail(code: string): never {
  throw new Error(code);
}

function assertHistoryEntry(value: unknown, index: number): asserts value is IntelHistoryEntry {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(`FINDING_INTEL_INVALID_HISTORY:${index}`);
  const record = value as Record<string, unknown>;
  if (typeof record.findingId !== 'string' || !ID_RE.test(record.findingId) || isIntelValueForbidden(record.findingId)) {
    fail(`FINDING_INTEL_INVALID_HISTORY:${index}.findingId`);
  }
  if (record.fingerprint !== null && (typeof record.fingerprint !== 'string' || !FP_RE.test(record.fingerprint))) {
    fail(`FINDING_INTEL_INVALID_HISTORY:${index}.fingerprint`);
  }
  if (typeof record.campaignId !== 'string' || !ID_RE.test(record.campaignId)) fail(`FINDING_INTEL_INVALID_HISTORY:${index}.campaignId`);
  if (!Number.isInteger(record.observedAtMs) || (record.observedAtMs as number) < 0) fail(`FINDING_INTEL_INVALID_HISTORY:${index}.observedAtMs`);
  if (typeof record.sourceSha !== 'string' || !SHA_RE.test(record.sourceSha)) fail(`FINDING_INTEL_INVALID_HISTORY:${index}.sourceSha`);
  if (!['OPEN', 'RESOLVED_FIXED', 'RESOLVED_OTHER', 'REJECTED', 'UNKNOWN'].includes(record.priorOutcome as string)) {
    fail(`FINDING_INTEL_INVALID_HISTORY:${index}.priorOutcome`);
  }
}

/**
 * Classify recurrence of `finding` against mechanical history. Never infers
 * from prose: matches require identical sanitized fingerprints, and
 * chronology requires ordered observedAtMs timestamps.
 */
export function classifyRecurrence(
  finding: Pick<IntelFindingDescriptor, 'findingId' | 'fingerprint'> & { readonly campaignId: string; readonly observedAtMs: number },
  history: readonly IntelHistoryEntry[] | null,
): RecurrenceResult {
  if (typeof finding.findingId !== 'string' || !ID_RE.test(finding.findingId) || isIntelValueForbidden(finding.findingId)) {
    fail('FINDING_INTEL_INVALID_FINDING');
  }
  if (finding.fingerprint !== null && !FP_RE.test(finding.fingerprint)) fail('FINDING_INTEL_INVALID_FINDING');
  if (typeof finding.campaignId !== 'string' || !ID_RE.test(finding.campaignId) || isIntelValueForbidden(finding.campaignId)) {
    fail('FINDING_INTEL_INVALID_FINDING');
  }
  if (!Number.isInteger(finding.observedAtMs) || finding.observedAtMs < 0) fail('FINDING_INTEL_INVALID_FINDING');
  if (history === null) {
    return { schemaVersion: FINDING_INTEL_VERSION, recurrence: 'UNKNOWN_HISTORY', evidence: ['no history available'], priorFindingId: null };
  }
  if (!Array.isArray(history)) fail('FINDING_INTEL_INVALID_HISTORY');
  history.forEach(assertHistoryEntry);
  const ordered = [...history].sort((a, b) => a.observedAtMs - b.observedAtMs || (a.findingId < b.findingId ? -1 : 1));
  const matches = ordered.filter((entry) => finding.fingerprint !== null && entry.fingerprint === finding.fingerprint);
  if (matches.length === 0) {
    return {
      schemaVersion: FINDING_INTEL_VERSION,
      recurrence: 'FIRST_SEEN',
      evidence: [`no earlier entry shares fingerprint in ${ordered.length} history entries`],
      priorFindingId: null,
    };
  }
  const latest = matches[matches.length - 1] as IntelHistoryEntry;
  if (latest.campaignId === finding.campaignId) {
    return {
      schemaVersion: FINDING_INTEL_VERSION,
      recurrence: 'KNOWN_EXISTING',
      evidence: [`fingerprint already admitted in campaign ${latest.campaignId} as ${latest.findingId}`],
      priorFindingId: latest.findingId,
    };
  }
  if (latest.priorOutcome === 'RESOLVED_FIXED' && latest.sourceSha !== undefined) {
    return {
      schemaVersion: FINDING_INTEL_VERSION,
      recurrence: 'REGRESSION_CANDIDATE',
      evidence: [
        `fingerprint reappears after ${latest.findingId} resolved fixed`,
        `prior source ${latest.sourceSha}`,
      ],
      priorFindingId: latest.findingId,
    };
  }
  return {
    schemaVersion: FINDING_INTEL_VERSION,
    recurrence: 'RECURRENT',
    evidence: [`fingerprint seen in ${matches.length} earlier entries; latest ${latest.findingId} in campaign ${latest.campaignId}`],
    priorFindingId: latest.findingId,
  };
}

export interface DefectClassInput {
  readonly findingId: string;
  readonly semanticContractId: string | null;
  readonly expectationId: string | null;
  readonly sourceScope: string;
  readonly replayOutcome: 'PASS' | 'FAILURE' | 'INVALID' | null;
}

/**
 * Group findings by shared semantic invariant (contract first, expectation
 * as fallback). Singletons are not classes: a class needs >= 2 members.
 * Members whose replay outcome contradicts the class (INVALID while the
 * class replays FAILURE) are listed as counterexamples, not members.
 */
export function groupDefectClasses(members: readonly DefectClassInput[]): readonly DefectClass[] {
  if (!Array.isArray(members)) fail('FINDING_INTEL_INVALID_CLASS_INPUT');
  const byInvariant = new Map<string, DefectClassInput[]>();
  for (const [index, member] of members.entries()) {
    if (member === null || typeof member !== 'object') fail(`FINDING_INTEL_INVALID_CLASS_INPUT:${index}`);
    if (typeof member.findingId !== 'string' || !ID_RE.test(member.findingId)) fail(`FINDING_INTEL_INVALID_CLASS_INPUT:${index}.findingId`);
    if (typeof member.sourceScope !== 'string' || !ID_RE.test(member.sourceScope)) fail(`FINDING_INTEL_INVALID_CLASS_INPUT:${index}.sourceScope`);
    const invariant = member.semanticContractId ?? member.expectationId;
    if (invariant === null) continue;
    const list = byInvariant.get(invariant) ?? [];
    list.push(member);
    byInvariant.set(invariant, list);
  }
  const classes: DefectClass[] = [];
  for (const [invariant, list] of [...byInvariant.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (list.length < 2) continue;
    const replayOutcomes = new Set(list.map((member) => member.replayOutcome));
    const counterexamples = list
      .filter((member) => member.replayOutcome === 'INVALID')
      .map((member) => `${member.findingId}: replay INVALID while class members replay otherwise`);
    const scopes = [...new Set(list.map((member) => member.sourceScope))].sort();
    const classId = `defect-class:${sha256Hex(invariant).slice(0, 16)}`;
    classes.push({
      schemaVersion: FINDING_INTEL_VERSION,
      classId,
      sharedInvariant: invariant,
      memberFindingIds: list.map((member) => member.findingId).sort(),
      sourceScope: scopes.length === 1 ? (scopes[0] as string) : `MULTI_SCOPE:${scopes.join('+')}`,
      mechanicalEvidence: [
        `${list.length} independent findings share invariant ${invariant}`,
        replayOutcomes.size === 1 ? `uniform replay outcome ${[...replayOutcomes][0]}` : 'mixed replay outcomes (see counterexamples)',
      ],
      counterexamples,
      confidence: counterexamples.length === 0 ? 'SUPPORTED' : 'TENTATIVE',
      unknowns: scopes.length === 1 ? [] : ['class spans multiple source scopes; shared cause unproven across scopes'],
    });
  }
  return classes;
}

const PROVENANCE_RANK: Readonly<Record<ExpectationProvenance, number>> = {
  MACHINE_CONTRACT: 0,
  OPENSPEC_REQUIREMENT: 1,
  SCHEMA_INVARIANT: 2,
  PROTOCOL_CONTRACT: 3,
  SOURCE_INVARIANT: 4,
  TEST_ORACLE: 5,
  SEMANTIC_ORACLE: 6,
  SYNTHETIC_ORACLE: 7,
  HEURISTIC: 8,
  UNKNOWN: 9,
};
const PROVENANCE_SET: ReadonlySet<string> = new Set<string>(EXPECTATION_PROVENANCE);

 /** Strongest provenance first; ties preserve input order (stable, deterministic). */
export function strongestProvenance(provenances: readonly ExpectationProvenance[]): ExpectationProvenance {
  if (!Array.isArray(provenances) || provenances.length === 0) fail('FINDING_INTEL_INVALID_PROVENANCE');
  // Array.isArray narrows readonly T[] to any[]; rebind to keep element types.
  const ranked: readonly ExpectationProvenance[] = provenances;
  let best: ExpectationProvenance = 'UNKNOWN';
  let bestRank: number = PROVENANCE_RANK.UNKNOWN;
  for (const provenance of ranked) {
    if (!PROVENANCE_SET.has(provenance)) fail('FINDING_INTEL_INVALID_PROVENANCE');
    const rank: number = PROVENANCE_RANK[provenance];
    if (rank < bestRank) {
      best = provenance;
      bestRank = rank;
    }
   }
   return best;
 }

const WEAK_PROVENANCE: ReadonlySet<ExpectationProvenance> = new Set<ExpectationProvenance>(['SYNTHETIC_ORACLE', 'HEURISTIC', 'UNKNOWN']);

/**
 * Weak expectation provenance must not masquerade as confirmed defect
 * evidence: HEURISTIC/SYNTHETIC_ORACLE/UNKNOWN provenance caps confidence
 * at TENTATIVE no matter what the caller claims.
 */
export function provenanceCapsConfidence(provenance: ExpectationProvenance, claimed: IntelConfidence): IntelConfidence {
  if (!EXPECTATION_PROVENANCE.includes(provenance)) fail('FINDING_INTEL_INVALID_PROVENANCE');
  if (!['PROVEN', 'HIGH_CONFIDENCE', 'SUPPORTED', 'TENTATIVE', 'INSUFFICIENT'].includes(claimed)) {
    fail('FINDING_INTEL_INVALID_CONFIDENCE');
  }
  if (provenance === 'UNKNOWN' || provenance === 'HEURISTIC') {
    if (claimed === 'PROVEN' || claimed === 'HIGH_CONFIDENCE' || claimed === 'SUPPORTED') return 'TENTATIVE';
    return claimed;
  }
  if (provenance === 'SYNTHETIC_ORACLE' && (claimed === 'PROVEN' || claimed === 'HIGH_CONFIDENCE')) return 'SUPPORTED';
  if (claimed === 'PROVEN' && !WEAK_PROVENANCE.has(provenance)) return claimed;
  return claimed;
}

/** PROVEN confidence requires machine-grade provenance; anything weaker fails closed. */
export function assertProvenConfidence(provenance: ExpectationProvenance): void {
  if (provenance !== 'MACHINE_CONTRACT' && provenance !== 'SCHEMA_INVARIANT' && provenance !== 'PROTOCOL_CONTRACT') {
    fail(`FINDING_INTEL_PROVEN_REQUIRES_MECHANICAL:${provenance}`);
  }
}

/** Stable digest of the intel-relevant semantic input (order-independent member order). */
export function defectClassDigest(defectClass: DefectClass): string {
  return sha256Hex(
    stableJsonSorted({
      sharedInvariant: defectClass.sharedInvariant,
      members: defectClass.memberFindingIds,
      evidence: defectClass.mechanicalEvidence,
    }),
  ).slice(0, 24);
}
