# Tasks — owner-local review persistence & dossier identity enrichment

## M0 — predecessor safety-event truth
- [x] Allocate a defect id for the contradictory terminal accounting.
- [x] Correct the predecessor `REPORT.md` safety accounting to the event its
      `STATE.md` records, classified as workspace/harness integrity.
- [x] Add the narrow structural `agent:check` rule and its regression.

## M1 — review store core
- [x] `subtree` option and derived-root truthfulness in `privateArtifacts`.
- [x] `src/core/reviewStore/` — types, identity, store, read semantics.
- [x] Focused unit suite: immutability, no-replace, four read states,
      corruption vocabulary, recovery of temporaries.

## M2 — identity propagation
- [x] Carry `expectationId` / `semanticContractId` through
      `FindingsDossierMetadata` and `descriptorFor`.
- [x] Permanent synthetic corpus; before/after classification measurement.
- [x] False-positive defence suite.

## M3 — Control Center write and read integration
- [x] Review-decision route under the existing local protections.
- [x] Reviewer read path projects real local review state, page-bounded.
- [x] Reviewer UI decision controls and receipt display.

## M4 — hardening
- [x] Store-boundary import rules, occurrence-complete.
- [x] Prove each new rule bites by mutating the guarded artifact.

## M5 — property, mutation, crash, concurrency
- [x] Property suite with deterministic seeds.
- [x] >= 20 crash-injection scenarios.
- [x] Concurrency matrix.
- [x] >= 25 mutations, zero unexplained survivors.

## M6 — scale
- [x] 1k/5k/10k x 0%/10%/50%/100% reviewed; latency, store size, RSS.

## M7 — browser and restart
- [x] Reviewer persistence workflow, >= 30 passes.
- [x] Server A/B/C restart and stale proof.

## M8 — documentation and certification
- [x] Durable docs, OpenSpec, `.agent` state, campaign REPORT.
- [x] Full regression, `gate:local`, `gate:clean` with fresh install.

All milestones closed. Results are recorded in
`.agent/tasks/nightwatch-owner-local-review-persistence-v1/REPORT.md`.
