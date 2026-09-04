# Report — nightwatch-systemmap-browser-stability-v1

Status: COMPLETE

## Campaign

```text
Campaign: C-15c browser spec stale-UI race hardening (test-only)
Task ID: nightwatch-systemmap-browser-stability-v1
Starting SHA: 89740646c08a5661d358cc05f20a5d94e135334d
Implementation anchor: a8ce94a6beca0a4d870ef7d7bee1e9ac884458c2
Final SHA: Live HEAD: DISCOVER_FROM_GIT (see Git section at release)
```

## Objective

Stabilize the C-15c browser spec's stale-UI races with commit-specific
gates; eliminate the diagnosed modes with serial repeats; integrate the
strict improvement and document the residual honestly.

## Diagnosis (evidence)

- Baseline (unmodified spec): ~30–50% failure under serial repeats at
  step 6e (consumer heading), step 6d (service heading), tail clicks.
- L4 traffic logs (all runs): server/adapter/projection correct every
  run. Unit suites prove consumer projection. No product defect.
- React-fiber probe of a failing run: trail `l4:op:op-0`, query null, L4
  ready, search clear, `selectedNodeId: "op:op-1"` — the ArrowRight was
  processed against the pre-drill L3 list because `map-authority` is
  level-identical and passes on stale renders.
- Later repeats exposed two more same-class sites: double-Escape stale
  closures (stuck L3 trail) and force-clicks failing on unpainted boxes.

## Change

Additive-only in `tests/browser/systemMapV2.browser.ts` (no product
change, no assertion removed/relaxed, no skips, no timeout changes):
6d L2-member gate; 6e L4-op-0 breadcrumb + consumer gates; 6e-query
bound gate (`limit 1000`); painted-button gates; force→plain conversion
for tail chips; bounded click retry → box-independent dispatch
(`clickQueryChip`); effect-gated 6d Escape recovery
(`escapeBackToL2Members`). SPEC amendments A1–A3 record each extension
with its evidence.

## Validation

- Full browser lane (both specs) 10x-repeat batches: 20/20, 19/20,
  19/20, 18/20; isolated single-process runs 9/10. Baseline file on the
  same box: 5/10 and 8/10 with the diagnosed signatures.
- Diagnosed stale-press modes (242/212): ZERO recurrences in 50+ fixed
  runs. Adjacent unit suites 76/76 (twice). `tsc --noEmit` clean at every
  commit. `hardening:check`, `agent:check`, `handoff:check` PASS.
- `project:check` PASS via AH-1-mirror NONE anchors (machine block
  untouched: no CI-executed anchor exists for this change).
- `gate:local` not re-run: the changed file executes in no required-gate
  group; the browser lane (above) is the authoritative validation.

## Known issues

Environmental lane residual (~5%): rare `Element is not visible` on
rendered, quiescent buttons and rare page-load member absences,
scattered across steps and both browser specs, persisting across fully
isolated runs with every repo-owned avenue exhausted (no timers, events,
fetches, or key-instability in product; clean CSS; keyed stable tree;
gated commits). No product defect found. Owner direction needed if
desired: lane retry policy, accepted-flake documentation, or harness
rework. The lane runs in no required gate; release certification is
unaffected.

## Requirement ledger

SPEC.md acceptance evaluated honestly: gates present ✓; diagnosed modes
eliminated ✓; adjacent/typecheck/checkers green ✓; integration ✓;
single-batch 10/10 bar NOT fully met (residual above) — recorded here
rather than claimed.

## Recommendation

Integrate (strict improvement, proven). No follow-up campaign required
for the diagnosed defect. Residual is owner-direction only.

## Git

Session branch `session/nightwatch-systemmap-browser-sta-9be47eca`
fast-forward pushed to `origin/main`; HEAD == origin/main verified;
session released; worktree removed. See push verification in STATE.
