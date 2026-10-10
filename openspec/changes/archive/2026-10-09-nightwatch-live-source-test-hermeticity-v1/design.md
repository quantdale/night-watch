## Context

The final isolation broad lanes retain 12 failures across source-intelligence tests. Eleven of the affected assertions still fail when `NIGHTWATCH_SIBLING_ROOT` is an empty temporary directory, proving they require an ambient live checkout even when the test's real subject is parsing, admission, CLI shape, or deterministic refusal. The remaining Phase 12 assertion compares the mutable canonical checkout to a historical SHA even though its stated invariant is before/after immutability during the test.

The fix is test-infrastructure only. It must preserve approved real-source measurement when every required checkout is exactly current, preserve fail-closed stale/unavailable semantics, and never update source pins or derive expectations from changed source.

## Goals / Non-Goals

**Goals:**
- Classify the approved live-source test universe as `CURRENT`, `STALE`, or `UNAVAILABLE` through the existing confined sibling-source boundary.
- Gate live historical measurements on exact currentness while retaining meaningful synthetic/disposable controls otherwise.
- Replace hardcoded ambient roots in the affected tests.
- Correct the Phase 12 before/after immutability check to compare the same checkout state before and after the operation, not to a historical SHA.
- Add adversarial coverage for absent, stale, and exact-current source states.

**Non-Goals:**
- No change to production source-intelligence behavior, approved repository sets, source SHAs, recipes, expectations, or Alphaus repositories.
- No new snapshot download, network fetch, source checkout, or broad test skip.
- No claim that stale live source proves historical measurements.

## Decisions

1. **Use a test-only authority helper over production code.** `tests/helpers/liveSourceTestAuthority.ts` resolves `NIGHTWATCH_SIBLING_ROOT` or the existing default, reads Git HEAD only through `createSiblingSourceAccess`, and compares exact SHAs from the existing approved map. Production currentness authority remains unchanged.

2. **Require the full dependency closure for cross-repository measurements.** C-04 and C-07 depend on the approved source universe, not only `ripple-ui`; their live measurement runs only when every approved checkout matches its existing pin. C-02/C-03 may use a smaller exact set where their assertion is repository-local.

3. **Unavailable and stale are explicit test states, not skipped tests.** Each affected live block first proves its classified state, then executes the file's existing synthetic/disposable proof. No `test.skip`, no count rewrite, and no source rebinding is permitted.

4. **Use the existing source-parity fixture for CLI and expectation parsing tests.** `explainSurfaceArgForms` and the Phase 9 live canary need a real Git-backed source reader, not the developer's current checkout. The deterministic fixture supplies one without external state.

5. **Phase 12 checks run-local immutability.** The test reads the canonical sibling HEAD immediately before and after its read-only inventory attempt and requires equality; historical currentness is a separate concern.

## Risks / Trade-offs

- Conditional live measurement means historical numbers run less often on a changed workstation. That is truthful: the test reports the current source state and the deterministic core still runs every time.
- Several historical test files need small local guards. A shared state classifier keeps the condition mechanical and identical rather than duplicating SHA logic.
- The live approved universe may be unavailable in CI. The fallback remains deterministic synthetic/disposable coverage, never a fabricated live proof.
