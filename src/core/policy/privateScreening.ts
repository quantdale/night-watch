// ---------------------------------------------------------------------------
// Nightwatch shared private-payload screening.
//
// ONE canonical sentinel/secret screen for durable DTO and artifact
// construction points. Policy-owned modules re-point here instead of keeping
// divergent copies of these patterns. The screened shapes are secret/token
// material, canonical privacy sentinels, and labeled raw private values.
// Screening is fail-closed by construction: callers throw on a positive match
// and never echo the matched text back into an error, receipt, or artifact.
// ---------------------------------------------------------------------------

export const PRIVATE_SCREENING_VERSION = 'nightwatch.private-screening.v1' as const;

/** Secret/token material that must never enter durable shapes or error text. */
export const SECRET_SHAPE_RE =
  /(?:Bearer\s+[A-Za-z0-9._~+/=-]{8,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
/** Canonical Nightwatch privacy sentinel tokens. */
export const PRIVATE_SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL)/i;
/** Labeled raw private values (`customer: ...`, `token=...`) in any spelling. */
export const PRIVATE_VALUE_RE =
  /(?:customer|account|billing[_-]?group|payer|cost|amount|email|cookie|token|password|secret|authorization)\s*[:=]\s*["']?[A-Za-z0-9@._:+/=-]{6,}/i;

/** True when `text` carries secret material or a privacy sentinel token. */
export function containsSecretOrSentinelShape(text: string): boolean {
  return SECRET_SHAPE_RE.test(text) || PRIVATE_SENTINEL_RE.test(text);
}

/** True when `text` carries a labeled raw private value. */
export function containsLabeledPrivateValue(text: string): boolean {
  return PRIVATE_VALUE_RE.test(text);
}

/**
 * Combined construction-point screen: true when ANY private-payload shape is
 * present. Callers fail closed on `true`.
 */
export function containsPrivatePayloadShape(text: string): boolean {
  return containsSecretOrSentinelShape(text) || containsLabeledPrivateValue(text);
}
