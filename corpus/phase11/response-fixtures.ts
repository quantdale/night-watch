// ---------------------------------------------------------------------------
// Nightwatch Phase 11 — synthetic response body generators and sentinel
// constants for collection-wide evaluation testing.
//
// SYNTHETIC ONLY. Every value is an obvious placeholder. No real customer
// data, no real product bodies.
// ---------------------------------------------------------------------------

export const SENTINEL = {
  MONTH: 'SENTINEL_PHASE11_MONTH_AA',
  RATE: 'SENTINEL_PHASE11_RATE_BB',
  NAME: 'SENTINEL_PHASE11_NAME_CC',
  ID: 'SENTINEL_PHASE11_ID_DD',
  NUMBER: 'SENTINEL_PHASE11_NUM_EE',
  WRONG_TYPE: 12345, // number where string expected
} as const;

// ---------------------------------------------------------------------------
// Exchange rate item generators (common-exchange shape).
// ---------------------------------------------------------------------------

/** A single valid common-exchange row. */
export interface ExchangeRateItem {
  readonly month: string;
  readonly exchange_rate: Record<string, number>;
}

/** Generate a valid common-exchange item with the given index. */
export function validExchangeItem(index: number): ExchangeRateItem {
  return {
    month: `2026-${String(index % 12 + 1).padStart(2, '0')}`,
    exchange_rate: { usd: 1.0 + index * 0.01, jpy: 150.0 + index },
  };
}

/** Generate an array of N valid common-exchange items. */
export function generateExchangeArray(count: number): ExchangeRateItem[] {
  return Array.from({ length: count }, (_, i) => validExchangeItem(i));
}

/** Generate an array with a wrong-type `month` at the given row index. */
export function exchangeWithWrongTypeMonth(rowIndex: number, totalItems: number): unknown[] {
  return Array.from({ length: totalItems }, (_, i) => {
    if (i === rowIndex) {
      return { month: SENTINEL.WRONG_TYPE, exchange_rate: { usd: 1.0 } };
    }
    return validExchangeItem(i);
  });
}

/** Generate an array with a missing `month` field at the given row index. */
export function exchangeWithMissingMonth(rowIndex: number, totalItems: number): unknown[] {
  return Array.from({ length: totalItems }, (_, i) => {
    if (i === rowIndex) {
      return { exchange_rate: { usd: 1.0 } };
    }
    return validExchangeItem(i);
  });
}

// ---------------------------------------------------------------------------
// Payer exchange item generators (payer-exchange shape).
// ---------------------------------------------------------------------------

export interface PayerExchangeItem {
  readonly payer_id: string;
  readonly exchange_rate: Record<string, number> | unknown[];
}

/** Generate a valid payer-exchange item. */
export function validPayerItem(index: number): PayerExchangeItem {
  return {
    payer_id: `${SENTINEL.ID}-${index}`,
    exchange_rate: { usd: 1.0 + index * 0.01, jpy: 150.0 + index },
  };
}

/** Generate an array of N valid payer-exchange items. */
export function generatePayerArray(count: number): PayerExchangeItem[] {
  return Array.from({ length: count }, (_, i) => validPayerItem(i));
}

/** Generate a payer array with an outside-set type at the given row index. */
export function payerWithOutsideType(rowIndex: number, totalItems: number): unknown[] {
  return Array.from({ length: totalItems }, (_, i) => {
    if (i === rowIndex) {
      return { payer_id: `${SENTINEL.ID}-bad`, exchange_rate: SENTINEL.WRONG_TYPE };
    }
    return validPayerItem(i);
  });
}

/** Generate a common-exchange array with a wrong type at row 127. */
export function exchangeViolationAt127(): unknown[] {
  return exchangeWithWrongTypeMonth(127, 128);
}

/** Generate a common-exchange array >128 items with a wrong type at row 57. */
export function exchangeViolationInside128Window(): unknown[] {
  return exchangeWithWrongTypeMonth(57, 130);
}

/** Generate a common-exchange array with 129 valid items (defect at row 128). */
export function exchangePartialCoverageValid129(): unknown[] {
  return Array.from({ length: 129 }, (_, i) => {
    if (i === 128) {
      return { month: SENTINEL.WRONG_TYPE, exchange_rate: { usd: 1.0 } };
    }
    return validExchangeItem(i);
  });
}

/** Generate an object with reordered keys (canonical order). */
export function reorderedKeysExchange(): Record<string, unknown> {
  return {
    exchange_rate: { inr: 92.34, jpy: 1.2345 },
    month: SENTINEL.MONTH,
  };
}
