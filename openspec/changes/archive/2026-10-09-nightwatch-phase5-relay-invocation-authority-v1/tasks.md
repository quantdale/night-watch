Implementation is outside the planning-only audit campaign. These tasks are declared not in scope; none has been performed.

## 1. Freeze callers, effects, and budgets

- [ ] ~~1.1 Discover every relay start/caller/profile/control-channel/auth/target/fetch/redirect/observation/close path.~~
- [ ] ~~1.2 Add regressions for ungranted local caller, proof replay/race, unlimited repetition, observation overwrite, and close/drift races.~~
- [ ] ~~1.3 Define relay generation, caller/operation capability, budget/reservation, ledger, revocation, bounds, and safe errors.~~

## 2. Implement exact pre-effect authority

- [ ] ~~2.1 Mint/transfer opaque invocation proofs only through approved native or permissioned L6 channels.~~
- [ ] ~~2.2 Atomically validate/reserve budgets before auth, target resolution, DNS, or fetch effects.~~
- [ ] ~~2.3 Revoke on close/drift/failure and prevent proof material from entering durable/public surfaces.~~

## 3. Preserve invocation truth

- [ ] ~~3.1 Replace last-value operation observations with an ordered bounded invocation ledger.~~
- [ ] ~~3.2 Give every reservation one terminal or explicit incomplete result and fail closed on ledger exhaustion/failure.~~
- [ ] ~~3.3 Update OOPS/native/manual/campaign readers to select exact invocation identities and enforce cardinality.~~

## 4. Adversarial proof and acceptance

- [ ] ~~4.1 Test sibling local processes, forgery/replay/cross-binding, concurrency, every budget, close/drift, faults, and output/workspace privacy.~~
- [ ] ~~4.2 Register mutations for public-header authority, late consumption, budget omission/refund, map overwrite, and proof leakage.~~
- [ ] ~~4.3 Run focused Phase-5/L6/campaign tests, typecheck, hardening/mutations, local/clean/topology gates, and full regression with synthetic loopback only.~~
- [ ] ~~4.4 Update safety/architecture/decision truth and integrate only through a separately authorized owned session.~~
