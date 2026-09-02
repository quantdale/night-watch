# Tasks — C-10.5 Provenance and Project-Truth Closure

## M0 — records and activation
- [x] Verify Git and CI truth read-only before modifying anything
- [x] Task `SPEC.md`, `PLAN.md`, `STATE.md`, `REPORT.md`
- [x] OpenSpec `audit.md` with the recorded A2 reproduction
- [x] OpenSpec `proposal.md`, `tasks.md`
- [x] OpenSpec `design.md`
- [x] OpenSpec `specs/production-provenance-authority/spec.md`
- [x] Rewrite `.agent/EXECUTION_PROMPT.md` with `Planned-From: cb631cc`
- [x] Route `ACTIVE_TASK.md` and the `CURRENT_STATE` live-state block
- [x] `handoff:check` PASS, `agent:check` PASS

## M1 — A2 reproduction as a retained test
- [x] Synthetic negative test capturing all four observed failures
- [x] Retained as the forgery-resistance assertion after repair

## M2 — A3/A7 authority core
- [x] Validated source-evidence capability types
- [x] Deterministic canonical binding encoder
- [x] Computed-digest mint with no digest parameter
- [x] Module-private runtime brand registry
- [x] Fail-closed evidence invariants

## M3 — A4 route derivation
- [x] OpenAPI-operation route adapter over C-02a evidence
- [x] PHP route adapter, fail-closed with a documented reason if inadmissible
- [x] Fixed-contract route adapter bound to committed contract identity

## M4 — A5 key derivation
- [x] OpenAPI-definition key adapter
- [x] PHP row-key adapter
- [x] Fixed-contract key adapter bound to committed contract identity
- [x] Withdraw the label-accepting constructors from the public surface
- [x] TEST-ONLY seam that cannot produce production authority

## M5 — A6 forgery resistance
- [x] Arbitrary strings cannot become `SOURCE_PROVEN_*`
- [x] Arbitrary digest text grants nothing
- [x] Arbitrary route arrays grant nothing
- [x] Arbitrary key arrays grant nothing
- [x] Legitimate digest + altered members fails
- [x] Changed source identity invalidates the binding
- [x] Incomplete inventory grants nothing
- [x] Stale generated evidence grants nothing where currency is required
- [x] Unknown provenance fails closed
- [x] Test seams cannot construct production authority
- [x] JSON shape revival cannot become a trusted capability

## M6 — A8 isolation
- [x] Cone import isolation retained (`node:crypto` only)
- [x] Mint importer set mechanically bounded in `hardening:check`

## M7 — A9 project-state reconciliation
- [x] State each field's intended semantics
- [x] Set each anchor to the checkpoint it actually claims
- [x] Correct the stale exact-head CI narrative section

## M8 — A10 validator repair
- [x] Cross-authority invariant, offline, non-circular
- [x] Eight adversarial cases from the brief

## M9 — A11/A12 documentation reconciliation
- [x] Final C-10 counts in the authoritative completion record
- [x] Historical intermediate values preserved as historical
- [x] Unambiguous production digest semantics with a decision reference

## M10 — A13 persisted-position sentinel rule
- [x] Field inventory of persisted string/bytes-capable positions
- [x] Each position closed-vocabulary, source-proven, or sentinel-proven
- [x] Fails when a new uncovered free-form field is added

## M11 — A14 validation and integration
- [x] Full validation set green
- [x] `gate:local` PASS, `gate:clean` PASS
- [ ] Integration through C-00, exact-head CI, eleven groups PASS

## M12 — A15 gate and closeout
- [ ] Every Stage-A gate item confirmed, or Stage A reported incomplete
