## Context

The PHP analyzer uses a bounded tokenizer, but TypeScript/JavaScript and Go paths scan raw text. Matches are accepted without lexical context or exact response-flow proof; aggregation even invents `scalarPath: ['total']` from any matching reduce call. OpenAPI parsing is structural but normalizes invalid required arrays. Final output is truncated without a completeness state.

## Goals / Non-Goals

**Goals:** lexical exclusion; exact symbol identity; bounded dataflow; strict schema validation; honest analyzer completeness; adversarial tests.

**Non-Goals:** a general compiler, arbitrary program execution, heuristic AI analysis, or weakened admission to fit current source.

## Decisions

### Use fixed syntax-aware adapters

Each supported language gets a pinned parser/tokenizer and a closed proof vocabulary. Unsupported constructs, parse ambiguity, multiple plausible symbols, or parser-version drift yield a stable rejection.

### Bind behavior to an output flow

Normalization, ordering, filtering, aggregation, pagination, and mapping are proven only when the recognized operation's result flows to the selected symbol's returned/serialized field. Field paths come from proven assignments, never analyzer defaults.

### Reject malformed schema exactly

OpenAPI `required` must be an array of unique safe strings and a subset of properties. Unknown or incoherent schema members do not get filtered into validity.

### Never hide output truncation

The analyzer either proves the complete bounded result set or emits an explicit non-admissible overflow receipt. Partial prefixes cannot enter admission, graph, cache, or coverage as complete.

## Risks / Trade-offs

Some current candidates may become rejected until a stronger fixed proof exists. That is preferable to asserting mechanical proof from decoys or unrelated syntax.

## Migration Plan

1. Freeze analyzer/parser versions and proof grammar per language.
2. Add lexical, exact-symbol, and response-flow adapters.
3. Strengthen OpenAPI relational validation.
4. Add completeness receipts and invalidate old cache identities.
5. Run analyzer/discovery/coverage, hardening, local/clean, and full gates.

## Open Questions

None. Ambiguous source remains unproven.
