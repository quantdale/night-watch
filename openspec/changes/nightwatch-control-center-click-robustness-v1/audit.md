# Audit — click-robustness change against repository truth

## Predecessor state consumed

Browser-stability (`nightwatch-systemmap-browser-stability-v1`,
COMPLETE) integrated at `9cf37a4` with the `clickQueryChip` dispatch
pattern proven for tail query chips. This change mirrors that pattern
for the sibling spec's two `Inspect` clicks. Product cones
(`src/controlCenter/*`, `ui/control-center`) consumed read-only,
modified nowhere.

## Requirement implemented by this change

| ID | Source | Status in this change |
|---|---|---|
| `Inspect` clicks survive transient box stalls | sibling failure evidence, SPEC.md | IMPLEMENTED — visibility gate + dispatch helper |
| No weakened coverage | campaign constraints | HELD — assertions added/unchanged only |
| No product change | diagnosis | HELD — diff limited to the one spec file |

## Explicitly deferred (not this change)

C-12/C-13/C-14 execution; DEV/NEXT contact; any product-code change;
manifest/registry/gate-definition change; retry-policy changes; CI
billing block (external).
