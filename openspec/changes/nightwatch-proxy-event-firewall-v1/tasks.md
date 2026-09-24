## 1. Contract and reproduction

- [x] 1.1 Reproduce raw append before recorder projection and census omission.
- [x] 1.2 Define exact ProxyEvent runtime schema and safe bounds.
- [x] 1.3 Add failing unknown-field and writer-registration tests.

## 2. Implementation

- [x] 2.1 Validate required/optional event fields before persistence.
- [x] 2.2 Reject unknown keys, invalid enums/types, and unsafe strings.
- [x] 2.3 Initialize/append the raw log owner-only and durably.
- [x] 2.4 Register/discover the proxy writer in the census.

## 3. Adversarial proof

- [x] 3.1 Test valid, unknown, private, control-character, and malformed events.
- [x] 3.2 Mutate validator/census guards and prove detection.
- [ ] 3.3 Run focused/static/hardening/milestone lanes.

## 4. Handoff

- [ ] 4.1 Reconcile task/OpenSpec truth and commit checkpoint.
- [ ] 4.2 Reassess remaining local candidates.
