# Tasks — C-11 `PROD_OBSERVE` safety kernel

## C1 — Design reconciliation

- [x] Verify starting truth and R-11 closure.
- [x] Classify every historical requirement CURRENT / SUPERSEDED / NARROWED /
      EXPANDED / DEFERRED_TO_LATER_STAGE.
- [x] Resolve the eleven-versus-twelve gate-count contradiction and document the
      mapping from the historical identifiers to the final chain.
- [x] Record the surfaces C-11 consumes rather than reinvents.

## C2 — Authorization and separation

- [x] Distinct `PROD_OBSERVE` authorization class, one-shot and consumable.
- [x] Distinct `productionRunGate`; `realRunGate` untouched.
- [x] Import-graph separation enforced both ways; injected policy, no default.
- [x] External-only observation config with full integrity validation.
- [x] Independent production allowlist; deny table never inverted or imported.

## C3 — The admission chain

- [x] Versioned named ordered chain with a definition digest.
- [x] All eighteen gates implemented and individually tested.
- [x] Kill switch at entry and immediately before dispatch.
- [x] Observer-identity stage gate and organizational-window gate.
- [x] Source-bound route authority and parameter provenance.
- [x] Request restrictions and post-conditions, including `Set-Cookie`.

## C4 — Budgets, breakers, containment

- [x] Reservation-before-dispatch budgets, race-safe, consumed on reservation.
- [x] Terminal categorical breakers.
- [x] Containment qualification reported categorically, CI carve-out explicit.

## C5 — Mock production and the denial matrix

- [x] Loopback-only mock production with the full fixture case set.
- [x] Complete one-fault denial matrix with network-side zero-contact proof.
- [x] Non-vacuous positive synthetic PQ path.

## C6 — PQ receipt

- [x] Versioned privacy-safe PQ receipt with a digest over its canonical body.
- [x] Full tamper matrix failing closed.

## C7 — Hardening, registration and validation

- [x] Hardening rules for every C-11 invariant, each negative-probed.
- [x] Zero-real-contact proofs, D-4 regression, C-06 unchanged.
- [x] Validator proving every C-11 suite is gate-registered.
- [ ] Full validation sequence, integration, exact-head CI.
