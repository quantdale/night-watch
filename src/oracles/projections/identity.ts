// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — ProjectionContext: opaque in-memory identity and
// numeric correlation (SPEC §11, §12).
//
// - Maps raw string values -> opaque encounter-order tokens (`entity#0001`)
//   and raw numbers -> opaque numeric references (`numeric#0001`).
// - Tokens/refs never contain or hash the original value.
// - The map exists ONLY in memory; it is never serialized, logged, or
//   persisted (no toJSON; the class holds no persistence APIs).
// - Same raw value inside one context maps to the same token; encounter
//   ordering is deterministic for deterministic input (callers project
//   object keys in canonical order).
// - Hard entry caps; overflow throws SEMANTIC_PROJECTION_LIMIT_EXCEEDED.
// - The numeric table is readable ONLY by the numeric relation evaluator
//   (src/oracles/projections/numeric.ts) through `numericValue`.
// ---------------------------------------------------------------------------

import {
  DEFAULT_PROJECTION_LIMITS,
  SEMANTIC_PROJECTION_LIMIT_EXCEEDED,
  SEMANTIC_PROJECTION_UNSUPPORTED_INPUT,
  SemanticProjectionError,
  type ProjectionLimits,
} from './types';

const IDENTITY_TOKEN_PREFIX = 'entity';
const NUMERIC_REF_PREFIX = 'numeric';

/** Sanity bound for raw identity strings: longer values are unsupported
 *  input (they cannot be tokenized safely within the bounded model). */
const MAX_IDENTITY_RAW_LENGTH = 4096;

export class ProjectionContext {
  private readonly limits: ProjectionLimits;
  private readonly identityMap = new Map<string, string>();
  private readonly numericMap = new Map<number, string>();
  private identityCounter = 0;
  private numericCounter = 0;

  constructor(limits: ProjectionLimits = DEFAULT_PROJECTION_LIMITS) {
    this.limits = limits;
  }

  /** Opaque token for a raw string value. Deterministic for deterministic
   *  encounter order; the raw value never leaves this map. */
  tokenForString(raw: string): string {
    if (raw.length > MAX_IDENTITY_RAW_LENGTH) {
      throw new SemanticProjectionError(
        SEMANTIC_PROJECTION_LIMIT_EXCEEDED,
        'identity-value-too-large',
      );
    }
    const existing = this.identityMap.get(raw);
    if (existing !== undefined) return existing;
    if (this.identityMap.size >= this.limits.maxIdentityTokens) {
      throw new SemanticProjectionError(
        SEMANTIC_PROJECTION_LIMIT_EXCEEDED,
        'identity-token-cap',
      );
    }
    this.identityCounter += 1;
    const token = `${IDENTITY_TOKEN_PREFIX}#${String(this.identityCounter).padStart(4, '0')}`;
    this.identityMap.set(raw, token);
    return token;
  }

  /** Opaque reference for a raw numeric value. NaN/Infinity must be rejected
   *  by callers before this point (numeric.ts enforces it). */
  refForNumber(raw: number): string {
    if (!Number.isFinite(raw)) {
      throw new SemanticProjectionError(
        SEMANTIC_PROJECTION_UNSUPPORTED_INPUT,
        'non-finite-number',
      );
    }
    const existing = this.numericMap.get(raw);
    if (existing !== undefined) return existing;
    if (this.numericMap.size >= this.limits.maxNumericRefs) {
      throw new SemanticProjectionError(
        SEMANTIC_PROJECTION_LIMIT_EXCEEDED,
        'numeric-ref-cap',
      );
    }
    this.numericCounter += 1;
    const ref = `${NUMERIC_REF_PREFIX}#${String(this.numericCounter).padStart(4, '0')}`;
    this.numericMap.set(raw, ref);
    return ref;
  }

  /** In-memory numeric lookup used ONLY by the numeric relation evaluator.
   *  Returns the ephemeral raw value; never persisted. */
  numericValue(ref: string): number | undefined {
    for (const [value, candidate] of this.numericMap) {
      if (candidate === ref) return value;
    }
    return undefined;
  }

  /** In-memory identity token lookup used ONLY by the cross-step invariant
   *  layer to correlate projections (token equality within one context). */
  tokenFor(raw: string): string | undefined {
    return this.identityMap.get(raw);
  }

  get identityCount(): number {
    return this.identityMap.size;
  }

  get numericCount(): number {
    return this.numericMap.size;
  }

  /** Explicitly prevent accidental JSON.stringify serialization: the context
   *  must never become a recorder/dossier payload. */
  toJSON(): never {
    throw new Error('SEMANTIC_PROJECTION_PRIVACY_VIOLATION:ProjectionContext-serialization-forbidden');
  }
}
