// Types for NW-08's validation-universe judgement. The classifier is pure and
// takes every input as data, so the same function that enforces the repository
// in `bin/hardening-check.mjs` is negative-probed on synthetic input by
// `tests/unit/nw08ValidationUniverse.test.ts`.

export interface ValidationUniverseClassDeclaration {
  /** Why this class is not in the authoritative gate. */
  readonly reason?: string;
  /** The lane that DOES cover these files. */
  readonly evidenceLane?: string;
  readonly files?: readonly string[];
}

export interface ValidationUniverseDeclaration {
  readonly schemaVersion?: string;
  /** Pinned digest over the discovered universe, gate selection and classification. */
  readonly inventoryDigest?: string;
  readonly classes?: Readonly<Record<string, ValidationUniverseClassDeclaration>>;
}

export interface ValidationUniverseInput {
  /** Every executable test or check that exists, by tracked path. */
  readonly discovered: readonly string[];
  /** What the REQUIRED gate lanes actually select. */
  readonly gateSelected: readonly string[];
  readonly declaration: ValidationUniverseDeclaration;
}

export interface ValidationUniverseViolation {
  readonly code: string;
  readonly detail: string;
}

export interface ValidationUniverseCounts {
  readonly discovered: number;
  readonly authoritativeGate: number;
  readonly classified: number;
  readonly unclassified: number;
  readonly byClass: Readonly<Record<string, number>>;
}

export interface ValidationUniverseJudgement {
  readonly ok: boolean;
  readonly schemaVersion: string;
  readonly digest: string;
  readonly counts: ValidationUniverseCounts;
  readonly byClass: Readonly<Record<string, readonly string[]>>;
  readonly unclassified: readonly string[];
  readonly errors: readonly ValidationUniverseViolation[];
}

/** Every violation found, deterministically ordered. Empty means the universe is complete. */
export function classifyValidationUniverse(input: ValidationUniverseInput): ValidationUniverseJudgement;

/** The digest over what exists, what the gate selects, and how the rest is classified. */
export function validationUniverseDigest(input: {
  readonly discovered: readonly string[];
  readonly gateSelected: readonly string[];
  readonly byClass: Readonly<Record<string, readonly string[]>>;
}): string;

/** Declarable exclusion classes. `AUTHORITATIVE_GATE` is derived, never declared. */
export const VALIDATION_EXCLUSION_CLASSES: readonly string[];
export const VALIDATION_UNIVERSE_SCHEMA: 'nightwatch.validation-universe.v1';
