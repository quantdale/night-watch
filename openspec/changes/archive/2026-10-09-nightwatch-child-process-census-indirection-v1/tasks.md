## 1. Contract and reproduction

- [x] 1.1 Reproduce namespace-require and method-alias false green.
- [x] 1.2 Define supported syntax and explicit unresolved-import result.
- [x] 1.3 Add failing fixtures for aliases and unknown dynamic indirection.

## 2. Implementation

- [x] 2.1 Discover namespace `require` bindings and destructured aliases.
- [x] 2.2 Discover direct method aliases and preserve closed vocabulary.
- [x] 2.3 Emit unresolved-import records and fail hardening closed.
- [x] 2.4 Preserve classification/profile and privacy constraints.

## 3. Adversarial proof

- [x] 3.1 Test every supported form, comments/strings, and unknown indirection.
- [x] 3.2 Mutate away namespace/alias/unknown guards and prove detection.
- [ ] ~~3.3 Run focused tests, hardening, typecheck, and milestone lanes.~~ [PARTIAL/BLOCKED: focused/static/mutation checks pass; broad lanes retain 12 baseline/source-drift failures plus one isolated-pass timing failure.]

## 4. Handoff

- [ ] ~~4.1 Reconcile task/OpenSpec truth and commit the checkpoint.~~ [DEFERRED: implementation checkpoint is retained; child is BLOCKED pending broad-gate reconciliation.]
- [ ] ~~4.2 Reassess run-evidence transaction integrity and remaining backlog.~~ [DEFERRED: umbrella successor selection continues independently.]
