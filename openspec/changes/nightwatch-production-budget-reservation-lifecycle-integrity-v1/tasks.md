Implementation is outside the planning-only audit campaign. These tasks are declared not in scope; none has been performed.

## 1. Freeze reservation behavior

- [ ] ~~1.1 Add breaker/kill-switch denial after reservation, grant-consumption race, exception, and concurrency recovery regressions.~~
- [ ] ~~1.2 Add fabricated, copied, foreign, cancelled, and repeated settlement regressions.~~

## 2. Implement the lifecycle

- [ ] ~~2.1 Add ledger-bound runtime reservation identities and the closed transition table.~~
- [ ] ~~2.2 Separate request quota charge from in-flight occupancy and persist categorical transition receipts.~~
- [ ] ~~2.3 Make final admission coherent and guarantee cancellation before dispatch on every exit.~~
- [ ] ~~2.4 Settle only the exact dispatched reservation once.~~

## 3. Prove closure

- [ ] ~~3.1 Add property and mutation coverage for transition order and counter conservation.~~
- [ ] ~~3.2 Run production-observation mock tests, typecheck, hardening, local/clean gates, and full regression without production contact.~~
