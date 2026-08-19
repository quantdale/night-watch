// ---------------------------------------------------------------------------
// Nightwatch Phase 12 — synthetic response generators.
// SYNTHETIC ONLY. No real customer data.
// ---------------------------------------------------------------------------

export const SENTINEL_PHASE12 = {
  MONTH: 'SENTINEL_PHASE12_MONTH_AA',
  RATE: 'SENTINEL_PHASE12_RATE_BB',
  NAME: 'SENTINEL_PHASE12_NAME_CC',
  ID: 'SENTINEL_PHASE12_ID_DD',
  NUMBER: 'SENTINEL_PHASE12_NUM_EE',
  WRONG_TYPE: 12345,
  CUSTOMER: 'PH12_CUSTOMER_SENTINEL_abc@example.com',
  ACCOUNT: 'PH12_ACCOUNT_SENTINEL_4111111111111111',
  COST: 'PH12_COST_SENTINEL_$12345.67',
  BEARER: 'PH12_BEARER_SENTINEL_Bearer eyJhbGciOi_fake',
  PATH: '/home/dalepalaca/.nightwatch/secret/path',
} as const;

export interface ExchangeRateItem {
  readonly month: string;
  readonly exchange_rate: Record<string, number>;
}

export function validExchangeItem(index: number): ExchangeRateItem {
  return {
    month: `2026-${String((index % 12) + 1).padStart(2, '0')}`,
    exchange_rate: { usd: 1.0 + index * 0.01, jpy: 150.0 + index },
  };
}

export function generateExchangeArray(count: number): ExchangeRateItem[] {
  return Array.from({ length: count }, (_, i) => validExchangeItem(i));
}

export function exchangeWithWrongTypeMonth(rowIndex: number, totalItems: number): unknown[] {
  return Array.from({ length: totalItems }, (_, i) => {
    if (i === rowIndex) return { month: SENTINEL_PHASE12.WRONG_TYPE, exchange_rate: { usd: 1.0 } };
    return validExchangeItem(i);
  });
}

export function exchangeWithMissingMonth(rowIndex: number, totalItems: number): unknown[] {
  return Array.from({ length: totalItems }, (_, i) => {
    if (i === rowIndex) return { exchange_rate: { usd: 1.0 } };
    return validExchangeItem(i);
  });
}

export interface PayerExchangeItem {
  readonly payer_id: string;
  readonly exchange_rate: Record<string, number> | unknown[];
}

export function validPayerItem(index: number): PayerExchangeItem {
  return {
    payer_id: `${SENTINEL_PHASE12.ID}-${index}`,
    exchange_rate: { usd: 1.0 + index * 0.01, jpy: 150.0 + index },
  };
}

export function generatePayerArray(count: number): PayerExchangeItem[] {
  return Array.from({ length: count }, (_, i) => validPayerItem(i));
}

export function payerWithOutsideType(rowIndex: number, totalItems: number): unknown[] {
  return Array.from({ length: totalItems }, (_, i) => {
    if (i === rowIndex) return { payer_id: `${SENTINEL_PHASE12.ID}-bad`, exchange_rate: SENTINEL_PHASE12.WRONG_TYPE };
    return validPayerItem(i);
  });
}

export function exchangeViolationAt127(): unknown[] {
  return exchangeWithWrongTypeMonth(127, 128);
}

export function exchangeViolationInside128Window(): unknown[] {
  return exchangeWithWrongTypeMonth(57, 130);
}

export function exchangePartialCoverageValid129(): unknown[] {
  return Array.from({ length: 129 }, (_, i) => {
    if (i === 128) return { month: SENTINEL_PHASE12.WRONG_TYPE, exchange_rate: { usd: 1.0 } };
    return validExchangeItem(i);
  });
}

/** Response that plants privacy sentinels only inside raw values. */
export function privacyAdversarialResponse(): unknown {
  return {
    month: SENTINEL_PHASE12.MONTH,
    exchange_rate: { usd: 1.0 },
    _sentinel_customer: SENTINEL_PHASE12.CUSTOMER,
    _sentinel_account: SENTINEL_PHASE12.ACCOUNT,
    _sentinel_cost: SENTINEL_PHASE12.COST,
    _sentinel_bearer: SENTINEL_PHASE12.BEARER,
    _sentinel_path: SENTINEL_PHASE12.PATH,
  };
}
