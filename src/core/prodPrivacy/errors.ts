// ---------------------------------------------------------------------------
// Nightwatch C-10 — categorical production-privacy failures.
//
// Every failure in the production privacy cone is a FIXED reason code drawn
// from a closed vocabulary, optionally qualified by a FIXED detail code drawn
// from a second closed vocabulary. No caller value, no key literal, no scalar
// and no raw byte may ever be interpolated into a message: the constructor
// physically cannot accept a free string.
//
// This module is part of the PURE cone: no fs, no net, no process.
// ---------------------------------------------------------------------------

export const PRODUCTION_PRIVACY_REASON_CODES = [
  'PRODUCTION_PRIVACY_LIMIT_EXCEEDED',
  'PRODUCTION_PRIVACY_UNSUPPORTED_INPUT',
  'PRODUCTION_PRIVACY_KEY_PROVENANCE_UNRESOLVED',
  'PRODUCTION_PRIVACY_ROUTE_PROVENANCE_UNRESOLVED',
  'PRODUCTION_PRIVACY_VOCABULARY_INVALID',
  'PRODUCTION_PRIVACY_POLICY_FORBIDDEN_CAPABILITY',
  'PRODUCTION_PRIVACY_POLICY_INVALID',
  'PRODUCTION_PRIVACY_EVIDENCE_INVALID',
  'PRODUCTION_PRIVACY_BOUNDARY_VIOLATION',
  'PRODUCTION_PRIVACY_RAW_SOURCE_EXHAUSTED',
  'PRODUCTION_PRIVACY_PARAMETER_VALUE_EXPOSED',
  'PRODUCTION_PRIVACY_HANDLE_INVALID',
] as const;
export type ProductionPrivacyReasonCode = (typeof PRODUCTION_PRIVACY_REASON_CODES)[number];

export const PRODUCTION_PRIVACY_DETAIL_CODES = [
  // bounds
  'DEPTH_CAP',
  'NODE_CAP',
  'OBJECT_FIELD_CAP',
  'DYNAMIC_KEY_CAP',
  'ARRAY_ITEM_CAP',
  'RAW_INPUT_BYTES',
  'STRING_VALUE_BYTES',
  'ENCOUNTER_TOKEN_CAP',
  'KEY_LENGTH',
  'VOCABULARY_SIZE',
  'EVIDENCE_BYTES',
  // input shape
  'NON_JSON_SCALAR',
  'NON_FINITE_NUMBER',
  'NON_PLAIN_OBJECT',
  'CYCLIC_OBJECT',
  'CYCLIC_ARRAY',
  'FORBIDDEN_FIELD_NAME',
  'GETTER_THREW',
  'PROTOTYPE_HOSTILE',
  // contract
  'UNKNOWN_FIELD',
  'UNKNOWN_SCHEMA_VERSION',
  'MISSING_FIELD',
  'FIELD_TYPE',
  'FIELD_ORDER',
  'CARDINALITY',
  'BOUNDARY_CLASS',
  'DYNAMIC_KEY_LITERAL_PRESENT',
  'ENCOUNTER_TOKEN_PRESENT',
  'NUMERIC_REF_PRESENT',
  'FREE_TEXT_PRESENT',
  'CONCRETE_URL_PARAMETER',
  'ROUTE_TEMPLATE_INVALID',
  'ROUTE_NOT_SOURCE_PROVEN',
  'ROUTE_PROVENANCE_MISSING',
  'DIGEST_FAMILY',
  'DIGEST_MISMATCH',
  'PROVENANCE_AMBIGUOUS',
  'VOCABULARY_EMPTY',
  'VOCABULARY_PROVENANCE_DIGEST',
  'RAW_SOURCE_REUSED',
  'HANDLE_FORMAT',
  'HANDLE_UNKNOWN',
  'VALUE_SUPPLIED_WHERE_HANDLE_REQUIRED',
  'CONE_MISMATCH',
  'SCREENSHOTS_PROHIBITED',
  'TRACE_PROHIBITED',
  'CONSOLE_TEXT_PROHIBITED',
  'STORE_IDENTITY',
] as const;
export type ProductionPrivacyDetailCode = (typeof PRODUCTION_PRIVACY_DETAIL_CODES)[number];

const REASONS: ReadonlySet<string> = new Set(PRODUCTION_PRIVACY_REASON_CODES);
const DETAILS: ReadonlySet<string> = new Set(PRODUCTION_PRIVACY_DETAIL_CODES);

/**
 * A categorical production-privacy failure. The message is composed only from
 * closed-vocabulary tokens, so an error can never carry customer or source
 * data — not through interpolation, not through a cause chain, and not through
 * an accidental `String(value)`.
 */
export class ProductionPrivacyError extends Error {
  readonly reasonCode: ProductionPrivacyReasonCode;
  readonly detailCode?: ProductionPrivacyDetailCode;

  constructor(reasonCode: ProductionPrivacyReasonCode, detailCode?: ProductionPrivacyDetailCode) {
    // Defence in depth: reject anything outside the closed vocabularies rather
    // than letting an unexpected token become the message.
    const safeReason: ProductionPrivacyReasonCode = REASONS.has(reasonCode)
      ? reasonCode
      : 'PRODUCTION_PRIVACY_BOUNDARY_VIOLATION';
    const safeDetail = detailCode !== undefined && DETAILS.has(detailCode) ? detailCode : undefined;
    super(safeDetail === undefined ? safeReason : `${safeReason}:${safeDetail}`);
    this.name = 'ProductionPrivacyError';
    this.reasonCode = safeReason;
    this.detailCode = safeDetail;
  }
}

/** Throw helper so call sites read as a single categorical statement. */
export function failProduction(
  reasonCode: ProductionPrivacyReasonCode,
  detailCode?: ProductionPrivacyDetailCode,
): never {
  throw new ProductionPrivacyError(reasonCode, detailCode);
}
