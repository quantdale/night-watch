// ---------------------------------------------------------------------------
// Durable Nightwatch self-defect / false-positive catalog.
// ---------------------------------------------------------------------------

export interface KnownNightwatchFalsePositive {
  readonly id: string;
  readonly category: 'AUTH' | 'LIFECYCLE' | 'NAVIGATION' | 'COMPARATOR' | 'MODEL' | 'RESOURCE' | 'HISTORICAL_ORACLE';
  readonly symptomClass: string;
  readonly disposition: 'NIGHTWATCH_DEFECT' | 'HISTORICAL_NOT_REPRODUCED';
  readonly note: string;
}

export const NIGHTWATCH_FALSE_POSITIVE_CATALOG: readonly KnownNightwatchFalsePositive[] = [
  { id: 'NW-AUTH-EXPIRED-REPLAY', category: 'AUTH', symptomClass: 'expired-auth-replay', disposition: 'NIGHTWATCH_DEFECT', note: 'Expired external auth state can make a replay look like product routing failure.' },
  { id: 'NW-AUTH-CONTEXT-ONLY', category: 'AUTH', symptomClass: 'context-only-auth-evidence', disposition: 'NIGHTWATCH_DEFECT', note: 'Context metadata alone is not proof that page JavaScript can read authenticated state.' },
  { id: 'NW-VUE-APP-LIFECYCLE', category: 'LIFECYCLE', symptomClass: 'vue-app-lifecycle', disposition: 'NIGHTWATCH_DEFECT', note: 'Vue #app existence before mount is not a rendered-shell readiness oracle.' },
  { id: 'NW-NAVIGATION-CANCELLATION', category: 'NAVIGATION', symptomClass: 'navigation-cancellation', disposition: 'NIGHTWATCH_DEFECT', note: 'Document replacement and policy aborts must not be promoted as product request failures.' },
  { id: 'NW-CANCELED-BY-POLICY', category: 'COMPARATOR', symptomClass: 'canceled-by-policy-comparator', disposition: 'NIGHTWATCH_DEFECT', note: 'Expected policy cancellation is containment evidence, not an application anomaly.' },
  { id: 'NW-SELECTOR-MODEL-STALE', category: 'MODEL', symptomClass: 'selector-model-staleness', disposition: 'NIGHTWATCH_DEFECT', note: 'A stale safe selector/model transition is a Nightwatch runtime artifact.' },
  { id: 'NW-J2-FONT-502', category: 'RESOURCE', symptomClass: 'j2-font-502', disposition: 'HISTORICAL_NOT_REPRODUCED', note: 'Historical J2 font 502 remains L0_NOT_REPRODUCED and is not a product dossier.' },
  { id: 'NW-MALFORMED-JSON-HISTORICAL', category: 'HISTORICAL_ORACLE', symptomClass: 'malformed-json', disposition: 'HISTORICAL_NOT_REPRODUCED', note: 'Historical malformed JSON remains UNKNOWN/HISTORICAL_ANOMALY_PRESENT unless a current deterministic run admits it.' },
];

export function findKnownNightwatchDefect(symptomClass: string): KnownNightwatchFalsePositive | undefined {
  return NIGHTWATCH_FALSE_POSITIVE_CATALOG.find((item) => item.symptomClass === symptomClass);
}

