// ---------------------------------------------------------------------------
// NW-HIST-004 (Wave 2) — record-identity orchestration over the injected
// sibling-source boundary.
//
// Reads ONLY the declared paths of the declared repositories at the declared
// snapshots, extracts bounded structural facts, runs the deterministic
// sequences, and returns a sanitized report. No product code executes, no
// datastore is contacted, and no verdict is a production-state claim.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import type { RealSourceCurrentness, RealSourceReader } from '../../oracles/expectations/recipes/types';
import {
  RECORD_IDENTITY_EXTRACTION_IDENTITY,
  RECORD_IDENTITY_REPORT_SCHEMA,
  validateRecordIdentityContractConfig,
  type RecordIdentityContract,
  type RecordIdentityReasonCode,
  type RecordIdentityVerdict,
} from './recordIdentityContract';
import { extractRecordIdentityFacts, type RecordIdentityFunctionFacts } from './recordIdentityShapes';
import { runRecordIdentitySequences, type RecordIdentitySequenceResult } from './recordIdentitySequences';

export interface RecordIdentityContractReport {
  readonly contractId: string;
  readonly repoId: string;
  readonly declaredSha: string;
  readonly snapshotSha: string | null;
  readonly paths: readonly string[];
  readonly functions: readonly RecordIdentityFunctionFacts[];
  readonly sequences: readonly RecordIdentitySequenceResult[];
  readonly verdict: RecordIdentityVerdict;
  readonly reasonCodes: readonly RecordIdentityReasonCode[];
}

export interface RecordIdentityReport {
  readonly schemaVersion: typeof RECORD_IDENTITY_REPORT_SCHEMA;
  readonly extractionIdentity: typeof RECORD_IDENTITY_EXTRACTION_IDENTITY;
  readonly productionStateClaim: 'NONE';
  readonly syntheticReproductionOnly: true;
  readonly contracts: readonly RecordIdentityContractReport[];
  readonly reportDigest: string;
}

const VERDICT_SEVERITY: Readonly<Record<RecordIdentityVerdict, number>> = Object.freeze({
  SOURCE_UNAVAILABLE: 0,
  SOURCE_STALE: 0,
  DECLARATION_INVALID: 0,
  EXTRACTION_AMBIGUOUS: 1,
  DERIVED_RECORD_ORPHAN_REPRODUCED: 2,
  DUPLICATE_IDENTITY_REPRODUCED: 3,
  MODEL_INSUFFICIENT: 4,
  IDENTITY_CONTRACT_PRESERVED: 5,
});

function worstVerdict(verdicts: readonly RecordIdentityVerdict[]): RecordIdentityVerdict {
  return verdicts.reduce((worst, candidate) => (VERDICT_SEVERITY[candidate] < VERDICT_SEVERITY[worst] ? candidate : worst));
}

function applyExclusions(
  facts: readonly RecordIdentityFunctionFacts[],
  exclusions: readonly string[],
): readonly RecordIdentityFunctionFacts[] {
  if (exclusions.length === 0) return facts;
  return facts.map((entry) => ({
    ...entry,
    shapes: entry.shapes.filter((shape) => !exclusions.includes(shape.digest)),
  }));
}

function evaluateContract(
  contract: RecordIdentityContract,
  reader: RealSourceReader,
  currentness: RealSourceCurrentness,
): RecordIdentityContractReport {
  const base = {
    contractId: contract.contractId,
    repoId: contract.repoId,
    declaredSha: contract.sha,
    paths: contract.paths,
    functions: [] as readonly RecordIdentityFunctionFacts[],
    sequences: [] as readonly RecordIdentitySequenceResult[],
  };
  const snapshot = currentness.currentSnapshot(contract.repoId);
  if (snapshot === null || !/^[0-9a-f]{40}$/.test(snapshot.sha)) {
    return { ...base, snapshotSha: null, verdict: 'SOURCE_UNAVAILABLE', reasonCodes: [] };
  }
  if (snapshot.sha !== contract.sha) {
    return { ...base, snapshotSha: snapshot.sha, verdict: 'SOURCE_STALE', reasonCodes: [] };
  }
  const facts: RecordIdentityFunctionFacts[] = [];
  const ambiguous: { symbol: string; detail: string }[] = [];
  const unresolved = new Set(contract.functions);
  for (const relativePath of contract.paths) {
    if (unresolved.size === 0) break;
    const source = reader.readFile(contract.repoId, relativePath);
    if (source === null) {
      return { ...base, snapshotSha: snapshot.sha, verdict: 'SOURCE_UNAVAILABLE', reasonCodes: [] };
    }
    const extraction = extractRecordIdentityFacts(source, { functions: [...unresolved] });
    for (const extracted of extraction.functions) {
      facts.push(extracted);
      unresolved.delete(extracted.symbol);
    }
    for (const entry of extraction.ambiguous) ambiguous.push(entry);
  }
  for (const symbol of unresolved) ambiguous.push({ symbol, detail: 'FUNCTION_NOT_FOUND' });
  const excluded = applyExclusions(facts, contract.exclusions);
  if (ambiguous.length > 0) {
    return {
      ...base,
      snapshotSha: snapshot.sha,
      functions: excluded,
      sequences: [],
      verdict: 'EXTRACTION_AMBIGUOUS',
      reasonCodes: ambiguous.some((entry) => entry.detail === 'FUNCTION_NOT_FOUND') ? ['FUNCTION_NOT_FOUND'] : ['UNSUPPORTED_CONSTRUCTION'],
    };
  }
  const sequences = runRecordIdentitySequences(contract, excluded);
  const sequenceVerdicts: RecordIdentityVerdict[] = sequences.map((sequence) => {
    if (sequence.outcome === 'DUPLICATE_IDENTITY_REPRODUCED') return 'DUPLICATE_IDENTITY_REPRODUCED' as const;
    if (sequence.outcome === 'DERIVED_RECORD_ORPHAN_REPRODUCED') return 'DERIVED_RECORD_ORPHAN_REPRODUCED' as const;
    if (sequence.outcome === 'MODEL_INSUFFICIENT') return 'MODEL_INSUFFICIENT' as const;
    return 'IDENTITY_CONTRACT_PRESERVED' as const;
  });
  const applicable = sequences.some((sequence) => sequence.outcome !== 'NOT_APPLICABLE');
  const verdict: RecordIdentityVerdict = applicable ? worstVerdict(sequenceVerdicts) : 'MODEL_INSUFFICIENT';
  const reasonCodes = [...new Set(sequences.flatMap((sequence) => sequence.reasonCodes))].sort() as RecordIdentityReasonCode[];
  return { ...base, snapshotSha: snapshot.sha, functions: excluded, sequences, verdict, reasonCodes };
}

/** Sanitized record-identity report over the declared registry. */
export function runRecordIdentityContracts(input: {
  readonly config: unknown;
  readonly reader: RealSourceReader;
  readonly currentness: RealSourceCurrentness;
}): RecordIdentityReport {
  const validation = validateRecordIdentityContractConfig(input.config);
  const contracts: readonly RecordIdentityContractReport[] = validation.ok
    ? validation.config.contracts.map((contract) => evaluateContract(contract, input.reader, input.currentness))
    : [{
        contractId: 'invalid',
        repoId: '',
        declaredSha: '',
        snapshotSha: null,
        paths: [],
        functions: [],
        sequences: [],
        verdict: 'DECLARATION_INVALID',
        reasonCodes: [],
      }];
  const report = {
    schemaVersion: RECORD_IDENTITY_REPORT_SCHEMA,
    extractionIdentity: RECORD_IDENTITY_EXTRACTION_IDENTITY,
    productionStateClaim: 'NONE' as const,
    syntheticReproductionOnly: true as const,
    contracts,
  };
  return { ...report, reportDigest: prefixedDigest24('rid', report) };
}
