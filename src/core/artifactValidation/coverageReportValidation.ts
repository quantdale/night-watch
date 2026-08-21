// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A11) — strict validator for the Phase 14A contract
// coverage report artifact (`nightwatch.contract-coverage-report.v1`).
//
// `oracles/expectations/extract/contractCoverageReport.ts` only *builds* the
// report and its evidence digest; no standalone structural validator existed.
// This validator composes the module's own digest function
// (`contractCoverageReportDigest`) so the persisted `digest` must re-derive
// exactly over the normalized report body — tampered or hand-invented reports
// fail closed — and adds exact-key/shape/coherence checks around it.
//
// Read-only and pure: no fs/network/child-process/DB/AI authority.
// ---------------------------------------------------------------------------

import { REPORT_VERSION, contractCoverageReportDigest, type ContractCoverageReport } from '../../oracles/expectations/extract/contractCoverageReport';
import {
  assertExactKeys,
  assertNonNegativeInteger,
  assertString,
  assertUniqueStrings,
  isRuntimeRecord,
  requireRuntimeArray,
  requireRuntimeRecord,
  type RuntimeRecord,
} from '../campaign/runtimeValidation';

const REPORT_KEYS = [
  'reportVersion', 'approvedTargetCount', 'admittedHistoricalCount', 'admittedCollectionCount',
  'depthClasses', 'proofClasses', 'blockersByCode', 'driftClasses',
  'normalizedEvidenceIdentities', 'contractAdditionsSinceBaseline', 'contractStrengtheningsSinceBaseline',
  'depthUpliftedSinceBaseline', 'unresolvedMechanicalCoverageGaps', 'privacySafe', 'digest',
] as const;

const EVIDENCE_IDENTITY_KEYS = ['targetId', 'disposition', 'evidenceDigest', 'analyzerVersion', 'driftClass'] as const;
const UNRESOLVED_GAP_KEYS = ['targetId', 'disposition', 'blockerCode'] as const;
const PROOF_CLASS_KEYS = ['proven', 'ambiguous', 'unsupported', 'unavailable'] as const;

const EVIDENCE_DIGEST_RE = /^ev:sha256:[0-9a-f]{24}$/;

function invalid(reason: string): never {
  throw new Error(`ARTIFACT_COVERAGE_REPORT_INVALID:${reason}`);
}

function assertCountRecord(value: unknown, code: string): void {
  const record = requireRuntimeRecord(value, code);
  for (const [key, count] of Object.entries(record)) {
    if (!Number.isInteger(count) || (count as number) < 0) invalid(`${code}_ENTRY:${key}`);
  }
}

/**
 * Strict validation of one persisted contract coverage report. The stored
 * `digest` must equal `contractCoverageReportDigest` over the exact report
 * body. Throws ARTIFACT_COVERAGE_REPORT_INVALID:* on any violation.
 */
export function validateCoverageReportArtifact(value: unknown): void {
  if (!isRuntimeRecord(value)) invalid('OBJECT_REQUIRED');
  const report = value as RuntimeRecord;
  assertExactKeys(report, REPORT_KEYS, 'ARTIFACT_COVERAGE_REPORT_INVALID');
  if (report.reportVersion !== REPORT_VERSION) invalid('REPORT_VERSION');
  if (report.privacySafe !== true) invalid('PRIVACY_SAFE_MUST_BE_TRUE');
  for (const key of ['approvedTargetCount', 'admittedHistoricalCount', 'admittedCollectionCount', 'depthUpliftedSinceBaseline'] as const) {
    assertNonNegativeInteger(report[key], `ARTIFACT_COVERAGE_REPORT_INVALID:${key}`);
  }
  assertCountRecord(report.depthClasses, 'ARTIFACT_COVERAGE_REPORT_INVALID:DEPTH_CLASSES');
  assertCountRecord(report.blockersByCode, 'ARTIFACT_COVERAGE_REPORT_INVALID:BLOCKERS_BY_CODE');
  assertCountRecord(report.driftClasses, 'ARTIFACT_COVERAGE_REPORT_INVALID:DRIFT_CLASSES');

  const proofClasses = requireRuntimeRecord(report.proofClasses, 'ARTIFACT_COVERAGE_REPORT_INVALID:PROOF_CLASSES_OBJECT_REQUIRED');
  for (const [proofClass, bucketValue] of Object.entries(proofClasses)) {
    const bucket = requireRuntimeRecord(bucketValue, `ARTIFACT_COVERAGE_REPORT_INVALID:PROOF_CLASS:${proofClass}`);
    assertExactKeys(bucket, PROOF_CLASS_KEYS, `ARTIFACT_COVERAGE_REPORT_INVALID:PROOF_CLASS:${proofClass}`);
    for (const key of PROOF_CLASS_KEYS) assertNonNegativeInteger(bucket[key], `ARTIFACT_COVERAGE_REPORT_INVALID:PROOF_CLASS:${proofClass}:${key}`);
  }

  const identities = requireRuntimeArray(report.normalizedEvidenceIdentities, 'ARTIFACT_COVERAGE_REPORT_INVALID:EVIDENCE_IDENTITIES');
  for (const entryValue of identities) {
    const entry = requireRuntimeRecord(entryValue, 'ARTIFACT_COVERAGE_REPORT_INVALID:EVIDENCE_IDENTITY');
    assertExactKeys(entry, EVIDENCE_IDENTITY_KEYS, 'ARTIFACT_COVERAGE_REPORT_INVALID:EVIDENCE_IDENTITY');
    assertString(entry.targetId, 'ARTIFACT_COVERAGE_REPORT_INVALID:EVIDENCE_IDENTITY_TARGET');
    assertString(entry.disposition, 'ARTIFACT_COVERAGE_REPORT_INVALID:EVIDENCE_IDENTITY_DISPOSITION');
    assertString(entry.analyzerVersion, 'ARTIFACT_COVERAGE_REPORT_INVALID:EVIDENCE_IDENTITY_ANALYZER_VERSION');
    if (entry.evidenceDigest !== null && !EVIDENCE_DIGEST_RE.test(entry.evidenceDigest as string)) {
      invalid('EVIDENCE_IDENTITY_DIGEST_PATTERN');
    }
    if (entry.driftClass !== null && (typeof entry.driftClass !== 'string' || entry.driftClass.length === 0)) {
      invalid('EVIDENCE_IDENTITY_DRIFT_CLASS');
    }
  }
  if (report.approvedTargetCount !== identities.length) invalid('APPROVED_TARGET_COUNT_MISMATCH');

  assertUniqueStrings(requireRuntimeArray(report.contractAdditionsSinceBaseline, 'ARTIFACT_COVERAGE_REPORT_INVALID:ADDITIONS'), 'ARTIFACT_COVERAGE_REPORT_INVALID:ADDITIONS');
  assertUniqueStrings(requireRuntimeArray(report.contractStrengtheningsSinceBaseline, 'ARTIFACT_COVERAGE_REPORT_INVALID:STRENGTHENINGS'), 'ARTIFACT_COVERAGE_REPORT_INVALID:STRENGTHENINGS');

  const gaps = requireRuntimeArray(report.unresolvedMechanicalCoverageGaps, 'ARTIFACT_COVERAGE_REPORT_INVALID:UNRESOLVED_GAPS');
  for (const gapValue of gaps) {
    const gap = requireRuntimeRecord(gapValue, 'ARTIFACT_COVERAGE_REPORT_INVALID:UNRESOLVED_GAP');
    assertExactKeys(gap, UNRESOLVED_GAP_KEYS, 'ARTIFACT_COVERAGE_REPORT_INVALID:UNRESOLVED_GAP');
    assertString(gap.targetId, 'ARTIFACT_COVERAGE_REPORT_INVALID:UNRESOLVED_GAP_TARGET');
    assertString(gap.disposition, 'ARTIFACT_COVERAGE_REPORT_INVALID:UNRESOLVED_GAP_DISPOSITION');
    if (gap.blockerCode !== null && (typeof gap.blockerCode !== 'string' || gap.blockerCode.length === 0)) {
      invalid('UNRESOLVED_GAP_BLOCKER_CODE');
    }
  }

  // Digest recomposition over the exact normalized body (module's own function).
  assertString(report.digest, 'ARTIFACT_COVERAGE_REPORT_INVALID:DIGEST');
  if (!EVIDENCE_DIGEST_RE.test(report.digest)) invalid('DIGEST_PATTERN');
  const { digest: _stored, ...body } = report;
  let expectedDigest: string;
  try {
    expectedDigest = contractCoverageReportDigest(body as unknown as Omit<ContractCoverageReport, 'digest'>);
  } catch (error) {
    invalid(error instanceof Error ? error.message : 'DIGEST_DERIVATION_FAILED');
  }
  if (report.digest !== expectedDigest) invalid('DIGEST_MISMATCH');
}
