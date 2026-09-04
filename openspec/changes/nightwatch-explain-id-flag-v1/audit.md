# Audit — id-tolerance change against repository truth

## Predecessor state consumed

Explain-surface flag form (`nightwatch-explain-surface-flag-v1`,
COMPLETE) integrated at `cb054f1`. This change applies the same
positional discipline to the sibling `explain` branch plus one focused
test file.

## Requirement implemented by this change

| ID | Source | Status in this change |
|---|---|---|
| Flag-first orders resolve | SPEC.md | IMPLEMENTED — first-non-flag rule |
| Validation strictness preserved | SPEC.md | HELD — shape regex + lookup unchanged |
| No weakening coverage | campaign constraints | HELD — regression tests added |

## Explicitly deferred (not this change)

Named `--id=` form (undocumented); product-core change;
manifest/registry/gate change.
