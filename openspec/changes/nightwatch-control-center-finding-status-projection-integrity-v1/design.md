## Context

`safeDossier` copies `dossier.status === 'READY'` into the summary. Non-READY becomes INCOMPLETE. Privacy-unsafe dossiers return null (dropped), which also hides the reason.

## Goals / Non-Goals

**Goals:** total status vocabulary use; no false READY; no failed-as-incomplete; tests.

**Non-Goals:** fixing protocol dossier construction (NW-AUD-029); changing review writes.

## Decisions

### Consume readiness, do not recompute it

If the dossier cone exposes a readiness verdict, the adapter SHALL project it. It SHALL NOT treat a raw `status` string as sufficient once NW-AUD-029 lands. Until then, non-READY failed/blocked values still must not collapse to INCOMPLETE.

### Preserve UNKNOWN and UNAVAILABLE

Unread, malformed, or privacy-elided rows that the page must still account for SHALL use UNKNOWN or UNAVAILABLE, not silent omission or INCOMPLETE.

### Keep FACT/UNKNOWN discipline

READY is FACT only when the owning cone says so. INCOMPLETE is unfinished collection, not failure.

## Risks / Trade-offs

Some rows currently labelled INCOMPLETE will become UNKNOWN. That is more honest.

## Migration Plan

1. Replace the boolean READY test with a total mapping.
2. Bind to protocol readiness once that change is implemented; until then map failed/blocked distinctly.
3. Add projection tests.
4. Run Control Center suites without private findings I/O beyond fixtures.

## Open Questions

None. Boolean READY is not a status mapping.
