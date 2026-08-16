// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — deterministic numeric relation evaluation (SPEC §12,
// §35).
//
// Raw numeric operands are EPHEMERAL inputs only; the emitted value is a safe
// relation fact (relationId, operation, MATCH|MISMATCH|NOT_APPLICABLE|
// INVALID_INPUT, bounded operandCount). No raw amounts, differences, or
// operands are ever returned or persisted.
//
// Numeric model: NaN/Infinity rejected (INVALID_INPUT); decimal values are
// compared through deterministic fixed-point scaling (10^maxDecimalPlaces,
// capped at MAX_SCALE_DECIMALS so scaled integers stay safe); no silent
// float tolerance.
// ---------------------------------------------------------------------------

export type NumericRelationOperation =
  | 'SUM_EQUALS'
  | 'COUNT_EQUALS'
  | 'COUNT_GTE'
  | 'EQUAL'
  | 'NOT_EQUAL';

export type NumericRelationResult =
  | 'MATCH'
  | 'MISMATCH'
  | 'NOT_APPLICABLE'
  | 'INVALID_INPUT';

export interface NumericRelationFact {
  readonly relationId: string;
  readonly operation: NumericRelationOperation;
  readonly result: NumericRelationResult;
  readonly operandCount: number;
}

/** Fixed-point scaling bound: 10^9 keeps scaled integers well inside
 *  Number.MAX_SAFE_INTEGER for the bounded operand values Nightwatch
 *  observes. Values with more decimal places are INVALID_INPUT. */
export const MAX_SCALE_DECIMALS = 9;

export function decimalPlaces(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (Number.isInteger(value)) return 0;
  const text = String(value);
  const dot = text.indexOf('.');
  const exponent = text.indexOf('e');
  const mantissa = exponent >= 0 ? text.slice(0, exponent) : text;
  const mantissaDecimals = dot < 0 ? 0 : mantissa.length - dot - 1;
  if (exponent >= 0) {
    // e.g. "1.5e-7" -> mantissa 1 decimal, exponent -7 -> 1 + 7 = 8 places.
    const exponentValue = Number.parseInt(text.slice(exponent + 1), 10);
    return Math.max(0, mantissaDecimals - exponentValue);
  }
  return mantissaDecimals;
}

function scaledInteger(value: number, scale: number): number | null {
  if (!Number.isFinite(value)) return null;
  const scaled = Math.round(value * scale);
  return Number.isSafeInteger(scaled) ? scaled : null;
}

export interface NumericRelationInput {
  readonly relationId: string;
  readonly operation: NumericRelationOperation;
  /** Ephemeral operand values, in contract order. */
  readonly operands: readonly number[];
}

/** Evaluate one fixed relation. Returns the safe fact only. */
export function evaluateNumericRelation(input: NumericRelationInput): NumericRelationFact {
  const { relationId, operation, operands } = input;
  const operandCount = operands.length;
  const safeResult = (result: NumericRelationResult): NumericRelationFact => ({ relationId, operation, result, operandCount });

  if (operation === 'COUNT_EQUALS' || operation === 'COUNT_GTE') {
    if (operands.length !== 2) return safeResult('INVALID_INPUT');
    const count = operands[0]!;
    const bound = operands[1]!;
    if (!Number.isSafeInteger(count) || !Number.isFinite(bound)) return safeResult('INVALID_INPUT');
    if (!Number.isInteger(bound)) return safeResult('INVALID_INPUT');
    return safeResult(operation === 'COUNT_EQUALS' ? (count === bound ? 'MATCH' : 'MISMATCH') : (count >= bound ? 'MATCH' : 'MISMATCH'));
  }

  if (operation === 'SUM_EQUALS') {
    if (operands.length < 1) return safeResult('INVALID_INPUT');
    if (operands.some((value) => !Number.isFinite(value))) return safeResult('INVALID_INPUT');
    const maxPlaces = Math.max(...operands.map(decimalPlaces));
    if (maxPlaces > MAX_SCALE_DECIMALS) return safeResult('INVALID_INPUT');
    const scale = 10 ** maxPlaces;
    const lineItems = operands.slice(0, -1);
    const total = operands[operands.length - 1]!;
    const scaledItems: number[] = [];
    for (const value of lineItems) {
      const scaled = scaledInteger(value, scale);
      if (scaled === null) return safeResult('INVALID_INPUT');
      scaledItems.push(scaled);
    }
    const scaledTotal = scaledInteger(total, scale);
    if (scaledTotal === null) return safeResult('INVALID_INPUT');
    const scaledSum = scaledItems.reduce((acc, value) => acc + value, 0);
    return safeResult(scaledSum === scaledTotal ? 'MATCH' : 'MISMATCH');
  }

  if (operation === 'EQUAL' || operation === 'NOT_EQUAL') {
    if (operands.length !== 2) return safeResult('INVALID_INPUT');
    const left = operands[0]!;
    const right = operands[1]!;
    if (!Number.isFinite(left) || !Number.isFinite(right)) return safeResult('INVALID_INPUT');
    const maxPlaces = Math.max(decimalPlaces(left), decimalPlaces(right));
    if (maxPlaces > MAX_SCALE_DECIMALS) return safeResult('INVALID_INPUT');
    const scale = 10 ** maxPlaces;
    const scaledLeft = scaledInteger(left, scale);
    const scaledRight = scaledInteger(right, scale);
    if (scaledLeft === null || scaledRight === null) return safeResult('INVALID_INPUT');
    const equal = scaledLeft === scaledRight;
    return safeResult(operation === 'EQUAL' ? (equal ? 'MATCH' : 'MISMATCH') : (equal ? 'MISMATCH' : 'MATCH'));
  }

  return safeResult('INVALID_INPUT');
}
