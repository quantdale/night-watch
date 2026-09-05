# Task Plan — Owner-Local Review Persistence & Dossier Identity Enrichment

Living plan. Milestone status is authoritative here; operational waypoints
live in `STATE.md`.

## Purpose

Make the certified local review lifecycle durable, and make the reviewer
surface tell the truth about what it already displays: local review state
and the expectation / semantic-contract identity of a finding. Repair the
predecessor campaign's contradictory terminal safety accounting first.

## Starting State

- `HEAD == origin/main == 47c0088`, canonical checkout clean, one worktree,
  shared exclude at zero effective patterns, `session:status` PASS.
- `src/core/findingReview/` is complete and certified but ephemeral: a
  decision exists only for the life of the process that made it.
- `src/controlCenter/authorities/reviewerAuthority.ts` hardcodes
  `expectationId: null`, `semanticContractId: null` and pushes
  `NO_LOCAL_REVIEW_STORE` for every projected finding.
- `PrivateArtifactStore.writeImmutableJson` already provides atomic
  no-replace owner-local publication.
- `SemanticTriageEvidence` already carries `expectationId` and
  `invariantDefinitionId`, privacy-validated at construction.
- The predecessor `STATE.md` records one workspace-integrity safety event
  while its `REPORT.md` asserts `Safety events: NONE`.

## Scope

Owner-local review persistence and its read/write integration; expectation
and semantic-contract identity propagation; the safety-accounting repair and
its structural check; hardening, property, crash, concurrency, mutation,
scale, browser and restart certification; documentation reconciliation.

## Non-Goals

Redesigning the review lifecycle. Rewriting the pairwise relationship
classifier for asymptotics. Introducing a database. Automatic deletion of
stale review history. Any organizational authority for a local decision.
Any dossier schema version change — the identities already exist in v2.

## Safety Constraints

Repository-local and offline. No production, NEXT or DEV contact; no live
C-12/C-13/C-14; no C-08b; no Slack/Leslie/Pondr/Notion; no external filing;
no credentials, deployments or sibling writes; no force push or history
rewrite. The review store is owner-only, outside the repository, never
committed, and has no publication path. Every persisted receipt keeps
`organizationalAuthority: NONE_LOCAL_REVIEW_ONLY`.

## Architecture / Approach

The repository already owns both halves of what this campaign needs, so the
core is deliberately small and the proof is large:

- The review store is a schema, an identity and a read-validation policy
  over `PrivateArtifactStore.writeImmutableJson` — not new storage
  machinery. `link(2)` is the concurrency arbiter, so there is no
  read-then-write check to race.
- Review identity is the digest of the complete binding, so a regenerated
  artifact yields a distinct stored review and never overwrites history.
- Discovery uses a derived, recomputed file-name key rather than an index
  file: there is no index to corrupt, and one directory listing serves a
  whole page.
- `verifyReviewCurrent` stays the only binding validator; the store never
  carries a second, weaker copy.
- Identity propagation is a carry-forward from `SemanticTriageEvidence`,
  never a derivation.

Full design in
`openspec/changes/nightwatch-owner-local-review-persistence-v1/design.md`.

## Milestones

### M0 — predecessor safety-event truth — COMPLETE
- [x] Allocate a defect id under repository convention.
- [x] Correct the predecessor REPORT safety accounting.
- [x] Narrow structural `agent:check` rule plus its regression.

### M1 — review store core — COMPLETE
- [x] `subtree` option and truthful derived-root class in `privateArtifacts`.
- [x] `src/core/reviewStore/` types, identity, store.
- [x] Focused suite for immutability, no-replace, four read states,
      corruption vocabulary, temporary recovery.

### M2 — dossier identity propagation — COMPLETE
- [x] `FindingsDossierMetadata` and `descriptorFor` carry the identities.
- [x] Permanent synthetic corpus and before/after measurement.
- [x] False-positive defence.

### M3 — Control Center integration — COMPLETE
- [x] Narrow review-decision write authority and route.
- [x] Page-bounded persisted review read path.
- [x] Reviewer UI decision controls, receipt, authority labelling.

### M4 — hardening — COMPLETE
- [x] Occurrence-complete store-boundary rules.
- [x] Each rule proven to bite by mutating the guarded artifact.

### M5 — property, crash, concurrency, mutation — COMPLETE
- [x] Seeded property suite.
- [x] >= 20 crash-injection scenarios.
- [x] Concurrency matrix.
- [x] >= 25 mutations, zero unexplained survivors.

### M6 — scale — COMPLETE
- [x] 1k/5k/10k across 0%/10%/50%/100% reviewed.

### M7 — browser and restart — COMPLETE
- [x] >= 30 reviewer persistence browser passes.
- [x] Server A/B/C restart and stale proof.

### M8 — documentation and certification — COMPLETE
- [x] Durable docs and OpenSpec reconciled.
- [x] Full regression, `gate:local`, `gate:clean` fresh install.

## Validation Strategy

Each milestone runs its own focused suite before the next begins. Hardening
rules are proven by mutating the artifact they guard, never by asserting
their own presence. The certification set — full regression, `gate:local`,
`gate:clean` with a proven fresh install — runs on the committed tree, not
on a dirty working tree.

## Decision Log

Recorded in `STATE.md` under `## Decisions Made During This Task`.

## Discoveries

Recorded in `STATE.md` under `## Discoveries`.

## Deferred Work

Recorded in `STATE.md` under `## Deferred / Follow-Up`.

## Completion Criteria

Owner-local store exists with atomic no-replace writes proven; receipts
validated; current/stale distinction proven; corruption fail-closed; restart
persistence proven; concurrent conflict deterministic; no source artifact
mutation. Local-only, private, organizational authority NONE, no external
filing path. Reviewer shows real persisted state, unreviewed stays UNKNOWN,
stale is visibly stale, terminal decisions not editable. Identity propagated
only where proven, UNKNOWN preserved, privacy preserved, classifier rules
unchanged. Performance measured, mutation survivors zero, property tests
green, browser and restart green, full regression green, clean fresh-install
gate green, workspace clean, documentation truthful.
