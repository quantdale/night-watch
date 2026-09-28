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
}
export const EVIDENCE_BINDING_MAX_ARTIFACTS: number;

export function guardClassForPath(file: string): string | null;
export function isValuesOnlyBindingChange(
  beforeText: string | null,
  afterText: string | null,
): { valuesOnly: boolean; reason: string };
export function isAppendOnlyCorrectionsChange(
  beforeText: string | null,
  afterText: string | null,
): { appendOnly: boolean; reason: string };
export function guardHoldsForChange(file: string, beforeText: string | null, afterText: string | null): boolean;
export function parseEvidenceBinding(record: unknown): { ok: boolean; errors: string[]; binding: EvidenceBinding | null };
export function parseReleaseEvidence(record: unknown): { ok: boolean; errors: string[]; bindings: EvidenceBinding[] };
export function loadReleaseEvidenceBindings(
  root: string,
  options?: { requireFile?: boolean },
): { ok: boolean; present: boolean; errors: string[]; bySubject: Map<string, EvidenceBinding> };
export function loadDocumentRoleCorrections(
  root: string,
): { ok: boolean; errors: string[]; corrections: Array<{ id: string; path: string; oldLineSha256: string; oldLineExcerpt: string; reason: string }> };
export function legacyEvidenceSha(root: string, subject: string): string | null;
export function resolveEvidenceShaForSubject(root: string, subject: string): string | null;
