# Tasks — C-10.5 Provenance and Project-Truth Closure

## M0 — records and activation
- [x] Verify Git and CI truth read-only before modifying anything
- [x] Task `SPEC.md`, `PLAN.md`, `STATE.md`, `REPORT.md`
- [x] OpenSpec `audit.md` with the recorded A2 reproduction
- [x] OpenSpec `proposal.md`, `tasks.md`
- [ ] OpenSpec `design.md`
- [ ] OpenSpec `specs/production-provenance-authority/spec.md`
- [ ] Rewrite `.agent/EXECUTION_PROMPT.md` with `Planned-From: cb631cc`
- [ ] Route `ACTIVE_TASK.md` and the `CURRENT_STATE` live-state block
- [ ] `handoff:check` PASS, `agent:check` PASS

## M1 — A2 reproduction as a retained test
- [ ] Synthetic negative test capturing all four observed failures
- [ ] Retained as the forgery-resistance assertion after repair

## M2 — A3/A7 authority core
- [ ] Validated source-evidence capability types
- [ ] Deterministic canonical binding encoder
- [ ] Computed-digest mint with no digest parameter
- [ ] Module-private runtime brand registry
- [ ] Fail-closed evidence invariants

## M3 — A4 route derivation
- [ ] OpenAPI-operation route adapter over C-02a evidence
- [ ] PHP route adapter, fail-closed with a documented reason if inadmissible
- [ ] Fixed-contract route adapter bound to committed contract identity

## M4 — A5 key derivation
- [ ] OpenAPI-definition key adapter
- [ ] PHP row-key adapter
- [ ] Fixed-contract key adapter bound to committed contract identity
- [ ] Withdraw the label-accepting constructors from the public surface
- [ ] TEST-ONLY seam that cannot produce production authority

## M5 — A6 forgery resistance
- [ ] Arbitrary strings cannot become `SOURCE_PROVEN_*`
- [ ] Arbitrary digest text grants nothing
- [ ] Arbitrary route arrays grant nothing
- [ ] Arbitrary key arrays grant nothing
- [ ] Legitimate digest + altered members fails
- [ ] Changed source identity invalidates the binding
- [ ] Incomplete inventory grants nothing
- [ ] Stale generated evidence grants nothing where currency is required
- [ ] Unknown provenance fails closed
- [ ] Test seams cannot construct production authority
- [ ] JSON shape revival cannot become a trusted capability

## M6 — A8 isolation
- [ ] Cone import isolation retained (`node:crypto` only)
- [ ] Mint importer set mechanically bounded in `hardening:check`

## M7 — A9 project-state reconciliation
- [ ] State each field's intended semantics
- [ ] Set each anchor to the checkpoint it actually claims
- [ ] Correct the stale exact-head CI narrative section

## M8 — A10 validator repair
- [ ] Cross-authority invariant, offline, non-circular
- [ ] Eight adversarial cases from the brief

## M9 — A11/A12 documentation reconciliation
- [ ] Final C-10 counts in the authoritative completion record
- [ ] Historical intermediate values preserved as historical
- [ ] Unambiguous production digest semantics with a decision reference

## M10 — A13 persisted-position sentinel rule
- [ ] Field inventory of persisted string/bytes-capable positions
- [ ] Each position closed-vocabulary, source-proven, or sentinel-proven
- [ ] Fails when a new uncovered free-form field is added

## M11 — A14 validation and integration
- [ ] Full validation set green
- [ ] `gate:local` PASS, `gate:clean` PASS
- [ ] Integration through C-00, exact-head CI, eleven groups PASS

## M12 — A15 gate and closeout
- [ ] Every Stage-A gate item confirmed, or Stage A reported incomplete
