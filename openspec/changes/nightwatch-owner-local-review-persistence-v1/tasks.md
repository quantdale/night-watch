# Tasks — owner-local review persistence & dossier identity enrichment

## M0 — predecessor safety-event truth
- [ ] Allocate a defect id for the contradictory terminal accounting.
- [ ] Correct the predecessor `REPORT.md` safety accounting to the event its
      `STATE.md` records, classified as workspace/harness integrity.
- [ ] Add the narrow structural `agent:check` rule and its regression.

## M1 — review store core
- [ ] `subtree` option and derived-root truthfulness in `privateArtifacts`.
- [ ] `src/core/reviewStore/` — types, identity, store, read semantics.
- [ ] Focused unit suite: immutability, no-replace, four read states,
      corruption vocabulary, recovery of temporaries.

## M2 — identity propagation
- [ ] Carry `expectationId` / `semanticContractId` through
      `FindingsDossierMetadata` and `descriptorFor`.
- [ ] Permanent synthetic corpus; before/after classification measurement.
- [ ] False-positive defence suite.

## M3 — Control Center write and read integration
- [ ] Review-decision route under the existing local protections.
- [ ] Reviewer read path projects real local review state, page-bounded.
- [ ] Reviewer UI decision controls and receipt display.

## M4 — hardening
- [ ] Store-boundary import rules, occurrence-complete.
- [ ] Prove each new rule bites by mutating the guarded artifact.

## M5 — property, mutation, crash, concurrency
- [ ] Property suite with deterministic seeds.
- [ ] >= 20 crash-injection scenarios.
- [ ] Concurrency matrix.
- [ ] >= 25 mutations, zero unexplained survivors.

## M6 — scale
- [ ] 1k/5k/10k x 0%/10%/50%/100% reviewed; latency, store size, RSS.

## M7 — browser and restart
- [ ] Reviewer persistence workflow, >= 30 passes.
- [ ] Server A/B/C restart and stale proof.

## M8 — documentation and certification
- [ ] Durable docs, OpenSpec, `.agent` state, campaign REPORT.
- [ ] Full regression, `gate:local`, `gate:clean` with fresh install.
