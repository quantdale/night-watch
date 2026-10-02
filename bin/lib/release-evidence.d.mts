// Types for the release-evidence bindings and document-role corrections
// guards (`bin/lib/release-evidence.mjs`).

export const RELEASE_EVIDENCE_SCHEMA: 'nightwatch.release-evidence.v1';
export const RELEASE_EVIDENCE_FILE: 'config/release-evidence.v1.json';
export const DOCUMENT_ROLE_CORRECTIONS_SCHEMA: 'nightwatch.document-role-corrections.v1';
export const DOCUMENT_ROLE_CORRECTIONS_FILE: 'config/document-role-corrections.v1.json';
export const EVIDENCE_BINDING_KEYS: readonly string[];
export const EVIDENCE_BINDING_VALUE_KEYS: readonly string[];
export const CORRECTION_ENTRY_KEYS: readonly string[];
export const GUARD_CLASSES: Readonly<Record<string, string>>;

export interface EvidenceBinding {
  readonly subject: string;
  readonly evidenceSha: string | null;
  readonly receiptDigest: string | null;
  readonly observedAt: string | null;
  readonly executor: string | null;
  /** VB-02: declared evidence-artifact paths (safe relative repo paths). */
  readonly artifactPaths: readonly string[];
  /** R3-08: false records the subject as non-certifying. */
  readonly certifying: boolean;
}
export const EVIDENCE_BINDING_MAX_ARTIFACTS: number;
export const LEGACY_PRE_REGISTERED_CORRECTION_IDS: readonly string[];
export function lineSha256Prefix(text: string): string;
export function appendedCorrectionEntries(
  beforeText: string | null,
  afterText: string | null,
): Array<{ id: string; path: string; oldLineSha256: string; oldLineExcerpt: string; reason: string }> | null;
export function isCorrectionAppendAdmissible(
  entry: { id: string; oldLineSha256: string },
  removedDigests: ReadonlySet<string>,
): { admissible: boolean; reason: string };
export function correctionStillExemptsArchive(entry: { oldLineSha256: string }, archiveText: string): boolean;

export function guardClassForPath(file: string): string | null;
export interface BindingReceiptVerifier {
  (subject: string, digest: string, sha: string): boolean;
}
export function isValuesOnlyBindingChange(
  beforeText: string | null,
  afterText: string | null,
  options?: { verifyReceipt?: BindingReceiptVerifier | undefined },
): { valuesOnly: boolean; reason: string };
export function isAppendOnlyCorrectionsChange(
  beforeText: string | null,
  afterText: string | null,
): { appendOnly: boolean; reason: string };
export function guardHoldsForChange(
  file: string,
  beforeText: string | null,
  afterText: string | null,
  options?: { verifyReceipt?: BindingReceiptVerifier | undefined },
): boolean;
export const RECEIPT_KINDS: Readonly<Record<'clean' | 'gate', {
  digestPrefix: string;
  directory: string;
  schemas: readonly string[];
  verdictFields: readonly string[];
  requireCleanEmit: boolean;
  subjects: readonly string[];
}>>;
export function receiptDeclaredSubjects(body: Record<string, unknown>): string[];
export function verifyPersistedReceipt(root: string, subject: string, digest: string, sha: string | null): { verified: boolean; reason: string };
export function productionBindingReceiptVerifier(root: string): (subject: string, digest: string, sha: string) => boolean;
export function stableCanonical(value: unknown): string;
export function parseEvidenceBinding(record: unknown): { ok: boolean; errors: string[]; binding: EvidenceBinding | null };
export function parseReleaseEvidence(record: unknown): { ok: boolean; errors: string[]; bindings: EvidenceBinding[] };
export function loadReleaseEvidenceBindings(
  root: string,
  options?: { requireFile?: boolean },
): { ok: boolean; present: boolean; errors: string[]; bySubject: Map<string, EvidenceBinding> };
export function loadDocumentRoleCorrections(
  root: string,
): { ok: boolean; errors: string[]; corrections: Array<{ id: string; path: string; oldLineSha256: string; oldLineExcerpt: string; reason: string }> };
export function parseDocumentRoleCorrections(
  record: unknown,
): { ok: boolean; errors: string[]; corrections: Array<{ id: string; path: string; oldLineSha256: string; oldLineExcerpt: string; reason: string }> };
export function resolveEvidenceShaForSubject(root: string, subject: string): string | null;
export function evidenceLaneDisagreements(
  conditions: ReadonlyArray<{ id: string; evidence?: unknown; evidenceSha: string | null }>,
  laneEvidence: ReadonlyMap<string, string | null>,
): string[];
export const CERTIFICATION_EVIDENCE_DIRECTORY: 'evidence/certification';
export function verifyReceiptBody(body: unknown, subject: string, digest: string, sha: string | null): { verified: boolean; reason: string };
export function parseEvidenceReceiptPath(file: string): { sha: string; subject: string } | null;
export function evidenceReceiptChangeHolds(file: string, beforeText: string | null, afterText: string | null): boolean;
