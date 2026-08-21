// ---------------------------------------------------------------------------
// Phase 15P A04 — durable-DTO versioning/coherence framework (shared types).
//
// One common strict infrastructure for durable DTOs: a registry declares,
// per DTO kind, WHICH historical payload versions can still be read and
// which validator owns each version, plus declarative cross-field coherence
// rules the framework runs after shape validation.
//
// Pure module: no fs/network/child-process/DB/AI/persistence/execution
// authority. Outcomes are deterministic; failures carry stable, privacy-safe
// error codes only (bounded structural tokens, never raw payload values).
// ---------------------------------------------------------------------------

/** Payload field carrying the version discriminator by default; this is the
 *  established Nightwatch durable-DTO idiom (schemaVersion). */
export const DEFAULT_DTO_VERSION_FIELD = 'schemaVersion' as const;

/** Immutable per-call context for validators whose authority is relative to
 *  a bound companion DTO (e.g. campaign checkpoint ⇄ campaign manifest).
 *  The framework never inspects, transforms, or persists context values. */
export type DtoValidationContext = Readonly<Record<string, unknown>>;

/** Result of one registered version validator (shape validation only). */
export type DtoShapeResult<V = unknown> =
  | { readonly valid: true; readonly dto: V }
  | { readonly valid: false; readonly code: string };

/**
 * A version validator composes an EXISTING public validator verbatim (the
 * registry never re-implements DTO rules). It receives the already-
 * discriminated payload and the caller context, and must fail closed.
 */
export type DtoVersionValidator<V = unknown> = (
  value: unknown,
  context: DtoValidationContext,
) => DtoShapeResult<V>;

/** One declarative cross-field coherence violation; codes are stable tokens. */
export interface DtoCoherenceViolation {
  readonly ruleId: string;
  readonly code: string;
}

/**
 * One declarative cross-field coherence rule. Must be total, pure, and
 * deterministic: same dto ⇒ same verdict. It runs only AFTER the shape
 * validator accepted the payload, so it may rely on the validated shape.
 */
export interface DtoCoherenceRule<V> {
  readonly ruleId: string;
  readonly evaluate: (dto: V) => DtoCoherenceViolation | null;
}

/** Registration contract for one DTO kind (see registerDtoKind). */
export interface DtoKindRegistration<V = unknown> {
  /** Stable kind identifier, e.g. 'nightwatch.semantic-evaluation-receipt'. */
  readonly kind: string;
  /** Payload field carrying the version discriminator; defaults to
   *  'schemaVersion'. Declared once per kind, not scattered per call site. */
  readonly versionField?: string;
  /** THE compatibility declaration: exactly the payload versions this kind
   *  can still be read as, each bound to the historical validator owning it.
   *  Anything absent here fails closed at dispatch time. */
  readonly versions: Readonly<Record<string, DtoVersionValidator<V>>>;
  /** Cross-field coherence rules, run in declaration order after the shape
   *  validator passes; violations are aggregated deterministically. */
  readonly coherence?: readonly DtoCoherenceRule<V>[];
}

/** Deterministic outcome of validateVersionedDto. On success `dto` is the
 *  value exactly as validated (never copied, normalized, or enriched). */
export type DtoVersionedValidationResult<V = unknown> =
  | { readonly valid: true; readonly kind: string; readonly version: string; readonly dto: V }
  | { readonly valid: false; readonly code: string };
