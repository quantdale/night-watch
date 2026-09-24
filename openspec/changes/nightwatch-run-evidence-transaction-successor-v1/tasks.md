## 1. Contract and reproduction

- [x] 1.1 Encode same-run, split-write, durable-mismatch, and torn-tail cases.
- [x] 1.2 Define exclusive identity and non-clean categorical outcomes.
- [x] 1.3 Add failing regressions before implementation.

## 2. Implementation

- [x] 2.1 Reserve run directories exclusively.
- [x] 2.2 Fsync append acknowledgements.
- [x] 2.3 Latch write/mirror/memory failures.
- [x] 2.4 Validate durable JSONL before terminal summary publication.

## 3. Adversarial proof

- [x] 3.1 Test same-run, append, mirror, duplicate, mismatch, and torn-tail faults.
- [x] 3.2 Mutate each new guard and prove detection.
- [ ] ~~3.3 Run focused/static/hardening/milestone lanes.~~ [PARTIAL/BLOCKED: focused/static/hardening pass; broad lanes retain 12 baseline/source-drift failures.]

## 4. Handoff

- [ ] ~~4.1 Reconcile task/OpenSpec truth and commit the checkpoint.~~ [DEFERRED: implementation checkpoint is retained; child is BLOCKED pending broad-gate reconciliation.]
- [ ] ~~4.2 Reassess remaining local candidates and terminal condition.~~ [DEFERRED: umbrella successor selection continues independently.]
