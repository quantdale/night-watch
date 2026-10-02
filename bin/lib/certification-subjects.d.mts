// Types for the closed certification subject table (`bin/lib/certification-subjects.mjs`).
export interface CertificationSubject {
  readonly id: string;
  readonly kind: 'CONDITION' | 'LANE';
  readonly route: 'CERTIFICATION' | 'UI_HARNESS' | 'GATE_COPY' | 'CLEAN_COPY' | 'NONE';
  readonly producer: 'PROJECT_CHECK' | 'COMMAND' | 'OBSERVE_CI' | 'COPY_THROUGH' | 'UNAVAILABLE';
  readonly command: readonly string[] | null;
  readonly checkOf: string | null;
}
export const CERTIFICATION_SUBJECTS: readonly CertificationSubject[];
export const CERTIFICATION_SCHEMA_SUBJECTS: readonly string[];
export function certificationSubject(id: string): CertificationSubject | null;
export const CERTIFICATION_EVIDENCE_DIRECTORY: 'evidence/certification';
