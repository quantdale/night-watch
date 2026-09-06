# nightwatch-system-atlas-v1 — SPEC

Lane E — Alphaus System Atlas overlay. Domain (business-concept) overlay on top
of the technical systemMap. Read-only with respect to `src/core/systemMap/**`
and frozen with respect to `src/core/agentProtocol/**`.

## Non-goals

- No new systemMap node/edge kinds. No `FACT_CATEGORIES` mutation.
- No Slack/Leslie/Pondr scraping. `COMMUNICATION_EVIDENCE` is an unauthorized
  provenance in this lane: no producer exists in the approved universe.
- No sibling-repo writes. Optional read-only proof flows through the existing
  `siblingSource` boundary owned elsewhere; this lane only records the
  resulting repository/sha/locator strings.

## Contracts

1. Concept vocabulary is `SYSTEM_ATLAS_CONCEPT_KINDS` (14 kinds), imported from
   the protocol — never forked, never string-duplicated as authority.
2. Evidence vocabulary is `AtlasFactCategory`, imported from the protocol.
   `assertNotFactUpgrade` is the single upgrade gate; this lane adds no second
   opinion.
3. Honesty invariant: a record whose provenance is `INFERENCE` carries no
   `implementedBy` / `exposes` / `consumedBy` links. Unproven links stay empty.
4. Bounded retrieval: `clampAtlasLimit` (default 5, hard 8). No query path
   returns more than `ATLAS_HARD_LIMIT` records; `truncated` says whether more
   matched.
5. Fixtures are synthetic only (`synthetic.*` concept ids, null
   repository/sha). A synthetic billing-group/payer style concept is admitted
   only as a fixture record with honest (non-`SOURCE_FACT`) provenance.

## Modules

- `src/core/systemAtlas/model.ts` — constructors + fail-closed validators.
- `src/core/systemAtlas/overlay.ts` — immutable overlay store, bounded query,
  proven-link attachment.
- `src/core/systemAtlas/fixtures.ts` — synthetic fixtures + fixture overlay.
- `src/core/systemAtlas/index.ts` — barrel.
- `tests/unit/systemAtlas.test.ts` — adversarial owned tests.
