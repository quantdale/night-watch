# Audit — dep-removal change against repository truth

## Predecessor state consumed

Click-robustness (`nightwatch-control-center-click-robustness-v1`,
COMPLETE) integrated at `ae95966`. This change touches only the root
manifest + lockfile; product, test, and tooling surfaces are consumed
read-only and modified nowhere.

## Requirement implemented by this change

| ID | Source | Status in this change |
|---|---|---|
| Sole audit finding removed | `npm audit`, SPEC.md | IMPLEMENTED — `vue` entry deleted |
| Install coherence | campaign constraints | VERIFIED — scratch `npm ci` green |
| No behavior change | zero-reference evidence | VERIFIED — typecheck + scenario green |

## Explicitly deferred (not this change)

Other dependency upgrades; lockfile churn beyond the removal set;
product-code change; CI billing block (external).
