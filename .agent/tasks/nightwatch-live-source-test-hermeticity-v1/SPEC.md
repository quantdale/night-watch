# Live-source test hermeticity v1

## Task purpose

Make the affected source-intelligence tests deterministic across absent, stale, and exact-current Alphaus sibling checkouts without changing source pins, weakening live-current measurements, or modifying product source authority.

## Established starting state

- Parent task: `nightwatch-successor-campaign-engine-v1`.
- Starting SHA: `060cd592cf4e8db4b07fc6398d03c147b8a51f12`.
- Isolation implementation `473842c1` is focused/adversarial green.
- Clean isolation milestone: 5459 passed / 12 failed; only live-source test hermeticity remains.
- Empty-sibling replay of affected files: 129 passed / 11 failed, proving structural ambient-live dependence.

## Required deliverables

- One test-only CURRENT/STALE/UNAVAILABLE classifier using the existing confined sibling-source reader and approved SHA map.
- Currentness guards for historical C-02/C-03/C-04/C-07 measurements.
- Deterministic Git-backed fixtures for explain-surface and Phase 9 expectation parsing.
- Run-local before/after immutability for Phase 12.
- Adversarial absent/stale/current tests and focused/broad validation.

## Explicit non-goals

No production source change, source SHA update, expectation rebind, new source download, Alphaus repository mutation, external network, test skip, or historical-count rewrite.

## Safety constraints

Local synthetic/temporary fixtures and read-only current Git HEAD metadata only. No raw source or private paths in errors/findings.

## Declared Deletions

None.

## Acceptance criteria

- All 12 formerly failing tests are deterministic with current, stale, and absent source states.
- Live historical assertions run only when every required checkout exactly matches the existing pin.
- Stale/unavailable paths execute meaningful synthetic/disposable controls and claim no live proof.
- Source pins remain byte-unchanged and Alphaus repositories are not modified.
- Focused, `gate:dev`, and `gate:milestone` pass without hidden skips.
