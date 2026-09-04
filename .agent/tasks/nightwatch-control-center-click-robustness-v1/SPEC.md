# SPEC — nightwatch-control-center-click-robustness-v1

## Frozen intent

Extend the proven click robustness of the systemMapV2 hardening
(`clickQueryChip` dispatch + visibility gates) to the two `Inspect`
clicks in `tests/browser/controlCenterBrowser.browser.ts` (lines 268,
302), the neighboring path with the same evidenced exposure (one
observed `Element is not visible` on a rendered button). Test-only
change; zero product-code modification.

## Diagnosis (frozen evidence)

- The sibling spec failed once with the identical signature as the
  systemMap tail clicks: force-click resolved a rendered `Inspect`
  button, then `Element is not visible` at dispatch.
- Force-clicks skip polling but still need a renderer box for scroll
  coordinates; under batch load the box can be transiently absent, and
  force fails it instantly with no retry.
- Post-click assertions (run-detail heading, selected row) are
  answer-specific, so box-independent dispatch cannot go vacuous: a
  swallowed dispatch fails loud at the next assert.

## Hard boundaries (frozen)

Test file only (`tests/browser/controlCenterBrowser.browser.ts`): ADD
a helper + visibility gates, convert two clicks; never remove or relax
any assertion; no `test.skip`, no timeout changes, no product-code
change, no manifest/registry change, no force-push, no history rewrite.
C-00 worktree discipline throughout.

## Declared deletions

None. Additive-only.

## Acceptance (frozen)

- Helper + visibility gates present with race-pinning comments.
- Full browser lane (both specs) 10x repeats green; sibling green in all.
- `tsc --noEmit`, `hardening:check`, `agent:check`, `project:check`,
  `handoff:check` green in the session worktree.
- Integrated to `origin/main`, session released, worktree removed, task
  COMPLETE with REPORT.

## Amendment A1 — 6b loop click (same class, evidenced in validation)

A validation repeat failed at the 6b population-query loop's
`Findings attached to topology` force-click with the identical box-stall
signature. Loop clicks toggle query state with no data dependency, so
the same visibility-gate + dispatch mitigation applies directly (reuse
`clickQueryChip` in `systemMapV2.browser.ts`). Frozen sections above
unchanged except this extension.
