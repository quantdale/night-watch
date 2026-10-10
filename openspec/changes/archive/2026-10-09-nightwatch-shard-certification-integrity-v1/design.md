## Context

`run-shards.mjs` captures child stdout/stderr, extracts the last human count
matches, and uses `sumCounts()` to add nullable values. The failure predicate
checks only child exit status and positive did-not-run count. This permits an
all-skipped invocation with null passed/did-not-run fields to become PASS.

## Goals / Non-Goals

**Goals:** explicit executed-test accounting; strict unknown handling; atomic
bounded receipt; normal mixed pass/skip compatibility; non-vacuous negatives.

**Non-Goals:** changing Playwright skip semantics, retries, coverage/exclusivity,
or any product/runtime behavior.

## Decisions

### The reporter is the execution authority

A dedicated reporter records every `onTestEnd` outcome and writes one
schema-versioned receipt through an atomic temporary/rename. The receipt path
is supplied in a bounded child environment. Missing, malformed, oversized, or
inconsistent receipts are hard failures; best-effort telemetry is not allowed
for this authority.

### PASS requires known executed work

`PASS` requires a known receipt, `executed > 0`, known outcome counts, zero
failures, and zero did-not-run. `NO_TESTS_EXECUTED`, `ALL_SKIPPED`,
`UNKNOWN_COUNTS`, and `MALFORMED_RECEIPT` are non-pass categorical results.
`skipped > 0` is allowed when at least one test executed.

### Text output is diagnostic only

Regex counts may remain in human diagnostics for compatibility, but they cannot
set the result or totals. A missing count is never coerced to zero.

## Risks / Trade-offs

An extra reporter adds a small per-shard I/O cost. Receipt writes must be
bounded and atomic; failure is safer than silently reverting to text parsing.
The receipt is local test telemetry and contains no customer or credential data.

## Migration Plan

1. Add the pure schema/parser and failing fixtures.
2. Add the reporter and wire the runner to strict receipt paths.
3. Add integration and mutation tests.
4. Run focused, development, and milestone gates; retain the old text as
   diagnostic output only.

## Open Questions

None.
