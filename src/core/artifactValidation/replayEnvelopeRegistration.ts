// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A11 round 2) — registration point for the reserved
// `replay-result-envelope` artifact kind.
//
// The ReplayResultEnvelope module (Phase 15P A06) lands on a sibling branch
// and is deliberately NOT imported here — this seam is the ONLY integration
// surface its validator needs once both branches converge:
//
//   import { registerReplayResultEnvelopeValidator } from
//     '../artifactValidation/replayEnvelopeRegistration';
//   registerReplayResultEnvelopeValidator(validateReplayResultEnvelope);
//
// Fail-closed guarantees are preserved:
// - the reserved kind is NOT in KNOWN_ARTIFACT_KINDS and validateArtifact
//   rejects it with ARTIFACT_KIND_RESERVED while it is unregistered;
// - exactly one validator can ever be registered (double registration throws);
// - the registered validator receives the same read-only context contract as
//   every static kind and its rejections surface as ordinary invalid results.
// ---------------------------------------------------------------------------

import type { ArtifactValidationContext, ArtifactValidationResult } from './types';

/** The kind name reserved for the A06 ReplayResultEnvelope artifact. */
export const REPLAY_RESULT_ENVELOPE_RESERVED_KIND = 'replay-result-envelope' as const;

/** Same signature as the facade's internal per-kind validators. */
export type ReservedKindValidator = (value: unknown, context: ArtifactValidationContext) => void;

let registeredValidator: ReservedKindValidator | undefined;

/**
 * Register THE ReplayResultEnvelope validator. Throws on a second
 * registration — the envelope has one owning module and one validator.
 */
export function registerReplayResultEnvelopeValidator(validator: ReservedKindValidator): void {
  if (registeredValidator !== undefined) {
    throw new Error('ARTIFACT_REPLAY_ENVELOPE_ALREADY_REGISTERED');
  }
  if (typeof validator !== 'function') {
    throw new Error('ARTIFACT_REPLAY_ENVELOPE_VALIDATOR_REQUIRED');
  }
  registeredValidator = validator;
}

/** True once the A06 envelope validator has been registered. */
export function isReplayResultEnvelopeKindRegistered(): boolean {
  return registeredValidator !== undefined;
}

/**
 * Dispatch for the reserved kind. Returns null when the kind is not the
 * reserved envelope kind (caller falls through), otherwise always returns a
 * terminal ArtifactValidationResult — fail-closed when unregistered.
 */
export function validateReservedArtifactKind(
  kind: string,
  value: unknown,
  context: ArtifactValidationContext,
): ArtifactValidationResult | null {
  if (kind !== REPLAY_RESULT_ENVELOPE_RESERVED_KIND) return null;
  if (registeredValidator === undefined) {
    return { valid: false, kind, reason: 'ARTIFACT_KIND_RESERVED:REPLAY_RESULT_ENVELOPE_NOT_INTEGRATED' };
  }
  try {
    registeredValidator(value, context);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'REPLAY_RESULT_ENVELOPE_REJECTED';
    return { valid: false, kind, reason };
  }
  return { valid: true, kind, acceptedSchemaVersions: [] };
}
