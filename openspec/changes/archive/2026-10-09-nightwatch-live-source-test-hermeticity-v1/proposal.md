## Why

Twelve broad validation failures depend on the mutable Alphaus sibling checkout rather than deterministic test authority. The same tests still fail when `NIGHTWATCH_SIBLING_ROOT` points to an empty directory, proving that absent, stale, and changed source states are not handled explicitly; this makes local certification red for reasons unrelated to the code under test.

## What Changes

- Add one shared test helper that classifies sibling-source state as `CURRENT`, `STALE`, or `UNAVAILABLE` before live measurements run.
- Make historical measurement tests use their existing synthetic/disposable controls when live source is not current, while proving stale/unavailable refusal rather than fabricating historical counts.
- Replace hardcoded ambient sibling roots and unconditional live-current assertions in the affected tests.
- Preserve optional owner-local live measurement when the checkout exactly matches the pinned source SHA.
- Add adversarial tests for absent, stale, and changed sibling roots.
- Do not update source pins, derive new expectations, or modify Alphaus repositories.

## Capabilities

### New Capabilities
- `live-source-test-hermeticity`: Deterministic absent/stale/current handling for tests that measure approved real-source repositories.

### Modified Capabilities

None.
