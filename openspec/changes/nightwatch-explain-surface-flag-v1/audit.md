# Audit — flag-form change against repository truth

## Predecessor state consumed

Dep-docs-reconciliation (`nightwatch-dep-docs-reconciliation-v1`,
COMPLETE) integrated at `a39f49c`. This change touches only the
explain-surface argument extraction plus one focused test file.

## Requirement implemented by this change

| ID | Source | Status in this change |
|---|---|---|
| README `--surface=` form works | README + SPEC.md | IMPLEMENTED — extraction disjunct |
| Validation strictness preserved | SPEC.md | HELD — shape regex + membership unchanged |
| No weakening coverage | campaign constraints | HELD — regression tests added |

## Explicitly deferred (not this change)

`explain` positional parsing (undocumented with args); product-core
change; manifest/registry/gate change.
