# Audit — browser-stability change against repository truth

## Predecessor state consumed

AH-1 (`nightwatch-alphaus-finding-handoff-c12-readiness-v1`, COMPLETE)
integrated at `8974064` with gate:local 11/11 green. The C-15c browser
spec (`tests/browser/systemMapV2.browser.ts`) is unchanged since the
C-15c campaign; the System Map product surface
(`src/controlCenter/*`, `src/core/systemMap/*`, `ui/control-center`) is
consumed read-only and modified nowhere by this change.

## Requirement implemented by this change

| ID | Source | Status in this change |
|---|---|---|
| 6d arrows need L2 members, not crumbs | fiber/repeat evidence, SPEC.md | IMPLEMENTED — L2-member gate before arrows |
| 6e press needs L4-op-0 members, not authority | fiber/repeat evidence, SPEC.md | IMPLEMENTED — breadcrumb + consumer-member gates |
| No product change | diagnosis (projection/traffic/unit proof) | HELD — diff limited to the one spec file |
| No weakened coverage | campaign constraints | HELD — assertions added only |

## Explicitly deferred (not this change)

C-12/C-13/C-14 execution; DEV/NEXT contact; any product-code change;
manifest/registry/gate-definition change; CI billing block (external).
