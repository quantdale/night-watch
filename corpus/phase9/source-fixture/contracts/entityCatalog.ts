// ---------------------------------------------------------------------------
// SYNTHETIC SOURCE FIXTURE — NOT REAL ALPHAUS SOURCE.
//
// Nightwatch Phase 9 fixture domain: a tiny synthetic "entity catalog" API
// whose response models carry declarative `@nightwatch-contract` blocks.
// The Phase 9 source adapter (src/oracles/expectations/sourceAdapter.ts)
// consumes this file with the SAME static-text interface it uses for any
// real read-only Alphaus checkout — it never executes this code.
//
// All identifiers/values are obvious synthetic placeholders. No customer
// data, no real product semantics.
// ---------------------------------------------------------------------------

/** A synthetic entity row. */
interface SyntheticEntity {
  id: string;
  name: string;
}

/** List response: `items` + an aggregate `total`. */
interface SyntheticEntityListResponse {
  items: SyntheticEntity[];
  total: number;
}

/** Detail response for one requested entity. */
interface SyntheticEntityDetailResponse {
  id: string;
  name: string;
}

/** Stage-transition response for the synthetic workflow. */
interface SyntheticStageResponse {
  stage: string;
}

/** Aggregate response: line items + declared total. */
interface SyntheticAggregateResponse {
  lineItems: Array<{ amount: number }>;
  total: number;
}

/** Collection response: rows + declared expected count. */
interface SyntheticCollectionResponse {
  items: SyntheticEntity[];
  meta: { expectedCount: number };
}

// @nightwatch-contract
// {
//   "schemaVersion": "nightwatch.semantic-expectation.v1",
//   "expectationId": "fixture.entity.read.success-envelope",
//   "targetKind": "API_OPERATION",
//   "targetId": "ripple.synthetic.entity.read",
//   "projectionContract": { "limits": {} },
//   "invariantDefinitions": [
//     { "kind": "ENVELOPE_CLASS", "expected": "SUCCESS_ENVELOPE",
//       "successField": ["data"], "errorField": ["error"] }
//   ]
// }

// @nightwatch-contract
// {
//   "schemaVersion": "nightwatch.semantic-expectation.v1",
//   "expectationId": "fixture.entity.list-detail.identity-consistency",
//   "targetKind": "JOURNEY_TRANSITION",
//   "targetId": "ripple.synthetic.entity.list-read",
//   "projectionContract": { "limits": {} },
//   "invariantDefinitions": [
//     { "kind": "IDENTITY_PRESENT_IN_COLLECTION",
//       "collectionPath": ["items"],
//       "itemIdentityPath": ["id"],
//       "detailIdentityPath": ["id"],
//       "correlationContext": "phase9.synthetic.requested-entity" }
//   ]
// }

// @nightwatch-contract
// {
//   "schemaVersion": "nightwatch.semantic-expectation.v1",
//   "expectationId": "fixture.stage.read.transition-change",
//   "targetKind": "JOURNEY_TRANSITION",
//   "targetId": "ripple.synthetic.stage.read",
//   "projectionContract": { "limits": {} },
//   "invariantDefinitions": [
//     { "kind": "SHAPE_CHANGED", "expectedTransition": "CHANGE",
//       "statePath": ["stage"] }
//   ]
// }

// @nightwatch-contract
// {
//   "schemaVersion": "nightwatch.semantic-expectation.v1",
//   "expectationId": "fixture.aggregate.read.line-items-equal-total",
//   "targetKind": "API_OPERATION",
//   "targetId": "ripple.synthetic.aggregate.read",
//   "projectionContract": { "limits": {} },
//   "invariantDefinitions": [
//     { "kind": "NUMERIC_SUM_RELATION",
//       "relationId": "line-items-equal-total",
//       "collectionPath": ["lineItems"],
//       "numericFieldPath": ["amount"],
//       "scalarPath": ["total"] }
//   ]
// }

// @nightwatch-contract
// {
//   "schemaVersion": "nightwatch.semantic-expectation.v1",
//   "expectationId": "fixture.collection.read.rows-equal-declared-count",
//   "targetKind": "API_OPERATION",
//   "targetId": "ripple.synthetic.collection.read",
//   "projectionContract": { "limits": {} },
//   "invariantDefinitions": [
//     { "kind": "COUNT_RELATION",
//       "relationId": "rows-equal-declared-count",
//       "operation": "COUNT_EQUALS",
//       "collectionPath": ["items"],
//       "scalarPath": ["meta", "expectedCount"] }
//   ]
// }
