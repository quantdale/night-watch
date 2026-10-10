## Why

Phase 20 labels TypeScript/JavaScript and Go observations `MECHANICALLY_PROVABLE` using raw regular expressions over source text. Comments, string literals, unrelated declarations, or calls whose results never reach a response can therefore manufacture contracts. The Go analyzer selects the first regex-matching struct instead of the requested symbol. OpenAPI silently filters malformed `required` members and permits required fields absent from `properties`. Analyzer output beyond 256 records is silently sliced, so a partial inventory can look complete.

## What Changes

- Replace raw-text proof with bounded syntax-aware language adapters that exclude comments/strings and bind exact symbols.
- Require response/output dataflow for behavioral contracts such as normalization, sort, filtering, and aggregation.
- Strictly validate schema relationships and reject malformed OpenAPI rather than repairing it.
- Make analyzer completeness explicit; overflow fails closed or returns non-admissible partial evidence.
- Add decoy, wrong-symbol, unrelated-call, ambiguous-flow, malformed-schema, and output-overflow tests.

## Capabilities

### New Capabilities

- `semantic-source-analyzer-proof-soundness`: Defines syntax-, symbol-, flow-, and completeness-bound source contract proof.

### Modified Capabilities

None.

## Impact

- Affects semantic source analyzers, discovery/admission, cache identity, coverage inventory/reporting, and Phase 20/25/26 tests.
- Does not access sibling source during implementation unless a separately authorized task supplies approved snapshots.
