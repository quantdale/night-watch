## 1. Contract and reproduction

- [x] 1.1 Encode same-run, split-write, durable-mismatch, and torn-tail cases.
- [x] 1.2 Define exclusive identity and non-clean categorical outcomes.
- [ ] 1.3 Add failing regressions before implementation.

## 2. Implementation

- [ ] 2.1 Reserve run directories exclusively.
- [ ] 2.2 Fsync append acknowledgements.
- [ ] 2.3 Latch write/mirror/memory failures.
- [ ] 2.4 Validate durable JSONL before terminal summary publication.

## 3. Adversarial proof

- [ ] 3.1 Test same-run, append, mirror, duplicate, mismatch, and torn-tail faults.
- [ ] 3.2 Mutate each new guard and prove detection.
- [ ] 3.3 Run focused/static/hardening/milestone lanes.

## 4. Handoff

- [ ] 4.1 Reconcile task/OpenSpec truth and commit the checkpoint.
- [ ] 4.2 Reassess remaining local candidates and terminal condition.
