## Context

Examples include `candidateEvaluations` and its sequences with no collection maximum, cluster `runIds` and cluster arrays without limits, multiple project-health arrays checked for ordering but not total size, and recursive privacy scans without depth/node budgets. `validateArtifact` catches leaf exceptions and returns their messages directly.

## Goals / Non-Goals

**Goals:** total validation work; early refusal; safe diagnostics; explicit batch completeness; bound drift detection.

**Non-Goals:** change artifact meaning, repair malformed records, or ingest external data.

## Decisions

### Admit an artifact envelope before leaf validation

The facade measures serialized/input bytes where available and walks a no-getter plain-data shape under global depth/node/key/string/array budgets before dispatch. Cycles, accessors, exotic prototypes, or budget overflow fail categorically.

### Register per-kind semantic bounds

One immutable registry declares producer and parser maxima for each artifact kind. Leaf validators may apply tighter field rules but cannot be unbounded.

### Normalize all errors

The facade maps leaf failures through a closed prefix/detail sanitizer. Host messages, arbitrary keys, sentinel values, paths, stacks, and thrown non-errors never enter returned or persisted reasons.

### Report incomplete batches

Batch APIs report inspected/omitted counts and `COMPLETE | INCOMPLETE`; reaching a budget is never success.

## Risks / Trade-offs

Very large historical records may become explicitly unreadable without an offline bounded migration. That is preferable to unbounded validation.

## Migration Plan

1. Freeze producer maxima and current largest fixtures.
2. Add common preflight budgets and safe error taxonomy.
3. Bind every kind/leaf validator and batch API.
4. Add adversarial fixtures and mutations.
5. Run artifact, campaign, local/clean, and full gates.

## Open Questions

None. A strict parser that can consume unbounded resources is not total.
