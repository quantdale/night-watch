## Context

The gate already refuses invented proposal evidence refs and unlinked reproductions. Candidate membership and provenance completeness are the remaining holes: both currently degrade instead of refusing.

## Goals / Non-Goals

**Goals:** exact candidate membership; observed-only provenance; no synthetic ids; tests.

**Non-Goals:** changing reproduction providers, novelty scoring, or Control Center projection.

## Decisions

### Present state must be exact

When `state` is provided, `candidateIds` SHALL be a validated string array and SHALL contain the candidate. Missing/non-array `candidateIds` is UNKNOWN_CANDIDATE, not a history-only fallback.

### Provenance is observed or absent

Qualifying receipts must contribute at least one observed evidence or provenance ref. An empty set SHALL refuse rather than mint `reproduction:<id>`.

### Defaults cannot look grounded

If title/severity are not draft-supplied, the dossier SHALL either omit recommendation authority or label them UNGROUNDED. Silent `S3` / generated title SHALL NOT appear as ordinary admitted fields.

## Risks / Trade-offs

Some currently admitted history-only or provenance-empty cases will refuse. That is the intended fail-closed behavior.

## Migration Plan

1. Tighten normalize/membership checks.
2. Remove provenance synthesis.
3. Add adversarial admission tests.
4. Run local-investigation suites without campaigns.

## Open Questions

None. Empty provenance is not observed provenance.
