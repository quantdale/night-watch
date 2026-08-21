// ---------------------------------------------------------------------------
// Phase 15P A04 — versioned-DTO dispatch registry.
//
// The single place where "which versions of this DTO can still be read" is
// declared and enforced, replacing scattered ad-hoc version checks. Dispatch
// reads the payload's version discriminator, routes to the registered
// historical validator for that exact version, then runs the kind's
// declared coherence rules and aggregates failures deterministically.
//
// Fails closed on unknown kinds, unknown versions, malformed discriminators,
// shape failures, and coherence violations — always with stable,
// privacy-safe codes: bounded structural tokens only; payload-derived
// suffixes are charset-screened, sentinel-screened, and length-capped, and
// suppressed entirely when they do not match the established code idiom.
// Pure module: no fs/network/child-process/DB/AI/persistence authority.
// ---------------------------------------------------------------------------

import type {
  DtoCoherenceRule,
  DtoKindRegistration,
  DtoShapeResult,
  DtoValidationContext,
  DtoVersionValidator,
  DtoVersionedValidationResult,
} from './types';
import { DEFAULT_DTO_VERSION_FIELD } from './types';

const DTO_KIND_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
const DTO_VERSION_KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
const DTO_VERSION_FIELD_RE = /^[A-Za-z0-9_]{1,64}$/;
const DTO_RULE_ID_RE = /^[A-Z][A-Z0-9_]{0,127}$/;

/** Stable-code suffix idiom (see e.g. SEMANTIC_RECEIPT_INVALID:<detail>,
 *  REPLAY_PLAN_UNKNOWN_FIELD:<key>): bounded, no whitespace/control chars. */
const CODE_SUFFIX_RE = /^[A-Za-z0-9_.:@%/,~-]{1,180}$/;
/** Same sentinel screen the lifecycle reason codes use: an error-detail
 *  suffix that looks like a credential/raw value is suppressed, not echoed. */
const CODE_SUFFIX_SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
const STABLE_CODE_PREFIX_RE = /^[A-Z][A-Z0-9_]{0,127}$/;

interface RegisteredDtoKind {
  readonly kind: string;
  readonly versionField: string;
  readonly versions: ReadonlyMap<string, DtoVersionValidator>;
  readonly coherence: readonly DtoCoherenceRule<unknown>[];
}

const registeredKinds = new Map<string, RegisteredDtoKind>();

function sanitizeCodeSuffix(value: unknown): string {
  if (typeof value !== 'string') return 'UNSAFE_TOKEN_SUPPRESSED';
  const stripped = value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180);
  if (!CODE_SUFFIX_RE.test(stripped) || CODE_SUFFIX_SENTINEL_RE.test(stripped)) return 'UNSAFE_TOKEN_SUPPRESSED';
  return stripped;
}

/**
 * Normalize a thrown error from an underlying validator into a stable,
 * privacy-safe code. Errors matching the house `PREFIX` /
 * `PREFIX:suffix` idiom keep their (sanitized) identity; anything else —
 * including raw TypeError text that could echo payload content — collapses
 * to one generic token.
 */
export function stableUnderlyingErrorCode(error: unknown): string {
  if (!(error instanceof Error) || typeof error.message !== 'string') return 'UNDERLYING_VALIDATOR_THREW';
  const colon = error.message.indexOf(':');
  const prefix = colon === -1 ? error.message : error.message.slice(0, colon);
  if (!STABLE_CODE_PREFIX_RE.test(prefix)) return 'UNDERLYING_VALIDATOR_THREW';
  if (colon === -1) return prefix;
  return `${prefix}:${sanitizeCodeSuffix(error.message.slice(colon + 1))}`;
}

function registrationInvalid(reason: string): never {
  throw new Error(`DTO_REGISTRATION_INVALID:${reason}`);
}

/**
 * Register one DTO kind with its readable-version → validator map and its
 * cross-field coherence rules. Throws `DTO_KIND_ALREADY_REGISTERED:<kind>`
 * on re-registration of an existing kind (the registry is the single
 * compatibility declaration; silent replacement would be drift). Throws
 * `DTO_REGISTRATION_INVALID:<reason>` for any malformed registration field.
 */
export function registerDtoKind<V>(registration: DtoKindRegistration<V>): void {
  const kind = registration.kind;
  if (typeof kind !== 'string' || !DTO_KIND_RE.test(kind)) registrationInvalid('KIND');
  if (registeredKinds.has(kind)) throw new Error(`DTO_KIND_ALREADY_REGISTERED:${kind}`);
  const versionField = registration.versionField ?? DEFAULT_DTO_VERSION_FIELD;
  if (typeof versionField !== 'string' || !DTO_VERSION_FIELD_RE.test(versionField)) registrationInvalid('VERSION_FIELD');
  const versionEntries = Object.entries(registration.versions);
  if (versionEntries.length === 0) registrationInvalid('EMPTY_VERSIONS');
  const versions = new Map<string, DtoVersionValidator>();
  for (const [version, validator] of versionEntries) {
    if (!DTO_VERSION_KEY_RE.test(version)) registrationInvalid('VERSION_KEY');
    if (versions.has(version)) registrationInvalid('DUPLICATE_VERSION');
    if (typeof validator !== 'function') registrationInvalid('VALIDATOR');
    versions.set(version, validator as DtoVersionValidator);
  }
  // Erase the kind's DTO type exactly once, at this boundary.
  const coherence: readonly DtoCoherenceRule<unknown>[] = (registration.coherence ?? []).map((rule) => {
    if (typeof rule.ruleId !== 'string' || !DTO_RULE_ID_RE.test(rule.ruleId)) registrationInvalid('RULE_ID');
    if (typeof rule.evaluate !== 'function') registrationInvalid('RULE_EVALUATE');
    return { ruleId: rule.ruleId, evaluate: (dto: unknown) => rule.evaluate(dto as V) };
  });
  registeredKinds.set(kind, Object.freeze({ kind, versionField, versions: Object.freeze(versions), coherence: Object.freeze(coherence) }));
}

export function hasDtoKind(kind: string): boolean {
  return registeredKinds.has(kind);
}

/** The compatibility surface of one kind: every payload version that can
 *  still be read, in declaration order. Unknown kinds yield an empty list —
 *  callers treat that as unreadable, never as "any version". */
export function getReadableDtoVersions(kind: string): readonly string[] {
  const registered = registeredKinds.get(kind);
  return registered === undefined ? [] : [...registered.versions.keys()];
}

/** All registered kind identifiers in declaration order. */
export function getRegisteredDtoKinds(): readonly string[] {
  return [...registeredKinds.keys()];
}

const MAX_COHERENCE_DETAIL_LENGTH = 480;

/**
 * Validate one versioned durable DTO:
 * 1. resolve the kind (unknown ⇒ `DTO_KIND_UNKNOWN`);
 * 2. require a record payload and read its version discriminator
 *    (`DTO_PAYLOAD_NOT_RECORD`, `DTO_VERSION_DISCRIMINATOR_MISSING/INVALID`);
 * 3. dispatch to the registered historical validator for that exact version
 *    (`DTO_VERSION_UNKNOWN` otherwise);
 * 4. run the kind's coherence rules in declaration order, aggregating all
 *    violations into one deterministic `DTO_COHERENCE_VIOLATION` code.
 *
 * Never throws on invalid input: failures are results, so batch validation
 * over evidence stores stays deterministic end-to-end. The optional context
 * is passed through verbatim for validators bound to a companion DTO.
 */
export function validateVersionedDto<V = unknown>(
  kind: string,
  value: unknown,
  context: DtoValidationContext = {},
): DtoVersionedValidationResult<V> {
  const registered = registeredKinds.get(kind);
  if (registered === undefined) return { valid: false, code: `DTO_KIND_UNKNOWN:${sanitizeCodeSuffix(kind)}` };
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, code: 'DTO_PAYLOAD_NOT_RECORD' };
  }
  const record = value as Record<string, unknown>;
  const discriminator = record[registered.versionField];
  if (discriminator === undefined) {
    return { valid: false, code: `DTO_VERSION_DISCRIMINATOR_MISSING:${registered.versionField}` };
  }
  if (typeof discriminator !== 'string') {
    return { valid: false, code: `DTO_VERSION_DISCRIMINATOR_INVALID:${registered.versionField}` };
  }
  const validator = registered.versions.get(discriminator);
  if (validator === undefined) {
    return { valid: false, code: `DTO_VERSION_UNKNOWN:${sanitizeCodeSuffix(discriminator)}` };
  }
  let shape: DtoShapeResult;
  try {
    shape = validator(value, context);
  } catch (error) {
    shape = { valid: false, code: stableUnderlyingErrorCode(error) };
  }
  if (!shape.valid) return { valid: false, code: `DTO_SHAPE_INVALID:${sanitizeCodeSuffix(shape.code)}` };
  const violations: string[] = [];
  for (const rule of registered.coherence) {
    let violation = null;
    try {
      violation = rule.evaluate(shape.dto);
    } catch (error) {
      violation = { ruleId: rule.ruleId, code: stableUnderlyingErrorCode(error) };
    }
    if (violation !== null) violations.push(violation.code === '' ? violation.ruleId : `${violation.ruleId}:${violation.code}`);
  }
  if (violations.length > 0) {
    const detail = violations.join(',').slice(0, MAX_COHERENCE_DETAIL_LENGTH);
    return { valid: false, code: `DTO_COHERENCE_VIOLATION:${detail}` };
  }
  return { valid: true, kind, version: discriminator, dto: shape.dto as V };
}
