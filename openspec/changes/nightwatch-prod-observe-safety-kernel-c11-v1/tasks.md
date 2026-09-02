# Tasks — C-11 `PROD_OBSERVE` safety kernel

## C1 — Design reconciliation

- [x] Verify starting truth and R-11 closure.
- [x] Classify every historical requirement CURRENT / SUPERSEDED / NARROWED /
      EXPANDED / DEFERRED_TO_LATER_STAGE.
- [x] Resolve the eleven-versus-twelve gate-count contradiction and document the
      mapping from the historical identifiers to the final chain.
- [x] Record the surfaces C-11 consumes rather than reinvents.

## C2 — Authorization and separation

- [ ] Distinct `PROD_OBSERVE` authorization class, one-shot and consumable.
- [ ] Distinct `productionRunGate`; `realRunGate` untouched.
- [ ] Import-graph separation enforced both ways; injected policy, no default.
- [ ] External-only observation config with full integrity validation.
- [ ] Independent production allowlist; deny table never inverted or imported.

## C3 — The admission chain

- [ ] Versioned named ordered chain with a definition digest.
- [ ] All eighteen gates implemented and individually tested.
- [ ] Kill switch at entry and immediately before dispatch.
- [ ] Observer-identity stage gate and organizational-window gate.
- [ ] Source-bound route authority and parameter provenance.
- [ ] Request restrictions and post-conditions, including `Set-Cookie`.

## C4 — Budgets, breakers, containment

- [ ] Reservation-before-dispatch budgets, race-safe, consumed on reservation.
- [ ] Terminal categorical breakers.
- [ ] Containment qualification reported categorically, CI carve-out explicit.

## C5 — Mock production and the denial matrix

- [ ] Loopback-only mock production with the full fixture case set.
- [ ] Complete one-fault denial matrix with network-side zero-contact proof.
- [ ] Non-vacuous positive synthetic PQ path.

## C6 — PQ receipt

- [ ] Versioned privacy-safe PQ receipt with a digest over its canonical body.
- [ ] Full tamper matrix failing closed.

## C7 — Hardening, registration and validation

- [ ] Hardening rules for every C-11 invariant, each negative-probed.
- [ ] Zero-real-contact proofs, D-4 regression, C-06 unchanged.
- [ ] Validator proving every C-11 suite is gate-registered.
- [ ] Full validation sequence, integration, exact-head CI.
