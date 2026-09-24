## 1. Reproduction and contract

- [x] 1.1 Preserve the 12-failure broad residual and the empty-sibling 129/11 reproduction.
- [x] 1.2 Define CURRENT / STALE / UNAVAILABLE authority and no-skip/no-rebinding rules.

## 2. Test authority helper

- [ ] 2.1 Add a test-only classifier using the confined sibling-source boundary and existing approved SHA map.
- [ ] 2.2 Cover exact-current, stale, absent, and cross-repository dependency states.
- [ ] 2.3 Reuse the deterministic Git-backed source-parity fixture for CLI and expectation parsing.

## 3. Affected tests

- [ ] 3.1 Make C-02a/C-02b/C-03 historical ripple measurements conditional on exact currentness while retaining synthetic controls.
- [ ] 3.2 Make C-04/C-07 cross-repository live measurements require the full approved current source closure.
- [ ] 3.3 Make explain-surface and Phase 9 expectation tests independent of ambient live source.
- [ ] 3.4 Make Phase 12 immutability compare the same checkout immediately before and after its read-only operation.

## 4. Validation and handoff

- [ ] 4.1 Run focused affected suites under live, empty, stale, and exact-current fixture states.
- [ ] 4.2 Run typecheck, hardening, strict OpenSpec, `gate:dev`, and `gate:milestone`.
- [ ] 4.3 Prove source pins and Alphaus repository state are unchanged, reconcile continuity, and perform final successor reassessment.
