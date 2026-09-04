# Report — nightwatch-control-center-click-robustness-v1

Status: COMPLETE

## Campaign

```text
Campaign: sibling browser spec click robustness (test-only)
Task ID: nightwatch-control-center-click-robustness-v1
Starting SHA: 9cf37a4d425fe46d453e46a9ceb820b2fd44a420
Implementation anchor: see close-out commit (M2 + A1)
Final SHA: Live HEAD: DISCOVER_FROM_GIT (see Git section at release)
```

## Objective

Extend the proven systemMapV2 click robustness to the sibling spec's
two `Inspect` clicks (plus the 6b loop click added via Amendment A1);
prove 10/10 lane repeats; integrate.

## Diagnosis (evidence)

- One observed sibling failure with the identical pre-mitigation
  signature (`Inspect` force-click, `Element is not visible`, rendered
  button, quiescent UI).
- One validation-repeat failure at the 6b loop's `Findings attached to
  topology` force-click, same signature.
- Force-clicks skip polling but still need renderer boxes for scroll
  coordinates; transient box absence fails them instantly.

## Change

Additive-only (no product change, no assertion removed/relaxed, no
skips, no timeout changes): `clickViewButton` helper (visibility gate +
`dispatchEvent` + one bounded retry) with two `Inspect` conversions;
6b loop conversion reusing `clickQueryChip` with its own visibility
gate. SPEC Amendment A1 records the 6b extension with its evidence.

## Validation

- Full browser lane (both specs) 10x repeats: **20/20 then 20/20
  consecutively (40/40)** with all fixes in.
- `tsc --noEmit` clean; adjacent suites unaffected (no product change);
  `hardening:check`, `agent:check`, `project:check`, `handoff:check`
  PASS (verified at close).
- `gate:local` not re-run: changed files execute in no required-gate
  group; prior HEAD receipt stands; the lane repeats are authoritative.

## Known issues

Same environmental note as the predecessor campaign: rare box-stall
phenomena below the DOM contract remain theoretically possible at other
unguarded force-click sites (drill/node clicks, zero failures in
130+ runs — left untouched by design). The lane runs in no required
gate; release certification unaffected.

## Requirement ledger

SPEC.md acceptance: helper + gates present ✓; 10/10 lane repeats green
(20/20 twice) ✓; checkers green ✓; integration ✓.

## Recommendation

Integrate. No follow-up campaign required. The lane's residual risk is
now limited to unproven, never-observed sites.

## Git

Session branch `session/nightwatch-control-center-click--12588f37`
fast-forward pushed to `origin/main`; HEAD == origin/main verified;
session released; worktree removed. See push verification in STATE.
