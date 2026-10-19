// ---------------------------------------------------------------------------
// Pre-request monetary admission (D-178 blocker 2; owner instruction
// "FINAL END-TO-END COMPLETION MISSION" §9G).
//
// A metered provider call is admitted BEFORE dispatch only when its WORST-CASE
// cost keeps the cumulative worst-case spend within the authorized monetary
// ceiling. This is deliberately not the reactive byte ledger: affordability is
// decided before the request exists on the wire, and the worst case is derived
// from the exact request envelope plus a hard per-call output bound, so the
// authorized amount cannot be exceeded by admitted calls. A metered run with
// no declared ceiling is refused outright by `admitRunSpendCeiling`.
//
// Worst-case arithmetic is conservative by construction: input is charged at
// `worstCaseTokensPerByte` tokens per request byte (1 token/byte is already
// tokenizer-impossible), output is charged at the full `maxOutputTokensPerCall`
// even though a call may generate far less, and every input token is charged
// at the full input rate (cache discounts are lower, never higher). The
// residual exposure above the ceiling is therefore bounded by the honesty of
// `maxOutputTokensPerCall`/`maxBytesPerToken`, which the run authorization
// declares and the account-side hard stop backstops.
// ---------------------------------------------------------------------------

export const SPEND_CEILING_VERSION = 'nightwatch.spend-ceiling.v1' as const;

/** Metered rate card, USD per million tokens. */
export interface SpendRateCard {
  readonly inputUsdPerMillionTokens: number;
  readonly outputUsdPerMillionTokens: number;
}

/**
 * The authorized monetary ceiling for one campaign run. Every field is
 * required: an unknown or malformed ceiling is never silently treated as
 * "no ceiling".
 */
export interface SpendCeiling {
  readonly schemaVersion: typeof SPEND_CEILING_VERSION;
  /** The authorized hard monetary cap, USD. */
  readonly maxSpendUsd: number;
  readonly rateCard: SpendRateCard;
  /** Hard per-call bound on generated output tokens (model or harness limit). */
  readonly maxOutputTokensPerCall: number;
  /** Conservative upper bound on UTF-8 bytes per generated token. */
  readonly maxBytesPerToken: number;
  /** Conservative upper bound on tokens per request byte (1 = tokenizer-impossible). */
  readonly worstCaseTokensPerByte: number;
  /**
   * D-183: the authorized provider identity. A substitution never inherits
   * the ceiling — the admission compares the resolved run identity against
   * this declaration before any dispatch.
   */
  readonly provider: string;
  /** D-183: the authorized model identity (see `provider`). */
  readonly model: string;
}

/**
 * One admission decision. `SPEND_CEILING_UNAUTHORISED` is the fail-closed
 * answer for a metered run with no valid ceiling; the refusal names no
 * credential and no absolute path.
 */
export type SpendAdmission =
  | { readonly ok: true; readonly projectedUsd: number }
  | {
      readonly ok: false;
      readonly code:
        | 'SPEND_CEILING_UNAUTHORISED'
        | 'SPEND_CEILING_REFUSED_BEFORE_REQUEST'
        | 'SPEND_CEILING_RATE_CARD_INVALID'
        | 'SPEND_CEILING_IDENTITY_MISMATCH'
        | 'SPEND_OUTPUT_BOUND_UNENFORCEABLE'
        | 'SPEND_CEILING_RESUME_ABSENT'
        | 'SPEND_CEILING_RESUME_WIDENED'
        | 'SPEND_CEILING_RESUME_MISMATCH';
      readonly detail: string;
    };

function positiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function nonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function validateSpendCeiling(value: unknown): value is SpendCeiling {
  if (value === null || typeof value !== 'object') return false;
  const ceiling = value as Partial<SpendCeiling>;
  return ceiling.schemaVersion === SPEND_CEILING_VERSION
    && positiveFinite(ceiling.maxSpendUsd)
    && nonNegativeFinite(ceiling.rateCard?.inputUsdPerMillionTokens)
    && nonNegativeFinite(ceiling.rateCard?.outputUsdPerMillionTokens)
    && positiveFinite(ceiling.maxOutputTokensPerCall)
    && positiveFinite(ceiling.maxBytesPerToken)
    && positiveFinite(ceiling.worstCaseTokensPerByte)
    && typeof ceiling.provider === 'string' && ceiling.provider.trim() !== ''
    && typeof ceiling.model === 'string' && ceiling.model.trim() !== '';
}

/** Worst-case token count for a byte volume under this ceiling's tokenizer bound. */
export function worstCaseTokensForBytes(ceiling: SpendCeiling, bytes: number): number {
  return Math.max(0, bytes) * ceiling.worstCaseTokensPerByte;
}

/** USD cost of `tokens` at one side of the rate card. */
function tokenCostUsd(tokens: number, usdPerMillionTokens: number): number {
  return (tokens / 1_000_000) * usdPerMillionTokens;
}

/**
 * The spend already committed by earlier calls, charged conservatively (the
 * recorded byte volumes are converted at the worst-case tokenizer bound).
 */
export function committedSpendUsd(
  ceiling: SpendCeiling,
  committedInputBytes: number,
  committedOutputBytes: number,
): number {
  return tokenCostUsd(worstCaseTokensForBytes(ceiling, committedInputBytes), ceiling.rateCard.inputUsdPerMillionTokens)
    + tokenCostUsd(worstCaseTokensForBytes(ceiling, committedOutputBytes), ceiling.rateCard.outputUsdPerMillionTokens);
}

/**
 * The worst-case cost of ONE not-yet-dispatched call: its exact request input
 * plus the full per-call output bound. This is the figure the admission uses;
 * a call that generated less is charged less afterwards, never more.
 */
export function worstCaseCallCostUsd(ceiling: SpendCeiling, requestBytes: number): number {
  return tokenCostUsd(worstCaseTokensForBytes(ceiling, requestBytes), ceiling.rateCard.inputUsdPerMillionTokens)
    + tokenCostUsd(ceiling.maxOutputTokensPerCall, ceiling.rateCard.outputUsdPerMillionTokens);
}

/**
 * The pre-request admission. `committedInputBytes`/`committedOutputBytes` are
 * the byte volumes already charged to this campaign; `requestBytes` is the
 * exact rendered request about to be dispatched. The call is admitted only
 * when the cumulative WORST-CASE spend (committed + this call at its worst
 * case) stays within `maxSpendUsd`.
 */
export function admitProviderCall(input: {
  readonly ceiling: SpendCeiling;
  readonly requestBytes: number;
  readonly committedInputBytes: number;
  readonly committedOutputBytes: number;
}): SpendAdmission {
  const { ceiling, requestBytes, committedInputBytes, committedOutputBytes } = input;
  if (!validateSpendCeiling(ceiling)) {
    return { ok: false, code: 'SPEND_CEILING_UNAUTHORISED', detail: 'the declared spend ceiling is malformed; no metered call may be dispatched' };
  }
  if (!nonNegativeFinite(requestBytes) || !nonNegativeFinite(committedInputBytes) || !nonNegativeFinite(committedOutputBytes)) {
    return { ok: false, code: 'SPEND_CEILING_REFUSED_BEFORE_REQUEST', detail: 'the request envelope or committed usage is not a finite non-negative byte count' };
  }
  const projectedUsd = committedSpendUsd(ceiling, committedInputBytes, committedOutputBytes)
    + worstCaseCallCostUsd(ceiling, requestBytes);
  if (projectedUsd > ceiling.maxSpendUsd) {
    return {
      ok: false,
      code: 'SPEND_CEILING_REFUSED_BEFORE_REQUEST',
      detail: `worst-case projected spend ${projectedUsd.toFixed(6)} USD would exceed the authorized ceiling ${ceiling.maxSpendUsd.toFixed(6)} USD; the request was not dispatched`,
    };
  }
  return { ok: true, projectedUsd };
}

/**
 * The fail-closed run admission for a METERED run: no valid declared ceiling,
 * no run. Non-metered (zero-spend) surfaces pass a zero-rate card and a small
 * cap by declaration; nothing here ever infers "free" from an absent field.
 */
export function admitRunSpendCeiling(ceiling: unknown): SpendAdmission {
  if (!validateSpendCeiling(ceiling)) {
    return { ok: false, code: 'SPEND_CEILING_UNAUTHORISED', detail: 'a metered run requires a declared monetary ceiling (schema nightwatch.spend-ceiling.v1) before any provider call' };
  }
  return { ok: true, projectedUsd: 0 };
}

/**
 * D-183 — the metered-run admission. A real provider campaign (the metered
 * class) is refused before any provider call unless it carries a VALID
 * ceiling, a genuinely metered rate card (a zero-rate card is the "free"
 * label bypass and is refused here), an identity that agrees with the
 * resolved run identity, and the account-side hard stop that backstops the
 * per-call output bound (the harness cannot cap output tokens on the wire).
 */
export function admitMeteredRunSpendCeiling(input: {
  readonly ceiling: unknown;
  readonly provider: string | null | undefined;
  readonly model: string | null | undefined;
  readonly accountSideHardStop: string | null | undefined;
}): SpendAdmission {
  const { ceiling, provider, model, accountSideHardStop } = input;
  if (!validateSpendCeiling(ceiling)) {
    return { ok: false, code: 'SPEND_CEILING_UNAUTHORISED', detail: 'a metered run requires a valid declared monetary ceiling (schema nightwatch.spend-ceiling.v1) before any provider call' };
  }
  if (!(ceiling.rateCard.inputUsdPerMillionTokens > 0) || !(ceiling.rateCard.outputUsdPerMillionTokens > 0)) {
    return { ok: false, code: 'SPEND_CEILING_RATE_CARD_INVALID', detail: 'a metered run requires a metered rate card with positive input and output rates; a zero-rate declaration never bypasses enforcement' };
  }
  const identity = admitSpendCeilingIdentity(ceiling, { provider, model });
  if (!identity.ok) return identity;
  if (typeof accountSideHardStop !== 'string' || accountSideHardStop.trim() === '') {
    return { ok: false, code: 'SPEND_OUTPUT_BOUND_UNENFORCEABLE', detail: 'the harness cannot cap output tokens on the wire, so a metered run requires the account-side hard stop with its evidence reference before any provider call' };
  }
  return { ok: true, projectedUsd: 0 };
}

/**
 * D-183 — identity agreement. The ceiling authorizes exactly one provider and
 * model; a run whose resolved identity disagrees is refused before dispatch,
 * so a substitution can never inherit the authorization.
 */
export function admitSpendCeilingIdentity(
  ceiling: SpendCeiling,
  identity: { readonly provider: string | null | undefined; readonly model: string | null | undefined },
): SpendAdmission {
  if (!validateSpendCeiling(ceiling)) {
    return { ok: false, code: 'SPEND_CEILING_UNAUTHORISED', detail: 'the declared spend ceiling is malformed' };
  }
  const provider = typeof identity.provider === 'string' ? identity.provider.trim() : '';
  const model = typeof identity.model === 'string' ? identity.model.trim() : '';
  if (provider === '' || model === '') {
    return { ok: false, code: 'SPEND_CEILING_IDENTITY_MISMATCH', detail: 'the run identity is absent; a metered run must state the provider and model the ceiling authorizes' };
  }
  if (provider !== ceiling.provider || model !== ceiling.model) {
    return { ok: false, code: 'SPEND_CEILING_IDENTITY_MISMATCH', detail: 'the resolved run identity disagrees with the provider/model this ceiling authorizes; a substitution never inherits the authorization' };
  }
  return { ok: true, projectedUsd: 0 };
}

/**
 * D-183 — resume equality. The ceiling is preserved across pause/resume and a
 * resume is held to the original declaration: absent limits (either side) are
 * refused, a WIDENED limit is refused with its own code, and an identity
 * change or any other semantic difference is refused. A pure TIGHTENING is
 * accepted (it can only over-reserve), and an identical declaration resumes.
 */
export function admitResumedSpendCeiling(input: {
  readonly persisted: unknown;
  readonly supplied: unknown;
}): SpendAdmission {
  const { persisted, supplied } = input;
  if (!validateSpendCeiling(persisted)) {
    return { ok: false, code: 'SPEND_CEILING_RESUME_ABSENT', detail: 'the checkpoint carries no valid monetary ceiling; a metered resume is refused rather than assumed unlimited' };
  }
  if (supplied === null || supplied === undefined) {
    return { ok: false, code: 'SPEND_CEILING_RESUME_ABSENT', detail: 'a metered resume must re-supply the declared monetary ceiling' };
  }
  if (!validateSpendCeiling(supplied)) {
    return { ok: false, code: 'SPEND_CEILING_UNAUTHORISED', detail: 'the resume declaration is malformed' };
  }
  const before = /** @type {SpendCeiling} */ (persisted);
  const after = /** @type {SpendCeiling} */ (supplied);
  if (after.provider !== before.provider || after.model !== before.model) {
    return { ok: false, code: 'SPEND_CEILING_RESUME_MISMATCH', detail: 'the resume declaration names a different provider/model than the persisted ceiling' };
  }
  const widened =
    after.maxSpendUsd > before.maxSpendUsd
    || after.rateCard.inputUsdPerMillionTokens < before.rateCard.inputUsdPerMillionTokens
    || after.rateCard.outputUsdPerMillionTokens < before.rateCard.outputUsdPerMillionTokens
    || after.maxOutputTokensPerCall > before.maxOutputTokensPerCall
    || after.worstCaseTokensPerByte < before.worstCaseTokensPerByte
    || after.maxBytesPerToken > before.maxBytesPerToken;
  if (widened) {
    return { ok: false, code: 'SPEND_CEILING_RESUME_WIDENED', detail: 'the resume declaration widens the persisted ceiling; a pause never resets or loosens the authorized limits' };
  }
  // Past this point no dimension is looser, so the declaration is either an
  // exact match or a pure tightening (a smaller cap, a higher rate, a smaller
  // output bound): both are accepted, and neither can spend past the
  // persisted authorization.
  return { ok: true, projectedUsd: 0 };
}
